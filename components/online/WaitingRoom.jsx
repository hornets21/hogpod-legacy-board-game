"use client";

import { useState } from "react";
import { HOUSE_LIST } from "@/lib/gameData";
import { selectHouse, updateRoomStatus, writeGameState, deleteRoom, leaveRoom } from "@/lib/roomManager";
import { createInitialGameState } from "@/lib/gameEngine";
import HouseModelPreview from "@/components/board3d/HouseModelPreview";

export default function WaitingRoom({
  roomCode,
  user,
  role,
  players = {},
  spectators = {},
  meta = {},
  onStartGame,
  onLeave,
  onDelete,
}) {
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const isHost = role === "host";
  const myPlayer = players[user?.uid];
  const myHouseId = myPlayer?.houseId || null;

  const playerList = Object.values(players || {});
  const spectatorList = Object.values(spectators || {});

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleSelectHouse = async (houseId) => {
    if (role === "spectator") return;
    setErrorMsg("");
    try {
      await selectHouse(roomCode, user.uid, houseId);
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleStartGameClick = async () => {
    if (!isHost) return;
    setErrorMsg("");
    setLoading(true);

    try {
      // 1. Initialize base game state
      const initialState = createInitialGameState();
      initialState.phase = "play";

      // 2. Ensure Host is assigned to a house if not explicitly picked
      let updatedPlayerList = [...playerList];
      const hostEntry = updatedPlayerList.find((p) => p.uid === user.uid);
      if (hostEntry && !hostEntry.houseId) {
        const takenHouses = new Set(updatedPlayerList.map((p) => p.houseId).filter(Boolean));
        const freeHouse = HOUSE_LIST.find((h) => !takenHouses.has(h.id));
        if (freeHouse) {
          hostEntry.houseId = freeHouse.id;
          try {
            await selectHouse(roomCode, user.uid, freeHouse.id);
          } catch {}
        }
      }

      // 3. Map online players to their chosen house
      updatedPlayerList.forEach((p) => {
        if (p.houseId) {
          const houseIdx = initialState.players.findIndex(
            (h) => h.houseId === p.houseId
          );
          if (houseIdx >= 0) {
            initialState.players[houseIdx]._onlineUid = p.uid || null;
            initialState.players[houseIdx]._onlineName = p.displayName || null;
            initialState.players[houseIdx]._onlineAvatar = p.avatar || null;
            initialState.players[houseIdx].discordId = p.discordId || null;
            initialState.players[houseIdx].isBot = false;
          }
        }
      });

      // 4. Mark unassigned houses as Bots
      initialState.players.forEach((player) => {
        if (!player._onlineUid) {
          player.isBot = true;
          player._onlineName = `Bot ${player.name}`;
          player._onlineAvatar = null;
        }
      });

      // 5. Roll initiative d20 for all 4 players to determine turn order
      const rollScores = initialState.players.map((p, idx) => ({
        player: p,
        idx,
        score: Math.floor(Math.random() * 20) + 1,
      }));

      // Sort by score descending (highest roll walks first)
      rollScores.sort((a, b) => b.score - a.score);
      const orderedPlayers = rollScores.map((item) => item.player);

      const initiativeLogs = rollScores.map(
        (item, rank) =>
          `#${rank + 1} ${item.player.name} rolled ${item.score}`
      );

      initialState.players = orderedPlayers;
      initialState.currentPlayerIndex = 0;
      initialState.phase = "initiative";
      initialState.initiativeRolls = rollScores;
      initialState.log = [
        ...initialState.log,
        "Starting online game. Rolling initiative d20 for turn order:",
        ...initiativeLogs,
        `${orderedPlayers[0].name} rolled highest and moves first!`,
      ];

      // 6. Write initial synchronized state and transition room status
      await writeGameState(roomCode, initialState);
      await updateRoomStatus(roomCode, "playing");

      if (onStartGame) onStartGame(initialState);
    } catch (err) {
      setErrorMsg(err.message || "Failed to start game.");
      setLoading(false);
    }
  };

  // Validation: Ready to start as long as at least 1 player has picked a house
  const assignedHousesCount = HOUSE_LIST.filter((house) =>
    playerList.some((p) => p.houseId === house.id)
  ).length;
  const canStartGame = assignedHousesCount >= 1;
  const botCount = 4 - assignedHousesCount;

  return (
    <main className="fixed inset-0 z-50 flex items-center justify-center bg-[#050407] text-white p-4 select-none overflow-y-auto">
      <div className="w-full max-w-4xl bg-slate-900/80 border border-white/10 rounded-2xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-white/10 gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-[#f2c75c]">
              HOGPOD LEGACY · MULTIPLAYER LOBBY
            </div>
            <h1 className="text-2xl sm:text-3xl font-black mt-1">Waiting Room</h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-black/60 border border-white/10 rounded-xl px-4 py-2 flex items-center gap-2">
              <span className="text-xs text-slate-400 font-bold uppercase">Room Code</span>
              <span className="text-xl font-black font-mono text-[#f2c75c] tracking-widest">
                {roomCode}
              </span>
            </div>
            <button
              type="button"
              onClick={handleCopyCode}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold transition-colors border border-white/10"
            >
              {copied ? "Copied" : "Copy Code"}
            </button>
          </div>
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div className="mt-4 p-3 bg-red-950/80 border border-red-500/30 rounded-xl text-red-300 text-sm font-semibold">
            {errorMsg}
          </div>
        )}

        {/* Role & House Selection Grid */}
        <div className="mt-6">
          <div className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3">
            Select House
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {HOUSE_LIST.map((house) => {
              const occupant = playerList.find((p) => p.houseId === house.id);
              const isSelectedByMe = occupant?.uid === user?.uid;
              const isOccupied = Boolean(occupant);

              return (
                <div
                  key={house.id}
                  className={`relative p-4 rounded-2xl border transition-all flex flex-col items-center text-center ${
                    isSelectedByMe
                      ? "bg-slate-800/90 border-[#f2c75c] shadow-[0_0_20px_rgba(242,199,92,0.2)]"
                      : isOccupied
                      ? "bg-black/40 border-white/10 opacity-70"
                      : "bg-slate-900/50 border-white/10 hover:border-white/30"
                  }`}
                >
                  <div className="w-full h-36 mb-3 rounded-xl overflow-hidden relative bg-black/50 border border-white/10 flex items-center justify-center shadow-inner">
                    <div
                      className="absolute inset-0 opacity-25 pointer-events-none"
                      style={{ background: `radial-gradient(circle at center, ${house.color}, transparent 70%)` }}
                    />
                    <HouseModelPreview
                      houseId={house.id}
                      fallbackEmoji={house.emoji}
                      className="w-full h-full relative z-0"
                    />
                  </div>

                  <div className="font-black text-lg text-white">{house.name}</div>
                  <div className="text-xs text-slate-400 mb-4">{house.nameEn}</div>

                  {occupant ? (
                    <div className="mt-auto w-full pt-3 border-t border-white/10 flex items-center justify-center gap-2">
                      {occupant.avatar && (
                        <img
                          src={occupant.avatar}
                          alt={occupant.displayName}
                          className="w-6 h-6 rounded-full"
                        />
                      )}
                      <span className="text-xs font-bold truncate max-w-[120px] text-[#f2c75c]">
                        {occupant.displayName}
                      </span>
                    </div>
                  ) : (
                    <div className="mt-auto w-full flex flex-col gap-2">
                      <button
                        type="button"
                        disabled={!Boolean(players[user?.uid])}
                        onClick={() => handleSelectHouse(house.id)}
                        className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-xl border border-white/10 transition-colors disabled:opacity-50"
                      >
                        Select House
                      </button>
                      <div className="text-[11px] text-slate-500 font-semibold flex items-center justify-center gap-1">
                        Bot plays if unassigned
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Players & Spectators Status */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-black/40 border border-white/10 rounded-xl p-4">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Players {playerList.length}/4
            </div>
            <div className="flex flex-col gap-2">
              {playerList.map((p) => (
                <div key={p.uid} className="flex items-center justify-between text-xs py-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        p.online ? "bg-emerald-400" : "bg-slate-600"
                      }`}
                    />
                    <span className="font-semibold text-white">{p.displayName}</span>
                    {p.uid === meta?.hostUid && (
                      <span className="text-[10px] bg-[#f2c75c]/20 text-[#f2c75c] font-bold px-1.5 py-0.5 rounded">
                        HOST
                      </span>
                    )}
                  </div>
                  <span className="text-slate-400">
                    {p.houseId ? "House selected" : "Selecting house..."}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-black/40 border border-white/10 rounded-xl p-4">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Spectators {spectatorList.length}
            </div>
            <div className="flex flex-col gap-2 max-h-24 overflow-y-auto">
              {spectatorList.length === 0 ? (
                <span className="text-xs text-slate-500">No spectators in room</span>
              ) : (
                spectatorList.map((s) => (
                  <div key={s.uid} className="flex items-center gap-2 text-xs py-1">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        s.online ? "bg-blue-400" : "bg-slate-600"
                      }`}
                    />
                    <span className="font-semibold text-slate-300">{s.displayName}</span>
                    {s.uid === meta?.hostUid && (
                      <span className="text-[10px] bg-[#f2c75c]/20 text-[#f2c75c] font-bold px-1.5 py-0.5 rounded">
                        OWNER
                      </span>
                    )}
                    {s.isAdmin ? (
                      <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-1.5 py-0.5 rounded">
                        ADMIN
                      </span>
                    ) : (
                      <span className="text-[10px] bg-blue-500/20 text-blue-300 font-bold px-1.5 py-0.5 rounded">
                        SPECTATOR
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-white/10">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onLeave}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-bold transition-colors border border-white/10 text-slate-300"
            >
              Leave Room
            </button>

            {(isHost || role === "spectator" || spectators[user?.uid]?.isAdmin) && onDelete && (
              <button
                type="button"
                onClick={onDelete}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-red-950/80 hover:bg-red-900 text-sm font-bold transition-colors border border-red-500/30 text-red-300"
              >
                Delete Room
              </button>
            )}
          </div>

          {isHost ? (
            <button
              type="button"
              disabled={!canStartGame || loading}
              onClick={handleStartGameClick}
              className="w-full sm:w-auto px-8 py-3 rounded-xl bg-[#e51b4b] hover:bg-[#c0153e] disabled:opacity-40 disabled:hover:bg-[#e51b4b] text-white font-black tracking-wide text-sm transition-all shadow-lg shadow-red-950/50 flex items-center justify-center gap-2"
            >
              {loading ? (
                "Preparing board..."
              ) : botCount > 0 ? (
                <>
                  <span>Start Game</span>
                  <span className="text-xs bg-black/40 px-2 py-0.5 rounded-md text-amber-300 font-bold">
                    Fill {botCount} Bots
                  </span>
                </>
              ) : (
                "Start Game"
              )}
            </button>
          ) : (
            <div className="text-xs text-slate-400 font-semibold">
              {canStartGame ? "Waiting for Host to start game..." : "Waiting for players to choose houses..."}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
