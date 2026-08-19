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
    const base = { first_name: 'Ana', last_name: 'Perez' }
    assert.equal(clientSchema.safeParse({ ...base, email: 'nope' }).success, false)
    assert.equal(clientSchema.safeParse({ ...base, email: 'ana@example.com' }).success, true)
    assert.equal(clientSchema.safeParse(base).success, true)
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
