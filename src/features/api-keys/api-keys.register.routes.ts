import { Router } from 'express';
import type { Request, Response } from 'express';
import { asyncHandler } from '@/shared/middlewares/async-handler.js';
import { apiKeysService } from './api-keys.service.js';

const router = Router();

/**
 * @swagger
 * /api/register:
 *   post:
 *     summary: Self-service API key registration (no auth required)
 *     tags: [API Keys]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [serviceName]
 *             properties:
 *               serviceName:
 *                 type: string
 *                 description: Unique name for your app (lowercase, letters, numbers, hyphens)
 *                 example: my-draft-app
 *     responses:
 *       200:
 *         description: API key created — rawKey is shown only once, save it
 *       409:
 *         description: Service name already registered
 */
router.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const { serviceName } = req.body as { serviceName?: string };
    const result = await apiKeysService.createServiceKey(serviceName ?? '');
    res.status(201).json({ success: true, data: result });
  }),
);

export default router;
