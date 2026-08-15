import { MONSTERS } from "./monsters";

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

// ─── DYNAMIC BOARD RANDOMIZER ────────────────────────────────
export function generateRandomBoardElements() {
  const availableCells = Array.from({ length: 88 }, (_, i) => i + 2); // Cells 2..89

  function shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  const shuffledCells = shuffle(availableCells);
  let cellIdx = 0;

  // 1. Randomize Monster positions by tier (Common in early cells, Elite/Secret/Boss in late cells)
  // Grand Boss remains fixed at cell 90
  // Besides explicit flags, use the monster stats to tier newly-added models
  // that do not have isElite/isHidden metadata yet.
  const isStrongMonster = (m) =>
    !m.isBoss &&
    (m.isElite || m.isHidden || m.isHealer || Number(m.hp) >= 220 || Number(m.dmg) >= 48);

  // แถบช่วงช่องสำหรับมอนสเตอร์ (แบ่งกระดานออกเป็น 2 โซน)
  // Reserve the opening corridor for players and NPCs. Common monsters start
  // after cell 10 so the first few turns are not blocked by a cluster of foes.
  // Strong monsters remain in the later half of the board.
  const earlyZone = shuffle(availableCells.filter((c) => c >= 11 && c <= 45));
  const lateZone = shuffle(availableCells.filter((c) => c >= 46 && c <= 89));

  let earlyIdx = 0;
  let lateIdx = 0;
  const usedMonsterCells = new Set();

  const dynamicMonsters = MONSTERS.map((m) => {
    if (m.cell === 90 || m.isBoss || m.id === "grand_boss") {
      usedMonsterCells.add(90);
      return { ...m, cell: 90, isBoss: true };
    }

    let cell;
    if (isStrongMonster(m)) {
      // มอนสเตอร์เก่งๆ สุ่มให้อยู่ช่วงท้ายกระดาน
      if (lateIdx < lateZone.length) {
        cell = lateZone[lateIdx++];
      } else {
        cell = earlyZone[earlyIdx++];
      }
    } else {
      // มอนสเตอร์ธรรมดากากๆ สุ่มให้อยู่ช่วงต้นกระดาน
      if (earlyIdx < earlyZone.length) {
        cell = earlyZone[earlyIdx++];
      } else {
        cell = lateZone[lateIdx++];
      }
    }

    usedMonsterCells.add(cell);
    return { ...m, cell };
  });

  const monsterMap = {};
  const monsterCells = new Set();
  dynamicMonsters.forEach((m) => {
    monsterMap[m.cell] = m;
    monsterCells.add(m.cell);
  });

  // Cells שהםไม่มีมอนสเตอร์สแตนด์บายอยู่
  const nonMonsterCells = availableCells.filter((c) => !usedMonsterCells.has(c));

  // 2. Randomize Snakes and Ladders (6 Ladders & 6 Snakes)
  const snakesAndLadders = [];
  const cellTeleport = {};
  const occupiedTeleportCells = new Set();

  // Generate Ladders (6)
  let ladderCandidates = shuffle(nonMonsterCells.filter((c) => c >= 11 && c <= 70));
  let ladderCount = 0;

  for (const fromCell of ladderCandidates) {
    if (ladderCount >= 6) break;
    if (occupiedTeleportCells.has(fromCell)) continue;

    const validTargets = nonMonsterCells.filter(
      (c) => c > fromCell && c <= 88 && c >= fromCell + 12 && c <= fromCell + 35 && c >= 11 && !occupiedTeleportCells.has(c)
    );

    if (validTargets.length > 0) {
      const toCell = validTargets[Math.floor(Math.random() * validTargets.length)];
      occupiedTeleportCells.add(fromCell);
      occupiedTeleportCells.add(toCell);
      const item = { from: fromCell, to: toCell, type: "ladder" };
      snakesAndLadders.push(item);
      cellTeleport[fromCell] = item;
      ladderCount++;
    }
  }

  // Generate Snakes (6)
  let snakeCandidates = shuffle(
    nonMonsterCells.filter((c) => c >= 25 && c <= 88 && !occupiedTeleportCells.has(c))
  );
  let snakeCount = 0;

  for (const fromCell of snakeCandidates) {
    if (snakeCount >= 6) break;
    if (occupiedTeleportCells.has(fromCell)) continue;

    const validTargets = nonMonsterCells.filter(
      (c) => c < fromCell && c >= 11 && c <= fromCell - 12 && c >= fromCell - 35 && !occupiedTeleportCells.has(c)
    );

    if (validTargets.length > 0) {
      const toCell = validTargets[Math.floor(Math.random() * validTargets.length)];
      occupiedTeleportCells.add(fromCell);
      occupiedTeleportCells.add(toCell);
      const item = { from: fromCell, to: toCell, type: "snake" };
      snakesAndLadders.push(item);
      cellTeleport[fromCell] = item;
      snakeCount++;
    }
  }

  return {
    dynamicMonsters,
    monsterMap,
    monsterCells,
    snakesAndLadders,
    cellTeleport,
  };
}
