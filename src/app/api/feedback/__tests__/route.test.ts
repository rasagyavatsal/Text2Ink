import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';
import nodemailer from 'nodemailer';

// Mock nodemailer
const mockSendMail = vi.fn();
vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail: mockSendMail,
    })),
  },
}));

describe('feedback api route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('EMAIL_PASS', 'test-pass');
  });

  it('returns 200 on mail transport success', async () => {
    const req = new Request('http://localhost/api/feedback', {
      method: 'POST',
      body: JSON.stringify({ rating: 5, improvement: 'test' }),
    });
    mockSendMail.mockResolvedValueOnce({});

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.message).toBe('Feedback sent successfully');
    expect(mockSendMail).toHaveBeenCalled();
  });

  it('returns 200 with fallback message if EMAIL_PASS is missing', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubEnv('EMAIL_PASS', '');
    const req = new Request('http://localhost/api/feedback', {
      method: 'POST',
      body: JSON.stringify({ rating: 5, improvement: 'test' }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.message).toContain('missing credentials');
    expect(mockSendMail).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('EMAIL_PASS not found'));
    warnSpy.mockRestore();
  });

  it('returns 500 on mail transport failure', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const req = new Request('http://localhost/api/feedback', {
      method: 'POST',
      body: JSON.stringify({ rating: 5, improvement: 'test' }),
    });
    mockSendMail.mockRejectedValueOnce(new Error('Send failed'));

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe('Failed to send feedback');
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to send email'), expect.any(Error));
    errorSpy.mockRestore();
  });
});
