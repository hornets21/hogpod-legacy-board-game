// ============================================================
// Game Data — ห้องแห่งความลับ (Chamber of Secrets)
// โรงเรียนไสยศาสตร์ฮอกปด
// ============================================================

// ─── HOUSES ─────────────────────────────────────────────────
export const HOUSES = {
  watrat: {
    id: "watrat",
    name: "บ้านวอร์ทอรัส",
    nameEn: "Wartaurus",
    image: "/images/houses/wartaurus.webp",
    color: "#22c55e",
    colorHex: 0x22c55e,
    colorName: "Green",
    emoji: "🟢",
    memberCount: 22,
    commonWand: "ไม้มะค่ามง",
    commonWandImg: "/images/items/06_ไม้มะยม.webp",
    vipWand: "ไม้ตะเคียน",
    vipWandImg: "/images/items/03_ไม้ตะเคียน.webp",
  },
  plodfindr: {
    id: "plodfindr",
    name: "บ้านปอดฟินดอร์",
    nameEn: "Podfindor",
    image: "/images/houses/podfindor.webp",
    color: "#eab308",
    colorHex: 0xeab308,
    colorName: "Yellow",
    emoji: "🟡",
    memberCount: 39,
    commonWand: "ไม้ฉำฉา",
    commonWandImg: "/images/items/07_ไม้จำจา.webp",
    vipWand: "ไม้โป๊ยเซียน",
    vipWandImg: "/images/items/01_ไม้ลัก.webp",
  },
  anal: {
    id: "anal",
    name: "บ้านแอนะไลซ์",
    nameEn: "Analyze",
    image: "/images/houses/analyze.webp",
    color: "#a855f7",
    colorHex: 0xa855f7,
    colorName: "Purple",
    emoji: "🟣",
    memberCount: 23,
    commonWand: "ไม้มยม",
    commonWandImg: "/images/items/06_ไม้มะยม.webp",
    vipWand: "ไม้มะขามป้อม",
    vipWandImg: "/images/items/05_ไม้ระบาปป้อม.webp",
  },
  slarf: {
    id: "slarf",
    name: "บ้านสลารัฟฟ์",
    nameEn: "Sraraff",
    image: "/images/houses/sraraff.webp",
    color: "#ef4444",
    colorHex: 0xef4444,
    colorName: "Red",
    emoji: "🔴",
    memberCount: 32,
    commonWand: "ไม้พะยูง",
    commonWandImg: "/images/items/02_ไม้พยุง.webp",
    vipWand: "ไม้สัก",
    vipWandImg: "/images/items/01_ไม้ลัก.webp",
  },
};

export const HOUSE_LIST = Object.values(HOUSES);

// ─── PLAYER STATS BASE ──────────────────────────────────────
export const BASE_HP = 100;
export const BASE_DMG = 30; // ฐานพลังเริ่มต้น 30 DMG
export const RESPAWN_HP = 100;
export const DEATH_PENALTY = 0; // ไม่หักค่าพลังถาวรเวลาตาย

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

// ─── POTIONS ─────────────────────────────────────────────────
export const POTIONS = {
  heal: {
    id: "heal",
    name: "ยาเพิ่มเลือด",
    nameEn: "Healing Potion",
    emoji: "🧪",
    price: 1000,
    description: "ฟื้นฟูพลังชีวิตระหว่างเทิร์น",
    healAmount: 30,
  },
  revive: {
    id: "revive",
    name: "ยาชุบชีวิต",
    nameEn: "Revive Potion",
    emoji: "💊",
    price: 2000,
    description: "ฟื้นคืนชีพตรงจุดเดิม ไม่เสีย Stat",
    reviveHp: 50,
  },
  cooldown: {
    id: "cooldown",
    name: "ยาลดคูลดาวน์",
    nameEn: "Cooldown Potion",
    emoji: "⏱️",
    price: 1500,
    description: "ลดคูลดาวน์ทุกสกิล 2 เทิร์น",
    cdReduce: 2,
  },
  damage: {
    id: "damage",
    name: "ยาเพิ่มดาเมจ",
    nameEn: "Damage Potion",
    emoji: "⚡",
    price: 0, // special - given from events
    description: "+100 ดาเมจ เป็นเวลา 1 เทิร์น",
    dmgBonus: 100,
    duration: 1,
  },
  poison: {
    id: "poison",
    name: "ยาพิษ / ยาบ่วง",
    nameEn: "Poison Potion",
    emoji: "☠️",
    price: 3000,
    description: "วางกับดักในช่อง ผู้เล่นอื่นตายทันที",
    isTrap: true,
  },
};

export const POTION_LIST = Object.values(POTIONS);
export const MAX_POTIONS = 5;

// ─── HOUSE SKILLS ─────────────────────────────────────────────
export const SKILLS = {
  thunder_star: {
    id: "thunder_star",
    name: "Thunder Star",
    nameTh: "สายฟ้าทำลายล้าง",
    emoji: "⚡",
    dmg: 50,
    target: "monster",
    cooldown: 3,
    description: "สร้างความเสียหาย 50 ดาเมจใส่ Monster",
  },
  melody: {
    id: "melody",
    name: "Melody",
    nameTh: "บทเพลงกล่อมใจ",
    emoji: "🎵",
    cooldown: 3,
    description: "ขโมยสิทธิ์ทอยลูกเต๋าของบ้านถัดไปมาใช้",
    effect: "steal_turn",
  },
  phoenix_force: {
    id: "phoenix_force",
    name: "Phoenix Force",
    nameTh: "พลังนกฟีนิกซ์ไฟ",
    emoji: "🔥",
    dmg: 80,
    target: "player",
    cooldown: 4,
    description: "โจมตีผู้เล่นบ้านอื่น 80 ดาเมจ จากทุกที่บนกระดาน",
  },
  stay_stupid: {
    id: "stay_stupid",
    name: "Stay Stupid",
    nameTh: "ยืนโง่ ๆ",
    emoji: "🛡️",
    cooldown: 4,
    duration: 2,
    description: "หลบหลีกความเสียหายทุกรูปแบบ 2 เทิร์น",
    effect: "invincible",
  },
  ngu_leng: {
    id: "ngu_leng",
    name: "งูเล็งเขี้ยว",
    nameTh: "งูเล็งเขี้ยว",
    emoji: "🐍",
    cooldown: 4,
    description: "ล็อกผลลูกเต๋าตามใจชอบ",
    effect: "lock_dice",
  },
  god_ntr: {
    id: "god_ntr",
    name: "God NTR",
    nameTh: "จอมขโมยยา",
    emoji: "🎭",
    cooldown: 5,
    description: "สุ่มขโมยยา 1 ขวดจากผู้เล่นเป้าหมาย",
    effect: "steal_potion",
  },
  korat_chaos: {
    id: "korat_chaos",
    name: "Korat Chaos",
    nameTh: "โคราชเคอส",
    emoji: "🌀",
    cooldown: 4,
    description: "สลับตำแหน่งผู้เล่นทั้งหมดบนกระดานแบบสุ่ม",
    effect: "shuffle_positions",
  },
  scab_dead: {
    id: "scab_dead",
    name: "Scab Dead",
    nameTh: "สแก๊บ แดด",
    emoji: "💨",
    cooldown: 2,
    description: "ขับไล่มอนสเตอร์ตรงหน้าหนีไปโดยไม่ต่อสู้",
    effect: "banish_monster",
  },
};

export const SKILL_LIST = Object.values(SKILLS);
export const MAX_SKILLS_PER_HOUSE = 2;
export const SKILL_PRICE = 2000;

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

// ─── MONSTERS (ทั้งหมดบนกระดาน) ──────────────────────────────
export const MONSTERS = [
  // Elite / Boss monsters (ปรับให้ตบเบาลงเยอะมาก)
  { id: "grand_boss", name: "บอสมหาเวทย์", nameEn: "Grand Boss", cell: 90, hp: 500, dmg: 25, isBoss: true, emoji: "👿" },
  { id: "chicky", name: "ชิกกี้ (หมาตี้)", nameEn: "Chicky", cell: 75, hp: 200, dmg: 10, isElite: true, emoji: "🐕" },
  { id: "tao_mono", name: "เต่าโมโน", nameEn: "Tao Mono", cell: 37, hp: 250, dmg: 12, isElite: true, emoji: "🐢" },
  { id: "seaboon", name: "หมาซีบูน", nameEn: "Seaboon", cell: 79, hp: 200, dmg: 5, isElite: true, emoji: "🐶" },
  { id: "mighty", name: "ไมตี้", nameEn: "Mighty", cell: 87, hp: 200, dmg: 3, isElite: true, emoji: "⚔️" },
  { id: "yaga", name: "ยาก้าดอง", nameEn: "Yaga", cell: 89, hp: 100, dmg: 8, isElite: true, emoji: "🧙" },
  { id: "pi_muet", name: "พี่มืด (ร่างมืด)", nameEn: "Pi Muet", cell: 57, hp: 120, dmg: 18, isElite: true, emoji: "😈" },
  { id: "bai_sung", name: "ใบซุง", nameEn: "Bai Sung", cell: 83, hp: 100, dmg: 8, isElite: true, emoji: "🐾" },
  // Common monsters (กระจอกสุดๆ)
  { id: "daimon", name: "ไดมอน (หมาชาวปด)", nameEn: "Daimon", cell: 7, hp: 50, dmg: 3, emoji: "🐩" },
  { id: "jolong", name: "โจโล่ง", nameEn: "Jolong", cell: 9, hp: 30, dmg: 2, emoji: "🎸" },
  { id: "nong_cake", name: "น้องเค้ก", nameEn: "Nong Cake", cell: 8, hp: 30, dmg: 2, emoji: "🎂" },
  { id: "deadpool", name: "Deadpool แอน Wer น", nameEn: "Deadpool", cell: 6, hp: 30, dmg: 3, emoji: "🎭" },
  { id: "lew_2018", name: "เลว 2018", nameEn: "Lew 2018", cell: 14, hp: 30, dmg: 2, emoji: "📜" },
  { id: "chai_tong", name: "ชายต๊อง", nameEn: "Chai Tong", cell: 10, hp: 30, dmg: 3, emoji: "⏳" },
  { id: "manut_fai", name: "มนุษย์ไฟ M", nameEn: "M Fire", cell: 2, hp: 30, dmg: 2, emoji: "🔥" },
  { id: "maew_a", name: "แมว เอ", nameEn: "Maew A", cell: 1, hp: 30, dmg: 2, emoji: "🐱" },
  { id: "dee", name: "ดี / ริวดี", nameEn: "Dee", cell: 5, hp: 30, dmg: 3, emoji: "⚡" },
  { id: "little_b", name: "Little B", nameEn: "Little B", cell: 4, hp: 30, dmg: 3, emoji: "🅱️" },
  { id: "go_lang", name: "โกแลงเจาะ", nameEn: "Go Lang", cell: 40, hp: 50, dmg: 2, emoji: "🔩" },
  { id: "kick_kick", name: "คิกๆ", nameEn: "Kick Kick", cell: 44, hp: 80, dmg: 2, emoji: "🐕‍🦺" },
  { id: "nu_uan", name: "หนูอ้วน", nameEn: "Nu Uan", cell: 73, hp: 30, dmg: 2, emoji: "🐭" },
  { id: "mungty", name: "บอสมังตี้", nameEn: "Mungty", cell: 77, hp: 50, dmg: 3, emoji: "🦍" },
  { id: "pi_mong", name: "พี่หม่อง", nameEn: "Pi Mong", cell: 53, hp: 50, dmg: 3, emoji: "😶" },
  { id: "pi_rin", name: "พี่ริน", nameEn: "Pi Rin", cell: 58, hp: 40, dmg: 4, emoji: "🌸" },
  { id: "moonwalk", name: "Moonwalk", nameEn: "Moonwalk", cell: 3, hp: 30, dmg: -1, emoji: "🕺" },
  // Hidden/secret monsters
  { id: "gollum", name: "The Leaping Gollum", nameEn: "Gollum", cell: 17, hp: 50, dmg: 4, isHidden: true, emoji: "💍" },
  { id: "master_m", name: "Master M", nameEn: "Master M", cell: 23, hp: 50, dmg: 4, isHidden: true, emoji: "🧲" },
  { id: "m_all_new", name: "M All New", nameEn: "M All New", cell: 24, hp: 50, dmg: 4, isHidden: true, emoji: "✨" },
  { id: "himi_ney", name: "หมีเนย", nameEn: "Himi Ney", cell: 25, hp: 30, dmg: 2, isHidden: true, emoji: "🧸" },
  { id: "okaruto", name: "โอคารุโตะ ร่างมืด", nameEn: "Okaruto Dark", cell: 26, hp: 500, dmg: 40, isHidden: true, emoji: "🌑" },
  { id: "eva", name: "เทพธิดาเอวา", nameEn: "Eva", cell: 28, hp: 0, dmg: -30, isHidden: true, isHealer: true, emoji: "👼" },
  { id: "unbeatable", name: "The Unbeatable", nameEn: "The Unbeatable", cell: 35, hp: 9999, dmg: 50, isHidden: true, emoji: "💎" },
  { id: "salt_jar", name: "ไหเกลือ", nameEn: "Salt Jar", cell: 49, hp: 0, dmg: 0, isHidden: true, isSpecial: true, emoji: "🏺" },
  { id: "pi_mote", name: "พี่พ่อมด", nameEn: "Pi Mote", cell: 54, hp: 120, dmg: 15, isHidden: true, emoji: "🧙‍♂️" },
  { id: "yam", name: "ยำ", nameEn: "Yam", cell: 55, hp: 80, dmg: 10, isHidden: true, emoji: "🥗" },
  { id: "ma_tang", name: "หมาถัง", nameEn: "Ma Tang", cell: 70, hp: 150, dmg: 15, isHidden: true, emoji: "🦮" },
  { id: "som_normal", name: "พี่สม (ร่างปกติ)", nameEn: "Som Normal", cell: 71, hp: 100, dmg: 10, isHidden: true, emoji: "😊" },
  { id: "som_devil", name: "สม (ร่างปีศาจ)", nameEn: "Som Devil", cell: 72, hp: 500, dmg: 50, isHidden: true, emoji: "😈" },
];

// Build cell → monster lookup
export const MONSTER_MAP = MONSTERS.reduce((acc, m) => {
  acc[m.cell] = m;
  return acc;
}, {});

// ─── BOARD: SNAKES AND LADDERS ────────────────────────────────
// [from, to] — positive = ladder (climb), negative = snake (fall)
export const SNAKES_AND_LADDERS = [
  // Ladders (go up)
  { from: 4, to: 20, type: "ladder" },
  { from: 11, to: 35, type: "ladder" },
  { from: 18, to: 42, type: "ladder" },
  { from: 30, to: 55, type: "ladder" },
  { from: 47, to: 65, type: "ladder" },
  { from: 60, to: 80, type: "ladder" },
  // Snakes (go down)
  { from: 34, to: 12, type: "snake" },
  { from: 50, to: 22, type: "snake" },
  { from: 63, to: 28, type: "snake" },
  { from: 76, to: 45, type: "snake" },
  { from: 85, to: 58, type: "snake" },
];

export const CELL_TELEPORT = SNAKES_AND_LADDERS.reduce((acc, sl) => {
  acc[sl.from] = sl;
  return acc;
}, {});

// ─── BINGO SYSTEM ─────────────────────────────────────────────
export const BINGO_MAX_NUMBER = 75;
export const BINGO_PRICE = 500; // per card
export const BINGO_MAX_CARDS = 2;
export const BINGO_REWARD = 10000;

// ─── CURRENCY ─────────────────────────────────────────────────
export const GOLD_PER_BAHT = 10;

// ─── SHOP AVAILABILITY ────────────────────────────────────────
// Shop accessible within first 3 turns, or on respawn
export const SHOP_TURN_LIMIT = 3;

// ─── WINNING CONDITION ────────────────────────────────────────
export const BOARD_SIZE = 90;
export const WIN_CELL = 90;
