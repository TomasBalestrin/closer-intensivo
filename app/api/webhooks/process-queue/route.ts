import { NextResponse } from 'next/server'
import { processarFilaWebhooks } from '@/lib/webhooks/outbound-processor'

// POST /api/webhooks/process-queue - Process pending outbound webhooks
// Can be called by a cron job or manually
export async function POST(request: Request) {
  // Optional: validate a secret key for cron calls
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await processarFilaWebhooks()

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Error processing queue' },
      { status: 500 }
    )
  }
}

// Allow GET for health checks
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Webhook queue processor endpoint. POST to process pending webhooks.',
  })
}
