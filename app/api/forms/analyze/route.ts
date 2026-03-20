import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { calculateArchetypes, getCombinedDescription, getArchetypeInfo } from '@/lib/archetypes'
import { calculateDISC, getDISCProfileInfo, getDISCTraitInfo } from '@/lib/disc'

export const maxDuration = 60

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
    const { participantId, formId, answers, challengeAnswer, desiredChangeAnswer, instagram } = await request.json()
    const supabase = getSupabase()

    // Calculate archetypes (visible to participant)
    const archetypeResult = calculateArchetypes(answers)
    const primaryInfo = getArchetypeInfo(archetypeResult.primary)
    const secondaryInfo = getArchetypeInfo(archetypeResult.secondary)
    const combinedDescription = getCombinedDescription(archetypeResult.primary, archetypeResult.secondary)

    // Calculate DISC (hidden - only for closers)
    const discResult = calculateDISC(answers)
    const discProfileInfo = getDISCProfileInfo(discResult.profile)
    const primaryTraitInfo = getDISCTraitInfo(discResult.primary)
    const secondaryTraitInfo = getDISCTraitInfo(discResult.secondary)

    // Get participant data
    const { data: participant } = await supabase
      .from('participants')
      .select('name, phone, niche, revenue')
      .eq('id', participantId)
      .single()

    // Prepare default sales insights
    let salesAnalysis = {
      personality_summary: '',
      behavioral_profile: '',
      archetype_disc_combo: '',
      how_to_approach: '',
      communication_style: '',
      sales_approach: discProfileInfo.approachTips,
      decision_triggers: primaryTraitInfo?.motivators || [],
      predicted_objections: generateDefaultObjections(discResult.primary, discResult.secondary),
      closing_strategies: generateDefaultClosing(discResult.primary),
      things_to_avoid: generateThingsToAvoid(discResult.primary),
      quick_tips: discProfileInfo.approachTips.slice(0, 3)
    }

    // If OpenAI API key is available, use GPT for enhanced analysis
    const openaiKey = process.env.OPENAI_API_KEY
    if (openaiKey) {
      try {
        const prompt = `Analise os seguintes dados e gere uma análise COMPLETA do perfil comportamental e insights de venda.

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
  "personality_summary": "Análise detalhada de 4-6 frases sobre quem é essa pessoa. Descreva como ela pensa, toma decisões, o que valoriza na vida e nos negócios, como se comporta em grupo e individualmente. Combine as informações do perfil DISC com os arquétipos para criar um retrato completo. Personalize ao nicho e faturamento.",
  "behavioral_profile": "Análise aprofundada de 4-5 frases sobre o comportamento dessa pessoa. Como ela age sob pressão, como lida com conflitos, qual seu ritmo de tomada de decisão, como se relaciona com autoridade, como reage a mudanças. Baseie-se no perfil DISC ${discResult.profile} e no arquétipo ${archetypeResult.primary}.",
  "archetype_disc_combo": "Análise de 3-4 frases combinando o arquétipo ${archetypeResult.primary} + ${archetypeResult.secondary} com o perfil DISC ${discResult.profile}. Explique como essa combinação específica se manifesta na personalidade, nos pontos fortes e nas vulnerabilidades dessa pessoa.",
  "how_to_approach": "Guia prático de 4-5 frases sobre COMO se comunicar e agir com essa pessoa. Tom de voz ideal, linguagem corporal, ritmo da conversa, o que falar primeiro, o que evitar no início. Seja específico e acionável.",
  "communication_style": "2-3 frases sobre o estilo de comunicação dessa pessoa: como ela fala, o que espera ouvir, se prefere dados ou histórias, se é direta ou indireta.",
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
- A personality_summary deve ser RICA e DETALHADA, não genérica
- O behavioral_profile deve explicar padrões de comportamento reais
- O how_to_approach deve ser um guia prático que qualquer vendedor possa seguir
- Scripts devem ser frases prontas para usar na ligação
- Responda APENAS o JSON, sem texto adicional`

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
            // Extract JSON from markdown code block if present
            const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) ||
              content.match(/\{[\s\S]*\}/)

            if (jsonMatch) {
              const jsonStr = jsonMatch[1] || jsonMatch[0]
              const aiAnalysis = JSON.parse(jsonStr)
              salesAnalysis = { ...salesAnalysis, ...aiAnalysis }
            }
          } catch (parseError) {
            console.error('Error parsing OpenAI response:', parseError)
          }
        } else {
          const errBody = await response.text()
          console.error('OpenAI API error response:', response.status, errBody)
        }
      } catch (apiError) {
        console.error('OpenAI API error:', apiError)
      }
    }

    // Update participant with all analysis data
    // Strategy: Save analysis data into disc_analysis JSON (always works), then save individual columns progressively
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
      challengeAnswer,
      desiredChangeAnswer,
    }

    // Step 1: Save core DISC/archetype fields + form answers (these columns exist since migration_002)
    const coreUpdate: Record<string, any> = {
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
        profile_name: discProfileInfo.profile,
        profile_description: discProfileInfo.description,
        primary_trait: primaryTraitInfo,
        secondary_trait: secondaryTraitInfo
      },
      challenge_answer: challengeAnswer,
      desired_change_answer: desiredChangeAnswer,
      form_completed_at: new Date().toISOString(),
      ...(instagram ? { instagram: instagram.replace(/^@/, '').trim() } : {}),
    }

    const { error: coreError } = await supabase
      .from('participants')
      .update(coreUpdate)
      .eq('id', participantId)

    if (coreError) {
      console.error('Core DISC update failed:', coreError.message)
      // Fallback: try minimal update to at least mark as processed
      const { error: minimalError } = await supabase
        .from('participants')
        .update({
          primary_archetype: archetypeResult.primary,
          secondary_archetype: archetypeResult.secondary,
          disc_profile: discResult.profile,
          disc_score_d: discResult.scores.D,
          disc_score_i: discResult.scores.I,
          disc_score_s: discResult.scores.S,
          disc_score_c: discResult.scores.C,
          form_completed_at: new Date().toISOString(),
          challenge_answer: challengeAnswer,
          desired_change_answer: desiredChangeAnswer,
        })
        .eq('id', participantId)

      if (minimalError) {
        console.error('Minimal DISC update also failed:', minimalError.message)
      }
    }

    // Step 2: Try to save sales insight columns (may not exist in all schemas)
    const salesUpdate: Record<string, any> = {
      personality_summary: salesAnalysis.personality_summary,
      sales_approach: salesAnalysis.sales_approach,
      decision_triggers: salesAnalysis.decision_triggers,
      predicted_objections: salesAnalysis.predicted_objections,
      closing_strategies: salesAnalysis.closing_strategies,
      things_to_avoid: salesAnalysis.things_to_avoid,
      quick_tips: salesAnalysis.quick_tips,
    }

    const { error: salesError } = await supabase
      .from('participants')
      .update(salesUpdate)
      .eq('id', participantId)

    if (salesError) {
      console.error('Sales insight columns update failed (columns may not exist):', salesError.message)
    }

    // Also update disc_forms record with completion status and answers
    if (formId) {
      const { error: formUpdateError } = await supabase
        .from('disc_forms')
        .update({
          completed_at: new Date().toISOString(),
          answers: answers,
        })
        .eq('id', formId)

      if (formUpdateError) {
        console.error('Error updating disc_form:', formUpdateError)
      }
    } else {
      // Try to find and update disc_forms by participant_id
      const { error: formUpdateError } = await supabase
        .from('disc_forms')
        .update({
          completed_at: new Date().toISOString(),
          answers: answers,
        })
        .eq('participant_id', participantId)
        .is('completed_at', null)

      if (formUpdateError) {
        console.error('Error updating disc_form by participant:', formUpdateError)
      }
    }

    // Return only the visible data (archetypes)
    return NextResponse.json({
      success: true,
      archetypes: {
        primary: archetypeResult.primary,
        secondary: archetypeResult.secondary,
        primaryIcon: primaryInfo.icon,
        secondaryIcon: secondaryInfo.icon,
        primaryDescription: primaryInfo.description,
        secondaryDescription: secondaryInfo.description,
        primaryMotto: primaryInfo.motto || '',
        secondaryMotto: secondaryInfo.motto || '',
        primaryTraits: primaryInfo.traits || [],
        secondaryTraits: secondaryInfo.traits || [],
        primaryStrengths: primaryInfo.strengths || [],
        secondaryStrengths: secondaryInfo.strengths || [],
        primaryDetailedDescription: primaryInfo.detailedDescription || '',
        secondaryDetailedDescription: secondaryInfo.detailedDescription || '',
        combinedDescription
      }
    })
  } catch (error: any) {
    console.error('Analysis error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

function generateDefaultObjections(primary: 'D' | 'I' | 'S' | 'C', secondary: 'D' | 'I' | 'S' | 'C') {
  const objections: Record<string, Array<{ objection: string; script: string }>> = {
    D: [
      { objection: 'Não tenho tempo para isso', script: 'Entendo que seu tempo é valioso. Por isso mesmo esse programa foi desenhado para pessoas ocupadas - são apenas X horas por semana e você começa a ver resultados em Y dias.' },
      { objection: 'Qual é o ROI?', script: 'Excelente pergunta. Em média, nossos clientes recuperam o investimento em X meses. Posso te mostrar alguns casos específicos do seu nicho?' },
      { objection: 'Já tentei algo assim', script: 'O que exatamente você tentou e o que não funcionou? Pergunto porque nosso método é diferente em [diferencial]. Você testou algo nessa linha?' }
    ],
    I: [
      { objection: 'Preciso conversar com outras pessoas', script: 'Faz total sentido! Inclusive, temos um grupo incrível de pessoas como você. Quer que eu te mostre alguns depoimentos de quem já faz parte?' },
      { objection: 'E se não funcionar para mim?', script: 'Você tem razão em se preocupar. Por isso oferecemos [garantia]. E olha, pessoas exatamente como você já conseguiram [resultado]. Posso te apresentar algumas?' },
      { objection: 'Parece bom, mas...', script: 'O que está te segurando? Pergunto porque quero ter certeza de que você tem todas as informações para tomar a melhor decisão.' }
    ],
    S: [
      { objection: 'Preciso pensar mais', script: 'Entendo completamente. O que especificamente você gostaria de analisar melhor? Posso te ajudar com mais informações sobre isso.' },
      { objection: 'Não sei se é o momento', script: 'Respeito seu timing. Me conta: o que mudaria na sua situação para você sentir que é o momento certo?' },
      { objection: 'E o suporte depois?', script: 'Fico feliz que você perguntou! Nosso suporte é [detalhar]. Você não estará sozinho em nenhum momento do processo.' }
    ],
    C: [
      { objection: 'Preciso de mais informações', script: 'Com certeza! Que informações específicas você precisa? Tenho dados, cases e documentação que posso compartilhar.' },
      { objection: 'Como funciona exatamente?', script: 'Vou te explicar o processo passo a passo: [1, 2, 3]. Alguma etapa específica que você quer que eu detalhe mais?' },
      { objection: 'Quais são as garantias?', script: 'Oferecemos [garantia específica]. Além disso, temos [certificações/metodologia]. Quer ver os dados de resultados dos últimos clientes?' }
    ]
  }

  return [...objections[primary], ...(objections[secondary]?.slice(0, 1) || [])]
}

function generateDefaultClosing(primary: 'D' | 'I' | 'S' | 'C') {
  const closings: Record<string, Array<{ name: string; script: string }>> = {
    D: [
      { name: 'Alternativa', script: 'Então, você prefere começar com o plano X ou o Y?' },
      { name: 'Urgência', script: 'Essa condição é válida até hoje. Vamos garantir sua vaga?' },
      { name: 'Direto', script: 'Pelo que conversamos, faz sentido para você. Vamos fechar?' }
    ],
    I: [
      { name: 'Prova Social', script: 'Muitas pessoas como você já estão tendo resultados. Vamos juntos nessa?' },
      { name: 'Visão Futura', script: 'Imagina você daqui a 6 meses com [resultado]. Vamos começar essa jornada?' },
      { name: 'Exclusividade', script: 'Você tem perfil para nossa mentoria premium. Posso reservar sua vaga?' }
    ],
    S: [
      { name: 'Suporte', script: 'Estarei com você em cada etapa. Posso te ajudar a dar esse primeiro passo?' },
      { name: 'Gradual', script: 'Começamos devagar, no seu ritmo. O que acha de iniciarmos?' },
      { name: 'Segurança', script: 'Com nossa garantia, você não tem nada a perder. Vamos?' }
    ],
    C: [
      { name: 'Lógico', script: 'Pelos dados que vimos, faz sentido lógico investir. Concorda?' },
      { name: 'Processo', script: 'O próximo passo é [X]. Podemos avançar?' },
      { name: 'Informação', script: 'Você tem todas as informações. O que te impede de começar hoje?' }
    ]
  }

  return closings[primary]
}

function generateThingsToAvoid(primary: 'D' | 'I' | 'S' | 'C') {
  const avoid: Record<string, string[]> = {
    D: ['Enrolar ou dar voltas', 'Falar demais', 'Parecer inseguro', 'Pressão artificial'],
    I: ['Ser muito técnico', 'Ignorar relacionamento', 'Pressionar cedo demais', 'Ser negativo'],
    S: ['Apressar a decisão', 'Mudanças bruscas', 'Criar urgência falsa', 'Ignorar preocupações'],
    C: ['Exagerar benefícios', 'Ser impreciso', 'Pressionar sem dados', 'Respostas vagas']
  }

  return avoid[primary]
}
