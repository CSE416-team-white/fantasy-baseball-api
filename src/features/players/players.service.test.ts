import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { playersService } from './players.service.js';
import { PlayerModel } from './players.model.js';
import type { PlayerInput } from './players.types.js';

describe('PlayersService', () => {
  const mockPlayers: PlayerInput[] = [
    {
      name: 'Aaron Judge',
      team: 'NYY',
      positions: ['OF'],
      league: 'AL',
    },
    {
      name: 'Shohei Ohtani',
      team: 'LAA',
      positions: ['DH', 'SP'],
      league: 'AL',
    },
    {
      name: 'Mookie Betts',
      team: 'LAD',
      positions: ['OF'],
      league: 'NL',
    },
    {
      name: 'Freddie Freeman',
      team: 'LAD',
      positions: ['1B'],
      league: 'NL',
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
      expect(
        result.players.every((p) => p.positions.includes('OF')),
      ).toBe(true);
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
      const created = await PlayerModel.create(mockPlayers[0]);
      const player = await playersService.getPlayerById(
        created._id.toString(),
      );

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
        name: 'Juan Soto',
        team: 'SD',
        positions: ['OF'],
        league: 'NL',
      };

      const created = await playersService.createPlayer(newPlayer);

      expect(created.name).toBe('Juan Soto');
      expect(created.team).toBe('SD');
      expect(created._id).toBeDefined();
    });

    it('should create player with multiple positions', async () => {
      const newPlayer: PlayerInput = {
        name: 'Shohei Ohtani',
        team: 'LAA',
        positions: ['DH', 'SP'],
        league: 'AL',
      };

      const created = await playersService.createPlayer(newPlayer);

      expect(created.positions).toHaveLength(2);
      expect(created.positions).toContain('DH');
      expect(created.positions).toContain('SP');
    });
  });

  describe('clearPlayers', () => {
    it('should delete all players', async () => {
      await playersService.clearPlayers();

      const count = await PlayerModel.countDocuments();
      expect(count).toBe(0);
    });
  });
});
