"use client";

import { useState } from "react";
import Image from "next/image";
import { NPCS, SKILL_LIST } from "@/lib/gameData";

export default function NpcSkillModal({ player, onConfirmSwap, onClose }) {
  const npc = NPCS.skill_trainer;
  
  // Pick a random new skill that player doesn't have
  const ownedIds = new Set(player?.skills?.map((s) => s.id) || []);
  const unownedSkills = SKILL_LIST.filter((s) => !ownedIds.has(s.id));
  
  const [newSkill] = useState(() => {
    if (unownedSkills.length > 0) {
      return unownedSkills[Math.floor(Math.random() * unownedSkills.length)];
    }
    return SKILL_LIST[0];
  });

  const [selectedOldSkillId, setSelectedOldSkillId] = useState(player?.skills?.[0]?.id || "");

  if (!player) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
      <div className="relative max-w-xl w-full bg-slate-950 border-2 border-blue-500/60 rounded-3xl p-6 shadow-[0_0_50px_rgba(59,130,246,0.3)] text-white flex flex-col gap-6">
        
        {/* Header with NPC Portrait Image */}
        <div className="flex items-center gap-4 border-b border-blue-500/30 pb-4">
          <div className="relative w-20 h-20 rounded-2xl overflow-hidden border-2 border-blue-400/80 shadow-[0_0_20px_rgba(59,130,246,0.5)] shrink-0 bg-slate-900">
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
              <h2 className="text-2xl font-black text-blue-300 drop-shadow">{npc.name}</h2>
            </div>
            <p className="text-xs text-blue-200/80 mt-1">{npc.description}</p>
            <span className="inline-block text-[11px] font-bold text-amber-300 bg-amber-950/60 border border-amber-500/40 px-2 py-0.5 rounded-full mt-1">
              {player.name} มีสกิลครบ {player.skills.length} สกิลแล้ว!
            </span>
          </div>
        </div>

        {/* New Offered Skill Showcase */}
        <div className="bg-blue-950/40 border border-blue-500/40 rounded-2xl p-4 flex flex-col gap-2">
          <span className="text-xs font-bold text-blue-300 uppercase tracking-wider">✨ สกิลใหม่ที่สุ่มได้:</span>
          <div className="flex items-center gap-3 bg-blue-900/40 p-3 rounded-xl border border-blue-400/30">
            <div className="text-3xl shrink-0">📜</div>
            <div>
              <h3 className="text-lg font-bold text-amber-300">{newSkill.nameTh || newSkill.name}</h3>
              <p className="text-xs text-slate-300">{newSkill.description}</p>
              <span className="text-[11px] text-blue-300 mt-1 inline-block">คูลดาวน์: {newSkill.cooldown} เทิร์น</span>
            </div>
          </div>
        </div>

        {/* Selection: Choose which current skill to replace */}
        <div className="flex flex-col gap-3">
          <label className="text-sm font-bold text-slate-200">
            เลือกสกิลเดิม 1 สกิลที่จะถูกแทนที่:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {player.skills.map((skill) => {
              const isSelected = selectedOldSkillId === skill.id;
              return (
                <div
                  key={skill.id}
                  onClick={() => setSelectedOldSkillId(skill.id)}
                  className={`cursor-pointer p-3.5 rounded-xl border transition-all duration-200 flex flex-col justify-between ${
                    isSelected
                      ? "bg-blue-600/30 border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.4)] scale-[1.02]"
                      : "bg-slate-900/80 border-slate-800 hover:border-blue-500/40 opacity-80"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-200 text-sm">{skill.nameTh || skill.name}</span>
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${isSelected ? "border-blue-400 bg-blue-500" : "border-slate-600"}`}>
                      {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">{skill.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-bold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition"
          >
            ไม่เปลี่ยนสกิล (ข้าม)
          </button>
          <button
            onClick={() => onConfirmSwap(selectedOldSkillId, newSkill)}
            className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-[0_0_20px_rgba(59,130,246,0.5)] transition flex items-center gap-2"
          >
            <span>🔄</span>
            <span>ยืนยันเปลี่ยนสกิล</span>
          </button>
        </div>

      </div>
    </div>
  );
}
