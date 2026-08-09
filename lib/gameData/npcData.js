// ─── NPC DATA & CONFIGURATION ──────────────────────────────

export const NPC_CONFIG = {
  SPAWN_COOLDOWN_SECONDS: 180, // 3 นาที (180 วินาที)
  PET_CHANGE_FEE: 1000,
  DOCTOR_POTION_COUNT: 2,
};

export const NPCS = {
  skill_trainer: {
    id: "skill_trainer",
    name: "ผู้ฝึก Skill",
    nameEn: "Skill Trainer",
    emoji: "🧙‍♂️",
    image: "/images/npc/npc_ผู้ฝึก_skills.webp",
    color: "#3b82f6", // Blue
    description: "แจกสกิลใหม่ฟรี 1 สกิล หรือเปลี่ยนสกิลเมื่อสกิลเต็ม (สูงสุด 2 สกิล)",
  },
  pet_trainer: {
    id: "pet_trainer",
    name: "ผู้ฝึกสัตว์",
    nameEn: "Pet Trainer",
    emoji: "🐾",
    image: "/images/npc/npc_ผู้ฝึกสัตว์.webp",
    color: "#10b981", // Emerald
    description: "แจกสัตว์เลี้ยงฟรี 1 ตัวครั้งแรก หรือสลับเปลี่ยนสัตว์เลี้ยง (ค่าบริการ 1,000 Gold)",
  },
  doctor: {
    id: "doctor",
    name: "หมอยา",
    nameEn: "Alchemist Doctor",
    emoji: "🧪",
    image: "/images/npc/npm_nvk_หมอยา.webp",
    color: "#ec4899", // Pink
    description: "สุ่มแจกยาปรุงพิเศษ 2 ขวดฟรีทันทีที่เดินตกช่อง!",
  },
  merchant: {
    id: "merchant",
    name: "พ่อค้าลึกลับ",
    nameEn: "Mysterious Merchant",
    emoji: "🏪",
    image: "/images/npc/พ่อค้าลึกลับ.webp",
    color: "#f59e0b", // Amber/Gold
    description: "ร้านค้าสัญจร เปิดหน้าร้านค้าฮอกปดเมื่อเดินตกช่อง (คูลดาวน์เกิดใหม่ 3 นาที)",
  },
};

export const NPC_LIST = Object.values(NPCS);
