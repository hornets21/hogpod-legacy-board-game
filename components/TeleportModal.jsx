"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function TeleportModal({ modalData, onConfirm }) {
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    if (!modalData) return;
    setCountdown(3);

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onConfirm();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [modalData, onConfirm]);

  if (!modalData) return null;

  const isLadder = modalData.type === "ladder";
  const player = modalData.player || {};
  const diff = isLadder ? modalData.to - modalData.from : modalData.from - modalData.to;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md select-none">
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0, y: 20 }}
          transition={{ type: "spring", stiffness: 350, damping: 25 }}
          className={`relative w-full max-w-md p-6 rounded-3xl border shadow-2xl overflow-hidden ${
            isLadder
              ? "bg-slate-950/90 border-emerald-500/40 shadow-[0_0_50px_rgba(16,185,129,0.25)]"
              : "bg-slate-950/90 border-rose-500/40 shadow-[0_0_50px_rgba(244,63,94,0.25)]"
          }`}
        >
          {/* Top Ambient Glow */}
          <div
            className={`absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full blur-3xl pointer-events-none opacity-40 ${
              isLadder ? "bg-emerald-500" : "bg-rose-500"
            }`}
          />

          {/* Player Identity Tag */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <span
              className="px-3 py-1 text-xs font-bold rounded-full border shadow-sm flex items-center gap-1.5"
              style={{
                backgroundColor: `${player.color || "#eab308"}20`,
                borderColor: player.color || "#eab308",
                color: player.color || "#eab308",
              }}
            >
              <span>{player.emoji || "🧙"}</span>
              <span>{player.name || "ผู้เล่น"}</span>
            </span>
          </div>

          {/* Icon Badge */}
          <div className="flex justify-center mb-4 relative">
            <motion.div
              animate={{
                y: isLadder ? [0, -6, 0] : [0, 4, 0],
                scale: [1, 1.05, 1],
              }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              className={`w-24 h-24 rounded-3xl border flex items-center justify-center text-5xl shadow-inner ${
                isLadder
                  ? "bg-emerald-950/60 border-emerald-400/50 shadow-emerald-500/20"
                  : "bg-rose-950/60 border-rose-400/50 shadow-rose-500/20"
              }`}
            >
              {isLadder ? "🪜" : "🐍"}
            </motion.div>
          </div>

          {/* Title & Description */}
          <div className="text-center mb-6 relative">
            <h2
              className={`text-2xl font-black tracking-wide mb-2 ${
                isLadder ? "text-emerald-400 drop-shadow-[0_0_12px_rgba(16,185,129,0.5)]" : "text-rose-400 drop-shadow-[0_0_12px_rgba(244,63,94,0.5)]"
              }`}
            >
              {isLadder ? "พบทางขึ้นบันไดวิเศษ!" : "ตกช่องงูยักษ์!"}
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed font-medium px-2">
              {isLadder ? (
                <>
                  เดินตกช่อง <span className="font-bold text-amber-400">{modalData.from}</span>! บันไดเวทมนตร์จะพาคุณปีนขึ้นไปยังช่อง{" "}
                  <span className="font-bold text-emerald-400">{modalData.to}</span> (+{diff} ช่อง)
                </>
              ) : (
                <>
                  เดินตกช่อง <span className="font-bold text-amber-400">{modalData.from}</span>! ถูกอสรพิษกลืนกินและสไลด์ลงไปยังช่อง{" "}
                  <span className="font-bold text-rose-400">{modalData.to}</span> (-{diff} ช่อง)
                </>
              )}
            </p>
          </div>

          {/* Route path preview */}
          <div className="flex items-center justify-between bg-slate-900/80 border border-slate-800 rounded-2xl p-3 mb-6">
            <div className="text-center flex-1">
              <div className="text-xs text-slate-400 font-semibold mb-0.5">ตำแหน่งปัจจุบัน</div>
              <div className="text-lg font-black text-amber-400">ช่อง {modalData.from}</div>
            </div>
            <div className="flex flex-col items-center px-2">
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isLadder ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"}`}>
                {isLadder ? `+${diff} ช่อง` : `-${diff} ช่อง`}
              </span>
              <span className="text-lg my-0.5">{isLadder ? "➔" : "➔"}</span>
            </div>
            <div className="text-center flex-1">
              <div className="text-xs text-slate-400 font-semibold mb-0.5">จุดหมายปลายทาง</div>
              <div className={`text-lg font-black ${isLadder ? "text-emerald-400" : "text-rose-400"}`}>
                ช่อง {modalData.to}
              </div>
            </div>
          </div>

          {/* Countdown & Action Button */}
          <div className="space-y-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onConfirm}
              className={`w-full py-3.5 px-6 rounded-2xl font-black text-base tracking-wider transition-all duration-200 shadow-lg flex items-center justify-center gap-2 ${
                isLadder
                  ? "bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-emerald-900/40"
                  : "bg-gradient-to-r from-rose-600 to-red-500 hover:from-rose-500 hover:to-red-400 text-white shadow-rose-900/40"
              }`}
            >
              <span>{isLadder ? `ปีนบันไดขึ้นไป (ช่อง ${modalData.to})` : `ยอมรับชะตากรรม (ช่อง ${modalData.to})`}</span>
              <span>{isLadder ? "🪜" : "🐍"}</span>
            </motion.button>

            {/* Countdown progress bar */}
            <div className="relative pt-1">
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold mb-1">
                <span>ระบบจะดำเนินการอัตโนมัติ</span>
                <span>{countdown} วินาที...</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <motion.div
                  initial={{ width: "100%" }}
                  animate={{ width: "0%" }}
                  transition={{ duration: 3, ease: "linear" }}
                  className={`h-full ${isLadder ? "bg-emerald-400" : "bg-rose-400"}`}
                />
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
