import {
  subscribeGameState,
  subscribeActions,
  sendAction,
  deleteRoom,
  updateRoomStatus,
} from "./roomManager";

const ADMIN_ACTIONS = new Set([
  "RESET", "ADMIN_REVIVE_PLAYER", "ADMIN_TELEPORT_TO_BOSS", "ADMIN_REMOVE_ITEM",
  "ADMIN_GOD_MODE", "ADMIN_ADD_GOLD", "ADMIN_GIVE_ITEM", "GIVE_BINGO_CARD",
  "GIVE_BINGO_ALL", "REMOVE_BINGO_CARD", "TOGGLE_AUTO_GOLD", "TRIGGER_GOLD_RAIN",
  "SET_AUTO_GOLD_SETTINGS", "SPAWN_ALL_NPCS", "FORCE_SPAWN_NPC", "TELEPORT_TO_NPC",
]);

export class HostGameSync {
  constructor(roomCode, dispatch, getState) {
    this.roomCode = roomCode;
    this.dispatch = dispatch;
    this.getState = getState;
    this.adminUids = new Set();
    this.hostUid = null;  // set in start() — used to authorize host-only actions (e.g. START_PLAY)
    this.unsubActions = null;
    this.turnTimerInterval = null;
    this.turnTimeLeft = 45;
    this.ttlTimerInterval = null;
    this.onTtlWarning = null;
    this.onTtlExpired = null;
    this.processedActionIds = new Set();
  }

  start(options = {}) {
    this.onTtlWarning = options.onTtlWarning || null;
    this.onTtlExpired = options.onTtlExpired || null;
    this.adminUids = new Set(options.adminUids || []);
    this.hostUid = options.hostUid || null;

    // 1. Subscribe to Player Action Queue
    this.unsubActions = subscribeActions(this.roomCode, (actions) => {
      if (!actions) return;
      const sorted = Object.entries(actions).sort(
        (a, b) => (a[1]?.timestamp || 0) - (b[1]?.timestamp || 0)
      );

      for (const [id, action] of sorted) {
        // RTDB can notify the same queue snapshot more than once while the
        // queue is being removed. Never apply one client action twice.
        if (this.processedActionIds.has(id)) continue;
        this.processedActionIds.add(id);
        this.processAction(action);
      }
    });

    // 2. Start 3-Hour TTL Watcher
    this.startTtlWatcher();
  }

  processAction(action) {
    if (!action || !action.type) return;

    const state = this.getState();
    if (!state) return;

    const currentPlayer = state.players?.[state.currentPlayerIndex];

    if (
      ADMIN_ACTIONS.has(action.type) &&
      action.playerUid !== this.hostUid &&
      !this.adminUids.has(action.playerUid)
    ) {
      return;
    }

    // Validate turn ownership for player actions
    const requiresTurnAuth = [
      "ROLL_DICE",
      "END_TURN",
      "MOVE_AND_CHECK",
      "COMBAT_ATTACK",
      "CONFIRM_TELEPORT",
      "RESOLVE_TELEPORT_LANDING",
      "FLEE_COMBAT",
      "COMBAT_RESOLVE",
      "USE_SKILL",
      "USE_POTION",
      "BUY_ITEM",
      "CLOSE_SHOP",
      "PVP_ACTION",
      "CLOSE_DOCTOR_MODAL",
      "SWAP_NPC_SKILL",
      "CHANGE_NPC_PET",
      "CLOSE_SKILL_MODAL",
      "CLOSE_PET_MODAL",
      "CLOSE_BINGO_WIN_MODAL",
    ];

    if (action.type === "START_PLAY") {
      // Only the room host may begin play after the initiative phase. This
      // prevents a spectator/another house from forcing the game forward
      // before the host has confirmed setup (admin items, gold, etc.).
      if (state.phase !== "initiative") return;
      if (this.hostUid && action.playerUid && action.playerUid !== this.hostUid) {
        return;
      }
    } else if (action.type === "PVP_ATTACK") {
      if (!state.pvpEncounter) return;
      const pvp = state.pvpEncounter;
      // Only the encounter's attacker may trigger the authoritative clash.
      if (pvp.lastResult) return;
      const senderPlayerIndex = state.players?.findIndex(
        (p) => p._onlineUid === action.playerUid
      );
      const attackerIndex =
        typeof pvp.attackerIndex === "number"
          ? pvp.attackerIndex
          : (pvp.participantIndices || [])[0];
      const isAttacker = senderPlayerIndex === attackerIndex;
      const isTurnPlayer = Boolean(
        (currentPlayer?._onlineUid && action.playerUid === currentPlayer._onlineUid) ||
        (currentPlayer?.houseId && action.houseId === currentPlayer.houseId)
      );
      if (!isAttacker && !isTurnPlayer) {
        return;
      }
    } else if (action.type === "PVP_ACTION") {
      if (!state.pvpEncounter) return;
      const participantIndices = state.pvpEncounter.participantIndices || [];
      const senderPlayerIndex = state.players?.findIndex(
        (p) => p._onlineUid === action.playerUid
      );
      const isParticipant =
        senderPlayerIndex != null &&
        senderPlayerIndex >= 0 &&
        participantIndices.includes(senderPlayerIndex);
      const isTurnPlayer = Boolean(
        (currentPlayer?._onlineUid && action.playerUid === currentPlayer._onlineUid) ||
        (currentPlayer?.houseId && action.houseId === currentPlayer.houseId)
      );

      // Allow action if sender is any human participant or the current turn player
      if (!isParticipant && !isTurnPlayer) {
        return;
      }
    } else if (requiresTurnAuth.includes(action.type)) {
      const payload = action.payload || {};
      const actionPlayerIndex =
        action.playerIndex !== undefined ? action.playerIndex : payload.playerIndex;

      // Bots are driven by the host's local reducer, never by a player queue.
      if (currentPlayer?.isBot) {
        return;
      }

      // Check turn ownership: UID match, Discord ID match, House ID match, or player index match
      const uidMatches = Boolean(
        currentPlayer?._onlineUid && action.playerUid && action.playerUid === currentPlayer._onlineUid
      );
      const discordMatches = Boolean(
        currentPlayer?.discordId && action.discordId && action.discordId === currentPlayer.discordId
      );
      const houseMatches = Boolean(
        currentPlayer?.houseId && action.houseId && action.houseId === currentPlayer.houseId
      );
      const indexMatches = Boolean(
        actionPlayerIndex !== undefined &&
        actionPlayerIndex !== null &&
        Number(actionPlayerIndex) === state.currentPlayerIndex
      );

      if (!uidMatches && !discordMatches && !houseMatches && !indexMatches) {
        // Reject action if sender doesn't match current active player
        return;
      }
    }

    // Apply action via reducer. PlayerGameSync stores optional action
    // arguments under `payload`, while the reducer consumes them at the action
    // root. The host's own `useEffect` (room/[code]/page.jsx) is responsible
    // for pushing the updated `hostState` to Firebase — it is gated by a
    // signature guard to avoid redundant loops, so we must NOT do a second
    // write here (older code did a setTimeout-based write that would race
    // the effect and cause double/early writes that contradict the filter).
    this.dispatch({ ...action, ...(action.payload || {}) });
  }

  // ── 3-Hour TTL Watcher ────────────────────────────────────────
  startTtlWatcher() {
    const ttlMs = 3 * 60 * 60 * 1000;
    const warningMs = 10 * 60 * 1000; // 10 minutes prior
    const startTime = Date.now();
    let warningFired = false;

    this.ttlTimerInterval = setInterval(async () => {
      const elapsed = Date.now() - startTime;
      const remaining = ttlMs - elapsed;

      if (remaining <= warningMs && !warningFired) {
        warningFired = true;
        if (this.onTtlWarning) {
          this.onTtlWarning(Math.ceil(remaining / 60000));
        }
      }

      if (remaining <= 0) {
        clearInterval(this.ttlTimerInterval);
        await updateRoomStatus(this.roomCode, "expired");
        if (this.onTtlExpired) {
          this.onTtlExpired();
        }
        setTimeout(() => {
          deleteRoom(this.roomCode);
        }, 5000);
      }
    }, 30 * 1000);
  }

  clearTurnTimer() {
    if (this.turnTimerInterval) {
      clearInterval(this.turnTimerInterval);
      this.turnTimerInterval = null;
    }
  }

  stop() {
    if (this.unsubActions) {
      this.unsubActions();
      this.unsubActions = null;
    }
    this.clearTurnTimer();
    if (this.ttlTimerInterval) {
      clearInterval(this.ttlTimerInterval);
      this.ttlTimerInterval = null;
    }
    this.processedActionIds.clear();
  }
}

export class PlayerGameSync {
  constructor(roomCode, user, getContext = null) {
    this.roomCode = roomCode;
    this.user = user;
    this.getContext = getContext;
    this.unsubState = null;
    this.lastActionTime = 0;
  }

  start(onStateUpdate) {
    this.unsubState = subscribeGameState(this.roomCode, onStateUpdate);
  }

  async emitAction(type, payload = {}) {
    const now = Date.now();
    // Exclude critical turn/state advancement actions from rate limit
    const unthrottledActions = [
      "MOVE_AND_CHECK",
      "ROLL_DICE",
      "START_PLAY",
      "COMBAT_ATTACK",
      "CONFIRM_TELEPORT",
      "RESOLVE_TELEPORT_LANDING",
      "COMBAT_RESOLVE",
      "FLEE_COMBAT",
      "BUY_ITEM",
      "CLOSE_SHOP",
      "CLOSE_DOCTOR_MODAL",
      "SWAP_NPC_SKILL",
      "CHANGE_NPC_PET",
      "CLOSE_SKILL_MODAL",
      "CLOSE_PET_MODAL",
      "CLOSE_BINGO_WIN_MODAL",
      "USE_SKILL",
      "USE_POTION",
      "PVP_ATTACK",
      "PVP_ACTION",
    ];

    if (!unthrottledActions.includes(type)) {
      if (now - this.lastActionTime < 250) {
        return;
      }
    }
    this.lastActionTime = now;

    const ctx = typeof this.getContext === "function" ? this.getContext() : {};

    await sendAction(this.roomCode, {
      type,
      playerUid: this.user?.uid,
      discordId: ctx?.discordId || null,
      houseId: ctx?.houseId || null,
      playerIndex: ctx?.playerIndex ?? null,
      payload,
    });
  }

  stop() {
    if (this.unsubState) {
      this.unsubState();
      this.unsubState = null;
    }
  }
}
