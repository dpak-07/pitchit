import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { History, TrendingUp } from 'lucide-react';
import { Bid } from '../types';

interface BidLogProps {
  bids: Bid[];
  currentBid: number;
}

export const BidLog: React.FC<BidLogProps> = ({ bids, currentBid }) => {
  return (
    <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-4 backdrop-blur-sm flex flex-col h-full max-h-[360px]">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3 shrink-0">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-emerald-400" />
          <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-200">
            Bid History
          </h4>
        </div>
        <span className="text-[11px] font-mono text-slate-400">
          {bids.length} {bids.length === 1 ? 'Bid' : 'Bids'}
        </span>
      </div>

      <div className="overflow-y-auto space-y-2 pr-1 flex-1">
        {bids.length === 0 ? (
          <div className="h-28 flex flex-col items-center justify-center text-center text-slate-500 text-xs">
            <TrendingUp className="w-6 h-6 mb-1 opacity-30" />
            <span>No bids placed yet</span>
            <span className="text-[10px] text-slate-600 mt-0.5">Place opening bid at base price</span>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {bids.map((bid, index) => {
              const isTop = index === 0;
              return (
                <motion.div
                  key={bid._id || `${bid.amount}-${bid.createdAt}-${index}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`flex items-center justify-between p-2.5 rounded-xl border text-xs sm:text-sm font-mono transition-all ${
                    isTop
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200 shadow-sm'
                      : 'bg-slate-900/50 border-slate-800/60 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${isTop ? 'bg-emerald-400 animate-ping' : 'bg-slate-600'}`} />
                    <span className="font-semibold text-slate-100 truncate max-w-[140px]">
                      {bid.teamName || 'Team'}
                    </span>
                  </div>

                  <div className="flex items-baseline gap-1">
                    <span className={`font-black ${isTop ? 'text-emerald-400 text-base' : 'text-slate-200'}`}>
                      ${bid.amount}M
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};
