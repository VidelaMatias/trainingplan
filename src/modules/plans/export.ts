import ExcelJS from 'exceljs'

import { getWeekDates } from '@/modules/plans/utils'
import { parseRhythmNotes } from '@/modules/clients/utils'
import { DAYS } from '@/types/constants'
import type { TrainingPlanWeek } from '@/types'

// Mirrors the coach's own spreadsheet: reference paces (red underlined label,
// blue value) over a red rule, then one blue-ruled table per week with red day
// headers and blue session text.
const RED        = 'FFFF0000'
const BLUE_TEXT  = 'FF0000CC'
const BLUE_LINE  = 'FF4472C4'
const FONT       = 'Arial'
const COL_W      = 16
const N_COLS     = 7

// Sólo lo que la planilla imprime. El route handler resuelve auth y RLS y pasa
// esto; acá no hay Supabase ni request, así que el layout es testeable solo.
export interface PlanExportData {
  title: string
  start_date: string
  end_date: string
  clientName: string
  rhythmNotes: string | null
  weeks: TrainingPlanWeek[]
}

// El buffer viaja como respuesta del route handler, y BodyInit no acepta un
// Uint8Array sobre ArrayBufferLike: hay que atarlo a ArrayBuffer.
export async function buildPlanWorkbook(plan: PlanExportData): Promise<Uint8Array<ArrayBuffer>> {
  // Las semanas llegan en el orden que devuelva el embed; la planilla las
  // imprime siempre en orden cronológico.
  const weeks = [...plan.weeks].sort((a, b) => a.week_number - b.week_number)

  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Plan')

  for (let c = 1; c <= N_COLS; c++) {
    ws.getColumn(c).width = COL_W
  }

  // ── Row 1: client name ────────────────────────────────────
  const nameRow = ws.addRow([plan.clientName])
  ws.mergeCells(nameRow.number, 1, nameRow.number, N_COLS)
  applyCell(nameRow.getCell(1), {
    font: { name: FONT, bold: true, italic: true, size: 18, color: { argb: '00000000' } },
    alignment: { horizontal: 'left', vertical: 'middle' },
  })
  nameRow.height = 30

  // ── Row 2: plan title and range ───────────────────────────
  const titleRow = ws.addRow([`${plan.title}  ·  ${fmtRange(plan.start_date, plan.end_date)}`])
  ws.mergeCells(titleRow.number, 1, titleRow.number, N_COLS)
  applyCell(titleRow.getCell(1), {
    font: { name: FONT, bold: true, size: 11, color: { argb: BLUE_TEXT } },
    alignment: { horizontal: 'left', vertical: 'middle' },
  })
  titleRow.height = 18

  ws.addRow([]) // spacer

  // ── Rhythm notes (per alumno) ─────────────────────────────
  if (plan.rhythmNotes) {
    for (const { label, value } of parseRhythmNotes(plan.rhythmNotes)) {
      const row = ws.addRow([])
      ws.mergeCells(row.number, 1, row.number, N_COLS)
      const cell = row.getCell(1)
      // Dos tipografías dentro de la misma celda: el nombre del ritmo en rojo
      // subrayado y su valor en azul, como en la planilla del entrenador.
      cell.value = {
        richText: [
          ...(label ? [{ font: rhythmFont(RED, true), text: label }] : []),
          { font: rhythmFont(BLUE_TEXT, false), text: value },
        ],
      }
      applyCell(cell, { alignment: { horizontal: 'left', wrapText: false } })
      row.height = 16
    }

    // Solid red rule closing the reference-pace block.
    const ruleRow = ws.addRow([])
    ruleRow.height = 10
    for (let c = 1; c <= N_COLS; c++) {
      applyCell(ruleRow.getCell(c), {
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: RED } },
      })
    }

    ws.addRow([])
  }

  // ── Weeks ─────────────────────────────────────────────────
  for (const week of weeks) {
    const dates = getWeekDates(week.week_start)
    // Una semana que arranca a mitad de semana abre en la fecha de inicio del
    // plan, no en su lunes — igual que la vista de la app.
    const from = dates[0] < plan.start_date ? plan.start_date : dates[0]

    // Banda de la semana: sin el número y el rango, la planilla era una serie de
    // tablas Lunes→Domingo sin ninguna fecha.
    const bandRow = ws.addRow([`SEMANA ${week.week_number}  ·  ${fmtRange(from, dates[6])}`])
    ws.mergeCells(bandRow.number, 1, bandRow.number, N_COLS)
    applyCell(bandRow.getCell(1), {
      font: { name: FONT, bold: true, size: 11, color: { argb: BLUE_TEXT } },
      alignment: { horizontal: 'left', vertical: 'middle' },
    })
    bandRow.height = 20

    // Day headers: cada día con su fecha debajo, en dos renglones.
    const headRow = ws.addRow(DAYS.map((d, i) => `${d.label}\n${fmtDayDate(dates[i])}`))
    headRow.height = 30
    for (let c = 1; c <= N_COLS; c++) {
      applyCell(headRow.getCell(c), {
        font: { name: FONT, bold: true, size: 10, color: { argb: RED } },
        alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
        border: thinBorder(BLUE_LINE),
      })
    }

    // Content row
    const contentRow = ws.addRow(DAYS.map((d) => week[d.key] ?? ''))
    contentRow.height = 75
    for (let c = 1; c <= N_COLS; c++) {
      applyCell(contentRow.getCell(c), {
        font: { name: FONT, bold: true, size: 9, color: { argb: BLUE_TEXT } },
        alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
        border: thinBorder(BLUE_LINE),
      })
    }

    ws.addRow([]) // spacer between weeks
  }

  const buffer = await wb.xlsx.writeBuffer()
  return new Uint8Array(buffer as unknown as ArrayBuffer)
}

// Un título con caracteres ilegales en un nombre de archivo (una barra, por
// ejemplo) no puede romper la descarga.
export function planFilename(title: string): string {
  const slug = title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  return `plan-${slug || 'entrenamiento'}.xlsx`
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function applyCell(cell: ExcelJS.Cell, style: Partial<ExcelJS.Style>) {
  if (style.font) cell.font = style.font as ExcelJS.Font
  if (style.fill) cell.fill = style.fill as ExcelJS.Fill
  if (style.alignment) cell.alignment = style.alignment
  if (style.border) cell.border = style.border
}

// Fechas armadas desde el ISO, sin pasar por Date ni por Intl: el servidor corre
// en UTC y cualquier conversión correría el día.
function fmtDayDate(iso: string): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`
}

function fmtRange(from: string, to: string): string {
  return `${fmtDayDate(from)} al ${fmtDayDate(to)}/${to.slice(0, 4)}`
}

// Los dos tramos de una línea de ritmos comparten todo menos color y subrayado.
function rhythmFont(argb: string, underline: boolean): Partial<ExcelJS.Font> {
  return { name: FONT, bold: true, italic: true, underline, size: 10, color: { argb } }
}

function thinBorder(argb: string): Partial<ExcelJS.Borders> {
  const s: ExcelJS.BorderStyle = 'thin'
  const color = { argb }
  return { top: { style: s, color }, bottom: { style: s, color }, left: { style: s, color }, right: { style: s, color } }
}
