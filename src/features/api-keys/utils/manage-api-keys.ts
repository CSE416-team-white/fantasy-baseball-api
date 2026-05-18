import 'dotenv/config';
import { apiKeysService } from '../api-keys.service.js';
import { connectDB } from '@/loaders/mongoose.js';
import mongoose from 'mongoose';
import type { ApiKeyPublic } from '../api-keys.types.js';

type ManageAction =
  | 'create'
  | 'rotate'
  | 'set-status'
  | 'set-rate-limit'
  | 'clear-rate-limit'
  | 'show'
  | 'delete';

export type ManageApiKeysDeps = {
  connectDB: () => Promise<void>;
  disconnectDB: () => Promise<void>;
  createServiceKey: (
    serviceName: string,
  ) => Promise<{ rawKey: string; apiKey: ApiKeyPublic }>;
  rotateServiceKey: (
    serviceName: string,
  ) => Promise<{ rawKey: string; apiKey: ApiKeyPublic }>;
  setServiceStatus: (
    serviceName: string,
    status: string,
  ) => Promise<ApiKeyPublic>;
  updateRateLimitPerMinute: (
    serviceName: string,
    rateLimitPerMinute: number,
  ) => Promise<ApiKeyPublic>;
  clearRateLimitPerMinute: (serviceName: string) => Promise<ApiKeyPublic>;
  getServiceByName: (serviceName: string) => Promise<ApiKeyPublic>;
  deleteServiceKey: (
    serviceName: string,
  ) => Promise<{ serviceName: string; deleted: true }>;
  log: (message: string) => void;
  error: (message: string) => void;
};

const usage =
  'Usage: npm run api-keys -- <create|rotate|set-status|set-rate-limit|clear-rate-limit|show|delete> <service-name> [active|inactive|requests-per-minute]';

const defaultDeps: ManageApiKeysDeps = {
  connectDB,
  disconnectDB: async () => mongoose.connection.close(),
  createServiceKey: apiKeysService.createServiceKey.bind(apiKeysService),
  rotateServiceKey: apiKeysService.rotateServiceKey.bind(apiKeysService),
  setServiceStatus: apiKeysService.setServiceStatus.bind(apiKeysService),
  updateRateLimitPerMinute:
    apiKeysService.updateRateLimitPerMinute.bind(apiKeysService),
  clearRateLimitPerMinute:
    apiKeysService.clearRateLimitPerMinute.bind(apiKeysService),
  getServiceByName: apiKeysService.getServiceByName.bind(apiKeysService),
  deleteServiceKey: apiKeysService.deleteServiceKey.bind(apiKeysService),
  log: (message: string) => console.log(message),
  error: (message: string) => console.error(message),
};

function isValidAction(action: string): action is ManageAction {
  return [
    'create',
    'rotate',
    'set-status',
    'set-rate-limit',
    'clear-rate-limit',
    'show',
    'delete',
  ].includes(action);
}

function logRateLimitDetails(
  apiKey: ApiKeyPublic,
  log: (message: string) => void,
) {
  log(
    `Rate Limit Override Per Minute: ${apiKey.rateLimitPerMinute ?? 'default'}`,
  );
  log(`Effective Rate Limit Per Minute: ${apiKey.effectiveRateLimitPerMinute}`);
}

export async function runManageApiKeys(
  args: string[],
  deps: ManageApiKeysDeps = defaultDeps,
): Promise<number> {
  const [action, serviceName, status] = args;

  if (!action || !isValidAction(action) || !serviceName) {
    deps.error(usage);
    return 1;
  }

  if (action === 'set-status' && !status) {
    deps.error('set-status requires a status: active or inactive');
    deps.error(usage);
    return 1;
  }

  if (action === 'set-rate-limit') {
    const rateLimitPerMinute = Number(status);
    if (!Number.isInteger(rateLimitPerMinute) || rateLimitPerMinute <= 0) {
      deps.error(
        'set-rate-limit requires a positive integer requests-per-minute value',
      );
      deps.error(usage);
      return 1;
    }
  }

  await deps.connectDB();

  try {
    if (action === 'create') {
      const { rawKey, apiKey } = await deps.createServiceKey(serviceName);
      deps.log(`Service: ${apiKey.serviceName}`);
      deps.log(`Status: ${apiKey.status}`);
      deps.log(`Key Prefix: ${apiKey.keyPrefix}`);
      logRateLimitDetails(apiKey, deps.log);
      deps.log(`Raw API Key (store securely): ${rawKey}`);
      return 0;
    }

    if (action === 'rotate') {
      const { rawKey, apiKey } = await deps.rotateServiceKey(serviceName);
      deps.log(`Service: ${apiKey.serviceName}`);
      deps.log(`Status: ${apiKey.status}`);
      deps.log(`Key Prefix: ${apiKey.keyPrefix}`);
      logRateLimitDetails(apiKey, deps.log);
      deps.log(`New Raw API Key (store securely): ${rawKey}`);
      return 0;
    }

    if (action === 'set-status') {
      const apiKey = await deps.setServiceStatus(serviceName, status as string);
      deps.log(`Service: ${apiKey.serviceName}`);
      deps.log(`Updated status: ${apiKey.status}`);
      logRateLimitDetails(apiKey, deps.log);
      return 0;
    }

    if (action === 'set-rate-limit') {
      const apiKey = await deps.updateRateLimitPerMinute(
        serviceName,
        Number(status),
      );
      deps.log(`Service: ${apiKey.serviceName}`);
      logRateLimitDetails(apiKey, deps.log);
      return 0;
    }

    if (action === 'clear-rate-limit') {
      const apiKey = await deps.clearRateLimitPerMinute(serviceName);
      deps.log(`Service: ${apiKey.serviceName}`);
      logRateLimitDetails(apiKey, deps.log);
      return 0;
    }

    if (action === 'delete') {
      const result = await deps.deleteServiceKey(serviceName);
      deps.log(`Deleted service key for: ${result.serviceName}`);
      return 0;
    }

    const apiKey = await deps.getServiceByName(serviceName);
    deps.log(`Service: ${apiKey.serviceName}`);
    deps.log(`Status: ${apiKey.status}`);
    deps.log(`Key Prefix: ${apiKey.keyPrefix}`);
    logRateLimitDetails(apiKey, deps.log);
    deps.log(`Created At: ${apiKey.createdAt.toISOString()}`);
    deps.log(`Updated At: ${apiKey.updatedAt.toISOString()}`);
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    deps.error(`Failed to manage API key: ${message}`);
    return 1;
  } finally {
    await deps.disconnectDB();
  }
}

const isDirectRun = (process.argv[1] || '').includes('manage-api-keys');

if (isDirectRun) {
  runManageApiKeys(process.argv.slice(2))
    .then((exitCode) => {
      process.exitCode = exitCode;
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
