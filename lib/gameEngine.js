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
    autoGoldAmount: 10,      // +10 Gold ต่อ 3 วินาที
    autoGoldInterval: 3,     // เพิ่มเงินทุกๆ 3 วินาที
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
  let rolled;
  if (typeof window !== "undefined" && window.crypto && window.crypto.getRandomValues) {
    const array = new Uint32Array(1);
    let val;
    do {
      window.crypto.getRandomValues(array);
      val = array[0];
    } while (val >= 4294967292); // Rejection sampling for perfect 1-6 distribution
    rolled = (val % sides) + 1;
  } else {
    rolled = Math.floor(Math.random() * sides) + 1;
  }

  // ป้องกันการออกแต้มซ้ำติดกันกับผู้เล่นคนก่อนหน้าบ่อยเกินไป (Anti-consecutive repeat filter)
  if (rolled === lastRolledDiceValue && Math.random() < 0.65) {
    if (typeof window !== "undefined" && window.crypto && window.crypto.getRandomValues) {
      const array = new Uint32Array(1);
      window.crypto.getRandomValues(array);
      rolled = (array[0] % sides) + 1;
    } else {
      rolled = Math.floor(Math.random() * sides) + 1;
    }
  }

  lastRolledDiceValue = rolled;
  return rolled;
}

// ─── Movement ─────────────────────────────────────────────────
export function movePlayer(state, playerIndex, steps) {
  const log = [];
  const players = [...state.players];
  const player = { ...players[playerIndex] };
  let usedLadders = [...(state.usedLadders || [])];

  let newPos = player.position + steps;
  if (newPos > BOARD_SIZE) newPos = BOARD_SIZE;

  log.push(`🎲 ${player.name} เดิน ${steps} ก้าว → ช่อง ${newPos}`);

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

export function resolveOneTurnCombat(state, combatResult) {
  const { outcome, spunDmg, spunHp } = combatResult;
  const combat = { ...state.combatState };
  const players = [...state.players];
  const player = { ...players[combat.playerIndex] };
  const playerDmg = getTotalDmg(player);

  const initialMonsterHp = typeof combat.monster.currentHp === "number"
    ? combat.monster.currentHp
    : (combat.monster.hp || 50);

  const roundLog = [];
  combat.round += 1;

  const isWinClash = outcome === "win" || playerDmg >= (spunHp || initialMonsterHp);

  if (isWinClash) {
    // ผู้เล่นชนะการปะทะวงล้อ: สร้างดาเมจเต็มที่ใส่มอนสเตอร์ และไม่โดนดาเมจสวนกลับ
    const damageToMonster = playerDmg;
    const newMonsterHp = Math.max(0, initialMonsterHp - damageToMonster);

    const monster = {
      ...combat.monster,
      dmg: spunDmg || combat.monster.dmg,
      currentHp: newMonsterHp,
    };

    combat.resolved = true;

    if (newMonsterHp <= 0) {
      combat.monsterDied = true;
      roundLog.push(`⚔️ ${player.name} (พลังโจมตี ${playerDmg}) สร้าง ${damageToMonster} ดาเมจ ปราบ ${monster.name} สำเร็จ!`);
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
    // ผู้เล่นแพ้การปะทะวงล้อ: สร้างดาเมจได้บางส่วน และโดนดาเมจสวนกลับจากมอนสเตอร์
    const damageToMonster = Math.max(1, Math.round(playerDmg * 0.5));
    const newMonsterHp = Math.max(0, initialMonsterHp - damageToMonster);
    const monsterAttack = spunDmg || combat.monster.dmg;

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
  const reviveIdx = player.potions.indexOf("revive");
  if (reviveIdx !== -1) {
    const potions = [...player.potions];
    potions.splice(reviveIdx, 1);
    player.potions = potions;
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
      const positions = players.map((p) => p.position);
      for (let i = positions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [positions[i], positions[j]] = [positions[j], positions[i]];
      }
      players.forEach((p, i) => {
        players[i] = { ...p, position: positions[i] };
      });
      player.position = players[playerIndex].position;
      log.push(`🌀 โคราชเคอส! สลับตำแหน่งผู้เล่นทุกคนบนกระดานแบบสุ่มเรียบร้อยแล้ว!`);
      break;
    }

    case "steal_potion": {
      // Steal from the chosen target (requiresTarget:"player" guarantees targetIndex set)
      let tIdx = targetIndex;

      if (tIdx !== null && tIdx !== playerIndex && players[tIdx]?.potions?.length > 0) {
        const target = { ...players[tIdx] };
        const randIdx = Math.floor(Math.random() * target.potions.length);
        const stolenPotion = target.potions[randIdx];
        target.potions = target.potions.filter((_, i) => i !== randIdx);

        if (player.potions.length < MAX_POTIONS) {
          player.potions = [...player.potions, stolenPotion];
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
      monster.currentHp -= skill.dmg;
      log.push(`⚡ ${skill.nameTh || skill.name} สร้าง ${skill.dmg} ดาเมจใส่ ${monster.name}! (HP เหลือ ${Math.max(0, monster.currentHp)})`);
      emitDamageDealt({ targetIndex: playerIndex, amount: skill.dmg, type: "skill_monster", sourceId: skillId });
      if (monster.currentHp <= 0) {
        monster.currentHp = 0;
        log.push(`💥 ${monster.name} ถูกกำจัดด้วยคาถา!`);
        combat.resolved = true;
        combat.monsterDied = true;
        emitMonsterKilled({ cell: monster.cell, skillId });
      }
      combat.monster = monster;
      let revealedMonsters = newState.revealedMonsters || {};
      let monsterMap = newState.monsterMap || {};
      if (monster.cell != null) {
        if (monster.currentHp > 0) {
          revealedMonsters = { ...revealedMonsters, [monster.cell]: monster };
          monsterMap = { ...monsterMap, [monster.cell]: monster };
        } else {
          const monsterCells = new Set(newState.monsterCells);
          monsterCells.delete(monster.cell);
          revealedMonsters = { ...revealedMonsters };
          delete revealedMonsters[monster.cell];
          monsterMap = { ...monsterMap };
          delete monsterMap[monster.cell];
          newState = { ...newState, monsterCells };
        }
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

    if (tIdx !== null && tIdx !== playerIndex) {
      const target = { ...players[tIdx] };
      if (!target.isInvincible) {
        target.hp -= skill.dmg;
        log.push(`🔥 ${skill.nameTh || skill.name} ปล่อยพลังสร้าง ${skill.dmg} ดาเมจใส่ ${target.name}! (HP เหลือ ${Math.max(0, target.hp)})`);
        emitDamageDealt({ targetIndex: tIdx, amount: skill.dmg, type: "skill_player", sourceId: skillId });
        if (target.hp <= 0) {
          target.hp = 0;
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
  const hasMonster = (cell) => state.monsterCells?.has(cell) || state.monsterMap?.[cell] || MONSTER_MAP[cell];
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
  // slowest/fastest player positions made the old zone too wide when players
  // were spread across the board, so an NPC could appear far from everyone.
  const players = state.players || [];
  const activePlayer = players[state.currentPlayerIndex] || players.find((p) => p?.isAlive);
  const activePos = activePlayer?.position || 1;
  const spawnDistance = npcId === "merchant" ? { min: 3, max: 8 } : { min: 2, max: 6 };
  const minZoneCell = Math.max(2, activePos + spawnDistance.min);
  const maxZoneCell = Math.min(89, activePos + spawnDistance.max);

  const candidateCells = [];
  const fallbackCells = [];

  for (let cell = 2; cell <= 89; cell++) {
    if (cell === 1 || cell === 90) continue;
    if (hasMonster(cell)) continue;
    if (cellTeleport[cell]) continue;
    if (trapCells[cell]) continue;
    if (npcOccupied.has(cell)) continue;

    fallbackCells.push(cell);
    if (cell >= minZoneCell && cell <= maxZoneCell) {
      candidateCells.push(cell);
    }
  }

  // Prefer candidate cells within player zone; if none, use fallback
  const pool = candidateCells.length > 0 ? candidateCells : fallbackCells;
  if (pool.length === 0) {
    const safeCells = [];
    for (let c = 2; c <= 89; c++) {
      if (c !== 1 && c !== 90 && !hasMonster(c) && !npcOccupied.has(c) && !cellTeleport[c]) {
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
    const cd = NPCS[npcId]?.cooldownSeconds ?? (NPC_CONFIG.SPAWN_COOLDOWN_SECONDS || 180);
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
    let currentPotions = [...player.potions];
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
            image: "/images/items/potions/potion_health.webp",
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
            image: "/images/items/potions/potion_damage.webp",
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
    if (player.skills.length < MAX_SKILLS_PER_HOUSE) {
      const ownedIds = new Set(player.skills.map((s) => (typeof s === "string" ? s : s?.id)));
      const unownedSkills = SKILL_LIST.filter((s) => !ownedIds.has(s.id));
      if (unownedSkills.length > 0) {
        const newSkill = unownedSkills[Math.floor(Math.random() * unownedSkills.length)];
        const updatedPlayers = [...state.players];
        updatedPlayers[playerIndex] = {
          ...player,
          skills: [...player.skills.map((s) => (typeof s === "string" ? s : s?.id)), newSkill.id],
        };
        const msg = `🧙‍♂️ ${player.name} ตกช่อง NPC ผู้ฝึก Skill! ได้รับสกิลใหม่ "${newSkill.nameTh || newSkill.name}" ฟรี!`;
        log.push(msg);
        marquee.push(`📢 ${player.name} ได้รับสกิลใหม่ "${newSkill.nameTh || newSkill.name}" จาก NPC ผู้ฝึก Skill!`);

        let newState = despawnNpc({ ...state, players: updatedPlayers, log, marqueeAnnouncements: marquee }, npcId);
        return { state: newState, action: "skill_granted", skill: newSkill };
      }
    }
    return { state, action: "open_skill_modal" };
  }

  if (npcId === "pet_trainer") {
    if (!player.pet) {
      const randPet = PET_LIST[Math.floor(Math.random() * PET_LIST.length)];
      const updatedPlayers = [...state.players];
      updatedPlayers[playerIndex] = { ...player, pet: randPet };
      const msg = `🐾 ${player.name} ตกช่อง NPC ผู้ฝึกสัตว์! ได้รับสัตว์เลี้ยง "${randPet.name}" ฟรี! ${randPet.emoji}`;
      log.push(msg);
      marquee.push(`📢 ${player.name} ได้รับสัตว์เลี้ยง "${randPet.name}" จาก NPC ผู้ฝึกสัตว์!`);

      let newState = despawnNpc({ ...state, players: updatedPlayers, log, marqueeAnnouncements: marquee }, npcId);
      return { state: newState, action: "pet_granted", pet: randPet };
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
  const newSkills = player.skills.map((s) => {
    const sId = typeof s === "string" ? s : s?.id;
    return sId === oldSkillId ? targetId : sId;
  });
  const updatedPlayers = [...state.players];
  updatedPlayers[playerIndex] = { ...player, skills: newSkills };

  const skillInfo = SKILLS[targetId] || (typeof newSkill === "object" ? newSkill : null);
  const skillName = skillInfo?.nameTh || skillInfo?.name || targetId;

  const log = [...state.log, `🧙‍♂️ ${player.name} สลับสกิลเป็น "${skillName}" เรียบร้อยแล้ว!`];
  const marquee = [...(state.marqueeAnnouncements || []), `📢 ${player.name} เปลี่ยนสกิลเป็น "${skillName}" กับ NPC ผู้ฝึก Skill`];

  let newState = despawnNpc({ ...state, players: updatedPlayers, log, marqueeAnnouncements: marquee, skillModalPlayer: null }, "skill_trainer");
  return advanceTurn(newState);
}

export function changePlayerPet(state, playerIndex, newPet) {
  const player = state.players[playerIndex];
  if (!player) return state;

  const fee = NPC_CONFIG.PET_CHANGE_FEE;
  if (player.gold < fee) {
    return state;
  }

  const updatedPlayers = [...state.players];
  updatedPlayers[playerIndex] = {
    ...player,
    gold: player.gold - fee,
    pet: newPet,
  };

  const log = [...state.log, `🐾 ${player.name} จ่าย ${fee} Gold เปลี่ยนสัตว์เลี้ยงเป็น "${newPet.name}" ${newPet.emoji}`];
  const marquee = [...(state.marqueeAnnouncements || []), `📢 ${player.name} เปลี่ยนสัตว์เลี้ยงเป็น "${newPet.name}" กับ NPC ผู้ฝึกสัตว์`];

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
    if (!potion || player.potions.length >= MAX_POTIONS) {
      log.push(`❌ ไม่สามารถซื้อยาได้`);
      return { ...state, log: [...state.log, ...log] };
    }
    if (player.gold < potion.price) {
      log.push(`❌ ไม่มีเงินพอซื้อยา`);
      return { ...state, log: [...state.log, ...log] };
    }
    player.gold -= potion.price;
    player.potions = [...player.potions, itemId];
    log.push(`🧪 ${player.name} ซื้อ "${potion.name}"`);
  }

  if (itemType === "skill") {
    const skill = SKILLS[itemId];
    if (!skill || player.skills.length >= 2) {
      log.push(`❌ ไม่สามารถติดตั้งสกิลได้`);
      return { ...state, log: [...state.log, ...log] };
    }
    if (player.gold < SKILL_PRICE) {
      log.push(`❌ ไม่มีเงินพอซื้อสกิล`);
      return { ...state, log: [...state.log, ...log] };
    }
    player.gold -= SKILL_PRICE;
    player.skills = [...player.skills, itemId];
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
    return tickPlayerCooldowns({
      ...state,
      extraTurn: false,
      turn: state.turn + 1,
      phase: "play",
      diceResult: null,
      shopOpen: false,
    }, state.currentPlayerIndex);
  }
  const next = (state.currentPlayerIndex + 1) % state.players.length;
  const newRound = next === 0 ? state.round + 1 : state.round;
  return tickPlayerCooldowns({
    ...state,
    currentPlayerIndex: next,
    round: newRound,
    turn: state.turn + 1,
    phase: "play",
    diceResult: null,
    shopOpen: false,
  }, next);
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
    const parsed = JSON.parse(saved);
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

    // Ensure autoGoldAmount defaults to 10 (or migrates legacy 20 -> 10)
    if (parsed.autoGoldAmount === 20 || parsed.autoGoldAmount === undefined) {
      parsed.autoGoldAmount = 10;
    }

    if (parsed.npcs) {
      if (!parsed.npcs.merchant) {
        parsed.npcs.merchant = { id: "merchant", cell: null, isSpawned: false, cooldown: 0 };
      }
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
