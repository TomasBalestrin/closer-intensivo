import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { Participant } from '@/lib/types/database'
import { getQualificationFromRevenue } from '@/lib/utils'
import {
  PDF_COLORS,
  PDF_FONTS,
  QUAL_LABELS,
  QUAL_REVENUE_RANGE,
  addCover,
  addSectionHeader,
  addSubsectionTitle,
  addWrappedText,
  addPageNumbers,
  getMargin,
  getContentWidth,
} from '@/lib/utils/pdf-helpers'

// ============================================
// TYPES
// ============================================

interface AnswerGroup {
  theme: string
  count: number
  percentage: number
  sample_answers: string[]
}

interface QualificationBlock {
  qualification: 'alto' | 'medio' | 'baixo'
  count: number
  participants: Participant[]
  nicheBreakdown: { niche: string; count: number; percentage: number }[]
  challengeGroups: AnswerGroup[]
  desiredChangeGroups: AnswerGroup[]
  strategicAnalysis: string
}

export interface PdfReportInput {
  participants: Participant[]
  dayFilter: 'all' | 'day1' | 'day2' | 'day3'
  eventName: string
  onProgress: (step: string, current: number, total: number) => void
}

// ============================================
// MAIN GENERATOR
// ============================================

export async function generatePdfReport(input: PdfReportInput): Promise<void> {
  const { participants, dayFilter, eventName, onProgress } = input
  const totalSteps = 10

  // Step 1: Filter by day
  onProgress('Filtrando participantes...', 1, totalSteps)
  const filtered = filterByDay(participants, dayFilter)

  // Step 2: Partition by qualification
  onProgress('Separando por qualificação...', 2, totalSteps)
  const groups = partitionByQualification(filtered)

  // Step 3-5: Group answers by AI (parallel per qualification)
  const qualKeys: ('alto' | 'medio' | 'baixo')[] = ['alto', 'medio', 'baixo']
  const blocks: QualificationBlock[] = []

  // Parallel grouping calls (6 total: 2 per qualification)
  onProgress('Agrupando respostas com IA...', 3, totalSteps)

  const groupingPromises = qualKeys.map(async (qual) => {
    const parts = groups[qual]
    if (parts.length === 0) return { qual, challenges: [], desired: [] }

    const challengeAnswers = parts
      .map(p => p.challenge_answer)
      .filter((a): a is string => !!a && a.trim().length > 0)

    const desiredAnswers = parts
      .map(p => p.desired_change_answer)
      .filter((a): a is string => !!a && a.trim().length > 0)

    const [challenges, desired] = await Promise.all([
      challengeAnswers.length >= 3
        ? groupAnswersViaAI(challengeAnswers, 'challenge', qual)
        : fallbackGrouping(challengeAnswers),
      desiredAnswers.length >= 3
        ? groupAnswersViaAI(desiredAnswers, 'desired_change', qual)
        : fallbackGrouping(desiredAnswers),
    ])

    return { qual, challenges, desired }
  })

  const groupingResults = await Promise.allSettled(groupingPromises)

  onProgress('Calculando nichos...', 5, totalSteps)

  // Build blocks with niche data
  for (const result of groupingResults) {
    if (result.status === 'rejected') continue
    const { qual, challenges, desired } = result.value
    const parts = groups[qual]
    if (parts.length === 0) continue

    blocks.push({
      qualification: qual,
      count: parts.length,
      participants: parts,
      nicheBreakdown: computeNicheBreakdown(parts),
      challengeGroups: challenges,
      desiredChangeGroups: desired,
      strategicAnalysis: '', // filled next
    })
  }

  // Step 6-8: Strategic analysis (parallel, depends on grouping)
  onProgress('Gerando análise estratégica com IA...', 6, totalSteps)

  const analysisPromises = blocks.map(async (block) => {
    try {
      const analysis = await generateStrategicAnalysis(block)
      block.strategicAnalysis = analysis
    } catch (e) {
      console.error(`Failed strategic analysis for ${block.qualification}:`, e)
      block.strategicAnalysis = 'Não foi possível gerar a análise estratégica. Tente novamente.'
    }
  })

  await Promise.allSettled(analysisPromises)

  // Step 9: Build PDF
  onProgress('Montando PDF...', 8, totalSteps)

  const totalFiltered = filtered.length
  const summary = {
    alto: groups.alto.length,
    medio: groups.medio.length,
    baixo: groups.baixo.length,
    total: totalFiltered,
  }

  const doc = new jsPDF('p', 'mm', 'a4')

  // Cover page
  addCover(doc, eventName, dayFilter, summary)

  // Qualification blocks
  for (const block of blocks) {
    doc.addPage()
    buildQualificationBlock(doc, block)
  }

  // Page numbers
  addPageNumbers(doc)

  // Step 10: Download
  onProgress('Baixando PDF...', 10, totalSteps)

  const dayLabel = dayFilter === 'all' ? 'todos' : dayFilter
  const filename = `relatorio_qualificacao_${dayLabel}_${new Date().toISOString().split('T')[0]}.pdf`
  doc.save(filename)
}

// ============================================
// FILTERING & PARTITIONING
// ============================================

function filterByDay(participants: Participant[], dayFilter: string): Participant[] {
  switch (dayFilter) {
    case 'day1': return participants.filter(p => p.checked_in_day1)
    case 'day2': return participants.filter(p => p.checked_in_day2)
    case 'day3': return participants.filter(p => p.checked_in_day3)
    default: return participants
  }
}

function partitionByQualification(participants: Participant[]) {
  const groups: Record<'alto' | 'medio' | 'baixo', Participant[]> = {
    alto: [],
    medio: [],
    baixo: [],
  }

  participants.forEach(p => {
    const qual = p.qualification || getQualificationFromRevenue(p.revenue)
    if (qual === 'alto') groups.alto.push(p)
    else if (qual === 'medio') groups.medio.push(p)
    else if (qual === 'baixo') groups.baixo.push(p)
    // Skip 'sem qualificação' — not included in report blocks
  })

  return groups
}

function computeNicheBreakdown(participants: Participant[]) {
  const counts: Record<string, number> = {}
  participants.forEach(p => {
    const niche = p.niche?.trim() || 'Não informado'
    counts[niche] = (counts[niche] || 0) + 1
  })

  const total = participants.length
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([niche, count]) => ({
      niche,
      count,
      percentage: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
    }))
}

// ============================================
// AI CALLS
// ============================================

async function groupAnswersViaAI(
  answers: string[],
  type: 'challenge' | 'desired_change',
  qualification: string
): Promise<AnswerGroup[]> {
  try {
    const res = await fetch('/api/admin/reports/group-answers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers, type, qualification }),
    })

    if (!res.ok) throw new Error(`API error: ${res.status}`)

    const data = await res.json()
    return data.groups || []
  } catch (e) {
    console.error('AI grouping failed, using fallback:', e)
    return fallbackGrouping(answers)
  }
}

function fallbackGrouping(answers: string[]): AnswerGroup[] {
  // Simple keyword-based fallback
  if (answers.length === 0) return []

  const total = answers.length
  return [{
    theme: 'Respostas gerais',
    count: total,
    percentage: 100,
    sample_answers: answers.slice(0, 3),
  }]
}

async function generateStrategicAnalysis(block: QualificationBlock): Promise<string> {
  const qualLabel = QUAL_LABELS[block.qualification]
  const revenueRange = QUAL_REVENUE_RANGE[block.qualification]

  // Nichos formatados
  const nicheText = block.nicheBreakdown.slice(0, 10)
    .map(n => `- ${n.niche}: ${n.count} pessoas (${n.percentage}%)`)
    .join('\n')

  // Dificuldades com respostas reais dos participantes
  const challengeDetailText = block.challengeGroups.slice(0, 8)
    .map(g => {
      const samples = g.sample_answers.map(a => `  "${a}"`).join('\n')
      return `- TEMA: ${g.theme} (${g.count} pessoas, ${g.percentage}%)\n  Respostas reais:\n${samples}`
    })
    .join('\n\n')

  // Objetivos com respostas reais
  const desiredDetailText = block.desiredChangeGroups.slice(0, 8)
    .map(g => {
      const samples = g.sample_answers.map(a => `  "${a}"`).join('\n')
      return `- TEMA: ${g.theme} (${g.count} pessoas, ${g.percentage}%)\n  Respostas reais:\n${samples}`
    })
    .join('\n\n')

  // Respostas brutas adicionais para dar mais contexto
  const rawChallenges = block.participants
    .map(p => p.challenge_answer)
    .filter((a): a is string => !!a && a.trim().length > 10)
    .slice(0, 40)
    .map(a => `- "${a}"`)
    .join('\n')

  const rawDesired = block.participants
    .map(p => p.desired_change_answer)
    .filter((a): a is string => !!a && a.trim().length > 10)
    .slice(0, 40)
    .map(a => `- "${a}"`)
    .join('\n')

  const systemPrompt = `Você é o maior estrategista de palco e vendas presenciais do Brasil. Você é especialista em criar seeds, loops abertos, quebras de objeção e roteiros de palco para eventos de alta conversão.

Você NÃO é um assistente genérico. Você é um estrategista que analisa dados REAIS de audiência e cria material ESPECÍFICO e PRONTO PARA USAR baseado exatamente no que essas pessoas escreveram.

REGRAS ABSOLUTAS:
1. Cada seed, loop e frase DEVE referenciar uma dor ou desejo REAL que apareceu nas respostas dos participantes. Cite trechos reais.
2. NUNCA escreva frases genéricas como "é importante usar autoridade" ou "mostre cases de sucesso". Escreva a FRASE EXATA pronta para usar.
3. Cada item deve ter contexto de QUANDO usar nos 3 dias do evento (dia 1 = aquecimento, dia 2 = aprofundamento, dia 3 = conversão).
4. Não use formatação markdown (sem **, ##, *). Use apenas texto corrido, parágrafos, "- " para listas e MAIÚSCULAS para títulos de seção.
5. Escreva em português brasileiro coloquial de palco, como um palestrante realmente fala.`

  const prompt = `Analise os dados REAIS abaixo de ${block.count} participantes de qualificação ${qualLabel} (${revenueRange}) do Intensivo da Alta Performance da Bethel.

=== NICHOS DOS PARTICIPANTES ===
${nicheText}

=== MAIORES DIFICULDADES (agrupadas por tema + respostas reais) ===
${challengeDetailText || 'Sem dados'}

=== AMOSTRA AMPLA DE RESPOSTAS SOBRE DIFICULDADES ===
${rawChallenges || 'Sem dados'}

=== O QUE BUSCAM NO INTENSIVO (agrupado por tema + respostas reais) ===
${desiredDetailText || 'Sem dados'}

=== AMOSTRA AMPLA DE RESPOSTAS SOBRE O QUE BUSCAM ===
${rawDesired || 'Sem dados'}

=== SUA TAREFA ===

Com base EXCLUSIVAMENTE nos dados acima (não invente dores que não existem), gere:

DIAGNÓSTICO PROFUNDO DESTE PERFIL
Qual é a real situação desses empresários de ${revenueRange}? Qual a "conversa interna" que eles têm? O que eles escreveram nas respostas revela quais padrões? Quais dores eles NÃO sabem nomear mas ficam evidentes nas respostas? O que conecta as dificuldades com o que buscam? Cite trechos reais das respostas para embasar cada ponto.

SEEDS PARA PLANTAR NAS PALESTRAS (mínimo 6)
Para cada seed:
- A FRASE EXATA para o palestrante dizer no palco
- Em qual momento dos 3 dias usar (dia 1 abertura, dia 1 tarde, dia 2 manhã, dia 2 tarde, dia 3 antes do pitch)
- Qual dor específica da audiência essa seed ativa (cite a resposta real que inspirou)
- Como essa seed será "colhida" no momento da oferta do Elite Premium

Exemplos do formato esperado:
Seed 1: "Quem aqui já tentou montar um processo comercial sozinho, assistindo vídeo no YouTube, e depois de 3 meses percebeu que nada mudou de verdade?"
Momento: Dia 1, palestra da tarde sobre processos de vendas
Dor ativada: 23% escreveram que sua maior dificuldade é "estruturar processos comerciais" e "organizar o comercial"
Colheita: No pitch — "Lembra quando eu perguntei quem tentou sozinho? O Elite Premium existe para você nunca mais precisar adivinhar o próximo passo."

LOOPS ABERTOS (mínimo 5)
Para cada loop:
- A frase exata para abrir o loop
- Em qual palestra/momento usar
- Qual dor/desejo da audiência ele ativa
- Quando e como fechar o loop (no pitch ou na conversa com closer)

QUEBRA DE OBJEÇÕES PRÉVIA (mínimo 5)
Baseado no perfil de faturamento ${revenueRange} e nos nichos predominantes, para cada objeção:
- Qual é a objeção (seja específico para este perfil, não genérico)
- A frase EXATA de quebra para usar no palco ANTES do pitch, de forma indireta durante o conteúdo
- POR QUE essa frase funciona psicologicamente
- Em qual momento do evento inserir

ROTEIRO DE ABORDAGEM PARA CLOSERS
Escreva um roteiro completo e detalhado que o closer pode seguir para abordar este perfil:
- 3 frases diferentes de abertura (conectando com conteúdo do palco e dores deste grupo)
- Perguntas de diagnóstico que revelam se a pessoa precisa do Elite Premium (baseadas nas dores reais que apareceram)
- Como usar as próprias respostas do formulário contra a objeção ("Você mesmo escreveu que sua maior dificuldade é X... e isso é exatamente o módulo Y do Elite Premium")
- Frases de transição para apresentar a oferta
- Como lidar com "vou pensar", "tá caro", "preciso falar com sócio" — frases específicas para este perfil
- Frase de fechamento

Seja BRUTAL na especificidade. Cada frase deve ser tão específica que só funciona para ESTE grupo de participantes com ESTAS dores. Se a frase poderia ser usada em qualquer evento genérico, ela está ERRADA — refaça.`

  const context = `CONTEXTO DO PRODUTO - ELITE PREMIUM:
O Elite Premium é a mentoria premium de 1 ano da Bethel que inclui:
- Estratégia comercial e processo de vendas completo
- Estruturação de esteira de produtos com ticket médio crescente
- Implementação de funis de venda que convertem
- Marketing e posicionamento digital
- Processos de gestão e contratação de equipe
- Ferramentas e SaaS exclusivos para mentorados
- Acompanhamento próximo e personalizado durante 12 meses

É o produto de maior ticket do evento e o objetivo principal de conversão durante o Intensivo da Alta Performance.

CONTEXTO DO EVENTO - INTENSIVO DA ALTA PERFORMANCE:
Evento presencial de 3 dias da Bethel. Palestrantes no palco ensinam conteúdo sobre vendas, gestão, processos comerciais e escala, enquanto plantam seeds e abrem loops que preparam para a oferta do Elite Premium no dia 3. Closers circulam pelo salão e abordam participantes nos intervalos e após as palestras.

Dia 1: Aquecimento — gerar rapport, mostrar que o participante está no lugar certo, começar a plantar desconforto com a situação atual
Dia 2: Aprofundamento — conteúdo técnico que mostra a complexidade do que precisa ser feito, gerar a sensação de "eu preciso de ajuda com isso"
Dia 3: Conversão — fechar loops, colher seeds, pitch do Elite Premium, closers em ação`

  const res = await fetch('/api/admin/reports/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      context,
      max_tokens: 12000,
      model: 'gpt-4o',
      system_prompt: systemPrompt,
    }),
  })

  if (!res.ok) throw new Error(`Analysis API error: ${res.status}`)

  const data = await res.json()
  return data.result || 'Análise não disponível.'
}

// ============================================
// PDF BUILDING
// ============================================

function buildQualificationBlock(doc: jsPDF, block: QualificationBlock) {
  const color = PDF_COLORS[block.qualification]
  const label = QUAL_LABELS[block.qualification]
  const revenueRange = QUAL_REVENUE_RANGE[block.qualification]
  const margin = getMargin()
  const contentWidth = getContentWidth()

  let yPos = 15

  // Section header
  yPos = addSectionHeader(
    doc,
    `${label} — ${block.count} participantes`,
    revenueRange,
    color,
    yPos
  )

  yPos += 5

  // --- NICHES TABLE ---
  yPos = addSubsectionTitle(doc, 'Distribuição por Nicho', yPos)

  const nicheData = block.nicheBreakdown.slice(0, 15).map((n, i) => [
    String(i + 1),
    n.niche,
    String(n.count),
    `${n.percentage}%`,
  ])

  autoTable(doc, {
    startY: yPos,
    head: [['#', 'Nicho', 'Qtd', '%']],
    body: nicheData,
    margin: { left: margin, right: margin },
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: {
      fillColor: [color.r, color.g, color.b],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: contentWidth - 40 },
      2: { cellWidth: 15 },
      3: { cellWidth: 15 },
    },
    alternateRowStyles: { fillColor: [249, 250, 251] },
  })

  yPos = (doc as any).lastAutoTable.finalY + 10

  // --- CHALLENGE ANSWERS ---
  if (block.challengeGroups.length > 0) {
    if (yPos > 230) { doc.addPage(); yPos = 20 }
    yPos = addSubsectionTitle(doc, 'Maior Dificuldade no Negócio', yPos)

    const challengeData = block.challengeGroups.map((g, i) => [
      String(i + 1),
      g.theme,
      String(g.count),
      `${g.percentage.toFixed(1)}%`,
      g.sample_answers.slice(0, 2).join(' | '),
    ])

    autoTable(doc, {
      startY: yPos,
      head: [['#', 'Tema', 'Qtd', '%', 'Respostas exemplo']],
      body: challengeData,
      margin: { left: margin, right: margin },
      styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
      headStyles: {
        fillColor: [color.r, color.g, color.b],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { cellWidth: 8 },
        1: { cellWidth: 40 },
        2: { cellWidth: 12 },
        3: { cellWidth: 12 },
        4: { cellWidth: contentWidth - 72 },
      },
      alternateRowStyles: { fillColor: [249, 250, 251] },
    })

    yPos = (doc as any).lastAutoTable.finalY + 10
  }

  // --- DESIRED CHANGE ANSWERS ---
  if (block.desiredChangeGroups.length > 0) {
    if (yPos > 230) { doc.addPage(); yPos = 20 }
    yPos = addSubsectionTitle(doc, 'O que Pretende Aprender no Intensivo', yPos)

    const desiredData = block.desiredChangeGroups.map((g, i) => [
      String(i + 1),
      g.theme,
      String(g.count),
      `${g.percentage.toFixed(1)}%`,
      g.sample_answers.slice(0, 2).join(' | '),
    ])

    autoTable(doc, {
      startY: yPos,
      head: [['#', 'Tema', 'Qtd', '%', 'Respostas exemplo']],
      body: desiredData,
      margin: { left: margin, right: margin },
      styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
      headStyles: {
        fillColor: [color.r, color.g, color.b],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { cellWidth: 8 },
        1: { cellWidth: 40 },
        2: { cellWidth: 12 },
        3: { cellWidth: 12 },
        4: { cellWidth: contentWidth - 72 },
      },
      alternateRowStyles: { fillColor: [249, 250, 251] },
    })

    yPos = (doc as any).lastAutoTable.finalY + 10
  }

  // --- STRATEGIC ANALYSIS ---
  if (block.strategicAnalysis) {
    if (yPos > 200) { doc.addPage(); yPos = 20 }

    yPos = addSubsectionTitle(doc, 'Análise Estratégica — Posicionamento Elite Premium', yPos)
    yPos += 2

    // Light background box
    const analysisLines = doc.splitTextToSize(block.strategicAnalysis, contentWidth - 10)
    const textHeight = analysisLines.length * 4.2 + 10

    // May need multiple pages for long analysis
    let remainingLines = [...analysisLines]

    while (remainingLines.length > 0) {
      const availableHeight = 280 - yPos
      const linesPerPage = Math.floor(availableHeight / 4.2)
      const pageLines = remainingLines.splice(0, linesPerPage)

      // Background (light tint of the qualification color)
      const blockHeight = pageLines.length * 4.2 + 6
      const tintR = Math.round(255 - (255 - color.r) * 0.08)
      const tintG = Math.round(255 - (255 - color.g) * 0.08)
      const tintB = Math.round(255 - (255 - color.b) * 0.08)
      doc.setFillColor(tintR, tintG, tintB)
      doc.roundedRect(margin, yPos, contentWidth, blockHeight, 2, 2, 'F')

      // Left accent bar
      doc.setFillColor(color.r, color.g, color.b)
      doc.rect(margin, yPos, 2, blockHeight, 'F')

      // Text
      doc.setFontSize(PDF_FONTS.body - 1)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(PDF_COLORS.text.r, PDF_COLORS.text.g, PDF_COLORS.text.b)
      doc.text(pageLines, margin + 6, yPos + 5)

      yPos += blockHeight + 5

      if (remainingLines.length > 0) {
        doc.addPage()
        yPos = 20
      }
    }
  }
}
