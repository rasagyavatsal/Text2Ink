import { describe, it, expect } from "vitest"
import { checkHoneypot, checkOrigin, ALLOWED_ORIGINS } from "../spam"

describe("checkHoneypot", () => {
  it("returns not-spam when honeypot field is empty", () => {
    expect(checkHoneypot("")).toBe(false)
  })

  it("returns not-spam when honeypot field is undefined", () => {
    expect(checkHoneypot(undefined)).toBe(false)
  })

  it("returns spam when honeypot field is filled", () => {
    expect(checkHoneypot("https://spam.example")).toBe(true)
  })
})

describe("checkOrigin", () => {
  it("accepts an allowed origin", () => {
    const origin = ALLOWED_ORIGINS[0]
    expect(checkOrigin(origin)).toBe(true)
  })

  it("rejects a disallowed origin", () => {
    expect(checkOrigin("https://evil.com")).toBe(false)
  })

  it("rejects missing origin", () => {
    expect(checkOrigin(undefined)).toBe(false)
  })

  it("rejects empty origin", () => {
    expect(checkOrigin("")).toBe(false)
  })
})
