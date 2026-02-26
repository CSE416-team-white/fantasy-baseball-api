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
  jerseyNumber: z.string().optional(),
  depthChartStatus: DepthChartStatusSchema.optional(),
  depthChartOrder: z.number().int().min(1).optional(), // 1 = starter, 2 = first backup, etc.
  injuryStatus: InjuryStatusSchema.default('active'),
  injuryNote: z.string().optional(),

  // Player details from MLB API
  birthDate: z.string().optional(),
  age: z.number().int().optional(),
  height: z.string().optional(),
  weight: z.number().int().optional(),
  batSide: z.enum(['R', 'L', 'S']).optional(), // Right, Left, Switch
  pitchHand: z.enum(['R', 'L']).optional(),
  mlbDebutDate: z.string().optional(),
  active: z.boolean().default(true),
});

export const PlayerFiltersSchema = z.object({
  league: z.enum(['AL', 'NL', 'MLB']).optional(),
  position: PlayerPositionSchema.optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

// Infer TypeScript types from Zod schemas
export type PlayerPosition = z.infer<typeof PlayerPositionSchema>;
export type League = z.infer<typeof LeagueSchema>;
export type DepthChartStatus = z.infer<typeof DepthChartStatusSchema>;
export type InjuryStatus = z.infer<typeof InjuryStatusSchema>;
export type PlayerInput = z.infer<typeof PlayerSchema>;
export type PlayerFilters = z.infer<typeof PlayerFiltersSchema>;

// Database document type (includes Mongoose fields)
export interface Player extends PlayerInput {
  _id: string;
  createdAt: Date;
  updatedAt: Date;
}
