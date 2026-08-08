"use client";

import { useState } from "react";
import { SKILLS, POTIONS } from "@/lib/gameData";
import { getTotalDmg } from "@/lib/gameEngine";
import { emitSkillCast, emitDamageDealt, emitHeal } from "@/lib/skillFxBus";
import SkillButton from "@/components/fx/SkillButton";
import Pvp3dBattleStage from "@/components/board3d/Pvp3dBattleStage";

export default function PvpCombatModal({ pvpEncounter, players, onPvpAction }) {
  const [selectedSkills, setSelectedSkills] = useState({}); // { houseId: skillId }
  const [selectedPotions, setSelectedPotions] = useState({}); // { houseId: potionId }
  const [selectedAlliances, setSelectedAlliances] = useState({}); // { houseId: alliedHouseId }
  const [clashResult, setClashResult] = useState(null);

  if (!pvpEncounter) return null;

  const cell = pvpEncounter.cell || 1;
  const participants = pvpEncounter.participants || 
    (pvpEncounter.participantIndices
      ? pvpEncounter.participantIndices.map((idx) => players[idx]).filter(Boolean)
      : []);

  if (participants.length === 0) return null;

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

  // ─── START PVP CLASH CALCULATION ──────────────────────────────
  const handleStartClash = () => {
    let updatedPlayers = [...players];
    let logEntries = [];
    let houseClashData = {};

    logEntries.push(`⚔️ ศึกลานประลองยุทธ์หลากบ้านอุบัติขึ้น ณ ช่อง #${cell}!`);

    // 1. ประมวลผลสกิลและน้ำยา
    participants.forEach((p) => {
      const hId = p.houseId;
      let playerObj = { ...updatedPlayers[p.playerIndex] };
      let skillBonusDmg = 0;
      let potionBonusDmg = 0;

      // สกิลประจำบ้าน
      const skId = selectedSkills[hId];
      if (skId && SKILLS[skId]) {
        const sk = SKILLS[skId];
        const cdBase = sk.cooldown || 3;
        const cdActual = playerObj.pet?.effect === "reduce_cooldown" ? cdBase - 1 : cdBase;
        playerObj.skillCooldowns = { ...(playerObj.skillCooldowns || {}), [skId]: cdActual };
        logEntries.push(`✨ ${playerObj.name} ร่ายเวทมนตร์ประจำบ้าน "${sk.nameTh || sk.name}"!`);
        emitSkillCast({ playerId: p.playerIndex, skillId: skId, skillData: sk });

        if (sk.dmg) skillBonusDmg += sk.dmg;
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
        isInvincible: skId === "stay_stupid",
        allianceWith: selectedAlliances[hId] || null,
        usedSkillId: skId,
      };

      updatedPlayers[p.playerIndex] = playerObj;
    });

    // 2. ประมวลผลการจับมือพันธมิตรและความเสียหาย (Alliance & Damage Exchange)
    participants.forEach((p) => {
      const hId = p.houseId;
      const pData = houseClashData[hId];
      const playerObj = { ...updatedPlayers[p.playerIndex] };
      let damageTaken = 0;

      participants.forEach((other) => {
        if (other.houseId === hId) return;
        const otherData = houseClashData[other.houseId];

        // ตรวจสอบการเป็นพันธมิตรกัน (ถ้าฝ่ายใดฝ่ายหนึ่งกดจับมือ)
        const isAllied = pData.allianceWith === other.houseId || otherData.allianceWith === hId;

        if (isAllied) {
          logEntries.push(`🤝 ${p.name} และ ${other.name} จับมือเป็นพันธมิตรกัน! (+15 HP)`);
          playerObj.hp = Math.min(playerObj.maxHp, playerObj.hp + 15);
        } else if (!pData.isInvincible) {
          const dmgShare = Math.floor(otherData.calcDmg / (participants.length - 1));
          damageTaken += dmgShare;
        }
      });

      if (pData.isInvincible) {
        logEntries.push(`🛡️ ${p.name} อยู่ในสถานะอมตะ หลบความเสียหายทั้งหมด!`);
      } else if (damageTaken > 0) {
        playerObj.hp = Math.max(0, playerObj.hp - damageTaken);
        logEntries.push(`💥 ${p.name} พ่ายแพ้การปะทะ ได้รับความเสียหาย -${damageTaken} HP (เหลือ ${playerObj.hp} HP)`);
        emitDamageDealt({ targetIndex: p.playerIndex, amount: damageTaken, type: "pvp" });
      } else {
        logEntries.push(`🛡️ ${p.name} ไม่ได้รับความเสียหายในการประลองรอบนี้`);
      }

      updatedPlayers[p.playerIndex] = playerObj;
    });

    // 3. สรุปผล ชนะ / เสมอ / จับมือพันธมิตร
    const hasActiveAlliance = Object.values(selectedAlliances).some(Boolean);
    let highestDmg = -1;
    let winnerName = null;
    let isDraw = false;

    Object.entries(houseClashData).forEach(([hId, d]) => {
      if (d.calcDmg > highestDmg) {
        highestDmg = d.calcDmg;
        winnerName = d.name;
        isDraw = false;
      } else if (d.calcDmg === highestDmg) {
        isDraw = true;
      }
    });

    // ถ้ามีการจับมือเป็นพันธมิตรกัน จะสรุปผลเป็นเสมอกันและจับมือพันธมิตรเสมอ
    if (hasActiveAlliance) {
      isDraw = true;
    }

    let battleSummaryText = "";
    if (isDraw && hasActiveAlliance) {
      battleSummaryText = "🤝 การประลองจบลงด้วยการ จับมือเป็นพันธมิตร! (ALLIANCE DRAW)";
    } else if (isDraw) {
      battleSummaryText = "⚖️ การประลองจบลงด้วยการ เสมอกัน! (DRAW)";
    } else {
      battleSummaryText = `🏆 ผู้ชนะในศึกลานประลอง: ${winnerName} (WINNER)!`;
    }

    logEntries.push(battleSummaryText);

    setClashResult({
      updatedPlayers,
      logEntries,
      houseClashData,
      winnerName,
      isDraw,
      battleSummaryText,
    });
  };

  const onResolvePvp = (result) => {
    if (!result) return;
    onPvpAction({
      choice: "resolve",
      updatedPlayers: result.updatedPlayers,
      logEntries: result.logEntries,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-between select-none overflow-hidden animate-fade-in p-3 md:p-5 text-white pointer-events-none bg-slate-950 bg-cover bg-center"
      style={{ backgroundImage: "url('/images/system/arena_bg.jpg')" }}
    >
      {/* Arena backdrop: keep the room visible while preserving HUD contrast. */}
      <div className="absolute inset-0 bg-slate-950/55 backdrop-blur-[1px] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,_rgba(2,6,23,0.8)_0%,_rgba(2,6,23,0.18)_42%,_rgba(2,6,23,0.9)_100%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_18%,_rgba(2,6,23,0.72)_100%)] pointer-events-none" />

      {/* TOP HEADER HUD */}
      <div className="relative z-20 w-full max-w-4xl mx-auto flex items-center justify-between bg-slate-900/90 border border-amber-500/30 rounded-2xl px-5 py-2.5 backdrop-blur-md shadow-xl shrink-0 pointer-events-auto">
        <div className="flex items-center gap-3">
          <span className="text-xl animate-pulse">⚔️</span>
          <div>
            <h1 className="text-amber-400 font-black text-xs md:text-sm tracking-[0.2em] uppercase">
              PVP ARENA — ช่อง #{cell}
            </h1>
            <p className="text-[10px] text-white/50 font-bold">
              ศึกประลองยุทธ์ {participants.length} บ้านเวทมนตร์
            </p>
          </div>
        </div>

        <div className="text-[11px] font-black tracking-widest text-amber-300 bg-amber-950/60 border border-amber-500/40 px-3 py-1 rounded-full uppercase shadow-inner">
          {clashResult ? "🏆 ศึกประลองจบลงแล้ว" : "⚔️ เลือกสกิล & พันธมิตร"}
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
          </div>
        )}
      </div>

      {/* BOTTOM SIMPLIFIED CONTROLS: FIGHTER CARDS (SKILL + ALLIANCE SELECTOR ONLY) */}
      <div className="relative z-20 w-full max-w-5xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-3 items-end shrink-0 pointer-events-auto">
        {participants.map((p) => {
          const hId = p.houseId;
          const isSkillSelected = !!selectedSkills[hId];
          const isAllied = !!selectedAlliances[hId];

          return (
            <div
              key={hId}
              className="bg-slate-950/90 backdrop-blur-xl border-2 rounded-2xl p-3 shadow-xl flex flex-col justify-between"
              style={{ borderColor: `${p.color || "#f59e0b"}70` }}
            >
              {/* HEADER: NAME & HP */}
              <div className="flex items-center justify-between border-b border-white/10 pb-1.5 mb-2">
                <span className="font-black text-xs text-white truncate">{p.name}</span>
                <span className="text-[10px] font-bold text-emerald-400">HP {Math.max(0, p.hp)}</span>
              </div>

              {!clashResult ? (
                <div className="space-y-2">
                  {/* 1. SELECT HOUSE SKILL */}
                  <div>
                    <div className="text-[9px] font-black text-yellow-400 mb-1 uppercase tracking-wider">
                      ✨ เลือกใช้คาถา
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
                            onUse={(id) => isReady && handleToggleSkill(hId, id)}
                            size="sm"
                            selected={isSelected}
                            disabled={!isReady}
                          />
                        );
                      })
                    ) : (
                      <div className="text-[9px] text-white/40 italic text-center">ไม่มีคาถา</div>
                    )}
                  </div>

                  {/* 2. SELECT INVENTORY POTIONS (เลือกใช้ขวดยา) */}
                  <div>
                    <div className="text-[9px] font-black text-cyan-400 mb-1 uppercase tracking-wider">
                      🧪 เลือกใช้ขวดยา
                    </div>
                    {p.potions && p.potions.length > 0 ? (
                      <div className="space-y-1">
                        {Array.from(new Set(p.potions)).map((potId) => {
                          const pot = POTIONS[potId];
                          if (!pot) return null;
                          const isSelected = selectedPotions[hId] === potId;

                          return (
                            <button
                              key={potId}
                              onClick={() => handleTogglePotion(hId, potId)}
                              className={`w-full p-1 rounded-lg border text-left text-[9px] font-bold transition-all flex items-center justify-between ${
                                isSelected
                                  ? "bg-cyan-500/30 border-cyan-400 text-cyan-200"
                                  : "bg-slate-900 border-white/10 text-white/70 hover:bg-slate-800"
                              }`}
                            >
                              <span className="truncate">🧪 {pot.name}</span>
                              <span className={`px-1 py-0.2 rounded text-[8px] font-black ${isSelected ? "bg-cyan-400 text-black" : "bg-cyan-500/20 text-cyan-300"}`}>
                                {isSelected ? "ใช้" : "เลือก"}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-[9px] text-white/40 italic text-center">ไม่มียา</div>
                    )}
                  </div>

                  {/* 3. SELECT ALLIANCE (โหมดจับมือพันธมิตร) */}
                  {participants.length > 1 && (
                    <div>
                      <div className="text-[9px] font-black text-emerald-400 mb-1 uppercase tracking-wider">
                        🤝 จับมือพันธมิตรกับ
                      </div>
                      <div className="grid grid-cols-1 gap-1">
                        {participants
                          .filter((other) => other.houseId !== hId)
                          .map((other) => {
                            const isAlliedWithOther = selectedAlliances[hId] === other.houseId;
                            return (
                              <button
                                key={other.houseId}
                                onClick={() => handleToggleAlliance(hId, other.houseId)}
                                className={`p-1 rounded-lg border text-[10px] font-bold transition-all flex items-center justify-between ${
                                  isAlliedWithOther
                                    ? "bg-emerald-500/30 border-emerald-400 text-emerald-200"
                                    : "bg-slate-900 border-white/10 text-white/60 hover:bg-slate-800"
                                }`}
                              >
                                <span className="truncate">🤝 {other.name}</span>
                                <span className={`px-1 py-0.2 rounded text-[8px] font-black ${isAlliedWithOther ? "bg-emerald-400 text-black" : "bg-white/10"}`}>
                                  {isAlliedWithOther ? "จับมือแล้ว" : "จับมือ"}
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
                    <div className="text-[9px] text-emerald-300 font-bold">🤝 จับมือพันธมิตร (+15 HP)</div>
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
            onClick={handleStartClash}
            className="py-3 px-10 rounded-2xl bg-gradient-to-r from-red-600 via-amber-500 to-red-600 hover:from-red-500 hover:to-amber-400 text-white font-black text-sm tracking-[0.2em] uppercase shadow-[0_0_35px_rgba(239,68,68,0.8)] border-2 border-amber-300 transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
          >
            <span>⚔️</span>
            <span>เริ่มการประลองยุทธ์! (START BATTLE)</span>
          </button>
        ) : (
          <button
            onClick={() => onResolvePvp(clashResult)}
            className="py-3 px-10 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-600 hover:from-emerald-500 hover:to-teal-400 text-white font-black text-sm tracking-[0.2em] uppercase shadow-[0_0_35px_rgba(16,185,129,0.8)] border-2 border-emerald-300 transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
          >
            <span>🏆</span>
            <span>รับผลประลอง & กลับสู่กระดาน</span>
          </button>
        )}
      </div>
    </div>
  );
}
