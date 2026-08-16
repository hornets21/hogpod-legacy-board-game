import {
  db,
  auth,
  ensureFirebaseAuth,
  ref,
  set,
  get,
  update,
  remove,
  onValue,
  off,
  onDisconnect,
  push,
  serverTimestamp,
} from "./firebase";

export const ROOM_TTL_MS = 3 * 60 * 60 * 1000; // 3 hours in ms
export const MAX_ACTIVE_ROOMS = 10;

// ── State & Payload Sanitization (Prevent Firebase undefined throws) ─────
export function sanitizeForFirebase(obj) {
  if (obj === undefined) return null;
  if (obj === null || typeof obj !== "object") return obj;
  if (obj instanceof Set) return Array.from(obj).map(sanitizeForFirebase);
  if (Array.isArray(obj)) {
    return obj.map((item) => (item === undefined ? null : sanitizeForFirebase(item)));
  }
  const cleaned = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val !== undefined) {
      cleaned[key] = sanitizeForFirebase(val);
    }
  }
  return cleaned;
}

// Generate unambiguous 6-character room code (omitting 0, O, 1, I)
export function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// ── Room Expiry Checker ─────────────────────────────────────────
export function isRoomExpired(meta) {
  if (!meta) return true;
  const now = Date.now();
  const createdAt = Number(meta.createdAt) || 0;
  const expiresAt = Number(meta.expiresAt) || createdAt + ROOM_TTL_MS;
  return now >= expiresAt || (createdAt > 0 && now - createdAt >= ROOM_TTL_MS);
}

// ── Create Room (Host) ──────────────────────────────────────────
export async function createRoom(user, options = {}) {
  if (!db) {
    throw new Error(
      "Firebase Database is not initialized. Please verify configuration in .env.local"
    );
  }

  // Ensure Firebase Auth session is active
  const fbUser = await ensureFirebaseAuth();
  if (!fbUser) {
    throw new Error("Firebase authentication failed.");
  }

  const hostUid = fbUser.uid;
  const discordId = user?.id || user?.discordId || null;
  const displayName = user?.displayName || user?.username || "Host";
  const avatar = user?.avatar || null;
  const hostMode = options.hostMode === "spectate" ? "spectate" : "play";

  // Check active rooms limit (max 10) and per-user active room limit (max 1 per host)
  try {
    const roomsSnap = await get(ref(db, "rooms"));
    if (roomsSnap.exists()) {
      const allRooms = roomsSnap.val() || {};
      let activeRoomCount = 0;
      let userExistingRoomCode = null;
      let userExistingRoomActive = false;

      for (const [code, rData] of Object.entries(allRooms)) {
        const meta = rData?.meta || {};
        const expired = isRoomExpired(meta);
        if (expired) {
          // Cleanup expired rooms in the background
          remove(ref(db, `rooms/${code}`)).catch(() => {});
          continue;
        }

        const isFinished = meta.status === "finished" || meta.status === "expired";
        if (isFinished) {
          continue;
        }

        activeRoomCount++;

        const isUserHost =
          meta.hostUid === hostUid ||
          (discordId && meta.discordId && String(meta.discordId) === String(discordId));

        if (isUserHost) {
          userExistingRoomCode = code;
          const playerCount = rData.players ? Object.keys(rData.players).length : 0;
          const isPlaying = meta.status === "playing";
          if (isPlaying || playerCount > 1) {
            userExistingRoomActive = true;
          }
        }
      }

      if (userExistingRoomCode) {
        if (userExistingRoomActive) {
          throw new Error(
            "You already have an active room. Please finish or leave your current room first."
          );
        } else {
          // Clean up stale lone waiting room created by this host
          try {
            await remove(ref(db, `rooms/${userExistingRoomCode}`));
            activeRoomCount = Math.max(0, activeRoomCount - 1);
          } catch {}
        }
      }

      if (activeRoomCount >= MAX_ACTIVE_ROOMS) {
        throw new Error(
          "Server room limit reached. Maximum 10 active rooms allowed."
        );
      }
    }
  } catch (err) {
    // If it's our own validation error, rethrow it
    if (
      err.message?.includes("Server room limit reached") ||
      err.message?.includes("You already have an active room")
    ) {
      throw err;
    }
    // Otherwise log and continue
    console.warn("Failed to check active rooms count:", err);
  }

  let roomCode = "";
  let exists = true;
  let attempts = 0;

  while (exists && attempts < 10) {
    roomCode = generateRoomCode();
    try {
      const snap = await get(ref(db, `rooms/${roomCode}/meta`));
      exists = snap.exists();
    } catch {
      exists = false;
    }
    attempts++;
  }

  if (exists) {
    throw new Error("Failed to generate a unique room code. Please try again.");
  }

  const now = Date.now();
  const isSpectatingHost = hostMode === "spectate";
  const roomData = {
    meta: {
      roomCode,
      hostUid,
      discordId,
      hostName: displayName,
      hostMode,
      createdAt: serverTimestamp(),
      expiresAt: now + ROOM_TTL_MS,
      status: "waiting", // "waiting" | "playing" | "finished" | "expired"
      maxPlayers: 4,
    },
    ...(isSpectatingHost
      ? {
          // Host becomes a spectator-admin instead of taking a house slot.
          // They still control START_PLAY + AdminModal but do not play.
          spectators: {
            [hostUid]: {
              uid: hostUid,
              discordId,
              displayName,
              avatar,
              isHost: true,
              isAdmin: true,
              online: true,
              joinedAt: serverTimestamp(),
            },
          },
        }
      : {
          players: {
            [hostUid]: {
              uid: hostUid,
              discordId,
              displayName,
              avatar,
              houseId: null,
              slot: 0,
              ready: false,
              online: true,
              joinedAt: serverTimestamp(),
            },
          },
        }),
  };

  try {
    await set(ref(db, `rooms/${roomCode}`), sanitizeForFirebase(roomData));
  } catch (err) {
    console.error("Firebase set error in createRoom:", err);
    if (err.message && err.message.includes("PERMISSION_DENIED")) {
      throw new Error(
        "Firebase permission denied. Please verify Realtime Database security rules."
      );
    }
    throw new Error(`Failed to create room: ${err.message || err.code}`);
  }

  // Connection presence guard (path depends on whether host is player or spectator)
  try {
    const presencePath = isSpectatingHost
      ? `rooms/${roomCode}/spectators/${hostUid}/online`
      : `rooms/${roomCode}/players/${hostUid}/online`;
    const presenceRef = ref(db, presencePath);
    onDisconnect(presenceRef).set(false);
  } catch {
    // Non-critical presence fallback
  }

  return roomCode;
}

// ── Join Room (Player) ──────────────────────────────────────────
export async function joinRoom(roomCode, user) {
  if (!db) {
    throw new Error("Firebase Database is not initialized.");
  }

  const fbUser = await ensureFirebaseAuth();
  if (!fbUser) {
    throw new Error("Firebase authentication failed.");
  }

  const playerUid = fbUser.uid;
  const displayName = user?.displayName || user?.username || "Player";
  const avatar = user?.avatar || null;

  const normalizedCode = (roomCode || "").toUpperCase().trim();
  const roomRef = ref(db, `rooms/${normalizedCode}`);
  let roomSnap;

  try {
    roomSnap = await get(roomRef);
  } catch (err) {
    console.error("Firebase get room error:", err);
    if (err.message && err.message.includes("PERMISSION_DENIED")) {
      throw new Error("Database access denied.");
    }
    throw new Error(`Failed to connect to room: ${err.message || err.code}`);
  }

  if (!roomSnap.exists()) {
    throw new Error("Room not found. Please verify the room code.");
  }

  const room = roomSnap.val();
  const meta = room.meta || {};

  // Check 3-hour TTL
  if (isRoomExpired(meta)) {
    try {
      await remove(roomRef);
    } catch {}
    throw new Error("Room has expired after 3 hours of inactivity.");
  }

  if (meta.status === "playing" || meta.status === "finished") {
    const discordId = user?.id || user?.discordId || null;
    let matchingPlayerKey = null;

    if (room.players) {
      if (room.players[playerUid]) {
        matchingPlayerKey = playerUid;
      } else if (discordId) {
        matchingPlayerKey = Object.keys(room.players).find(
          (k) => room.players[k]?.discordId === discordId
        );
      }
    }

    // Allow re-entry if player is registered or is the room host
    if (matchingPlayerKey || meta.hostUid === playerUid || room.spectators?.[playerUid]) {
      const targetUid = matchingPlayerKey || playerUid;
      await update(ref(db, `rooms/${normalizedCode}/players/${targetUid}`), sanitizeForFirebase({
        online: true,
        uid: playerUid,
      }));
      const presenceRef = ref(
        db,
        `rooms/${normalizedCode}/players/${targetUid}/online`
      );
      try {
        onDisconnect(presenceRef).set(false);
      } catch {}
      return { roomCode: normalizedCode, reconnected: true };
    }
    throw new Error("Game is already in progress. New players cannot join.");
  }

  const currentPlayers = room.players || {};
  if (currentPlayers[playerUid]) {
    await update(ref(db, `rooms/${normalizedCode}/players/${playerUid}`), sanitizeForFirebase({
      online: true,
    }));
    const presenceRef = ref(
      db,
      `rooms/${normalizedCode}/players/${playerUid}/online`
    );
    onDisconnect(presenceRef).set(false);
    return { roomCode: normalizedCode, slot: currentPlayers[playerUid].slot };
  }

  const playerCount = Object.keys(currentPlayers).length;
  if (playerCount >= (meta.maxPlayers || 4)) {
    throw new Error("Room is full. Maximum 4 players allowed.");
  }

  const usedSlots = Object.values(currentPlayers).map((p) => p.slot);
  const availableSlot = [0, 1, 2, 3].find((s) => !usedSlots.includes(s)) ?? playerCount;

  await update(ref(db, `rooms/${normalizedCode}/players/${playerUid}`), sanitizeForFirebase({
    uid: playerUid,
    discordId: user?.id || user?.discordId || null,
    displayName,
    avatar,
    houseId: null,
    slot: availableSlot,
    ready: false,
    online: true,
    joinedAt: serverTimestamp(),
  }));

  try {
    const presenceRef = ref(
      db,
      `rooms/${normalizedCode}/players/${playerUid}/online`
    );
    onDisconnect(presenceRef).set(false);
  } catch {}

  return { roomCode: normalizedCode, slot: availableSlot };
}

// ── Join Room as Spectator / Admin ──────────────────────────────
export async function joinAsSpectator(roomCode, user) {
  if (!db) {
    throw new Error("Firebase Database is not initialized.");
  }

  const fbUser = await ensureFirebaseAuth();
  if (!fbUser) {
    throw new Error("Firebase authentication failed.");
  }

  const spectatorUid = fbUser.uid;
  const displayName = user?.displayName || user?.username || "Spectator";
  const avatar = user?.avatar || null;

  const normalizedCode = (roomCode || "").toUpperCase().trim();
  const roomRef = ref(db, `rooms/${normalizedCode}`);
  const roomSnap = await get(roomRef);

  if (!roomSnap.exists()) {
    throw new Error("Room not found. Please verify the room code.");
  }

  const meta = roomSnap.val().meta || {};
  if (isRoomExpired(meta)) {
    try {
      await remove(roomRef);
    } catch {}
    throw new Error("Room has expired after 3 hours of inactivity.");
  }

  await update(ref(db, `rooms/${normalizedCode}/spectators/${spectatorUid}`), sanitizeForFirebase({
    uid: spectatorUid,
    discordId: user?.id || user?.discordId || null,
    displayName,
    avatar,
    isAdmin: Boolean(user?.isAdmin),
    online: true,
    joinedAt: serverTimestamp(),
  }));

  try {
    const presenceRef = ref(
      db,
      `rooms/${normalizedCode}/spectators/${spectatorUid}/online`
    );
    onDisconnect(presenceRef).set(false);
  } catch {}

  return { roomCode: normalizedCode, role: "spectator" };
}

// ── House Selection ─────────────────────────────────────────────
export async function selectHouse(roomCode, uid, houseId) {
  if (!db) return;
  const fbUser = auth?.currentUser;
  const targetUid = fbUser?.uid || uid;
  if (!targetUid) return;

  const normalizedCode = (roomCode || "").toUpperCase().trim();
  const playersSnap = await get(ref(db, `rooms/${normalizedCode}/players`));
  const players = playersSnap.val() || {};

  const isTaken = Object.values(players).some(
    (p) => p.houseId === houseId && p.uid !== targetUid
  );

  if (isTaken) {
    throw new Error("This house has already been selected by another player.");
  }

  if (!players[targetUid]) {
    await update(ref(db, `rooms/${normalizedCode}/players/${targetUid}`), sanitizeForFirebase({
      uid: targetUid,
      houseId: houseId || null,
      ready: Boolean(houseId),
      online: true,
      joinedAt: serverTimestamp(),
    }));
  } else {
    await update(ref(db, `rooms/${normalizedCode}/players/${targetUid}`), sanitizeForFirebase({
      houseId: houseId || null,
      ready: Boolean(houseId),
    }));
  }
}

// ── Update Room Status ──────────────────────────────────────────
export async function updateRoomStatus(roomCode, status) {
  if (!db) return;
  const normalizedCode = (roomCode || "").toUpperCase().trim();
  await update(ref(db, `rooms/${normalizedCode}/meta`), sanitizeForFirebase({ status }));
}

// ── State Serialization Helpers ─────────────────────────────────
export function serializeGameState(state) {
  if (!state) return null;
  const raw = {
    ...state,
    monsterCells: Array.from(state.monsterCells || []),
  };
  return sanitizeForFirebase(raw);
}

export function deserializeGameState(raw) {
  if (!raw) return null;

  const rawPlayers = raw.players;
  const playersList = Array.isArray(rawPlayers)
    ? rawPlayers
    : rawPlayers && typeof rawPlayers === "object"
    ? Object.values(rawPlayers)
    : [];

  const players = playersList.map((p) => {
    if (!p) return p;
    return {
      ...p,
      potions: Array.isArray(p.potions)
        ? p.potions
        : p.potions && typeof p.potions === "object"
        ? Object.values(p.potions)
        : [],
      skills: Array.isArray(p.skills)
        ? p.skills
        : p.skills && typeof p.skills === "object"
        ? Object.values(p.skills)
        : [],
      bingoCards: Array.isArray(p.bingoCards)
        ? p.bingoCards
        : p.bingoCards && typeof p.bingoCards === "object"
        ? Object.values(p.bingoCards)
        : [],
      skillCooldowns:
        p.skillCooldowns && typeof p.skillCooldowns === "object" ? p.skillCooldowns : {},
    };
  });

  const rawLog = raw.log;
  const log = Array.isArray(rawLog)
    ? rawLog
    : rawLog && typeof rawLog === "object"
    ? Object.values(rawLog)
    : [];

  const rawInitRolls = raw.initiativeRolls;
  const initiativeRolls = Array.isArray(rawInitRolls)
    ? rawInitRolls
    : rawInitRolls && typeof rawInitRolls === "object"
    ? Object.values(rawInitRolls)
    : [];

  const rawMonsterCells = raw.monsterCells;
  const monsterCellsArray = Array.isArray(rawMonsterCells)
    ? rawMonsterCells
    : rawMonsterCells && typeof rawMonsterCells === "object"
    ? Object.values(rawMonsterCells)
    : [];

  // Firebase RTDB can return sparse/odd arrays as index-keyed objects.
  // Normalize nested arrays inside `combatState` (notably `log`) so the
  // reducer's spread operations cannot throw "not iterable" after hydration.
  const rawCombat = raw.combatState;
  const combatState =
    rawCombat && typeof rawCombat === "object"
      ? {
          ...rawCombat,
          log: Array.isArray(rawCombat.log)
            ? rawCombat.log
            : rawCombat.log && typeof rawCombat.log === "object"
            ? Object.values(rawCombat.log)
            : [],
        }
      : rawCombat;

  return {
    ...raw,
    players,
    log,
    initiativeRolls,
    monsterCells: new Set(monsterCellsArray),
    combatState,
  };
}

// ── Write Game State (Host Only) ────────────────────────────────
export async function writeGameState(roomCode, gameState) {
  if (!db) return;
  const normalizedCode = (roomCode || "").toUpperCase().trim();
  const serialized = serializeGameState(gameState);
  await set(ref(db, `rooms/${normalizedCode}/gameState`), serialized);
}

// ── Subscribe Game State (Player / Spectator) ───────────────────
export function subscribeGameState(roomCode, onState) {
  if (!db) return () => {};
  const normalizedCode = (roomCode || "").toUpperCase().trim();
  const stateRef = ref(db, `rooms/${normalizedCode}/gameState`);

  const handler = (snap) => {
    if (snap.exists()) {
      const parsed = deserializeGameState(snap.val());
      onState(parsed);
    }
  };

  onValue(stateRef, handler);

  return () => {
    off(stateRef, "value", handler);
  };
}

// ── Send Action (Player → Action Queue) ──────────────────────────
export async function sendAction(roomCode, action) {
  if (!db) return;
  const fbUser = auth?.currentUser;
  const playerUid = fbUser?.uid || action.playerUid;

  const normalizedCode = (roomCode || "").toUpperCase().trim();
  const actionsRef = ref(db, `rooms/${normalizedCode}/actions`);
  const payload = sanitizeForFirebase({
    ...action,
    playerUid,
    timestamp: serverTimestamp(),
  });
  await push(actionsRef, payload);
}

// ── Subscribe Actions Queue (Host Only) ─────────────────────────
export function subscribeActions(roomCode, onActions) {
  if (!db) return () => {};
  const normalizedCode = (roomCode || "").toUpperCase().trim();
  const actionsRef = ref(db, `rooms/${normalizedCode}/actions`);

  const handler = (snap) => {
    if (snap.exists()) {
      const actions = snap.val();
      onActions(actions);
      remove(actionsRef);
    }
  };

  onValue(actionsRef, handler);

  return () => {
    off(actionsRef, "value", handler);
  };
}

// ── Leave Room ──────────────────────────────────────────────────
export async function leaveRoom(roomCode, uid) {
  if (!db) return;
  const fbUser = auth?.currentUser;
  const targetUid = fbUser?.uid || uid;
  const normalizedCode = (roomCode || "").toUpperCase().trim();
  await remove(ref(db, `rooms/${normalizedCode}/players/${targetUid}`));
}

// ── Delete Room (Host) ──────────────────────────────────────────
export async function deleteRoom(roomCode) {
  if (!db) return;
  const normalizedCode = (roomCode || "").toUpperCase().trim();
  await remove(ref(db, `rooms/${normalizedCode}`));
}
