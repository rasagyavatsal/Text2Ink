import { Request } from "firebase-functions/v2/https"
import { Firestore } from "firebase-admin/firestore"
import { logger } from "firebase-functions"
import { validateInquiry } from "./validation"
import { checkHoneypot, checkOrigin } from "./spam"
import { checkRateLimit } from "./rateLimit"
import { sendInquiryEmail } from "./email"

export interface ProcessResult {
  status: 200 | 400 | 403 | 429 | 500;
  body: { message?: string; error?: string; errors?: Record<string, string> };
}

export async function processInquiry(db: Firestore, req: Request): Promise<ProcessResult> {
  const origin = req.headers.origin || req.headers.referer
  if (!checkOrigin(origin)) {
    return { status: 403, body: { error: "Forbidden" } }
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body

    // Honeypot check — silently drop spam
    if (checkHoneypot(body?.website)) {
      return { status: 200, body: { message: "Inquiry received" } }
    }

    // Validate payload
    const validation = validateInquiry(body)
    if (!validation.ok) {
      return { status: 400, body: { errors: validation.errors } }
    }

    // Rate limiting
    const clientIp =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.socket.remoteAddress ||
      "unknown"

    const rateLimit = await checkRateLimit(db, clientIp, validation.data.email)
    if (!rateLimit.allowed) {
      return { status: 429, body: { error: rateLimit.error } }
    }

    // Send email (fail-closed if credentials missing)
    await sendInquiryEmail(validation.data)

    return { status: 200, body: { message: "Inquiry sent successfully" } }
  } catch (error) {
    logger.error("Inquiry handler error:", error)
    return { status: 500, body: { error: "Failed to process inquiry" } }
  }
}
