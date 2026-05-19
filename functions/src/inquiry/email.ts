import nodemailer from "nodemailer"
import type { Topic } from "./validation"

interface InquiryData {
  name: string
  email: string
  topic: Topic
  message: string
}

export async function sendInquiryEmail(inquiry: InquiryData): Promise<void> {
  const emailUser = process.env.EMAIL_USER
  const emailPass = process.env.EMAIL_PASS

  if (!emailUser || !emailPass) {
    throw new Error("Required email credentials are not configured")
  }

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user: emailUser, pass: emailPass },
  })

  await transporter.sendMail({
    from: `"Text2Ink Inquiry" <${emailUser}>`,
    to: emailUser,
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
