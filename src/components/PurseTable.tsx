import React from 'react';
import { Users, DollarSign, ShieldAlert, Award } from 'lucide-react';
import { Team } from '../types';

interface PurseTableProps {
  teams: Team[];
  myTeamId?: string;
  currentBidderId?: string | null;
  squadMin: number;
  squadMax: number;
  basePrice: number;
  onSelectTeam?: (team: Team) => void;
}

export const PurseTable: React.FC<PurseTableProps> = ({
  teams,
  myTeamId,
  currentBidderId,
  squadMin,
  squadMax,
  basePrice,
  onSelectTeam,
}) => {
  return (
    <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 overflow-hidden backdrop-blur-sm">
      <div className="p-3.5 sm:p-4 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-emerald-400" />
          <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-200">
            Live Teams & Purses
          </h4>
        </div>
        <span className="text-[11px] font-mono text-slate-400">
          {teams.length} Teams Registered
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs sm:text-sm">
          <thead className="bg-slate-900/60 text-slate-400 text-[11px] font-mono uppercase border-b border-slate-800/60">
            <tr>
              <th className="py-2.5 px-3">Team</th>
              <th className="py-2.5 px-3 text-right">Purse Left</th>
              <th className="py-2.5 px-3 text-center">Squad</th>
              <th className="py-2.5 px-3 text-right">Max Bid</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/40">
            {teams.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-6 text-center text-slate-500 text-xs">
                  No teams joined yet
                </td>
              </tr>
            ) : (
              teams.map(team => {
                const isMyTeam = team._id === myTeamId;
                const isCurrentBidder = team._id === currentBidderId;
                const squadSize = team.squad?.length || 0;
                const neededForMin = Math.max(0, squadMin - squadSize - 1);
                const requiredReserve = neededForMin * basePrice;
                const maxBid = Math.max(0, team.purseLeft - requiredReserve);
                const isFull = squadSize >= squadMax;

                return (
                  <tr
                    key={team._id}
                    onClick={() => onSelectTeam?.(team)}
                    className={`transition-colors ${
                      isCurrentBidder
                        ? 'bg-emerald-950/40 border-l-2 border-emerald-400'
                        : isMyTeam
                        ? 'bg-slate-800/40'
                        : 'hover:bg-slate-900/40'
                    } ${onSelectTeam ? 'cursor-pointer' : ''}`}
                  >
                    {/* Team info */}
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full shrink-0 border border-white/20"
                          style={{ backgroundColor: team.color || '#10b981' }}
                        />
                        <span className="font-semibold text-slate-200 truncate max-w-[130px] sm:max-w-none">
                          {team.name}
                        </span>
                        {isMyTeam && (
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                            YOU
                          </span>
                        )}
                        {isCurrentBidder && (
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30 animate-pulse">
                            TOP
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Purse */}
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-100">
                      ${team.purseLeft}M
                    </td>

                    {/* Squad count */}
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`inline-block font-mono text-xs px-2 py-0.5 rounded-full ${
                          isFull
                            ? 'bg-rose-950/60 text-rose-300 border border-rose-500/40 font-bold'
                            : squadSize >= squadMin
                            ? 'bg-emerald-950/50 text-emerald-300'
                            : 'bg-slate-800/80 text-slate-300'
                        }`}
                      >
                        {squadSize}/{squadMax}
                      </span>
                    </td>

                    {/* Max Bid allowed */}
                    <td className="py-2.5 px-3 text-right font-mono font-semibold">
                      {isFull ? (
                        <span className="text-rose-400 text-xs">FULL</span>
                      ) : (
                        <span className={maxBid > 0 ? 'text-emerald-400' : 'text-slate-500'}>
                          ${maxBid}M
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="p-2.5 bg-slate-900/40 border-t border-slate-800/60 text-[11px] text-slate-500 flex items-center justify-between">
        <span>Reserve Rule Active: Min Squad {squadMin}</span>
        <span>Base ${basePrice}M</span>
      </div>
    </div>
  );
};
