import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

function isOpportunityValue(value: any): boolean {
  if (value === true) return true
  if (typeof value === 'string') {
    const v = value.toLowerCase().trim()
    return ['true', 'sim', 'yes', '1'].includes(v)
  }
  return value === 1
}

async function main() {
  console.log('Buscando participantes com webhook_data...')
  
  const { data: participants, error } = await supabase
    .from('participants')
    .select('id, name, is_opportunity, webhook_data')
    .not('webhook_data', 'is', null)

  if (error) {
    console.error('Erro:', error.message)
    process.exit(1)
  }

  console.log(`Encontrados ${participants?.length || 0} participantes\n`)

  let updated = 0
  let unchanged = 0
  let errors = 0

  for (const p of participants || []) {
    try {
      // Extract oportunidade from webhook_data
      const webhookData = p.webhook_data as any
      const participant = webhookData?.participant || {}
      
      // Check multiple possible locations for oportunidade
      const rawOportunidade = participant.oportunidade ?? 
                              webhookData?.oportunidade ?? 
                              webhookData?.is_opportunity ??
                              webhookData?.fields?.oportunidade ??
                              webhookData?.fields?.is_opportunity

      const correctValue = isOpportunityValue(rawOportunidade)
      
      // Only update if different
      if (p.is_opportunity !== correctValue) {
        const { error: updateError } = await supabase
          .from('participants')
          .update({ is_opportunity: correctValue })
          .eq('id', p.id)

        if (updateError) {
          console.error(`Erro ao atualizar ${p.name}: ${updateError.message}`)
          errors++
        } else {
          console.log(`✓ ${p.name}: ${p.is_opportunity} → ${correctValue}`)
          updated++
        }
      } else {
        unchanged++
      }
    } catch (err: any) {
      console.error(`Erro com ${p.name}: ${err.message}`)
      errors++
    }
  }

  console.log('\n--- Resultado ---')
  console.log(`Atualizados: ${updated}`)
  console.log(`Sem alteração: ${unchanged}`)
  console.log(`Erros: ${errors}`)

  // Show final count
  const { count } = await supabase
    .from('participants')
    .select('*', { count: 'exact', head: true })
    .eq('is_opportunity', true)

  console.log(`\nTotal de oportunidades agora: ${count}`)
}

main()
