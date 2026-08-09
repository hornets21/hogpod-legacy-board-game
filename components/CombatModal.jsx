"use client";

import { Suspense, useState, useEffect } from "react";
import { motion } from "motion/react";
import WheelOfFate from "@/components/WheelOfFate";
import { getTotalDmg } from "@/lib/gameEngine";
import { AnimatedUiMonster } from "@/components/board3d/AnimatedMonster";
import GrandFinalBossModalModel from "@/components/board3d/GrandFinalBossModalModel";
import SkillButton from "@/components/fx/SkillButton";
import { SKILLS, POTIONS } from "@/lib/gameData";
import ItemTooltip from "@/components/fx/ItemTooltip";

export default function CombatModal({ combatState, player, onResolveCombat, onUseSkill, onUsePotion, onFlee }) {
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
  const monsterMaxHp = monster?.hp || 1;
  const monsterCurrentHp = typeof monster?.currentHp === "number" ? monster.currentHp : monsterMaxHp;
  const hpPct = Math.max(0, Math.min(100, (monsterCurrentHp / monsterMaxHp) * 100));
  const playerHpPct = Math.max(0, (player.hp / player.maxHp) * 100);

  // Filter skills: only show skills meant for monster combat / self buffs (thunder_star, skunk_blast, stay_stupid, lock_dice)
  const combatUsableSkills = (player.skills || []).filter((skId) => {
    const sk = SKILLS[skId];
    if (!sk) return false;
    return (
      sk.target === "monster" ||
      sk.requiresTarget === "monster" ||
      sk.effect === "invincible" ||
      sk.effect === "lock_dice"
    );
  });

  // Filter potions: only show combat-friendly potions (heal, damage, cooldown) — exclude revive & poison
  const combatUsablePotions = (player.potions || []).filter((potId) => {
    return potId === "heal" || potId === "damage" || potId === "cooldown";
  });

  const playerIdleImg = player.image || null;
  const monsterIdleImg = monster.image || null;
  const isGrandFinalBoss = monster.id === "grand_boss" || monster.cell === 90;

  const battleTypeLabel = monster.isBoss
    ? "BOSS BATTLE"
    : monster.isElite
    ? "ELITE ENCOUNTER"
    : "ENCOUNTER DETECTED";

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-between select-none overflow-hidden animate-fade-in p-4 md:p-8">
      {/* Semi-transparent Vignette Backdrop for In-World 3D Camera Visibility */}
      <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_20%,_rgba(2,6,23,0.75)_100%)] pointer-events-none" />

      {/* Hit-stop yellow tint (flash) เมื่อ resolve */}
      {hitStop && (
        <motion.div
          initial={{ opacity: 0.6 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="absolute inset-0 z-40 bg-yellow-200 pointer-events-none mix-blend-screen"
          onAnimationComplete={() => setHitStop(false)}
        />
      )}

      {/* TOP HEADER HUD: Battle Status & Category */}
      <div className="relative z-20 w-full flex items-center justify-between bg-slate-900/80 border border-white/10 rounded-2xl px-6 py-3.5 backdrop-blur-md shadow-xl">
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
          <span className="text-red-400 text-xs md:text-sm font-black tracking-[0.25em] uppercase">
            {battleTypeLabel}
          </span>
        </div>

        <div className="text-amber-400 text-xs md:text-sm font-black tracking-widest uppercase bg-amber-950/40 border border-amber-500/30 px-5 py-1.5 rounded-full shadow-inner">
          ⚔️ COMBAT ARENA ⚔️
        </div>

        {onFlee ? (
          <button
            onClick={onFlee}
            className="text-xs font-black tracking-widest text-amber-300 hover:text-white bg-amber-950/80 hover:bg-amber-900 border border-amber-500/50 px-5 py-2 rounded-xl shadow-lg transition-all hover:scale-105"
          >
            🏃 FLEE COMBAT
          </button>
        ) : (
          <div className="text-slate-400 text-xs font-bold tracking-wider">
            DECISIVE BATTLE
          </div>
        )}
      </div>

      {/* CENTER MAIN BATTLE STAGE: Full Screen Split Layout */}
      <div className="relative z-10 flex-1 my-4 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center overflow-hidden">
        
        {/* LEFT COLUMN: Player Stage (Cols 1-4) */}
        <div className="lg:col-span-4 h-full flex flex-col justify-center items-center lg:items-end">
          <div className="w-full max-w-md bg-gradient-to-br from-slate-900/90 to-emerald-950/40 border border-emerald-500/30 rounded-3xl p-6 shadow-[0_0_50px_rgba(16,185,129,0.15)] flex flex-col items-center text-center relative overflow-hidden backdrop-blur-xl">
            
            {/* Player House Crest / Badge */}
            <div className="text-[11px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-950/80 px-4 py-1.5 rounded-full border border-emerald-500/30 mb-4 shadow-sm">
              {player.house || "PLAYER CHAMPION"}
            </div>
            
            {/* Player Avatar Large Display */}
            <div className="relative w-44 h-44 my-2 rounded-3xl border-2 border-emerald-500/40 overflow-hidden bg-slate-950 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.25)]">
              {playerIdleImg ? (
                <img src={playerIdleImg} alt={player.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-7xl">{player.emoji}</span>
              )}
            </div>

            <h3 className="font-black text-white text-2xl md:text-3xl mt-3">{player.name}</h3>
            <p className="text-xs text-emerald-400/80 font-bold mb-4">{player.nameEn}</p>

            {/* Health & Attack Stats */}
            <div className="w-full space-y-3 bg-black/50 p-4 rounded-2xl border border-emerald-500/20">
              <div className="flex justify-between items-center text-sm font-bold text-white/90">
                <span className="flex items-center gap-1.5">❤️ HP</span>
                <span className="text-emerald-400 font-black text-base">{Math.max(0, player.hp)} / {player.maxHp}</span>
              </div>
              <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-white/10">
                <motion.div
                  className="h-full bg-gradient-to-r from-emerald-600 to-teal-400 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.8)]"
                  initial={false}
                  animate={{ width: `${playerHpPct}%` }}
                  transition={{ type: "spring", stiffness: 200, damping: 22 }}
                />
              </div>

              <div className="flex justify-between items-center text-sm font-bold text-white/90 pt-2 border-t border-white/10">
                <span className="flex items-center gap-1.5">⚔️ ATTACK POWER</span>
                <span className="text-amber-400 font-black text-lg">{totalDmg}</span>
              </div>
            </div>

            {/* House Skills Section in Combat (Filtered for Monster Combat) */}
            {combatUsableSkills.length > 0 && onUseSkill && (
              <div className="w-full mt-3 bg-black/60 p-3 rounded-2xl border border-purple-500/30">
                <div className="text-[10px] font-black uppercase tracking-wider text-purple-300 mb-2 flex items-center justify-between">
                  <span>✨ คาถาต่อสู้ (Monster Skills)</span>
                  <span className="text-[9px] text-white/50 font-normal">กดใช้ใส่ Monster</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {combatUsableSkills.map((skillId, idx) => (
                    <SkillButton
                      key={idx}
                      skillId={skillId}
                      playerIndex={player.playerIndex !== undefined ? player.playerIndex : 0}
                      playerId={player.playerIndex !== undefined ? player.playerIndex : 0}
                      cooldown={skillId ? player.skillCooldowns?.[skillId] || 0 : 0}
                      onUse={onUseSkill}
                      size="sm"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Combat Potions Section (Heal / Damage / Cooldown Potions) */}
            {combatUsablePotions.length > 0 && onUsePotion && (
              <div className="w-full mt-3 bg-black/60 p-3 rounded-2xl border border-amber-500/30">
                <div className="text-[10px] font-black uppercase tracking-wider text-amber-300 mb-2 flex items-center justify-between">
                  <span>🧪 ยาต่อสู้ (Combat Potions)</span>
                  <span className="text-[9px] text-white/50 font-normal">เพิ่มเลือด / ดาเมจ / ลดคูลดาวน์</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {combatUsablePotions.map((potId, idx) => {
                    const pot = POTIONS[potId];
                    if (!pot) return null;
                    const potItem = { ...pot, categoryTh: "🧪 ยาปรุง" };

                    const potBtn = (
                      <button
                        onClick={() => onUsePotion(potId)}
                        className="flex items-center gap-2 p-2 rounded-xl bg-amber-950/40 hover:bg-amber-900/60 border border-amber-500/40 text-left transition-all hover:scale-105 group w-full"
                      >
                        <div className="w-7 h-7 rounded-lg overflow-hidden bg-black/50 border border-amber-400/40 shrink-0 flex items-center justify-center">
                          {pot.image ? (
                            <img src={pot.image} alt={pot.name} className="w-full h-full object-contain p-0.5" />
                          ) : (
                            <span className="text-sm">🧪</span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[10px] font-black text-amber-200 truncate">{pot.name}</div>
                          <div className="text-[8px] text-white/50 truncate">{pot.description}</div>
                        </div>
                      </button>
                    );

                    return (
                      <ItemTooltip key={idx} item={potItem} position="top">
                        {potBtn}
                      </ItemTooltip>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* CENTER COLUMN: Wheel of Fate & VS Clash Stage (Cols 5-8) */}
        <div className="lg:col-span-4 h-full flex flex-col items-center justify-center py-2">
          {introState === "intro" ? (
            <div
              onClick={() => setIntroState("ready")}
              className="flex flex-col items-center cursor-pointer group"
            >
              <div className="relative flex items-center justify-center w-36 h-36 md:w-44 md:h-44 rounded-full bg-gradient-to-br from-red-600 via-amber-600 to-red-700 border-4 border-white/90 shadow-[0_0_80px_rgba(239,68,68,0.7)] group-hover:scale-110 transition-transform duration-300 animate-pulse">
                <span className="text-7xl md:text-8xl font-black italic tracking-tighter text-white drop-shadow-[0_6px_12px_rgba(0,0,0,0.9)]">
                  VS
                </span>
              </div>
              <div className="text-xs font-black tracking-widest text-amber-300 mt-6 bg-slate-900/90 px-6 py-2 rounded-full border border-amber-500/40 shadow-xl group-hover:bg-amber-500 group-hover:text-black transition-all">
                CLICK TO START CLASH
              </div>
            </div>
          ) : (
            <div className="w-full flex items-center justify-center animate-fade-in my-auto">
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

        {/* RIGHT COLUMN: Monster Stage (Cols 9-12) */}
        <div className="lg:col-span-4 h-full flex flex-col justify-center items-center lg:items-start">
          <div className="w-full max-w-md bg-gradient-to-br from-slate-900/90 to-red-950/40 border border-red-500/30 rounded-3xl p-6 shadow-[0_0_50px_rgba(239,68,68,0.15)] flex flex-col items-center text-center relative overflow-hidden backdrop-blur-xl">
            
            {/* Enemy Category Badge */}
            <div className="text-[11px] font-black uppercase tracking-widest text-red-400 bg-red-950/80 px-4 py-1.5 rounded-full border border-red-500/30 mb-4 shadow-sm">
              TARGET ENEMY
            </div>

            {/* Monster Avatar / Animation Large Display */}
            <div className="relative w-44 h-44 my-2 rounded-3xl border-2 border-red-500/40 overflow-hidden bg-slate-950 flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.25)]">
              {isGrandFinalBoss ? (
                <Suspense fallback={<img src={monsterIdleImg} alt={monster.name} className="w-full h-full object-cover" />}>
                  <GrandFinalBossModalModel />
                </Suspense>
              ) : monster.frames && monster.frames.length > 0 ? (
                <AnimatedUiMonster
                  frames={monster.frames}
                  fps={monster.fps || 8}
                  fallbackImage={monster.image || "/images/monsters/ชบ7000.webp"}
                  alt={monster.name}
                />
              ) : (
                <img
                  src={monster.image || "/images/monsters/ชบ7000.webp"}
                  alt={monster.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = "/images/monsters/ชบ7000.webp";
                  }}
                />
              )}
            </div>

            <h3 className="font-black text-white text-2xl md:text-3xl mt-3">{monster.name}</h3>
            <p className="text-xs text-red-400/80 font-bold mb-4">{monster.nameEn}</p>

            {/* Monster Stats */}
            <div className="w-full space-y-3 bg-black/50 p-4 rounded-2xl border border-red-500/20">
              <div className="flex justify-between items-center text-sm font-bold text-white/90">
                <span className="flex items-center gap-1.5">❤️ ENEMY HP</span>
                <span className="text-red-400 font-black text-base">{Math.max(0, monsterCurrentHp)} / {monsterMaxHp}</span>
              </div>
              <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-white/10">
                <motion.div
                  className="h-full bg-gradient-to-r from-red-600 to-rose-400 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.8)]"
                  initial={false}
                  animate={{ width: `${hpPct}%` }}
                  transition={{ type: "spring", stiffness: 200, damping: 22 }}
                />
              </div>

              <div className="flex justify-between items-center text-sm font-bold text-white/90 pt-2 border-t border-white/10">
                <span className="flex items-center gap-1.5">⚔️ DAMAGE POWER</span>
                <span className="text-red-400 font-black text-lg">{monster.dmg}</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* BOTTOM FOOTER HUD: Status Hint Bar */}
      <div className="relative z-20 w-full bg-slate-900/80 border border-white/10 rounded-2xl px-6 py-2.5 flex items-center justify-center backdrop-blur-md">
        <div className="text-xs text-slate-300 font-bold tracking-widest uppercase flex items-center gap-2">
          <span>✨</span>
          <span>SPIN THE WHEEL OF FATE TO DETERMINE THE WINNER</span>
          <span>✨</span>
        </div>
      </div>
    </div>
  );
}
