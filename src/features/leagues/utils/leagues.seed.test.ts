import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { seedDefaultLeagues } from './leagues.seed.js';
import { leaguesService } from '../leagues.service.js';
import { LeagueModel } from '../leagues.model.js';

describe('seedDefaultLeagues', () => {
  beforeEach(async () => {
    // Clear database before each test
    await LeagueModel.deleteMany({});
  });

  afterEach(async () => {
    // Clean up after each test
    await LeagueModel.deleteMany({});
  });

  it('should seed default leagues on first run', async () => {
    await seedDefaultLeagues();

    const count = await LeagueModel.countDocuments();
    expect(count).toBeGreaterThan(0);
  });

  it('should seed exactly 6 default leagues', async () => {
    await seedDefaultLeagues();

    const count = await LeagueModel.countDocuments();
    expect(count).toBe(6);
  });

  it('should not duplicate leagues on subsequent runs', async () => {
    // First seed
    await seedDefaultLeagues();
    const firstCount = await LeagueModel.countDocuments();

    // Second seed
    await seedDefaultLeagues();
    const secondCount = await LeagueModel.countDocuments();

    expect(firstCount).toBe(secondCount);
    expect(firstCount).toBe(6);
  });

  it('should seed leagues with all required fields', async () => {
    await seedDefaultLeagues();

    const leagues = await LeagueModel.find({});

    for (const league of leagues) {
      expect(league.externalId).toBeDefined();
      expect(league.name).toBeDefined();
      expect(league.description).toBeDefined();
      expect(league.format).toBeDefined();
      expect(league.draftType).toBeDefined();
    }
  });

  it('should seed leagues with valid formats', async () => {
    await seedDefaultLeagues();

    const leagues = await LeagueModel.find({});
    const validFormats = ['roto', 'h2h-categories', 'h2h-points'];

    for (const league of leagues) {
      expect(validFormats).toContain(league.format);
    }
  });

  it('should seed leagues with valid draft types', async () => {
    await seedDefaultLeagues();

    const leagues = await LeagueModel.find({});
    const validDraftTypes = ['snake', 'auction'];

    for (const league of leagues) {
      expect(validDraftTypes).toContain(league.draftType);
    }
  });

  it('should seed standard 5x5 roto auction league', async () => {
    await seedDefaultLeagues();

    const league = await LeagueModel.findOne({
      externalId: 'standard-5x5-roto-auction',
    });

    expect(league).toBeDefined();
    expect(league?.name).toBe('Standard 5x5 Roto (Auction)');
    expect(league?.format).toBe('roto');
    expect(league?.draftType).toBe('auction');
  });

  it('should seed standard 5x5 roto snake league', async () => {
    await seedDefaultLeagues();

    const league = await LeagueModel.findOne({
      externalId: 'standard-5x5-roto-snake',
    });

    expect(league).toBeDefined();
    expect(league?.name).toBe('Standard 5x5 Roto (Snake)');
    expect(league?.format).toBe('roto');
    expect(league?.draftType).toBe('snake');
  });

  it('should seed obp league', async () => {
    await seedDefaultLeagues();

    const league = await LeagueModel.findOne({
      externalId: 'obp-league-auction',
    });

    expect(league).toBeDefined();
    expect(league?.name).toBe('OBP League (Auction)');
    expect(league?.format).toBe('roto');
    expect(league?.draftType).toBe('auction');
  });

  it('should seed 6x6 roto league with quality starts', async () => {
    await seedDefaultLeagues();

    const league = await LeagueModel.findOne({
      externalId: '6x6-roto-qs-auction',
    });

    expect(league).toBeDefined();
    expect(league?.name).toBe('6x6 Roto with QS (Auction)');
    expect(league?.format).toBe('roto');
    expect(league?.draftType).toBe('auction');
  });

  it('should seed deep league format', async () => {
    await seedDefaultLeagues();

    const deepLeague = await LeagueModel.findOne({
      externalId: 'deep-league-auction',
    });

    expect(deepLeague).toBeDefined();
    expect(deepLeague?.name).toBe('Deep League (Auction)');
  });

  it('should handle errors gracefully', async () => {
    // Spy on console.error
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    // Mock upsertLeagues to throw an error
    const originalUpsertLeagues = leaguesService.upsertLeagues;
    leaguesService.upsertLeagues = vi
      .fn()
      .mockRejectedValue(new Error('Database error'));

    // Should not throw
    await expect(seedDefaultLeagues()).resolves.not.toThrow();

    // Should log error
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to seed default leagues:',
      expect.any(Error),
    );

    // Restore
    leaguesService.upsertLeagues = originalUpsertLeagues;
    consoleErrorSpy.mockRestore();
  });

  it('should log success message when seeding completes', async () => {
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await seedDefaultLeagues();

    expect(consoleLogSpy).toHaveBeenCalledWith('Seeding default leagues...');
    expect(consoleLogSpy).toHaveBeenCalledWith('✓ Seeded 6 default leagues');

    consoleLogSpy.mockRestore();
  });

  it('should have unique externalIds for all leagues', async () => {
    await seedDefaultLeagues();

    const leagues = await LeagueModel.find({});
    const externalIds = leagues.map((l) => l.externalId);
    const uniqueIds = new Set(externalIds);

    expect(uniqueIds.size).toBe(leagues.length);
  });

  it('should seed leagues with valid roster slots', async () => {
    await seedDefaultLeagues();

    const leagues = await LeagueModel.find({});

    for (const league of leagues) {
      expect(league.rosterSlots).toBeDefined();
      expect(league.rosterSlots.C).toBeGreaterThanOrEqual(0);
      expect(league.rosterSlots.SP).toBeGreaterThanOrEqual(0);
    }
  });

  it('should seed leagues with batting and pitching categories', async () => {
    await seedDefaultLeagues();

    const leagues = await LeagueModel.find({});

    for (const league of leagues) {
      expect(league.battingCategories.length).toBeGreaterThan(0);
      expect(league.pitchingCategories.length).toBeGreaterThan(0);
    }
  });
});
