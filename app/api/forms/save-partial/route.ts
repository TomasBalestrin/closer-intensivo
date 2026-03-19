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
  try {
    const { participantId, instagram, challengeAnswer, desiredChangeAnswer } = await request.json()

    if (!participantId) {
      return NextResponse.json({ error: 'participantId required' }, { status: 400 })
    }

    const supabase = getSupabase()
    const update: Record<string, any> = {}

    if (instagram !== undefined) {
      update.instagram = instagram.replace(/^@/, '').trim()
    }
    if (challengeAnswer !== undefined) {
      update.challenge_answer = challengeAnswer
    }
    if (desiredChangeAnswer !== undefined) {
      update.desired_change_answer = desiredChangeAnswer
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ success: true })
    }

    const { error } = await supabase
      .from('participants')
      .update(update)
      .eq('id', participantId)

    if (error) {
      console.error('Partial save error:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Partial save error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
