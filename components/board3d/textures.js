// ============================================================
// Canvas texture helpers สำหรับฉาก 3D (cache ไว้ใช้ซ้ำ)
// ============================================================

import * as THREE from "three";

const emojiCache = new Map();
const tileTopCache = new Map();
let glowTexture = null;

const EMOJI_FONT = `"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`;

// Texture แสง radial gradient (ใช้กับ sprite แสงเทียน/แสงเวท)
export function getGlowTexture() {
  if (glowTexture) return glowTexture;
  if (typeof window === "undefined") return null;

  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  const grad = ctx.createRadialGradient(
    size / 2, size / 2, 0,
    size / 2, size / 2, size / 2
  );
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.35, "rgba(255,255,255,0.45)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  glowTexture = new THREE.CanvasTexture(canvas);
  glowTexture.colorSpace = THREE.SRGBColorSpace;
  return glowTexture;
}

// Texture emoji สำหรับ sprite (มอนสเตอร์ / งู / บันได / กับดัก / ถ้วยรางวัล)
export function getEmojiTexture(emoji) {
  if (emojiCache.has(emoji)) return emojiCache.get(emoji);
  if (typeof window === "undefined") return null;

  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.font = `96px ${EMOJI_FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(emoji, size / 2, size / 2 + 6);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  emojiCache.set(emoji, tex);
  return tex;
}

// Texture หน้าบนของแผ่นหิน: สีพื้นตามประเภทช่อง + กรอบสลัก
export function getTileTopTexture(cell, bgColor, borderColor) {
  const key = `${cell}|${bgColor}|${borderColor}`;
  if (tileTopCache.has(key)) return tileTopCache.get(key);
  if (typeof window === "undefined") return null;

  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  // พื้นหิน
  ctx.fillStyle = bgColor || "#232b3d";
  ctx.fillRect(0, 0, size, size);

  // ลายหินจางๆ (noise เส้น)
  ctx.strokeStyle = "rgba(255,255,255,0.04)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i++) {
    const y = 12 + i * 26 + ((cell * 13 + i * 7) % 11);
    ctx.beginPath();
    ctx.moveTo(8, y);
    ctx.lineTo(size - 8, y + ((cell * i) % 5) - 2);
    ctx.stroke();
  }

  // กรอบ
  if (borderColor) {
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 5;
    ctx.strokeRect(4, 4, size - 8, size - 8);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tileTopCache.set(key, tex);
  return tex;
}

