import { onRequest } from "firebase-functions/v2/https"
import { initializeApp } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"
import { processInquiry } from "./processor"

initializeApp()
const db = getFirestore()

export const inquiry = onRequest(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method Not Allowed" })
    return
  }

  const result = await processInquiry(db, req)
  res.status(result.status).json(result.body)
})
