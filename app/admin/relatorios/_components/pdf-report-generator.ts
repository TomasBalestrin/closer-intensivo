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

  const nicheText = block.nicheBreakdown.slice(0, 10)
    .map(n => `- ${n.niche}: ${n.count} (${n.percentage}%)`)
    .join('\n')

  const challengeText = block.challengeGroups.slice(0, 8)
    .map(g => `- ${g.theme}: ${g.count} pessoas (${g.percentage}%)`)
    .join('\n')

  const desiredText = block.desiredChangeGroups.slice(0, 8)
    .map(g => `- ${g.theme}: ${g.count} pessoas (${g.percentage}%)`)
    .join('\n')

  const prompt = `Você é um estrategista de palco e copywriter de alto nível para eventos presenciais de alta conversão.

Analise os dados abaixo do bloco de qualificação ${qualLabel} (${revenueRange}) com ${block.count} participantes e gere uma ANÁLISE ESTRATÉGICA PROFUNDA E TÁTICA.

DADOS DO BLOCO:

Nichos mais representados:
${nicheText}

Principais dificuldades agrupadas:
${challengeText || 'Não disponível'}

O que buscam aprender/mudar:
${desiredText || 'Não disponível'}

=== INSTRUÇÕES DETALHADAS ===

Gere a análise dividida nos seguintes blocos (use os títulos exatos abaixo, separados por linha em branco):

DIAGNÓSTICO DO PERFIL
Análise do mindset e momento de negócio deste grupo. Qual a "conversa interna" que essa pessoa tem? Quais são os medos não-ditos? O que esse grupo NÃO sabe que precisa? Conecte as dores declaradas com as dores reais mais profundas.

SEEDS PARA PLANTAR DURANTE AS PALESTRAS
Liste 4-6 seeds (sementes) específicas que o palestrante pode plantar ao longo das falas ANTES do pitch. Cada seed deve ser uma frase ou ideia que será "colhida" depois no momento da oferta. Exemplo de formato: "Seed: [frase exata para dizer no palco] — Momento ideal: [quando usar] — Conexão com a oferta: [como isso prepara para o Elite Premium]"

LOOPS ABERTOS PARA USAR NO PALCO
Liste 3-5 loops abertos (perguntas ou promessas incompletas que geram curiosidade e mantêm atenção). Cada loop deve conectar uma dor deste grupo com algo que será "fechado" no momento do pitch ou na conversa com o closer. Escreva a frase exata do loop.

QUEBRA DE OBJEÇÕES PRÉVIA
Para cada objeção provável deste perfil de faturamento, escreva:
- A objeção (ex: "é caro demais para o meu momento")
- A frase exata de quebra prévia para usar NO PALCO, antes mesmo da pessoa pensar na objeção
- O racional psicológico por trás da quebra (por que funciona)
Mínimo 4 objeções.

FRASES DE IMPACTO E GATILHOS
Liste 5-8 frases prontas para usar no palco que conectam as dores específicas deste grupo com a transformação do Elite Premium. Cada frase deve usar pelo menos um gatilho mental (autoridade, escassez, prova social, futuro pace, identidade, contraste, reciprocidade). Indique qual gatilho está sendo usado.

SCRIPT DE ABORDAGEM PARA CLOSERS
Escreva um mini-script de como o closer deve abordar este perfil específico após a palestra:
- Frase de abertura (quebrar gelo conectando com algo da palestra)
- 2-3 perguntas de qualificação calibradas para este perfil de faturamento
- Como direcionar para o Elite Premium usando as dores declaradas deste grupo
- Frase de transição para apresentar a oferta
- Como lidar se a pessoa demonstrar hesitação

Seja EXTREMAMENTE específico e prático. Escreva frases PRONTAS para usar, não conceitos genéricos.
Não use formatação markdown (sem **, ##, etc). Use apenas texto corrido, parágrafos e "- " para listas.
Escreva em português brasileiro.`

  const context = `CONTEXTO DO PRODUTO - ELITE PREMIUM:
O Elite Premium é a mentoria premium de 1 ano da Bethel que inclui:
- Estratégia comercial e processo de vendas completo
- Estruturação de esteira de produtos
- Implementação de funis de venda que convertem
- Marketing e posicionamento digital
- Processos de gestão e contratação de equipe
- Ferramentas e SaaS exclusivos para mentorados
- Acompanhamento próximo e personalizado durante 12 meses

É o produto de maior ticket do evento e o objetivo principal de conversão durante o intensivo.

CONTEXTO DO EVENTO:
Intensivo presencial da Bethel (Alta Performance). Os participantes passam 3 dias de imersão com palestras sobre vendas, processos comerciais, gestão e escala de negócios. No terceiro dia acontece o pitch para o Elite Premium. Durante os 3 dias, o palestrante planta seeds e abre loops que preparam a audiência para a oferta. Closers ficam no salão e abordam participantes após as palestras e nos intervalos.

GLOSSÁRIO DE TÉCNICAS:
- Seed (semente): frase ou ideia plantada antes do pitch que será "colhida" no momento da oferta. Ex: "Quem aqui já tentou resolver isso sozinho e não conseguiu?" — prepara para a ideia de que precisa de acompanhamento.
- Loop aberto: pergunta ou promessa incompleta que cria tensão e curiosidade. A mente quer "fechar" o loop, o que mantém atenção. Ex: "Daqui a pouco vou mostrar o que o fulano fez para sair de 10k para 100k em 8 meses, mas antes..."
- Quebra de objeção prévia: antecipar e neutralizar uma objeção ANTES que a pessoa a formule conscientemente. Feita de forma indireta durante o conteúdo, não no pitch.
- Future pace: fazer a pessoa visualizar como será a vida dela após a transformação.
- Gatilho de identidade: fazer a pessoa se identificar com um grupo desejado ("empresários que pensam assim...").
- Contraste: comparar o custo da inação vs. o investimento na transformação.`

  const res = await fetch('/api/admin/reports/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, context, max_tokens: 8000 }),
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
