import { describe, it, expect, vi, beforeEach } from "vitest"
import httpMocks from "node-mocks-http"

const { mockSendMail, mockRunTransaction, mockDb, createStrictMockTransaction, installDefaultTransactionMock } = vi.hoisted(() => {
  process.env.ALLOWED_ORIGINS = "https://localhost:3000,https://text2ink.com"
  const mockSendMail = vi.fn().mockResolvedValue({})
  const mockRunTransaction = vi.fn()

  const createStrictMockTransaction = (snapshots?: any[]) => {
    let callIndex = 0
    const get = vi.fn(async (ref: any) => {
      if (!ref?._isMockRef) throw new Error("Expected DocumentReference")
      if (snapshots && callIndex < snapshots.length) {
        return snapshots[callIndex++]
      }
      return { exists: false, data: () => undefined }
    })
    const set = vi.fn((ref: any) => {
      if (!ref?._isMockRef) throw new Error("Expected DocumentReference")
    })
    const update = vi.fn((ref: any) => {
      if (!ref?._isMockRef) throw new Error("Expected DocumentReference")
    })
    return { get, set, update }
  }

  const installDefaultTransactionMock = () => {
    mockRunTransaction.mockImplementation(async (fn: Function) => {
      const tx = createStrictMockTransaction()
      await fn(tx)
    })
  }

  installDefaultTransactionMock()

  const mockDb = { 
    runTransaction: mockRunTransaction,
    doc: vi.fn((path) => ({ id: path, path, _isMockRef: true }))
  }
  return { mockSendMail, mockRunTransaction, mockDb, createStrictMockTransaction, installDefaultTransactionMock }
})

vi.mock("firebase-functions/v2/https", () => ({
  onRequest: vi.fn((handler: Function) => handler),
}))

vi.mock("firebase-functions", () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}))

vi.mock("nodemailer", () => ({
  default: { createTransport: vi.fn(() => ({ sendMail: mockSendMail })) },
}))

vi.mock("firebase-admin/firestore", () => ({
  getFirestore: vi.fn(() => mockDb),
}))

vi.mock("firebase-admin/app", () => ({
  initializeApp: vi.fn(),
  cert: vi.fn(),
}))

import { inquiry } from "../handler"

const validBody = {
  name: "Jane Doe",
  email: "jane@example.com",
  topic: "General inquiry",
  message: "I have a question about your product.",
}

function createReqRes(options: {
  method?: string
  body?: unknown
  origin?: string
  headers?: Record<string, string>
}) {
  const req = httpMocks.createRequest({
    method: (options.method || "POST") as any,
    body: options.body || validBody,
    headers: {
      origin: options.origin || "https://localhost:3000",
      ...options.headers,
    },
  })
  const res = httpMocks.createResponse()
  return { req, res }
}

describe("inquiry handler", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.EMAIL_USER = "test@gmail.com"
    process.env.EMAIL_PASS = "test-pass"
    process.env.ALLOWED_ORIGINS = "https://localhost:3000,https://text2ink.com"
    process.env.INQUIRY_HMAC_SECRET = "test-secret"
    installDefaultTransactionMock()
  })

  it("returns 405 for non-POST requests", async () => {
    const { req, res } = createReqRes({ method: "GET" })
    await (inquiry as any)(req, res)
    expect(res.statusCode).toBe(405)
  })

  it("returns 403 for disallowed origins", async () => {
    const { req, res } = createReqRes({ origin: "https://evil.com" })
    await (inquiry as any)(req, res)
    expect(res.statusCode).toBe(403)
  })

  it("returns 400 for invalid payload", async () => {
    const { req, res } = createReqRes({ body: { name: "" } })
    await (inquiry as any)(req, res)
    expect(res.statusCode).toBe(400)
    const data = res._getJSONData()
    expect(data.errors).toBeDefined()
  })

  it("returns 200 and silently drops honeypot submissions", async () => {
    const { req, res } = createReqRes({
      body: { ...validBody, website: "https://spam.example" },
    })
    await (inquiry as any)(req, res)
    expect(res.statusCode).toBe(200)
    expect(mockSendMail).not.toHaveBeenCalled()
  })

  it("returns 200 on successful submission", async () => {
    const { req, res } = createReqRes({})
    await (inquiry as any)(req, res)
    expect(res.statusCode).toBe(200)
    expect(mockSendMail).toHaveBeenCalledTimes(1)
    const mailOptions = mockSendMail.mock.calls[0][0]
    expect(mailOptions.replyTo).toContain("jane@example.com")
  })

  it("returns 429 when rate limit exceeded", async () => {
    mockRunTransaction.mockImplementationOnce(async (fn: Function) => {
      const tx = createStrictMockTransaction([
        {
          exists: true,
          data: () => ({ count: 5, expiresAt: { toDate: () => new Date(Date.now() + 3600000) } }),
        },
        {
          exists: false,
          data: () => undefined,
        },
      ])
      await fn(tx)
    })

    const { req, res } = createReqRes({})
    await (inquiry as any)(req, res)
    expect(res.statusCode).toBe(429)
    const data = res._getJSONData()
    expect(data.error).toBe("Too many inquiries. Please try again later.")
  })

  it("returns 500 when email credentials are missing (fail closed)", async () => {
    delete process.env.EMAIL_PASS
    const { req, res } = createReqRes({})
    await (inquiry as any)(req, res)
    expect(res.statusCode).toBe(500)
  })

  it("returns 500 when email sending fails", async () => {
    mockSendMail.mockRejectedValueOnce(new Error("SMTP error"))
    const { req, res } = createReqRes({})
    await (inquiry as any)(req, res)
    expect(res.statusCode).toBe(500)
  })

  it("handles string body JSON parsing", async () => {
    const { req, res } = createReqRes({
      body: JSON.stringify(validBody) as any,
    })
    await (inquiry as any)(req, res)
    expect(res.statusCode).toBe(200)
  })

  it("mock transaction rejects plain object literals (strict mock test)", async () => {
    let mockTx: any;
    mockRunTransaction.mockImplementationOnce(async (fn: Function) => {
      mockTx = createStrictMockTransaction()
      // We purposefully don't call fn to just test the tx methods
    })

    // Trigger runTransaction so mockTx is populated
    await mockDb.runTransaction(async () => {});

    await expect(mockTx.get({ id: "plain" })).rejects.toThrow("Expected DocumentReference");
    expect(() => mockTx.set({ id: "plain" })).toThrow("Expected DocumentReference");
    expect(() => mockTx.update({ id: "plain" })).toThrow("Expected DocumentReference");
  })
})
