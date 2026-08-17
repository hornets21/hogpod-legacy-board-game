"use client";

import { useEffect, useReducer, useRef, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { auth, db, ref, onValue, off, onDisconnect } from "@/lib/firebase";
import { HostGameSync, PlayerGameSync } from "@/lib/onlineGameSync";
import { gameReducer } from "@/lib/gameReducer";
import { createInitialGameState } from "@/lib/gameEngine";
import {
  leaveRoom,
  deleteRoom,
  writeGameState,
  deserializeGameState,
} from "@/lib/roomManager";

import InitiativeModal from "@/components/InitiativeModal";
import WaitingRoom from "@/components/online/WaitingRoom";
import PlayerCard from "@/components/PlayerCard";
import AdminModal from "@/components/AdminModal";
import SettingsModal from "@/components/SettingsModal";
import BgmPlayer from "@/components/BgmPlayer";
import CombatModal from "@/components/CombatModal";
import PvpCombatModal from "@/components/PvpCombatModal";
import ShopModal from "@/components/ShopModal";
import GameLog from "@/components/GameLog";
import BingoWidget from "@/components/BingoWidget";
import BingoWinModal from "@/components/BingoWinModal";
import TeleportModal from "@/components/TeleportModal";
import SkillTargetPicker from "@/components/SkillTargetPicker";
import TrapCellPicker from "@/components/TrapCellPicker";
import NpcDoctorModal from "@/components/NpcDoctorModal";
import NpcSkillModal from "@/components/NpcSkillModal";
import NpcPetModal from "@/components/NpcPetModal";
import TurnTimer from "@/components/online/TurnTimer";
import NpcSpawnWidget from "@/components/NpcSpawnWidget";
import MobaAutoGoldWidget from "@/components/MobaAutoGoldWidget";

const BoardCanvas = dynamic(() => import("@/components/board3d/BoardCanvas"), {
  ssr: false,
  loading: () => (
    <div className="board3d-loading">Loading 3D board...</div>
  ),
});

function getStateSignature(state) {
  return JSON.stringify(state, (_, value) => (value instanceof Set ? [...value] : value));
}

function getPresentationDuration(previous, next) {
  if (!previous || previous.phase !== next.phase) return 2500;
  if (next.combatState || previous.combatState) return 10000;
  if (next.pvpEncounter || previous.pvpEncounter) return 10000;
  if (previous.players?.some((player, index) => player.position !== next.players?.[index]?.position)) {
    return 4000;
  }
  return 2000;
}

const BOT_COMBAT_DELAY_MS = 16000;
const BOT_DECISION_DELAY_MS = 7500;
const BOT_SHOP_DELAY_MS = 6000;
const BOT_TELEPORT_CONFIRM_DELAY_MS = 5000;
const BOT_TELEPORT_RESOLVE_DELAY_MS = 9500;
const MOVEMENT_SAFETY_DELAY_MS = 9500;
const HOST_BOT_ACTIONS = new Set([
  "ROLL_DICE",
  "MOVE_AND_CHECK",
  "COMBAT_RESOLVE",
  "CLOSE_SHOP",
  "CONFIRM_TELEPORT",
  "RESOLVE_TELEPORT_LANDING",
  "PVP_ACTION",
]);
const SPECTATOR_ADMIN_ACTIONS = new Set([
  "START_PLAY",
  "RESET",
  "ADMIN_REVIVE_PLAYER",
  "ADMIN_TELEPORT_TO_BOSS",
  "ADMIN_REMOVE_ITEM",
  "ADMIN_GOD_MODE",
  "ADMIN_ADD_GOLD",
  "ADMIN_GIVE_ITEM",
  "GIVE_BINGO_CARD",
  "GIVE_BINGO_ALL",
  "REMOVE_BINGO_CARD",
  "TOGGLE_AUTO_GOLD",
  "TRIGGER_GOLD_RAIN",
  "SET_AUTO_GOLD_SETTINGS",
  "SPAWN_ALL_NPCS",
  "FORCE_SPAWN_NPC",
  "TELEPORT_TO_NPC",
]);

export default function OnlineGameRoom({ params }) {
  const unwrappedParams = use(params);
  const roomCode = (unwrappedParams?.code || "").toUpperCase().trim();
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [roomData, setRoomData] = useState(null);
  const [role, setRole] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [ttlWarningMinutes, setTtlWarningMinutes] = useState(null);

  const [hostState, hostDispatch] = useReducer(gameReducer, null);
  const hostStateRef = useRef(hostState);
  hostStateRef.current = hostState;

  const [syncedState, setSyncedState] = useState(null);
  const hostSyncRef = useRef(null);
  const playerSyncRef = useRef(null);

  const [adminOpen, setAdminOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [bgmMuted, setBgmMuted] = useState(false);
  const [bgmVolume, setBgmVolume] = useState(() => {
    if (typeof window === "undefined") return 0.2;
    const saved = Number.parseFloat(localStorage.getItem("podBoardGame_bgmVolume"));
    return Number.isFinite(saved) ? saved : 0.2;
  });
  const [logCollapsed, setLogCollapsed] = useState(false);
  const [playersCollapsed, setPlayersCollapsed] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pendingSkill, setPendingSkill] = useState(null);
  const [pendingTrap, setPendingTrap] = useState(null);
  const [isRolling, setIsRolling] = useState(false);
  const [displayDiceVal, setDisplayDiceVal] = useState(null);
  const [turnTimeLeft, setTurnTimeLeft] = useState(45);
  const [discordProfile, setDiscordProfile] = useState(null);

  // Persist BGM volume so it carries across sessions & matches the local mode.
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("podBoardGame_bgmVolume", bgmVolume.toString());
  }, [bgmVolume]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("pod_discord_user");
      if (saved) {
        try {
          setDiscordProfile(JSON.parse(saved));
        } catch {}
      }
    }
  }, []);

  const handleSkillRequest = (playerIndex, skillId) => {
    setPendingSkill({ playerIndex, skillId });
  };

  const handleSkillConfirm = ({ targetIndex, monsterCell, diceChoice }) => {
    if (!pendingSkill) return;
    const { playerIndex, skillId } = pendingSkill;
    dispatchAction("USE_SKILL", {
      skillId,
      playerIndex,
      targetIndex,
      monsterCell,
      diceChoice,
    });
    setPendingSkill(null);
  };

  const handleSkillCancel = () => {
    setPendingSkill(null);
  };

  const handlePotionRequest = (playerIndex, potionId) => {
    if (potionId === "poison") {
      setPendingTrap({ playerIndex });
      return;
    }
    dispatchAction("USE_POTION", { potionId, playerIndex });
  };

  const handleTrapConfirm = ({ targetCell }) => {
    if (!pendingTrap) return;
    dispatchAction("USE_POTION", {
      potionId: "poison",
      playerIndex: pendingTrap.playerIndex,
      targetCell,
    });
    setPendingTrap(null);
  };

  const handleTrapCancel = () => {
    setPendingTrap(null);
  };

  useEffect(() => {
    if (!auth) {
      setAuthChecked(true);
      return;
    }
    const unsub = auth.onAuthStateChanged((fbUser) => {
      if (fbUser) {
        setUser(fbUser);
      } else {
        router.replace("/lobby");
      }
      setAuthChecked(true);
    });
    return () => unsub();
  }, [router]);

  useEffect(() => {
    if (!db || !roomCode || !user) return;

    const roomRef = ref(db, `rooms/${roomCode}`);
    const handler = (snap) => {
      if (!snap.exists()) {
        setErrorMessage("This room has been closed or expired.");
        setRoomData(null);
        return;
      }
      const data = snap.val();
      setRoomData(data);

      if (data.meta?.hostUid === user.uid) {
        setRole("host");
      } else if (data.players?.[user.uid]) {
        setRole("player");
      } else if (data.spectators?.[user.uid]) {
        setRole("spectator");
      } else {
        setRole("spectator");
      }

      // Non-host clients receive game state from PlayerGameSync below. Avoid
      // deserializing it here too: this room listener also fires for presence
      // changes, which used to send duplicate snapshots to the 3D board.
      if (data.gameState && data.meta?.hostUid === user.uid) {
        const deserialized = deserializeGameState(data.gameState);
        setSyncedState(deserialized);
        // Hydrate host state on reconnect / refresh so the host can seamlessly re-enter
        if (data.meta?.hostUid === user.uid && !hostStateRef.current) {
          hostDispatch({ type: "LOAD_SAVED_STATE", savedState: deserialized });
        }
      }
    };

    onValue(roomRef, handler);
    return () => off(roomRef, "value", handler);
  }, [roomCode, user]);

  useEffect(() => {
    if (role !== "host" || roomData?.meta?.status !== "playing") return;

    const sync = new HostGameSync(roomCode, hostDispatch, () => hostStateRef.current);
    sync.start({
      hostUid: user?.uid || null,
      adminUids: [
        ...Object.values(roomData?.spectators || {})
          .filter((spectator) => spectator?.isAdmin && spectator.uid)
          .map((spectator) => spectator.uid),
        ...Object.values(roomData?.players || {})
          .filter((player) => player?.isAdmin && player.uid)
          .map((player) => player.uid),
      ],
      onTtlWarning: (mins) => setTtlWarningMinutes(mins),
      onTtlExpired: () => setErrorMessage("ห้องหมดเวลา 3 ชั่วโมง"),
    });
    hostSyncRef.current = sync;

    return () => {
      sync.stop();
      hostSyncRef.current = null;
    };
  }, [role, roomData?.meta?.status, roomCode, roomData?.spectators, roomData?.players]);

  const lastSyncSigRef = useRef(null);
  useEffect(() => {
    if (role !== "host" || !hostState || roomData?.meta?.status !== "playing") return;
    // Signature of the fields that synced clients actually consume. Used to
    // filter out writes triggered by background ticks (`TICK_SECOND` decrements
    // NPC cooldowns every second; `hpRecoveryTickCount` advances locally)
    // which don't affect gameplay. When only those noisy counters move, the
    // stringified signature stays identical and the push to Firebase is
    // skipped, ending the ~1Hz write loop that previously flooded clients
    // with full-state snapshots between turns.
    const playersSig = (hostState.players || []).map((p) => [
      p.hp, p.gold, p.position, p.isAlive, p.isInvincible, p.dodgeUsed,
      p._onlineUid || 0,
    ]);
    const npcsSig = hostState.npcs
      ? Object.entries(hostState.npcs).map(([k, v]) => [k, v.isSpawned, v.cell])
      : null;
    const sig = JSON.stringify([
      hostState.phase,
      hostState.currentPlayerIndex,
      hostState.round,
      hostState.turn,
      hostState.diceResult,
      hostState.winner,
      !!hostState.shopOpen,
      hostState.combatState ? [
        hostState.combatState.playerIndex,
        hostState.combatState.round,
        hostState.combatState.resolved,
        hostState.combatState.playerDied,
        hostState.combatState.monsterDied,
        hostState.combatState.monster?.currentHp,
        hostState.combatState.monster?.cell,
      ] : null,
      hostState.teleportModalData ? [hostState.teleportModalData.from, hostState.teleportModalData.to] : null,
      !!hostState.pvpEncounter,
      hostState.usedLadders ? [...hostState.usedLadders] : null,
      hostState.monsterCells ? [...hostState.monsterCells] : null,
      hostState.revealedMonsters ? Object.keys(hostState.revealedMonsters) : null,

      hostState.trapCells ? Object.keys(hostState.trapCells) : null,
      npcsSig,
      hostState.bingoWinModalData ? (hostState.bingoWinModalData.id ?? hostState.bingoWinModalData.playerIndex ?? 1) : null,
      hostState.doctorModalData ? 1 : 0,
      hostState.skillModalPlayer ? hostState.skillModalPlayer.houseId : null,
      hostState.petModalPlayer ? hostState.petModalPlayer.houseId : null,
      hostState.log ? hostState.log.length : 0,
      playersSig,
    ]);
    if (sig === lastSyncSigRef.current) return;
    lastSyncSigRef.current = sig;
    writeGameState(roomCode, hostState);
  }, [role, hostState, roomCode, roomData?.meta?.status]);

  useEffect(() => {
    if (role !== "host" || roomData?.meta?.status !== "playing") return;
    if (hostState?.phase !== "play" || hostState?.winner) return;

    const intervalMs = (hostState?.autoGoldInterval || 10) * 1000;
    const goldTimer = setInterval(() => {
      hostDispatch({ type: "PASSIVE_GOLD_TICK" });
    }, intervalMs);

    const npcTimer = setInterval(() => {
      hostDispatch({ type: "TICK_SECOND" });
    }, 1000);

    return () => {
      clearInterval(goldTimer);
      clearInterval(npcTimer);
    };
  }, [role, roomData?.meta?.status, hostState?.phase, hostState?.winner, hostState?.autoGoldInterval]);

  const rawActiveState = role === "host" ? hostState : syncedState;
  const [presentationState, setPresentationState] = useState(null);
  const presentationQueueRef = useRef([]);
  const lastQueuedSignatureRef = useRef(null);
  const lastPresentedStateRef = useRef(null);
  const presentationUntilRef = useRef(0);

  // Spectators receive a visual playback queue so rapid Firebase snapshots do
  // not make movement and combat appear to happen all at once. Gameplay state
  // remains authoritative and immediate for the host and players.
  useEffect(() => {
    if (role !== "spectator") {
      presentationQueueRef.current = [];
      lastQueuedSignatureRef.current = null;
      lastPresentedStateRef.current = null;
      setPresentationState(null);
      return;
    }
    if (!rawActiveState) return;

    const signature = getStateSignature(rawActiveState);
    if (signature === lastQueuedSignatureRef.current) return;
    lastQueuedSignatureRef.current = signature;

    if (!lastPresentedStateRef.current) {
      lastPresentedStateRef.current = rawActiveState;
      setPresentationState(rawActiveState);
      return;
    }

    presentationQueueRef.current.push(rawActiveState);
    // If a spectator falls far behind, keep the most recent states rather than
    // building an unbounded queue that could take minutes to catch up.
    if (presentationQueueRef.current.length > 8) {
      presentationQueueRef.current = presentationQueueRef.current.slice(-4);
    }
  }, [rawActiveState, role]);

  useEffect(() => {
    if (role !== "spectator") return undefined;

    const timer = setInterval(() => {
      if (Date.now() < presentationUntilRef.current) return;
      const nextState = presentationQueueRef.current.shift();
      if (!nextState) return;

      const previousState = lastPresentedStateRef.current;
      lastPresentedStateRef.current = nextState;
      setPresentationState(nextState);
      presentationUntilRef.current = Date.now() + getPresentationDuration(previousState, nextState);
    }, 100);

    return () => clearInterval(timer);
  }, [role]);

  const activeState = role === "spectator" ? presentationState || rawActiveState : rawActiveState;

  const myHouseId = user?.uid ? roomData?.players?.[user.uid]?.houseId : null;
  const myPlayerIndex = activeState?.players?.findIndex((p) => {
    if (user?.uid && p._onlineUid === user.uid) return true;
    if (myHouseId && p.houseId === myHouseId) return true;
    if (discordProfile?.id && p.discordId === discordProfile.id) return true;
    return false;
  });

  useEffect(() => {
    if (role === "host" || roomData?.meta?.status !== "playing" || !user) return;

    const sync = new PlayerGameSync(roomCode, user, () => ({
      discordId: discordProfile?.id || null,
      houseId: (user?.uid && roomData?.players?.[user.uid]?.houseId) || myHouseId || null,
      playerIndex: myPlayerIndex >= 0 ? myPlayerIndex : null,
    }));
    sync.start(setSyncedState);
    playerSyncRef.current = sync;

    return () => {
      sync.stop();
      playerSyncRef.current = null;
    };
  }, [role, roomData?.meta?.status, roomCode, user, discordProfile?.id, user?.uid ? roomData?.players?.[user.uid]?.houseId : null, myHouseId, myPlayerIndex]);

  useEffect(() => {
    // Defensive reset: if `diceResult` resolves to null while the previous
    // 1200ms timer is still pending, the cleanup below cancels that timer
    // and we must ALSO clear the overlay state so the dice overlay cannot
    // get stuck "rolling" forever (the original version did nothing in this
    // branch, leaving isRolling=true and displayDiceVal=<last value>).
    if (activeState?.diceResult == null) {
      setIsRolling(false);
      setDisplayDiceVal(null);
      return undefined;
    }
    setDisplayDiceVal(activeState.diceResult);
    setIsRolling(true);
    const timer = setTimeout(() => {
      setIsRolling(false);
      setDisplayDiceVal(null);
    }, 1200);
    return () => clearTimeout(timer);
  }, [activeState?.diceResult]);

  const currentPlayer = activeState?.players?.[activeState?.currentPlayerIndex];
  const isHostSpectator = role === "host" && roomData?.meta?.hostMode === "spectate";
  const isAdminViewer = Boolean(
    (isHostSpectator && roomData?.spectators?.[user?.uid]?.isAdmin) ||
    (role === "spectator" &&
      discordProfile?.isAdmin &&
      roomData?.spectators?.[user?.uid]?.isAdmin)
  );
  const isBotTurn = Boolean(currentPlayer?.isBot);
  const isMyTurn = Boolean(
    !isBotTurn &&
    role !== "spectator" &&
    ((myPlayerIndex != null && myPlayerIndex >= 0 && activeState?.currentPlayerIndex === myPlayerIndex) ||
     (user?.uid && currentPlayer?._onlineUid === user.uid) ||
     (myHouseId && currentPlayer?.houseId === myHouseId) ||
     (discordProfile?.id && currentPlayer?.discordId === discordProfile.id))
  );
  const canControlGame = (role === "host" && !isHostSpectator) || isMyTurn;

  const canRoll = Boolean(
    activeState?.phase === "play" &&
    !isBotTurn &&
    isMyTurn &&
    activeState?.diceResult == null &&
    !activeState?.combatState &&
    !activeState?.shopOpen &&
    !activeState?.teleportModalData &&
    !activeState?.pvpEncounter &&
    !activeState?.winner
  );

  const dispatchAction = useCallback(
    (actionOrType, maybePayload = {}) => {
      let actionType = actionOrType;
      let payload = maybePayload;

      if (typeof actionOrType === "object" && actionOrType !== null) {
        actionType = actionOrType.type;
        const { type, ...rest } = actionOrType;
        payload = { ...rest, ...(maybePayload || {}) };
      }

      if (!actionType) return;

      // A host in spectator mode still owns the authoritative reducer and must
      // be able to drive bot turns. These actions originate from host timers
      // / the 3D movement callback, not from the spectator UI.
      const isHostBotAction = Boolean(
        role === "host" &&
        hostStateRef.current?.players?.[hostStateRef.current.currentPlayerIndex]?.isBot &&
        HOST_BOT_ACTIONS.has(actionType)
      );

      // Role & Permission Checks:
      if (role === "spectator") {
        // Normal spectator or Admin spectator
        if (!isAdminViewer || !SPECTATOR_ADMIN_ACTIONS.has(actionType)) {
          return;
        }
      } else if (isHostSpectator) {
        // Host in Spectator Mode: Can drive bot turns, START_PLAY, RESET, and admin panel
        if (!isHostBotAction && !SPECTATOR_ADMIN_ACTIONS.has(actionType)) {
          return;
        }
      } else if (role === "player") {
        // Guest Player: cannot dispatch spectator admin cheats unless admin
        if (!isAdminViewer && SPECTATOR_ADMIN_ACTIONS.has(actionType)) {
          return;
        }
      }

      if (role === "host") {
        hostDispatch({ type: actionType, ...payload });
      } else if (playerSyncRef.current) {
        playerSyncRef.current.emitAction(actionType, payload);
      }
    },
    [isAdminViewer, isHostSpectator, role]
  );
  
  const handleRollDice = useCallback(() => {
    if (!canRoll) return;
    dispatchAction("ROLL_DICE");
  }, [canRoll, dispatchAction]);

  // Countdown is only active while the current player is deciding whether
  // to roll. Pause it during movement and encounter resolution.
  useEffect(() => {
    const isWaitingToRoll = Boolean(
      activeState?.phase === "play" &&
      activeState?.diceResult == null &&
      !activeState?.combatState &&
      !activeState?.shopOpen &&
      !activeState?.teleportModalData &&
      !activeState?.pvpEncounter &&
      !activeState?.winner
    );

    if (!isWaitingToRoll) {
      setTurnTimeLeft(45);
      return undefined;
    }

    setTurnTimeLeft(45);
    const timer = setInterval(() => {
      setTurnTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (isMyTurn) {
            dispatchAction("ROLL_DICE");
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [
    activeState?.currentPlayerIndex,
    activeState?.round,
    activeState?.turn,
    activeState?.phase,
    activeState?.diceResult,
    activeState?.combatState,
    activeState?.shopOpen,
    activeState?.teleportModalData,
    activeState?.pvpEncounter,
    activeState?.winner,
    isMyTurn,
    dispatchAction,
  ]);

  // Mirrors the local game (app/page.jsx): after the player accepts the
  // teleport, CONFIRM_TELEPORT updates the token to the destination cell,
  // then RESOLVE_TELEPORT_LANDING (1.4s later, to let the teleport-out/
  // teleport-in token animation play out) resolves landing effects at the
  // new cell (combat / NPC / puzzle / advance turn).
  const teleportResolveRef = useRef(null);
  const handleConfirmTeleport = useCallback(() => {
    if (!activeState?.teleportModalData) return;
    dispatchAction("CONFIRM_TELEPORT");
    if (teleportResolveRef.current) clearTimeout(teleportResolveRef.current);
    teleportResolveRef.current = setTimeout(() => {
      teleportResolveRef.current = null;
      dispatchAction("RESOLVE_TELEPORT_LANDING");
    }, 1400);
  }, [activeState?.teleportModalData, dispatchAction]);

  useEffect(() => {
    return () => {
      if (teleportResolveRef.current) clearTimeout(teleportResolveRef.current);
    };
  }, []);

  // Universal safety timer on host: If diceResult is set and movement is not
  // resolved within 5s (due to background tab, lag, or dropped callback),
  // forcefully resolve movement so the game never freezes.
  useEffect(() => {
    if (role !== "host" || roomData?.meta?.status !== "playing" || !hostState) return;
    if (hostState.winner || hostState.phase !== "play") return;
    if (
      hostState.diceResult != null &&
      !hostState.shopOpen &&
      !hostState.combatState &&
      !hostState.teleportModalData &&
      !hostState.doctorModalData &&
      !hostState.skillModalPlayer &&
      !hostState.petModalPlayer &&
      !hostState.pvpEncounter
    ) {
      const timer = setTimeout(() => {
        dispatchAction("MOVE_AND_CHECK");
      }, MOVEMENT_SAFETY_DELAY_MS);
      return () => clearTimeout(timer);
    }
  }, [
    role,
    roomData?.meta?.status,
    hostState?.phase,
    hostState?.diceResult,
    hostState?.shopOpen,
    hostState?.combatState,
    hostState?.teleportModalData,
    hostState?.doctorModalData,
    hostState?.skillModalPlayer,
    hostState?.petModalPlayer,
    hostState?.pvpEncounter,
    hostState?.winner,
    dispatchAction,
  ]);

  // Host turn automation: Bots pause long enough for spectators to read each
  // action; inactive human players still auto-roll on timeout (46.5s).
  useEffect(() => {
    if (role !== "host" || roomData?.meta?.status !== "playing" || !hostState) return;
    if (hostState.winner || (hostState.phase !== "play" && hostState.phase !== "combat")) return;

    const currentPl = hostState.players?.[hostState.currentPlayerIndex];
    if (!currentPl) return;

    if (currentPl.isBot) {
      if (hostState.combatState) {
        const timer = setTimeout(() => {
          dispatchAction("COMBAT_RESOLVE", { combatResult: {} });
        }, BOT_COMBAT_DELAY_MS);
        return () => clearTimeout(timer);
      }

      if (hostState.shopOpen) {
        const timer = setTimeout(() => {
          dispatchAction("CLOSE_SHOP");
        }, BOT_SHOP_DELAY_MS);
        return () => clearTimeout(timer);
      }

      if (hostState.doctorModalData) {
        const timer = setTimeout(() => {
          dispatchAction("CLOSE_DOCTOR_MODAL");
        }, 1500);
        return () => clearTimeout(timer);
      }

      if (hostState.skillModalPlayer) {
        const timer = setTimeout(() => {
          dispatchAction("CLOSE_SKILL_MODAL");
        }, 1500);
        return () => clearTimeout(timer);
      }

      if (hostState.petModalPlayer) {
        const timer = setTimeout(() => {
          dispatchAction("CLOSE_PET_MODAL");
        }, 1500);
        return () => clearTimeout(timer);
      }

      if (hostState.teleportModalData) {
        const confirmTimer = setTimeout(() => {
          dispatchAction("CONFIRM_TELEPORT");
        }, BOT_TELEPORT_CONFIRM_DELAY_MS);
        const resolveTimer = setTimeout(() => {
          dispatchAction("RESOLVE_TELEPORT_LANDING");
        }, BOT_TELEPORT_RESOLVE_DELAY_MS);
        return () => {
          clearTimeout(confirmTimer);
          clearTimeout(resolveTimer);
        };
      }

      if (hostState.pvpEncounter) {
        return undefined;
      }

      if (
        hostState.diceResult == null &&
        !hostState.combatState &&
        !hostState.shopOpen &&
        !hostState.doctorModalData &&
        !hostState.skillModalPlayer &&
        !hostState.petModalPlayer
      ) {
        const timer = setTimeout(() => {
          dispatchAction("ROLL_DICE");
        }, BOT_DECISION_DELAY_MS);
        return () => clearTimeout(timer);
      }
    } else {
      // Human player (Guest or Host): Inactivity timeout only when waiting for dice roll
      if (
        hostState.diceResult == null &&
        !hostState.combatState &&
        !hostState.shopOpen &&
        !hostState.teleportModalData &&
        !hostState.doctorModalData &&
        !hostState.skillModalPlayer &&
        !hostState.petModalPlayer &&
        !hostState.pvpEncounter
      ) {
        const timer = setTimeout(() => {
          dispatchAction("ROLL_DICE");
        }, 46500);
        return () => clearTimeout(timer);
      }
    }
  }, [
    role,
    roomData?.meta?.status,
    hostState?.currentPlayerIndex,
    hostState?.round,
    hostState?.turn,
    hostState?.phase,
    hostState?.diceResult,
    hostState?.combatState,
    hostState?.shopOpen,
    hostState?.teleportModalData,
    hostState?.doctorModalData,
    hostState?.skillModalPlayer,
    hostState?.petModalPlayer,
    hostState?.bingoWinModalData,
    hostState?.pvpEncounter,
    hostState?.winner,
    dispatchAction,
  ]);

  const handleLeaveRoom = async () => {
    if (role === "host") {
      await deleteRoom(roomCode);
    } else if (user) {
      await leaveRoom(roomCode, user.uid);
    }
    router.push("/lobby");
  };

  const handleDeleteRoom = async () => {
    try {
      await deleteRoom(roomCode);
    } catch (e) {
      console.error("Delete room error:", e);
    }
    router.push("/lobby");
  };

  if (!authChecked) {
    return (
      <main className="fixed inset-0 z-50 flex items-center justify-center bg-[#050407] text-white">
        <div className="text-sm font-bold text-slate-400">Verifying user...</div>
      </main>
    );
  }

  if (errorMessage) {
    return (
      <main className="fixed inset-0 z-50 flex items-center justify-center bg-[#050407] text-white p-4">
        <div className="max-w-md w-full bg-slate-900 border border-white/10 rounded-2xl p-6 text-center">
          <div className="text-xl font-black text-white mb-2">Notification</div>
          <div className="text-sm text-slate-300 mb-6">{errorMessage}</div>
          <button
            type="button"
            onClick={() => router.push("/lobby")}
            className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-xl border border-white/10"
          >
            Return to Lobby
          </button>
        </div>
      </main>
    );
  }

  if (!roomData) {
    return (
      <main className="fixed inset-0 z-50 flex items-center justify-center bg-[#050407] text-white">
        <div className="text-sm font-bold text-slate-400">Connecting to room {roomCode}...</div>
      </main>
    );
  }

  if (roomData.meta?.status === "waiting") {
    return (
      <>
        <WaitingRoom
          roomCode={roomCode}
          user={user}
          role={role}
          players={roomData.players || {}}
          spectators={roomData.spectators || {}}
          meta={roomData.meta || {}}
          onStartGame={(initState) => {
            hostDispatch({ type: "LOAD_SAVED_STATE", savedState: initState });
          }}
          onLeave={() => setShowLeaveConfirm(true)}
          onDelete={() => setShowDeleteConfirm(true)}
        />

        {/* Delete Room Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none animate-fade-in">
            <div className="relative w-full max-w-md bg-slate-900/95 border border-red-500/40 rounded-3xl p-6 shadow-2xl text-center space-y-4">
              <div>
                <h2 className="text-xl font-black text-red-400">Delete Room</h2>
                <p className="text-xs text-slate-300/80 mt-1 leading-relaxed">
                  Are you sure you want to delete this room? All players will be disconnected and returned to the lobby.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setShowDeleteConfirm(false);
                    await handleDeleteRoom();
                  }}
                  className="py-3 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs shadow-lg shadow-red-900/40 transition-colors"
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Leave Room Confirmation Modal */}
        {showLeaveConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none animate-fade-in">
            <div className="relative w-full max-w-md bg-slate-900/95 border border-red-500/40 rounded-3xl p-6 shadow-2xl text-center space-y-4">
              <div>
                <h2 className="text-xl font-black text-white">Leave Room</h2>
                <p className="text-xs text-slate-300/80 mt-1 leading-relaxed">
                  {role === "host"
                    ? "Leaving as Host will close this room and return all players to the lobby."
                    : "Are you sure you want to leave this game and return to the lobby?"}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLeaveConfirm(false)}
                  className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setShowLeaveConfirm(false);
                    await handleLeaveRoom();
                  }}
                  className="py-3 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs shadow-lg shadow-red-900/40 transition-colors"
                >
                  Confirm Leave
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  if (!activeState) {
    return (
      <main className="fixed inset-0 z-50 flex items-center justify-center bg-[#050407] text-white">
        <div className="text-sm font-bold text-slate-400">Loading board data...</div>
      </main>
    );
  }

  return (
    <main className="game-shell fixed inset-0 z-0 overflow-hidden bg-black text-white select-none">
      {/* Keep the online room visually consistent with the local game. */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 z-0 h-full w-full object-cover opacity-90 pointer-events-none"
      >
        <source src="/images/system/magic_room_loop.webm" type="video/webm" />
      </video>

      {ttlWarningMinutes != null && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 bg-amber-950/90 border border-amber-500/40 text-amber-200 text-xs font-bold px-4 py-2 rounded-xl backdrop-blur-md">
          This room will expire in {ttlWarningMinutes} minutes.
        </div>
      )}

      <div className="absolute inset-0 z-0">
        <BoardCanvas
          players={activeState.players}
          currentPlayerIndex={activeState.currentPlayerIndex}
          monsterCells={activeState.monsterCells}
          revealedMonsters={activeState.revealedMonsters}
          usedLadders={activeState.usedLadders}
          trapCells={activeState.trapCells}
          snakesAndLadders={activeState.snakesAndLadders}
          npcs={activeState.npcs}
          monsterMap={activeState.monsterMap}
          cellTeleport={activeState.cellTeleport}
          phase={activeState.phase}
          isRolling={isRolling}
          diceResult={activeState.diceResult}
          onRoll={handleRollDice}
          canRoll={canRoll}
          resetDiceKey={`${activeState?.turn || 1}-${activeState?.currentPlayerIndex || 0}-${activeState?.round || 1}`}
          focusCell={activeState.combatState?.monster?.cell || activeState.pvpEncounter?.cell || null}
          isCombatActive={activeState.phase === "combat" || !!activeState.pvpEncounter}
          onMoveComplete={() => {
            // The host must always resolve movement locally, including host
            // spectator mode, because it owns the authoritative game state
            // and drives bot turns. Human players may resolve their own turn.
            if (role === "host" || isMyTurn) {
              dispatchAction("MOVE_AND_CHECK");
            }
          }}
        />
      </div>

      {isRolling && displayDiceVal && (
        <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none">
          <div
            style={{
              background:
                "radial-gradient(circle, rgba(15,23,42,0.92) 40%, rgba(15,23,42,0.6) 70%, transparent 100%)",
              borderRadius: "50%",
              width: "180px",
              height: "180px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              border: "4px solid rgba(251,191,36,0.5)",
              boxShadow:
                "0 0 60px rgba(251,191,36,0.3), 0 0 120px rgba(245,158,11,0.15)",
              animation: "dice-pop 0.3s ease-out",
            }}
          >
            <div
              style={{
                fontSize: "80px",
                fontWeight: 900,
                color: "#fbbf24",
                fontFamily: "monospace",
                textShadow: "0 0 30px #fbbf24, 0 0 60px #f59e0b",
                lineHeight: 1,
              }}
            >
              {displayDiceVal}
            </div>
            <div
              style={{
                fontSize: "14px",
                color: "rgba(251,191,36,0.7)",
                fontWeight: 700,
                marginTop: "4px",
                letterSpacing: "2px",
              }}
            >
              Move {displayDiceVal} steps
            </div>
          </div>
        </div>
      )}

      <div className="relative z-10 w-full h-full p-4 flex flex-col justify-between pointer-events-none overflow-hidden">
        <div className="flex items-center justify-end w-full gap-2 pointer-events-auto z-20 flex-wrap sm:flex-nowrap">
          {/* NPC Spawn Timer Widget */}
          <NpcSpawnWidget state={activeState} />

          {/* MOBA Auto Gold Widget */}
          <MobaAutoGoldWidget state={activeState} onDispatch={dispatchAction} />

          {/* Turn Timer inline in the same row */}
          <TurnTimer
            timeLeft={turnTimeLeft}
            maxTime={45}
            isMyTurn={isMyTurn && turnTimeLeft > 0}
          />

          {/* Room Status Badge */}
          <div className="flex items-center gap-3 px-3.5 py-1.5 rounded-2xl bg-slate-950/80 border border-amber-500/30 backdrop-blur-md shadow-[0_0_25px_rgba(240,184,91,0.15)] shrink-0">
            <div>
              <div className="text-xs font-black tracking-wider text-amber-400 uppercase">
                Room {roomCode}
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-300">
                <span>Round {activeState.round || 1}</span>
                <span className="text-white/20">•</span>
                <span className="text-cyan-400">Turn {activeState.turn || 1}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="px-3.5 py-2 bg-slate-800/90 hover:bg-slate-700 text-xs font-bold rounded-xl border border-white/10 text-white transition-colors shrink-0"
            title="Audio & settings"
          >
            Settings
          </button>

          {isAdminViewer && (
            <button
              type="button"
              onClick={() => setAdminOpen(true)}
              className="px-3.5 py-2 bg-slate-800/90 hover:bg-slate-700 text-xs font-bold rounded-xl border border-white/10 text-white shrink-0"
              title="Admin panel"
            >
              Admin Panel
            </button>
          )}

          {(role === "host" || isAdminViewer) && (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="px-3.5 py-2 bg-red-950/80 hover:bg-red-900 text-xs font-bold rounded-xl border border-red-500/30 text-red-300 transition-colors shrink-0"
              title="Delete room"
            >
              Delete Room
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowLeaveConfirm(true)}
            className="px-3.5 py-2 bg-slate-800/90 hover:bg-slate-700 text-xs font-bold rounded-xl border border-white/10 text-white transition-colors shrink-0"
          >
            Leave Room
          </button>
        </div>

        <div className="absolute top-20 left-4 bottom-6 z-10 w-80 max-w-[calc(100vw-2rem)] flex flex-col gap-3 pointer-events-auto overflow-y-auto pr-1 custom-scrollbar">
          {playersCollapsed ? (
            <div className="players-mini-bar flex-col gap-2 bg-slate-950/85 backdrop-blur-xl border border-white/10 p-2.5 rounded-2xl">
              <div className="flex justify-between items-center w-full pb-1 border-b border-white/10">
                <span className="text-xs font-bold text-slate-300">
                  Players {activeState.players?.length || 0}
                </span>
                <button
                  type="button"
                  onClick={() => setPlayersCollapsed(false)}
                  className="panel-collapse-btn text-xs"
                >
                  ▼
                </button>
              </div>
              <div className="flex flex-col gap-1.5 w-full">
                {activeState.players?.map((p, i) => {
                  const hpPct = Math.max(0, (p.hp / p.maxHp) * 100);
                  const active = i === activeState.currentPlayerIndex && activeState.phase === "play";
                  return (
                    <div
                      key={p.houseId || i}
                      className={`player-mini-chip w-full ${active ? "player-mini-chip-active" : ""}`}
                      style={{ "--house-color": p.color }}
                    >
                      <div className="w-6 h-6 rounded-full overflow-hidden border border-white/20 shrink-0 bg-black/50 flex items-center justify-center relative">
                        {p._onlineAvatar ? (
                          <img
                            src={p._onlineAvatar}
                            alt={p._onlineName || p.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                              const fallback = e.currentTarget.nextElementSibling;
                              if (fallback) fallback.style.display = "flex";
                            }}
                          />
                        ) : null}
                        {p.image ? (
                          <img
                            src={p.image}
                            alt={p.name}
                            className={`w-full h-full object-cover ${p._onlineAvatar ? "hidden" : ""}`}
                          />
                        ) : (
                          <span className={`text-xs flex items-center justify-center ${p._onlineAvatar ? "hidden" : ""}`}>
                            {p.emoji}
                          </span>
                        )}
                      </div>
                      <div className="player-mini-info flex-1 min-w-0">
                        <div className="player-mini-name truncate">{p._onlineName || p.nameEn || p.name}</div>
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
                  type="button"
                  onClick={() => setPlayersCollapsed(true)}
                  className="text-xs text-white/50 hover:text-white bg-slate-900/60 px-2 py-0.5 rounded-lg border border-white/10"
                >
                  ▲ Collapse
                </button>
              </div>
              <div className="flex flex-col gap-2.5">
                {activeState.players?.map((p, i) => {
                  const isPlayerOwner = myPlayerIndex === i;
                  return (
                    <PlayerCard
                      key={p.houseId || i}
                      player={p}
                      playerIndex={i}
                      isActive={i === activeState.currentPlayerIndex && activeState.phase === "play"}
                      onUseSkill={
                        isPlayerOwner
                          ? (skillId, pIdx) => handleSkillRequest(pIdx !== undefined ? pIdx : i, skillId)
                          : null
                      }
                      onUsePotion={
                        isPlayerOwner
                          ? (potionId, pIdx) => handlePotionRequest(pIdx !== undefined ? pIdx : i, potionId)
                          : null
                      }
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="absolute top-20 right-4 bottom-6 z-40 w-72 pointer-events-none max-h-[60vh] flex flex-col items-end">
          <GameLog
            log={activeState.log || []}
            collapsed={logCollapsed}
            onToggleCollapse={() => setLogCollapsed((c) => !c)}
          />
        </div>
      </div>

      <BingoWidget players={activeState.players} currentPlayerIndex={activeState.currentPlayerIndex} />

      {/* Background music + synthesized SFX (web audio). Mounted once for the
          online room so audio settings in the Settings modal take effect for all roles. */}
      <BgmPlayer isMuted={bgmMuted} volume={bgmVolume} hideFloatingButton />


      {activeState.phase === "initiative" && activeState.initiativeRolls && (
        <InitiativeModal
          initiativeRolls={activeState.initiativeRolls}
          isHost={role === "host"}
          onStartPlay={role === "host" ? () => dispatchAction("START_PLAY") : null}
          onOpenAdmin={
            isAdminViewer
              ? () => setAdminOpen(true)
              : null
          }
        />
      )}

      {activeState.combatState && (
        <CombatModal
          combatState={activeState.combatState}
          player={activeState.players?.[activeState.combatState.playerIndex ?? activeState.currentPlayerIndex] || currentPlayer}
          onResolveCombat={
            isMyTurn
              ? (combatResult) => dispatchAction("COMBAT_RESOLVE", { combatResult })
              : null
          }
          onUseSkill={
            isMyTurn
              ? (skillId) => dispatchAction("USE_SKILL", { skillId, playerIndex: myPlayerIndex })
              : null
          }
          onUsePotion={
            isMyTurn
              ? (potionId) => dispatchAction("USE_POTION", { potionId, playerIndex: myPlayerIndex })
              : null
          }
          onFlee={
            isMyTurn && activeState.players?.[activeState.currentPlayerIndex]?.pet?.effect === "dodge_once" && !activeState.players?.[activeState.currentPlayerIndex]?.dodgeUsed
              ? () => dispatchAction("FLEE_COMBAT")
              : null
          }
        />
      )}

      {activeState.pvpEncounter && (
        <PvpCombatModal
          pvpEncounter={activeState.pvpEncounter}
          players={activeState.players}
          myPlayerIndex={myPlayerIndex}
          onPvpAction={
            Boolean(
              (myPlayerIndex != null &&
                myPlayerIndex >= 0 &&
                activeState.pvpEncounter.participantIndices?.includes(myPlayerIndex)) ||
                (role === "host" &&
                  (activeState.pvpEncounter.participantIndices || []).every(
                    (idx) => activeState.players?.[idx]?.isBot
                  ))
            )
              ? (actionPayload) => dispatchAction("PVP_ACTION", actionPayload)
              : null
          }
        />
      )}

      {activeState.shopOpen && isMyTurn && (
        <ShopModal
          player={activeState.players?.[activeState.currentPlayerIndex] || currentPlayer}
          onBuy={(itemType, itemId) => {
            dispatchAction("BUY_ITEM", { itemType, itemId });
          }}
          onClose={() => dispatchAction("CLOSE_SHOP")}
        />
      )}

      {activeState.teleportModalData && (isMyTurn || (user?.uid && activeState.teleportModalData?.player?._onlineUid === user.uid) || (myHouseId && activeState.teleportModalData?.player?.houseId === myHouseId)) && (
        <TeleportModal
          modalData={activeState.teleportModalData}
          onConfirm={handleConfirmTeleport}
        />
      )}

      {activeState.doctorModalData && (isMyTurn || (user?.uid && activeState.doctorModalData?.player?._onlineUid === user.uid) || (myHouseId && activeState.doctorModalData?.player?.houseId === myHouseId)) && (
        <NpcDoctorModal
          player={activeState.doctorModalData.player}
          grantedPotions={activeState.doctorModalData.grantedPotions}
          onClose={() => dispatchAction("CLOSE_DOCTOR_MODAL")}
        />
      )}

      {activeState.skillModalPlayer && (isMyTurn || (user?.uid && activeState.skillModalPlayer?._onlineUid === user.uid) || (myHouseId && activeState.skillModalPlayer?.houseId === myHouseId)) && (
        <NpcSkillModal
          player={activeState.skillModalPlayer}
          onConfirmSwap={(oldSkillId, newSkill) => {
            dispatchAction("SWAP_NPC_SKILL", { oldSkillId, newSkill });
          }}
          onClose={() => dispatchAction("CLOSE_SKILL_MODAL")}
        />
      )}

      {activeState.petModalPlayer && (isMyTurn || (user?.uid && activeState.petModalPlayer?._onlineUid === user.uid) || (myHouseId && activeState.petModalPlayer?.houseId === myHouseId)) && (
        <NpcPetModal
          player={activeState.petModalPlayer}
          onConfirmChangePet={(newPet) => {
            dispatchAction("CHANGE_NPC_PET", { newPet });
          }}
          onClose={() => dispatchAction("CLOSE_PET_MODAL")}
        />
      )}

      {activeState.bingoWinModalData && isMyTurn && (
        <BingoWinModal
          modalData={activeState.bingoWinModalData}
          onClose={() => dispatchAction("CLOSE_BINGO_WIN_MODAL")}
        />
      )}

      {/* ── Win Screen ─────────────────────────────────────────── */}
      {activeState.winner && (
        <div className="win-overlay fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 text-center p-4">
          <div className="text-6xl animate-bounce">🏆</div>
          <div className="win-title text-3xl font-black text-amber-400 mt-2">{activeState.winner.name}</div>
          <div className="text-xl text-white/80 font-bold mt-1">Winner!</div>
          <div className="text-white/50 text-sm mt-1">Successfully defeated the Grand Sorcerer Boss!</div>
          {(role === "host" || isAdminViewer) && (
            <button
              onClick={() => dispatchAction("RESET")}
              className="btn-primary mt-6 text-base px-10 py-4 bg-amber-500 hover:bg-amber-400 text-black font-black rounded-2xl shadow-xl transition-all"
            >
              Play Again
            </button>
          )}
        </div>
      )}

      {adminOpen && isAdminViewer && (
        <AdminModal
          state={activeState}
          players={activeState.players}
          onDispatch={dispatchAction}
          onClose={() => setAdminOpen(false)}
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

      {/* ── Skill Target Picker Modal ────────────────────────── */}
      <SkillTargetPicker
        open={Boolean(pendingSkill)}
        skillId={pendingSkill?.skillId}
        casterIndex={pendingSkill?.playerIndex}
        players={activeState.players}
        monsterCells={activeState.monsterCells}
        onConfirm={handleSkillConfirm}
        onCancel={handleSkillCancel}
      />
      {/* ── Poison Trap Placement Picker Modal ───────────────── */}
      <TrapCellPicker
        open={Boolean(pendingTrap)}
        casterIndex={pendingTrap?.playerIndex}
        players={activeState.players}
        trapCells={activeState.trapCells}
        monsterCells={activeState.monsterCells}
        onConfirm={handleTrapConfirm}
        onCancel={handleTrapCancel}
      />

      {/* ── Delete Room Confirmation Modal ───────────────────── */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none animate-fade-in">
          <div className="relative w-full max-w-md bg-slate-900/95 border border-red-500/40 rounded-3xl p-6 shadow-2xl text-center space-y-4">
            <div>
              <h2 className="text-xl font-black text-red-400">Delete Room</h2>
              <p className="text-xs text-slate-300/80 mt-1 leading-relaxed">
                Are you sure you want to delete this room? All players will be disconnected and returned to the lobby.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  setShowDeleteConfirm(false);
                  await handleDeleteRoom();
                }}
                className="py-3 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs shadow-lg shadow-red-900/40 transition-colors"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Leave Room Confirmation Modal ───────────────────── */}
      {showLeaveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none animate-fade-in">
          <div className="relative w-full max-w-md bg-slate-900/95 border border-red-500/40 rounded-3xl p-6 shadow-2xl text-center space-y-4">
            <div>
              <h2 className="text-xl font-black text-white">Leave Room</h2>
              <p className="text-xs text-slate-300/80 mt-1 leading-relaxed">
                {role === "host"
                  ? "Leaving as Host will close this room and return all players to the lobby."
                  : "Are you sure you want to leave this game and return to the lobby?"}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowLeaveConfirm(false)}
                className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  setShowLeaveConfirm(false);
                  await handleLeaveRoom();
                }}
                className="py-3 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs shadow-lg shadow-red-900/40 transition-colors"
              >
                Confirm Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
