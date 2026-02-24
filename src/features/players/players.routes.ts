import { Router } from 'express';
import type { Request, Response } from 'express';
import { playersService } from './players.service.js';
import { sendSuccess, sendPaginated } from '@/shared/utils/response.js';
import { asyncHandler } from '@/shared/middlewares/async-handler.js';
import { ApiError } from '@/shared/utils/api-error.js';
import { PlayerFiltersSchema } from './players.types.js';

const router = Router();

/**
 * @swagger
 * /api/players:
 *   get:
 *     summary: Get all players with optional filters
 *     parameters:
 *       - in: query
 *         name: league
 *         schema:
 *           type: string
 *           enum: [AL, NL, MLB]
 *       - in: query
 *         name: position
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 */
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const filters = PlayerFiltersSchema.parse(req.query);
    const { players, pagination } = await playersService.getPlayers(filters);
    sendPaginated(res, players, pagination);
  }),
);

/**
 * @swagger
 * /api/players/{id}:
 *   get:
 *     summary: Get a single player by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 */
router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const player = await playersService.getPlayerById(id as string);
    if (!player) {
      throw new ApiError(404, 'Player not found');
    }
    sendSuccess(res, player);
  }),
);

export default router;
