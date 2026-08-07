"use client";

import Image from "next/image";
import { NPCS } from "@/lib/gameData";

export default function NpcDoctorModal({ player, grantedPotions = [], onClose }) {
  const npc = NPCS.doctor;

  if (!player) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      {/* CARD / CONTAINER SHOP PANEL */}
      <div className="relative max-w-lg w-full bg-slate-900/95 border-2 border-pink-500/40 rounded-3xl p-6 shadow-[0_0_50px_rgba(236,72,153,0.3)] text-white flex flex-col gap-5 overflow-hidden">
        
        {/* HEADER: NPC PORTRAIT & TITLE */}
        <div className="flex items-center gap-4 border-b border-pink-500/30 pb-4">
          <div className="relative w-16 h-16 rounded-2xl overflow-hidden border-2 border-pink-400 shrink-0 bg-slate-950 shadow-[0_0_15px_rgba(236,72,153,0.4)]">
            <Image src={npc.image} alt={npc.name} fill className="object-cover object-top" />
          </div>
          <div>
            <h2 className="text-xl font-black text-pink-300 flex items-center gap-2 drop-shadow">
              <span>{npc.emoji}</span>
              <span>{npc.name}</span>
            </h2>
            <p className="text-xs text-pink-200/80 mt-0.5">{npc.description}</p>
          </div>
        </div>

        {/* DIALOGUE & GRANTED POTIONS SHOWCASE */}
        <div className="bg-pink-950/30 border border-pink-500/30 rounded-2xl p-4 flex flex-col gap-3">
          <span className="text-sm font-bold text-pink-200 flex items-center gap-2">
            <span>✨</span>
            <span>ยินดีด้วย! {player.name} ตกช่องหมอยา! ได้รับยาปรุงพิเศษฟรี 2 ขวด:</span>
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {grantedPotions.length > 0 ? (
              grantedPotions.map((pot, idx) => (
                <div key={idx} className="flex items-center gap-3 bg-slate-950/80 p-3 rounded-xl border border-pink-500/30 hover:border-pink-400/60 transition shadow-inner">
                  <div className="relative w-10 h-10 shrink-0">
                    {pot.image ? (
                      <Image src={pot.image} alt={pot.name} fill className="object-contain" />
                    ) : (
                      <span className="text-2xl">🧪</span>
                    )}
                  </div>
                  <div className="overflow-hidden">
                    <h4 className="text-xs font-bold text-amber-300 truncate">{pot.name}</h4>
                    <p className="text-[10px] text-slate-300 line-clamp-2 mt-0.5">{pot.description}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-2 p-3 bg-amber-950/60 border border-amber-500/40 rounded-xl text-xs text-amber-300 font-bold text-center">
                ⚠️ กระเป๋ายาของคุณเต็มแล้ว จึงไม่สามารถรับยาเพิ่มได้ในรอบนี้
              </div>
            )}
          </div>
        </div>

        {/* CONFIRM BUTTON */}
        <button
          onClick={onClose}
          className="w-full py-3.5 rounded-xl text-sm font-black tracking-wider uppercase text-white bg-gradient-to-r from-pink-600 via-purple-600 to-pink-600 hover:from-pink-500 hover:to-purple-500 shadow-[0_0_25px_rgba(236,72,153,0.5)] border border-pink-300/60 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
        >
          <span>🧪</span>
          <span>รับยาและเก็บใส่กระเป๋า (ตกลง)</span>
        </button>

      </div>
    </div>
  );
}
