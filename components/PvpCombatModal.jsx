"use client";

// ============================================================
// PvpCombatModal — Fullscreen 3D PvP Arena with Monster Dock UI
// Pure 3D Canvas Background, Monster Combat Button Style,
// 1-Attack Target Selection per Player, Strict Zero Emojis
// ============================================================

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { SKILLS, POTIONS } from "@/lib/gameData";
import { getTotalDmg } from "@/lib/gameEngine";
import { emitSkillCast, emitDamageDealt, emitHeal } from "@/lib/skillFxBus";
import ItemTooltip from "@/components/fx/ItemTooltip";
import Pvp3dBattleStage from "@/components/board3d/Pvp3dBattleStage";

export default function PvpCombatModal({
  pvpEncounter,
  players,
  onPvpAction,
  myPlayerIndex,
}) {
  if (!pvpEncounter) return null;

  const cell = pvpEncounter.cell || 1;

  // Extract initial fighters
  const initialFighters = useMemo(() => {
    const rawList =
      pvpEncounter.participants ||
      (pvpEncounter.participantIndices
        ? pvpEncounter.participantIndices.map((idx) => ({
            ...players[idx],
            playerIndex: idx,
          }))
        : []);

    return rawList
      .map((p) => {
        if (!p) return null;
        const playerIndex =
          p.playerIndex ??
          players.findIndex((player) => player.houseId === p.houseId);
        if (playerIndex < 0) return null;
        const basePlayer = players[playerIndex] || p;
        return {
          id: `P${playerIndex + 1}`,
          playerIndex,
          houseId: basePlayer.houseId,
          name: basePlayer.name || `Player ${playerIndex + 1}`,
          color: basePlayer.color || "#f59e0b",
          maxHp: basePlayer.maxHp || 100,
          hp: Math.max(0, basePlayer.hp ?? 100),
          baseDmg: getTotalDmg(basePlayer) || 20,
          skills: basePlayer.skills || [],
          skillCooldowns: { ...(basePlayer.skillCooldowns || {}) },
          potions: [...(basePlayer.potions || [])],
          isBot: Boolean(basePlayer.isBot),
          isInvincible: Boolean(basePlayer.isInvincible),
        };
      })
      .filter(Boolean);
  }, [pvpEncounter, players]);

  // Mutable fighter list inside duel
  const [fighters, setFighters] = useState(initialFighters);
  const [currentTurn, setCurrentTurn] = useState(0);
  const [completedTurns, setCompletedTurns] = useState([]);
  const [damageDealtMap, setDamageDealtMap] = useState({});

  const [lockedTargetIndex, setLockedTargetIndex] = useState(null);
  const [battleLocked, setBattleLocked] = useState(false);
  const [battleLog, setBattleLog] = useState("Select an opponent and attack to initiate clash");
  const [logHistory, setLogHistory] = useState([]);

  // Drawers for Monster Combat Button Dock
  const [showSkillDrawer, setShowSkillDrawer] = useState(false);
  const [showItemDrawer, setShowItemDrawer] = useState(false);

  // Active VFX states for 3D Stage
  const [activeCast, setActiveCast] = useState(null);
  const [activeProjectile, setActiveProjectile] = useState(null);
  const [activeHit, setActiveHit] = useState(null);

  // Selected spells/potions for active turn
  const [selectedSkillId, setSelectedSkillId] = useState(null);
  const [selectedPotionId, setSelectedPotionId] = useState(null);

  // Duel completion state
  const [duelFinished, setDuelFinished] = useState(false);
  const [winner, setWinner] = useState(null);
  const [autoReturnCountdown, setAutoReturnCountdown] = useState(null);

  // Refs for async animation queue
  const fightersRef = useRef(fighters);
  fightersRef.current = fighters;
  const currentTurnRef = useRef(currentTurn);
  currentTurnRef.current = currentTurn;
  const completedTurnsRef = useRef(completedTurns);
  completedTurnsRef.current = completedTurns;
  const damageDealtMapRef = useRef(damageDealtMap);
  damageDealtMapRef.current = damageDealtMap;
  const battleLockedRef = useRef(battleLocked);
  battleLockedRef.current = battleLocked;
  const isResolvingRef = useRef(false);
  const onPvpActionRef = useRef(onPvpAction);
  onPvpActionRef.current = onPvpAction;

  const isOnline = myPlayerIndex !== undefined;
  const isSpectator = isOnline && (myPlayerIndex == null || myPlayerIndex < 0);
  const currentAttacker = fighters[currentTurn] || fighters[0];

  const isMyTurn = useMemo(() => {
    if (!currentAttacker || currentAttacker.hp <= 0) return false;
    if (isOnline) {
      return (
        myPlayerIndex != null &&
        myPlayerIndex >= 0 &&
        currentAttacker.playerIndex === myPlayerIndex
      );
    }
    return !currentAttacker.isBot;
  }, [currentAttacker, isOnline, myPlayerIndex]);

  // Target indices of other living fighters
  const availableTargetIndices = useMemo(() => {
    return fighters
      .map((f, idx) => ({ f, idx }))
      .filter(({ f, idx }) => idx !== currentTurn && f.hp > 0)
      .map(({ idx }) => idx);
  }, [fighters, currentTurn]);

  // Default target if none locked
  const activeTargetIndex = useMemo(() => {
    if (lockedTargetIndex !== null && availableTargetIndices.includes(lockedTargetIndex)) {
      return lockedTargetIndex;
    }
    return availableTargetIndices[0] ?? null;
  }, [lockedTargetIndex, availableTargetIndices]);

  // Reset encounter state on new cell encounter
  useEffect(() => {
    setFighters(initialFighters);
    setCurrentTurn(0);
    setCompletedTurns([]);
    setDamageDealtMap({});
    setLockedTargetIndex(null);
    setBattleLocked(false);
    setShowSkillDrawer(false);
    setShowItemDrawer(false);
    setSelectedSkillId(null);
    setSelectedPotionId(null);
    setDuelFinished(false);
    setWinner(null);
    setAutoReturnCountdown(null);
    setLogHistory([]);
    isResolvingRef.current = false;
  }, [cell, initialFighters]);

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // ─── RESOLVE PVP DUEL & SEND FINAL STATE TO REDUCER / FIREBASE ──
  const resolveDuel = useCallback(
    (customWinner = winner) => {
      if (isResolvingRef.current) return;
      isResolvingRef.current = true;

      const currentFighters = fightersRef.current;
      const updatedPlayers = players.map((p, idx) => {
        const f = currentFighters.find((item) => item.playerIndex === idx);
        if (!f) return p;
        return {
          ...p,
          hp: f.hp,
          potions: f.potions,
          skillCooldowns: f.skillCooldowns,
          isInvincible: f.isInvincible,
        };
      });

      const winnerText = customWinner
        ? `[PVP] Clash Winner: ${customWinner.name} (${customWinner.id})`
        : "[PVP] Clash ended in a Draw";

      const finalLogs = [
        `[PVP] Magic Clash finished at cell #${cell}`,
        ...logHistory,
        winnerText,
      ];

      if (onPvpActionRef.current) {
        onPvpActionRef.current({
          choice: "resolve",
          updatedPlayers,
          logEntries: finalLogs,
          extraTurn: false,
        });
      }
    },
    [cell, logHistory, players, winner]
  );

  // ─── EXECUTE 1 ATTACK TURN (1 ATTACK PER FIGHTER IN CLASH) ─────
  const executeExchange = useCallback(
    async (attackerIdx, targetIdx) => {
      if (battleLockedRef.current || isResolvingRef.current) return;
      setBattleLocked(true);
      setShowSkillDrawer(false);
      setShowItemDrawer(false);
      setLockedTargetIndex(targetIdx);

      const list = [...fightersRef.current];
      const attacker = { ...list[attackerIdx] };
      const target = { ...list[targetIdx] };

      if (!attacker || !target || attacker.hp <= 0 || target.hp <= 0) {
        setBattleLocked(false);
        return;
      }

      let skillBonusDmg = 0;
      let potionBonusDmg = 0;

      // 1. Process Potion Buff if selected
      if (selectedPotionId) {
        const pot = POTIONS[selectedPotionId];
        const pIndex = attacker.potions.indexOf(selectedPotionId);
        if (pot && pIndex >= 0) {
          attacker.potions = attacker.potions.filter((_, i) => i !== pIndex);
          if (selectedPotionId === "heal") {
            const healAmt = pot.healAmount || 30;
            attacker.hp = Math.min(attacker.maxHp, attacker.hp + healAmt);
            emitHeal({ targetIndex: attacker.playerIndex, amount: healAmt });
            setBattleLog(`${attacker.name} used Healing Potion (+${healAmt} HP)`);
          } else if (selectedPotionId === "damage") {
            potionBonusDmg = pot.dmgBonus || 25;
            setBattleLog(`${attacker.name} used Damage Potion (+${potionBonusDmg} DMG)`);
          }
          await wait(260);
        }
      }

      // 2. Process Skill Buff if selected
      if (selectedSkillId) {
        const sk = SKILLS[selectedSkillId];
        if (sk && (attacker.skillCooldowns?.[selectedSkillId] || 0) <= 0) {
          attacker.skillCooldowns = {
            ...attacker.skillCooldowns,
            [selectedSkillId]: sk.cooldown || 3,
          };
          emitSkillCast({
            playerId: attacker.playerIndex,
            skillId: selectedSkillId,
            skillData: sk,
            visualContext: "pvp",
          });
          if (sk.dmg) skillBonusDmg = sk.dmg;
          if (sk.effect === "invincible") attacker.isInvincible = true;
          setBattleLog(`${attacker.name} casts house spell ${sk.name}`);
          await wait(260);
        }
      }

      // 3. Step 1: Attacker Wind-up & Cast Ring at feet
      setActiveCast({
        attackerIndex: attackerIdx,
        targetIndex: targetIdx,
        color: attacker.color,
      });
      setBattleLog(`${attacker.name} attacks ${target.name}`);
      await wait(260);
      setActiveCast(null);

      // 4. Step 2: High-Arc Flying Projectile Animation
      const flightDuration = 420;
      const flightStart = performance.now();
      await new Promise((res) => {
        function tick(now) {
          const p = Math.min((now - flightStart) / flightDuration, 1);
          setActiveProjectile({
            attackerIndex: attackerIdx,
            targetIndex: targetIdx,
            color: attacker.color,
            progress: p,
          });
          if (p < 1) requestAnimationFrame(tick);
          else res();
        }
        requestAnimationFrame(tick);
      });
      setActiveProjectile(null);

      // 5. Step 3: Impact Burst on Target & Damage Registration
      setActiveHit({
        targetIndex: targetIdx,
        color: attacker.color,
      });

      const variation = Math.floor(Math.random() * 9) - 4; // -4 .. +4
      const rawDmg = Math.max(8, attacker.baseDmg + skillBonusDmg + potionBonusDmg + variation);
      const actualDmg = target.isInvincible ? 0 : rawDmg;

      target.hp = Math.max(0, target.hp - actualDmg);
      list[attackerIdx] = attacker;
      list[targetIdx] = target;
      setFighters([...list]);

      // Record damage dealt by this attacker in this clash
      const updatedDmgMap = {
        ...damageDealtMapRef.current,
        [attackerIdx]: (damageDealtMapRef.current[attackerIdx] || 0) + actualDmg,
      };
      setDamageDealtMap(updatedDmgMap);

      emitDamageDealt({
        targetIndex: target.playerIndex,
        amount: actualDmg,
        type: "pvp",
        visualContext: "pvp",
      });

      const hitLog = target.isInvincible
        ? `${target.name} is invincible and deflected all damage!`
        : `${attacker.name} deals ${actualDmg} damage to ${target.name}`;
      setBattleLog(hitLog);
      setLogHistory((prev) => [...prev, hitLog]);
      await wait(360);
      setActiveHit(null);

      if (target.hp <= 0) {
        const defeatLog = `${target.name} was defeated!`;
        setBattleLog(defeatLog);
        setLogHistory((prev) => [...prev, defeatLog]);
        await wait(350);
      }

      // Reset choices for this turn
      setSelectedSkillId(null);
      setSelectedPotionId(null);

      // 6. Record turn completion for this fighter
      const updatedCompleted = [...completedTurnsRef.current, attackerIdx];
      setCompletedTurns(updatedCompleted);

      // Check if all alive fighters have taken their 1 attack turn
      const remainingToAct = list
        .map((f, i) => i)
        .filter((i) => list[i].hp > 0 && !updatedCompleted.includes(i));

      if (remainingToAct.length === 0 || list.filter((f) => f.hp > 0).length <= 1) {
        // ── ALL PARTICIPANTS HAVE ATTACKED (CLASH ROUND COMPLETE) ──
        let highestDmg = -1;
        let bestFighterIdx = null;
        let isDraw = false;

        Object.entries(updatedDmgMap).forEach(([fIdx, dmg]) => {
          if (dmg > highestDmg) {
            highestDmg = dmg;
            bestFighterIdx = Number(fIdx);
            isDraw = false;
          } else if (dmg === highestDmg) {
            isDraw = true;
          }
        });

        const clashWinner = !isDraw && bestFighterIdx !== null ? list[bestFighterIdx] : null;
        setDuelFinished(true);
        setWinner(clashWinner);

        const summaryText = clashWinner
          ? `CLASH WINNER: ${clashWinner.id} ${clashWinner.name} (${highestDmg} DMG)`
          : `CLASH TIED: DRAW (${highestDmg} DMG)`;

        setBattleLog(summaryText);
        setLogHistory((prev) => [...prev, summaryText]);
        setAutoReturnCountdown(4);
        return;
      }

      // 7. Advance to the next player who has not attacked yet
      const nextTurnIdx = remainingToAct[0];
      setCurrentTurn(nextTurnIdx);
      setLockedTargetIndex(null);
      setBattleLocked(false);
      setBattleLog(`TURN: ${list[nextTurnIdx].id} ${list[nextTurnIdx].name} - Select target to attack`);
    },
    [selectedPotionId, selectedSkillId]
  );

  // ─── AUTO-ATTACK FOR BOTS & INACTIVE PLAYERS (12s timer) ────
  useEffect(() => {
    if (duelFinished || battleLocked) return undefined;

    const currentFighter = fighters[currentTurn];
    if (!currentFighter || currentFighter.hp <= 0) return undefined;

    const targets = fighters
      .map((f, i) => ({ f, i }))
      .filter(({ f, i }) => i !== currentTurn && f.hp > 0)
      .map(({ i }) => i);

    if (targets.length === 0) return undefined;

    const chosenTarget =
      activeTargetIndex !== null && targets.includes(activeTargetIndex)
        ? activeTargetIndex
        : targets[Math.floor(Math.random() * targets.length)];

    // If bot, execute after 1.2s delay
    if (currentFighter.isBot) {
      const botTimer = setTimeout(() => {
        executeExchange(currentTurn, chosenTarget);
      }, 1200);
      return () => clearTimeout(botTimer);
    }

    // If human in online/spectator mode taking too long, auto-execute in 14s
    const timeoutTimer = setTimeout(() => {
      executeExchange(currentTurn, chosenTarget);
    }, 14000);

    return () => clearTimeout(timeoutTimer);
  }, [currentTurn, battleLocked, duelFinished, fighters, activeTargetIndex, executeExchange]);

  // ─── AUTO-RESOLVE COUNTDOWN AFTER CLASH FINISHED ─────────────
  useEffect(() => {
    if (!duelFinished || autoReturnCountdown === null) return undefined;

    if (autoReturnCountdown <= 0) {
      resolveDuel(winner);
      return undefined;
    }

    const timer = setInterval(() => {
      setAutoReturnCountdown((prev) => (prev != null ? prev - 1 : null));
    }, 1000);

    return () => clearInterval(timer);
  }, [duelFinished, autoReturnCountdown, resolveDuel, winner]);

  // Usable skills/potions for active turn fighter
  const usableCombatSkills = useMemo(() => {
    if (!currentAttacker) return [];
    return (currentAttacker.skills || [])
      .map((id) => SKILLS[id])
      .filter((sk) => sk && sk.requiresTarget !== "monster");
  }, [currentAttacker]);

  const usableCombatPotions = useMemo(() => {
    if (!currentAttacker) return [];
    return Array.from(new Set(currentAttacker.potions || [])).filter(
      (potId) => POTIONS[potId] && !POTIONS[potId].isTrap && potId !== "revive"
    );
  }, [currentAttacker]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-between select-none overflow-hidden text-white bg-slate-950">
      {/* ─── FULLSCREEN 3D MAGIC ARENA STAGE (No 2D Image Background) ─── */}
      <div className="absolute inset-0 z-0 w-full h-full">
        <Pvp3dBattleStage
          fighters={fighters}
          activeCast={activeCast}
          activeProjectile={activeProjectile}
          activeHit={activeHit}
          currentTurn={currentTurn}
          lockedTargetIndex={activeTargetIndex}
        />
      </div>

      {/* Subtle top & bottom shadow gradient for UI readability */}
      <div className="absolute top-0 inset-x-0 h-28 bg-gradient-to-b from-slate-950/80 via-slate-950/30 to-transparent pointer-events-none z-10" />
      <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent pointer-events-none z-10" />

      {/* ─── 1. TOPBAR: PLAYER STATUS CARDS ──────────────────────────── */}
      <div className="relative z-20 w-full max-w-4xl mx-auto pt-3 px-3 flex items-center justify-center gap-2.5 md:gap-4 flex-wrap pointer-events-auto shrink-0">
        {fighters.map((f, idx) => {
          const isTurn = idx === currentTurn && f.hp > 0 && !duelFinished;
          const isTarget = idx === activeTargetIndex && f.hp > 0;
          const hasAttacked = completedTurns.includes(idx);
          const hpPct = Math.max(0, Math.min(100, (f.hp / f.maxHp) * 100));

          const barColor =
            hpPct > 50 ? "bg-emerald-500" : hpPct > 25 ? "bg-amber-400" : "bg-rose-500";

          return (
            <div
              key={f.houseId || idx}
              className={`min-w-[140px] md:min-w-[170px] px-3.5 py-2.5 rounded-xl border backdrop-blur-md transition-all duration-300 ${
                isTurn
                  ? "bg-slate-900/95 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.45)] -translate-y-0.5"
                  : isTarget
                  ? "bg-slate-900/90 border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.35)]"
                  : "bg-slate-950/80 border-white/15 opacity-85"
              } ${f.hp <= 0 ? "opacity-40 grayscale" : ""}`}
            >
              <div className="flex items-center justify-between text-xs font-black mb-1.5">
                <span className="truncate text-white">
                  {f.id} · {f.name}
                </span>
                {f.hp <= 0 ? (
                  <span className="text-[9px] bg-rose-950 text-rose-300 border border-rose-500/40 px-1 py-0.2 rounded uppercase font-bold">
                    DEFEATED
                  </span>
                ) : isTurn ? (
                  <span className="text-[9px] bg-amber-400 text-black px-1.5 py-0.2 rounded font-black uppercase">
                    TURN
                  </span>
                ) : hasAttacked ? (
                  <span className="text-[9px] bg-emerald-950 text-emerald-300 border border-emerald-500/40 px-1 py-0.2 rounded uppercase font-bold">
                    ATTACKED
                  </span>
                ) : null}
              </div>

              {/* Health Progress Bar */}
              <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden border border-white/10">
                <div
                  className={`h-full ${barColor} transition-all duration-300`}
                  style={{ width: `${hpPct}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] text-white/70 font-bold mt-1">
                <span>HP</span>
                <span>
                  {Math.max(0, f.hp)} / {f.maxHp}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── 2. CENTER CLASH RESULT ANNOUNCEMENT BANNER ──────────────── */}
      {duelFinished && (
        <div className="relative z-30 my-auto flex flex-col items-center justify-center pointer-events-auto">
          <div className="bg-slate-950/95 border-2 border-amber-400 px-8 py-6 rounded-3xl shadow-[0_0_60px_rgba(245,158,11,0.85)] text-center animate-bounce max-w-md">
            <h2 className="text-xl md:text-2xl font-black text-amber-300 tracking-wider uppercase">
              {winner ? `CLASH WINNER: ${winner.id} ${winner.name}` : "CLASH TIED: DRAW"}
            </h2>
            <p className="text-xs text-slate-300 mt-2 font-bold">
              {autoReturnCountdown != null
                ? `Returning to board in ${autoReturnCountdown}s...`
                : "Clash Finished"}
            </p>
            <button
              type="button"
              onClick={() => resolveDuel(winner)}
              className="mt-4 py-2.5 px-6 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-black text-xs tracking-wider uppercase shadow-lg border border-emerald-300 transition-all hover:scale-105 active:scale-95"
            >
              CONTINUE TO BOARD
            </button>
          </div>
        </div>
      )}

      {/* Spacer when not finished */}
      {!duelFinished && <div className="flex-1 pointer-events-none" />}

      {/* ─── 3. MONSTER-STYLE BOTTOM ACTION DOCK (Components/CombatModal.jsx) ─── */}
      {!duelFinished && (
        <div className="relative z-30 w-full max-w-2xl mx-auto px-4 pb-4 flex flex-col items-center pointer-events-auto">
          {/* Target Selection Pills (when multiple opponents) */}
          {availableTargetIndices.length > 1 && (
            <div className="flex items-center justify-center gap-2 mb-2.5 flex-wrap">
              <span className="text-[11px] font-black text-purple-300 uppercase tracking-wide">
                SELECT TARGET:
              </span>
              {availableTargetIndices.map((idx) => {
                const target = fighters[idx];
                const isSelected = idx === activeTargetIndex;
                return (
                  <button
                    key={target.playerIndex}
                    type="button"
                    disabled={battleLocked || !isMyTurn}
                    onClick={() => {
                      setLockedTargetIndex(idx);
                      setBattleLog(`Locked target: ${target.name}`);
                    }}
                    className={`py-1 px-3 rounded-full text-xs font-black uppercase transition-all border shadow-sm ${
                      isSelected
                        ? "bg-rose-600 text-white border-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.6)] scale-105"
                        : "bg-slate-900/90 text-slate-300 border-white/20 hover:bg-slate-800"
                    }`}
                  >
                    TARGET {target.id} ({target.name})
                  </button>
                );
              })}
            </div>
          )}

          {/* Active Target Banner when 1 opponent */}
          {availableTargetIndices.length === 1 && activeTargetIndex !== null && (
            <div className="text-[11px] font-black text-rose-300 uppercase tracking-wide mb-2 bg-rose-950/60 border border-rose-500/30 px-3 py-0.5 rounded-full">
              TARGET: {fighters[activeTargetIndex]?.id} ({fighters[activeTargetIndex]?.name})
            </div>
          )}

          {/* Main Action Container */}
          <div className="relative w-full bg-slate-950/90 border border-purple-500/40 rounded-2xl p-3 sm:p-4 backdrop-blur-xl shadow-2xl flex flex-col items-center">
            {/* FLOATING SKILL DRAWER (OPENS ABOVE DOCK) */}
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
                      <span>COMBAT SKILLS</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowSkillDrawer(false)}
                      className="text-xs text-slate-400 hover:text-white font-bold px-2 py-0.5 rounded-lg bg-slate-800"
                    >
                      CLOSE ✕
                    </button>
                  </div>

                  {usableCombatSkills.length === 0 ? (
                    <div className="text-center py-4 text-xs font-bold text-slate-400">
                      No usable combat skills available
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
                      {usableCombatSkills.map((sk) => {
                        const cd = currentAttacker?.skillCooldowns?.[sk.id] || 0;
                        const isCoolingDown = cd > 0;
                        const isSelected = selectedSkillId === sk.id;

                        return (
                          <button
                            key={sk.id}
                            type="button"
                            disabled={isCoolingDown}
                            onClick={() => {
                              setSelectedSkillId(isSelected ? null : sk.id);
                              setShowSkillDrawer(false);
                            }}
                            className={`flex items-center justify-between gap-3 p-2.5 rounded-xl border text-left transition-all ${
                              isCoolingDown
                                ? "bg-slate-900/60 border-slate-800 text-slate-500 opacity-60 cursor-not-allowed"
                                : isSelected
                                ? "bg-purple-900 border-amber-400 text-white shadow-lg shadow-purple-900/50"
                                : "bg-purple-950/60 hover:bg-purple-900/80 border-purple-500/40 text-purple-100 hover:scale-102 cursor-pointer shadow-lg"
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-black text-xs text-white">
                                  {sk.name}
                                </span>
                                <span className="text-[10px] text-purple-300 font-bold bg-purple-900/60 px-1.5 py-0.2 rounded border border-purple-400/30">
                                  SPELL
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
                                <span
                                  className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${
                                    isSelected
                                      ? "bg-amber-400 text-black border-amber-300"
                                      : "bg-emerald-950/60 text-emerald-400 border-emerald-500/30"
                                  }`}
                                >
                                  {isSelected ? "READY" : "SELECT"}
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

            {/* FLOATING ITEM DRAWER (OPENS ABOVE DOCK) */}
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
                      <span>POTION BAG</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowItemDrawer(false)}
                      className="text-xs text-slate-400 hover:text-white font-bold px-2 py-0.5 rounded-lg bg-slate-800"
                    >
                      CLOSE ✕
                    </button>
                  </div>

                  {usableCombatPotions.length === 0 ? (
                    <div className="text-center py-4 text-xs font-bold text-slate-400">
                      No combat potions in bag
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                      {usableCombatPotions.map((potId, idx) => {
                        const pot = POTIONS[potId];
                        if (!pot) return null;
                        const isSelected = selectedPotionId === potId;

                        return (
                          <ItemTooltip key={idx} item={pot} position="top">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedPotionId(isSelected ? null : potId);
                                setShowItemDrawer(false);
                              }}
                              className={`flex items-center gap-2 p-2 rounded-xl border text-left transition-all hover:scale-102 group w-full ${
                                isSelected
                                  ? "bg-amber-900 border-amber-300 shadow-lg"
                                  : "bg-amber-950/60 hover:bg-amber-900 border-amber-500/40"
                              }`}
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
                                  {isSelected ? "READY" : "CLICK TO USE"}
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

            {/* Selected Buff Badges */}
            {(selectedSkillId || selectedPotionId) && (
              <div className="flex items-center gap-2 mb-2">
                {selectedSkillId && (
                  <span className="text-[10px] bg-purple-900 text-purple-200 border border-purple-400/50 px-2 py-0.5 rounded-full font-bold">
                    SPELL: {SKILLS[selectedSkillId]?.name}
                  </span>
                )}
                {selectedPotionId && (
                  <span className="text-[10px] bg-amber-900 text-amber-200 border border-amber-400/50 px-2 py-0.5 rounded-full font-bold">
                    POTION: {POTIONS[selectedPotionId]?.name}
                  </span>
                )}
              </div>
            )}

            {/* ─── DOCK ACTION BUTTONS (ATTACK, SKILL, ITEM) ─── */}
            <div className="flex items-center justify-center gap-2 sm:gap-3 w-full">
              {/* 1. ATTACK BUTTON (Dominant Crimson & Amber Glow) */}
              <button
                type="button"
                disabled={battleLocked || !isMyTurn || activeTargetIndex === null}
                onClick={() => {
                  if (activeTargetIndex !== null) {
                    executeExchange(currentTurn, activeTargetIndex);
                  }
                }}
                className={`flex-[1.5] py-3 sm:py-3.5 px-3 rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm tracking-wider uppercase flex items-center justify-center gap-1.5 transition-all shadow-[0_0_25px_rgba(239,68,68,0.5)] ${
                  battleLocked || !isMyTurn || activeTargetIndex === null
                    ? "bg-slate-900/80 border border-slate-700 text-slate-500 opacity-60 cursor-not-allowed"
                    : "bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:from-red-500 hover:to-amber-500 border border-amber-400/80 text-white hover:scale-103 active:scale-95 cursor-pointer animate-pulse"
                }`}
              >
                <span>{battleLocked ? "CASTING..." : "ATTACK"}</span>
              </button>

              {/* 2. SKILL BUTTON (Amethyst Purple Glow) */}
              <button
                type="button"
                disabled={battleLocked || !isMyTurn || usableCombatSkills.length === 0}
                onClick={() => {
                  setShowSkillDrawer((prev) => !prev);
                  setShowItemDrawer(false);
                }}
                className={`flex-1 py-3 sm:py-3.5 px-3 rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm tracking-wider uppercase flex items-center justify-center gap-1.5 transition-all shadow-[0_0_20px_rgba(168,85,247,0.35)] ${
                  battleLocked || !isMyTurn || usableCombatSkills.length === 0
                    ? "bg-slate-900/80 border border-slate-700 text-slate-500 opacity-60 cursor-not-allowed"
                    : "bg-gradient-to-r from-purple-700 via-indigo-600 to-purple-600 hover:from-purple-600 hover:to-indigo-500 border border-purple-400/60 text-white hover:scale-103 active:scale-95 cursor-pointer"
                }`}
              >
                <span>SKILL</span>
              </button>

              {/* 3. ITEM BUTTON (Dark Slate & Gold Border) */}
              <button
                type="button"
                disabled={battleLocked || !isMyTurn || usableCombatPotions.length === 0}
                onClick={() => {
                  setShowItemDrawer((prev) => !prev);
                  setShowSkillDrawer(false);
                }}
                className={`flex-1 py-3 sm:py-3.5 px-3 rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm tracking-wider uppercase flex items-center justify-center gap-1.5 transition-all shadow-md ${
                  battleLocked || !isMyTurn || usableCombatPotions.length === 0
                    ? "bg-slate-900/80 border border-slate-700 text-slate-500 opacity-60 cursor-not-allowed"
                    : "bg-slate-900/90 hover:bg-slate-800 text-amber-200 hover:text-white border border-amber-500/40 hover:border-amber-400 hover:scale-103 active:scale-95 cursor-pointer"
                }`}
              >
                <span>ITEM</span>
              </button>
            </div>

            {/* Real-time Battle Action Log */}
            <div className="text-center text-xs text-purple-200/90 font-medium mt-2.5 min-h-[18px] max-w-lg truncate">
              {battleLog}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
