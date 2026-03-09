export type PlayerSyncRunStatus = 'queued' | 'running' | 'succeeded' | 'failed';

export interface PlayerSyncRunResult {
  fetchedCount: number;
  updatedCount: number;
}

export interface PlayerSyncRun {
  id: string;
  status: PlayerSyncRunStatus;
  result?: PlayerSyncRunResult;
  error?: string;
  createdAt: Date;
  startedAt?: Date;
  finishedAt?: Date;
}
