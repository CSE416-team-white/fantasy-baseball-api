import { z } from 'zod';

// Zod schemas
export const PlayerPositionSchema = z.enum([
  'C', // Catcher
  '1B', // First Base
  '2B', // Second Base
  '3B', // Third Base
  'SS', // Shortstop
  'OF', // Outfield
  'DH', // Designated Hitter
  'SP', // Starting Pitcher
  'RP', // Relief Pitcher
]);

// Hitter stats from previous seasons
export const HitterStatsSchema = z.object({
  season: z.string(), // e.g. "2023"
  ba: z.number().min(0).max(1).optional(), // Batting Average
  hr: z.number().int().min(0).optional(), // Home Runs
  rbi: z.number().int().min(0).optional(), // Runs Batted In
  walk: z.number().int().min(0).optional(), // Walks
  sb: z.number().int().min(0).optional(), // Stolen Bases
});

// Pitcher stats from previous seasons
export const PitcherStatsSchema = z.object({
  season: z.string(), // e.g. "2023"
  era: z.number().min(0).optional(), // Earned Run Average
  wins: z.number().int().min(0).optional(), // Wins
  losses: z.number().int().min(0).optional(), // Losses
  saves: z.number().int().min(0).optional(), // Saves
  strikeouts: z.number().int().min(0).optional(), // Strikeouts
  innings: z.number().min(0).optional(), // Innings pitched
});

// Discriminated union for stats
export const PlayerStatSchema = z.discriminatedUnion('type', [
  z.object({
    season: z.string(),
    type: z.literal('hitter'),
    data: HitterStatsSchema.omit({ season: true }),
  }),
  z.object({
    season: z.string(),
    type: z.literal('pitcher'),
    data: PitcherStatsSchema.omit({ season: true }),
  }),
]);

export const LeagueSchema = z.enum(['AL', 'NL']);

export const DepthChartStatusSchema = z.enum([
  'starter',
  'backup',
  'reserve',
  'minors',
]);

export const InjuryStatusSchema = z.enum([
  'active',
  'day-to-day',
  'il-10', // 10-day injured list
  'il-15', // 15-day injured list
  'il-60', // 60-day injured list
  'out',
]);

export const PlayerSchema = z.object({
  externalId: z.string().min(1), // MLB API player ID for upserting
  name: z.string().min(1).trim(),
  team: z.string().length(3).toUpperCase(),
  positions: z.array(PlayerPositionSchema).min(1),
  league: LeagueSchema,
  playerType: z.enum(['hitter', 'pitcher']), // Discriminator: hitter or pitcher
  stats: z.array(PlayerStatSchema).optional(), // Historical stats by season and type
  depthChartStatus: DepthChartStatusSchema.optional(),
  depthChartOrder: z.number().int().min(1).optional(), // 1 = starter, 2 = first backup, etc.
  injuryStatus: InjuryStatusSchema.default('active'),
  injuryNote: z.string().optional(),
});

export const PlayerFiltersSchema = z.object({
  league: z.enum(['AL', 'NL', 'MLB']).optional(),
  position: PlayerPositionSchema.optional(),
  playerType: z.enum(['hitter', 'pitcher']).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

// Infer TypeScript types from Zod schemas
export type PlayerPosition = z.infer<typeof PlayerPositionSchema>;
export type League = z.infer<typeof LeagueSchema>;
export type DepthChartStatus = z.infer<typeof DepthChartStatusSchema>;
export type InjuryStatus = z.infer<typeof InjuryStatusSchema>;
export type HitterStats = z.infer<typeof HitterStatsSchema>;
export type PitcherStats = z.infer<typeof PitcherStatsSchema>;
export type PlayerStat = z.infer<typeof PlayerStatSchema>;
export type PlayerInput = z.infer<typeof PlayerSchema>;
export type PlayerFilters = z.infer<typeof PlayerFiltersSchema>;

// Database document type (includes Mongoose fields)
export interface Player extends PlayerInput {
  _id: string;
  createdAt: Date;
  updatedAt: Date;
}
