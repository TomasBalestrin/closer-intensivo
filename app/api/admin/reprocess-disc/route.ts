import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { calculateArchetypes, getCombinedDescription, getArchetypeInfo } from '@/lib/archetypes'
import { calculateDISC, getDISCProfileInfo, getDISCTraitInfo } from '@/lib/disc'

export const maxDuration = 300

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
    const url = new URL(request.url)
    const eventId = url.searchParams.get('event_id')
    const dryRun = url.searchParams.get('dry_run') === 'true'

    // Find participants that need DISC reprocessing:
    // 1. Has form_completed_at (form was answered) but no disc_profile (analysis not done)
    // 2. Has disc_analysis with answers saved but no disc_score_d (scores not saved to columns)
    let query = supabase
      .from('participants')
      .select('id, name, email, disc_analysis, disc_profile, disc_score_d, form_completed_at, challenge_answer, desired_change_answer')

    if (eventId) {
      query = query.eq('event_id', eventId)
    }

    const { data: participants, error } = await query

    if (error) {
      return NextResponse.json(
        { error: 'Erro ao buscar participantes', details: error.message },
        { status: 500 }
      )
    }

    if (!participants || participants.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Nenhum participante encontrado',
        processed: 0,
      })
    }

    // Filter only those that need reprocessing
    const needsReprocessing = participants.filter(p => {
      const hasFormCompleted = !!p.form_completed_at
      const hasDiscProfile = !!p.disc_profile
      const hasDiscScores = p.disc_score_d !== null && p.disc_score_d !== undefined
      const hasAnswers = !!(p.disc_analysis as any)?.answers && Object.keys((p.disc_analysis as any).answers).length > 0

      // Needs reprocessing if:
      // - Form completed but no DISC profile at all
      // - Has DISC analysis with answers but scores not saved to columns
      return (hasFormCompleted && !hasDiscProfile && hasAnswers) ||
             (hasFormCompleted && hasDiscProfile && !hasDiscScores && hasAnswers) ||
             (!hasFormCompleted && !hasDiscProfile && hasAnswers)
    })

    if (needsReprocessing.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Nenhum participante precisa de reprocessamento DISC',
        total_checked: participants.length,
        needs_reprocessing: 0,
      })
    }

    if (dryRun) {
      return NextResponse.json({
        success: true,
        dry_run: true,
        total_checked: participants.length,
        needs_reprocessing: needsReprocessing.length,
        participants: needsReprocessing.map(p => ({
          id: p.id,
          name: p.name,
          has_disc_profile: !!p.disc_profile,
          has_disc_scores: p.disc_score_d !== null,
          has_answers: !!(p.disc_analysis as any)?.answers,
        })),
      })
    }

    // Also check for disc_forms table answers as fallback
    const participantIds = needsReprocessing.map(p => p.id)
    const { data: discForms } = await supabase
      .from('disc_forms')
      .select('participant_id, id, answers')
      .in('participant_id', participantIds)
      .not('answers', 'is', null)

    const formsByParticipant = new Map<string, any>()
    if (discForms) {
      for (const form of discForms) {
        if (form.answers && Object.keys(form.answers).length > 0) {
          formsByParticipant.set(form.participant_id, form)
        }
      }
    }

    const results = {
      total_checked: participants.length,
      needs_reprocessing: needsReprocessing.length,
      success: 0,
      errors: 0,
      details: [] as any[],
    }

    const openaiKey = process.env.OPENAI_API_KEY

    for (const participant of needsReprocessing) {
      try {
        // Get answers from disc_analysis or disc_forms
        let answers = (participant.disc_analysis as any)?.answers
        const discForm = formsByParticipant.get(participant.id)

        if ((!answers || Object.keys(answers).length === 0) && discForm?.answers) {
          answers = discForm.answers
        }

        if (!answers || Object.keys(answers).length === 0) {
          results.details.push({
            id: participant.id,
            name: participant.name,
            status: 'skipped',
            reason: 'Sem respostas do formulário',
          })
          continue
        }

        // Calculate archetypes and DISC
        const archetypeResult = calculateArchetypes(answers)
        const primaryInfo = getArchetypeInfo(archetypeResult.primary)
        const secondaryInfo = getArchetypeInfo(archetypeResult.secondary)
        const combinedDescription = getCombinedDescription(archetypeResult.primary, archetypeResult.secondary)

        const discResult = calculateDISC(answers)
        const discProfileInfo = getDISCProfileInfo(discResult.profile)
        const primaryTraitInfo = getDISCTraitInfo(discResult.primary)
        const secondaryTraitInfo = getDISCTraitInfo(discResult.secondary)

        // Get participant details for AI analysis
        const { data: fullParticipant } = await supabase
          .from('participants')
          .select('name, phone, niche, revenue')
          .eq('id', participant.id)
          .single()

        // Prepare default sales insights
        let salesAnalysis: any = {
          personality_summary: '',
          behavioral_profile: '',
          archetype_disc_combo: '',
          how_to_approach: '',
          communication_style: '',
          sales_approach: discProfileInfo.approachTips,
          decision_triggers: primaryTraitInfo?.motivators || [],
          predicted_objections: [],
          closing_strategies: [],
          things_to_avoid: [],
          quick_tips: discProfileInfo.approachTips.slice(0, 3),
        }

        // Use OpenAI if available
        if (openaiKey) {
          try {
            const prompt = buildAnalysisPrompt(
              fullParticipant, discResult, discProfileInfo, primaryTraitInfo, secondaryTraitInfo,
              archetypeResult, primaryInfo, secondaryInfo, combinedDescription,
              participant.challenge_answer, participant.desired_change_answer
            )

            const controller = new AbortController()
            const timeout = setTimeout(() => controller.abort(), 30000)

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${openaiKey}`,
              },
              body: JSON.stringify({
                model: 'gpt-4o-mini',
                max_tokens: 3000,
                temperature: 0.7,
                messages: [
                  {
                    role: 'system',
                    content: 'Você é um especialista em perfis comportamentais DISC, arquétipos de personalidade e vendas consultivas. Gere análises profundas e personalizadas. Responda APENAS com JSON válido, sem texto adicional, sem markdown.'
                  },
                  { role: 'user', content: prompt }
                ],
              }),
              signal: controller.signal,
            })

            clearTimeout(timeout)

            if (response.ok) {
              const data = await response.json()
              const content = data.choices[0]?.message?.content || ''
              try {
                const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/\{[\s\S]*\}/)
                if (jsonMatch) {
                  const jsonStr = jsonMatch[1] || jsonMatch[0]
                  const aiAnalysis = JSON.parse(jsonStr)
                  salesAnalysis = { ...salesAnalysis, ...aiAnalysis }
                }
              } catch (parseError) {
                console.error(`[${participant.name}] Error parsing OpenAI response:`, parseError)
              }
            }
          } catch (apiError) {
            console.error(`[${participant.name}] OpenAI API error:`, apiError)
          }
        }

        const allAnalysisData = {
          archetypes: { primary: archetypeResult.primary, secondary: archetypeResult.secondary, description: combinedDescription },
          disc: { profile: discResult.profile, scores: discResult.scores },
          disc_analysis: {
            profile_name: discProfileInfo.profile,
            profile_description: discProfileInfo.description,
            primary_trait: primaryTraitInfo,
            secondary_trait: secondaryTraitInfo
          },
          salesAnalysis,
          challengeAnswer: participant.challenge_answer,
          desiredChangeAnswer: participant.desired_change_answer,
        }

        // Save to database
        const { error: updateError } = await supabase
          .from('participants')
          .update({
            primary_archetype: archetypeResult.primary,
            secondary_archetype: archetypeResult.secondary,
            archetype_description: combinedDescription,
            disc_profile: discResult.profile,
            disc_score_d: discResult.scores.D,
            disc_score_i: discResult.scores.I,
            disc_score_s: discResult.scores.S,
            disc_score_c: discResult.scores.C,
            disc_analysis: {
              ...allAnalysisData,
              answers,
              profile_name: discProfileInfo.profile,
              profile_description: discProfileInfo.description,
              primary_trait: primaryTraitInfo,
              secondary_trait: secondaryTraitInfo
            },
            personality_summary: salesAnalysis.personality_summary || null,
            sales_approach: salesAnalysis.sales_approach || null,
            decision_triggers: salesAnalysis.decision_triggers || null,
            predicted_objections: salesAnalysis.predicted_objections || null,
            closing_strategies: salesAnalysis.closing_strategies || null,
            things_to_avoid: salesAnalysis.things_to_avoid || null,
            quick_tips: salesAnalysis.quick_tips || null,
            form_completed_at: participant.form_completed_at || new Date().toISOString(),
          })
          .eq('id', participant.id)

        if (updateError) {
          results.errors++
          results.details.push({
            id: participant.id,
            name: participant.name,
            status: 'error',
            error: updateError.message,
          })
        } else {
          results.success++
          results.details.push({
            id: participant.id,
            name: participant.name,
            status: 'success',
            disc_profile: discResult.profile,
          })
        }
      } catch (err: any) {
        results.errors++
        results.details.push({
          id: participant.id,
          name: participant.name,
          status: 'error',
          error: err.message,
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: `${results.success} participantes reprocessados com sucesso, ${results.errors} erros`,
      results,
    })
  } catch (error: any) {
    console.error('Batch DISC reprocess error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

function buildAnalysisPrompt(
  participant: any, discResult: any, discProfileInfo: any,
  primaryTraitInfo: any, secondaryTraitInfo: any,
  archetypeResult: any, primaryInfo: any, secondaryInfo: any,
  combinedDescription: string, challengeAnswer: string | null, desiredChangeAnswer: string | null
): string {
  return `Analise os seguintes dados e gere uma análise COMPLETA do perfil comportamental e insights de venda.

## Dados do Participante
- Nome: ${participant?.name || 'Não informado'}
- Nicho: ${participant?.niche || 'Não informado'}
- Faturamento: ${participant?.revenue || 'Não informado'}

## Perfil DISC
- Perfil: ${discResult.profile} (${discProfileInfo.profile})
- ${discProfileInfo.description}
- Primário: ${primaryTraitInfo?.name} - ${primaryTraitInfo?.buyingStyle}
- Secundário: ${secondaryTraitInfo?.name}

## Arquétipos de Personalidade
- Arquétipo Primário: ${archetypeResult.primary} - ${primaryInfo.description}
- Arquétipo Secundário: ${archetypeResult.secondary} - ${secondaryInfo.description}
- Combinação: ${combinedDescription}

## Respostas Abertas
- Maior desafio atual: "${challengeAnswer || 'Não informado'}"
- Mudança desejada: "${desiredChangeAnswer || 'Não informado'}"

## Scores DISC
- D (Dominância): ${discResult.scores.D}
- I (Influência): ${discResult.scores.I}
- S (Estabilidade): ${discResult.scores.S}
- C (Conformidade): ${discResult.scores.C}

Gere um JSON com EXATAMENTE esta estrutura:
{
  "personality_summary": "Análise detalhada de 4-6 frases sobre quem é essa pessoa.",
  "behavioral_profile": "Análise aprofundada de 4-5 frases sobre o comportamento dessa pessoa.",
  "archetype_disc_combo": "Análise de 3-4 frases combinando o arquétipo com o perfil DISC.",
  "how_to_approach": "Guia prático de 4-5 frases sobre COMO se comunicar e agir com essa pessoa.",
  "communication_style": "2-3 frases sobre o estilo de comunicação dessa pessoa.",
  "decision_triggers": ["gatilho1", "gatilho2", "gatilho3", "gatilho4", "gatilho5"],
  "predicted_objections": [
    {"objection": "objeção específica ao nicho", "script": "script palavra por palavra de como responder"},
    {"objection": "objeção 2", "script": "script 2"},
    {"objection": "objeção 3", "script": "script 3"},
    {"objection": "objeção 4", "script": "script 4"}
  ],
  "closing_strategies": [
    {"name": "nome da técnica", "script": "frase exata de fechamento personalizada"},
    {"name": "técnica 2", "script": "frase 2"},
    {"name": "técnica 3", "script": "frase 3"}
  ],
  "things_to_avoid": ["erro1 - explique por que evitar", "erro2 - explique", "erro3 - explique", "erro4 - explique"],
  "quick_tips": ["dica prática 1", "dica prática 2", "dica prática 3", "dica prática 4"]
}

IMPORTANTE:
- Personalize TUDO para o NICHO e FATURAMENTO da pessoa
- Use o DESAFIO e a MUDANÇA DESEJADA para contextualizar
- Responda APENAS o JSON, sem texto adicional`
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    description: 'Reprocessa análises DISC em lote para participantes que precisam',
    endpoint: '/api/admin/reprocess-disc',
    method: 'POST',
    parametros: {
      'event_id': 'UUID do evento (opcional)',
      'dry_run': 'true para simular sem processar (mostra quem precisa)',
    },
    criterios_reprocessamento: [
      'Formulário respondido (form_completed_at) mas sem disc_profile',
      'Tem disc_profile mas sem disc_score_d/i/s/c nas colunas',
      'Tem respostas salvas em disc_analysis.answers mas análise incompleta',
    ],
  })
}
