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

function normalizeName(name: string): string {
  return name.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function normalizeCpf(cpf: string): string {
  return cpf.replace(/\D/g, '')
}

export async function GET() {
  try {
    const supabase = getSupabase()

    const { data: participants, error } = await supabase
      .from('participants')
      .select('id, name, email, phone, cpf, event_id, is_opportunity, created_at, assigned_closer_id, seller_closer_id, checked_in_day1, checked_in_day2, checked_in_day3, qualification, revenue')
      .order('created_at', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!participants || participants.length === 0) {
      return NextResponse.json({ duplicates: [], totalParticipants: 0 })
    }

    // Group by email (within same event)
    const byEmail = new Map<string, typeof participants>()
    const byCpf = new Map<string, typeof participants>()
    const byName = new Map<string, typeof participants>()

    for (const p of participants) {
      if (p.email) {
        const key = `${p.email.toLowerCase().trim()}|${p.event_id || 'none'}`
        const list = byEmail.get(key) || []
        list.push(p)
        byEmail.set(key, list)
      }

      if (p.cpf) {
        const normalized = normalizeCpf(p.cpf)
        if (normalized.length >= 11) {
          const key = `${normalized}|${p.event_id || 'none'}`
          const list = byCpf.get(key) || []
          list.push(p)
          byCpf.set(key, list)
        }
      }

      if (p.name) {
        const key = `${normalizeName(p.name)}|${p.event_id || 'none'}`
        const list = byName.get(key) || []
        list.push(p)
        byName.set(key, list)
      }
    }

    // Collect duplicate groups (avoid adding same group twice)
    const seenIds = new Set<string>()
    const duplicateGroups: Array<{
      matchType: string
      matchValue: string
      participants: typeof participants
    }> = []

    // Email duplicates (highest confidence)
    for (const [key, list] of byEmail) {
      if (list.length <= 1) continue
      const groupId = list.map(p => p.id).sort().join(',')
      if (seenIds.has(groupId)) continue
      seenIds.add(groupId)
      const [email] = key.split('|')
      duplicateGroups.push({ matchType: 'email', matchValue: email, participants: list })
    }

    // CPF duplicates
    for (const [key, list] of byCpf) {
      if (list.length <= 1) continue
      const groupId = list.map(p => p.id).sort().join(',')
      if (seenIds.has(groupId)) continue
      seenIds.add(groupId)
      const [cpf] = key.split('|')
      duplicateGroups.push({ matchType: 'cpf', matchValue: cpf, participants: list })
    }

    // Name duplicates (lower confidence)
    for (const [key, list] of byName) {
      if (list.length <= 1) continue
      const groupId = list.map(p => p.id).sort().join(',')
      if (seenIds.has(groupId)) continue
      seenIds.add(groupId)
      const [name] = key.split('|')
      duplicateGroups.push({ matchType: 'name', matchValue: name, participants: list })
    }

    // Count total duplicates (extra records beyond the first)
    const totalExtras = duplicateGroups.reduce((sum, g) => sum + g.participants.length - 1, 0)

    return NextResponse.json({
      totalParticipants: participants.length,
      totalOpportunities: participants.filter(p => p.is_opportunity).length,
      duplicateGroups: duplicateGroups.length,
      totalExtras,
      groups: duplicateGroups,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// DELETE - remove duplicate participants (keep the one with most data)
export async function DELETE(request: Request) {
  try {
    const supabase = getSupabase()
    const { ids } = await request.json()

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids array required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('participants')
      .delete()
      .in('id', ids)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ deleted: ids.length })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
