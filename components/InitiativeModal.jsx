"use client";

import { useEffect, useState } from "react";

export default function InitiativeModal({ initiativeRolls, onStartPlay, onOpenAdmin }) {
  const [isRevealed, setIsRevealed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsRevealed(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  if (!initiativeRolls || initiativeRolls.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none overflow-y-auto bg-slate-950/90 backdrop-blur-xl animate-fade-in">
      <div className="max-w-2xl w-full flex flex-col items-center text-center p-6 md:p-8 rounded-3xl bg-slate-900/95 border-2 border-amber-500/50 shadow-[0_0_60px_rgba(245,158,11,0.3)]">
        
        {/* Header Icon */}
        <div className="w-20 h-20 mb-4 rounded-2xl bg-gradient-to-br from-amber-500/30 to-purple-900/40 border-2 border-amber-400/60 flex items-center justify-center shadow-lg animate-bounce">
          <span className="text-4xl">🎲</span>
        </div>

        {/* Title */}
        <h2 className="text-2xl md:text-3xl font-black text-amber-300 uppercase tracking-wider mb-1">
          สุ่มทอยเต๋าจัดลำดับการเดิน!
        </h2>
        <p className="text-xs text-white/60 font-bold mb-6">
          ผู้ที่ทอยเต๋าได้คะแนนสูงที่สุด จะได้รับสิทธิ์เดินกระดานเป็นคนแรก
        </p>

        {/* Rolls Cards Grid */}
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          {initiativeRolls.map((item, rank) => {
            const p = item.player;
            const isWinner = rank === 0;

            return (
              <div
                key={p.houseId}
                className={`p-4 rounded-2xl border-2 flex items-center justify-between transition-all duration-500 ${
                  isWinner && isRevealed
                    ? "bg-amber-500/20 border-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.4)] scale-105"
                    : "bg-slate-800/80 border-white/10"
                }`}
                style={{ borderColor: isWinner && isRevealed ? "#f59e0b" : p.color || "#ffffff30" }}
              >
                <div className="flex items-center gap-3">
                  <div className="text-xl font-black text-amber-400 w-6 text-center">
                    #{rank + 1}
                  </div>
                  <div className="w-12 h-12 rounded-xl border border-white/20 bg-black flex items-center justify-center overflow-hidden">
                    {p.image ? (
                      <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl">{p.emoji}</span>
                    )}
                  </div>
                  <div className="text-left">
                    <div className="font-black text-white text-sm">{p.name}</div>
                    <div className="text-[10px] text-white/50 font-bold">{p.house}</div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] text-white/50 uppercase font-black">คะแนนเต๋า</div>
                  <div className={`text-2xl font-black ${isWinner && isRevealed ? "text-amber-300 animate-pulse" : "text-emerald-400"}`}>
                    {isRevealed ? item.score : "..."}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Winner Banner */}
        {isRevealed && (
          <div className="w-full p-3 rounded-2xl bg-amber-500/20 border border-amber-400/50 mb-6 text-amber-200 font-black text-sm flex items-center justify-center gap-2 animate-fade-in">
            <span>🏆</span>
            <span>{initiativeRolls[0].player.name} ได้คะแนนสูงสุด ({initiativeRolls[0].score} แต้ม) เริ่มเดินเป็นคนแรก!</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="w-full flex flex-col sm:flex-row items-center gap-3">
          {onOpenAdmin && (
            <button
              onClick={onOpenAdmin}
              className="w-full sm:w-auto py-4 px-6 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 border-2 border-amber-500/50 text-amber-300 font-black text-sm flex items-center justify-center gap-2 transition-all hover:scale-105"
              title="เปิด Admin Panel เพื่อจัดอุปกรณ์ เงิน และสถานะก่อนเริ่มกระดาน"
            >
              <span>👑</span>
              <span>ตั้งค่า Admin (Pay To Win)</span>
            </button>
          )}

          <button
            onClick={onStartPlay}
            className="flex-1 w-full py-4 px-8 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-base shadow-[0_0_30px_rgba(245,158,11,0.5)] border border-amber-200 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
          >
            <span>🎮</span>
            <span>เข้าสู่การแข่งขัน (START TURN 1)</span>
          </button>
        </div>

      </div>
    </div>
  );
}
