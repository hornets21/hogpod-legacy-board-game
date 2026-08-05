"use client";

import { useState } from "react";
import { getTotalDmg } from "@/lib/gameEngine";

export default function WheelOfFate({ monster, player, onSpinComplete }) {
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [spunResult, setSpunResult] = useState(null);

  const playerDmg = getTotalDmg(player);
  const playerHp = Math.max(1, player?.hp || 1);
  const tierMult = monster?.isBoss ? 1.25 : monster?.isElite ? 1.1 : 1.0;

  // ตัวเลือกสเตตัสสุ่มโดยคำนวณอิงจากค่าพลังของผู้เล่น (Opponent Stats) + สุ่มเปอร์เซ็นต์
  const segments = [
    {
      label: "⚔️ DMG ~40% | 🩸 HP ~65%",
      getStats: () => {
        const hp = Math.max(5, Math.round(playerDmg * (0.50 + Math.random() * 0.25) * tierMult));
        const dmg = Math.max(1, Math.round(playerHp * (0.30 + Math.random() * 0.20) * tierMult));
        return { hp, dmg };
      },
      color: "#22c55e",
      text: "มอนสเตอร์สุ่มได้สเตตัสระดับง่าย (Easy Roll)",
    },
    {
      label: "⚔️ DMG ~70% | 🩸 HP ~85%",
      getStats: () => {
        const hp = Math.max(5, Math.round(playerDmg * (0.70 + Math.random() * 0.30) * tierMult));
        const dmg = Math.max(1, Math.round(playerHp * (0.55 + Math.random() * 0.25) * tierMult));
        return { hp, dmg };
      },
      color: "#3b82f6",
      text: "มอนสเตอร์สุ่มได้สเตตัสปานกลางสูสี (Balanced Roll)",
    },
    {
      label: "💥 DMG ~110% | 🩸 HP ~55%",
      getStats: () => {
        const hp = Math.max(5, Math.round(playerDmg * (0.40 + Math.random() * 0.25) * tierMult));
        const dmg = Math.max(1, Math.round(playerHp * (0.90 + Math.random() * 0.30) * tierMult));
        return { hp, dmg };
      },
      color: "#eab308",
      text: "มอนสเตอร์สุ่มได้ ดาเมจรุนแรงแต่เลือดน้อย! (Glass Cannon)",
    },
    {
      label: "🛡️ DMG ~75% | 🩸 HP ~125%",
      getStats: () => {
        const hp = Math.max(5, Math.round(playerDmg * (1.10 + Math.round(Math.random() * 30) / 100) * tierMult));
        const dmg = Math.max(1, Math.round(playerHp * (0.60 + Math.random() * 0.25) * tierMult));
        return { hp, dmg };
      },
      color: "#a855f7",
      text: "มอนสเตอร์สุ่มได้ เลือดอึดถึกทาน! (Tank Roll)",
    },
    {
      label: "⚠️ DMG ~115% | 🩸 HP ~120%",
      getStats: () => {
        const hp = Math.max(5, Math.round(playerDmg * (1.00 + Math.random() * 0.35) * tierMult));
        const dmg = Math.max(1, Math.round(playerHp * (1.00 + Math.random() * 0.30) * tierMult));
        return { hp, dmg };
      },
      color: "#f97316",
      text: "มอนสเตอร์สุ่มได้สเตตัสเสี่ยงสูง! (High Risk)",
    },
    {
      label: "💀 DMG ~135% | 🩸 HP ~140%",
      getStats: () => {
        const hp = Math.max(5, Math.round(playerDmg * (1.20 + Math.random() * 0.40) * tierMult));
        const dmg = Math.max(1, Math.round(playerHp * (1.15 + Math.random() * 0.35) * tierMult));
        return { hp, dmg };
      },
      color: "#ef4444",
      text: "มอนสเตอร์สุ่มได้สเตตัสบ้าคลั่ง! (Lethal Boss Roll)",
    },
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

      // Compare stats after spin to decide winner
      const currentDmg = getTotalDmg(player);
      const currentHp = player.hp;

      // 1. ผู้เล่นรอดชีวิตจากพลังโจมตีมอนสเตอร์ (HP ผู้เล่น > DMG มอนสเตอร์)
      const isPlayerAlive = player.isInvincible || currentHp > dmg;
      // 2. ผู้เล่นต้องมีพลังโจมตีเพียงพอสำหรับล้มมอนสเตอร์ (Player DMG >= Monster HP)
      const isMonsterDefeated = isPlayerAlive && currentDmg >= hp;

      const outcome = isMonsterDefeated ? "win" : "lose";

      setSpunResult({
        ...selectedSeg,
        dmg,
        hp,
        outcome,
        playerDmg: currentDmg,
        playerHp: currentHp,
      });
    }, 4000);
  }

  const handleConfirmResult = () => {
    if (!spunResult) return;
    onSpinComplete({
      outcome: spunResult.outcome,
      spunDmg: spunResult.dmg,
      spunHp: spunResult.hp,
      text: spunResult.text,
    });
  };

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

      {/* Result announcement & manual close button */}
      {spunResult ? (
        <div className="flex flex-col items-center gap-3 w-full max-w-sm animate-fade-in">
          <div
            className={`w-full p-4 rounded-2xl border-2 text-center shadow-xl backdrop-blur-md ${
              spunResult.outcome === "win"
                ? "bg-emerald-950/90 border-emerald-500 text-emerald-300 shadow-[0_0_30px_rgba(16,185,129,0.4)]"
                : "bg-red-950/90 border-red-500 text-red-300 shadow-[0_0_30px_rgba(239,68,68,0.4)]"
            }`}
          >
            <div className="text-2xl font-black mb-1">
              {spunResult.outcome === "win" ? "🎉 ชนะการต่อสู้! (VICTORY)" : "💀 พ่ายแพ้ในการต่อสู้! (DEFEAT)"}
            </div>
            <div className="text-xs font-bold mb-2 text-white/80">{spunResult.text}</div>

            <div className="text-xs bg-black/60 p-2.5 rounded-xl border border-white/10 space-y-1 text-left">
              <div className="flex justify-between">
                <span className="text-white/70">พลังโจมตีผู้เล่น:</span>
                <span className="font-bold text-amber-400">{spunResult.playerDmg}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/70">เลือดผู้เล่น:</span>
                <span className="font-bold text-emerald-400">{spunResult.playerHp} HP</span>
              </div>
              <div className="flex justify-between border-t border-white/10 pt-1 mt-1">
                <span className="text-white/70">มอนสเตอร์สุ่มได้:</span>
                <span className="font-bold text-red-400">DMG {spunResult.dmg} | HP {spunResult.hp}</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleConfirmResult}
            className={`w-full py-3.5 px-6 rounded-xl font-black text-base shadow-2xl transition-all hover:scale-105 active:scale-95 ${
              spunResult.outcome === "win"
                ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-400 hover:to-teal-400 shadow-emerald-500/50"
                : "bg-gradient-to-r from-red-600 to-rose-600 text-white hover:from-red-500 hover:to-rose-500 shadow-red-500/50"
            }`}
          >
            {spunResult.outcome === "win" ? "🏆 รับรางวัล & ปิดหน้าต่าง" : "💀 ยืนยันผล & ปิดหน้าต่าง"}
          </button>
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

