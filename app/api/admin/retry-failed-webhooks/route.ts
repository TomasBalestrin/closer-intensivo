import { NextResponse } from 'next/server'
import {
  getWebhookSupabase,
  processParticipantWebhook,
  WebhookValidationError,
} from '@/lib/webhooks/process-participant'

export async function POST(request: Request) {
  const supabase = getWebhookSupabase()

  try {
    const url = new URL(request.url)
    const eventId = url.searchParams.get('event_id')
    const logId = url.searchParams.get('log_id')

    // Build query to find failed/unprocessed webhook entries
    let query = supabase
      .from('webhooks_log')
      .select('id, payload, event_id, error_message, created_at')
      .eq('processed', false)
      .order('created_at', { ascending: true })

    if (logId) {
      // Retry a specific webhook entry
      query = query.eq('id', logId)
    } else if (eventId) {
      query = query.eq('event_id', eventId)
    }

    // Limit to avoid timeouts
    query = query.limit(100)

    const { data: failedEntries, error: fetchError } = await query

    if (fetchError) {
      return NextResponse.json(
        { error: 'Erro ao buscar webhooks falhos', details: fetchError.message },
        { status: 500 }
      )
    }

    if (!failedEntries || failedEntries.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Nenhum webhook falho encontrado para reprocessar',
        results: { total: 0, success: 0, failed: 0, details: [] },
      })
    }

    const results = {
      total: failedEntries.length,
      success: 0,
      failed: 0,
      details: [] as any[],
    }

    for (const entry of failedEntries) {
      try {
        const payload = entry.payload
        const webhookEventId = entry.event_id || eventId

        if (!payload) {
          results.failed++
          results.details.push({
            log_id: entry.id,
            error: 'Payload vazio',
          })
          continue
        }

        // Determine if it's structured format (has participant object)
        const isStructured = !!(payload.participant || payload.checkin_days)

        const result = await processParticipantWebhook(supabase, payload, {
          eventId: webhookEventId,
          structuredFormat: isStructured,
          autoAssignCloser: true,
        })

        // Mark as processed
        await supabase
          .from('webhooks_log')
          .update({ processed: true, error_message: null })
          .eq('id', entry.id)

        results.success++
        results.details.push({
          log_id: entry.id,
          action: result.action,
          participantId: result.participantId,
          name: result.name,
        })
      } catch (err: any) {
        results.failed++
        const errorMsg = err.message || 'Erro desconhecido'

        // Update error message in log
        await supabase
          .from('webhooks_log')
          .update({ error_message: errorMsg })
          .eq('id', entry.id)

        results.details.push({
          log_id: entry.id,
          error: errorMsg,
          isValidation: err instanceof WebhookValidationError,
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: `${results.success} de ${results.total} webhooks reprocessados com sucesso`,
      results,
    })
  } catch (error: any) {
    console.error('Retry failed webhooks error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  const supabase = getWebhookSupabase()

  // Count failed webhooks
  const { count, error } = await supabase
    .from('webhooks_log')
    .select('id', { count: 'exact', head: true })
    .eq('processed', false)

  return NextResponse.json({
    status: 'ok',
    description: 'Reprocessa webhooks que falharam no processamento inicial',
    failed_count: error ? 'Erro ao contar' : (count || 0),
    endpoint: '/api/admin/retry-failed-webhooks',
    method: 'POST',
    parametros: {
      event_id: 'UUID do evento (opcional - filtra por evento)',
      log_id: 'UUID do log específico (opcional - reprocessa apenas um)',
    },
  })
}
