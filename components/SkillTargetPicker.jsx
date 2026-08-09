"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { SKILLS, MONSTER_MAP } from "@/lib/gameData";

// ============================================================
// SkillTargetPicker — modal ยืนยันทุกสกิล + เลือกเป้าหมายตามประเภท
// • requiresTarget === "player" → เลือกบ้านอื่น (เอาแค่ isAlive, ไม่ใช่ตัวเอง;
//   god_ntr ต้องการบ้านที่มียา)
// • requiresTarget === "monster" → เลือกมอนสเตอร์บนกระดาน (จาก state.monsterCells)
// • requiresTarget === null → ไม่มีส่วนเลือกเป้า กดยืนยันได้ทันที
// ============================================================

export default function SkillTargetPicker({
  open,
  skillId,
  casterIndex,
  players,
  monsterCells,
  onConfirm,
  onCancel,
}) {
  const [targetIndex, setTargetIndex] = useState(null);
  const [monsterCell, setMonsterCell] = useState(null);
  const [diceChoice, setDiceChoice] = useState(6);

  const skill = skillId ? SKILLS[skillId] : null;

  // Reset selection when modal reopens for a new skill
  useEffect(() => {
    if (open) {
      setTargetIndex(null);
      setMonsterCell(null);
      setDiceChoice(6);
    }
  }, [open, skillId, casterIndex]);

  if (!open || !skill) return null;

  const caster = players?.[casterIndex];

  const eligiblePlayers = (players || [])
    .map((p, i) => ({ p, i }))
    .filter(({ p, i }) => {
      if (i === casterIndex) return false;
      if (!p.isAlive) return false;
      if (skill.id === "god_ntr") {
        return Array.isArray(p.potions) && p.potions.length > 0;
      }
      return true;
    });

  const eligibleMonsters = Array.from(monsterCells || [])
    .map((cell) => ({ cell, monster: MONSTER_MAP[cell] }))
    .filter((m) => {
      if (!m.monster) return false;
      if (skill?.effect === "banish_monster" && m.monster.isBoss) return false;
      return true;
    });

  const requiresTarget = skill.requiresTarget;
  const isLockDice = skill.effect === "lock_dice";
  const needsTarget = requiresTarget === "player" || requiresTarget === "monster";

  const canConfirm =
    isLockDice ||
    !needsTarget ||
    (requiresTarget === "player" && targetIndex !== null) ||
    (requiresTarget === "monster" && monsterCell !== null);

  const handleConfirm = () => {
    if (!canConfirm) return;
    const resolvedTarget =
      isLockDice
        ? diceChoice
        : requiresTarget === "player"
        ? targetIndex
        : requiresTarget === "monster"
        ? monsterCell
        : null;
    onConfirm({ targetIndex: resolvedTarget, monsterCell });
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
            className="relative z-10 w-full max-w-2xl bg-slate-950/95 border-2 border-purple-500/60 rounded-3xl p-6 shadow-[0_0_45px_rgba(168,85,247,0.35)] backdrop-blur-2xl"
          >
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-white/10 pb-3 mb-4">
              <div className="w-14 h-14 rounded-2xl border-2 border-purple-400/60 overflow-hidden bg-black/60 flex items-center justify-center shrink-0">
                <img
                  src={`/images/skills/${skill.id}_skill.webp`}
                  alt={skill.name}
                  className="w-full h-full object-contain"
                />
              </div>
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-white text-lg truncate">
                    {skill.nameTh || skill.name}
                  </h3>
                  {skill.categoryTh && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-900/60 border border-purple-400/40 text-purple-200 font-bold shrink-0">
                      {skill.categoryTh}
                    </span>
                  )}
                </div>
                <p className="text-xs text-white/60 truncate">{skill.description}</p>
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
                <span className="text-white/50 font-bold">ร่ายโดย:</span>
                <span
                  className="font-black"
                  style={{ color: caster.color || "#f59e0b" }}
                >
                  {caster.name}
                </span>
                <span className="text-white/40">· HP {Math.max(0, caster.hp)}/{caster.maxHp}</span>
              </div>
            )}

            {/* Target selection: Dice Value (for lock_dice) */}
            {isLockDice && (
              <div className="mb-4">
                <div className="text-[11px] font-black uppercase tracking-wider text-emerald-300 mb-2">
                  🎲 เลือกแต้มลูกเต๋าที่ต้องการล็อก (1 - 6)
                </div>
                <div className="grid grid-cols-6 gap-2">
                  {[1, 2, 3, 4, 5, 6].map((num) => {
                    const selected = diceChoice === num;
                    return (
                      <button
                        key={num}
                        onClick={() => setDiceChoice(num)}
                        className={`py-3 rounded-2xl border-2 font-black text-center transition-all flex flex-col items-center justify-center gap-1 ${
                          selected
                            ? "bg-emerald-500/30 border-emerald-400 text-emerald-200 ring-2 ring-emerald-400/50 shadow-[0_0_15px_rgba(16,185,129,0.4)] scale-105"
                            : "bg-slate-900/60 border-white/10 text-white/70 hover:border-white/30 hover:bg-slate-800"
                        }`}
                      >
                        <span className="text-xl">🎲</span>
                        <span className="text-base font-black">{num}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Target selection: Players */}
            {requiresTarget === "player" && (
              <div className="mb-4">
                <div className="text-[11px] font-black uppercase tracking-wider text-amber-300 mb-2">
                  🎯 เลือกบ้านเป้าหมาย
                </div>
                {eligiblePlayers.length === 0 ? (
                  <div className="text-xs text-white/50 italic p-3 bg-black/30 rounded-xl text-center">
                    ไม่มีบ้านเป้าหมายที่เข้าเงื่อนไข
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {eligiblePlayers.map(({ p, i }) => {
                      const selected = targetIndex === i;
                      return (
                        <button
                          key={p.houseId || i}
                          onClick={() => setTargetIndex(i)}
                          className={`p-2.5 rounded-2xl border-2 text-left transition-all flex items-center gap-2 ${
                            selected
                              ? "bg-rose-500/25 border-rose-400 ring-2 ring-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.4)]"
                              : "bg-slate-900/60 border-white/10 hover:border-white/30"
                          }`}
                          style={selected ? undefined : { borderColor: `${p.color || "#888"}55` }}
                        >
                          <div
                            className="w-9 h-9 rounded-xl border-2 overflow-hidden flex items-center justify-center shrink-0 bg-black/60"
                            style={{ borderColor: p.color || "#888" }}
                          >
                            {p.image ? (
                              <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-lg">{p.emoji}</span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-black text-white truncate">{p.name}</div>
                            <div className="text-[9px] text-white/50 truncate">
                              HP {Math.max(0, p.hp)}/{p.maxHp} · ช่อง #{p.position}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Target selection: Monsters */}
            {requiresTarget === "monster" && (
              <div className="mb-4">
                <div className="text-[11px] font-black uppercase tracking-wider text-rose-300 mb-2">
                  👹 เลือกมอนสเตอร์บนกระดาน
                </div>
                {eligibleMonsters.length === 0 ? (
                  <div className="text-xs text-white/50 italic p-3 bg-black/30 rounded-xl text-center">
                    ไม่มีมอนสเตอร์บนกระดานให้เลือก
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                    {eligibleMonsters.map(({ cell, monster }) => {
                      const selected = monsterCell === cell;
                      return (
                        <button
                          key={cell}
                          onClick={() => setMonsterCell(cell)}
                          className={`p-2.5 rounded-2xl border-2 text-left transition-all flex items-center gap-2 ${
                            selected
                              ? "bg-rose-500/25 border-rose-400 ring-2 ring-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.4)]"
                              : "bg-slate-900/60 border-white/10 hover:border-white/30"
                          }`}
                        >
                          <div className="w-9 h-9 rounded-xl border-2 border-red-400/40 overflow-hidden flex items-center justify-center shrink-0 bg-black/60">
                            {monster.image ? (
                              <img src={monster.image} alt={monster.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-lg">{monster.emoji || "👁️"}</span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-black text-white truncate">{monster.name}</div>
                            <div className="text-[9px] text-white/50 truncate">
                              ช่อง #{cell} · HP {monster.hp} · DMG {monster.dmg}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* No-target notice */}
            {!needsTarget && (
              <div className="mb-4 text-xs text-white/60 italic p-3 bg-black/30 rounded-xl text-center">
                คาถานี้ไม่ต้องเลือกเป้าหมาย — กดยืนยันเพื่อร่าย
              </div>
            )}

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
                    ? "bg-gradient-to-r from-purple-500 via-fuchsia-500 to-rose-500 hover:from-purple-400 hover:to-rose-400 text-white shadow-[0_0_25px_rgba(168,85,247,0.5)] hover:scale-[1.02] active:scale-95"
                    : "bg-slate-800/60 text-white/30 cursor-not-allowed border border-white/5"
                }`}
              >
                ✨ ร่ายคาถา
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}