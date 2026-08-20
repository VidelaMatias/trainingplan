import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { toWhatsAppNumber, whatsappChatUrl } from '@/lib/whatsapp'

// Todas las formas en que un mismo celular de Buenos Aires puede haber quedado
// cargado en la ficha del alumno.
const BUENOS_AIRES = '5491112345678'

describe('toWhatsAppNumber', () => {
  it('acepta el formato internacional completo', () => {
    assert.equal(toWhatsAppNumber('+54 9 11 1234-5678'), BUENOS_AIRES)
    assert.equal(toWhatsAppNumber('+5491112345678'), BUENOS_AIRES)
    assert.equal(toWhatsAppNumber('005491112345678'), BUENOS_AIRES)
  })

  it('agrega el 9 que WhatsApp exige para los celulares argentinos', () => {
    assert.equal(toWhatsAppNumber('+54 11 1234-5678'), BUENOS_AIRES)
    assert.equal(toWhatsAppNumber('54 11 1234 5678'), BUENOS_AIRES)
  })

  it('completa el código de país de un número local', () => {
    assert.equal(toWhatsAppNumber('11 1234-5678'), BUENOS_AIRES)
    assert.equal(toWhatsAppNumber('011 1234 5678'), BUENOS_AIRES)
  })

  it('saca el 15, que no convive con el 9 internacional', () => {
    assert.equal(toWhatsAppNumber('011 15 1234-5678'), BUENOS_AIRES)
    assert.equal(toWhatsAppNumber('11 15 1234 5678'), BUENOS_AIRES)
    assert.equal(toWhatsAppNumber('+54 11 15 1234 5678'), BUENOS_AIRES)
    // Característica de tres dígitos (Rosario).
    assert.equal(toWhatsAppNumber('0341 15 512-3456'), '5493415123456')
  })

  it('no toca un número que ya tiene el largo correcto', () => {
    // '15' acá es parte del abonado, no el prefijo: sacarlo rompería el número.
    assert.equal(toWhatsAppNumber('11 1512-3456'), '5491115123456')
  })

  it('respeta un número de otro país', () => {
    assert.equal(toWhatsAppNumber('+1 555 123 4567'), '15551234567')
    assert.equal(toWhatsAppNumber('+55 11 91234-5678'), '5511912345678')
  })

  it('devuelve null cuando no hay un número usable', () => {
    for (const bad of [null, undefined, '', '   ', 'no tiene', '1234', '11 1234-5678 / casa 4444-5555']) {
      assert.equal(toWhatsAppNumber(bad), null, `debería rechazar ${JSON.stringify(bad)}`)
    }
  })
})

describe('whatsappChatUrl', () => {
  it('arma el link de wa.me', () => {
    assert.equal(whatsappChatUrl('11 1234-5678'), `https://wa.me/${BUENOS_AIRES}`)
  })

  it('es null sin teléfono, para que la UI no ofrezca abrir un chat inexistente', () => {
    assert.equal(whatsappChatUrl(null), null)
  })
})
