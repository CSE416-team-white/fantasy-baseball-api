import type { NextFunction, Request, Response } from 'express';
import { ApiError } from '@/shared/utils/api-error.js';
import { HTTP_STATUS } from '@/shared/constants.js';

type ApiClientContext = {
  keyId: string;
  serviceName: string;
  status: 'active' | 'inactive';
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
      req.apiClient = apiClient;
      next();
    } catch (error) {
      next(error);
    }
  };
}
