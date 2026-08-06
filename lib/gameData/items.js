// ─── POTIONS ─────────────────────────────────────────────────
export const POTIONS = {
  heal: {
    id: "heal",
    image: "/images/items/potions/potion_100.webp",
    name: "ยาเพิ่มเลือด",
    nameEn: "Healing Potion",
    price: 1000,
    description: "ฟื้นฟูพลังชีวิตระหว่างเทิร์น",
    healAmount: 30,
  },
  revive: {
    id: "revive",
    image: "/images/items/potions/potion_revive.webp",
    name: "ยาชุบชีวิต",
    nameEn: "Revive Potion",
    price: 2000,
    description: "ฟื้นคืนชีพตรงจุดเดิม ไม่เสีย Stat",
    reviveHp: 50,
  },
  cooldown: {
    id: "cooldown",
    image: "/images/items/potions/potion_cooldown_reduce.webp",
    name: "ยาลดคูลดาวน์",
    nameEn: "Cooldown Potion",
    price: 1500,
    description: "ลดคูลดาวน์ทุกสกิล 2 เทิร์น",
    cdReduce: 2,
  },
  damage: {
    id: "damage",
    image: "/images/items/potions/potion_increse_damage_100_1_turn.webp",
    name: "ยาเพิ่มดาเมจ",
    nameEn: "Damage Potion",
    price: 0, // special - given from events
    description: "+100 ดาเมจ เป็นเวลา 1 เทิร์น",
    dmgBonus: 100,
    duration: 1,
  },
  poison: {
    id: "poison",
    image: "/images/items/potions/posion_potion.webp",
    name: "ยาพิษ / ยาบ่วง",
    nameEn: "Poison Potion",
    price: 3000,
    description: "วางกับดักในช่อง ผู้เล่นอื่นตายทันที",
    isTrap: true,
  },
};

export const POTION_LIST = Object.values(POTIONS);
export const MAX_POTIONS = 5;
