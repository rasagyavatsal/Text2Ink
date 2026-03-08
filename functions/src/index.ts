import { onRequest } from "firebase-functions/v2/https"
import { logger } from "firebase-functions"
import nodemailer from "nodemailer"

const emailUser = process.env.EMAIL_USER || "rasagyavatsal16@gmail.com"
const emailPass = process.env.EMAIL_PASS

export const feedback = onRequest(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method Not Allowed" })
    return
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body
    const rating = Number(body?.rating)
    const improvement = String(body?.improvement || "")

    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      res.status(400).json({ error: "Invalid rating" })
      return
    }

    if (!emailPass) {
      logger.warn("EMAIL_PASS not found in environment variables. Email will not be sent.")
      res.status(200).json({ message: "Feedback received (email not sent due to missing credentials)" })
      return
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: emailUser,
        pass: emailPass,
      },
    })

    const fromName = "Text2Ink Feedback"
    const mailOptions = {
      from: `"${fromName}" <${emailUser}>`,
      to: emailUser,
      replyTo: `"${fromName}" <${emailUser}>`,
      subject: `New Feedback from Text2Ink - ${rating} Stars`,
      headers: {
        "X-Priority": "1 (Highest)",
        "X-MSMail-Priority": "High",
        "Importance": "high",
      },
      text: `\nRating: ${rating} / 5\nWhat needs to be improved:\n${improvement || "No comments provided."}\n`,
      html: `\n<div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px; max-width: 600px;">\n  <h2 style="color: #333;">New Feedback Received!</h2>\n  <div style="margin-bottom: 20px;">\n    <strong>Rating:</strong> \n    <span style="font-size: 24px; color: #f59e0b;">${"★".repeat(rating)}${"☆".repeat(5 - rating)}</span>\n    <span style="color: #666; margin-left: 10px;">(${rating} / 5)</span>\n  </div>\n  <div style="margin-bottom: 20px;">\n    <strong>What needs to be improved:</strong>\n    <p style="background: #f9fafb; padding: 15px; border-radius: 5px; color: #4b5563; line-height: 1.5;">\n      ${improvement ? improvement.replace(/\n/g, "<br>") : "No comments provided."}\n    </p>\n  </div>\n</div>\n      `,
    }

    await transporter.sendMail(mailOptions)

    res.status(200).json({ message: "Feedback sent successfully" })
  } catch (error) {
    logger.error("Failed to send email:", error)
    res.status(500).json({ error: "Failed to send feedback" })
  }
})
