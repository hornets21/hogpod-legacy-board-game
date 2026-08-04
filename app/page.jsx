"use client";

import { useCallback, useReducer, useRef, useState } from "react";
import dynamic from "next/dynamic";
import PlayerCard from "@/components/PlayerCard";
import SetupModal from "@/components/SetupModal";
import ShopModal from "@/components/ShopModal";
import CombatModal from "@/components/CombatModal";
import GameLog from "@/components/GameLog";

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
} from "@/lib/gameEngine";

import { MONSTER_MAP } from "@/lib/gameData";

// ─── Reducer ─────────────────────────────────────────────────
function gameReducer(state, action) {
  switch (action.type) {
    case "MOVE_AND_CHECK": {
      const player = state.players[state.currentPlayerIndex];
      const monster = MONSTER_MAP[player.position];
      const revealedMonsters = { ...state.revealedMonsters };

      if (state.monsterCells.has(player.position) && monster) {
        revealedMonsters[player.position] = monster;
        let next = { ...state, revealedMonsters };

        // Check if player can dodge (Bank pet)
        const hasDodge = player.pet?.effect === "dodge_once" && !player.dodgeUsed;

        // Enter combat
        next = initCombat(next, state.currentPlayerIndex, monster);
        if (hasDodge) {
          next = { ...next, activeSkillEffect: "dodge_available" };
        }
        return next;
      }
      return state;
    }

    case "ROLL_DICE": {
      const dice = rollDice();
      let next = movePlayer(state, state.currentPlayerIndex, dice);

      // Check trap
      const player = next.players[state.currentPlayerIndex];
      if (next.trapCells?.[player.position]) {
        const trapOwner = next.trapCells[player.position].houseId;
        if (trapOwner !== player.houseId) {
          const p = { ...next.players[state.currentPlayerIndex], hp: 0 };
          const players = [...next.players];
          players[state.currentPlayerIndex] = p;
          next = { ...next, players };
          next = handlePlayerDeath(next, state.currentPlayerIndex);
          next = { ...next, log: [...next.log, `☠️ ${player.name} เหยียบกับดักยาพิษ!`] };
          return next;
        }
      }

      // Win check
      next = checkWin(next);

      // Advance turn if no monster at destination
      if (!next.winner && !next.monsterCells.has(player.position) && next.phase === "play") {
        next = advanceTurn(next);
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
          if (!next.winner) {
            next = advanceTurn(next);
          }
        }
      }
      return next;
    }

    case "USE_SKILL": {
      return useSkill(state, state.currentPlayerIndex, action.skillId, action.targetIndex);
    }

    case "USE_POTION": {
      return usePotion(state, state.currentPlayerIndex, action.potionId);
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

    case "COMPLETE_SETUP": {
      return {
        ...state,
        players: action.players,
        phase: "play",
        log: [...state.log, "🎮 ติดตั้งอุปกรณ์และเตรียมความพร้อมเรียบร้อย เริ่มการแข่งขันห้องแห่งความลับ!"],
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
        log: [...state.log, `👑 แอดมินแจกเงิน +${action.amount.toLocaleString()} Gold ให้บ้าน ${state.players[action.playerIndex].name}!`],
      };
    }

    case "RESET": {
      return createInitialGameState();
    }

    default:
      return state;
  }
}

// ─── Component ────────────────────────────────────────────────
export default function Home() {
  const [state, dispatch] = useReducer(gameReducer, null, createInitialGameState);
  const [isRolling, setIsRolling] = useState(false);
  const [tempDice, setTempDice] = useState(null);
  const [logCollapsed, setLogCollapsed] = useState(false);
  const [playersCollapsed, setPlayersCollapsed] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);

  const currentPlayer = getCurrentPlayer(state);
  const canRoll = state.phase === "play" && !state.shopOpen && !state.combatState && !state.winner && !isRolling;

  function handleRoll() {
    if (!canRoll) return;

    setIsRolling(true);

    // Step 1: Animate dice faces for 1.2 seconds
    let count = 0;
    const interval = setInterval(() => {
      setTempDice(Math.floor(Math.random() * 6) + 1);
      count += 1;
      if (count >= 10) {
        clearInterval(interval);
        setTempDice(null);

        // Step 2: Dispatch ROLL_DICE to move player position on 3D board
        dispatch({ type: "ROLL_DICE" });

        // Step 3: Wait 2.2s for 3D token walk animation to finish completely before triggering monster combat modal
        setTimeout(() => {
          dispatch({ type: "MOVE_AND_CHECK" });
          setIsRolling(false);
        }, 2200);
      }
    }, 120);
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
      <div className="absolute inset-0 z-0">
        <BoardCanvas
          players={state.players}
          revealedMonsters={state.revealedMonsters}
          trapCells={state.trapCells}
          currentPlayerIndex={state.currentPlayerIndex}
          phase={state.phase}
          isRolling={isRolling}
          diceResult={state.diceResult}
        />
      </div>

      {/* ── 3D UI Overlays Layer (pointer-events-none เพื่อไม่ให้บังการคุม 3D) ─ */}
      <div className="relative z-10 w-full h-full p-4 flex flex-col justify-between pointer-events-none overflow-hidden">

        {/* ── Top Floating Bar: Admin + Game Title ────────────── */}
        <div className="flex items-center justify-end w-full gap-3 pointer-events-auto">
          {/* Admin Floating Button */}
          <div>
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
          </div>

          {/* Game Title & Round Badge (อยู่ต่อด้านขวาของปุ่ม admin) */}
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

        {/* ── Middle Layer: Floating Game Log (History) ด้านขวา ─ */}
        <div className="absolute top-20 right-4 bottom-28 z-10 w-72 pointer-events-auto max-h-[60vh] flex flex-col">
          <GameLog
            log={state.log}
            collapsed={logCollapsed}
            onToggleCollapse={() => setLogCollapsed((c) => !c)}
          />
        </div>

        {/* ── Bottom Floating Layer: Turn Control + Player Cards ─ */}
        <div className="w-full flex flex-col gap-3 pointer-events-auto mt-auto max-w-6xl mx-auto">

          {/* Turn Indicator & Controls HUD */}
          <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-2xl backdrop-blur-xl bg-slate-950/85 border border-white/15 shadow-2xl">
            {/* Active House Info */}
            <div
              className="turn-indicator flex items-center gap-3 px-3 py-1.5 rounded-xl flex-1 max-w-xs"
              style={{ "--house-color": currentPlayer.color }}
            >
              <span className="text-2xl">{currentPlayer.emoji}</span>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-black text-white truncate">{currentPlayer.name}</div>
                <div className="text-[9px] text-white/70 font-semibold truncate">ตาเดินของ {currentPlayer.nameEn}</div>
              </div>
            </div>

            {/* Dice & Action Controls */}
            <div className="flex items-center gap-2">
              <div className={`dice-display text-xl w-12 h-12 ${isRolling ? "animate-shake scale-110" : ""}`}>
                {diceFace}
              </div>
              <button
                onClick={handleRoll}
                disabled={!canRoll}
                className="btn-primary text-xs px-5 py-3 shadow-xl font-black"
              >
                {isRolling ? "🎲 กำลังทอย..." : "🎲 ทอยลูกเต๋า"}
              </button>
              <button
                onClick={handleEndTurn}
                disabled={state.phase !== "play" || isRolling || !!state.combatState}
                className="btn-secondary text-xs px-3 py-3 shadow-xl backdrop-blur-md bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20 font-bold"
                title="จบเทิร์นและส่งต่อตาเดินให้บ้านถัดไป"
              >
                ⏭️ จบเทิร์น
              </button>
              <button
                onClick={() => dispatch({ type: "OPEN_SHOP" })}
                disabled={!!state.combatState}
                className="btn-secondary text-xs px-3.5 py-3 shadow-xl backdrop-blur-md bg-slate-950/80"
              >
                🏪 ร้านค้า
              </button>
            </div>
          </div>

          {/* Bottom Player Panels (พับได้) */}
          {playersCollapsed ? (
            <div className="players-mini-bar flex-shrink-0 bg-slate-950/85 backdrop-blur-xl border border-white/10">
              <div className="flex items-center gap-2 flex-1 overflow-x-auto">
                {state.players.map((p, i) => {
                  const hpPct = Math.max(0, (p.hp / p.maxHp) * 100);
                  const active = i === state.currentPlayerIndex && state.phase === "play";
                  return (
                    <div
                      key={p.houseId}
                      className={`player-mini-chip ${active ? "player-mini-chip-active" : ""}`}
                      style={{ "--house-color": p.color }}
                      title={`${p.name} · HP ${Math.max(0, p.hp)}/${p.maxHp} · ช่อง ${p.position} · ${p.gold.toLocaleString()} Gold`}
                    >
                      <span className="text-sm">{p.emoji}</span>
                      <div className="player-mini-info">
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
              <button
                onClick={() => setPlayersCollapsed(false)}
                className="panel-collapse-btn flex-shrink-0"
                title="แสดงการ์ดบ้าน"
              >
                ▲
              </button>
            </div>
          ) : (
            <div className="relative flex-shrink-0">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {state.players.map((p, i) => (
                  <PlayerCard
                    key={p.houseId}
                    player={p}
                    isActive={i === state.currentPlayerIndex && state.phase === "play"}
                    onUseSkill={(skillId) => dispatch({ type: "USE_SKILL", skillId })}
                    onUsePotion={(potionId) => dispatch({ type: "USE_POTION", potionId })}
                  />
                ))}
              </div>
              <button
                onClick={() => setPlayersCollapsed(true)}
                className="players-collapse-toggle"
                title="พับการ์ดบ้าน"
              >
                ▼ พับการ์ดบ้าน
              </button>
            </div>
          )}
        </div>

      </div>

      {/* Admin Modal Popover */}
      {adminOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in pointer-events-auto">
          <div className="relative w-full max-w-sm bg-slate-950/95 border-2 border-amber-500/40 rounded-3xl p-6 shadow-[0_0_50px_rgba(240,184,91,0.2)]">
            <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">👑</span>
                <h3 className="font-black text-white text-base">คำสั่งเมนูแอดมิน</h3>
              </div>
              <button
                onClick={() => setAdminOpen(false)}
                className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white/70 hover:text-white flex items-center justify-center font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="text-xs font-black uppercase tracking-wider text-amber-400/90 mb-3">
              💰 แจกเงิน +2,000 Gold ให้บ้าน:
            </div>

            <div className="grid grid-cols-2 gap-2 mb-5">
              {state.players.map((p, idx) => (
                <button
                  key={p.houseId}
                  onClick={() => dispatch({ type: "ADMIN_ADD_GOLD", playerIndex: idx, amount: 2000 })}
                  className="text-xs font-black px-3 py-2.5 rounded-xl border border-white/15 hover:border-amber-400 hover:scale-[1.02] transition-all text-white flex items-center gap-2 shadow-md"
                  style={{ backgroundColor: `${p.color}35` }}
                  title={`แจก +2,000 Gold ให้ ${p.name}`}
                >
                  <span className="text-base">{p.emoji}</span>
                  <span className="truncate">{p.nameEn}</span>
                </button>
              ))}
            </div>

            <button
              onClick={() => { setAdminOpen(false); dispatch({ type: "RESET" }); }}
              className="w-full py-3 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-300 font-black text-xs transition-all shadow-lg flex items-center justify-center gap-2"
            >
              <span>🔄</span> Reset เกมเริ่มต้นใหม่
            </button>
          </div>
        </div>
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
