import WheelOfFate from "@/components/WheelOfFate";
import { getTotalDmg } from "@/lib/gameEngine";

export default function CombatModal({ combatState, player, onResolveCombat, onUseSkill, onFlee }) {
  if (!combatState || !player) return null;
  const { monster } = combatState;
  const totalDmg = getTotalDmg(player);
  const hpPct = Math.max(0, (monster.currentHp / monster.hp) * 100);
  const playerHpPct = Math.max(0, (player.hp / player.maxHp) * 100);

  // Future image paths (Placeholder ready)
  const playerIdleImg = player.image || null;
  const monsterIdleImg = monster.image || null; // e.g. `/images/monsters/${monster.id}.png`

  return (
    <div className="modal-overlay combat-overlay">
      <div className="modal-box combat-modal max-w-5xl w-full p-6 bg-slate-950/95 border border-yellow-500/30 rounded-3xl shadow-2xl">
        
        {/* Header Title */}
        <div className="text-center mb-4">
          <span className="text-xs font-black tracking-widest text-yellow-500 uppercase">
            {monster.isBoss ? "⚠️ GRAND BOSS BATTLE" : monster.isElite ? "⚡ ELITE DUEL" : "⚔️ ONE-TURN DUEL"}
          </span>
          <h2 className="text-2xl font-black text-white">การประลองตัดสินในเทิร์นเดียว</h2>
        </div>

        {/* 3-Column VS Layout */}
        <div className="grid grid-cols-1 md:grid-cols-[240px_1fr_240px] gap-6 items-center my-2">

          {/* LEFT: Player Fighter Card */}
          <div className="flex flex-col items-center bg-slate-900/90 border border-emerald-500/40 rounded-2xl p-5 shadow-xl text-center relative overflow-hidden">
            <div className="absolute top-3 left-3 text-[10px] font-black uppercase text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded-md border border-emerald-500/40 tracking-wider">
              PLAYER
            </div>

            {/* Player Avatar / Idle Image Frame */}
            <div className="w-36 h-36 my-4 rounded-2xl border-2 border-emerald-400/60 overflow-hidden bg-black/80 flex items-center justify-center shadow-[0_0_20px_rgba(34,197,94,0.3)]">
              {playerIdleImg ? (
                <img src={playerIdleImg} alt={player.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-6xl">{player.emoji}</span>
              )}
            </div>

            <h3 className="font-black text-white text-lg">{player.name}</h3>
            <p className="text-xs text-white/50 font-bold mb-4">{player.nameEn}</p>

            {/* Player Stats */}
            <div className="w-full space-y-2.5 text-xs bg-black/40 p-3 rounded-xl border border-white/5">
              <div className="flex justify-between font-bold text-white/80">
                <span>❤️ HP</span>
                <span className="text-emerald-400 font-black">{Math.max(0, player.hp)} / {player.maxHp}</span>
              </div>
              <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${playerHpPct}%` }} />
              </div>
              <div className="flex justify-between font-bold text-white/80 pt-1 border-t border-white/5">
                <span>⚔️ พลังโจมตี</span>
                <span className="text-orange-400 font-black text-sm">{totalDmg}</span>
              </div>
            </div>
          </div>

          {/* CENTER: Wheel of Fate */}
          <div className="flex flex-col items-center justify-center py-2">
            <WheelOfFate
              monster={monster}
              player={player}
              onSpinComplete={(outcome) => onResolveCombat(outcome)}
            />
          </div>

          {/* RIGHT: Monster Enemy Card */}
          <div className="flex flex-col items-center bg-slate-900/90 border border-red-500/40 rounded-2xl p-5 shadow-xl text-center relative overflow-hidden">
            <div className="absolute top-3 right-3 text-[10px] font-black uppercase text-red-400 bg-red-950/80 px-2.5 py-1 rounded-md border border-red-500/40 tracking-wider">
              ENEMY
            </div>

            {/* Monster Avatar / Idle Image Frame */}
            <div className="w-36 h-36 my-4 rounded-2xl border-2 border-red-400/60 overflow-hidden bg-black/80 flex items-center justify-center shadow-[0_0_20px_rgba(239,68,68,0.3)]">
              {monsterIdleImg ? (
                <img src={monsterIdleImg} alt={monster.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-6xl">{monster.emoji || "👾"}</span>
              )}
            </div>

            <h3 className="font-black text-white text-lg">{monster.name}</h3>
            <p className="text-xs text-white/50 font-bold mb-4">{monster.nameEn}</p>

            {/* Monster Stats */}
            <div className="w-full space-y-2.5 text-xs bg-black/40 p-3 rounded-xl border border-white/5">
              <div className="flex justify-between font-bold text-white/80">
                <span>👾 HP</span>
                <span className="text-red-400 font-black">{Math.max(0, monster.currentHp)} / {monster.hp}</span>
              </div>
              <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-red-500 transition-all duration-300" style={{ width: `${hpPct}%` }} />
              </div>
              <div className="flex justify-between font-bold text-white/80 pt-1 border-t border-white/5">
                <span>💀 ดาเมจมอน</span>
                <span className="text-red-400 font-black text-sm">{monster.dmg}</span>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Actions */}
        {onFlee && (
          <div className="mt-4 flex justify-center border-t border-white/10 pt-4">
            <button onClick={onFlee} className="btn-flee text-xs px-6 py-2">
              🏃 หนีการต่อสู้ (ใช้บัฟแบงค์)
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
