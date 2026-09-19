import React, { useEffect, useState } from 'react';
import {
  Trophy,
  Users,
  Download,
  Printer,
  ArrowLeft,
  DollarSign,
  Shield,
  FileText,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { TeamSheetModal } from '../components/TeamSheetModal';
import { Team, Player } from '../types';

interface ResultsPageProps {
  auctionId: string;
  onNavigate: (page: string, param?: string) => void;
}

export const ResultsPage: React.FC<ResultsPageProps> = ({ auctionId, onNavigate }) => {
  const { user } = useAuth();
  const { success, error: toastError } = useToast();

  const [auction, setAuction] = useState<any>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [soldPlayers, setSoldPlayers] = useState<Player[]>([]);
  const [unsoldPlayers, setUnsoldPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeamForSheet, setSelectedTeamForSheet] = useState<Team | null>(null);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const data = await api.getAuctionResults(auctionId);
        setAuction(data.auction);
        setTeams(data.teams || []);
        setSoldPlayers(data.soldPlayers || []);
        setUnsoldPlayers(data.unsoldPlayers || []);
      } catch (err: any) {
        toastError('Failed to load results', err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [auctionId, toastError]);

  const handleExportFullCSV = () => {
    let csv = 'data:text/csv;charset=utf-8,';
    csv += 'Auction Results Summary\n';
    csv += `Auction Name,"${auction?.name || 'Football Auction'}"\n`;
    csv += `Mode,"${auction?.mode || 'live'}"\n\n`;

    csv += 'TEAM STANDINGS & SPEND\n';
    csv += 'Team Name,Squad Count,Total Spent ($M),Purse Left ($M)\n';
    teams.forEach(t => {
      const spent = (t.squad || []).reduce((sum, p) => sum + (p.price || 0), 0);
      csv += `"${t.name}",${t.squad?.length || 0},${spent},${t.purseLeft}\n`;
    });

    csv += '\nSOLD PLAYERS DETAILS\n';
    csv += 'Player Name,Position,Club,Era,Rating,Winning Team,Price Paid ($M)\n';
    soldPlayers.forEach(p => {
      const team = teams.find(t => t._id === p.soldToTeamId);
      csv += `"${p.name}","${p.position}","${p.club}",${p.year},${p.rating},"${team?.name || 'Unknown'}",${p.soldPrice || p.basePrice}\n`;
    });

    csv += '\nUNSOLD PLAYERS\n';
    csv += 'Player Name,Position,Club,Era,Rating,Base Price ($M)\n';
    unsoldPlayers.forEach(p => {
      csv += `"${p.name}","${p.position}","${p.club}",${p.year},${p.rating},${p.basePrice}\n`;
    });

    const encodedUri = encodeURI(csv);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${(auction?.name || 'Auction').replace(/\s+/g, '_')}_Final_Results.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    success('Exported CSV Results');
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center text-slate-400 font-mono text-sm">
        Compiling final auction ledger...
      </div>
    );
  }

  const isHost = user?.id === auction?.hostId || user?.role === 'auctioneer';
  const myTeam = teams.find(
    t => t.ownerId === user?.id || t.ownerId === (user as any)?._id
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <button
            onClick={() => {
              if (isHost) onNavigate('host-dashboard');
              else onNavigate('my-teams');
            }}
            className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-white mb-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Dashboard</span>
          </button>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-['Chivo'] uppercase tracking-tight">
            Official Auction Results & Rosters
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {auction?.name} • Final Rosters, Expenditure & Unsold Ledger
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="export-csv-btn"
            onClick={handleExportFullCSV}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-bold uppercase flex items-center gap-2 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export Full CSV</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
          <span className="text-[11px] font-mono text-slate-400 uppercase block">Teams Registered</span>
          <span className="text-2xl font-black text-white font-mono">{teams.length}</span>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
          <span className="text-[11px] font-mono text-slate-400 uppercase block">Players Sold</span>
          <span className="text-2xl font-black text-emerald-400 font-mono">{soldPlayers.length}</span>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
          <span className="text-[11px] font-mono text-slate-400 uppercase block">Unsold Players</span>
          <span className="text-2xl font-black text-slate-400 font-mono">{unsoldPlayers.length}</span>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
          <span className="text-[11px] font-mono text-slate-400 uppercase block">Total League Spend</span>
          <span className="text-2xl font-black text-emerald-400 font-mono">
            ${soldPlayers.reduce((sum, p) => sum + (p.soldPrice || p.basePrice || 0), 0)}M
          </span>
        </div>
      </div>

      {/* Leaderboard / Team Standings */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-200 uppercase font-['Chivo'] tracking-wider flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <span>Team Roster Standings</span>
          </h2>
          <span className="text-xs text-slate-400 font-mono">
            Click any team for printable roster sheet
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map(team => {
            const isMyTeam = team._id === myTeam?._id;
            const totalSpent = (team.squad || []).reduce((sum, p) => sum + (p.price || 0), 0);
            const avgRating = team.squad?.length
              ? Math.round(team.squad.reduce((sum, p) => sum + (p.rating || 80), 0) / team.squad.length)
              : 0;

            return (
              <div
                key={team._id}
                onClick={() => setSelectedTeamForSheet(team)}
                className={`p-5 rounded-2xl border transition-all cursor-pointer hover:scale-[1.01] ${
                  isMyTeam
                    ? 'bg-slate-900/90 border-emerald-500/50 shadow-lg shadow-emerald-950/40'
                    : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Team Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-4 h-4 rounded-full border border-white/20"
                      style={{ backgroundColor: team.color || '#10b981' }}
                    />
                    <div>
                      <h3 className="font-bold text-white text-base leading-tight">
                        {team.name}
                      </h3>
                      {isMyTeam && (
                        <span className="text-[10px] font-mono text-emerald-400 font-bold">
                          YOUR TEAM
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-mono block">Avg OVR</span>
                    <span className="text-lg font-black text-amber-400 font-['Chivo']">
                      {avgRating || '—'}
                    </span>
                  </div>
                </div>

                {/* Team Financials */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono my-2 py-2 bg-slate-900/40 rounded-xl">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase block">Squad</span>
                    <span className="font-bold text-slate-200">{team.squad?.length || 0}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase block">Spent</span>
                    <span className="font-bold text-emerald-400">${totalSpent}M</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase block">Remaining</span>
                    <span className="font-bold text-slate-300">${team.purseLeft}M</span>
                  </div>
                </div>

                {/* Squad Members Preview */}
                <div className="mt-3 space-y-1">
                  {(!team.squad || team.squad.length === 0) ? (
                    <div className="text-center py-4 text-slate-600 text-xs font-mono">
                      No players signed
                    </div>
                  ) : (
                    team.squad.slice(0, 4).map((p, idx) => (
                      <div
                        key={p.playerId || idx}
                        className="flex items-center justify-between text-xs py-1 px-2 rounded bg-slate-900/50"
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] font-mono px-1 rounded bg-slate-800 text-slate-300">
                            {p.position || 'MID'}
                          </span>
                          <span className="text-slate-200 truncate max-w-[130px]">
                            {p.playerName || 'Player'}
                          </span>
                        </div>
                        <span className="font-mono font-bold text-emerald-400">${p.price}M</span>
                      </div>
                    ))
                  )}
                  {team.squad && team.squad.length > 4 && (
                    <div className="text-center text-[11px] text-slate-500 font-mono pt-1">
                      +{team.squad.length - 4} more players (Click for roster)
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Unsold Players Ledger */}
      {unsoldPlayers.length > 0 && (
        <div className="pt-4 border-t border-slate-800">
          <h2 className="text-base font-bold text-slate-300 uppercase font-['Chivo'] tracking-wider mb-4 flex items-center gap-2">
            <XCircle className="w-5 h-5 text-slate-500" />
            <span>Unsold Players Ledger ({unsoldPlayers.length})</span>
          </h2>

          <div className="rounded-2xl border border-slate-800 bg-slate-950 overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-900/80 text-slate-400 font-mono text-[11px] uppercase border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Player</th>
                  <th className="py-2.5 px-3">Position</th>
                  <th className="py-2.5 px-3">Club</th>
                  <th className="py-2.5 px-3">Era</th>
                  <th className="py-2.5 px-3 text-center">Rating</th>
                  <th className="py-2.5 px-3 text-right">Base Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {unsoldPlayers.map(p => (
                  <tr key={p._id} className="hover:bg-slate-900/40">
                    <td className="py-2.5 px-3 font-semibold text-slate-300">{p.name}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-400">
                        {p.position}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">{p.club}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-400">{p.year}</td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-400">
                      {p.rating}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-400">
                      ${p.basePrice}M
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Team Sheet Printable Modal */}
      {selectedTeamForSheet && (
        <TeamSheetModal
          team={selectedTeamForSheet}
          auctionName={auction?.name || 'Football League'}
          onClose={() => setSelectedTeamForSheet(null)}
        />
      )}
    </div>
  );
};
