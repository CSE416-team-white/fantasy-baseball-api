import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createSamplePlayers } from './create-sample-players.js';
import { playersService } from '../players.service.js';
import { PlayerModel } from '../players.model.js';
import type { Player } from '../players.types.js';

describe('create-sample-player script', () => {
  beforeEach(async () => {
    // Clear database before each test
    await PlayerModel.deleteMany({});
  });

  afterEach(async () => {
    // Clean up after each test
    await PlayerModel.deleteMany({});
  });

  it('should return 18 sample players', async () => {
    const players = await createSamplePlayers();
    expect(players).toHaveLength(18);
  });

  it('should have 2 players for each position', async () => {
    const players = await createSamplePlayers();

    const positions = ['C', '1B', '2B', '3B', 'SS', 'OF', 'DH', 'SP', 'RP'];

    for (const position of positions) {
      const playersInPosition = players.filter((p) =>
        p.positions.includes(position),
      );
      expect(playersInPosition).toHaveLength(2);
    }
  });

  it('should have 14 hitters and 4 pitchers', async () => {
    const players = await createSamplePlayers();

    const hitters = players.filter((p) => p.playerType === 'hitter');
    const pitchers = players.filter((p) => p.playerType === 'pitcher');

    expect(hitters).toHaveLength(14);
    expect(pitchers).toHaveLength(4);
  });

  it('should create all sample players in database', async () => {
    const players = await createSamplePlayers();

    for (const player of players) {
      await playersService.createPlayer(player as Player);
    }

    const total = await PlayerModel.countDocuments();
    expect(total).toBe(18);
  });

  it('should have valid stats for hitters', async () => {
    const players = await createSamplePlayers();
    const hitters = players.filter((p) => p.playerType === 'hitter');

    for (const hitter of hitters) {
      if (hitter.stats && hitter.stats.length > 0) {
        const stat = hitter.stats[0];
        expect(stat.type).toBe('hitter');
        expect(stat.data).toHaveProperty('ba');
        expect(stat.data).toHaveProperty('hr');
        expect(stat.data).toHaveProperty('rbi');
      }
    }
  });

  it('should have valid stats for pitchers', async () => {
    const players = await createSamplePlayers();
    const pitchers = players.filter((p) => p.playerType === 'pitcher');

    for (const pitcher of pitchers) {
      if (pitcher.stats && pitcher.stats.length > 0) {
        const stat = pitcher.stats[0];
        expect(stat.type).toBe('pitcher');
        expect(stat.data).toHaveProperty('era');
        expect(stat.data).toHaveProperty('wins');
        expect(stat.data).toHaveProperty('losses');
      }
    }
  });

  it('should have all required fields for each player', async () => {
    const players = await createSamplePlayers();

    for (const player of players) {
      expect(player).toHaveProperty('externalId');
      expect(player).toHaveProperty('name');
      expect(player).toHaveProperty('team');
      expect(player).toHaveProperty('positions');
      expect(player).toHaveProperty('league');
      expect(player).toHaveProperty('playerType');
      expect(player).toHaveProperty('depthChartStatus');
      expect(player.positions).toBeInstanceOf(Array);
      expect(player.positions.length).toBeGreaterThan(0);
      expect(['hitter', 'pitcher']).toContain(player.playerType);
    }
  });

  it('should have unique externalIds', async () => {
    const players = await createSamplePlayers();
    const ids = players.map((p) => p.externalId);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(18);
  });
});
