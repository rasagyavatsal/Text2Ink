import { describe, it, expect, vi, beforeEach } from "vitest"

const { mockSendMail, mockCreateTransport } = vi.hoisted(() => {
  const mockSendMail = vi.fn().mockResolvedValue({ messageId: "test-id" })
  const mockCreateTransport = vi.fn(() => ({ sendMail: mockSendMail }))
  return { mockSendMail, mockCreateTransport }
})

vi.mock("nodemailer", () => ({
  default: { createTransport: mockCreateTransport },
}))

import { sendInquiryEmail } from "../email"

const validInquiry = {
  name: "Jane Doe",
  email: "jane@example.com",
  topic: "General inquiry" as const,
  message: "I have a question about your product.",
}

describe("sendInquiryEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset all SMTP env vars
    delete process.env.SMTP_HOST
    delete process.env.SMTP_PORT
    delete process.env.SMTP_SECURE
    delete process.env.SMTP_USER
    delete process.env.SMTP_PASS
    delete process.env.SMTP_TO
    process.env.EMAIL_USER = "sender@gmail.com"
    process.env.EMAIL_PASS = "app-password"
  })

  it("sends an email with the inquiry details", async () => {
    await sendInquiryEmail(validInquiry)

    expect(mockSendMail).toHaveBeenCalledTimes(1)
    const mailOptions = mockSendMail.mock.calls[0][0]
    expect(mailOptions.to).toBe("sender@gmail.com")
    expect(mailOptions.subject).toContain("General inquiry")
    expect(mailOptions.text).toContain("Jane Doe")
    expect(mailOptions.text).toContain("jane@example.com")
    expect(mailOptions.text).toContain("I have a question about your product.")
  })

  it("sets replyTo to the submitter's email", async () => {
    await sendInquiryEmail(validInquiry)

    const mailOptions = mockSendMail.mock.calls[0][0]
    expect(mailOptions.replyTo).toContain("jane@example.com")
  })

  it("fails closed when EMAIL_PASS is missing", async () => {
    delete process.env.EMAIL_PASS

    await expect(sendInquiryEmail(validInquiry)).rejects.toThrow(
      /credentials/i
    )
  })

  it("fails closed when EMAIL_USER is missing", async () => {
    delete process.env.EMAIL_USER

    await expect(sendInquiryEmail(validInquiry)).rejects.toThrow(
      /credentials/i
    )
  })

  it("does not send a confirmation email to the submitter", async () => {
    await sendInquiryEmail(validInquiry)

    const mailOptions = mockSendMail.mock.calls[0][0]
    expect(mockSendMail).toHaveBeenCalledTimes(1)
    expect(mailOptions.to).toBe("sender@gmail.com")
  })

  it("uses Gmail SMTP defaults when no SMTP_HOST is provided", async () => {
    await sendInquiryEmail(validInquiry)

    const transportConfig = (mockCreateTransport.mock.calls[0] as any)[0]
    expect(transportConfig.host).toBe("smtp.gmail.com")
    expect(transportConfig.port).toBe(465)
    expect(transportConfig.secure).toBe(true)
  })

  it("uses custom SMTP host when SMTP_HOST is set", async () => {
    process.env.SMTP_HOST = "localhost"
    process.env.SMTP_PORT = "1025"
    process.env.SMTP_SECURE = "false"
    process.env.SMTP_USER = "test-user"
    process.env.SMTP_PASS = "test-pass"

    await sendInquiryEmail(validInquiry)

    const transportConfig = (mockCreateTransport.mock.calls[0] as any)[0]
    expect(transportConfig.host).toBe("localhost")
    expect(transportConfig.port).toBe(1025)
    expect(transportConfig.secure).toBe(false)
    expect(transportConfig.auth.user).toBe("test-user")
    expect(transportConfig.auth.pass).toBe("test-pass")
  })

  it("allows SMTP_USER/SMTP_PASS without EMAIL_USER/EMAIL_PASS when SMTP_HOST is set", async () => {
    delete process.env.EMAIL_USER
    delete process.env.EMAIL_PASS
    process.env.SMTP_HOST = "localhost"
    process.env.SMTP_PORT = "1025"
    process.env.SMTP_SECURE = "false"
    process.env.SMTP_USER = "sink-user"
    process.env.SMTP_PASS = "sink-pass"
    process.env.SMTP_TO = "inbox@localhost"

    await sendInquiryEmail(validInquiry)

    expect(mockSendMail).toHaveBeenCalledTimes(1)
    const mailOptions = mockSendMail.mock.calls[0][0]
    expect(mailOptions.to).toBe("inbox@localhost")
  })

  it("uses SMTP_TO as recipient when provided", async () => {
    process.env.SMTP_TO = "admin@company.com"

    await sendInquiryEmail(validInquiry)

    const mailOptions = mockSendMail.mock.calls[0][0]
    expect(mailOptions.to).toBe("admin@company.com")
  })

  it("falls back to EMAIL_USER as recipient when SMTP_TO is absent", async () => {
    delete process.env.SMTP_TO

    await sendInquiryEmail(validInquiry)

    const mailOptions = mockSendMail.mock.calls[0][0]
    expect(mailOptions.to).toBe("sender@gmail.com")
  })
})
