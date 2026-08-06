// ============================================================
// skillFxBus — Simple event bus สื่อสารระหว่าง reducer
// กับ UI layer (PlayerCard, DamagePopup) และ 3D Canvas (BoardCanvas)
// เป็น singleton emit/subscribe ไม่ได้ผูกกับ React lifecycle
// ============================================================

const listeners = new Map(); // eventType -> Set<fn>

export const FX_EVENTS = {
  SKILL_CAST: "skill_cast",          // ใครร่ายสกิลอะไร
  DAMAGE_DEALT: "damage_dealt",      // ใครโดนเท่าไหร่ ประเภทไหน
  HEAL: "heal",                      // ใครได้รับการรักษา
  BUFF_GAINED: "buff_gained",         // ใครได้บัฟอะไร
  BUFF_LOST: "buff_lost",            // ใครหายบัฟอะไร
  MONSTER_KILLED: "monster_killed", // มอนสเตอร์ตายที่ช่องไหน
  PLAYER_DIED: "player_died",        // ใครตายจาก skill
  DICE_ROLL: "dice_roll",            // เสียงหมุนทอยลูกเต๋า
  STEP_MOVE: "step_move",            // เสียงเดินทีละช่อง
  SHOP_BUY: "shop_buy",              // เสียงซื้อของ
  TRAP_TRIGGER: "trap_trigger",      // เสียงเหยียบกับดัก
  VICTORY: "victory",                // เสียงชนะ
  PVP_START: "pvp_start",            // เสียงเริ่ม PVP
  GOLD_GAIN: "gold_gain",            // เงินเพิ่มขึ้นแบบ MOBA หรือจากรางวัล
};

export function on(eventType, handler) {
  if (!listeners.has(eventType)) listeners.set(eventType, new Set());
  listeners.get(eventType).add(handler);
  return () => off(eventType, handler);
}

export function off(eventType, handler) {
  const set = listeners.get(eventType);
  if (set) set.delete(handler);
}

export function emit(eventType, payload) {
  // แบ่ง schedule ออกจาก render phase เพื่อกัน "setState during render" warning
  // ใช้ queueMicrotask ให้ทำหลังจาก render commit เสร็จ
  queueMicrotask(() => {
    const set = listeners.get(eventType);
    if (!set) return;
    // clone set ป้องกัน side-effect ระหว่าง iteration
    [...set].forEach((fn) => {
      try {
        fn(payload);
      } catch (err) {
        console.error("[skillFxBus]", eventType, err);
      }
    });
  });
}

// ─── Helper สำหรับ emit ที่ใช้ใน gameEngine ────────────────
export function emitSkillCast({ playerId, skillId, targetIndex = null, skillData = null }) {
  emit(FX_EVENTS.SKILL_CAST, { playerId, skillId, targetIndex, skillData, ts: Date.now() });
}

export function emitDamageDealt({ targetIndex, amount, type = "skill", sourceId = null }) {
  emit(FX_EVENTS.DAMAGE_DEALT, { targetIndex, amount, type, sourceId, ts: Date.now() });
}

export function emitHeal({ targetIndex, amount }) {
  emit(FX_EVENTS.HEAL, { targetIndex, amount, ts: Date.now() });
}

export function emitGoldGain({ targetIndex, amount }) {
  emit(FX_EVENTS.GOLD_GAIN, { targetIndex, amount, ts: Date.now() });
}

export function emitBuffGained({ targetIndex, buffId, duration = 0, amount = 0 }) {
  emit(FX_EVENTS.BUFF_GAINED, { targetIndex, buffId, duration, amount, ts: Date.now() });
}

export function emitMonsterKilled({ cell, skillId = null }) {
  emit(FX_EVENTS.MONSTER_KILLED, { cell, skillId, ts: Date.now() });
}

export function emitPlayerDied({ playerIndex, cause = "skill" }) {
  emit(FX_EVENTS.PLAYER_DIED, { playerIndex, cause, ts: Date.now() });
}

export function emitDiceRoll() {
  emit(FX_EVENTS.DICE_ROLL, { ts: Date.now() });
}

export function emitStepMove() {
  emit(FX_EVENTS.STEP_MOVE, { ts: Date.now() });
}

export function emitShopBuy() {
  emit(FX_EVENTS.SHOP_BUY, { ts: Date.now() });
}

export function emitTrapTrigger() {
  emit(FX_EVENTS.TRAP_TRIGGER, { ts: Date.now() });
}

export function emitVictory() {
  emit(FX_EVENTS.VICTORY, { ts: Date.now() });
}

export function emitPvpStart() {
  emit(FX_EVENTS.PVP_START, { ts: Date.now() });
}