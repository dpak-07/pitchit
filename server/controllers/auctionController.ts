import { Request, Response, NextFunction } from 'express';
import { db, IPlayer } from '../models';
import { AuthRequest } from '../middleware/auth';
import { AuctionService } from '../services/auctionService';
import { sampleFootballPlayers } from '../data/seedPlayers';

export async function createAuction(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const hostId = req.user!.userId;
    const {
      name,
      scheduledAt,
      mode,
      purse,
      squadMin,
      squadMax,
      yearFrom,
      yearTo,
      basePrice,
      increment,
      timerSeconds,
      maxTeams,
    } = req.body;

    const roomCode = AuctionService.generateRoomCode(mode === 'live' ? 'LIV' : 'MAN');
    const auctioneerCode = mode === 'manual' ? AuctionService.generateRoomCode('HST') : undefined;

    // Filter seed players by year range
    const filteredSeed = sampleFootballPlayers.filter(
      p => p.year >= (yearFrom || 2010) && p.year <= (yearTo || 2024)
    );

    const playersToSeed = filteredSeed.length >= 10 ? filteredSeed : sampleFootballPlayers;

    // Create auction record first
    const auction = await db.auctions.create({
      hostId,
      name,
      mode,
      status: 'lobby',
      roomCode,
      auctioneerCode,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : new Date(),
      config: {
        purse,
        squadMin,
        squadMax,
        yearFrom,
        yearTo,
        basePrice,
        increment,
        timerSeconds,
        maxTeams,
      },
      currentBid: 0,
      paused: false,
      playerOrder: [],
    });

    const auctionId = auction._id.toString();

    // Insert players into the auction
    const createdPlayers: IPlayer[] = [];
    for (const playerTemplate of playersToSeed) {
      const p = await db.players.create({
        ...playerTemplate,
        basePrice: Math.max(playerTemplate.basePrice, basePrice),
        auctionId,
        status: 'pending',
      });
      createdPlayers.push(p);
    }

    // Shuffle player order
    const playerOrder = createdPlayers.map(p => (p._id || '').toString()).sort(() => Math.random() - 0.5);

    const updatedAuction = await db.auctions.findByIdAndUpdate(auctionId, {
      playerOrder,
      currentPlayerId: playerOrder[0] || null,
    }, { new: true });

    return res.status(201).json({
      message: 'Auction created successfully',
      auction: updatedAuction,
      roomCode,
      auctioneerCode,
      playerCount: createdPlayers.length,
    });
  } catch (error) {
    next(error);
  }
}

export async function getMyAuctions(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const hostId = req.user!.userId;
    const auctions = await db.auctions.find({ hostId });

    const enriched = await Promise.all(
      auctions.map(async (auc: any) => {
        const teams = await db.teams.find({ auctionId: auc._id.toString() });
        const players = await db.players.find({ auctionId: auc._id.toString() });
        return {
          ...auc,
          teamsCount: teams.length,
          totalPlayersCount: players.length,
          soldPlayersCount: players.filter((p: any) => p.status === 'sold').length,
          unsoldPlayersCount: players.filter((p: any) => p.status === 'unsold').length,
        };
      })
    );

    return res.json({ auctions: enriched });
  } catch (error) {
    next(error);
  }
}

export async function getAuctionById(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const auction = await db.auctions.findById(id);
    if (!auction) {
      return res.status(404).json({ error: 'Auction not found' });
    }

    const teams = await db.teams.find({ auctionId: id });
    const allPlayers = await db.players.find({ auctionId: id });
    const currentPlayer = auction.currentPlayerId
      ? await db.players.findById(auction.currentPlayerId)
      : null;

    const bids = auction.currentPlayerId
      ? await db.bids.find({ auctionId: id, playerId: auction.currentPlayerId })
      : [];

    // Check if requester is host
    const isHost = req.user && req.user.userId === auction.hostId;
    const auctioneerCodeFromQuery = req.query.auctioneerCode as string | undefined;
    const hasHostPrivilege = isHost || (auction.auctioneerCode && auctioneerCodeFromQuery === auction.auctioneerCode);

    return res.json({
      auction: {
        ...auction,
        // Hide auctioneerCode from regular players unless authorized
        auctioneerCode: hasHostPrivilege ? auction.auctioneerCode : undefined,
      },
      teams,
      currentPlayer,
      bids,
      stats: {
        totalPlayers: allPlayers.length,
        soldCount: allPlayers.filter((p: any) => p.status === 'sold').length,
        unsoldCount: allPlayers.filter((p: any) => p.status === 'unsold').length,
        pendingCount: allPlayers.filter((p: any) => p.status === 'pending').length,
      },
      isHost: hasHostPrivilege,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateAuction(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const auction = await db.auctions.findById(id);
    if (!auction) return res.status(404).json({ error: 'Auction not found' });

    if (auction.hostId !== req.user!.userId) {
      return res.status(403).json({ error: 'Only the host can edit this auction' });
    }

    if (auction.status === 'live' || auction.status === 'ended') {
      return res.status(400).json({ error: 'Cannot edit an auction that is live or ended' });
    }

    const updated = await db.auctions.findByIdAndUpdate(id, {
      ...req.body,
    }, { new: true });

    return res.json({ message: 'Auction updated', auction: updated });
  } catch (error) {
    next(error);
  }
}

export async function deleteAuction(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const auction = await db.auctions.findById(id);
    if (!auction) return res.status(404).json({ error: 'Auction not found' });

    if (auction.hostId !== req.user!.userId) {
      return res.status(403).json({ error: 'Only the host can delete this auction' });
    }

    if (auction.status === 'live') {
      return res.status(400).json({ error: 'Cannot delete an active live auction. End it first.' });
    }

    await db.auctions.deleteOne(id);
    await db.teams.deleteMany({ auctionId: id });
    await db.players.deleteMany({ auctionId: id });
    await db.bids.deleteMany({ auctionId: id });

    return res.json({ message: 'Auction deleted successfully' });
  } catch (error) {
    next(error);
  }
}

export async function joinAuction(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { roomCode, teamName, color, logo } = req.body;
    const userId = req.user!.userId;

    const auction = await db.auctions.findOne({ roomCode: roomCode.toUpperCase() });
    if (!auction) {
      return res.status(404).json({ error: 'Invalid room code. Auction not found.' });
    }

    if (auction.status === 'ended') {
      return res.status(400).json({ error: 'This auction has already ended' });
    }

    const auctionId = auction._id.toString();

    // Check if user already has a team in this auction (reconnect support)
    const existingUserTeam = await db.teams.findOne({ auctionId, ownerId: userId });
    if (existingUserTeam) {
      // Update team visuals if provided
      const updatedTeam = await db.teams.findByIdAndUpdate(existingUserTeam._id.toString(), {
        name: teamName || existingUserTeam.name,
        color: color || existingUserTeam.color,
        logo: logo || existingUserTeam.logo,
      }, { new: true });

      const allTeams = await db.teams.find({ auctionId });
      AuctionService.broadcastToRoom(auction.roomCode, 'lobby-update', { teams: allTeams });

      return res.json({
        message: 'Rejoined auction successfully',
        auction,
        team: updatedTeam,
      });
    }

    // Check max teams
    const currentTeams = await db.teams.find({ auctionId });
    if (currentTeams.length >= (auction.config.maxTeams || 8)) {
      return res.status(400).json({ error: `Room is full. Maximum ${auction.config.maxTeams} teams allowed.` });
    }

    // Check duplicate team name in this auction
    const duplicateName = currentTeams.some(t => t.name.toLowerCase() === teamName.trim().toLowerCase());
    if (duplicateName) {
      return res.status(400).json({ error: 'A team with this name is already registered in this auction' });
    }

    // Create new Team
    const newTeam = await db.teams.create({
      auctionId,
      ownerId: userId,
      name: teamName.trim(),
      color: color || '#10b981',
      logo: logo || '⚽',
      purseLeft: auction.config.purse,
      squad: [],
    });

    const updatedTeams = await db.teams.find({ auctionId });
    AuctionService.broadcastToRoom(auction.roomCode, 'lobby-update', { teams: updatedTeams });

    return res.status(201).json({
      message: 'Joined auction room successfully',
      auction,
      team: newTeam,
    });
  } catch (error) {
    next(error);
  }
}

export async function startAuction(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const auction = await db.auctions.findById(id);
    if (!auction) return res.status(404).json({ error: 'Auction not found' });

    // Host verification
    const isHost = req.user?.userId === auction.hostId;
    const code = req.headers['x-auctioneer-code'] || req.body.auctioneerCode;
    if (!isHost && (!auction.auctioneerCode || code !== auction.auctioneerCode)) {
      return res.status(403).json({ error: 'Unauthorized: Auctioneer permission required' });
    }

    const startedAuction = await AuctionService.startAuction(id);
    return res.json({ message: 'Auction started', auction: startedAuction });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}

export async function pauseAuction(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const updated = await AuctionService.pauseAuction(id);
    return res.json({ message: 'Auction paused', auction: updated });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}

export async function resumeAuction(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const updated = await AuctionService.resumeAuction(id);
    return res.json({ message: 'Auction resumed', auction: updated });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}

export async function skipPlayer(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const result = await AuctionService.skipPlayer(id);
    return res.json({ message: 'Player skipped (unsold)', result });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}

export async function manualSell(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { unsold, teamId, amount } = req.body;
    const result = await AuctionService.manualSell(id, { unsold, teamId, amount });
    return res.json({ message: 'Manual sale processed', result });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}

export async function undoLastSale(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const result = await AuctionService.undoLastSale(id);
    return res.json({ message: 'Last sale undone', result });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}

export async function endAuction(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const result = await AuctionService.endAuction(id);
    return res.json({ message: 'Auction ended', auction: result });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}

export async function kickTeam(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id, teamId } = req.params;
    const auction = await db.auctions.findById(id);
    if (!auction) return res.status(404).json({ error: 'Auction not found' });

    if (auction.hostId !== req.user!.userId) {
      return res.status(403).json({ error: 'Only the host can kick teams' });
    }

    const team = await db.teams.findById(teamId);
    if (!team) return res.status(404).json({ error: 'Team not found' });

    await db.teams.deleteOne(teamId);
    const updatedTeams = await db.teams.find({ auctionId: id });
    AuctionService.broadcastToRoom(auction.roomCode, 'lobby-update', { teams: updatedTeams });

    return res.json({ message: 'Team removed from auction', teams: updatedTeams });
  } catch (error) {
    next(error);
  }
}

export async function getAuctionResults(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const auction = await db.auctions.findById(id);
    if (!auction) return res.status(404).json({ error: 'Auction not found' });

    const teams = await db.teams.find({ auctionId: id });
    const players = await db.players.find({ auctionId: id });

    const soldPlayers = players.filter((p: any) => p.status === 'sold');
    const unsoldPlayers = players.filter((p: any) => p.status === 'unsold');

    // Enrich teams with squad calculations
    const enrichedTeams = teams.map((team: any) => {
      const totalSpent = (team.squad || []).reduce((acc: number, item: any) => acc + (item.price || 0), 0);
      return {
        ...team,
        totalSpent,
        squadCount: team.squad?.length || 0,
      };
    });

    return res.json({
      auction,
      teams: enrichedTeams,
      soldPlayers,
      unsoldPlayers,
      totalPlayers: players.length,
    });
  } catch (error) {
    next(error);
  }
}

export async function getMyTeams(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const ownerId = req.user!.userId;
    const teams = await db.teams.find({ ownerId });

    const enriched = await Promise.all(
      teams.map(async (team: any) => {
        const auction = await db.auctions.findById(team.auctionId);
        return {
          ...team,
          auction,
        };
      })
    );

    return res.json({ teams: enriched });
  } catch (error) {
    next(error);
  }
}
