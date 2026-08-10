"use client";

import Image from "next/image";
import { useState } from "react";
import { NPCS } from "@/lib/gameData";
import NpcModelPreview from "@/components/board3d/NpcModelPreview";

export default function NpcDoctorModal({ player, grantedPotions = [], onClose }) {
  const npc = NPCS.doctor;
  const [showRewards, setShowRewards] = useState(true);

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
                  <div className="relative w-10 h-10 shrink-0 flex items-center justify-center">
                    {pot.image ? (
                      <Image src={pot.image} alt={pot.name} fill className="object-contain" />
                    ) : (
                      <span className="text-2xl">{pot.icon || "🧪"}</span>
                    )}
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
          onClick={onClose}
          className="w-full py-3.5 rounded-xl text-sm font-black tracking-wider uppercase text-white bg-gradient-to-r from-pink-600 via-purple-600 to-pink-600 hover:from-pink-500 hover:to-purple-500 shadow-[0_0_25px_rgba(236,72,153,0.5)] border border-pink-300/60 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
        >
          <span>🧪</span>
          <span>รับของรางวัลและลุยต่อ (ตกลง)</span>
        </button>}

      </div>
    </div>
  );
}
