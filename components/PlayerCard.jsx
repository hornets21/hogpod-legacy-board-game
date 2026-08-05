"use client";

import { useState, useEffect } from "react";
import { getTotalDmg } from "@/lib/gameEngine";
import { SKILLS, POTIONS } from "@/lib/gameData";

export default function PlayerCard({ player, playerIndex, isActive, onUseSkill, onUsePotion }) {
  const [isExpanded, setIsExpanded] = useState(isActive);

  // Auto expand on active turn, auto collapse when not active turn (manual toggle still allowed anytime)
  useEffect(() => {
    setIsExpanded(isActive);
  }, [isActive]);

  const totalDmg = getTotalDmg(player);
  const hpPct = Math.max(0, (player.hp / player.maxHp) * 100);

  // Equipment slots helper
  const equipSlots = [
    { type: "Wand", icon: "🪄", item: player.wand ? (player.wand.name || (player.wand.type === "vip" ? "VIP Wand" : "Common Wand")) : null },
    { type: "Armor", icon: "🛡️", item: player.armor ? player.armor.name : null },
    { type: "Amulet", icon: "📿", item: player.amulet ? player.amulet.name : null },
    { type: "Pet", icon: "🐾", item: player.pet ? player.pet.name : null },
  ];

  // Potion inventory slots (5 slots)
  const potionSlots = Array.from({ length: 5 }, (_, i) => player.potions[i] || null);

  // Skill inventory slots (2 slots)
  const skillSlots = Array.from({ length: 2 }, (_, i) => player.skills[i] || null);

  return (
    <div
      className={`game-panel-card relative rounded-2xl p-3 border transition-all duration-300 ${
        isActive
          ? "border-2 bg-slate-900/95 shadow-[0_0_30px_rgba(240,184,91,0.4)] ring-2 ring-amber-400/50 z-10"
          : "border-white/10 bg-slate-950/80 hover:border-white/20 opacity-90 hover:opacity-100"
      }`}
      style={{
        "--house-color": player.color,
        borderColor: isActive ? (player.color || "#f59e0b") : undefined,
        boxShadow: isActive ? `0 0 25px ${player.color || "rgba(240,184,91,0.4)"}` : undefined,
      }}
    >
      {/* Active Turn Pulsing Badge */}
      {isActive && (
        <div className="absolute -top-3 left-4 z-20 flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 font-black text-[10px] uppercase tracking-wider shadow-lg animate-pulse border border-yellow-200">
          <span>🎯</span>
          <span>ถึงตาเดินแล้ว</span>
        </div>
      )}

      {/* Header: Crest, Name, Position & Expand Toggle */}
      <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2 mb-2">
        <div className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer" onClick={() => setIsExpanded((e) => !e)}>
          <div className="w-9 h-9 rounded-xl border-2 overflow-hidden bg-black flex-shrink-0 shadow-md" style={{ borderColor: player.color }}>
            {player.image ? (
              <img src={player.image} alt={player.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-xl flex items-center justify-center h-full">{player.emoji}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-black text-white text-xs truncate flex items-center gap-1">
              <span>{player.name}</span>
            </h3>
            <p className="text-[9px] text-white/50 font-bold truncate">#{player.position} · HP {Math.max(0, player.hp)}/{player.maxHp}</p>
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Expand/Collapse Button */}
          <button
            onClick={() => setIsExpanded((e) => !e)}
            className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-xs text-amber-300 font-bold transition-all"
            title={isExpanded ? "พับเก็บข้อมูล" : "ขยายข้อมูล / ใช้สกิลตอบโต้"}
          >
            {isExpanded ? "▲" : "▼"}
          </button>
        </div>
      </div>

      {/* HP Bar & Compact Summary */}
      <div className="space-y-1.5 mb-2">
        <div className="w-full h-2 bg-black/60 rounded-full border border-white/10 overflow-hidden">
          <div
            className="h-full transition-all duration-300 rounded-full"
            style={{
              width: `${hpPct}%`,
              backgroundColor: hpPct > 50 ? "#22c55e" : hpPct > 25 ? "#eab308" : "#ef4444",
            }}
          />
        </div>

        {/* Compact stats line if collapsed */}
        {!isExpanded && (
          <div className="flex items-center justify-between text-[10px] text-white/70 font-semibold px-0.5">
            <span>⚔️ {totalDmg} DMG</span>
            <span>💰 {player.gold.toLocaleString()} Gold</span>
            <span className="text-purple-300 font-bold">✨ {player.skills.length} สกิล</span>
          </div>
        )}
      </div>

      {/* Detailed Content (Shown when isExpanded is true) */}
      {isExpanded && (
        <div className="space-y-2.5 pt-1 border-t border-white/5 animate-fadeIn">
          {/* Stats Grid: Attack Dmg & Gold */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-black/40 border border-white/5 rounded-xl p-1.5 px-2.5 flex items-center justify-between">
              <span className="text-[10px] font-bold text-white/50">⚔️ DMG</span>
              <span className="font-black text-orange-400">{totalDmg}</span>
            </div>
            <div className="bg-black/40 border border-white/5 rounded-xl p-1.5 px-2.5 flex items-center justify-between">
              <span className="text-[10px] font-bold text-white/50">💰 GOLD</span>
              <span className="font-black text-yellow-400">{player.gold.toLocaleString()}</span>
            </div>
          </div>

          {/* Game Equipment Inventory Slots */}
          <div>
            <div className="text-[9px] font-black uppercase tracking-wider text-white/40 mb-1">🛡️ อุปกรณ์สวมใส่</div>
            <div className="grid grid-cols-4 gap-1.5">
              {equipSlots.map((slot, idx) => (
                <div
                  key={idx}
                  className={`h-8 rounded-lg border flex flex-col items-center justify-center p-0.5 text-center relative overflow-hidden transition-all ${
                    slot.item
                      ? "border-yellow-500/50 bg-yellow-950/20 text-yellow-300"
                      : "border-white/10 bg-black/40 text-white/20"
                  }`}
                  title={slot.item ? `${slot.type}: ${slot.item}` : `ช่องว่าง (${slot.type})`}
                >
                  <span className="text-[10px]">{slot.icon}</span>
                  <span className="text-[8px] font-black truncate w-full">{slot.item || slot.type}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Potion Pouch Slots */}
          <div>
            <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-wider text-white/40 mb-1">
              <span>🧪 กระเป๋ายา ({player.potions.length}/5)</span>
            </div>
            <div className="grid grid-cols-5 gap-1">
              {potionSlots.map((potId, idx) => {
                const pot = potId ? POTIONS[potId] : null;
                return (
                  <button
                    key={idx}
                    onClick={() => potId && onUsePotion && onUsePotion(potId, playerIndex)}
                    disabled={!potId}
                    className={`h-8 rounded-lg border flex items-center justify-center text-sm transition-all ${
                      pot
                        ? "border-emerald-500/40 bg-emerald-950/30 text-white hover:scale-110 hover:border-emerald-400 cursor-pointer"
                        : "border-white/5 bg-black/30 text-white/10 cursor-not-allowed"
                    }`}
                    title={pot ? pot.name : "ช่องยาว่าง"}
                  >
                    {pot ? pot.emoji : "•"}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Skill Book Slots (2 Slots - Allow Countering!) */}
          <div>
            <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-wider text-white/40 mb-1">
              <span>✨ ช่องคาถาประจำบ้าน (2 สกิล)</span>
              {!isActive && <span className="text-[8px] text-amber-400 font-bold">⚡ สกิลตอบโต้</span>}
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {skillSlots.map((skillId, idx) => {
                const skill = skillId ? SKILLS[skillId] : null;
                const cd = skillId ? player.skillCooldowns?.[skillId] || 0 : 0;
                const canUse = skillId && cd === 0;
                return (
                  <button
                    key={idx}
                    onClick={() => canUse && onUseSkill && onUseSkill(skillId, playerIndex)}
                    disabled={!canUse}
                    className={`h-9 px-2 rounded-lg border flex items-center gap-1.5 text-left text-xs font-bold transition-all ${
                      skill
                        ? cd > 0
                          ? "border-white/10 bg-black/50 text-white/30 cursor-not-allowed"
                          : "border-purple-500/50 bg-purple-950/40 text-purple-200 hover:border-purple-300 hover:bg-purple-900/60 shadow-md cursor-pointer"
                        : "border-white/5 bg-black/30 text-white/10 cursor-not-allowed"
                    }`}
                    title={skill ? `${skill.nameTh || skill.name}: ${skill.description}` : "ยังไม่ได้รับการฝึกคาถา"}
                  >
                    <span className="text-sm">{skill ? skill.emoji : "🔮"}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-black truncate">{skill ? (skill.nameTh || skill.name) : "ว่าง"}</div>
                    </div>
                    {cd > 0 && <span className="text-[8px] bg-red-950 text-red-400 border border-red-500/30 px-1 rounded font-black">{cd}T</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
