"use client";

import { useEffect, useState } from "react";

export default function MarqueeTicker({ announcements = [] }) {
  const [currentText, setCurrentText] = useState("");

  useEffect(() => {
    if (announcements.length > 0) {
      const latest = announcements.slice(-3).reverse().join("   ✦   ");
      setCurrentText(latest);
    }
  }, [announcements]);

  if (!currentText) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-slate-950/90 border border-amber-500/40 backdrop-blur-md shadow-[0_0_20px_rgba(245,158,11,0.2)] max-w-xs sm:max-w-md md:max-w-lg overflow-hidden shrink min-w-0">
      <div className="flex items-center gap-1 text-amber-400 bg-amber-950/60 border border-amber-500/40 px-2 py-0.5 rounded-xl shrink-0">
        <span className="text-xs animate-pulse">📢</span>
        <span className="font-extrabold uppercase tracking-wider text-[9px]">NPC News</span>
      </div>
      <div className="overflow-hidden relative w-full min-w-0">
        <div className="whitespace-nowrap inline-block animate-marquee text-xs font-semibold text-amber-200 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
          {currentText}
        </div>
      </div>
    </div>
  );
}
