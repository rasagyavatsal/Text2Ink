const ALLOWED_TOPICS = [
  "General inquiry",
  "Bug report",
  "Feature request",
]

const LIMITS = {
  name: { min: 2, max: 100 },
  email: { max: 254 },
  message: { min: 10, max: 5000 },
}

function isValidEmail(email) {
  const trimmed = email.trim()
  if (trimmed.length === 0) return false
  if (/\s/.test(trimmed)) return false

  const parts = trimmed.split("@")
  if (parts.length !== 2) return false

  const [localPart, domain] = parts
  if (localPart.length === 0 || domain.length === 0) return false
  if (!domain.includes(".")) return false
  if (domain.startsWith(".") || domain.endsWith(".")) return false

  return true
}

exports.ALLOWED_TOPICS = ALLOWED_TOPICS
exports.LIMITS = LIMITS
exports.isValidEmail = isValidEmail
