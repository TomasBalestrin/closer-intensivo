import jsPDF from 'jspdf'

// ============================================
// CORES POR QUALIFICAÇÃO
// ============================================
export const PDF_COLORS = {
  alto: { r: 22, g: 163, b: 74 },      // green-600
  medio: { r: 217, g: 119, b: 6 },     // amber-600
  baixo: { r: 220, g: 38, b: 38 },     // red-600
  header: { r: 31, g: 41, b: 55 },     // gray-800
  text: { r: 55, g: 65, b: 81 },       // gray-700
  lightText: { r: 107, g: 114, b: 128 }, // gray-500
  lightBg: { r: 249, g: 250, b: 251 }, // gray-50
  white: { r: 255, g: 255, b: 255 },
  border: { r: 229, g: 231, b: 235 },  // gray-200
} as const

export type RGBColor = { r: number; g: number; b: number }

export const QUAL_LABELS: Record<string, string> = {
  alto: 'ALTA QUALIFICAÇÃO',
  medio: 'MÉDIA QUALIFICAÇÃO',
  baixo: 'BAIXA QUALIFICAÇÃO',
}

export const QUAL_REVENUE_RANGE: Record<string, string> = {
  alto: 'R$ 50k+/mês',
  medio: 'R$ 10k - R$ 50k/mês',
  baixo: 'Até R$ 10k/mês',
}

// ============================================
// FONTES
// ============================================
export const PDF_FONTS = {
  title: 22,
  subtitle: 16,
  section: 14,
  subsection: 12,
  body: 10,
  small: 8,
} as const

// ============================================
// LAYOUT
// ============================================
const PAGE_WIDTH = 210 // A4 mm
const PAGE_HEIGHT = 297
const MARGIN = 15
const MAX_Y = 275 // espaço útil antes do footer

export function getContentWidth() {
  return PAGE_WIDTH - MARGIN * 2
}

export function getMargin() {
  return MARGIN
}

export function checkPageBreak(doc: jsPDF, yPos: number, needed: number = 20): number {
  if (yPos + needed > MAX_Y) {
    doc.addPage()
    return 20
  }
  return yPos
}

// ============================================
// CAPA COMPACTA (meia página)
// ============================================
export function addCompactCover(
  doc: jsPDF,
  eventName: string,
  dayFilter: string,
  summary: { alto: number; medio: number; baixo: number; total: number }
): number {
  const centerX = PAGE_WIDTH / 2
  const generatedDate = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  })
  const dayLabel = dayFilter === 'all' ? 'Todos os participantes' :
    dayFilter === 'day1' ? 'Credenciamento Dia 1' :
    dayFilter === 'day2' ? 'Credenciamento Dia 2' : 'Credenciamento Dia 3'

  // Title
  doc.setFontSize(PDF_FONTS.title)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(PDF_COLORS.header.r, PDF_COLORS.header.g, PDF_COLORS.header.b)
  doc.text('Relatório Estratégico', centerX, 25, { align: 'center' })

  // Event name + filter + date
  doc.setFontSize(PDF_FONTS.body)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(PDF_COLORS.lightText.r, PDF_COLORS.lightText.g, PDF_COLORS.lightText.b)
  doc.text(`${eventName}  |  ${dayLabel}  |  ${generatedDate}`, centerX, 33, { align: 'center' })

  // Divider
  doc.setDrawColor(PDF_COLORS.border.r, PDF_COLORS.border.g, PDF_COLORS.border.b)
  doc.setLineWidth(0.5)
  doc.line(MARGIN, 38, PAGE_WIDTH - MARGIN, 38)

  // Summary boxes
  const boxY = 43
  const boxW = 42
  const boxH = 22
  const gap = 6
  const totalW = boxW * 4 + gap * 3
  const startX = (PAGE_WIDTH - totalW) / 2

  const boxes = [
    { label: 'Total', count: summary.total, color: PDF_COLORS.header },
    { label: 'Alto', count: summary.alto, pct: summary.total > 0 ? ((summary.alto / summary.total) * 100).toFixed(0) : '0', color: PDF_COLORS.alto },
    { label: 'Médio', count: summary.medio, pct: summary.total > 0 ? ((summary.medio / summary.total) * 100).toFixed(0) : '0', color: PDF_COLORS.medio },
    { label: 'Baixo', count: summary.baixo, pct: summary.total > 0 ? ((summary.baixo / summary.total) * 100).toFixed(0) : '0', color: PDF_COLORS.baixo },
  ]

  boxes.forEach((box, i) => {
    const x = startX + i * (boxW + gap)
    doc.setDrawColor(box.color.r, box.color.g, box.color.b)
    doc.setLineWidth(0.8)
    doc.roundedRect(x, boxY, boxW, boxH, 2, 2, 'S')

    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(box.color.r, box.color.g, box.color.b)
    doc.text(String(box.count), x + boxW / 2, boxY + 11, { align: 'center' })

    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(PDF_COLORS.lightText.r, PDF_COLORS.lightText.g, PDF_COLORS.lightText.b)
    const pctText = 'pct' in box ? `${box.label} (${box.pct}%)` : box.label
    doc.text(pctText, x + boxW / 2, boxY + 18, { align: 'center' })
  })

  return boxY + boxH + 10 // retorna Y para continuar abaixo
}

// ============================================
// HEADER DO BLOCO DE QUALIFICAÇÃO
// ============================================
export function addSectionHeader(
  doc: jsPDF,
  title: string,
  subtitle: string,
  color: RGBColor,
  yPos: number
): number {
  yPos = checkPageBreak(doc, yPos, 25)

  // Colored bar
  doc.setFillColor(color.r, color.g, color.b)
  doc.rect(MARGIN, yPos, getContentWidth(), 10, 'F')

  // Title on the bar
  doc.setFontSize(PDF_FONTS.section)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text(title, MARGIN + 5, yPos + 7)

  // Subtitle below
  doc.setFontSize(PDF_FONTS.small)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(PDF_COLORS.lightText.r, PDF_COLORS.lightText.g, PDF_COLORS.lightText.b)
  doc.text(subtitle, MARGIN + 5, yPos + 17)

  return yPos + 22
}

// ============================================
// TÍTULO DE SUBSEÇÃO (com barra colorida lateral)
// ============================================
export function addSubsectionTitle(
  doc: jsPDF,
  title: string,
  yPos: number,
  color?: RGBColor
): number {
  yPos = checkPageBreak(doc, yPos, 15)

  if (color) {
    // Left accent bar
    doc.setFillColor(color.r, color.g, color.b)
    doc.rect(MARGIN, yPos - 4, 3, 8, 'F')
  }

  doc.setFontSize(PDF_FONTS.subsection)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(PDF_COLORS.header.r, PDF_COLORS.header.g, PDF_COLORS.header.b)
  doc.text(title, MARGIN + (color ? 7 : 0), yPos)

  doc.setDrawColor(PDF_COLORS.border.r, PDF_COLORS.border.g, PDF_COLORS.border.b)
  doc.setLineWidth(0.3)
  doc.line(MARGIN, yPos + 2, MARGIN + getContentWidth(), yPos + 2)

  return yPos + 8
}

// ============================================
// BOX PARA FRASES DE PALCO (destaque visual)
// ============================================
export function addQuoteBox(
  doc: jsPDF,
  text: string,
  color: RGBColor,
  yPos: number
): number {
  const contentW = getContentWidth() - 8
  const lines = doc.splitTextToSize(text, contentW)
  const lineHeight = 4.5
  const boxHeight = lines.length * lineHeight + 8

  yPos = checkPageBreak(doc, yPos, boxHeight + 5)

  // Light background
  const tintR = Math.round(255 - (255 - color.r) * 0.1)
  const tintG = Math.round(255 - (255 - color.g) * 0.1)
  const tintB = Math.round(255 - (255 - color.b) * 0.1)
  doc.setFillColor(tintR, tintG, tintB)
  doc.roundedRect(MARGIN, yPos, getContentWidth(), boxHeight, 2, 2, 'F')

  // Left accent bar
  doc.setFillColor(color.r, color.g, color.b)
  doc.rect(MARGIN, yPos, 3, boxHeight, 'F')

  // Text
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(PDF_COLORS.header.r, PDF_COLORS.header.g, PDF_COLORS.header.b)
  doc.text(lines, MARGIN + 7, yPos + 5)

  return yPos + boxHeight + 4
}

// ============================================
// CARD NUMERADO (para seeds, loops)
// ============================================
export function addNumberedCard(
  doc: jsPDF,
  number: number,
  quote: string,
  details: string[],
  color: RGBColor,
  yPos: number
): number {
  const contentW = getContentWidth() - 14

  // Quote lines
  const quoteLines = doc.splitTextToSize(quote, contentW)
  const quoteHeight = quoteLines.length * 4.5

  // Detail lines
  const detailLineArrays = details.map(d => doc.splitTextToSize(d, contentW))
  const detailHeight = detailLineArrays.reduce((sum, lines) => sum + lines.length * 3.5, 0)

  const totalHeight = quoteHeight + detailHeight + 14

  yPos = checkPageBreak(doc, yPos, totalHeight + 5)

  // Card border
  doc.setDrawColor(PDF_COLORS.border.r, PDF_COLORS.border.g, PDF_COLORS.border.b)
  doc.setLineWidth(0.3)
  doc.roundedRect(MARGIN, yPos, getContentWidth(), totalHeight, 2, 2, 'S')

  // Number badge
  doc.setFillColor(color.r, color.g, color.b)
  doc.circle(MARGIN + 7, yPos + 7, 4, 'F')
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text(String(number), MARGIN + 7, yPos + 8.5, { align: 'center' })

  // Quote text (bold, slightly larger)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(PDF_COLORS.header.r, PDF_COLORS.header.g, PDF_COLORS.header.b)
  let textY = yPos + 6
  doc.text(quoteLines, MARGIN + 14, textY)
  textY += quoteHeight + 3

  // Detail lines (smaller, gray)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(PDF_COLORS.text.r, PDF_COLORS.text.g, PDF_COLORS.text.b)

  for (const lineArr of detailLineArrays) {
    doc.text(lineArr, MARGIN + 14, textY)
    textY += lineArr.length * 3.5
  }

  return yPos + totalHeight + 4
}

// ============================================
// TEXTO COM PARÁGRAFOS BEM FORMATADOS
// ============================================
export function addFormattedText(
  doc: jsPDF,
  text: string,
  yPos: number,
  options?: { fontSize?: number; bold?: boolean; indent?: number; color?: RGBColor }
): number {
  const fontSize = options?.fontSize || PDF_FONTS.body
  const indent = options?.indent || 0
  const textColor = options?.color || PDF_COLORS.text
  const contentW = getContentWidth() - indent

  doc.setFontSize(fontSize)
  doc.setFont('helvetica', options?.bold ? 'bold' : 'normal')
  doc.setTextColor(textColor.r, textColor.g, textColor.b)

  const paragraphs = text.split('\n').filter(p => p.trim())
  const lineHeight = fontSize * 0.42

  for (const para of paragraphs) {
    const lines = doc.splitTextToSize(para.trim(), contentW)
    for (const line of lines) {
      yPos = checkPageBreak(doc, yPos, lineHeight + 2)
      doc.text(line, MARGIN + indent, yPos)
      yPos += lineHeight
    }
    yPos += 2 // paragraph spacing
  }

  return yPos + 2
}

// ============================================
// CITAÇÃO INLINE (resposta real de participante)
// ============================================
export function addInlineQuote(
  doc: jsPDF,
  text: string,
  yPos: number
): number {
  const contentW = getContentWidth() - 10
  const lines = doc.splitTextToSize(text, contentW)
  const lineHeight = 3.5
  const blockHeight = lines.length * lineHeight + 4

  yPos = checkPageBreak(doc, yPos, blockHeight + 3)

  // Left border
  doc.setDrawColor(PDF_COLORS.border.r, PDF_COLORS.border.g, PDF_COLORS.border.b)
  doc.setLineWidth(1)
  doc.line(MARGIN + 4, yPos - 1, MARGIN + 4, yPos + blockHeight - 2)

  // Italic text
  doc.setFontSize(8)
  doc.setFont('helvetica', 'italic')
  doc.setTextColor(PDF_COLORS.lightText.r, PDF_COLORS.lightText.g, PDF_COLORS.lightText.b)
  doc.text(lines, MARGIN + 8, yPos + 1)

  return yPos + blockHeight + 2
}

// ============================================
// SEPARADOR VISUAL
// ============================================
export function addDivider(doc: jsPDF, yPos: number, label?: string): number {
  yPos = checkPageBreak(doc, yPos, 10)

  doc.setDrawColor(PDF_COLORS.border.r, PDF_COLORS.border.g, PDF_COLORS.border.b)
  doc.setLineWidth(0.5)

  if (label) {
    const labelWidth = doc.getTextWidth(label) + 10
    const lineStart = MARGIN
    const lineEnd = MARGIN + getContentWidth()
    const labelX = PAGE_WIDTH / 2

    doc.line(lineStart, yPos, labelX - labelWidth / 2, yPos)
    doc.line(labelX + labelWidth / 2, yPos, lineEnd, yPos)

    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(PDF_COLORS.lightText.r, PDF_COLORS.lightText.g, PDF_COLORS.lightText.b)
    doc.text(label, labelX, yPos + 1, { align: 'center' })

    return yPos + 8
  }

  doc.line(MARGIN, yPos, MARGIN + getContentWidth(), yPos)
  return yPos + 5
}

// ============================================
// PAGINAÇÃO
// ============================================
export function addPageNumbers(doc: jsPDF) {
  const totalPages = doc.getNumberOfPages()
  const generatedDate = new Date().toLocaleDateString('pt-BR')

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFontSize(PDF_FONTS.small)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(PDF_COLORS.lightText.r, PDF_COLORS.lightText.g, PDF_COLORS.lightText.b)
    doc.text(`Relatório Estratégico — ${generatedDate}`, MARGIN, 290)
    doc.text(`Página ${i} de ${totalPages}`, PAGE_WIDTH - MARGIN, 290, { align: 'right' })
  }
}
