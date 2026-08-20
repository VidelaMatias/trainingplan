// Enlace de "click to chat" a partir del teléfono guardado del alumno.
//
// wa.me sólo abre la conversación (como mucho prellena texto): no existe forma
// de adjuntar un archivo desde un link. El adjunto real lo entrega la hoja de
// compartir nativa del dispositivo — ver PlanCard —, y este enlace es el plan B
// para cuando el navegador no la soporta.

const AR_COUNTRY_CODE = '54'
// WhatsApp exige el 9 después del código de país para los celulares argentinos.
const AR_MOBILE_PREFIX = '549'
// Un celular argentino son 10 dígitos: característica + abonado.
const AR_LOCAL_LENGTH = 10

// El teléfono se carga como texto libre ('+54 11 1234-5678', '011 15 1234-5678',
// '11 1234 5678'), y wa.me quiere sólo dígitos con código de país. Devuelve null
// cuando lo cargado no da un número argentino plausible, para que la UI pueda
// decir "cargá el teléfono" en vez de abrir un chat con un número inventado.
export function toWhatsAppNumber(phone: string | null | undefined): string | null {
  if (!phone) return null

  const raw = phone.trim()
  const digits = raw.replace(/\D/g, '')
  if (digits.length < 8) return null

  // Sin + ni 00 ni 54 al frente asumimos Argentina: los alumnos del entrenador
  // lo son, y un número local no trae con qué desambiguar.
  const hasCountryCode =
    raw.startsWith('+') || raw.startsWith('00') || digits.startsWith(AR_COUNTRY_CODE)

  if (!hasCountryCode) {
    return argentineNumber(dropMobile15(digits.replace(/^0/, '')))
  }

  const withCountry = digits.replace(/^00/, '')
  // Un alumno de otro país se respeta tal cual: el 9 y el 15 son reglas
  // argentinas y aplicarlas afuera rompería el número.
  if (!withCountry.startsWith(AR_COUNTRY_CODE)) return withCountry

  const rest = withCountry.slice(AR_COUNTRY_CODE.length).replace(/^9/, '')
  return argentineNumber(dropMobile15(rest))
}

export function whatsappChatUrl(phone: string | null | undefined): string | null {
  const number = toWhatsAppNumber(phone)
  return number ? `https://wa.me/${number}` : null
}

function argentineNumber(local: string): string | null {
  return local.length === AR_LOCAL_LENGTH ? AR_MOBILE_PREFIX + local : null
}

// El 15 del formato local sobra cuando el número lleva el 9 internacional:
// '11 15 1234-5678' es el mismo abonado que '+54 9 11 1234-5678'. Sólo se toca
// un número con exactamente dos dígitos de más, donde ese 15 es la única
// explicación posible — así uno ya correcto nunca se rompe.
function dropMobile15(local: string): string {
  if (local.length !== AR_LOCAL_LENGTH + 2) return local

  // Las características argentinas tienen 2 dígitos (sólo el 11), 3 o 4.
  for (const areaLength of [2, 3, 4]) {
    if (local.slice(areaLength, areaLength + 2) === '15') {
      return local.slice(0, areaLength) + local.slice(areaLength + 2)
    }
  }
  return local
}
