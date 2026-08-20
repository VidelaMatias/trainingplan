import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { changePasswordSchema, clientSchema, planIdSchema, planSchema } from '@/types/schemas'

function week(overrides: Record<string, unknown> = {}) {
  return {
    week_start: '2026-08-17',
    monday: 'Trote 40min',
    tuesday: null,
    wednesday: null,
    thursday: null,
    friday: null,
    saturday: null,
    sunday: null,
    ...overrides,
  }
}

function plan(overrides: Record<string, unknown> = {}) {
  return {
    title: 'Preparación maratón',
    start_date: '2026-08-17',
    notes: null,
    weeks: [week()],
    ...overrides,
  }
}

describe('planSchema', () => {
  it('accepts a well-formed plan', () => {
    assert.equal(planSchema.safeParse(plan()).success, true)
  })

  it('requires a title', () => {
    assert.equal(planSchema.safeParse(plan({ title: '   ' })).success, false)
  })

  it('rejects a start date that is not YYYY-MM-DD', () => {
    assert.equal(planSchema.safeParse(plan({ start_date: '17/08/2026' })).success, false)
  })

  it('requires at least one week', () => {
    assert.equal(planSchema.safeParse(plan({ weeks: [] })).success, false)
  })

  it('caps the number of weeks', () => {
    // Two years is far beyond any real plan; the cap stops a crafted payload
    // from turning one submit into a huge batch insert.
    const many = (n: number) => Array.from({ length: n }, () => week())
    assert.equal(planSchema.safeParse(plan({ weeks: many(104) })).success, true)
    assert.equal(planSchema.safeParse(plan({ weeks: many(105) })).success, false)
  })

  it('caps the length of a single day cell', () => {
    assert.equal(planSchema.safeParse(plan({ weeks: [week({ monday: 'x'.repeat(2000) })] })).success, true)
    assert.equal(planSchema.safeParse(plan({ weeks: [week({ monday: 'x'.repeat(2001) })] })).success, false)
  })

  it('collapses a blank day cell to null but preserves internal formatting', () => {
    const parsed = planSchema.parse(plan({ weeks: [week({ monday: '   ', tuesday: ' 5km\n  ritmo U ' })] }))
    assert.equal(parsed.weeks[0].monday, null)
    // Not trimmed: coaches lay sessions out across lines and the spacing matters.
    assert.equal(parsed.weeks[0].tuesday, ' 5km\n  ritmo U ')
  })

  it('treats week_number as optional, since the database derives it', () => {
    assert.equal(planSchema.safeParse(plan({ weeks: [week({ week_number: undefined })] })).success, true)
  })
})

describe('clientSchema', () => {
  const base = { first_name: 'Ana', last_name: 'Perez' }

  it('requires a first and last name', () => {
    assert.equal(clientSchema.safeParse({ first_name: '', last_name: 'Perez' }).success, false)
    assert.equal(clientSchema.safeParse({ first_name: 'Ana', last_name: '  ' }).success, false)
  })

  it('normalizes blank optional fields to null', () => {
    const parsed = clientSchema.parse({
      first_name: 'Ana',
      last_name: 'Perez',
      email: '',
      phone: '   ',
      date_of_birth: null,
      goal: null,
      notes: null,
      rhythm_notes: null,
    })
    assert.equal(parsed.email, null)
    assert.equal(parsed.phone, null)
  })

  it('trims a value that is present', () => {
    const parsed = clientSchema.parse({ first_name: 'Ana', last_name: 'Perez', phone: '  1122  ' })
    assert.equal(parsed.phone, '1122')
  })

  it('validates an email only when one was given', () => {
    assert.equal(clientSchema.safeParse({ ...base, email: 'nope' }).success, false)
    assert.equal(clientSchema.safeParse({ ...base, email: 'ana@example.com' }).success, true)
    assert.equal(clientSchema.safeParse(base).success, true)
  })

  it('reads age and weight from the strings a form submits', () => {
    const parsed = clientSchema.parse({ ...base, age: '38', weight_kg: '72.5' })
    assert.equal(parsed.age, 38)
    assert.equal(parsed.weight_kg, 72.5)
  })

  it('accepts a comma as the decimal separator for weight', () => {
    assert.equal(clientSchema.parse({ ...base, weight_kg: '72,5' }).weight_kg, 72.5)
  })

  it('leaves a blank age or weight as null instead of zero', () => {
    const parsed = clientSchema.parse({ ...base, age: '', weight_kg: '   ' })
    assert.equal(parsed.age, null)
    assert.equal(parsed.weight_kg, null)
  })

  it('rejects a non-numeric or out-of-range age and weight', () => {
    // Not coerced to NaN and waved through: each of these has to fail.
    assert.equal(clientSchema.safeParse({ ...base, age: 'treinta' }).success, false)
    assert.equal(clientSchema.safeParse({ ...base, age: '38.5' }).success, false)
    assert.equal(clientSchema.safeParse({ ...base, age: '0' }).success, false)
    assert.equal(clientSchema.safeParse({ ...base, age: '121' }).success, false)
    assert.equal(clientSchema.safeParse({ ...base, weight_kg: '19' }).success, false)
    assert.equal(clientSchema.safeParse({ ...base, weight_kg: '301' }).success, false)
  })

  it('normalizes reference marks and rejects an overlong one', () => {
    assert.equal(clientSchema.parse({ ...base, pb_5k: ' 21:40 ' }).pb_5k, '21:40')
    assert.equal(clientSchema.parse({ ...base, pb_42k: '' }).pb_42k, null)
    assert.equal(clientSchema.safeParse({ ...base, pb_10k: 'x'.repeat(41) }).success, false)
  })

  it('defaults objectives to an empty array', () => {
    assert.deepEqual(clientSchema.parse(base).objectives, [])
  })

  it('keeps objective times optional but requires a name', () => {
    const parsed = clientSchema.parse({
      ...base,
      objectives: [{ name: ' Maratón de Buenos Aires ', target_time: '03:30:00', achieved_time: '' }],
    })
    assert.deepEqual(parsed.objectives, [
      { name: 'Maratón de Buenos Aires', target_time: '03:30:00', achieved_time: null },
    ])
    assert.equal(
      clientSchema.safeParse({ ...base, objectives: [{ name: '  ', target_time: '03:30:00' }] }).success,
      false,
    )
  })

  it('caps the number of objectives', () => {
    const many = (n: number) => Array.from({ length: n }, (_, i) => ({ name: `Carrera ${i}` }))
    assert.equal(clientSchema.safeParse({ ...base, objectives: many(20) }).success, true)
    assert.equal(clientSchema.safeParse({ ...base, objectives: many(21) }).success, false)
  })
})

describe('planIdSchema', () => {
  it('accepts a uuid and rejects anything else', () => {
    assert.equal(planIdSchema.safeParse('3f2504e0-4f89-41d3-9a0c-0305e82c3301').success, true)
    for (const bad of ['', 'not-a-uuid', '../../etc/passwd', '1 OR 1=1']) {
      assert.equal(planIdSchema.safeParse(bad).success, false, `should reject ${JSON.stringify(bad)}`)
    }
  })
})

describe('changePasswordSchema', () => {
  const valid = { currentPassword: 'vieja123', password: 'nueva123', confirmPassword: 'nueva123' }

  it('accepts a well-formed change', () => {
    assert.equal(changePasswordSchema.safeParse(valid).success, true)
  })

  it('requires the current password', () => {
    const result = changePasswordSchema.safeParse({ ...valid, currentPassword: '' })
    assert.equal(result.success, false)
    assert.match(result.error!.issues[0].message, /contraseña actual/)
  })

  it('rejects a new password under 6 characters', () => {
    const result = changePasswordSchema.safeParse({
      ...valid,
      password: 'abc',
      confirmPassword: 'abc',
    })
    assert.equal(result.success, false)
    assert.match(result.error!.issues[0].message, /al menos 6/)
  })

  it('rejects a mismatched confirmation', () => {
    const result = changePasswordSchema.safeParse({ ...valid, confirmPassword: 'otra1234' })
    assert.equal(result.success, false)
    assert.equal(result.error!.issues[0].message, 'Las contraseñas no coinciden')
    assert.deepEqual(result.error!.issues[0].path, ['confirmPassword'])
  })

  it('rejects reusing the current password', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'vieja123',
      password: 'vieja123',
      confirmPassword: 'vieja123',
    })
    assert.equal(result.success, false)
    assert.equal(result.error!.issues[0].message, 'La nueva contraseña debe ser distinta de la actual')
  })
})
