"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { POTIONS, MONSTER_MAP } from "@/lib/gameData";

// ============================================================
// TrapCellPicker — modal เลือกช่องบนกระดานเพื่อวางกับดักยาพิษ
// • เลือกได้ช่อง 1-89 (ห้ามช่อง 90 ช่องชนะ)
// • ห้ามเลือกช่องที่มีกับดักอยู่แล้ว (trapCells)
// ============================================================

const MAX_CELL = 89;

export default function TrapCellPicker({
  open,
  casterIndex,
  players,
  trapCells,
  monsterCells,
  onConfirm,
  onCancel,
}) {
  const [selectedCell, setSelectedCell] = useState(null);

  useEffect(() => {
    if (open) setSelectedCell(null);
  }, [open, casterIndex]);

  if (!open) return null;

  const caster = players?.[casterIndex];
  const potion = POTIONS.poison;

  const occupiedTrap = (cell) => !!trapCells?.[cell];
  const hasMonster = (cell) => (monsterCells ? monsterCells.has(cell) : false);

  const cells = [];
  for (let c = 1; c <= MAX_CELL; c++) {
    const blocked = occupiedTrap(c);
    cells.push({ cell: c, blocked, monster: hasMonster(c) });
  }

  const canConfirm = selectedCell != null;

  const handleConfirm = () => {
    if (!canConfirm) return;
    onConfirm({ targetCell: selectedCell });
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 select-none overflow-y-auto"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/85 backdrop-blur-md"
            onClick={onCancel}
          />

          {/* Modal Panel */}
          <motion.div
            initial={{ scale: 0.92, y: 18, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.92, y: 18, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            className="relative z-10 w-full max-w-2xl bg-slate-950/95 border-2 border-fuchsia-500/60 rounded-3xl p-6 shadow-[0_0_45px_rgba(217,70,239,0.35)] backdrop-blur-2xl"
          >
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-white/10 pb-3 mb-4">
              <div className="w-14 h-14 rounded-2xl border-2 border-fuchsia-400/60 overflow-hidden bg-black/60 flex items-center justify-center shrink-0">
                <img
                  src={potion.image}
                  alt={potion.nameEn}
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-black text-white text-lg truncate">
                  {potion.name}
                </h3>
                <p className="text-xs text-white/60 truncate">{potion.description}</p>
              </div>
              <button
                onClick={onCancel}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 text-white/70 hover:text-white flex items-center justify-center transition-all"
                title="ยกเลิก"
              >
                ✕
              </button>
            </div>

            {/* Caster info */}
            {caster && (
              <div className="mb-4 text-xs bg-black/40 border border-white/5 rounded-xl p-2.5 flex items-center gap-2">
                <span className="text-white/50 font-bold">วางโดย:</span>
                <span
                  className="font-black"
                  style={{ color: caster.color || "#f59e0b" }}
                >
                  {caster.name}
                </span>
                <span className="text-white/40">· ช่องปัจจุบัน #{caster.position}</span>
              </div>
            )}

            {/* Cell grid */}
            <div className="mb-4">
              <div className="text-[11px] font-black uppercase tracking-wider text-fuchsia-300 mb-2">
                ☠️ เลือกช่องที่จะวางกับดัก ({MAX_CELL} ช่อง)
              </div>
              <div className="grid grid-cols-6 sm:grid-cols-9 gap-1.5 max-h-72 overflow-y-auto custom-scrollbar pr-1">
                {cells.map(({ cell, blocked, monster }) => {
                  const selected = selectedCell === cell;
                  return (
                    <button
                      key={cell}
                      onClick={() => !blocked && setSelectedCell(cell)}
                      disabled={blocked}
                      title={
                        blocked
                          ? "ช่องนี้มีกับดักอยู่แล้ว"
                          : monster
                          ? `ช่อง ${cell} (มีมอนสเตอร์)`
                          : `ช่อง ${cell}`
                      }
                      className={`aspect-square rounded-xl border-2 text-xs font-black transition-all flex items-center justify-center ${
                        blocked
                          ? "bg-slate-900/80 border-white/5 text-white/20 cursor-not-allowed"
                          : selected
                          ? "bg-fuchsia-500/30 border-fuchsia-400 text-white ring-2 ring-fuchsia-500/60 shadow-[0_0_15px_rgba(217,70,239,0.5)] scale-105"
                          : "bg-slate-900/60 border-white/10 text-white/80 hover:border-fuchsia-400/50 hover:bg-fuchsia-500/10 hover:scale-105"
                      }`}
                    >
                      {blocked ? "☠" : cell}
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-white/40 mt-2">
                ช่องที่มี ☠ คือช่องที่มีกับดักอยู่แล้ว เลือกไม่ได้ · ผู้วางเองก็โดนเองได้!
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 pt-2 border-t border-white/10">
              <button
                onClick={onCancel}
                className="flex-1 py-3 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 text-white/80 font-black text-sm border border-white/10 transition-all hover:scale-[1.02] active:scale-95"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleConfirm}
                disabled={!canConfirm}
                className={`flex-1 py-3 rounded-2xl font-black text-sm transition-all ${
                  canConfirm
                    ? "bg-gradient-to-r from-fuchsia-500 via-purple-500 to-rose-500 hover:from-fuchsia-400 hover:to-rose-400 text-white shadow-[0_0_25px_rgba(217,70,239,0.5)] hover:scale-[1.02] active:scale-95"
                    : "bg-slate-800/60 text-white/30 cursor-not-allowed border border-white/5"
                }`}
              >
                ☠️ วางกับดัก
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}