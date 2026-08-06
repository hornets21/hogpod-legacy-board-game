"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import WheelOfFate from "@/components/WheelOfFate";
import { getTotalDmg } from "@/lib/gameEngine";

export default function CombatModal({ combatState, player, onResolveCombat, onUseSkill, onFlee }) {
  const [introState, setIntroState] = useState("intro"); // "intro" | "ready"
  const [hitStop, setHitStop] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIntroState("ready");
    }, 1800);
    return () => clearTimeout(timer);
  }, []);

  if (!combatState || !player) return null;

  const { monster } = combatState;
  const totalDmg = getTotalDmg(player);
  const hpPct = Math.max(0, (monster.currentHp / monster.hp) * 100);
  const playerHpPct = Math.max(0, (player.hp / player.maxHp) * 100);

  const playerIdleImg = player.image || null;
  const monsterIdleImg = monster.image || null;

  const battleTypeLabel = monster.isBoss
    ? "BOSS BATTLE"
    : monster.isElite
    ? "ELITE ENCOUNTER"
    : "ENCOUNTER DETECTED";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center select-none overflow-hidden animate-fade-in">
      {/* Background Dim & Red Vignette */}
      <div className="absolute inset-0 bg-black/90 backdrop-blur-md" />

      {/* Hit-stop yellow tint (flash) เมื่อ resolve */}
      {hitStop && (
        <motion.div
          initial={{ opacity: 0.55 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="absolute inset-0 z-30 bg-yellow-200 pointer-events-none mix-blend-screen"
          onAnimationComplete={() => setHitStop(false)}
        />
      )}

      {/* Top Warning Danger Banner */}
      <div className="absolute top-8 left-0 right-0 py-2 bg-red-950/80 border-y border-red-500/40 flex items-center justify-center gap-6 overflow-hidden transform -skew-y-1 z-20">
        <div className="text-red-400 text-xs font-black tracking-[0.3em] uppercase animate-pulse">
          {battleTypeLabel} - DANGER ZONE - BATTLE IN PROGRESS
        </div>
      </div>

      {/* Bottom Danger / Flee Banner */}
      <div className="absolute bottom-8 left-0 right-0 py-2 bg-red-950/80 border-y border-red-500/40 flex items-center justify-center gap-4 z-20">
        {onFlee ? (
          <button
            onClick={onFlee}
            className="text-xs font-black tracking-widest text-amber-300 hover:text-amber-100 bg-amber-950/80 border border-amber-500/50 px-6 py-1.5 rounded-full shadow-lg transition-all hover:scale-105"
          >
            FLEE COMBAT (BANK BUFF)
          </button>
        ) : (
          <div className="text-red-400 text-xs font-black tracking-[0.3em] uppercase animate-pulse">
            PREPARE FOR DECISIVE BATTLE - SPIN TO RESOLVE
          </div>
        )}
      </div>

      {/* Main 3D Fighter Interface Layout */}
      <div className="relative z-10 w-full max-w-6xl px-6 flex items-center justify-between">
        
        {/* LEFT: Player Fighter Card */}
        <div className="flex-1 flex flex-col items-end">
          <div className="bg-slate-900/90 border-2 border-emerald-500/60 rounded-3xl p-6 shadow-[0_0_50px_rgba(16,185,129,0.25)] text-right w-[280px]">
            <div className="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-950/80 px-3 py-1 rounded-md inline-block border border-emerald-500/30 mb-3">
              PLAYER
            </div>
            
            {/* Player Image / Emoji Frame */}
            <div className="w-32 h-32 my-2 rounded-2xl border-2 border-emerald-400/60 overflow-hidden bg-black/80 flex items-center justify-center shadow-[0_0_20px_rgba(34,197,94,0.3)] ml-auto">
              {playerIdleImg ? (
                <img src={playerIdleImg} alt={player.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-5xl">{player.emoji}</span>
              )}
            </div>

            <h3 className="font-black text-white text-xl">{player.name}</h3>
            <p className="text-xs text-white/50 font-bold mb-3">{player.nameEn}</p>

            <div className="w-full space-y-2 text-xs bg-black/50 p-3 rounded-xl border border-white/10">
              <div className="flex justify-between font-bold text-white/80">
                <span>HP</span>
                <span className="text-emerald-400 font-black">{Math.max(0, player.hp)} / {player.maxHp}</span>
              </div>
              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-emerald-500 rounded-full"
                  initial={false}
                  animate={{ width: `${playerHpPct}%` }}
                  transition={{ type: "spring", stiffness: 200, damping: 22 }}
                />
              </div>
              <div className="flex justify-between font-bold text-white/80 pt-1 border-t border-white/10">
                <span>ATTACK POWER</span>
                <span className="text-amber-400 font-black">{totalDmg}</span>
              </div>
            </div>
          </div>
        </div>

        {/* CENTER: VS Emblem transitioning to Wheel of Fate */}
        <div className="mx-6 flex flex-col items-center justify-center min-w-[320px]">
          {introState === "intro" ? (
            <div
              onClick={() => setIntroState("ready")}
              className="flex flex-col items-center cursor-pointer"
            >
              <div className="relative flex items-center justify-center w-32 h-32 rounded-full bg-gradient-to-br from-red-600 to-amber-600 border-4 border-white/80 shadow-[0_0_60px_rgba(239,68,68,0.8)] animate-bounce">
                <span className="text-6xl font-black italic tracking-tighter text-white drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]">
                  VS
                </span>
              </div>
              <div className="text-[11px] font-black tracking-widest text-white/60 mt-4 bg-black/60 px-4 py-1.5 rounded-full border border-white/10">
                CLICK TO START
              </div>
            </div>
          ) : (
            <div className="animate-fade-in">
              <WheelOfFate
                monster={monster}
                player={player}
                onSpinComplete={(outcome) => {
                  setHitStop(true);
                  setTimeout(() => onResolveCombat(outcome), 80);
                }}
              />
            </div>
          )}
        </div>

        {/* RIGHT: Monster Enemy Card */}
        <div className="flex-1 flex flex-col items-start">
          <div className="bg-slate-900/90 border-2 border-red-500/60 rounded-3xl p-6 shadow-[0_0_50px_rgba(239,68,68,0.25)] text-left w-[280px]">
            <div className="text-[10px] font-black uppercase tracking-widest text-red-400 bg-red-950/80 px-3 py-1 rounded-md inline-block border border-red-500/30 mb-3">
              TARGET ENEMY
            </div>

            {/* Monster Image Frame */}
            <div className="w-32 h-32 my-2 rounded-2xl border-2 border-red-400/60 overflow-hidden bg-black/80 flex items-center justify-center shadow-[0_0_20px_rgba(239,68,68,0.3)]">
              {monsterIdleImg ? (
                <img src={monsterIdleImg} alt={monster.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-5xl">{monster.emoji || "VS"}</span>
              )}
            </div>

            <h3 className="font-black text-white text-xl">{monster.name}</h3>
            <p className="text-xs text-white/50 font-bold mb-3">{monster.nameEn}</p>

            <div className="w-full space-y-2 text-xs bg-black/50 p-3 rounded-xl border border-white/10">
              <div className="flex justify-between font-bold text-white/80">
                <span>HP</span>
                <span className="text-red-400 font-black">{Math.max(0, monster.currentHp)} / {monster.hp}</span>
              </div>
<div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-red-500 rounded-full"
                initial={false}
                animate={{ width: `${hpPct}%` }}
                transition={{ type: "spring", stiffness: 200, damping: 22 }}
              />
            </div>
              <div className="flex justify-between font-bold text-white/80 pt-1 border-t border-white/10">
                <span>MONSTER DAMAGE</span>
                <span className="text-red-400 font-black">{monster.dmg}</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
