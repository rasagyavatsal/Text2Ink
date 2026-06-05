import { describe, it, expect } from "vitest"
import { ALLOWED_TOPICS, LIMITS, isValidEmail } from "../index"

describe("inquiry-validation", () => {
  it("exports the correct allowed topics", () => {
    expect(ALLOWED_TOPICS).toEqual([
      "General inquiry",
      "Bug report",
      "Feature request",
    ])
  })

  it("exports the correct limits", () => {
    expect(LIMITS).toEqual({
      name: { min: 2, max: 100 },
      email: { max: 254 },
      message: { min: 10, max: 5000 },
    })
  })

  describe("isValidEmail", () => {
    it("validates a standard email address", () => {
      expect(isValidEmail("test@example.com")).toBe(true)
    })

    it("rejects an email without an @ symbol", () => {
      expect(isValidEmail("testexample.com")).toBe(false)
    })

    it("rejects an email with multiple @ symbols", () => {
      expect(isValidEmail("test@test@example.com")).toBe(false)
    })
  })
})
