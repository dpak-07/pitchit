import React, { useState } from 'react';
import { Radio, Users, Sparkles, Shield, ArrowRight, Check } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

interface JoinAuctionPageProps {
  onNavigate: (page: string, param?: string) => void;
}

const colorPalette = [
  '#ef4444', // Crimson Red
  '#3b82f6', // Royal Blue
  '#10b981', // Emerald Green
  '#f59e0b', // Amber Gold
  '#8b5cf6', // Violet Purple
  '#06b6d4', // Cyan
  '#ec4899', // Pink
  '#f97316', // Orange
];

const logoOptions = ['👑', '⚽', '⚡', '🦅', '🦁', '🛡️', '🔥', '🏆', '⭐', '🐍'];

export const JoinAuctionPage: React.FC<JoinAuctionPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const { success, error: toastError } = useToast();

  const [roomCode, setRoomCode] = useState('');
  const [teamName, setTeamName] = useState(user ? `${user.name}'s XI` : 'Galacticos FC');
  const [selectedColor, setSelectedColor] = useState(colorPalette[0]);
  const [selectedLogo, setSelectedLogo] = useState(logoOptions[0]);
  const [loading, setLoading] = useState(false);

  const handleJoin = async (e?: React.FormEvent, customCode?: string) => {
    if (e) e.preventDefault();
    const targetCode = (customCode || roomCode).toUpperCase().trim();

    if (!targetCode) {
      toastError('Missing Code', 'Please enter a 6-character room code');
      return;
    }

    setLoading(true);
    try {
      const data = await api.joinAuction({
        roomCode: targetCode,
        teamName,
        color: selectedColor,
        logo: selectedLogo,
      });

      success('Joined Auction!', `Welcome to ${data.auction.name}`);
      onNavigate('live-room', data.auction._id);
    } catch (err: any) {
      toastError('Join Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 items-center justify-center text-emerald-400 mb-3 shadow-lg shadow-emerald-950/40">
            <Radio className="w-7 h-7 animate-pulse" />
          </div>
          <h1 className="text-3xl font-black text-white font-['Chivo'] uppercase tracking-tight">
            Join Auction Arena
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Enter room code & register your team franchise to start bidding
          </p>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-6">
          <form onSubmit={e => handleJoin(e)} className="space-y-4">
            {/* Room Code */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 font-mono">
                Room Access Code
              </label>
              <input
                id="join-room-code-input"
                type="text"
                required
                maxLength={8}
                value={roomCode}
                onChange={e => setRoomCode(e.target.value.toUpperCase())}
                placeholder="e.g. LEAGUE"
                className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-lg font-mono font-black tracking-widest uppercase focus:outline-none focus:border-emerald-400 text-center"
              />
            </div>

            {/* Team Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 font-mono">
                Your Team Name
              </label>
              <input
                id="join-team-name-input"
                type="text"
                required
                value={teamName}
                onChange={e => setTeamName(e.target.value)}
                placeholder="e.g. London Invincibles"
                className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-sm font-medium focus:outline-none focus:border-emerald-400"
              />
            </div>

            {/* Team Color & Crest */}
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 font-mono">
                  Club Primary Color
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {colorPalette.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setSelectedColor(color)}
                      className="w-8 h-8 rounded-full border-2 transition-transform flex items-center justify-center"
                      style={{
                        backgroundColor: color,
                        borderColor: selectedColor === color ? '#ffffff' : 'transparent',
                        transform: selectedColor === color ? 'scale(1.15)' : 'scale(1)',
                      }}
                    >
                      {selectedColor === color && <Check className="w-3.5 h-3.5 text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 font-mono">
                  Team Badge / Crest
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {logoOptions.map(logo => (
                    <button
                      key={logo}
                      type="button"
                      onClick={() => setSelectedLogo(logo)}
                      className={`text-lg p-1 rounded-lg border transition-all ${
                        selectedLogo === logo
                          ? 'bg-slate-800 border-emerald-400 scale-110'
                          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {logo}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              id="join-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full mt-4 py-3.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black text-sm uppercase tracking-wider font-['Chivo'] transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/60"
            >
              <span>{loading ? 'Entering Arena...' : 'Join Auction'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Rooms */}
          <div className="pt-4 border-t border-slate-800">
            <div className="flex items-center gap-1.5 mb-2.5 text-xs font-mono text-slate-400 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Available Demo Arenas</span>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  setRoomCode('LEAGUE');
                  handleJoin(undefined, 'LEAGUE');
                }}
                className="w-full p-3 rounded-xl bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/40 text-left transition-all flex items-center justify-between group"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-emerald-400 text-sm">LEAGUE</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 font-mono">LIVE MODE</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">World Legends Premier Auction 2026</div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setRoomCode('CHAMP1');
                  handleJoin(undefined, 'CHAMP1');
                }}
                className="w-full p-3 rounded-xl bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-amber-500/40 text-left transition-all flex items-center justify-between group"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-amber-400 text-sm">CHAMP1</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 font-mono">MANUAL MODE</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">Champions Classic (Manual Adjudication)</div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
