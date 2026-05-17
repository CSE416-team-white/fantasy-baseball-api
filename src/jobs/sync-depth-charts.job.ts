import { getAgenda } from '../loaders/agenda.js';
import { playersService } from '../features/players/players.service.js';
import type { DepthChartUpdate } from '../features/players/players.service.js';
import type { DepthChartStatus } from '../features/players/players.types.js';
import { notificationsService } from '../features/notifications/notifications.service.js';

const ESPN_API_BASE =
  'https://site.api.espn.com/apis/site/v2/sports/baseball/mlb';

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

      const updated = await playersService.syncTeamDepthCharts(team, updates);
      console.log(
        `  ${mlbAbbr}: ${updated} players updated (${updates.length} in chart)`,
      );
      totalUpdated += updated;

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
