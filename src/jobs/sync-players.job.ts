import { getAgenda } from '../loaders/agenda.js';
import { playersService } from '../features/players/players.service.js';
import type { PlayerInput, PlayerPosition } from '../features/players/players.types.js';
import { notificationsService } from '../features/notifications/notifications.service.js';

const MLB_API_BASE = 'https://statsapi.mlb.com/api/v1';
const LAST_SEASON = new Date().getFullYear() - 1;
const ELIGIBLE_GAMES_THRESHOLD = 20;

interface MLBTeam {
  id: number;
  name: string;
  abbreviation: string;
  league: { id: number; name: string };
}

interface MLBPlayer {
  id: number;
  fullName: string;
  primaryPosition?: { code: string; abbreviation: string };
  birthDate?: string;
  currentAge?: number;
  height?: string;
  weight?: number;
  batSide?: { code: string };
  pitchHand?: { code: string };
  mlbDebutDate?: string;
  active?: boolean;
}

interface MLBPlayerDetailResponse {
  people: MLBPlayer[];
}

interface MLBRosterEntry {
  person: MLBPlayer;
  jerseyNumber?: string;
  position: { abbreviation: string };
  status: { code: string; description: string };
}

interface MLBRosterResponse {
  roster: MLBRosterEntry[];
}

interface MLBFieldingStats {
  stats: Array<{
    splits: Array<{
      stat: { games?: number };
      position: { abbreviation: string };
    }>;
  }>;
}

// Maps MLB position abbreviations → our PlayerPosition enum values
const POSITION_MAP: Record<string, PlayerPosition> = {
  C: 'C',
  '1B': '1B',
  '2B': '2B',
  '3B': '3B',
  SS: 'SS',
  LF: 'OF',
  CF: 'OF',
  RF: 'OF',
  OF: 'OF',
  DH: 'DH',
  SP: 'SP',
  RP: 'RP',
  // Generic pitcher falls back to SP unless primaryPosition says otherwise
  P: 'SP',
};

function toPlayerPosition(abbr: string): PlayerPosition | null {
  return POSITION_MAP[abbr] ?? null;
}

async function fetchJSON<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`MLB API error: ${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<T>;
}

async function getAllTeams(): Promise<MLBTeam[]> {
  const currentYear = new Date().getFullYear();
  const response = await fetchJSON<{ teams: MLBTeam[] }>(
    `${MLB_API_BASE}/teams?sportId=1&season=${currentYear}`,
  );
  return response.teams.filter((t) => t.league.id === 103 || t.league.id === 104);
}

async function getTeamRoster(teamId: number): Promise<MLBRosterResponse> {
  return fetchJSON<MLBRosterResponse>(`${MLB_API_BASE}/teams/${teamId}/roster/40Man`);
}

async function getPlayerDetails(playerId: number): Promise<MLBPlayer | null> {
  try {
    const response = await fetchJSON<MLBPlayerDetailResponse>(
      `${MLB_API_BASE}/people/${playerId}`,
    );
    return response.people[0] ?? null;
  } catch {
    return null;
  }
}

// Fetches last season's fielding stats to determine multi-position eligibility
async function getFieldingPositions(playerId: number): Promise<PlayerPosition[]> {
  try {
    const data = await fetchJSON<MLBFieldingStats>(
      `${MLB_API_BASE}/people/${playerId}/stats?stats=season&group=fielding&season=${LAST_SEASON}`,
    );
    const splits = data.stats[0]?.splits ?? [];
    const positions: PlayerPosition[] = [];
    for (const split of splits) {
      if ((split.stat.games ?? 0) >= ELIGIBLE_GAMES_THRESHOLD) {
        const pos = toPlayerPosition(split.position.abbreviation);
        // Exclude pitching positions from fielding eligibility
        if (pos && pos !== 'SP' && pos !== 'RP') positions.push(pos);
      }
    }
    return positions;
  } catch {
    return [];
  }
}

async function buildPositions(
  playerId: number,
  rosterAbbr: string,
  primaryAbbr: string | undefined,
  isPitcher: boolean,
): Promise<PlayerPosition[]> {
  if (isPitcher) {
    // Use primaryPosition to correctly differentiate SP vs RP
    const resolved = toPlayerPosition(primaryAbbr ?? rosterAbbr) ?? 'SP';
    // Clamp to only pitcher positions
    return resolved === 'RP' ? ['RP'] : ['SP'];
  }

  const posSet = new Set<PlayerPosition>();

  const fromRoster = toPlayerPosition(rosterAbbr);
  if (fromRoster && fromRoster !== 'SP' && fromRoster !== 'RP') posSet.add(fromRoster);

  const fromPrimary = toPlayerPosition(primaryAbbr ?? '');
  if (fromPrimary && fromPrimary !== 'SP' && fromPrimary !== 'RP') posSet.add(fromPrimary);

  // Fetch fielding stats for multi-position eligibility
  const fieldingPositions = await getFieldingPositions(playerId);
  await new Promise((r) => setTimeout(r, 50));
  for (const pos of fieldingPositions) posSet.add(pos);

  return posSet.size > 0 ? Array.from(posSet) : ['DH'];
}

function isPitcherPosition(rosterAbbr: string, primaryAbbr: string | undefined): boolean {
  const abbr = primaryAbbr ?? rosterAbbr;
  return abbr === 'SP' || abbr === 'RP' || abbr === 'P' || rosterAbbr === 'P';
}

function mapInjuryStatus(statusCode: string): PlayerInput['injuryStatus'] {
  const statusMap: Record<string, PlayerInput['injuryStatus']> = {
    A: 'active',
    D10: 'il-10',
    D15: 'il-15',
    D60: 'il-60',
    DTD: 'day-to-day',
    OUT: 'out',
  };
  return statusMap[statusCode] ?? 'active';
}

async function fetchAllMLBPlayers(): Promise<PlayerInput[]> {
  console.log('Fetching all MLB teams...');
  const teams = await getAllTeams();
  console.log(`Found ${teams.length} teams`);

  const allPlayers: PlayerInput[] = [];

  for (const team of teams) {
    try {
      console.log(`Fetching roster for ${team.name}...`);
      const roster = await getTeamRoster(team.id);

      if (!roster.roster?.length) {
        console.log(`  ⚠️ Empty roster for ${team.name}`);
        continue;
      }

      for (const entry of roster.roster) {
        const player = entry.person;
        const playerDetails = await getPlayerDetails(player.id);
        await new Promise((r) => setTimeout(r, 50));

        const league = (team.league.id === 103 ? 'AL' : 'NL') as 'AL' | 'NL';
        const rosterAbbr = entry.position.abbreviation;
        const primaryAbbr = playerDetails?.primaryPosition?.abbreviation;
        const isPitcher = isPitcherPosition(rosterAbbr, primaryAbbr);

        const positions = await buildPositions(player.id, rosterAbbr, primaryAbbr, isPitcher);
        const playerType: 'hitter' | 'pitcher' = isPitcher ? 'pitcher' : 'hitter';
        const injuryStatus = mapInjuryStatus(entry.status.code);

        const base = {
          externalId: `mlb-${player.id}`,
          name: player.fullName,
          team: team.abbreviation,
          positions,
          league,
          jerseyNumber: entry.jerseyNumber,
          injuryStatus,
          birthDate: playerDetails?.birthDate,
          age: playerDetails?.currentAge,
          height: playerDetails?.height,
          weight: playerDetails?.weight,
          mlbDebutDate: playerDetails?.mlbDebutDate,
          active: playerDetails?.active ?? true,
        };

        const playerInput: PlayerInput =
          playerType === 'pitcher'
            ? {
                ...base,
                playerType: 'pitcher' as const,
                pitchHand: playerDetails?.pitchHand?.code as 'R' | 'L' | undefined,
              }
            : {
                ...base,
                playerType: 'hitter' as const,
                batSide: playerDetails?.batSide?.code as 'R' | 'L' | 'S' | undefined,
              };

        allPlayers.push(playerInput);
      }
    } catch (error) {
      console.error(`Failed to fetch roster for ${team.name}:`, error);
    }
  }

  console.log(`Successfully fetched ${allPlayers.length} players`);
  return allPlayers;
}

export { fetchAllMLBPlayers as fetchAllMLBPlayersForScript };

export function definePlayerSyncJob() {
  const agenda = getAgenda();

  agenda.define('sync-players', async () => {
    console.log('Running player sync job...');
    try {
      const externalPlayers = await fetchAllMLBPlayers();
      const updatedCount = await playersService.upsertPlayers(externalPlayers);
      console.log(`Synced ${externalPlayers.length} players (${updatedCount} updated/inserted)`);
      notificationsService.push({
        type: 'players-updated',
        message: `Player roster synced — ${updatedCount} players updated`,
        data: { total: externalPlayers.length, updated: updatedCount, syncedAt: new Date().toISOString() },
      });
    } catch (error) {
      console.error('Player sync failed:', error);
      throw error;
    }
  });
}

export async function schedulePlayerSync() {
  const agenda = getAgenda();
  await agenda.every('0 3 * * *', 'sync-players');
  console.log('Player sync job scheduled (daily at 3 AM)');
}

export async function triggerPlayerSyncNow() {
  const agenda = getAgenda();
  await agenda.now('sync-players');
}
