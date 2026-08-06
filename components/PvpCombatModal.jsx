"use client";

import { useState } from "react";
import { SKILLS, POTIONS } from "@/lib/gameData";
import { getTotalDmg } from "@/lib/gameEngine";
import {
  emitSkillCast,
  emitDamageDealt,
  emitHeal,
} from "@/lib/skillFxBus";
import SkillButton from "@/components/fx/SkillButton";

export default function PvpCombatModal({ pvpEncounter, players, onPvpAction }) {
  const [selectedSkills, setSelectedSkills] = useState({});
  const [selectedPotions, setSelectedPotions] = useState({});
  const [selectedAlliances, setSelectedAlliances] = useState({});
  const [clashResult, setClashResult] = useState(null);

  if (!pvpEncounter || !players) return null;

  const cell = pvpEncounter.cell;
  const participantIndices = pvpEncounter.participantIndices || [
    pvpEncounter.attackerIndex,
    pvpEncounter.targetIndex,
  ].filter((idx) => idx !== undefined && idx !== null);

  const participants = participantIndices
    .map((idx) => ({ ...players[idx], playerIndex: idx }))
    .filter((p) => p && p.isAlive);

  if (participants.length < 2) return null;

  const handleToggleSkill = (houseId, skillId) => {
    setSelectedSkills((prev) => ({
      ...prev,
      [houseId]: prev[houseId] === skillId ? null : skillId,
    }));
  };

  const handleTogglePotion = (houseId, potionId) => {
    setSelectedPotions((prev) => ({
      ...prev,
      [houseId]: prev[houseId] === potionId ? null : potionId,
    }));
  };

  const handleSetAlliance = (houseId, targetHouseId) => {
    setSelectedAlliances((prev) => ({
      ...prev,
      [houseId]: prev[houseId] === targetHouseId ? null : targetHouseId,
    }));
  };

  // Calculate battle outcome
  const handleStartClash = () => {
    const updatedPlayers = players.map((p) => ({ ...p }));
    const logEntries = [];
    const houseClashData = {};

    logEntries.push(`⚔️ การประลองยุทธ์เริ่มต้นขึ้นที่ช่อง ${cell}!`);

    // 1. Process potions & skills for all participants
    participants.forEach((p) => {
      const hId = p.houseId;
      let playerObj = { ...updatedPlayers[p.playerIndex] };
      let skillBonusDmg = 0;
      let potionBonusDmg = 0;

      // Potion usage
      const potId = selectedPotions[hId];
      if (potId && playerObj.potions.includes(potId)) {
        const potIdx = playerObj.potions.indexOf(potId);
        playerObj.potions = playerObj.potions.filter((_, i) => i !== potIdx);

        if (potId === "heal") {
          const healAmt = 30;
          playerObj.hp = Math.min(playerObj.maxHp, playerObj.hp + healAmt);
          logEntries.push(`🧪 ${playerObj.name} ดื่ม Heal Potion (+30 HP)!`);
          emitHeal({ targetIndex: p.playerIndex, amount: healAmt });
        } else if (potId === "damage") {
          potionBonusDmg += 100;
          logEntries.push(`⚡ ${playerObj.name} ดื่ม Damage Potion (+100 DMG)!`);
        }
      }

      // Skill usage
      const skId = selectedSkills[hId];
      if (skId && SKILLS[skId]) {
        const sk = SKILLS[skId];
        const cdBase = sk.cooldown || 3;
        const cdActual = playerObj.pet?.effect === "reduce_cooldown" ? cdBase - 1 : cdBase;
        playerObj.skillCooldowns = { ...(playerObj.skillCooldowns || {}), [skId]: cdActual };
        logEntries.push(`✨ ${playerObj.name} ปลดปล่อยคาถา "${sk.nameTh || sk.name}"!`);
        emitSkillCast({ playerId: p.playerIndex, skillId: skId, skillData: sk });

        if (sk.dmg) skillBonusDmg += sk.dmg;
      }

      const baseDmg = getTotalDmg(playerObj);
      const totalPower = baseDmg + skillBonusDmg + potionBonusDmg;
      const calcDmg = Math.floor(totalPower * (0.8 + Math.random() * 0.4));

      houseClashData[hId] = {
        name: playerObj.name,
        calcDmg,
        isInvincible: skId === "stay_stupid",
        allianceWith: selectedAlliances[hId] || null,
        usedSkillId: skId,
        usedPotionId: potId,
      };

      updatedPlayers[p.playerIndex] = playerObj;
    });

    // 2. Process Alliances & Damage Exchange
    participants.forEach((p) => {
      const hId = p.houseId;
      const pData = houseClashData[hId];
      const playerObj = { ...updatedPlayers[p.playerIndex] };

      let totalDamageTaken = 0;

      participants.forEach((other) => {
        if (other.houseId === hId) return;
        const otherData = houseClashData[other.houseId];

        // Check alliance
        const isAllied =
          pData.allianceWith === other.houseId ||
          otherData.allianceWith === hId;

        if (isAllied) {
          logEntries.push(`🤝 ${p.name} และ ${other.name} จับมือเป็นพันธมิตร! (+10 HP)`);
          playerObj.hp = Math.min(playerObj.maxHp, playerObj.hp + 10);
        } else if (!pData.isInvincible) {
          const dmgShare = Math.floor(otherData.calcDmg / (participants.length - 1));
          totalDamageTaken += dmgShare;
        }
      });

      if (pData.isInvincible) {
        logEntries.push(`🛡️ ${p.name} ใช้ Stay Stupid หลบความเสียหายทั้งหมด!`);
      } else if (totalDamageTaken > 0) {
        playerObj.hp = Math.max(0, playerObj.hp - totalDamageTaken);
        logEntries.push(`💥 ${p.name} ได้รับความเสียหาย ${totalDamageTaken} DMG (HP เหลือ ${playerObj.hp})`);
        emitDamageDealt({ targetIndex: p.playerIndex, amount: totalDamageTaken, type: "pvp" });
      }

      updatedPlayers[p.playerIndex] = playerObj;
    });

    setClashResult({
      updatedPlayers,
      logEntries,
      houseClashData,
    });
  };

  const handleConfirmResult = () => {
    if (!clashResult) return;
    onPvpAction({
      choice: "resolve",
      updatedPlayers: clashResult.updatedPlayers,
      logEntries: clashResult.logEntries,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none overflow-y-auto custom-scrollbar">
      {/* Dark Vignette Overlay with Red Glow */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/95 via-red-950/40 to-black/95 backdrop-blur-xl animate-fade-in" />

      {/* Top Epic Banner */}
      <div className="absolute top-4 left-0 right-0 py-2.5 bg-gradient-to-r from-red-950 via-amber-950 to-red-950 border-y-2 border-amber-500/60 flex items-center justify-center gap-4 z-20 shadow-[0_0_30px_rgba(245,158,11,0.3)]">
        <span className="text-2xl animate-pulse">⚔️</span>
        <div className="text-amber-400 text-sm font-black tracking-[0.3em] uppercase drop-shadow-[0_2px_10px_rgba(245,158,11,0.8)]">
          PVP ARENA OF DESTINY — การประลองหลากบ้าน (ช่อง #{cell})
        </div>
        <span className="text-2xl animate-pulse">⚔️</span>
      </div>

      {/* Main Layout Container */}
      <div className="relative z-10 w-full max-w-6xl my-16 px-2 flex flex-col items-center gap-6">

        {/* 2-PLAYER DYNAMIC VERSUS LAYOUT WITH DRAMATIC VS EMBLEM */}
        {participants.length === 2 ? (
          <div className="w-full flex flex-col lg:flex-row items-center justify-between gap-6">
            
            {/* Player 1 Card (Attacker / Challenger) */}
            <RenderFighterCard
              player={participants[0]}
              selectedSkills={selectedSkills}
              selectedPotions={selectedPotions}
              selectedAlliances={selectedAlliances}
              participants={participants}
              clashResult={clashResult}
              onToggleSkill={handleToggleSkill}
              onTogglePotion={handleTogglePotion}
              onSetAlliance={handleSetAlliance}
              badgeText="CHALLENGER (ผู้ท้าชน)"
            />

            {/* CENTER EPIC VS EMBLEM & ACTION HUB */}
            <div className="flex flex-col items-center justify-center shrink-0 min-w-[260px] gap-5 z-20 my-2">
              {!clashResult ? (
                <>
                  {/* DRAMATIC GLOWING BOUNCING VS EMBLEM */}
                  <div className="relative group cursor-pointer">
                    <div className="absolute -inset-2 bg-gradient-to-r from-red-600 via-amber-500 to-red-600 rounded-full blur-xl opacity-85 group-hover:opacity-100 transition duration-500 animate-pulse" />
                    <div className="relative w-28 h-28 rounded-full bg-gradient-to-br from-red-600 via-amber-600 to-red-700 border-4 border-amber-300 shadow-[0_0_50px_rgba(245,158,11,0.9)] flex items-center justify-center animate-bounce">
                      <span className="text-5xl font-black italic tracking-tighter text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)]">
                        VS
                      </span>
                    </div>
                  </div>

                  {/* START PVP BUTTON */}
                  <button
                    onClick={handleStartClash}
                    className="w-full py-4 px-8 rounded-2xl bg-gradient-to-r from-red-600 via-amber-500 to-red-600 hover:from-red-500 hover:to-amber-400 text-white font-black text-base shadow-[0_0_35px_rgba(239,68,68,0.7)] border-2 border-amber-300/60 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-3"
                  >
                    <span className="text-xl">⚔️</span>
                    <span>เปิดศึกประลอง PvP!</span>
                  </button>
                </>
              ) : (
                <div className="w-full flex flex-col items-center gap-3">
                  <button
                    onClick={handleConfirmResult}
                    className="w-full py-4 px-8 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-white font-black text-base shadow-[0_0_35px_rgba(16,185,129,0.7)] border-2 border-emerald-300/60 transition-all hover:scale-105 active:scale-95"
                  >
                    🏆 รับผลประลอง & ปิดหน้าต่าง
                  </button>
                </div>
              )}
            </div>

            {/* Player 2 Card (Defender / Target) */}
            <RenderFighterCard
              player={participants[1]}
              selectedSkills={selectedSkills}
              selectedPotions={selectedPotions}
              selectedAlliances={selectedAlliances}
              participants={participants}
              clashResult={clashResult}
              onToggleSkill={handleToggleSkill}
              onTogglePotion={handleTogglePotion}
              onSetAlliance={handleSetAlliance}
              badgeText="TARGET (คู่ต่อสู้)"
            />

          </div>
        ) : (
          /* MULTI-HOUSE (3 OR 4 PLAYERS) LAYOUT WITH CENTER VS HUB */
          <div className="w-full flex flex-col items-center gap-6">
            
            {/* CENTER VS EMBLEM HEADER */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative group">
                <div className="absolute -inset-2 bg-gradient-to-r from-red-600 via-amber-500 to-red-600 rounded-full blur-xl opacity-85 animate-pulse" />
                <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-red-600 via-amber-600 to-red-700 border-4 border-amber-300 shadow-[0_0_50px_rgba(245,158,11,0.9)] flex items-center justify-center animate-bounce">
                  <span className="text-4xl font-black italic text-white drop-shadow-md">VS</span>
                </div>
              </div>

              {!clashResult && (
                <button
                  onClick={handleStartClash}
                  className="py-3.5 px-10 rounded-2xl bg-gradient-to-r from-red-600 via-amber-500 to-red-600 hover:from-red-500 hover:to-amber-400 text-white font-black text-base shadow-[0_0_35px_rgba(239,68,68,0.7)] border-2 border-amber-300/60 transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
                >
                  <span>⚔️</span> เริ่มการประลองยุทธ์หลากบ้าน!
                </button>
              )}
            </div>

            {/* Fighter Cards Grid */}
            <div className={`w-full grid gap-4 ${
              participants.length === 3 ? "grid-cols-1 md:grid-cols-3" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
            }`}>
              {participants.map((p, idx) => (
                <RenderFighterCard
                  key={p.houseId}
                  player={p}
                  selectedSkills={selectedSkills}
                  selectedPotions={selectedPotions}
                  selectedAlliances={selectedAlliances}
                  participants={participants}
                  clashResult={clashResult}
                  onToggleSkill={handleToggleSkill}
                  onTogglePotion={handleTogglePotion}
                  onSetAlliance={handleSetAlliance}
                  badgeText={`FIGHTER #${idx + 1}`}
                />
              ))}
            </div>

          </div>
        )}

        {/* RESULTS SUMMARY LOG (WHEN CLASH IS COMPLETED) */}
        {clashResult && (
          <div className="w-full max-w-3xl p-5 rounded-3xl bg-slate-950/95 border-2 border-amber-500/60 shadow-[0_0_40px_rgba(245,158,11,0.3)] backdrop-blur-2xl text-left animate-fade-in">
            <div className="text-amber-400 font-black text-base mb-3 flex items-center gap-2 border-b border-amber-500/30 pb-2">
              <span className="text-xl">📜</span>
              <span>สรุปรายงานผลการประลองยุทธ์</span>
            </div>
            <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar text-xs">
              {clashResult.logEntries.map((logStr, idx) => (
                <div key={idx} className="text-white/90 font-semibold bg-slate-900/60 p-2.5 rounded-xl border border-white/5 flex items-center gap-2">
                  {logStr}
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-center">
              <button
                onClick={handleConfirmResult}
                className="py-3 px-8 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-black text-sm shadow-xl transition-all hover:scale-105 active:scale-95 border border-emerald-300/40"
              >
                🏆 ยืนยันผลการต่อสู้ & กลับสู่กระดาน
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// ─── REUSABLE PREMIUM FIGHTER CARD COMPONENT ────────────────────────
function RenderFighterCard({
  player,
  selectedSkills,
  selectedPotions,
  selectedAlliances,
  participants,
  clashResult,
  onToggleSkill,
  onTogglePotion,
  onSetAlliance,
  badgeText,
}) {
  const hId = player.houseId;
  const baseDmg = getTotalDmg(player);

  let skDmg = 0;
  if (selectedSkills[hId] && SKILLS[selectedSkills[hId]]?.dmg) {
    skDmg += SKILLS[selectedSkills[hId]].dmg;
  }
  let potDmg = selectedPotions[hId] === "damage" ? 100 : 0;
  const totalProjectedDmg = baseDmg + skDmg + potDmg;

  return (
    <div
      className="flex-1 w-full bg-slate-900/90 border-2 rounded-3xl p-5 shadow-2xl backdrop-blur-md flex flex-col justify-between transition-all duration-300 hover:border-amber-400/80"
      style={{
        borderColor: player.color || "#f59e0b",
        boxShadow: `0 0 35px ${player.color || "#f59e0b"}35`,
      }}
    >
      <div>
        {/* Top House Crest & Header */}
        <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2.5">
          <span
            className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-md border"
            style={{
              color: player.color || "#f59e0b",
              borderColor: player.color || "#f59e0b",
              backgroundColor: "rgba(0,0,0,0.7)",
            }}
          >
            {badgeText}
          </span>
          <span className="text-xs font-black text-amber-400/90">{player.house}</span>
        </div>

        {/* Player Avatar & Attack Power */}
        <div className="flex items-center gap-4 mb-4">
          <div
            className="w-16 h-16 rounded-2xl border-2 overflow-hidden bg-black flex items-center justify-center shadow-lg shrink-0"
            style={{ borderColor: player.color || "#f59e0b" }}
          >
            {player.image ? (
              <img src={player.image} alt={player.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl">{player.emoji}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-black text-white text-base truncate">{player.name}</h3>
            <p className="text-xs text-white/50 font-bold truncate">{player.nameEn}</p>
            <div className="mt-1 text-xs font-black text-amber-400 flex items-center gap-1">
              <span>⚔️ พลังโจมตี:</span>
              <span className="text-white text-sm font-black">{totalProjectedDmg}</span>
              {(skDmg > 0 || potDmg > 0) && (
                <span className="text-emerald-400 font-bold">(+{skDmg + potDmg})</span>
              )}
            </div>
          </div>
        </div>

        {/* HP Bar */}
        <div className="w-full space-y-1 text-xs bg-black/60 p-3 rounded-xl border border-white/10 mb-4">
          <div className="flex justify-between font-bold text-white/80">
            <span>❤️ พลังชีวิต HP</span>
            <span className="text-emerald-400 font-black">{Math.max(0, player.hp)} / {player.maxHp}</span>
          </div>
          <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${Math.max(0, (player.hp / player.maxHp) * 100)}%` }}
            />
          </div>
        </div>

        {/* Equipped Items Summary */}
        <div className="mb-4">
          <div className="text-[10px] font-black uppercase text-white/60 mb-1.5 tracking-wider">
            🛡️ อุปกรณ์สวมใส่
          </div>
          <div className="grid grid-cols-2 gap-1.5 text-[11px]">
            <div className="bg-slate-800/80 p-1.5 rounded-lg border border-white/10 flex items-center gap-1.5">
              <span>🪄</span>
              <span className="text-white/80 font-medium truncate">{player.wand?.type || "None (+0)"}</span>
            </div>
            <div className="bg-slate-800/80 p-1.5 rounded-lg border border-white/10 flex items-center gap-1.5">
              <span>🛡️</span>
              <span className="text-white/80 font-medium truncate">{player.armor?.name || "None (+0)"}</span>
            </div>
            <div className="bg-slate-800/80 p-1.5 rounded-lg border border-white/10 flex items-center gap-1.5">
              <span>📿</span>
              <span className="text-white/80 font-medium truncate">{player.amulet?.name || "None (+0)"}</span>
            </div>
            <div className="bg-slate-800/80 p-1.5 rounded-lg border border-white/10 flex items-center gap-1.5">
              <span>🐾</span>
              <span className="text-white/80 font-medium truncate">{player.pet?.name || "No Pet"}</span>
            </div>
          </div>
        </div>

        {/* Skill Selector (เท่าเทียมกันทุกบ้าน) */}
        <div className="mb-4">
          <div className="text-[10px] font-black uppercase text-yellow-400 mb-1.5 flex justify-between tracking-wider">
            <span>✨ เลือกใช้คาถาประจำบ้าน</span>
            <span className="text-white/40 text-[9px]">(OPTIONAL)</span>
          </div>
          <div className="space-y-1.5">
            {player.skills && player.skills.length > 0 ? (
              player.skills.map((skId) => {
                const sk = SKILLS[skId];
                if (!sk) return null;
                const cd = player.skillCooldowns?.[skId] || 0;
                const isSelected = selectedSkills[hId] === skId;
                const isReady = cd === 0;

                return (
                  <SkillButton
                    key={skId}
                    skillId={skId}
                    playerIndex={player.playerIndex}
                    playerId={player.playerIndex}
                    cooldown={cd}
                    onUse={(id) => isReady && !clashResult && onToggleSkill(hId, id)}
                    size="md"
                    selected={isSelected}
                    disabled={!isReady || !!clashResult}
                  />
                );
              })
            ) : (
              <div className="text-xs text-white/40 italic p-2 bg-slate-950/40 rounded-lg text-center">ไม่มีสกิลประจำบ้าน</div>
            )}
          </div>
        </div>

        {/* Potion Selector (เท่าเทียมกันทุกบ้าน) */}
        <div className="mb-4">
          <div className="text-[10px] font-black uppercase text-cyan-400 mb-1.5 flex justify-between tracking-wider">
            <span>🧪 เลือกใช้ขวดยาในกระเป๋า</span>
            <span className="text-white/40 text-[9px]">(OPTIONAL)</span>
          </div>
          <div className="space-y-1.5">
            {player.potions && player.potions.length > 0 ? (
              Array.from(new Set(player.potions)).map((potId) => {
                const pot = POTIONS[potId];
                if (!pot) return null;
                const isSelected = selectedPotions[hId] === potId;

                return (
                  <button
                    key={potId}
                    disabled={!!clashResult}
                    onClick={() => onTogglePotion(hId, potId)}
                    className={`w-full p-2.5 rounded-xl border text-left text-xs transition-all flex items-center justify-between ${
                      isSelected
                        ? "bg-cyan-500/25 border-cyan-400 text-cyan-200 ring-2 ring-cyan-500/60 shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                        : "bg-slate-800/90 border-white/15 text-white hover:bg-slate-700/90"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-lg border border-white/15 bg-black/50 flex items-center justify-center overflow-hidden shrink-0">
                        {pot.image ? (
                          <>
                            <img
                              src={pot.image}
                              alt={pot.name}
                              className="w-full h-full object-contain p-0.5"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                                e.currentTarget.nextElementSibling.style.display = "flex";
                              }}
                            />
                            <span className="hidden w-full h-full items-center justify-center text-base" />
                          </>
                        ) : (
                          <span className="text-base" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold truncate">{pot.name}</div>
                        <div className="text-[9px] text-white/50 truncate">{pot.description}</div>
                      </div>
                    </div>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${isSelected ? "bg-cyan-400 text-black" : "bg-cyan-500/20 text-cyan-300"}`}>
                      {isSelected ? "ใช้" : "เลือก"}
                    </span>
                  </button>
                );
              })
            ) : (
              <div className="text-xs text-white/40 italic p-2 bg-slate-950/40 rounded-lg text-center">ไม่มียาในกระเป๋า</div>
            )}
          </div>
        </div>
      </div>

      {/* Alliance Diplomacy Selector */}
      <div className="pt-3 border-t border-white/10">
        <div className="text-[10px] font-black uppercase text-emerald-400 mb-1.5 tracking-wider">
          🤝 การทูต: จับมือพันธมิตรกับ
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {participants
            .filter((other) => other.houseId !== hId)
            .map((other) => {
              const isAllied = selectedAlliances[hId] === other.houseId;
              return (
                <button
                  key={other.houseId}
                  disabled={!!clashResult}
                  onClick={() => onSetAlliance(hId, other.houseId)}
                  className={`p-2 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    isAllied
                      ? "bg-emerald-500/30 border-emerald-400 text-emerald-200 shadow-md ring-2 ring-emerald-500/40"
                      : "bg-black/50 border-white/10 text-white/60 hover:bg-white/10"
                  }`}
                >
                  <span className="text-sm">{other.emoji}</span>
                  <span className="truncate">{other.name}</span>
                </button>
              );
            })}
        </div>
      </div>
    </div>
  );
}
