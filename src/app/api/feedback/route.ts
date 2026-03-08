import { NextResponse } from "next/server"
import nodemailer from "nodemailer"

export async function POST(req: Request) {
  try {
    const { rating, improvement } = await req.json()

    // Create a transporter
    // Note: You should set these environment variables in your deployment platform
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER || "rasagyavatsal16@gmail.com",
        // Use an App Password for Gmail, not your actual password
        pass: process.env.EMAIL_PASS,
      },
    })

    const fromEmail = process.env.EMAIL_USER || "rasagyavatsal16@gmail.com"
    const fromName = "Text2Ink Feedback"

    const mailOptions = {
      from: `"${fromName}" <${fromEmail}>`,
      to: "rasagyavatsal16@gmail.com",
      replyTo: `"${fromName}" <${fromEmail}>`,
      subject: `New Feedback from Text2Ink - ${rating} Stars`,
      headers: {
        "X-Priority": "1 (Highest)",
        "X-MSMail-Priority": "High",
        Importance: "high",
      },
      text: `
Rating: ${rating} / 5
What needs to be improved:
${improvement || "No comments provided."}
      `,
      html: `
<div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px; max-width: 600px;">
  <h2 style="color: #333;">New Feedback Received!</h2>
  <div style="margin-bottom: 20px;">
    <strong>Rating:</strong> 
    <span style="font-size: 24px; color: #f59e0b;">${"★".repeat(rating)}${"☆".repeat(5 - rating)}</span>
    <span style="color: #666; margin-left: 10px;">(${rating} / 5)</span>
  </div>
  <div style="margin-bottom: 20px;">
    <strong>What needs to be improved:</strong>
    <p style="background: #f9fafb; padding: 15px; border-radius: 5px; color: #4b5563; line-height: 1.5;">
      ${improvement ? improvement.replace(/\n/g, "<br>") : "No comments provided."}
    </p>
  </div>
</div>
      `,
    }

    if (!process.env.EMAIL_PASS) {
      console.warn("EMAIL_PASS not found in environment variables. Email will not be sent.")
      // For now, we'll still return 200 to not break the UI if the user hasn't configured it yet
      // but you should definitely configure it.
      return NextResponse.json({ message: "Feedback received (email not sent due to missing credentials)" }, { status: 200 })
    }

    await transporter.sendMail(mailOptions)

    return NextResponse.json({ message: "Feedback sent successfully" }, { status: 200 })
  } catch (error) {
    console.error("Failed to send email:", error)
    return NextResponse.json({ error: "Failed to send feedback" }, { status: 500 })
  }
}
