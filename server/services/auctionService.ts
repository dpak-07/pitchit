import { Server as SocketServer } from 'socket.io';
import { db, IAuction, IPlayer, ITeam } from '../models';

// Per-auction mutex lock to guarantee atomic bid processing
const auctionLocks = new Map<string, Promise<any>>();

function withAuctionLock<T>(auctionId: string, fn: () => Promise<T>): Promise<T> {
  const currentLock = auctionLocks.get(auctionId) || Promise.resolve();
  const nextLock = currentLock.then(fn).finally(() => {
    if (auctionLocks.get(auctionId) === nextLock) {
      auctionLocks.delete(auctionId);
    }
  });
  auctionLocks.set(auctionId, nextLock);
  return nextLock;
}

// Timer ticker interval references
const activeTimers = new Map<string, NodeJS.Timeout>();

export class AuctionService {
  private static io: SocketServer | null = null;

  public static setSocketServer(ioServer: SocketServer) {
    AuctionService.io = ioServer;
  }

  public static getSocketServer(): SocketServer | null {
    return AuctionService.io;
  }

  // Calculate maximum allowed bid for a team respecting squad reserve rule
  public static calculateMaxBid(team: ITeam, squadMin: number, basePrice: number): number {
    const currentSquadSize = team.squad?.length || 0;
    const playersStillNeeded = Math.max(0, squadMin - currentSquadSize - 1);
    const requiredReserve = playersStillNeeded * basePrice;
    return Math.max(0, team.purseLeft - requiredReserve);
  }

  // Generate random uppercase alphanumeric codes
  public static generateRoomCode(prefix = ''): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = prefix;
    for (let i = 0; i < (prefix ? 4 : 6); i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // Broadcast helper
  public static broadcastToRoom(roomCode: string, event: string, payload: any) {
    if (AuctionService.io) {
      AuctionService.io.to(`auction_${roomCode}`).emit(event, payload);
    }
  }

  // Start live timer interval for an auction
  public static startLiveTimer(auctionId: string, roomCode: string) {
    // Clear any previous timer
    if (activeTimers.has(auctionId)) {
      clearInterval(activeTimers.get(auctionId)!);
      activeTimers.delete(auctionId);
    }

    const interval = setInterval(async () => {
      try {
        const auction = await db.auctions.findById(auctionId);
        if (!auction || auction.status !== 'live' || auction.paused || !auction.timerEndsAt) {
          return;
        }

        const now = Date.now();
        const endTime = new Date(auction.timerEndsAt).getTime();
        const secondsLeft = Math.max(0, Math.ceil((endTime - now) / 1000));

        AuctionService.broadcastToRoom(roomCode, 'timer-tick', {
          secondsLeft,
          timerEndsAt: auction.timerEndsAt,
        });

        if (secondsLeft <= 0) {
          // Timer expired - process result atomically
          clearInterval(interval);
          activeTimers.delete(auctionId);

          await withAuctionLock(auctionId, async () => {
            await AuctionService.handlePlayerExpiry(auctionId);
          });
        }
      } catch (err) {
        console.error('[Auction Timer Error]', err);
      }
    }, 1000);

    activeTimers.set(auctionId, interval);
  }

  public static clearTimer(auctionId: string) {
    if (activeTimers.has(auctionId)) {
      clearInterval(activeTimers.get(auctionId)!);
      activeTimers.delete(auctionId);
    }
  }

  // Start the auction (requires at least 2 teams)
  public static async startAuction(auctionId: string) {
    return withAuctionLock(auctionId, async () => {
      const auction = await db.auctions.findById(auctionId);
      if (!auction) throw new Error('Auction not found');
      if (auction.status === 'live') throw new Error('Auction is already live');

      const teams = await db.teams.find({ auctionId });
      if (teams.length < 2) {
        throw new Error('At least 2 teams must join the room before starting');
      }

      // Check player order
      if (!auction.playerOrder || auction.playerOrder.length === 0) {
        throw new Error('No players found in this auction pool');
      }

      const firstPlayerId = auction.playerOrder[0];
      const player = await db.players.findById(firstPlayerId);
      if (!player) throw new Error('First player not found');

      const timerDuration = (auction.config.timerSeconds || 15) * 1000;
      const timerEndsAt = auction.mode === 'live' ? new Date(Date.now() + timerDuration) : null;

      const updatedAuction = await db.auctions.findByIdAndUpdate(auctionId, {
        status: 'live',
        paused: false,
        currentPlayerId: firstPlayerId,
        currentBid: 0,
        currentBidderId: null,
        timerEndsAt,
      }, { new: true });

      AuctionService.broadcastToRoom(auction.roomCode, 'auction-started', {
        auction: updatedAuction,
        player,
      });

      AuctionService.broadcastToRoom(auction.roomCode, 'player-up', {
        player,
        currentBid: 0,
        currentBidder: null,
        timerEndsAt,
      });

      if (auction.mode === 'live') {
        AuctionService.startLiveTimer(auctionId, auction.roomCode);
      }

      return updatedAuction;
    });
  }

  // Place a bid in Live Mode
  public static async placeBid(auctionId: string, teamId: string, amount?: number) {
    return withAuctionLock(auctionId, async () => {
      const auction = await db.auctions.findById(auctionId);
      if (!auction) throw new Error('Auction not found');

      if (auction.status !== 'live') {
        throw new Error('Auction is not live');
      }
      if (auction.paused) {
        throw new Error('Auction is paused');
      }
      if (!auction.currentPlayerId) {
        throw new Error('No player is currently up for bidding');
      }

      const player = await db.players.findById(auction.currentPlayerId);
      if (!player) throw new Error('Player not found');

      const team = await db.teams.findById(teamId);
      if (!team || team.auctionId !== auctionId) {
        throw new Error('Team not found in this auction');
      }

      // Squad capacity rule
      if (team.squad && team.squad.length >= auction.config.squadMax) {
        throw new Error(`Team has already reached maximum squad size of ${auction.config.squadMax}`);
      }

      // Same team cannot outbid itself
      if (auction.currentBidderId === teamId) {
        throw new Error('Your team already holds the highest bid');
      }

      // Calculate required bid amount
      const minRequiredBid = auction.currentBid === 0
        ? player.basePrice || auction.config.basePrice
        : auction.currentBid + auction.config.increment;

      const bidAmount = amount ? Math.max(amount, minRequiredBid) : minRequiredBid;

      // Reserve rule validation
      const maxAllowed = AuctionService.calculateMaxBid(team, auction.config.squadMin, auction.config.basePrice);
      if (bidAmount > maxAllowed) {
        throw new Error(`Bid exceeds maximum allowed purse (${maxAllowed}) to fulfill minimum squad reserve`);
      }

      if (bidAmount < minRequiredBid) {
        throw new Error(`Bid must be at least ${minRequiredBid}`);
      }

      // Reset timer on valid bid (per configuration)
      const timerDuration = (auction.config.timerSeconds || 15) * 1000;
      const newTimerEndsAt = new Date(Date.now() + timerDuration);

      // Record bid in log
      const bidRecord = await db.bids.create({
        auctionId,
        playerId: player._id.toString(),
        teamId,
        teamName: team.name,
        amount: bidAmount,
      });

      const updatedAuction = await db.auctions.findByIdAndUpdate(auctionId, {
        currentBid: bidAmount,
        currentBidderId: teamId,
        timerEndsAt: newTimerEndsAt,
      }, { new: true });

      AuctionService.broadcastToRoom(auction.roomCode, 'bid-update', {
        auctionId,
        currentBid: bidAmount,
        currentBidder: {
          id: team._id.toString(),
          name: team.name,
          color: team.color,
          logo: team.logo,
        },
        timerEndsAt: newTimerEndsAt,
        bid: bidRecord,
      });

      // Restart live timer countdown with new timestamp
      AuctionService.startLiveTimer(auctionId, auction.roomCode);

      return { auction: updatedAuction, bid: bidRecord };
    });
  }

  // Handle timer expiry in live mode
  private static async handlePlayerExpiry(auctionId: string) {
    const auction = await db.auctions.findById(auctionId);
    if (!auction || !auction.currentPlayerId) return;

    const playerId = auction.currentPlayerId;
    const player = await db.players.findById(playerId);
    if (!player) return;

    if (auction.currentBidderId && auction.currentBid > 0) {
      // Sold to highest bidder
      const winningTeam = await db.teams.findById(auction.currentBidderId);
      if (winningTeam) {
        const newPurse = Math.max(0, winningTeam.purseLeft - auction.currentBid);
        const squadEntry = {
          playerId: player._id.toString(),
          price: auction.currentBid,
          playerName: player.name,
          position: player.position,
          rating: player.rating,
        };

        await db.teams.findByIdAndUpdate(winningTeam._id.toString(), {
          purseLeft: newPurse,
          $push: { squad: squadEntry },
        });

        await db.players.findByIdAndUpdate(playerId, {
          status: 'sold',
          soldToTeamId: winningTeam._id.toString(),
          soldPrice: auction.currentBid,
        });

        // Save last sold record for host undo
        await db.auctions.findByIdAndUpdate(auctionId, {
          lastSoldRecord: {
            playerId,
            teamId: winningTeam._id.toString(),
            price: auction.currentBid,
          },
        });

        const updatedTeams = await db.teams.find({ auctionId });

        AuctionService.broadcastToRoom(auction.roomCode, 'player-sold', {
          player: { ...player, status: 'sold', soldPrice: auction.currentBid, soldToTeamId: winningTeam._id.toString() },
          team: { id: winningTeam._id.toString(), name: winningTeam.name, color: winningTeam.color },
          price: auction.currentBid,
          teams: updatedTeams,
        });

        AuctionService.broadcastToRoom(auction.roomCode, 'purse-update', {
          teams: updatedTeams,
        });
      }
    } else {
      // Unsold
      await db.players.findByIdAndUpdate(playerId, {
        status: 'unsold',
      });

      AuctionService.broadcastToRoom(auction.roomCode, 'player-unsold', {
        player: { ...player, status: 'unsold' },
      });
    }

    // Advance to next player after 3.5 second intermission
    setTimeout(async () => {
      await withAuctionLock(auctionId, async () => {
        await AuctionService.advanceToNextPlayer(auctionId);
      });
    }, 3500);
  }

  // Advance to next pending player in pool
  public static async advanceToNextPlayer(auctionId: string) {
    const auction = await db.auctions.findById(auctionId);
    if (!auction) return;

    // Check if any teams still have squad slots available
    const teams = await db.teams.find({ auctionId });
    const anyTeamCanBid = teams.some(t => (t.squad?.length || 0) < auction.config.squadMax);

    // Find next pending player from playerOrder
    const currentIndex = auction.playerOrder.indexOf(auction.currentPlayerId || '');
    let nextPlayer: IPlayer | null = null;

    for (let i = currentIndex + 1; i < auction.playerOrder.length; i++) {
      const p = await db.players.findById(auction.playerOrder[i]);
      if (p && p.status === 'pending') {
        nextPlayer = p;
        break;
      }
    }

    if (!nextPlayer || !anyTeamCanBid) {
      // End auction
      AuctionService.clearTimer(auctionId);
      await db.auctions.findByIdAndUpdate(auctionId, {
        status: 'ended',
        currentPlayerId: null,
        currentBid: 0,
        currentBidderId: null,
        timerEndsAt: null,
      });

      const finalTeams = await db.teams.find({ auctionId });
      const allPlayers = await db.players.find({ auctionId });

      AuctionService.broadcastToRoom(auction.roomCode, 'auction-ended', {
        auctionId,
        teams: finalTeams,
        players: allPlayers,
      });
      return;
    }

    const timerDuration = (auction.config.timerSeconds || 15) * 1000;
    const timerEndsAt = auction.mode === 'live' ? new Date(Date.now() + timerDuration) : null;

    const nextPlayerId = (nextPlayer._id || '').toString();
    await db.auctions.findByIdAndUpdate(auctionId, {
      currentPlayerId: nextPlayerId,
      currentBid: 0,
      currentBidderId: null,
      timerEndsAt,
      paused: false,
    });

    AuctionService.broadcastToRoom(auction.roomCode, 'player-up', {
      player: nextPlayer,
      currentBid: 0,
      currentBidder: null,
      timerEndsAt,
    });

    if (auction.mode === 'live') {
      AuctionService.startLiveTimer(auctionId, auction.roomCode);
    }
  }

  // Manual Sell by Host (Manual Auction Mode or Host override)
  public static async manualSell(auctionId: string, data: { unsold?: boolean; teamId?: string; amount?: number }) {
    return withAuctionLock(auctionId, async () => {
      const auction = await db.auctions.findById(auctionId);
      if (!auction) throw new Error('Auction not found');
      if (auction.status !== 'live' && auction.status !== 'paused') {
        throw new Error('Auction must be active to confirm sale');
      }
      if (!auction.currentPlayerId) {
        throw new Error('No player is currently selected');
      }

      const player = await db.players.findById(auction.currentPlayerId);
      if (!player) throw new Error('Player not found');

      AuctionService.clearTimer(auctionId);

      if (data.unsold) {
        await db.players.findByIdAndUpdate(player._id.toString(), {
          status: 'unsold',
        });

        AuctionService.broadcastToRoom(auction.roomCode, 'player-unsold', {
          player: { ...player, status: 'unsold' },
        });
      } else {
        if (!data.teamId || data.amount === undefined) {
          throw new Error('Winning team and bid amount are required for sale');
        }

        const team = await db.teams.findById(data.teamId);
        if (!team || team.auctionId !== auctionId) {
          throw new Error('Winning team not found in this auction');
        }

        if (team.squad && team.squad.length >= auction.config.squadMax) {
          throw new Error(`Team ${team.name} already reached squad limit of ${auction.config.squadMax}`);
        }

        // Validate max allowed bid respecting reserve rule
        const maxAllowed = AuctionService.calculateMaxBid(team, auction.config.squadMin, auction.config.basePrice);
        if (data.amount > maxAllowed) {
          throw new Error(`Sale price (${data.amount}) exceeds team's maximum permitted bid of ${maxAllowed}`);
        }

        const newPurse = Math.max(0, team.purseLeft - data.amount);
        const squadEntry = {
          playerId: player._id.toString(),
          price: data.amount,
          playerName: player.name,
          position: player.position,
          rating: player.rating,
        };

        await db.teams.findByIdAndUpdate(team._id.toString(), {
          purseLeft: newPurse,
          $push: { squad: squadEntry },
        });

        await db.players.findByIdAndUpdate(player._id.toString(), {
          status: 'sold',
          soldToTeamId: team._id.toString(),
          soldPrice: data.amount,
        });

        await db.auctions.findByIdAndUpdate(auctionId, {
          lastSoldRecord: {
            playerId: player._id.toString(),
            teamId: team._id.toString(),
            price: data.amount,
          },
        });

        const updatedTeams = await db.teams.find({ auctionId });

        AuctionService.broadcastToRoom(auction.roomCode, 'player-sold', {
          player: { ...player, status: 'sold', soldPrice: data.amount, soldToTeamId: team._id.toString() },
          team: { id: team._id.toString(), name: team.name, color: team.color },
          price: data.amount,
          teams: updatedTeams,
        });

        AuctionService.broadcastToRoom(auction.roomCode, 'purse-update', {
          teams: updatedTeams,
        });
      }

      // Automatically advance to next player after brief moment
      setTimeout(async () => {
        await withAuctionLock(auctionId, async () => {
          await AuctionService.advanceToNextPlayer(auctionId);
        });
      }, 2000);

      return { success: true };
    });
  }

  // Pause auction
  public static async pauseAuction(auctionId: string) {
    return withAuctionLock(auctionId, async () => {
      const auction = await db.auctions.findById(auctionId);
      if (!auction) throw new Error('Auction not found');

      AuctionService.clearTimer(auctionId);

      const updated = await db.auctions.findByIdAndUpdate(auctionId, {
        paused: true,
      }, { new: true });

      AuctionService.broadcastToRoom(auction.roomCode, 'auction-paused', {
        paused: true,
      });

      return updated;
    });
  }

  // Resume auction
  public static async resumeAuction(auctionId: string) {
    return withAuctionLock(auctionId, async () => {
      const auction = await db.auctions.findById(auctionId);
      if (!auction) throw new Error('Auction not found');

      const timerDuration = (auction.config.timerSeconds || 15) * 1000;
      const timerEndsAt = auction.mode === 'live' ? new Date(Date.now() + timerDuration) : null;

      const updated = await db.auctions.findByIdAndUpdate(auctionId, {
        paused: false,
        timerEndsAt,
      }, { new: true });

      AuctionService.broadcastToRoom(auction.roomCode, 'auction-paused', {
        paused: false,
        timerEndsAt,
      });

      if (auction.mode === 'live') {
        AuctionService.startLiveTimer(auctionId, auction.roomCode);
      }

      return updated;
    });
  }

  // Skip player (mark unsold and advance)
  public static async skipPlayer(auctionId: string) {
    return withAuctionLock(auctionId, async () => {
      const auction = await db.auctions.findById(auctionId);
      if (!auction || !auction.currentPlayerId) throw new Error('No current player to skip');

      AuctionService.clearTimer(auctionId);

      const player = await db.players.findById(auction.currentPlayerId);
      if (player) {
        await db.players.findByIdAndUpdate(player._id.toString(), {
          status: 'unsold',
        });
        AuctionService.broadcastToRoom(auction.roomCode, 'player-unsold', {
          player: { ...player, status: 'unsold' },
        });
      }

      await AuctionService.advanceToNextPlayer(auctionId);
      return { success: true };
    });
  }

  // Undo last sale
  public static async undoLastSale(auctionId: string) {
    return withAuctionLock(auctionId, async () => {
      const auction = await db.auctions.findById(auctionId);
      if (!auction || !auction.lastSoldRecord) {
        throw new Error('No recent sale found to undo');
      }

      const { playerId, teamId, price } = auction.lastSoldRecord;
      const team = await db.teams.findById(teamId);
      const player = await db.players.findById(playerId);

      if (team) {
        // Restore purse and remove from squad
        const newSquad = (team.squad || []).filter((s: any) => s.playerId !== playerId);
        const restoredPurse = team.purseLeft + price;
        await db.teams.findByIdAndUpdate(teamId, {
          purseLeft: restoredPurse,
          squad: newSquad,
        });
      }

      if (player) {
        await db.players.findByIdAndUpdate(playerId, {
          status: 'pending',
          soldToTeamId: null,
          soldPrice: null,
        });
      }

      // Re-set player as current
      const timerDuration = (auction.config.timerSeconds || 15) * 1000;
      const timerEndsAt = auction.mode === 'live' ? new Date(Date.now() + timerDuration) : null;

      await db.auctions.findByIdAndUpdate(auctionId, {
        currentPlayerId: playerId,
        currentBid: 0,
        currentBidderId: null,
        timerEndsAt,
        lastSoldRecord: undefined,
      });

      const updatedTeams = await db.teams.find({ auctionId });

      AuctionService.broadcastToRoom(auction.roomCode, 'purse-update', {
        teams: updatedTeams,
      });

      AuctionService.broadcastToRoom(auction.roomCode, 'player-up', {
        player,
        currentBid: 0,
        currentBidder: null,
        timerEndsAt,
      });

      if (auction.mode === 'live') {
        AuctionService.startLiveTimer(auctionId, auction.roomCode);
      }

      return { success: true, player, teams: updatedTeams };
    });
  }

  // End auction immediately
  public static async endAuction(auctionId: string) {
    return withAuctionLock(auctionId, async () => {
      const auction = await db.auctions.findById(auctionId);
      if (!auction) throw new Error('Auction not found');

      AuctionService.clearTimer(auctionId);

      const updated = await db.auctions.findByIdAndUpdate(auctionId, {
        status: 'ended',
        timerEndsAt: null,
      }, { new: true });

      const finalTeams = await db.teams.find({ auctionId });
      const allPlayers = await db.players.find({ auctionId });

      AuctionService.broadcastToRoom(auction.roomCode, 'auction-ended', {
        auctionId,
        teams: finalTeams,
        players: allPlayers,
      });

      return updated;
    });
  }
}
