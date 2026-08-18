"use client";

import { useCallback, useEffect, useReducer, useRef, useState, Suspense } from "react";
import dynamic from "next/dynamic";
import { motion, useAnimation } from "motion/react";
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
import SettingsModal from "@/components/SettingsModal";
import SkillTargetPicker from "@/components/SkillTargetPicker";
import TrapCellPicker from "@/components/TrapCellPicker";
import MobaAutoGoldWidget from "@/components/MobaAutoGoldWidget";
import NpcSpawnWidget from "@/components/NpcSpawnWidget";
import NpcSkillModal from "@/components/NpcSkillModal";
import NpcPetModal from "@/components/NpcPetModal";
import NpcDoctorModal from "@/components/NpcDoctorModal";
import BingoWidget from "@/components/BingoWidget";
import BingoWinModal from "@/components/BingoWinModal";
import TeleportModal from "@/components/TeleportModal";
import { generateBingoCard, checkPlayerBingo } from "@/lib/bingoEngine";
import { on, FX_EVENTS, emitDiceRoll, emitStepMove, emitShopBuy, emitGoldGain, emitHeal, emitTrapTrigger } from "@/lib/skillFxBus";

// กระดาน 3D (WebGL) — โหลดฝั่ง client เท่านั้น
const BoardCanvas = dynamic(() => import("@/components/board3d/BoardCanvas"), {
  ssr: false,
  loading: () => (
    <div className="board3d-loading">Loading 3D board...</div>
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

import { useRouter } from "next/navigation";
import { gameReducer, skillNeedsTarget } from "@/lib/gameReducer";
import { POTIONS } from "@/lib/gameData";

// ─── Component ────────────────────────────────────────────────
export default function Home() {
  const router = useRouter();
  const [state, dispatch] = useReducer(gameReducer, null, createInitialGameState);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [hasSavedGame, setHasSavedGame] = useState(false);

  useEffect(() => {
    const saved = loadGameState();
    if (saved && (saved.phase === "play" || saved.phase === "combat" || saved.phase === "setup" || saved.phase === "initiative")) {
      setHasSavedGame(true);
      dispatch({ type: "LOAD_SAVED_STATE", savedState: saved });
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

  // MOBA Passive Gold Interval Effect
  useEffect(() => {
    if (!hasHydrated || !state) return;
    if (state.phase === "title" || state.phase === "setup" || state.phase === "initiative" || state.winner) {
      return;
    }
    if (state.autoGoldEnabled === false) return;

    const intervalMs = (state.autoGoldInterval || 10) * 1000;
    const timer = setInterval(() => {
      dispatch({ type: "PASSIVE_GOLD_TICK" });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [hasHydrated, state?.phase, state?.winner, state?.autoGoldEnabled, state?.autoGoldInterval]);

  // NPC Respawn Timer Ticker (Every 1 Second)
  useEffect(() => {
    if (!hasHydrated || !state) return;
    if (state.phase === "title" || state.phase === "setup" || state.phase === "initiative" || state.winner) {
      return;
    }

    const timer = setInterval(() => {
      dispatch({ type: "TICK_SECOND" });
    }, 1000);

    return () => clearInterval(timer);
  }, [hasHydrated, state?.phase, state?.winner]);

  const [isRolling, setIsRolling] = useState(false);
  const [tempDice, setTempDice] = useState(null);
  const [logCollapsed, setLogCollapsed] = useState(false);
  const [playersCollapsed, setPlayersCollapsed] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [bgmMuted, setBgmMuted] = useState(false);
  const [bgmVolume, setBgmVolume] = useState(() => {
    if (typeof window === "undefined") return 0.2;
    const saved = Number.parseFloat(localStorage.getItem("podBoardGame_bgmVolume"));
    return Number.isFinite(saved) ? Math.max(0, Math.min(1, saved)) : 0.2;
  });
  const [resetDiceKey, setResetDiceKey] = useState(0);
  const [pendingSkill, setPendingSkill] = useState(null); // { playerIndex, skillId }
  const [pendingTrap, setPendingTrap] = useState(null); // { playerIndex } — ยาพิชี้ช่องวางกับดัก

  useEffect(() => {
    localStorage.setItem("podBoardGame_bgmVolume", bgmVolume.toString());
  }, [bgmVolume]);

  // Always confirm skills through the picker first. If a skill does not require
  // a target, the picker still acts as a confirmation dialog.
  function handleSkillRequest(playerIndex, skillId) {
    setPendingSkill({ playerIndex, skillId });
  }

  function handleSkillConfirm({ targetIndex, monsterCell }) {
    if (!pendingSkill) return;
    const { playerIndex, skillId } = pendingSkill;
    // monsterCell is used by skills that target a board cell (e.g. skunk_blast)
    dispatch({
      type: "USE_SKILL",
      skillId,
      playerIndex,
      targetIndex,
      monsterCell,
    });
    setPendingSkill(null);
  }

  function handleSkillCancel() {
    setPendingSkill(null);
  }

  // ยาพิษ — แยกการ dispatch ออกจากยาอื่นเพราะต้องเลือกช่องก่อนวางกับดัก
  function handlePotionRequest(playerIndex, potionId) {
    if (potionId === "poison") {
      setPendingTrap({ playerIndex });
      return;
    }
    dispatch({ type: "USE_POTION", potionId, playerIndex });
  }

  function handleTrapConfirm({ targetCell }) {
    if (!pendingTrap) return;
    dispatch({
      type: "USE_POTION",
      potionId: "poison",
      playerIndex: pendingTrap.playerIndex,
      targetCell,
    });
    setPendingTrap(null);
  }

  function handleTrapCancel() {
    setPendingTrap(null);
  }

  // ── Screen Shake controller (เล็กน้อย) ──
  const shakeControls = useAnimation();
  useEffect(() => {
    const u1 = on(FX_EVENTS.DAMAGE_DEALT, (p) => {
      // shear shake เล็กน้อยเมื่อโดนดาเมจ
      shakeControls.start({
        x: [0, -3, 2, -2, 0],
        y: [0, 2, -2, 1, 0],
        transition: { duration: 0.18, ease: "easeOut" },
      });
    });
    const u2 = on(FX_EVENTS.SKILL_CAST, () => {
      // shake นิดหน่อยสำหรับ cast (สั้นกว่า)
      shakeControls.start({
        x: [0, -2, 2, 0],
        transition: { duration: 0.1, ease: "easeOut" },
      });
    });
    return () => { u1(); u2(); };
  }, [shakeControls]);

  const currentPlayer = getCurrentPlayer(state);
  const isCurrentPlayerDead = currentPlayer && (currentPlayer.hp <= 0 || !currentPlayer.isAlive);
  const canRoll = state.phase === "play" && !state.shopOpen && !state.combatState && !state.winner && !isRolling && !isCurrentPlayerDead && !state.teleportModalData;

  const handleConfirmTeleport = useCallback(() => {
    if (!state.teleportModalData) return;

    const isLadder = state.teleportModalData.type === "ladder";
    if (isLadder) {
      emitStepMove();
    } else {
      emitTrapTrigger();
    }

    dispatch({ type: "CONFIRM_TELEPORT" });

    setTimeout(() => {
      dispatch({ type: "RESOLVE_TELEPORT_LANDING" });
    }, 1400);
  }, [state.teleportModalData]);

  function handleRoll() {
    if (!canRoll) return;

    setIsRolling(true);
    emitDiceRoll();
    const player = state.players[state.currentPlayerIndex];
    let rolledVal = rollDice(6);
    if (player?.nextRollOverride) {
      rolledVal = player.nextRollOverride;
    }

    // สุ่มแต้มเดียวส่งเข้า State ทันที ล็อกให้ 3D Dice และการเดินหมากเป็นแต้มเดียวกัน 100%
    setTempDice(rolledVal);

    // หน่วงเวลา 600ms ให้ลูกเต๋า 3D กระเด้งแบบกระฉับกระเฉง รองรับคอมสเปกต่ำ
    setTimeout(() => {
      // ย้ายตำแหน่งตัวหมากบนกระดานตาม rolledVal ที่ออกจริง
      dispatch({ type: "ROLL_DICE", dice: rolledVal });
      emitStepMove();

      // หน่วงเวลาตามจำนวนก้าวเดินจริง (400ms ต่อช่อง + 400ms ลงพื้น) เพื่อให้หมากเดินถึงช่องเป้าหมายก่อนเปิด Modal
      const walkDurationMs = Math.max(1200, rolledVal * 400 + 400);
      setTimeout(() => {
        dispatch({ type: "MOVE_AND_CHECK" });
        setIsRolling(false);
        setTempDice(null);
      }, walkDurationMs);
    }, 600);
  }

  function handleEndTurn() {
    dispatch({ type: "END_TURN" });
  }

  // Dice face emoji
  const DICE_FACES = ["", "⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
  const displayDiceVal = isRolling ? tempDice : state.diceResult;
  const diceFace = displayDiceVal ? DICE_FACES[displayDiceVal] : "🎲";

  if (!hasHydrated) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#050407] text-white select-none">
        <div className="w-12 h-12 mb-4 rounded-full border-4 border-amber-400/30 border-t-amber-400 animate-spin shadow-[0_0_30px_rgba(245,158,11,0.4)]" />
        <h2 className="text-xl font-black text-amber-400 tracking-wider mb-2">
          Loading...
        </h2>
      </div>
    );
  }

  return (
    <motion.div
      animate={shakeControls}
      className="game-shell relative w-screen h-screen overflow-hidden bg-black"
    >
      {/* ── Background Animated Video (Loop) ───────────────────── */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover z-0 opacity-90 pointer-events-none"
      >
        <source src="/images/system/magic_room_loop.webm" type="video/webm" />
      </video>

      {/* ── 3D Canvas (Full Screen Viewport) ───────────────────── */}
      {state.phase !== "title" && state.phase !== "initiative" && (
        <div className="absolute inset-0 z-0">
          <BoardCanvas
            players={state.players}
            revealedMonsters={state.revealedMonsters}
            monsterCells={state.monsterCells}
            monsterMap={state.monsterMap}
            cellTeleport={state.cellTeleport}
            trapCells={state.trapCells}
            usedLadders={state.usedLadders}
            npcs={state.npcs}
            currentPlayerIndex={state.currentPlayerIndex}
            phase={state.phase}
            isRolling={isRolling}
            diceResult={displayDiceVal || state.diceResult}
            onRoll={handleRoll}
            canRoll={canRoll}
            resetDiceKey={resetDiceKey}
            focusCell={state.combatState?.monster?.cell || state.pvpEncounter?.cell || null}
            isCombatActive={state.phase === "combat" || !!state.pvpEncounter}
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
              Move {displayDiceVal} steps
            </div>
          </div>
        </div>
      )}

      {/* ── 3D UI Overlays Layer (pointer-events-none เพื่อไม่ให้บังการคุม 3D) ─ */}
      {state.phase !== "title" && (
        <div className="relative z-10 w-full h-full p-4 flex flex-col justify-between pointer-events-none overflow-hidden">

          {/* ── Top Floating Bar: Action Buttons + Admin + Game Title + BGM Controller ────────────── */}
          <div className="flex items-center justify-between w-full gap-2 pointer-events-auto">
            {/* Right side: NPC Spawn, MOBA Gold, BGM, Admin & Game Title */}
            <div className="flex items-center gap-2 ml-auto">
              <NpcSpawnWidget state={state} />
              <MobaAutoGoldWidget state={state} onDispatch={dispatch} />
              <BgmPlayer isMuted={bgmMuted} volume={bgmVolume} hideFloatingButton={true} />

              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                className="w-10 h-10 rounded-2xl flex items-center justify-center text-base font-bold transition-all duration-200 backdrop-blur-md bg-slate-950/80 border border-white/15 text-slate-300 hover:border-amber-400/50 hover:bg-amber-500/10 hover:scale-105 shadow-lg"
                title="Audio & settings"
                aria-label="Open settings"
              >
                ⚙️
              </button>

              {/* Admin Floating Button */}
              <button
                onClick={() => setAdminOpen((o) => !o)}
                className={`w-10 h-10 rounded-2xl flex items-center justify-center text-base font-bold transition-all duration-200 backdrop-blur-md ${
                  adminOpen
                    ? "bg-amber-500/30 border-2 border-amber-400 text-amber-200 shadow-[0_0_20px_rgba(240,184,91,0.4)] scale-105"
                    : "bg-slate-950/80 border border-white/15 text-slate-300 hover:border-amber-400/50 hover:bg-amber-500/10 hover:scale-105 shadow-lg"
                }`}
                title="Admin Panel"
              >
                ⚙️
              </button>

              {/* Game Title & Round Badge */}
              <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-slate-950/80 border border-amber-500/30 backdrop-blur-md shadow-[0_0_25px_rgba(240,184,91,0.15)]">
                <div>
                  <div className="text-xs font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-500 uppercase">
                    Chamber of Secrets
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-400/90">
                    <span>Round {state.round}</span>
                    <span className="text-white/20">•</span>
                    <span className="text-cyan-400">Turn {state.turn}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Left Floating Layer: Player Cards Panel ─ */}
          <div className="absolute top-20 left-4 bottom-6 z-10 w-80 max-w-[calc(100vw-2rem)] flex flex-col gap-3 pointer-events-auto overflow-y-auto pr-1 custom-scrollbar">
            {playersCollapsed ? (
              <div className="players-mini-bar flex-col gap-2 bg-slate-950/85 backdrop-blur-xl border border-white/10 p-2.5 rounded-2xl">
                <div className="flex justify-between items-center w-full pb-1 border-b border-white/10">
                  <span className="text-xs font-bold text-slate-300">Players {state.players.length}</span>
                  <button
                    onClick={() => setPlayersCollapsed(false)}
                    className="panel-collapse-btn text-xs"
                    title="Show Player Cards"
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
                        title={`${p.name} · HP ${Math.max(0, p.hp)}/${p.maxHp} · Cell ${p.position} · ${p.gold.toLocaleString()} Gold`}
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
                  <span className="text-xs font-bold text-amber-300/80">Player Houses</span>
                  <button
                    onClick={() => setPlayersCollapsed(true)}
                    className="text-xs text-white/50 hover:text-white bg-slate-900/60 px-2 py-0.5 rounded-lg border border-white/10"
                    title="Collapse"
                  >
                    ▲ Collapse
                  </button>
                </div>
                <div className="flex flex-col gap-2.5">
                  {state.players.map((p, i) => (
                    <PlayerCard
                      key={p.houseId}
                      player={p}
                      playerIndex={i}
                      isActive={i === state.currentPlayerIndex && state.phase === "play"}
                      onUseSkill={(skillId, pIdx) => handleSkillRequest(pIdx !== undefined ? pIdx : i, skillId)}
                      onUsePotion={(potionId, pIdx) => handlePotionRequest(pIdx !== undefined ? pIdx : i, potionId)}
                    />
                  ))}
                </div>
              </div>
            )}
        </div>

        {/* ── Right Floating Layer: Floating Game Log (History) ด้านขวา ─ */}
        <div className="absolute top-20 right-4 bottom-6 z-10 w-72 pointer-events-none max-h-[60vh] flex flex-col items-end">
          <GameLog
            log={state.log}
            collapsed={logCollapsed}
            onToggleCollapse={() => setLogCollapsed((c) => !c)}
          />
        </div>

      </div>
      )}

      {/* ── Title Screen (Intro Splash Screen) ──────────────────── */}
      {state.phase === "title" && (
        <TitleScreen
          onStartNewGame={() => dispatch({ type: "START_NEW_GAME" })}
          onPlayOnline={() => router.push("/lobby")}
        />
      )}

      {/* ── Pre-Game Setup via Admin Modal (Primary Equipment & Player Config) ── */}
      {(state.phase === "setup" || adminOpen) && (
        <AdminModal
          state={state}
          players={state.players}
          onDispatch={dispatch}
          onClose={() => setAdminOpen(false)}
          onBackToTitle={() => dispatch({ type: "START_TITLE" })}
          isBgmMuted={bgmMuted}
          onToggleBgm={() => setBgmMuted((m) => !m)}
          bgmVolume={bgmVolume}
          onBgmVolumeChange={setBgmVolume}
          onConfirmSetup={
            state.phase === "setup"
              ? () => dispatch({ type: "COMPLETE_SETUP", players: state.players })
              : null
          }
        />
      )}

      {settingsOpen && (
        <SettingsModal
          onClose={() => setSettingsOpen(false)}
          bgmMuted={bgmMuted}
          onToggleBgm={() => setBgmMuted((m) => !m)}
          bgmVolume={bgmVolume}
          onBgmVolumeChange={setBgmVolume}
        />
      )}

      {/* ── Initiative Roll Modal (Auto Roll Turn Order) ──────── */}
      {state.phase === "initiative" && (
        <InitiativeModal
          initiativeRolls={state.initiativeRolls}
          isHost
          onStartPlay={() => dispatch({ type: "START_PLAY" })}
          onOpenAdmin={() => setAdminOpen(true)}
        />
      )}

      {/* ── Shop Modal ─────────────────────────────────────────── */}
      {state.shopOpen && (
        <ShopModal
          player={currentPlayer}
          onBuy={(itemType, itemId) => {
            emitShopBuy();
            dispatch({ type: "BUY_ITEM", itemType, itemId });
          }}
          onClose={() => dispatch({ type: "CLOSE_SHOP" })}
        />
      )}

      {/* ── Player Death Notice Modal ──────────────────────────── */}
      {state.phase === "play" && isCurrentPlayerDead && !state.shopOpen && !state.combatState && (
        <div className="modal-overlay z-40 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="modal-box max-w-md w-full bg-slate-950 border-2 border-red-500/80 rounded-3xl p-6 shadow-[0_0_50px_rgba(239,68,68,0.4)] text-center text-white flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-red-950/80 border-2 border-red-500 flex items-center justify-center text-3xl animate-bounce shadow-lg">
              💀
            </div>
            <div>
              <h3 className="text-xl font-black text-red-400">
                {currentPlayer.name} is Defeated!
              </h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Cannot move while defeated. Please use a Revive Potion or visit the shop to buy one.
              </p>
            </div>

            <div className="w-full flex flex-col gap-2.5 mt-2">
              {currentPlayer.potions?.includes("revive") ? (
                <button
                  onClick={() => dispatch({ type: "USE_POTION", potionId: "revive", playerIndex: state.currentPlayerIndex })}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-green-500 to-emerald-600 hover:from-emerald-500 hover:to-green-400 text-slate-950 font-black text-sm shadow-[0_0_20px_rgba(34,197,94,0.4)] border border-green-300 transition-all hover:scale-105"
                >
                  Use Revive Potion (+50 HP)
                </button>
              ) : (
                <button
                  onClick={() => dispatch({ type: "OPEN_SHOP" })}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 hover:from-amber-500 hover:to-yellow-400 text-slate-950 font-black text-sm shadow-[0_0_20px_rgba(245,158,11,0.4)] border border-amber-200 transition-all hover:scale-105"
                >
                  Visit Shop to Buy Revive Potion ({POTIONS.revive?.price?.toLocaleString() || "2,000"} Gold)
                </button>
              )}

              <button
                onClick={() => dispatch({ type: "RESPAWN_PLAYER", playerIndex: state.currentPlayerIndex })}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white font-bold text-xs border border-white/10 transition-all hover:scale-102 flex items-center justify-center gap-1.5"
              >
                <span>Return to Start (Cell 1)</span>
              </button>
            </div>
          </div>
        </div>
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
      {state.phase === "combat" && state.combatState && (
        <CombatModal
          combatState={state.combatState}
          player={currentPlayer}
          onResolveCombat={(combatResult) => dispatch({ type: "COMBAT_RESOLVE", combatResult })}
          onUseSkill={(skillId) =>
            dispatch({
              type: "USE_SKILL",
              skillId,
              playerIndex: state.currentPlayerIndex,
            })
          }
          onUsePotion={(potionId) => dispatch({ type: "USE_POTION", potionId })}
          onFlee={
            currentPlayer.pet?.effect === "dodge_once" && !currentPlayer.dodgeUsed
              ? () => dispatch({ type: "FLEE_COMBAT" })
              : null
          }
        />
      )}

      {/* ── Skill Target Picker / Confirm Dialog ──────────────── */}
      <SkillTargetPicker
        open={!!pendingSkill}
        skillId={pendingSkill?.skillId}
        casterIndex={pendingSkill?.playerIndex}
        players={state.players}
        monsterCells={state.monsterCells}
        onConfirm={handleSkillConfirm}
        onCancel={handleSkillCancel}
      />

      {/* ── Trap Cell Picker (ยาพิษ) ─────────────────────────── */}
      <TrapCellPicker
        open={!!pendingTrap}
        casterIndex={pendingTrap?.playerIndex}
        players={state.players}
        trapCells={state.trapCells}
        monsterCells={state.monsterCells}
        onConfirm={handleTrapConfirm}
        onCancel={handleTrapCancel}
      />



      {/* ── NPC Doctor Modal ────────────────────────────────────── */}
      {state.doctorModalData && (
        <NpcDoctorModal
          player={state.doctorModalData.player}
          grantedPotions={state.doctorModalData.grantedPotions}
          onClose={() => dispatch({ type: "CLOSE_DOCTOR_MODAL" })}
        />
      )}

      {/* ── NPC Skill Swap Modal ───────────────────────────────── */}
      {state.skillModalPlayer && (
        <NpcSkillModal
          player={state.skillModalPlayer}
          onConfirmSwap={(oldSkillId, newSkill) => {
            dispatch({ type: "SWAP_NPC_SKILL", oldSkillId, newSkill });
          }}
          onClose={() => dispatch({ type: "CLOSE_SKILL_MODAL" })}
        />
      )}

      {/* ── NPC Pet Swap Modal ─────────────────────────────────── */}
      {state.petModalPlayer && (
        <NpcPetModal
          player={state.petModalPlayer}
          onConfirmChangePet={(newPet) => {
            dispatch({ type: "CHANGE_NPC_PET", newPet });
          }}
          onClose={() => dispatch({ type: "CLOSE_PET_MODAL" })}
        />
      )}

      {/* ── Bingo Widget (แสดงเฉพาะบ้านที่มีป้าย Bingo มุมขวาล่าง) ── */}
      <BingoWidget players={state.players} currentPlayerIndex={state.currentPlayerIndex} />

      {/* ── Bingo Win Celebration Modal ──────────────────────────── */}
      {state.bingoWinModalData && (
        <BingoWinModal
          modalData={state.bingoWinModalData}
          onClose={() => dispatch({ type: "CLOSE_BINGO_WIN_MODAL" })}
        />
      )}

      {/* ── Teleport Notification Modal (Ladder / Snake Alert) ───── */}
      {state.teleportModalData && (
        <TeleportModal
          modalData={state.teleportModalData}
          onConfirm={handleConfirmTeleport}
        />
      )}

      {/* ── Win Screen ─────────────────────────────────────────── */}
      {state.winner && (
        <div className="win-overlay">
          <div className="text-6xl animate-bounce">🏆</div>
          <div className="win-title">{state.winner.name}</div>
          <div className="text-xl text-white/80 font-bold">Winner!</div>
          <div className="text-white/50 text-sm">Successfully defeated the Grand Sorcerer Boss!</div>
          <button
            onClick={() => dispatch({ type: "RESET" })}
            className="btn-primary mt-6 text-base px-10 py-4"
          >
            Play Again
          </button>
        </div>
      )}
    </motion.div>
  );
}
