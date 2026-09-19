import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export interface UseSocketOptions {
  roomCode?: string;
  teamId?: string;
  onLobbyUpdate?: (data: { teams: any[] }) => void;
  onAuctionStarted?: (data: { auction: any; player: any }) => void;
  onPlayerUp?: (data: { player: any; currentBid: number; currentBidder: any; timerEndsAt: any; paused?: boolean }) => void;
  onBidUpdate?: (data: { currentBid: number; currentBidder: any; timerEndsAt: any; bid: any }) => void;
  onTimerTick?: (data: { secondsLeft: number; timerEndsAt: any }) => void;
  onPlayerSold?: (data: { player: any; team: any; price: number; teams: any[] }) => void;
  onPlayerUnsold?: (data: { player: any }) => void;
  onPurseUpdate?: (data: { teams: any[] }) => void;
  onAuctionPaused?: (data: { paused: boolean; timerEndsAt?: any }) => void;
  onAuctionEnded?: (data: { auctionId: string; teams?: any[]; players?: any[] }) => void;
}

export function useSocket(options: UseSocketOptions = {}) {
  const { token } = useAuth();
  const { error: toastError } = useToast();
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  // Keep references to latest callbacks to avoid socket re-subscription churn
  const callbacksRef = useRef(options);
  callbacksRef.current = options;

  useEffect(() => {
    // Socket connects on same host/port as current app
    const socket = io({
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      if (options.roomCode) {
        socket.emit('join-room', {
          roomCode: options.roomCode,
          teamId: options.teamId,
        });
      }
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('lobby-update', data => {
      callbacksRef.current.onLobbyUpdate?.(data);
    });

    socket.on('auction-started', data => {
      callbacksRef.current.onAuctionStarted?.(data);
    });

    socket.on('player-up', data => {
      callbacksRef.current.onPlayerUp?.(data);
    });

    socket.on('bid-update', data => {
      callbacksRef.current.onBidUpdate?.(data);
    });

    socket.on('timer-tick', data => {
      callbacksRef.current.onTimerTick?.(data);
    });

    socket.on('player-sold', data => {
      callbacksRef.current.onPlayerSold?.(data);
    });

    socket.on('player-unsold', data => {
      callbacksRef.current.onPlayerUnsold?.(data);
    });

    socket.on('purse-update', data => {
      callbacksRef.current.onPurseUpdate?.(data);
    });

    socket.on('auction-paused', data => {
      callbacksRef.current.onAuctionPaused?.(data);
    });

    socket.on('auction-ended', data => {
      callbacksRef.current.onAuctionEnded?.(data);
    });

    socket.on('error-msg', (data: { message: string }) => {
      toastError('Auction Alert', data.message);
    });

    return () => {
      socket.disconnect();
    };
  }, [token, options.roomCode, options.teamId]);

  const placeBid = useCallback((auctionId: string, teamId: string, amount?: number) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('place-bid', { auctionId, teamId, amount });
    }
  }, []);

  return {
    socket: socketRef.current,
    connected,
    placeBid,
  };
}
