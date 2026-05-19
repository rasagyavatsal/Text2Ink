import { describe, it, expect, vi, beforeEach } from "vitest"
import { hashIdentifier, checkRateLimit, LIMITS } from "../rateLimit"

describe("hashIdentifier", () => {
  it("returns a hex string", () => {
    const hash = hashIdentifier("test-value", "secret")
    expect(hash).toMatch(/^[a-f0-9]{64}$/)
  })

  it("returns different hashes for different inputs", () => {
    const h1 = hashIdentifier("a", "secret")
    const h2 = hashIdentifier("b", "secret")
    expect(h1).not.toBe(h2)
  })

  it("returns the same hash for the same input", () => {
    const h1 = hashIdentifier("test", "secret")
    const h2 = hashIdentifier("test", "secret")
    expect(h1).toBe(h2)
  })
})

describe("checkRateLimit", () => {
  const ip = "192.168.1.1"
  const email = "test@example.com"

  function createMockDb(ipCount: number, emailCount: number) {
    const mockTransaction = {
      get: vi.fn(),
      set: vi.fn(),
      update: vi.fn(),
    }

    const mockDb = {
      runTransaction: vi.fn(async (fn: Function) => {
        // First call in get: IP doc. Second call: email doc.
        const ipDoc = {
          exists: ipCount > 0,
          data: () => ({ count: ipCount, expiresAt: { toDate: () => new Date(Date.now() + 3600000) } }),
        }
        const emailDoc = {
          exists: emailCount > 0,
          data: () => ({ count: emailCount, expiresAt: { toDate: () => new Date(Date.now() + 3600000) } }),
        }
        mockTransaction.get.mockResolvedValueOnce(ipDoc).mockResolvedValueOnce(emailDoc)
        await fn(mockTransaction)
      }),
    }

    return { mockDb, mockTransaction }
  }

  it("allows submission when under both limits", async () => {
    const { mockDb } = createMockDb(0, 0)
    const result = await checkRateLimit(mockDb as any, ip, email)
    expect(result.allowed).toBe(true)
  })

  it("rejects when IP limit exceeded", async () => {
    const { mockDb } = createMockDb(LIMITS.IP_MAX, 0)
    const result = await checkRateLimit(mockDb as any, ip, email)
    expect(result.allowed).toBe(false)
    expect(result.error).toContain("Too many inquiries")
  })

  it("rejects when email limit exceeded", async () => {
    const { mockDb } = createMockDb(0, LIMITS.EMAIL_MAX)
    const result = await checkRateLimit(mockDb as any, ip, email)
    expect(result.allowed).toBe(false)
    expect(result.error).toContain("Too many inquiries")
  })

  it("uses hashed keys, not raw IP or email", async () => {
    const { mockTransaction, mockDb } = createMockDb(0, 0)
    await checkRateLimit(mockDb as any, ip, email)

    const setCalls = mockTransaction.set.mock.calls
    for (const call of setCalls) {
      const docPath = call[0]?._path?.segments?.join("/") || ""
      // Hashed values are 64-char hex, not raw IPs or emails
      expect(docPath).not.toContain(ip)
      expect(docPath).not.toContain(email)
    }
  })
})
