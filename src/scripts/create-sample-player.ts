import 'dotenv/config';
import { connectDB } from '../loaders/mongoose.js';
import { playersService } from '../features/players/players.service.js';

async function main() {
  try {
    await connectDB();

    const sample = {
      externalId: `sample-${Date.now()}`,
      name: 'Aaron Judge',
      team: 'NYY',
      positions: ['OF'],
      league: 'AL',
      depthChartStatus: 'starter',
      depthChartOrder: 1,
      injuryStatus: 'active',
    };

    const created = await playersService.createPlayer(sample as any);
    console.log('Created player:', created);
  } catch (err) {
    console.error('Error creating sample player:', err);
    process.exitCode = 1;
  } finally {
    process.exit();
  }
}

main();
