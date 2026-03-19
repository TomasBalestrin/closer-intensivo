import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export async function POST() {
  const supabase = getSupabase()

  try {
    // 1. Buscar participantes com seller_closer_id mas sem assigned_closer_id
    const { data: participants, error: participantsError } = await supabase
      .from('participants')
      .select('id, name, event_id, seller_closer_id, seller_closer_name')
      .not('seller_closer_id', 'is', null)
      .is('assigned_closer_id', null)

    if (participantsError) {
      return NextResponse.json({ error: participantsError.message }, { status: 500 })
    }

    if (!participants || participants.length === 0) {
      return NextResponse.json({
        message: 'Nenhum participante precisa de atribuição',
        assigned: 0,
        skipped: 0
      })
    }

    // 2. Buscar todos os closers disponíveis por evento (user_events)
    const { data: userEvents, error: userEventsError } = await supabase
      .from('user_events')
      .select('user_id, event_id')
      .eq('role', 'closer')

    if (userEventsError) {
      return NextResponse.json({ error: userEventsError.message }, { status: 500 })
    }

    // Criar um Set para lookup rápido: "user_id:event_id"
    const availableClosers = new Set(
      userEvents?.map(ue => `${ue.user_id}:${ue.event_id}`) || []
    )

    // 3. Processar cada participante
    let assigned = 0
    let skipped = 0
    const results: { name: string; status: string; closer?: string }[] = []

    for (const participant of participants) {
      const key = `${participant.seller_closer_id}:${participant.event_id}`

      if (availableClosers.has(key)) {
        // Closer está disponível para o evento, atribuir
        const { error: updateError } = await supabase
          .from('participants')
          .update({ assigned_closer_id: participant.seller_closer_id })
          .eq('id', participant.id)

        if (updateError) {
          results.push({
            name: participant.name,
            status: 'error',
            closer: participant.seller_closer_name
          })
        } else {
          results.push({
            name: participant.name,
            status: 'assigned',
            closer: participant.seller_closer_name
          })
          assigned++
        }
      } else {
        results.push({
          name: participant.name,
          status: 'skipped',
          closer: participant.seller_closer_name
        })
        skipped++
      }
    }

    return NextResponse.json({
      message: 'Auto-atribuição concluída',
      assigned,
      skipped,
      total: participants.length,
      results
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
