"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";

export default function MobaAutoGoldWidget({ state, onDispatch }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [progress, setProgress] = useState(0);

  const enabled = state?.autoGoldEnabled ?? true;
  const amount = state?.autoGoldAmount ?? 10;
  const interval = state?.autoGoldInterval ?? 3;

  // Progress bar animation loop synced with tick interval
  useEffect(() => {
    if (!enabled || !state || state.phase === "title" || state.phase === "setup" || state.phase === "initiative" || state.winner) {
      setProgress(0);
      return;
    }

    const stepMs = 100;
    const totalMs = interval * 1000;
    const startTime = Date.now();

    const timer = setInterval(() => {
      const elapsed = (Date.now() - startTime) % totalMs;
      const pct = Math.min(100, (elapsed / totalMs) * 100);
      setProgress(pct);
    }, stepMs);

    return () => clearInterval(timer);
  }, [enabled, interval, state?.phase, state?.winner]);

  if (!state || state.phase === "title" || state.phase === "setup" || state.phase === "initiative") {
    return null;
  }

  const presets = [
    { label: "Standard MOBA", amount: 10, interval: 3, icon: "⚔️", desc: "+10g ทุก 3 วินาที (มาตรฐาน MOBA)" },
    { label: "Turbo MOBA", amount: 50, interval: 2, icon: "⚡", desc: "+50g ทุก 2 วินาที (สายฟาร์มไว)" },
    { label: "Ultra Speed", amount: 100, interval: 1, icon: "🏎️", desc: "+100g ทุก 1 วินาที (สายรวยลัด)" },
    { label: "Casual", amount: 10, interval: 5, icon: "🐢", desc: "+10g ทุก 5 วินาที (สายชิลล์)" },
  ];

  return (
    <div className="relative">
      {/* ── Floating Top Widget Badge ────────────────── */}
      <button
        onClick={() => setMenuOpen((o) => !o)}
        className={`relative overflow-hidden flex items-center gap-2.5 px-3 py-1.5 rounded-2xl backdrop-blur-md border transition-all duration-300 shadow-lg active:scale-95 ${
          enabled
            ? "bg-slate-950/90 border-amber-500/50 hover:border-amber-400 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.25)]"
            : "bg-slate-950/70 border-white/15 text-slate-400 opacity-70 hover:opacity-100"
        }`}
        title="คลิกเพื่อตั้งค่าระบบเพิ่มเงินอัตโนมัติแบบ MOBA"
      >
        {/* Glowing Gold Icon */}
        <div className={`relative flex items-center justify-center w-7 h-7 rounded-xl ${enabled ? "bg-amber-500/20 text-amber-400 animate-pulse" : "bg-white/5 text-slate-400"}`}>
          <span className="text-base">💰</span>
        </div>

        {/* Info label */}
        <div className="text-left leading-none">
          <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-amber-400/90">
            <span>MOBA AUTO GOLD</span>
            <span className={`w-1.5 h-1.5 rounded-full ${enabled ? "bg-emerald-400 animate-ping" : "bg-red-500"}`} />
          </div>
          <div className="text-xs font-black tracking-tight text-white mt-0.5">
            {enabled ? (
              <>
                <span className="text-yellow-400">+{amount.toLocaleString()}g</span>
                <span className="text-white/60 font-semibold text-[10px]"> / {interval}s</span>
              </>
            ) : (
              <span className="text-slate-400">ปิดใช้งาน</span>
            )}
          </div>
        </div>

        {/* Tick Timer Progress Bar at bottom of badge */}
        {enabled && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-950/50 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-yellow-300 transition-all duration-100 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </button>

      {/* ── Interactive MOBA Auto Gold Settings Dropdown ─────────────── */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-12 right-0 z-[80] w-80 bg-slate-950/95 border-2 border-amber-500/50 rounded-3xl p-4 shadow-[0_0_40px_rgba(245,158,11,0.3)] backdrop-blur-xl text-white select-none"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-amber-500/20 pb-2.5 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">💰</span>
                <div>
                  <h4 className="font-black text-xs text-amber-400 uppercase tracking-wider">
                    ตั้งค่า MOBA Auto Gold
                  </h4>
                  <p className="text-[10px] text-white/50">แจกเงินทองอัตโนมัติตามระยะเวลา (Passive Income)</p>
                </div>
              </div>
              <button
                onClick={() => setMenuOpen(false)}
                className="w-6 h-6 rounded-lg bg-white/10 hover:bg-white/20 text-white/60 hover:text-white text-xs flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            {/* Toggle On/Off Switch */}
            <div className="flex items-center justify-between bg-black/40 border border-white/10 p-2.5 rounded-2xl mb-3">
              <span className="text-xs font-bold text-slate-200">เปิดระบบแจกเงินอัตโนมัติ</span>
              <button
                onClick={() => onDispatch({ type: "TOGGLE_AUTO_GOLD" })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  enabled ? "bg-emerald-500" : "bg-slate-700"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    enabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {/* Presets List */}
            <div className="space-y-2 mb-3">
              <div className="text-[10px] font-black uppercase text-amber-400/80">⚡ รูปแบบความเร็ว (Presets)</div>
              <div className="grid grid-cols-2 gap-1.5">
                {presets.map((p) => {
                  const isActive = enabled && amount === p.amount && interval === p.interval;
                  return (
                    <button
                      key={p.label}
                      onClick={() => {
                        onDispatch({
                          type: "SET_AUTO_GOLD_SETTINGS",
                          autoGoldAmount: p.amount,
                          autoGoldInterval: p.interval,
                          autoGoldEnabled: true,
                        });
                      }}
                      className={`p-2 rounded-xl border text-left flex flex-col transition-all ${
                        isActive
                          ? "border-amber-400 bg-amber-500/20 text-amber-200 shadow-md scale-[1.02]"
                          : "border-white/10 bg-black/40 hover:border-white/20 hover:bg-white/5 text-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-black">
                        <span>{p.icon} {p.label}</span>
                      </div>
                      <div className="text-[10px] text-yellow-400 font-bold mt-0.5">
                        +{p.amount}g / {p.interval}s
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Sliders / Controls */}
            <div className="bg-black/40 border border-white/10 p-3 rounded-2xl space-y-2.5 mb-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-300 font-bold">จำนวนเงิน (+Gold):</span>
                <span className="text-amber-400 font-black">+{amount} Gold</span>
              </div>
              <input
                type="range"
                min="5"
                max="500"
                step="5"
                value={amount}
                onChange={(e) =>
                  onDispatch({
                    type: "SET_AUTO_GOLD_SETTINGS",
                    autoGoldAmount: parseInt(e.target.value, 10),
                  })
                }
                className="w-full accent-amber-400 cursor-pointer"
              />

              <div className="flex justify-between items-center text-xs pt-1">
                <span className="text-slate-300 font-bold">ระยะเวลา (Interval):</span>
                <span className="text-cyan-300 font-black">ทุกๆ {interval} วินาที</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                step="1"
                value={interval}
                onChange={(e) =>
                  onDispatch({
                    type: "SET_AUTO_GOLD_SETTINGS",
                    autoGoldInterval: parseInt(e.target.value, 10),
                  })
                }
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            {/* Gold Rain Action Button */}
            <button
              onClick={() => onDispatch({ type: "TRIGGER_GOLD_RAIN" })}
              className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs shadow-[0_0_20px_rgba(245,158,11,0.4)] flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              <span>🌧️</span> ⚡ ฝนเงิน MOBA! (แจก +1,000 Gold ทุกบ้านทันที)
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
