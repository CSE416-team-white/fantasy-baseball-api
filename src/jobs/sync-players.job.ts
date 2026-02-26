import { getAgenda } from '../loaders/agenda.js';
import { playersService } from '../features/players/players.service.js';
import type { PlayerInput } from '../features/players/players.types.js';

const MLB_API_BASE = 'https://statsapi.mlb.com/api/v1';

interface MLBTeam {
  id: number;
  name: string;
  abbreviation: string;
  league: {
    id: number;
    name: string;
  };
}

interface MLBPlayer {
  id: number;
  fullName: string;
  primaryPosition: {
    code: string;
    abbreviation: string;
  };
  birthDate?: string;
  currentAge?: number;
  height?: string;
  weight?: number;
  batSide?: {
    code: string;
  };
  pitchHand?: {
    code: string;
  };
  mlbDebutDate?: string;
  active: boolean;
}

interface MLBRosterEntry {
  person: MLBPlayer;
  jerseyNumber?: string;
  position: {
    abbreviation: string;
  };
  status: {
    code: string;
    description: string;
  };
}

interface MLBRosterResponse {
  roster: MLBRosterEntry[];
}

async function fetchJSON<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`MLB API error: ${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<T>;
}

async function getAllTeams(): Promise<MLBTeam[]> {
  const response = await fetchJSON<{ teams: MLBTeam[] }>(
    `${MLB_API_BASE}/teams?sportId=1&season=2025`,
  );
  return response.teams.filter((team) => team.league.id === 103 || team.league.id === 104);
}

async function getTeamRoster(teamId: number): Promise<MLBRosterResponse> {
  return fetchJSON<MLBRosterResponse>(`${MLB_API_BASE}/teams/${teamId}/roster/40Man`);
}

function mapPositionToOurs(mlbPosition: string): PlayerInput['positions'] {
  const positionMap: Record<string, PlayerInput['positions']> = {
    C: ['C'],
    '1B': ['1B'],
    '2B': ['2B'],
    '3B': ['3B'],
    SS: ['SS'],
    LF: ['OF'],
    CF: ['OF'],
    RF: ['OF'],
    OF: ['OF'],
    DH: ['DH'],
    P: ['SP'],
    SP: ['SP'],
    RP: ['RP'],
  };

  return positionMap[mlbPosition] || ['DH'];
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

  return statusMap[statusCode] || 'active';
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

      if (!roster.roster || roster.roster.length === 0) {
        console.log(`  ⚠️ Empty roster for ${team.name}`);
        continue;
      }

      for (const rosterEntry of roster.roster) {
        const player = rosterEntry.person;

        if (!player.active) continue;

        const league = team.league.id === 103 ? 'AL' : 'NL';
        const positions = mapPositionToOurs(rosterEntry.position.abbreviation);
        const injuryStatus = mapInjuryStatus(rosterEntry.status.code);

        const playerInput: PlayerInput = {
          externalId: `mlb-${player.id}`,
          name: player.fullName,
          team: team.abbreviation,
          positions,
          league,
          jerseyNumber: rosterEntry.jerseyNumber,
          injuryStatus,
          birthDate: player.birthDate,
          age: player.currentAge,
          height: player.height,
          weight: player.weight,
          batSide: player.batSide?.code as 'R' | 'L' | 'S' | undefined,
          pitchHand: player.pitchHand?.code as 'R' | 'L' | undefined,
          mlbDebutDate: player.mlbDebutDate,
          active: player.active,
        };

        allPlayers.push(playerInput);
      }

      // Rate limiting - be nice to MLB's API
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`Failed to fetch roster for ${team.name}:`, error);
      // Continue with other teams even if one fails
    }
  }

  console.log(`Successfully fetched ${allPlayers.length} players`);
  return allPlayers;
}

export function definePlayerSyncJob() {
  const agenda = getAgenda();

  // Define the job
  agenda.define('sync-players', async () => {
    console.log('Running player sync job...');

    try {
      // Fetch all active MLB players from MLB Stats API
      const externalPlayers = await fetchAllMLBPlayers();

      // Upsert players (update existing, insert new)
      // This preserves historical data and handles API failures gracefully
      const updatedCount = await playersService.upsertPlayers(externalPlayers);

      console.log(`Synced ${externalPlayers.length} players (${updatedCount} updated/inserted)`);
    } catch (error) {
      console.error('Player sync failed:', error);
      throw error;
    }
  });
}

// Schedule the job (runs daily at 3 AM)
export async function schedulePlayerSync() {
  const agenda = getAgenda();
  await agenda.every('0 3 * * *', 'sync-players');
  console.log('Player sync job scheduled (daily at 3 AM)');
}

// Manual trigger (useful for testing or admin endpoints)
export async function triggerPlayerSyncNow() {
  const agenda = getAgenda();
  await agenda.now('sync-players');
}
