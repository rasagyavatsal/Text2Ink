import { describe, it, expect, vi, beforeEach } from 'vitest';
import httpMocks from 'node-mocks-http';

// Mock firebase-functions
vi.mock('firebase-functions/v2/https', () => ({
  onRequest: vi.fn((handler) => handler),
}));

vi.mock('firebase-functions', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock nodemailer
const mockSendMail = vi.fn();
vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail: mockSendMail,
    })),
  },
}));

import { feedback } from '../index';

describe('feedback function', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.EMAIL_PASS = 'test-pass';
  });

  it('returns 405 for non-POST requests', async () => {
    const req = httpMocks.createRequest({ method: 'GET' });
    const res = httpMocks.createResponse();

    await (feedback as any)(req, res);

    expect(res.statusCode).toBe(405);
  });

  it('returns 400 for invalid ratings', async () => {
    const req = httpMocks.createRequest({
      method: 'POST',
      body: { rating: 6, improvement: 'test' },
    });
    const res = httpMocks.createResponse();

    await (feedback as any)(req, res);

    expect(res.statusCode).toBe(400);
  });

  it('handles string body JSON parsing', async () => {
    const req = httpMocks.createRequest({
      method: 'POST',
      body: JSON.stringify({ rating: 5, improvement: 'test' }),
    });
    const res = httpMocks.createResponse();
    mockSendMail.mockResolvedValueOnce({});

    await (feedback as any)(req, res);

    expect(res.statusCode).toBe(200);
    expect(mockSendMail).toHaveBeenCalled();
  });

  it('returns 200 with fallback message if EMAIL_PASS is missing', async () => {
    delete process.env.EMAIL_PASS;
    const req = httpMocks.createRequest({
      method: 'POST',
      body: { rating: 5, improvement: 'test' },
    });
    const res = httpMocks.createResponse();

    await (feedback as any)(req, res);

    expect(res.statusCode).toBe(200);
    expect(res._getJSONData().message).toContain('missing credentials');
    expect(mockSendMail).not.toHaveBeenCalled();
  });

  it('returns 200 on mail transport success', async () => {
    const req = httpMocks.createRequest({
      method: 'POST',
      body: { rating: 5, improvement: 'test', featureRequest: 'more fonts' },
    });
    const res = httpMocks.createResponse();
    mockSendMail.mockResolvedValueOnce({});

    await (feedback as any)(req, res);

    expect(res.statusCode).toBe(200);
    expect(res._getJSONData().message).toBe('Feedback sent successfully');
    expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({
      text: expect.stringContaining('Feature Request:\nmore fonts'),
      html: expect.stringContaining('more fonts'),
    }));
  });

  it('returns 500 on mail transport failure', async () => {
    const req = httpMocks.createRequest({
      method: 'POST',
      body: { rating: 5, improvement: 'test' },
    });
    const res = httpMocks.createResponse();
    mockSendMail.mockRejectedValueOnce(new Error('Send failed'));

    await (feedback as any)(req, res);

    expect(res.statusCode).toBe(500);
    expect(res._getJSONData().error).toBe('Failed to send feedback');
  });
});
