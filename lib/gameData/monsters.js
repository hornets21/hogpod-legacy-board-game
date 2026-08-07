// ─── MONSTERS (ทั้งหมดบนกระดาน) ──────────────────────────────
export const MONSTERS = [
  // Elite / Boss monsters (ปรับให้ตบเบาลงเยอะมาก)
  { id: "grand_boss", name: "บอสมหาเวทย์", nameEn: "Grand Boss", cell: 90, hp: 500, dmg: 25, isBoss: true, image: "/images/monsters/ชบ7000.webp" },
  { id: "chicky", name: "ชิกกี้ (หมาตี้)", nameEn: "Chicky", cell: 75, hp: 200, dmg: 10, isElite: true, image: "/images/monsters/ชบ7000.webp" },
  { id: "tao_mono", name: "เต่าโมโน", nameEn: "Tao Mono", cell: 37, hp: 250, dmg: 12, isElite: true, image: "/images/monsters/ชบ7000.webp" },
  { id: "seaboon", name: "หมาซีบูน", nameEn: "Seaboon", cell: 79, hp: 200, dmg: 5, isElite: true, image: "/images/monsters/ชบ7000.webp" },
  { id: "mighty", name: "ไมตี้", nameEn: "Mighty", cell: 87, hp: 200, dmg: 3, isElite: true, image: "/images/monsters/ชบ7000.webp" },
  { id: "yaga", name: "ยาก้าดอง", nameEn: "Yaga", cell: 89, hp: 100, dmg: 8, isElite: true, image: "/images/monsters/ชบ7000.webp" },
  { id: "pi_muet", name: "พี่มืด (ร่างมืด)", nameEn: "Pi Muet", cell: 57, hp: 120, dmg: 18, isElite: true, image: "/images/monsters/ชบ7000.webp" },
  { id: "bai_sung", name: "ใบซุง", nameEn: "Bai Sung", cell: 83, hp: 100, dmg: 8, isElite: true, image: "/images/monsters/ชบ7000.webp" },
  // Common monsters (กระจอกสุดๆ)
  { id: "daimon", name: "ไดมอน (หมาชาวปด)", nameEn: "Daimon", cell: 7, hp: 50, dmg: 3, image: "/images/monsters/common/daimon_monster.webp" },
  { id: "jolong", name: "โจโล่ง", nameEn: "Jolong", cell: 9, hp: 30, dmg: 2, image: "/images/monsters/common/joe_long_monster.webp" },
  { 
    id: "nong_cake", 
    name: "น้องเค้ก", 
    nameEn: "Nong Cake", 
    cell: 8, 
    hp: 30, 
    dmg: 2, 
    image: "/images/monsters/common/cake_monster.jpg",
  },
  { id: "deadpool", name: "Deadpool แอน Wer น", nameEn: "Deadpool", cell: 6, hp: 30, dmg: 3, image: "/images/monsters/common/dead_pool_and_ww_monster.webp" },
  { id: "lew_2018", name: "เลว 2018", nameEn: "Lew 2018", cell: 14, hp: 30, dmg: 2, image: "/images/monsters/common/lew_2018_monster.webp" },
  { id: "chai_tong", name: "ชายต๊อง", nameEn: "Chai Tong", cell: 10, hp: 30, dmg: 3, image: "/images/monsters/common/chi_tong_monster.webp" },
  { id: "manut_fai", name: "5m", nameEn: "5m", cell: 2, hp: 30, dmg: 2, image: "/images/monsters/common/5m_man_monster.webp" },
  { id: "maew_a", name: "แมว เอ", nameEn: "Maew A", cell: 12, hp: 30, dmg: 2, image: "/images/monsters/common/a_monster.webp" },
  { id: "dee", name: "ดี / ริวดี", nameEn: "Dee", cell: 5, hp: 30, dmg: 3, image: "/images/monsters/common/ริลดี_monster.webp" },
  { id: "little_b", name: "Little B", nameEn: "Little B", cell: 4, hp: 30, dmg: 2, image: "/images/monsters/common/little_b_monster.webp" },
  { id: "go_lang", name: "โกแลงเจาะ", nameEn: "Go Lang", cell: 40, hp: 50, dmg: 2, image: "/images/monsters/common/go_lang_monster.webp" },
  { id: "kick_kick", name: "คิกๆ", nameEn: "Kick Kick", cell: 44, hp: 80, dmg: 2, image: "/images/monsters/common/kikkik_monster.webp" },
  { id: "nu_uan", name: "หนูอ้วน", nameEn: "Nu Uan", cell: 73, hp: 30, dmg: 2, image: "/images/monsters/common/หนูอ้วน_monster.webp" },
  { id: "mungty", name: "มังตี้", nameEn: "Mungty", cell: 77, hp: 50, dmg: 3, image: "/images/monsters/ชบ7000.webp" },
  { id: "pi_mong", name: "พี่หม่อง", nameEn: "Pi Mong", cell: 53, hp: 50, dmg: 3, image: "/images/monsters/ชบ7000.webp" },
  { id: "pi_rin", name: "พี่ริน", nameEn: "Pi Rin", cell: 58, hp: 40, dmg: 4, image: "/images/monsters/common/pi_rin_monster.webp" },
  { id: "moonwalk", name: "Moonwalk", nameEn: "Moonwalk", cell: 3, hp: 30, dmg: -1, image: "/images/monsters/common/moonwalk_monster.webp" },
  // Hidden/secret monsters
  { id: "gollum", name: "The Leaping Gollum", nameEn: "Gollum", cell: 17, hp: 50, dmg: 4, isHidden: true, image: "/images/monsters/secret/oop_tong_monster.webp" },
  { id: "master_m", name: "Master moment", nameEn: "Master Moment", cell: 23, hp: 50, dmg: 4, isHidden: true, image: "/images/monsters/secret/master_moment_monster.webp" },
  { id: "m_all_new", name: "M All New", nameEn: "M All New", cell: 24, hp: 50, dmg: 4, isHidden: true, image: "/images/monsters/secret/m-all-new.webp" },
  { id: "himi_ney", name: "หมีเนย", nameEn: "Butter Bear", cell: 25, hp: 30, dmg: 2, isHidden: true, image: "/images/monsters/secret/Butter_Bear.webp" },
  { id: "okaruto", name: "โอคารุโตะ ร่างมืด", nameEn: "Okaruto Dark", cell: 26, hp: 500, dmg: 40, isHidden: true, image: "/images/monsters/secret/okaluto_monster.webp" },
  { id: "unbeatable", name: "The Unbeatable", nameEn: "The Unbeatable", cell: 35, hp: 9999, dmg: 50, isHidden: true, image: "/images/monsters/secret/พี่มิด_mini_boss.webp" },
  { id: "salt_jar", name: "ไหเกลือ", nameEn: "Salt Jar", cell: 49, hp: 0, dmg: 0, isHidden: true, isSpecial: true, image: "/images/monsters/ชบ7000.webp" },
  { id: "pi_mote", name: "พี่พ่อมด", nameEn: "Pi Mote", cell: 54, hp: 120, dmg: 15, isHidden: true, image: "/images/monsters/secret/พี่พ่อมด_monster.webp" },
  { id: "yam", name: "ยำ", nameEn: "Yam", cell: 55, hp: 80, dmg: 10, isHidden: true, image: "/images/monsters/ชบ7000.webp" },
  { id: "ma_tang", name: "หมาถัง", nameEn: "Ma Tang", cell: 70, hp: 150, dmg: 15, isHidden: true, image: "/images/monsters/secret/Ma_Tang.webp" },
  { id: "som_normal", name: "สมอา (ร่างปกติ)", nameEn: "Som Normal", cell: 71, hp: 100, dmg: 10, isHidden: true, image: "/images/monsters/secret/Som_Normal.webp" },
  { id: "som_devil", name: "สมอา (ร่างปีศาจ)", nameEn: "Som Devil", cell: 72, hp: 500, dmg: 50, isHidden: true, image: "/images/monsters/secret/Som_Devil.webp" },
  // Event monsters
  { id: "eva", name: "เทพธิดาเอวา", nameEn: "Eva", cell: 28, hp: 0, dmg: -30, isHidden: true, isHealer: true, image: "/images/monsters/events/eva.webp" },
];

// Build cell → monster lookup
export const MONSTER_MAP = MONSTERS.reduce((acc, m) => {
  acc[m.cell] = m;
  return acc;
}, {});
