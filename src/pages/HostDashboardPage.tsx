import React, { useEffect, useState } from 'react';
import { PlusCircle, Radio, Copy, Check, Trash2, ArrowRight, Trophy, Users, Shield, Calendar } from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { Auction } from '../types';

interface HostDashboardPageProps {
  onNavigate: (page: string, param?: string) => void;
}

export const HostDashboardPage: React.FC<HostDashboardPageProps> = ({ onNavigate }) => {
  const { success, error: toastError } = useToast();
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const fetchAuctions = async () => {
    try {
      const data = await api.getMyAuctions();
      setAuctions(data.auctions || []);
    } catch (err: any) {
      toastError('Failed to load auctions', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuctions();
  }, []);

  const copyRoomCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    success(`Room Code ${code} copied!`);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete auction "${name}"?`)) return;

    try {
      await api.deleteAuction(id);
      success('Auction deleted');
      setAuctions(prev => prev.filter(a => a._id !== id));
    } catch (err: any) {
      toastError('Failed to delete', err.message);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'live':
        return <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />LIVE</span>;
      case 'paused':
        return <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">PAUSED</span>;
      case 'lobby':
        return <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30">LOBBY</span>;
      case 'ended':
        return <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-slate-800 text-slate-400 border border-slate-700">ENDED</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-slate-800 text-slate-400">SCHEDULED</span>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header & Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-['Chivo'] uppercase tracking-tight">
            Auctioneer Command Center
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage your leagues, run live or manual bidding rooms, and export results
          </p>
        </div>

        <button
          id="host-create-new-btn"
          onClick={() => onNavigate('host-create')}
          className="self-start md:self-auto px-4 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs sm:text-sm uppercase tracking-wider font-['Chivo'] transition-all flex items-center gap-2 shadow-lg shadow-emerald-950/60"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Create New Auction</span>
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-6">
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-black text-white font-mono">{auctions.length}</div>
            <div className="text-xs text-slate-400">Total Auctions Hosted</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-black text-white font-mono">
              {auctions.filter(a => a.status === 'live' || a.status === 'lobby').length}
            </div>
            <div className="text-xs text-slate-400">Active / In-Lobby</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-black text-white font-mono">
              {auctions.reduce((acc, a) => acc + (a.totalPlayersCount || 0), 0)}
            </div>
            <div className="text-xs text-slate-400">Total Players in Pools</div>
          </div>
        </div>
      </div>

      {/* Auctions list */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 font-mono">
          Your Auctions
        </h2>

        {loading ? (
          <div className="py-16 text-center text-slate-500 text-sm">
            Loading auction rooms...
          </div>
        ) : auctions.length === 0 ? (
          <div className="p-12 rounded-3xl border border-dashed border-slate-800 bg-slate-950/40 text-center">
            <Trophy className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-300 font-['Chivo'] uppercase">No Auctions Yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-6">
              Create your first football player auction to invite teams and kick off bidding!
            </p>
            <button
              onClick={() => onNavigate('host-create')}
              className="px-4 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-black text-xs uppercase tracking-wider font-['Chivo']"
            >
              Create Auction Now
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {auctions.map(auction => {
              const isEnded = auction.status === 'ended';
              return (
                <div
                  key={auction._id}
                  className="rounded-2xl border border-slate-800 bg-slate-950/90 p-5 backdrop-blur-sm hover:border-slate-700 transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Top row */}
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-black text-white font-['Chivo'] uppercase tracking-tight truncate">
                            {auction.name}
                          </h3>
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono">
                          Mode: <strong className="text-slate-200 uppercase">{auction.mode}</strong>
                        </span>
                      </div>
                      <div className="shrink-0">{getStatusBadge(auction.status)}</div>
                    </div>

                    {/* Room Codes card */}
                    <div className="my-3 p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 flex items-center justify-between">
                      <div>
                        <span className="block text-[10px] font-mono uppercase text-slate-400">
                          Team Join Code
                        </span>
                        <span className="text-base font-black font-mono tracking-widest text-emerald-400">
                          {auction.roomCode}
                        </span>
                      </div>
                      <button
                        onClick={() => copyRoomCode(auction.roomCode)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                        title="Copy Code"
                      >
                        {copiedCode === auction.roomCode ? (
                          <Check className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    {/* Meta info */}
                    <div className="grid grid-cols-3 gap-2 py-2 text-center text-xs font-mono border-t border-b border-slate-800/60 my-3">
                      <div>
                        <span className="text-[10px] text-slate-500 block uppercase">Teams</span>
                        <span className="font-bold text-slate-200">
                          {auction.teamsCount || 0}/{auction.config.maxTeams}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block uppercase">Purse</span>
                        <span className="font-bold text-emerald-400">${auction.config.purse}M</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block uppercase">Pool</span>
                        <span className="font-bold text-slate-200">
                          {auction.totalPlayersCount || 0} Players
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between gap-2 pt-2">
                    {auction.status === 'scheduled' || auction.status === 'lobby' ? (
                      <button
                        onClick={() => handleDelete(auction._id, auction.name)}
                        className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-slate-900 transition-colors"
                        title="Delete Auction"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    ) : (
                      <div />
                    )}

                    <div className="flex items-center gap-2">
                      {isEnded ? (
                        <button
                          onClick={() => onNavigate('results', auction._id)}
                          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs uppercase font-['Chivo'] tracking-wider flex items-center gap-1.5 transition-colors"
                        >
                          <span>Results</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => onNavigate('host-room', auction._id)}
                          className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase font-['Chivo'] tracking-wider flex items-center gap-1.5 transition-all shadow-md shadow-emerald-950/40"
                        >
                          <span>Control Room</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
