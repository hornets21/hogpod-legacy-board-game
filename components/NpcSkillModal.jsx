"use client";

import { useState } from "react";
import Image from "next/image";
import { NPCS, SKILLS, SKILL_LIST } from "@/lib/gameData";
import NpcModelPreview from "@/components/board3d/NpcModelPreview";

export default function NpcSkillModal({ player, onConfirmSwap, onClose }) {
  const npc = NPCS.skill_trainer;
  const [showRewards, setShowRewards] = useState(true);
  
  const getSkillId = (s) => (typeof s === "string" ? s : s?.id);
  const ownedIds = new Set(player?.skills?.map(getSkillId).filter(Boolean) || []);
  const unownedSkills = SKILL_LIST.filter((s) => !ownedIds.has(s.id));
  
  const [newSkill] = useState(() => {
    if (unownedSkills.length > 0) {
      return unownedSkills[Math.floor(Math.random() * unownedSkills.length)];
    }
    return SKILL_LIST[0];
  });

  const [selectedOldSkillId, setSelectedOldSkillId] = useState(getSkillId(player?.skills?.[0]) || "");

  if (!player) return null;

  return (
    <div className="npc-encounter-dock npc-encounter-dock--skill animate-fade-in">
      <div className="npc-encounter-dock__panel">
        
        {/* NPC 3D ENCOUNTER PREVIEW */}
        <NpcModelPreview npcId="skill_trainer" color={npc.color} />
        <div className="flex items-center justify-between border-b border-blue-500/30 pb-4">
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-xl font-black text-blue-300 drop-shadow">{npc.name}</h2>
              <p className="text-xs text-blue-200/80 mt-0.5">{npc.description}</p>
            </div>
          </div>
          <span className="text-xs font-bold text-amber-300 bg-amber-950/70 border border-amber-500/40 px-3 py-1 rounded-full shrink-0">
            สกิลเต็ม {(player.skills || []).length} สกิล
          </span>
        </div>

        {!showRewards && (
          <div className="rounded-2xl border border-blue-500/30 bg-blue-950/30 p-4 text-center">
            <p className="text-sm font-bold text-blue-100">ผู้ฝึก Skill กำลังเลือกเวทมนตร์ให้คุณ</p>
            <p className="mt-1 text-xs text-blue-200/70">พร้อมเรียนรู้สกิลใหม่หรือยัง?</p>
            <button onClick={() => setShowRewards(true)} className="mt-4 w-full rounded-xl border border-blue-300/60 bg-gradient-to-r from-blue-600 to-indigo-600 py-3 text-sm font-black shadow-[0_0_25px_rgba(59,130,246,0.4)] transition hover:scale-[1.02]">
              ดูสกิลที่ได้รับ
            </button>
          </div>
        )}

        {/* NEW OFFERED SKILL SHOWCASE */}
        {showRewards && <div className="bg-blue-950/40 border border-blue-500/40 rounded-2xl p-4 flex flex-col gap-2">
          <span className="text-xs font-bold text-blue-300 uppercase tracking-wider">✨ สกิลใหม่ที่สุ่มได้:</span>
          <div className="flex items-center gap-3 bg-blue-900/40 p-3 rounded-xl border border-blue-400/30">
            <div className="text-3xl shrink-0">📜</div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-amber-300">{newSkill.nameTh || newSkill.name}</h3>
                <span className="text-xs font-bold text-blue-300 bg-blue-950 border border-blue-400/40 px-2 py-0.5 rounded-md">
                  คูลดาวน์: {newSkill.cooldown} เทิร์น
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">{newSkill.description}</p>
            </div>
          </div>
        </div>}

        {/* CHOOSE OLD SKILL TO REPLACE */}
        {showRewards && <div className="flex flex-col gap-2.5">
          <label className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            เลือกสกิลเดิม 1 สกิลที่จะให้ NPC สลับแทนที่:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(player.skills || []).map((rawSkill) => {
              const skillId = typeof rawSkill === "string" ? rawSkill : rawSkill?.id;
              const skill = SKILLS[skillId] || (typeof rawSkill === "object" ? rawSkill : null);
              if (!skill) return null;
              const isSelected = selectedOldSkillId === skillId;
              return (
                <div
                  key={skillId}
                  onClick={() => setSelectedOldSkillId(skillId)}
                  className={`cursor-pointer p-3 rounded-xl border transition-all duration-200 flex flex-col justify-between ${
                    isSelected
                      ? "bg-blue-600/30 border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.4)] scale-[1.02]"
                      : "bg-slate-950/80 border-slate-800 hover:border-blue-500/40 opacity-80"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-200 text-xs">{skill.nameTh || skill.name}</span>
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${isSelected ? "border-blue-400 bg-blue-500" : "border-slate-600"}`}>
                      {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{skill.description}</p>
                </div>
              );
            })}
          </div>
        </div>}

        {/* ACTION BUTTONS */}
        {showRewards && <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <button
            onClick={typeof onClose === "function" ? onClose : undefined}
            disabled={typeof onClose !== "function"}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition disabled:opacity-50"
          >
            ไม่เปลี่ยนสกิล (ข้าม)
          </button>
          <button
            onClick={() => typeof onConfirmSwap === "function" && onConfirmSwap(selectedOldSkillId, newSkill)}
            disabled={typeof onConfirmSwap !== "function"}
            className="px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-[0_0_20px_rgba(59,130,246,0.5)] border border-blue-300/60 transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>🔄</span>
            <span>ยืนยันเปลี่ยนสกิล</span>
          </button>
        </div>}

      </div>
    </div>
  );
}
