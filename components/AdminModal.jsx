"use client";

import { useState } from "react";
import {
  ARMOR_POOL,
  AMULET_POOL,
  POTIONS,
  POTION_LIST,
  SKILLS,
  SKILL_LIST,
  PETS,
  PET_LIST,
  WANDS,
} from "@/lib/gameData";
import { getTotalDmg } from "@/lib/gameEngine";

import { setSfxVolume, getSfxVolume } from "@/lib/sfx";

export default function AdminModal({ players, onDispatch, onClose, isBgmMuted, onToggleBgm, onConfirmSetup }) {
  const [selectedHouseIdx, setSelectedHouseIdx] = useState(0);
  const [activeCategory, setActiveCategory] = useState("gold"); // gold | wand | armor | amulet | potion | skill | pet
  const [sfxVol, setSfxVolState] = useState(() => (typeof window !== "undefined" ? getSfxVolume() : 0.8));
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleSfxChange = (e) => {
    const val = parseFloat(e.target.value);
    setSfxVolState(val);
    setSfxVolume(val);
  };

  if (!players || players.length === 0) return null;

  const player = players[selectedHouseIdx] || players[0];
  const totalDmg = getTotalDmg(player);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in pointer-events-auto"
      onClick={onClose}
    >
      {/* ── HOGPOD STYLED RESET CONFIRMATION MODAL ───────────────── */}
      {showResetConfirm && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-fade-in"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="max-w-md w-full bg-slate-950 border-2 border-red-500/80 rounded-3xl p-6 shadow-[0_0_50px_rgba(239,68,68,0.4)] text-center text-white flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-red-950/80 border-2 border-red-500 flex items-center justify-center text-[#e51b4b] font-black text-xl tracking-wider shadow-lg">
              ATTENTION
            </div>
            <div>
              <h3 className="text-xl font-black text-red-400 uppercase tracking-wide">
                RESET GAME CONFIRMATION
              </h3>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed font-semibold">
                Are you sure you want to reset the current game session? All player progression, inventory, and board status will be completely reset.
              </p>
            </div>

            <div className="w-full flex items-center gap-3 mt-3">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white font-bold text-xs border border-white/10 transition-all hover:scale-105"
              >
                CANCEL
              </button>
              <button
                onClick={() => {
                  setShowResetConfirm(false);
                  onClose();
                  onDispatch({ type: "RESET" });
                }}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-black text-xs shadow-[0_0_20px_rgba(229,27,75,0.4)] border border-red-400 transition-all hover:scale-105"
              >
                CONFIRM RESET
              </button>
            </div>
          </div>
        </div>
      )}
      <div
        className="relative w-full max-w-5xl bg-slate-950/95 border-2 border-amber-500/50 rounded-3xl p-4 sm:p-6 shadow-[0_0_60px_rgba(245,158,11,0.25)] flex flex-col max-h-[92vh] text-white overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        <div className="flex items-center justify-between border-b border-amber-500/20 pb-3 mb-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-sm font-black text-amber-400 shadow-inner">
              ADM
            </div>
            <div>
              <h2 className="font-black text-amber-400 text-lg sm:text-xl tracking-tight flex items-center gap-2">
                เมนูควบคุมแอดมิน (PAY TO WIN GOD MODE)
                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-bold">
                  ADMIN POWER
                </span>
              </h2>
              <p className="text-xs text-white/50 font-semibold">
                เลือกบ้านเพื่อดูหน้าช่องตัวละคร อุปกรณ์สวมใส่ และเปย์ไอเทมจากร้านค้าเข้าบ้านได้ทันที
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-black/40 border border-white/10 px-3 py-1 rounded-xl text-xs">
              <span className="text-amber-400 font-bold">🔊 SFX Vol:</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={sfxVol}
                onChange={handleSfxChange}
                className="w-20 accent-amber-400 cursor-pointer"
                title={`SFX Volume: ${Math.round(sfxVol * 100)}%`}
              />
            </div>
            {onToggleBgm && (
              <button
                onClick={onToggleBgm}
                className={`px-3 py-1.5 rounded-xl border text-xs font-black flex items-center gap-2 transition-all hover:scale-105 shadow-md ${
                  isBgmMuted
                    ? "bg-red-950/80 border-red-500/50 text-red-300 hover:bg-red-900"
                    : "bg-emerald-950/80 border-emerald-500/50 text-emerald-300 hover:bg-emerald-900"
                }`}
                title={isBgmMuted ? "เปิดเสียงเพลงหลัก BGM" : "ปิดเสียงเพลงหลัก BGM"}
              >
                <span>{isBgmMuted ? "🔇" : "🎵"}</span>
                <span>{isBgmMuted ? "เปิดเสียง BGM" : "ปิดเสียง BGM"}</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-red-500/30 hover:border-red-500/50 border border-white/15 text-white/70 hover:text-red-300 font-black flex items-center justify-center text-base transition-all"
            >
              ✕
            </button>
          </div>
        </div>

        {/* ── HOUSE SELECTOR TABS (4 Houses) ─────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4 flex-shrink-0">
          {players.map((p, idx) => {
            const isSelected = idx === selectedHouseIdx;
            const pDmg = getTotalDmg(p);
            return (
              <button
                key={p.houseId}
                onClick={() => setSelectedHouseIdx(idx)}
                className={`relative p-2.5 rounded-2xl border transition-all text-left flex items-center gap-3 ${
                  isSelected
                    ? "border-amber-400 bg-slate-900 shadow-[0_0_15px_rgba(245,158,11,0.3)] scale-[1.02]"
                    : "border-white/10 bg-slate-950/60 hover:border-white/20 hover:bg-slate-900/40 opacity-80 hover:opacity-100"
                }`}
                style={{
                  borderColor: isSelected ? p.color : undefined,
                  boxShadow: isSelected ? `0 0 15px ${p.color}40` : undefined,
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl border overflow-hidden flex-shrink-0 bg-black flex items-center justify-center text-xl shadow-md"
                  style={{ borderColor: p.color }}
                >
                  {p.image ? (
                    <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <span>{p.emoji}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-xs text-white truncate">{p.name}</span>
                    {!p.isAlive && (
                      <span className="text-[9px] bg-red-500/30 text-red-300 border border-red-500/50 px-1 rounded font-bold">
                        ตาย
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-white/60 mt-0.5">
                    <span className="text-emerald-400 font-bold">❤️ {p.hp}/{p.maxHp}</span>
                    <span className="text-orange-400 font-bold">⚔️ {pDmg}</span>
                  </div>
                  <div className="text-[10px] text-amber-400 font-black truncate">
                    💰 {p.gold.toLocaleString()}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* ── MAIN CONTENT GRID: LEFT CHARACTER SLOT OVERVIEW, RIGHT PAY-TO-WIN SHOP ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4 flex-1 overflow-hidden min-h-0">
          
          {/* LEFT: SELECTED HOUSE CHARACTER SLOT OVERVIEW CARD */}
          <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-4 flex flex-col overflow-y-auto space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">{player.emoji}</span>
                <div>
                  <h3 className="font-black text-sm text-white">{player.name}</h3>
                  <p className="text-[10px] text-white/50">{player.nameEn} · ช่อง #{player.position}</p>
                </div>
              </div>
              <button
                onClick={() => onDispatch({ type: "ADMIN_REVIVE_PLAYER", playerIndex: selectedHouseIdx })}
                className="text-[10px] font-black bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 text-emerald-300 px-2 py-1 rounded-lg transition-all"
                title="ฟื้นฟู HP เต็มและคืนชีพ"
              >
                💖 Heal / Revive
              </button>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-black/50 border border-white/5 p-2 rounded-xl">
                <div className="text-[9px] text-white/40 font-bold">❤️ HP</div>
                <div className="font-black text-emerald-400">{player.hp}/{player.maxHp}</div>
              </div>
              <div className="bg-black/50 border border-white/5 p-2 rounded-xl">
                <div className="text-[9px] text-white/40 font-bold">⚔️ Total DMG</div>
                <div className="font-black text-orange-400">{totalDmg}</div>
              </div>
              <div className="bg-black/50 border border-white/5 p-2 rounded-xl">
                <div className="text-[9px] text-white/40 font-bold">💰 Gold</div>
                <div className="font-black text-amber-400">{player.gold.toLocaleString()}</div>
              </div>
            </div>

            {/* Character Equipment Slots */}
            <div>
              <div className="text-[10px] font-black uppercase text-amber-400/80 mb-1.5 flex items-center justify-between">
                <span>🛡️ ช่องอุปกรณ์สวมใส่</span>
                <span className="text-[9px] text-white/40 font-normal">(คลิก ✕ เพื่อถอดออก)</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {/* Wand Slot */}
                <div className="bg-black/40 border border-white/10 p-2 rounded-xl flex items-center gap-2">
                  <div className="w-9 h-9 rounded-lg border border-white/10 bg-black/60 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {player.wand ? (
                      <>
                        <img
                          src={player.wand.type === "vip" ? player.vipWandImg : player.commonWandImg}
                          alt={player.wand.type === "vip" ? player.vipWand : player.commonWand}
                          className="w-full h-full object-contain p-0.5"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                            e.currentTarget.nextElementSibling.style.display = "flex";
                          }}
                        />
                        <span className="hidden w-full h-full items-center justify-center text-base">{player.wand.type === "vip" ? "✨" : "🪄"}</span>
                      </>
                    ) : (
                      <span className="text-base">🪄</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[9px] text-white/40 font-bold">🪄 ไม้กายสิทธิ์</div>
                    <div className="text-xs font-black text-amber-300 truncate">
                      {player.wand ? (player.wand.type === "vip" ? player.vipWand : player.commonWand) : "ไม่มี"}
                    </div>
                  </div>
                  {player.wand && (
                    <button
                      onClick={() => onDispatch({ type: "ADMIN_REMOVE_ITEM", playerIndex: selectedHouseIdx, itemType: "wand" })}
                      className="text-xs text-red-400 hover:text-red-300 p-1"
                      title="ถอดไม้กายสิทธิ์"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Armor Slot */}
                <div className="bg-black/40 border border-white/10 p-2 rounded-xl flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="text-[9px] text-white/40 font-bold">🛡️ เสื้อเกราะ</div>
                    <div className="text-xs font-black text-blue-300 truncate">
                      {player.armor ? player.armor.name : "ไม่มี"}
                    </div>
                  </div>
                  {player.armor && (
                    <button
                      onClick={() => onDispatch({ type: "ADMIN_REMOVE_ITEM", playerIndex: selectedHouseIdx, itemType: "armor" })}
                      className="text-xs text-red-400 hover:text-red-300 p-1"
                      title="ถอดเสื้อเกราะ"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Amulet Slot */}
                <div className="bg-black/40 border border-white/10 p-2 rounded-xl flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="text-[9px] text-white/40 font-bold">📿 เครื่องราง</div>
                    <div className="text-xs font-black text-purple-300 truncate">
                      {player.amulet ? player.amulet.name : "ไม่มี"}
                    </div>
                  </div>
                  {player.amulet && (
                    <button
                      onClick={() => onDispatch({ type: "ADMIN_REMOVE_ITEM", playerIndex: selectedHouseIdx, itemType: "amulet" })}
                      className="text-xs text-red-400 hover:text-red-300 p-1"
                      title="ถอดเครื่องราง"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Pet Slot */}
                <div className="bg-black/40 border border-white/10 p-2 rounded-xl flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="text-[9px] text-white/40 font-bold">🐾 สัตว์วิเศษ</div>
                    <div className="text-xs font-black text-emerald-300 truncate">
                      {player.pet ? `${player.pet.emoji} ${player.pet.name}` : "ไม่มี"}
                    </div>
                  </div>
                  {player.pet && (
                    <button
                      onClick={() => onDispatch({ type: "ADMIN_REMOVE_ITEM", playerIndex: selectedHouseIdx, itemType: "pet" })}
                      className="text-xs text-red-400 hover:text-red-300 p-1"
                      title="ถอดสัตว์วิเศษ"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Potion Slots (5 slots) */}
            <div>
              <div className="text-[10px] font-black uppercase text-amber-400/80 mb-1 flex items-center justify-between">
                <span>🧪 กระเป๋ายา ({player.potions.length}/5)</span>
                {player.potions.length > 0 && (
                  <button
                    onClick={() => onDispatch({ type: "ADMIN_REMOVE_ITEM", playerIndex: selectedHouseIdx, itemType: "clear_potions" })}
                    className="text-[9px] text-red-400 hover:text-red-300"
                  >
                    ล้างยาออกทั้งหมด
                  </button>
                )}
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {Array.from({ length: 5 }).map((_, slotIdx) => {
                  const potId = player.potions[slotIdx];
                  const pot = potId ? POTIONS[potId] : null;
                  return (
                    <div
                      key={slotIdx}
                      className={`h-16 rounded-xl border flex flex-col items-center justify-center p-1 relative text-center ${
                        pot
                          ? "border-emerald-500/40 bg-emerald-950/30 text-white"
                          : "border-white/10 bg-black/40 text-white/20"
                      }`}
                      title={pot ? pot.name : "ช่องว่าง"}
                    >
                      <div className="w-full h-10 flex items-center justify-center overflow-hidden rounded">
                        {pot ? (
                          pot.image ? (
                            <>
                              <img
                                src={pot.image}
                                alt={pot.name}
                                className="w-full h-full object-contain p-0.5"
                                onError={(e) => {
                                  e.currentTarget.style.display = "none";
                                  e.currentTarget.nextElementSibling.style.display = "flex";
                                }}
                              />
                              <span className="hidden w-full h-full items-center justify-center text-base" />
                            </>
                          ) : (
                            <span className="text-base" />
                          )
                        ) : (
                          <span className="text-base">•</span>
                        )}
                      </div>
                      <span className="text-[8px] font-black truncate w-full">{pot ? pot.name : "ว่าง"}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Skill Slots (2 slots) */}
            <div>
              <div className="text-[10px] font-black uppercase text-amber-400/80 mb-1 flex items-center justify-between">
                <span>✨ คาถาประจำบ้าน ({player.skills.length}/2)</span>
                {player.skills.length > 0 && (
                  <button
                    onClick={() => onDispatch({ type: "ADMIN_REMOVE_ITEM", playerIndex: selectedHouseIdx, itemType: "clear_skills" })}
                    className="text-[9px] text-red-400 hover:text-red-300"
                  >
                    ล้างสกิลทั้งหมด
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {Array.from({ length: 2 }).map((_, slotIdx) => {
                  const skillId = player.skills[slotIdx];
                  const skill = skillId ? SKILLS[skillId] : null;
                  return (
                    <div
                      key={slotIdx}
                      className={`h-10 px-2 rounded-xl border flex items-center gap-1.5 text-left ${
                        skill
                          ? "border-purple-500/40 bg-purple-950/30 text-purple-200"
                          : "border-white/10 bg-black/40 text-white/20"
                      }`}
                    >
                      <div className="w-6 h-6 rounded shrink-0 flex items-center justify-center overflow-hidden bg-black/40">
                        {skill ? (
                          <img src={`/images/skills/${skill.id}_skill.webp`} alt={skill.name} className="w-full h-full object-contain" />
                        ) : (
                          <span className="text-xs">🔮</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[10px] font-black truncate">{skill ? skill.name : "ช่องสกิลว่าง"}</div>
                        {skill && <div className="text-[8px] text-white/40 truncate">{skill.description}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Mega God Mode Button */}
            <button
              onClick={() => onDispatch({ type: "ADMIN_GOD_MODE", playerIndex: selectedHouseIdx })}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-black text-xs shadow-lg flex items-center justify-center gap-2 transform active:scale-95 transition-all mt-auto"
            >
              <span>⚡</span> 👑 GOD MODE (จัดเต็ม VIP Gear + 50k Gold)
            </button>
          </div>

          {/* RIGHT: PAY TO WIN SHOP GRANTING PANEL */}
          <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-4 flex flex-col overflow-hidden">
            
            {/* Category Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-white/10 flex-shrink-0 mb-3">
              <ShopTab active={activeCategory === "gold"} icon="💰" label="เงิน Gold" onClick={() => setActiveCategory("gold")} />
              <ShopTab active={activeCategory === "wand"} icon="🪄" label="ไม้กายสิทธิ์" onClick={() => setActiveCategory("wand")} />
              <ShopTab active={activeCategory === "armor"} icon="🛡️" label="เสื้อเกราะ" onClick={() => setActiveCategory("armor")} />
              <ShopTab active={activeCategory === "amulet"} icon="📿" label="เครื่องราง" onClick={() => setActiveCategory("amulet")} />
              <ShopTab active={activeCategory === "potion"} icon="🧪" label="ยาไอเทม" onClick={() => setActiveCategory("potion")} />
              <ShopTab active={activeCategory === "skill"} icon="✨" label="วิชาคาถา" onClick={() => setActiveCategory("skill")} />
              <ShopTab active={activeCategory === "pet"} icon="🐾" label="สัตว์วิเศษ" onClick={() => setActiveCategory("pet")} />
            </div>

            {/* Item List / Actions Grid */}
            <div className="flex-1 overflow-y-auto pr-1">
              {/* GOLD CATEGORY */}
              {activeCategory === "gold" && (
                <div className="space-y-3">
                  <div className="text-xs font-black text-amber-400 uppercase tracking-wider">
                    💰 แจกเงิน Gold ให้ {player.name}:
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[2000, 5000, 10000, 50000, 100000].map((amt) => (
                      <button
                        key={amt}
                        onClick={() =>
                          onDispatch({
                            type: "ADMIN_ADD_GOLD",
                            playerIndex: selectedHouseIdx,
                            amount: amt,
                          })
                        }
                        className="py-3 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 hover:border-amber-400 text-amber-300 font-black text-xs flex flex-col items-center justify-center gap-1 transition-all hover:scale-[1.02]"
                      >
                        <span className="text-base">💰</span>
                        <span>+{amt.toLocaleString()} Gold</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* WANDS CATEGORY */}
              {activeCategory === "wand" && (
                <div className="space-y-3">
                  <div className="text-xs font-black text-amber-400 uppercase tracking-wider">
                    🪄 เสกไม้กายสิทธิ์ให้ {player.name}:
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <ItemGrantCard
                      icon="🪄"
                      img={player.commonWandImg}
                      title={`ไม้ทั่วไป: ${player.commonWand}`}
                      desc="ไม้ประจำบ้าน (+20 DMG)"
                      badge="COMMON"
                      onGrant={() =>
                        onDispatch({
                          type: "ADMIN_GIVE_ITEM",
                          playerIndex: selectedHouseIdx,
                          itemType: "wand",
                          itemId: "common",
                        })
                      }
                    />
                    <ItemGrantCard
                      icon="✨"
                      img={player.vipWandImg}
                      title={`ไม้ VIP: ${player.vipWand}`}
                      desc="ไม้ VIP ประจำบ้าน (+35 DMG)"
                      badge="VIP TIER"
                      badgeColor="amber"
                      onGrant={() =>
                        onDispatch({
                          type: "ADMIN_GIVE_ITEM",
                          playerIndex: selectedHouseIdx,
                          itemType: "wand",
                          itemId: "vip",
                        })
                      }
                    />
                  </div>
                </div>
              )}

              {/* ARMOR CATEGORY */}
              {activeCategory === "armor" && (
                <div className="space-y-3">
                  <div className="text-xs font-black text-amber-400 uppercase tracking-wider">
                    🛡️ เสกเสื้อเกราะให้ {player.name}:
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {ARMOR_POOL.map((armor) => (
                      <ItemGrantCard
                        key={armor.id}
                        icon="🛡️"
                        title={armor.name}
                        desc={armor.description}
                        stats={`HP: ${armor.hpBonus > 0 ? `+${armor.hpBonus}` : armor.hpBonus} | DMG: +${armor.dmgBonus}`}
                        onGrant={() =>
                          onDispatch({
                            type: "ADMIN_GIVE_ITEM",
                            playerIndex: selectedHouseIdx,
                            itemType: "armor",
                            itemId: armor.id,
                            itemData: armor,
                          })
                        }
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* AMULET CATEGORY */}
              {activeCategory === "amulet" && (
                <div className="space-y-3">
                  <div className="text-xs font-black text-amber-400 uppercase tracking-wider">
                    📿 เสกเครื่องรางให้ {player.name}:
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {AMULET_POOL.map((amulet) => (
                      <ItemGrantCard
                        key={amulet.id}
                        icon="📿"
                        title={amulet.name}
                        desc={amulet.description}
                        stats={`DMG: +${amulet.dmgBonus}`}
                        onGrant={() =>
                          onDispatch({
                            type: "ADMIN_GIVE_ITEM",
                            playerIndex: selectedHouseIdx,
                            itemType: "amulet",
                            itemId: amulet.id,
                            itemData: amulet,
                          })
                        }
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* POTION CATEGORY */}
              {activeCategory === "potion" && (
                <div className="space-y-3">
                  <div className="text-xs font-black text-amber-400 uppercase tracking-wider">
                    🧪 ยัดยาไอเทมเข้ากระเป๋า {player.name}:
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {POTION_LIST.map((potion) => (
                      <ItemGrantCard
                        key={potion.id}
                        icon={null}
                        img={potion.image}
                        title={potion.name}
                        desc={potion.description}
                        badge={potion.nameEn}
                        onGrant={() =>
                          onDispatch({
                            type: "ADMIN_GIVE_ITEM",
                            playerIndex: selectedHouseIdx,
                            itemType: "potion",
                            itemId: potion.id,
                          })
                        }
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* SKILL CATEGORY */}
              {activeCategory === "skill" && (
                <div className="space-y-3">
                  <div className="text-xs font-black text-amber-400 uppercase tracking-wider">
                    ✨ สอนวิชาคาถาให้ {player.name}:
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {SKILL_LIST.map((skill) => (
                      <ItemGrantCard
                        key={skill.id}
                        icon={null}
                        img={`/images/skills/${skill.id}_skill.webp`}
                        title={skill.name}
                        desc={skill.description}
                        stats={`CoolDown: ${skill.cooldown} Turns`}
                        onGrant={() =>
                          onDispatch({
                            type: "ADMIN_GIVE_ITEM",
                            playerIndex: selectedHouseIdx,
                            itemType: "skill",
                            itemId: skill.id,
                          })
                        }
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* PET CATEGORY */}
              {activeCategory === "pet" && (
                <div className="space-y-3">
                  <div className="text-xs font-black text-amber-400 uppercase tracking-wider">
                    🐾 มอบสัตว์วิเศษให้ {player.name}:
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {PET_LIST.map((pet) => (
                      <ItemGrantCard
                        key={pet.id}
                        icon={pet.emoji}
                        title={pet.name}
                        desc={pet.description}
                        badge={pet.nameEn}
                        onGrant={() =>
                          onDispatch({
                            type: "ADMIN_GIVE_ITEM",
                            playerIndex: selectedHouseIdx,
                            itemType: "pet",
                            itemId: pet.id,
                            itemData: pet,
                          })
                        }
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Footer Actions */}
            <div className="pt-3 border-t border-white/10 mt-3 flex items-center justify-between flex-shrink-0">
              <button
                onClick={() => setShowResetConfirm(true)}
                className="px-4 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-300 font-black text-xs transition-all flex items-center gap-2"
              >
                RESET GAME
              </button>
              
              {onConfirmSetup ? (
                <button
                  onClick={() => {
                    onClose();
                    onConfirmSetup();
                  }}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all hover:scale-105"
                >
                  ยืนยันการตั้งค่า & สุ่มทอยเต๋าจัดลำดับ -&gt;
                </button>
              ) : (
                <div className="text-[11px] text-white/50 font-semibold">
                  แอดมินสายเปย์ Pay To Win System Active
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ShopTab({ active, icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all whitespace-nowrap ${
        active
          ? "bg-amber-500 text-black shadow-md scale-[1.03]"
          : "bg-white/5 hover:bg-white/15 text-white/70 hover:text-white"
      }`}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function ItemGrantCard({ icon, img, title, desc, stats, badge, badgeColor, onGrant }) {
  return (
    <div className="bg-black/50 border border-white/10 hover:border-amber-500/50 rounded-xl p-3 flex flex-col justify-between transition-all group">
      <div>
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="flex items-center gap-2 font-black text-xs text-white">
            <div className="w-7 h-7 rounded-lg border border-white/10 bg-black/60 flex items-center justify-center overflow-hidden flex-shrink-0">
              {img ? (
                <>
                  <img
                    src={img}
                    alt={title}
                    className="w-full h-full object-contain p-0.5"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                      e.currentTarget.nextElementSibling.style.display = "flex";
                    }}
                  />
                  <span className="hidden w-full h-full items-center justify-center text-lg">{icon}</span>
                </>
              ) : (
                <span className="text-lg">{icon}</span>
              )}
            </div>
            <span className="group-hover:text-amber-300 transition-colors">{title}</span>
          </div>
          {badge && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300">
              {badge}
            </span>
          )}
        </div>
        <p className="text-[11px] text-white/60 line-clamp-2">{desc}</p>
        {stats && <div className="text-[10px] font-bold text-amber-400/90 mt-1">{stats}</div>}
      </div>
      <button
        onClick={onGrant}
        className="mt-2 w-full py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/40 border border-amber-500/50 text-amber-300 font-black text-xs transition-all flex items-center justify-center gap-1 active:scale-95"
      >
        <span>⚡</span> เปย์ให้บ้านนี้ (Grant)
      </button>
    </div>
  );
}
