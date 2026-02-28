import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import express from 'express';
import type { Server } from 'node:http';
import { loadExpress } from './express.js';
import { apiKeysService } from '@/features/api-keys/api-keys.service.js';
import { ServiceApiKeyModel } from '@/features/api-keys/api-keys.model.js';
import { env } from '@/config/env.js';

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

describe('loadExpress API key protection', () => {
  let server: Server | undefined;
  let baseUrl: string;
  let rawKey: string;

  beforeEach(async () => {
    env.disableApiKeyAuth = false;
    await ServiceApiKeyModel.deleteMany({});
    rawKey = (await apiKeysService.createServiceKey('draft-kit')).rawKey;

    const app = express();
    loadExpress(app);
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

  it('should keep /api/health public', async () => {
    const response = await fetch(`${baseUrl}/api/health`);
    const body = (await response.json()) as { status: string };

    expect(response.status).toBe(200);
    expect(body.status).toBe('ok');
  });

  it('should require API key for /api/players', async () => {
    const noKeyResponse = await fetch(`${baseUrl}/api/players`);
    expect(noKeyResponse.status).toBe(401);

    const withKeyResponse = await fetch(`${baseUrl}/api/players`, {
      headers: {
        'x-api-key': rawKey,
      },
    });
    expect(withKeyResponse.status).toBe(200);
  });

  it('should require API key for /api/leagues', async () => {
    const noKeyResponse = await fetch(`${baseUrl}/api/leagues`);
    expect(noKeyResponse.status).toBe(401);

    const withKeyResponse = await fetch(`${baseUrl}/api/leagues`, {
      headers: {
        'x-api-key': rawKey,
      },
    });
    expect(withKeyResponse.status).toBe(200);
  });
});
