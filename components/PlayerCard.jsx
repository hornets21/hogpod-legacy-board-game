"use client";

import { getTotalDmg } from "@/lib/gameEngine";
import { SKILLS, POTIONS } from "@/lib/gameData";

export default function PlayerCard({ player, isActive, onUseSkill, onUsePotion }) {
  const totalDmg = getTotalDmg(player);
  const hpPct = Math.max(0, (player.hp / player.maxHp) * 100);

  // Equipment slots helper
  const equipSlots = [
    { type: "Wand", icon: "🪄", item: player.wand ? (player.wand.type === "vip" ? "VIP Wand" : "Common Wand") : null },
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
      className={`game-panel-card relative rounded-2xl p-3.5 border transition-all duration-300 ${
        isActive
          ? "border-yellow-400 bg-slate-900/95 shadow-[0_0_20px_rgba(240,184,91,0.25)]"
          : "border-white/10 bg-slate-950/80 hover:border-white/20"
      }`}
      style={{ "--house-color": player.color }}
    >
      {/* Top Banner: House Crest & Player Name */}
      <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-2.5 mb-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-10 h-10 rounded-xl border-2 overflow-hidden bg-black flex-shrink-0 shadow-md" style={{ borderColor: player.color }}>
            {player.image ? (
              <img src={player.image} alt={player.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-xl flex items-center justify-center h-full">{player.emoji}</span>
            )}
          </div>
          <div className="min-w-0">
            <h3 className="font-black text-white text-sm truncate">{player.name}</h3>
            <p className="text-[10px] text-white/50 font-bold truncate">{player.nameEn} · {player.memberCount} คน</p>
          </div>
        </div>

        {/* Board Tile Badge */}
        <div className="flex flex-col items-end flex-shrink-0">
          <span className="text-[9px] font-black uppercase text-yellow-500/80 tracking-wider">ช่องเดิน</span>
          <span className="text-xl font-black text-yellow-400 leading-none">#{player.position}</span>
        </div>
      </div>

      {/* RPG Health & Attack Bars */}
      <div className="space-y-2 mb-3">
        {/* HP Bar */}
        <div className="space-y-0.5">
          <div className="flex justify-between text-[10px] font-bold text-white/70">
            <span>❤️ HP</span>
            <span className="text-emerald-400 font-black">{Math.max(0, player.hp)} / {player.maxHp}</span>
          </div>
          <div className="w-full h-2.5 bg-black/60 rounded-full border border-white/10 overflow-hidden">
            <div
              className="h-full transition-all duration-300 rounded-full"
              style={{
                width: `${hpPct}%`,
                backgroundColor: hpPct > 50 ? "#22c55e" : hpPct > 25 ? "#eab308" : "#ef4444",
              }}
            />
          </div>
        </div>

        {/* Stats Grid: Attack Dmg & Gold */}
        <div className="grid grid-cols-2 gap-2 text-xs pt-0.5">
          <div className="bg-black/40 border border-white/5 rounded-xl p-1.5 px-2.5 flex items-center justify-between">
            <span className="text-[10px] font-bold text-white/50">⚔️ DMG</span>
            <span className="font-black text-orange-400">{totalDmg}</span>
          </div>
          <div className="bg-black/40 border border-white/5 rounded-xl p-1.5 px-2.5 flex items-center justify-between">
            <span className="text-[10px] font-bold text-white/50">💰 GOLD</span>
            <span className="font-black text-yellow-400">{player.gold.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Game Equipment Inventory Slots (4 Grid Slots) */}
      <div className="mb-3">
        <div className="text-[9px] font-black uppercase tracking-wider text-white/40 mb-1">🛡️ ช่องอุปกรณ์สวมใส่อาวุธ</div>
        <div className="grid grid-cols-4 gap-1.5">
          {equipSlots.map((slot, idx) => (
            <div
              key={idx}
              className={`h-9 rounded-lg border flex flex-col items-center justify-center p-1 text-center relative overflow-hidden transition-all ${
                slot.item
                  ? "border-yellow-500/50 bg-yellow-950/20 text-yellow-300"
                  : "border-white/10 bg-black/40 text-white/20"
              }`}
              title={slot.item ? `${slot.type}: ${slot.item}` : `ช่องว่าง (${slot.type})`}
            >
              <span className="text-xs">{slot.icon}</span>
              <span className="text-[8px] font-black truncate w-full">{slot.item || slot.type}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Potion Pouch Slots (5 Slots) */}
      <div className="mb-3">
        <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-wider text-white/40 mb-1">
          <span>🧪 ช่องกระเป๋ายา</span>
          <span>({player.potions.length}/5)</span>
        </div>
        <div className="grid grid-cols-5 gap-1">
          {potionSlots.map((potId, idx) => {
            const pot = potId ? POTIONS[potId] : null;
            return (
              <button
                key={idx}
                onClick={() => potId && isActive && onUsePotion && onUsePotion(potId)}
                disabled={!potId || !isActive}
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

      {/* Skill Book Slots (2 Slots) */}
      <div>
        <div className="text-[9px] font-black uppercase tracking-wider text-white/40 mb-1">✨ ช่องคาถาประจำบ้าน (2 สกิล)</div>
        <div className="grid grid-cols-2 gap-1.5">
          {skillSlots.map((skillId, idx) => {
            const skill = skillId ? SKILLS[skillId] : null;
            const cd = skillId ? player.skillCooldowns[skillId] || 0 : 0;
            return (
              <button
                key={idx}
                onClick={() => skillId && isActive && cd === 0 && onUseSkill && onUseSkill(skillId)}
                disabled={!skillId || !isActive || cd > 0}
                className={`h-9 px-2 rounded-lg border flex items-center gap-1.5 text-left text-xs font-bold transition-all ${
                  skill
                    ? cd > 0
                      ? "border-white/10 bg-black/50 text-white/30 cursor-not-allowed"
                      : "border-purple-500/50 bg-purple-950/30 text-purple-300 hover:border-purple-400 cursor-pointer"
                    : "border-white/5 bg-black/30 text-white/10 cursor-not-allowed"
                }`}
                title={skill ? skill.description : "ยังไม่ได้รับการฝึกคาถา"}
              >
                <span className="text-sm">{skill ? skill.emoji : "🔮"}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-black truncate">{skill ? skill.name : "ว่าง"}</div>
                </div>
                {cd > 0 && <span className="text-[8px] bg-red-950 text-red-400 border border-red-500/30 px-1 rounded font-black">{cd}T</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
