import express, { type Express, Router } from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { errorHandler } from '../shared/middlewares/error-handler.js';
import { swaggerSpec } from '../config/swagger.js';

export function loadExpress(app: Express): void {
  app.use(cors());
  app.use(express.json());

  // Swagger API documentation
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  // Health check
  const health = Router();
  health.get('/', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/health', health);

  // Register feature routes here as you build them:
  // import { playerRoutes } from '../features/players/player.routes.js';
  // app.use('/api/players', playerRoutes);

  app.use(errorHandler);
}
