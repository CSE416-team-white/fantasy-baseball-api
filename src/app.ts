import express from 'express';
import { env } from './config/env.js';
import { connectDB } from './config/db.js';
import { loadExpress } from './loaders/express.js';

async function start() {
  const app = express();

  await connectDB();
  loadExpress(app);

  app.listen(env.port, () => {
    console.log(`Server running on http://localhost:${env.port}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
