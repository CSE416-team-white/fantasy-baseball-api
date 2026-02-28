import { describe, it, expect, vi } from 'vitest';
import { runManageApiKeys, type ManageApiKeysDeps } from './manage-api-keys.js';

function createDeps(): ManageApiKeysDeps {
  return {
    connectDB: vi.fn().mockResolvedValue(undefined),
    disconnectDB: vi.fn().mockResolvedValue(undefined),
    createServiceKey: vi.fn().mockResolvedValue({
      rawKey: 'raw-key',
      apiKey: {
        id: 'id-1',
        serviceName: 'draft-kit',
        status: 'active',
        keyPrefix: 'prefix1234',
        createdAt: new Date('2025-01-01T00:00:00.000Z'),
        updatedAt: new Date('2025-01-01T00:00:00.000Z'),
      },
    }),
    rotateServiceKey: vi.fn().mockResolvedValue({
      rawKey: 'new-raw-key',
      apiKey: {
        id: 'id-1',
        serviceName: 'draft-kit',
        status: 'active',
        keyPrefix: 'prefix5678',
        createdAt: new Date('2025-01-01T00:00:00.000Z'),
        updatedAt: new Date('2025-01-02T00:00:00.000Z'),
      },
    }),
    setServiceStatus: vi.fn().mockResolvedValue({
      id: 'id-1',
      serviceName: 'draft-kit',
      status: 'inactive',
      keyPrefix: 'prefix1234',
      createdAt: new Date('2025-01-01T00:00:00.000Z'),
      updatedAt: new Date('2025-01-03T00:00:00.000Z'),
    }),
    getServiceByName: vi.fn().mockResolvedValue({
      id: 'id-1',
      serviceName: 'draft-kit',
      status: 'active',
      keyPrefix: 'prefix1234',
      createdAt: new Date('2025-01-01T00:00:00.000Z'),
      updatedAt: new Date('2025-01-03T00:00:00.000Z'),
    }),
    deleteServiceKey: vi.fn().mockResolvedValue({
      serviceName: 'draft-kit',
      deleted: true,
    }),
    log: vi.fn(),
    error: vi.fn(),
  };
}

describe('manage-api-keys script', () => {
  it('should run create action', async () => {
    const deps = createDeps();

    const exitCode = await runManageApiKeys(['create', 'draft-kit'], deps);

    expect(exitCode).toBe(0);
    expect(deps.createServiceKey).toHaveBeenCalledWith('draft-kit');
    expect(deps.connectDB).toHaveBeenCalled();
    expect(deps.disconnectDB).toHaveBeenCalled();
  });

  it('should run rotate action', async () => {
    const deps = createDeps();

    const exitCode = await runManageApiKeys(['rotate', 'draft-kit'], deps);

    expect(exitCode).toBe(0);
    expect(deps.rotateServiceKey).toHaveBeenCalledWith('draft-kit');
  });

  it('should run set-status action', async () => {
    const deps = createDeps();

    const exitCode = await runManageApiKeys(
      ['set-status', 'draft-kit', 'inactive'],
      deps,
    );

    expect(exitCode).toBe(0);
    expect(deps.setServiceStatus).toHaveBeenCalledWith('draft-kit', 'inactive');
  });

  it('should run show action', async () => {
    const deps = createDeps();

    const exitCode = await runManageApiKeys(['show', 'draft-kit'], deps);

    expect(exitCode).toBe(0);
    expect(deps.getServiceByName).toHaveBeenCalledWith('draft-kit');
  });

  it('should run delete action', async () => {
    const deps = createDeps();

    const exitCode = await runManageApiKeys(['delete', 'draft-kit'], deps);

    expect(exitCode).toBe(0);
    expect(deps.deleteServiceKey).toHaveBeenCalledWith('draft-kit');
  });

  it('should fail on invalid action', async () => {
    const deps = createDeps();

    const exitCode = await runManageApiKeys(['invalid', 'draft-kit'], deps);

    expect(exitCode).toBe(1);
    expect(deps.error).toHaveBeenCalled();
    expect(deps.connectDB).not.toHaveBeenCalled();
  });

  it('should fail when set-status has no status value', async () => {
    const deps = createDeps();

    const exitCode = await runManageApiKeys(['set-status', 'draft-kit'], deps);

    expect(exitCode).toBe(1);
    expect(deps.error).toHaveBeenCalled();
    expect(deps.setServiceStatus).not.toHaveBeenCalled();
  });
});
