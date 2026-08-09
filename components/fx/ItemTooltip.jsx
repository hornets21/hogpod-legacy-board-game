"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";

export default function ItemTooltip({ item, children }) {
  const [isHovered, setIsHovered] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0, placement: "top" });
  const containerRef = useRef(null);

  if (!item) return children;

  const handleMouseEnter = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 1000;

    // Default: float above the element
    let placement = "top";
    let x = rect.left + rect.width / 2;
    let y = rect.top - 8;

    // If too close to the top of screen (< 180px), float below instead
    if (rect.top < 180) {
      placement = "bottom";
      y = rect.bottom + 8;
    }

    // Keep X within viewport padded bounds
    x = Math.max(140, Math.min(viewportWidth - 140, x));

    setCoords({ x, y, placement });
    setIsHovered(true);
  };

  const {
    name,
    nameTh,
    nameEn,
    categoryTh,
    description,
    image,
    icon,
    dmgBonus,
    hpBonus,
    dmg,
    healAmount,
    cdReduce,
    cooldown,
    duration,
    price,
  } = item;

  const displayName = nameTh || name || "ไอเทม";

  // Build stat tags
  const stats = [];
  if (dmgBonus) stats.push({ label: "DMG", value: `${dmgBonus > 0 ? "+" : ""}${dmgBonus}`, color: "text-amber-400" });
  if (dmg) stats.push({ label: "DMG", value: `${dmg}`, color: "text-red-400" });
  if (hpBonus) stats.push({ label: "HP", value: `${hpBonus > 0 ? "+" : ""}${hpBonus}`, color: hpBonus > 0 ? "text-emerald-400" : "text-rose-400" });
  if (healAmount) stats.push({ label: "HEAL", value: `+${healAmount} HP`, color: "text-emerald-400" });
  if (cdReduce) stats.push({ label: "COOLDOWN", value: `-${cdReduce}T`, color: "text-cyan-400" });
  if (cooldown) stats.push({ label: "CD", value: `${cooldown}T`, color: "text-purple-300" });
  if (duration) stats.push({ label: "DURATION", value: `${duration}T`, color: "text-blue-300" });
  if (price) stats.push({ label: "PRICE", value: `${price.toLocaleString()}G`, color: "text-yellow-400" });

  return (
    <div
      ref={containerRef}
      className="relative inline-block w-full"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children}

      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: coords.placement === "top" ? 6 : -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            style={{
              position: "fixed",
              left: `${coords.x}px`,
              top: `${coords.y}px`,
              transform: coords.placement === "top" ? "translate(-50%, -100%)" : "translate(-50%, 0)",
            }}
            className="z-[99999] w-64 p-3 rounded-2xl bg-slate-950/98 border-2 border-amber-500/70 shadow-[0_15px_40px_rgba(0,0,0,0.95)] backdrop-blur-2xl pointer-events-none text-left"
          >
            {/* Header */}
            <div className="flex items-center gap-2.5 pb-2 mb-2 border-b border-white/10">
              <div className="w-9 h-9 rounded-xl border border-amber-400/50 bg-black/70 shrink-0 overflow-hidden flex items-center justify-center shadow-inner">
                {image ? (
                  <img
                    src={image}
                    alt={displayName}
                    className="w-full h-full object-contain p-0.5"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                      if (e.currentTarget.nextElementSibling) {
                        e.currentTarget.nextElementSibling.style.display = "flex";
                      }
                    }}
                  />
                ) : null}
                <span className={`${image ? "hidden" : "flex"} text-base`}>{icon || "✨"}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-black text-white text-xs truncate">{displayName}</span>
                  {categoryTh && (
                    <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-md bg-amber-950/90 border border-amber-500/50 text-amber-300 shrink-0">
                      {categoryTh}
                    </span>
                  )}
                </div>
                {nameEn && <div className="text-[9px] text-white/50 font-bold truncate">{nameEn}</div>}
              </div>
            </div>

            {/* Stats Row */}
            {stats.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap mb-2">
                {stats.map((s, idx) => (
                  <span
                    key={idx}
                    className={`text-[9px] font-black px-2 py-0.5 rounded-lg bg-black/70 border border-white/10 ${s.color}`}
                  >
                    {s.label}: {s.value}
                  </span>
                ))}
              </div>
            )}

            {/* Description */}
            {description && (
              <p className="text-[10px] text-white/90 leading-relaxed font-medium">
                {description}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
