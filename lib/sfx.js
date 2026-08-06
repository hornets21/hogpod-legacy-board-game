"use client";

// ============================================================
// sfx — Synthesized SFX แบบ oscillator สั้น ๆ ด้วย Web Audio API
// ไม่ต้องโหลดไฟล์เสียง โหลดได้ทันที ไม่มี latency
// ============================================================

import { on, FX_EVENTS } from "./skillFxBus";

let _audioCtx = null;

function getCtx() {
  if (typeof window === "undefined") return null;
  if (!_audioCtx) {
    try {
      _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      return null;
    }
  }
  if (_audioCtx.state === "suspended") _audioCtx.resume().catch(() => {});
  return _audioCtx;
}

let _muted = false;
let _sfxVolume = 0.8;

if (typeof window !== "undefined") {
  const savedSfxVol = localStorage.getItem("podBoardGame_sfxVolume");
  if (savedSfxVol !== null) {
    _sfxVolume = parseFloat(savedSfxVol);
  }
}

export function setSfxMuted(v) { _muted = v; }
export function setSfxVolume(v) {
  _sfxVolume = Math.max(0, Math.min(1, v));
  if (typeof window !== "undefined") {
    localStorage.setItem("podBoardGame_sfxVolume", _sfxVolume.toString());
  }
}
export function getSfxVolume() { return _sfxVolume; }

function beep({ freq = 660, freq2 = null, duration = 0.18, type = "sine", gain = 0.08 }) {
  if (_muted || _sfxVolume <= 0) return;
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    const finalGain = gain * _sfxVolume;
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if (freq2 != null) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq2), ctx.currentTime + duration);
    }
    g.gain.setValueAtTime(0.001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(finalGain, ctx.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    // no-op
  }
}

// ─── Special Synth Effects ───
function playDiceRollSfx() {
  beep({ freq: 400, freq2: 150, duration: 0.1, type: "sawtooth", gain: 0.06 });
  setTimeout(() => beep({ freq: 600, freq2: 200, duration: 0.12, type: "triangle", gain: 0.07 }), 80);
  setTimeout(() => beep({ freq: 250, freq2: 80, duration: 0.18, type: "square", gain: 0.09 }), 200);
}

function playStepMoveSfx() {
  beep({ freq: 520, freq2: 680, duration: 0.06, type: "sine", gain: 0.04 });
}

function playShopBuySfx() {
  beep({ freq: 987.77, duration: 0.08, type: "sine", gain: 0.06 });
  setTimeout(() => beep({ freq: 1318.51, duration: 0.15, type: "sine", gain: 0.08 }), 70);
}

function playTrapSfx() {
  beep({ freq: 600, freq2: 120, duration: 0.3, type: "sawtooth", gain: 0.08 });
}

function playVictorySfx() {
  const notes = [523.25, 659.25, 783.99, 1046.50];
  notes.forEach((freq, idx) => {
    setTimeout(() => {
      beep({ freq, duration: 0.25, type: "triangle", gain: 0.08 });
    }, idx * 120);
  });
}

function playPvpStartSfx() {
  beep({ freq: 180, freq2: 360, duration: 0.25, type: "sawtooth", gain: 0.08 });
}

// ─── Plays เสียงตามประเภท ──
function playCastSfx(skillData) {
  if (!skillData) {
    beep({ freq: 700, freq2: 1100, duration: 0.18, type: "triangle", gain: 0.06 });
    return;
  }
  const effect = skillData.effect;
  if (effect === "invincible") {
    beep({ freq: 320, freq2: 660, duration: 0.4, type: "sine", gain: 0.07 });
    setTimeout(() => beep({ freq: 660, freq2: 990, duration: 0.25, type: "sine", gain: 0.05 }), 80);
  } else if (effect === "lock_dice") {
    beep({ freq: 540, freq2: 220, duration: 0.2, type: "sawtooth", gain: 0.05 });
  } else if (effect === "shuffle_positions") {
    beep({ freq: 420, freq2: 880, duration: 0.4, type: "square", gain: 0.04 });
  } else if (skillData.dmg) {
    // damage skill
    beep({ freq: 880, freq2: 220, duration: 0.22, type: "sawtooth", gain: 0.07 });
  } else {
    beep({ freq: 660, freq2: 990, duration: 0.18, type: "triangle", gain: 0.05 });
  }
}

function playHitSfx(type) {
  if (type === "heal") {
    beep({ freq: 700, freq2: 1100, duration: 0.18, type: "sine", gain: 0.05 });
  } else {
    beep({ freq: 220, freq2: 80, duration: 0.15, type: "square", gain: 0.07 });
  }
}

// ─── Subscribe global events (ใช้ใน BgmPlayer mount) ──
export function attachSfxListeners() {
  const u1 = on(FX_EVENTS.SKILL_CAST, (p) => playCastSfx(p.skillData));
  const u2 = on(FX_EVENTS.DAMAGE_DEALT, (p) => playHitSfx(p.type));
  const u3 = on(FX_EVENTS.HEAL, () => playHitSfx("heal"));
  const u4 = on(FX_EVENTS.DICE_ROLL, () => playDiceRollSfx());
  const u5 = on(FX_EVENTS.STEP_MOVE, () => playStepMoveSfx());
  const u6 = on(FX_EVENTS.SHOP_BUY, () => playShopBuySfx());
  const u7 = on(FX_EVENTS.TRAP_TRIGGER, () => playTrapSfx());
  const u8 = on(FX_EVENTS.VICTORY, () => playVictorySfx());
  const u9 = on(FX_EVENTS.PVP_START, () => playPvpStartSfx());

  return () => {
    u1(); u2(); u3(); u4(); u5(); u6(); u7(); u8(); u9();
  };
}