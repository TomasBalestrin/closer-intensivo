import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase configuration')
  }

  return createClient(supabaseUrl, supabaseKey)
}

function isOpportunityValue(value: any): boolean {
  if (value === true) return true
  if (typeof value === 'string') {
    const v = value.toLowerCase().trim()
    return ['true', 'sim', 'yes', '1'].includes(v)
  }
  return value === 1
}

// GET = diagnóstico, POST = aplicar correção
export async function GET(request: Request) {
  const supabase = getSupabase()
  const url = new URL(request.url)
  const eventId = url.searchParams.get('event_id')

  try {
    // 1. Get all participants (with optional event filter)
    let query = supabase
      .from('participants')
      .select('id, name, email, cpf, is_opportunity, event_id, webhook_data, created_at')
      .order('created_at', { ascending: true })

    if (eventId) {
      query = query.eq('event_id', eventId)
    }

    const { data: allParticipants, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const opportunities = allParticipants?.filter(p => p.is_opportunity) || []

    // 2. Find duplicates by CPF within same event
    const byCpf = new Map<string, any[]>()
    for (const p of allParticipants || []) {
      if (p.cpf) {
        const key = `${p.event_id}:${p.cpf.replace(/\D/g, '')}`
        if (!byCpf.has(key)) byCpf.set(key, [])
        byCpf.get(key)!.push(p)
      }
    }
    const duplicateCpfGroups = [...byCpf.entries()].filter(([, v]) => v.length > 1)

    // 3. Find duplicates by email within same event
    const byEmail = new Map<string, any[]>()
    for (const p of allParticipants || []) {
      if (p.email) {
        const key = `${p.event_id}:${p.email.toLowerCase().trim()}`
        if (!byEmail.has(key)) byEmail.set(key, [])
        byEmail.get(key)!.push(p)
      }
    }
    const duplicateEmailGroups = [...byEmail.entries()].filter(([, v]) => v.length > 1)

    // 4. Check is_opportunity against webhook_data
    const incorrectOpportunities: any[] = []
    for (const p of opportunities) {
      if (!p.webhook_data) continue

      const webhookData = p.webhook_data as any
      const participant = webhookData?.participant || {}

      const rawOportunidade = participant.oportunidade ??
                              webhookData?.oportunidade ??
                              webhookData?.is_opportunity ??
                              webhookData?.fields?.oportunidade ??
                              webhookData?.fields?.is_opportunity

      if (rawOportunidade === undefined || rawOportunidade === null || !isOpportunityValue(rawOportunidade)) {
        incorrectOpportunities.push({
          id: p.id,
          name: p.name,
          email: p.email,
          rawOportunidade,
          reason: rawOportunidade === undefined || rawOportunidade === null
            ? 'campo oportunidade não encontrado no webhook'
            : `valor "${rawOportunidade}" não é positivo`
        })
      }
    }

    // 5. Count duplicates that are opportunities
    let duplicateOpportunityIds: string[] = []
    for (const [, participants] of duplicateCpfGroups) {
      const sorted = participants.sort((a: any, b: any) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
      for (let i = 1; i < sorted.length; i++) {
        duplicateOpportunityIds.push(sorted[i].id)
      }
    }

    return NextResponse.json({
      totalParticipants: allParticipants?.length || 0,
      totalOpportunities: opportunities.length,
      expectedOpportunities: 190,
      difference: opportunities.length - 190,
      duplicates: {
        byCpf: duplicateCpfGroups.length,
        byEmail: duplicateEmailGroups.length,
        duplicateParticipantIds: duplicateOpportunityIds.length,
        details: duplicateCpfGroups.slice(0, 10).map(([key, participants]) => ({
          key,
          count: participants.length,
          participants: participants.map((p: any) => ({ id: p.id, name: p.name, is_opportunity: p.is_opportunity, created_at: p.created_at }))
        }))
      },
      incorrectOpportunities: {
        count: incorrectOpportunities.length,
        details: incorrectOpportunities.slice(0, 20)
      }
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const supabase = getSupabase()

  try {
    const body = await request.json()
    const { action, eventId } = body

    if (action === 'fix_incorrect_opportunities') {
      // Find and fix participants where is_opportunity=true but webhook says otherwise
      let query = supabase
        .from('participants')
        .select('id, name, is_opportunity, webhook_data')
        .eq('is_opportunity', true)

      if (eventId) {
        query = query.eq('event_id', eventId)
      }

      const { data: opportunities, error } = await query

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      const idsToFix: string[] = []
      for (const p of opportunities || []) {
        if (!p.webhook_data) continue

        const webhookData = p.webhook_data as any
        const participant = webhookData?.participant || {}

        const rawOportunidade = participant.oportunidade ??
                                webhookData?.oportunidade ??
                                webhookData?.is_opportunity ??
                                webhookData?.fields?.oportunidade ??
                                webhookData?.fields?.is_opportunity

        if (rawOportunidade === undefined || rawOportunidade === null || !isOpportunityValue(rawOportunidade)) {
          idsToFix.push(p.id)
        }
      }

      if (idsToFix.length > 0) {
        for (let i = 0; i < idsToFix.length; i += 50) {
          const batch = idsToFix.slice(i, i + 50)
          await supabase
            .from('participants')
            .update({ is_opportunity: false })
            .in('id', batch)
        }
      }

      // Get new count
      let countQuery = supabase
        .from('participants')
        .select('*', { count: 'exact', head: true })
        .eq('is_opportunity', true)

      if (eventId) {
        countQuery = countQuery.eq('event_id', eventId)
      }

      const { count } = await countQuery

      return NextResponse.json({
        success: true,
        fixed: idsToFix.length,
        newOpportunityCount: count
      })
    }

    if (action === 'remove_duplicates') {
      // Remove duplicate participants (keep oldest, delete newer)
      let query = supabase
        .from('participants')
        .select('id, name, cpf, event_id, created_at')
        .order('created_at', { ascending: true })

      if (eventId) {
        query = query.eq('event_id', eventId)
      }

      const { data: allParticipants, error } = await query

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      const byCpf = new Map<string, any[]>()
      for (const p of allParticipants || []) {
        if (p.cpf) {
          const key = `${p.event_id}:${p.cpf.replace(/\D/g, '')}`
          if (!byCpf.has(key)) byCpf.set(key, [])
          byCpf.get(key)!.push(p)
        }
      }

      const idsToDelete: string[] = []
      for (const [, participants] of byCpf) {
        if (participants.length <= 1) continue
        const sorted = participants.sort((a: any, b: any) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )
        for (let i = 1; i < sorted.length; i++) {
          idsToDelete.push(sorted[i].id)
        }
      }

      if (idsToDelete.length > 0) {
        for (let i = 0; i < idsToDelete.length; i += 50) {
          const batch = idsToDelete.slice(i, i + 50)
          await supabase
            .from('participants')
            .delete()
            .in('id', batch)
        }
      }

      // Get new count
      let countQuery = supabase
        .from('participants')
        .select('*', { count: 'exact', head: true })
        .eq('is_opportunity', true)

      if (eventId) {
        countQuery = countQuery.eq('event_id', eventId)
      }

      const { count } = await countQuery

      return NextResponse.json({
        success: true,
        deletedDuplicates: idsToDelete.length,
        newOpportunityCount: count
      })
    }

    return NextResponse.json({ error: 'action inválida. Use fix_incorrect_opportunities ou remove_duplicates' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
