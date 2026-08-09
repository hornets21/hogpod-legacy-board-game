"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { POTIONS, MONSTER_MAP } from "@/lib/gameData";
import { buildGrid } from "@/lib/boardLayout";

// ============================================================
// TrapCellPicker — modal เลือกช่องบนกระดานเพื่อวางกับดักยาพิษ
// • จัดเรียงตามผังกระดาน (10 คอลัมน์ ลายงู 81-90 อยู่บนสุด down to 1-10 อยู่ล่างสุด)
// • เลือกได้ช่อง 2-89 (ห้ามช่อง 1 จุดเริ่มต้น และช่อง 90 ช่องชนะ)
// • ห้ามเลือกช่องที่มีกับดักอยู่แล้ว (trapCells)
// ============================================================

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

  const gridRows = buildGrid();

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
            className="relative z-10 w-full max-w-2xl bg-slate-950/95 border-2 border-fuchsia-500/60 rounded-3xl p-5 shadow-[0_0_45px_rgba(217,70,239,0.35)] backdrop-blur-2xl"
          >
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-white/10 pb-3 mb-3">
              <div className="w-12 h-12 rounded-2xl border-2 border-fuchsia-400/60 overflow-hidden bg-black/60 flex items-center justify-center shrink-0">
                <img
                  src={potion.image}
                  alt={potion.nameEn}
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-black text-white text-base truncate">
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
              <div className="mb-3 text-xs bg-black/40 border border-white/5 rounded-xl p-2 flex items-center gap-2">
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

            {/* Cell grid (Matching Board Layout 10 cols snake pattern) */}
            <div className="mb-3">
              <div className="text-[11px] font-black uppercase tracking-wider text-fuchsia-300 mb-2 flex items-center justify-between">
                <span>☠️ เลือกช่องที่จะวางกับดัก (ตรงตามผังกระดาน)</span>
                <span className="text-[10px] text-white/40 font-normal">ช่อง 2 - 89</span>
              </div>

              <div className="flex flex-col gap-1 max-h-[340px] overflow-y-auto custom-scrollbar p-1.5 bg-black/50 rounded-2xl border border-white/10">
                {gridRows.map((rowCells, rIdx) => (
                  <div key={rIdx} className="grid grid-cols-10 gap-1">
                    {rowCells.map((cell) => {
                      const isStartOrFinish = cell === 1 || cell === 90;
                      const blocked = isStartOrFinish || occupiedTrap(cell);
                      const selected = selectedCell === cell;
                      const monster = hasMonster(cell);

                      return (
                        <button
                          key={cell}
                          onClick={() => !blocked && setSelectedCell(cell)}
                          disabled={blocked}
                          title={
                            cell === 1
                              ? "จุดเริ่มต้น (วางไม่ได้)"
                              : cell === 90
                              ? "จุดสิ้นสุด (วางไม่ได้)"
                              : blocked
                              ? "ช่องนี้มีกับดักอยู่แล้ว"
                              : monster
                              ? `ช่อง ${cell} (มีมอนสเตอร์)`
                              : `ช่อง ${cell}`
                          }
                          className={`h-7 sm:h-8 rounded-lg border text-[10px] font-black transition-all flex items-center justify-center ${
                            cell === 1 || cell === 90
                              ? "bg-slate-950 border-white/5 text-white/20 cursor-not-allowed"
                              : blocked
                              ? "bg-fuchsia-950/60 border-fuchsia-500/40 text-fuchsia-400 cursor-not-allowed"
                              : selected
                              ? "bg-fuchsia-500 border-fuchsia-300 text-white ring-2 ring-fuchsia-400 shadow-[0_0_12px_rgba(217,70,239,0.8)] scale-110 z-10"
                              : monster
                              ? "bg-rose-950/50 border-rose-500/50 text-rose-200 hover:border-fuchsia-400 hover:scale-105"
                              : "bg-slate-900/80 border-white/10 text-white/80 hover:border-fuchsia-400/60 hover:bg-fuchsia-500/20 hover:scale-105"
                          }`}
                        >
                          {blocked && !isStartOrFinish ? "☠" : cell === 1 ? "🚩" : cell === 90 ? "🏆" : cell}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-white/40 mt-1.5">
                เรียงแถว 10 ช่องลายงูตรงตามกระดานจริง · 🚩/🏆 ช่องแรกและช่องสุดท้ายวางไม่ได้ · ☠️ คือมีกับดักอยู่แล้ว
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