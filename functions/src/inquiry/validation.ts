export const ALLOWED_TOPICS = [
  "General inquiry",
  "Bug report",
  "Feature request",
] as const

export type Topic = (typeof ALLOWED_TOPICS)[number]

export interface InquiryPayload {
  name: string
  email: string
  topic: string
  message: string
}

interface ValidationSuccess {
  ok: true
  data: { name: string; email: string; topic: Topic; message: string }
}

interface ValidationError {
  ok: false
  errors: Partial<Record<keyof InquiryPayload, string>>
}

export type ValidationResult = ValidationSuccess | ValidationError

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

export function validateInquiry(raw: unknown): ValidationResult {
  if (!raw || typeof raw !== "object") {
    return { ok: false, errors: { name: "Invalid payload" } }
  }

  const body = raw as Record<string, unknown>
  const errors: Partial<Record<keyof InquiryPayload, string>> = {}

  const name = typeof body.name === "string" ? body.name.trim() : ""
  const email = typeof body.email === "string" ? body.email.trim() : ""
  const topic = typeof body.topic === "string" ? body.topic.trim() : ""
  const message = typeof body.message === "string" ? body.message.trim() : ""

  if (name.length < 2) errors.name = "Name must be at least 2 characters"
  else if (name.length > 100) errors.name = "Name must be at most 100 characters"

  if (!email) errors.email = "Email is required"
  else if (email.length > 254) errors.email = "Email must be at most 254 characters"
  else if (!isValidEmail(email)) errors.email = "Invalid email format"

  if (!topic) errors.topic = "Topic is required"
  else if (!ALLOWED_TOPICS.includes(topic as Topic))
    errors.topic = `Topic must be one of: ${ALLOWED_TOPICS.join(", ")}`

  if (message.length < 10) errors.message = "Message must be at least 10 characters"
  else if (message.length > 5000) errors.message = "Message must be at most 5000 characters"

  if (Object.keys(errors).length > 0) return { ok: false, errors }

  return {
    ok: true,
    data: { name, email, topic: topic as Topic, message },
  }
}
