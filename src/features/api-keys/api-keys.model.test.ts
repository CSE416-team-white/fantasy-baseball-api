import { describe, it, expect, beforeEach } from 'vitest';
import { ServiceApiKeyModel } from './api-keys.model.js';

describe('ServiceApiKeyModel', () => {
  beforeEach(async () => {
    await ServiceApiKeyModel.deleteMany({});
  });

  it('should default status to active', () => {
    const key = new ServiceApiKeyModel({
      serviceName: 'draft-kit',
      keyHash: 'hash-1',
      keyPrefix: 'prefix-1',
    });

    expect(key.status).toBe('active');
    expect(key.validateSync()).toBeUndefined();
  });

  it('should enforce status enum', () => {
    const invalid = new ServiceApiKeyModel({
      serviceName: 'draft-kit',
      keyHash: 'hash-2',
      keyPrefix: 'prefix-2',
      status: 'paused' as unknown as 'active' | 'inactive',
    });

    const validationError = invalid.validateSync();
    expect(validationError).toBeDefined();
    expect(validationError?.errors.status).toBeDefined();
  });

  it('should define unique indexes for serviceName and keyHash', () => {
    const indexes = ServiceApiKeyModel.schema.indexes();
    const hasUniqueServiceName = indexes.some(
      ([fields, options]) =>
        fields.serviceName === 1 && options.unique === true,
    );
    const hasUniqueKeyHash = indexes.some(
      ([fields, options]) => fields.keyHash === 1 && options.unique === true,
    );

    expect(hasUniqueServiceName).toBe(true);
    expect(hasUniqueKeyHash).toBe(true);
  });
});
