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

export async function POST(request: Request) {
  const supabase = getSupabase()
  try {
    const payload = await request.json()

    // Log the webhook
    const { error: logError } = await supabase
      .from('webhooks_log')
      .insert({
        payload,
        processed: false,
      })

    if (logError) {
      console.error('Error logging webhook:', logError)
    }

    // Extract participant data from payload
    const {
      name,
      photo_url,
      revenue,
      niche,
      instagram,
      checked_in_day1,
      checked_in_day2,
      checked_in_day3,
      ...otherData
    } = payload

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    // Check if participant exists by name
    const { data: existingParticipant } = await supabase
      .from('participants')
      .select('id')
      .eq('name', name)
      .single()

    if (existingParticipant) {
      // Update existing participant
      const updateData: any = {
        webhook_data: payload,
      }

      if (photo_url !== undefined) updateData.photo_url = photo_url
      if (revenue !== undefined) updateData.revenue = revenue
      if (niche !== undefined) updateData.niche = niche
      if (instagram !== undefined) updateData.instagram = instagram
      if (checked_in_day1 !== undefined) updateData.checked_in_day1 = checked_in_day1
      if (checked_in_day2 !== undefined) updateData.checked_in_day2 = checked_in_day2
      if (checked_in_day3 !== undefined) updateData.checked_in_day3 = checked_in_day3

      const { error: updateError } = await supabase
        .from('participants')
        .update(updateData)
        .eq('id', existingParticipant.id)

      if (updateError) {
        console.error('Error updating participant:', updateError)
        return NextResponse.json(
          { error: 'Error updating participant' },
          { status: 500 }
        )
      }

      // Mark webhook as processed
      await supabase
        .from('webhooks_log')
        .update({ processed: true })
        .eq('payload', payload)

      return NextResponse.json({
        success: true,
        action: 'updated',
        participantId: existingParticipant.id,
      })
    } else {
      // Create new participant
      const { data: newParticipant, error: insertError } = await supabase
        .from('participants')
        .insert({
          name,
          photo_url: photo_url || null,
          revenue: revenue || null,
          niche: niche || null,
          instagram: instagram || null,
          checked_in_day1: checked_in_day1 || false,
          checked_in_day2: checked_in_day2 || false,
          checked_in_day3: checked_in_day3 || false,
          webhook_data: payload,
        })
        .select('id')
        .single()

      if (insertError) {
        console.error('Error creating participant:', insertError)
        return NextResponse.json(
          { error: 'Error creating participant' },
          { status: 500 }
        )
      }

      // Mark webhook as processed
      await supabase
        .from('webhooks_log')
        .update({ processed: true })
        .eq('payload', payload)

      return NextResponse.json({
        success: true,
        action: 'created',
        participantId: newParticipant.id,
      })
    }
  } catch (error: any) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// Allow GET for testing
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Webhook endpoint is active. Send POST requests with participant data.',
    expectedPayload: {
      name: 'string (required)',
      photo_url: 'string (optional)',
      revenue: 'string (optional)',
      niche: 'string (optional)',
      instagram: 'string (optional)',
      checked_in_day1: 'boolean (optional)',
      checked_in_day2: 'boolean (optional)',
      checked_in_day3: 'boolean (optional)',
    },
  })
}
