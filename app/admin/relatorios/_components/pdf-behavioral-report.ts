import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { Participant } from '@/lib/types/database'
import {
  PDF_COLORS,
  PDF_FONTS,
  addPageNumbers,
  getMargin,
  getContentWidth,
  checkPageBreak,
} from '@/lib/utils/pdf-helpers'

// ============================================
// TYPES
// ============================================

export type DayFilter = 'all' | 'day1' | 'day2' | 'day3'

export interface BehavioralReportInput {
  participants: Participant[]
  dayFilter: DayFilter
  eventName: string
  onProgress: (step: string, current: number, total: number) => void
}

// ============================================
// DISC COLORS
// ============================================

const DISC_COLORS: Record<string, { r: number; g: number; b: number; label: string }> = {
  D: { r: 220, g: 38, b: 38, label: 'Dominância' },
  I: { r: 234, g: 179, b: 8, label: 'Influência' },
  S: { r: 22, g: 163, b: 74, label: 'Estabilidade' },
  C: { r: 37, g: 99, b: 235, label: 'Conformidade' },
}

// ============================================
// MAIN GENERATOR
// ============================================

export async function generateBehavioralPdfReport(input: BehavioralReportInput): Promise<void> {
  const { participants, dayFilter, eventName, onProgress } = input
  const totalSteps = 4

  // Step 1: Filter by day
  onProgress('Filtrando participantes...', 1, totalSteps)
  const filtered = filterByDay(participants, dayFilter)

  // Step 2: Compute summaries
  onProgress('Calculando perfis...', 2, totalSteps)
  const discSummary = computeDiscSummary(filtered)
  const archetypeSummary = computeArchetypeSummary(filtered)

  // Step 3: Build PDF
  onProgress('Montando PDF...', 3, totalSteps)

  const doc = new jsPDF('p', 'mm', 'a4')
  const margin = getMargin()
  const contentWidth = getContentWidth()
  const centerX = 210 / 2

  const dayLabel = dayFilter === 'all' ? 'Todos os participantes' :
    dayFilter === 'day1' ? 'Credenciamento Dia 1' :
    dayFilter === 'day2' ? 'Credenciamento Dia 2' : 'Credenciamento Dia 3'

  const generatedDate = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  // ─── COVER ───
  doc.setFontSize(PDF_FONTS.title)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(PDF_COLORS.header.r, PDF_COLORS.header.g, PDF_COLORS.header.b)
  doc.text('Relatório de Perfis Comportamentais', centerX, 25, { align: 'center' })

  doc.setFontSize(PDF_FONTS.body)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(PDF_COLORS.lightText.r, PDF_COLORS.lightText.g, PDF_COLORS.lightText.b)
  doc.text(`${eventName}  |  ${dayLabel}  |  ${generatedDate}`, centerX, 33, { align: 'center' })

  doc.setDrawColor(PDF_COLORS.border.r, PDF_COLORS.border.g, PDF_COLORS.border.b)
  doc.setLineWidth(0.5)
  doc.line(margin, 38, 210 - margin, 38)

  // Summary boxes
  const totalParticipants = filtered.length
  const withDisc = filtered.filter(p => p.disc_profile).length
  const withArchetype = filtered.filter(p => p.primary_archetype).length
  const opportunities = filtered.filter(p => p.is_opportunity).length

  const boxY = 43
  const boxW = 42
  const boxH = 22
  const gap = 6
  const totalW = boxW * 4 + gap * 3
  const startX = (210 - totalW) / 2

  const boxes = [
    { label: 'Total', count: totalParticipants, color: PDF_COLORS.header },
    { label: 'Oportunidades', count: opportunities, color: { r: 234, g: 179, b: 8 } },
    { label: 'Com DISC', count: withDisc, color: { r: 37, g: 99, b: 235 } },
    { label: 'Com Arquétipo', count: withArchetype, color: { r: 147, g: 51, b: 234 } },
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
    doc.text(box.label, x + boxW / 2, boxY + 18, { align: 'center' })
  })

  let yPos = boxY + boxH + 12

  // ─── PARTICIPANT TABLE ───
  doc.setFillColor(PDF_COLORS.header.r, PDF_COLORS.header.g, PDF_COLORS.header.b)
  doc.rect(margin, yPos, contentWidth, 10, 'F')
  doc.setFontSize(PDF_FONTS.section)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text('Participantes — Perfis Comportamentais', margin + 5, yPos + 7)
  yPos += 14

  const tableData = filtered.map(p => [
    p.name || '—',
    p.is_opportunity ? 'Sim' : 'Não',
    p.disc_profile || '—',
    p.primary_archetype || '—',
    p.secondary_archetype || '—',
  ])

  autoTable(doc, {
    startY: yPos,
    head: [['Nome', 'Oportunidade', 'DISC', 'Arquétipo Primário', 'Arquétipo Secundário']],
    body: tableData,
    margin: { left: margin, right: margin },
    styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
    headStyles: {
      fillColor: [31, 41, 55],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    columnStyles: {
      0: { cellWidth: contentWidth * 0.30 },
      1: { cellWidth: contentWidth * 0.12, halign: 'center' },
      2: { cellWidth: contentWidth * 0.10, halign: 'center' },
      3: { cellWidth: contentWidth * 0.24 },
      4: { cellWidth: contentWidth * 0.24 },
    },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    didParseCell: (data: any) => {
      // Color opportunity column
      if (data.section === 'body' && data.column.index === 1) {
        if (data.cell.raw === 'Sim') {
          data.cell.styles.textColor = [22, 163, 74]
          data.cell.styles.fontStyle = 'bold'
        } else {
          data.cell.styles.textColor = [156, 163, 175]
        }
      }
      // Color DISC column
      if (data.section === 'body' && data.column.index === 2) {
        const profile = data.cell.raw as string
        const discColor = DISC_COLORS[profile]
        if (discColor) {
          data.cell.styles.textColor = [discColor.r, discColor.g, discColor.b]
          data.cell.styles.fontStyle = 'bold'
        }
      }
    },
  })

  yPos = (doc as any).lastAutoTable.finalY + 15

  // ─── SUMMARY: OPPORTUNITIES BY DISC ───
  doc.addPage()
  yPos = 20

  doc.setFillColor(37, 99, 235)
  doc.rect(margin, yPos, contentWidth, 10, 'F')
  doc.setFontSize(PDF_FONTS.section)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text('Resumo — Oportunidades por Perfil DISC', margin + 5, yPos + 7)
  yPos += 14

  const discTableData = discSummary.map(row => [
    row.profile,
    DISC_COLORS[row.profile]?.label || row.profile,
    String(row.total),
    String(row.opportunities),
    row.total > 0 ? `${Math.round((row.opportunities / row.total) * 100)}%` : '0%',
  ])

  // Add total row
  const discTotalOpp = discSummary.reduce((s, r) => s + r.opportunities, 0)
  const discTotalAll = discSummary.reduce((s, r) => s + r.total, 0)
  discTableData.push([
    '',
    'TOTAL',
    String(discTotalAll),
    String(discTotalOpp),
    discTotalAll > 0 ? `${Math.round((discTotalOpp / discTotalAll) * 100)}%` : '0%',
  ])

  autoTable(doc, {
    startY: yPos,
    head: [['Perfil', 'Nome', 'Total', 'Oportunidades', '% Oportunidades']],
    body: discTableData,
    margin: { left: margin, right: margin },
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 50 },
      2: { cellWidth: 30, halign: 'center' },
      3: { cellWidth: 40, halign: 'center' },
      4: { cellWidth: 40, halign: 'center' },
    },
    alternateRowStyles: { fillColor: [239, 246, 255] },
    didParseCell: (data: any) => {
      if (data.section === 'body' && data.column.index === 0) {
        const profile = data.cell.raw as string
        const discColor = DISC_COLORS[profile]
        if (discColor) {
          data.cell.styles.textColor = [discColor.r, discColor.g, discColor.b]
          data.cell.styles.fontSize = 14
        }
      }
      // Bold total row
      if (data.section === 'body' && data.row.index === discTableData.length - 1) {
        data.cell.styles.fontStyle = 'bold'
        data.cell.styles.fillColor = [219, 234, 254]
      }
    },
  })

  yPos = (doc as any).lastAutoTable.finalY + 8

  // DISC Visual chart (horizontal bars)
  yPos = checkPageBreak(doc, yPos, 60)

  doc.setFontSize(PDF_FONTS.subsection)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(PDF_COLORS.header.r, PDF_COLORS.header.g, PDF_COLORS.header.b)
  doc.text('Distribuição DISC (Oportunidades)', margin, yPos)
  yPos += 8

  const maxDiscOpp = Math.max(...discSummary.map(r => r.opportunities), 1)
  const barMaxWidth = contentWidth - 50

  for (const row of discSummary) {
    const color = DISC_COLORS[row.profile]
    if (!color) continue

    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(color.r, color.g, color.b)
    doc.text(`${row.profile} — ${color.label}`, margin, yPos)

    const barWidth = maxDiscOpp > 0 ? (row.opportunities / maxDiscOpp) * barMaxWidth : 0
    const barY = yPos + 2

    // Background bar
    doc.setFillColor(240, 240, 240)
    doc.roundedRect(margin, barY, barMaxWidth, 6, 1, 1, 'F')

    // Filled bar
    if (barWidth > 0) {
      doc.setFillColor(color.r, color.g, color.b)
      doc.roundedRect(margin, barY, barWidth, 6, 1, 1, 'F')
    }

    // Count label
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(PDF_COLORS.header.r, PDF_COLORS.header.g, PDF_COLORS.header.b)
    doc.text(`${row.opportunities} oportunidades`, margin + barMaxWidth + 3, barY + 5)

    yPos += 16
  }

  // ─── SUMMARY: OPPORTUNITIES BY ARCHETYPE ───
  yPos += 10
  yPos = checkPageBreak(doc, yPos, 40)

  doc.setFillColor(147, 51, 234)
  doc.rect(margin, yPos, contentWidth, 10, 'F')
  doc.setFontSize(PDF_FONTS.section)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text('Resumo — Oportunidades por Arquétipo', margin + 5, yPos + 7)
  yPos += 14

  const archetypeTableData = archetypeSummary.map(row => [
    row.archetype,
    String(row.total),
    String(row.opportunities),
    row.total > 0 ? `${Math.round((row.opportunities / row.total) * 100)}%` : '0%',
  ])

  const archTotalOpp = archetypeSummary.reduce((s, r) => s + r.opportunities, 0)
  const archTotalAll = archetypeSummary.reduce((s, r) => s + r.total, 0)
  archetypeTableData.push([
    'TOTAL',
    String(archTotalAll),
    String(archTotalOpp),
    archTotalAll > 0 ? `${Math.round((archTotalOpp / archTotalAll) * 100)}%` : '0%',
  ])

  autoTable(doc, {
    startY: yPos,
    head: [['Arquétipo', 'Total', 'Oportunidades', '% Oportunidades']],
    body: archetypeTableData,
    margin: { left: margin, right: margin },
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: {
      fillColor: [147, 51, 234],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 60 },
      1: { cellWidth: 35, halign: 'center' },
      2: { cellWidth: 45, halign: 'center' },
      3: { cellWidth: 40, halign: 'center' },
    },
    alternateRowStyles: { fillColor: [250, 245, 255] },
    didParseCell: (data: any) => {
      // Bold total row
      if (data.section === 'body' && data.row.index === archetypeTableData.length - 1) {
        data.cell.styles.fontStyle = 'bold'
        data.cell.styles.fillColor = [243, 232, 255]
      }
    },
  })

  // Page numbers
  addPageNumbers(doc)

  // Step 4: Download
  onProgress('Baixando PDF...', 4, totalSteps)

  const daySlug = dayFilter === 'all' ? 'todos' : dayFilter
  const filename = `relatorio_perfis_comportamentais_${daySlug}_${new Date().toISOString().split('T')[0]}.pdf`
  doc.save(filename)
}

// ============================================
// HELPERS
// ============================================

function filterByDay(participants: Participant[], dayFilter: DayFilter): Participant[] {
  switch (dayFilter) {
    case 'day1': return participants.filter(p => p.checked_in_day1)
    case 'day2': return participants.filter(p => p.checked_in_day2)
    case 'day3': return participants.filter(p => p.checked_in_day3)
    default: return participants
  }
}

interface DiscRow {
  profile: string
  total: number
  opportunities: number
}

function computeDiscSummary(participants: Participant[]): DiscRow[] {
  const profiles = ['D', 'I', 'S', 'C']
  return profiles.map(profile => {
    const matching = participants.filter(p => p.disc_profile === profile)
    return {
      profile,
      total: matching.length,
      opportunities: matching.filter(p => p.is_opportunity).length,
    }
  })
}

interface ArchetypeRow {
  archetype: string
  total: number
  opportunities: number
}

function computeArchetypeSummary(participants: Participant[]): ArchetypeRow[] {
  const counts: Record<string, { total: number; opportunities: number }> = {}

  for (const p of participants) {
    if (!p.primary_archetype) continue
    if (!counts[p.primary_archetype]) {
      counts[p.primary_archetype] = { total: 0, opportunities: 0 }
    }
    counts[p.primary_archetype].total++
    if (p.is_opportunity) {
      counts[p.primary_archetype].opportunities++
    }
  }

  return Object.entries(counts)
    .map(([archetype, data]) => ({ archetype, ...data }))
    .sort((a, b) => b.opportunities - a.opportunities)
}
