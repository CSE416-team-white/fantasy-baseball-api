import mongoose, { Schema } from 'mongoose';
import type { Player } from './players.types.js';

const playerSchema = new Schema<Player>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    team: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    positions: {
      type: [String],
      required: true,
      enum: ['C', '1B', '2B', '3B', 'SS', 'OF', 'DH', 'SP', 'RP'],
    },
    league: {
      type: String,
      required: true,
      enum: ['AL', 'NL'],
    },
  },
  {
    timestamps: true,
  },
);

// Index for faster queries
playerSchema.index({ name: 'text' });
playerSchema.index({ league: 1 });
playerSchema.index({ positions: 1 });

export const PlayerModel = mongoose.model<Player>('Player', playerSchema);
