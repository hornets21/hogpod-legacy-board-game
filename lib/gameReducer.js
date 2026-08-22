import {
  createInitialGameState,
  resetGameState,
  getCurrentPlayer,
  rollDice,
  movePlayer,
  initCombat,
  startCombatAttack,
  resolveOneTurnCombat,
  handlePlayerDeath,
  useSkill,
  usePotion,
  buyItem,
  advanceTurn,
  checkWin,
  getTotalDmg,
  saveGameState,
  loadGameState,
  clearSavedGameState,
  handleNpcLanding,
  swapPlayerSkill,
  changePlayerPet,
  despawnNpc,
  spawnNpc,
  spawnAllNpcs,
  tickNpcCooldowns,
  equipArmorToPlayer,
  equipAmuletToPlayer,
} from "@/lib/gameEngine";

import {
  MONSTER_MAP,
  ARMOR_POOL,
  AMULET_POOL,
  POTIONS,
  SKILLS,
  PETS,
} from "@/lib/gameData";
import { checkPlayerBingo, generateBingoCard } from "@/lib/bingoEngine";
import { emitGoldGain, emitHeal } from "@/lib/skillFxBus";

// Host-only counters for periodic background ticks. Tracked outside React
// state so that `TICK_SECOND` / `PASSIVE_GOLD_TICK` can return the SAME state
// reference when nothing meaningful changed, preventing `useReducer` from
// re-rendering and spamming Firebase writes every second. These reset on
// page reload — acceptable since they only time the 10-second HP recovery
// window and any drift just causes one extra/reduced tick on the next cycle.
let hpRecoveryTickCount = 0;

// Skill metadata helper to determine if a picker is needed
export function skillNeedsTarget(skillId) {
  const sk = SKILLS[skillId];
  return sk?.requiresTarget === "player" || sk?.requiresTarget === "monster";
}

export function resolveDestinationEffects(state) {
  const player = state.players[state.currentPlayerIndex];

  // Resolve destination effects only after the 3D token has finished walking.
  // ROLL_DICE must only update the destination so the token can animate there.
  if (state.trapCells?.[player.position]) {
    // กับดักยาพิษ — ใครเหยียบก็ตาย รวมถึงเจ้าของด้วย (ตามคำอธิบายยา) และกับดัก single-use
    const trapCells = { ...state.trapCells };
    delete trapCells[player.position];

    if (!player.isInvincible) {
      const p = { ...player, hp: 0 };
      const players = [...state.players];
      players[state.currentPlayerIndex] = p;
      let next = handlePlayerDeath(
        { ...state, players, trapCells },
        state.currentPlayerIndex
      );
      next = {
        ...next,
        log: [...next.log, `☠️ ${player.name} เหยียบกับดักยาพิษ!`],
      };
      return advanceTurn(next);
    } else {
      return advanceTurn({
        ...state,
        trapCells,
        log: [
          ...state.log,
          `🛡️ ${player.name} เหยียบกับดักยาพิษ แต่มีสถานะอมตะจึงไม่ได้รับความเสียหาย!`,
        ],
      });
    }
  }

  let next = checkWin(state);
  if (next.winner || next.phase !== "play") return next;

  const monsterMap = next.monsterMap || MONSTER_MAP;
  const monster =
    next.revealedMonsters?.[player.position] || monsterMap[player.position];
  const revealedMonsters = { ...next.revealedMonsters };

  // 1. ตรวจสอบมอนสเตอร์ในช่อง
  if (next.monsterCells.has(player.position) && monster) {
    revealedMonsters[player.position] = monster;
    next = { ...next, revealedMonsters };

    // กรณีเป็นมอนสเตอร์สายรักษา (isHealer เช่น เทพธิดาเอวา) -> สุ่มรักษาเลือดผู้เล่น 30% - 100%
    if (monster.isHealer) {
      const healPct = Math.floor(Math.random() * 71) + 30; // สุ่ม 30 ถึง 100
      const maxHp = player.maxHp || 100;
      const healAmount = Math.round((maxHp * healPct) / 100);
      const newHp = Math.min(maxHp, player.hp + healAmount);

      const updatedPlayer = { ...player, hp: newHp };
      const updatedPlayers = [...next.players];
      updatedPlayers[state.currentPlayerIndex] = updatedPlayer;

      const updatedMonsterCells = new Set(next.monsterCells);
      updatedMonsterCells.delete(player.position);

      next = {
        ...next,
        players: updatedPlayers,
        monsterCells: updatedMonsterCells,
        log: [
          ...next.log,
          `✨ ${monster.name} มอบพรแห่งการรักษา! ฟื้นฟู HP ให้ ${player.name} ${healPct}% (+${healAmount} HP)`,
        ],
      };
      return advanceTurn(next);
    }

    // Check if player can dodge (Bank pet)
    const hasDodge = player.pet?.effect === "dodge_once" && !player.dodgeUsed;

    // Enter combat
    next = initCombat(next, state.currentPlayerIndex, monster);
    if (hasDodge) {
      next = { ...next, activeSkillEffect: "dodge_available" };
    }
    return next;
  }

  // 2. ตรวจสอบการเผชิญหน้าผู้เล่นในช่องเดียวกัน (Multi-Player PvP Encounter - เฉพาะช่อง > 1)
  if (player.position > 1) {
    const otherPlayersOnCell = next.players
      .map((p, idx) => ({ p, idx }))
      .filter(
        ({ p, idx }) =>
          idx !== state.currentPlayerIndex &&
          p.isAlive &&
          p.position === player.position
      );

    if (otherPlayersOnCell.length > 0) {
      const participantIndices = [
        state.currentPlayerIndex,
        ...otherPlayersOnCell.map((o) => o.idx),
      ];
      return {
        ...next,
        pvpEncounter: {
          cell: player.position,
          participantIndices,
          attackerIndex: state.currentPlayerIndex,
        },
        log: [
          ...next.log,
          `⚔️ การประลองหลากบ้าน! ${next.players[state.currentPlayerIndex].name} และ ${otherPlayersOnCell.map((o) => o.p.name).join(", ")} พบกันที่ช่อง ${player.position}!`,
        ],
      };
    }
  }

  // 3. ตรวจสอบ NPC บนช่องกระดาน
  const spawnedNpc = Object.values(next.npcs || {}).find(
    (n) => n && n.isSpawned && n.cell === player.position
  );
  if (spawnedNpc) {
    const npcResult = handleNpcLanding(
      next,
      state.currentPlayerIndex,
      spawnedNpc.id
    );

    // If bot lands on NPC, automatically advance turn after receiving NPC effects
    if (player.isBot) {
      return advanceTurn(npcResult.state);
    }

    if (npcResult.action === "doctor_granted") {
      return {
        ...npcResult.state,
        diceResult: null,
        doctorModalData: { player, grantedPotions: npcResult.grantedPotions },
      };
    }
    if (npcResult.action === "open_skill_modal") {
      return {
        ...npcResult.state,
        diceResult: null,
        skillModalPlayer: player,
      };
    }
    if (npcResult.action === "open_pet_modal") {
      return {
        ...npcResult.state,
        diceResult: null,
        petModalPlayer: player,
      };
    }
    if (
      npcResult.action === "skill_granted" ||
      npcResult.action === "pet_granted"
    ) {
      return advanceTurn(npcResult.state);
    }
    if (npcResult.action === "merchant_shop") {
      return {
        ...npcResult.state,
        diceResult: null,
        openedShopFromNpc: true,
      };
    }
  }

  return advanceTurn(next);
}

// ─── Reducer ─────────────────────────────────────────────────
export function gameReducer(state, action) {
  switch (action.type) {
    case "MOVE_AND_CHECK": {
      if (state.phase !== "play" || state.winner) return state;
      if (state.diceResult == null && !state.pendingTeleport) {
        return state;
      }

      const player = state.players[state.currentPlayerIndex];

      // หากตกช่องบันไดหรือช่องงู ให้แสดง Modal แจ้งเตือนผู้เล่นและหยุดรอก่อน!
      if (
        state.pendingTeleport &&
        state.pendingTeleport.playerIndex === state.currentPlayerIndex
      ) {
        return {
          ...state,
          teleportModalData: {
            player,
            ...state.pendingTeleport,
          },
        };
      }

      return resolveDestinationEffects(state);
    }

    case "CONFIRM_TELEPORT": {
      const teleport = state.teleportModalData || state.pendingTeleport;
      if (!teleport) return state;

      const pIdx = teleport.playerIndex;
      const players = [...state.players];
      const player = { ...players[pIdx] };
      let usedLadders = [...(state.usedLadders || [])];
      const log = [...state.log];

      if (teleport.type === "ladder") {
        if (!usedLadders.includes(teleport.from)) {
          usedLadders.push(teleport.from);
        }
        log.push(
          `🪜 ${player.name} ปีนบันไดขึ้นจากช่อง ${teleport.from} → ช่อง ${teleport.to}! (บันไดถูกใช้งานแล้วและหายไป)`
        );
      } else {
        log.push(
          `🐍 ${player.name} ถูกงูกลืนกิน สไลด์จากช่อง ${teleport.from} → ช่อง ${teleport.to}!`
        );
      }

      player.position = teleport.to;

      const {
        updatedPlayer,
        logs: bingoLogs,
        bingoWin,
      } = checkPlayerBingo(player, teleport.to);
      players[pIdx] = updatedPlayer;
      if (bingoLogs && bingoLogs.length > 0) {
        log.push(...bingoLogs);
      }

      let next = {
        ...state,
        players,
        usedLadders,
        pendingTeleport: null,
        teleportModalData: null,
        log,
      };

      if (bingoWin) {
        next.bingoWinModalData = bingoWin;
      }

      next = checkWin(next);
      return next;
    }

    case "RESOLVE_TELEPORT_LANDING": {
      if (state.winner || state.phase !== "play") return state;
      return resolveDestinationEffects(state);
    }

    case "ROLL_DICE": {
      if (
        state.phase !== "play" ||
        state.winner ||
        state.diceResult != null ||
        state.combatState ||
        state.shopOpen ||
        state.teleportModalData ||
        state.pvpEncounter
      ) {
        return state;
      }

      const currentP = state.players?.[state.currentPlayerIndex];
      let rawDice = action.dice;
      if (currentP?.nextRollOverride != null) {
        rawDice = currentP.nextRollOverride;
      }
      const dice = typeof rawDice === "number" && !isNaN(rawDice) && rawDice > 0 ? rawDice : rollDice();
      let next = movePlayer(state, state.currentPlayerIndex, dice);
      if (next.players[state.currentPlayerIndex]?.nextRollOverride) {
        const players = [...next.players];
        players[state.currentPlayerIndex] = {
          ...players[state.currentPlayerIndex],
          nextRollOverride: null,
        };
        next = { ...next, players };
      }
      // A roll at the end of the board may leave the position unchanged, so
      // there is no token animation to signal MOVE_AND_CHECK.
      if (
        next.players[state.currentPlayerIndex]?.position ===
        state.players[state.currentPlayerIndex]?.position
      ) {
        return resolveDestinationEffects(next);
      }
      return next;
    }

    case "COMBAT_ATTACK": {
      // One attack roll per combat encounter: a duplicate action (double-click
      // before the authoritative result syncs back, or the host bot timer
      // racing the CombatModal auto-trigger) must not re-roll and overwrite
      // the result whose animation is already playing on other clients.
      if (!state.combatState || state.combatState.resolved || state.combatState.lastResult) {
        return state;
      }
      return startCombatAttack(state, action.payload || action);
    }

    case "COMBAT_RESOLVE": {
      if (!state.combatState) return state;
      let next = resolveOneTurnCombat(
        state,
        action.combatResult || action.payload?.combatResult || {}
      );
      const combat = next.combatState;
      if (!combat) return next;

      if (combat.resolved) {
        if (combat.playerDied) {
          next = handlePlayerDeath(next, combat.playerIndex);
          next = {
            ...next,
            phase: "play",
            combatState: null,
          };
        } else if (combat.monsterDied) {
          const players = [...next.players];
          const p = { ...players[combat.playerIndex] };
          const goldReward = combat.monster.isBoss
            ? 5000
            : combat.monster.isElite
            ? 2000
            : 500;
          p.gold += goldReward;
          players[combat.playerIndex] = p;
          const monsterCells = new Set(next.monsterCells);
          monsterCells.delete(combat.monster.cell);
          const revealedMonsters = { ...next.revealedMonsters };
          delete revealedMonsters[combat.monster.cell];
          const monsterMap = { ...next.monsterMap };
          delete monsterMap[combat.monster.cell];

          next = {
            ...next,
            players,
            monsterCells,
            revealedMonsters,
            monsterMap,
            phase: "play",
            combatState: null,
            log: [
              ...next.log,
              `💰 ${p.name} ได้รับ ${goldReward.toLocaleString()} เหรียญ!`,
            ],
          };
          next = checkWin(next);
        } else {
          // Monster survived with remaining HP! Check if battle was at Boss cell (cell 90)
          const isBossCell =
            combat.monster?.cell === 90 ||
            combat.monster?.isBoss ||
            next.players[combat.playerIndex]?.position === 90;
          let players = [...next.players];
          let customLog = [];
          const p = { ...players[combat.playerIndex] };

          if (isBossCell) {
            const newPos = Math.max(1, p.position - 6);
            p.position = newPos;
            players[combat.playerIndex] = p;
            customLog.push(
              `↩️ ${p.name} ยังไม่สามารถปราบ Final Boss ได้! กระเด็นถอยหลังไป 6 ช่อง (ช่อง ${newPos}) เพื่อเริ่มทอยใหม่ (บอสเหลือ HP ${combat.monster.currentHp}/${combat.monster.hp})`
            );
          } else {
            customLog.push(
              `⚔️ ${p.name} ยังไม่สามารถปราบ ${combat.monster.name} ได้! (มอนสเตอร์สแตนด์บายที่ช่อง ${combat.monster.cell} เหลือ HP ${combat.monster.currentHp}/${combat.monster.hp})`
            );
          }

          next = {
            ...next,
            players,
            phase: "play",
            combatState: null,
            log: [...next.log, ...customLog],
          };
        }

        if (!next.winner) {
          next = advanceTurn(next);
        }
      }
      return next;
    }

    case "USE_SKILL": {
      const pIdx =
        action.playerIndex !== undefined
          ? action.playerIndex
          : state.currentPlayerIndex;
      return useSkill(
        state,
        pIdx,
        action.skillId,
        action.targetIndex,
        action.monsterCell
      );
    }

    case "USE_POTION": {
      const pIdx =
        action.playerIndex !== undefined
          ? action.playerIndex
          : state.currentPlayerIndex;
      return usePotion(state, pIdx, action.potionId, action.targetCell);
    }

    case "BUY_ITEM": {
      return buyItem(
        state,
        state.currentPlayerIndex,
        action.itemType,
        action.itemId
      );
    }

    case "RESPAWN_PLAYER": {
      const pIdx =
        action.playerIndex !== undefined
          ? action.playerIndex
          : state.currentPlayerIndex;
      return advanceTurn(handlePlayerDeath(state, pIdx));
    }

    case "END_TURN": {
      return advanceTurn(state);
    }

    case "OPEN_SHOP": {
      return { ...state, shopOpen: true };
    }

    case "SWAP_NPC_SKILL": {
      return swapPlayerSkill(
        state,
        state.currentPlayerIndex,
        action.oldSkillId,
        action.newSkill
      );
    }

    case "CHANGE_NPC_PET": {
      return changePlayerPet(state, state.currentPlayerIndex, action.newPet);
    }

    case "CLOSE_DOCTOR_MODAL": {
      return advanceTurn({ ...state, doctorModalData: null });
    }

    case "CLOSE_SKILL_MODAL": {
      return advanceTurn(
        despawnNpc({ ...state, skillModalPlayer: null }, "skill_trainer")
      );
    }

    case "CLOSE_PET_MODAL": {
      return advanceTurn(
        despawnNpc({ ...state, petModalPlayer: null }, "pet_trainer")
      );
    }

    case "FORCE_SPAWN_NPC": {
      return spawnNpc(state, action.npcId);
    }

    case "DESPAWN_NPC": {
      return despawnNpc(state, action.npcId);
    }

    case "SPAWN_ALL_NPCS": {
      return spawnAllNpcs(state);
    }

    case "TELEPORT_TO_NPC": {
      const npc = state.npcs?.[action.npcId];
      if (!npc || !npc.cell) return state;
      const players = [...state.players];
      const targetIdx =
        action.playerIndex !== undefined
          ? action.playerIndex
          : state.currentPlayerIndex;
      players[targetIdx] = { ...players[targetIdx], position: npc.cell };
      return {
        ...state,
        players,
        log: [
          ...state.log,
          `🌀 [แอดมิน] วาร์ป ${players[targetIdx].name} ไปยังช่อง ${npc.cell} (NPC ${action.npcId})`,
        ],
      };
    }

    case "CLOSE_BINGO_WIN_MODAL": {
      return { ...state, bingoWinModalData: null };
    }

    case "GIVE_BINGO_CARD": {
      const targetIdx =
        action.playerIndex !== undefined
          ? action.playerIndex
          : state.currentPlayerIndex;
      const players = [...state.players];
      const p = { ...players[targetIdx] };
      p.hasBingoCard = true;
      p.bingoCard = generateBingoCard();
      const {
        updatedPlayer,
        logs: bingoLogs,
        bingoWin,
      } = checkPlayerBingo(p, p.position);
      players[targetIdx] = updatedPlayer;
      const log = [`🎯 [แอดมิน] เสก "ป้าย Bingo" ให้บ้าน ${p.name}!`];
      if (bingoLogs && bingoLogs.length > 0) log.push(...bingoLogs);
      const nextState = { ...state, players, log: [...state.log, ...log] };
      if (bingoWin) nextState.bingoWinModalData = bingoWin;
      return nextState;
    }

    case "REMOVE_BINGO_CARD": {
      const targetIdx =
        action.playerIndex !== undefined
          ? action.playerIndex
          : state.currentPlayerIndex;
      const players = [...state.players];
      const p = { ...players[targetIdx] };
      p.hasBingoCard = false;
      p.bingoCard = null;
      players[targetIdx] = p;
      return {
        ...state,
        players,
        log: [...state.log, `🚫 [แอดมิน] ถอน "ป้าย Bingo" ของบ้าน ${p.name}`],
      };
    }

    case "GIVE_BINGO_ALL": {
      let firstWin = null;
      const players = state.players.map((p) => {
        const updated = {
          ...p,
          hasBingoCard: true,
          bingoCard: p.bingoCard || generateBingoCard(),
        };
        const { updatedPlayer, bingoWin } = checkPlayerBingo(
          updated,
          updated.position
        );
        if (bingoWin && !firstWin) firstWin = bingoWin;
        return updatedPlayer;
      });
      const nextState = {
        ...state,
        players,
        log: [...state.log, `🎯 [แอดมิน] เสก "ป้าย Bingo" ให้ผู้เล่นทุกบ้าน!`],
      };
      if (firstWin) nextState.bingoWinModalData = firstWin;
      return nextState;
    }

    case "ADMIN_TELEPORT_TO_BOSS": {
      const targetIdx =
        action.playerIndex !== undefined
          ? action.playerIndex
          : state.currentPlayerIndex;
      const player = state.players[targetIdx];
      const boss =
        state.revealedMonsters?.[90] ||
        state.monsterMap?.[90] ||
        MONSTER_MAP[90];

      // Do not revive or recreate the boss after it has already been defeated.
      if (!player || !boss || !state.monsterCells?.has(90)) {
        return {
          ...state,
          log: [
            ...state.log,
            `⚠️ [แอดมิน] ไม่สามารถวาร์ป ${
              player?.name || "ผู้เล่น"
            } ไปหาบอสได้ เพราะบอสถูกปราบแล้ว`,
          ],
        };
      }

      const players = [...state.players];
      players[targetIdx] = {
        ...player,
        position: 90,
        hp: Math.max(1, player.hp),
        isAlive: true,
      };
      const next = {
        ...state,
        players,
        phase: "play",
        combatState: null,
        winner: null,
        log: [
          ...state.log,
          `🌀 [แอดมิน] วาร์ป ${player.name} ไปยังด่าน 90 เพื่อพบ ${boss.name}!`,
        ],
      };

      return initCombat(next, targetIdx, boss);
    }

    case "CLOSE_SHOP": {
      if (state.openedShopFromNpc) {
        return advanceTurn({
          ...state,
          shopOpen: false,
          openedShopFromNpc: false,
        });
      }
      return { ...state, shopOpen: false };
    }

    case "PVP_ATTACK": {
      // Authoritative PvP clash (mirrors COMBAT_ATTACK for monsters): the
      // reducer computes the duel result ONCE, applies player changes and
      // stores the outcome on pvpEncounter.lastResult. The encounter is NOT
      // resolved yet — every client replays the attack animation from
      // lastResult, then PVP_ACTION resolve closes the encounter.
      const pvp = state.pvpEncounter;
      if (!pvp || pvp.lastResult) return state; // one clash per encounter

      const participants = pvp.participantIndices || [];
      const attackerIndex =
        typeof pvp.attackerIndex === "number" ? pvp.attackerIndex : participants[0];

      // Alliance handshake — broadcast immediately, no clash computation.
      if (action.isAlliance) {
        const alliancePlayer = state.players[attackerIndex];
        return {
          ...state,
          pvpEncounter: {
            ...pvp,
            lastResult: {
              id: String(Date.now()) + "_" + Math.floor(Math.random() * 10000),
              attackerIndex,
              targetIndex: null,
              damageDealt: 0,
              isDefeated: false,
              isAlliance: true,
              timestamp: Date.now(),
            },
          },
          log: [
            ...state.log,
            `🤝 [PVP] ${alliancePlayer?.name || "Player"} จับมือสงบศึกกับคู่ต่อสู้! (ไม่มีดาเมจ)`,
          ],
        };
      }

      const targetIndex = action.targetIndex;
      if (
        !participants.includes(attackerIndex) ||
        typeof targetIndex !== "number" ||
        !participants.includes(targetIndex) ||
        targetIndex === attackerIndex
      ) {
        return state;
      }

      const players = state.players.map((p) => ({ ...p }));
      const attacker = players[attackerIndex];
      const target = players[targetIndex];
      if (!attacker || !target || attacker.hp <= 0 || target.hp <= 0) return state;

      const log = [...state.log];
      let bonusDmg = 0;

      // Consume the chosen potion (if any)
      const potionId = action.potionId || null;
      if (
        potionId &&
        Array.isArray(attacker.potions) &&
        attacker.potions.includes(potionId)
      ) {
        const pot = POTIONS[potionId];
        attacker.potions = attacker.potions.filter(
          (_, i) => i !== attacker.potions.indexOf(potionId)
        );
        if (potionId === "heal") {
          const healAmt = pot?.healAmount || 30;
          attacker.hp = Math.min(attacker.maxHp, attacker.hp + healAmt);
          log.push(`🧪 [PVP] ${attacker.name} ใช้ยาฟื้นฟู +${healAmt} HP`);
        } else if (potionId === "damage") {
          bonusDmg += pot?.dmgBonus || 25;
          log.push(`🧪 [PVP] ${attacker.name} ใช้ยาเสริมพลังโจมตี +${bonusDmg} DMG`);
        }
      }

      // Consume the chosen skill (if any)
      const skillId = action.skillId || null;
      const ownedSkills = Array.isArray(attacker.skills)
        ? attacker.skills.map((s) => (typeof s === "string" ? s : s?.id))
        : [];
      if (
        skillId &&
        SKILLS[skillId] &&
        ownedSkills.includes(skillId) &&
        (attacker.skillCooldowns?.[skillId] || 0) <= 0
      ) {
        const sk = SKILLS[skillId];
        attacker.skillCooldowns = {
          ...(attacker.skillCooldowns || {}),
          [skillId]: sk.cooldown || 3,
        };
        if (sk.dmg) bonusDmg += sk.dmg;
        if (sk.effect === "invincible") attacker.isInvincible = true;
        log.push(`✨ [PVP] ${attacker.name} ร่ายคาถา "${sk.nameTh || sk.name}"!`);
      }

      const baseDmg = getTotalDmg(attacker);
      const variation = Math.floor(Math.random() * 9) - 4; // -4 .. +4
      const rawDmg = Math.max(8, baseDmg + bonusDmg + variation);
      const actualDmg = target.isInvincible ? 0 : rawDmg;
      target.hp = Math.max(0, target.hp - actualDmg);
      const isDefeated = target.hp <= 0;

      log.push(
        target.isInvincible
          ? `🛡️ [PVP] ${target.name} อยู่ในสถานะอมตะ! ป้องกันดาเมจทั้งหมด!`
          : isDefeated
          ? `⚔️ [PVP] ${attacker.name} จัดการ ${target.name} ด้วย ${actualDmg} ดาเมจ!`
          : `⚔️ [PVP] ${attacker.name} โจมตี ${target.name} ด้วย ${actualDmg} ดาเมจ!`
      );

      players[attackerIndex] = attacker;
      players[targetIndex] = target;

      return {
        ...state,
        players,
        log,
        pvpEncounter: {
          ...pvp,
          lastResult: {
            id: String(Date.now()) + "_" + Math.floor(Math.random() * 10000),
            attackerIndex,
            targetIndex,
            damageDealt: actualDmg,
            isDefeated,
            isAlliance: false,
            timestamp: Date.now(),
          },
        },
      };
    }

    case "PVP_ACTION": {
      const pvp = state.pvpEncounter;
      if (!pvp) return state;

      if (action.choice === "resolve" && action.updatedPlayers) {
        let players = [...action.updatedPlayers];
        let next = {
          ...state,
          players,
          pvpEncounter: null,
          extraTurn: Boolean(action.extraTurn),
          log: [...state.log, ...(action.logEntries || [])],
        };

        // Check if any player died in PvP and process respawn
        players.forEach((p, i) => {
          if (p.hp <= 0) {
            next = handlePlayerDeath(next, i);
          }
        });

        return advanceTurn(next);
      }

      if (action.choice === "resolve") {
        // Authoritative online path: PVP_ATTACK already applied the clash
        // damage to players. Just close the encounter, process deaths and
        // advance the turn. Also serves as the host anti-stall fallback
        // (skips the encounter when no attack was ever broadcast).
        let next = {
          ...state,
          pvpEncounter: null,
          extraTurn: Boolean(action.extraTurn),
          ...(Array.isArray(action.logEntries)
            ? { log: [...state.log, ...action.logEntries] }
            : {}),
        };
        next.players.forEach((p, i) => {
          if (p && p.hp <= 0) {
            next = handlePlayerDeath(next, i);
          }
        });
        return advanceTurn(next);
      }

      return advanceTurn({
        ...state,
        pvpEncounter: null,
      });
    }

    case "FLEE_COMBAT": {
      const player = state.players[state.currentPlayerIndex];
      if (player.pet?.effect === "dodge_once" && !player.dodgeUsed) {
        const players = [...state.players];
        const activeMonster = state.combatState?.monster;
        const isBossCell =
          activeMonster?.cell === 90 ||
          activeMonster?.isBoss ||
          player.position === 90;
        const newPos = isBossCell
          ? Math.max(1, player.position - 6)
          : player.position;

        players[state.currentPlayerIndex] = {
          ...player,
          dodgeUsed: true,
          position: newPos,
        };
        let revealedMonsters = state.revealedMonsters;
        let monsterMap = state.monsterMap;
        if (activeMonster && activeMonster.cell != null) {
          revealedMonsters = {
            ...revealedMonsters,
            [activeMonster.cell]: activeMonster,
          };
          monsterMap = { ...monsterMap, [activeMonster.cell]: activeMonster };
        }

        const fleeLog = isBossCell
          ? `🏦 ${player.name} ใช้บัฟ "แบงค์" หลบหลีกบอส! กระเด็นถอยหลังไป 6 ช่อง (ช่อง ${newPos})`
          : `🏦 ${player.name} ใช้บัฟ "แบงค์" หนีการต่อสู้!`;

        return advanceTurn({
          ...state,
          players,
          revealedMonsters,
          monsterMap,
          phase: "play",
          combatState: null,
          log: [...state.log, fleeLog],
        });
      }
      return state;
    }

    case "START_TITLE": {
      return { ...state, phase: "title" };
    }

    case "START_NEW_GAME": {
      clearSavedGameState();
      const initState = createInitialGameState();
      return {
        ...initState,
        phase: "setup",
      };
    }

    case "START_SETUP": {
      return { ...state, phase: "setup" };
    }

    case "COMPLETE_SETUP": {
      // Roll initiative d20 for all 4 players to determine turn order
      const rollScores = action.players.map((p, idx) => ({
        player: p,
        idx,
        score: Math.floor(Math.random() * 20) + 1,
      }));

      // Sort by score descending (highest roll walks first)
      rollScores.sort((a, b) => b.score - a.score);

      const orderedPlayers = rollScores.map((item) => item.player);

      const initiativeLogs = rollScores.map(
        (item, rank) =>
          `#${rank + 1} ${item.player.emoji} ${item.player.name} (ทอยได้ ${
            item.score
          } แต้ม)`
      );

      return {
        ...state,
        players: orderedPlayers,
        currentPlayerIndex: 0,
        phase: "initiative",
        initiativeRolls: rollScores,
        log: [
          ...state.log,
          "🎲 ติดตั้งอุปกรณ์เสร็จสิ้น! ทำการสุ่มทอยเต๋าลำดับการเดิน:",
          ...initiativeLogs,
          `🎯 ${orderedPlayers[0].name} ได้คะแนนสูงสุด ทอยเต๋าเดินเป็นคนแรก!`,
        ],
      };
    }

    case "START_PLAY": {
      return {
        ...state,
        phase: "play",
      };
    }

    case "ADMIN_ADD_GOLD": {
      const players = state.players.map((p, idx) => {
        if (idx === action.playerIndex) {
          return { ...p, gold: Math.max(0, p.gold + action.amount) };
        }
        return p;
      });
      return {
        ...state,
        players,
        log: [
          ...state.log,
          `👑 แอดมินสายเปย์แจกเงิน +${action.amount.toLocaleString()} Gold ให้บ้าน ${
            state.players[action.playerIndex].name
          }!`,
        ],
      };
    }

    case "ADMIN_GIVE_ITEM": {
      const { playerIndex, itemType, itemId, itemData } = action;
      const players = [...state.players];
      const p = { ...players[playerIndex] };
      let itemLogName = itemId;

      if (itemType === "wand") {
        const isVip = itemId === "vip";
        const wandName = isVip ? p.vipWand : p.commonWand;
        const dmgBonus = isVip ? 35 : 20;
        p.wand = { type: itemId, name: wandName, dmgBonus };
        itemLogName = wandName;
      } else if (itemType === "armor") {
        const armor = itemData || ARMOR_POOL.find((a) => a.id === itemId);
        if (armor) {
          equipArmorToPlayer(p, armor);
          itemLogName = armor.name;
        }
      } else if (itemType === "amulet") {
        const amulet = itemData || AMULET_POOL.find((a) => a.id === itemId);
        if (amulet) {
          equipAmuletToPlayer(p, amulet);
          itemLogName = amulet.name;
        }
      } else if (itemType === "potion") {
        const pot = POTIONS[itemId];
        const pots = Array.isArray(p.potions) ? p.potions : [];
        if (pots.length < 5) {
          p.potions = [...pots, itemId];
        } else {
          p.potions = [...pots.slice(0, 4), itemId];
        }
        if (pot) itemLogName = pot.name;
      } else if (itemType === "skill") {
        const sk = SKILLS[itemId];
        const sks = Array.isArray(p.skills) ? p.skills : [];
        if (!sks.includes(itemId)) {
          if (sks.length < 2) {
            p.skills = [...sks, itemId];
          } else {
            p.skills = [...sks.slice(0, 1), itemId];
          }
        }
        if (sk) itemLogName = sk.name;
      } else if (itemType === "pet") {
        const pet = itemData || PETS[itemId];
        if (pet) {
          p.pet = pet;
          itemLogName = pet.name;
        }
      }

      players[playerIndex] = p;
      return {
        ...state,
        players,
        log: [
          ...state.log,
          `👑 แอดมินสายเปย์มอบไอเทม "${itemLogName}" ให้บ้าน ${p.name}!`,
        ],
      };
    }

    case "ADMIN_REMOVE_ITEM": {
      const { playerIndex, itemType } = action;
      const players = [...state.players];
      const p = { ...players[playerIndex] };

      if (itemType === "wand") p.wand = null;
      if (itemType === "armor") equipArmorToPlayer(p, null);
      if (itemType === "amulet") equipAmuletToPlayer(p, null);
      if (itemType === "pet") p.pet = null;
      if (itemType === "clear_potions") p.potions = [];
      if (itemType === "clear_skills") p.skills = [];

      players[playerIndex] = p;
      return {
        ...state,
        players,
        log: [
          ...state.log,
          `👑 แอดมินถอดไอเทม (${itemType}) จากบ้าน ${p.name}`,
        ],
      };
    }

    case "ADMIN_GOD_MODE": {
      const { playerIndex } = action;
      const players = [...state.players];
      const p = { ...players[playerIndex] };
      p.wand = { type: "vip", name: p.vipWand, dmgBonus: 35 };
      p.armor = ARMOR_POOL[0];
      p.amulet = AMULET_POOL[1];
      p.pet = PETS.hisoka;
      p.potions = ["heal", "revive", "cooldown", "damage", "poison"];
      p.skills = ["phoenix_force", "thunder_star"];
      p.gold += 50000;
      p.hp = p.maxHp;
      p.isAlive = true;
      players[playerIndex] = p;
      return {
        ...state,
        players,
        log: [
          ...state.log,
          `⚡ 👑 PAY TO WIN GOD MODE: แอดมินเปย์จัดเต็ม VIP Gear ให้บ้าน ${p.name}!`,
        ],
      };
    }

    case "ADMIN_REVIVE_PLAYER": {
      const { playerIndex } = action;
      const players = [...state.players];
      const p = { ...players[playerIndex] };
      p.hp = p.maxHp;
      p.isAlive = true;
      players[playerIndex] = p;
      return {
        ...state,
        players,
        log: [`💖 👑 แอดมินฟื้นฟู HP และคืนชีพให้บ้าน ${p.name}!`],
      };
    }

    case "TICK_SECOND": {
      let nextState = tickNpcCooldowns(state, 1);
      hpRecoveryTickCount += 1;

      // HP Recovery: +15 HP every 10 seconds for living players below maxHp
      let hpRecovered = false;
      if (hpRecoveryTickCount % 10 === 0 && nextState.players) {
        const updatedPlayers = nextState.players.map((p, idx) => {
          if (!p.isAlive || p.hp <= 0 || p.hp >= p.maxHp) return p;
          const healAmount = Math.min(15, p.maxHp - p.hp);
          if (healAmount > 0) {
            emitHeal({ targetIndex: idx, amount: healAmount });
            hpRecovered = true;
            return { ...p, hp: p.hp + healAmount };
          }
          return p;
        });
        if (hpRecovered) {
          nextState = { ...nextState, players: updatedPlayers };
        }
      }

      // Skip writing hpRecoveryTickCount into state — the counter is purely
      // host-local bookkeeping for the 10-second HP window.
      return hpRecovered
        ? { ...nextState, hpRecoveryTickCount }
        : nextState;
    }

    case "PASSIVE_GOLD_TICK": {
      if (state.autoGoldEnabled === false) return state;
      const goldAmt = state.autoGoldAmount ?? 90;
      const players = state.players.map((p, idx) => {
        if (!p.isAlive || p.hp <= 0) return p;
        emitGoldGain({ targetIndex: idx, amount: goldAmt });
        return { ...p, gold: p.gold + goldAmt };
      });
      return {
        ...state,
        players,
        autoGoldTickCount: (state.autoGoldTickCount || 0) + 1,
      };
    }

    case "TOGGLE_AUTO_GOLD": {
      const nextEnabled = !state.autoGoldEnabled;
      return {
        ...state,
        autoGoldEnabled: nextEnabled,
        log: [
          ...state.log,
          `💰 ${
            nextEnabled ? "เปิด" : "ปิด"
          }ระบบแจกเงินอัตโนมัติ (MOBA Auto Gold)`,
        ],
      };
    }

    case "SET_AUTO_GOLD_SETTINGS": {
      const autoGoldAmount = action.autoGoldAmount ?? state.autoGoldAmount;
      const autoGoldInterval =
        action.autoGoldInterval ?? state.autoGoldInterval;
      const autoGoldEnabled = action.autoGoldEnabled ?? state.autoGoldEnabled;
      return {
        ...state,
        autoGoldAmount,
        autoGoldInterval,
        autoGoldEnabled,
        log: [
          ...state.log,
          `⚙️ ปรับแต่ง MOBA Auto Gold: +${autoGoldAmount.toLocaleString()} Gold ทุกๆ ${autoGoldInterval} วินาที`,
        ],
      };
    }

    case "TRIGGER_GOLD_RAIN": {
      const bonus = 1000;
      const players = state.players.map((p, idx) => {
        if (!p.isAlive || p.hp <= 0) return p;
        emitGoldGain({ targetIndex: idx, amount: bonus });
        return { ...p, gold: p.gold + bonus };
      });
      return {
        ...state,
        players,
        log: [
          ...state.log,
          `🌧️ 💰 ฝนเงิน MOBA ตกลงมา! ทุกบ้านได้รับ +1,000 Gold ทันที!`,
        ],
      };
    }

    case "LOAD_SAVED_STATE": {
      return action.savedState;
    }

    case "RESET": {
      clearSavedGameState();
      return resetGameState(state);
    }

    default:
      return state;
  }
}
