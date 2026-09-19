import React, { useState } from 'react';
import { Gavel, XCircle, CheckCircle2, DollarSign, AlertCircle } from 'lucide-react';
import { Team, Player } from '../types';

interface ManualControlPanelProps {
  player: Player | null;
  teams: Team[];
  squadMin: number;
  basePrice: number;
  onConfirmSale: (teamId: string, amount: number) => Promise<void>;
  onMarkUnsold: () => Promise<void>;
  loading?: boolean;
}

export const ManualControlPanel: React.FC<ManualControlPanelProps> = ({
  player,
  teams,
  squadMin,
  basePrice,
  onConfirmSale,
  onMarkUnsold,
  loading = false,
}) => {
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [amount, setAmount] = useState<number>(player?.basePrice || basePrice || 5);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const selectedTeam = teams.find(t => t._id === selectedTeamId);

  // Calculate max allowed for selected team
  let maxAllowed = 0;
  if (selectedTeam) {
    const currentSquadSize = selectedTeam.squad?.length || 0;
    const needed = Math.max(0, squadMin - currentSquadSize - 1);
    const requiredReserve = needed * basePrice;
    maxAllowed = Math.max(0, selectedTeam.purseLeft - requiredReserve);
  }

  const handleConfirm = async () => {
    setErrorMsg(null);
    if (!selectedTeamId) {
      setErrorMsg('Please select a winning team');
      return;
    }
    if (amount <= 0) {
      setErrorMsg('Bid amount must be greater than zero');
      return;
    }
    if (amount > maxAllowed) {
      setErrorMsg(`Amount exceeds team's max permitted bid of $${maxAllowed}M (Squad Reserve Rule)`);
      return;
    }

    try {
      await onConfirmSale(selectedTeamId, amount);
      setSelectedTeamId('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Sale failed');
    }
  };

  return (
    <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 p-5 shadow-xl">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-800">
        <Gavel className="w-5 h-5 text-amber-400" />
        <div>
          <h4 className="text-sm font-black uppercase tracking-wider text-slate-100 font-['Chivo']">
            Manual Auctioneer Console
          </h4>
          <p className="text-xs text-slate-400">Host adjudicates and confirms sale amounts</p>
        </div>
      </div>

      {errorMsg && (
        <div className="mb-4 p-3 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="space-y-4">
        {/* Team Selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 font-mono">
            Winning Team
          </label>
          <select
            id="manual-team-select"
            value={selectedTeamId}
            onChange={e => {
              setSelectedTeamId(e.target.value);
              setErrorMsg(null);
            }}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-sm font-medium focus:outline-none focus:border-amber-400"
          >
            <option value="">-- Choose Winning Team --</option>
            {teams.map(team => {
              const currentSquadSize = team.squad?.length || 0;
              const needed = Math.max(0, squadMin - currentSquadSize - 1);
              const maxBid = Math.max(0, team.purseLeft - needed * basePrice);
              return (
                <option key={team._id} value={team._id}>
                  {team.name} (Purse: ${team.purseLeft}M | Max Bid: ${maxBid}M)
                </option>
              );
            })}
          </select>
        </div>

        {/* Amount Input */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
              Final Hammer Price ($M)
            </label>
            {selectedTeam && (
              <span className="text-[11px] font-mono text-emerald-400">
                Max Allowed: ${maxAllowed}M
              </span>
            )}
          </div>
          <div className="relative">
            <DollarSign className="w-5 h-5 text-slate-400 absolute left-3 top-2.5" />
            <input
              id="manual-amount-input"
              type="number"
              min={player?.basePrice || 1}
              max={maxAllowed || 500}
              value={amount}
              onChange={e => setAmount(Number(e.target.value))}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-lg font-bold font-mono focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* Quick preset increments */}
          <div className="flex gap-2 mt-2">
            {[1, 2, 5, 10].map(inc => (
              <button
                key={inc}
                type="button"
                onClick={() => setAmount(prev => prev + inc)}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono font-semibold transition-colors"
              >
                +{inc}M
              </button>
            ))}
            <button
              type="button"
              onClick={() => setAmount(player?.basePrice || basePrice)}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs font-mono transition-colors ml-auto"
            >
              Reset to Base
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            id="manual-confirm-sell-btn"
            type="button"
            disabled={loading || !selectedTeamId}
            onClick={handleConfirm}
            className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black tracking-wide text-sm font-['Chivo'] uppercase transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Confirm Sale</span>
          </button>

          <button
            id="manual-mark-unsold-btn"
            type="button"
            disabled={loading}
            onClick={onMarkUnsold}
            className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-rose-950/60 hover:text-rose-300 hover:border-rose-500/40 border border-slate-700 text-slate-300 font-bold text-sm font-['Chivo'] uppercase transition-all flex items-center justify-center gap-2"
          >
            <XCircle className="w-4 h-4" />
            <span>Pass (Unsold)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
