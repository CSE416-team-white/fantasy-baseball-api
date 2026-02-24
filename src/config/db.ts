import mongoose from 'mongoose';
import { env } from './env.js';

export async function connectDB(): Promise<void> {
  await mongoose.connect(env.mongodbUri);
  console.log('Connected to MongoDB');
}
