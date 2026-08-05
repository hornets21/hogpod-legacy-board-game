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
} from "./gameData";

// ─── Initial State ───────────────────────────────────────────
export function createInitialGameState() {
  const players = HOUSE_LIST.map((house) => createPlayer(house));
  const boardElements = generateRandomBoardElements();

  return {
    phase: "setup", // setup | shop | play | combat | gameover
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
    winner: null,
    log: ["🎲 สุ่มตำแหน่งมอนสเตอร์และบันไดงูสำหรับกระดานตานี้เรียบร้อยแล้ว!"],
    diceResult: null,
    combatState: null,
    shopOpen: false,
    activeSkillEffect: null,
  };
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

// ─── Dice ─────────────────────────────────────────────────────
export function rollDice(sides = 6) {
  return Math.floor(Math.random() * sides) + 1;
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
  if (teleport) {
    const isLadder = teleport.type === "ladder";
    if (isLadder) {
      if (!usedLadders.includes(newPos)) {
        usedLadders.push(newPos);
        log.push(`🪜 บันได! ขึ้นจากช่อง ${newPos} → ช่อง ${teleport.to} (บันไดถูกใช้งานแล้วและหายไป!)`);
        newPos = teleport.to;
      } else {
        log.push(`🪵 ช่อง ${newPos} บันไดถูกใช้งานไปแล้ว ไม่สามารถปีนขึ้นได้อีก`);
      }
    } else {
      log.push(`🐍 งู! ลงจากช่อง ${newPos} → ช่อง ${teleport.to}`);
      newPos = teleport.to;
    }
  }

  player.position = newPos;
  players[playerIndex] = player;

  return { ...state, players, usedLadders, log: [...state.log, ...log], diceResult: steps };
}

// ─── Combat ───────────────────────────────────────────────────
export function initCombat(state, playerIndex, monster) {
  const player = state.players[playerIndex];
  const playerDmg = getTotalDmg(player);
  const playerHp = Math.max(1, player.hp);
  const tierMult = monster?.isBoss ? 1.25 : monster?.isElite ? 1.1 : 1.0;

  // คำนวณสเตตัสเริ่มต้นของมอนสเตอร์โดยยึดตามพลังและเลือดของคู่ต่อสู้ (Player)
  const baseHp = Math.max(10, Math.round(playerDmg * 0.85 * tierMult));
  const baseDmg = Math.max(1, Math.round(playerHp * 0.65 * tierMult));

  const dynamicMonster = {
    ...monster,
    hp: baseHp,
    dmg: baseDmg,
    currentHp: baseHp,
  };

  return {
    ...state,
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
  const monster = { ...combat.monster, dmg: spunDmg || combat.monster.dmg, hp: spunHp || combat.monster.hp };
  const roundLog = [];

  combat.round += 1;

  if (outcome === "win") {
    combat.resolved = true;
    combat.monsterDied = true;
    roundLog.push(`🎰 สุ่มสเตตัสมอนสเตอร์: DMG ${spunDmg} | HP ${spunHp}`);
    roundLog.push(`⚔️ ${player.name} สามารถเอาชนะ ${monster.name} ได้สำเร็จ!`);
  } else {
    combat.resolved = true;
    combat.playerDied = true;
    player.hp = 0;
    roundLog.push(`🎰 สุ่มสเตตัสมอนสเตอร์: DMG ${spunDmg} | HP ${spunHp}`);
    roundLog.push(`💀 ${monster.name} สร้างดาเมจมหาศาล ${player.name} พ่ายแพ้!`);
  }

  combat.monster = monster;
  combat.playerCurrentHp = player.hp;
  players[combat.playerIndex] = player;

  return {
    ...state,
    players,
    combatState: { ...combat, log: [...combat.log, ...roundLog] },
  };
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
export function useSkill(state, playerIndex, skillId, targetIndex = null) {
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

  // Apply cooldown (reduce by 1 if has Hisoka pet)
  const cdBase = skill.cooldown || 3;
  const cdActual = player.pet?.effect === "reduce_cooldown" ? Math.max(1, cdBase - 1) : cdBase;
  player.skillCooldowns = { ...(player.skillCooldowns || {}), [skillId]: cdActual };

  log.push(`✨ ${player.name} ร่ายคาถา "${skill.nameTh || skill.name}" (${skill.emoji})!`);

  let newState = { ...state, players };

  switch (skill.effect) {
    case "invincible": {
      player.isInvincible = true;
      player.invincibleTurns = skill.duration || 2;
      log.push(`🛡️ ${player.name} เข้าสู่สถานะอมตะ หลบการโจมตีทุกรูปแบบ ${player.invincibleTurns} เทิร์น!`);
      break;
    }

    case "steal_turn": {
      newState.extraTurn = true;
      log.push(`🎵 ${player.name} ร่ายบทเพลงกล่อมใจ — ได้รับสิทธิ์ทอยลูกเต๋าเพิ่มอีก 1 เทิร์น!`);
      break;
    }

    case "lock_dice": {
      player.nextRollOverride = 6;
      log.push(`🐍 ${player.name} ใช้งูเล็งเขี้ยว — ล็อกผลลูกเต๋าก้าวถัดไปเป็น 6!`);
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
      log.push(`🌀 โคราชเคอส! สลับตำแหน่งผู้เล่นทุกคนบนกระดานแบบสุ่มเรียบร้อยแล้ว!`);
      break;
    }

    case "steal_potion": {
      let tIdx = targetIndex;
      if (tIdx === null || tIdx === playerIndex) {
        const eligible = players
          .map((p, i) => ({ p, i }))
          .filter(({ p, i }) => i !== playerIndex && p.potions && p.potions.length > 0);
        if (eligible.length > 0) {
          tIdx = eligible[Math.floor(Math.random() * eligible.length)].i;
        }
      }

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
        log.push(`🎭 ร่าย God NTR แต่ไม่มีบ้านอื่นที่มีขวดยาให้ขโมย!`);
      }
      break;
    }

    case "banish_monster": {
      const pos = player.position;
      const monsterCells = new Set(state.monsterCells || []);
      if (monsterCells.has(pos)) {
        monsterCells.delete(pos);
        log.push(`💨 ขับไล่มอนสเตอร์ที่ช่อง ${pos} หายไปในความมืด!`);
      } else {
        const ahead = Array.from(monsterCells).filter((c) => c >= pos).sort((a, b) => a - b);
        if (ahead.length > 0) {
          monsterCells.delete(ahead[0]);
          log.push(`💨 ขับไล่มอนสเตอร์ที่ช่อง ${ahead[0]} หายไปในความมืด!`);
        } else {
          log.push(`💨 ร่าย Scab Dead แต่ไม่มีมอนสเตอร์ในบริเวณใกล้เคียง!`);
        }
      }
      newState = { ...newState, monsterCells };
      break;
    }

    default:
      break;
  }

  // Handle damage skills (monster target)
  if (skill.dmg && skill.target === "monster") {
    if (state.combatState) {
      const combat = { ...state.combatState };
      const monster = { ...combat.monster };
      monster.currentHp -= skill.dmg;
      log.push(`⚡ ${skill.nameTh || skill.name} สร้าง ${skill.dmg} ดาเมจใส่ ${monster.name}! (HP เหลือ ${Math.max(0, monster.currentHp)})`);
      if (monster.currentHp <= 0) {
        monster.currentHp = 0;
        log.push(`💥 ${monster.name} ถูกกำจัดด้วยคาถา!`);
        combat.resolved = true;
        combat.monsterDied = true;
      }
      combat.monster = monster;
      newState = { ...newState, combatState: combat };
    } else {
      player.tempDmgBonus = (player.tempDmgBonus || 0) + skill.dmg;
      player.tempDmgTurns = (player.tempDmgTurns || 0) + 2;
      log.push(`⚡ ร่าย ${skill.nameTh || skill.name}! บัฟพลังโจมตี +${skill.dmg} DMG สำหรับการต่อสู้ถัดไป!`);
    }
  }

  // Handle damage skills (player target)
  if (skill.dmg && skill.target === "player") {
    let tIdx = targetIndex;
    if (tIdx === null || tIdx === playerIndex) {
      const eligible = players
        .map((p, i) => ({ p, i }))
        .filter(({ p, i }) => i !== playerIndex && p.hp > 0);
      if (eligible.length > 0) {
        eligible.sort((a, b) => b.p.position - a.p.position);
        tIdx = eligible[0].i;
      }
    }

    if (tIdx !== null && tIdx !== playerIndex) {
      const target = { ...players[tIdx] };
      target.hp -= skill.dmg;
      log.push(`🔥 ${skill.nameTh || skill.name} ปล่อยพลังสร้าง ${skill.dmg} ดาเมจใส่ ${target.name}! (HP เหลือ ${Math.max(0, target.hp)})`);
      if (target.hp <= 0) {
        target.hp = 0;
        log.push(`💀 ${target.name} ถูกสังหารด้วยคาถาฟีนิกซ์!`);
      }
      players[tIdx] = target;
    } else {
      log.push(`🔥 ร่าย ${skill.nameTh || skill.name} แต่ไม่มีเป้าหมายผู้เล่นให้โจมตี!`);
    }
  }

  players[playerIndex] = player;
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

// ─── Potion Use ───────────────────────────────────────────────
export function usePotion(state, playerIndex, potionId) {
  const players = [...state.players];
  const player = { ...players[playerIndex] };
  const log = [];

  const idx = player.potions.indexOf(potionId);
  if (idx === -1) return state;

  const potions = [...player.potions];
  potions.splice(idx, 1);
  player.potions = potions;

  const potion = POTIONS[potionId];
  switch (potionId) {
    case "heal":
      player.hp = Math.min(player.maxHp, player.hp + (potion.healAmount || 30));
      log.push(`🧪 ${player.name} ใช้ยาเพิ่มเลือด +${potion.healAmount} HP`);
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
      break;
    default:
      break;
  }

  players[playerIndex] = player;
  return { ...state, players, log: [...state.log, ...log] };
}

// ─── Shop: Buy Item ───────────────────────────────────────────
export function buyItem(state, playerIndex, itemType, itemId) {
  const players = [...state.players];
  const player = { ...players[playerIndex] };
  const log = [];

  if (itemType === "wand") {
    const price = itemId === "common" ? 1290 : 2200;
    if (player.gold < price) {
      log.push(`❌ ไม่มีเงินพอซื้อไม้กายสิทธิ์`);
      return { ...state, log: [...state.log, ...log] };
    }
    player.gold -= price;
    const dmgBonus = itemId === "common" ? 20 : 35;
    player.wand = { type: itemId, dmgBonus };
    log.push(`🪄 ${player.name} ซื้อไม้กายสิทธิ์ระดับ${itemId} +${dmgBonus} dmg`);
  }

  if (itemType === "armor") {
    const price = 800;
    if (player.gold < price) {
      log.push(`❌ ไม่มีเงินพอซื้อเสื้อเกราะ`);
      return { ...state, log: [...state.log, ...log] };
    }
    player.gold -= price;
    const pool = ARMOR_POOL;
    const armor = pool[Math.floor(Math.random() * pool.length)];
    player.armor = armor;
    player.hp += armor.hpBonus || 0;
    if (armor.hpBonus < 0) player.hp = Math.max(1, player.hp);
    log.push(`🛡️ ${player.name} ได้ "${armor.name}" (HP ${armor.hpBonus > 0 ? "+" : ""}${armor.hpBonus})`);
  }

  if (itemType === "amulet") {
    const price = 1000;
    if (player.gold < price) {
      log.push(`❌ ไม่มีเงินพอซื้อเครื่องราง`);
      return { ...state, log: [...state.log, ...log] };
    }
    player.gold -= price;
    const pool = AMULET_POOL;
    const amulet = pool[Math.floor(Math.random() * pool.length)];
    player.amulet = amulet;
    log.push(`📿 ${player.name} ได้เครื่องราง "${amulet.name}"`);
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

  players[playerIndex] = player;
  return { ...state, players, log: [...state.log, ...log] };
}

// ─── Next Turn ────────────────────────────────────────────────
export function advanceTurn(state) {
  if (state.extraTurn) {
    return tickCooldowns({
      ...state,
      extraTurn: false,
      turn: state.turn + 1,
      phase: "play",
      diceResult: null,
      shopOpen: false,
    });
  }
  const next = (state.currentPlayerIndex + 1) % state.players.length;
  const newRound = next === 0 ? state.round + 1 : state.round;
  return tickCooldowns({
    ...state,
    currentPlayerIndex: next,
    round: newRound,
    turn: state.turn + 1,
    phase: "play",
    diceResult: null,
    shopOpen: false,
  });
}

// ─── Check Win Condition ──────────────────────────────────────
export function checkWin(state) {
  const winner = state.players.find((p) => p.position >= WIN_CELL && p.isAlive);
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
