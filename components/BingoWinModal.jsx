"use client";

import { useEffect } from "react";
import { emit, FX_EVENTS } from "@/lib/skillFxBus";

export default function BingoWinModal({ modalData, onClose }) {
  useEffect(() => {
    if (modalData) {
      emit(FX_EVENTS.VICTORY);
    }
  }, [modalData]);

  if (!modalData) return null;

  const { playerName, playerColor, playerEmoji, playerImage, linesCount = 1, goldReward = 10000 } = modalData;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in pointer-events-auto select-none"
      onClick={typeof onClose === "function" ? onClose : undefined}
    >
      <div
        className="relative w-full max-w-lg rounded-3xl bg-gradient-to-b from-[#2d1e17] via-[#1a110e] to-[#0b0604] border-2 border-amber-500/60 shadow-[0_0_80px_rgba(245,158,11,0.5)] p-6 text-white flex flex-col items-center text-center overflow-hidden animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Background Radiant Aura Effect */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header Icon & Animated Logo */}
        <div className="relative mb-2 flex flex-col items-center">
          <img
            src="/images/system/logo_bingo.webp"
            alt="BINGO WIN"
            className="h-20 w-auto object-contain drop-shadow-[0_4px_20px_rgba(245,158,11,0.8)] animate-bounce-slow"
          />
          <span className="mt-2 text-xs font-serif font-black tracking-[0.3em] text-amber-400 uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            🎯 VICTORY ANNOUNCEMENT 🎯
          </span>
        </div>

        {/* Big Celebration Title */}
        <h2 className="text-2xl sm:text-3xl font-serif font-black bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500 bg-clip-text text-transparent drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)] mb-3">
          🎉 BINGO SUCCESS! 🎉
        </h2>

        {/* Player Badge Slot */}
        <div
          className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-black/60 border border-white/20 shadow-inner mb-4"
          style={{ borderColor: playerColor || "#f59e0b" }}
        >
          <div
            className="w-10 h-10 rounded-xl border-2 overflow-hidden bg-slate-900 flex items-center justify-center text-xl shadow-md"
            style={{ borderColor: playerColor || "#f59e0b" }}
          >
            {playerImage ? (
              <img src={playerImage} alt={playerName} className="w-full h-full object-cover" />
            ) : (
              <span>{playerEmoji || "🧙‍♂️"}</span>
            )}
          </div>
          <div className="text-left">
            <div className="text-[10px] text-white/50 font-bold uppercase tracking-wider">ผู้ชนะบิงโกประจำตานี้</div>
            <div className="text-base font-black text-white">{playerName}</div>
          </div>
        </div>

        {/* Details & Reward Box */}
        <div className="w-full bg-gradient-to-b from-amber-950/40 to-slate-950/80 rounded-2xl p-4 border border-amber-500/30 space-y-3 mb-5 shadow-inner">
          <div className="text-xs font-bold text-amber-200">
            ✨ สามารถทำเรียงแถวบิงโกสำเร็จ <span className="text-emerald-400 font-extrabold text-sm">{linesCount}</span> สาย!
          </div>

          <div className="flex flex-col items-center justify-center py-2 bg-black/50 rounded-xl border border-amber-500/40">
            <span className="text-[10px] text-amber-300 font-bold uppercase tracking-widest">โบนัสรางวัลบิงโก</span>
            <span className="text-3xl font-black text-amber-400 drop-shadow-[0_0_15px_rgba(245,158,11,0.8)]">
              +{(goldReward || 10000).toLocaleString()} <span className="text-lg">Gold</span>
            </span>
          </div>

          <div className="text-[11px] text-amber-200/70 font-semibold bg-amber-900/20 p-2.5 rounded-xl border border-amber-500/20 leading-relaxed">
            ℹ️ <span className="text-amber-300 font-bold">ป้าย Bingo ใบนี้ใช้งานสำเร็จแล้ว!</span>{" "}
            ป้ายเดิมถูกถอดออกแล้ว สามารถสวมใส่ป้าย Bingo ใบใหม่ได้โดยเข้าไปซื้อที่ <span className="text-amber-300 font-bold">ร้านค้า (Mystery Bazaar)</span> 🏪
          </div>
        </div>

        {/* Action Close Button */}
        <button
          onClick={typeof onClose === "function" ? onClose : undefined}
          disabled={typeof onClose !== "function"}
          className={`w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 text-slate-950 font-black text-sm tracking-wider uppercase shadow-[0_0_25px_rgba(245,158,11,0.6)] transition-all border border-yellow-200 ${typeof onClose !== "function" ? "opacity-60 cursor-not-allowed" : "hover:scale-102 active:scale-98"}`}
        >
          🏆 {typeof onClose === "function" ? "รับรางวัล & ลุยต่อ!" : "กำลังดำเนินการ..."}
        </button>
      </div>
    </div>
  );
}
