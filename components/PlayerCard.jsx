"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { getTotalDmg } from "@/lib/gameEngine";
import { POTIONS, HOUSES } from "@/lib/gameData";
import SkillButton from "@/components/fx/SkillButton";
import BuffBadges from "@/components/fx/BuffBadges";
import DamagePopup from "@/components/fx/DamagePopup";
import ItemTooltip from "@/components/fx/ItemTooltip";

export default function PlayerCard({ player, playerIndex, isActive, onUseSkill, onUsePotion }) {
  const [isExpanded, setIsExpanded] = useState(isActive);

  // Auto expand on active turn, auto collapse when not active turn (manual toggle still allowed anytime)
  useEffect(() => {
    setIsExpanded(isActive);
  }, [isActive]);

  const totalDmg = getTotalDmg(player);
  const hpPct = Math.max(0, (player.hp / player.maxHp) * 100);

  const houseData = HOUSES[player?.houseId] || {};
  const wandImg = player.wand
    ? (player.wand.type === "vip"
        ? (player.vipWandImg || houseData.vipWandImg)
        : (player.commonWandImg || houseData.commonWandImg))
    : null;

  const wandName = player.wand ? (player.wand.name || (player.wand.type === "vip" ? (player.vipWand || houseData.vipWand) : (player.commonWand || houseData.commonWand))) : null;

  // Equipment slots helper with complete Tooltip itemData
  const equipSlots = [
    {
      type: "Wand",
      icon: "🪄",
      item: wandName,
      img: wandImg,
      itemData: player.wand
        ? {
            name: wandName,
            categoryTh: "🪄 ไม้กายสิทธิ์",
            dmgBonus: player.wand.dmgBonus || (player.wand.type === "vip" ? 35 : 20),
            description: `ไม้กายสิทธิ์ประจำบ้าน ${houseData.name || ""} เพิ่มพลังโจมตี +${player.wand.dmgBonus || 20} DMG`,
            image: wandImg,
            icon: "🪄",
          }
        : {
            name: "ช่องว่าง (ไม้กายสิทธิ์)",
            categoryTh: "🪄 ไม้กายสิทธิ์",
            description: "ยังไม่ได้ติดไม้กายสิทธิ์ประจำบ้าน",
            icon: "🪄",
          },
    },
    {
      type: "Armor",
      icon: "🛡️",
      item: player.armor ? player.armor.name : null,
      img: player.armor ? player.armor.image : null,
      itemData: player.armor
        ? {
            ...player.armor,
            categoryTh: "🛡️ เสื้อเกราะ",
            icon: "🛡️",
          }
        : {
            name: "ช่องว่าง (เสื้อเกราะ)",
            categoryTh: "🛡️ เสื้อเกราะ",
            description: "ยังไม่ได้สวมใส่เสื้อเกราะ (สามารถหาซื้อได้จากพ่อค้าลึกลับ)",
            icon: "🛡️",
          },
    },
    {
      type: "Amulet",
      icon: "📿",
      item: player.amulet ? player.amulet.name : null,
      img: player.amulet ? player.amulet.image : null,
      itemData: player.amulet
        ? {
            ...player.amulet,
            categoryTh: "📿 เครื่องราง",
            icon: "📿",
          }
        : {
            name: "ช่องว่าง (เครื่องราง)",
            categoryTh: "📿 เครื่องราง",
            description: "ยังไม่ได้สวมใส่เครื่องรางศักดิ์สิทธิ์ (สุ่มรับได้จากร้านค้า)",
            icon: "📿",
          },
    },
    {
      type: "Pet",
      icon: "🐾",
      item: player.pet ? player.pet.name : null,
      img: player.pet ? (player.pet.image || `/images/items/pets/${player.pet.id}.webp`) : null,
      itemData: player.pet
        ? {
            ...player.pet,
            categoryTh: "🐾 สัตว์วิเศษ",
            icon: player.pet.emoji || "🐾",
            image: player.pet.image || `/images/items/pets/${player.pet.id}.webp`,
          }
        : {
            name: "ช่องว่าง (สัตว์วิเศษ)",
            categoryTh: "🐾 สัตว์วิเศษ",
            description: "ยังไม่มีสัตว์วิเศษข้างกาย (สามารถรับบัฟพิเศษได้เมื่อซื้อจากร้านค้า)",
            icon: "🐾",
          },
    },
  ];

  // Potion inventory slots (5 slots)
  const potionSlots = Array.from({ length: 5 }, (_, i) => (player.potions || [])[i] || null);

  // Skill inventory slots (2 slots)
  const skillSlots = Array.from({ length: 2 }, (_, i) => {
    const s = (player.skills || [])[i];
    return typeof s === "object" ? s?.id : s;
  });

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
      {/* Damage/Heal popup overlay (DOM based, listens to fx bus) */}
      <DamagePopup playerIndex={playerIndex} />

      {/* Active Turn / Dead Pulsing Badge */}
      {player.hp <= 0 || !player.isAlive ? (
        <div className="absolute -top-3 left-4 z-20 flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-red-600 text-white font-black text-[10px] uppercase tracking-wider shadow-lg animate-pulse border border-red-300">
          <span>💀</span>
          <span>เสียชีวิต</span>
        </div>
      ) : isActive ? (
        <div className="absolute -top-3 left-4 z-20 flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 font-black text-[10px] uppercase tracking-wider shadow-lg animate-pulse border border-yellow-200">
          <span>🎯</span>
          <span>ถึงตาเดินแล้ว</span>
        </div>
      ) : null}

      {/* Header: Crest / Profile Avatar, Name, Position & Expand Toggle */}
      <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2 mb-2">
        <div className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer" onClick={() => setIsExpanded((e) => !e)}>
          <div className="w-9 h-9 rounded-xl border-2 overflow-hidden bg-black flex-shrink-0 shadow-md relative" style={{ borderColor: player.color }}>
            {player._onlineAvatar ? (
              <img
                src={player._onlineAvatar}
                alt={player._onlineName || player.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  const fallback = e.currentTarget.nextElementSibling;
                  if (fallback) fallback.style.display = "flex";
                }}
              />
            ) : null}
            {player.image ? (
              <img
                src={player.image}
                alt={player.name}
                className={`w-full h-full object-cover ${player._onlineAvatar ? "hidden" : ""}`}
              />
            ) : (
              <span className={`text-xl flex items-center justify-center h-full ${player._onlineAvatar ? "hidden" : ""}`}>
                {player.emoji}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-black text-white text-xs truncate flex items-center gap-1.5">
              <span className="truncate">{player._onlineName || player.name}</span>
              {player._onlineName && (
                <span
                  className="text-[8px] font-bold px-1.5 py-0.2 rounded border shrink-0"
                  style={{
                    backgroundColor: `${player.color || "#f59e0b"}20`,
                    borderColor: `${player.color || "#f59e0b"}60`,
                    color: player.color || "#f59e0b",
                  }}
                >
                  {player.name}
                </span>
              )}
            </h3>
            <p className="text-[9px] text-white/50 font-bold truncate">#{player.position} · HP {Math.max(0, player.hp)}/{player.maxHp}</p>
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
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
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-black text-xs text-white truncate max-w-[120px]">
                {player._onlineName || player.name}
              </span>
              {isActive && (
                <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded-full bg-amber-500 text-black animate-pulse">
                  เทิร์นนี้
                </span>
              )}
            </div>
            <div className="text-[9px] text-white/50 flex items-center gap-1.5 font-bold">
              <span>ช่อง #{player.position}</span>
              <span>·</span>
              <span className="text-amber-400">⚔️ {totalDmg} DMG</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <div className="text-[10px] font-black text-amber-400 bg-amber-950/50 px-2 py-0.5 rounded-lg border border-amber-500/30">
            💰 {player.gold}
          </div>
          <span className="text-xs text-white/40">{isExpanded ? "▲" : "▼"}</span>
        </div>
      </div>

      {/* Expanded Content Panel */}
      {isExpanded && (
        <div className="p-3 space-y-2.5 text-xs animate-fade-in border-t border-white/5">
          {/* Health Bar */}
          <div>
            <div className="flex justify-between items-center text-[10px] font-bold text-white/80 mb-1">
              <span>❤️ พลังชีวิต</span>
              <span className="font-black text-emerald-400">
                {Math.max(0, player.hp)} / {player.maxHp} HP
              </span>
            </div>
            <div className="w-full h-2.5 bg-black/60 rounded-full overflow-hidden p-0.5 border border-white/10">
              <motion.div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.7)]"
                initial={false}
                animate={{ width: `${hpPct}%` }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
              />
            </div>
          </div>

          {/* Buff State Indicators */}
          <BuffBadges player={player} />

          {/* Game Equipment Inventory Slots */}
          <div>
            <div className="text-[9px] font-black uppercase tracking-wider text-white/40 mb-1">🛡️ อุปกรณ์สวมใส่</div>
            <div className="grid grid-cols-4 gap-1.5">
              {equipSlots.map((slot, idx) => {
                const slotContent = (
                  <div
                    className={`h-8 rounded-lg border flex flex-col items-center justify-center p-0.5 text-center relative overflow-hidden transition-all ${
                      slot.item
                        ? "border-yellow-500/50 bg-yellow-950/20 text-yellow-300"
                        : "border-white/10 bg-black/40 text-white/20"
                    }`}
                  >
                    {slot.item && slot.img ? (
                      <>
                        <img
                          src={slot.img}
                          alt={slot.item}
                          className="w-full h-full object-contain p-0.5 absolute inset-0"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                            if (e.currentTarget.nextElementSibling) {
                              e.currentTarget.nextElementSibling.style.display = "flex";
                            }
                          }}
                        />
                        <span className="hidden w-full h-full items-center justify-center text-[10px]">{slot.icon}</span>
                      </>
                    ) : (
                      <span className="text-[10px]">{slot.icon}</span>
                    )}
                    <span className="text-[8px] font-black truncate w-full relative z-10 bg-black/40 px-0.5 rounded">{slot.item || slot.type}</span>
                  </div>
                );

                return (
                  <ItemTooltip key={idx} item={slot.itemData} position="top">
                    {slotContent}
                  </ItemTooltip>
                );
              })}
            </div>
          </div>

          {/* Potion Pouch Slots */}
          <div>
            <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-wider text-white/40 mb-1">
              <span>🧪 กระเป๋ายา ({(player.potions || []).length}/5)</span>
            </div>
            <div className="grid grid-cols-5 gap-1">
              {potionSlots.map((potId, idx) => {
                const pot = potId ? POTIONS[potId] : null;
                const potItem = pot
                  ? { ...pot, categoryTh: "🧪 ยาปรุง" }
                  : { name: `ช่องว่าง (กระเป๋ายา #${idx + 1})`, categoryTh: "🧪 กระเป๋ายา", description: "ยังไม่มีน้ำยาในช่องนี้ (ซื้อยาได้จากร้านค้า)", icon: "🧪" };

                const potBtn = (
                  <button
                    onClick={() => potId && onUsePotion && onUsePotion(potId, playerIndex)}
                    disabled={!potId}
                    className={`h-8 w-full rounded-lg border flex items-center justify-center text-sm transition-all ${
                      pot
                        ? "border-emerald-500/40 bg-emerald-950/30 text-white hover:scale-110 hover:border-emerald-400 cursor-pointer"
                        : "border-white/5 bg-black/30 text-white/10 cursor-not-allowed"
                    }`}
                  >
                    {pot ? (
                      pot.image ? (
                        <>
                          <img
                            src={pot.image}
                            alt={pot.name}
                            className="w-full h-full object-contain p-0.5"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                              if (e.currentTarget.nextElementSibling) {
                                e.currentTarget.nextElementSibling.style.display = "flex";
                              }
                            }}
                          />
                          <span className="hidden w-full h-full items-center justify-center text-sm" />
                        </>
                      ) : (
                        <span />
                      )
                    ) : (
                      "•"
                    )}
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

          {/* Skill Book Slots (2 Slots) */}
          <div>
            <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-wider text-white/40 mb-1">
              <span>✨ ช่องคาถาประจำบ้าน (2 สกิล)</span>
              {!isActive && <span className="text-[8px] text-amber-400 font-bold">⚡ สกิลตอบโต้</span>}
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {skillSlots.map((skillId, idx) => (
                <SkillButton
                  key={idx}
                  skillId={skillId}
                  playerIndex={playerIndex}
                  playerId={playerIndex}
                  cooldown={skillId ? player.skillCooldowns?.[skillId] || 0 : 0}
                  onUse={onUseSkill}
                  size="sm"
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
