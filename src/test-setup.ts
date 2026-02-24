import { beforeAll, afterAll } from 'vitest';
import { connectDB } from './config/db.js';
import mongoose from 'mongoose';

beforeAll(async () => {
  await connectDB();
});

afterAll(async () => {
  await mongoose.connection.close();
});
