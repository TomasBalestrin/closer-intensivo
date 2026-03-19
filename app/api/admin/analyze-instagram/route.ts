import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

// Known Instagram aliases (from webhooks)
const KNOWN_INSTAGRAM_ALIASES = [
  'instagram', 'insta', 'qual_seu_do_instagram', 'qual_o_do_seu_instagram',
  'ig', 'instagram_handle', 'perfil_instagram', 'user_instagram', 'arroba',
  'seu_instagram', 'qual_seu_instagram', 'qual_e_o_seu_instagram',
  'informe_seu_instagram', 'digite_seu_instagram', 'instagram_pessoal',
]

function normalizeKey(key: string): string {
  return key
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
}

function looksLikeInstagramField(key: string): boolean {
  const normalized = normalizeKey(key)
  const instagramKeywords = ['instagram', 'insta', 'arroba', 'ig_']
  return instagramKeywords.some(kw => normalized.includes(kw) || key.toLowerCase().includes('@'))
}

export async function GET() {
  try {
    // 1. Get stats
    const { count: total } = await supabase
      .from('participants')
      .select('*', { count: 'exact', head: true })

    const { count: withInstagram } = await supabase
      .from('participants')
      .select('*', { count: 'exact', head: true })
      .not('instagram', 'is', null)

    const { count: withFormData } = await supabase
      .from('participants')
      .select('*', { count: 'exact', head: true })
      .not('form_data', 'is', null)

    // 2. Analyze form_data for potential Instagram fields
    const { data: participantsWithFormData } = await supabase
      .from('participants')
      .select('id, name, email, instagram, form_data')
      .not('form_data', 'is', null)
      .limit(1000)

    const potentialInstagramFields: Record<string, { count: number, examples: string[], isKnown: boolean }> = {}
    const participantsWithHiddenInstagram: Array<{ id: string, name: string, email: string, field: string, value: string }> = []

    for (const p of participantsWithFormData || []) {
      const formData = p.form_data as Record<string, any>
      if (!formData || typeof formData !== 'object') continue

      for (const [key, value] of Object.entries(formData)) {
        if (looksLikeInstagramField(key)) {
          const isKnown = KNOWN_INSTAGRAM_ALIASES.some(alias =>
            normalizeKey(key).includes(alias) || alias.includes(normalizeKey(key))
          )

          if (!potentialInstagramFields[key]) {
            potentialInstagramFields[key] = { count: 0, examples: [], isKnown }
          }
          potentialInstagramFields[key].count++
          if (potentialInstagramFields[key].examples.length < 3 && value) {
            potentialInstagramFields[key].examples.push(String(value).substring(0, 50))
          }

          // If participant doesn't have instagram but form_data has it
          if (!p.instagram && value && typeof value === 'string' && value.trim()) {
            participantsWithHiddenInstagram.push({
              id: p.id,
              name: p.name || 'N/A',
              email: p.email || 'N/A',
              field: key,
              value: String(value).substring(0, 50)
            })
          }
        }
      }
    }

    // 3. Get all unique keys in form_data
    const allKeys: Record<string, number> = {}
    for (const p of participantsWithFormData || []) {
      const formData = p.form_data as Record<string, any>
      if (!formData || typeof formData !== 'object') continue
      for (const key of Object.keys(formData)) {
        allKeys[key] = (allKeys[key] || 0) + 1
      }
    }

    // 4. Sample participants without Instagram
    const { data: sampleWithoutInstagram } = await supabase
      .from('participants')
      .select('id, name, email, form_data')
      .is('instagram', null)
      .not('form_data', 'is', null)
      .limit(5)

    // Sort fields by count
    const sortedFields = Object.entries(potentialInstagramFields)
      .sort((a, b) => b[1].count - a[1].count)

    const sortedAllKeys = Object.entries(allKeys)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 50)

    return NextResponse.json({
      stats: {
        total,
        withInstagram,
        withoutInstagram: (total || 0) - (withInstagram || 0),
        withFormData,
        percentageWithInstagram: ((withInstagram || 0) / (total || 1) * 100).toFixed(1)
      },
      instagramFields: sortedFields.map(([field, data]) => ({
        field,
        count: data.count,
        examples: data.examples,
        isKnown: data.isKnown
      })),
      participantsWithHiddenInstagram: participantsWithHiddenInstagram.slice(0, 20),
      hiddenInstagramCount: participantsWithHiddenInstagram.length,
      allFormDataKeys: sortedAllKeys,
      sampleWithoutInstagram: sampleWithoutInstagram?.map(p => ({
        name: p.name,
        email: p.email,
        formData: p.form_data
      }))
    })
  } catch (error) {
    console.error('Error analyzing instagram:', error)
    return NextResponse.json({ error: 'Failed to analyze' }, { status: 500 })
  }
}
