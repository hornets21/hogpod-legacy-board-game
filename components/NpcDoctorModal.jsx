"use client";

import Image from "next/image";
import { NPCS } from "@/lib/gameData";

export default function NpcDoctorModal({ player, grantedPotions = [], onClose }) {
  const npc = NPCS.doctor;

  if (!player) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
      <div className="relative max-w-md w-full bg-slate-950 border-2 border-pink-500/60 rounded-3xl p-6 shadow-[0_0_50px_rgba(236,72,153,0.3)] text-white flex flex-col gap-5">
        
        {/* Header with NPC Portrait Image */}
        <div className="flex items-center gap-4 border-b border-pink-500/30 pb-4">
          <div className="relative w-20 h-20 rounded-2xl overflow-hidden border-2 border-pink-400/80 shadow-[0_0_20px_rgba(236,72,153,0.5)] shrink-0 bg-slate-900">
            <Image
              src={npc.image}
              alt={npc.name}
              fill
              className="object-cover object-top"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{npc.emoji}</span>
              <h2 className="text-2xl font-black text-pink-300 drop-shadow">{npc.name}</h2>
            </div>
            <p className="text-xs text-pink-200/80 mt-1">{npc.description}</p>
          </div>
        </div>

        {/* Message Content */}
        <div className="bg-pink-950/30 border border-pink-500/30 rounded-2xl p-4 flex flex-col gap-3">
          <span className="text-sm font-bold text-pink-200">
            ยินดีด้วย! {player.name} ได้รับยาปรุงพิเศษ 2 ขวดฟรี:
          </span>
          <div className="flex flex-col gap-2">
            {grantedPotions.length > 0 ? (
              grantedPotions.map((pot, idx) => (
                <div key={idx} className="flex items-center gap-3 bg-slate-900/90 p-2.5 rounded-xl border border-pink-400/30">
                  <div className="relative w-9 h-9 shrink-0">
                    {pot.image ? (
                      <Image src={pot.image} alt={pot.name} fill className="object-contain" />
                    ) : (
                      <span className="text-2xl">🧪</span>
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-amber-300">{pot.name}</h4>
                    <p className="text-xs text-slate-300">{pot.description}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-amber-300">กระเป๋ายาของคุณเต็มแล้ว จึงไม่สามารถรับยาเพิ่มได้ในรอบนี้</p>
            )}
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 shadow-[0_0_20px_rgba(236,72,153,0.5)] transition"
          >
            ขอบคุณครับหมอ! (ตกลง)
          </button>
        </div>

      </div>
    </div>
  );
}
