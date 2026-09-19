import React from 'react';
import { X, Printer, Download, Trophy, Shield, DollarSign } from 'lucide-react';
import { Team } from '../types';

interface TeamSheetModalProps {
  team: Team | null;
  auctionName: string;
  onClose: () => void;
}

export const TeamSheetModal: React.FC<TeamSheetModalProps> = ({ team, auctionName, onClose }) => {
  if (!team) return null;

  const totalSpent = (team.squad || []).reduce((acc, p) => acc + (p.price || 0), 0);
  const avgRating = team.squad?.length
    ? Math.round(team.squad.reduce((acc, p) => acc + (p.rating || 80), 0) / team.squad.length)
    : 0;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Team Name,Player Name,Position,Rating,Price Paid ($M)\n';
    team.squad.forEach(player => {
      csvContent += `"${team.name}","${player.playerName || 'Player'}","${player.position || 'MID'}",${player.rating || 0},${player.price}\n`;
    });
    csvContent += `\n"Total Spent",,,,${totalSpent}\n`;
    csvContent += `"Purse Remaining",,,,${team.purseLeft}\n`;

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${team.name.replace(/\s+/g, '_')}_Team_Sheet.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-700 bg-slate-950 p-6 shadow-2xl text-slate-100 print:border-none print:shadow-none print:p-0">
        {/* Modal Controls */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 print:hidden">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-emerald-400" />
            <h3 className="text-lg font-black font-['Chivo'] uppercase tracking-wide">
              Official Team Roster Sheet
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadCSV}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-medium flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-medium flex items-center gap-1.5 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Team Sheet Card */}
        <div className="mt-4 p-5 rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <span
                  className="w-4 h-4 rounded-full border border-white/20"
                  style={{ backgroundColor: team.color || '#10b981' }}
                />
                <h2 className="text-2xl font-black font-['Chivo'] uppercase tracking-tight text-white">
                  {team.name}
                </h2>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{auctionName}</p>
            </div>

            <div className="text-right">
              <span className="text-xs font-mono uppercase text-slate-400 block">Avg Squad Rating</span>
              <span className="text-3xl font-black font-['Chivo'] text-emerald-400">{avgRating}</span>
            </div>
          </div>

          {/* Stats Summary Bar */}
          <div className="grid grid-cols-3 gap-3 my-4">
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-center">
              <span className="text-[11px] text-slate-400 uppercase font-mono block">Squad Size</span>
              <span className="text-xl font-black text-slate-100 font-mono">
                {team.squad?.length || 0} Players
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-center">
              <span className="text-[11px] text-slate-400 uppercase font-mono block">Total Spent</span>
              <span className="text-xl font-black text-emerald-400 font-mono">
                ${totalSpent}M
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-center">
              <span className="text-[11px] text-slate-400 uppercase font-mono block">Purse Left</span>
              <span className="text-xl font-black text-slate-200 font-mono">
                ${team.purseLeft}M
              </span>
            </div>
          </div>

          {/* Player Lineup Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-[11px] font-mono uppercase text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Pos</th>
                  <th className="py-2.5 px-3">Player Name</th>
                  <th className="py-2.5 px-3 text-center">OVR</th>
                  <th className="py-2.5 px-3 text-right">Price Paid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {(!team.squad || team.squad.length === 0) ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-500 text-xs">
                      No players acquired yet
                    </td>
                  </tr>
                ) : (
                  team.squad.map((item, idx) => (
                    <tr key={item.playerId || idx} className="hover:bg-slate-900/40">
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-300">
                          {item.position || 'MID'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-200">
                        {item.playerName || 'Player'}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-300">
                        {item.rating || 82}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">
                        ${item.price}M
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
