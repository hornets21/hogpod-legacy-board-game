// ─── BINGO LOGIC ENGINE ──────────────────────────────────────────

export const BINGO_PRICE = 500;
export const BINGO_REWARD_LINE = 10000;
export const BINGO_REWARD_FULL = 10000;

/**
 * Generate a 5x5 Bingo Card for a player.
 * Column 0 (B): 5 numbers in range 1..18
 * Column 1 (I): 5 numbers in range 19..36
 * Column 2 (N): 4 numbers in range 37..54 + FREE center slot (index 12)
 * Column 3 (G): 5 numbers in range 55..72
 * Column 4 (O): 5 numbers in range 73..90
 */
export function generateBingoCard() {
  function getSample(min, max, count) {
    const pool = [];
    for (let i = min; i <= max; i++) pool.push(i);
    // Fisher-Yates shuffle
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, count).sort((a, b) => a - b);
  }

  const bCols = getSample(1, 18, 5);
  const iCols = getSample(19, 36, 5);
  const nCols = getSample(37, 54, 4);
  const gCols = getSample(55, 72, 5);
  const oCols = getSample(73, 90, 5);

  const numbers = new Array(25);
  const marked = new Array(25).fill(false);

  // Fill in 5x5 grid row by row
  // row r (0..4), col c (0..4) -> index r * 5 + c
  let nIdx = 0;
  for (let r = 0; r < 5; r++) {
    numbers[r * 5 + 0] = bCols[r];
    numbers[r * 5 + 1] = iCols[r];

    if (r === 2) {
      numbers[r * 5 + 2] = "FREE";
      marked[r * 5 + 2] = true; // Center cell is free & marked
    } else {
      numbers[r * 5 + 2] = nCols[nIdx++];
    }

    numbers[r * 5 + 3] = gCols[r];
    numbers[r * 5 + 4] = oCols[r];
  }

  return {
    numbers,
    marked,
    completedLines: [], // Indices 0..11 of completed lines
    hasWon: false,
  };
}

/**
 * All 12 possible winning lines in a 5x5 grid:
 * Rows 0..4 (indices 0..4)
 * Cols 0..4 (indices 5..9)
 * Diagonals 0..1 (indices 10..11)
 */
export const BINGO_LINES = [
  // Rows
  [0, 1, 2, 3, 4],
  [5, 6, 7, 8, 9],
  [10, 11, 12, 13, 14],
  [15, 16, 17, 18, 19],
  [20, 21, 22, 23, 24],
  // Columns
  [0, 5, 10, 15, 20],
  [1, 6, 11, 16, 21],
  [2, 7, 12, 17, 22],
  [3, 8, 13, 18, 23],
  [4, 9, 14, 19, 24],
  // Diagonals
  [0, 6, 12, 18, 24],
  [4, 8, 12, 16, 20],
];

/**
 * Check and update Bingo Card for a player landing at targetCell.
 * Returns { updatedPlayer, logs, bingoWin }
 */
export function checkPlayerBingo(player, targetCell) {
  if (!player || !player.hasBingoCard || !player.bingoCard) {
    return { updatedPlayer: player, logs: [], bingoWin: null };
  }

  const card = { ...player.bingoCard };
  const numbers = [...card.numbers];
  const marked = [...card.marked];
  const completedLines = [...(card.completedLines || [])];
  const logs = [];

  let newlyMarked = false;

  for (let i = 0; i < 25; i++) {
    if (numbers[i] === targetCell && !marked[i]) {
      marked[i] = true;
      newlyMarked = true;
      logs.push(`🎯 [บิงโก!] ${player.name} เดินตกช่อง ${targetCell} ซึ่งตรงกับป้ายบิงโก! ✨`);
      break;
    }
  }

  if (!newlyMarked) {
    return { updatedPlayer: player, logs: [], bingoWin: null };
  }

  let newlyCompletedLinesCount = 0;
  let totalGoldReward = 0;

  BINGO_LINES.forEach((lineIndices, lineIdx) => {
    if (completedLines.includes(lineIdx)) return; // Already completed

    const isLineComplete = lineIndices.every((idx) => marked[idx]);
    if (isLineComplete) {
      completedLines.push(lineIdx);
      newlyCompletedLinesCount++;
      totalGoldReward += BINGO_REWARD_LINE;
    }
  });

  const updatedPlayer = { ...player };
  let bingoWin = null;

  if (totalGoldReward > 0) {
    updatedPlayer.gold = (updatedPlayer.gold || 0) + totalGoldReward;
    logs.push(
      `🎉 [บิงโกสำเร็จ!] ${player.name} พิชิต ${newlyCompletedLinesCount} สายบิงโก! รับโบนัส +${totalGoldReward.toLocaleString()} Gold! (ป้าย Bingo ถูกใช้งานแล้ว สามารถซื้อใบใหม่ได้ที่ร้านค้า)`
    );

    bingoWin = {
      playerName: player.name,
      playerColor: player.color,
      playerEmoji: player.emoji,
      playerImage: player.image,
      linesCount: newlyCompletedLinesCount,
      goldReward: totalGoldReward,
    };

    // "หลังจาก bingo แล้วแค่แถวเดียว bingo ควรหายให้ไปซื้อใหม่"
    // Reset / remove bingo card after completing bingo lines so they can buy a new one!
    updatedPlayer.hasBingoCard = false;
    updatedPlayer.bingoCard = null;
  } else {
    card.marked = marked;
    card.completedLines = completedLines;
    updatedPlayer.bingoCard = card;
  }

  return { updatedPlayer, logs, bingoWin };
}
