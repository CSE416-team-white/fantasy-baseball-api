import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { createRequireApiKey } from './require-api-key.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeReq(overrides: Partial<Request> = {}): Request {
  return {
    headers: { 'x-api-key': 'valid-key' },
    ip: '192.168.1.1',
    socket: { remoteAddress: undefined },
    ...overrides,
  } as unknown as Request;
}

const mockRes = {} as Response;

const validClient = {
  keyId: 'key-id-123',
  serviceName: 'test-service',
  status: 'active' as const,
  allowedIPs: [],
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('createRequireApiKey middleware', () => {
  let next: NextFunction;

  beforeEach(() => {
    next = vi.fn();
  });

  it('calls next with 401 ApiError when x-api-key header is missing', async () => {
    const middleware = createRequireApiKey(vi.fn());
    await middleware(makeReq({ headers: {} }), mockRes, next);

    expect(next).toHaveBeenCalledOnce();
    const err = (next as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(err.status).toBe(401);
  });

  it('calls next with 401 when x-api-key is an array (invalid header)', async () => {
    const middleware = createRequireApiKey(vi.fn());
    await middleware(
      makeReq({ headers: { 'x-api-key': ['a', 'b'] as unknown as string } }),
      mockRes,
      next,
    );

    const err = (next as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(err.status).toBe(401);
  });

  it('calls next with the authenticate error when auth fails', async () => {
    const authenticate = vi.fn().mockRejectedValue({ status: 401, message: 'Invalid API key' });
    const middleware = createRequireApiKey(authenticate);
    await middleware(makeReq(), mockRes, next);

    const err = (next as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(err.status).toBe(401);
  });

  it('attaches apiClient to request and calls next() on valid key with no IP restriction', async () => {
    const authenticate = vi.fn().mockResolvedValue(validClient);
    const req = makeReq();
    const middleware = createRequireApiKey(authenticate);
    await middleware(req, mockRes, next);

    expect(next).toHaveBeenCalledWith(); // called with no arguments = success
    expect(req.apiClient).toEqual(validClient);
  });

  it('allows request when allowedIPs is empty (all IPs permitted)', async () => {
    const authenticate = vi.fn().mockResolvedValue({ ...validClient, allowedIPs: [] });
    const req = makeReq({ ip: '203.0.113.99' });
    const middleware = createRequireApiKey(authenticate);
    await middleware(req, mockRes, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('allows request when request IP is in the allowedIPs list', async () => {
    const authenticate = vi.fn().mockResolvedValue({
      ...validClient,
      allowedIPs: ['203.0.113.42', '198.51.100.7'],
    });
    const req = makeReq({ ip: '203.0.113.42' });
    const middleware = createRequireApiKey(authenticate);
    await middleware(req, mockRes, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('calls next with 403 when request IP is not in the allowedIPs list', async () => {
    const authenticate = vi.fn().mockResolvedValue({
      ...validClient,
      allowedIPs: ['203.0.113.42'],
    });
    const req = makeReq({ ip: '10.0.0.1' });
    const middleware = createRequireApiKey(authenticate);
    await middleware(req, mockRes, next);

    const err = (next as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(err.status).toBe(403);
    expect(err.message).toContain('10.0.0.1');
  });

  it('strips IPv4-mapped IPv6 prefix before checking whitelist', async () => {
    const authenticate = vi.fn().mockResolvedValue({
      ...validClient,
      allowedIPs: ['203.0.113.42'],
    });
    // Express sometimes presents IPv4 addresses with the ::ffff: prefix
    const req = makeReq({ ip: '::ffff:203.0.113.42' });
    const middleware = createRequireApiKey(authenticate);
    await middleware(req, mockRes, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('falls back to socket.remoteAddress when req.ip is undefined', async () => {
    const authenticate = vi.fn().mockResolvedValue({
      ...validClient,
      allowedIPs: ['10.0.0.5'],
    });
    const req = makeReq({
      ip: undefined as unknown as string,
      socket: { remoteAddress: '10.0.0.5' } as never,
    });
    const middleware = createRequireApiKey(authenticate);
    await middleware(req, mockRes, next);

    expect(next).toHaveBeenCalledWith();
  });
});
