import React, { useEffect, useState, useCallback } from 'react';
import {
  Trophy,
  Users,
  Shield,
  DollarSign,
  TrendingUp,
  AlertCircle,
  Clock,
  Radio,
  Sparkles,
  ArrowRight,
  Gavel,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useSocket } from '../hooks/useSocket';
import { PlayerCard } from '../components/PlayerCard';
import { CountdownTimer } from '../components/CountdownTimer';
import { PurseTable } from '../components/PurseTable';
import { BidLog } from '../components/BidLog';
import { Auction, Team, Player, Bid } from '../types';

interface LiveAuctionPageProps {
  auctionId: string;
  onNavigate: (page: string, param?: string) => void;
}

export const LiveAuctionPage: React.FC<LiveAuctionPageProps> = ({ auctionId, onNavigate }) => {
  const { user } = useAuth();
  const { success, error: toastError, info } = useToast();

  const [auction, setAuction] = useState<Auction | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [myTeam, setMyTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastSoldEvent, setLastSoldEvent] = useState<{ player: any; team: any; price: number } | null>(null);

  // Socket Setup
  const { placeBid, connected } = useSocket({
    roomCode: auction?.roomCode,
    teamId: myTeam?._id,
    onLobbyUpdate: data => {
      setTeams(data.teams || []);
      const mine = data.teams.find((t: any) => t.ownerId === user?.id || t.ownerId === (user as any)?._id);
      if (mine) setMyTeam(mine);
    },
    onAuctionStarted: data => {
      setAuction(prev => prev ? { ...prev, status: 'live' } : null);
      setCurrentPlayer(data.player);
      success('Auction Live!', 'The bidding arena is now open!');
    },
    onPlayerUp: data => {
      setCurrentPlayer(data.player);
      setAuction(prev => prev ? {
        ...prev,
        currentBid: data.currentBid,
        currentBidderId: data.currentBidder,
        timerEndsAt: data.timerEndsAt,
        paused: !!data.paused,
      } : null);
      setBids([]);
      setLastSoldEvent(null);
    },
    onBidUpdate: data => {
      setAuction(prev => prev ? {
        ...prev,
        currentBid: data.currentBid,
        currentBidderId: data.currentBidder,
        timerEndsAt: data.timerEndsAt,
      } : null);
      if (data.bid) {
        setBids(prev => [data.bid, ...prev]);
      }
    },
    onTimerTick: data => {
      setAuction(prev => prev ? { ...prev, timerEndsAt: data.timerEndsAt } : null);
    },
    onPlayerSold: data => {
      if (data.teams) {
        setTeams(data.teams);
        const updatedMe = data.teams.find((t: any) => t._id === myTeam?._id);
        if (updatedMe) setMyTeam(updatedMe);
      }
      setLastSoldEvent({
        player: data.player,
        team: data.team,
        price: data.price,
      });
      success('Player Sold!', `${data.player.name} awarded to ${data.team.name} for $${data.price}M`);
    },
    onPlayerUnsold: data => {
      info('Player Unsold', `${data.player.name} was passed unsold.`);
    },
    onPurseUpdate: data => {
      if (data.teams) {
        setTeams(data.teams);
        const updatedMe = data.teams.find((t: any) => t._id === myTeam?._id);
        if (updatedMe) setMyTeam(updatedMe);
      }
    },
    onAuctionPaused: data => {
      setAuction(prev => prev ? { ...prev, paused: data.paused, timerEndsAt: data.timerEndsAt } : null);
    },
    onAuctionEnded: data => {
      setAuction(prev => prev ? { ...prev, status: 'ended' } : null);
      success('Auction Finalized', 'Auction is complete! Taking you to official results...');
      setTimeout(() => onNavigate('results', auctionId), 1500);
    },
  });

  const loadData = useCallback(async () => {
    try {
      const data = await api.getAuctionById(auctionId);
      setAuction(data.auction);
      setTeams(data.teams || []);
      setCurrentPlayer(data.currentPlayer || null);
      setBids(data.bids || []);

      const mine = data.teams.find(
        (t: any) => t.ownerId === user?.id || t.ownerId === (user as any)?._id
      );
      if (mine) setMyTeam(mine);
    } catch (err: any) {
      toastError('Failed to load auction', err.message);
    } finally {
      setLoading(false);
    }
  }, [auctionId, user, toastError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading || !auction) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center text-slate-400 font-mono text-sm">
        Connecting to live stadium...
      </div>
    );
  }

  // Bidding calculations & validations
  const isLobby = auction.status === 'lobby' || auction.status === 'scheduled';
  const isLive = auction.status === 'live';
  const isPaused = auction.paused || auction.status === 'paused';
  const isEnded = auction.status === 'ended';

  const basePrice = currentPlayer?.basePrice || auction.config.basePrice || 5;
  const increment = auction.config.increment || 2;
  const nextBidAmount = auction.currentBid === 0 ? basePrice : auction.currentBid + increment;

  // Check user team constraints
  let canBid = false;
  let disableReason = '';

  if (!myTeam) {
    disableReason = 'Spectator Mode (No team registered in room)';
  } else if (!isLive) {
    disableReason = isLobby ? 'Waiting for host to start auction' : isEnded ? 'Auction has concluded' : 'Not active';
  } else if (isPaused) {
    disableReason = 'Auction is currently paused by host';
  } else if (auction.currentBidderId === myTeam._id) {
    disableReason = 'You hold the highest bid!';
  } else {
    const squadSize = myTeam.squad?.length || 0;
    const squadMax = auction.config.squadMax || 11;
    const squadMin = auction.config.squadMin || 5;

    if (squadSize >= squadMax) {
      disableReason = `Squad is full (${squadSize}/${squadMax})`;
    } else {
      const neededForMin = Math.max(0, squadMin - squadSize - 1);
      const requiredReserve = neededForMin * basePrice;
      const maxPermitted = Math.max(0, myTeam.purseLeft - requiredReserve);

      if (nextBidAmount > myTeam.purseLeft) {
        disableReason = `Insufficient purse ($${myTeam.purseLeft}M left)`;
      } else if (nextBidAmount > maxPermitted) {
        disableReason = `Breaks Squad Reserve Rule (Need $${requiredReserve}M for remaining ${neededForMin} slots)`;
      } else {
        canBid = true;
      }
    }
  }

  const handlePlaceBid = () => {
    if (!canBid || !myTeam) return;
    placeBid(auctionId, myTeam._id, nextBidAmount);
  };

  const leadingTeam = teams.find(t => t._id === auction.currentBidderId);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Top Arena Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-black text-white font-['Chivo'] uppercase tracking-tight">
              {auction.name}
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              {auction.mode} MODE
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Room: <strong className="text-emerald-400 font-mono">{auction.roomCode}</strong> • {teams.length} Teams Registered
          </p>
        </div>

        {/* Reconnect / Connection Status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono">
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
            <span className="text-slate-300">{connected ? 'Live Sync' : 'Reconnecting...'}</span>
          </div>

          {isEnded && (
            <button
              onClick={() => onNavigate('results', auctionId)}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-500 text-slate-950 font-black text-xs font-mono uppercase shadow-md"
            >
              Results
            </button>
          )}
        </div>
      </div>

      {/* Main Arena Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Col: Player Card + My Team HUD (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <PlayerCard
            player={currentPlayer}
            soldToTeamName={lastSoldEvent?.team?.name}
            soldPrice={lastSoldEvent?.price}
          />

          {/* Player's Own Team HUD */}
          {myTeam ? (
            <div className="p-4 rounded-2xl border border-slate-800 bg-slate-950/90 shadow-xl backdrop-blur-sm">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                <div className="flex items-center gap-2">
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-white/20"
                    style={{ backgroundColor: myTeam.color || '#10b981' }}
                  />
                  <h3 className="text-sm font-bold uppercase font-['Chivo'] text-white">
                    {myTeam.name}
                  </h3>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                  YOUR FRANCHISE
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center font-mono">
                <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase block">Purse Left</span>
                  <span className="text-base font-black text-emerald-400">${myTeam.purseLeft}M</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase block">Squad</span>
                  <span className="text-base font-black text-slate-100">
                    {myTeam.squad?.length || 0}/{auction.config.squadMax}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase block">Min Target</span>
                  <span className="text-base font-black text-slate-300">
                    {auction.config.squadMin} Players
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl border border-dashed border-slate-800 bg-slate-950/50 text-center text-xs text-slate-500 font-mono">
              Spectator Mode • No team linked to this browser session
            </div>
          )}
        </div>

        {/* Right Col: Scoreboard, Big Bid Button, Timer, Tables (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Main Scoreboard */}
          <div className="p-5 rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 shadow-2xl backdrop-blur-md">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-widest text-slate-400 block">
                  Current Highest Bid
                </span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-4xl sm:text-5xl font-black text-emerald-400 font-['Chivo'] tracking-tight">
                    ${auction.currentBid || currentPlayer?.basePrice || 0}M
                  </span>
                  {leadingTeam ? (
                    <span className="text-sm font-semibold text-slate-200">
                      held by <strong className="text-white underline decoration-emerald-500">{leadingTeam.name}</strong>
                    </span>
                  ) : (
                    <span className="text-xs text-slate-500 font-mono">
                      (Base: ${basePrice}M)
                    </span>
                  )}
                </div>
              </div>

              {auction.mode === 'live' && (
                <CountdownTimer
                  timerEndsAt={auction.timerEndsAt}
                  paused={auction.paused}
                  totalDurationSeconds={auction.config.timerSeconds}
                />
              )}
            </div>

            {/* Bidding Action Arena */}
            <div className="mt-5">
              {auction.mode === 'manual' ? (
                /* Manual Mode Notice for Players */
                <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/30 text-center">
                  <Gavel className="w-6 h-6 text-amber-400 mx-auto mb-1.5" />
                  <h4 className="text-sm font-bold text-amber-300 uppercase font-['Chivo']">
                    Manual Host Adjudication
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                    The auctioneer adjudicates winning bids verbally or manually from the control room. Your screen updates in real time as sales are confirmed.
                  </p>
                </div>
              ) : (
                /* Live Bidding Button */
                <div>
                  <button
                    id="place-bid-btn"
                    disabled={!canBid}
                    onClick={handlePlaceBid}
                    className={`w-full py-4 sm:py-5 px-6 rounded-2xl font-black text-lg sm:text-xl font-['Chivo'] uppercase tracking-wider transition-all flex flex-col sm:flex-row items-center justify-center gap-2 shadow-2xl ${
                      canBid
                        ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-950/80 active:scale-98 cursor-pointer hover:shadow-emerald-500/20'
                        : 'bg-slate-900 border border-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-6 h-6" />
                      <span>
                        {canBid ? `Bid $${nextBidAmount}M (+${increment}M)` : 'Bid Unavailable'}
                      </span>
                    </div>

                    {!canBid && (
                      <span className="text-xs font-mono font-normal normal-case text-rose-400/90 sm:ml-2">
                        {disableReason}
                      </span>
                    )}
                  </button>

                  {canBid && (
                    <p className="text-center text-[11px] font-mono text-slate-400 mt-2">
                      Clicking will place a verified server-locked bid of ${nextBidAmount}M
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Live Tables: Bid Stream & Team Purse Standings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <BidLog bids={bids} currentBid={auction.currentBid} />
            <PurseTable
              teams={teams}
              myTeamId={myTeam?._id}
              currentBidderId={auction.currentBidderId}
              squadMin={auction.config.squadMin}
              squadMax={auction.config.squadMax}
              basePrice={auction.config.basePrice}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
