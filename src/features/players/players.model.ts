import mongoose, { Schema } from 'mongoose';
import type { Player } from './players.types.js';

const playerSchema = new Schema<Player>(
  {
    externalId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
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
    playerType: {
      type: String,
      required: true,
      enum: ['hitter', 'pitcher'],
    },
    stats: [
      {
        season: String,
        type: {
          type: String,
          enum: ['hitter', 'pitcher'],
        },
        data: Schema.Types.Mixed,
      },
    ],
    depthChartStatus: {
      type: String,
      enum: ['starter', 'backup', 'reserve', 'minors'],
    },
    depthChartOrder: {
      type: Number,
      min: 1,
    },
    injuryStatus: {
      type: String,
      enum: ['active', 'day-to-day', 'il-10', 'il-15', 'il-60', 'out'],
      default: 'active',
    },
    injuryNote: {
      type: String,
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
playerSchema.index({ depthChartStatus: 1 });
playerSchema.index({ injuryStatus: 1 });

export const PlayerModel = mongoose.model<Player>('Player', playerSchema);
