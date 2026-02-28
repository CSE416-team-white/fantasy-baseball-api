import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import express from 'express';
import type { Server } from 'node:http';
import apiKeysRoutes from './api-keys.routes.js';
import { createRequireApiKey } from '@/shared/middlewares/require-api-key.js';
import { apiKeysService } from './api-keys.service.js';
import { ServiceApiKeyModel } from './api-keys.model.js';
import { errorHandler } from '@/shared/middlewares/error-handler.js';

function startServer(
  app: express.Express,
): Promise<{ server: Server; baseUrl: string }> {
  return new Promise((resolve) => {
    const server = app.listen(0, () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        throw new Error('Unable to start test server');
      }
      resolve({ server, baseUrl: `http://127.0.0.1:${address.port}` });
    });
  });
}

describe('api-keys routes', () => {
  let server: Server | undefined;
  let baseUrl: string;
  let rawKey: string;

  beforeEach(async () => {
    await ServiceApiKeyModel.deleteMany({});
    rawKey = (await apiKeysService.createServiceKey('draft-kit')).rawKey;

    const app = express();
    app.use(express.json());

    const requireApiKey = createRequireApiKey(
      apiKeysService.authenticateApiKey.bind(apiKeysService),
    );
    app.use('/api/api-keys', requireApiKey, apiKeysRoutes);
    app.use(errorHandler);

    const started = await startServer(app);
    server = started.server;
    baseUrl = started.baseUrl;
  });

  afterEach(async () => {
    if (server) {
      await new Promise((resolve, reject) => {
        server?.close((err) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(undefined);
        });
      });
    }
    await ServiceApiKeyModel.deleteMany({});
  });

  it('should return authenticated service info from /me', async () => {
    const response = await fetch(`${baseUrl}/api/api-keys/me`, {
      headers: {
        'x-api-key': rawKey,
      },
    });

    const body = (await response.json()) as {
      success: boolean;
      data: Record<string, unknown>;
    };

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.serviceName).toBe('draft-kit');
    expect(body.data.status).toBe('active');
    expect(body.data).not.toHaveProperty('keyHash');
    expect(body.data).not.toHaveProperty('rawKey');
  });

  it('should return 401 when key is missing', async () => {
    const response = await fetch(`${baseUrl}/api/api-keys/me`);
    const body = (await response.json()) as { message: string };

    expect(response.status).toBe(401);
    expect(body.message).toBe('Missing API key');
  });
});
