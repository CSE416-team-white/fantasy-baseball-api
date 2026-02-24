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

export const PlayerSchema = z.object({
  name: z.string().min(1).trim(),
  team: z.string().length(3).toUpperCase(),
  positions: z.array(PlayerPositionSchema).min(1),
  league: LeagueSchema,
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
export type PlayerInput = z.infer<typeof PlayerSchema>;
export type PlayerFilters = z.infer<typeof PlayerFiltersSchema>;

// Database document type (includes Mongoose fields)
export interface Player extends PlayerInput {
  _id: string;
  createdAt: Date;
  updatedAt: Date;
}
