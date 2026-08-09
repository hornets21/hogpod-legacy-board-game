"use client";

import { useState } from "react";
import Image from "next/image";
import { NPCS, PET_LIST, NPC_CONFIG } from "@/lib/gameData";
import NpcModelPreview from "@/components/board3d/NpcModelPreview";

export default function NpcPetModal({ player, onConfirmChangePet, onClose }) {
  const npc = NPCS.pet_trainer;
  const fee = NPC_CONFIG.PET_CHANGE_FEE;
  const [showRewards, setShowRewards] = useState(true);
  
  const currentPetId = player?.pet?.id;
  const availablePets = PET_LIST.filter((p) => p.id !== currentPetId);
  const [selectedPet, setSelectedPet] = useState(availablePets[0] || PET_LIST[0]);

  if (!player) return null;

  const canAfford = player.gold >= fee;

  return (
    <div className="npc-encounter-dock npc-encounter-dock--pet animate-fade-in">
      <div className="npc-encounter-dock__panel">
        
        {/* NPC 3D ENCOUNTER PREVIEW */}
        <NpcModelPreview npcId="pet_trainer" color={npc.color} />
        <div className="flex items-center justify-between border-b border-emerald-500/30 pb-4">
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-xl font-black text-emerald-300 drop-shadow">{npc.name}</h2>
              <p className="text-xs text-emerald-200/80 mt-0.5">{npc.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs shrink-0">
            <span className="text-amber-300 font-bold">💰 {player.gold} Gold</span>
            <span className="text-emerald-300 font-bold bg-emerald-950/80 border border-emerald-500/40 px-2.5 py-1 rounded-full">
              ค่าเปลี่ยน: {fee} Gold
            </span>
          </div>
        </div>

        {!showRewards && (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/30 p-4 text-center">
            <p className="text-sm font-bold text-emerald-100">ผู้ฝึกสัตว์กำลังเรียกเพื่อนตัวใหม่</p>
            <p className="mt-1 text-xs text-emerald-200/70">สัตว์เลี้ยงพิเศษกำลังรอให้คุณเลือก</p>
            <button onClick={() => setShowRewards(true)} className="mt-4 w-full rounded-xl border border-emerald-300/60 bg-gradient-to-r from-emerald-600 to-teal-600 py-3 text-sm font-black shadow-[0_0_25px_rgba(16,185,129,0.4)] transition hover:scale-[1.02]">
              ดูสัตว์เลี้ยง
            </button>
          </div>
        )}

        {/* CURRENT PET INFO */}
        {showRewards && <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {player.pet?.image ? (
              <img src={player.pet.image} alt={player.pet.name} className="w-10 h-10 object-contain rounded-lg border border-amber-400/40 bg-black/40 p-0.5" />
            ) : (
              <span className="text-3xl">{player.pet?.emoji || "🐾"}</span>
            )}
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase">สัตว์เลี้ยงปัจจุบัน:</span>
              <h4 className="text-sm font-bold text-amber-200">{player.pet?.name || "ไม่มี"}</h4>
              <p className="text-xs text-slate-300">{player.pet?.description}</p>
            </div>
          </div>
        </div>}

        {/* CHOOSE NEW PET */}
        {showRewards && <div className="flex flex-col gap-2.5">
          <label className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            เลือกสัตว์เลี้ยงวิเศษตัวใหม่ที่ต้องการเปลี่ยน:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-1">
            {availablePets.map((pet) => {
              const isSelected = selectedPet?.id === pet.id;
              return (
                <div
                  key={pet.id}
                  onClick={() => setSelectedPet(pet)}
                  className={`cursor-pointer p-3 rounded-xl border transition-all duration-200 flex flex-col justify-between ${
                    isSelected
                      ? "bg-emerald-900/40 border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.4)] scale-[1.02]"
                      : "bg-slate-950/80 border-slate-800 hover:border-emerald-500/40 opacity-80"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {pet.image ? (
                        <img src={pet.image} alt={pet.name} className="w-7 h-7 object-contain rounded-md border border-white/20 bg-black/40 p-0.5" />
                      ) : (
                        <span className="text-xl">{pet.emoji}</span>
                      )}
                      <span className="font-bold text-emerald-200 text-xs">{pet.name}</span>
                    </div>
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${isSelected ? "border-emerald-400 bg-emerald-500" : "border-slate-600"}`}>
                      {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-1 line-clamp-2">{pet.description}</p>
                </div>
              );
            })}
          </div>
        </div>}

        {showRewards && !canAfford && (
          <div className="bg-red-950/70 border border-red-500/40 rounded-xl p-2.5 text-xs text-red-300 font-semibold text-center">
            ⚠️ คุณมีทองไม่พอจ่ายค่าธรรมเนียม {fee} Gold (ต้องการเพิ่มอีก {fee - player.gold} Gold)
          </div>
        )}

        {/* ACTION BUTTONS */}
        {showRewards && <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition"
          >
            ยกเลิก (ไม่เปลี่ยน)
          </button>
          <button
            disabled={!canAfford}
            onClick={() => onConfirmChangePet(selectedPet)}
            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-white transition flex items-center gap-2 ${
              canAfford
                ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-[0_0_20px_rgba(16,185,129,0.5)] border border-emerald-300/60 cursor-pointer"
                : "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
            }`}
          >
            <span>🐾</span>
            <span>ยืนยันเปลี่ยนสัตว์เลี้ยง</span>
          </button>
        </div>}

      </div>
    </div>
  );
}
