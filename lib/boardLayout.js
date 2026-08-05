// ============================================================
// Board Layout — ตำแหน่งช่องบนกระดาน (ใช้ร่วมกัน 2D/3D)
// กระดาน 10 × 9 = 90 ช่อง เรียงแบบงู (snake pattern)
// ============================================================

import { MONSTER_MAP, CELL_TELEPORT } from "@/lib/gameData";

export const BOARD_COLS = 10;
export const BOARD_ROWS = 9;
export const TOTAL_CELLS = 90;

// ขนาดช่องในฉาก 3D (หน่วย world)
export const TILE_SIZE = 1;
export const TILE_GAP = 1.12;

// Build cell grid (snake pattern: row 0 = 81-90, row 1 = 71-80 reversed, etc.)
export function buildGrid() {
  const rows = [];
  for (let row = 0; row < BOARD_ROWS; row++) {
    const rowStart = TOTAL_CELLS - row * BOARD_COLS;
    const cells = [];
    for (let col = 0; col < BOARD_COLS; col++) {
      // Even rows go right (normal), odd rows go left (snake)
      const cell = row % 2 === 0
        ? rowStart - BOARD_COLS + col + 1
        : rowStart - col;
      cells.push(cell);
    }
    rows.push(cells);
  }
  return rows;
}

// ประเภทของช่อง: "boss" | "elite" | "healer" | "hidden" | "monster" | "ladder" | "snake" | "normal"
export function getCellType(cell, usedLadders = [], monsterMap = null, cellTeleport = null) {
  const m = (monsterMap || MONSTER_MAP)[cell];
  if (m) {
    if (m.isBoss) return "boss";
    if (m.isElite) return "elite";
    if (m.isHealer) return "healer";
    if (m.isHidden) return "hidden";
    return "monster";
  }
  const tele = (cellTeleport || CELL_TELEPORT)[cell];
  if (tele) {
    const type = tele.type;
    const isUsed = usedLadders?.includes ? usedLadders.includes(cell) : usedLadders?.has ? usedLadders.has(cell) : false;
    if (type === "ladder" && isUsed) {
      return "normal";
    }
    return type; // "ladder" | "snake"
  }
  return "normal";
}

// แมพเลขช่อง → ตำแหน่ง [x, y, z] บนระนาบ XZ ของฉาก 3D
// ช่อง 1 อยู่หน้า-ซ้าย (ใกล้กล้อง), ช่อง 90 อยู่หลัง-ขวา (ไกลกล้อง)
export function cellToWorld(cell) {
  const idx = cell - 1; // 0..89
  const rowFromBottom = Math.floor(idx / BOARD_COLS); // 0 = แถวช่อง 1-10
  const colInRow = idx % BOARD_COLS;
  // แถวคู่ (จากล่าง) วิ่งซ้าย→ขวา, แถวคี่วิ่งขวา→ซ้าย
  const col = rowFromBottom % 2 === 0 ? colInRow : BOARD_COLS - 1 - colInRow;
  const rowFromTop = BOARD_ROWS - 1 - rowFromBottom;

  const x = (col - (BOARD_COLS - 1) / 2) * TILE_GAP;
  const z = (rowFromTop - (BOARD_ROWS - 1) / 2) * TILE_GAP;
  return [x, 0, z];
}

// offset สำหรับผู้เล่นหลายคนยืนช่องเดียวกัน (grid 2×2)
// จำกัดระยะไม่ให้ตราบ้าน (CrestSprite) ล้นออกนอก tile ขนาด 1×1
export const TOKEN_OFFSETS = [
  [-0.22, 0, -0.22],
  [0.22, 0, -0.22],
  [-0.22, 0, 0.22],
  [0.22, 0, 0.22],
];
