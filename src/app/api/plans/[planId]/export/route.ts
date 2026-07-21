import { NextRequest, NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import { createClient } from '@/lib/supabase/server'
import { getPlanForExport } from '@/modules/plans/queries'
import { DAYS } from '@/types/constants'

// Mirrors the coach's own spreadsheet: red reference paces over a red rule, then
// one blue-ruled table per week with red day headers and blue session text.
const RED        = 'FFFF0000'
const BLUE_TEXT  = 'FF0000CC'
const BLUE_LINE  = 'FF4472C4'
const FONT       = 'Arial'
const COL_W      = 16
const N_COLS     = 7

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  const { planId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const plan = await getPlanForExport(planId, user.id)
  if (!plan) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // The alumnos embed is filtered by its own RLS: it comes back null when the
  // plan points at someone else's alumno. Treat that as not-found rather than
  // dereferencing null further down.
  if (!plan.alumnos) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const weeks = [...(plan.training_plan_weeks ?? [])].sort((a, b) => a.week_number - b.week_number)

  // ── Workbook ──────────────────────────────────────────────
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Plan')

  // Column widths
  for (let c = 1; c <= N_COLS; c++) {
    ws.getColumn(c).width = COL_W
  }

  // ── Row 1: client name ────────────────────────────────────
  const clientName = `${plan.alumnos.first_name} ${plan.alumnos.last_name}`
  const nameRow = ws.addRow([clientName])
  ws.mergeCells(nameRow.number, 1, nameRow.number, N_COLS)
  applyCell(nameRow.getCell(1), {
    font: { name: FONT, bold: true, italic: true, size: 18, color: { argb: '00000000' } },
    alignment: { horizontal: 'left', vertical: 'middle' },
  })
  nameRow.height = 30

  ws.addRow([]) // spacer

  // ── Rhythm notes (per alumno) ─────────────────────────────
  if (plan.alumnos.rhythm_notes) {
    const lines = (plan.alumnos.rhythm_notes as string).split('\n').filter(Boolean)
    for (const line of lines) {
      const row = ws.addRow([line])
      ws.mergeCells(row.number, 1, row.number, N_COLS)
      applyCell(row.getCell(1), {
        font: { name: FONT, bold: true, italic: true, underline: true, size: 10, color: { argb: RED } },
        alignment: { horizontal: 'left', wrapText: false },
      })
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
  const dayLabels = DAYS.map((d) => d.label)

  for (const week of weeks) {
    // Day headers row
    const headRow = ws.addRow(dayLabels)
    headRow.height = 18
    for (let c = 1; c <= N_COLS; c++) {
      applyCell(headRow.getCell(c), {
        font: { name: FONT, bold: true, size: 10, color: { argb: RED } },
        alignment: { horizontal: 'center', vertical: 'middle' },
        border: thinBorder(BLUE_LINE),
      })
    }

    // Content row
    const content = DAYS.map((d) => week[d.key] ?? '')
    const contentRow = ws.addRow(content)
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

  // ── Generate buffer ───────────────────────────────────────
  const buffer = await wb.xlsx.writeBuffer()
  const uint8 = new Uint8Array(buffer as unknown as ArrayBuffer)
  const slug = (plan.title as string).toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  const filename = `plan-${slug}.xlsx`

  return new NextResponse(uint8, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function applyCell(cell: ExcelJS.Cell, style: Partial<ExcelJS.Style>) {
  if (style.font) cell.font = style.font as ExcelJS.Font
  if (style.fill) cell.fill = style.fill as ExcelJS.Fill
  if (style.alignment) cell.alignment = style.alignment
  if (style.border) cell.border = style.border
}

function thinBorder(argb: string): Partial<ExcelJS.Borders> {
  const s: ExcelJS.BorderStyle = 'thin'
  const color = { argb }
  return { top: { style: s, color }, bottom: { style: s, color }, left: { style: s, color }, right: { style: s, color } }
}
