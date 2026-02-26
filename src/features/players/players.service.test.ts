import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { playersService } from './players.service.js';
import { PlayerModel } from './players.model.js';
import type { PlayerInput } from './players.types.js';

describe('PlayersService', () => {
  const mockPlayers: PlayerInput[] = [
    {
      externalId: 'mlb-592450',
      name: 'Aaron Judge',
      team: 'NYY',
      positions: ['OF'],
      league: 'AL',
      playerType: 'hitter',
      injuryStatus: 'active',
      batSide: 'R',
      active: true,
    },
    {
      externalId: 'mlb-660271',
      name: 'Shohei Ohtani',
      team: 'LAA',
      positions: ['DH', 'SP'],
      league: 'AL',
      playerType: 'pitcher',
      injuryStatus: 'active',
      pitchHand: 'R',
      active: true,
    },
    {
      externalId: 'mlb-605141',
      name: 'Mookie Betts',
      team: 'LAD',
      positions: ['OF'],
      league: 'NL',
      playerType: 'hitter',
      injuryStatus: 'active',
      batSide: 'R',
      active: true,
    },
    {
      externalId: 'mlb-518692',
      name: 'Freddie Freeman',
      team: 'LAD',
      positions: ['1B'],
      league: 'NL',
      playerType: 'hitter',
      injuryStatus: 'active',
      batSide: 'L',
      active: true,
    },
  ];

  beforeEach(async () => {
    // Clear database before each test
    await PlayerModel.deleteMany({});
    // Seed test data
    await PlayerModel.insertMany(mockPlayers);
  });

  afterEach(async () => {
    // Clean up after each test
    await PlayerModel.deleteMany({});
  });

  describe('getPlayers', () => {
    it('should return all players with default pagination', async () => {
      const result = await playersService.getPlayers();

      expect(result.players).toHaveLength(4);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 50,
        total: 4,
      });
    });

    it('should filter players by league (AL)', async () => {
      const result = await playersService.getPlayers({ league: 'AL' });

      expect(result.players).toHaveLength(2);
      expect(result.players.every((p) => p.league === 'AL')).toBe(true);
    });

    it('should filter players by league (NL)', async () => {
      const result = await playersService.getPlayers({ league: 'NL' });

      expect(result.players).toHaveLength(2);
      expect(result.players.every((p) => p.league === 'NL')).toBe(true);
    });

    it('should return all players when league is MLB', async () => {
      const result = await playersService.getPlayers({ league: 'MLB' });

      expect(result.players).toHaveLength(4);
    });

    it('should filter players by position', async () => {
      const result = await playersService.getPlayers({ position: 'OF' });

      expect(result.players).toHaveLength(2);
      expect(result.players.every((p) => p.positions.includes('OF'))).toBe(
        true,
      );
    });

    it('should filter players by position (1B)', async () => {
      const result = await playersService.getPlayers({ position: '1B' });

      expect(result.players).toHaveLength(1);
      expect(result.players[0].name).toBe('Freddie Freeman');
    });

    it('should handle pagination correctly', async () => {
      const result = await playersService.getPlayers({
        page: 1,
        limit: 2,
      });

      expect(result.players).toHaveLength(2);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 2,
        total: 4,
      });
    });

    it('should return second page of results', async () => {
      const result = await playersService.getPlayers({
        page: 2,
        limit: 2,
      });

      expect(result.players).toHaveLength(2);
      expect(result.pagination.page).toBe(2);
    });

    it('should search players by name', async () => {
      const result = await playersService.getPlayers({ search: 'Judge' });

      expect(result.players).toHaveLength(1);
      expect(result.players[0].name).toBe('Aaron Judge');
    });

    it('should combine filters (league + position)', async () => {
      const result = await playersService.getPlayers({
        league: 'AL',
        position: 'OF',
      });

      expect(result.players).toHaveLength(1);
      expect(result.players[0].name).toBe('Aaron Judge');
    });
  });

  describe('getPlayerById', () => {
    it('should return a player by id', async () => {
      const players = await PlayerModel.find({
        externalId: 'mlb-592450',
      }).limit(1);
      const player = await playersService.getPlayerById(
        players[0]._id.toString(),
      );

      if (!player) {
        throw new Error('Player not found');
      }

      expect(player.name).toBe('Aaron Judge');
      expect(player.team).toBe('NYY');
    });

    it('should return null for non-existent id', async () => {
      const player = await playersService.getPlayerById(
        '507f1f77bcf86cd799439011',
      );

      expect(player).toBeNull();
    });
  });

  describe('createPlayer', () => {
    it('should create a new player', async () => {
      await PlayerModel.deleteMany({});

      const newPlayer: PlayerInput = {
        externalId: 'mlb-665742',
        name: 'Juan Soto',
        team: 'SD',
        positions: ['OF'],
        league: 'NL',
        playerType: 'hitter',
        injuryStatus: 'active',
        batSide: 'L',
        active: true,
      };

      const created = await playersService.createPlayer(newPlayer);

      expect(created.name).toBe('Juan Soto');
      expect(created.team).toBe('SD');
      expect(created._id).toBeDefined();
    });

    it('should create player with multiple positions', async () => {
      const newPlayer: PlayerInput = {
        externalId: 'mlb-660271-test',
        name: 'Shohei Ohtani',
        team: 'LAA',
        positions: ['DH', 'SP'],
        league: 'AL',
        playerType: 'pitcher',
        injuryStatus: 'active',
        pitchHand: 'R',
        active: true,
      };

      const created = await playersService.createPlayer(newPlayer);

      expect(created.positions).toHaveLength(2);
      expect(created.positions).toContain('DH');
      expect(created.positions).toContain('SP');
    });
  });

  describe('upsertPlayer', () => {
    it('should create a new player if externalId does not exist', async () => {
      const newPlayer: PlayerInput = {
        externalId: 'mlb-999999',
        name: 'New Player',
        team: 'BOS',
        positions: ['SS'],
        league: 'AL',
        playerType: 'hitter',
        injuryStatus: 'active',
        batSide: 'R',
        active: true,
      };

      const created = await playersService.upsertPlayer(newPlayer);

      expect(created.name).toBe('New Player');
      expect(created.externalId).toBe('mlb-999999');
    });

    it('should update existing player if externalId matches', async () => {
      const updatedPlayer: PlayerInput = {
        externalId: 'mlb-592450',
        name: 'Aaron Judge Updated',
        team: 'NYY',
        positions: ['OF', 'DH'],
        league: 'AL',
        playerType: 'hitter',
        injuryStatus: 'day-to-day',
        batSide: 'R',
        active: true,
      };

      const updated = await playersService.upsertPlayer(updatedPlayer);

      expect(updated.name).toBe('Aaron Judge Updated');
      expect(updated.positions).toContain('DH');
      expect(updated.injuryStatus).toBe('day-to-day');
    });
  });
});
