// ─── MAGICAL PETS ─────────────────────────────────────────────
export const PETS = {
  hisoka: {
    id: "hisoka",
    name: "ราชาฮิโซกะ",
    nameEn: "Hisoka",
    emoji: "🃏",
    price: 3000,
    description: "ลดคูลดาวน์สกิลทุกสกิลลง 1 เทิร์น",
    effect: "reduce_cooldown",
    cdReduction: 1,
  },
  god_hand: {
    id: "god_hand",
    name: "God Hand / The Hand",
    nameEn: "God Hand",
    emoji: "✋",
    price: 3000,
    description: "เกิดใหม่ด้วย HP เต็ม 100 (แทน 20)",
    effect: "respawn_full_hp",
    respawnHp: 100,
  },
  okarun: {
    id: "okarun",
    name: "โอคารุน",
    nameEn: "Okarun",
    emoji: "👻",
    price: 3000,
    description: "Lifesteal: ดูดเลือด 10% ของดาเมจที่ทำได้",
    effect: "lifesteal",
    lifeStealPct: 0.1,
  },
  bank: {
    id: "bank",
    name: "แบงค์",
    nameEn: "Bank",
    emoji: "🏦",
    price: 3000,
    description: "หลีกเลี่ยงการต่อสู้ได้ 1 ครั้งต่อเกม",
    effect: "dodge_once",
    usesPerGame: 1,
  },
};

export const PET_LIST = Object.values(PETS);
