import swaggerJsdoc from 'swagger-jsdoc';
import { env } from './env.js';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Fantasy Baseball API',
      version: '1.0.0',
      description:
        'API for fantasy baseball draft recommendations and player data',
    },
    servers: [
      {
        url: `http://localhost:${env.port}`,
        description: 'Development server',
      },
    ],
  },
  apis: [
    './src/features/**/*.routes.ts',
    './src/features/**/*.types.ts',
    './src/loaders/express.ts',
  ],
};

export const swaggerSpec = swaggerJsdoc(options);
