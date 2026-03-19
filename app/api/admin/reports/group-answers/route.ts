import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { answers, type, qualification } = await request.json()

    if (!answers || !Array.isArray(answers) || answers.length === 0) {
      return NextResponse.json({ error: 'Respostas são obrigatórias' }, { status: 400 })
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'OpenAI API key não configurada' }, { status: 500 })
    }

    // Cap at 200 answers to avoid context overflow
    const sampled = answers.length > 200
      ? answers.sort(() => Math.random() - 0.5).slice(0, 200)
      : answers
    const totalCount = answers.length
    const isSampled = answers.length > 200

    const qualLabel = qualification === 'alto' ? 'alta (faturamento acima de R$ 50k/mês)'
      : qualification === 'medio' ? 'média (faturamento entre R$ 10k e R$ 50k/mês)'
      : 'baixa (faturamento até R$ 10k/mês)'

    const typeLabel = type === 'challenge'
      ? 'Qual a maior dificuldade no seu negócio hoje?'
      : 'O que você pretende aprender no Intensivo da Alta Performance?'

    const systemPrompt = `Você é um especialista em análise qualitativa de respostas de pesquisa para eventos presenciais de vendas.

Receba a lista de respostas de participantes de um evento intensivo de vendas da Bethel.
Estes são participantes de qualificação ${qualLabel}.

Pergunta respondida: "${typeLabel}"

${isSampled ? `NOTA: Foram amostradas ${sampled.length} respostas de um total de ${totalCount}. Calcule as porcentagens proporcionalmente ao total de ${totalCount}.` : ''}

Agrupe as respostas semanticamente similares em 5 a 10 categorias.
Para cada categoria:
- Crie um rótulo descritivo curto (máximo 60 caracteres em português)
- Conte quantas respostas pertencem a essa categoria
- Calcule a porcentagem em relação ao total de ${totalCount} respostas
- Selecione 4-5 respostas representativas literais da lista

Uma resposta pode pertencer a apenas uma categoria. Ordene por contagem decrescente.

Responda EXCLUSIVAMENTE em JSON válido no formato:
{
  "groups": [
    {
      "theme": "string",
      "count": number,
      "percentage": number,
      "sample_answers": ["string", "string"]
    }
  ]
}`

    const userPrompt = `Respostas para agrupar:\n${sampled.map((a: string) => `- ${a}`).join('\n')}`

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 60000)

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 3000,
        temperature: 0.3,
        response_format: { type: 'json_object' },
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
    const content = data.choices?.[0]?.message?.content || '{}'

    try {
      const parsed = JSON.parse(content)
      return NextResponse.json(parsed)
    } catch {
      console.error('Failed to parse AI response as JSON:', content)
      return NextResponse.json({ error: 'Resposta da IA não é JSON válido' }, { status: 500 })
    }
  } catch (error: any) {
    console.error('Error in group-answers:', error)
    if (error.name === 'AbortError') {
      return NextResponse.json({ error: 'Timeout no agrupamento (60s)' }, { status: 504 })
    }
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 })
  }
}
