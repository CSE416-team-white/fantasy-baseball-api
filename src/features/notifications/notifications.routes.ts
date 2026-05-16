import { Router } from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '@/shared/middlewares/async-handler.js';
import { sendSuccess } from '@/shared/utils/response.js';
import { notificationsService } from './notifications.service.js';

const router = Router();

/**
 * @swagger
 * /api/events:
 *   get:
 *     summary: Subscribe to real-time push notifications via Server-Sent Events
 *     description: >
 *       Keeps an HTTP connection open and streams events as they occur (injury updates,
 *       depth chart changes, roster transactions). Connect with an EventSource in the
 *       browser or any SSE-capable client.
 *     tags: [Notifications]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: SSE stream opened
 *         content:
 *           text/event-stream:
 *             schema:
 *               type: string
 */
router.get(
  '/events',
  (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // disable Nginx buffering on Render

    // Send an immediate connected event so the client knows the stream is live
    res.write(
      `data: ${JSON.stringify({ type: 'connected', message: 'SSE stream open', timestamp: new Date().toISOString() })}\n\n`,
    );

    notificationsService.addClient(res);

    // Keep-alive ping every 30 s to prevent proxy timeouts
    const keepAlive = setInterval(() => {
      res.write(': ping\n\n');
    }, 30_000);

    req.on('close', () => {
      clearInterval(keepAlive);
      notificationsService.removeClient(res);
    });
  },
);

/**
 * @swagger
 * /api/notifications/push:
 *   post:
 *     summary: Force-push a notification to all connected SSE clients
 *     description: >
 *       Admin endpoint to manually broadcast a notification event (e.g. injury update,
 *       trade news, depth chart change) to every currently connected Draft Kit client.
 *     tags: [Notifications]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [type, message]
 *             properties:
 *               type:
 *                 type: string
 *                 example: injury-update
 *               message:
 *                 type: string
 *                 example: Aaron Judge placed on 10-day IL
 *               data:
 *                 type: object
 *                 example: { "player": "Aaron Judge", "status": "il-10", "team": "NYY" }
 *     responses:
 *       200:
 *         description: Notification pushed to all connected clients
 */
router.post(
  '/push',
  asyncHandler(async (req: Request, res: Response) => {
    const body = z
      .object({
        type: z.string().min(1),
        message: z.string().min(1),
        data: z.record(z.unknown()).optional().default({}),
      })
      .parse(req.body);

    notificationsService.push({
      type: body.type,
      message: body.message,
      data: body.data as Record<string, unknown>,
    });

    sendSuccess(res, {
      pushed: true,
      clients: notificationsService.clientCount,
      type: body.type,
    });
  }),
);

export default router;
