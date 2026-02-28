import { beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';

beforeAll(async () => {
  process.env.API_KEY_PEPPER =
    process.env.API_KEY_PEPPER || 'test-api-key-pepper';
  const { connectDB } = await import('./loaders/mongoose.js');
  await connectDB();
});

afterAll(async () => {
  await mongoose.connection.close();
});
