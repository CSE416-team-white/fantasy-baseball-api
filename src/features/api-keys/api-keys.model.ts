import mongoose, { Schema } from 'mongoose';
import type { ServiceApiKey } from './api-keys.types.js';

const serviceApiKeySchema = new Schema<ServiceApiKey>(
  {
    serviceName: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    keyHash: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    keyPrefix: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

serviceApiKeySchema.index({ status: 1 });

export const ServiceApiKeyModel = mongoose.model<ServiceApiKey>(
  'ServiceApiKey',
  serviceApiKeySchema,
);
