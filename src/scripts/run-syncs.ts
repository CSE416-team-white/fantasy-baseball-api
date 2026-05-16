/**
 * One-shot script: runs player sync then depth chart sync directly against the DB.
 * Usage: npx tsx src/scripts/run-syncs.ts
 */
import mongoose from 'mongoose';
import { env } from '../config/env.js';

async function main() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(env.mongodbUri);
  console.log('Connected.\n');

  // ── Player sync ─────────────────────────────────────────────────────────────
  const { fetchAllMLBPlayersForScript } = await import('../jobs/sync-players.job.js');
  const { playersService } = await import('../features/players/players.service.js');

  console.log('=== Starting player sync ===');
  const players = await fetchAllMLBPlayersForScript();
  const updated = await playersService.upsertPlayers(players);
  console.log(`Player sync done: ${players.length} fetched, ${updated} updated/inserted.\n`);

  // ── Depth chart sync ─────────────────────────────────────────────────────────
  const { syncAllDepthChartsForScript } = await import('../jobs/sync-depth-charts.job.js');

  console.log('=== Starting depth chart sync ===');
  await syncAllDepthChartsForScript();
  console.log('Depth chart sync done.\n');

  await mongoose.disconnect();
  console.log('All done.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Sync failed:', err);
  process.exit(1);
});
