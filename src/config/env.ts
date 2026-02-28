import dotenv from 'dotenv';

dotenv.config();

const isTestEnv =
  process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';
const apiKeyPepper = process.env.API_KEY_PEPPER;
const disableApiKeyAuth = process.env.DISABLE_API_KEY_AUTH === 'true';

if (!apiKeyPepper && !isTestEnv) {
  throw new Error('API_KEY_PEPPER is required');
}

export const env = {
  port: parseInt(process.env.PORT || '3001', 10),
  mongodbUri:
    process.env.MONGODB_URI || 'mongodb://localhost:27017/app-template',
  jwtSecret: process.env.JWT_SECRET || 'change-me-in-production',
  apiKeyPepper: apiKeyPepper || 'test-api-key-pepper',
  disableApiKeyAuth,
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
};
