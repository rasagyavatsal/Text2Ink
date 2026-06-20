import nodemailer from "nodemailer"
import type { Topic } from "./validation"

interface InquiryData {
  name: string
  email: string
  topic: Topic
  message: string
}

export async function sendInquiryEmail(inquiry: InquiryData): Promise<void> {
  const smtpHost = process.env.SMTP_HOST
  const smtpUser = process.env.SMTP_USER ?? process.env.EMAIL_USER
  const smtpPass = process.env.SMTP_PASS ?? process.env.EMAIL_PASS
  const emailUser = process.env.EMAIL_USER

  // When custom SMTP host is provided, SMTP_USER/SMTP_PASS are used directly.
  // When using Gmail defaults, EMAIL_USER/EMAIL_PASS are required.
  if (smtpHost) {
    if (!smtpUser || !smtpPass) {
      throw new Error("Required email credentials are not configured")
    }
  } else {
    if (!emailUser || !smtpPass) {
      throw new Error("Required email credentials are not configured")
    }
  }

  const host = smtpHost ?? "smtp.gmail.com"
  const port = smtpHost ? parseInt(process.env.SMTP_PORT ?? "587", 10) : 465
  const secure = smtpHost
    ? (process.env.SMTP_SECURE ?? "true").toLowerCase() !== "false"
    : true
  const authUser = smtpUser!
  const authPass = smtpPass!
  const recipient = process.env.SMTP_TO ?? emailUser!

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user: authUser, pass: authPass },
  })

  const fromAddress = emailUser ? `"Text2Ink Inquiry" <${emailUser}>` : `"Text2Ink Inquiry" <${authUser}>`

  await transporter.sendMail({
    from: fromAddress,
    to: recipient,
    replyTo: `"${inquiry.name}" <${inquiry.email}>`,
    subject: `New Inquiry: ${inquiry.topic}`,
    text: `Name: ${inquiry.name}\nEmail: ${inquiry.email}\nTopic: ${inquiry.topic}\n\nMessage:\n${inquiry.message}`,
    html: `<div style="font-family:sans-serif;padding:20px;max-width:600px">
      <h2 style="color:#333">New Inquiry</h2>
      <p><strong>Name:</strong> ${inquiry.name}</p>
      <p><strong>Email:</strong> ${inquiry.email}</p>
      <p><strong>Topic:</strong> ${inquiry.topic}</p>
      <hr style="border:none;border-top:1px solid #eee;margin:16px 0"/>
      <p style="white-space:pre-wrap">${inquiry.message}</p>
    </div>`,
  })
}
