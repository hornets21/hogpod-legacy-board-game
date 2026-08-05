"use client";

import { useCallback, useEffect, useReducer, useRef, useState, Suspense } from "react";
import dynamic from "next/dynamic";
import PlayerCard from "@/components/PlayerCard";
import TitleScreen from "@/components/TitleScreen";
import SetupModal from "@/components/SetupModal";
import InitiativeModal from "@/components/InitiativeModal";
import ShopModal from "@/components/ShopModal";
import CombatModal from "@/components/CombatModal";
import PvpCombatModal from "@/components/PvpCombatModal";
import BgmPlayer from "@/components/BgmPlayer";
import GameLog from "@/components/GameLog";
import AdminModal from "@/components/AdminModal";

// กระดาน 3D (WebGL) — โหลดฝั่ง client เท่านั้น
const BoardCanvas = dynamic(() => import("@/components/board3d/BoardCanvas"), {
  ssr: false,
  loading: () => (
    <div className="board3d-loading">🔮 กำลังเสกกระดานเวทมนตร์...</div>
  ),
});

import {
  createInitialGameState,
  getCurrentPlayer,
  rollDice,
  movePlayer,
  initCombat,
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
} from "@/lib/gameEngine";

import { MONSTER_MAP, ARMOR_POOL, AMULET_POOL, POTIONS, SKILLS, PETS } from "@/lib/gameData";

// ─── Reducer ─────────────────────────────────────────────────
function gameReducer(state, action) {
  switch (action.type) {
    case "MOVE_AND_CHECK": {
      const player = state.players[state.currentPlayerIndex];

      // Resolve destination effects only after the 3D token has finished walking.
      // ROLL_DICE must only update the destination so the token can animate there.
      if (state.trapCells?.[player.position]) {
        const trapOwner = state.trapCells[player.position].houseId;
        if (trapOwner !== player.houseId) {
          const p = { ...player, hp: 0 };
          const players = [...state.players];
          players[state.currentPlayerIndex] = p;
          let next = handlePlayerDeath({ ...state, players }, state.currentPlayerIndex);
          next = {
            ...next,
            log: [...next.log, `☠️ ${player.name} เหยียบกับดักยาพิษ!`],
          };
          return advanceTurn(next);
        }
      }

      let next = checkWin(state);
      if (next.winner || next.phase !== "play") return next;

      const monsterMap = next.monsterMap || MONSTER_MAP;
      const monster = monsterMap[player.position];
      const revealedMonsters = { ...next.revealedMonsters };

      // 1. ตรวจสอบมอนสเตอร์ในช่อง
      if (next.monsterCells.has(player.position) && monster) {
        revealedMonsters[player.position] = monster;
        next = { ...next, revealedMonsters };

        // Check if player can dodge (Bank pet)
        const hasDodge = player.pet?.effect === "dodge_once" && !player.dodgeUsed;

        // Enter combat
        next = initCombat(next, state.currentPlayerIndex, monster);
        if (hasDodge) {
          next = { ...next, activeSkillEffect: "dodge_available" };
        }
        return next;
      }

      // 2. ตรวจสอบการเผชิญหน้าผู้เล่นในช่องเดียวกัน (Multi-Player PvP Encounter)
      const otherPlayersOnCell = next.players
        .map((p, idx) => ({ p, idx }))
        .filter(({ p, idx }) => idx !== state.currentPlayerIndex && p.isAlive && p.position === player.position);

      if (otherPlayersOnCell.length > 0) {
        const participantIndices = [state.currentPlayerIndex, ...otherPlayersOnCell.map((o) => o.idx)];
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

      return advanceTurn(next);
    }

    case "ROLL_DICE": {
      const dice = action.dice || rollDice();
      let next = movePlayer(state, state.currentPlayerIndex, dice);
      if (next.players[state.currentPlayerIndex]?.nextRollOverride) {
        const players = [...next.players];
        players[state.currentPlayerIndex] = { ...players[state.currentPlayerIndex], nextRollOverride: null };
        next = { ...next, players };
      }
      return next;
    }

    case "COMBAT_RESOLVE": {
      let next = resolveOneTurnCombat(state, action.combatResult);
      const combat = next.combatState;

      if (combat.resolved) {
        if (combat.playerDied) {
          next = handlePlayerDeath(next, combat.playerIndex);
        } else if (combat.monsterDied) {
          const players = [...next.players];
          const p = { ...players[combat.playerIndex] };
          const goldReward = combat.monster.isBoss ? 5000 : combat.monster.isElite ? 2000 : 500;
          p.gold += goldReward;
          players[combat.playerIndex] = p;
          const monsterCells = new Set(next.monsterCells);
          monsterCells.delete(combat.monster.cell);
          next = {
            ...next,
            players,
            monsterCells,
            phase: "play",
            combatState: null,
            log: [...next.log, `💰 ${p.name} ได้รับ ${goldReward.toLocaleString()} เหรียญ!`],
          };
          next = checkWin(next);
        }

        if (!next.winner) {
          next = advanceTurn(next);
        }
      }
      return next;
    }

    case "USE_SKILL": {
      const pIdx = action.playerIndex !== undefined ? action.playerIndex : state.currentPlayerIndex;
      return useSkill(state, pIdx, action.skillId, action.targetIndex);
    }

    case "USE_POTION": {
      const pIdx = action.playerIndex !== undefined ? action.playerIndex : state.currentPlayerIndex;
      return usePotion(state, pIdx, action.potionId);
    }

    case "BUY_ITEM": {
      return buyItem(state, state.currentPlayerIndex, action.itemType, action.itemId);
    }

    case "END_TURN": {
      return advanceTurn(state);
    }

    case "OPEN_SHOP": {
      return { ...state, shopOpen: true };
    }

    case "CLOSE_SHOP": {
      return { ...state, shopOpen: false };
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

      return advanceTurn({
        ...state,
        pvpEncounter: null,
      });
    }

    case "FLEE_COMBAT": {
      const player = state.players[state.currentPlayerIndex];
      if (player.pet?.effect === "dodge_once" && !player.dodgeUsed) {
        const players = [...state.players];
        players[state.currentPlayerIndex] = { ...player, dodgeUsed: true };
        return {
          ...state,
          players,
          phase: "play",
          combatState: null,
          log: [...state.log, `🏦 ${player.name} ใช้บัฟ "แบงค์" หนีการต่อสู้!`],
        };
      }
      return state;
    }

    case "START_TITLE": {
      return { ...state, phase: "title" };
    }

    case "START_NEW_GAME": {
      clearSavedGameState();
      return {
        ...createInitialGameState(),
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
        (item, rank) => `#${rank + 1} ${item.player.emoji} ${item.player.name} (ทอยได้ ${item.score} แต้ม)`
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
        log: [...state.log, `👑 แอดมินสายเปย์แจกเงิน +${action.amount.toLocaleString()} Gold ให้บ้าน ${state.players[action.playerIndex].name}!`],
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
          p.armor = armor;
          itemLogName = armor.name;
        }
      } else if (itemType === "amulet") {
        const amulet = itemData || AMULET_POOL.find((a) => a.id === itemId);
        if (amulet) {
          p.amulet = amulet;
          itemLogName = amulet.name;
        }
      } else if (itemType === "potion") {
        const pot = POTIONS[itemId];
        if (p.potions.length < 5) {
          p.potions = [...p.potions, itemId];
        } else {
          p.potions = [...p.potions.slice(0, 4), itemId];
        }
        if (pot) itemLogName = pot.name;
      } else if (itemType === "skill") {
        const sk = SKILLS[itemId];
        if (!p.skills.includes(itemId)) {
          if (p.skills.length < 2) {
            p.skills = [...p.skills, itemId];
          } else {
            p.skills = [...p.skills.slice(0, 1), itemId];
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
        log: [...state.log, `👑 แอดมินสายเปย์มอบไอเทม "${itemLogName}" ให้บ้าน ${p.name}!`],
      };
    }

    case "ADMIN_REMOVE_ITEM": {
      const { playerIndex, itemType } = action;
      const players = [...state.players];
      const p = { ...players[playerIndex] };

      if (itemType === "wand") p.wand = null;
      if (itemType === "armor") p.armor = null;
      if (itemType === "amulet") p.amulet = null;
      if (itemType === "pet") p.pet = null;
      if (itemType === "clear_potions") p.potions = [];
      if (itemType === "clear_skills") p.skills = [];

      players[playerIndex] = p;
      return {
        ...state,
        players,
        log: [...state.log, `👑 แอดมินถอดไอเทม (${itemType}) จากบ้าน ${p.name}`],
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
        log: [...state.log, `⚡ 👑 PAY TO WIN GOD MODE: แอดมินเปย์จัดเต็ม VIP Gear ให้บ้าน ${p.name}!`],
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
        log: [...state.log, `💖 👑 แอดมินฟื้นฟู HP และคืนชีพให้บ้าน ${p.name}!`],
      };
    }

    case "LOAD_SAVED_STATE": {
      return action.savedState;
    }

    case "RESET": {
      clearSavedGameState();
      return createInitialGameState();
    }

    default:
      return state;
  }
}

// ─── Component ────────────────────────────────────────────────
export default function Home() {
  const [state, dispatch] = useReducer(gameReducer, null, createInitialGameState);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [hasSavedGame, setHasSavedGame] = useState(false);

  useEffect(() => {
    const saved = loadGameState();
    if (saved && (saved.phase === "play" || saved.phase === "combat")) {
      setHasSavedGame(true);
    }
    setHasHydrated(true);
  }, []);

  // บันทึกสถานะเกมลงใน localStorage อัตโนมัติทุกครั้งที่ State มีการเปลี่ยนแปลง (เฉพาะหลังจาก Hydrate แล้ว)
  useEffect(() => {
    if (hasHydrated && state) {
      // Do not overwrite an existing resumable game while the title screen is open.
      // A title state is only a UI state, not a playable save point.
      if (state.phase !== "title") {
        saveGameState(state);
      }
    }
  }, [state, hasHydrated]);

  const [isRolling, setIsRolling] = useState(false);
  const [tempDice, setTempDice] = useState(null);
  const [logCollapsed, setLogCollapsed] = useState(false);
  const [playersCollapsed, setPlayersCollapsed] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [bgmMuted, setBgmMuted] = useState(false);
  const [resetDiceKey, setResetDiceKey] = useState(0);

  const currentPlayer = getCurrentPlayer(state);
  const canRoll = state.phase === "play" && !state.shopOpen && !state.combatState && !state.winner && !isRolling;

  function handleRoll() {
    if (!canRoll) return;

    setIsRolling(true);
    const player = state.players[state.currentPlayerIndex];
    let rolledVal = Math.floor(Math.random() * 6) + 1;
    if (player?.nextRollOverride) {
      rolledVal = player.nextRollOverride;
    }

    // สุ่มแต้มเดียวส่งเข้า State ทันที ล็อกให้ 3D Dice และการเดินหมากเป็นแต้มเดียวกัน 100%
    setTempDice(rolledVal);

    // หน่วงเวลา 600ms ให้ลูกเต๋า 3D กระเด้งแบบกระฉับกระเฉง รองรับคอมสเปกต่ำ
    setTimeout(() => {
      // ย้ายตำแหน่งตัวหมากบนกระดานตาม rolledVal ที่ออกจริง
      dispatch({ type: "ROLL_DICE", dice: rolledVal });

      // หน่วงเวลา 1.5 วินาทีให้หมากก้าวเดิน 3D บนกระดานตามแต้ม rolledVal
      setTimeout(() => {
        dispatch({ type: "MOVE_AND_CHECK" });
        setIsRolling(false);
        setTempDice(null);
      }, 1500);
    }, 600);
  }

  function handleEndTurn() {
    dispatch({ type: "END_TURN" });
  }

  // Dice face emoji
  const DICE_FACES = ["", "⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
  const displayDiceVal = isRolling ? tempDice : state.diceResult;
  const diceFace = displayDiceVal ? DICE_FACES[displayDiceVal] : "🎲";

  return (
    <div className="game-shell relative w-screen h-screen overflow-hidden bg-[#070912]">

      {/* ── 3D Canvas (Full Screen Viewport) ───────────────────── */}
      {state.phase !== "title" && (
        <div className="absolute inset-0 z-0">
          <BoardCanvas
            players={state.players}
            revealedMonsters={state.revealedMonsters}
            monsterCells={state.monsterCells}
            monsterMap={state.monsterMap}
            cellTeleport={state.cellTeleport}
            trapCells={state.trapCells}
            usedLadders={state.usedLadders}
            currentPlayerIndex={state.currentPlayerIndex}
            phase={state.phase}
            isRolling={isRolling}
            diceResult={displayDiceVal || state.diceResult}
            onRoll={handleRoll}
            canRoll={canRoll}
            resetDiceKey={resetDiceKey}
          />
        </div>
      )}

      {/* ── Dice Result Overlay (HTML ป้ายแต้มลูกเต๋ากลางจอ ตรง 100%) ──── */}
      {isRolling && displayDiceVal && (
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
          <div style={{
            background: 'radial-gradient(circle, rgba(15,23,42,0.92) 40%, rgba(15,23,42,0.6) 70%, transparent 100%)',
            borderRadius: '50%',
            width: '180px',
            height: '180px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            border: '4px solid rgba(251,191,36,0.5)',
            boxShadow: '0 0 60px rgba(251,191,36,0.3), 0 0 120px rgba(245,158,11,0.15)',
            animation: 'dice-pop 0.3s ease-out',
          }}>
            <div style={{
              fontSize: '80px',
              fontWeight: 900,
              color: '#fbbf24',
              fontFamily: 'monospace',
              textShadow: '0 0 30px #fbbf24, 0 0 60px #f59e0b',
              lineHeight: 1,
            }}>
              {displayDiceVal}
            </div>
            <div style={{
              fontSize: '14px',
              color: 'rgba(251,191,36,0.7)',
              fontWeight: 700,
              marginTop: '4px',
              letterSpacing: '2px',
            }}>
              เดิน {displayDiceVal} ช่อง
            </div>
          </div>
        </div>
      )}

      {/* ── 3D UI Overlays Layer (pointer-events-none เพื่อไม่ให้บังการคุม 3D) ─ */}
      {state.phase !== "title" && (
        <div className="relative z-10 w-full h-full p-4 flex flex-col justify-between pointer-events-none overflow-hidden">

          {/* ── Top Floating Bar: Action Buttons + Admin + Game Title + BGM Controller ────────────── */}
          <div className="flex items-center justify-end w-full gap-2 pointer-events-auto">
            {/* Background Music Player */}
            <BgmPlayer isMuted={bgmMuted} hideFloatingButton={true} />

            {/* Quick Action Emoji Buttons (Admin, Shop, Reset Dice) */}
            <div className="flex items-center gap-2">
              {/* Admin Floating Button */}
              <button
                onClick={() => setAdminOpen((o) => !o)}
                className={`w-10 h-10 rounded-2xl flex items-center justify-center text-base font-bold transition-all duration-200 backdrop-blur-md ${
                  adminOpen
                    ? "bg-amber-500/30 border-2 border-amber-400 text-amber-200 shadow-[0_0_20px_rgba(240,184,91,0.4)] scale-105"
                    : "bg-slate-950/80 border border-white/15 text-slate-300 hover:border-amber-400/50 hover:bg-amber-500/10 hover:scale-105 shadow-lg"
                }`}
                title="เมนูแอดมิน"
              >
                👑
              </button>

              {/* Shop Button */}
              <button
                onClick={() => dispatch({ type: "OPEN_SHOP" })}
                disabled={!!state.combatState}
                className="w-10 h-10 rounded-2xl flex items-center justify-center text-base font-bold transition-all duration-200 backdrop-blur-md bg-slate-950/80 border border-white/15 text-yellow-300 hover:border-yellow-400/50 hover:bg-yellow-500/10 hover:scale-105 shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
                title="เปิดร้านค้าฮอกปด"
              >
                🏪
              </button>

              {/* Reset Dice Button */}
              <button
                onClick={() => setResetDiceKey((k) => k + 1)}
                disabled={isRolling}
                className="w-10 h-10 rounded-2xl flex items-center justify-center text-base font-bold transition-all duration-200 backdrop-blur-md bg-slate-950/80 border border-white/15 text-cyan-300 hover:border-cyan-400/50 hover:bg-cyan-500/10 hover:scale-105 shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
                title="รีเซ็ตลูกเต๋า 3D กลับสู่ตำแหน่งเริ่มต้น"
              >
                🔄
              </button>
            </div>

            {/* Game Title & Round Badge */}
            <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-slate-950/80 border border-amber-500/30 backdrop-blur-md shadow-[0_0_25px_rgba(240,184,91,0.15)]">
              <span className="text-xl animate-pulse">🏰</span>
              <div>
                <div className="text-xs font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-500 uppercase">
                  ห้องแห่งความลับ
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-400/90">
                  <span>รอบที่ {state.round}</span>
                  <span className="text-white/20">•</span>
                  <span className="text-cyan-400">ตาที่ {state.turn}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Left Floating Layer: Player Cards Panel ─ */}
          <div className="absolute top-20 left-4 bottom-6 z-10 w-80 max-w-[calc(100vw-2rem)] flex flex-col gap-3 pointer-events-auto overflow-y-auto pr-1 custom-scrollbar">
            {playersCollapsed ? (
              <div className="players-mini-bar flex-col gap-2 bg-slate-950/85 backdrop-blur-xl border border-white/10 p-2.5 rounded-2xl">
                <div className="flex justify-between items-center w-full pb-1 border-b border-white/10">
                  <span className="text-xs font-bold text-slate-300">ผู้เล่นทั้งหมด ({state.players.length})</span>
                  <button
                    onClick={() => setPlayersCollapsed(false)}
                    className="panel-collapse-btn text-xs"
                    title="แสดงการ์ดบ้าน"
                  >
                    ▼
                  </button>
                </div>
                <div className="flex flex-col gap-1.5 w-full">
                  {state.players.map((p, i) => {
                    const hpPct = Math.max(0, (p.hp / p.maxHp) * 100);
                    const active = i === state.currentPlayerIndex && state.phase === "play";
                    return (
                      <div
                        key={p.houseId}
                        className={`player-mini-chip w-full ${active ? "player-mini-chip-active" : ""}`}
                        style={{ "--house-color": p.color }}
                        title={`${p.name} · HP ${Math.max(0, p.hp)}/${p.maxHp} · ช่อง ${p.position} · ${p.gold.toLocaleString()} Gold`}
                      >
                        <span className="text-sm">{p.emoji}</span>
                        <div className="player-mini-info flex-1">
                          <div className="player-mini-name">{p.nameEn}</div>
                          <div className="player-mini-hp">
                            <div
                              className="player-mini-hp-fill"
                              style={{
                                width: `${hpPct}%`,
                                backgroundColor: hpPct > 50 ? "#22c55e" : hpPct > 25 ? "#eab308" : "#ef4444",
                              }}
                            />
                          </div>
                        </div>
                        <span className="player-mini-pos">#{p.position}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2 flex-shrink-0">
                <div className="flex justify-between items-center px-1">
                  <span className="text-xs font-bold text-amber-300/80">ข้อมูลผู้เล่น</span>
                  <button
                    onClick={() => setPlayersCollapsed(true)}
                    className="text-xs text-white/50 hover:text-white bg-slate-900/60 px-2 py-0.5 rounded-lg border border-white/10"
                    title="ย่อการ์ดบ้าน"
                  >
                    ▲ พับเก็บ
                  </button>
                </div>
                <div className="flex flex-col gap-2.5">
                  {state.players.map((p, i) => (
                    <PlayerCard
                      key={p.houseId}
                      player={p}
                      playerIndex={i}
                      isActive={i === state.currentPlayerIndex && state.phase === "play"}
                      onUseSkill={(skillId, pIdx) => dispatch({ type: "USE_SKILL", skillId, playerIndex: pIdx })}
                      onUsePotion={(potionId, pIdx) => dispatch({ type: "USE_POTION", potionId, playerIndex: pIdx })}
                    />
                  ))}
                </div>
              </div>
            )}
        </div>

        {/* ── Right Floating Layer: Floating Game Log (History) ด้านขวา ─ */}
        <div className="absolute top-20 right-4 bottom-6 z-10 w-72 pointer-events-auto max-h-[60vh] flex flex-col">
          <GameLog
            log={state.log}
            collapsed={logCollapsed}
            onToggleCollapse={() => setLogCollapsed((c) => !c)}
          />
        </div>

      </div>
      )}

      {/* Admin Modal Popover */}
      {adminOpen && (
        <AdminModal
          players={state.players}
          onDispatch={dispatch}
          onClose={() => setAdminOpen(false)}
          isBgmMuted={bgmMuted}
          onToggleBgm={() => setBgmMuted((m) => !m)}
        />
      )}

      {/* ── Title Screen (Intro Splash Screen) ──────────────────── */}
      {state.phase === "title" && (
        <TitleScreen
          onStartNewGame={() => dispatch({ type: "START_NEW_GAME" })}
          hasSavedGame={hasSavedGame}
          onContinueGame={() => {
            const saved = loadGameState();
            if (saved) {
              dispatch({ type: "LOAD_SAVED_STATE", savedState: saved });
            } else {
              dispatch({ type: "START_NEW_GAME" });
            }
          }}
        />
      )}

      {/* ── Pre-Game Setup Modal ───────────────────────────────── */}
      {state.phase === "setup" && (
        <SetupModal
          players={state.players}
          onCompleteSetup={(updatedPlayers) => {
            dispatch({ type: "COMPLETE_SETUP", players: updatedPlayers });
          }}
        />
      )}

      {/* ── Initiative Roll Modal (Auto Roll Turn Order) ──────── */}
      {state.phase === "initiative" && (
        <InitiativeModal
          initiativeRolls={state.initiativeRolls}
          onStartPlay={() => dispatch({ type: "START_PLAY" })}
        />
      )}

      {/* ── Shop Modal ─────────────────────────────────────────── */}
      {state.shopOpen && (
        <ShopModal
          player={currentPlayer}
          onBuy={(itemType, itemId) => {
            dispatch({ type: "BUY_ITEM", itemType, itemId });
          }}
          onClose={() => dispatch({ type: "CLOSE_SHOP" })}
        />
      )}

      {/* ── PvP Encounter Modal ───────────────────────────────── */}
      {state.pvpEncounter && (
        <PvpCombatModal
          pvpEncounter={state.pvpEncounter}
          players={state.players}
          onPvpAction={(actionPayload) => dispatch({ type: "PVP_ACTION", ...actionPayload })}
        />
      )}

      {/* ── Combat Modal ───────────────────────────────────────── */}
      {state.phase === "combat" && state.combatState && !state.combatState.resolved && (
        <CombatModal
          combatState={state.combatState}
          player={currentPlayer}
          onResolveCombat={(combatResult) => dispatch({ type: "COMBAT_RESOLVE", combatResult })}
          onUseSkill={(skillId) => dispatch({ type: "USE_SKILL", skillId })}
          onFlee={
            currentPlayer.pet?.effect === "dodge_once" && !currentPlayer.dodgeUsed
              ? () => dispatch({ type: "FLEE_COMBAT" })
              : null
          }
        />
      )}

      {/* ── Win Screen ─────────────────────────────────────────── */}
      {state.winner && (
        <div className="win-overlay">
          <div className="text-6xl animate-bounce">🏆</div>
          <div className="win-title">{state.winner.name}</div>
          <div className="text-xl text-white/80 font-bold">ชนะการแข่งขัน!</div>
          <div className="text-white/50 text-sm">สามารถเอาชนะบอสมหาเวทย์ได้สำเร็จ!</div>
          <button
            onClick={() => dispatch({ type: "RESET" })}
            className="btn-primary mt-6 text-base px-10 py-4"
          >
            🔄 เล่นใหม่
          </button>
        </div>
      )}
    </div>
  );
}
