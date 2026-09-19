import { Router } from 'express';
import {
  createAuction,
  getMyAuctions,
  getAuctionById,
  updateAuction,
  deleteAuction,
  joinAuction,
  startAuction,
  pauseAuction,
  resumeAuction,
  skipPlayer,
  manualSell,
  undoLastSale,
  endAuction,
  kickTeam,
  getAuctionResults,
  getMyTeams,
} from '../controllers/auctionController';
import {
  getAuctionPlayers,
  addPlayersToAuction,
  resetWithSeedPlayers,
} from '../controllers/playerController';
import { requireAuth, requireRole } from '../middleware/auth';
import { validateBody, createAuctionSchema, joinAuctionSchema, manualSellSchema } from '../middleware/validate';

const router = Router();

// Host specific routes
router.post('/', requireAuth, requireRole('auctioneer'), validateBody(createAuctionSchema), createAuction);
router.get('/mine', requireAuth, getMyAuctions);
router.get('/teams/my', requireAuth, getMyTeams);

// Join auction
router.post('/join', requireAuth, validateBody(joinAuctionSchema), joinAuction);

// Single auction routes
router.get('/:id', requireAuth, getAuctionById);
router.put('/:id', requireAuth, requireRole('auctioneer'), updateAuction);
router.delete('/:id', requireAuth, requireRole('auctioneer'), deleteAuction);

// Players management
router.get('/:id/players', requireAuth, getAuctionPlayers);
router.post('/:id/players', requireAuth, requireRole('auctioneer'), addPlayersToAuction);
router.post('/:id/players/seed', requireAuth, requireRole('auctioneer'), resetWithSeedPlayers);

// Host control actions
router.post('/:id/start', requireAuth, startAuction);
router.post('/:id/pause', requireAuth, pauseAuction);
router.post('/:id/resume', requireAuth, resumeAuction);
router.post('/:id/skip', requireAuth, skipPlayer);
router.post('/:id/undo', requireAuth, undoLastSale);
router.post('/:id/end', requireAuth, endAuction);
router.delete('/:id/teams/:teamId', requireAuth, kickTeam);

// Manual sell
router.post('/:id/manual-sell', requireAuth, validateBody(manualSellSchema), manualSell);

// Results
router.get('/:id/results', getAuctionResults);

export default router;
