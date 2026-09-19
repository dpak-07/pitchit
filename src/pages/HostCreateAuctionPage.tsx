import React, { useState } from 'react';
import { ArrowLeft, Sparkles, Calendar, DollarSign, Users, Timer, Layers, Shield } from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { AuctionMode } from '../types';

interface HostCreateAuctionPageProps {
  onNavigate: (page: string, param?: string) => void;
}

export const HostCreateAuctionPage: React.FC<HostCreateAuctionPageProps> = ({ onNavigate }) => {
  const { success, error: toastError } = useToast();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: 'Premier Football Auction 2026',
    mode: 'live' as AuctionMode,
    scheduledAt: new Date().toISOString().slice(0, 16),
    purse: 120,
    squadMin: 5,
    squadMax: 11,
    yearFrom: 2010,
    yearTo: 2024,
    basePrice: 5,
    increment: 2,
    timerSeconds: 15,
    maxTeams: 8,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.squadMin > formData.squadMax) {
      toastError('Validation Error', 'Minimum squad size cannot exceed maximum squad size');
      return;
    }
    if (formData.yearFrom > formData.yearTo) {
      toastError('Validation Error', 'Start year cannot exceed end year');
      return;
    }

    setLoading(true);
    try {
      const data = await api.createAuction({
        name: formData.name,
        mode: formData.mode,
        scheduledAt: new Date(formData.scheduledAt).toISOString(),
        config: {
          purse: Number(formData.purse),
          squadMin: Number(formData.squadMin),
          squadMax: Number(formData.squadMax),
          yearFrom: Number(formData.yearFrom),
          yearTo: Number(formData.yearTo),
          basePrice: Number(formData.basePrice),
          increment: Number(formData.increment),
          timerSeconds: Number(formData.timerSeconds),
          maxTeams: Number(formData.maxTeams),
        },
      });

      success('Auction Created!', `Room code: ${data.roomCode}`);
      onNavigate('host-room', data.auction._id);
    } catch (err: any) {
      toastError('Failed to create auction', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <button
        onClick={() => onNavigate('host-dashboard')}
        className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-white mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Dashboard</span>
      </button>

      <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
        <div className="pb-6 border-b border-slate-800 mb-6">
          <h1 className="text-2xl sm:text-3xl font-black text-white font-['Chivo'] uppercase tracking-tight">
            Create Football Auction
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Configure league budget, squad constraints, bidding timers, and player pool
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* League Name & Mode */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 font-mono">
                Auction Name
              </label>
              <input
                id="create-auction-name"
                type="text"
                required
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. World Legends Super League 2026"
                className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-emerald-400 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 font-mono">
                Bidding Mode
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, mode: 'live' })}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    formData.mode === 'live'
                      ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  <div className="font-bold text-sm">Live (Timer)</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Automated timer countdown</div>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, mode: 'manual' })}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    formData.mode === 'manual'
                      ? 'bg-amber-950/60 border-amber-500 text-amber-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  <div className="font-bold text-sm">Manual (Host)</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Auctioneer adjudicates bids</div>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 font-mono">
                Scheduled Date & Time
              </label>
              <div className="relative">
                <input
                  id="create-auction-scheduled"
                  type="datetime-local"
                  required
                  value={formData.scheduledAt}
                  onChange={e => setFormData({ ...formData, scheduledAt: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-emerald-400 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Financial & Squad Rules */}
          <div className="pt-4 border-t border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono mb-3">
              Financial Budget & Squad Sizes
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1 font-mono">
                  Purse per Team ($M)
                </label>
                <input
                  id="create-auction-purse"
                  type="number"
                  min="10"
                  max="1000"
                  required
                  value={formData.purse}
                  onChange={e => setFormData({ ...formData, purse: Number(e.target.value) })}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-sm font-mono focus:outline-none focus:border-emerald-400 font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1 font-mono">
                  Min Squad Size
                </label>
                <input
                  id="create-auction-squad-min"
                  type="number"
                  min="1"
                  max="25"
                  required
                  value={formData.squadMin}
                  onChange={e => setFormData({ ...formData, squadMin: Number(e.target.value) })}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-sm font-mono focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1 font-mono">
                  Max Squad Size
                </label>
                <input
                  id="create-auction-squad-max"
                  type="number"
                  min="1"
                  max="25"
                  required
                  value={formData.squadMax}
                  onChange={e => setFormData({ ...formData, squadMax: Number(e.target.value) })}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-sm font-mono focus:outline-none focus:border-emerald-400"
                />
              </div>
            </div>
          </div>

          {/* Bidding Parameters */}
          <div className="pt-4 border-t border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono mb-3">
              Bidding Rules & Timers
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1 font-mono">
                  Base Price ($M)
                </label>
                <input
                  id="create-auction-base-price"
                  type="number"
                  min="1"
                  max="100"
                  required
                  value={formData.basePrice}
                  onChange={e => setFormData({ ...formData, basePrice: Number(e.target.value) })}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-sm font-mono focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1 font-mono">
                  Bid Increment ($M)
                </label>
                <input
                  id="create-auction-increment"
                  type="number"
                  min="1"
                  max="50"
                  required
                  value={formData.increment}
                  onChange={e => setFormData({ ...formData, increment: Number(e.target.value) })}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-sm font-mono focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1 font-mono">
                  Timer (Seconds)
                </label>
                <input
                  id="create-auction-timer"
                  type="number"
                  min="5"
                  max="120"
                  required
                  value={formData.timerSeconds}
                  onChange={e => setFormData({ ...formData, timerSeconds: Number(e.target.value) })}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-sm font-mono focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1 font-mono">
                  Max Teams
                </label>
                <input
                  id="create-auction-max-teams"
                  type="number"
                  min="2"
                  max="32"
                  required
                  value={formData.maxTeams}
                  onChange={e => setFormData({ ...formData, maxTeams: Number(e.target.value) })}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-sm font-mono focus:outline-none focus:border-emerald-400"
                />
              </div>
            </div>
          </div>

          {/* Player Pool Filter */}
          <div className="pt-4 border-t border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono mb-3">
              Player Pool Filter (Era Range)
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1 font-mono">
                  Year From
                </label>
                <input
                  id="create-auction-year-from"
                  type="number"
                  min="1990"
                  max="2030"
                  required
                  value={formData.yearFrom}
                  onChange={e => setFormData({ ...formData, yearFrom: Number(e.target.value) })}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-sm font-mono focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1 font-mono">
                  Year To
                </label>
                <input
                  id="create-auction-year-to"
                  type="number"
                  min="1990"
                  max="2030"
                  required
                  value={formData.yearTo}
                  onChange={e => setFormData({ ...formData, yearTo: Number(e.target.value) })}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-sm font-mono focus:outline-none focus:border-emerald-400"
                />
              </div>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              Players from our 65+ master database matching this era will be automatically loaded into your auction pool. You can also add or customize players in the control room.
            </p>
          </div>

          <button
            id="create-auction-submit-btn"
            type="submit"
            disabled={loading}
            className="w-full py-4 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black text-sm uppercase tracking-wider font-['Chivo'] transition-all flex items-center justify-center gap-2 shadow-xl shadow-emerald-950/60"
          >
            <Sparkles className="w-5 h-5" />
            <span>{loading ? 'Initializing League...' : 'Create Auction & Generate Codes'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
