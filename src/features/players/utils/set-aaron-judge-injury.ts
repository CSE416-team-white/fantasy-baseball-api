import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../../../loaders/mongoose.js';
import { PlayerModel } from '../players.model.js';

const PLAYER_NAME = 'Aaron Judge';

async function main() {
  try {
    await connectDB();

    const current = await PlayerModel.findOne({ name: PLAYER_NAME })
      .select('name injuryStatus')
      .lean();

    if (!current) {
      throw new Error(`Player not found: ${PLAYER_NAME}`);
    }

    const nextStatus = current.injuryStatus === 'out' ? 'active' : 'out';
    const updated = await PlayerModel.findOneAndUpdate(
      { name: PLAYER_NAME },
      { $set: { injuryStatus: nextStatus } },
      { new: true },
    ).lean();

    if (!updated) {
      throw new Error(`Player not found: ${PLAYER_NAME}`);
    }

    console.log(
      `Updated ${updated.name}: injuryStatus=${updated.injuryStatus}`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Failed to update injury status: ${message}`);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
}

main();
