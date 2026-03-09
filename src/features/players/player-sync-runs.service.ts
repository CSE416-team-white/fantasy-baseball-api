import mongoose from 'mongoose';
import { ApiError } from '@/shared/utils/api-error.js';
import { HTTP_STATUS } from '@/shared/constants.js';
import { PlayerSyncRunModel } from './player-sync-runs.model.js';
import type {
  PlayerSyncRun,
  PlayerSyncRunResult,
} from './player-sync-runs.types.js';

function toPlayerSyncRun(doc: {
  _id: mongoose.Types.ObjectId;
  status: 'queued' | 'running' | 'succeeded' | 'failed';
  result?: PlayerSyncRunResult;
  error?: string;
  createdAt: Date;
  startedAt?: Date;
  finishedAt?: Date;
}): PlayerSyncRun {
  return {
    id: doc._id.toString(),
    status: doc.status,
    ...(doc.result ? { result: doc.result } : {}),
    ...(doc.error ? { error: doc.error } : {}),
    createdAt: doc.createdAt,
    ...(doc.startedAt ? { startedAt: doc.startedAt } : {}),
    ...(doc.finishedAt ? { finishedAt: doc.finishedAt } : {}),
  };
}

export class PlayerSyncRunsService {
  async createQueuedRun(): Promise<PlayerSyncRun> {
    const run = await PlayerSyncRunModel.create({ status: 'queued' });
    return toPlayerSyncRun({
      _id: run._id,
      status: run.status,
      result: run.result,
      error: run.error,
      createdAt: run.createdAt,
      startedAt: run.startedAt,
      finishedAt: run.finishedAt,
    });
  }

  async getById(id: string): Promise<PlayerSyncRun> {
    if (!mongoose.isValidObjectId(id)) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Invalid sync run ID');
    }

    const run = await PlayerSyncRunModel.findById(id).lean();
    if (!run) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Sync run not found');
    }

    return toPlayerSyncRun({
      _id: run._id,
      status: run.status,
      result: run.result,
      error: run.error,
      createdAt: run.createdAt,
      startedAt: run.startedAt,
      finishedAt: run.finishedAt,
    });
  }

  async markRunning(id: string): Promise<void> {
    if (!mongoose.isValidObjectId(id)) {
      return;
    }

    await PlayerSyncRunModel.findByIdAndUpdate(id, {
      $set: {
        status: 'running',
        startedAt: new Date(),
      },
      $unset: {
        error: 1,
        result: 1,
      },
    });
  }

  async markSucceeded(id: string, result: PlayerSyncRunResult): Promise<void> {
    if (!mongoose.isValidObjectId(id)) {
      return;
    }

    await PlayerSyncRunModel.findByIdAndUpdate(id, {
      $set: {
        status: 'succeeded',
        result,
        finishedAt: new Date(),
      },
      $unset: {
        error: 1,
      },
    });
  }

  async markFailed(id: string, errorMessage: string): Promise<void> {
    if (!mongoose.isValidObjectId(id)) {
      return;
    }

    await PlayerSyncRunModel.findByIdAndUpdate(id, {
      $set: {
        status: 'failed',
        error: errorMessage,
        finishedAt: new Date(),
      },
    });
  }
}

export const playerSyncRunsService = new PlayerSyncRunsService();
