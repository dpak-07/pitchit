import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, MapPin, Calendar, Award, DollarSign } from 'lucide-react';
import { Player, PlayerPosition } from '../types';

interface PlayerCardProps {
  player: Player | null;
  soldToTeamName?: string;
  soldPrice?: number;
  isCurrentAuctionPlayer?: boolean;
}

const positionColors: Record<PlayerPosition, { badge: string; border: string; glow: string }> = {
  GK: {
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    border: 'border-emerald-500/30',
    glow: 'from-emerald-500/10',
  },
  DEF: {
    badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    border: 'border-cyan-500/30',
    glow: 'from-cyan-500/10',
  },
  MID: {
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    border: 'border-amber-500/30',
    glow: 'from-amber-500/10',
  },
  FWD: {
    badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    border: 'border-rose-500/30',
    glow: 'from-rose-500/10',
  },
};

export const PlayerCard: React.FC<PlayerCardProps> = ({
  player,
  soldToTeamName,
  soldPrice,
  isCurrentAuctionPlayer = false,
}) => {
  if (!player) {
    return (
      <div className="relative aspect-[3/4] max-w-sm mx-auto rounded-3xl border border-dashed border-slate-800 bg-slate-900/40 flex flex-col items-center justify-center p-6 text-center text-slate-500">
        <Shield className="w-12 h-12 stroke-[1.5] mb-2 opacity-40" />
        <p className="text-sm font-medium">Awaiting next player</p>
        <p className="text-xs text-slate-600 mt-1">Stand by for host or countdown</p>
      </div>
    );
  }

  const posStyle = positionColors[player.position] || positionColors.MID;
  const isSold = player.status === 'sold' || !!soldToTeamName;
  const isUnsold = player.status === 'unsold';

  return (
    <div
      id={`player-card-${player._id}`}
      className={`relative w-full max-w-sm mx-auto rounded-3xl overflow-hidden border ${posStyle.border} bg-gradient-to-b ${posStyle.glow} via-slate-900 to-slate-950 p-4 sm:p-5 shadow-2xl transition-all`}
    >
      {/* Stadium Card Header */}
      <div className="flex items-start justify-between relative z-10">
        <div className="flex flex-col">
          {/* Rating */}
          <div className="flex items-baseline gap-1">
            <span className="text-4xl sm:text-5xl font-extrabold tracking-tighter font-['Chivo'] text-white">
              {player.rating}
            </span>
          </div>
          {/* Position */}
          <span
            className={`inline-block px-2.5 py-0.5 rounded-md text-xs font-bold font-mono tracking-wider border mt-1 ${posStyle.badge}`}
          >
            {player.position}
          </span>
        </div>

        {/* Year & Base Price Chips */}
        <div className="flex flex-col items-end gap-1.5">
          <span className="flex items-center gap-1 text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-slate-800/80 text-slate-300 border border-slate-700">
            <Calendar className="w-3 h-3 text-slate-400" />
            {player.year}
          </span>
          <span className="flex items-center gap-1 text-[11px] font-mono font-bold px-2.5 py-1 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-500/30">
            <DollarSign className="w-3 h-3 text-emerald-400" />
            Base: {player.basePrice}M
          </span>
        </div>
      </div>

      {/* Player Photo with Stadium Lighting */}
      <div className="relative my-2 flex justify-center items-center">
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent z-10 pointer-events-none" />
        <div className="w-44 h-44 sm:w-52 sm:h-52 rounded-2xl overflow-hidden bg-slate-800/60 border border-slate-800 relative">
          <img
            src={player.imageUrl}
            alt={player.name}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-top filter contrast-105"
            onError={e => {
              // Graceful fallback avatar if image fails
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        </div>

        {/* SOLD Rubber Stamp Animation */}
        <AnimatePresence>
          {isSold && (
            <motion.div
              initial={{ scale: 2.2, opacity: 0, rotate: -25 }}
              animate={{ scale: 1, opacity: 1, rotate: -14 }}
              exit={{ opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 15 }}
              className="absolute z-30 inset-0 flex flex-col items-center justify-center pointer-events-none"
            >
              <div className="border-4 border-rose-500/90 rounded-2xl px-6 py-2 bg-rose-950/80 backdrop-blur-md shadow-2xl shadow-rose-900/80 text-center">
                <span className="block text-3xl sm:text-4xl font-black tracking-widest text-rose-400 font-['Chivo'] uppercase">
                  SOLD!
                </span>
                <span className="block text-xs sm:text-sm font-bold text-white tracking-wide mt-0.5">
                  {soldToTeamName || 'Winning Team'} • {soldPrice || player.soldPrice}M
                </span>
              </div>
            </motion.div>
          )}

          {isUnsold && (
            <motion.div
              initial={{ scale: 1.8, opacity: 0, rotate: 12 }}
              animate={{ scale: 1, opacity: 1, rotate: 8 }}
              className="absolute z-30 inset-0 flex items-center justify-center pointer-events-none"
            >
              <div className="border-4 border-slate-600 rounded-2xl px-6 py-2 bg-slate-950/90 backdrop-blur-md text-center">
                <span className="text-2xl sm:text-3xl font-black tracking-widest text-slate-400 font-['Chivo'] uppercase">
                  UNSOLD
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Name and Club Credentials */}
      <div className="relative z-10 pt-1 text-center">
        <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight font-['Chivo'] uppercase truncate">
          {player.name}
        </h3>

        <div className="flex items-center justify-center gap-3 mt-2 text-xs text-slate-400">
          <span className="flex items-center gap-1 font-medium">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            {player.club}
          </span>
          <span className="text-slate-600">•</span>
          <span className="flex items-center gap-1 font-medium">
            <MapPin className="w-3.5 h-3.5 text-sky-400" />
            {player.nationality}
          </span>
        </div>
      </div>
    </div>
  );
};
