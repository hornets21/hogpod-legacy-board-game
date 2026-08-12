"use client";

import { Suspense, useState, useEffect } from "react";
import { motion } from "motion/react";
import WheelOfFate from "@/components/WheelOfFate";
import { getTotalDmg } from "@/lib/gameEngine";
import { AnimatedUiMonster } from "@/components/board3d/AnimatedMonster";
import Combat3dModelDisplay, { HOUSE_MODELS, MONSTER_MODELS } from "@/components/board3d/Combat3dModelDisplay";
import SkillButton from "@/components/fx/SkillButton";
import { SKILLS, POTIONS } from "@/lib/gameData";
import ItemTooltip from "@/components/fx/ItemTooltip";

export default function CombatModal({ combatState, player, onResolveCombat, onUseSkill, onUsePotion, onFlee }) {
  const [introState, setIntroState] = useState("intro"); // "intro" | "ready"
  const [hitStop, setHitStop] = useState(false);
  const [playerFx, setPlayerFx] = useState(null);
  const [monsterFx, setMonsterFx] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIntroState("ready");
    }, 1800);
    return () => clearTimeout(timer);
  }, []);

  const handleUseSkillWithFx = (skillId) => {
    if (skillId === "thunder_star") {
      setMonsterFx("lightning");
    } else if (skillId === "stay_stupid") {
      setPlayerFx("shield");
    } else if (skillId === "phoenix_force") {
      setMonsterFx("fire");
    } else {
      setMonsterFx("impact");
    }

    setTimeout(() => {
      setPlayerFx(null);
      setMonsterFx(null);
    }, 1400);

    if (onUseSkill) onUseSkill(skillId);
  };

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

  const playerModelPath =
    player.modelPath ||
    HOUSE_MODELS[player.houseId] ||
    HOUSE_MODELS[player.house];

  const monsterModelPath =
    monster.modelPath ||
    MONSTER_MODELS[monster.id] ||
    (isGrandFinalBoss ? "/models/granfinalboss.glb" : null);

  const battleTypeLabel = monster.isBoss
    ? "BOSS BATTLE"
    : monster.isElite
    ? "ELITE ENCOUNTER"
    : "ENCOUNTER DETECTED";

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-between select-none overflow-hidden animate-fade-in p-3 md:p-5 h-screen max-h-screen text-white pointer-events-none">
      {/* Translucent Vignette Backdrop allowing 3D Magic Room Camera visibility */}
      <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_20%,_rgba(2,6,23,0.85)_100%)] pointer-events-none" />

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

      {/* TOP HEADER HUD: Battle Room Header */}
      <div className="relative z-20 w-full max-w-5xl mx-auto flex items-center justify-between bg-slate-950/60 backdrop-blur-md px-5 py-2 rounded-2xl border border-white/10 shadow-2xl shrink-0 pointer-events-auto">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
          <span className="text-red-400 text-xs font-black tracking-[0.2em] uppercase">
            {battleTypeLabel}
          </span>
        </div>

        <div className="text-amber-400 text-xs font-black tracking-widest uppercase bg-amber-950/60 border border-amber-500/40 px-4 py-1 rounded-full shadow-inner">
          ⚔️ BATTLE ROOM ⚔️
        </div>

        {onFlee ? (
          <button
            onClick={onFlee}
            className="text-[11px] font-black tracking-widest text-amber-300 hover:text-white bg-amber-950/80 hover:bg-amber-900 border border-amber-500/50 px-4 py-1.5 rounded-xl shadow-lg transition-all hover:scale-105"
          >
            🏃 FLEE
          </button>
        ) : (
          <div className="text-slate-400 text-xs font-bold tracking-wider">
            DECISIVE BATTLE
          </div>
        )}
      </div>

      {/* CENTER MAIN BATTLE STAGE: Floating Stage without heavy box borders */}
      <div className="relative z-10 flex-1 my-2 grid grid-cols-1 lg:grid-cols-12 gap-4 items-center overflow-hidden min-h-0 pointer-events-auto">
        
        {/* LEFT COLUMN: Player Floating 3D Stage (Cols 1-4) */}
        <div className="lg:col-span-4 h-full flex flex-col justify-center items-center overflow-hidden">
          <div className="w-full max-w-sm flex flex-col items-center text-center relative max-h-full">
            
            {/* Player House Crest / Floating Badge */}
            <div className="text-[10px] font-black uppercase tracking-widest text-emerald-300 bg-emerald-950/70 backdrop-blur-md px-3.5 py-1 rounded-full border border-emerald-500/30 mb-1.5 shadow-lg shrink-0">
              {player.house || "PLAYER CHAMPION"}
            </div>
            
            {/* Player 3D Pedestal Spotlight (Borderless) */}
            <div className="relative w-32 h-32 md:w-44 md:h-44 my-1 flex items-center justify-center shrink-0">
              {/* Radial spotlight ground aura */}
              <div className="absolute inset-0 bg-[radial-gradient(circle,_rgba(16,185,129,0.35)_0%,_transparent_70%)] pointer-events-none rounded-full animate-pulse" />
              
              {playerModelPath ? (
                <Combat3dModelDisplay
                  modelPath={playerModelPath}
                  color="#10b981"
                  activeFx={playerFx}
                  hitState={hitStop}
                  fallback={
                    playerIdleImg ? (
                      <img src={playerIdleImg} alt={player.name} className="w-full h-full object-contain filter drop-shadow-[0_10px_20px_rgba(16,185,129,0.4)]" />
                    ) : (
                      <span className="text-6xl">{player.emoji}</span>
                    )
                  }
                />
              ) : playerIdleImg ? (
                <img src={playerIdleImg} alt={player.name} className="w-full h-full object-contain filter drop-shadow-[0_10px_20px_rgba(16,185,129,0.4)]" />
              ) : (
                <span className="text-6xl">{player.emoji}</span>
              )}
            </div>

            <h3 className="font-black text-white text-xl md:text-2xl leading-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">{player.name}</h3>
            <p className="text-[11px] text-emerald-400/90 font-bold mb-2">{player.nameEn}</p>

            {/* Health & Attack Floating Glass Card */}
            <div className="w-full space-y-2 bg-slate-950/70 backdrop-blur-md p-3 rounded-2xl border border-emerald-500/20 shadow-xl shrink-0">
              <div className="flex justify-between items-center text-xs font-bold text-white/90">
                <span className="flex items-center gap-1">❤️ HP</span>
                <span className="text-emerald-400 font-black text-sm">{Math.max(0, player.hp)} / {player.maxHp}</span>
              </div>
              <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-white/10">
                <motion.div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-300 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.9)]"
                  initial={false}
                  style={{ transformOrigin: "left", width: "100%" }}
                  animate={{ scaleX: playerHpPct / 100 }}
                  transition={{ type: "spring", stiffness: 200, damping: 22 }}
                />
              </div>

              <div className="flex justify-between items-center text-xs font-bold text-white/90 pt-1.5 border-t border-white/10">
                <span className="flex items-center gap-1">⚔️ ATTACK POWER</span>
                <span className="text-amber-400 font-black text-base">{totalDmg}</span>
              </div>
            </div>

            {/* FLOATING ACTION BAR (Skills & Potions) */}
            {(combatUsableSkills.length > 0 || combatUsablePotions.length > 0) && (
              <div className="w-full mt-2 bg-slate-950/75 backdrop-blur-md p-2 rounded-2xl border border-purple-500/30 shrink-0 overflow-y-auto max-h-[130px] custom-scrollbar shadow-2xl">
                {/* Skills */}
                {combatUsableSkills.length > 0 && onUseSkill && (
                  <div className="mb-2">
                    <div className="text-[9px] font-black uppercase tracking-wider text-purple-300 mb-1 text-left flex items-center justify-between">
                      <span>✨ คาถาต่อสู้</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {combatUsableSkills.map((skillId, idx) => (
                        <SkillButton
                          key={idx}
                          skillId={skillId}
                          playerIndex={player.playerIndex !== undefined ? player.playerIndex : 0}
                          playerId={player.playerIndex !== undefined ? player.playerIndex : 0}
                          cooldown={skillId ? player.skillCooldowns?.[skillId] || 0 : 0}
                          onUse={handleUseSkillWithFx}
                          size="sm"
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Potions */}
                {combatUsablePotions.length > 0 && onUsePotion && (
                  <div>
                    <div className="text-[9px] font-black uppercase tracking-wider text-amber-300 mb-1 text-left flex items-center justify-between">
                      <span>🧪 ยาต่อสู้</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {combatUsablePotions.map((potId, idx) => {
                        const pot = POTIONS[potId];
                        if (!pot) return null;
                        const potItem = { ...pot, categoryTh: "🧪 ยาปรุง" };

                        const potBtn = (
                          <button
                            onClick={() => onUsePotion(potId)}
                            className="flex items-center gap-1.5 p-1 rounded-lg bg-amber-950/50 hover:bg-amber-900/70 border border-amber-500/40 text-left transition-all hover:scale-102 group w-full"
                          >
                            <div className="w-5 h-5 rounded overflow-hidden bg-black/60 border border-amber-400/40 shrink-0 flex items-center justify-center">
                              {pot.image ? (
                                <img src={pot.image} alt={pot.name} className="w-full h-full object-contain p-0.5" />
                              ) : (
                                <span className="text-xs">🧪</span>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-[9px] font-black text-amber-200 truncate">{pot.name}</div>
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
            )}
          </div>
        </div>

        {/* CENTER COLUMN: Wheel of Fate & VS Clash Stage (Cols 5-8) */}
        <div className="lg:col-span-4 h-full flex flex-col items-center justify-center py-1 overflow-hidden">
          {introState === "intro" ? (
            <div
              onClick={() => setIntroState("ready")}
              className="flex flex-col items-center cursor-pointer group"
            >
              <div className="relative flex items-center justify-center w-28 h-28 md:w-36 md:h-36 rounded-full bg-gradient-to-br from-red-600 via-amber-600 to-red-700 border-4 border-white/90 shadow-[0_0_70px_rgba(239,68,68,0.8)] group-hover:scale-108 transition-transform duration-300 animate-pulse">
                <span className="text-6xl md:text-7xl font-black italic tracking-tighter text-white drop-shadow-[0_4px_8px_rgba(0,0,0,0.9)]">
                  VS
                </span>
              </div>
              <div className="text-[11px] font-black tracking-widest text-amber-300 mt-4 bg-slate-950/80 backdrop-blur-md px-5 py-1.5 rounded-full border border-amber-500/40 shadow-2xl group-hover:bg-amber-500 group-hover:text-black transition-all">
                CLICK TO START CLASH
              </div>
            </div>
          ) : (
            <div className="w-full flex items-center justify-center animate-fade-in my-auto max-h-full">
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

        {/* RIGHT COLUMN: Monster Floating 3D Stage (Cols 9-12) */}
        <div className="lg:col-span-4 h-full flex flex-col justify-center items-center overflow-hidden">
          <div className="w-full max-w-sm flex flex-col items-center text-center relative max-h-full">
            
            {/* Enemy Category Floating Badge */}
            <div className="text-[10px] font-black uppercase tracking-widest text-red-300 bg-red-950/70 backdrop-blur-md px-3.5 py-1 rounded-full border border-red-500/30 mb-1.5 shadow-lg shrink-0">
              TARGET ENEMY
            </div>

            {/* Monster 3D Pedestal Spotlight (Borderless) */}
            <div className="relative w-32 h-32 md:w-44 md:h-44 my-1 flex items-center justify-center shrink-0">
              {/* Radial spotlight ground aura */}
              <div className="absolute inset-0 bg-[radial-gradient(circle,_rgba(239,68,68,0.35)_0%,_transparent_70%)] pointer-events-none rounded-full animate-pulse" />

              {monsterModelPath ? (
                <Combat3dModelDisplay
                  modelPath={monsterModelPath}
                  color="#ef4444"
                  activeFx={monsterFx}
                  hitState={hitStop}
                  fallback={
                    monster.frames && monster.frames.length > 0 ? (
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
                        className="w-full h-full object-contain filter drop-shadow-[0_10px_20px_rgba(239,68,68,0.4)]"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = "/images/monsters/ชบ7000.webp";
                        }}
                      />
                    )
                  }
                />
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
                  className="w-full h-full object-contain filter drop-shadow-[0_10px_20px_rgba(239,68,68,0.4)]"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = "/images/monsters/ชบ7000.webp";
                  }}
                />
              )}
            </div>

            <h3 className="font-black text-white text-xl md:text-2xl leading-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">{monster.name}</h3>
            <p className="text-[11px] text-red-400/90 font-bold mb-2">{monster.nameEn}</p>

            {/* Monster Stats Floating Glass Card */}
            <div className="w-full space-y-2 bg-slate-950/70 backdrop-blur-md p-3 rounded-2xl border border-red-500/20 shadow-xl shrink-0">
              <div className="flex justify-between items-center text-xs font-bold text-white/90">
                <span className="flex items-center gap-1">❤️ ENEMY HP</span>
                <span className="text-red-400 font-black text-sm">{Math.max(0, monsterCurrentHp)} / {monsterMaxHp}</span>
              </div>
              <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-white/10">
                <motion.div
                  className="h-full bg-gradient-to-r from-red-600 to-rose-400 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.9)]"
                  initial={false}
                  style={{ transformOrigin: "left", width: "100%" }}
                  animate={{ scaleX: hpPct / 100 }}
                  transition={{ type: "spring", stiffness: 200, damping: 22 }}
                />
              </div>

              <div className="flex justify-between items-center text-xs font-bold text-white/90 pt-1.5 border-t border-white/10">
                <span className="flex items-center gap-1">⚔️ DAMAGE POWER</span>
                <span className="text-red-400 font-black text-base">{monster.dmg}</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* BOTTOM FOOTER HUD: Battle Room Footer */}
      <div className="relative z-20 w-full max-w-4xl mx-auto bg-slate-950/60 backdrop-blur-md border border-white/10 rounded-xl px-4 py-1.5 flex items-center justify-center shrink-0 shadow-2xl">
        <div className="text-[11px] text-slate-300 font-bold tracking-widest uppercase flex items-center gap-2">
          <span>✨</span>
          <span>SPIN THE WHEEL OF FATE TO DETERMINE THE WINNER</span>
          <span>✨</span>
        </div>
      </div>
    </div>
  );
}
