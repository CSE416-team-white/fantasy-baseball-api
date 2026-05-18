import express from 'express';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadExpress } from './express.js';
import { apiKeysService } from '@/features/api-keys/api-keys.service.js';
import { playersService } from '@/features/players/players.service.js';
import { env } from '@/config/env.js';

type StartedApp = {
  server: Server;
  baseUrl: string;
};

async function startApp(): Promise<StartedApp> {
  const app = express();
  loadExpress(app);

  const server = await new Promise<Server>((resolve) => {
    const started = app.listen(0, () => resolve(started));
  });

  const { port } = server.address() as AddressInfo;
  return {
    server,
    baseUrl: `http://127.0.0.1:${port}`,
  };
}

async function stopApp(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

describe('loadExpress', () => {
  let server: Server | undefined;
  let originalApiKeyRateLimitPerMinute: number;
  let originalDisableApiKeyAuth: boolean;

  beforeEach(() => {
    vi.restoreAllMocks();
    originalApiKeyRateLimitPerMinute = env.apiKeyRateLimitPerMinute;
    originalDisableApiKeyAuth = env.disableApiKeyAuth;
    env.disableApiKeyAuth = false;

    vi.spyOn(playersService, 'getPlayers').mockResolvedValue({
      players: [],
      pagination: {
        page: 1,
        limit: 50,
        total: 0,
      },
    });
  });

  afterEach(async () => {
    env.apiKeyRateLimitPerMinute = originalApiKeyRateLimitPerMinute;
    env.disableApiKeyAuth = originalDisableApiKeyAuth;
    vi.restoreAllMocks();

    if (server) {
      await stopApp(server);
      server = undefined;
    }
  });

  it('returns the current key metadata with rate limit fields', async () => {
    vi.spyOn(apiKeysService, 'authenticateApiKey').mockResolvedValue({
      keyId: 'key-1',
      serviceName: 'draft-kit',
      status: 'active',
      allowedIPs: [],
      effectiveRateLimitPerMinute: 750,
    });
    vi.spyOn(apiKeysService, 'getServiceById').mockResolvedValue({
      id: 'key-1',
      serviceName: 'draft-kit',
      status: 'active',
      keyPrefix: 'prefix1234',
      rateLimitPerMinute: 750,
      effectiveRateLimitPerMinute: 750,
      createdAt: new Date('2025-01-01T00:00:00.000Z'),
      updatedAt: new Date('2025-01-02T00:00:00.000Z'),
    });

    const started = await startApp();
    server = started.server;

    const response = await fetch(`${started.baseUrl}/api/api-keys/me`, {
      headers: { 'x-api-key': 'key-1' },
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.rateLimitPerMinute).toBe(750);
    expect(body.data.effectiveRateLimitPerMinute).toBe(750);
  });

  it('rate limits repeated requests from the same API key', async () => {
    env.apiKeyRateLimitPerMinute = 2;

    vi.spyOn(apiKeysService, 'authenticateApiKey').mockResolvedValue({
      keyId: 'shared-key',
      serviceName: 'draft-kit',
      status: 'active',
      allowedIPs: [],
      effectiveRateLimitPerMinute: 2,
    });

    const started = await startApp();
    server = started.server;

    const first = await fetch(`${started.baseUrl}/api/players`, {
      headers: { 'x-api-key': 'shared-key' },
    });
    const second = await fetch(`${started.baseUrl}/api/players`, {
      headers: { 'x-api-key': 'shared-key' },
    });
    const third = await fetch(`${started.baseUrl}/api/players`, {
      headers: { 'x-api-key': 'shared-key' },
    });
    const body = await third.json();

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(third.status).toBe(429);
    expect(body.message).toBe('Too many requests, please try again later.');
  });

  it('tracks per-key counters separately', async () => {
    env.apiKeyRateLimitPerMinute = 2;

    vi.spyOn(apiKeysService, 'authenticateApiKey').mockImplementation(
      async (rawKey: string) => ({
        keyId: rawKey,
        serviceName: rawKey,
        status: 'active',
        allowedIPs: [],
        effectiveRateLimitPerMinute: 2,
      }),
    );

    const started = await startApp();
    server = started.server;

    await fetch(`${started.baseUrl}/api/players`, {
      headers: { 'x-api-key': 'key-a' },
    });
    await fetch(`${started.baseUrl}/api/players`, {
      headers: { 'x-api-key': 'key-a' },
    });

    const limited = await fetch(`${started.baseUrl}/api/players`, {
      headers: { 'x-api-key': 'key-a' },
    });
    const separateKey = await fetch(`${started.baseUrl}/api/players`, {
      headers: { 'x-api-key': 'key-b' },
    });

    expect(limited.status).toBe(429);
    expect(separateKey.status).toBe(200);
  });

  it('does not apply the per-key limiter to /api/api-keys/me', async () => {
    env.apiKeyRateLimitPerMinute = 1;

    vi.spyOn(apiKeysService, 'authenticateApiKey').mockResolvedValue({
      keyId: 'key-1',
      serviceName: 'draft-kit',
      status: 'active',
      allowedIPs: [],
      effectiveRateLimitPerMinute: 1,
    });
    vi.spyOn(apiKeysService, 'getServiceById').mockResolvedValue({
      id: 'key-1',
      serviceName: 'draft-kit',
      status: 'active',
      keyPrefix: 'prefix1234',
      rateLimitPerMinute: null,
      effectiveRateLimitPerMinute: 1,
      createdAt: new Date('2025-01-01T00:00:00.000Z'),
      updatedAt: new Date('2025-01-02T00:00:00.000Z'),
    });

    const started = await startApp();
    server = started.server;

    const first = await fetch(`${started.baseUrl}/api/api-keys/me`, {
      headers: { 'x-api-key': 'key-1' },
    });
    const second = await fetch(`${started.baseUrl}/api/api-keys/me`, {
      headers: { 'x-api-key': 'key-1' },
    });

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
  });

  it('keeps the global IP limiter active', async () => {
    env.disableApiKeyAuth = true;

    const started = await startApp();
    server = started.server;

    let response: Response | undefined;
    for (let attempt = 0; attempt < 201; attempt += 1) {
      response = await fetch(`${started.baseUrl}/api/health`);
    }

    expect(response?.status).toBe(429);
  });
});
