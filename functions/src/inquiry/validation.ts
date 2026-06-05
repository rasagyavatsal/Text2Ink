import { ALLOWED_TOPICS, Topic, LIMITS, isValidEmail } from "inquiry-validation"

export { ALLOWED_TOPICS, isValidEmail }
export type { Topic }

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

  if (name.length < LIMITS.name.min) errors.name = "Name must be at least 2 characters"
  else if (name.length > LIMITS.name.max) errors.name = "Name must be at most 100 characters"

  if (!email) errors.email = "Email is required"
  else if (email.length > LIMITS.email.max) errors.email = "Email must be at most 254 characters"
  else if (!isValidEmail(email)) errors.email = "Invalid email format"

  if (!topic) errors.topic = "Topic is required"
  else if (!ALLOWED_TOPICS.includes(topic as Topic))
    errors.topic = `Topic must be one of: ${ALLOWED_TOPICS.join(", ")}`

  if (message.length < LIMITS.message.min) errors.message = "Message must be at least 10 characters"
  else if (message.length > LIMITS.message.max) errors.message = "Message must be at most 5000 characters"

  if (Object.keys(errors).length > 0) return { ok: false, errors }

  return {
    ok: true,
    data: { name, email, topic: topic as Topic, message },
  }
}
