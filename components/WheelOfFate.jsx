"use client";

import { useState, useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import { getTotalDmg } from "@/lib/gameEngine";

const WheelOfFate = forwardRef(function WheelOfFate(
  { monster, player, onSpinComplete, spinTrigger, onSpinStateChange, autoSpin = false },
  ref
) {
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [spunResult, setSpunResult] = useState(null);

  const onSpinCompleteRef = useRef(onSpinComplete);
  onSpinCompleteRef.current = onSpinComplete;
  const onSpinStateChangeRef = useRef(onSpinStateChange);
  onSpinStateChangeRef.current = onSpinStateChange;
  const isBot = Boolean(player?.isBot);

  useEffect(() => {
    if (autoSpin && !spinning && !spunResult) {
      const timer = setTimeout(() => {
        spinWheel();
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [autoSpin]);

  const playerDmg = getTotalDmg(player);
  const playerHp = Math.max(1, player?.hp || 1);
  const tierMult = monster?.isBoss ? 1.25 : monster?.isElite ? 1.1 : 1.0;

  const baseMonsterHp = typeof monster?.currentHp === "number" ? monster.currentHp : (typeof monster?.hp === "number" ? monster.hp : 50);
  const baseMonsterDmg = typeof monster?.dmg === "number" ? monster.dmg : 10;

  const segments = [
    {
      label: "EASY: DMG 50% | HP 50%",
      getStats: () => {
        const hp = Math.max(1, Math.round(baseMonsterHp * 0.50));
        const dmg = Math.max(1, Math.round(baseMonsterDmg * 0.50));
        return { hp, dmg };
      },
      color: "#15803d",
      text: "มอนสเตอร์สุ่มได้สเตตัสระดับง่าย (Easy Roll) — พลังและเลือดลดลง 50%!",
    },
    {
      label: "BALANCED: DMG 75% | HP 75%",
      getStats: () => {
        const hp = Math.max(1, Math.round(baseMonsterHp * 0.75));
        const dmg = Math.max(1, Math.round(baseMonsterDmg * 0.75));
        return { hp, dmg };
      },
      color: "#3730a3",
      text: "มอนสเตอร์สุ่มได้สเตตัสสมดุล (Balanced Roll) — พลังและเลือดลดลง 25%",
    },
    {
      label: "CANNON: DMG 120% | HP 50%",
      getStats: () => {
        const hp = Math.max(1, Math.round(baseMonsterHp * 0.50));
        const dmg = Math.max(1, Math.round(baseMonsterDmg * 1.20));
        return { hp, dmg };
      },
      color: "#a16207",
      text: "มอนสเตอร์สุ่มได้ สายโจมตีรุนแรง! (Glass Cannon) — ดาเมจสูงขึ้น เลือดลดลง 50%",
    },
    {
      label: "TANK: DMG 60% | HP 120%",
      getStats: () => {
        const hp = Math.max(1, Math.round(baseMonsterHp * 1.20));
        const dmg = Math.max(1, Math.round(baseMonsterDmg * 0.60));
        return { hp, dmg };
      },
      color: "#7e22ce",
      text: "มอนสเตอร์สุ่มได้ สายถึกทน! (Tank Roll) — เลือดอึดขึ้น 20% ดาเมจลดลง",
    },
    {
      label: "HARD: DMG 110% | HP 110%",
      getStats: () => {
        const hp = Math.max(1, Math.round(baseMonsterHp * 1.10));
        const dmg = Math.max(1, Math.round(baseMonsterDmg * 1.10));
        return { hp, dmg };
      },
      color: "#c2410c",
      text: "มอนสเตอร์สุ่มได้สเตตัสยาก! (Hard Roll) — เลือดและดาเมจเพิ่มขึ้น 10%",
    },
    {
      label: "LETHAL: DMG 130% | HP 130%",
      getStats: () => {
        const hp = Math.max(1, Math.round(baseMonsterHp * 1.30));
        const dmg = Math.max(1, Math.round(baseMonsterDmg * 1.30));
        return { hp, dmg };
      },
      color: "#b91c1c",
      text: "มอนสเตอร์สุ่มได้สเตตัสคลั่ง! (Lethal Roll) — เลือดและดาเมจเพิ่มขึ้น 30%!",
    },
  ];
  const segmentDegree = 360 / segments.length;
  const wheelBackground = `conic-gradient(${segments
    .map((seg, idx) => `${seg.color} ${idx * segmentDegree}deg ${(idx + 1) * segmentDegree}deg`)
    .join(", ")})`;

  useImperativeHandle(
    ref,
    () => ({
      spin: () => {
        if (!spinning && !spunResult) {
          spinWheel();
        }
      },
      isSpinning: spinning,
      hasResult: Boolean(spunResult),
    }),
    [spinning, spunResult]
  );

  useEffect(() => {
    if (spinTrigger && !spinning && !spunResult) {
      spinWheel();
    }
  }, [spinTrigger, spinning, spunResult]);

  function spinWheel() {
    if (spinning || spunResult) return;

    setSpinning(true);
    if (typeof onSpinStateChangeRef.current === "function") {
      onSpinStateChangeRef.current({ spinning: true, spunResult: null });
    }

    // Random spin: 5 to 10 full turns + random segment angle
    const selectedIndex = Math.floor(Math.random() * segments.length);
    const segDegree = 360 / segments.length;
    const targetDegree = 360 * 5 + (360 - selectedIndex * segDegree - segDegree / 2);

    setRotation(targetDegree);

    setTimeout(() => {
      setSpinning(false);
      const selectedSeg = segments[selectedIndex];
      const { dmg: rolledDmg, hp: rolledHpThreshold } = selectedSeg.getStats();

      const currentDmg = getTotalDmg(player);
      const currentHp = player.hp;
      const monsterHp = typeof monster?.currentHp === "number" ? monster.currentHp : (monster?.hp || 50);

      // ผู้เล่นชนะการปะทะหากพลังโจมตีผู้เล่น (playerDmg) >= rolledHpThreshold (เกณฑ์การปะทะของวงล้อ)
      const isWinClash = currentDmg >= rolledHpThreshold;
      const damageDealt = isWinClash ? currentDmg : Math.max(1, Math.round(currentDmg * 0.5));
      const remainingMonsterHp = Math.max(0, monsterHp - damageDealt);
      const outcome = isWinClash ? "win" : "lose";

      const res = {
        ...selectedSeg,
        dmg: rolledDmg,
        hp: rolledHpThreshold,
        outcome,
        playerDmg: currentDmg,
        playerHp: currentHp,
        damageDealt,
        remainingMonsterHp,
      };

      setSpunResult(res);
      if (typeof onSpinStateChangeRef.current === "function") {
        onSpinStateChangeRef.current({ spinning: false, spunResult: res });
      }
    }, 4500);
  }

  // Auto-spin for bot (or when viewer is spectating another player's fight)
  useEffect(() => {
    const isViewer = typeof onSpinComplete !== "function";
    if ((isBot || isViewer) && !spinning && !spunResult) {
      const timer = setTimeout(() => {
        spinWheel();
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [isBot, spinning, spunResult, typeof onSpinComplete]);

  // Auto-confirm result for bot after displaying victory/defeat banner (3.5s)
  useEffect(() => {
    if (spunResult && isBot) {
      const timer = setTimeout(() => {
        handleConfirmResult();
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [spunResult, isBot]);

  // Auto-resolve safety timer after spin result is ready
  const handleConfirmResult = () => {
    if (!spunResult) return;
    if (typeof onSpinCompleteRef.current === "function") {
      onSpinCompleteRef.current({
        outcome: spunResult.outcome,
        spunDmg: spunResult.dmg,
        spunHp: spunResult.hp,
        text: spunResult.text,
      });
    }
  };

  return (
    <div className="relative flex flex-col items-center justify-center select-none w-full max-w-sm mx-auto px-2">
      {/* Dynamic Floating Result HUD Banner */}
      {spunResult ? (
        <div className="w-full flex flex-col items-center gap-2 animate-fade-in z-30 mb-2">
          {/* Victory / Defeat Game Banner */}
          <div
            className={`w-full py-2 px-4 rounded-2xl border-2 text-center shadow-[0_0_30px_rgba(0,0,0,0.8)] backdrop-blur-md transition-transform duration-300 transform animate-bounce ${
              spunResult.outcome === "win"
                ? "bg-emerald-950/90 border-emerald-400 text-emerald-300 shadow-emerald-500/40"
                : "bg-red-950/90 border-red-400 text-red-300 shadow-red-500/40"
            }`}
          >
            <div className="text-xl md:text-2xl font-black tracking-wider drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">
              {spunResult.outcome === "win" ? "CLASH VICTORY!" : "CLASH DEFEAT!"}
            </div>
            <div className="text-[11px] font-bold text-white/90 truncate mt-0.5">
              {spunResult.outcome === "win"
                ? `ชนะการปะทะ! สร้าง ${spunResult.damageDealt} ดาเมจใส่ ${monster?.name || "มอนสเตอร์"}`
                : `แพ้การปะทะ! โดนโจมตีสวนกลับ ${spunResult.dmg} ดาเมจ`}
            </div>
            <div className="text-[10px] font-black text-amber-300 mt-1 flex justify-center gap-3 bg-black/50 py-1 px-3 rounded-lg border border-white/10">
              <span>พลังโจมตีผู้เล่น: {spunResult.playerDmg}</span>
              <span>VS</span>
              <span>สวนกลับ DMG {spunResult.dmg} | ต้องมี WIN DMG {spunResult.hp}</span>
            </div>
          </div>

          {/* Action Continue Button */}
          <button
            onClick={handleConfirmResult}
            className={`w-full py-3 px-6 rounded-xl font-black text-sm shadow-2xl transition-all duration-200 active:scale-95 border border-white/30 tracking-wider uppercase ${
              spunResult.outcome === "win"
                ? "bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500 text-white shadow-emerald-500/60 hover:brightness-110"
                : "bg-gradient-to-r from-red-600 via-rose-600 to-red-600 text-white shadow-red-500/60 hover:brightness-110"
            }`}
          >
            {spunResult.outcome === "win" ? "รับรางวัล & จบการต่อสู้" : "ยอมรับผล & จบการต่อสู้"}
          </button>
        </div>
      ) : (
        /* Status Text Header (Compact Game HUD style) */
        <div className="text-center mb-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-purple-950/70 border border-purple-400/40 text-[10px] font-black text-amber-300 tracking-wider uppercase shadow-md">
            <span>STAT ROULETTE</span>
          </div>
        </div>
      )}

      {/* Magic Wheel (Compact Responsive Size to fit within 1 screen) */}
      <div className="relative w-56 h-56 sm:w-64 sm:h-64 md:w-72 md:h-72 flex items-center justify-center p-2 my-2">
        {/* Outer Runic Magic Aura Rings */}
        <div className="absolute inset-0 rounded-full border-2 border-amber-400/40 shadow-[0_0_25px_rgba(245,158,11,0.3)] pointer-events-none" />
        <div className="absolute inset-1.5 rounded-full border border-purple-500/30 pointer-events-none" />

        {/* Pointer Indicator (Golden Gem Arrow) */}
        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center filter drop-shadow-[0_0_10px_rgba(239,68,68,0.9)]">
          <div className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[16px] border-t-amber-400 relative">
            <div className="absolute -top-4 -left-2 w-4 h-4 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444] border border-amber-200" />
          </div>
        </div>

        {/* The Magic Wheel */}
        <div
          className="w-full h-full rounded-full border-4 border-amber-400/80 relative overflow-hidden bg-transparent shadow-[0_0_30px_rgba(245,158,11,0.3)]"
          style={{
            background: wheelBackground,
            transform: `rotate(${rotation}deg)`,
            transition: spinning ? "transform 4.5s cubic-bezier(0.15, 0.9, 0.2, 1)" : "none",
          }}
        >
          {segments.map((seg, idx) => {
            const angle = (360 / segments.length) * idx;
            return (
              <div
                key={idx}
                className="absolute w-1/2 h-1/2 top-0 right-0 origin-bottom-left flex items-center justify-center p-2 text-[10px] sm:text-[11px] font-black text-white select-none border border-white/30"
                style={{
                  backgroundColor: "transparent",
                  transform: `rotate(${angle}deg)`,
                  clipPath: "polygon(0 0, 100% 0, 0 100%)",
                  backgroundImage: "none",
                }}
              >
                <span
                  className="transform -rotate-45 translate-x-1.5 -translate-y-1.5 px-1 text-center leading-[1.05] font-sans font-bold text-white tracking-tight"
                  style={{ textShadow: "0 2px 3px rgba(0,0,0,0.95), 0 0 2px rgba(0,0,0,0.9)" }}
                >
                  <span className="block text-[9px] sm:text-[10px]">DMG {seg.getStats().dmg}</span>
                  <span className="block text-[9px] sm:text-[10px]">WIN {seg.getStats().hp}</span>
                </span>
              </div>
            );
          })}
        </div>

        {/* Center Orb (Spin Trigger or Arcane Core Crystal) */}
        {!spunResult && (
          <button
            onClick={onSpinComplete || isBot ? spinWheel : undefined}
            disabled={spinning || (!onSpinComplete && !isBot)}
            className={`absolute w-14 h-14 rounded-full bg-gradient-to-br from-amber-300 via-purple-600 to-indigo-900 border-2 border-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.8)] flex items-center justify-center z-20 transition-transform ${
              spinning
                ? "opacity-80 cursor-wait"
                : !onSpinComplete && !isBot
                ? "opacity-70 cursor-not-allowed"
                : "hover:scale-110 cursor-pointer active:scale-95"
            }`}
          >
            <div className="w-9 h-9 rounded-full bg-amber-400/30 border border-white/60 animate-pulse flex items-center justify-center text-amber-200 font-black text-[10px] uppercase tracking-tighter shadow-inner text-center">
              {spinning ? "SPIN..." : isBot ? "BOT" : !onSpinComplete ? "WATCH" : "SPIN"}
            </div>
          </button>
        )}
      </div>

      {/* Main Spin Button below wheel (if not spun) */}
      {!spunResult && (
        <button
          onClick={onSpinComplete || isBot ? spinWheel : undefined}
          disabled={spinning || (!onSpinComplete && !isBot)}
          className={`mt-2 w-full py-2.5 px-6 rounded-xl font-black text-xs text-white shadow-[0_0_20px_rgba(245,158,11,0.4)] border border-amber-300/60 transition-all duration-200 tracking-wider uppercase ${
            spinning || (!onSpinComplete && !isBot)
              ? "bg-slate-800 opacity-60 cursor-not-allowed border-purple-500/30"
              : "bg-gradient-to-r from-purple-700 via-amber-500 to-indigo-700 hover:brightness-110 active:scale-95"
          }`}
        >
          <span className="flex items-center justify-center gap-2">
            {spinning ? (
              <span>Determining Monster Power...</span>
            ) : isBot ? (
              <span>Bot Rolling Wheel of Fate...</span>
            ) : !onSpinComplete ? (
              <span>Watching Battle...</span>
            ) : (
              <span>Spin Fate Wheel</span>
            )}
          </span>
        </button>
      )}
    </div>
  );
});

export default WheelOfFate;
