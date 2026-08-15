"use client";

export default function GameLog({ log, logs, collapsed = false, onToggleCollapse }) {
  const rawList = Array.isArray(log) ? log : Array.isArray(logs) ? logs : [];
  const recent = [...rawList].reverse().slice(0, 40);
  const latest = recent[0];

  // โหมดพับ: แถบแนวตั้งบางๆ
  if (collapsed) {
    return (
      <button
        onClick={onToggleCollapse}
        className="game-log-collapsed group relative"
        title={latest ? `ล่าสุด: ${latest}` : "เปิดบันทึกเหตุการณ์"}
      >
        <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-110 group-hover:bg-amber-500/20 transition-all">
          📜
        </div>
        <span className="game-log-collapsed-text">บันทึกเหตุการณ์ ({log.length})</span>
        <span className="game-log-collapsed-arrow text-amber-400/60 group-hover:text-amber-400">◀</span>
      </button>
    );
  }

  return (
    <div className="game-log shadow-xl border border-white/10 backdrop-blur-md">
      <div className="game-log-header flex items-center justify-between border-b border-white/10 px-3.5 py-2.5 bg-slate-900/60">
        <div className="flex items-center gap-2">
          <span className="text-amber-400 text-sm">📜</span>
          <span className="text-xs font-black tracking-wider text-slate-200 uppercase">บันทึกเหตุการณ์</span>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
            {log.length}
          </span>
        </div>
        <button
          onClick={onToggleCollapse}
          className="panel-collapse-btn hover:text-amber-400 hover:border-amber-400/50"
          title="พับบันทึกเหตุการณ์"
        >
          ▶
        </button>
      </div>
      <div className="game-log-body">
        {recent.map((line, i) => (
          <div
            key={i}
            className={`log-line text-xs py-1.5 px-2 rounded-lg transition-colors ${
              i === 0
                ? "log-line-latest bg-amber-500/10 border border-amber-500/30 text-amber-200 font-bold"
                : "hover:bg-white/5 text-slate-300/80"
            }`}
          >
            {line}
          </div>
        ))}
        {recent.length === 0 && (
          <div className="log-line opacity-40 text-center py-6 text-xs">ยังไม่มีเหตุการณ์...</div>
        )}
      </div>
    </div>
  );
}
