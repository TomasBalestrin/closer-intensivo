#!/usr/bin/env npx tsx
/**
 * Script para auto-atribuir closers baseado no seller_closer_id
 *
 * Para cada participante que tem seller_closer_id mas não tem assigned_closer_id,
 * verifica se o closer está disponível para o evento e atribui automaticamente.
 *
 * Uso: npx tsx scripts/auto-assign-closers.ts
 *
 * Variáveis de ambiente necessárias:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js'

// Load env from .env.local if available
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

async function main() {
  console.log('🔄 Iniciando auto-atribuição de closers...\n')

  // 1. Buscar participantes com seller_closer_id mas sem assigned_closer_id
  const { data: participants, error: participantsError } = await supabase
    .from('participants')
    .select('id, name, event_id, seller_closer_id, seller_closer_name')
    .not('seller_closer_id', 'is', null)
    .is('assigned_closer_id', null)

  if (participantsError) {
    console.error('❌ Erro ao buscar participantes:', participantsError.message)
    process.exit(1)
  }

  console.log(`📋 Encontrados ${participants?.length || 0} participantes para processar\n`)

  if (!participants || participants.length === 0) {
    console.log('✅ Nenhum participante precisa de atribuição')
    return
  }

  // 2. Buscar todos os closers disponíveis por evento (user_events)
  const { data: userEvents, error: userEventsError } = await supabase
    .from('user_events')
    .select('user_id, event_id')
    .eq('role', 'closer')

  if (userEventsError) {
    console.error('❌ Erro ao buscar user_events:', userEventsError.message)
    process.exit(1)
  }

  // Criar um Set para lookup rápido: "user_id:event_id"
  const availableClosers = new Set(
    userEvents?.map(ue => `${ue.user_id}:${ue.event_id}`) || []
  )

  console.log(`👥 Closers disponíveis em eventos: ${availableClosers.size} registros\n`)

  // 3. Processar cada participante
  let assigned = 0
  let skipped = 0

  for (const participant of participants) {
    const key = `${participant.seller_closer_id}:${participant.event_id}`

    if (availableClosers.has(key)) {
      // Closer está disponível para o evento, atribuir
      const { error: updateError } = await supabase
        .from('participants')
        .update({ assigned_closer_id: participant.seller_closer_id })
        .eq('id', participant.id)

      if (updateError) {
        console.error(`❌ Erro ao atribuir closer para ${participant.name}:`, updateError.message)
      } else {
        console.log(`✅ ${participant.name} -> Closer: ${participant.seller_closer_name}`)
        assigned++
      }
    } else {
      console.log(`⏭️  ${participant.name} -> Closer ${participant.seller_closer_name} não disponível para o evento`)
      skipped++
    }
  }

  console.log('\n📊 Resumo:')
  console.log(`   ✅ Atribuídos: ${assigned}`)
  console.log(`   ⏭️  Ignorados (closer não disponível): ${skipped}`)
  console.log('\n🎉 Concluído!')
}

main().catch(console.error)
