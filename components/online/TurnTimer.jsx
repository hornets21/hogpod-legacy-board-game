"use client";

import { motion } from "motion/react";

export default function TurnTimer({ timeLeft = 45, maxTime = 45, isMyTurn = false }) {
  const pct = Math.max(0, Math.min(100, (timeLeft / maxTime) * 100));
  const isUrgent = timeLeft <= 5;

  return (
    <div className="flex items-center gap-3 bg-black/60 border border-white/10 rounded-xl px-4 py-2 backdrop-blur-md">
      <div className="flex flex-col">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          {isMyTurn ? "Your Turn" : "Turn Time"}
        </span>
        <span
          className={`text-lg font-black font-mono leading-none ${
            isUrgent ? "text-red-400" : isMyTurn ? "text-emerald-400" : "text-amber-300"
          }`}
        >
          {timeLeft}s
        </span>
      </div>

      <div className="w-24 h-2.5 bg-black/60 rounded-full overflow-hidden border border-white/10">
        <motion.div
          className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            backgroundColor: isUrgent ? "#ef4444" : isMyTurn ? "#22c55e" : "#f2c75c",
          }}
          animate={isUrgent ? { opacity: [1, 0.4, 1] } : {}}
          transition={isUrgent ? { repeat: Infinity, duration: 0.5 } : {}}
        />
      </div>
    </div>
  );
}
