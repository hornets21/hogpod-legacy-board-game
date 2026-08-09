"use client";

// ============================================================
// BuffBadges — แสดง indicator บน PlayerCard ว่า player ได้รับ
// บัฟสถานะอะไรอยู่บ้าง (อมตะ / +dmg / ล็อกเต๋า / แบงค์)
// ขึ้น-ลงด้วย AnimatePresence ดูแล้ว "เกมไม่แห้ง"
// ============================================================

import { motion, AnimatePresence } from "motion/react";

const BUFFS = {
  invincible: { icon: "🛡️", label: "อมตะ", color: "#3b82f6" },
  temp_dmg:   { icon: "⚔️", label: "+DMG", color: "#f59e0b" },
  lock_dice:  { icon: "🐍", label: "ล็อกเต๋า", color: "#22c55e" },
  bank:       { icon: "🏦", label: "แบงค์", color: "#eab308" },
};

function Badge({ buffId, duration = 0, amount = 0 }) {
  const cfg = BUFFS[buffId];
  if (!cfg) return null;

  return (
    <motion.div
      layout
      initial={{ y: -8, opacity: 0, scale: 0.7 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: -8, opacity: 0, scale: 0.6 }}
      transition={{ type: "spring", stiffness: 500, damping: 25 }}
      className="px-1.5 py-0.5 rounded-full text-[9px] font-black flex items-center gap-0.5 border"
      style={{
        color: cfg.color,
        borderColor: `${cfg.color}66`,
        backgroundColor: `${cfg.color}1f`,
        boxShadow: `0 0 6px ${cfg.color}50`,
      }}
      title={cfg.label}
    >
      <span className="text-[10px] leading-none">{cfg.icon}</span>
      <span className="leading-none">
        {buffId === "temp_dmg" && amount > 0
          ? `+${amount}`
          : buffId === "lock_dice" && amount > 0
          ? `เต๋า (${amount})`
          : cfg.label}
        {duration > 0 && (
          <span className="ml-0.5 text-white/60">{duration}T</span>
        )}
      </span>
    </motion.div>
  );
}

export default function BuffBadges({ player }) {
  if (!player) return null;

  const activeBuffs = [];

  // invincible
  if (player.isInvincible && (player.invincibleTurns || 0) > 0) {
    activeBuffs.push({ buffId: "invincible", duration: player.invincibleTurns });
  }
  // temp_dmg buff (จาก skill / potion)
  if ((player.tempDmgBonus || 0) > 0 && (player.tempDmgTurns || 0) > 0) {
    activeBuffs.push({
      buffId: "temp_dmg",
      duration: player.tempDmgTurns,
      amount: player.tempDmgBonus,
    });
  }
  // lock_dice (nextRollOverride)
  if (player.nextRollOverride) {
    activeBuffs.push({ buffId: "lock_dice", duration: 1, amount: player.nextRollOverride });
  }
  // bank / dodge buff (pet)
  if (player.pet?.effect === "dodge_once" && !player.dodgeUsed) {
    activeBuffs.push({ buffId: "bank", duration: 0 });
  }

  if (activeBuffs.length === 0) return null;

  return (
    <motion.div
      layout
      className="flex flex-wrap gap-1 mt-1 px-1"
    >
      <AnimatePresence mode="popLayout">
        {activeBuffs.map((b, i) => (
          <Badge key={b.buffId} buffId={b.buffId} duration={b.duration} amount={b.amount} />
        ))}
      </AnimatePresence>
    </motion.div>
  );
}