import { Router } from 'express';
import type { Request, Response } from 'express';
import { PlayerModel } from './players.model.js';
import { playersService } from './players.service.js';
import { sendSuccess, sendPaginated } from '@/shared/utils/response.js';
import { asyncHandler } from '@/shared/middlewares/async-handler.js';
import { ApiError } from '@/shared/utils/api-error.js';
import { PlayerFiltersSchema } from './players.types.js';
import { triggerPlayerSyncNow } from '@/jobs/sync-players.job.js';
import { triggerDepthChartSyncNow } from '@/jobs/sync-depth-charts.job.js';
import { notificationsService } from '../notifications/notifications.service.js';

const router = Router();
const FAKE_PERSON_EXTERNAL_ID = 'test-fake-person';

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function buildFakePerson(injuryStatus: 'active' | 'il-10' = 'active') {
  return {
    externalId: FAKE_PERSON_EXTERNAL_ID,
    name: 'Fake Person',
    team: 'TST',
    positions: ['OF'] as 'OF'[],
    league: 'AL' as const,
    playerType: 'hitter' as const,
    injuryStatus,
    injuryNote:
      injuryStatus === 'active'
        ? 'Cleared for full activity'
        : 'Test hamstring tightness',
    active: injuryStatus === 'active',
    age: randomInt(21, 34),
    batSide: 'R' as const,
    stats: [
      {
        season: String(new Date().getFullYear() - 1),
        type: 'hitter' as const,
        data: {
          ba: Number((0.22 + Math.random() * 0.12).toFixed(3)),
          hr: randomInt(8, 38),
          rbi: randomInt(25, 110),
          walk: randomInt(15, 85),
          sb: randomInt(0, 30),
        },
      },
    ],
  };
}

async function getFakePerson() {
  return PlayerModel.findOne({ externalId: FAKE_PERSON_EXTERNAL_ID }).lean();
}

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
 *         name: playerType
 *         schema:
 *           type: string
 *           enum: [hitter, pitcher]
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
 * /api/players/sync:
 *   post:
 *     summary: Manually trigger player sync from MLB API
 */
router.post(
  '/sync',
  asyncHandler(async (_req: Request, res: Response) => {
    await triggerPlayerSyncNow();
    sendSuccess(res, { message: 'Player sync triggered successfully' });
  }),
);

/**
 * @swagger
 * /api/players/sync-depth-charts:
 *   post:
 *     summary: Manually trigger depth chart sync from ESPN API
 */
router.post(
  '/sync-depth-charts',
  asyncHandler(async (_req: Request, res: Response) => {
    await triggerDepthChartSyncNow();
    sendSuccess(res, { message: 'Depth chart sync triggered successfully' });
  }),
);

router.get(
  '/test/fake-person',
  asyncHandler(async (_req: Request, res: Response) => {
    const player = await getFakePerson();

    sendSuccess(res, {
      exists: Boolean(player),
      player: player ?? null,
    });
  }),
);

router.post(
  '/test/fake-person',
  asyncHandler(async (_req: Request, res: Response) => {
    const player = await playersService.upsertPlayer(buildFakePerson('active'));

    sendSuccess(res, {
      action: 'added',
      player,
    });
  }),
);

router.delete(
  '/test/fake-person',
  asyncHandler(async (_req: Request, res: Response) => {
    const deleted = await PlayerModel.findOneAndDelete({
      externalId: FAKE_PERSON_EXTERNAL_ID,
    }).lean();

    sendSuccess(res, {
      action: 'removed',
      existed: Boolean(deleted),
    });
  }),
);

router.post(
  '/test/fake-person/healthy',
  asyncHandler(async (_req: Request, res: Response) => {
    const player = await playersService.upsertPlayer(buildFakePerson('active'));

    sendSuccess(res, {
      action: 'healthy',
      player,
    });
  }),
);

router.post(
  '/test/fake-person/injured',
  asyncHandler(async (_req: Request, res: Response) => {
    const existing = await getFakePerson();
    const player = await playersService.upsertPlayer(buildFakePerson('il-10'));

    let notificationTriggered = false;

    if (!existing || existing.injuryStatus !== 'il-10') {
      notificationTriggered = true;
      await notificationsService.push({
        type: 'player-injury-status-changed',
        message: 'Fake Person is now injured',
        data: {
          playerName: 'Fake Person',
          team: 'TST',
          previousInjuryStatus: existing?.injuryStatus ?? 'missing',
          nextInjuryStatus: 'il-10',
          externalId: FAKE_PERSON_EXTERNAL_ID,
        },
      });
    }

    sendSuccess(res, {
      action: 'injured',
      notificationTriggered,
      player,
    });
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
