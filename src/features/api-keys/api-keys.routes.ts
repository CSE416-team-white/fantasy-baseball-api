import { Router } from 'express';
import type { Request, Response } from 'express';
import { asyncHandler } from '@/shared/middlewares/async-handler.js';
import { sendSuccess } from '@/shared/utils/response.js';
import { ApiError } from '@/shared/utils/api-error.js';
import { HTTP_STATUS } from '@/shared/constants.js';
import { apiKeysService } from './api-keys.service.js';

const router = Router();

router.get(
  '/me',
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.apiClient) {
      throw new ApiError(
        HTTP_STATUS.UNAUTHORIZED,
        'Missing API client context',
      );
    }

    const apiKey = await apiKeysService.getServiceById(req.apiClient.keyId);
    sendSuccess(res, apiKey);
  }),
);

export default router;
