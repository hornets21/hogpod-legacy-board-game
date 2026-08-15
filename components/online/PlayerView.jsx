"use client";

import PlayerCard from "@/components/PlayerCard";
import TurnTimer from "./TurnTimer";

export default function PlayerView({
  gameState,
  myPlayerIndex,
  isMyTurn,
  turnTimeLeft = 15,
  onRollDice,
  onUseSkill,
  onUsePotion,
  onOpenShop,
}) {
  if (!gameState || myPlayerIndex == null || myPlayerIndex < 0) {
    return null;
  }

  const player = gameState.players?.[myPlayerIndex];
  if (!player) return null;

  const currentTurnPlayer = gameState.players?.[gameState.currentPlayerIndex];

  return (
    <div className="fixed inset-0 pointer-events-none z-30 flex flex-col justify-between p-4 select-none">
      {/* Top Banner: Turn Status & Countdown */}
      <div className="pointer-events-auto flex items-center justify-between w-full max-w-xl mx-auto">
        <div className="flex items-center gap-3 bg-black/60 border border-white/10 rounded-xl px-4 py-2 backdrop-blur-md">
          <span
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: currentTurnPlayer?.color || "#ffffff" }}
          />
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-slate-400">
              Round {gameState.round || 1} · Current Turn
            </span>
            <span className="text-xs font-black text-white truncate max-w-[150px]">
              {currentTurnPlayer?.name || "Playing"}
            </span>
          </div>
        </div>

        <TurnTimer
          timeLeft={turnTimeLeft}
          maxTime={15}
          isMyTurn={isMyTurn}
        />
      </div>

      {/* Bottom Panel: Own Player Card & Controls */}
      <div className="pointer-events-auto flex justify-center w-full">
        <div className="w-full max-w-md">
          <PlayerCard
            player={player}
            playerIndex={myPlayerIndex}
            isCurrent={isMyTurn}
            onRollDice={isMyTurn ? onRollDice : null}
            onUseSkill={isMyTurn ? onUseSkill : null}
            onUsePotion={isMyTurn ? onUsePotion : null}
            onOpenShop={onOpenShop}
          />
        </div>
      </div>
    </div>
  );
}
