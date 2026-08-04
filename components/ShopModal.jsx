"use client";

import { useState } from "react";
import { WANDS, ARMOR_POOL, AMULET_POOL, POTIONS, SKILLS, PETS, SKILL_LIST, PET_LIST } from "@/lib/gameData";

export default function ShopModal({ player, onBuy, onClose }) {
  const [activeCategory, setActiveCategory] = useState("wands"); // wands | armor | amulets | potions | skills | pets

  if (!player) return null;

  return (
    <div className="modal-overlay z-50 flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-md" onClick={onClose}>
      {/* WOODEN TAVERN / SHOPKEEPER STORE CONTAINER */}
      <div
        className="modal-box shop-modal max-w-5xl w-full bg-[#2a1b14] border-4 border-[#7a4c28] rounded-3xl overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.95)] flex flex-col max-h-[92vh] relative text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* TOP CURRENCY & TITLE BAR */}
        <div className="bg-[#1c120d] border-b-2 border-[#5c371d] px-6 py-3 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <span className="text-amber-400 font-black text-xs tracking-wider uppercase">🏪 ร้านค้าฮอกปด (MYSTERY BAZAAR)</span>
            <span className="text-white/40 text-xs">|</span>
            <span className="text-xs font-bold text-white/70">บ้าน: {player.name}</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="bg-[#3a2519] border border-amber-500/50 px-4 py-1.5 rounded-xl flex items-center gap-2 shadow-inner">
              <span className="text-xs text-amber-400 font-bold">GOLD</span>
              <span className="text-base font-black text-amber-400">💰 {player.gold.toLocaleString()}</span>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-red-950/80 border border-red-500/50 text-red-400 hover:bg-red-900 font-black flex items-center justify-center text-base transition-transform hover:scale-110"
            >
              ✕
            </button>
          </div>
        </div>

        {/* MAIN STORE CONTENT AREA: LEFT NAV, CENTER SHELVES, RIGHT SHOPKEEPER */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[140px_1fr_260px] overflow-hidden bg-[#241710]">
          
          {/* LEFT CATEGORY TAB NAVIGATION (VERTICAL BAR) */}
          <div className="bg-[#180f0a] border-r-2 border-[#472b17] p-2 flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-y-auto">
            <CategoryTab active={activeCategory === "wands"} icon="🪄" label="ไม้กายสิทธิ์" onClick={() => setActiveCategory("wands")} />
            <CategoryTab active={activeCategory === "armor"} icon="🛡️" label="เสื้อเกราะ" onClick={() => setActiveCategory("armor")} />
            <CategoryTab active={activeCategory === "amulets"} icon="📿" label="เครื่องราง" onClick={() => setActiveCategory("amulets")} />
            <CategoryTab active={activeCategory === "potions"} icon="🧪" label="น้ำยาปรุงยา" onClick={() => setActiveCategory("potions")} />
            <CategoryTab active={activeCategory === "skills"} icon="✨" label="คาถาประจำบ้าน" onClick={() => setActiveCategory("skills")} />
            <CategoryTab active={activeCategory === "pets"} icon="🐾" label="สัตว์วิเศษ" onClick={() => setActiveCategory("pets")} />
          </div>

          {/* CENTER WOODEN DISPLAY SHELVES */}
          <div className="p-6 overflow-y-auto bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#362319] via-[#241710] to-[#150d09] flex flex-col justify-between">
            <div>
              <div className="mb-4 flex items-center justify-between border-b border-[#5c371d] pb-2">
                <h3 className="text-lg font-black text-amber-400 flex items-center gap-2">
                  <span>ชั้นวางสินค้า</span>
                  <span className="text-xs font-normal text-white/50">({getCategoryTitle(activeCategory)})</span>
                </h3>
              </div>

              {/* ITEM CARDS GRID ON WOODEN DISPLAY SHELVES */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {activeCategory === "wands" && (
                  <>
                    <ShopShelfCard
                      title={`ไม้ทั่วไป: ${player.commonWand}`}
                      sub={`ไม้ประจำบ้าน ${player.name} (+20 DMG)`}
                      price={1290}
                      gold={player.gold}
                      icon="🪄"
                      img={player.commonWandImg || "/images/items/06_ไม้มะยม.webp"}
                      owned={player.wand?.type === "common"}
                      onBuy={() => onBuy("wand", "common")}
                    />
                    <ShopShelfCard
                      title={`ไม้ VIP: ${player.vipWand}`}
                      sub={`ไม้ระดับสูงประจำบ้าน ${player.name} (+35 DMG)`}
                      price={2200}
                      gold={player.gold}
                      icon="✨"
                      img={player.vipWandImg || "/images/items/03_ไม้ตะเคียน.webp"}
                      owned={player.wand?.type === "vip"}
                      onBuy={() => onBuy("wand", "vip")}
                    />
                  </>
                )}

                {activeCategory === "armor" && (
                  <ShopShelfCard
                    title="กล่องเกราะลึกลับ"
                    sub="สุ่มรับเสื้อเกราะ (ผ้าขาวม้า, เสื้อกั๊ก)"
                    price={800}
                    gold={player.gold}
                    icon="🎲"
                    img="/images/items/armor_chest.png"
                    owned={!!player.armor}
                    onBuy={() => onBuy("armor", "random")}
                  />
                )}

                {activeCategory === "amulets" && (
                  <ShopShelfCard
                    title="หีบเครื่องราง"
                    sub="สุ่มรับเครื่องรางศักดิ์สิทธิ์"
                    price={1000}
                    gold={player.gold}
                    icon="📦"
                    img="/images/items/amulet_chest.png"
                    owned={!!player.amulet}
                    onBuy={() => onBuy("amulet", "random")}
                  />
                )}

                {activeCategory === "potions" &&
                  Object.entries(POTIONS)
                    .filter(([id]) => id !== "damage")
                    .map(([id, pot]) => (
                      <ShopShelfCard
                        key={id}
                        title={pot.name}
                        sub={pot.description}
                        price={pot.price}
                        gold={player.gold}
                        icon={pot.emoji}
                        img={`/images/items/potion_${id}.png`}
                        disabled={player.potions.length >= 5}
                        onBuy={() => onBuy("potion", id)}
                      />
                    ))}

                {activeCategory === "skills" &&
                  SKILL_LIST.map((skill) => {
                    const owned = player.skills.includes(skill.id);
                    return (
                      <ShopShelfCard
                        key={skill.id}
                        title={skill.name}
                        sub={skill.description}
                        price={2000}
                        gold={player.gold}
                        icon={skill.emoji}
                        img={`/images/skills/${skill.id}.png`}
                        owned={owned}
                        disabled={!owned && player.skills.length >= 2}
                        onBuy={() => onBuy("skill", skill.id)}
                      />
                    );
                  })}

                {activeCategory === "pets" &&
                  PET_LIST.map((pet) => (
                    <ShopShelfCard
                      key={pet.id}
                      title={pet.name}
                      sub={pet.description}
                      price={pet.price}
                      gold={player.gold}
                      icon={pet.emoji}
                      img={`/images/pets/${pet.id}.png`}
                      owned={player.pet?.id === pet.id}
                      disabled={!!player.pet && player.pet.id !== pet.id}
                      onBuy={() => onBuy("pet", pet.id)}
                    />
                  ))}
              </div>
            </div>

            {/* WOODEN SHELF FOOTER DECORATION */}
            <div className="mt-6 pt-3 border-t border-[#5c371d] flex items-center justify-between text-xs text-amber-200/60 font-semibold">
              <span>🪵 สินค้าทั้งหมดในร้านส่งตรงจากโรงเรียนไสยศาสตร์ฮอกปด</span>
              <span>💰 ยอดคงเหลือ: {player.gold.toLocaleString()} Gold</span>
            </div>
          </div>

          {/* RIGHT SIDE: FRIENDLY SHOPKEEPER NPC CHARACTER STAGE */}
          <div className="bg-[#1a120d] border-l-2 border-[#472b17] p-5 flex flex-col items-center justify-between relative overflow-hidden shadow-inner">
            
            {/* SHOPKEEPER AVATAR DISPLAY FRAME */}
            <div className="flex flex-col items-center text-center mt-2 z-10 w-full">
              <span className="text-[9px] font-black uppercase text-amber-400 tracking-widest bg-amber-950/80 px-2 py-0.5 rounded border border-amber-500/30 mb-3">
                MASTER SHOPKEEPER
              </span>
              
              {/* NPC SHOPKEEPER CHARACTER PORTRAIT FRAME */}
              <div className="w-36 h-48 rounded-2xl border-4 border-[#7a4c28] bg-black/80 shadow-[0_0_25px_rgba(0,0,0,0.8)] overflow-hidden relative flex items-center justify-center group mb-3">
                <img
                  src="/images/shopkeeper.png"
                  alt="Shopkeeper"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  onError={(e) => {
                    // Fallback to Merchant emoji if custom image not provided yet
                    e.currentTarget.style.display = "none";
                    e.currentTarget.nextElementSibling.style.display = "flex";
                  }}
                />
                <div className="hidden w-full h-full items-center justify-center text-6xl">
                  👨‍🌾
                </div>
              </div>

              <h4 className="font-black text-amber-300 text-base">พ่อค้าลึกลับแห่งฮอกปด</h4>
              <p className="text-[10px] text-white/50 mt-1 leading-relaxed px-2 font-semibold">
                "ยินดีต้อนรับสู่ร้านค้าลึกลับ! ต้องการเลือกซื้อไม้กายสิทธิ์ เสื้อเกราะ หรือสัตว์วิเศษชิ้นไหน บอกข้าได้เลย!"
              </p>
            </div>

            {/* SHOPPING BAG / SUMMARY DISPLAY */}
            <div className="w-full bg-[#2c1d14] border border-[#5c371d] rounded-2xl p-3.5 mt-4 z-10 text-xs space-y-1.5 shadow-md">
              <div className="flex justify-between font-bold text-white/70">
                <span>🎒 กระเป๋ายา</span>
                <span className="text-amber-400 font-black">{player.potions.length} / 5 ขวด</span>
              </div>
              <div className="flex justify-between font-bold text-white/70">
                <span>✨ คาถาประจำบ้าน</span>
                <span className="text-purple-400 font-black">{player.skills.length} / 2 สกิล</span>
              </div>
              <div className="flex justify-between font-bold text-white/70 pt-1 border-t border-white/10">
                <span>🐾 สัตว์วิเศษ</span>
                <span className="text-emerald-400 font-black">{player.pet ? player.pet.name : "ไม่มี"}</span>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}

function CategoryTab({ active, icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2.5 p-3 rounded-xl text-xs font-black transition-all w-full text-left ${
        active
          ? "bg-amber-600 text-black shadow-lg scale-105 font-black border border-amber-300"
          : "bg-[#281a12] text-white/60 hover:bg-[#38251a] hover:text-white border border-transparent"
      }`}
    >
      <span className="text-base">{icon}</span>
      <span className="truncate">{label}</span>
    </button>
  );
}

function ShopShelfCard({ title, sub, price, gold, icon, img, owned = false, disabled = false, onBuy }) {
  const canAfford = gold >= price;
  const isDisabled = disabled || (!owned && !canAfford);

  return (
    <div
      onClick={!isDisabled && !owned ? onBuy : undefined}
      className={`group flex flex-col items-center text-center p-3.5 rounded-2xl border-2 transition-all relative overflow-hidden ${
        owned
          ? "border-emerald-500/60 bg-emerald-950/40 text-emerald-300"
          : isDisabled
          ? "border-white/5 bg-black/50 text-white/30 opacity-40 cursor-not-allowed"
          : "border-[#694226] bg-[#2d1c13] hover:border-amber-400 hover:bg-[#3d271a] cursor-pointer shadow-lg hover:scale-105"
      }`}
    >
      {/* DISPLAY SHELF ART ITEM FRAME */}
      <div className="w-20 h-20 rounded-2xl border-2 border-[#5c371d] bg-black/60 flex items-center justify-center mb-2 overflow-hidden shadow-inner relative">
        {img ? (
          <img
            src={img}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
            onError={(e) => {
              e.currentTarget.style.display = "none";
              e.currentTarget.nextElementSibling.style.display = "flex";
            }}
          />
        ) : null}
        <div className={`hidden w-full h-full items-center justify-center text-4xl ${img ? "" : "!flex"}`}>
          {icon}
        </div>
      </div>

      <h4 className="font-black text-xs text-white truncate w-full mb-0.5">{title}</h4>
      <p className="text-[10px] text-white/50 line-clamp-2 h-7 leading-tight mb-2">{sub}</p>

      {/* PRICE / PURCHASE BUTTON */}
      <div className="mt-auto w-full">
        {owned ? (
          <span className="text-[11px] font-black text-emerald-400 bg-emerald-950/60 px-3 py-1 rounded-lg border border-emerald-500/40 block">
            ✅ ครอบครองแล้ว
          </span>
        ) : (
          <span
            className={`text-[11px] font-black px-3 py-1 rounded-lg border block ${
              canAfford
                ? "bg-amber-500 text-black border-amber-300 shadow-md group-hover:bg-amber-400"
                : "bg-white/5 text-white/30 border-white/10"
            }`}
          >
            💰 {price.toLocaleString()} Gold
          </span>
        )}
      </div>
    </div>
  );
}

function getCategoryTitle(cat) {
  switch (cat) {
    case "wands": return "ไม้กายสิทธิ์เพิ่มพลังโจมตี";
    case "armor": return "เกราะป้องกัน & เพิ่มเลือด";
    case "amulets": return "เครื่องรางสุ่มสถานะ";
    case "potions": return "ยาฟื้นฟู & ยาพิษ";
    case "skills": return "คาถาประจำบ้าน";
    case "pets": return "สัตว์วิเศษบัฟพิเศษ";
    default: return "";
  }
}
