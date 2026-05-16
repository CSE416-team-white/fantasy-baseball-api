import express, { type Express, Router } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import { errorHandler } from '../shared/middlewares/error-handler.js';
import { swaggerSpec } from '../config/swagger.js';
import playersRoutes from '../features/players/players.routes.js';
import leaguesRoutes from '../features/leagues/leagues.routes.js';
import apiKeysRoutes from '../features/api-keys/api-keys.routes.js';
import valuationsRoutes from '../features/valuations/valuations.routes.js';
import apiKeyRegisterRoute from '../features/api-keys/api-keys.register.routes.js';
import notificationsRoutes from '../features/notifications/notifications.routes.js';
import { createRequireApiKey } from '../shared/middlewares/require-api-key.js';
import { apiKeysService } from '../features/api-keys/api-keys.service.js';
import { env } from '../config/env.js';

export function loadExpress(app: Express): void {
  const requireApiKey = createRequireApiKey(
    apiKeysService.authenticateApiKey.bind(apiKeysService),
  );
  const apiKeyMiddleware = env.disableApiKeyAuth
    ? (
        _req: express.Request,
        _res: express.Response,
        next: express.NextFunction,
      ) => next()
    : requireApiKey;

  app.use(cors());
  app.use(express.json());

  // Global rate limit: 200 requests per minute per IP
  app.use(
    rateLimit({
      windowMs: 60 * 1000,
      max: 200,
      standardHeaders: true,
      legacyHeaders: false,
      message: { message: 'Too many requests, please try again later.' },
    }),
  );

  // Stricter limit on the public registration endpoint: 10 per hour per IP
  app.use(
    '/api/register',
    rateLimit({
      windowMs: 60 * 60 * 1000,
      max: 10,
      standardHeaders: true,
      legacyHeaders: false,
      message: { message: 'Too many registration attempts, please try again later.' },
    }),
  );

  // Swagger API documentation
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  // Health check
  const health = Router();
  /**
   * @swagger
   * /api/health:
   *   get:
   *     summary: Health check endpoint
   *     tags: [Health]
   *     security: []
   *     responses:
   *       200:
   *         description: Service is healthy
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: ok
   */
  health.get('/', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/health', health);

  // Public: self-service API key registration (no auth required)
  app.use('/api/register', apiKeyRegisterRoute);

  // Feature routes
  app.use('/api/api-keys', apiKeyMiddleware, apiKeysRoutes);
  app.use('/api/players', apiKeyMiddleware, playersRoutes);
  app.use('/api/leagues', apiKeyMiddleware, leaguesRoutes);
  app.use('/api/valuations', apiKeyMiddleware, valuationsRoutes);
  app.use('/api', apiKeyMiddleware, notificationsRoutes);

  app.use(errorHandler);
}
