import { z } from 'zod';

export const ApiKeyStatusSchema = z.enum(['active', 'inactive']);

export const ServiceNameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(2)
  .max(64)
  .regex(
    /^[a-z0-9-]+$/,
    'Service name must be lowercase letters, numbers, or hyphens',
  );

export const ApiKeyClientSchema = z.object({
  keyId: z.string(),
  serviceName: ServiceNameSchema,
  status: ApiKeyStatusSchema,
});

export const ApiKeyPublicSchema = z.object({
  id: z.string(),
  serviceName: ServiceNameSchema,
  status: ApiKeyStatusSchema,
  keyPrefix: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type ApiKeyStatus = z.infer<typeof ApiKeyStatusSchema>;
export type ApiKeyClient = z.infer<typeof ApiKeyClientSchema>;
export type ApiKeyPublic = z.infer<typeof ApiKeyPublicSchema>;

export interface ServiceApiKey {
  _id: string;
  serviceName: string;
  keyHash: string;
  keyPrefix: string;
  status: ApiKeyStatus;
  createdAt: Date;
  updatedAt: Date;
}
