#!/usr/bin/env npx tsx
/**
 * Script para:
 * 1. Verificar e reportar participantes duplicados
 * 2. Reprocessar is_opportunity com a lógica correta
 *
 * Uso: npx tsx scripts/fix-opportunities-and-duplicates.ts
 *
 * Flags:
 *   --dry-run    Apenas mostra o que seria alterado (padrão)
 *   --apply      Aplica as correções no banco
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local' })
config({ path: '.env' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente não configuradas:')
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗')
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '✓' : '✗')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)
const applyChanges = process.argv.includes('--apply')

function isTruthy(value: any): boolean {
  if (value === true) return true
  if (typeof value === 'string') {
    const v = value.toLowerCase().trim()
    return ['true', 'sim', 'yes', '1', 's'].includes(v)
  }
  return value === 1
}

function findOpportunityInWebhookData(webhookData: any): any {
  if (!webhookData) return null

  // Check direct fields
  if (webhookData.oportunidade !== undefined) return webhookData.oportunidade
  if (webhookData.is_opportunity !== undefined) return webhookData.is_opportunity
  if (webhookData.opportunity !== undefined) return webhookData.opportunity

  // Check participant sub-object
  if (webhookData.participant) {
    if (webhookData.participant.oportunidade !== undefined) return webhookData.participant.oportunidade
    if (webhookData.participant.is_opportunity !== undefined) return webhookData.participant.is_opportunity
  }

  // Check fields sub-object
  if (webhookData.fields) {
    if (webhookData.fields.oportunidade !== undefined) return webhookData.fields.oportunidade
    if (webhookData.fields.is_opportunity !== undefined) return webhookData.fields.is_opportunity
  }

  return null
}

async function checkDuplicates() {
  console.log('\n' + '='.repeat(60))
  console.log('🔍 VERIFICAÇÃO DE DUPLICATAS')
  console.log('='.repeat(60))

  // Fetch all participants
  const { data: participants, error } = await supabase
    .from('participants')
    .select('id, name, email, phone, cpf, event_id, is_opportunity, created_at')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('❌ Erro ao buscar participantes:', error.message)
    return
  }

  if (!participants || participants.length === 0) {
    console.log('Nenhum participante encontrado.')
    return
  }

  console.log(`\n📊 Total de participantes: ${participants.length}`)

  // Check duplicates by email within same event
  const byEmailEvent = new Map<string, typeof participants>()
  for (const p of participants) {
    if (!p.email) continue
    const key = `${p.email.toLowerCase().trim()}|${p.event_id}`
    const list = byEmailEvent.get(key) || []
    list.push(p)
    byEmailEvent.set(key, list)
  }

  const emailDuplicates = Array.from(byEmailEvent.entries()).filter(([, list]) => list.length > 1)
  console.log(`\n📧 Duplicatas por email (mesmo evento): ${emailDuplicates.length}`)
  for (const [key, list] of emailDuplicates.slice(0, 20)) {
    const [email, eventId] = key.split('|')
    console.log(`  - ${email} (evento: ${eventId?.substring(0, 8)}): ${list.length} registros`)
    for (const p of list) {
      console.log(`      ID: ${p.id.substring(0, 8)}  Nome: ${p.name}  Oportunidade: ${p.is_opportunity}  Criado: ${p.created_at}`)
    }
  }
  if (emailDuplicates.length > 20) {
    console.log(`  ... e mais ${emailDuplicates.length - 20} duplicatas`)
  }

  // Check duplicates by CPF within same event
  const byCpfEvent = new Map<string, typeof participants>()
  for (const p of participants) {
    if (!p.cpf) continue
    const normalizedCpf = p.cpf.replace(/\D/g, '')
    if (!normalizedCpf) continue
    const key = `${normalizedCpf}|${p.event_id}`
    const list = byCpfEvent.get(key) || []
    list.push(p)
    byCpfEvent.set(key, list)
  }

  const cpfDuplicates = Array.from(byCpfEvent.entries()).filter(([, list]) => list.length > 1)
  console.log(`\n🆔 Duplicatas por CPF (mesmo evento): ${cpfDuplicates.length}`)
  for (const [key, list] of cpfDuplicates.slice(0, 20)) {
    const [cpf, eventId] = key.split('|')
    console.log(`  - CPF: ${cpf} (evento: ${eventId?.substring(0, 8)}): ${list.length} registros`)
    for (const p of list) {
      console.log(`      ID: ${p.id.substring(0, 8)}  Nome: ${p.name}  Oportunidade: ${p.is_opportunity}  Criado: ${p.created_at}`)
    }
  }
  if (cpfDuplicates.length > 20) {
    console.log(`  ... e mais ${cpfDuplicates.length - 20} duplicatas`)
  }

  // Check duplicates by name within same event
  const byNameEvent = new Map<string, typeof participants>()
  for (const p of participants) {
    if (!p.name) continue
    const key = `${p.name.toLowerCase().trim()}|${p.event_id}`
    const list = byNameEvent.get(key) || []
    list.push(p)
    byNameEvent.set(key, list)
  }

  const nameDuplicates = Array.from(byNameEvent.entries()).filter(([, list]) => list.length > 1)
  console.log(`\n👤 Duplicatas por nome (mesmo evento): ${nameDuplicates.length}`)
  for (const [key, list] of nameDuplicates.slice(0, 20)) {
    const [name, eventId] = key.split('|')
    console.log(`  - ${name} (evento: ${eventId?.substring(0, 8)}): ${list.length} registros`)
  }
  if (nameDuplicates.length > 20) {
    console.log(`  ... e mais ${nameDuplicates.length - 20} duplicatas`)
  }

  // Summary
  const totalDupEmails = emailDuplicates.reduce((sum, [, list]) => sum + list.length - 1, 0)
  const totalDupCpfs = cpfDuplicates.reduce((sum, [, list]) => sum + list.length - 1, 0)
  const totalDupNames = nameDuplicates.reduce((sum, [, list]) => sum + list.length - 1, 0)

  console.log('\n📊 Resumo de duplicatas:')
  console.log(`   Por email: ${totalDupEmails} registros extras`)
  console.log(`   Por CPF: ${totalDupCpfs} registros extras`)
  console.log(`   Por nome: ${totalDupNames} registros extras`)
}

async function fixOpportunities() {
  console.log('\n' + '='.repeat(60))
  console.log('🔧 REPROCESSAMENTO DE is_opportunity')
  console.log('='.repeat(60))
  console.log(`   Modo: ${applyChanges ? '⚡ APLICAR CORREÇÕES' : '👀 DRY RUN (apenas visualizar)'}`)

  // Fetch all participants with webhook_data
  const { data: participants, error } = await supabase
    .from('participants')
    .select('id, name, email, is_opportunity, webhook_data, event_id')

  if (error) {
    console.error('❌ Erro ao buscar participantes:', error.message)
    return
  }

  if (!participants || participants.length === 0) {
    console.log('Nenhum participante encontrado.')
    return
  }

  const totalParticipants = participants.length
  const currentOpportunities = participants.filter(p => p.is_opportunity).length
  console.log(`\n📊 Total de participantes: ${totalParticipants}`)
  console.log(`📊 Oportunidades atuais: ${currentOpportunities}`)

  let wouldSetFalse = 0
  let wouldSetTrue = 0
  let noChange = 0
  let noWebhookData = 0
  let noOpportunityField = 0
  const changes: Array<{ id: string; name: string; from: boolean; to: boolean; rawValue: any }> = []

  for (const p of participants) {
    if (!p.webhook_data) {
      noWebhookData++
      continue
    }

    const rawValue = findOpportunityInWebhookData(p.webhook_data)

    if (rawValue === null || rawValue === undefined) {
      noOpportunityField++
      continue
    }

    const correctValue = isTruthy(rawValue)
    const currentValue = p.is_opportunity === true

    if (currentValue !== correctValue) {
      changes.push({
        id: p.id,
        name: p.name || 'Sem nome',
        from: currentValue,
        to: correctValue,
        rawValue,
      })
      if (correctValue) {
        wouldSetTrue++
      } else {
        wouldSetFalse++
      }
    } else {
      noChange++
    }
  }

  console.log(`\n📊 Análise:`)
  console.log(`   Sem webhook_data: ${noWebhookData}`)
  console.log(`   Sem campo oportunidade no webhook: ${noOpportunityField}`)
  console.log(`   Já corretos: ${noChange}`)
  console.log(`   Mudariam para TRUE: ${wouldSetTrue}`)
  console.log(`   Mudariam para FALSE: ${wouldSetFalse}`)
  console.log(`   Total de correções: ${changes.length}`)

  const newOpportunityCount = currentOpportunities - wouldSetFalse + wouldSetTrue
  console.log(`\n📊 Projeção:`)
  console.log(`   Oportunidades atuais: ${currentOpportunities}`)
  console.log(`   Oportunidades após correção: ${newOpportunityCount}`)

  if (changes.length > 0) {
    console.log(`\n📋 Detalhes das mudanças (primeiras 30):`)
    for (const c of changes.slice(0, 30)) {
      console.log(`   ${c.from ? '✓→✗' : '✗→✓'} ${c.name} (raw: "${c.rawValue}")`)
    }
    if (changes.length > 30) {
      console.log(`   ... e mais ${changes.length - 30} mudanças`)
    }
  }

  if (applyChanges && changes.length > 0) {
    console.log(`\n⚡ Aplicando ${changes.length} correções...`)
    let applied = 0
    let errors = 0

    for (const c of changes) {
      const { error: updateError } = await supabase
        .from('participants')
        .update({ is_opportunity: c.to })
        .eq('id', c.id)

      if (updateError) {
        console.error(`   ❌ Erro ao atualizar ${c.name}: ${updateError.message}`)
        errors++
      } else {
        applied++
      }
    }

    console.log(`\n✅ Correções aplicadas: ${applied}`)
    if (errors > 0) console.log(`❌ Erros: ${errors}`)

    // Verify final count
    const { count } = await supabase
      .from('participants')
      .select('id', { count: 'exact', head: true })
      .eq('is_opportunity', true)

    console.log(`\n📊 Oportunidades no banco após correção: ${count}`)
  } else if (!applyChanges && changes.length > 0) {
    console.log(`\n⚠️  Para aplicar as correções, rode com --apply:`)
    console.log(`   npx tsx scripts/fix-opportunities-and-duplicates.ts --apply`)
  }
}

async function main() {
  console.log('🔄 Verificação de duplicatas e is_opportunity')
  console.log(`   Banco: ${supabaseUrl}`)
  console.log(`   Data: ${new Date().toISOString()}`)

  await checkDuplicates()
  await fixOpportunities()

  console.log('\n' + '='.repeat(60))
  console.log('✅ Verificação concluída!')
  console.log('='.repeat(60))
}

main().catch(console.error)
