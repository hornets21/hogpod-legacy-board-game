"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { NPCS } from "@/lib/gameData";

function formatTime(seconds) {
  const s = Math.max(0, Math.floor(seconds || 0));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export default function NpcSpawnWidget({ state }) {
  const [panelOpen, setPanelOpen] = useState(false);

  if (!state || state.phase === "title" || state.phase === "setup" || state.phase === "initiative") {
    return null;
  }

  const npcsState = state.npcs || {};
  const npcList = Object.values(NPCS);

  // Count active spawned vs CD
  const activeCount = npcList.filter((n) => npcsState[n.id]?.isSpawned).length;

  return (
    <div className="relative">
      {/* ── Top Bar Widget Button ─────────────────────────────── */}
      <button
        onClick={() => setPanelOpen((o) => !o)}
        className={`relative overflow-hidden flex items-center gap-2 px-3 py-1.5 rounded-2xl backdrop-blur-md border transition-all duration-300 shadow-lg active:scale-95 ${
          activeCount > 0
            ? "bg-slate-950/90 border-blue-500/50 hover:border-blue-400 text-blue-200 shadow-[0_0_20px_rgba(59,130,246,0.25)]"
            : "bg-slate-950/80 border-amber-500/40 text-amber-300 hover:border-amber-400"
        }`}
        title="คลิกเพื่อดูตัวจับเวลาและตำแหน่งของ NPC บนกระดาน"
      >
        <div className="flex items-center gap-1 text-sm font-black">
          <span className="text-base animate-bounce">🤖</span>
          <span className="hidden sm:inline text-xs font-bold text-slate-300">NPC SPAWN:</span>
        </div>

        {/* Individual NPC Status Badges */}
        <div className="flex items-center gap-1.5 text-xs font-bold">
          {npcList.map((npc) => {
            const st = npcsState[npc.id];
            const isSpawned = st?.isSpawned;
            const cell = st?.cell;
            const cd = st?.cooldown || 0;

            return (
              <div
                key={npc.id}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-xl border text-[11px] font-extrabold transition-all ${
                  isSpawned
                    ? "bg-emerald-950/80 border-emerald-500/60 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                    : "bg-amber-950/70 border-amber-500/50 text-amber-300"
                }`}
              >
                <span>{npc.emoji}</span>
                {isSpawned ? (
                  <span className="text-emerald-400">ช่อง {cell}</span>
                ) : (
                  <span className="font-mono text-amber-300">{formatTime(cd)}</span>
                )}
              </div>
            );
          })}
        </div>
      </button>

      {/* ── Dropdown Panel ────────────────────────────────────── */}
      <AnimatePresence>
        {panelOpen && (
          <>
            {/* Backdrop click closer */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setPanelOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="absolute right-0 top-full mt-2 z-50 w-80 sm:w-96 p-4 rounded-3xl bg-slate-950/95 border border-blue-500/40 backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] text-slate-100 space-y-3"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-xl">⏱️</span>
                  <div>
                    <h3 className="font-black text-sm text-blue-300">ตัวจับเวลา & ตำแหน่ง NPC</h3>
                    <p className="text-[10px] text-slate-400">NPC แต่ละตัวมีคูลดาวน์เกิดใหม่ทุก 3 นาที (180s)</p>
                  </div>
                </div>
                <button
                  onClick={() => setPanelOpen(false)}
                  className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 text-slate-400 hover:text-white flex items-center justify-center text-xs font-bold transition-all"
                >
                  ✕
                </button>
              </div>

              {/* NPC List Cards */}
              <div className="space-y-2.5">
                {npcList.map((npc) => {
                  const st = npcsState[npc.id];
                  const isSpawned = st?.isSpawned;
                  const cell = st?.cell;
                  const cd = st?.cooldown || 0;

                  return (
                    <div
                      key={npc.id}
                      className={`p-3 rounded-2xl border flex items-center gap-3 transition-all ${
                        isSpawned
                          ? "bg-slate-900/90 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.1)]"
                          : "bg-slate-900/60 border-slate-800 opacity-90"
                      }`}
                    >
                      {/* Avatar */}
                      <div className="relative w-11 h-11 rounded-xl overflow-hidden border border-white/20 shrink-0 bg-black">
                        <img
                          src={npc.image}
                          alt={npc.name}
                          className="w-full h-full object-cover object-top"
                        />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-extrabold text-xs text-white truncate flex items-center gap-1">
                            <span>{npc.emoji}</span>
                            <span>{npc.name}</span>
                          </span>

                          {/* Status Pill */}
                          {isSpawned ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 font-black text-[10px] shadow-[0_0_10px_rgba(16,185,129,0.3)] animate-pulse">
                              🟢 อยู่ที่ช่อง {cell}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/50 text-amber-300 font-black text-[10px]">
                              ⏳ เกิดใน {formatTime(cd)}
                            </span>
                          )}
                        </div>

                        <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">
                          {npc.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Tip */}
              <div className="pt-1 text-center text-[10px] text-slate-400 border-t border-white/5">
                💡 เมื่อเดินตกช่อง NPC จะได้รับไอเท็ม/สกิล และ NPC จะเริ่มนับคูลดาวน์ใหม่ทันที
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
