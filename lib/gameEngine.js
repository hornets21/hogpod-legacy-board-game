import {
  HOUSES,
  HOUSE_LIST,
  BASE_HP,
  BASE_DMG,
  RESPAWN_HP,
  DEATH_PENALTY,
  ARMOR_POOL,
  AMULET_POOL,
  POTIONS,
  PETS,
  SKILLS,
  MONSTERS,
  MONSTER_MAP,
  SNAKES_AND_LADDERS,
  CELL_TELEPORT,
  BOARD_SIZE,
  WIN_CELL,
  BINGO_REWARD,
  BINGO_PRICE,
  MAX_POTIONS,
  SKILL_PRICE,
  generateRandomBoardElements,
  NPCS,
  NPC_CONFIG,
  PET_LIST,
  SKILL_LIST,
  POTION_LIST,
  MAX_SKILLS_PER_HOUSE,
} from "./gameData";
import { generateBingoCard, checkPlayerBingo } from "./bingoEngine";
import {
  emitSkillCast,
  emitDamageDealt,
  emitHeal,
  emitBuffGained,
  emitMonsterKilled,
  emitPlayerDied,
} from "./skillFxBus";

// ─── Initial State ───────────────────────────────────────────
export function createInitialGameState() {
  const players = HOUSE_LIST.map((house) => createPlayer(house));
  const boardElements = generateRandomBoardElements();

  const baseState = {
    phase: "title", // title | setup | initiative | play | combat | gameover
    turn: 1,
    round: 1,
    currentPlayerIndex: 0,
    players,
    monsterCells: boardElements.monsterCells, // Set<number> of cells containing monsters
    monsterMap: boardElements.monsterMap, // cellNumber -> monster data
    monsterReserve: boardElements.monsterReserve || [], // hidden waves activated by round
    monsterSpawnPhase: 1,
    cellTeleport: boardElements.cellTeleport, // cellNumber -> { from, to, type }
    snakesAndLadders: boardElements.snakesAndLadders,
    revealedMonsters: {}, // cellNumber -> monster data
    trapCells: {}, // cellNumber -> { houseId }
    usedLadders: [], // Array of cell numbers where ladders have been used and removed
    pendingTeleport: null, // { playerIndex, from, to, type }
    teleportModalData: null, // Data for TeleportModal prompt
    winner: null,
    log: ["🎲 สุ่มตำแหน่งมอนสเตอร์และบันไดงูสำหรับกระดานตานี้เรียบร้อยแล้ว!", "💰 ระบบเพิ่มเงินอัตโนมัติ (MOBA Auto Gold) พร้อมทำงานแล้ว!"],
    diceResult: null,
    combatState: null,
    shopOpen: false,
    activeSkillEffect: null,
    autoGoldEnabled: true,   // เปิดใช้งานระบบเพิ่มเงินอัตโนมัติแบบ MOBA
    autoGoldAmount: 90,      // +90 Gold ต่อ 10 วินาที
    autoGoldInterval: 10,    // เพิ่มเงินทุกๆ 10 วินาที
    autoGoldTickCount: 0,    // จำนวนรอบที่แจกเงินไปแล้ว
    npcs: {
      skill_trainer: { id: "skill_trainer", cell: null, isSpawned: false, cooldown: 0 },
      pet_trainer: { id: "pet_trainer", cell: null, isSpawned: false, cooldown: 0 },
      doctor: { id: "doctor", cell: null, isSpawned: false, cooldown: 0 },
      merchant: { id: "merchant", cell: null, isSpawned: false, cooldown: 0 },
    },
    marqueeAnnouncements: ["📢 ยินดีต้อนรับสู่ Hogwarts Legacy Board Game! เหล่า NPC พร้อมแจกไอเท็มบนกระดานแล้ว"],
  };
  return spawnAllNpcs(baseState);
}

export function resetGameState(state) {
  if (!state) return createInitialGameState();

  const boardElements = generateRandomBoardElements();
  const resetPlayers = (state.players || HOUSE_LIST.map((h) => createPlayer(h))).map((p) => {
    const house = HOUSE_LIST.find((h) => h.id === p.houseId) || {};
    const baseDmg = house.memberCount || 5;
    return {
      ...p,
      position: 1,
      hp: BASE_HP,
      maxHp: BASE_HP,
      baseDmg,
      maxDmg: baseDmg,
      dmgModifier: 0,
      wand: null,
      armor: null,
      amulet: null,
      pet: null,
      skills: [],
      skillCooldowns: {},
      potions: [],
      gold: 0,
      bingoCards: [],
      hasBingoCard: false,
      bingoCard: null,
      isAlive: true,
      isInvincible: false,
      invincibleTurns: 0,
      dodgeUsed: false,
      deathCount: 0,
      shopVisited: false,
      lifestealActive: false,
      lastDamageTaken: null,
      nextRollOverride: null,
    };
  });

  const isOnline = Boolean(state.players?.some((p) => p._onlineUid));
  const isPlaying = state.phase === "play" || state.phase === "combat" || isOnline;

  const baseState = {
    ...state,
    phase: isPlaying ? "play" : "title",
    turn: 1,
    round: 1,
    currentPlayerIndex: 0,
    players: resetPlayers,
    monsterCells: boardElements.monsterCells,
    monsterMap: boardElements.monsterMap,
    monsterReserve: boardElements.monsterReserve || [],
    monsterSpawnPhase: 1,
    cellTeleport: boardElements.cellTeleport,
    snakesAndLadders: boardElements.snakesAndLadders,
    revealedMonsters: {},
    trapCells: {},
    usedLadders: [],
    pendingTeleport: null,
    teleportModalData: null,
    winner: null,
    diceResult: null,
    combatState: null,
    shopOpen: false,
    activeSkillEffect: null,
    autoGoldEnabled: true,
    autoGoldAmount: 90,
    autoGoldInterval: 10,
    autoGoldTickCount: 0,
    npcs: {
      skill_trainer: { id: "skill_trainer", cell: null, isSpawned: false, cooldown: 0 },
      pet_trainer: { id: "pet_trainer", cell: null, isSpawned: false, cooldown: 0 },
      doctor: { id: "doctor", cell: null, isSpawned: false, cooldown: 0 },
      merchant: { id: "merchant", cell: null, isSpawned: false, cooldown: 0 },
    },
    log: [
      ...((state.log || []).slice(-10)),
      "🔄 The game board has been reset by Admin! All players start fresh from Cell #1.",
    ],
  };

  return spawnAllNpcs(baseState);
}

function createPlayer(house) {
  const baseDmg = house.memberCount; // +1 per member
  return {
    houseId: house.id,
    name: house.name,
    nameEn: house.nameEn,
    image: house.image,
    color: house.color,
    emoji: house.emoji,
    commonWand: house.commonWand,
    commonWandImg: house.commonWandImg,
    vipWand: house.vipWand,
    vipWandImg: house.vipWandImg,
    position: 1,
    hp: BASE_HP,
    maxHp: BASE_HP,
    baseDmg,
    maxDmg: baseDmg,
    dmgModifier: 0, // from potions / temp effects
    wand: null, // { type: 'common'|'vip', dmgBonus }
    armor: null,
    amulet: null,
    pet: null,
    skills: [], // max 2 skills with cooldowns
    skillCooldowns: {}, // skillId -> turnsRemaining
    potions: [], // array of potionIds (max 5)
    gold: 0, // starting gold (distributed by admin or pre-game setup)
    bingoCards: [],
    hasBingoCard: false,
    bingoCard: null,
    isAlive: true,
    isInvincible: false,
    invincibleTurns: 0,
    dodgeUsed: false,
    deathCount: 0,
    shopVisited: false,
    lifestealActive: false,
    tempDmgBonus: 0,
    tempDmgTurns: 0,
    _onlineUid: null,
    _onlineName: null,
    _onlineAvatar: null,
  };
}

function placeMonsters() {
  // Returns a Set of cell numbers that have monsters (hidden)
  return new Set(MONSTERS.map((m) => m.cell));
}

// ─── Selectors ───────────────────────────────────────────────
export function getCurrentPlayer(state) {
  return state.players[state.currentPlayerIndex];
}

export function getPlayerByHouseId(state, houseId) {
  return state.players.find((p) => p.houseId === houseId);
}

export function getTotalDmg(player) {
  let dmg = player.baseDmg;
  if (player.wand) dmg += player.wand.dmgBonus;
  if (player.amulet) dmg += player.amulet.dmgBonus;
  if (player.armor) dmg += player.armor.dmgBonus || 0;
  if (player.tempDmgBonus > 0) dmg += player.tempDmgBonus;
  return Math.max(0, dmg);
}

export function getEffectiveHp(player) {
  return Math.max(0, player.hp);
}

let lastRolledDiceValue = null;

export function rollDice(sides = 6) {
  const numSides = typeof sides === "number" && !isNaN(sides) && sides > 0 ? Math.floor(sides) : 6;
  let rolled;
  if (typeof window !== "undefined" && window.crypto && window.crypto.getRandomValues) {
    const array = new Uint32Array(1);
    let val;
    do {
      window.crypto.getRandomValues(array);
      val = array[0];
    } while (val >= 4294967292); // Rejection sampling for perfect 1-6 distribution
    rolled = (val % numSides) + 1;
  } else {
    rolled = Math.floor(Math.random() * numSides) + 1;
  }

  // ป้องกันการออกแต้มซ้ำติดกันกับผู้เล่นคนก่อนหน้าบ่อยเกินไป (Anti-consecutive repeat filter)
  if (rolled === lastRolledDiceValue && Math.random() < 0.65) {
    if (typeof window !== "undefined" && window.crypto && window.crypto.getRandomValues) {
      const array = new Uint32Array(1);
      window.crypto.getRandomValues(array);
      rolled = (array[0] % numSides) + 1;
    } else {
      rolled = Math.floor(Math.random() * numSides) + 1;
    }
  }

  lastRolledDiceValue = rolled;
  return rolled;
}

// ─── Movement ─────────────────────────────────────────────────
export function movePlayer(state, playerIndex, steps) {
  const numSteps = typeof steps === "number" && !isNaN(steps) ? steps : 1;
  const log = [];
  const players = [...state.players];
  const player = { ...players[playerIndex] };
  let usedLadders = [...(state.usedLadders || [])];

  let newPos = player.position + numSteps;
  if (newPos > BOARD_SIZE) newPos = BOARD_SIZE;
  if (newPos < 1) newPos = 1;

  log.push(`🎲 ${player.name} เดิน ${numSteps} ก้าว → ช่อง ${newPos}`);

  // Check snake or ladder (use dynamic cellTeleport from state)
  const teleportMap = state.cellTeleport || CELL_TELEPORT;
  const teleport = teleportMap[newPos];
  let pendingTeleport = null;

  if (teleport) {
    const isLadder = teleport.type === "ladder";
    if (isLadder) {
      if (!usedLadders.includes(newPos)) {
        pendingTeleport = {
          playerIndex,
          from: newPos,
          to: teleport.to,
          type: "ladder",
        };
        log.push(`🪜 ${player.name} พบบันทไดที่ช่อง ${newPos}! (เตรียมปีนไปช่อง ${teleport.to})`);
      } else {
        log.push(`🪵 ช่อง ${newPos} บันไดถูกใช้งานไปแล้ว ไม่สามารถปีนขึ้นได้อีก`);
      }
    } else {
      pendingTeleport = {
        playerIndex,
        from: newPos,
        to: teleport.to,
        type: "snake",
      };
      log.push(`🐍 ${player.name} ตกช่องงูยักษ์ที่ช่อง ${newPos}! (เตรียมสไลด์ไปช่อง ${teleport.to})`);
    }
  }

  player.position = newPos;

  // Check Bingo status
  const { updatedPlayer, logs: bingoLogs, bingoWin } = checkPlayerBingo(player, newPos);
  players[playerIndex] = updatedPlayer;
  if (bingoLogs && bingoLogs.length > 0) {
    log.push(...bingoLogs);
  }

  const nextState = {
    ...state,
    players,
    usedLadders,
    pendingTeleport,
    log: [...state.log, ...log],
    diceResult: steps,
  };
  if (bingoWin) {
    nextState.bingoWinModalData = bingoWin;
  }
  return nextState;
}

// ─── Combat ───────────────────────────────────────────────────
export function initCombat(state, playerIndex, monster) {
  const player = state.players[playerIndex];
  const monsterHp = typeof monster?.hp === "number" ? monster.hp : 50;
  const monsterDmg = typeof monster?.dmg === "number" ? monster.dmg : 10;
  const currentHp = typeof monster?.currentHp === "number" ? monster.currentHp : monsterHp;

  const dynamicMonster = {
    ...monster,
    hp: monsterHp,
    dmg: monsterDmg,
    currentHp: currentHp,
  };

  let revealedMonsters = state.revealedMonsters || {};
  let monsterMap = state.monsterMap || {};
  if (dynamicMonster.cell != null) {
    revealedMonsters = { ...revealedMonsters, [dynamicMonster.cell]: dynamicMonster };
    monsterMap = { ...monsterMap, [dynamicMonster.cell]: dynamicMonster };
  }

  return {
    ...state,
    revealedMonsters,
    monsterMap,
    phase: "combat",
    combatState: {
      playerIndex,
      monster: dynamicMonster,
      playerCurrentHp: player.hp,
      round: 0,
      log: [],
      resolved: false,
    },
  };
}

export function calculateCombatAttack(player, monster, attackOpts = {}) {
  const baseDmg = getTotalDmg(player);
  const roll = typeof attackOpts.roll === "number" ? attackOpts.roll : Math.random();

  let rollType = "HIT";
  let playerDmg = baseDmg;
  let popupText = `-${baseDmg}`;
  let popupColor = "text-amber-300";

  if (roll < 0.15) {
    // 1. CRITICAL HIT (15% chance): 140% - 180% damage
    rollType = "CRIT";
    const critMult = typeof attackOpts.critMult === "number" ? attackOpts.critMult : (1.4 + Math.random() * 0.4);
    playerDmg = Math.round(baseDmg * critMult);
    popupText = `CRIT! -${playerDmg}`;
    popupColor = "text-yellow-300 drop-shadow-[0_0_20px_rgba(234,179,8,0.9)]";
  } else if (roll < 0.55) {
    // 2. NORMAL HIT (40% chance): 85% - 115% damage
    rollType = "HIT";
    const hitMult = typeof attackOpts.hitMult === "number" ? attackOpts.hitMult : (0.85 + Math.random() * 0.3);
    playerDmg = Math.max(1, Math.round(baseDmg * hitMult));
    popupText = `-${playerDmg}`;
    popupColor = "text-amber-200";
  } else if (roll < 0.85) {
    // 3. GLANCING HIT / GRAZE (30% chance): 30% - 60% damage
    rollType = "GRAZE";
    const grazeMult = typeof attackOpts.grazeMult === "number" ? attackOpts.grazeMult : (0.3 + Math.random() * 0.3);
    playerDmg = Math.max(1, Math.round(baseDmg * grazeMult));
    popupText = `GRAZE -${playerDmg}`;
    popupColor = "text-orange-400";
  } else {
    // 4. MISS / EVADED (15% chance): 0 damage
    rollType = "MISS";
    playerDmg = 0;
    popupText = "MISS!";
    popupColor = "text-cyan-300";
  }

  const monsterBaseDmg = monster?.dmg || 20;
  const counterDamage = rollType === "MISS"
    ? monsterBaseDmg
    : rollType === "GRAZE"
    ? Math.round(monsterBaseDmg * 0.9)
    : rollType === "HIT"
    ? Math.round(monsterBaseDmg * 0.6)
    : Math.round(monsterBaseDmg * 0.35); // Crit suppresses monster counter

  const initialMonsterHp = typeof monster?.currentHp === "number" ? monster.currentHp : (monster?.hp || 50);
  const remainingMonsterHp = Math.max(0, initialMonsterHp - playerDmg);
  // Clash win = the attack overpowers the monster: a killing blow or a CRIT.
  // Normal HITs must NOT auto-win: the counter is already suppressed to 0.6x
  // on HIT, so comparing playerDmg >= counterDamage made almost every HIT a
  // "win" for any decently-geared player and the monster's counter-attack
  // ended up deflected (BLOCKED) every single time.
  const isWin = remainingMonsterHp <= 0 || rollType === "CRIT";
  const outcome = isWin ? "win" : "lose";

  return {
    id: String(Date.now()) + "_" + Math.floor(Math.random() * 10000),
    rollType,
    damageDealt: playerDmg,
    playerDmg,
    counterDamage,
    monsterDmg: counterDamage,
    popupText,
    popupColor,
    remainingHp: remainingMonsterHp,
    monsterHp: monster?.hp || 50,
    outcome,
    timestamp: Date.now(),
  };
}

export function startCombatAttack(state, attackOpts = {}) {
  if (!state?.combatState || state.combatState.resolved) return state;
  const combat = { ...state.combatState };
  const player = state.players[combat.playerIndex];
  if (!player || !combat.monster) return state;

  const lastResult = calculateCombatAttack(player, combat.monster, attackOpts);
  return {
    ...state,
    combatState: {
      ...combat,
      lastResult,
    },
  };
}

export function resolveOneTurnCombat(state, combatResult = {}) {
  if (!state?.combatState) return state;
  const authoritativeResult = state.combatState?.lastResult || combatResult || {};
  const { outcome, counterDamage, spunDmg, spunHp, damageDealt } = authoritativeResult;
  const combat = { ...state.combatState };
  if (!combat.monster) return state;
  // Defensive: Firebase RTDB may hydrate `combat.log` as an index-keyed
  // object (or it may be missing entirely). Coerce to a real array so the
  // spread below cannot throw "combat.log is not iterable".
  if (!Array.isArray(combat.log)) {
    combat.log =
      combat.log && typeof combat.log === "object"
        ? Object.values(combat.log)
        : [];
  }
  const players = [...state.players];
  const player = { ...players[combat.playerIndex] };
  if (!player) return state;
  const playerDmg = getTotalDmg(player);

  const initialMonsterHp = typeof combat.monster.currentHp === "number"
    ? combat.monster.currentHp
    : (combat.monster.hp || 50);

  const roundLog = [];
  combat.round = (combat.round || 0) + 1;

  const isWinClash = outcome === "win";

  if (isWinClash) {
    // ผู้เล่นชนะการปะทะ: สร้างดาเมจเต็มที่ใส่มอนสเตอร์
    const damageToMonster = typeof damageDealt === "number" ? damageDealt : playerDmg;
    const newMonsterHp = Math.max(0, initialMonsterHp - damageToMonster);

    const monster = {
      ...combat.monster,
      dmg: spunDmg || combat.monster.dmg,
      currentHp: newMonsterHp,
    };

    combat.resolved = true;

    if (newMonsterHp <= 0) {
      combat.monsterDied = true;
      roundLog.push(`⚔️ ${player.name} สร้าง ${damageToMonster} ดาเมจ ปราบ ${monster.name} สำเร็จ!`);
    } else {
      combat.monsterDied = false;
      roundLog.push(`⚔️ ${player.name} ชนะการปะทะ! สร้าง ${damageToMonster} ดาเมจใส่ ${monster.name} (${monster.name} เหลือ HP ${newMonsterHp}/${monster.hp})`);
      roundLog.push(`🛡️ ${player.name} ป้องกันการโจมตีสวนกลับได้สำเร็จ ไม่เสีย HP!`);
    }

    combat.monster = monster;
    combat.playerCurrentHp = player.hp;
    players[combat.playerIndex] = player;

    let revealedMonsters = state.revealedMonsters || {};
    let monsterMap = state.monsterMap || {};
    if (monster.cell != null && newMonsterHp > 0) {
      revealedMonsters = { ...revealedMonsters, [monster.cell]: monster };
      monsterMap = { ...monsterMap, [monster.cell]: monster };
    }

    return {
      ...state,
      players,
      revealedMonsters,
      monsterMap,
      combatState: { ...combat, log: [...combat.log, ...roundLog] },
    };
  } else {
    // ผู้เล่นแพ้การปะทะ / โดนมอนสเตอร์สวนกลับ
    const damageToMonster = typeof damageDealt === "number" ? damageDealt : Math.max(0, Math.round(playerDmg * 0.5));
    const newMonsterHp = Math.max(0, initialMonsterHp - damageToMonster);
    const monsterAttack = typeof counterDamage === "number" ? counterDamage : (typeof spunDmg === "number" ? spunDmg : combat.monster.dmg);

    const monster = {
      ...combat.monster,
      dmg: monsterAttack,
      currentHp: newMonsterHp,
    };

    if (!player.isInvincible) {
      player.hp = Math.max(0, player.hp - monsterAttack);
    }

    combat.resolved = true;
    if (player.hp <= 0) {
      combat.playerDied = true;
      roundLog.push(`💥 ${player.name} แพ้การปะทะ! สร้างดาเมจได้ ${damageToMonster} (${monster.name} เหลือ HP ${newMonsterHp}/${monster.hp})`);
      roundLog.push(`💀 ${monster.name} สวนกลับสร้าง ${monsterAttack} ดาเมจ! ${player.name} พ่ายแพ้!`);
    } else {
      roundLog.push(`💥 ${player.name} แพ้การปะทะ! สร้างดาเมจใส่ ${monster.name} ได้ ${damageToMonster} (${monster.name} เหลือ HP ${newMonsterHp}/${monster.hp})`);
      if (player.isInvincible) {
        roundLog.push(`🛡️ ${player.name} อยู่ในสถานะอมตะ! ป้องกันดาเมจสวนกลับ ${monsterAttack} จาก ${monster.name} ได้ทั้งหมด!`);
      } else {
        roundLog.push(`⚠️ ${monster.name} สวนกลับสร้าง ${monsterAttack} ดาเมจ! (${player.name} เหลือ HP ${player.hp})`);
      }
    }

    combat.monster = monster;
    combat.playerCurrentHp = player.hp;
    players[combat.playerIndex] = player;

    let revealedMonsters = state.revealedMonsters || {};
    let monsterMap = state.monsterMap || {};
    if (monster.cell != null && newMonsterHp > 0) {
      revealedMonsters = { ...revealedMonsters, [monster.cell]: monster };
      monsterMap = { ...monsterMap, [monster.cell]: monster };
    }

    return {
      ...state,
      players,
      revealedMonsters,
      monsterMap,
      combatState: { ...combat, log: [...combat.log, ...roundLog] },
    };
  }
}

// ─── Death & Respawn ──────────────────────────────────────────
export function handlePlayerDeath(state, playerIndex) {
  const players = [...state.players];
  const player = { ...players[playerIndex] };
  const log = [];

  // Check for Revive Potion
  const playerPotions = Array.isArray(player.potions) ? [...player.potions] : [];
  const reviveIdx = playerPotions.indexOf("revive");
  if (reviveIdx !== -1) {
    playerPotions.splice(reviveIdx, 1);
    player.potions = playerPotions;
    const reviveHp = 50;
    player.hp = Math.min(player.maxHp, reviveHp);
    log.push(`💊 ${player.name} ใช้ยาชุบชีวิต — ฟื้นขึ้น HP ${player.hp}`);
    players[playerIndex] = player;
    return {
      ...state,
      players,
      phase: "play",
      combatState: null,
      log: [...state.log, ...log],
    };
  }

  // No revive — respawn at start
  player.deathCount += 1;

  // Permanent penalty
  player.maxDmg = Math.max(0, player.maxDmg - DEATH_PENALTY);
  player.maxHp = Math.max(10, player.maxHp - DEATH_PENALTY);

  // Pet: God Hand gives 100 HP on respawn
  const respawnHp =
    player.pet?.effect === "respawn_full_hp" ? player.pet.respawnHp : RESPAWN_HP;

  player.hp = Math.min(player.maxHp, respawnHp);
  player.position = 1;
  player.shopVisited = false; // allow shop again on respawn
  player.tempDmgBonus = 0;
  player.tempDmgTurns = 0;
  player.isInvincible = false;
  player.invincibleTurns = 0;
  player.lifestealActive = false;
  player.nextRollOverride = null;

  log.push(`💀 ${player.name} พ่ายแพ้ในการต่อสู้! กลับจุดเริ่มต้น (ช่อง 1) พร้อมพลังชีวิตเหลือ ${player.hp} HP`);

  players[playerIndex] = player;
  return {
    ...state,
    players,
    phase: "play",
    combatState: null,
    shopOpen: false,
    log: [...state.log, ...log],
  };
}

// ─── Skill System ─────────────────────────────────────────────
export function useSkill(state, playerIndex, skillId, targetIndex = null, monsterCell = null) {
  const players = state.players.map((p) => ({ ...p }));
  const player = { ...players[playerIndex] };
  const log = [];
  const skill = SKILLS[skillId];

  if (!skill) return state;

  // Check cooldown
  const cd = player.skillCooldowns?.[skillId] || 0;
  if (cd > 0) {
    log.push(`⏳ ${skill.nameTh || skill.name} ยังอยู่ใน cooldown (${cd} เทิร์น)`);
    return { ...state, log: [...state.log, ...log] };
  }

  // Validate that targeted skills receive a proper target.
  // The UI's SkillTargetPicker is responsible for sending these.
  const reqTarget = skill.requiresTarget;
  if (reqTarget === "player" && (targetIndex === null || targetIndex === playerIndex)) {
    log.push(`🎯 ${skill.nameTh || skill.name} ต้องเลือกบ้านเป้าหมายก่อนร่าย`);
    return { ...state, log: [...state.log, ...log] };
  }
  if (reqTarget === "monster" && monsterCell === null) {
    log.push(`🎯 ${skill.nameTh || skill.name} ต้องเลือกมอนสเตอร์เป้าหมายก่อนร่าย`);
    return { ...state, log: [...state.log, ...log] };
  }

  // Apply cooldown (reduce by 1 if has Hisoka pet)
  const cdBase = skill.cooldown || 3;
  const cdActual = player.pet?.effect === "reduce_cooldown" ? Math.max(1, cdBase - 1) : cdBase;
  player.skillCooldowns = { ...(player.skillCooldowns || {}), [skillId]: cdActual };

  log.push(`✨ ${player.name} ร่ายคาถา "${skill.nameTh || skill.name}"!`);

  let newState = { ...state, players };

  switch (skill.effect) {
    case "invincible": {
      player.isInvincible = true;
      player.invincibleTurns = skill.duration || 2;
      log.push(`🛡️ ${player.name} เข้าสู่สถานะอมตะ หลบการโจมตีทุกรูปแบบ ${player.invincibleTurns} เทิร์น!`);
      emitBuffGained({ targetIndex: playerIndex, buffId: "invincible", duration: player.invincibleTurns });
      break;
    }

    case "steal_turn": {
      newState.extraTurn = true;
      log.push(`🎵 ${player.name} ร่ายบทเพลงกล่อมใจ — ได้รับสิทธิ์ทอยลูกเต๋าเพิ่มอีก 1 เทิร์น!`);
      break;
    }

    case "lock_dice": {
      const chosenVal = (typeof targetIndex === "number" && targetIndex >= 1 && targetIndex <= 6) ? targetIndex : 6;
      player.nextRollOverride = chosenVal;
      log.push(`🐍 ${player.name} ใช้งูเล็งเขี้ยว — ล็อกผลลูกเต๋าก้าวถัดไปเป็น ${chosenVal}!`);
      emitBuffGained({ targetIndex: playerIndex, buffId: "lock_dice", duration: 1 });
      break;
    }

    case "shuffle_positions": {
      const alivePlayers = players.filter((p) => p.isAlive !== false);
      if (alivePlayers.length <= 1) {
        log.push(`🌀 ${player.name} ร่ายโคราชเคอส แต่มีผู้เล่นบนกระดานไม่เพียงพอที่จะสลับตำแหน่ง!`);
        break;
      }

      const uniquePositions = [...new Set(alivePlayers.map((p) => p.position))];
      if (uniquePositions.length <= 1) {
        log.push(`🌀 ${player.name} ร่ายโคราชเคอส แต่ผู้เล่นทุกคนยืนอยู่ที่ช่องเดียวกัน (ช่อง ${uniquePositions[0]})!`);
        break;
      }

      // ทำ Derangement / Cyclic permutation เพื่อรับประกันว่าทุกคนต้องสลับไปอยู่ช่องของคนอื่นจริง ๆ
      const originalPositions = alivePlayers.map((p) => p.position);
      let shuffledPositions = [...originalPositions];

      // ทำการสุ่มและตรวจสอบให้แน่ใจว่าไม่มีใครได้อยู่ที่ตำแหน่งเดิม (หากตำแหน่งตั้งต้นต่างกัน)
      let attempts = 0;
      let isSame = true;
      while (isSame && attempts < 30) {
        attempts++;
        for (let i = shuffledPositions.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffledPositions[i], shuffledPositions[j]] = [shuffledPositions[j], shuffledPositions[i]];
        }
        // ตรวจสอบว่าผู้เล่นทุกคนขยับไปตำแหน่งของคนอื่น
        isSame = alivePlayers.some((p, idx) => p.position === shuffledPositions[idx]);
      }

      // หากยังคงได้ตำแหน่งเดิม ให้ทำ Cyclic shift อย่างน้อย 1 ช่อง
      if (isSame) {
        const first = shuffledPositions.shift();
        shuffledPositions.push(first);
      }

      // อัปเดตตำแหน่งใหม่ให้กับผู้เล่นทุกคน
      const moveSummaries = [];
      alivePlayers.forEach((p, idx) => {
        const oldPos = p.position;
        const newPos = shuffledPositions[idx];
        const pIndex = players.findIndex((pl) => pl.houseId === p.houseId);
        if (pIndex >= 0) {
          players[pIndex] = { ...players[pIndex], position: newPos };
          if (oldPos !== newPos) {
            moveSummaries.push(`${players[pIndex].name} ➔ ช่อง ${newPos}`);
          }
        }
      });

      player.position = players[playerIndex].position;
      log.push(`🌀 โคราชเคอส (Korat Chaos)! สลับตำแหน่งผู้เล่นทุกคนบนกระดานเรียบร้อยแล้ว! (${moveSummaries.join(" | ")})`);
      break;
    }

    case "steal_potion": {
      // Steal from the chosen target (requiresTarget:"player" guarantees targetIndex set)
      let tIdx = targetIndex;

      if (tIdx !== null && tIdx !== playerIndex && Array.isArray(players[tIdx]?.potions) && players[tIdx].potions.length > 0) {
        const target = { ...players[tIdx] };
        const randIdx = Math.floor(Math.random() * target.potions.length);
        const stolenPotion = target.potions[randIdx];
        target.potions = target.potions.filter((_, i) => i !== randIdx);

        const currentPots = Array.isArray(player.potions) ? player.potions : [];
        if (currentPots.length < MAX_POTIONS) {
          player.potions = [...currentPots, stolenPotion];
          log.push(`🎭 ${player.name} ขโมยยา "${stolenPotion}" มาจาก ${target.name} สำเร็จ!`);
        } else {
          log.push(`🎭 ${player.name} ขโมยยามาจาก ${target.name} แต่กระเป๋ายาเต็มแล้ว!`);
        }
        players[tIdx] = target;
      } else {
        log.push(`🎭 ร่าย God NTR แต่เป้าหมายไม่มียาให้ขโมย!`);
      }
      break;
    }

    case "banish_monster": {
      const monsterCells = new Set(state.monsterCells || []);
      const targetCell = monsterCell !== null ? monsterCell : (state.combatState?.monster?.cell ?? player.position);
      const targetMonster = MONSTER_MAP[targetCell] || state.combatState?.monster;

      if (targetMonster?.isBoss) {
        log.push(`⚠️ คาถา Scab Dead ไร้ผล! ไม่สามารถขับไล่ Boss (${targetMonster.name}) ได้!`);
      } else if (monsterCell !== null && monsterCells.has(monsterCell)) {
        monsterCells.delete(monsterCell);
        log.push(`💨 ขับไล่มอนสเตอร์ที่ช่อง ${monsterCell} หายไปในความมืด!`);
        if (state.combatState && state.combatState.monster?.cell === monsterCell) {
          newState = { ...newState, combatState: { ...state.combatState, resolved: true } };
        }
      } else if (monsterCell !== null) {
        log.push(`💨 ร่าย Scab Dead แต่ไม่พบมอนสเตอร์ที่ช่อง ${monsterCell}!`);
      } else {
        // Fallback for active combat or standing cell
        const pos = player.position;
        const activeMon = state.combatState?.monster;
        if (activeMon && !activeMon.isBoss) {
          monsterCells.delete(activeMon.cell);
          log.push(`💨 ขับไล่ ${activeMon.name} หายไปในความมืด!`);
          newState = { ...newState, combatState: { ...state.combatState, resolved: true } };
        } else if (monsterCells.has(pos)) {
          const target = MONSTER_MAP[pos];
          if (target?.isBoss) {
            log.push(`⚠️ คาถา Scab Dead ไร้ผล! ไม่สามารถขับไล่ Boss (${target.name}) ได้!`);
          } else {
            monsterCells.delete(pos);
            log.push(`💨 ขับไล่มอนสเตอร์ที่ช่อง ${pos} หายไปในความมืด!`);
          }
        } else {
          log.push(`💨 ร่าย Scab Dead แต่ไม่มีมอนสเตอร์ให้ขับไล่!`);
        }
      }
      newState = { ...newState, monsterCells };
      break;
    }

    default:
      break;
  }

  // Handle damage skills (monster target) — combat context auto-targets active monster
  if (skill.dmg && skill.target === "monster") {
    if (state.combatState) {
      const combat = { ...state.combatState };
      const monster = { ...combat.monster };
      const initialHp = typeof monster.currentHp === "number" ? monster.currentHp : (monster.hp || 50);
      const newHp = Math.max(0, initialHp - skill.dmg);
      monster.currentHp = newHp;
      log.push(`⚡ ${skill.nameTh || skill.name} สร้าง ${skill.dmg} ดาเมจใส่ ${monster.name}! (HP เหลือ ${newHp})`);
      emitDamageDealt({ targetIndex: playerIndex, amount: skill.dmg, type: "skill_monster", sourceId: skillId });
      if (newHp <= 0) {
        log.push(`💥 ${monster.name} ถูกกำจัดด้วยคาถา!`);
        combat.monsterDied = true;
        emitMonsterKilled({ cell: monster.cell, skillId });
      }
      combat.monster = monster;
      let revealedMonsters = newState.revealedMonsters || {};
      let monsterMap = newState.monsterMap || {};
      if (monster.cell != null) {
        revealedMonsters = { ...revealedMonsters, [monster.cell]: monster };
        monsterMap = { ...monsterMap, [monster.cell]: monster };
      }
      newState = { ...newState, combatState: combat, revealedMonsters, monsterMap };
    } else {
      player.tempDmgBonus = (player.tempDmgBonus || 0) + skill.dmg;
      player.tempDmgTurns = (player.tempDmgTurns || 0) + 2;
      log.push(`⚡ ร่าย ${skill.nameTh || skill.name}! บัฟพลังโจมตี +${skill.dmg} DMG สำหรับการต่อสู้ถัดไป!`);
      emitBuffGained({ targetIndex: playerIndex, buffId: "temp_dmg", duration: player.tempDmgTurns, amount: skill.dmg });
    }
  }

  // Handle damage skills (player target) — requiresTarget:"player" ensures targetIndex is set
  if (skill.dmg && skill.target === "player") {
    const tIdx = targetIndex;

    if (
      tIdx !== null &&
      tIdx !== playerIndex &&
      typeof tIdx === "number" &&
      tIdx >= 0 &&
      tIdx < players.length &&
      players[tIdx]
    ) {
      const target = { ...players[tIdx] };
      if (!target.isInvincible) {
        target.hp = Math.max(0, target.hp - skill.dmg);
        log.push(`🔥 ${skill.nameTh || skill.name} ปล่อยพลังสร้าง ${skill.dmg} ดาเมจใส่ ${target.name}! (HP เหลือ ${target.hp})`);
        emitDamageDealt({ targetIndex: tIdx, amount: skill.dmg, type: "skill_player", sourceId: skillId });
        if (target.hp <= 0) {
          target.hp = 0;
          target.isAlive = false;
          log.push(`💀 ${target.name} ถูกสังหารด้วยคาถาฟีนิกซ์!`);
          emitPlayerDied({ playerIndex: tIdx, cause: "skill" });
        }
      } else {
        log.push(`🛡️ ${target.name} อยู่ในสถานะอมตะ! ป้องกันความเสียหายจาก ${skill.nameTh || skill.name} ได้ทั้งหมด!`);
      }
      players[tIdx] = target;
    } else {
      log.push(`🔥 ร่าย ${skill.nameTh || skill.name} แต่ไม่มีเป้าหมายผู้เล่นให้โจมตี!`);
    }
  }

  // Emit skill_cast event ท้ายฟังก์ชัน (เอาทั้ง newState, players, player ที่อัปเดตแล้ว)
  players[playerIndex] = player;
  emitSkillCast({ playerId: playerIndex, skillId, targetIndex, skillData: skill });

  return { ...newState, players, log: [...state.log, ...log] };
}

// ─── Tick Cooldowns ───────────────────────────────────────────
export function tickCooldowns(state) {
  const players = state.players.map((p) => {
    const cds = { ...p.skillCooldowns };
    Object.keys(cds).forEach((k) => {
      cds[k] = Math.max(0, cds[k] - 1);
    });
    let invTurns = p.invincibleTurns;
    let isInv = p.isInvincible;
    if (invTurns > 0) {
      invTurns -= 1;
      if (invTurns <= 0) isInv = false;
    }
    let tempDmgTurns = p.tempDmgTurns;
    let tempDmgBonus = p.tempDmgBonus;
    if (tempDmgTurns > 0) {
      tempDmgTurns -= 1;
      if (tempDmgTurns <= 0) tempDmgBonus = 0;
    }
    return { ...p, skillCooldowns: cds, invincibleTurns: invTurns, isInvincible: isInv, tempDmgBonus, tempDmgTurns };
  });
  return { ...state, players };
}

// Tick cooldowns for a single player only (their own turn starting).
export function tickPlayerCooldowns(state, playerIndex) {
  const players = state.players.map((p, i) => {
    if (i !== playerIndex) return p;
    const cds = { ...p.skillCooldowns };
    Object.keys(cds).forEach((k) => {
      cds[k] = Math.max(0, cds[k] - 1);
    });
    let invTurns = p.invincibleTurns;
    let isInv = p.isInvincible;
    if (invTurns > 0) {
      invTurns -= 1;
      if (invTurns <= 0) isInv = false;
    }
    let tempDmgTurns = p.tempDmgTurns;
    let tempDmgBonus = p.tempDmgBonus;
    if (tempDmgTurns > 0) {
      tempDmgTurns -= 1;
      if (tempDmgTurns <= 0) tempDmgBonus = 0;
    }
    return { ...p, skillCooldowns: cds, invincibleTurns: invTurns, isInvincible: isInv, tempDmgBonus, tempDmgTurns };
  });
  const stateAfterPlayers = { ...state, players };
  return stateAfterPlayers;
}

// ─── NPC Mechanics ───────────────────────────────────────────
export function findAvailableNpcCell(state, npcId = null) {
  // Prefer the generated board stored in state. Falling back to MONSTER_MAP
  // here makes cells 2..10 look occupied by the old static layout even after
  // the randomizer deliberately reserves them for the opening NPCs.
  const hasMonster = (cell) => {
    if (state.monsterCells instanceof Set || state.monsterMap) {
      return state.monsterCells?.has(cell) || state.monsterMap?.[cell];
    }
    return MONSTER_MAP[cell];
  };
  const trapCells = state.trapCells || {};
  const cellTeleport = state.cellTeleport || CELL_TELEPORT;

  const npcOccupied = new Set();
  if (state.npcs) {
    Object.values(state.npcs).forEach((npc) => {
      if (npc && npc.isSpawned && npc.cell != null) {
        npcOccupied.add(npc.cell);
      }
    });
  }

  // Spawn NPCs relative to the player whose turn is active. Using the
  // slowest/fastest player positions makes the zone too wide when players are
  // spread across the board, so an NPC can appear far from everyone.
  const players = state.players || [];
  const activePlayer = players[state.currentPlayerIndex] || players.find((p) => p?.isAlive);
  const activePos = activePlayer?.position || 1;
  const spawnDistance = npcId === "merchant" ? { min: 2, max: 4 } : { min: 2, max: 6 };
  const minZoneCell = Math.max(2, activePos + spawnDistance.min);
  const maxZoneCell = Math.min(89, activePos + spawnDistance.max);

  const candidateCells = [];
  const nearbyFallbackCells = [];
  const fallbackCells = [];

  const isSafeCell = (cell) => {
    if (cell === 1 || cell === 90) return false;
    if (hasMonster(cell)) return false;
    if (cellTeleport[cell]) return false;
    if (trapCells[cell]) return false;
    if (npcOccupied.has(cell)) return false;
    return true;
  };

  for (let cell = 2; cell <= 89; cell++) {
    if (!isSafeCell(cell)) continue;

    fallbackCells.push(cell);
    if (cell >= minZoneCell && cell <= maxZoneCell) {
      candidateCells.push(cell);
    }
    if (cell >= Math.max(2, activePos + 1) && cell <= Math.min(89, activePos + 10)) {
      nearbyFallbackCells.push(cell);
    }
  }

  // Prefer the intended spawn zone, then the nearest forward section. This
  // avoids the old behavior where a blocked local zone caused a random spawn
  // anywhere on the board.
  const pool = candidateCells.length > 0
    ? candidateCells
    : nearbyFallbackCells.length > 0
      ? nearbyFallbackCells
      : fallbackCells;
  if (pool.length === 0) {
    const safeCells = [];
    for (let c = 2; c <= 89; c++) {
      if (isSafeCell(c)) {
        safeCells.push(c);
      }
    }
    return safeCells.length > 0 ? safeCells[Math.floor(Math.random() * safeCells.length)] : 5;
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

export function spawnNpc(state, npcId) {
  const npcInfo = NPCS[npcId];
  if (!npcInfo) return state;

  const targetCell = findAvailableNpcCell(state, npcId);
  const updatedNpcs = {
    ...(state.npcs || {}),
    [npcId]: {
      id: npcId,
      cell: targetCell,
      isSpawned: true,
      cooldown: 0,
      idleSeconds: 0,
    },
  };

  const spawnMsg = `📢 [NPC SPAWN] ${npcInfo.name} ${npcInfo.emoji} ได้ปรากฏตัวขึ้นที่ช่อง ${targetCell}! (${npcInfo.description})`;
  const marquee = [...(state.marqueeAnnouncements || []), spawnMsg];
  const log = [...(state.log || []), spawnMsg];

  return {
    ...state,
    npcs: updatedNpcs,
    marqueeAnnouncements: marquee,
    log,
  };
}

export function spawnAllNpcs(state) {
  let newState = { ...state };
  Object.keys(NPCS).forEach((npcId) => {
    newState = spawnNpc(newState, npcId);
  });
  return newState;
}

export function despawnNpc(state, npcId) {
  const npcs = { ...(state.npcs || {}) };
  if (npcs[npcId]) {
    const cd = NPCS[npcId]?.cooldownSeconds ?? (NPC_CONFIG.SPAWN_COOLDOWN_SECONDS || 90);
    npcs[npcId] = {
      ...npcs[npcId],
      isSpawned: false,
      cell: null,
      cooldown: cd,
      idleSeconds: 0,
    };
  }
  return { ...state, npcs };
}

export function tickNpcCooldowns(state, deltaSeconds = 1) {
  let newState = { ...state };
  let npcs = { ...(newState.npcs || {}) };
  let changed = false;

  // Special Roaming Merchant check: if merchant is spawned, track idleSeconds & relocate if passed or idle >= 180s (3 minutes)
  const merchant = npcs["merchant"];
  if (merchant && merchant.isSpawned && merchant.cell != null) {
    const currentIdle = (merchant.idleSeconds || 0) + deltaSeconds;
    const livingPlayers = (state.players || []).filter((p) => p.isAlive);
    const minPos = livingPlayers.length > 0 ? Math.min(...livingPlayers.map((p) => p.position || 0)) : 0;

    // Auto relocate merchant ONLY if ALL players have walked past his cell, OR if merchant has been standing idle for >= 180 seconds
    if (minPos > merchant.cell || currentIdle >= 180) {
      newState = despawnNpc(newState, "merchant");
      npcs = { ...(newState.npcs || {}) };
      if (npcs["merchant"]) {
        npcs["merchant"].cooldown = 0; // Force immediate respawn ahead of players!
      }
      changed = true;
    } else {
      npcs["merchant"] = { ...merchant, idleSeconds: currentIdle };
      changed = true;
    }
  }

  Object.keys(NPCS).forEach((npcId) => {
    const npc = npcs[npcId];
    if (!npc) return;

    if (!npc.isSpawned) {
      const currentCd = npc.cooldown ?? 0;
      if (currentCd <= 0) {
        newState = spawnNpc({ ...newState, npcs }, npcId);
        npcs = { ...(newState.npcs || {}) };
        changed = true;
      } else {
        const newCd = Math.max(0, currentCd - deltaSeconds);
        npcs[npcId] = { ...npc, cooldown: newCd };
        changed = true;
        if (newCd <= 0) {
          newState = spawnNpc({ ...newState, npcs }, npcId);
          npcs = { ...(newState.npcs || {}) };
        }
      }
    }
  });

  if (changed) {
    newState.npcs = { ...(newState.npcs || {}), ...npcs };
  }
  return newState;
}

export function handleNpcLanding(state, playerIndex, npcId) {
  const player = state.players[playerIndex];
  const npcInfo = NPCS[npcId];
  if (!player || !npcInfo) return { state, action: null };

  const spawnedNpc = state.npcs?.[npcId];
  let log = [...state.log];
  let marquee = [...(state.marqueeAnnouncements || [])];

  if (npcId === "doctor") {
    const availablePotions = POTION_LIST.filter((p) => !p.isTrap);
    const granted = [];
    let currentPotions = Array.isArray(player.potions) ? [...player.potions] : [];
    let updatedPlayer = { ...player };

    for (let i = 0; i < NPC_CONFIG.DOCTOR_POTION_COUNT; i++) {
      if (currentPotions.length < MAX_POTIONS) {
        const randPot = availablePotions[Math.floor(Math.random() * availablePotions.length)];
        currentPotions.push(randPot.id);
        granted.push(randPot);
      } else {
        // Inventory Full (5/5)! Grant a random potion buff directly to player!
        const buffTypes = ["heal", "cooldown", "damage", "gold"];
        const chosenBuff = buffTypes[Math.floor(Math.random() * buffTypes.length)];

        if (chosenBuff === "heal") {
          updatedPlayer.hp = Math.min(updatedPlayer.maxHp, updatedPlayer.hp + 30);
          emitHeal({ targetIndex: playerIndex, amount: 30 });
          granted.push({
            id: "buff_heal",
            isBuff: true,
            name: "✨ บัฟฟื้นฟูเลือด (+30 HP)",
            description: "กระเป๋ายาเต็ม! หมอยาจึงร่ายพลังฟื้นฟูเลือด +30 HP ใส่ตัวทันที!",
            image: "/images/items/potions/potion_special_buff.webp",
            icon: "💖",
          });
        } else if (chosenBuff === "cooldown") {
          const cds = { ...(updatedPlayer.skillCooldowns || {}) };
          Object.keys(cds).forEach((k) => {
            cds[k] = Math.max(0, (cds[k] || 0) - 2);
          });
          updatedPlayer.skillCooldowns = cds;
          granted.push({
            id: "buff_cooldown",
            isBuff: true,
            name: "⏱️ บัฟเร่งคูลดาวน์ (-2 เทิร์น)",
            description: "กระเป๋ายาเต็ม! หมอยาจึงร่ายเวทลดคูลดาวน์สกิลทั้งหมด -2 เทิร์นทันที!",
            image: "/images/items/potions/potion_cooldown.webp",
            icon: "⚡",
          });
        } else if (chosenBuff === "damage") {
          updatedPlayer.tempDmgBonus = (updatedPlayer.tempDmgBonus || 0) + 100;
          updatedPlayer.tempDmgTurns = (updatedPlayer.tempDmgTurns || 0) + 1;
          emitBuffGained({ targetIndex: playerIndex, buffId: "temp_dmg", duration: 1, amount: 100 });
          granted.push({
            id: "buff_damage",
            isBuff: true,
            name: "🔥 บัฟพลังโจมตี (+100 DMG)",
            description: "กระเป๋ายาเต็ม! หมอยาจึงเพิ่มพลังโจมตี +100 DMG (1 เทิร์น) ใส่ตัวทันที!",
            image: "/images/items/potions/potion_special_buff.webp",
            icon: "⚔️",
          });
        } else {
          updatedPlayer.gold = (updatedPlayer.gold || 0) + 500;
          emitGoldGain({ targetIndex: playerIndex, amount: 500 });
          granted.push({
            id: "buff_gold",
            isBuff: true,
            name: "💰 สกัดยาเป็นเงินทอง (+500 Gold)",
            description: "กระเป๋ายาเต็ม! หมอยาจึงแปรธาตุขวดยาเป็นเงิน +500 Gold มอบให้ทันที!",
            image: "/images/items/potions/potion_revive.webp",
            icon: "💰",
          });
        }
      }
    }

    updatedPlayer.potions = currentPotions;
    const updatedPlayers = [...state.players];
    updatedPlayers[playerIndex] = updatedPlayer;

    const grantedNames = granted.map((g) => g.name).join(", ");
    const msg = `🧪 ${updatedPlayer.name} ตกช่อง NPC หมอยา! ได้รับของรางวัล 2 รายการ: ${grantedNames}`;
    log.push(msg);
    marquee.push(`📢 ${updatedPlayer.name} ได้รับของรางวัลจาก NPC หมอยา!`);

    let newState = despawnNpc({ ...state, players: updatedPlayers, log, marqueeAnnouncements: marquee }, npcId);
    return { state: newState, action: "doctor_granted", grantedPotions: granted };
  }

  if (npcId === "skill_trainer") {
    const currentSkills = Array.isArray(player.skills) ? player.skills : [];
    if (currentSkills.length < MAX_SKILLS_PER_HOUSE) {
      const ownedIds = new Set(
        currentSkills.map((s) => (typeof s === "string" ? s : s?.id)).filter(Boolean)
      );
      const unownedSkills = SKILL_LIST.filter((s) => !ownedIds.has(s.id));
      const grantedSkill =
        unownedSkills.length > 0
          ? unownedSkills[Math.floor(Math.random() * unownedSkills.length)]
          : SKILL_LIST[0];

      const updatedSkills = [
        ...currentSkills.map((s) => (typeof s === "string" ? s : s?.id)),
        grantedSkill.id,
      ];
      const updatedPlayer = { ...player, skills: updatedSkills };
      const updatedPlayers = [...state.players];
      updatedPlayers[playerIndex] = updatedPlayer;

      const skillName = grantedSkill.nameTh || grantedSkill.name;
      log.push(
        `🧙‍♂️ ${player.name} ตกช่อง NPC ผู้ฝึกสกิล! ได้รับสกิลใหม่ "${skillName}" (ช่อง 2/2) ฟรี!`
      );
      marquee.push(`📢 ${player.name} ได้รับสกิล "${skillName}" จาก NPC ผู้ฝึก Skill!`);

      let newState = despawnNpc(
        { ...state, players: updatedPlayers, log, marqueeAnnouncements: marquee },
        npcId
      );
      return { state: newState, action: "skill_granted", grantedSkill };
    }

    return { state, action: "open_skill_modal" };
  }

  if (npcId === "pet_trainer") {
    if (!player.pet) {
      const grantedPet = PET_LIST[Math.floor(Math.random() * PET_LIST.length)];
      const updatedPlayer = { ...player, pet: grantedPet };
      const updatedPlayers = [...state.players];
      updatedPlayers[playerIndex] = updatedPlayer;

      log.push(
        `🐾 ${player.name} ตกช่อง NPC ผู้ฝึกสัตว์! ได้รับสัตว์เลี้ยง "${grantedPet.name}" ฟรี! ${
          grantedPet.emoji || "🐾"
        }`
      );
      marquee.push(
        `📢 ${player.name} ได้รับสัตว์เลี้ยงตัวแรก "${grantedPet.name}" จาก NPC ผู้ฝึกสัตว์!`
      );

      let newState = despawnNpc(
        { ...state, players: updatedPlayers, log, marqueeAnnouncements: marquee },
        npcId
      );
      return { state: newState, action: "pet_granted", grantedPet };
    }

    return { state, action: "open_pet_modal" };
  }

  if (npcId === "merchant") {
    const cellText = spawnedNpc?.cell != null ? ` (ช่อง ${spawnedNpc.cell})` : "";
    const msg = `🏪 ${player.name} เดินตกช่องพ่อค้าลึกลับ${cellText}! เปิดหน้าร้านค้าฮอกปด`;
    log.push(msg);
    marquee.push(`📢 ${player.name} พบพ่อค้าลึกลับ${cellText} เปิดหน้าร้านค้า!`);

    let newState = despawnNpc({ ...state, shopOpen: true, log, marqueeAnnouncements: marquee }, npcId);
    if (newState.npcs?.merchant) {
      newState.npcs.merchant.cooldown = 0;
      newState = spawnNpc(newState, "merchant");
    }
    return {
      state: newState,
      action: "merchant_shop",
    };
  }

  return { state, action: null };
}

export function swapPlayerSkill(state, playerIndex, oldSkillId, newSkill) {
  const player = state.players[playerIndex];
  if (!player) return state;

  const targetId = typeof newSkill === "string" ? newSkill : newSkill?.id;
  const currentSkills = Array.isArray(player.skills) ? [...player.skills] : [];
  let newSkills;
  let isNewSlot = false;

  if (currentSkills.length < 2 && !oldSkillId) {
    newSkills = [...currentSkills.map((s) => (typeof s === "string" ? s : s?.id)), targetId];
    isNewSlot = true;
  } else {
    newSkills = currentSkills.map((s) => {
      const sId = typeof s === "string" ? s : s?.id;
      return sId === oldSkillId ? targetId : sId;
    });
  }

  const updatedPlayers = [...state.players];
  updatedPlayers[playerIndex] = { ...player, skills: newSkills };

  const skillInfo = SKILLS[targetId] || (typeof newSkill === "object" ? newSkill : null);
  const skillName = skillInfo?.nameTh || skillInfo?.name || targetId;

  const log = [
    ...state.log,
    isNewSlot
      ? `🧙‍♂️ ${player.name} ตกช่องผู้ฝึกสกิล! ได้รับสกิลใหม่ "${skillName}" (ช่อง 2/2) ฟรี!`
      : `🧙‍♂️ ${player.name} สลับสกิลเป็น "${skillName}" เรียบร้อยแล้ว!`,
  ];
  const marquee = [
    ...(state.marqueeAnnouncements || []),
    `📢 ${player.name} ${isNewSlot ? "ได้รับสกิลใหม่" : "เปลี่ยนสกิลเป็น"} "${skillName}" กับ NPC ผู้ฝึก Skill`,
  ];

  let newState = despawnNpc({ ...state, players: updatedPlayers, log, marqueeAnnouncements: marquee, skillModalPlayer: null }, "skill_trainer");
  return advanceTurn(newState);
}

export function changePlayerPet(state, playerIndex, newPet) {
  const player = state.players[playerIndex];
  if (!player) return state;

  const isFirstPet = !player.pet;
  const fee = isFirstPet ? 0 : NPC_CONFIG.PET_CHANGE_FEE;
  if (!isFirstPet && player.gold < fee) {
    return state;
  }

  const updatedPlayers = [...state.players];
  updatedPlayers[playerIndex] = {
    ...player,
    gold: isFirstPet ? player.gold : player.gold - fee,
    pet: newPet,
  };

  const log = [
    ...state.log,
    isFirstPet
      ? `🐾 ${player.name} ตกช่องผู้ฝึกสัตว์! ได้รับสัตว์เลี้ยง "${newPet.name}" ฟรี! ${newPet.emoji || "🐾"}`
      : `🐾 ${player.name} จ่าย ${fee} Gold เปลี่ยนสัตว์เลี้ยงเป็น "${newPet.name}" ${newPet.emoji || "🐾"}`,
  ];
  const marquee = [
    ...(state.marqueeAnnouncements || []),
    `📢 ${player.name} ${isFirstPet ? "ได้รับสัตว์เลี้ยงตัวแรก" : "เปลี่ยนสัตว์เลี้ยงเป็น"} "${newPet.name}" กับ NPC ผู้ฝึกสัตว์`,
  ];

  let newState = despawnNpc({ ...state, players: updatedPlayers, log, marqueeAnnouncements: marquee, petModalPlayer: null }, "pet_trainer");
  return advanceTurn(newState);
}

// ─── Potion Use ───────────────────────────────────────────────
export function usePotion(state, playerIndex, potionId, targetCell) {
  const players = [...state.players];
  const player = { ...players[playerIndex] };
  const log = [];
  let newTrapCells = null;

  const idx = player.potions.indexOf(potionId);
  if (idx === -1) return state;

  // Revive เป็นยาพิเศษ — สามารถกดใช้ได้เมื่อเสียชีวิต (HP <= 0 หรือ isAlive === false)
  if (potionId === "revive") {
    if (player.hp > 0 && player.isAlive) {
      return {
        ...state,
        log: [...state.log, `ℹ️ ${player.name} พลังชีวิตยังไม่หมด ไม่จำเป็นต้องใช้ยาชุบชีวิต`],
      };
    }
    const potions = [...player.potions];
    potions.splice(idx, 1);
    player.potions = potions;
    player.hp = Math.min(player.maxHp, 50);
    player.isAlive = true;
    log.push(`✨ 💊 ${player.name} ใช้ยาชุบชีวิต! คืนชีพสำเร็จด้วยพลังชีวิต ${player.hp} HP`);
    emitHeal({ targetIndex: playerIndex, amount: 50 });
    players[playerIndex] = player;
    return {
      ...state,
      players,
      log: [...state.log, ...log],
    };
  }

  // ยาพิษ — validate ก่อนหักยา: ต้องเลือกช่อง (2-89) และช่องต้องยังไม่มีกับดัก
  if (potionId === "poison") {
    if (targetCell == null) {
      return {
        ...state,
        log: [...state.log, `ℹ️ ${player.name} ต้องเลือกช่องก่อนวางกับดักยาพิษ`],
      };
    }
    if (targetCell <= 1 || targetCell >= 90) {
      return {
        ...state,
        log: [...state.log, `⚠️ ไม่สามารถวางกับดักยาพิษที่ช่องจุดเริ่มต้น (ช่อง 1) หรือช่องจบเกมได้`],
      };
    }
    if (state.trapCells?.[targetCell]) {
      return {
        ...state,
        log: [...state.log, `⚠️ ไม่สามารถวางกับดักซ้อนทับกับดักเดิมได้ (ช่อง ${targetCell})`],
      };
    }
  }

  const potions = [...player.potions];
  potions.splice(idx, 1);
  player.potions = potions;

  const potion = POTIONS[potionId];
  switch (potionId) {
    case "heal":
      player.hp = Math.min(player.maxHp, player.hp + (potion.healAmount || 30));
      log.push(`🧪 ${player.name} ใช้ยาเพิ่มเลือด +${potion.healAmount} HP`);
      emitHeal({ targetIndex: playerIndex, amount: potion.healAmount || 30 });
      break;
    case "cooldown": {
      const cds = { ...player.skillCooldowns };
      Object.keys(cds).forEach((k) => {
        cds[k] = Math.max(0, cds[k] - (potion.cdReduce || 2));
      });
      player.skillCooldowns = cds;
      log.push(`⏱️ ${player.name} ลดคูลดาวน์สกิลทุกตัว -2 เทิร์น`);
      break;
    }
    case "damage":
      player.tempDmgBonus = (player.tempDmgBonus || 0) + (potion.dmgBonus || 100);
      player.tempDmgTurns = (potion.duration || 1);
      log.push(`⚡ ${player.name} เพิ่มดาเมจ +${potion.dmgBonus} เป็นเวลา 1 เทิร์น`);
      emitBuffGained({ targetIndex: playerIndex, buffId: "temp_dmg", duration: player.tempDmgTurns, amount: potion.dmgBonus || 100 });
      break;
    case "poison": {
      newTrapCells = { ...state.trapCells, [targetCell]: { houseId: player.houseId } };
      log.push(`☠️ ${player.name} วางกับดักยาพิษที่ช่อง ${targetCell}`);
      break;
    }
    default:
      break;
  }

  players[playerIndex] = player;
  const next = { ...state, players, log: [...state.log, ...log] };
  if (newTrapCells) return { ...next, trapCells: newTrapCells };
  return next;
}

// ─── Equipment Helpers ─────────────────────────────────────────
export function equipArmorToPlayer(player, newArmor) {
  // 1. Remove stats of old armor
  if (player.armor) {
    const oldHpBonus = player.armor.hpBonus || 0;
    if (oldHpBonus !== 0) {
      player.maxHp = Math.max(10, player.maxHp - oldHpBonus);
      if (oldHpBonus > 0) {
        player.hp = Math.max(1, player.hp - oldHpBonus);
      }
    }
  }

  // 2. Apply stats of new armor
  player.armor = newArmor;
  if (newArmor) {
    const hpBonus = newArmor.hpBonus || 0;
    if (hpBonus !== 0) {
      player.maxHp = Math.max(10, player.maxHp + hpBonus);
      if (hpBonus > 0) {
        player.hp += hpBonus;
      } else if (hpBonus < 0) {
        player.hp = Math.min(player.hp, player.maxHp);
      }
    }
  }

  // 3. Final safety check on HP bounds
  player.hp = Math.max(1, Math.min(player.hp, player.maxHp));
  return player;
}

export function equipAmuletToPlayer(player, newAmulet) {
  // 1. Remove stats of old amulet
  if (player.amulet) {
    const oldHpBonus = player.amulet.hpBonus || 0;
    if (oldHpBonus !== 0) {
      player.maxHp = Math.max(10, player.maxHp - oldHpBonus);
      if (oldHpBonus > 0) {
        player.hp = Math.max(1, player.hp - oldHpBonus);
      }
    }
  }

  // 2. Apply stats of new amulet
  player.amulet = newAmulet;
  if (newAmulet) {
    const hpBonus = newAmulet.hpBonus || 0;
    if (hpBonus !== 0) {
      player.maxHp = Math.max(10, player.maxHp + hpBonus);
      if (hpBonus > 0) {
        player.hp += hpBonus;
      } else if (hpBonus < 0) {
        player.hp = Math.min(player.hp, player.maxHp);
      }
    }
  }

  // 3. Final safety check on HP bounds
  player.hp = Math.max(1, Math.min(player.hp, player.maxHp));
  return player;
}

// ─── Shop: Buy Item ───────────────────────────────────────────
export function buyItem(state, playerIndex, itemType, itemId) {
  const players = [...state.players];
  let player = { ...players[playerIndex] };
  const log = [];
  let bingoWinModalData = null;

  if (itemType === "wand") {
    const price = itemId === "common" ? 1290 : 2200;
    if (player.gold < price) {
      log.push(`❌ ไม่มีเงินพอซื้อไม้กายสิทธิ์`);
      return { ...state, log: [...state.log, ...log] };
    }
    player.gold -= price;
    const dmgBonus = itemId === "common" ? 20 : 35;
    const houseData = HOUSES[player.houseId] || {};
    const wandName = itemId === "common"
      ? (player.commonWand || houseData.commonWand || "ไม้ทั่วไป")
      : (player.vipWand || houseData.vipWand || "ไม้ VIP");
    player.wand = { type: itemId, name: wandName, dmgBonus };
    log.push(`🪄 ${player.name} ซื้อ "${wandName}" (+${dmgBonus} DMG)`);
  }

  if (itemType === "armor") {
    const price = 800;
    if (player.gold < price) {
      log.push(`❌ ไม่มีเงินพอซื้อเสื้อเกราะ`);
      return { ...state, log: [...state.log, ...log] };
    }
    player.gold -= price;
    const pool = ARMOR_POOL;
    let armor = itemId && itemId !== "random" ? pool.find((a) => a.id === itemId) : null;
    if (!armor) {
      armor = pool[Math.floor(Math.random() * pool.length)];
    }
    equipArmorToPlayer(player, armor);
    log.push(`🛡️ ${player.name} ได้ "${armor.name}" (HP ${armor.hpBonus > 0 ? "+" : ""}${armor.hpBonus || 0}, DMG ${armor.dmgBonus > 0 ? "+" : ""}${armor.dmgBonus || 0})`);
  }

  if (itemType === "amulet") {
    const price = 1000;
    if (player.gold < price) {
      log.push(`❌ ไม่มีเงินพอซื้อเครื่องราง`);
      return { ...state, log: [...state.log, ...log] };
    }
    player.gold -= price;
    const pool = AMULET_POOL;
    let amulet = itemId && itemId !== "random" ? pool.find((a) => a.id === itemId) : null;
    if (!amulet) {
      amulet = pool[Math.floor(Math.random() * pool.length)];
    }
    equipAmuletToPlayer(player, amulet);
    log.push(`📿 ${player.name} ได้เครื่องราง "${amulet.name}" (DMG +${amulet.dmgBonus || 0}, HP ${amulet.hpBonus > 0 ? "+" : ""}${amulet.hpBonus || 0})`);
  }

  if (itemType === "potion") {
    const potion = POTIONS[itemId];
    const currentPots = Array.isArray(player.potions) ? player.potions : [];
    if (!potion || currentPots.length >= MAX_POTIONS) {
      log.push(`❌ ไม่สามารถซื้อยาได้`);
      return { ...state, log: [...state.log, ...log] };
    }
    if (player.gold < potion.price) {
      log.push(`❌ ไม่มีเงินพอซื้อยา`);
      return { ...state, log: [...state.log, ...log] };
    }
    player.gold -= potion.price;
    player.potions = [...currentPots, itemId];
    log.push(`🧪 ${player.name} ซื้อ "${potion.name}"`);
  }

  if (itemType === "skill") {
    const skill = SKILLS[itemId];
    const currentSkills = Array.isArray(player.skills) ? player.skills : [];
    if (!skill || currentSkills.length >= 2) {
      log.push(`❌ ไม่สามารถติดตั้งสกิลได้`);
      return { ...state, log: [...state.log, ...log] };
    }
    if (player.gold < SKILL_PRICE) {
      log.push(`❌ ไม่มีเงินพอซื้อสกิล`);
      return { ...state, log: [...state.log, ...log] };
    }
    player.gold -= SKILL_PRICE;
    player.skills = [...currentSkills, itemId];
    log.push(`✨ ${player.name} เรียนสกิล "${skill.name}"`);
  }

  if (itemType === "pet") {
    const pet = PETS[itemId];
    if (!pet) return state;
    if (player.gold < pet.price) {
      log.push(`❌ ไม่มีเงินพอซื้อสัตว์วิเศษ`);
      return { ...state, log: [...state.log, ...log] };
    }
    player.gold -= pet.price;
    player.pet = pet;
    log.push(`🐾 ${player.name} ได้สัตว์วิเศษ "${pet.name}"`);
  }

  if (itemType === "bingo") {
    const price = BINGO_PRICE || 500;
    if (player.hasBingoCard) {
      log.push(`❌ ${player.name} มีป้าย Bingo อยู่แล้ว`);
      return { ...state, log: [...state.log, ...log] };
    }
    if (player.gold < price) {
      log.push(`❌ ไม่มีเงินพอซื้อป้าย Bingo (ต้องการ ${price} Gold)`);
      return { ...state, log: [...state.log, ...log] };
    }
    player.gold -= price;
    player.hasBingoCard = true;
    player.bingoCard = generateBingoCard();
    const { updatedPlayer, logs: bingoLogs, bingoWin } = checkPlayerBingo(player, player.position);
    player = updatedPlayer;
    if (bingoWin) bingoWinModalData = bingoWin;
    log.push(`🎯 ${player.name} ซื้อ "ป้าย Bingo" สำเร็จ! (ปลดล็อกตารางบิงโกที่มุมขวาล่าง)`);
    if (bingoLogs && bingoLogs.length > 0) {
      log.push(...bingoLogs);
    }
  }

  players[playerIndex] = player;
  const nextState = { ...state, players, log: [...state.log, ...log] };
  if (bingoWinModalData) {
    nextState.bingoWinModalData = bingoWinModalData;
  }
  return nextState;
}

// ─── Next Turn ────────────────────────────────────────────────
export function advanceTurn(state) {
  if (state.extraTurn) {
    const nextState = tickPlayerCooldowns({
      ...state,
      extraTurn: false,
      turn: state.turn + 1,
      phase: "play",
      diceResult: null,
      shopOpen: false,
    }, state.currentPlayerIndex);
    return spawnMonsterWave(nextState);
  }

  const numPlayers = state.players?.length || 1;
  let next = (state.currentPlayerIndex + 1) % numPlayers;
  let attempts = 0;
  // If player is explicitly eliminated, skip to next player
  while (state.players?.[next]?.isEliminated && attempts < numPlayers) {
    next = (next + 1) % numPlayers;
    attempts++;
  }

  const newRound = next <= state.currentPlayerIndex ? state.round + 1 : state.round;
  let nextState = tickPlayerCooldowns({
    ...state,
    currentPlayerIndex: next,
    round: newRound,
    turn: state.turn + 1,
    phase: "play",
    diceResult: null,
    shopOpen: false,
  }, next);

  return spawnMonsterWave(nextState);
}

const MONSTER_WAVE_SIZE = 6;
const MONSTER_WAVE_INTERVAL = 3;

function spawnMonsterWave(state) {
  const reserve = state.monsterReserve || [];
  const spawnPhase = state.monsterSpawnPhase || 1;
  const nextWaveRound = 1 + (spawnPhase * MONSTER_WAVE_INTERVAL);

  if (reserve.length === 0 || state.round < nextWaveRound) return state;

  const npcCells = new Set(
    Object.values(state.npcs || {})
      .filter((npc) => npc?.isSpawned && npc.cell != null)
      .map((npc) => npc.cell)
  );
  const wave = reserve
    .filter((monster) => !npcCells.has(monster.cell))
    .slice(0, MONSTER_WAVE_SIZE);

  if (wave.length === 0) return state;

  const waveIds = new Set(wave.map((monster) => monster.id));
  const remainingReserve = reserve.filter((monster) => !waveIds.has(monster.id));
  const monsterCells = new Set(state.monsterCells || []);
  const monsterMap = { ...(state.monsterMap || {}) };

  wave.forEach((monster) => {
    monsterCells.add(monster.cell);
    monsterMap[monster.cell] = monster;
  });

  return {
    ...state,
    monsterCells,
    monsterMap,
    monsterReserve: remainingReserve,
    monsterSpawnPhase: spawnPhase + 1,
    log: [
      ...state.log,
      `🌑 Monster Wave ${spawnPhase + 1} ปรากฏขึ้น! มอนสเตอร์ใหม่ ${wave.length} ตัวเข้ามาในกระดาน`,
    ],
  };
}

// ─── Check Win Condition ──────────────────────────────────────
export function checkWin(state) {
  // ผู้เล่นต้องเดินถึงช่อง 90 และต้องกำจัดบอสมหาเวทย์ (Grand Boss) ที่ช่อง 90 สำเร็จแล้วเท่านั้น
  const winner = state.players.find((p) => p.position >= WIN_CELL && p.isAlive && !state.monsterCells?.has(90));
  if (winner) {
    return { ...state, phase: "gameover", winner };
  }
  return state;
}

// ─── Persistence (localStorage) ──────────────────────────────
const STORAGE_KEY = "pod_board_game_save_v1";

export function saveGameState(state) {
  if (typeof window === "undefined" || !state) return;
  try {
    const serializable = {
      ...state,
      monsterCells: Array.from(state.monsterCells || []),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
  } catch (err) {
    console.error("Error saving game state:", err);
  }
}

export function loadGameState() {
  if (typeof window === "undefined") return null;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;
    let parsed = JSON.parse(saved);
    if (!parsed || !parsed.players || !Array.isArray(parsed.players)) return null;

    // Reconstruct Set object for monsterCells
    parsed.monsterCells = new Set(parsed.monsterCells || []);

    // Migrate/sync player wand image paths with HOUSES definition
    if (parsed.players && Array.isArray(parsed.players)) {
      parsed.players = parsed.players.map((p) => {
        const houseInfo = HOUSES[p.houseId] || {};
        return {
          ...p,
          commonWandImg: houseInfo.commonWandImg || p.commonWandImg,
          vipWandImg: houseInfo.vipWandImg || p.vipWandImg,
        };
      });
    }

    // Ensure autoGoldAmount defaults to 90 and interval to 10
    if (parsed.autoGoldAmount === 20 || parsed.autoGoldAmount === 10 || parsed.autoGoldAmount === 15 || parsed.autoGoldAmount === undefined) {
      parsed.autoGoldAmount = 90;
      parsed.autoGoldInterval = 10;
    }

    if (parsed.npcs) {
      if (!parsed.npcs.merchant) {
        parsed.npcs.merchant = { id: "merchant", cell: null, isSpawned: false, cooldown: 0 };
      }
    }

    // Migrate opening saves created before the safe start corridor existed.
    // Those saves may contain old monster/NPC positions that make the first
    // turns unnecessarily difficult.
    const maxPlayerPosition = Math.max(...parsed.players.map((p) => p.position || 1));
    if (maxPlayerPosition <= 10 && parsed.npcs) {
      const openingCells = new Set(Array.from({ length: 9 }, (_, index) => index + 2));
      const monsterCells = new Set(parsed.monsterCells || []);
      const monsterMap = { ...(parsed.monsterMap || {}) };
      const cellTeleport = { ...(parsed.cellTeleport || {}) };

      openingCells.forEach((cell) => {
        monsterCells.delete(cell);
        delete monsterMap[cell];
        delete cellTeleport[cell];
      });

      parsed = {
        ...parsed,
        monsterCells,
        monsterMap,
        cellTeleport,
        npcs: Object.fromEntries(
          Object.entries(parsed.npcs).map(([npcId, npc]) => [
            npcId,
            npc?.isSpawned && npc.cell > 10
              ? { ...npc, cell: null, isSpawned: false, cooldown: 0 }
              : npc,
          ])
        ),
      };
      parsed = spawnAllNpcs(parsed);
    }

    // Repair legacy saves created before NPC/monster cell separation was
    // enforced. Move only the overlapping NPCs; preserve all other progress.
    const overlappingNpcIds = Object.entries(parsed.npcs || {})
      .filter(([, npc]) => npc?.isSpawned && parsed.monsterCells.has(npc.cell))
      .map(([npcId]) => npcId);
    if (overlappingNpcIds.length > 0) {
      const npcs = { ...parsed.npcs };
      overlappingNpcIds.forEach((npcId) => {
        npcs[npcId] = { ...npcs[npcId], cell: null, isSpawned: false, cooldown: 0 };
      });
      parsed = spawnAllNpcs({ ...parsed, npcs });
    }

    // Clean up transitional states if reloaded mid-animation or mid-modal
    if (parsed.phase === "combat" && !parsed.combatState) {
      parsed.phase = "play";
    }

    return parsed;
  } catch (err) {
    console.error("Error loading game state:", err);
    return null;
  }
}

export function clearSavedGameState() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error("Error clearing saved game state:", err);
  }
}
