import React, { useState } from 'react';
import { Play, Pause, SkipForward, RotateCcw, StopCircle, Copy, Check, ShieldAlert } from 'lucide-react';
import { Auction } from '../types';

interface LiveControlPanelProps {
  auction: Auction;
  teamsCount: number;
  onStart: () => Promise<void>;
  onPause: () => Promise<void>;
  onResume: () => Promise<void>;
  onSkip: () => Promise<void>;
  onUndo: () => Promise<void>;
  onEnd: () => Promise<void>;
  loading?: boolean;
}

export const LiveControlPanel: React.FC<LiveControlPanelProps> = ({
  auction,
  teamsCount,
  onStart,
  onPause,
  onResume,
  onSkip,
  onUndo,
  onEnd,
  loading = false,
}) => {
  const [copiedRoom, setCopiedRoom] = useState(false);
  const [copiedHost, setCopiedHost] = useState(false);

  const copyToClipboard = (text: string, isHostCode = false) => {
    navigator.clipboard.writeText(text);
    if (isHostCode) {
      setCopiedHost(true);
      setTimeout(() => setCopiedHost(false), 2000);
    } else {
      setCopiedRoom(true);
      setTimeout(() => setCopiedRoom(false), 2000);
    }
  };

  const isLobby = auction.status === 'lobby' || auction.status === 'scheduled';
  const isLive = auction.status === 'live';
  const isPaused = auction.paused || auction.status === 'paused';
  const isEnded = auction.status === 'ended';
  const canStart = teamsCount >= 2;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 sm:p-5 backdrop-blur-md shadow-xl">
      {/* Code cards banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        {/* Room Code for Teams */}
        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="block text-[10px] font-mono uppercase tracking-wider text-slate-400">
              Team Join Code
            </span>
            <span className="text-xl font-black font-mono tracking-widest text-emerald-400">
              {auction.roomCode}
            </span>
          </div>
          <button
            id="copy-room-code-btn"
            onClick={() => copyToClipboard(auction.roomCode)}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            title="Copy Room Code"
          >
            {copiedRoom ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>

        {/* Auctioneer Code if manual mode */}
        {auction.mode === 'manual' && auction.auctioneerCode && (
          <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 flex items-center justify-between">
            <div>
              <span className="block text-[10px] font-mono uppercase tracking-wider text-amber-300/80">
                Secret Auctioneer Code
              </span>
              <span className="text-xl font-black font-mono tracking-widest text-amber-400">
                {auction.auctioneerCode}
              </span>
            </div>
            <button
              id="copy-auctioneer-code-btn"
              onClick={() => copyToClipboard(auction.auctioneerCode!, true)}
              className="p-2 rounded-lg bg-amber-900/40 hover:bg-amber-900/60 text-amber-300 transition-colors"
              title="Copy Host Code"
            >
              {copiedHost ? <Check className="w-4 h-4 text-amber-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        )}
      </div>

      {/* Main Control Actions */}
      <div className="space-y-3">
        {isLobby && (
          <div>
            <button
              id="host-start-auction-btn"
              disabled={loading || !canStart}
              onClick={onStart}
              className="w-full py-3.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:hover:bg-emerald-500 text-slate-950 font-black text-sm uppercase tracking-wider font-['Chivo'] transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50"
            >
              <Play className="w-5 h-5 fill-slate-950" />
              <span>{canStart ? 'Launch Live Auction' : 'Awaiting Teams (Min 2 Required)'}</span>
            </button>
            {!canStart && (
              <p className="text-[11px] text-amber-400/80 text-center mt-1.5 flex items-center justify-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5" />
                {teamsCount} of 2 required teams joined
              </p>
            )}
          </div>
        )}

        {(isLive || isPaused) && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {isPaused ? (
              <button
                id="host-resume-btn"
                disabled={loading}
                onClick={onResume}
                className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5"
              >
                <Play className="w-4 h-4" />
                <span>Resume</span>
              </button>
            ) : (
              <button
                id="host-pause-btn"
                disabled={loading}
                onClick={onPause}
                className="py-2.5 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5"
              >
                <Pause className="w-4 h-4" />
                <span>Pause</span>
              </button>
            )}

            <button
              id="host-skip-btn"
              disabled={loading}
              onClick={onSkip}
              className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5"
            >
              <SkipForward className="w-4 h-4" />
              <span>Pass/Skip</span>
            </button>

            <button
              id="host-undo-btn"
              disabled={loading || !auction.lastSoldRecord}
              onClick={onUndo}
              title={auction.lastSoldRecord ? 'Reverse the last completed sale' : 'No sale to undo'}
              className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Undo Sale</span>
            </button>

            <button
              id="host-end-btn"
              disabled={loading}
              onClick={() => {
                if (window.confirm('Are you sure you want to end this auction? Final results will be finalized.')) {
                  onEnd();
                }
              }}
              className="py-2.5 px-3 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-500/30 text-rose-300 font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5"
            >
              <StopCircle className="w-4 h-4" />
              <span>End Auction</span>
            </button>
          </div>
        )}

        {isEnded && (
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-center">
            <span className="text-sm font-bold text-slate-300 font-['Chivo'] uppercase">
              Auction Ended
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
