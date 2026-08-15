"use client";

import { useState } from "react";
import { setSfxVolume, getSfxVolume } from "@/lib/sfx";

export default function SettingsModal({ onClose, bgmMuted, onToggleBgm, bgmVolume, onBgmVolumeChange }) {
  const [sfxVol, setSfxVolState] = useState(() => (typeof window !== "undefined" ? getSfxVolume() : 0.8));

  const handleSfxChange = (e) => {
    const val = parseFloat(e.target.value);
    setSfxVolState(val);
    setSfxVolume(val);
  };

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in pointer-events-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-slate-950/95 border border-amber-500/30 rounded-3xl p-5 sm:p-6 shadow-[0_0_55px_rgba(245,158,11,0.18)] flex flex-col gap-5 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-amber-500/20 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-sm font-black text-amber-400 shadow-inner">
              ⚙️
            </div>
            <div>
              <h2 className="font-black text-amber-300 text-lg sm:text-xl tracking-tight">
                Settings
              </h2>
              <p className="text-xs text-white/50 font-semibold">
                Audio &amp; interface preferences
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-red-500/30 hover:border-red-500/50 border border-white/15 text-white/70 hover:text-red-300 font-black flex items-center justify-center text-base transition-all"
          >
            ✕
          </button>
        </div>

        {/* Audio Section */}
        <div className="flex flex-col gap-4">
          <div className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-200/60">
            Audio
          </div>

          {/* SFX Volume */}
          <div className="flex items-center justify-between gap-3 bg-black/40 border border-amber-500/20 rounded-2xl px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-base">🔊</span>
              <div className="flex flex-col">
                <span className="text-xs font-black text-amber-200 uppercase tracking-wider">
                  SFX Volume
                </span>
                <span className="text-[10px] text-white/50 font-bold">
                  Sound effects (dice, skills, combat)
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 min-w-[140px]">
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={sfxVol}
                onChange={handleSfxChange}
                className="flex-1 accent-amber-400 cursor-pointer"
                title={`SFX Volume: ${Math.round(sfxVol * 100)}%`}
              />
              <span className="text-[11px] font-mono font-bold text-amber-200 w-10 text-right tabular-nums">
                {Math.round(sfxVol * 100)}%
              </span>
            </div>
          </div>

          {/* BGM Volume + Mute */}
          <div className="flex items-center justify-between gap-3 bg-black/40 border border-emerald-500/20 rounded-2xl px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-base">{bgmMuted ? "🔇" : "🎵"}</span>
              <div className="flex flex-col">
                <span className="text-xs font-black text-emerald-200 uppercase tracking-wider">
                  BGM Volume
                </span>
                <span className="text-[10px] text-white/50 font-bold">
                  Background music theme
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 min-w-[140px]">
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={bgmVolume}
                onChange={(e) => onBgmVolumeChange?.(parseFloat(e.target.value))}
                className={`flex-1 cursor-pointer ${
                  bgmMuted ? "accent-slate-500 opacity-50" : "accent-emerald-400"
                }`}
                disabled={bgmMuted}
                title={`BGM Volume: ${Math.round(bgmVolume * 100)}%`}
              />
              <span className="text-[11px] font-mono font-bold text-emerald-200 w-10 text-right tabular-nums">
                {Math.round(bgmVolume * 100)}%
              </span>
              <button
                onClick={onToggleBgm}
                className={`px-2.5 py-1.5 rounded-xl border text-xs font-black flex items-center justify-center transition-all hover:scale-105 shadow-md ${
                  bgmMuted
                    ? "bg-red-950/80 border-red-500/50 text-red-300 hover:bg-red-900"
                    : "bg-emerald-950/80 border-emerald-500/50 text-emerald-300 hover:bg-emerald-900"
                }`}
                title={bgmMuted ? "Unmute BGM" : "Mute BGM"}
              >
                {bgmMuted ? "🔇" : "🎵"}
              </button>
            </div>
          </div>
        </div>

        {/* Footer note */}
        <p className="text-[10px] text-white/40 text-center font-semibold leading-relaxed">
          Settings are saved to this browser. They apply to both local and online matches.
        </p>
      </div>
    </div>
  );
}