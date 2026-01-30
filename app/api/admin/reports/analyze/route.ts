import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { prompt, context } = await request.json()

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt é obrigatório' }, { status: 400 })
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'OpenAI API key não configurada' }, { status: 500 })
    }

    const systemPrompt = `Você é um analista de dados especializado em eventos presenciais de vendas e mentorias.
Você recebe dados de participantes de um evento intensivo e deve gerar análises estratégicas.

Responda SEMPRE em português brasileiro.
Use formatação markdown para organizar a resposta (tabelas, listas, negrito, etc).
Seja direto e objetivo. Forneça insights acionáveis.

Dados do contexto do evento:
${context}`

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 60000)

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        max_tokens: 4000,
        temperature: 0.7,
      }),
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('OpenAI API error:', errorData)
      return NextResponse.json(
        { error: `Erro na API OpenAI: ${response.status}` },
        { status: 500 }
      )
    }

    const data = await response.json()
    const result = data.choices?.[0]?.message?.content || 'Sem resposta da IA'

    return NextResponse.json({ result })
  } catch (error: any) {
    console.error('Error in reports analyze:', error)
    if (error.name === 'AbortError') {
      return NextResponse.json({ error: 'Timeout na análise (60s)' }, { status: 504 })
    }
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 })
  }
}
