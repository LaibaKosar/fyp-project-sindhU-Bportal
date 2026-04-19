export const normalizeText = (value) => (typeof value === 'string' ? value.trim() : '')

export const normalizeEmail = (value) => normalizeText(value).toLowerCase()

export const normalizePhone = (value) => normalizeText(value).replace(/\s+/g, ' ')

export const isRequiredTrimmed = (value) => normalizeText(value).length > 0

export const hasMinLength = (value, min) => normalizeText(value).length >= min

export const hasMaxLength = (value, max) => normalizeText(value).length <= max

export const isValidEmail = (value) => {
  const email = normalizeEmail(value)
  if (!email) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export const isValidPhone = (value) => {
  const phone = normalizePhone(value)
  if (!phone) return false
  const allowedChars = /^[0-9+\-() ]+$/
  if (!allowedChars.test(phone)) return false
  const digitsOnly = phone.replace(/\D/g, '')
  return digitsOnly.length >= 10 && digitsOnly.length <= 15
}

export const isValidUrl = (value) => {
  const raw = normalizeText(value)
  if (!raw) return false
  try {
    const parsed = new URL(raw)
    return ['http:', 'https:'].includes(parsed.protocol)
  } catch (error) {
    return false
  }
}

export const isPositiveInteger = (value) => Number.isInteger(value) && value > 0

export const isNonNegativeInteger = (value) => Number.isInteger(value) && value >= 0

export const isIntegerString = (value) => /^\d+$/.test(normalizeText(value))

export const toInteger = (value) => {
  const numeric = Number.parseInt(normalizeText(String(value)), 10)
  return Number.isNaN(numeric) ? null : numeric
}

export const isWithinRange = (value, min, max) => typeof value === 'number' && value >= min && value <= max

export const isValidDateOrder = (startDate, endDate) => {
  const start = normalizeText(startDate)
  const end = normalizeText(endDate)
  if (!start || !end) return false
  return new Date(start) < new Date(end)
}

export const isValidFiscalYearLabel = (value) => {
  const fiscal = normalizeText(value)
  if (!fiscal) return false
  const match = fiscal.match(/^(\d{4})\s*[-/]\s*(\d{4})$/)
  if (!match) return false
  const startYear = Number.parseInt(match[1], 10)
  const endYear = Number.parseInt(match[2], 10)
  return endYear === startYear + 1
}
