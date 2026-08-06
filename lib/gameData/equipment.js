// ─── WANDS ──────────────────────────────────────────────────
export const WANDS = {
  common: {
    id: "common",
    name: "ไม้กายสิทธิ์ระดับทั่วไป",
    nameEn: "Common Wand",
    price: 1290,
    dmgBonus: 20,
    tier: "common",
  },
  vip: {
    id: "vip",
    name: "ไม้กายสิทธิ์ระดับสูง",
    nameEn: "VIP Wand",
    price: 2200,
    dmgBonus: 35,
    tier: "vip",
  },
};

// ─── ARMOR ──────────────────────────────────────────────────
export const ARMOR_POOL = [
  {
    id: "pha_khao_ma",
    name: "ผ้าขาวม้าเสือดุสิต",
    hpBonus: -13,
    dmgBonus: 50, // massive dmg
    description: "ลบ HP -13 แต่เพิ่มพลังโจมตีอย่างมหาศาล",
  },
  {
    id: "suea_gak",
    name: "เสื้อกั๊ก",
    hpBonus: 10,
    dmgBonus: 0,
    description: "เสื้อเกราะสแตนดาร์ด",
  },
  {
    id: "suea_kra_chao",
    name: "เสื้อคอกระเช้าติดไฟ",
    hpBonus: 5,
    dmgBonus: 10,
    description: "เสื้อเกราะธาตุไฟ",
  },
  {
    id: "suea_jek_pod",
    name: "เสื้อเจ๊กปด",
    hpBonus: 2,
    dmgBonus: 0,
    description: "+2 Max HP",
    isMaxHpBuff: true,
  },
];

// ─── AMULETS ─────────────────────────────────────────────────
export const AMULET_POOL = [
  {
    id: "seua_dao_plad_khik",
    name: "เสือดาวถือปลัดขิก",
    dmgBonus: 20,
    hpBonus: -10,
    description: "ดาเมจ +20, HP -10",
  },
  {
    id: "waen_svest",
    name: "แว่นตาสเวส (Svest)",
    dmgBonus: 30,
    hpBonus: 0,
    description: "ดาเมจ +30",
  },
  {
    id: "mai_san",
    name: "หมายศาล",
    dmgBonus: 10,
    hpBonus: 3,
    description: "ดาเมจ +10, HP +3",
  },
  {
    id: "neg_ti_ka",
    name: "เนกติกาสเปค",
    dmgBonus: 12,
    hpBonus: 0,
    description: "ดาเมจ +12",
  },
];
