import { getAgenda } from '../loaders/agenda.js';
import { PlayerModel } from '../features/players/players.model.js';
import { playersService } from '../features/players/players.service.js';
import type { DepthChartUpdate } from '../features/players/players.service.js';
import type {
  DepthChartStatus,
  Player,
} from '../features/players/players.types.js';
import { notificationsService } from '../features/notifications/notifications.service.js';

const ESPN_API_BASE =
  'https://site.api.espn.com/apis/site/v2/sports/baseball/mlb';

const DEPTH_CHART_CATEGORY = 'Player Details - Depth Chart';

type DepthChartPlayerChange = {
  playerId: string;
  playerName: string;
  team: string;
  previousValues: Record<string, unknown>;
  nextValues: Record<string, unknown>;
};

/**
 * ESPN team ID → MLB team abbreviation (as returned by statsapi.mlb.com).
 * Abbreviations must match what the player sync job stores in the DB.
 */
const ESPN_TEAM_MAP: Record<number, string> = {
  1: 'BAL',
  2: 'BOS',
  3: 'LAA',
  4: 'CWS',
  5: 'CLE',
  6: 'DET',
  7: 'KC',
  8: 'MIL',
  9: 'MIN',
  10: 'NYY',
  11: 'ATH', // Oakland/Sacramento Athletics
  12: 'SEA',
  13: 'TEX',
  14: 'TOR',
  15: 'ATL',
  16: 'CHC',
  17: 'CIN',
  18: 'HOU',
  19: 'LAD',
  20: 'WSH',
  21: 'NYM',
  22: 'PHI',
  23: 'PIT',
  24: 'STL',
  25: 'SD',
  26: 'SF',
  27: 'COL',
  28: 'MIA',
  29: 'ARI',
  30: 'TB',
};

/**
 * Maps ESPN lowercase slot key → the position override stored in our DB.
 * 'p' (generic pitcher) is handled separately in the two-pass logic below.
 */
const ESPN_PITCHER_POSITION_MAP: Record<string, string[]> = {
  sp: ['SP'],
  rp: ['RP'],
  cl: ['RP'],
  p: ['SP'], // fallback for teams that use 'p' instead of 'sp'
};

interface ESPNAthlete {
  id: string;
  displayName: string;
}

interface ESPNPositionEntry {
  position: { name: string; abbreviation: string };
  /** Athletes ordered by depth chart rank (index 0 = starter). */
  athletes: ESPNAthlete[];
}

interface ESPNDepthChartGroup {
  id: string;
  name: string;
  /** Keys are lowercase position abbreviations: 'c', '1b', 'sp', 'rp', 'cl', etc. */
  positions: Record<string, ESPNPositionEntry>;
}

interface ESPNDepthChartResponse {
  /** ESPN returns a single-element array named "depthchart" (lowercase). */
  depthchart: ESPNDepthChartGroup[];
}

async function fetchJSON<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `ESPN API error: ${response.status} ${response.statusText}`,
    );
  }
  return response.json() as Promise<T>;
}

function rankToDepthChartStatus(rank: number): DepthChartStatus {
  if (rank === 1) return 'starter';
  if (rank === 2) return 'backup';
  return 'reserve';
}

function normalizePositions(positions: string[] | undefined): string[] {
  return [...(positions ?? [])].sort();
}

function arraysEqual(left: string[], right: string[]): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function buildDepthChartNotificationMessage(
  change: DepthChartPlayerChange,
): string {
  return `${change.playerName} (${change.team}) updated: ${DEPTH_CHART_CATEGORY}`;
}

async function fetchTeamDepthChart(
  espnTeamId: number,
  mlbAbbr: string,
): Promise<{ team: string; updates: DepthChartUpdate[] }> {
  const url = `${ESPN_API_BASE}/teams/${espnTeamId}/depthcharts`;
  const data = await fetchJSON<ESPNDepthChartResponse>(url);

  const positionsMap = data.depthchart[0]?.positions ?? {};

  // Track each player's best (lowest) rank AND the slot that produced it.
  // Two-pass approach: specific positions (sp/rp/cl and field slots) first,
  // then generic 'p' bucket only for athletes not already placed.
  // This handles teams that use 'p' instead of 'sp' (e.g. PIT) while
  // avoiding duplicates on teams that have both 'p' and 'sp'.
  const bestEntry = new Map<string, { rank: number; posKey: string }>();

  // Pass 1: everything except the generic 'p' bucket
  for (const [posKey, posEntry] of Object.entries(positionsMap)) {
    if (posKey === 'p') continue;
    posEntry.athletes.forEach((athlete, index) => {
      const name = athlete.displayName;
      const rank = index + 1;
      const existing = bestEntry.get(name);
      if (existing === undefined || rank < existing.rank) {
        bestEntry.set(name, { rank, posKey });
      }
    });
  }

  // Pass 2: generic 'p' bucket — only add pitchers not already captured above
  const genericPitcherEntry = positionsMap['p'];
  if (genericPitcherEntry) {
    genericPitcherEntry.athletes.forEach((athlete, index) => {
      if (!bestEntry.has(athlete.displayName)) {
        bestEntry.set(athlete.displayName, { rank: index + 1, posKey: 'p' });
      }
    });
  }

  const updates: DepthChartUpdate[] = [];
  for (const [name, { rank, posKey }] of bestEntry) {
    updates.push({
      name,
      depthChartStatus: rankToDepthChartStatus(rank),
      depthChartOrder: rank,
      positionOverride: ESPN_PITCHER_POSITION_MAP[posKey],
    });
  }

  return { team: mlbAbbr, updates };
}

async function syncAllDepthCharts(): Promise<void> {
  let totalUpdated = 0;

  for (const [espnId, mlbAbbr] of Object.entries(ESPN_TEAM_MAP)) {
    try {
      console.log(
        `Fetching depth chart for ${mlbAbbr} (ESPN ID: ${espnId})...`,
      );
      const { team, updates } = await fetchTeamDepthChart(
        Number(espnId),
        mlbAbbr,
      );
      const existingPlayers = await PlayerModel.find(
        { team },
        {
          _id: 1,
          name: 1,
          team: 1,
          positions: 1,
          depthChartStatus: 1,
          depthChartOrder: 1,
        },
      ).lean();
      const existingPlayersByName = new Map(
        (existingPlayers as Player[]).map((player) => [player.name, player]),
      );

      const updated = await playersService.syncTeamDepthCharts(team, updates);
      console.log(
        `  ${mlbAbbr}: ${updated} players updated (${updates.length} in chart)`,
      );
      totalUpdated += updated;

      const updatedPlayerNames = new Set(updates.map((update) => update.name));

      const updatedEntryChanges: DepthChartPlayerChange[] = updates.flatMap(
        (update) => {
          const previousPlayer = existingPlayersByName.get(update.name);

          if (!previousPlayer) {
            return [];
          }

          const previousPositions = normalizePositions(
            previousPlayer.positions,
          );
          const nextPositions = normalizePositions(
            update.positionOverride ?? previousPlayer.positions,
          );

          if (
            (previousPlayer.depthChartStatus ?? null) ===
              update.depthChartStatus &&
            (previousPlayer.depthChartOrder ?? null) ===
              update.depthChartOrder &&
            arraysEqual(previousPositions, nextPositions)
          ) {
            return [];
          }

          return [
            {
              playerId: String(previousPlayer._id),
              playerName: previousPlayer.name,
              team,
              previousValues: {
                depthChartStatus: previousPlayer.depthChartStatus ?? null,
                depthChartOrder: previousPlayer.depthChartOrder ?? null,
                positions: previousPositions,
              },
              nextValues: {
                depthChartStatus: update.depthChartStatus,
                depthChartOrder: update.depthChartOrder,
                positions: nextPositions,
              },
            },
          ];
        },
      );

      const clearedEntryChanges = (existingPlayers as Player[]).flatMap(
        (player) => {
          if (
            updatedPlayerNames.has(player.name) ||
            ((player.depthChartStatus ?? null) === null &&
              (player.depthChartOrder ?? null) === null)
          ) {
            return [];
          }

          return [
            {
              playerId: String(player._id),
              playerName: player.name,
              team,
              previousValues: {
                depthChartStatus: player.depthChartStatus ?? null,
                depthChartOrder: player.depthChartOrder ?? null,
                positions: normalizePositions(player.positions),
              },
              nextValues: {
                depthChartStatus: null,
                depthChartOrder: null,
                positions: normalizePositions(player.positions),
              },
            },
          ];
        },
      );

      const depthChartChanges = [
        ...updatedEntryChanges,
        ...clearedEntryChanges,
      ];

      if (depthChartChanges.length > 0) {
        const targetsByPlayerId =
          await notificationsService.resolveTargetUserIdsByPlayerIds(
            depthChartChanges.map((change) => change.playerId),
          );

        for (const change of depthChartChanges) {
          const targetUserIds = targetsByPlayerId[change.playerId] ?? [];

          if (targetUserIds.length === 0) {
            continue;
          }

          await notificationsService.push({
            type: 'player-details-updated',
            message: buildDepthChartNotificationMessage(change),
            data: {
              playerId: change.playerId,
              playerName: change.playerName,
              team: change.team,
              changedCategories: [DEPTH_CHART_CATEGORY],
              previousValues: change.previousValues,
              nextValues: change.nextValues,
              syncedAt: new Date().toISOString(),
            },
            targetUserIds,
          });
        }
      }

      // Polite rate limiting between teams
      await new Promise((resolve) => setTimeout(resolve, 200));
    } catch (error) {
      console.error(`Failed to sync depth chart for ${mlbAbbr}:`, error);
      // Continue with other teams
    }
  }

  console.log(
    `Depth chart sync complete. Total players updated: ${totalUpdated}`,
  );
}

export { syncAllDepthCharts as syncAllDepthChartsForScript };

export function defineDepthChartSyncJob() {
  const agenda = getAgenda();

  agenda.define('sync-depth-charts', async () => {
    console.log('Running depth chart sync job...');
    try {
      await syncAllDepthCharts();
      notificationsService.push({
        type: 'depth-charts-updated',
        message: 'MLB depth charts have been refreshed',
        data: { syncedAt: new Date().toISOString() },
      });
    } catch (error) {
      console.error('Depth chart sync failed:', error);
      throw error;
    }
  });
}

// Runs daily at 5 AM — after player sync at 3 AM so players exist in the DB
export async function scheduleDepthChartSync() {
  const agenda = getAgenda();
  await agenda.every('0 5 * * *', 'sync-depth-charts');
  console.log('Depth chart sync job scheduled (daily at 5 AM)');
}

// Manual trigger for admin/testing
export async function triggerDepthChartSyncNow() {
  const agenda = getAgenda();
  await agenda.now('sync-depth-charts');
}
