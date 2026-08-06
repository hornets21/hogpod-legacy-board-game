"use client";

import { useState } from "react";
import Image from "next/image";
import { NPCS, PET_LIST, NPC_CONFIG } from "@/lib/gameData";

export default function NpcPetModal({ player, onConfirmChangePet, onClose }) {
  const npc = NPCS.pet_trainer;
  const fee = NPC_CONFIG.PET_CHANGE_FEE;
  
  // Exclude player's current pet from options
  const currentPetId = player?.pet?.id;
  const availablePets = PET_LIST.filter((p) => p.id !== currentPetId);
  const [selectedPet, setSelectedPet] = useState(availablePets[0] || PET_LIST[0]);

  if (!player) return null;

  const canAfford = player.gold >= fee;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
      <div className="relative max-w-xl w-full bg-slate-950 border-2 border-emerald-500/60 rounded-3xl p-6 shadow-[0_0_50px_rgba(16,185,129,0.3)] text-white flex flex-col gap-6">
        
        {/* Header with NPC Portrait Image */}
        <div className="flex items-center gap-4 border-b border-emerald-500/30 pb-4">
          <div className="relative w-20 h-20 rounded-2xl overflow-hidden border-2 border-emerald-400/80 shadow-[0_0_20px_rgba(16,185,129,0.5)] shrink-0 bg-slate-900">
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
              <h2 className="text-2xl font-black text-emerald-300 drop-shadow">{npc.name}</h2>
            </div>
            <p className="text-xs text-emerald-200/80 mt-1">{npc.description}</p>
            <div className="flex items-center gap-3 mt-1.5 text-xs">
              <span className="text-amber-300 font-bold">💰 ทองของคุณ: {player.gold} Gold</span>
              <span className="text-emerald-300 font-bold bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 rounded-full">
                ค่าเปลี่ยน: {fee} Gold
              </span>
            </div>
          </div>
        </div>

        {/* Current Pet Info */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{player.pet?.emoji || "🐾"}</span>
            <div>
              <span className="text-xs text-slate-400 font-bold uppercase">สัตว์เลี้ยงปัจจุบัน:</span>
              <h4 className="text-sm font-bold text-amber-200">{player.pet?.name || "ไม่มี"}</h4>
              <p className="text-xs text-slate-300">{player.pet?.description}</p>
            </div>
          </div>
        </div>

        {/* Select New Pet */}
        <div className="flex flex-col gap-3">
          <label className="text-sm font-bold text-slate-200">
            เลือกสัตว์เลี้ยงวิเศษตัวใหม่ที่ต้องการเปลี่ยน:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-52 overflow-y-auto pr-1">
            {availablePets.map((pet) => {
              const isSelected = selectedPet?.id === pet.id;
              return (
                <div
                  key={pet.id}
                  onClick={() => setSelectedPet(pet)}
                  className={`cursor-pointer p-3 rounded-xl border transition-all duration-200 flex flex-col justify-between ${
                    isSelected
                      ? "bg-emerald-900/40 border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.4)] scale-[1.02]"
                      : "bg-slate-900/70 border-slate-800 hover:border-emerald-500/40 opacity-80"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{pet.emoji}</span>
                      <span className="font-bold text-emerald-200 text-sm">{pet.name}</span>
                    </div>
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${isSelected ? "border-emerald-400 bg-emerald-500" : "border-slate-600"}`}>
                      {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 line-clamp-2">{pet.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {!canAfford && (
          <div className="bg-red-950/60 border border-red-500/40 rounded-xl p-2.5 text-xs text-red-300 font-semibold text-center">
            ⚠️ คุณมีทองไม่พอจ่ายค่าธรรมเนียม {fee} Gold (ต้องการเพิ่มอีก {fee - player.gold} Gold)
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-bold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition"
          >
            ยกเลิก (ไม่เปลี่ยน)
          </button>
          <button
            disabled={!canAfford}
            onClick={() => onConfirmChangePet(selectedPet)}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold text-white transition flex items-center gap-2 ${
              canAfford
                ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-[0_0_20px_rgba(16,185,129,0.5)]"
                : "bg-slate-800 opacity-50 cursor-not-allowed"
            }`}
          >
            <span>💰</span>
            <span>จ่าย {fee} Gold เปลี่ยนสัตว์เลี้ยง</span>
          </button>
        </div>

      </div>
    </div>
  );
}
