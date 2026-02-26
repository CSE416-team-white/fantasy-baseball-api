import mongoose, { Schema } from 'mongoose';
import type { League } from './leagues.types.js';

const leagueSchema = new Schema<League>(
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
    description: {
      type: String,
      trim: true,
    },
    format: {
      type: String,
      required: true,
      enum: ['roto', 'h2h-points', 'h2h-category'],
    },
    draftType: {
      type: String,
      required: true,
      enum: ['auction', 'snake'],
    },
    battingCategories: {
      type: [String],
      required: true,
      enum: [
        'R',
        'HR',
        'RBI',
        'SB',
        'AVG',
        'OBP',
        'SLG',
        'OPS',
        'H',
        '2B',
        '3B',
        'BB',
        'K',
      ],
    },
    pitchingCategories: {
      type: [String],
      required: true,
      enum: [
        'W',
        'SV',
        'K',
        'ERA',
        'WHIP',
        'QS',
        'IP',
        'H',
        'BB',
        'HR',
        'L',
        'HLD',
        'SV+HLD',
      ],
    },
    rosterSlots: {
      C: { type: Number, default: 1 },
      '1B': { type: Number, default: 1 },
      '2B': { type: Number, default: 1 },
      '3B': { type: Number, default: 1 },
      SS: { type: Number, default: 1 },
      OF: { type: Number, default: 3 },
      DH: { type: Number, default: 0 },
      SP: { type: Number, default: 5 },
      RP: { type: Number, default: 2 },
      UTIL: { type: Number, default: 0 },
      BENCH: { type: Number, default: 0 },
    },
    totalBudget: {
      type: Number,
      min: 1,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    categoryWeights: {
      type: Map,
      of: Number,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes
leagueSchema.index({ name: 'text', description: 'text' });
leagueSchema.index({ format: 1 });
leagueSchema.index({ draftType: 1 });
leagueSchema.index({ isDefault: 1 });

export const LeagueModel = mongoose.model<League>('League', leagueSchema);
