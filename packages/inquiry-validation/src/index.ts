export const ALLOWED_TOPICS = [
  "General inquiry",
  "Bug report",
  "Feature request",
] as const

export type Topic = (typeof ALLOWED_TOPICS)[number]

export const LIMITS = {
  name: { min: 2, max: 100 },
  email: { max: 254 },
  message: { min: 10, max: 5000 },
} as const

export function isValidEmail(email: string): boolean {
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
