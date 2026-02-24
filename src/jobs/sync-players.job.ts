import { agenda } from '../loaders/agenda.js';
import { playersService } from '../features/players/players.service.js';

// Define the job
agenda.define('sync-players', async (job) => {
  console.log('Running player sync job...');

  try {
    // TODO: Fetch players from external API (e.g., ESPN, MLB Stats API)
    // For now, this is a placeholder
    const externalPlayers = await fetchPlayersFromExternalAPI();

    // Clear existing players and insert new ones
    await playersService.clearPlayers();

    for (const player of externalPlayers) {
      await playersService.createPlayer(player);
    }

    console.log(`Synced ${externalPlayers.length} players`);
  } catch (error) {
    console.error('Player sync failed:', error);
    throw error;
  }
});

// Placeholder function - replace with actual API integration
async function fetchPlayersFromExternalAPI() {
  // TODO: Implement actual API call
  // Example APIs:
  // - MLB Stats API: https://statsapi.mlb.com/
  // - ESPN Fantasy API
  // - Yahoo Fantasy API

  return [];
}

// Schedule the job (runs daily at 3 AM)
export async function schedulePlayerSync() {
  await agenda.every('0 3 * * *', 'sync-players');
  console.log('Player sync job scheduled (daily at 3 AM)');
}

// Manual trigger (useful for testing or admin endpoints)
export async function triggerPlayerSyncNow() {
  await agenda.now('sync-players');
}
