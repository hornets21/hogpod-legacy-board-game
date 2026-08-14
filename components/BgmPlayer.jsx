"use client";

import { useEffect, useRef } from "react";
import { attachSfxListeners, setSfxMuted } from "@/lib/sfx";

export default function BgmPlayer({ isMuted, volume = 0.2, hideFloatingButton = true }) {
  const audioRef = useRef(null);

  const soundPath = "/sounds/harry potter themesong fail recorder cover 1.webm";

  // ตัดช่วงเงียบท้ายเพลงทันทีเพื่อความต่อเนื่องในการวนลูป (หน่วยเป็นวินาที)
  const MAX_MUSIC_DURATION = 26.5;

  useEffect(() => {
    const audio = new Audio(soundPath);
    audio.loop = true;
    audio.volume = volume;
    audio.muted = isMuted;
    audioRef.current = audio;

    // ── เปิด SFX listener (Web Audio synthesized) ──
    const detachSfx = attachSfxListeners();
    setSfxMuted(isMuted);

    // ตรวจจับเวลาเล่น หากถึงจุดจบเนื้อเพลงหรือใกล้ออกขอบไฟล์ ให้รีเซตกลับไปเริ่มทันทีโดยไม่ติดช่วงเงียบ
    const handleTimeUpdate = () => {
      if (!audio) return;
      const curTime = audio.currentTime;
      const totalDur = audio.duration;

      // หากเล่นถึง 26.5 วินาที หรือ ห่างจากจุดจบไฟล์น้อยกว่า 0.5 วินาที ให้รีเซตกลับไป 0 ทันที
      if ((totalDur && curTime >= totalDur - 0.5) || curTime >= MAX_MUSIC_DURATION) {
        audio.currentTime = 0;
        if (!audio.muted) {
          audio.play().catch(() => {});
        }
      }
    };

    const handleEnded = () => {
      audio.currentTime = 0;
      if (!audio.muted) {
        audio.play().catch(() => {});
      }
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);

    const tryPlay = () => {
      if (!isMuted) {
        audio.play().catch(() => {
          // Autoplay blocked by browser policy until user interaction
        });
      }
    };

    tryPlay();

    // Unlock audio on first user interaction anywhere on page
    const handleFirstInteraction = () => {
      if (audioRef.current && audioRef.current.paused && !isMuted) {
        audioRef.current.play().catch(() => {});
      }
    };

    window.addEventListener("click", handleFirstInteraction, { once: true });
    window.addEventListener("keydown", handleFirstInteraction, { once: true });

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
      window.removeEventListener("click", handleFirstInteraction);
      window.removeEventListener("keydown", handleFirstInteraction);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      detachSfx();
    };
  }, []);

  // Sync muted state when isMuted prop changes
  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.muted = isMuted;
    if (!isMuted && audioRef.current.paused) {
      audioRef.current.play().catch(() => {});
    }
    // Sync sfx mute ด้วย
    setSfxMuted(isMuted);
  }, [isMuted]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  if (hideFloatingButton) return null;

  return null;
}
