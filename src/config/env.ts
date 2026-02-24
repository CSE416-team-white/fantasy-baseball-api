import dotenv from 'dotenv';

dotenv.config();

export const env = {
  port: parseInt(process.env.PORT || '3001', 10),
  mongodbUri:
    process.env.MONGODB_URI || 'mongodb://localhost:27017/app-template',
  jwtSecret: process.env.JWT_SECRET || 'change-me-in-production',
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
};
