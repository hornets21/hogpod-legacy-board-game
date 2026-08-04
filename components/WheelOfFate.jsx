"use client";

import { useState } from "react";

export default function WheelOfFate({ monster, player, onSpinComplete }) {
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [spunResult, setSpunResult] = useState(null);

  // ตัวเลือกสเตตัสตามโจทย์: DMG 1-30, HP เหลือ 10 ทุกอันชั่วคราว
  const segments = [
    { label: "⚔️ DMG 1-5 | 🩸 HP 10", getStats: () => ({ dmg: Math.floor(Math.random() * 5) + 1, hp: 10 }), color: "#22c55e", text: "มอนสเตอร์สุ่มได้ ดาเมจ 1-5 / เลือด 10!" },
    { label: "⚔️ DMG 6-12 | 🩸 HP 10", getStats: () => ({ dmg: Math.floor(Math.random() * 7) + 6, hp: 10 }), color: "#3b82f6", text: "มอนสเตอร์สุ่มได้ ดาเมจ 6-12 / เลือด 10!" },
    { label: "⚔️ DMG 13-20 | 🩸 HP 10", getStats: () => ({ dmg: Math.floor(Math.random() * 8) + 13, hp: 10 }), color: "#eab308", text: "มอนสเตอร์สุ่มได้ ดาเมจ 13-20 / เลือด 10!" },
    { label: "⚔️ DMG 21-30 | 🩸 HP 10", getStats: () => ({ dmg: Math.floor(Math.random() * 10) + 21, hp: 10 }), color: "#a855f7", text: "มอนสเตอร์สุ่มได้ ดาเมจ 21-30 / เลือด 10!" },
    { label: "💥 DMG 15-25 | 🩸 HP 10", getStats: () => ({ dmg: Math.floor(Math.random() * 11) + 15, hp: 10 }), color: "#ef4444", text: "มอนสเตอร์สุ่มได้ ดาเมจ 15-25 / เลือด 10!" },
    { label: "💀 DMG 30 | 🩸 HP 10", getStats: () => ({ dmg: 30, hp: 10 }), color: "#6b7280", text: "มอนสเตอร์สุ่มได้ ค่าพลังสูงสุด ดาเมจ 30 / เลือด 10!" },
  ];

  function spinWheel() {
    if (spinning || spunResult) return;

    setSpinning(true);
    // Random spin: 5 to 10 full turns + random segment angle
    const selectedIndex = Math.floor(Math.random() * segments.length);
    const segmentDegree = 360 / segments.length;
    const targetDegree = 360 * 5 + (360 - selectedIndex * segmentDegree - segmentDegree / 2);

    setRotation(targetDegree);

    setTimeout(() => {
      setSpinning(false);
      const selectedSeg = segments[selectedIndex];
      const { dmg, hp } = selectedSeg.getStats();
      const resultObj = { ...selectedSeg, dmg, hp };
      setSpunResult(resultObj);

      // Compare stats after spin to decide winner
      const playerDmg = player.baseDmg + (player.wand?.dmgBonus || 0) + (player.amulet?.dmgBonus || 0) + (player.tempDmgBonus || 0);
      const playerHp = player.hp;

      // 1. ผู้เล่นรอดชีวิตจากพลังโจมตีมอนสเตอร์ (HP ผู้เล่น > DMG มอนสเตอร์)
      const isPlayerAlive = player.isInvincible || playerHp > dmg;
      // 2. ผู้เล่นต้องมีพลังโจมตีเพียงพอสำหรับล้มมอนสเตอร์ (Player DMG >= Monster HP)
      const isMonsterDefeated = isPlayerAlive && playerDmg >= hp;

      const outcome = isMonsterDefeated ? "win" : "lose";

      setTimeout(() => {
        onSpinComplete({ outcome, spunDmg: dmg, spunHp: hp, text: selectedSeg.text });
      }, 2000);
    }, 4000);
  }

  return (
    <div className="flex flex-col items-center gap-5 py-2">
      <div className="text-center">
        <h3 className="text-base font-black text-yellow-400">🎰 วงล้อสุ่มสเตตัสมอนสเตอร์ (Stat Roulette)</h3>
        <p className="text-xs text-white/60">หมุนวงล้อเพื่อสุ่มพลังโจมตีและเลือดของมอนสเตอร์ แล้ววัดผลแพ้-ชนะ!</p>
      </div>

      {/* Wheel Container */}
      <div className="relative w-64 h-64">
        {/* Pointer Indicator */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 text-3xl text-red-500 drop-shadow-md">
          ▼
        </div>

        {/* The Wheel */}
        <div
          className="w-full h-full rounded-full border-4 border-yellow-500/60 relative overflow-hidden shadow-[0_0_35px_rgba(240,184,91,0.3)]"
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: spinning ? "transform 4s cubic-bezier(0.15, 0.9, 0.2, 1)" : "none",
          }}
        >
          {segments.map((seg, idx) => {
            const angle = (360 / segments.length) * idx;
            return (
              <div
                key={idx}
                className="absolute w-1/2 h-1/2 top-0 right-0 origin-bottom-left flex items-center justify-center p-2 text-[10px] font-black text-white select-none border border-black/20"
                style={{
                  backgroundColor: seg.color,
                  transform: `rotate(${angle}deg)`,
                  clipPath: "polygon(0 0, 100% 0, 0 100%)",
                }}
              >
                <span
                  className="transform -rotate-45 translate-x-2 -translate-y-2 text-center leading-tight drop-shadow-md font-black"
                >
                  {seg.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Result announcement */}
      {spunResult ? (
        <div className="text-center space-y-1 animate-bounce">
          <div className="text-sm font-bold text-yellow-300">{spunResult.text}</div>
          <div className="text-xs text-white/70">
            ผลการสุ่ม: 💀 Monster DMG {spunResult.dmg} | 🩸 Monster HP {spunResult.hp}
          </div>
        </div>
      ) : (
        <button
          onClick={spinWheel}
          disabled={spinning}
          className={`btn-primary text-sm px-8 py-3 rounded-xl font-black shadow-lg ${
            spinning ? "opacity-50 cursor-not-allowed" : "hover:scale-105"
          }`}
        >
          {spinning ? "🌀 กำลังสุ่มสเตตัสมอนสเตอร์..." : "🎲 หมุนสุ่มพลังมอนสเตอร์!"}
        </button>
      )}
    </div>
  );
}
