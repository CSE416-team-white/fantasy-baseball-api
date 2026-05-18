import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { HTTP_STATUS } from '@/shared/constants.js';

type LimitValue = number | ((req: Request) => number);

type RateLimitOptions = {
  windowMs: number;
  limit: LimitValue;
  keyGenerator?: (req: Request) => string;
  message: { message: string };
};

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

export function createRateLimitMiddleware({
  windowMs,
  limit,
  keyGenerator,
  message,
}: RateLimitOptions): RequestHandler {
  const entries = new Map<string, RateLimitEntry>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = keyGenerator ? keyGenerator(req) : req.ip || 'unknown';
    const currentLimit = typeof limit === 'function' ? limit(req) : limit;
    const now = Date.now();
    const existing = entries.get(key);

    const entry =
      existing && existing.resetAt > now
        ? existing
        : { count: 0, resetAt: now + windowMs };

    entry.count += 1;
    entries.set(key, entry);

    const remaining = Math.max(currentLimit - entry.count, 0);
    res.setHeader('RateLimit-Limit', String(currentLimit));
    res.setHeader('RateLimit-Remaining', String(remaining));
    res.setHeader(
      'RateLimit-Reset',
      String(Math.ceil((entry.resetAt - now) / 1000)),
    );

    if (entry.count > currentLimit) {
      res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json(message);
      return;
    }

    next();
  };
}
