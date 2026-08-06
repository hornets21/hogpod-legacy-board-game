"use client";

// ============================================================
// DamagePopup — เลขดาเมจ/ฮีล ที่เด้งขึ้นจาก PlayerCard
// ของผู้โดน (DOM overlay ไม่ใช่ 3D project)
// ขับเคลื่อนด้วย event bus, AnimatePresence ทำ lifecycle
// ============================================================

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { on, FX_EVENTS } from "@/lib/skillFxBus";

let _popupId = 0;

export default function DamagePopup({ playerIndex }) {
  // array ของ popup { id, amount, type, color }
  const [popups, setPopups] = useState([]);

  // Helper สำหรับ get color ตามประเภท
  const colorFor = useCallback((type) => {
    switch (type) {
      case "skill_player":  return "#ef4444"; // แดง
      case "skill_monster": return "#f59e0b"; // ส้ม
      case "monster":       return "#ef4444";
      case "heal":          return "#22c55e"; // เขียว
      case "gold":          return "#facc15"; // เหลืองทอง MOBA Gold
      case "buff":          return "#fbbf24"; // ทอง
      case "monster_died":  return "#a855f7"; // ม่วง
      default:              return "#ef4444";
    }
  }, []);

  // Push popup ค้างไว้ 1.1s แล้วเอาออก ป้องกัน memory บวม
  const pushPopup = useCallback((payload) => {
    if (payload.targetIndex !== playerIndex) return;

    // ถ้า amount = 0 ไม่ต้องโชว์
    if (payload.amount !== undefined && payload.amount !== 0) {
      const id = ++_popupId;
      setPopups((prev) => [
        ...prev.slice(-4), // cap 5 popups
        { id, amount: payload.amount, type: payload.type || "skill_player" },
      ]);
      setTimeout(() => {
        setPopups((prev) => prev.filter((p) => p.id !== id));
      }, 1100);
    }
  }, [playerIndex]);

  useEffect(() => {
    // Subscribe ทั้ง damage + heal + gold event
    const unsubDamage = on(FX_EVENTS.DAMAGE_DEALT, pushPopup);
    const unsubHeal = on(FX_EVENTS.HEAL, (p) => {
      pushPopup({ targetIndex: p.targetIndex, amount: p.amount, type: "heal" });
    });
    const unsubGold = on(FX_EVENTS.GOLD_GAIN, (p) => {
      pushPopup({ targetIndex: p.targetIndex, amount: p.amount, type: "gold" });
    });

    return () => {
      unsubDamage();
      unsubHeal();
      unsubGold();
    };
  }, [pushPopup]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-visible flex items-center justify-center z-50">
      <AnimatePresence>
        {popups.map((p, idx) => (
          <motion.div
            key={p.id}
            initial={{ y: 0, opacity: 0, scale: 0.4 }}
            animate={{ y: -50 - (popups.length - idx - 1) * 12, opacity: 1, scale: 1.3 }}
            exit={{ y: -80, opacity: 0, scale: 0.8 }}
            transition={{ duration: 1.05, ease: "easeOut" }}
            className="absolute font-black text-2xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] select-none"
            style={{
              color: colorFor(p.type),
              textShadow: `0 0 10px ${colorFor(p.type)}`,
            }}
          >
            {p.type === "heal" || p.type === "gold" ? "+" : "-"}
            {p.amount}
            <span className="text-xs ml-0.5 opacity-90">
              {p.type === "heal" ? "HP" : p.type === "gold" ? "Gold" : "DMG"}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}