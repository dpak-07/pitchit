import { Server as SocketServer, Socket } from 'socket.io';
import { verifyToken, AuthPayload } from '../middleware/auth';
import { AuctionService } from '../services/auctionService';
import { db } from '../models';

interface AuthenticatedSocket extends Socket {
  user?: AuthPayload;
}

export function setupSocketIO(io: SocketServer) {
  AuctionService.setSocketServer(io);

  // Socket Authentication Middleware
  io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
    if (!token) {
      // Allow anonymous viewers with read-only socket access
      return next();
    }

    try {
      const decoded = verifyToken(token);
      socket.user = decoded;
      next();
    } catch (err) {
      // If token is invalid, still allow connection as viewer
      next();
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    let currentRoom: string | null = null;

    // Join room
    socket.on('join-room', async (data: { roomCode: string; teamId?: string }) => {
      try {
        const { roomCode, teamId } = data;
        if (!roomCode) return;

        const normalizedCode = roomCode.toUpperCase().trim();
        const roomName = `auction_${normalizedCode}`;

        if (currentRoom) {
          socket.leave(currentRoom);
        }

        socket.join(roomName);
        currentRoom = roomName;

        const auction = await db.auctions.findOne({ roomCode: normalizedCode });
        if (!auction) {
          socket.emit('error-msg', { message: 'Auction room not found' });
          return;
        }

        const auctionId = auction._id.toString();
        const teams = await db.teams.find({ auctionId });
        const currentPlayer = auction.currentPlayerId
          ? await db.players.findById(auction.currentPlayerId)
          : null;

        // Send current room snapshot to the joining client
        socket.emit('lobby-update', { teams });

        if (auction.status === 'live' || auction.status === 'paused') {
          socket.emit('player-up', {
            player: currentPlayer,
            currentBid: auction.currentBid,
            currentBidder: auction.currentBidderId,
            timerEndsAt: auction.timerEndsAt,
            paused: auction.paused,
          });
        } else if (auction.status === 'ended') {
          socket.emit('auction-ended', { auctionId });
        }
      } catch (err: any) {
        socket.emit('error-msg', { message: err.message || 'Error joining room' });
      }
    });

    // Place bid (Live Mode)
    socket.on('place-bid', async (data: { auctionId: string; teamId: string; amount?: number }) => {
      try {
        const { auctionId, teamId, amount } = data;
        if (!auctionId || !teamId) {
          socket.emit('error-msg', { message: 'Auction ID and Team ID required to bid' });
          return;
        }

        await AuctionService.placeBid(auctionId, teamId, amount);
      } catch (err: any) {
        socket.emit('error-msg', { message: err.message || 'Bid rejected' });
      }
    });

    socket.on('disconnect', () => {
      if (currentRoom) {
        socket.leave(currentRoom);
      }
    });
  });
}
