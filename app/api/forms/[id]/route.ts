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
      // Form is only truly completed if it has completed_at AND actual answers stored
      // This matches the admin panel logic that shows "Aguardando resposta" vs "Respondido"
      const hasAnswers = formData.answers && typeof formData.answers === 'object' && Object.keys(formData.answers).length > 0
      const isCompleted = !!(formData.completed_at && hasAnswers)
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
      // For participant fallback, also check if they have actual DISC data
      const hasDiscData = !!(participantData.disc_profile || participantData.primary_archetype)
      return NextResponse.json({
        found: true,
        participant: participantData,
        form: null,
        isCompleted: !!(participantData.form_completed_at && hasDiscData),
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
