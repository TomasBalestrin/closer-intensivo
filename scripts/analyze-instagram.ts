import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente não configuradas:')
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗')
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '✓' : '✗')
  console.error('\nExecute com as variáveis de ambiente configuradas.')
  process.exit(1)
}

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
  const instagramKeywords = ['instagram', 'insta', 'arroba', '@', 'ig_']
  return instagramKeywords.some(kw => normalized.includes(kw) || key.toLowerCase().includes(kw))
}

function looksLikeInstagramValue(value: any): boolean {
  if (typeof value !== 'string') return false
  const v = value.trim()
  // Starts with @ or looks like username
  if (v.startsWith('@')) return true
  // Instagram URL
  if (v.includes('instagram.com/')) return true
  // Short alphanumeric with dots/underscores (typical IG handle)
  if (/^[a-zA-Z0-9._]{3,30}$/.test(v) && !v.includes(' ') && !v.includes('@') && v.includes('.')) return false
  return false
}

async function analyzeInstagramData() {
  console.log('🔍 Analisando dados de Instagram dos participantes...\n')

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

  console.log('📊 ESTATÍSTICAS GERAIS:')
  console.log(`   Total de participantes: ${total}`)
  console.log(`   Com Instagram preenchido: ${withInstagram} (${((withInstagram || 0) / (total || 1) * 100).toFixed(1)}%)`)
  console.log(`   Sem Instagram: ${(total || 0) - (withInstagram || 0)}`)
  console.log(`   Com form_data: ${withFormData}`)
  console.log('')

  // 2. Analyze form_data for potential Instagram fields
  const { data: participantsWithFormData } = await supabase
    .from('participants')
    .select('id, name, email, instagram, form_data')
    .not('form_data', 'is', null)
    .limit(500)

  const potentialInstagramFields: Record<string, { count: number, examples: string[] }> = {}
  const participantsWithHiddenInstagram: Array<{ id: string, name: string, field: string, value: string }> = []

  for (const p of participantsWithFormData || []) {
    const formData = p.form_data as Record<string, any>
    if (!formData || typeof formData !== 'object') continue

    for (const [key, value] of Object.entries(formData)) {
      const normalized = normalizeKey(key)

      // Check if this looks like an Instagram field
      if (looksLikeInstagramField(key)) {
        if (!potentialInstagramFields[key]) {
          potentialInstagramFields[key] = { count: 0, examples: [] }
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
            field: key,
            value: String(value).substring(0, 50)
          })
        }
      }

      // Also check if value looks like Instagram handle
      if (!p.instagram && looksLikeInstagramValue(value)) {
        if (!potentialInstagramFields[`[value] ${key}`]) {
          potentialInstagramFields[`[value] ${key}`] = { count: 0, examples: [] }
        }
        potentialInstagramFields[`[value] ${key}`].count++
        if (potentialInstagramFields[`[value] ${key}`].examples.length < 3) {
          potentialInstagramFields[`[value] ${key}`].examples.push(String(value).substring(0, 50))
        }
      }
    }
  }

  // 3. Show potential Instagram fields found
  console.log('🔎 CAMPOS QUE PARECEM SER INSTAGRAM:')
  const sortedFields = Object.entries(potentialInstagramFields)
    .sort((a, b) => b[1].count - a[1].count)

  if (sortedFields.length === 0) {
    console.log('   Nenhum campo de Instagram encontrado no form_data')
  } else {
    for (const [field, data] of sortedFields) {
      const isKnown = KNOWN_INSTAGRAM_ALIASES.some(alias =>
        normalizeKey(field).includes(alias) || alias.includes(normalizeKey(field))
      )
      const status = isKnown ? '✅' : '⚠️ NOVO'
      console.log(`   ${status} "${field}" (${data.count}x)`)
      console.log(`      Exemplos: ${data.examples.join(', ')}`)
    }
  }
  console.log('')

  // 4. Show participants with hidden Instagram
  if (participantsWithHiddenInstagram.length > 0) {
    console.log(`🚨 PARTICIPANTES SEM INSTAGRAM MAS COM DADOS NO FORM_DATA (${participantsWithHiddenInstagram.length}):`)
    const shown = participantsWithHiddenInstagram.slice(0, 10)
    for (const p of shown) {
      console.log(`   - ${p.name}: "${p.field}" = "${p.value}"`)
    }
    if (participantsWithHiddenInstagram.length > 10) {
      console.log(`   ... e mais ${participantsWithHiddenInstagram.length - 10}`)
    }
    console.log('')
  }

  // 5. List all unique keys in form_data for reference
  const allKeys: Record<string, number> = {}
  for (const p of participantsWithFormData || []) {
    const formData = p.form_data as Record<string, any>
    if (!formData || typeof formData !== 'object') continue
    for (const key of Object.keys(formData)) {
      allKeys[key] = (allKeys[key] || 0) + 1
    }
  }

  console.log('📋 TODOS OS CAMPOS NO FORM_DATA (top 30):')
  const topKeys = Object.entries(allKeys)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)

  for (const [key, count] of topKeys) {
    console.log(`   ${count}x: "${key}"`)
  }
  console.log('')

  // 6. Sample some participants without Instagram to see their form_data
  const { data: withoutInstagram } = await supabase
    .from('participants')
    .select('id, name, email, form_data')
    .is('instagram', null)
    .not('form_data', 'is', null)
    .limit(5)

  if (withoutInstagram && withoutInstagram.length > 0) {
    console.log('📝 AMOSTRA DE PARTICIPANTES SEM INSTAGRAM (form_data):')
    for (const p of withoutInstagram) {
      console.log(`\n   ${p.name} (${p.email}):`)
      const fd = p.form_data as Record<string, any>
      if (fd) {
        for (const [k, v] of Object.entries(fd)) {
          if (v && String(v).trim()) {
            console.log(`      "${k}": "${String(v).substring(0, 60)}"`)
          }
        }
      }
    }
  }

  console.log('\n✅ Análise concluída!')
}

analyzeInstagramData().catch(console.error)
