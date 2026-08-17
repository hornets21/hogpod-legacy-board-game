"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { getTotalDmg } from "@/lib/gameEngine";
import MagicCombat3dArena, { getHouseSpellType } from "@/components/board3d/MagicCombat3dArena";
import {
  HOUSE_MODELS,
  MONSTER_MODELS,
} from "@/components/board3d/Combat3dModelDisplay";
import { SKILLS, POTIONS, HOUSE_LIST } from "@/lib/gameData";
import ItemTooltip from "@/components/fx/ItemTooltip";

export default function CombatModal({
  combatState,
  player,
  onResolveCombat,
  onUseSkill,
  onUsePotion,
  onFlee,
}) {
  const [attackAction, setAttackAction] = useState({ active: false, id: 0, spellType: "fireball" });
  const [isAttacking, setIsAttacking] = useState(false);
  const [combatOutcome, setCombatOutcome] = useState(null);
  
  const monsterMaxHp = combatState?.monster?.hp || 1;
  const monsterCurrentHp =
    typeof combatState?.monster?.currentHp === "number"
      ? combatState.monster.currentHp
      : monsterMaxHp;

  const [displayedPlayerHp, setDisplayedPlayerHp] = useState(player?.hp ?? 100);
  const [displayedMonsterHp, setDisplayedMonsterHp] = useState(monsterCurrentHp);

  const [monsterDamagePopup, setMonsterDamagePopup] = useState(null);
  const [playerDamagePopup, setPlayerDamagePopup] = useState(null);

  const [hitStop, setHitStop] = useState(false);
  const [playerFx, setPlayerFx] = useState(null);
  const [monsterFx, setMonsterFx] = useState(null);
  const [showItemDrawer, setShowItemDrawer] = useState(false);
  const [showSkillDrawer, setShowSkillDrawer] = useState(false);

  const [pendingRoll, setPendingRoll] = useState(null);

  const handleAttack = () => {
    if (isAttacking || combatOutcome) return;
    setShowSkillDrawer(false);
    setShowItemDrawer(false);
    setIsAttacking(true);

    const baseDmg = getTotalDmg(player);
    const roll = Math.random();

    let rollType = "HIT";
    let playerDmg = baseDmg;
    let popupText = `-${baseDmg}`;
    let popupColor = "text-amber-300";

    if (roll < 0.15) {
      // 1. CRITICAL HIT (15% chance): 140% - 180% damage
      rollType = "CRIT";
      playerDmg = Math.round(baseDmg * (1.4 + Math.random() * 0.4));
      popupText = `CRIT! -${playerDmg}`;
      popupColor = "text-yellow-300 drop-shadow-[0_0_20px_rgba(234,179,8,0.9)]";
    } else if (roll < 0.55) {
      // 2. NORMAL HIT (40% chance): 85% - 115% damage
      rollType = "HIT";
      playerDmg = Math.max(1, Math.round(baseDmg * (0.85 + Math.random() * 0.3)));
      popupText = `-${playerDmg}`;
      popupColor = "text-amber-200";
    } else if (roll < 0.85) {
      // 3. GLANCING HIT / GRAZE (30% chance): 30% - 60% damage
      rollType = "GRAZE";
      playerDmg = Math.max(1, Math.round(baseDmg * (0.3 + Math.random() * 0.3)));
      popupText = `GRAZE -${playerDmg}`;
      popupColor = "text-orange-400";
    } else {
      // 4. MISS / EVADED (15% chance): 0 damage
      rollType = "MISS";
      playerDmg = 0;
      popupText = "MISS!";
      popupColor = "text-cyan-300";
    }

    const monsterBaseDmg = combatState?.monster?.dmg || 20;
    const counterDmg = rollType === "MISS"
      ? monsterBaseDmg
      : rollType === "GRAZE"
      ? Math.round(monsterBaseDmg * 0.9)
      : rollType === "HIT"
      ? Math.round(monsterBaseDmg * 0.6)
      : Math.round(monsterBaseDmg * 0.35); // Crit suppresses monster counter

    setPendingRoll({
      rollType,
      playerDmg,
      popupText,
      popupColor,
      counterDmg,
    });

    const spellType = getHouseSpellType(player?.houseId || player?.house);
    setAttackAction({
      active: true,
      id: Date.now(),
      spellType,
    });
  };

  // Phase 1: Player spell hits Monster
  const handlePlayerSpellImpact = () => {
    setHitStop(true);
    const pDmg = pendingRoll?.playerDmg ?? getTotalDmg(player);
    const pText = pendingRoll?.popupText ?? `-${pDmg}`;
    const pColor = pendingRoll?.popupColor ?? "text-amber-300";

    setMonsterDamagePopup({
      key: Date.now(),
      text: pText,
      colorClass: pColor,
    });
    setDisplayedMonsterHp((prev) => Math.max(0, prev - pDmg));
  };

  // Phase 2: Monster counter-spell hits Player
  const handleMonsterSpellImpact = () => {
    setHitStop(true);
    const mDmg = pendingRoll?.counterDmg ?? (combatState?.monster?.dmg || 20);
    setPlayerDamagePopup({
      key: Date.now(),
      text: `-${mDmg}`,
      colorClass: "text-red-400",
    });
    setDisplayedPlayerHp((prev) => Math.max(0, prev - mDmg));
  };

  // Phase 3: Spell sequence complete
  const handleSpellComplete = () => {
    const pDmg = pendingRoll?.playerDmg ?? getTotalDmg(player);
    const mDmg = pendingRoll?.counterDmg ?? (combatState?.monster?.dmg || 20);
    const remainingMonsterHp = Math.max(0, monsterCurrentHp - pDmg);

    const isWin = remainingMonsterHp <= 0 || (pendingRoll?.rollType === "CRIT") || (pDmg >= mDmg && pendingRoll?.rollType === "HIT");
    const outcome = isWin ? "win" : "lose";

    setCombatOutcome({
      outcome,
      damageDealt: pDmg,
      playerDmg: pDmg,
      monsterDmg: mDmg,
      monsterHp: monsterMaxHp,
      remainingHp: remainingMonsterHp,
      rollType: pendingRoll?.rollType || "HIT",
    });
    setIsAttacking(false);
  };

  // Auto-trigger attack for bot players
  useEffect(() => {
    if (player?.isBot && !isAttacking && !combatOutcome) {
      const timer = setTimeout(() => {
        handleAttack();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [player?.isBot, isAttacking, combatOutcome]);

  // Auto-confirm result for bot
  useEffect(() => {
    if (combatOutcome && player?.isBot) {
      const timer = setTimeout(() => {
        handleConfirmResult();
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [combatOutcome, player?.isBot]);

  const handleConfirmResult = () => {
    if (!combatOutcome) return;
    if (typeof onResolveCombat === "function") {
      onResolveCombat({
        outcome: combatOutcome.outcome,
        spunDmg: combatOutcome.monsterDmg,
        spunHp: combatOutcome.monsterHp,
        damageDealt: combatOutcome.damageDealt,
      });
    }
  };

  const handleUseSkillWithFx = (skillId) => {
    if (!skillId) return;
    if (skillId === "stay_stupid") {
      setPlayerFx("invincible");
      setPlayerDamagePopup({
        text: "INVINCIBLE (2T)",
        colorClass: "text-amber-300 drop-shadow-[0_0_15px_rgba(251,191,36,0.9)]",
        key: Date.now(),
      });
    } else if (skillId === "thunder_star") {
      setMonsterFx("lightning");
      setMonsterDamagePopup({
        text: "-50 DMG",
        colorClass: "text-yellow-300 drop-shadow-[0_0_15px_rgba(253,224,71,0.9)]",
        key: Date.now(),
      });
      setDisplayedMonsterHp((prev) => Math.max(0, prev - 50));
    } else if (skillId === "phoenix_force") {
      setPlayerFx("damage");
      setMonsterFx("fire");
      setMonsterDamagePopup({
        text: "-80 DMG",
        colorClass: "text-rose-400 drop-shadow-[0_0_15px_rgba(251,113,133,0.9)]",
        key: Date.now(),
      });
      setDisplayedMonsterHp((prev) => Math.max(0, prev - 80));
    } else if (skillId === "morelody") {
      setPlayerFx("speed");
      setPlayerDamagePopup({
        text: "STEAL TURN",
        colorClass: "text-cyan-300 drop-shadow-[0_0_15px_rgba(34,211,238,0.9)]",
        key: Date.now(),
      });
    } else if (skillId === "ngo_leng_ngeng_khiao") {
      setPlayerFx("crit");
      setPlayerDamagePopup({
        text: "CRIT / DICE LOCK",
        colorClass: "text-amber-300 drop-shadow-[0_0_15px_rgba(251,191,36,0.9)]",
        key: Date.now(),
      });
    } else {
      setPlayerFx("magic");
    }

    setTimeout(() => {
      setPlayerFx(null);
      setMonsterFx(null);
    }, 2800);

    if (onUseSkill) onUseSkill(skillId);
  };

  const handleUsePotionWithFx = (potId) => {
    if (!potId) return;
    if (potId === "heal") {
      setPlayerFx("heal");
      setPlayerDamagePopup({
        text: "+30 HP",
        colorClass: "text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.9)]",
        key: Date.now(),
      });
      setDisplayedPlayerHp((prev) => Math.min(player.maxHp, prev + (POTIONS.heal?.healAmount || 30)));
    } else if (potId === "damage") {
      setPlayerFx("damage");
      setPlayerDamagePopup({
        text: "+100 DMG",
        colorClass: "text-red-400 drop-shadow-[0_0_15px_rgba(248,113,113,0.9)]",
        key: Date.now(),
      });
    } else if (potId === "cooldown") {
      setPlayerFx("speed");
      setPlayerDamagePopup({
        text: "CD -2 TURNS",
        colorClass: "text-cyan-300 drop-shadow-[0_0_15px_rgba(34,211,238,0.9)]",
        key: Date.now(),
      });
    } else if (potId === "revive") {
      setPlayerFx("revive");
    }

    setTimeout(() => {
      setPlayerFx(null);
    }, 2800);

    if (onUsePotion) onUsePotion(potId);
  };

  if (!combatState || !player) return null;

  const { monster } = combatState;
  const totalDmg = getTotalDmg(player);
  const hpPct = Math.max(0, Math.min(100, (displayedMonsterHp / monsterMaxHp) * 100));
  const playerHpPct = Math.max(0, Math.min(100, (displayedPlayerHp / player.maxHp) * 100));

  // Find player house info
  const playerHouseInfo =
    HOUSE_LIST.find((h) => h.id === player.houseId || h.id === player.house) ||
    HOUSE_LIST[0];

  // Usable combat skills (against monsters / self buffs)
  const combatUsableSkills = (player.skills || [])
    .map((skId) => {
      const sId = typeof skId === "string" ? skId : skId?.id;
      return { id: sId, ...SKILLS[sId] };
    })
    .filter((sk) => {
      if (!sk?.id) return false;
      return (
        sk.target === "monster" ||
        sk.targetType === "monster" ||
        sk.requiresTarget === "monster" ||
        sk.effect === "invincible" ||
        sk.effect === "lock_dice"
      );
    });

  // Usable combat potions
  const combatUsablePotions = (player.potions || []).filter((potId) => {
    return potId === "heal" || potId === "damage" || potId === "cooldown";
  });

  const playerIdleImg = player.image || null;
  const isGrandFinalBoss = monster.id === "grand_boss" || monster.cell === 90;

  const playerModelPath =
    player.modelPath ||
    HOUSE_MODELS[player.houseId] ||
    HOUSE_MODELS[player.house];

  const monsterModelPath =
    monster.modelPath ||
    MONSTER_MODELS[monster.id] ||
    (isGrandFinalBoss ? "/models/granfinalboss.glb" : null);



  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-between select-none overflow-hidden animate-fade-in p-3 sm:p-5 md:p-6 w-screen h-screen max-w-full max-h-full text-white pointer-events-auto bg-[#090714]">
      {/* Deep cosmic vignette background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(15,10,30,0.5)_20%,_rgba(4,3,10,0.98)_100%)] pointer-events-none" />

      {/* Hit-stop flash when resolving */}
      {hitStop && (
        <motion.div
          initial={{ opacity: 0.6 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 z-40 bg-yellow-100 pointer-events-none mix-blend-screen"
          onAnimationComplete={() => setHitStop(false)}
        />
      )}

      {/* ── TOP HUD BARS (Pokemon RPG Layout) ────────────────────── */}
      <div className="relative z-30 w-full flex items-start justify-between gap-4 pointer-events-auto">
        
        {/* TOP-LEFT: Player Status Bar (Angled Polygon) */}
        <div className="flex flex-col gap-1.5 max-w-[48%] sm:max-w-md w-full">
          <div
            className="relative bg-slate-950/90 backdrop-blur-md border border-slate-700/80 shadow-[0_8px_30px_rgba(0,0,0,0.8)] px-3 sm:px-5 py-2.5 sm:py-3 rounded-2xl"
            style={{
              clipPath: "polygon(0 0, calc(100% - 20px) 0, 100% 100%, 0 100%)",
            }}
          >
            {/* Row 1: Name & House */}
            <div className="flex items-center justify-between gap-2 pr-3 sm:pr-4 mb-1.5">
              <span className="font-black text-xs sm:text-base md:text-lg text-white tracking-wide truncate">
                {player.name}
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[10px] sm:text-xs font-black text-amber-300 tracking-wider uppercase bg-amber-950/60 px-2 py-0.5 rounded-lg border border-amber-500/30">
                  {player.house || playerHouseInfo.name}
                </span>
              </div>
            </div>

            {/* Row 2: HP Label & HP Bar */}
            <div className="flex items-center gap-1.5 sm:gap-2 pr-3 sm:pr-4">
              <span className="text-[10px] sm:text-xs font-black text-emerald-400 tracking-widest shrink-0">
                HP
              </span>
              <div className="flex-1 h-2.5 sm:h-3.5 bg-slate-900/90 rounded-full overflow-hidden p-0.5 border border-white/20 shadow-inner">
                <motion.div
                  className="h-full bg-gradient-to-r from-emerald-500 to-green-400 rounded-full shadow-[0_0_12px_rgba(34,197,94,0.9)]"
                  initial={false}
                  style={{ transformOrigin: "left", width: "100%" }}
                  animate={{ scaleX: playerHpPct / 100 }}
                  transition={{ type: "spring", stiffness: 220, damping: 20 }}
                />
              </div>
            </div>

            {/* Row 3: Numeric HP text */}
            <div className="text-right text-[10px] sm:text-[11px] font-black text-white/90 pr-4 mt-1 tracking-wider">
              {Math.max(0, displayedPlayerHp)} / {player.maxHp}
            </div>
          </div>
        </div>

        {/* TOP-RIGHT: Monster Status Bar (Angled Polygon) */}
        <div className="flex flex-col items-end gap-1.5 max-w-[48%] sm:max-w-md w-full">
          <div
            className="relative bg-slate-950/90 backdrop-blur-md border border-slate-700/80 shadow-[0_8px_30px_rgba(0,0,0,0.8)] px-3 sm:px-5 py-2.5 sm:py-3 rounded-2xl w-full text-right"
            style={{
              clipPath: "polygon(20px 0, 100% 0, 100% 100%, 0 100%)",
            }}
          >
            {/* Row 1: Name & Type */}
            <div className="flex items-center justify-between gap-2 pl-3 sm:pl-4 mb-1.5">
              <span className="font-black text-xs sm:text-base md:text-lg text-white tracking-wide truncate text-left">
                {monster.name}
              </span>
              {monster.isBoss && (
                <span className="text-[9px] sm:text-[10px] font-black text-red-300 tracking-wider uppercase bg-red-950/80 px-2 py-0.5 rounded-lg border border-red-500/40 shrink-0">
                  BOSS
                </span>
              )}
            </div>

            {/* Row 2: HP Label & HP Bar */}
            <div className="flex items-center gap-1.5 sm:gap-2 pl-3 sm:pl-4">
              <span className="text-[10px] sm:text-xs font-black text-emerald-400 tracking-widest shrink-0">
                HP
              </span>
              <div className="flex-1 h-2.5 sm:h-3.5 bg-slate-900/90 rounded-full overflow-hidden p-0.5 border border-white/20 shadow-inner">
                <motion.div
                  className="h-full bg-gradient-to-r from-emerald-500 to-green-400 rounded-full shadow-[0_0_12px_rgba(34,197,94,0.9)]"
                  initial={false}
                  style={{ transformOrigin: "left", width: "100%" }}
                  animate={{ scaleX: hpPct / 100 }}
                  transition={{ type: "spring", stiffness: 220, damping: 20 }}
                />
              </div>
            </div>

            {/* Row 3: Numeric Monster HP text */}
            <div className="text-right text-[10px] sm:text-[11px] font-black text-white/90 pr-2 mt-1 tracking-wider">
              {Math.max(0, displayedMonsterHp)} / {monsterMaxHp}
            </div>
          </div>
        </div>
      </div>

      {/* ── 3D MAGIC BATTLE ARENA (FULL SCREEN PANORAMIC VIEW) ── */}
      <div className="relative z-10 flex-1 w-full h-full flex items-center justify-center pointer-events-none">
        
        {/* Full 3D Magic Arena Canvas */}
        <MagicCombat3dArena
          player={player}
          monster={monster}
          playerModelPath={playerModelPath}
          monsterModelPath={monsterModelPath}
          attackAction={attackAction}
          hitStop={hitStop}
          playerFx={playerFx}
          monsterFx={monsterFx}
          onSpellImpact={handlePlayerSpellImpact}
          onMonsterImpact={handleMonsterSpellImpact}
          onSpellComplete={handleSpellComplete}
        />

        {/* 2D HUD Tags Overlay on 3D Stage */}
        <div className="relative w-full h-full pointer-events-auto flex items-center justify-center">

          {/* 1. FLOATING DAMAGE POPUP OVER MONSTER */}
          <AnimatePresence>
            {monsterDamagePopup && (
              <motion.div
                key={monsterDamagePopup.key}
                initial={{ opacity: 0, y: 0, scale: 0.8 }}
                animate={{ opacity: 1, y: -45, scale: 1.35 }}
                exit={{ opacity: 0, y: -80, scale: 0.9 }}
                transition={{ duration: 0.85, ease: "easeOut" }}
                className={`absolute top-[28%] right-[22%] z-40 text-3xl sm:text-4xl md:text-5xl font-black ${
                  monsterDamagePopup.colorClass || "text-amber-300"
                } drop-shadow-[0_4px_16px_rgba(0,0,0,0.95)] pointer-events-none tracking-wider select-none`}
              >
                {monsterDamagePopup.text}
              </motion.div>
            )}
          </AnimatePresence>

          {/* 2. FLOATING DAMAGE POPUP OVER PLAYER */}
          <AnimatePresence>
            {playerDamagePopup && (
              <motion.div
                key={playerDamagePopup.key}
                initial={{ opacity: 0, y: 0, scale: 0.8 }}
                animate={{ opacity: 1, y: -45, scale: 1.35 }}
                exit={{ opacity: 0, y: -80, scale: 0.9 }}
                transition={{ duration: 0.85, ease: "easeOut" }}
                className={`absolute bottom-[36%] left-[22%] z-40 text-3xl sm:text-4xl md:text-5xl font-black ${
                  playerDamagePopup.colorClass || "text-red-400"
                } drop-shadow-[0_4px_16px_rgba(0,0,0,0.95)] pointer-events-none tracking-wider select-none`}
              >
                {playerDamagePopup.text}
              </motion.div>
            )}
          </AnimatePresence>

          {/* 3. CENTER OVERLAY: VICTORY / DEFEAT BANNER */}
          <AnimatePresence mode="wait">
            {combatOutcome && (
              <motion.div
                key="combat-outcome-banner"
                initial={{ opacity: 0, scale: 0.8, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ type: "spring", stiffness: 280, damping: 22 }}
                className="absolute inset-0 m-auto z-30 flex flex-col items-center justify-center max-w-sm sm:max-w-md pointer-events-auto gap-2.5 px-4"
              >
                <div
                  className={`w-full py-3.5 px-5 rounded-2xl border-2 text-center shadow-[0_0_40px_rgba(0,0,0,0.95)] backdrop-blur-xl ${
                    combatOutcome.outcome === "win"
                      ? "bg-emerald-950/95 border-emerald-400 text-emerald-300 shadow-emerald-500/40"
                      : "bg-red-950/95 border-red-400 text-red-300 shadow-red-500/40"
                  }`}
                >
                  <div className="text-xl md:text-2xl font-black tracking-wider drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)] uppercase">
                    {combatOutcome.outcome === "win" ? "VICTORY!" : "BATTLE CLASH!"}
                  </div>
                  <div className="text-xs font-bold text-white/90 truncate mt-1">
                    {combatOutcome.remainingHp <= 0
                      ? `สร้าง ${combatOutcome.damageDealt} ดาเมจ ปราบ ${monster?.name || "มอนสเตอร์"} สำเร็จ!`
                      : `คุณทำ ${combatOutcome.damageDealt} ดาเมจ | โดน ${monster?.name || "มอนสเตอร์"} สวนกลับ ${combatOutcome.monsterDmg} ดาเมจ`}
                  </div>
                </div>

                <button
                  onClick={handleConfirmResult}
                  className={`w-full py-3 px-6 rounded-xl font-black text-sm shadow-2xl transition-all duration-200 active:scale-95 border border-white/30 tracking-wider uppercase cursor-pointer ${
                    combatOutcome.outcome === "win"
                      ? "bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500 text-white shadow-emerald-500/60 hover:brightness-110"
                      : "bg-gradient-to-r from-red-600 via-rose-600 to-red-600 text-white shadow-red-500/60 hover:brightness-110"
                  }`}
                >
                  {combatOutcome.outcome === "win" ? "รับรางวัล & จบการต่อสู้" : "บันทึกผล & จบการต่อสู้"}
                </button>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>

      {/* ── BOTTOM ACTION COMMAND DOCK (CLEAN GLASSMORPHIC DESIGN) ────── */}
      <div className="relative z-30 w-full flex items-center justify-center pointer-events-auto pb-2 sm:pb-3">
        <div className="relative flex flex-row items-center justify-center gap-2 sm:gap-3 bg-slate-950/80 backdrop-blur-2xl border border-white/15 p-2 sm:p-2.5 rounded-2xl sm:rounded-3xl shadow-[0_12px_45px_rgba(0,0,0,0.85)] max-w-xl w-full mx-auto">
          
          {/* FLOATING SKILL DRAWER (OPENS ABOVE CENTER DOCK) */}
          <AnimatePresence>
            {showSkillDrawer && (
              <motion.div
                initial={{ opacity: 0, y: 15, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 15, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-[92vw] max-w-sm sm:max-w-md bg-slate-950/95 backdrop-blur-xl border border-purple-500/50 rounded-2xl p-4 shadow-2xl z-50"
              >
                <div className="flex items-center justify-between pb-2 mb-3 border-b border-white/10">
                  <div className="flex items-center gap-2 text-purple-300 text-xs font-black tracking-wider uppercase">
                    <span>COMBAT SKILLS (สกิลต่อสู้)</span>
                  </div>
                  <button
                    onClick={() => setShowSkillDrawer(false)}
                    className="text-xs text-slate-400 hover:text-white font-bold px-2 py-0.5 rounded-lg bg-slate-800"
                  >
                    ปิด ✕
                  </button>
                </div>

                {combatUsableSkills.length === 0 ? (
                  <div className="text-center py-4 text-xs font-bold text-slate-400">
                    ไม่มีสกิลที่สามารถใช้กับมอนสเตอร์ได้
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
                    {combatUsableSkills.map((sk) => {
                      const cd = player.skillCooldowns?.[sk.id] || 0;
                      const isCoolingDown = cd > 0;

                      return (
                        <button
                          key={sk.id}
                          disabled={isCoolingDown}
                          onClick={() => {
                            handleUseSkillWithFx(sk.id);
                            setShowSkillDrawer(false);
                          }}
                          className={`flex items-center justify-between gap-3 p-2.5 rounded-xl border text-left transition-all ${
                            isCoolingDown
                              ? "bg-slate-900/60 border-slate-800 text-slate-500 opacity-60 cursor-not-allowed"
                              : "bg-purple-950/60 hover:bg-purple-900/80 border-purple-500/40 text-purple-100 hover:scale-102 cursor-pointer shadow-lg"
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-black text-xs text-white">
                                {sk.nameTh || sk.name}
                              </span>
                              <span className="text-[10px] text-purple-300 font-bold bg-purple-900/60 px-1.5 py-0.2 rounded border border-purple-400/30">
                                {sk.categoryTh || "สกิล"}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-300 line-clamp-1 mt-0.5">
                              {sk.description}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            {isCoolingDown ? (
                              <span className="text-[10px] font-black text-red-400">
                                CD: {cd}T
                              </span>
                            ) : (
                              <span className="text-[10px] font-black text-emerald-400 uppercase bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                                ร่ายสกิล
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* FLOATING ITEM DRAWER (OPENS ABOVE CENTER DOCK) */}
          <AnimatePresence>
            {showItemDrawer && (
              <motion.div
                initial={{ opacity: 0, y: 15, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 15, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-[92vw] max-w-sm sm:max-w-md bg-slate-950/95 backdrop-blur-xl border border-amber-500/50 rounded-2xl p-4 shadow-2xl z-50"
              >
                <div className="flex items-center justify-between pb-2 mb-3 border-b border-white/10">
                  <div className="flex items-center gap-2 text-amber-300 text-xs font-black tracking-wider uppercase">
                    <span>POTION BAG (กระเป๋ายา)</span>
                  </div>
                  <button
                    onClick={() => setShowItemDrawer(false)}
                    className="text-xs text-slate-400 hover:text-white font-bold px-2 py-0.5 rounded-lg bg-slate-800"
                  >
                    ปิด ✕
                  </button>
                </div>

                {combatUsablePotions.length === 0 ? (
                  <div className="text-center py-4 text-xs font-bold text-slate-400">
                    ไม่มีขวดยาที่ใช้ในฉากต่อสู้ได้
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                    {combatUsablePotions.map((potId, idx) => {
                      const pot = POTIONS[potId];
                      if (!pot) return null;
                      const potItem = { ...pot, categoryTh: "ยาปรุง" };

                      return (
                        <ItemTooltip key={idx} item={potItem} position="top">
                          <button
                            onClick={() => {
                              handleUsePotionWithFx(potId);
                              setShowItemDrawer(false);
                            }}
                            className="flex items-center gap-2 p-2 rounded-xl bg-amber-950/60 hover:bg-amber-900 border border-amber-500/40 text-left transition-all hover:scale-102 group w-full"
                          >
                            <div className="w-8 h-8 rounded-lg overflow-hidden bg-black/60 border border-amber-400/40 shrink-0 flex items-center justify-center">
                              {pot.image ? (
                                <img
                                  src={pot.image}
                                  alt={pot.name}
                                  className="w-full h-full object-contain p-0.5"
                                />
                              ) : (
                                <span className="text-[9px] font-bold text-amber-300">POT</span>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-black text-amber-200 truncate">
                                {pot.name}
                              </div>
                              <div className="text-[10px] text-amber-300/80 font-bold">
                                กดเพื่อใช้
                              </div>
                            </div>
                          </button>
                        </ItemTooltip>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* 1. ATTACK BUTTON (Dominant Crimson & Amber Glow) */}
          <button
            type="button"
            disabled={isAttacking || !!combatOutcome}
            onClick={handleAttack}
            className={`flex-[1.4] py-3 sm:py-3.5 px-3 rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm tracking-wider uppercase flex items-center justify-center gap-1.5 transition-all shadow-[0_0_25px_rgba(239,68,68,0.5)] ${
              isAttacking || !!combatOutcome
                ? "bg-slate-900/80 border border-slate-700 text-slate-500 opacity-60 cursor-not-allowed"
                : "bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:from-red-500 hover:to-amber-500 border border-amber-400/80 text-white hover:scale-103 active:scale-95 cursor-pointer animate-pulse"
            }`}
          >
            <span>{isAttacking ? "CASTING..." : "ATTACK"}</span>
          </button>

          {/* 2. SKILL BUTTON (Amethyst Purple Glow) */}
          <button
            type="button"
            disabled={isAttacking || !!combatOutcome}
            onClick={() => {
              setShowSkillDrawer((prev) => !prev);
              setShowItemDrawer(false);
            }}
            className={`flex-1 py-3 sm:py-3.5 px-3 rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm tracking-wider uppercase flex items-center justify-center gap-1.5 transition-all shadow-[0_0_20px_rgba(168,85,247,0.35)] ${
              isAttacking || !!combatOutcome
                ? "bg-slate-900/80 border border-slate-700 text-slate-500 opacity-60 cursor-not-allowed"
                : "bg-gradient-to-r from-purple-700 via-indigo-600 to-purple-600 hover:from-purple-600 hover:to-indigo-500 border border-purple-400/60 text-white hover:scale-103 active:scale-95 cursor-pointer"
            }`}
          >
            <span>SKILL</span>
          </button>

          {/* 3. ITEM BUTTON (Dark Slate & Gold Border) */}
          <button
            type="button"
            disabled={isAttacking || !!combatOutcome}
            onClick={() => {
              setShowItemDrawer((prev) => !prev);
              setShowSkillDrawer(false);
            }}
            className={`flex-1 py-3 sm:py-3.5 px-3 rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm tracking-wider uppercase flex items-center justify-center gap-1.5 transition-all shadow-md ${
              isAttacking || !!combatOutcome
                ? "bg-slate-900/80 border border-slate-700 text-slate-500 opacity-60 cursor-not-allowed"
                : "bg-slate-900/90 hover:bg-slate-800 text-amber-200 hover:text-white border border-amber-500/40 hover:border-amber-400 hover:scale-103 active:scale-95 cursor-pointer"
            }`}
          >
            <span>ITEM</span>
          </button>

          {/* 4. RUN BUTTON (Dark Slate & Red Accent) */}
          <button
            type="button"
            disabled={!onFlee || isAttacking || !!combatOutcome}
            onClick={onFlee || undefined}
            title={
              onFlee
                ? "ใช้พลังสัตว์เลี้ยง 'แบงค์' หลบหนีการต่อสู้"
                : "ต้องมีสัตว์เลี้ยง 'แบงค์' (หลบหลีก 1 ครั้ง) จึงจะสามารถหนีได้"
            }
            className={`flex-[0.9] py-3 sm:py-3.5 px-2.5 rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm tracking-wider uppercase flex items-center justify-center gap-1.5 transition-all shadow-md ${
              onFlee && !isAttacking && !combatOutcome
                ? "bg-slate-900/90 hover:bg-red-950/80 text-slate-300 hover:text-red-300 border border-slate-700 hover:border-red-500/60 hover:scale-103 active:scale-95 cursor-pointer"
                : "bg-slate-950/60 text-slate-500 border border-slate-800/80 cursor-not-allowed opacity-45"
            }`}
          >
            <span>RUN</span>
          </button>

        </div>
      </div>
    </div>
  );
}
