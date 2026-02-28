import { describe, it, expect, beforeEach } from 'vitest';
import { apiKeysService } from './api-keys.service.js';
import { ServiceApiKeyModel } from './api-keys.model.js';
import { ApiError } from '@/shared/utils/api-error.js';

describe('ApiKeysService', () => {
  beforeEach(async () => {
    await ServiceApiKeyModel.deleteMany({});
  });

  it('should create a service key and store only hash', async () => {
    const { rawKey, apiKey } =
      await apiKeysService.createServiceKey('draft-kit');
    const stored = await ServiceApiKeyModel.findOne({
      serviceName: 'draft-kit',
    }).lean();

    expect(rawKey).toContain('draft-kit_');
    expect(apiKey.serviceName).toBe('draft-kit');
    expect(apiKey.status).toBe('active');
    expect(stored).toBeTruthy();
    expect(stored?.keyHash).toBeDefined();
    expect(stored?.keyHash).not.toBe(rawKey);
  });

  it('should reject duplicate service keys', async () => {
    await apiKeysService.createServiceKey('draft-kit');

    await expect(
      apiKeysService.createServiceKey('draft-kit'),
    ).rejects.toMatchObject({
      status: 409,
    });
  });

  it('should rotate keys and invalidate old keys', async () => {
    const created = await apiKeysService.createServiceKey('draft-kit');
    const oldRawKey = created.rawKey;

    const rotated = await apiKeysService.rotateServiceKey('draft-kit');
    expect(rotated.rawKey).not.toBe(oldRawKey);

    await expect(
      apiKeysService.authenticateApiKey(oldRawKey),
    ).rejects.toMatchObject({
      status: 401,
    });

    const authenticated = await apiKeysService.authenticateApiKey(
      rotated.rawKey,
    );
    expect(authenticated.serviceName).toBe('draft-kit');
    expect(authenticated.status).toBe('active');
  });

  it('should block inactive keys', async () => {
    const created = await apiKeysService.createServiceKey('draft-kit');
    await apiKeysService.setServiceStatus('draft-kit', 'inactive');

    await expect(
      apiKeysService.authenticateApiKey(created.rawKey),
    ).rejects.toMatchObject({
      status: 403,
    });
  });

  it('should return 401 for invalid keys', async () => {
    await expect(
      apiKeysService.authenticateApiKey('invalid-key'),
    ).rejects.toMatchObject({
      status: 401,
    });
  });

  it('should return service information by id', async () => {
    const created = await apiKeysService.createServiceKey('draft-kit');
    const authClient = await apiKeysService.authenticateApiKey(created.rawKey);
    const service = await apiKeysService.getServiceById(authClient.keyId);

    expect(service.serviceName).toBe('draft-kit');
    expect(service.status).toBe('active');
    expect(
      (service as unknown as { keyHash?: string }).keyHash,
    ).toBeUndefined();
  });

  it('should return 404 on rotate when service is missing', async () => {
    await expect(
      apiKeysService.rotateServiceKey('missing-service'),
    ).rejects.toMatchObject({
      status: 404,
    });
  });

  it('should delete a service key and make auth fail', async () => {
    const created = await apiKeysService.createServiceKey('draft-kit');

    const deleted = await apiKeysService.deleteServiceKey('draft-kit');
    expect(deleted).toEqual({ serviceName: 'draft-kit', deleted: true });

    await expect(
      apiKeysService.authenticateApiKey(created.rawKey),
    ).rejects.toMatchObject({
      status: 401,
    });
  });

  it('should return 404 when deleting a missing service', async () => {
    await expect(
      apiKeysService.deleteServiceKey('missing-service'),
    ).rejects.toMatchObject({
      status: 404,
    });
  });

  it('should return 404 when service lookup by name is missing', async () => {
    const result = apiKeysService.getServiceByName('missing-service');

    await expect(result).rejects.toBeInstanceOf(ApiError);
    await expect(result).rejects.toMatchObject({
      status: 404,
    });
  });
});
