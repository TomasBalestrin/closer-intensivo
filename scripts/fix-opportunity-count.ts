#!/usr/bin/env npx tsx
/**
 * Script para diagnosticar e corrigir o número de oportunidades no banco de dados.
 *
 * Problemas que este script resolve:
 * 1. Participantes duplicados (mesmo CPF, email ou nome)
 * 2. Participantes marcados como oportunidade incorretamente
 *
 * Uso: npx tsx scripts/fix-opportunity-count.ts [--fix]
 *
 * Sem --fix: apenas diagnóstico (modo seguro)
 * Com --fix: aplica as correções
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })
config({ path: '.env' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Variáveis de ambiente não configuradas:')
  console.error('  NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'OK' : 'FALTA')
  console.error('  SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? 'OK' : 'FALTA')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)
const shouldFix = process.argv.includes('--fix')

function isOpportunityValue(value: any): boolean {
  if (value === true) return true
  if (typeof value === 'string') {
    const v = value.toLowerCase().trim()
    return ['true', 'sim', 'yes', '1'].includes(v)
  }
  return value === 1
}

async function main() {
  console.log(shouldFix ? '=== MODO CORREÇÃO ===' : '=== MODO DIAGNÓSTICO (use --fix para corrigir) ===')
  console.log('')

  // 1. Get all participants with is_opportunity = true
  const { data: allOpportunities, error: oppError } = await supabase
    .from('participants')
    .select('id, name, email, cpf, is_opportunity, event_id, webhook_data, created_at')
    .eq('is_opportunity', true)
    .order('created_at', { ascending: true })

  if (oppError) {
    console.error('Erro ao buscar oportunidades:', oppError.message)
    process.exit(1)
  }

  console.log(`Total de oportunidades no banco: ${allOpportunities?.length || 0}`)
  console.log('')

  // 2. Check for duplicates by CPF
  const byCpf = new Map<string, typeof allOpportunities>()
  const byEmail = new Map<string, typeof allOpportunities>()
  const byName = new Map<string, typeof allOpportunities>()

  for (const p of allOpportunities || []) {
    if (p.cpf) {
      const key = p.cpf.replace(/\D/g, '') // normalize CPF
      if (!byCpf.has(key)) byCpf.set(key, [])
      byCpf.get(key)!.push(p)
    }
    if (p.email) {
      const key = p.email.toLowerCase().trim()
      if (!byEmail.has(key)) byEmail.set(key, [])
      byEmail.get(key)!.push(p)
    }
    if (p.name) {
      const key = p.name.toLowerCase().trim()
      if (!byName.has(key)) byName.set(key, [])
      byName.get(key)!.push(p)
    }
  }

  // Find duplicates
  const duplicateCpfs = [...byCpf.entries()].filter(([, v]) => v.length > 1)
  const duplicateEmails = [...byEmail.entries()].filter(([, v]) => v.length > 1)
  const duplicateNames = [...byName.entries()].filter(([, v]) => v.length > 1)

  console.log('--- DUPLICATAS (entre oportunidades) ---')
  console.log(`Por CPF: ${duplicateCpfs.length} grupos duplicados`)
  for (const [cpf, participants] of duplicateCpfs) {
    console.log(`  CPF ${cpf}: ${participants.length} registros`)
    for (const p of participants) {
      console.log(`    - ID: ${p.id}, Nome: ${p.name}, Criado: ${p.created_at}`)
    }
  }

  console.log(`Por Email: ${duplicateEmails.length} grupos duplicados`)
  for (const [email, participants] of duplicateEmails.slice(0, 10)) {
    console.log(`  ${email}: ${participants.length} registros`)
  }

  console.log(`Por Nome: ${duplicateNames.length} grupos duplicados`)
  for (const [name, participants] of duplicateNames.slice(0, 10)) {
    console.log(`  ${name}: ${participants.length} registros`)
  }

  // 3. Check for participants with is_opportunity=true but webhook says otherwise
  console.log('\n--- OPORTUNIDADES COM WEBHOOK_DATA INCONSISTENTE ---')
  let incorrectOpportunities = 0
  const idsToFix: string[] = []

  for (const p of allOpportunities || []) {
    if (!p.webhook_data) continue

    const webhookData = p.webhook_data as any
    const participant = webhookData?.participant || {}

    const rawOportunidade = participant.oportunidade ??
                            webhookData?.oportunidade ??
                            webhookData?.is_opportunity ??
                            webhookData?.fields?.oportunidade ??
                            webhookData?.fields?.is_opportunity

    // If no oportunidade field found in webhook at all, flag it
    if (rawOportunidade === undefined || rawOportunidade === null) {
      incorrectOpportunities++
      idsToFix.push(p.id)
      if (incorrectOpportunities <= 20) {
        console.log(`  SEM CAMPO oportunidade: ${p.name} (ID: ${p.id})`)
      }
      continue
    }

    if (!isOpportunityValue(rawOportunidade)) {
      incorrectOpportunities++
      idsToFix.push(p.id)
      if (incorrectOpportunities <= 20) {
        console.log(`  INCORRETO: ${p.name} - oportunidade="${rawOportunidade}" (ID: ${p.id})`)
      }
    }
  }
  console.log(`Total com is_opportunity incorreto: ${incorrectOpportunities}`)

  // 4. Check ALL participants for duplicates (not just opportunities)
  console.log('\n--- DUPLICATAS GERAIS (todos participantes) ---')
  const { data: allParticipants, error: allError } = await supabase
    .from('participants')
    .select('id, name, email, cpf, is_opportunity, event_id, created_at')
    .order('created_at', { ascending: true })

  if (allError) {
    console.error('Erro ao buscar todos participantes:', allError.message)
  } else {
    const allByCpf = new Map<string, any[]>()
    for (const p of allParticipants || []) {
      if (p.cpf) {
        const key = `${p.event_id}:${p.cpf.replace(/\D/g, '')}`
        if (!allByCpf.has(key)) allByCpf.set(key, [])
        allByCpf.get(key)!.push(p)
      }
    }
    const allDuplicateCpfs = [...allByCpf.entries()].filter(([, v]) => v.length > 1)
    console.log(`Grupos com CPF duplicado (mesmo evento): ${allDuplicateCpfs.length}`)

    // Count how many extra opportunities come from duplicates
    let extraOppsFromDuplicates = 0
    const duplicateIdsToRemove: string[] = []

    for (const [, participants] of allDuplicateCpfs) {
      // Keep the first one, mark others as duplicates
      const sorted = participants.sort((a: any, b: any) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i].is_opportunity) {
          extraOppsFromDuplicates++
        }
        duplicateIdsToRemove.push(sorted[i].id)
      }
    }
    console.log(`Registros duplicados a remover: ${duplicateIdsToRemove.length}`)
    console.log(`Oportunidades extras por duplicatas: ${extraOppsFromDuplicates}`)

    if (shouldFix && duplicateIdsToRemove.length > 0) {
      console.log('\nRemovendo participantes duplicados...')
      // Delete in batches
      for (let i = 0; i < duplicateIdsToRemove.length; i += 50) {
        const batch = duplicateIdsToRemove.slice(i, i + 50)
        const { error: deleteError } = await supabase
          .from('participants')
          .delete()
          .in('id', batch)

        if (deleteError) {
          console.error(`Erro ao deletar batch ${i}: ${deleteError.message}`)
        } else {
          console.log(`  Deletados ${Math.min(i + 50, duplicateIdsToRemove.length)}/${duplicateIdsToRemove.length}`)
        }
      }
    }
  }

  // 5. Fix incorrect is_opportunity values
  if (shouldFix && idsToFix.length > 0) {
    console.log(`\nCorrigindo ${idsToFix.length} participantes com is_opportunity incorreto...`)
    for (let i = 0; i < idsToFix.length; i += 50) {
      const batch = idsToFix.slice(i, i + 50)
      const { error: updateError } = await supabase
        .from('participants')
        .update({ is_opportunity: false })
        .in('id', batch)

      if (updateError) {
        console.error(`Erro ao atualizar batch ${i}: ${updateError.message}`)
      } else {
        console.log(`  Atualizados ${Math.min(i + 50, idsToFix.length)}/${idsToFix.length}`)
      }
    }
  }

  // Final count
  const { count } = await supabase
    .from('participants')
    .select('*', { count: 'exact', head: true })
    .eq('is_opportunity', true)

  console.log(`\n=== RESULTADO ===`)
  console.log(`Oportunidades atuais no banco: ${count}`)
  console.log(`Valor esperado: 190`)
  if (count !== 190) {
    console.log(`Diferença: ${(count || 0) - 190}`)
  }

  if (!shouldFix && (idsToFix.length > 0 || incorrectOpportunities > 0)) {
    console.log('\nExecute com --fix para aplicar as correções:')
    console.log('  npx tsx scripts/fix-opportunity-count.ts --fix')
  }
}

main().catch(err => {
  console.error('Erro fatal:', err)
  process.exit(1)
})
