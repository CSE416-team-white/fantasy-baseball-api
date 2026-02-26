import 'dotenv/config';
import { connectDB } from '../../../loaders/mongoose.js';
import { playersService } from '../players.service.js';
import { createSamplePlayers } from './create-sample-players.js';
import type { Player } from '../players.types.js';

async function main() {
  try {
    await connectDB();

    const players = await createSamplePlayers();
    console.log(`Creating ${players.length} sample players...`);
    for (const player of players) {
      const created = await playersService.createPlayer(player as Player);
      console.log(
        `✓ Created ${created.name} (${created.playerType}) - Position: ${created.positions.join(', ')}`,
      );
    }

    console.log('\nAll sample players created successfully!');
  } catch (err) {
    console.error('Error creating sample players:', err);
    process.exitCode = 1;
  } finally {
    process.exit();
  }
}

main();
