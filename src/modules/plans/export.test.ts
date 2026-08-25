import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import ExcelJS from 'exceljs'

import { buildPlanWorkbook, planFilename, type PlanExportData } from '@/modules/plans/export'
import type { TrainingPlanWeek } from '@/types'

const week = (week_number: number, week_start: string): TrainingPlanWeek => ({
  week_number,
  week_start,
  monday: 'Trote 40 min',
  tuesday: null,
  wednesday: null,
  thursday: null,
  friday: null,
  saturday: null,
  sunday: 'Fondo 1h',
})

const plan: PlanExportData = {
  title: 'Base agosto',
  start_date: '2026-08-24',
  end_date: '2026-09-06',
  clientName: 'Juan Pérez',
  rhythmNotes: 'Ritmo U (Umbral de lactato): 3:15 a 3:20 x mil',
  weeks: [week(2, '2026-08-31'), week(1, '2026-08-24')],
}

// Lee de vuelta la planilla generada: lo que importa es lo que abre el alumno,
// no las llamadas a ExcelJS.
async function rowsOf(data: PlanExportData): Promise<string[][]> {
  const buffer = await buildPlanWorkbook(data)
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(buffer as unknown as ArrayBuffer)
  const ws = wb.getWorksheet('Plan')
  assert.ok(ws)

  const rows: string[][] = []
  ws.eachRow({ includeEmpty: true }, (row) => {
    const values: string[] = []
    for (let c = 1; c <= 7; c++) {
      values.push(String(row.getCell(c).text ?? ''))
    }
    rows.push(values)
  })
  return rows
}

describe('buildPlanWorkbook', () => {
  it('titles the sheet with the client, the plan and its range', async () => {
    const rows = await rowsOf(plan)
    assert.equal(rows[0][0], 'Juan Pérez')
    assert.equal(rows[1][0], 'Base agosto  ·  24/08 al 06/09/2026')
  })

  it('bands every week with its number and dates', async () => {
    const rows = await rowsOf(plan)
    const bands = rows.map((r) => r[0]).filter((v) => v.startsWith('SEMANA'))
    // En orden cronológico aunque el embed las haya devuelto al revés.
    assert.deepEqual(bands, [
      'SEMANA 1  ·  24/08 al 30/08/2026',
      'SEMANA 2  ·  31/08 al 06/09/2026',
    ])
  })

  it('dates each day header', async () => {
    const rows = await rowsOf(plan)
    const header = rows.find((r) => r[0].startsWith('Lunes'))
    assert.deepEqual(header, [
      'Lunes\n24/08',
      'Martes\n25/08',
      'Miércoles\n26/08',
      'Jueves\n27/08',
      'Viernes\n28/08',
      'Sábado\n29/08',
      'Domingo\n30/08',
    ])
  })

  it('opens a partial first week on the plan start date', async () => {
    // El plan arranca un miércoles: la banda de la semana 1 no puede anunciar el
    // lunes anterior, que no forma parte del plan.
    const rows = await rowsOf({
      ...plan,
      start_date: '2026-08-26',
      weeks: [week(1, '2026-08-24')],
    })
    const band = rows.map((r) => r[0]).find((v) => v.startsWith('SEMANA'))
    assert.equal(band, 'SEMANA 1  ·  26/08 al 30/08/2026')
  })

  it('keeps the sessions of each day', async () => {
    const rows = await rowsOf(plan)
    const headerIndex = rows.findIndex((r) => r[0].startsWith('Lunes'))
    assert.equal(rows[headerIndex + 1][0], 'Trote 40 min')
    assert.equal(rows[headerIndex + 1][6], 'Fondo 1h')
  })
})

describe('planFilename', () => {
  it('slugifies the title', () => {
    assert.equal(planFilename('Base agosto'), 'plan-base-agosto.xlsx')
  })

  it('falls back when the title has nothing usable', () => {
    // Una barra en el título no puede terminar armando una ruta en la descarga.
    assert.equal(planFilename('///'), 'plan-entrenamiento.xlsx')
  })
})
