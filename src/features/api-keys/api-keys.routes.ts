import { Router } from 'express';
import type { Request, Response } from 'express';
import { asyncHandler } from '@/shared/middlewares/async-handler.js';
import { sendSuccess } from '@/shared/utils/response.js';
import { ApiError } from '@/shared/utils/api-error.js';
import { HTTP_STATUS } from '@/shared/constants.js';
import { apiKeysService } from './api-keys.service.js';

const router = Router();

/**
 * @swagger
 * /api/api-keys/me:
 *   get:
 *     summary: Get current API key metadata
 *     tags: [API Keys]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: API key metadata returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     serviceName:
 *                       type: string
 *                       example: draft-kit
 *                     status:
 *                       type: string
 *                       enum: [active, inactive]
 *                     keyPrefix:
 *                       type: string
 *                       example: abcd123456
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: Missing API client context
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Missing API client context
 *       404:
 *         description: API key service not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: API key service not found
 */
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
