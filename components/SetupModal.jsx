"use client";

import { useState } from "react";
import { HOUSES, WANDS, ARMOR_POOL, AMULET_POOL, POTIONS, SKILLS, PETS, SKILL_LIST, PET_LIST } from "@/lib/gameData";
import { generateBingoCard } from "@/lib/bingoEngine";
import { getTotalDmg } from "@/lib/gameEngine";
import HouseModelPreview from "@/components/board3d/HouseModelPreview";

export default function SetupModal({ players, onCompleteSetup, onOpenAdmin }) {
  const [currentHouseIndex, setCurrentHouseIndex] = useState(0);
  const [setupPlayers, setSetupPlayers] = useState([...players]);
  const [activeTab, setActiveTab] = useState("wands"); // wands | pets | skills

  const currentPlayer = setupPlayers[currentHouseIndex];
  const houseInfo = HOUSES[currentPlayer?.houseId] || {};

  const equippedWandName = currentPlayer?.wand
    ? (currentPlayer.wand.type === "vip"
        ? (currentPlayer.vipWand || houseInfo.vipWand)
        : (currentPlayer.commonWand || houseInfo.commonWand))
    : "Not Equipped";

  const equippedWandImg = currentPlayer?.wand
    ? (currentPlayer.wand.type === "vip"
        ? (currentPlayer.vipWandImg || houseInfo.vipWandImg)
        : (currentPlayer.commonWandImg || houseInfo.commonWandImg))
    : null;

  function handleToggleEquip(itemType, itemId) {
    const updated = [...setupPlayers];
    const p = { ...updated[currentHouseIndex] };

    if (itemType === "wand") {
      if (p.wand?.type === itemId) {
        p.wand = null; // Unequip
      } else {
        p.wand = { 
          type: itemId, 
          name: itemId === "vip" ? (p.vipWand || houseInfo.vipWand) : (p.commonWand || houseInfo.commonWand),
          dmgBonus: itemId === "common" ? 20 : 35 
        };
      }
    } else if (itemType === "pet") {
      if (p.pet?.id === itemId) {
        p.pet = null; // Unequip
      } else {
        p.pet = PETS[itemId] || null;
      }
    } else if (itemType === "skill") {
      if (p.skills.includes(itemId)) {
        p.skills = p.skills.filter((skId) => skId !== itemId); // Unequip skill
      } else if (p.skills.length < 2) {
        p.skills = [...p.skills, itemId];
      }
    } else if (itemType === "bingo") {
      if (p.hasBingoCard) {
        p.hasBingoCard = false;
        p.bingoCard = null;
      } else {
        p.hasBingoCard = true;
        p.bingoCard = generateBingoCard();
      }
    }

    updated[currentHouseIndex] = p;
    setSetupPlayers(updated);
  }

  function handleGiveBingoAll() {
    const updated = setupPlayers.map((p) => ({
      ...p,
      hasBingoCard: true,
      bingoCard: p.bingoCard || generateBingoCard(),
    }));
    setSetupPlayers(updated);
  }

  function handleNextHouse() {
    if (currentHouseIndex < setupPlayers.length - 1) {
      setCurrentHouseIndex((idx) => idx + 1);
    } else {
      onCompleteSetup(setupPlayers);
    }
  }

  const totalDmg = getTotalDmg(currentPlayer);

  return (
    <div className="modal-overlay z-50 flex items-center justify-center p-2 sm:p-4 bg-black/95 backdrop-blur-md">
      <div className="modal-box max-w-4xl w-full bg-slate-950/90 backdrop-blur-2xl border border-amber-500/20 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col max-h-[95vh]">
        
        {/* TOP HUD STAT BAR (Health, Attack, Armor, Magic) */}
        <div className="bg-[#161a23] border-b border-white/10 px-6 py-3 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-emerald-400 text-lg">❤️</span>
              <div>
                <div className="text-[9px] font-black uppercase text-white/50 tracking-wider">HEALTH</div>
                <div className="text-sm font-black text-white">{currentPlayer.hp} / {currentPlayer.maxHp}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-orange-400 text-lg">⚔️</span>
              <div>
                <div className="text-[9px] font-black uppercase text-white/50 tracking-wider">ATTACK</div>
                <div className="text-sm font-black text-orange-400">{totalDmg}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-blue-400 text-lg">🛡️</span>
              <div>
                <div className="text-[9px] font-black uppercase text-white/50 tracking-wider">ARMOR</div>
                <div className="text-sm font-black text-blue-300">
                  {currentPlayer.armor ? (currentPlayer.armor.hpBonus ? `${currentPlayer.armor.hpBonus > 0 ? "+" : ""}${currentPlayer.armor.hpBonus} HP` : `+${currentPlayer.armor.dmgBonus || 0} DMG`) : "None"}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="bg-amber-950/60 border border-amber-500/40 px-4 py-1.5 rounded-xl flex items-center gap-2">
              <span className="text-xs text-amber-400 font-bold">GOLD</span>
              <span className="text-base font-black text-amber-400">💰 {currentPlayer.gold.toLocaleString()}</span>
            </div>
            {/* House Switcher Dots */}
            <div className="flex gap-1.5">
              {setupPlayers.map((p, idx) => (
                <button
                  key={p.houseId}
                  onClick={() => setCurrentHouseIndex(idx)}
                  className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center overflow-hidden transition-all ${
                    idx === currentHouseIndex ? "border-amber-400 scale-110 shadow-[0_0_10px_rgba(245,158,11,0.6)]" : "border-white/20 opacity-40"
                  }`}
                  style={{ backgroundColor: p.color }}
                  title={p.name}
                >
                  {p.image ? <img src={p.image} alt={p.name} className="w-full h-full object-cover" /> : p.emoji}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* HERO CHARACTER STAGE + INVENTORY SLOTS (RPG GAME LAYOUT) */}
        <div className="flex-1 p-6 relative flex flex-col lg:flex-row items-center justify-between gap-6 overflow-y-auto bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-[#0b0e14] to-[#05070a]">
          
          {/* LEFT SLOTS (Wand, Armor, Amulet, Pet) */}
          <div className="flex flex-col gap-3 z-10 w-full lg:w-48">
            <SlotFrame
              label="Wand"
              icon="🪄"
              img={equippedWandImg}
              active={!!currentPlayer.wand}
              itemTitle={equippedWandName}
              itemSub={currentPlayer.wand ? `+${currentPlayer.wand.dmgBonus} DMG` : "Tap to select"}
            />
            <SlotFrame
              label="Armor"
              icon="🛡️"
              img={currentPlayer.armor ? currentPlayer.armor.image : null}
              active={!!currentPlayer.armor}
              itemTitle={currentPlayer.armor ? currentPlayer.armor.name : "Not Equipped"}
              itemSub={currentPlayer.armor ? currentPlayer.armor.description : "Random armor on start"}
            />
          </div>

          {/* CENTER HERO STAGE FRAME */}
          <div className="flex flex-col items-center justify-center relative my-2 z-0">
            <div className="text-center mb-2">
              <h2 className="text-2xl font-black text-white tracking-wide uppercase drop-shadow-md">{currentPlayer.name}</h2>
              <p className="text-xs text-amber-400 font-bold uppercase tracking-widest">{currentPlayer.nameEn} · MEMBER {currentPlayer.memberCount}</p>
            </div>

            {/* Character Spotlight Display with 3D Model */}
            <div className="relative w-56 h-72 rounded-3xl border-4 border-amber-500/30 bg-black/60 shadow-[0_0_40px_rgba(0,0,0,0.8)] overflow-hidden flex items-center justify-center group">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(245,158,11,0.15),transparent_70%)] pointer-events-none z-0" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80 z-10 pointer-events-none" />
              <HouseModelPreview
                houseId={currentPlayer.houseId}
                fallbackImage={currentPlayer.image}
                fallbackEmoji={currentPlayer.emoji}
                className="w-full h-full relative z-0"
              />
              {/* HERO POWER BADGE */}
              <div className="absolute bottom-3 inset-x-0 z-20 flex flex-col items-center pointer-events-none">
                <span className="text-[9px] font-black uppercase text-amber-400 tracking-widest">HERO POWER</span>
                <span className="text-xl font-black text-white tracking-wider">{totalDmg * 10 + currentPlayer.hp * 5}</span>
              </div>
            </div>
          </div>

          {/* RIGHT SLOTS (Skills & Pet) */}
          <div className="flex flex-col gap-3 z-10 w-full lg:w-48">
            <SlotFrame
              label="Pet"
              icon="🐾"
              active={!!currentPlayer.pet}
              itemTitle={currentPlayer.pet ? currentPlayer.pet.name : "No Pet"}
              itemSub={currentPlayer.pet ? currentPlayer.pet.description : "Permanent buff"}
            />
            <SlotFrame
              label="Skill 1"
              icon="✨"
              active={(currentPlayer.skills || []).length > 0}
              itemTitle={currentPlayer.skills?.[0] ? SKILLS[currentPlayer.skills[0]]?.name : "Not Assigned"}
              itemSub={currentPlayer.skills?.[0] ? SKILLS[currentPlayer.skills[0]]?.nameTh : "Tap to select"}
            />
            <SlotFrame
              label="Skill 2"
              icon="🔮"
              active={(currentPlayer.skills || []).length > 1}
              itemTitle={currentPlayer.skills?.[1] ? SKILLS[currentPlayer.skills[1]]?.name : "Not Assigned"}
              itemSub={currentPlayer.skills?.[1] ? SKILLS[currentPlayer.skills[1]]?.nameTh : "Tap to select"}
            />
          </div>

        </div>

        {/* BOTTOM EQUIPMENT / SHOP SELECTION TAB BAR */}
        <div className="bg-[#121620] border-t border-white/10 p-4 space-y-4">
          
          {/* Tab Navigation */}
          <div className="flex justify-center gap-2 border-b border-white/10 pb-3">
            <TabBtn active={activeTab === "wands"} label="Wands" onClick={() => setActiveTab("wands")} />
            <TabBtn active={activeTab === "pets"} label="Pets" onClick={() => setActiveTab("pets")} />
            <TabBtn active={activeTab === "skills"} label="Skills" onClick={() => setActiveTab("skills")} />
            <TabBtn active={activeTab === "bingo"} label="Bingo" onClick={() => setActiveTab("bingo")} />
          </div>

          {/* Tab Content Cards Grid */}
          <div className="max-h-44 overflow-y-auto pr-1">
            {activeTab === "wands" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <ShopCard
                  title={`Common Wand · ${currentPlayer.commonWand || houseInfo.commonWand}`}
                  desc="+20 DMG · 1,290 Gold"
                  price={1290}
                  gold={currentPlayer.gold}
                  owned={currentPlayer.wand?.type === "common"}
                  onBuy={() => handleToggleEquip("wand", "common")}
                  icon="🪄"
                  img={currentPlayer.commonWandImg || houseInfo.commonWandImg}
                />
                <ShopCard
                  title={`VIP Wand · ${currentPlayer.vipWand || houseInfo.vipWand}`}
                  desc="+35 DMG · 2,200 Gold"
                  price={2200}
                  gold={currentPlayer.gold}
                  owned={currentPlayer.wand?.type === "vip"}
                  onBuy={() => handleToggleEquip("wand", "vip")}
                  icon="✨"
                  img={currentPlayer.vipWandImg || "/images/items/weapons/wand_takian_green.webp"}
                />
              </div>
            )}

            {activeTab === "pets" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PET_LIST.map((pet) => (
                  <ShopCard
                    key={pet.id}
                    title={`${pet.name} · ${pet.nameEn}`}
                    desc={pet.description}
                    price={pet.price}
                    gold={currentPlayer.gold}
                    owned={currentPlayer.pet?.id === pet.id}
                    disabled={false}
                    onBuy={() => handleToggleEquip("pet", pet.id)}
                    icon={pet.emoji}
                    img={pet.image}
                  />
                ))}
              </div>
            )}

            {activeTab === "skills" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SKILL_LIST.map((sk) => {
                  const isOwned = (currentPlayer.skills || []).includes(sk.id);
                  return (
                    <ShopCard
                      key={sk.id}
                      title={`${sk.name} · ${sk.nameTh}`}
                      desc={sk.description}
                      price={2000}
                      gold={currentPlayer.gold}
                      owned={isOwned}
                      disabled={!isOwned && (currentPlayer.skills || []).length >= 2}
                      onBuy={() => handleToggleEquip("skill", sk.id)}
                      icon={null}
                      img={`/images/skills/${sk.id}_skill.webp`}
                    />
                  );
                })}
              </div>
            )}

            {activeTab === "bingo" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <ShopCard
                  title="Mystic Bingo Card"
                  desc="Equip a 5x5 Bingo board on bottom-right to earn bonus Gold"
                  price={500}
                  gold={currentPlayer.gold}
                  owned={currentPlayer.hasBingoCard}
                  onBuy={() => handleToggleEquip("bingo")}
                  icon="🎯"
                  img="/images/items/special/bingo.webp"
                />
              </div>
            )}
          </div>

          {/* Footer Next Button & Admin Access */}
          <div className="flex justify-between items-center pt-2 border-t border-white/5">
            <div className="flex items-center gap-3">
              <span className="text-xs text-white/40 font-bold">
                {currentHouseIndex + 1} of {setupPlayers.length} Houses
              </span>
              <button
                onClick={handleGiveBingoAll}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-yellow-500/20 hover:from-amber-500/40 hover:to-yellow-500/40 border border-amber-500/50 text-amber-300 font-bold text-xs flex items-center gap-1.5 transition-all hover:scale-105"
                title="Equip Bingo Card to all houses"
              >
                <span>Give Bingo to All</span>
              </button>
              {onOpenAdmin && (
                <button
                  onClick={onOpenAdmin}
                  className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300 font-bold text-xs flex items-center gap-1.5 transition-all hover:scale-105"
                  title="Open Admin Panel"
                >
                  <span>Admin Setup</span>
                </button>
              )}
            </div>
            <button
              onClick={handleNextHouse}
              className="btn-primary text-sm px-8 py-3 rounded-xl font-black shadow-lg hover:scale-105 transition-transform"
            >
              {currentHouseIndex < setupPlayers.length - 1
                ? `Next: ${setupPlayers[currentHouseIndex + 1].name}`
                : "Start Game"}
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}

function SlotFrame({ label, icon, img, active, itemTitle, itemSub }) {
  return (
    <div className={`p-3 rounded-2xl border-2 transition-all flex items-center gap-3 relative overflow-hidden ${
      active ? "border-amber-400 bg-amber-950/20 shadow-[0_0_15px_rgba(245,158,11,0.2)]" : "border-white/10 bg-black/40"
    }`}>
      <div className="w-10 h-10 rounded-xl border border-white/20 bg-black flex items-center justify-center text-xl flex-shrink-0 overflow-hidden relative shadow-inner">
        {img ? (
          <img
            src={img}
            alt={label}
            className="w-full h-full object-contain p-0.5"
            onError={(e) => {
              e.currentTarget.style.display = "none";
              e.currentTarget.nextElementSibling.style.display = "block";
            }}
          />
        ) : null}
        <span className={`text-xl ${img ? "hidden" : "block"}`}>{icon}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[9px] font-black uppercase text-amber-400 tracking-wider">{label}</div>
        <div className="text-xs font-black text-white truncate">{itemTitle}</div>
        <div className="text-[9px] text-white/50 truncate">{itemSub}</div>
      </div>
    </div>
  );
}

function TabBtn({ active, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-5 py-2 rounded-xl text-xs font-black transition-all ${
        active ? "bg-amber-500 text-black shadow-md scale-105" : "bg-white/5 text-white/60 hover:bg-white/10"
      }`}
    >
      {label}
    </button>
  );
}

function ShopCard({ title, desc, price, gold, onBuy, icon, img, owned = false, disabled = false }) {
  const isDisabled = disabled;

  return (
    <button
      onClick={!isDisabled ? onBuy : undefined}
      disabled={isDisabled}
      className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all text-left w-full ${
        owned
          ? "border-emerald-500/60 bg-emerald-950/40 text-emerald-300 hover:border-red-400 hover:bg-red-950/30 hover:text-red-300 cursor-pointer"
          : isDisabled
          ? "border-white/5 bg-black/40 text-white/30 opacity-40 cursor-not-allowed"
          : "border-white/10 bg-white/5 hover:border-amber-400 hover:bg-white/10 text-white cursor-pointer"
      }`}
    >
      <div className="w-10 h-10 rounded-lg border border-white/20 bg-black/60 flex items-center justify-center flex-shrink-0 overflow-hidden relative shadow-inner">
        {img ? (
          <img
            src={img}
            alt={title}
            className="w-full h-full object-contain p-0.5"
            onError={(e) => {
              e.currentTarget.style.display = "none";
              e.currentTarget.nextElementSibling.style.display = "block";
            }}
          />
        ) : null}
        <span className={`text-xl ${img ? "hidden" : "block"}`}>{icon}</span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="font-black text-xs truncate">{title}</div>
        <div className="text-[10px] opacity-70 truncate">{desc}</div>
      </div>
      <span className="font-black text-xs flex-shrink-0 ml-2">
        {owned ? "Unequip" : "Equip"}
      </span>
    </button>
  );
}
