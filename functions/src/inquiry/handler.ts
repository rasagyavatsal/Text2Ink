import { onRequest } from "firebase-functions/v2/https"
import { logger } from "firebase-functions"
import { initializeApp } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"
import { validateInquiry } from "./validation"
import { checkHoneypot, checkOrigin } from "./spam"
import { checkRateLimit } from "./rateLimit"
import { sendInquiryEmail } from "./email"

initializeApp()
const db = getFirestore()

export const inquiry = onRequest(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method Not Allowed" })
    return
  }

  const origin = req.headers.origin || req.headers.referer
  if (!checkOrigin(origin)) {
    res.status(403).json({ error: "Forbidden" })
    return
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body

    // Honeypot check — silently drop spam
    if (checkHoneypot(body?.website)) {
      res.status(200).json({ message: "Inquiry received" })
      return
    }

    // Validate payload
    const validation = validateInquiry(body)
    if (!validation.ok) {
      res.status(400).json({ errors: validation.errors })
      return
    }

    // Rate limiting
    const clientIp =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.socket.remoteAddress ||
      "unknown"

    const rateLimit = await checkRateLimit(db, clientIp, validation.data.email)
    if (!rateLimit.allowed) {
      res.status(429).json({ error: rateLimit.error })
      return
    }

    // Send email (fail-closed if credentials missing)
    await sendInquiryEmail(validation.data)

    res.status(200).json({ message: "Inquiry sent successfully" })
  } catch (error) {
    logger.error("Inquiry handler error:", error)
    res.status(500).json({ error: "Failed to process inquiry" })
  }
})
