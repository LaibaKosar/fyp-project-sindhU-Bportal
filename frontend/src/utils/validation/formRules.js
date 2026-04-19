import {
  hasMaxLength,
  isRequiredTrimmed,
  isValidDateOrder,
  isValidEmail,
  isValidFiscalYearLabel,
  isValidPhone,
  isValidUrl,
  isWithinRange,
  normalizeText,
} from './commonValidators'

export const FIELD_LIMITS = {
  shortCode: 20,
  name: 120,
  title: 180,
  email: 120,
  phone: 30,
  url: 255,
  notes: 1000,
}

export const validateRequiredField = (value, label) => {
  if (!isRequiredTrimmed(value)) return `Please enter ${label}`
  return null
}

export const validateEmailField = (value, label = 'a valid email address') => {
  if (!isValidEmail(value)) return `Please enter ${label}`
  if (!hasMaxLength(value, FIELD_LIMITS.email)) return `Email is too long (max ${FIELD_LIMITS.email} characters)`
  return null
}

export const validatePhoneField = (value, label = 'a valid phone number') => {
  if (!isValidPhone(value)) return `Please enter ${label}`
  if (!hasMaxLength(value, FIELD_LIMITS.phone)) return `Phone number is too long (max ${FIELD_LIMITS.phone} characters)`
  return null
}

export const validateUrlField = (value, label = 'a valid website URL') => {
  const normalized = normalizeText(value)
  if (!normalized) return null
  if (!isValidUrl(normalized)) return `Please enter ${label}`
  if (!hasMaxLength(normalized, FIELD_LIMITS.url)) return `URL is too long (max ${FIELD_LIMITS.url} characters)`
  return null
}

export const validateDateRangeField = (startDate, endDate) => {
  if (!isValidDateOrder(startDate, endDate)) return 'End date must be after start date'
  return null
}

export const validateFiscalYearField = (value) => {
  const normalized = normalizeText(value)
  if (!normalized) return 'Please enter fiscal year'
  if (!isValidFiscalYearLabel(normalized)) return 'Please use fiscal year format like 2025-2026'
  return null
}

export const validateNumberRangeField = (value, min, max, label) => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return `Please enter ${label}`
  if (!isWithinRange(numeric, min, max)) return `${label} must be between ${min} and ${max}`
  return null
}
