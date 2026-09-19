import React from 'react';
import { Shield, Trophy, PlusCircle, Users, LogOut, Radio, UserCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  currentPage: string;
  onNavigate: (page: string, param?: string) => void;
  activeRoomCode?: string;
}

export const Navbar: React.FC<NavbarProps> = ({ currentPage, onNavigate, activeRoomCode }) => {
  const { user, logout } = useAuth();

  return (
    <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <div
          id="nav-brand"
          onClick={() => {
            if (user?.role === 'auctioneer') onNavigate('host-dashboard');
            else if (user?.role === 'player') onNavigate('my-teams');
            else onNavigate('login');
          }}
          className="flex items-center gap-3 cursor-pointer group select-none"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-lg shadow-emerald-950/50 group-hover:scale-105 transition-transform border border-emerald-400/30">
            <Trophy className="w-5 h-5 text-emerald-950 fill-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight text-white font-['Chivo'] uppercase">
                Pitch<span className="text-emerald-400">Bid</span>
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono font-semibold">
                PRO
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">Football Player Auction Arena</p>
          </div>
        </div>

        {/* Live Arena indicator if inside a room */}
        {activeRoomCode && (
          <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs font-mono">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>ROOM: <strong className="text-white">{activeRoomCode}</strong></span>
          </div>
        )}

        {/* Navigation Links */}
        <nav className="flex items-center gap-2 sm:gap-3">
          {user ? (
            <>
              {user.role === 'auctioneer' ? (
                <>
                  <button
                    id="nav-host-dashboard"
                    onClick={() => onNavigate('host-dashboard')}
                    className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                      currentPage === 'host-dashboard'
                        ? 'bg-emerald-500 text-slate-950 font-semibold'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <Shield className="w-4 h-4" />
                    <span>My Auctions</span>
                  </button>
                  <button
                    id="nav-host-create"
                    onClick={() => onNavigate('host-create')}
                    className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                      currentPage === 'host-create'
                        ? 'bg-emerald-500 text-slate-950 font-semibold'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Create Auction</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    id="nav-join-auction"
                    onClick={() => onNavigate('join')}
                    className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                      currentPage === 'join'
                        ? 'bg-emerald-500 text-slate-950 font-semibold'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <Radio className="w-4 h-4" />
                    <span>Join Room</span>
                  </button>
                  <button
                    id="nav-my-teams"
                    onClick={() => onNavigate('my-teams')}
                    className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                      currentPage === 'my-teams'
                        ? 'bg-emerald-500 text-slate-950 font-semibold'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    <span>My Squads</span>
                  </button>
                </>
              )}

              {/* User badge */}
              <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
                <div className="hidden lg:block text-right">
                  <div className="text-xs font-semibold text-slate-200 leading-none truncate max-w-[120px]">{user.name}</div>
                  <span className={`text-[10px] uppercase font-bold tracking-wider ${
                    user.role === 'auctioneer' ? 'text-amber-400' : 'text-emerald-400'
                  }`}>
                    {user.role}
                  </span>
                </div>

                <button
                  id="nav-logout-btn"
                  onClick={() => {
                    logout();
                    onNavigate('login');
                  }}
                  title="Logout"
                  className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-900 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <button
                id="nav-login-btn"
                onClick={() => onNavigate('login')}
                className="px-3.5 py-1.5 text-sm font-medium rounded-lg text-slate-200 hover:text-white hover:bg-slate-800/80 transition-colors"
              >
                Sign In
              </button>
              <button
                id="nav-register-btn"
                onClick={() => onNavigate('register')}
                className="px-3.5 py-1.5 text-sm font-semibold rounded-lg bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition-colors"
              >
                Register
              </button>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
};
