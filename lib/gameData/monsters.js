// ─── MONSTERS (ทั้งหมดบนกระดาน) ──────────────────────────────
export const MONSTERS = [
  // Elite / Boss monsters (ปรับสเตตัสให้หนักแน่น ดาเมจมหาโหด สมศักดิ์ศรีบอส)
  { id: "grand_boss", name: "บอลเดอมอร์์", nameEn: "BallVoldemort", cell: 90, hp: 1800, dmg: 180, isBoss: true, image: "/images/monsters/ชบ7000.webp", modelPath: "/models/granfinalboss.glb" },
  { id: "chicky", name: "ชิกกี้ (หมาตี้)", nameEn: "Chicky", cell: 75, hp: 320, dmg: 65, isElite: true, image: "/images/monsters/ชบ7000.webp" },
  { id: "tao_mono", name: "เต่าโมโน", nameEn: "Tao Mono", cell: 37, hp: 350, dmg: 70, isElite: true, image: "/images/monsters/ชบ7000.webp" },
  { id: "seaboon", name: "หมาซีบูน", nameEn: "Seaboon", cell: 79, hp: 300, dmg: 60, isElite: true, image: "/images/monsters/ชบ7000.webp" },
  { id: "mighty", name: "ไมตี้", nameEn: "Mighty", cell: 87, hp: 300, dmg: 60, isElite: true, image: "/images/monsters/ชบ7000.webp" },
  { id: "yaga", name: "ยาก้าดอง", nameEn: "Yaga", cell: 89, hp: 250, dmg: 68, isElite: true, image: "/images/monsters/ชบ7000.webp" },
  { id: "pi_muet", name: "พี่มืด (ร่างมืด)", nameEn: "Pi Muet", cell: 57, hp: 280, dmg: 75, isElite: true, image: "/images/monsters/ชบ7000.webp" },
  { id: "bai_sung", name: "ใบซุง", nameEn: "Bai Sung", cell: 83, hp: 250, dmg: 62, isElite: true, image: "/images/monsters/ชบ7000.webp", modelPath: "/models/bai_sung.glb" },
  // Common monsters (ปรับตบหนักแน่น 14 - 18 DMG ให้ระบบ Recovery มีคุณค่าและสมดุล)
  { id: "daimon", name: "ไดมอน (หมาชาวปด)", nameEn: "Daimon", cell: 7, hp: 60, dmg: 16, image: "/images/monsters/common/daimon_monster.webp", modelPath: "/models/diamon_dog.glb" },
  { id: "jolong", name: "โจโล่ง", nameEn: "Jolong", cell: 9, hp: 40, dmg: 14, image: "/images/monsters/common/joe_long_monster.webp" },
  {
    id: "nong_cake",
    name: "น้องเค้ก",
    nameEn: "Nong Cake",
    cell: 8,
    hp: 40,
    dmg: 14,
    image: "/images/monsters/common/nong_cake/frame_01.webp",
  },
  { id: "deadpool", name: "Deadpool แอน Wer น", nameEn: "Deadpool", cell: 6, hp: 45, dmg: 16, image: "/images/monsters/common/dead_pool_and_ww_monster.webp" },
  { id: "lew_2018", name: "เลว 2018", nameEn: "Lew 2018", cell: 14, hp: 45, dmg: 15, image: "/images/monsters/common/lew_2018_monster.webp" },
  { id: "chai_tong", name: "ชายต๊อง", nameEn: "Chai Tong", cell: 10, hp: 45, dmg: 15, image: "/images/monsters/common/chi_tong_monster.webp" },
  { id: "manut_fai", name: "5m", nameEn: "5m", cell: 2, hp: 40, dmg: 14, image: "/images/monsters/common/5m_man_monster.webp" },
  { id: "maew_a", name: "แมว เอ", nameEn: "Maew A", cell: 12, hp: 40, dmg: 14, image: "/images/monsters/common/a_monster.webp" },
  { id: "dee", name: "ดี / ริวดี", nameEn: "Dee", cell: 5, hp: 45, dmg: 16, image: "/images/monsters/common/ริลดี_monster.webp" },
  { id: "little_b", name: "Little B", nameEn: "Little B", cell: 4, hp: 40, dmg: 14, image: "/images/monsters/common/little_b_monster.webp" },
  { id: "go_lang", name: "โกแลงเจาะ", nameEn: "Go Lang", cell: 40, hp: 70, dmg: 17, image: "/images/monsters/common/go_lang_monster.webp" },
  { id: "kick_kick", name: "คิกๆ", nameEn: "Kick Kick", cell: 44, hp: 90, dmg: 18, image: "/images/monsters/common/kikkik_monster.webp" },
  { id: "nu_uan", name: "หนูอ้วน", nameEn: "Nu Uan", cell: 73, hp: 50, dmg: 15, image: "/images/monsters/common/หนูอ้วน_monster.webp" },
  { id: "mungty", name: "มังตี้", nameEn: "Mungty", cell: 77, hp: 70, dmg: 17, image: "/images/monsters/ชบ7000.webp" },
  { id: "pi_mong", name: "พี่หม่อง", nameEn: "Pi Mong", cell: 53, hp: 70, dmg: 17, image: "/images/monsters/ชบ7000.webp" },
  { id: "p_a_akatsuki", name: "พี่เออัครากระเทยแสงอุษา", nameEn: "akatsuki", cell: 92, hp: 70, dmg: 17, image: "/images/monsters/ชบ7000.webp", modelPath: "/models/p_a_กระเทยแสงอุษา.glb" },
  { id: "pi_rin", name: "พี่ริน", nameEn: "Pi Rin", cell: 58, hp: 60, dmg: 16, image: "/images/monsters/common/pi_rin_monster.webp" },
  { id: "moonwalk", name: "Moonwalk", nameEn: "Moonwalk", cell: 3, hp: 40, dmg: 12, image: "/images/monsters/common/moonwalk_monster.webp" },
  // Hidden/secret monsters (ปรับดาเมจสะใจ 38 - 120 DMG)
  { id: "gollum", name: "The Leaping Gollum", nameEn: "Gollum", cell: 17, hp: 120, dmg: 38, isHidden: true, image: "/images/monsters/secret/oop_tong_monster.webp" },
  { id: "master_m", name: "Master moment", nameEn: "Master Moment", cell: 23, hp: 120, dmg: 38, isHidden: true, image: "/images/monsters/secret/master_moment_monster.webp" },
  { id: "m_all_new", name: "M All New", nameEn: "M All New", cell: 24, hp: 120, dmg: 38, isHidden: true, image: "/images/monsters/secret/m-all-new.webp" },
  { id: "himi_ney", name: "หมีเนย", nameEn: "Butter Bear", cell: 25, hp: 50, dmg: 16, isHidden: true, image: "/images/monsters/secret/Butter_Bear.webp" },
  { id: "okaruto", name: "โอคารุโตะ ร่างมืด", nameEn: "Okaruto Dark", cell: 26, hp: 420, dmg: 85, isHidden: true, image: "/images/monsters/secret/okaluto_monster.webp" },
  { id: "unbeatable", name: "The Unbeatable", nameEn: "The Unbeatable", cell: 35, hp: 9999, dmg: 120, isHidden: true, image: "/images/monsters/secret/พี่มิด_mini_boss.webp" },
  { id: "pi_mote", name: "พี่พ่อมด", nameEn: "Pi Mote", cell: 54, hp: 240, dmg: 60, isHidden: true, image: "/images/monsters/secret/พี่พ่อมด_monster.webp" },
  { id: "yam", name: "ยำ", nameEn: "Yam", cell: 55, hp: 180, dmg: 45, isHidden: true, image: "/images/monsters/ชบ7000.webp" },
  { id: "ma_tang", name: "หมาถัง", nameEn: "Ma Tang", cell: 70, hp: 280, dmg: 68, isHidden: true, image: "/images/monsters/secret/Ma_Tang.webp" },
  { id: "som_normal", name: "สมอา (ร่างปกติ)", nameEn: "Som Normal", cell: 71, hp: 220, dmg: 50, isHidden: true, image: "/images/monsters/secret/Som_Normal.webp" },
  { id: "som_devil", name: "สมอา (ร่างปีศาจ)", nameEn: "Som Devil", cell: 72, hp: 500, dmg: 95, isHidden: true, image: "/images/monsters/secret/Som_Devil.webp" },
  // Event monsters
  { id: "eva", name: "เทพธิดาเอวา", nameEn: "Eva", cell: 28, hp: 0, dmg: -30, isHidden: true, isHealer: true, image: "/images/monsters/events/eva.webp" },
];

// Build cell → monster lookup
export const MONSTER_MAP = MONSTERS.reduce((acc, m) => {
  acc[m.cell] = m;
  return acc;
}, {});
