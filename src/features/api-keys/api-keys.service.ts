import crypto from 'crypto';
import { ApiError } from '@/shared/utils/api-error.js';
import { HTTP_STATUS } from '@/shared/constants.js';
import { ServiceApiKeyModel } from './api-keys.model.js';
import {
  type ApiKeyClient,
  type ApiKeyPublic,
  type ApiKeyStatus,
  ApiKeyStatusSchema,
  ServiceNameSchema,
} from './api-keys.types.js';
import { env } from '@/config/env.js';

function hashApiKey(rawKey: string): string {
  return crypto
    .createHash('sha256')
    .update(`${env.apiKeyPepper}:${rawKey}`)
    .digest('hex');
}

function generateRawApiKey(serviceName: string): {
  rawKey: string;
  keyPrefix: string;
} {
  const token = crypto.randomBytes(32).toString('base64url');
  return {
    rawKey: `${serviceName}_${token}`,
    keyPrefix: token.slice(0, 10),
  };
}

function toPublicApiKey(doc: {
  _id: string;
  serviceName: string;
  status: ApiKeyStatus;
  keyPrefix: string;
  createdAt: Date;
  updatedAt: Date;
}): ApiKeyPublic {
  return {
    id: doc._id.toString(),
    serviceName: doc.serviceName,
    status: doc.status,
    keyPrefix: doc.keyPrefix,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export class ApiKeysService {
  async createServiceKey(
    serviceNameInput: string,
  ): Promise<{ rawKey: string; apiKey: ApiKeyPublic }> {
    const serviceName = ServiceNameSchema.parse(serviceNameInput);

    const existing = await ServiceApiKeyModel.findOne({ serviceName }).lean();
    if (existing) {
      throw new ApiError(
        HTTP_STATUS.CONFLICT,
        `API key already exists for service: ${serviceName}`,
      );
    }

    const { rawKey, keyPrefix } = generateRawApiKey(serviceName);
    const keyHash = hashApiKey(rawKey);

    const created = await ServiceApiKeyModel.create({
      serviceName,
      keyHash,
      keyPrefix,
      status: 'active',
    });

    return {
      rawKey,
      apiKey: toPublicApiKey({
        _id: created._id.toString(),
        serviceName: created.serviceName,
        status: created.status,
        keyPrefix: created.keyPrefix,
        createdAt: created.createdAt,
        updatedAt: created.updatedAt,
      }),
    };
  }

  async rotateServiceKey(
    serviceNameInput: string,
  ): Promise<{ rawKey: string; apiKey: ApiKeyPublic }> {
    const serviceName = ServiceNameSchema.parse(serviceNameInput);
    const existing = await ServiceApiKeyModel.findOne({ serviceName });

    if (!existing) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        `Service not found: ${serviceName}`,
      );
    }

    const { rawKey, keyPrefix } = generateRawApiKey(serviceName);
    existing.keyHash = hashApiKey(rawKey);
    existing.keyPrefix = keyPrefix;
    await existing.save();

    return {
      rawKey,
      apiKey: toPublicApiKey({
        _id: existing._id.toString(),
        serviceName: existing.serviceName,
        status: existing.status,
        keyPrefix: existing.keyPrefix,
        createdAt: existing.createdAt,
        updatedAt: existing.updatedAt,
      }),
    };
  }

  async setServiceStatus(
    serviceNameInput: string,
    statusInput: string,
  ): Promise<ApiKeyPublic> {
    const serviceName = ServiceNameSchema.parse(serviceNameInput);
    const status = ApiKeyStatusSchema.parse(statusInput);

    const updated = await ServiceApiKeyModel.findOneAndUpdate(
      { serviceName },
      { status },
      { new: true, runValidators: true },
    );

    if (!updated) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        `Service not found: ${serviceName}`,
      );
    }

    return toPublicApiKey({
      _id: updated._id.toString(),
      serviceName: updated.serviceName,
      status: updated.status,
      keyPrefix: updated.keyPrefix,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    });
  }

  async deleteServiceKey(
    serviceNameInput: string,
  ): Promise<{ serviceName: string; deleted: true }> {
    const serviceName = ServiceNameSchema.parse(serviceNameInput);

    const deleted = await ServiceApiKeyModel.findOneAndDelete({ serviceName });

    if (!deleted) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        `Service not found: ${serviceName}`,
      );
    }

    return {
      serviceName,
      deleted: true,
    };
  }

  async authenticateApiKey(rawKeyInput: string): Promise<ApiKeyClient> {
    const rawKey = rawKeyInput.trim();
    if (!rawKey) {
      throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'Missing API key');
    }

    const keyHash = hashApiKey(rawKey);
    const apiKey = await ServiceApiKeyModel.findOne({ keyHash }).lean();

    if (!apiKey) {
      throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'Invalid API key');
    }

    if (apiKey.status !== 'active') {
      throw new ApiError(HTTP_STATUS.FORBIDDEN, 'API key is inactive');
    }

    return {
      keyId: apiKey._id.toString(),
      serviceName: apiKey.serviceName,
      status: apiKey.status,
    };
  }

  async getServiceById(id: string): Promise<ApiKeyPublic> {
    const apiKey = await ServiceApiKeyModel.findById(id).lean();

    if (!apiKey) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, 'API key service not found');
    }

    return toPublicApiKey({
      _id: apiKey._id.toString(),
      serviceName: apiKey.serviceName,
      status: apiKey.status,
      keyPrefix: apiKey.keyPrefix,
      createdAt: apiKey.createdAt,
      updatedAt: apiKey.updatedAt,
    });
  }

  async getServiceByName(serviceNameInput: string): Promise<ApiKeyPublic> {
    const serviceName = ServiceNameSchema.parse(serviceNameInput);
    const apiKey = await ServiceApiKeyModel.findOne({ serviceName }).lean();

    if (!apiKey) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        `Service not found: ${serviceName}`,
      );
    }

    return toPublicApiKey({
      _id: apiKey._id.toString(),
      serviceName: apiKey.serviceName,
      status: apiKey.status,
      keyPrefix: apiKey.keyPrefix,
      createdAt: apiKey.createdAt,
      updatedAt: apiKey.updatedAt,
    });
  }
}

export const apiKeysService = new ApiKeysService();
