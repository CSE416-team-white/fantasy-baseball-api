import { describe, it, expect, vi, afterEach } from 'vitest';
import express from 'express';
import type { Server } from 'node:http';
import { createRequireApiKey } from './require-api-key.js';
import { ApiError } from '@/shared/utils/api-error.js';
import { errorHandler } from './error-handler.js';

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

describe('createRequireApiKey', () => {
  const servers: Server[] = [];

  afterEach(async () => {
    await Promise.all(
      servers.map(
        (server) =>
          new Promise<void>((resolve, reject) => {
            server.close((err) => {
              if (err) {
                reject(err);
                return;
              }
              resolve();
            });
          }),
      ),
    );
    servers.length = 0;
  });

  it('should return 401 when x-api-key is missing', async () => {
    const authenticate = vi.fn();
    const app = express();
    app.get('/protected', createRequireApiKey(authenticate), (_req, res) => {
      res.json({ ok: true });
    });
    app.use(errorHandler);

    const { server, baseUrl } = await startServer(app);
    servers.push(server);

    const response = await fetch(`${baseUrl}/protected`);
    const body = (await response.json()) as { message: string };

    expect(response.status).toBe(401);
    expect(body.message).toBe('Missing API key');
    expect(authenticate).not.toHaveBeenCalled();
  });

  it('should return 401 for invalid key', async () => {
    const authenticate = vi
      .fn()
      .mockRejectedValue(new ApiError(401, 'Invalid API key'));
    const app = express();
    app.get('/protected', createRequireApiKey(authenticate), (_req, res) => {
      res.json({ ok: true });
    });
    app.use(errorHandler);

    const { server, baseUrl } = await startServer(app);
    servers.push(server);

    const response = await fetch(`${baseUrl}/protected`, {
      headers: { 'x-api-key': 'bad-key' },
    });
    const body = (await response.json()) as { message: string };

    expect(response.status).toBe(401);
    expect(body.message).toBe('Invalid API key');
  });

  it('should return 403 for inactive key', async () => {
    const authenticate = vi
      .fn()
      .mockRejectedValue(new ApiError(403, 'API key is inactive'));
    const app = express();
    app.get('/protected', createRequireApiKey(authenticate), (_req, res) => {
      res.json({ ok: true });
    });
    app.use(errorHandler);

    const { server, baseUrl } = await startServer(app);
    servers.push(server);

    const response = await fetch(`${baseUrl}/protected`, {
      headers: { 'x-api-key': 'inactive-key' },
    });
    const body = (await response.json()) as { message: string };

    expect(response.status).toBe(403);
    expect(body.message).toBe('API key is inactive');
  });

  it('should attach apiClient for active key', async () => {
    const authenticate = vi.fn().mockResolvedValue({
      keyId: '123',
      serviceName: 'draft-kit',
      status: 'active',
    });
    const app = express();
    app.get('/protected', createRequireApiKey(authenticate), (req, res) => {
      res.json({ client: req.apiClient });
    });
    app.use(errorHandler);

    const { server, baseUrl } = await startServer(app);
    servers.push(server);

    const response = await fetch(`${baseUrl}/protected`, {
      headers: { 'x-api-key': 'valid-key' },
    });
    const body = (await response.json()) as {
      client: { keyId: string; serviceName: string; status: string };
    };

    expect(response.status).toBe(200);
    expect(body.client.serviceName).toBe('draft-kit');
    expect(body.client.keyId).toBe('123');
    expect(body.client.status).toBe('active');
  });
});
