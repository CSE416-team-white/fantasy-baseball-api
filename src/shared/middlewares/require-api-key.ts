import type { NextFunction, Request, Response } from 'express';
import { ApiError } from '@/shared/utils/api-error.js';
import { HTTP_STATUS } from '@/shared/constants.js';

type ApiClientContext = {
  keyId: string;
  serviceName: string;
  status: 'active' | 'inactive';
  allowedIPs: string[];
  effectiveRateLimitPerMinute: number;
};

type AuthenticateFn = (rawKey: string) => Promise<ApiClientContext>;

export function createRequireApiKey(authenticate: AuthenticateFn) {
  return async (
    req: Request,
    _res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const headerValue = req.headers['x-api-key'];

      if (!headerValue || typeof headerValue !== 'string') {
        throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'Missing API key');
      }

      const apiClient = await authenticate(headerValue);

      // IP whitelist enforcement — skip if no IPs configured (allow all)
      if (apiClient.allowedIPs.length > 0) {
        const raw = req.ip ?? req.socket?.remoteAddress ?? '';
        const requestIp = raw.replace('::ffff:', ''); // normalise IPv4-mapped IPv6
        if (!apiClient.allowedIPs.includes(requestIp)) {
          throw new ApiError(
            HTTP_STATUS.FORBIDDEN,
            `IP ${requestIp} is not whitelisted for this key`,
          );
        }
      }

      req.apiClient = apiClient;
      next();
    } catch (error) {
      next(error);
    }
  };
}
