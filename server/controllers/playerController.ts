import { Request, Response, NextFunction } from 'express';
import { db, IPlayer } from '../models';
import { AuthRequest } from '../middleware/auth';
import { sampleFootballPlayers } from '../data/seedPlayers';

export async function getAuctionPlayers(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { position, status, search } = req.query;

    let players = await db.players.find({ auctionId: id });

    if (position && typeof position === 'string') {
      players = players.filter((p: any) => p.position === position.toUpperCase());
    }

    if (status && typeof status === 'string') {
      players = players.filter((p: any) => p.status === status.toLowerCase());
    }

    if (search && typeof search === 'string') {
      const q = search.toLowerCase();
      players = players.filter(
        (p: any) =>
          p.name.toLowerCase().includes(q) ||
          p.club.toLowerCase().includes(q) ||
          p.nationality.toLowerCase().includes(q)
      );
    }

    return res.json({ players, count: players.length });
  } catch (error) {
    next(error);
  }
}

export async function addPlayersToAuction(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const auction = await db.auctions.findById(id);
    if (!auction) return res.status(404).json({ error: 'Auction not found' });

    if (auction.hostId !== req.user!.userId) {
      return res.status(403).json({ error: 'Only the host can manage players' });
    }

    if (auction.status === 'live' || auction.status === 'ended') {
      return res.status(400).json({ error: 'Cannot modify player pool while auction is live or ended' });
    }

    const { players, player } = req.body;
    const playerList: any[] = players || (player ? [player] : []);

    if (!Array.isArray(playerList) || playerList.length === 0) {
      return res.status(400).json({ error: 'No players provided' });
    }

    const createdIds: string[] = [];
    for (const p of playerList) {
      const created = await db.players.create({
        name: p.name || 'Unknown Player',
        position: p.position || 'MID',
        club: p.club || 'Free Agent',
        nationality: p.nationality || 'World',
        year: Number(p.year) || 2024,
        rating: Number(p.rating) || 80,
        basePrice: Number(p.basePrice) || auction.config.basePrice || 5,
        imageUrl: p.imageUrl || 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=500&auto=format&fit=crop&q=80',
        auctionId: id,
        status: 'pending',
      });
      createdIds.push(created._id.toString());
    }

    // Append to auction playerOrder
    const currentOrder = auction.playerOrder || [];
    const newOrder = [...currentOrder, ...createdIds];

    await db.auctions.findByIdAndUpdate(id, {
      playerOrder: newOrder,
      currentPlayerId: auction.currentPlayerId || newOrder[0] || null,
    });

    return res.status(201).json({
      message: `Added ${createdIds.length} players to auction pool`,
      count: createdIds.length,
    });
  } catch (error) {
    next(error);
  }
}

export async function resetWithSeedPlayers(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const auction = await db.auctions.findById(id);
    if (!auction) return res.status(404).json({ error: 'Auction not found' });

    if (auction.hostId !== req.user!.userId) {
      return res.status(403).json({ error: 'Only the host can modify player pool' });
    }

    // Delete existing players for this auction
    await db.players.deleteMany({ auctionId: id });

    const createdIds: string[] = [];
    for (const p of sampleFootballPlayers) {
      const created = await db.players.create({
        ...p,
        basePrice: Math.max(p.basePrice, auction.config.basePrice || 5),
        auctionId: id,
        status: 'pending',
      });
      createdIds.push(created._id.toString());
    }

    const shuffled = [...createdIds].sort(() => Math.random() - 0.5);

    await db.auctions.findByIdAndUpdate(id, {
      playerOrder: shuffled,
      currentPlayerId: shuffled[0] || null,
    });

    return res.json({
      message: `Successfully seeded ${createdIds.length} football players`,
      count: createdIds.length,
    });
  } catch (error) {
    next(error);
  }
}
