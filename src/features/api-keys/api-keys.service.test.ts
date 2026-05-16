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

  describe('updateAllowedIPs', () => {
    it('should set a list of allowed IPs for an existing service', async () => {
      await apiKeysService.createServiceKey('ip-test-service');

      const updated = await apiKeysService.updateAllowedIPs('ip-test-service', [
        '203.0.113.1',
        '198.51.100.7',
      ]);

      expect(updated.serviceName).toBe('ip-test-service');

      const stored = await ServiceApiKeyModel.findOne({ serviceName: 'ip-test-service' }).lean();
      expect(stored?.allowedIPs).toEqual(['203.0.113.1', '198.51.100.7']);
    });

    it('should clear the IP whitelist when given an empty array', async () => {
      await apiKeysService.createServiceKey('ip-clear-service');
      await apiKeysService.updateAllowedIPs('ip-clear-service', ['10.0.0.1']);

      await apiKeysService.updateAllowedIPs('ip-clear-service', []);

      const stored = await ServiceApiKeyModel.findOne({ serviceName: 'ip-clear-service' }).lean();
      expect(stored?.allowedIPs).toEqual([]);
    });

    it('should replace the existing IP list, not append to it', async () => {
      await apiKeysService.createServiceKey('ip-replace-service');
      await apiKeysService.updateAllowedIPs('ip-replace-service', ['10.0.0.1', '10.0.0.2']);

      await apiKeysService.updateAllowedIPs('ip-replace-service', ['192.168.1.1']);

      const stored = await ServiceApiKeyModel.findOne({ serviceName: 'ip-replace-service' }).lean();
      expect(stored?.allowedIPs).toEqual(['192.168.1.1']);
      expect(stored?.allowedIPs).toHaveLength(1);
    });

    it('should throw 404 when updating IPs for a non-existent service', async () => {
      await expect(
        apiKeysService.updateAllowedIPs('ghost-service', ['1.2.3.4']),
      ).rejects.toMatchObject({ status: 404 });
    });

    it('should include allowedIPs in authenticateApiKey response', async () => {
      const { rawKey } = await apiKeysService.createServiceKey('auth-ip-service');
      await apiKeysService.updateAllowedIPs('auth-ip-service', ['203.0.113.5']);

      const client = await apiKeysService.authenticateApiKey(rawKey);
      expect(client.allowedIPs).toEqual(['203.0.113.5']);
    });

    it('should return empty allowedIPs by default for new keys', async () => {
      const { rawKey } = await apiKeysService.createServiceKey('default-ip-service');
      const client = await apiKeysService.authenticateApiKey(rawKey);
      expect(client.allowedIPs).toEqual([]);
    });
  });
});
