"use client";

import { useState } from "react";
import { HOUSES, WANDS, ARMOR_POOL, AMULET_POOL, POTIONS, SKILLS, PETS, SKILL_LIST, PET_LIST, BINGO_ITEM } from "@/lib/gameData";
import ItemTooltip from "@/components/fx/ItemTooltip";

export default function ShopModal({ player, onBuy, onClose }) {
  const [activeCategory, setActiveCategory] = useState("wands"); // wands | armor | amulets | potions | skills | pets | bingo

  if (!player) return null;

  const houseData = HOUSES[player.houseId] || {};
  const commonWandName = player.commonWand || houseData.commonWand || "ไม้ทั่วไป";
  const commonWandImg = player.commonWandImg || houseData.commonWandImg;
  const vipWandName = player.vipWand || houseData.vipWand || "ไม้ VIP";
  const vipWandImg = player.vipWandImg || houseData.vipWandImg;

  return (
    <div className="fixed inset-0 z-50 flex justify-end select-none overflow-hidden animate-fade-in pointer-events-auto">
      {/* Dynamic Dark Vignette Backdrop (คลิกปิดได้) */}
      <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px] transition-opacity" onClick={onClose} />

      {/* SLIDE-IN RIGHT DRAWER SHOP PANEL */}
      <div
        className="relative z-10 w-full max-w-lg h-full bg-slate-950/95 backdrop-blur-2xl border-l border-amber-500/30 shadow-[-15px_0_50px_rgba(0,0,0,0.8)] flex flex-col justify-between text-white animate-slide-in-right overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* TOP CURRENCY & TITLE BAR */}
        <div className="bg-slate-900/90 border-b border-white/10 px-5 py-4 flex items-center justify-between shadow-md shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-xl animate-pulse">🏪</span>
            <div>
              <h2 className="text-amber-400 font-black text-sm tracking-widest uppercase">
                MYSTERY BAZAAR — ร้านค้าเวทมนตร์
              </h2>
              <p className="text-[11px] text-white/50 font-bold">ผู้เล่น: {player.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-amber-950/60 border border-amber-500/40 px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 shadow-inner">
              <span className="text-xs text-amber-400 font-bold">💰</span>
              <span className="text-sm font-black text-amber-400">{player.gold.toLocaleString()}</span>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-red-600/80 border border-white/20 text-white font-black flex items-center justify-center text-sm transition-all hover:scale-110"
            >
              ✕
            </button>
          </div>
        </div>

        {/* MAIN STORE CONTENT AREA: TOP CATEGORY BAR + SCROLLABLE SHELF */}
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-950/60">
          
          {/* CATEGORY TABS (HORIZONTAL CONTAINER) */}
          <div className="bg-slate-900/80 border-b border-white/10 p-2 flex items-center gap-1.5 overflow-x-auto custom-scrollbar shrink-0">
            <CategoryTab active={activeCategory === "wands"} icon="🪄" label="ไม้กายสิทธิ์" onClick={() => setActiveCategory("wands")} />
            <CategoryTab active={activeCategory === "armor"} icon="🛡️" label="เสื้อเกราะ" onClick={() => setActiveCategory("armor")} />
            <CategoryTab active={activeCategory === "amulets"} icon="📿" label="เครื่องราง" onClick={() => setActiveCategory("amulets")} />
            <CategoryTab active={activeCategory === "potions"} icon="🧪" label="ยาปรุง" onClick={() => setActiveCategory("potions")} />
            <CategoryTab active={activeCategory === "skills"} icon="✨" label="คาถาบ้าน" onClick={() => setActiveCategory("skills")} />
            <CategoryTab active={activeCategory === "pets"} icon="🐾" label="สัตว์วิเศษ" onClick={() => setActiveCategory("pets")} />
            <CategoryTab active={activeCategory === "bingo"} icon="🎯" label="ป้าย Bingo" onClick={() => setActiveCategory("bingo")} />
          </div>

          {/* DISPLAY SHELVES CONTENT AREA */}
          <div className="p-4 flex-1 overflow-y-auto custom-scrollbar space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <h3 className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-2">
                <span>ชั้นวางสินค้า</span>
                <span className="text-white/40 text-[10px]">({getCategoryTitle(activeCategory)})</span>
              </h3>
            </div>

            {/* ITEM CARDS GRID */}
            <div className="grid grid-cols-2 gap-3">
              {activeCategory === "wands" && (
                <>
                  <ShopShelfCard
                    title={`ไม้ทั่วไป: ${commonWandName}`}
                    sub={`ไม้ประจำบ้าน ${player.name} (+20 DMG)`}
                    price={1290}
                    gold={player.gold}
                    icon="🪄"
                    img={commonWandImg}
                    owned={player.wand?.type === "common"}
                    onBuy={() => onBuy("wand", "common")}
                    itemData={{
                      name: `ไม้ทั่วไป: ${commonWandName}`,
                      categoryTh: "🪄 ไม้กายสิทธิ์",
                      dmgBonus: 20,
                      description: `ไม้ประจำบ้าน ${player.name} เพิ่มพลังโจมตี +20 DMG`,
                      image: commonWandImg,
                      price: 1290,
                    }}
                  />
                  <ShopShelfCard
                    title={`ไม้ VIP: ${vipWandName}`}
                    sub={`ไม้ระดับสูงประจำบ้าน ${player.name} (+35 DMG)`}
                    price={2200}
                    gold={player.gold}
                    icon="✨"
                    img={vipWandImg}
                    owned={player.wand?.type === "vip"}
                    onBuy={() => onBuy("wand", "vip")}
                    itemData={{
                      name: `ไม้ VIP: ${vipWandName}`,
                      categoryTh: "🪄 ไม้กายสิทธิ์ (VIP)",
                      dmgBonus: 35,
                      description: `ไม้ระดับสูงประจำบ้าน ${player.name} เพิ่มพลังโจมตีอย่างมาก +35 DMG`,
                      image: vipWandImg,
                      price: 2200,
                    }}
                  />
                </>
              )}

              {activeCategory === "armor" && (
                <>
                  <ShopShelfCard
                    title="กล่องเกราะลึกลับ (สุ่ม)"
                    sub="สุ่มรับเสื้อเกราะในคลัง"
                    price={800}
                    gold={player.gold}
                    icon="🎲"
                    img={ARMOR_POOL[0]?.image}
                    owned={!!player.armor}
                    onBuy={() => onBuy("armor", "random")}
                    itemData={{
                      name: "กล่องเกราะลึกลับ (สุ่ม)",
                      categoryTh: "🛡️ สุ่มเสื้อเกราะ",
                      description: "สุ่มรับเสื้อเกราะป้องกัน 1 ตัวจากสระไอเทมในคลัง",
                      image: ARMOR_POOL[0]?.image,
                      price: 800,
                    }}
                  />
                  {ARMOR_POOL.map((armor) => (
                    <ShopShelfCard
                      key={armor.id}
                      title={armor.name}
                      sub={armor.description}
                      price={800}
                      gold={player.gold}
                      icon="🛡️"
                      img={armor.image}
                      owned={player.armor?.id === armor.id}
                      onBuy={() => onBuy("armor", armor.id)}
                      itemData={{
                        ...armor,
                        categoryTh: "🛡️ เสื้อเกราะ",
                        price: 800,
                      }}
                    />
                  ))}
                </>
              )}

              {activeCategory === "amulets" && (
                <>
                  <ShopShelfCard
                    title="หีบเครื่องราง (สุ่ม)"
                    sub="สุ่มรับเครื่องรางศักดิ์สิทธิ์"
                    price={1000}
                    gold={player.gold}
                    icon="📦"
                    img={AMULET_POOL[0]?.image}
                    owned={!!player.amulet}
                    onBuy={() => onBuy("amulet", "random")}
                    itemData={{
                      name: "หีบเครื่องราง (สุ่ม)",
                      categoryTh: "📿 สุ่มเครื่องราง",
                      description: "สุ่มรับเครื่องรางเวทมนตร์ 1 ชิ้นจากสระเครื่องราง",
                      image: AMULET_POOL[0]?.image,
                      price: 1000,
                    }}
                  />
                  {AMULET_POOL.map((amulet) => (
                    <ShopShelfCard
                      key={amulet.id}
                      title={amulet.name}
                      sub={amulet.description}
                      price={1000}
                      gold={player.gold}
                      icon="📿"
                      img={amulet.image}
                      owned={player.amulet?.id === amulet.id}
                      onBuy={() => onBuy("amulet", amulet.id)}
                      itemData={{
                        ...amulet,
                        categoryTh: "📿 เครื่องราง",
                        price: 1000,
                      }}
                    />
                  ))}
                </>
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
                      icon={null}
                      img={pot.image}
                      disabled={player.potions.length >= 5}
                      onBuy={() => onBuy("potion", id)}
                      itemData={{
                        ...pot,
                        categoryTh: "🧪 ยาปรุง",
                      }}
                    />
                  ))}

              {activeCategory === "skills" &&
                SKILL_LIST.map((skill) => {
                  const owned = player.skills.includes(skill.id);
                  return (
                    <ShopShelfCard
                      key={skill.id}
                      title={skill.nameTh || skill.name}
                      sub={skill.description}
                      price={2000}
                      gold={player.gold}
                      icon="🔮"
                      img={`/images/skills/${skill.id}_skill.webp`}
                      owned={owned}
                      disabled={!owned && player.skills.length >= 2}
                      onBuy={() => onBuy("skill", skill.id)}
                      itemData={{
                        ...skill,
                        name: skill.nameTh || skill.name,
                        categoryTh: skill.categoryTh || "✨ คาถาประจำบ้าน",
                        image: `/images/skills/${skill.id}_skill.webp`,
                        price: 2000,
                      }}
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
                    img={pet.image}
                    owned={player.pet?.id === pet.id}
                    disabled={!!player.pet && player.pet.id !== pet.id}
                    onBuy={() => onBuy("pet", pet.id)}
                    itemData={{
                      ...pet,
                      categoryTh: "🐾 สัตว์วิเศษ",
                      price: pet.price,
                      icon: pet.emoji,
                    }}
                  />
                ))}

              {activeCategory === "bingo" && (
                <ShopShelfCard
                  title={BINGO_ITEM?.name || "ป้าย Bingo"}
                  sub={BINGO_ITEM?.description || "ป้ายบิงโกประจำบ้าน แสดงตารางตัวเลขเมื่อตกช่องตรงกับบิงโก ลุ้นโบนัส 10,000 Gold!"}
                  price={BINGO_ITEM?.price || 500}
                  gold={player.gold}
                  icon="🎯"
                  img={BINGO_ITEM?.image}
                  owned={player.hasBingoCard}
                  onBuy={() => onBuy("bingo", "bingo_sign")}
                  itemData={{
                    ...(BINGO_ITEM || {}),
                    name: "ป้าย Bingo",
                    categoryTh: "🎯 ป้ายบิงโกประจำบ้าน",
                    price: 500,
                  }}
                />
              )}
            </div>
          </div>
        </div>

        {/* BOTTOM INVENTORY STATUS & SHOPKEEPER FOOTER */}
        <div className="bg-slate-900/90 border-t border-white/10 p-4 shrink-0 space-y-3">
          <div className="flex items-center gap-3 bg-slate-950/60 p-2.5 rounded-xl border border-white/5">
            <div className="w-10 h-10 rounded-lg border border-amber-500/30 overflow-hidden bg-black flex items-center justify-center shrink-0">
              <img
                src="/images/npc/พ่อค้าลึกลับ.webp"
                alt="Shopkeeper"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  e.currentTarget.nextElementSibling.style.display = "flex";
                }}
              />
              <span className="hidden text-xl">👨‍🌾</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-amber-300">พ่อค้าลึกลับแห่งฮอกปด</div>
              <div className="text-[10px] text-white/50 truncate">"ต้องการสั่งซื้อสินค้าชิ้นไหน เลิกดูแล้วกดซื้อได้เลย!"</div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-1.5 text-[10px] text-white/70 font-semibold text-center">
            <div className="bg-slate-950/40 p-1.5 rounded-lg border border-white/5 truncate">
              🧪 ยา: <span className="text-amber-400 font-bold">{player.potions.length}/5</span>
            </div>
            <div className="bg-slate-950/40 p-1.5 rounded-lg border border-white/5 truncate">
              ✨ คาถา: <span className="text-purple-400 font-bold">{player.skills.length}/2</span>
            </div>
            <div className="bg-slate-950/40 p-1.5 rounded-lg border border-white/5 truncate">
              🎯 บิงโก: <span className="text-amber-400 font-bold">{player.hasBingoCard ? "มีแล้ว" : "ไม่มี"}</span>
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
      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-black transition-all shrink-0 ${
        active
          ? "bg-gradient-to-r from-amber-500 to-amber-600 text-black shadow-lg scale-105 border border-amber-300"
          : "bg-slate-800/80 text-white/60 hover:bg-slate-700 hover:text-white border border-white/5"
      }`}
    >
      <span className="text-sm">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function ShopShelfCard({ title, sub, price, gold, icon, img, owned = false, disabled = false, onBuy, itemData }) {
  const canAfford = gold >= price;
  const isDisabled = disabled || (!owned && !canAfford);

  const tooltipItem = itemData || {
    name: title,
    description: sub,
    image: img,
    icon: icon,
    price: price,
  };

  const cardContent = (
    <div
      onClick={!isDisabled && !owned ? onBuy : undefined}
      className={`group flex flex-col justify-between p-3 rounded-2xl border transition-all relative overflow-hidden h-full ${
        owned
          ? "border-emerald-500/60 bg-emerald-950/30 text-emerald-300"
          : isDisabled
          ? "border-white/5 bg-slate-950/50 text-white/30 opacity-40 cursor-not-allowed"
          : "border-white/10 bg-slate-900/80 hover:border-amber-400/80 hover:bg-slate-800/90 cursor-pointer shadow-lg hover:scale-102"
      }`}
    >
      <div className="flex flex-col items-center text-center">
        {/* DISPLAY SHELF ART ITEM FRAME */}
        <div className="w-16 h-16 rounded-xl border border-white/10 bg-black/60 flex items-center justify-center mb-2 overflow-hidden shadow-inner relative">
          {img ? (
            <img
              src={img}
              alt={title}
              className="w-full h-full object-contain p-1 group-hover:scale-110 transition-transform duration-300"
              onError={(e) => {
                e.currentTarget.style.display = "none";
                if (e.currentTarget.nextElementSibling) {
                  e.currentTarget.nextElementSibling.style.display = "flex";
                }
              }}
            />
          ) : null}
          <div className={`hidden w-full h-full items-center justify-center text-3xl ${img ? "" : "!flex"}`}>
            {icon}
          </div>
        </div>

        <h4 className="font-black text-xs text-white truncate w-full mb-0.5">{title}</h4>
        <p className="text-[10px] text-white/50 line-clamp-2 h-7 leading-tight mb-2">{sub}</p>
      </div>

      {/* PRICE / PURCHASE BUTTON */}
      <div className="w-full mt-1">
        {owned ? (
          <span className="text-[10px] font-black text-emerald-400 bg-emerald-950/60 py-1 rounded-lg border border-emerald-500/40 block text-center">
            ✅ ครอบครองแล้ว
          </span>
        ) : (
          <span
            className={`text-[10px] font-black py-1 rounded-lg border block text-center ${
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

  return <ItemTooltip item={tooltipItem} position="top">{cardContent}</ItemTooltip>;
}

function getCategoryTitle(cat) {
  switch (cat) {
    case "wands": return "ไม้กายสิทธิ์เพิ่มพลังโจมตี";
    case "armor": return "เกราะป้องกัน & เพิ่มเลือด";
    case "amulets": return "เครื่องรางสุ่มสถานะ";
    case "potions": return "ยาฟื้นฟู & ยาพิษ";
    case "skills": return "คาถาประจำบ้าน";
    case "pets": return "สัตว์วิเศษบัฟพิเศษ";
    case "bingo": return "ป้ายบิงโกประจำบ้าน";
    default: return "";
  }
}
