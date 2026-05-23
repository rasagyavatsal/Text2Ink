import { createHmac } from "node:crypto"

export const LIMITS = {
  IP_MAX: 5,
  EMAIL_MAX: 3,
  WINDOW_MS: 60 * 60 * 1000, // 1 hour
} as const

const HMAC_SECRET = process.env.INQUIRY_HMAC_SECRET || "dev-secret-change-in-production"

export function hashIdentifier(identifier: string, secret = HMAC_SECRET): string {
  return createHmac("sha256", secret).update(identifier).digest("hex")
}

interface RateLimitDoc {
  count: number
  expiresAt: { toDate: () => Date }
}

interface FirestoreLike {
  runTransaction(fn: (tx: TransactionLike) => Promise<void>): Promise<void>
}

interface TransactionLike {
  get(ref: unknown): Promise<{ exists: boolean; data: () => RateLimitDoc | undefined }>
  set(ref: unknown, data: unknown): void
  update(ref: unknown, data: unknown): void
}

function bucketKey(identifier: string): string {
  const now = new Date()
  const bucket = `${now.getUTCFullYear()}-${now.getUTCMonth()}-${now.getUTCDate()}-${now.getUTCHours()}`
  return `${identifier}:${bucket}`
}

export async function checkRateLimit(
  db: FirestoreLike,
  ip: string,
  email: string
): Promise<{ allowed: boolean; error?: string }> {
  const ipHash = hashIdentifier(ip)
  const emailHash = hashIdentifier(email.toLowerCase().trim())
  const ipKey = bucketKey(ipHash)
  const emailKey = bucketKey(emailHash)

  let allowed = true

  await db.runTransaction(async (tx) => {
    const ipRef = { _path: { segments: ["inquiryRateLimits", ipKey] } }
    const emailRef = { _path: { segments: ["inquiryRateLimits", emailKey] } }

    const ipDoc = await tx.get(ipRef)
    const emailDoc = await tx.get(emailRef)

    const ipCount = ipDoc.exists ? ipDoc.data()?.count ?? 0 : 0
    const emailCount = emailDoc.exists ? emailDoc.data()?.count ?? 0 : 0

    if (ipCount >= LIMITS.IP_MAX || emailCount >= LIMITS.EMAIL_MAX) {
      allowed = false
      return
    }

    const expiresAt = new Date(Date.now() + LIMITS.WINDOW_MS)

    tx.set(ipRef, { count: ipCount + 1, expiresAt })
    tx.set(emailRef, { count: emailCount + 1, expiresAt })
  })

  return allowed
    ? { allowed: true }
    : { allowed: false, error: "Too many inquiries. Please try again later." }
}
