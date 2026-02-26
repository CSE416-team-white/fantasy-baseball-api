import express, { type Express, Router } from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { errorHandler } from '../shared/middlewares/error-handler.js';
import { swaggerSpec } from '../config/swagger.js';
import playersRoutes from '../features/players/players.routes.js';
import leaguesRoutes from '../features/leagues/leagues.routes.js';

export function loadExpress(app: Express): void {
  app.use(cors());
  app.use(express.json());

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

  // Feature routes
  app.use('/api/players', playersRoutes);
  app.use('/api/leagues', leaguesRoutes);

  app.use(errorHandler);
}
