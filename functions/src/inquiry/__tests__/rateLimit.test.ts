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
      get: vi.fn(async (ref: any) => {
        if (!ref || !ref._isMockRef) throw new Error("Expected DocumentReference");
      }),
      set: vi.fn((ref: any) => {
        if (!ref || !ref._isMockRef) throw new Error("Expected DocumentReference");
      }),
      update: vi.fn((ref: any) => {
        if (!ref || !ref._isMockRef) throw new Error("Expected DocumentReference");
      }),
    }

    const mockDb = {
      doc: vi.fn((path: string) => ({ id: path, path, _isMockRef: true })),
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
        
        mockTransaction.get
          .mockImplementationOnce(async (ref: any) => {
            if (!ref || !ref._isMockRef) throw new Error("Expected DocumentReference");
            return ipDoc;
          })
          .mockImplementationOnce(async (ref: any) => {
            if (!ref || !ref._isMockRef) throw new Error("Expected DocumentReference");
            return emailDoc;
          });

        mockTransaction.set.mockImplementation((ref: any) => {
          if (!ref || !ref._isMockRef) throw new Error("Expected DocumentReference");
        });

        mockTransaction.update.mockImplementation((ref: any) => {
          if (!ref || !ref._isMockRef) throw new Error("Expected DocumentReference");
        });

        await fn(mockTransaction)
      }),
    }

    return { mockDb, mockTransaction }
  }

  it("allows submission when under both limits", async () => {
    const { mockDb, mockTransaction } = createMockDb(0, 0)
    const result = await checkRateLimit(mockDb as any, ip, email)
    expect(result.allowed).toBe(true)

    // Verify tx.get and tx.set were called with DocumentReferences
    const getCalls = mockTransaction.get.mock.calls
    const setCalls = mockTransaction.set.mock.calls
    expect(getCalls.length).toBeGreaterThan(0)
    expect(setCalls.length).toBeGreaterThan(0)
    
    getCalls.forEach(call => {
      expect(call[0]._isMockRef).toBe(true)
    })
    setCalls.forEach(call => {
      expect(call[0]._isMockRef).toBe(true)
    })
  })

  it("rejects plain objects in mock transaction (strict mock test)", async () => {
    const { mockTransaction } = createMockDb(0, 0)
    
    await expect(mockTransaction.get({ path: "test" })).rejects.toThrow("Expected DocumentReference")
    expect(() => mockTransaction.set({ path: "test" })).toThrow("Expected DocumentReference")
    expect(() => mockTransaction.update({ path: "test" })).toThrow("Expected DocumentReference")
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

  it("uses hashed keys and accesses correct document references", async () => {
    const { mockDb } = createMockDb(0, 0)
    await checkRateLimit(mockDb as any, ip, email)

    expect(mockDb.doc).toHaveBeenCalled()
    
    const docCalls = mockDb.doc.mock.calls
    for (const call of docCalls) {
      const docPath = call[0]
      expect(docPath).toContain("inquiryRateLimits/")
      expect(docPath).not.toContain(ip)
      expect(docPath).not.toContain(email)
    }
  })
})
