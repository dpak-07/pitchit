import React, { useEffect, useState } from 'react';
import { Users, Trophy, Radio, ArrowRight, DollarSign, Calendar, Printer } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { TeamSheetModal } from '../components/TeamSheetModal';
import { Team } from '../types';

interface MyTeamsPageProps {
  onNavigate: (page: string, param?: string) => void;
}

export const MyTeamsPage: React.FC<MyTeamsPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const { error: toastError } = useToast();
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const data = await api.getMyTeams();
        setTeams(data.teams || []);
      } catch (err: any) {
        toastError('Failed to load squads', err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTeams();
  }, [toastError]);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center text-slate-400 font-mono text-sm">
        Loading your squads and past auctions...
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-['Chivo'] uppercase tracking-tight">
            My Football Franchises
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Your registered teams and rosters across all auction arenas
          </p>
        </div>

        <button
          onClick={() => onNavigate('join')}
          className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase font-['Chivo'] tracking-wider flex items-center gap-2 shadow-lg shadow-emerald-950/60"
        >
          <Radio className="w-4 h-4" />
          <span>Join New Auction</span>
        </button>
      </div>

      {teams.length === 0 ? (
        <div className="p-12 rounded-3xl border border-dashed border-slate-800 bg-slate-950/40 text-center">
          <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-300 font-['Chivo'] uppercase">
            No Teams Registered Yet
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-6">
            Join an auction with an access code (e.g. <strong>LEAGUE</strong> or <strong>CHAMP1</strong>) to draft your dream squad!
          </p>
          <button
            onClick={() => onNavigate('join')}
            className="px-4 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-black text-xs uppercase font-['Chivo'] tracking-wider"
          >
            Enter Room Code
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {teams.map(team => {
            const auction = team.auctionId;
            const isAuctionObj = typeof auction === 'object' && auction !== null;
            const auctionName = isAuctionObj ? auction.name : 'Football Auction';
            const auctionStatus = isAuctionObj ? auction.status : 'active';
            const auctionId = isAuctionObj ? auction._id : team.auctionId;
            const totalSpent = (team.squad || []).reduce((sum: number, p: any) => sum + (p.price || 0), 0);

            return (
              <div
                key={team._id}
                className="rounded-3xl border border-slate-800 bg-slate-950/90 p-5 shadow-xl flex flex-col justify-between hover:border-slate-700 transition-all"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-4 h-4 rounded-full border border-white/20 shrink-0"
                        style={{ backgroundColor: team.color || '#10b981' }}
                      />
                      <div>
                        <h3 className="text-lg font-black text-white font-['Chivo'] uppercase leading-tight">
                          {team.name}
                        </h3>
                        <span className="text-xs text-slate-400 truncate block max-w-[180px]">
                          {auctionName}
                        </span>
                      </div>
                    </div>

                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                      auctionStatus === 'live'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : auctionStatus === 'ended'
                        ? 'bg-slate-800 text-slate-400'
                        : 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                    }`}>
                      {auctionStatus}
                    </span>
                  </div>

                  {/* Financial metrics */}
                  <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono my-3 py-2 bg-slate-900/50 rounded-xl">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase block">Squad</span>
                      <span className="font-bold text-slate-200">{team.squad?.length || 0} Players</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase block">Spent</span>
                      <span className="font-bold text-emerald-400">${totalSpent}M</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase block">Purse Left</span>
                      <span className="font-bold text-slate-300">${team.purseLeft}M</span>
                    </div>
                  </div>

                  {/* Squad Preview */}
                  <div className="space-y-1.5 my-3">
                    {(!team.squad || team.squad.length === 0) ? (
                      <div className="text-xs text-slate-500 font-mono text-center py-3">
                        No players signed yet
                      </div>
                    ) : (
                      team.squad.slice(0, 3).map((item: any, idx: number) => (
                        <div
                          key={item.playerId || idx}
                          className="flex items-center justify-between text-xs py-1 px-2 rounded bg-slate-900/60"
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] font-mono font-bold px-1 rounded bg-slate-800 text-slate-300">
                              {item.position || 'MID'}
                            </span>
                            <span className="text-slate-200 truncate max-w-[130px]">
                              {item.playerName || 'Player'}
                            </span>
                          </div>
                          <span className="font-mono font-bold text-emerald-400">${item.price}M</span>
                        </div>
                      ))
                    )}
                    {team.squad && team.squad.length > 3 && (
                      <div className="text-[10px] font-mono text-slate-500 text-center">
                        +{team.squad.length - 3} more in squad
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setSelectedTeam(team)}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-mono flex items-center gap-1.5 transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Roster Sheet</span>
                  </button>

                  <button
                    onClick={() => {
                      if (auctionStatus === 'ended') {
                        onNavigate('results', auctionId);
                      } else {
                        onNavigate('live-room', auctionId);
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase font-['Chivo'] flex items-center gap-1.5 transition-colors"
                  >
                    <span>{auctionStatus === 'ended' ? 'Results' : 'Enter Arena'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedTeam && (
        <TeamSheetModal
          team={selectedTeam}
          auctionName="My Team Roster"
          onClose={() => setSelectedTeam(null)}
        />
      )}
    </div>
  );
};
