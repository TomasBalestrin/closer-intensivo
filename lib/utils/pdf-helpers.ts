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
const MARGIN = 15

export function getContentWidth() {
  return PAGE_WIDTH - MARGIN * 2
}

export function getMargin() {
  return MARGIN
}

// ============================================
// HELPERS
// ============================================

export function addCover(
  doc: jsPDF,
  eventName: string,
  dayFilter: string,
  summary: { alto: number; medio: number; baixo: number; total: number }
) {
  const centerX = PAGE_WIDTH / 2
  const generatedDate = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  })

  // Title
  doc.setFontSize(PDF_FONTS.title)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(PDF_COLORS.header.r, PDF_COLORS.header.g, PDF_COLORS.header.b)
  doc.text('Relatório de Qualificação', centerX, 50, { align: 'center' })

  // Subtitle - event name
  doc.setFontSize(PDF_FONTS.subtitle)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(PDF_COLORS.lightText.r, PDF_COLORS.lightText.g, PDF_COLORS.lightText.b)
  doc.text(eventName, centerX, 62, { align: 'center' })

  // Day filter & date
  const dayLabel = dayFilter === 'all' ? 'Todos os participantes' :
    dayFilter === 'day1' ? 'Credenciamento Dia 1' :
    dayFilter === 'day2' ? 'Credenciamento Dia 2' : 'Credenciamento Dia 3'

  doc.setFontSize(PDF_FONTS.body)
  doc.text(`Filtro: ${dayLabel}`, centerX, 74, { align: 'center' })
  doc.text(`Gerado em: ${generatedDate}`, centerX, 81, { align: 'center' })

  // Divider line
  doc.setDrawColor(PDF_COLORS.border.r, PDF_COLORS.border.g, PDF_COLORS.border.b)
  doc.setLineWidth(0.5)
  doc.line(MARGIN + 20, 90, PAGE_WIDTH - MARGIN - 20, 90)

  // Summary boxes
  const boxY = 105
  const boxW = 50
  const boxH = 30
  const gap = 5
  const totalBoxes = 3
  const startX = (PAGE_WIDTH - (boxW * totalBoxes + gap * (totalBoxes - 1))) / 2

  const boxes = [
    { label: 'Alto', count: summary.alto, pct: summary.total > 0 ? ((summary.alto / summary.total) * 100).toFixed(1) : '0', color: PDF_COLORS.alto },
    { label: 'Médio', count: summary.medio, pct: summary.total > 0 ? ((summary.medio / summary.total) * 100).toFixed(1) : '0', color: PDF_COLORS.medio },
    { label: 'Baixo', count: summary.baixo, pct: summary.total > 0 ? ((summary.baixo / summary.total) * 100).toFixed(1) : '0', color: PDF_COLORS.baixo },
  ]

  boxes.forEach((box, i) => {
    const x = startX + i * (boxW + gap)

    // Box border
    doc.setDrawColor(box.color.r, box.color.g, box.color.b)
    doc.setLineWidth(1)
    doc.roundedRect(x, boxY, boxW, boxH, 3, 3, 'S')

    // Count
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(box.color.r, box.color.g, box.color.b)
    doc.text(String(box.count), x + boxW / 2, boxY + 14, { align: 'center' })

    // Label + percentage
    doc.setFontSize(PDF_FONTS.small)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(PDF_COLORS.lightText.r, PDF_COLORS.lightText.g, PDF_COLORS.lightText.b)
    doc.text(`${box.label} (${box.pct}%)`, x + boxW / 2, boxY + 23, { align: 'center' })
  })

  // Total
  doc.setFontSize(PDF_FONTS.body)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(PDF_COLORS.text.r, PDF_COLORS.text.g, PDF_COLORS.text.b)
  doc.text(`Total de participantes: ${summary.total}`, centerX, boxY + boxH + 15, { align: 'center' })
}

export function addSectionHeader(
  doc: jsPDF,
  title: string,
  subtitle: string,
  color: { r: number; g: number; b: number },
  yPos: number
): number {
  // Check if we need a new page
  if (yPos > 260) {
    doc.addPage()
    yPos = 20
  }

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

export function addSubsectionTitle(
  doc: jsPDF,
  title: string,
  yPos: number
): number {
  if (yPos > 265) {
    doc.addPage()
    yPos = 20
  }

  doc.setFontSize(PDF_FONTS.subsection)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(PDF_COLORS.header.r, PDF_COLORS.header.g, PDF_COLORS.header.b)
  doc.text(title, MARGIN, yPos)

  doc.setDrawColor(PDF_COLORS.border.r, PDF_COLORS.border.g, PDF_COLORS.border.b)
  doc.setLineWidth(0.3)
  doc.line(MARGIN, yPos + 2, MARGIN + getContentWidth(), yPos + 2)

  return yPos + 7
}

export function addWrappedText(
  doc: jsPDF,
  text: string,
  yPos: number,
  fontSize: number = PDF_FONTS.body
): number {
  doc.setFontSize(fontSize)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(PDF_COLORS.text.r, PDF_COLORS.text.g, PDF_COLORS.text.b)

  const lines = doc.splitTextToSize(text, getContentWidth())

  for (const line of lines) {
    if (yPos > 280) {
      doc.addPage()
      yPos = 20
    }
    doc.text(line, MARGIN, yPos)
    yPos += fontSize * 0.45
  }

  return yPos + 3
}

export function addPageNumbers(doc: jsPDF) {
  const totalPages = doc.getNumberOfPages()
  const generatedDate = new Date().toLocaleDateString('pt-BR')

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFontSize(PDF_FONTS.small)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(PDF_COLORS.lightText.r, PDF_COLORS.lightText.g, PDF_COLORS.lightText.b)
    doc.text(`Gerado em ${generatedDate}`, MARGIN, 290)
    doc.text(`Página ${i} de ${totalPages}`, PAGE_WIDTH - MARGIN, 290, { align: 'right' })
  }
}
