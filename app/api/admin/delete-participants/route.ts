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

export async function DELETE(request: Request) {
  const supabase = getSupabase()

  try {
    const url = new URL(request.url)
    const eventId = url.searchParams.get('event_id')
    const dryRun = url.searchParams.get('dry_run') === 'true'

    if (!eventId) {
      return NextResponse.json(
        { error: 'event_id é obrigatório para deletar participantes' },
        { status: 400 }
      )
    }

    // Verify event exists
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, name')
      .eq('id', eventId)
      .single()

    if (eventError || !event) {
      return NextResponse.json(
        { error: 'Evento não encontrado', event_id: eventId },
        { status: 404 }
      )
    }

    // Count participants to be deleted
    const { count, error: countError } = await supabase
      .from('participants')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId)

    if (countError) {
      return NextResponse.json(
        { error: 'Erro ao contar participantes', details: countError.message },
        { status: 500 }
      )
    }

    if (dryRun) {
      return NextResponse.json({
        success: true,
        dry_run: true,
        message: `Simulação: ${count} participantes seriam deletados do evento "${event.name}"`,
        event: { id: event.id, name: event.name },
        participants_count: count,
      })
    }

    // Delete participants
    const { error: deleteError } = await supabase
      .from('participants')
      .delete()
      .eq('event_id', eventId)

    if (deleteError) {
      return NextResponse.json(
        { error: 'Erro ao deletar participantes', details: deleteError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `${count} participantes deletados do evento "${event.name}"`,
      event: { id: event.id, name: event.name },
      deleted_count: count,
    })
  } catch (error: any) {
    console.error('Delete participants error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET for documentation
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    description: 'Deleta todos os participantes de um evento específico',
    endpoint: '/api/admin/delete-participants',
    method: 'DELETE',
    parametros: {
      'event_id': 'UUID do evento (obrigatório)',
      'dry_run': 'true para simular sem deletar',
    },
    exemplos: [
      {
        descricao: 'Simular deleção (ver quantos seriam deletados)',
        comando: 'curl -X DELETE "URL?event_id=UUID&dry_run=true"',
      },
      {
        descricao: 'Deletar participantes de um evento',
        comando: 'curl -X DELETE "URL?event_id=UUID"',
      },
    ],
  })
}
