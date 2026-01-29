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

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabase()
    const formId = params.id

    // Try to find form in disc_forms table
    const { data: formData, error: formError } = await supabase
      .from('disc_forms')
      .select('*, participant:participants(*)')
      .eq('id', formId)
      .single()

    if (formData?.participant) {
      // Only check this specific form's completed_at, NOT the participant's global form_completed_at
      // A participant may have completed a previous form but this one is still pending
      const isCompleted = !!formData.completed_at
      return NextResponse.json({
        found: true,
        participant: formData.participant,
        form: {
          id: formData.id,
          completed_at: formData.completed_at,
          answers: formData.answers,
        },
        isCompleted,
      })
    }

    // Fallback: try to find by participant ID
    const { data: participantData } = await supabase
      .from('participants')
      .select('*')
      .eq('id', formId)
      .single()

    if (participantData) {
      return NextResponse.json({
        found: true,
        participant: participantData,
        form: null,
        isCompleted: !!participantData.form_completed_at,
      })
    }

    return NextResponse.json({ found: false }, { status: 404 })
  } catch (error: any) {
    console.error('Error loading form:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
