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

const DISC_DESCRIPTIONS: Record<string, string> = {
  D: 'Dominância - Pessoas com perfil D são focadas em resultados, decisivas e diretas. Gostam de desafios e de estar no controle.',
  I: 'Influência - Pessoas com perfil I são entusiastas, otimistas e sociáveis. Gostam de interagir com pessoas e influenciar os outros.',
  S: 'Estabilidade - Pessoas com perfil S são pacientes, confiáveis e boas ouvintes. Valorizam estabilidade e harmonia.',
  C: 'Conformidade - Pessoas com perfil C são analíticas, precisas e sistemáticas. Valorizam qualidade e acurácia.',
}

export async function POST(request: Request) {
  try {
    const { formId, responses, participant, discProfile } = await request.json()
    const supabase = getSupabase()

    // Check if Anthropic API key is available
    const anthropicKey = process.env.ANTHROPIC_API_KEY

    let analysis: any = {
      disc_description: DISC_DESCRIPTIONS[discProfile] || 'Perfil não identificado',
      sales_insights: getDefaultInsights(discProfile),
      objections: getDefaultObjections(discProfile),
      objection_handling: getDefaultHandling(discProfile),
      closing_examples: getDefaultClosing(discProfile),
    }

    // If Anthropic API key is available, use Claude for analysis
    if (anthropicKey) {
      try {
        const prompt = `Você é um especialista em perfis comportamentais DISC e vendas. Analise as seguintes informações e forneça insights de venda.

Dados do Participante:
- Nome: ${participant?.name || 'Não informado'}
- Faturamento: ${participant?.revenue || 'Não informado'}
- Nicho: ${participant?.niche || 'Não informado'}

Perfil DISC identificado: ${discProfile}

Respostas do formulário: ${JSON.stringify(responses)}

Com base nessas informações, forneça:

1. PERFIL DISC (2-3 parágrafos descrevendo o perfil comportamental)

2. INSIGHTS PARA VENDER (3-5 pontos específicos sobre como abordar essa pessoa)

3. OBJEÇÕES PROVÁVEIS (3-5 objeções que essa pessoa provavelmente levantará)

4. COMO CONTORNAR OBJEÇÕES (estratégias específicas para cada objeção)

5. EXEMPLOS DE FECHAMENTO (3 exemplos de frases de fechamento adequadas para este perfil)

Formate a resposta em JSON com as chaves: disc_description, sales_insights, objections, objection_handling, closing_examples`

        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': anthropicKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-3-haiku-20240307',
            max_tokens: 2000,
            messages: [
              {
                role: 'user',
                content: prompt,
              },
            ],
          }),
        })

        if (response.ok) {
          const data = await response.json()
          const content = data.content[0].text

          // Try to parse JSON from the response
          try {
            // Extract JSON from markdown code block if present
            const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) ||
              content.match(/\{[\s\S]*\}/)

            if (jsonMatch) {
              const jsonStr = jsonMatch[1] || jsonMatch[0]
              analysis = JSON.parse(jsonStr)
            }
          } catch (parseError) {
            console.error('Error parsing Claude response:', parseError)
            // Keep default analysis
          }
        }
      } catch (claudeError) {
        console.error('Claude API error:', claudeError)
        // Keep default analysis
      }
    }

    // Update form with analysis
    const { error: updateError } = await supabase
      .from('disc_forms')
      .update({
        analysis: JSON.stringify(analysis),
        sales_approach: analysis.sales_insights,
      })
      .eq('id', formId)

    if (updateError) {
      console.error('Error updating form:', updateError)
      return NextResponse.json(
        { error: 'Error saving analysis' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, analysis })
  } catch (error: any) {
    console.error('Analysis error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

function getDefaultInsights(profile: string): string {
  const insights: Record<string, string> = {
    D: `• Seja direto e objetivo na apresentação
• Foque em resultados e benefícios concretos
• Mostre como o produto/serviço vai ajudar a atingir metas
• Evite detalhes desnecessários
• Dê opções e deixe que a pessoa tome a decisão`,
    I: `• Crie um ambiente descontraído e amigável
• Use histórias e casos de sucesso
• Valorize a opinião da pessoa
• Mostre o impacto social e reconhecimento
• Seja entusiasta e positivo`,
    S: `• Construa confiança gradualmente
• Seja paciente e não pressione
• Mostre estabilidade e segurança do produto
• Envolva a equipe ou família na decisão
• Garanta suporte pós-venda`,
    C: `• Apresente dados e fatos comprovados
• Responda todas as perguntas técnicas
• Forneça documentação detalhada
• Dê tempo para análise
• Seja preciso e consistente`,
  }
  return insights[profile] || insights.S
}

function getDefaultObjections(profile: string): string {
  const objections: Record<string, string> = {
    D: `• "Não tenho tempo para isso"
• "Preciso ver resultados rápidos"
• "Qual é o retorno sobre investimento?"
• "Já tentei algo similar antes"`,
    I: `• "Preciso conversar com outras pessoas primeiro"
• "Parece interessante, mas..."
• "E se não funcionar para mim?"
• "Conheço alguém que teve uma experiência ruim"`,
    S: `• "Preciso pensar mais sobre isso"
• "Não sei se é o momento certo"
• "E se minha situação mudar?"
• "Preciso consultar minha família/equipe"`,
    C: `• "Preciso de mais informações"
• "Como exatamente isso funciona?"
• "Quais são as garantias?"
• "Posso ver os dados/estudos?"`,
  }
  return objections[profile] || objections.S
}

function getDefaultHandling(profile: string): string {
  const handling: Record<string, string> = {
    D: `• Respeite o tempo: "Vou ser breve e direto"
• Mostre ROI: "Em X meses, você terá Y de retorno"
• Use desafios: "Será que você está pronto para esse nível?"
• Prove com fatos: "Veja esses resultados comprovados"`,
    I: `• Valide a opinião: "É importante ouvir outras pessoas"
• Use prova social: "Muitos clientes como você tiveram sucesso"
• Crie urgência positiva: "Imagine você já com esses resultados"
• Ofereça garantias: "Você não tem nada a perder"`,
    S: `• Dê tempo: "Não precisa decidir agora"
• Mostre segurança: "Temos X anos no mercado"
• Inclua suporte: "Estaremos com você em cada etapa"
• Reduza riscos: "Temos garantia de satisfação"`,
    C: `• Forneça dados: "Aqui estão os números detalhados"
• Seja técnico: "O processo funciona assim..."
• Ofereça documentação: "Posso enviar o material completo"
• Prove qualidade: "Veja nossa certificação/metodologia"`,
  }
  return handling[profile] || handling.S
}

function getDefaultClosing(profile: string): string {
  const closing: Record<string, string> = {
    D: `1. "Qual opção você prefere: plano A ou plano B?"
2. "Vamos começar hoje para você ter resultados mais rápido?"
3. "O que você precisa para tomar essa decisão agora?"`,
    I: `1. "Imagina como vai ser bom compartilhar essa conquista!"
2. "Vários clientes como você já começaram, vamos juntos?"
3. "Que tal começar e depois contar para seus amigos?"`,
    S: `1. "Posso te ajudar a dar esse primeiro passo?"
2. "Começamos devagar, no seu ritmo, o que acha?"
3. "Estarei aqui para te apoiar em cada etapa."`,
    C: `1. "Você tem todas as informações que precisa para decidir?"
2. "Posso esclarecer mais algum detalhe antes de começar?"
3. "Qual próximo passo faz mais sentido para você?"`,
  }
  return closing[profile] || closing.S
}
