import { afterEach, describe, expect, it, vi } from 'vitest';

const originalEnv = { ...process.env };

async function loadEnvModule() {
  vi.resetModules();
  return import('./env.js');
}

describe('env config', () => {
  afterEach(() => {
    process.env = { ...originalEnv };
    vi.resetModules();
  });

  it('should use provided API_KEY_PEPPER', async () => {
    process.env.NODE_ENV = 'development';
    process.env.API_KEY_PEPPER = 'pepper-123';
    process.env.DISABLE_API_KEY_AUTH = 'false';

    const { env } = await loadEnvModule();

    expect(env.apiKeyPepper).toBe('pepper-123');
    expect(env.disableApiKeyAuth).toBe(false);
  });

  it('should allow missing API_KEY_PEPPER in test mode', async () => {
    process.env.API_KEY_PEPPER = '';
    process.env.NODE_ENV = 'test';
    process.env.DISABLE_API_KEY_AUTH = 'true';

    const { env } = await loadEnvModule();

    expect(env.apiKeyPepper).toBe('test-api-key-pepper');
    expect(env.disableApiKeyAuth).toBe(true);
  });

  it('should throw when API_KEY_PEPPER is missing outside test mode', async () => {
    process.env.API_KEY_PEPPER = '';
    process.env.NODE_ENV = 'development';
    process.env.DISABLE_API_KEY_AUTH = 'false';
    delete process.env.VITEST;

    await expect(loadEnvModule()).rejects.toThrow('API_KEY_PEPPER is required');
  });
});
