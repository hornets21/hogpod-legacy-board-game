"use client";

import { useState } from "react";
import { BINGO_LINES } from "@/lib/bingoEngine";

export default function BingoWidget({ players, currentPlayerIndex }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedHouseIdx, setSelectedHouseIdx] = useState(null);

  if (!players || players.length === 0) return null;

  // Find all players who have a Bingo card
  const playersWithBingo = players.map((p, idx) => ({ player: p, index: idx })).filter((item) => item.player.hasBingoCard);

  // If no house owns a Bingo card, hide the widget entirely!
  if (playersWithBingo.length === 0) return null;

  // Determine which player's card to view (default to current player if they have card, or first available)
  const activeHouseIdx = selectedHouseIdx !== null && players[selectedHouseIdx]?.hasBingoCard
    ? selectedHouseIdx
    : (players[currentPlayerIndex]?.hasBingoCard ? currentPlayerIndex : playersWithBingo[0].index);

  const displayPlayer = players[activeHouseIdx];
  if (!displayPlayer || !displayPlayer.bingoCard) return null;

  const card = displayPlayer.bingoCard;
  const numbers = card.numbers || [];
  const marked = card.marked || [];
  const completedLines = card.completedLines || [];

  // Count marked items (excluding FREE center)
  const markedCount = marked.filter((m, i) => m && i !== 12).length;

  return (
    <>
      {/* ── FLOATING TRIGGER BADGE (มุมขวาล่าง - กดเพื่อดูบิงโกเต็มจอ) ── */}
      <div className="fixed bottom-4 right-4 z-40 animate-fade-in pointer-events-auto">
        <button
          onClick={() => setIsModalOpen(true)}
          className="group relative flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-gradient-to-b from-[#2c1d18] via-[#1a110e] to-[#0f0907] shadow-[0_4px_25px_rgba(0,0,0,0.85)] text-white hover:scale-105 transition-all duration-300 ring-1 ring-amber-500/40"
        >
          <img
            src="/images/system/logo_bingo.webp"
            alt="BINGO"
            className="h-8 w-auto object-contain drop-shadow-[0_2px_8px_rgba(245,158,11,0.5)] animate-pulse-slow"
          />
          <div className="text-left">
            <div className="text-[10px] font-black uppercase text-amber-300 font-serif tracking-wider flex items-center gap-1">
              <span>{displayPlayer.name} BINGO</span>
              {playersWithBingo.length > 1 && (
                <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1 rounded border border-amber-500/30">
                  ({playersWithBingo.length} บ้าน)
                </span>
              )}
            </div>
            <div className="text-xs font-black text-slate-200">
              เช็ค <span className="text-amber-400 font-extrabold">{markedCount}/24</span> | สาย <span className="text-emerald-400 font-bold">{completedLines.length}</span>
            </div>
          </div>
          <span className="text-[10px] text-amber-300 font-bold bg-amber-950/80 px-2 py-1 rounded-xl border border-amber-500/30 group-hover:bg-amber-500 group-hover:text-black transition-colors flex items-center gap-1 shadow-inner">
            <span>🔍</span>
            <span>ดูบิงโกเต็มจอ</span>
          </span>
        </button>
      </div>

      {/* ── FULLSCREEN BINGO MODAL OVERLAY (แสดงตารางบิงโกแบบเต็มจอเมื่อกดดู) ── */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fade-in pointer-events-auto select-none"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="relative w-full max-w-md max-h-[95vh] rounded-3xl bg-gradient-to-b from-[#2d1e17] via-[#19110d] to-[#0d0705] shadow-[0_20px_60px_rgba(0,0,0,0.95)] overflow-y-auto custom-scrollbar text-white flex flex-col p-3.5 sm:p-4 backdrop-blur-2xl ring-1 ring-amber-600/50"
            onClick={(e) => e.stopPropagation()}
          >
            {/* TOP HEADER CONTROL BAR */}
            <div className="w-full flex items-center justify-between px-1 mb-2">
              <div className="flex items-center gap-1.5">
                <span className="text-base">🎯</span>
                <span className="text-xs font-bold text-amber-400 font-serif uppercase tracking-widest">
                  MYSTIC CREATURE BINGO
                </span>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-red-600/80 border border-white/20 text-white font-black flex items-center justify-center text-sm transition-all hover:scale-110 shadow-md"
                title="ปิดหน้าต่างบิงโก"
              >
                ✕
              </button>
            </div>

            {/* 3D EMBOSSED GOLD TITLE TEXT & OFFICIAL LOGO */}
            <div className="relative flex flex-col items-center pb-1">
              <h2 className="text-xs font-serif font-black tracking-[0.25em] uppercase text-center bg-gradient-to-b from-[#fff6da] via-[#e2b047] to-[#8d6211] bg-clip-text text-transparent drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]">
                {displayPlayer.name}'S CARD
              </h2>

              <div className="w-full flex items-center justify-center my-0.5">
                <img
                  src="/images/system/logo_bingo.webp"
                  alt="MYSTIC CREATURE BINGO"
                  className="max-h-16 sm:max-h-20 w-auto object-contain drop-shadow-[0_4px_18px_rgba(245,158,11,0.65)]"
                />
              </div>
            </div>

            {/* ── PURPLE GLOWING RUNIC FRAME (Matching ref_bing_go.webp) ── */}
            <div className="relative rounded-2xl bg-gradient-to-b from-[#291338] via-[#1a0928] to-[#11041c] p-2 shadow-[inset_0_0_20px_rgba(168,85,247,0.35)] flex flex-col">
              
              {/* TOP PURPLE RUNIC STRIP */}
              <div className="w-full text-center text-purple-300/90 font-serif text-[10px] tracking-[0.35em] drop-shadow-[0_0_8px_rgba(216,180,254,0.9)] pb-1 select-none">
                ᛋ ᛏ ᚨ ᚱ ᚱ ᚢ ᚾ ᛖ ᛋ
              </div>

              {/* MIDDLE AREA: LEFT RUNES + 5x5 GRID + RIGHT RUNES */}
              <div className="flex items-center gap-1">
                
                {/* LEFT RUNIC COLUMN */}
                <div className="text-purple-300/80 font-serif text-[9px] tracking-widest flex flex-col justify-between py-2 drop-shadow-[0_0_6px_rgba(216,180,254,0.8)] select-none opacity-90">
                  <span>ᚱ</span>
                  <span>ᚢ</span>
                  <span>ᚾ</span>
                  <span>ᛖ</span>
                  <span>ᛋ</span>
                </div>

                {/* 5x5 GRID MATRIX (Subtle gold Dividers, No plastic borders) */}
                <div className="flex-1 grid grid-cols-5 gap-1.5 bg-[#2a1d17]/80 p-1.5 rounded-xl shadow-inner border border-amber-900/30">
                  {numbers.map((num, idx) => {
                    const isMarked = marked[idx];
                    const isFree = num === "FREE";
                    const isLineCompletedCell = completedLines.some((lineIdx) => BINGO_LINES[lineIdx]?.includes(idx));

                    return (
                      <div
                        key={idx}
                        className={`relative aspect-square rounded-lg flex flex-col items-center justify-center transition-all duration-300 ${
                          isFree
                            ? "bg-gradient-to-br from-amber-500/30 via-purple-900/60 to-emerald-900/40 shadow-[0_0_15px_rgba(245,158,11,0.6)] animate-pulse-slow"
                            : isMarked
                            ? isLineCompletedCell
                              ? "bg-gradient-to-br from-[#ffe082] via-[#f59e0b] to-[#b45309] text-slate-950 shadow-[0_0_18px_rgba(245,158,11,0.95)] scale-[1.04] z-10 font-bold"
                              : "bg-gradient-to-br from-[#f59e0b] to-[#92400e] text-slate-950 shadow-md font-bold"
                            : "bg-gradient-to-b from-[#282023] to-[#151113] hover:from-[#32292c]"
                        }`}
                      >
                        {isFree ? (
                          <div className="flex flex-col items-center justify-center">
                            <span className="text-xs animate-spin-slow">🌟</span>
                            <span className="text-[9px] font-serif font-black text-amber-200 tracking-wider drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                              FREE
                            </span>
                          </div>
                        ) : (
                          <>
                            <span className={`text-sm font-serif font-bold tracking-tight ${isMarked ? "text-slate-950 font-black" : "text-[#f3d99d] drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]"}`}>
                              {num}
                            </span>

                            {/* CHECKED STAMP BADGE */}
                            {isMarked && (
                              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 text-slate-950 text-[9px] font-black flex items-center justify-center shadow-md animate-bounce-once border border-white/60">
                                ✓
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* RIGHT RUNIC COLUMN */}
                <div className="text-purple-300/80 font-serif text-[9px] tracking-widest flex flex-col justify-between py-2 drop-shadow-[0_0_6px_rgba(216,180,254,0.8)] select-none opacity-90">
                  <span>ᛋ</span>
                  <span>ᛏ</span>
                  <span>ᚨ</span>
                  <span>ᚱ</span>
                  <span>ᛖ</span>
                </div>
              </div>

              {/* BOTTOM PURPLE RUNIC STRIP WITH CORNER CREATURE EMBLEMS */}
              <div className="w-full flex items-center justify-between pt-1 px-1 text-purple-300/90 font-serif text-[10px] tracking-[0.3em] drop-shadow-[0_0_8px_rgba(216,180,254,0.9)] select-none">
                <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/40 text-[8px] font-black flex items-center justify-center shadow-sm">B</span>
                <span className="text-center flex-1">ᛖ ᛋ ᛏ ᛁ ᚨ ᛚ</span>
                <span className="w-4 h-4 rounded-full bg-purple-500/20 text-purple-300 border border-purple-400/40 text-[8px] font-black flex items-center justify-center shadow-sm">O</span>
              </div>
            </div>

            {/* ── CARVED STONE BOTTOM HOUSE SWITCHER FRAME ── */}
            <div className="mt-2.5 pt-2 border-t border-amber-900/30 flex flex-col gap-2">
              
              {/* HOUSE BUTTON CARVED SLOTS */}
              <div className="bg-gradient-to-b from-[#1c1411] to-[#0e0a08] p-1.5 rounded-xl shadow-inner flex items-center justify-around border border-amber-900/20">
                {players.map((p, idx) => {
                  const hasCard = p.hasBingoCard;
                  const isSelected = activeHouseIdx === idx;

                  return (
                    <button
                      key={p.houseId}
                      onClick={() => hasCard && setSelectedHouseIdx(idx)}
                      disabled={!hasCard}
                      className={`flex-1 py-1.5 mx-0.5 rounded-lg font-serif font-black text-xs transition-all shadow-md flex items-center justify-center gap-1 ${
                        isSelected
                          ? "bg-gradient-to-b from-amber-300 via-amber-500 to-amber-700 text-slate-950 shadow-[0_0_10px_rgba(245,158,11,0.7)] scale-105"
                          : hasCard
                          ? "bg-gradient-to-b from-[#382b25] to-[#211814] text-amber-200/80 hover:text-white"
                          : "bg-[#140e0c] text-white/20 opacity-40 cursor-not-allowed"
                      }`}
                      title={hasCard ? `สลับดูตารางบ้าน ${p.name}` : `บ้าน ${p.name} ยังไม่มีป้าย Bingo`}
                    >
                      <span>{idx + 1}</span>
                      <span className="text-[10px] font-sans font-bold truncate max-w-[50px]">{p.name}</span>
                    </button>
                  );
                })}
              </div>

              {/* REWARD INFO & COMPLETED LINES COUNTER */}
              <div className="px-1 flex items-center justify-between text-xs font-bold text-amber-200/90">
                <span className="flex items-center gap-1">
                  🏆 <span>สายสำเร็จ:</span>
                  <span className="text-emerald-400 font-black text-sm">{completedLines.length}/12</span>
                </span>
                <span className="text-amber-400 font-black bg-amber-950/70 px-2.5 py-1 rounded-lg border border-amber-500/40 shadow-inner">
                  โบนัส +10,000 Gold / สาย
                </span>
              </div>

            </div>

          </div>
        </div>
      )}
    </>
  );
}
