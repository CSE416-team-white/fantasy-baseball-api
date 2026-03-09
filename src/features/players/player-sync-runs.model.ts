import mongoose, { Schema } from 'mongoose';

interface PlayerSyncRunDocument {
  status: 'queued' | 'running' | 'succeeded' | 'failed';
  result?: {
    fetchedCount: number;
    updatedCount: number;
  };
  error?: string;
  startedAt?: Date;
  finishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const playerSyncRunSchema = new Schema<PlayerSyncRunDocument>(
  {
    status: {
      type: String,
      required: true,
      enum: ['queued', 'running', 'succeeded', 'failed'],
      default: 'queued',
    },
    result: {
      fetchedCount: { type: Number, min: 0 },
      updatedCount: { type: Number, min: 0 },
    },
    error: {
      type: String,
    },
    startedAt: {
      type: Date,
    },
    finishedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

playerSyncRunSchema.index({ status: 1, createdAt: -1 });

export const PlayerSyncRunModel = mongoose.model<PlayerSyncRunDocument>(
  'PlayerSyncRun',
  playerSyncRunSchema,
);
