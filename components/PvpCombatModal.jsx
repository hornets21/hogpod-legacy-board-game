"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { SKILLS, POTIONS } from "@/lib/gameData";
import { getTotalDmg } from "@/lib/gameEngine";
import { emitSkillCast, emitDamageDealt, emitHeal } from "@/lib/skillFxBus";
import SkillButton from "@/components/fx/SkillButton";
import Pvp3dBattleStage from "@/components/board3d/Pvp3dBattleStage";

export default function PvpCombatModal({ pvpEncounter, players, onPvpAction, myPlayerIndex }) {
  const [selectedSkills, setSelectedSkills] = useState({}); // { houseId: skillId }
  const [selectedPotions, setSelectedPotions] = useState({}); // { houseId: potionId }
  const [selectedTargets, setSelectedTargets] = useState({}); // { houseId: targetPlayerIndex }
  const [selectedAlliances, setSelectedAlliances] = useState({}); // { houseId: alliedHouseId }
  const [clashResult, setClashResult] = useState(null);
  const [autoStartCountdown, setAutoStartCountdown] = useState(null);
  const [autoReturnCountdown, setAutoReturnCountdown] = useState(null);

  if (!pvpEncounter) return null;

  const cell = pvpEncounter.cell || 1;
  const participants = (pvpEncounter.participants ||
    (pvpEncounter.participantIndices
      ? pvpEncounter.participantIndices.map((idx) => ({ ...players[idx], playerIndex: idx }))
      : [])
  )
    .map((p) => {
      if (!p) return null;
      const playerIndex = p.playerIndex ?? players.findIndex((player) => player.houseId === p.houseId);
      return playerIndex >= 0 ? { ...p, playerIndex } : null;
    })
    .filter(Boolean);

  const hasControlledFighter = participants.some(
    (p) => myPlayerIndex != null && myPlayerIndex >= 0 && p.playerIndex === myPlayerIndex
  );
  const isAllBots = participants.length > 0 && participants.every((p) => p.isBot);

  // Auto-select ready skills and potions for bot participants
  useEffect(() => {
    if (!participants || participants.length === 0) return;
    participants.forEach((p) => {
      if (p.isBot) {
        if (p.skills && p.skills.length > 0) {
          const readySkillId = p.skills.find((skId) => {
            const sk = SKILLS[skId];
            const cd = p.skillCooldowns?.[skId] || 0;
            return sk && cd <= 0 && sk.requiresTarget !== "monster";
          });
          if (readySkillId) {
            setSelectedSkills((prev) => ({ ...prev, [p.houseId]: prev[p.houseId] || readySkillId }));
            const sk = SKILLS[readySkillId];
            if (sk?.requiresTarget === "player") {
              const other = participants.find((o) => o.playerIndex !== p.playerIndex);
              if (other) {
                setSelectedTargets((prev) => ({ ...prev, [p.houseId]: other.playerIndex }));
              }
            }
          }
        }

        if (p.potions && p.potions.length > 0) {
          const usablePotionId = p.potions.find((potId) => {
            const pot = POTIONS[potId];
            return pot && !pot.isTrap && potId !== "revive";
          });
          if (usablePotionId) {
            setSelectedPotions((prev) => ({ ...prev, [p.houseId]: prev[p.houseId] || usablePotionId }));
          }
        }
      }
    });
  }, [cell]);

  // Toggle Skill
  const handleToggleSkill = (houseId, skillId) => {
    setSelectedSkills((prev) => ({
      ...prev,
      [houseId]: prev[houseId] === skillId ? null : skillId,
    }));
  };

  // Toggle Potion
  const handleTogglePotion = (houseId, potionId) => {
    setSelectedPotions((prev) => ({
      ...prev,
      [houseId]: prev[houseId] === potionId ? null : potionId,
    }));
  };

  // Toggle Alliance
  const handleToggleAlliance = (houseId, allianceHouseId) => {
    setSelectedAlliances((prev) => ({
      ...prev,
      [houseId]: prev[houseId] === allianceHouseId ? null : allianceHouseId,
    }));
  };

  const handleSelectTarget = (houseId, targetIndex) => {
    setSelectedTargets((prev) => ({ ...prev, [houseId]: Number(targetIndex) }));
  };

  // ─── START PVP CLASH CALCULATION ──────────────────────────────
  const handleStartClash = useCallback(() => {
    let updatedPlayers = [...players];
    let logEntries = [];
    let houseClashData = {};
    const directAttacks = [];
    let extraTurnGranted = false;

    logEntries.push(`⚔️ PvP Arena battle commenced at cell #${cell}!`);

    // 1. Process potions & skills
    participants.forEach((p) => {
      const hId = p.houseId;
      let playerObj = { ...updatedPlayers[p.playerIndex] };
      let skillBonusDmg = 0;
      let potionBonusDmg = 0;

      if (!playerObj || !playerObj.houseId) return;

      const potionId = selectedPotions[hId];
      const potion = potionId ? POTIONS[potionId] : null;
      const potionIndex = potionId ? playerObj.potions?.indexOf(potionId) : -1;
      if (potion && !potion.isTrap && potionId !== "revive" && potionIndex >= 0) {
        playerObj.potions = playerObj.potions.filter((_, index) => index !== potionIndex);
        if (potionId === "heal") {
          const amount = potion.healAmount || 30;
          playerObj.hp = Math.min(playerObj.maxHp, playerObj.hp + amount);
          logEntries.push(`🧪 ${playerObj.name} used Healing Potion (+${amount} HP)`);
          emitHeal({ targetIndex: p.playerIndex, amount });
        } else if (potionId === "cooldown") {
          const cooldowns = { ...(playerObj.skillCooldowns || {}) };
          Object.keys(cooldowns).forEach((skillId) => {
            cooldowns[skillId] = Math.max(0, cooldowns[skillId] - (potion.cdReduce || 2));
          });
          playerObj.skillCooldowns = cooldowns;
          logEntries.push(`⏱️ ${playerObj.name} reduced skill cooldowns by ${potion.cdReduce || 2} turns`);
        } else if (potionId === "damage") {
          potionBonusDmg = potion.dmgBonus || 100;
          logEntries.push(`⚡ ${playerObj.name} used Damage Potion (+${potionBonusDmg} DMG)`);
        }
      }

      // House Spell
      const skId = selectedSkills[hId];
      const sk = skId ? SKILLS[skId] : null;
      const skillReady = sk && playerObj.skills?.includes(skId) && (playerObj.skillCooldowns?.[skId] || 0) <= 0;
      const targetIndex = selectedTargets[hId];
      const targetIsParticipant = participants.some((participant) => participant.playerIndex === targetIndex);
      if (skillReady && sk.requiresTarget === "player" && (!targetIsParticipant || targetIndex === p.playerIndex)) {
        logEntries.push(`🎯 ${playerObj.name} did not specify a valid skill target.`);
      } else if (skillReady && sk.requiresTarget !== "monster") {
        const cdBase = sk.cooldown || 3;
        const cdActual = playerObj.pet?.effect === "reduce_cooldown" ? Math.max(1, cdBase - 1) : cdBase;
        playerObj.skillCooldowns = { ...(playerObj.skillCooldowns || {}), [skId]: cdActual };
        logEntries.push(`✨ ${playerObj.name} cast house spell "${sk.name}"!`);
        emitSkillCast({
          playerId: p.playerIndex,
          skillId: skId,
          skillData: sk,
          visualContext: "pvp",
        });

        if (sk.dmg && sk.target === "player") {
          directAttacks.push({ targetIndex, amount: sk.dmg, skill: sk });
        } else if (sk.dmg) {
          skillBonusDmg += sk.dmg;
        }

        if (sk.effect === "invincible") {
          playerObj.isInvincible = true;
          playerObj.invincibleTurns = sk.duration || 2;
        } else if (sk.effect === "lock_dice") {
          playerObj.nextRollOverride = 6;
        } else if (sk.effect === "steal_turn") {
          extraTurnGranted = true;
        } else if (sk.effect === "steal_potion") {
          const target = updatedPlayers[targetIndex];
          if (target?.potions?.length && playerObj.potions.length < 5) {
            const stolenIndex = Math.floor(Math.random() * target.potions.length);
            const stolenPotion = target.potions[stolenIndex];
            updatedPlayers[targetIndex] = {
              ...target,
              potions: target.potions.filter((_, index) => index !== stolenIndex),
            };
            playerObj.potions = [...playerObj.potions, stolenPotion];
            logEntries.push(`🎭 ${playerObj.name} stole a potion from ${target.name}`);
          }
        } else if (sk.effect === "shuffle_positions") {
          const positions = participants.map((participant) => updatedPlayers[participant.playerIndex].position);
          for (let i = positions.length - 1; i > 0; i -= 1) {
            const j = Math.floor(Math.random() * (i + 1));
            [positions[i], positions[j]] = [positions[j], positions[i]];
          }
          participants.forEach((participant, index) => {
            updatedPlayers[participant.playerIndex] = {
              ...updatedPlayers[participant.playerIndex],
              position: positions[index],
            };
          });
          playerObj.position = updatedPlayers[p.playerIndex].position;
          logEntries.push(`🌀 ${playerObj.name} shuffled all player positions!`);
        }
      }

      const baseDmg = getTotalDmg(playerObj);
      const totalPower = baseDmg + skillBonusDmg + potionBonusDmg;
      const calcDmg = Math.floor(totalPower * (0.9 + Math.random() * 0.2));

      houseClashData[hId] = {
        name: playerObj.name,
        baseDmg,
        skillBonusDmg,
        totalPower,
        calcDmg,
        isInvincible: Boolean(playerObj.isInvincible || (skillReady && sk?.effect === "invincible")),
        allianceWith: selectedAlliances[hId] || null,
        usedSkillId: skId,
      };

      updatedPlayers[p.playerIndex] = playerObj;
    });

    // 2. Alliance & Damage Exchange
    participants.forEach((p) => {
      const hId = p.houseId;
      const pData = houseClashData[hId];
      const playerObj = { ...updatedPlayers[p.playerIndex] };
      let damageTaken = 0;

      participants.forEach((other) => {
        if (other.houseId === hId) return;
        const otherData = houseClashData[other.houseId];

        const isAllied = pData.allianceWith === other.houseId || otherData.allianceWith === hId;

        if (isAllied) {
          logEntries.push(`🤝 ${p.name} and ${other.name} formed an alliance! (+15 HP)`);
          playerObj.hp = Math.min(playerObj.maxHp, playerObj.hp + 15);
        } else if (!pData.isInvincible) {
          const dmgShare = Math.floor(otherData.calcDmg / (participants.length - 1));
          damageTaken += dmgShare;
        }
      });

      if (pData.isInvincible) {
        logEntries.push(`🛡️ ${p.name} was invincible and deflected all damage!`);
      } else if (damageTaken > 0) {
        playerObj.hp = Math.max(0, playerObj.hp - damageTaken);
        logEntries.push(`💥 ${p.name} took -${damageTaken} HP damage in the clash (HP remaining: ${playerObj.hp})`);
        emitDamageDealt({
          targetIndex: p.playerIndex,
          amount: damageTaken,
          type: "pvp",
          visualContext: "pvp",
        });
      } else {
        logEntries.push(`🛡️ ${p.name} took no damage during the duel.`);
      }

      updatedPlayers[p.playerIndex] = playerObj;
    });

    // 3. Direct Attack Resolution
    directAttacks.forEach(({ targetIndex, amount, skill }) => {
      const targetParticipant = participants.find((participant) => participant.playerIndex === targetIndex);
      if (!targetParticipant || houseClashData[targetParticipant.houseId]?.isInvincible) return;
      const target = { ...updatedPlayers[targetIndex] };
      target.hp = Math.max(0, target.hp - amount);
      updatedPlayers[targetIndex] = target;
      logEntries.push(`🔥 ${skill.name} dealt ${amount} direct damage to ${target.name}`);
      emitDamageDealt({
        targetIndex,
        amount,
        type: "pvp",
        sourceId: skill.id,
        visualContext: "pvp",
      });
    });

    const hasActiveAlliance = Object.values(selectedAlliances).some(Boolean);
    let highestDmg = -1;
    let winnerName = null;
    let isDraw = false;

    Object.entries(houseClashData).forEach(([, d]) => {
      if (d.calcDmg > highestDmg) {
        highestDmg = d.calcDmg;
        winnerName = d.name;
        isDraw = false;
      } else if (d.calcDmg === highestDmg) {
        isDraw = true;
      }
    });

    if (hasActiveAlliance) {
      isDraw = true;
    }

    let battleSummaryText = "";
    if (isDraw && hasActiveAlliance) {
      battleSummaryText = "🤝 The duel ended in an ALLIANCE DRAW!";
    } else if (isDraw) {
      battleSummaryText = "⚖️ The duel ended in a DRAW!";
    } else {
      battleSummaryText = `🏆 Arena Duel Winner: ${winnerName}!`;
    }

    logEntries.push(battleSummaryText);

    setClashResult({
      updatedPlayers,
      logEntries,
      houseClashData,
      winnerName,
      isDraw,
      battleSummaryText,
      extraTurnGranted,
    });
  }, [cell, participants, players, selectedAlliances, selectedPotions, selectedSkills, selectedTargets]);

  const onResolvePvp = useCallback((result) => {
    if (!result || !onPvpAction) return;
    onPvpAction({
      choice: "resolve",
      updatedPlayers: result.updatedPlayers,
      logEntries: result.logEntries,
      extraTurn: result.extraTurnGranted,
    });
  }, [onPvpAction]);

  // ── Auto-Start timer for BOT encounters or Spectators (2.5s delay to view stage) ──
  useEffect(() => {
    if (clashResult) return undefined;

    if (!hasControlledFighter || isAllBots) {
      setAutoStartCountdown(3);
      const interval = setInterval(() => {
        setAutoStartCountdown((c) => (c != null && c > 1 ? c - 1 : 0));
      }, 1000);

      const startTimer = setTimeout(() => {
        handleStartClash();
      }, 2600);

      return () => {
        clearInterval(interval);
        clearTimeout(startTimer);
      };
    }
    return undefined;
  }, [clashResult, hasControlledFighter, isAllBots, handleStartClash]);

  // ── Auto-Resolve countdown after clash (5.5s so players can watch 3D duel) ──
  useEffect(() => {
    if (!clashResult || !onPvpAction) return undefined;

    setAutoReturnCountdown(5);
    const interval = setInterval(() => {
      setAutoReturnCountdown((c) => (c != null && c > 1 ? c - 1 : 0));
    }, 1000);

    const resolveTimer = setTimeout(() => {
      onResolvePvp(clashResult);
    }, 5500);

    return () => {
      clearInterval(interval);
      clearTimeout(resolveTimer);
    };
  }, [clashResult, onPvpAction, onResolvePvp]);

  if (participants.length === 0) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-between select-none overflow-hidden animate-fade-in p-3 md:p-5 text-white pointer-events-none bg-slate-950 bg-cover bg-center"
      style={{ backgroundImage: "url('/images/system/arena_bg.jpg')" }}
    >
      {/* Arena backdrop */}
      <div className="absolute inset-0 bg-slate-950/55 backdrop-blur-[1px] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,_rgba(2,6,23,0.8)_0%,_rgba(2,6,23,0.18)_42%,_rgba(2,6,23,0.9)_100%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_18%,_rgba(2,6,23,0.72)_100%)] pointer-events-none" />

      {/* TOP HEADER HUD */}
      <div className="relative z-20 w-full max-w-4xl mx-auto flex items-center justify-between bg-slate-900/90 border border-amber-500/30 rounded-2xl px-5 py-2.5 backdrop-blur-md shadow-xl shrink-0 pointer-events-auto">
        <div className="flex items-center gap-3">
          <span className="text-xl animate-pulse">⚔️</span>
          <div>
            <h1 className="text-amber-400 font-black text-xs md:text-sm tracking-[0.2em] uppercase">
              PVP ARENA — Cell #{cell}
            </h1>
            <p className="text-[10px] text-white/60 font-bold">
              Magic Duel between {participants.length} Houses
            </p>
          </div>
        </div>

        <div className="text-[11px] font-black tracking-widest text-amber-300 bg-amber-950/60 border border-amber-500/40 px-3 py-1 rounded-full uppercase shadow-inner">
          {clashResult
            ? (autoReturnCountdown != null ? `Returning in ${autoReturnCountdown}s` : "Duel Finished")
            : (autoStartCountdown != null ? `Clashing in ${autoStartCountdown}s` : "Select Spells & Alliance")}
        </div>
      </div>

      {/* CENTER REAL 3D BATTLE CANVAS */}
      <div className="relative z-10 flex-1 my-2 w-full max-w-5xl mx-auto overflow-hidden flex flex-col items-center justify-center pointer-events-auto">
        <div className="w-full flex-1 relative flex items-center justify-center min-h-[240px]">
          <Pvp3dBattleStage
            participants={participants}
            clashResult={clashResult}
            selectedSkills={selectedSkills}
          />
        </div>

        {/* BATTLE RESULT ANNOUNCEMENT BANNER */}
        {clashResult && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 bg-slate-950/95 border-2 border-amber-400 px-8 py-4 rounded-3xl shadow-[0_0_50px_rgba(245,158,11,0.8)] text-center animate-bounce">
            <h2 className="text-xl md:text-2xl font-black text-amber-300">
              {clashResult.battleSummaryText}
            </h2>
            {autoReturnCountdown != null && (
              <p className="text-xs text-slate-300 mt-1 font-bold">
                Returning to board in {autoReturnCountdown}s...
              </p>
            )}
          </div>
        )}
      </div>

      {/* BOTTOM CONTROLS: FIGHTER CARDS */}
      <div className="relative z-20 w-full max-w-5xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-3 items-end shrink-0 pointer-events-auto">
        {participants.map((p) => {
          const hId = p.houseId;
          const isSkillSelected = !!selectedSkills[hId];
          const isMe = myPlayerIndex != null && myPlayerIndex >= 0 && p.playerIndex === myPlayerIndex;
          const isControlledByMe = myPlayerIndex != null && myPlayerIndex >= 0 ? isMe : true;

          return (
            <div
              key={hId}
              className={`bg-slate-950/90 backdrop-blur-xl border-2 rounded-2xl p-3 shadow-xl flex flex-col justify-between transition-all duration-300 ${
                isSkillSelected
                  ? "ring-2 ring-amber-400/80 shadow-[0_0_25px_rgba(245,158,11,0.5)] scale-[1.02]"
                  : ""
              } ${isMe ? "border-amber-400 shadow-amber-500/20" : ""}`}
              style={{ borderColor: isMe ? "#f59e0b" : `${p.color || "#f59e0b"}70` }}
            >
              {/* HEADER: NAME, ROLE & HP */}
              <div className="flex items-center justify-between border-b border-white/10 pb-1.5 mb-2 gap-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-black text-xs text-white truncate">{p.name}</span>
                  {isMe && (
                    <span className="text-[8px] bg-amber-400 text-black px-1.5 py-0.5 rounded font-black shrink-0">
                      YOU
                    </span>
                  )}
                  {p.isBot && (
                    <span className="text-[8px] bg-purple-950/80 text-purple-300 border border-purple-500/40 px-1 py-0.5 rounded font-bold shrink-0">
                      BOT
                    </span>
                  )}
                  {!isMe && !p.isBot && myPlayerIndex != null && (
                    <span className="text-[8px] bg-slate-800 text-white/50 border border-white/10 px-1 py-0.5 rounded shrink-0">
                      PLAYER
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-bold text-emerald-400 shrink-0">HP {Math.max(0, p.hp)}</span>
              </div>

              {/* ACTIVE SPELL BADGE */}
              {isSkillSelected && SKILLS[selectedSkills[hId]] && (
                <div className="mb-2 px-2 py-1 rounded-lg bg-amber-500/20 border border-amber-400/50 text-[10px] font-black text-amber-300 flex items-center justify-between animate-pulse">
                  <span className="truncate">✨ {SKILLS[selectedSkills[hId]].name}</span>
                  <span className="text-[9px] bg-amber-400 text-black px-1.5 py-0.5 rounded font-extrabold uppercase">Ready</span>
                </div>
              )}

              {!clashResult ? (
                <div className="space-y-2">
                  {/* 1. SELECT HOUSE SKILL */}
                  <div>
                    <div className="text-[9px] font-black text-yellow-400 mb-1 uppercase tracking-wider">
                      ✨ Spell Selection
                    </div>
                    {p.skills && p.skills.length > 0 ? (
                      p.skills.map((skId) => {
                        const sk = SKILLS[skId];
                        if (!sk) return null;
                        const cd = p.skillCooldowns?.[skId] || 0;
                        const isSelected = selectedSkills[hId] === skId;
                        const isReady = cd === 0;

                        return (
                          <SkillButton
                            key={skId}
                            skillId={skId}
                            playerIndex={p.playerIndex}
                            playerId={p.playerIndex}
                            cooldown={cd}
                            onUse={(id) => isControlledByMe && isReady && handleToggleSkill(hId, id)}
                            size="sm"
                            selected={isSelected}
                            disabled={!isControlledByMe || !isReady || sk.requiresTarget === "monster"}
                          />
                        );
                      })
                    ) : (
                      <div className="text-[9px] text-white/40 italic text-center">No Spells</div>
                    )}
                  </div>

                  {/* 2. SELECT INVENTORY POTIONS */}
                  <div>
                    <div className="text-[9px] font-black text-cyan-400 mb-1 uppercase tracking-wider">
                      🧪 Potions
                    </div>
                    {p.potions && p.potions.length > 0 ? (
                      <div className="space-y-1">
                        {Array.from(new Set(p.potions)).filter((potId) => !POTIONS[potId]?.isTrap && potId !== "revive").map((potId) => {
                          const pot = POTIONS[potId];
                          if (!pot) return null;
                          const isSelected = selectedPotions[hId] === potId;

                          return (
                            <button
                              key={potId}
                              type="button"
                              disabled={!isControlledByMe}
                              onClick={() => isControlledByMe && handleTogglePotion(hId, potId)}
                              className={`w-full p-1 rounded-lg border text-left text-[9px] font-bold transition-all flex items-center justify-between ${
                                isSelected
                                  ? "bg-cyan-500/30 border-cyan-400 text-cyan-200"
                                  : "bg-slate-900 border-white/10 text-white/70 hover:bg-slate-800"
                              } ${!isControlledByMe ? "opacity-60 cursor-not-allowed" : ""}`}
                            >
                              <span className="truncate">🧪 {pot.name}</span>
                              <span className={`px-1 py-0.2 rounded text-[8px] font-black ${isSelected ? "bg-cyan-400 text-black" : "bg-cyan-500/20 text-cyan-300"}`}>
                                {isSelected ? "ACTIVE" : "USE"}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-[9px] text-white/40 italic text-center">No Potions</div>
                    )}
                  </div>

                  {/* 3. SELECT ALLIANCE */}
                  {selectedSkills[hId] && SKILLS[selectedSkills[hId]]?.requiresTarget === "player" && (
                    <select
                      disabled={!isControlledByMe}
                      value={selectedTargets[hId] ?? ""}
                      onChange={(event) => isControlledByMe && handleSelectTarget(hId, event.target.value)}
                      className={`w-full rounded-lg border border-red-400/40 bg-slate-900 px-2 py-1 text-[10px] font-bold text-white ${!isControlledByMe ? "opacity-60 cursor-not-allowed" : ""}`}
                    >
                      <option value="">Select Target Player</option>
                      {participants
                        .filter((other) => other.houseId !== hId)
                        .map((other) => (
                          <option key={other.playerIndex} value={other.playerIndex}>{other.name}</option>
                        ))}
                    </select>
                  )}

                  {participants.length > 1 && (
                    <div>
                      <div className="text-[9px] font-black text-emerald-400 mb-1 uppercase tracking-wider">
                        🤝 Alliance
                      </div>
                      <div className="grid grid-cols-1 gap-1">
                        {participants
                          .filter((other) => other.houseId !== hId)
                          .map((other) => {
                            const isAlliedWithOther = selectedAlliances[hId] === other.houseId;
                            return (
                              <button
                                key={other.houseId}
                                type="button"
                                disabled={!isControlledByMe}
                                onClick={() => isControlledByMe && handleToggleAlliance(hId, other.houseId)}
                                className={`p-1 rounded-lg border text-[10px] font-bold transition-all flex items-center justify-between ${
                                  isAlliedWithOther
                                    ? "bg-emerald-500/30 border-emerald-400 text-emerald-200"
                                    : "bg-slate-900 border-white/10 text-white/60 hover:bg-slate-800"
                                } ${!isControlledByMe ? "opacity-60 cursor-not-allowed" : ""}`}
                              >
                                <span className="truncate">🤝 {other.name}</span>
                                <span className={`px-1 py-0.2 rounded text-[8px] font-black ${isAlliedWithOther ? "bg-emerald-400 text-black" : "bg-white/10"}`}>
                                  {isAlliedWithOther ? "ALLIED" : "ALLY"}
                                </span>
                              </button>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* RESULT SUMMARY FOR THIS HOUSE */
                <div className="py-2 text-center space-y-1">
                  <div className="text-xs font-black text-amber-300">
                    💥 {clashResult.houseClashData[hId]?.calcDmg || 0} DMG
                  </div>
                  {selectedAlliances[hId] && (
                    <div className="text-[9px] text-emerald-300 font-bold">🤝 Alliance (+15 HP)</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ACTION BUTTON & CONTINUE HUB */}
      <div className="relative z-20 flex justify-center pt-2 pointer-events-auto">
        {!clashResult ? (
          <button
            type="button"
            onClick={handleStartClash}
            className="py-3 px-10 rounded-2xl bg-gradient-to-r from-red-600 via-amber-500 to-red-600 hover:from-red-500 hover:to-amber-400 text-white font-black text-sm tracking-[0.2em] uppercase shadow-[0_0_35px_rgba(239,68,68,0.8)] border-2 border-amber-300 transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
          >
            <span>⚔️</span>
            <span>
              {autoStartCountdown != null
                ? `Starting Duel (${autoStartCountdown}s)...`
                : "START DUEL"}
            </span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onResolvePvp(clashResult)}
            className="py-3 px-10 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-600 hover:from-emerald-500 hover:to-teal-400 text-white font-black text-sm tracking-[0.2em] uppercase shadow-[0_0_35px_rgba(16,185,129,0.8)] border-2 border-emerald-300 transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
          >
            <span>🏆</span>
            <span>
              {autoReturnCountdown != null
                ? `Continue (${autoReturnCountdown}s)`
                : "CONTINUE TO BOARD"}
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
