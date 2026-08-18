"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { NPCS } from "@/lib/gameData";
import NpcModelPreview from "@/components/board3d/NpcModelPreview";

export default function NpcDoctorModal({ player, grantedPotions = [], onClose }) {
  const npc = NPCS.doctor;
  const [showRewards, setShowRewards] = useState(true);
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    setCountdown(10);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (typeof onClose === "function") {
            onClose();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [onClose]);

  if (!player) return null;

  return (
    <div className="npc-encounter-dock npc-encounter-dock--doctor animate-fade-in">
      <div className="npc-encounter-dock__panel">
        
        {/* NPC 3D ENCOUNTER PREVIEW */}
        <NpcModelPreview npcId="doctor" color={npc.color} />
        <div className="flex items-center gap-4 border-b border-pink-500/30 pb-4">
          <div>
            <h2 className="text-xl font-black text-pink-300 drop-shadow">{npc.name}</h2>
            <p className="text-xs text-pink-200/80 mt-0.5">{npc.description}</p>
          </div>
        </div>

        {!showRewards && (
          <div className="rounded-2xl border border-pink-500/30 bg-pink-950/30 p-4 text-center">
            <p className="text-sm font-bold text-pink-100">คุณพบหมอยาปริศนา</p>
            <p className="mt-1 text-xs text-pink-200/70">เดินเข้ามาใกล้สิ แล้วรับของปรุงพิเศษจากข้า</p>
            <button onClick={() => setShowRewards(true)} className="mt-4 w-full rounded-xl border border-pink-300/60 bg-gradient-to-r from-pink-600 to-purple-600 py-3 text-sm font-black shadow-[0_0_25px_rgba(236,72,153,0.4)] transition hover:scale-[1.02]">
              ดูของรางวัล
            </button>
          </div>
        )}

        {/* DIALOGUE & GRANTED POTIONS SHOWCASE */}
        {showRewards && <div className="bg-pink-950/30 border border-pink-500/30 rounded-2xl p-4 flex flex-col gap-3">
          <span className="text-sm font-bold text-pink-200 flex items-center gap-2">
            <span>✨</span>
            <span>ยินดีด้วย! {player.name} ตกช่องหมอยา! ได้รับของรางวัล 2 รายการ:</span>
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {grantedPotions.length > 0 ? (
              grantedPotions.map((pot, idx) => (
                <div key={idx} className={`flex items-center gap-3 bg-slate-950/80 p-3 rounded-xl border transition shadow-inner ${pot.isBuff ? "border-amber-400/60 bg-amber-950/20" : "border-pink-500/30 hover:border-pink-400/60"}`}>
                  <div className="relative w-12 h-12 rounded-xl bg-slate-900/90 border border-pink-400/40 p-1 shrink-0 flex items-center justify-center shadow-inner overflow-hidden">
                    {pot.image ? (
                      <img
                        src={pot.image}
                        alt={pot.name}
                        className="w-full h-full object-contain drop-shadow"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                          if (e.currentTarget.nextElementSibling) {
                            e.currentTarget.nextElementSibling.style.display = "block";
                          }
                        }}
                      />
                    ) : null}
                    <span
                      className="text-2xl"
                      style={{ display: pot.image ? "none" : "block" }}
                    >
                      {pot.icon || "🧪"}
                    </span>
                  </div>
                  <div className="overflow-hidden min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="text-xs font-bold text-amber-300 truncate">{pot.name}</h4>
                      {pot.isBuff && (
                        <span className="text-[8px] font-black px-1.5 py-0.2 rounded bg-purple-500/30 text-purple-300 border border-purple-400/40 shrink-0">
                          ⚡ บัฟทันที
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-300 line-clamp-2 mt-0.5">{pot.description}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-2 p-3 bg-amber-950/60 border border-amber-500/40 rounded-xl text-xs text-amber-300 font-bold text-center">
                ⚠️ ได้รับการรักษาพิเศษเรียบร้อยแล้ว
              </div>
            )}
          </div>
        </div>}

        {/* CONFIRM BUTTON */}
        {showRewards && <button
          onClick={typeof onClose === "function" ? onClose : undefined}
          disabled={typeof onClose !== "function"}
          className={`w-full py-3.5 rounded-xl text-sm font-black tracking-wider uppercase text-white bg-gradient-to-r from-pink-600 via-purple-600 to-pink-600 hover:from-pink-500 hover:to-purple-500 shadow-[0_0_25px_rgba(236,72,153,0.5)] border border-pink-300/60 transition-all flex items-center justify-center gap-2 ${typeof onClose !== "function" ? "opacity-60 cursor-not-allowed" : "hover:scale-[1.02] active:scale-95"}`}
        >
          <span>🧪</span>
          <span>{typeof onClose === "function" ? `รับของรางวัลและลุยต่อ (${countdown}s)` : "กำลังดำเนินการ..."}</span>
        </button>}

      </div>
    </div>
  );
}
