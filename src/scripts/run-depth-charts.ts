import mongoose from 'mongoose';
import { env } from '../config/env.js';

async function main() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(env.mongodbUri);
  console.log('Connected.\n');

  const { syncAllDepthChartsForScript } = await import('../jobs/sync-depth-charts.job.js');
  console.log('=== Starting depth chart sync (with SP/RP position fix) ===');
  await syncAllDepthChartsForScript();
  console.log('Done.');

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
