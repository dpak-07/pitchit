import React, { useEffect, useState, useCallback } from 'react';
import {
  ArrowLeft,
  Users,
  Shield,
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  StopCircle,
  Copy,
  Check,
  UserX,
  Upload,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  Gavel,
  Radio,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useSocket } from '../hooks/useSocket';
import { PlayerCard } from '../components/PlayerCard';
import { CountdownTimer } from '../components/CountdownTimer';
import { PurseTable } from '../components/PurseTable';
import { BidLog } from '../components/BidLog';
import { ManualControlPanel } from '../components/ManualControlPanel';
import { LiveControlPanel } from '../components/LiveControlPanel';
import { Auction, Team, Player, Bid } from '../types';

interface HostControlRoomPageProps {
  auctionId: string;
  onNavigate: (page: string, param?: string) => void;
}

export const HostControlRoomPage: React.FC<HostControlRoomPageProps> = ({ auctionId, onNavigate }) => {
  const { user } = useAuth();
  const { success, error: toastError, info } = useToast();

  const [auction, setAuction] = useState<Auction | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [poolPlayers, setPoolPlayers] = useState<Player[]>([]);
  const [activeTab, setActiveTab] = useState<'arena' | 'pool'>('arena');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Manual addition state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPlayer, setNewPlayer] = useState({
    name: '',
    position: 'FWD',
    club: '',
    nationality: '',
    rating: 85,
    basePrice: 5,
    year: 2024,
    imageUrl: '',
  });

  // Socket setup
  const { placeBid } = useSocket({
    roomCode: auction?.roomCode,
    onLobbyUpdate: data => {
      setTeams(data.teams || []);
    },
    onAuctionStarted: data => {
      setAuction(prev => prev ? { ...prev, status: 'live' } : null);
      setCurrentPlayer(data.player);
      success('Auction Started!', 'First player is now on the bidding block.');
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
      if (data.teams) setTeams(data.teams);
      success('Sold!', `${data.player.name} sold to ${data.team.name} for $${data.price}M`);
    },
    onPlayerUnsold: data => {
      info('Unsold', `${data.player.name} passed unsold.`);
    },
    onPurseUpdate: data => {
      if (data.teams) setTeams(data.teams);
    },
    onAuctionPaused: data => {
      setAuction(prev => prev ? { ...prev, paused: data.paused, timerEndsAt: data.timerEndsAt } : null);
    },
    onAuctionEnded: data => {
      setAuction(prev => prev ? { ...prev, status: 'ended' } : null);
      success('Auction Completed!', 'Redirecting to results view...');
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

      const poolData = await api.getAuctionPlayers(auctionId);
      setPoolPlayers(poolData.players || []);
    } catch (err: any) {
      toastError('Failed to load auction', err.message);
    } finally {
      setLoading(false);
    }
  }, [auctionId, toastError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Actions
  const handleStart = async () => {
    setActionLoading(true);
    try {
      await api.startAuction(auctionId, auction?.auctioneerCode);
      success('Live Auction Launched!');
      loadData();
    } catch (err: any) {
      toastError('Failed to start', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handlePause = async () => {
    try {
      await api.pauseAuction(auctionId);
    } catch (err: any) {
      toastError('Error', err.message);
    }
  };

  const handleResume = async () => {
    try {
      await api.resumeAuction(auctionId);
    } catch (err: any) {
      toastError('Error', err.message);
    }
  };

  const handleSkip = async () => {
    try {
      await api.skipPlayer(auctionId);
      success('Player Skipped', 'Moved to next player in pool');
    } catch (err: any) {
      toastError('Error', err.message);
    }
  };

  const handleUndo = async () => {
    try {
      await api.undoLastSale(auctionId);
      success('Sale Reversed', 'Purse and squad restored to previous state');
      loadData();
    } catch (err: any) {
      toastError('Error', err.message);
    }
  };

  const handleEnd = async () => {
    try {
      await api.endAuction(auctionId);
      success('Auction Finalized');
      onNavigate('results', auctionId);
    } catch (err: any) {
      toastError('Error', err.message);
    }
  };

  const handleKickTeam = async (teamId: string) => {
    if (!window.confirm('Are you sure you want to kick this team from the auction?')) return;
    try {
      const data = await api.kickTeam(auctionId, teamId);
      setTeams(data.teams);
      success('Team removed');
    } catch (err: any) {
      toastError('Kick failed', err.message);
    }
  };

  const handleManualSale = async (teamId: string, amount: number) => {
    setActionLoading(true);
    try {
      await api.manualSell(auctionId, { teamId, amount });
      success('Sale Confirmed!');
      loadData();
    } catch (err: any) {
      toastError('Sale failed', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleManualUnsold = async () => {
    setActionLoading(true);
    try {
      await api.manualSell(auctionId, { unsold: true });
      info('Player Unsold');
      loadData();
    } catch (err: any) {
      toastError('Action failed', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.addPlayers(auctionId, [newPlayer]);
      success('Player Added', `${newPlayer.name} added to auction pool`);
      setShowAddModal(false);
      loadData();
    } catch (err: any) {
      toastError('Add failed', err.message);
    }
  };

  const handleResetSeed = async () => {
    if (!window.confirm('Reset and replace player pool with 65 verified football legends?')) return;
    try {
      await api.resetSeedPlayers(auctionId);
      success('Player pool re-seeded with 65 players');
      loadData();
    } catch (err: any) {
      toastError('Seed failed', err.message);
    }
  };

  if (loading || !auction) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center text-slate-400">
        Loading Host Control Center...
      </div>
    );
  }

  const isLobby = auction.status === 'lobby' || auction.status === 'scheduled';
  const isEnded = auction.status === 'ended';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('host-dashboard')}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-white font-['Chivo'] uppercase">
                {auction.name}
              </h1>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                auction.mode === 'live' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
              }`}>
                {auction.mode}
              </span>
            </div>
            <p className="text-xs text-slate-400">Host Control Center</p>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-2">
          <div className="flex p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono">
            <button
              onClick={() => setActiveTab('arena')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                activeTab === 'arena' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              Control Arena
            </button>
            <button
              onClick={() => setActiveTab('pool')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                activeTab === 'pool' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              Player Pool ({poolPlayers.length})
            </button>
          </div>

          {isEnded && (
            <button
              onClick={() => onNavigate('results', auctionId)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold font-mono"
            >
              View Results
            </button>
          )}
        </div>
      </div>

      {activeTab === 'arena' ? (
        <>
          {/* If Auction is in Lobby, show Lobby Management Arena */}
          {isLobby ? (
            <div className="space-y-6">
              {/* Host Quick Panel */}
              <LiveControlPanel
                auction={auction}
                teamsCount={teams.length}
                onStart={handleStart}
                onPause={handlePause}
                onResume={handleResume}
                onSkip={handleSkip}
                onUndo={handleUndo}
                onEnd={handleEnd}
                loading={actionLoading}
              />

              {/* Lobby Waiting Room View */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Joined teams list */}
                <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-950/80 p-5">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-emerald-400" />
                      <h3 className="text-sm font-bold uppercase font-mono text-slate-200">
                        Joined Teams ({teams.length} / {auction.config.maxTeams})
                      </h3>
                    </div>
                    <span className="text-xs text-slate-400 font-mono">Min 2 Required to Launch</span>
                  </div>

                  {teams.length === 0 ? (
                    <div className="py-12 text-center text-slate-500 text-xs font-mono">
                      No teams have joined yet. Share Room Code <strong className="text-emerald-400">{auction.roomCode}</strong> with team owners!
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {teams.map(team => (
                        <div
                          key={team._id}
                          className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/60 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2.5">
                            <span
                              className="w-4 h-4 rounded-full border border-white/20"
                              style={{ backgroundColor: team.color || '#10b981' }}
                            />
                            <div>
                              <span className="font-bold text-slate-200 text-sm block">
                                {team.name}
                              </span>
                              <span className="text-[11px] text-slate-400 font-mono">
                                Purse: ${team.purseLeft}M
                              </span>
                            </div>
                          </div>

                          <button
                            onClick={() => handleKickTeam(team._id)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                            title="Kick Team"
                          >
                            <UserX className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Next up preview */}
                <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5 flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-bold uppercase font-mono text-slate-300 mb-3">
                      Opening Player
                    </h3>
                    <PlayerCard player={currentPlayer} />
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800 text-xs text-slate-400 font-mono text-center">
                    Total Pool: {poolPlayers.length} Players ready
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Live / Active Auction Layout */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Player Card & Host Controls (5 cols) */}
              <div className="lg:col-span-5 space-y-4">
                <PlayerCard
                  player={currentPlayer}
                  soldToTeamName={
                    teams.find(t => t._id === currentPlayer?.soldToTeamId)?.name
                  }
                  soldPrice={currentPlayer?.soldPrice || undefined}
                />

                {/* Host Control Actions */}
                {auction.mode === 'manual' ? (
                  <ManualControlPanel
                    player={currentPlayer}
                    teams={teams}
                    squadMin={auction.config.squadMin}
                    basePrice={auction.config.basePrice}
                    onConfirmSale={handleManualSale}
                    onMarkUnsold={handleManualUnsold}
                    loading={actionLoading}
                  />
                ) : (
                  <LiveControlPanel
                    auction={auction}
                    teamsCount={teams.length}
                    onStart={handleStart}
                    onPause={handlePause}
                    onResume={handleResume}
                    onSkip={handleSkip}
                    onUndo={handleUndo}
                    onEnd={handleEnd}
                    loading={actionLoading}
                  />
                )}
              </div>

              {/* Right Column: Scoreboard, Timer, Bids, Purse Table (7 cols) */}
              <div className="lg:col-span-7 space-y-4">
                {/* Scoreboard Banner */}
                <div className="p-4 sm:p-5 rounded-2xl border border-slate-800 bg-slate-950/90 flex flex-wrap items-center justify-between gap-4 backdrop-blur-sm">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 block">
                      Current Highest Bid
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl sm:text-4xl font-black text-emerald-400 font-['Chivo']">
                        ${auction.currentBid || currentPlayer?.basePrice || 0}M
                      </span>
                      {auction.currentBidderId && (
                        <span className="text-sm font-semibold text-slate-300">
                          by{' '}
                          <strong className="text-white">
                            {teams.find(t => t._id === auction.currentBidderId)?.name || 'Team'}
                          </strong>
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

                {/* Bids Log & Live Teams Table */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <BidLog bids={bids} currentBid={auction.currentBid} />
                  <PurseTable
                    teams={teams}
                    currentBidderId={auction.currentBidderId}
                    squadMin={auction.config.squadMin}
                    squadMax={auction.config.squadMax}
                    basePrice={auction.config.basePrice}
                  />
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        /* Player Pool Management Tab */
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div>
              <h3 className="text-base font-bold text-white font-['Chivo'] uppercase">
                Auction Player Pool
              </h3>
              <p className="text-xs text-slate-400">
                Manage players scheduled for bidding in this room
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleResetSeed}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono flex items-center gap-1.5 transition-colors"
                title="Re-seed with 65 legends"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Re-seed 65 Players</span>
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs font-mono uppercase flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add Player</span>
              </button>
            </div>
          </div>

          {/* Table of players */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950 overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-900/80 text-slate-400 font-mono text-[11px] uppercase border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Player</th>
                  <th className="py-2.5 px-3">Position</th>
                  <th className="py-2.5 px-3">Club</th>
                  <th className="py-2.5 px-3">Era</th>
                  <th className="py-2.5 px-3 text-center">Rating</th>
                  <th className="py-2.5 px-3 text-right">Base</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {poolPlayers.map(p => (
                  <tr key={p._id} className="hover:bg-slate-900/40">
                    <td className="py-2.5 px-3 font-semibold text-slate-200">
                      {p.name}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-300">
                        {p.position}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">{p.club}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-400">{p.year}</td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-200">
                      {p.rating}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">
                      ${p.basePrice}M
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono uppercase ${
                        p.status === 'sold'
                          ? 'bg-rose-950/60 text-rose-400 border border-rose-500/30'
                          : p.status === 'unsold'
                          ? 'bg-slate-800 text-slate-400'
                          : 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Player Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-slate-700 bg-slate-950 p-6 shadow-2xl">
            <h3 className="text-lg font-black text-white font-['Chivo'] uppercase mb-4">
              Add Player to Pool
            </h3>
            <form onSubmit={handleAddPlayer} className="space-y-3 text-xs">
              <div>
                <label className="block font-mono text-slate-400 uppercase mb-1">Player Name</label>
                <input
                  type="text"
                  required
                  value={newPlayer.name}
                  onChange={e => setNewPlayer({ ...newPlayer, name: e.target.value })}
                  placeholder="e.g. Kylian Mbappé"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-mono text-slate-400 uppercase mb-1">Position</label>
                  <select
                    value={newPlayer.position}
                    onChange={e => setNewPlayer({ ...newPlayer, position: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm"
                  >
                    <option value="GK">GK (Goalkeeper)</option>
                    <option value="DEF">DEF (Defender)</option>
                    <option value="MID">MID (Midfielder)</option>
                    <option value="FWD">FWD (Forward)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-mono text-slate-400 uppercase mb-1">Club</label>
                  <input
                    type="text"
                    required
                    value={newPlayer.club}
                    onChange={e => setNewPlayer({ ...newPlayer, club: e.target.value })}
                    placeholder="Real Madrid"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-mono text-slate-400 uppercase mb-1">Rating</label>
                  <input
                    type="number"
                    min="50"
                    max="99"
                    value={newPlayer.rating}
                    onChange={e => setNewPlayer({ ...newPlayer, rating: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block font-mono text-slate-400 uppercase mb-1">Base ($M)</label>
                  <input
                    type="number"
                    min="1"
                    value={newPlayer.basePrice}
                    onChange={e => setNewPlayer({ ...newPlayer, basePrice: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block font-mono text-slate-400 uppercase mb-1">Year</label>
                  <input
                    type="number"
                    value={newPlayer.year}
                    onChange={e => setNewPlayer({ ...newPlayer, year: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-mono text-slate-400 uppercase mb-1">Nationality</label>
                <input
                  type="text"
                  required
                  value={newPlayer.nationality}
                  onChange={e => setNewPlayer({ ...newPlayer, nationality: e.target.value })}
                  placeholder="France"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm"
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="w-1/2 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-black"
                >
                  Add Player
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
