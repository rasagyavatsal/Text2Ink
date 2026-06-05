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

    it("accepts a valid email such as person@example.com", () => {
      const result = validateInquiry({ ...validPayload, email: "person@example.com" })
      expect(result.ok).toBe(true)
    })

    it("rejects email with missing @", () => {
      const result = validateInquiry({ ...validPayload, email: "person.example.com" })
      expect(result.ok).toBe(false)
    })

    it("rejects email with multiple @ characters", () => {
      const result = validateInquiry({ ...validPayload, email: "person@another@example.com" })
      expect(result.ok).toBe(false)
    })

    it("rejects email with missing local part", () => {
      const result = validateInquiry({ ...validPayload, email: "@example.com" })
      expect(result.ok).toBe(false)
    })

    it("rejects email with missing domain", () => {
      const result = validateInquiry({ ...validPayload, email: "person@" })
      expect(result.ok).toBe(false)
    })

    it("rejects email with domain without a dot", () => {
      const result = validateInquiry({ ...validPayload, email: "person@example" })
      expect(result.ok).toBe(false)
    })

    it("rejects email with domain starting with a dot", () => {
      const result = validateInquiry({ ...validPayload, email: "person@.example.com" })
      expect(result.ok).toBe(false)
    })

    it("rejects email with domain ending with a dot", () => {
      const result = validateInquiry({ ...validPayload, email: "person@example.com." })
      expect(result.ok).toBe(false)
    })

    it("rejects email with whitespace inside the email", () => {
      const result = validateInquiry({ ...validPayload, email: "person @example.com" })
      expect(result.ok).toBe(false)
      const result2 = validateInquiry({ ...validPayload, email: "person@ex ample.com" })
      expect(result2.ok).toBe(false)
    })

    it("rejects a very long invalid email string quickly", () => {
      const start = Date.now()
      const result = validateInquiry({
        ...validPayload,
        email: "a".repeat(100000) + "example.com",
      })
      const duration = Date.now() - start
      expect(result.ok).toBe(false)
      expect(duration).toBeLessThan(100) // validation should be extremely fast
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
