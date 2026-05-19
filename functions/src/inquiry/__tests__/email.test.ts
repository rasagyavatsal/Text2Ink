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
})
