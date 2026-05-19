import { describe, it, expect } from "vitest"
import { validateInquiry, type InquiryPayload } from "../validation"

const validPayload: InquiryPayload = {
  name: "Jane Doe",
  email: "jane@example.com",
  topic: "General inquiry",
  message: "I have a question about your product.",
}

describe("validateInquiry", () => {
  it("accepts a valid payload", () => {
    const result = validateInquiry(validPayload)
    expect(result.ok).toBe(true)
  })

  describe("name", () => {
    it("rejects missing name", () => {
      const result = validateInquiry({ ...validPayload, name: "" })
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.errors.name).toBeDefined()
    })

    it("rejects name shorter than 2 characters", () => {
      const result = validateInquiry({ ...validPayload, name: "A" })
      expect(result.ok).toBe(false)
    })

    it("rejects name longer than 100 characters", () => {
      const result = validateInquiry({ ...validPayload, name: "A".repeat(101) })
      expect(result.ok).toBe(false)
    })
  })

  describe("email", () => {
    it("rejects missing email", () => {
      const result = validateInquiry({ ...validPayload, email: "" })
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.errors.email).toBeDefined()
    })

    it("rejects invalid email format", () => {
      const result = validateInquiry({ ...validPayload, email: "not-an-email" })
      expect(result.ok).toBe(false)
    })

    it("rejects email longer than 254 characters", () => {
      const result = validateInquiry({
        ...validPayload,
        email: "a".repeat(246) + "@test.com",
      })
      expect(result.ok).toBe(false)
    })
  })

  describe("topic", () => {
    it("rejects missing topic", () => {
      const result = validateInquiry({ ...validPayload, topic: "" })
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.errors.topic).toBeDefined()
    })

    it("rejects topic not in allowed list", () => {
      const result = validateInquiry({ ...validPayload, topic: "Something else" })
      expect(result.ok).toBe(false)
    })

    it.each(["General inquiry", "Bug report", "Feature request"])(
      "accepts topic '%s'",
      (topic) => {
        const result = validateInquiry({ ...validPayload, topic })
        expect(result.ok).toBe(true)
      }
    )
  })

  describe("message", () => {
    it("rejects missing message", () => {
      const result = validateInquiry({ ...validPayload, message: "" })
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.errors.message).toBeDefined()
    })

    it("rejects message shorter than 10 characters", () => {
      const result = validateInquiry({ ...validPayload, message: "Hi there" })
      expect(result.ok).toBe(false)
    })

    it("rejects message longer than 5000 characters", () => {
      const result = validateInquiry({ ...validPayload, message: "A".repeat(5001) })
      expect(result.ok).toBe(false)
    })
  })

  describe("type coercion", () => {
    it("rejects non-object input", () => {
      const result = validateInquiry(null)
      expect(result.ok).toBe(false)
    })

    it("trims whitespace before validating", () => {
      const result = validateInquiry({
        ...validPayload,
        name: "  Jane Doe  ",
        email: "  jane@example.com  ",
        message: "  I have a question about your product.  ",
      })
      expect(result.ok).toBe(true)
    })
  })
})
