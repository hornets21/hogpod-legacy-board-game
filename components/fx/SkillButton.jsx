"use client";

// ============================================================
// SkillButton — ปุ่มสกิลพร้อมเอฟเฟกต์ครบ:
// • Cooldown Overlay (radial fill ratio จาก cd/maxCd)
// • Ability Cooldown UI (ตัวเลข cd แบบ animated)
// • Button Press Animation (whileTap scale, whileHover glow)
// • Cast Flash (ฟ้าเป็น ring ตอนผู้เล่นนี้ร่ายสกิล)
// • State Indicator (พร้อม buff badge ด้านในเมื่อ active)
// ============================================================

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { SKILLS } from "@/lib/gameData";
import { on, FX_EVENTS } from "@/lib/skillFxBus";

import ItemTooltip from "@/components/fx/ItemTooltip";

export default function SkillButton({
  skillId,
  playerIndex,        // index ของ player ที่เป็นเจ้าของสกิล (เพื่อตรวจ cast flash)
  cooldown = 0,       // cd ที่เหลือ
  playerId,           // id ของ player เพื่อใช้ตรวจ skill_cast event (playerId === playerIndex)
  onUse,              // callback(skillId)
  size = "md",        // "md" | "sm"
  selected = false,   // สถานะถูกเลือกไว้ (สำหรับ PvpCombatModal)
  disabled = false,
}) {
  const actualSkillId = typeof skillId === "object" ? skillId?.id : skillId;
  const skill = actualSkillId ? SKILLS[actualSkillId] : null;
  const [castFlash, setCastFlash] = useState(0); // key สำหรับ trigger flash

  const cd = actualSkillId ? cooldown || 0 : 0;
  const maxCd = skill?.cooldown || 1;
  const cooldownRatio = cd > 0 ? cd / maxCd : 0;
  const canUse = !!actualSkillId && cd === 0 && !disabled;

  // Listen skill_cast event เพื่อ trigger flash
  useEffect(() => {
    if (!actualSkillId) return;
    const unsub = on(FX_EVENTS.SKILL_CAST, (payload) => {
      if (payload.skillId === actualSkillId && payload.playerId === playerIndex) {
        setCastFlash((k) => k + 1);
      }
    });
    return unsub;
  }, [actualSkillId, playerIndex]);

  const sizeCls = size === "sm"
    ? "h-9 px-2 text-xs"
    : "h-12 px-3 text-sm";

  const skillItem = skill
    ? {
        ...skill,
        image: `/images/skills/${skill.id}_skill.webp`,
        icon: "🔮",
      }
    : null;

  const buttonElement = (
    <motion.button
      onClick={() => canUse && onUse && onUse(actualSkillId)}
      disabled={!canUse}
      whileTap={canUse ? { scale: 0.88 } : undefined}
      whileHover={canUse ? { scale: 1.06, boxShadow: "0 0 18px rgba(168,85,247,0.6)" } : undefined}
      transition={{ type: "spring", stiffness: 600, damping: 18 }}
      className={`relative w-full ${sizeCls} rounded-xl border flex items-center gap-1.5 text-left font-bold overflow-hidden transition-colors ${
        skill
          ? cd > 0
            ? "border-white/10 bg-black/50 text-white/40 cursor-not-allowed"
            : selected
            ? "border-amber-300 bg-amber-500/30 text-amber-100 ring-2 ring-amber-400/60 shadow-md"
            : "border-purple-500/50 bg-purple-950/40 text-purple-200 hover:border-purple-300 hover:bg-purple-900/60 cursor-pointer"
          : "border-white/5 bg-black/30 text-white/10 cursor-not-allowed"
      }`}
    >
      {/* Skill icon / placeholder */}
      <div className="w-6 h-6 rounded shrink-0 flex items-center justify-center overflow-hidden bg-black/40 z-10">
        {skill ? (
          <img
            src={`/images/skills/${skill.id}_skill.webp`}
            alt={skill.name}
            className="w-full h-full object-contain"
          />
        ) : (
          <span className="text-sm">🔮</span>
        )}
      </div>

      {/* Skill name */}
      <div className="min-w-0 flex-1 z-10">
        <div className="text-[10px] font-black truncate">
          {skill ? skill.nameTh || skill.name : "ว่าง"}
        </div>
        {size === "md" && skill && (
          <div className="text-[8px] text-white/50 truncate">{skill.description}</div>
        )}
      </div>

      {/* Cooldown Overlay (radial fade) — วงกลมที่บดบังปุ่มเท่ากับสัดส่วน cd/maxCd */}
      <AnimatePresence>
        {cd > 0 && (
          <motion.div
            key={`cd-${cd}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/80 backdrop-grayscale z-0"
            style={{
              clipPath: `polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 ${(1 - cooldownRatio) * 100}%)`,
            }}
          />
        )}
      </AnimatePresence>

      {/* Cooldown clock spinner */}
      <AnimatePresence>
        {cd > 0 && (
          <motion.div
            key="clock"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1, rotate: 360 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{
              scale: { duration: 0.2 },
              opacity: { duration: 0.2 },
              rotate: { repeat: Infinity, duration: 4, ease: "linear" },
            }}
            className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full border border-purple-400/50 border-t-transparent z-20"
          />
        )}
      </AnimatePresence>

      {/* Big CD number overlay */}
      <AnimatePresence>
        {cd > 0 && (
          <motion.div
            key={`cdnum-${cd}`}
            initial={{ scale: 0.4, opacity: 0, x: 10 }}
            animate={{ scale: 1, opacity: 1, x: 0 }}
            exit={{ scale: 1.6, opacity: 0, x: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 22 }}
            className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none"
          >
            <span className="text-lg font-black text-red-300 drop-shadow-[0_0_8px_rgba(248,113,113,0.7)]">
              {cd}
            </span>
            <span className="text-[7px] text-red-300/80 ml-0.5 self-end mb-1">T</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* "พร้อมใช้" indicator dot เมื่อ canUse */}
      <AnimatePresence>
        {canUse && (
          <motion.div
            key="ready"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)] z-20"
          />
        )}
      </AnimatePresence>

      {/* Cast Flash — burst ring ตอน cast (key เปลี่ยน → ทำซ้ำได้) */}
      <AnimatePresence>
        {castFlash > 0 && (
          <motion.div
            key={`flash-${castFlash}`}
            initial={{ scale: 0.4, opacity: 0.9 }}
            animate={{ scale: 2.5, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            onAnimationComplete={() => setCastFlash(0)}
            className="absolute inset-0 rounded-xl pointer-events-none z-30"
            style={{
              background:
                "radial-gradient(circle at center, rgba(168,85,247,0.9) 0%, rgba(168,85,247,0) 70%)",
              mixBlendMode: "screen",
            }}
          />
        )}
      </AnimatePresence>
    </motion.button>
  );

  if (skillItem) {
    return <ItemTooltip item={skillItem} position="top">{buttonElement}</ItemTooltip>;
  }

  return buttonElement;
}