# Skill Visual Feedback & Game Feel

คู่มืออ้างอิงสำหรับระบบ Visual Feedback, Game Feel และ UI Feedback ของ Skill System
เพิ่มเข้ามาในเกมเพื่อให้การร่ายสกิล/การต่อสู้ดู "ไม่แห้ง"

---

## ภาพรวมระบบ

ระบบแบ่งเป็น 4 เลเยอร์:

1. **Event Bus** (`lib/skillFxBus.js`) — สื่อสารระหว่าง reducer กับ UI/3D Canvas
2. **UI/DOM Feedback** (`components/fx/`) — แสดงบน PlayerCard และ Combat Modal
3. **3D Feedback** (`components/board3d/`) — แสดงบนกระดาน 3D
4. **SFX** (`lib/sfx.js`) — เสียง synthesized ผ่าน Web Audio API (ไม่ต้องโหลดไฟล์)

---

## ไฟล์ใหม่ที่เพิ่ม

| ไฟล์ | หน้าที่ |
|---|---|
| `lib/skillFxBus.js` | Event bus แบบ singleton emit/subscribe |
| `lib/sfx.js` | Synthesized SFX ด้วย Web Audio API + auto-listen events |
| `components/fx/SkillButton.jsx` | ปุ่มสกิลพร้อม cooldown overlay + press anim + cast flash |
| `components/fx/BuffBadges.jsx` | แสดง indicator บอกสถานะ buff บนการ์ดผู้เล่น |
| `components/fx/DamagePopup.jsx` | เลขดาเมจ/ฮีล ที่เด้งขึ้นจากการ์ดผู้โดน |
| `components/board3d/SkillFxLayer.jsx` | เลเยอร์ particle/effect 3D ตอนร่ายสกิล |

## ไฟล์ที่แก้ไข

| ไฟล์ | สิ่งที่เปลี่ยน |
|---|---|
| `lib/gameEngine.js` | `useSkill` / `usePotion` emit events ตอน cast/damage/heal/buff/monster_died/player_died |
| `components/PlayerCard.jsx` | ใช้ `SkillButton` + `BuffBadges` + `DamagePopup` แทนปุ่มเดิม |
| `components/PvpCombatModal.jsx` | ใช้ `SkillButton` + emit events ตอน resolve PvP |
| `components/board3d/PlayerTokens.jsx` | เพิ่ม state `"hit"` (สั่น + emissive แดง) และ `"cast"` (เรืองแสงตามสีสกิล) ใน `useFrame` |
| `components/board3d/BoardCanvas.jsx` | mount `SkillFxLayer` ใน Canvas |
| `components/CombatModal.jsx` | HP bar ใช้ `motion.div` spring แทน CSS transition + hit-stop ตอน resolve |
| `components/BgmPlayer.jsx` | ติดตั้ง `attachSfxListeners()` + sync `setSfxMuted` ตาม `isMuted` |
| `app/page.jsx` | ห่อ `.game-shell` ด้วย `motion.div` + `useAnimation` สำหรับ screen shake |

---

## Event Bus API (`lib/skillFxBus.js`)

### Events ทั้งหมด

```js
export const FX_EVENTS = {
  SKILL_CAST:      "skill_cast",      // { playerId, skillId, targetIndex, skillData }
  DAMAGE_DEALT:    "damage_dealt",    // { targetIndex, amount, type, sourceId }
  HEAL:            "heal",            // { targetIndex, amount }
  BUFF_GAINED:     "buff_gained",     // { targetIndex, buffId, duration, amount }
  BUFF_LOST:       "buff_lost",       // { targetIndex, buffId }
  MONSTER_KILLED:  "monster_killed",  // { cell, skillId }
  PLAYER_DIED:     "player_died",     // { playerIndex, cause }
};
```

### การใช้งาน

```js
import { on, FX_EVENTS, emitSkillCast, emitDamageDealt } from "@/lib/skillFxBus";

// subscribe (คืน unsubscribe function)
useEffect(() => {
  const unsub = on(FX_EVENTS.SKILL_CAST, (payload) => {
    console.log(payload.playerId, payload.skillId);
  });
  return unsub;
}, []);

// emit ใน reducer/engine
emitSkillCast({ playerId, skillId, targetIndex, skillData });
emitDamageDealt({ targetIndex, amount, type: "skill_player" });
```

### type ของ damage
- `"skill_player"` — skill ทำดาเมจผู้เล่น (แดง)
- `"skill_monster"` — skill ทำดาเมจมอนสเตอร์ (ส้ม)
- `"pvp"` — ดาเมจจากการประลอง PvP (แดง)

---

## SkillButton Features (`components/fx/SkillButton.jsx`)

รวม feedback ทั้งหมดไว้ใน component เดียว:

| Feature | ภาพ |
|---|---|
| Cooldown Overlay | clip-path polygon บังปุ่มตามสัดส่วน `cd/maxCd` |
| Ability Cooldown UI | ตัวเลข cd ใหญ่ตรงกลาง + นาฬิกาเล็กหมุน ๆ มุมขวาบน |
| Button Press Animation | `whileTap={{ scale: 0.88 }}` + `whileHover={{ scale: 1.06, boxShadow }}` |
| Cast Flash | ring purple แผ่จากตัวปุ่มตอน event `SKILL_CAST` มาถึง |
| Ready Dot | จุดเขียวเล็ก ๆ ตอน `cd === 0` บอกว่าพร้อมใช้ |
| Selected State | bg amber + ring สำหรับกรณี PvP เลือกสกิลก่อน confirm |

### Props

```jsx
<SkillButton
  skillId="thunder_star"
  playerIndex={0}        // เจ้าของสกิล (เพื่อตรวจ cast flash)
  playerId={0}           // id ของผู้เล่น (playerId === playerIndex)
  cooldown={2}           // cd คงเหลือ
  onUse={(id) => dispatch({ type: "USE_SKILL", skillId: id })}
  size="sm"              // "sm" (PlayerCard) | "md" (PvP modal)
  selected={false}       // สถานะถูกเลือกไว้ (PvP)
  disabled={false}
/>
```

---

## BuffBadges (`components/fx/BuffBadges.jsx`)

อ่านค่าจาก player object แล้วแสดง badge อัตโนมัติ:

| Field บน player | buffId | ภาพ |
|---|---|---|
| `isInvincible && invincibleTurns > 0` | `invincible` | 🛡️ อมตะ {n}T (ฟ้า) |
| `tempDmgBonus > 0 && tempDmgTurns > 0` | `temp_dmg` | ⚔️ +dmgage (ส้ม) |
| `nextRollOverride` truthy | `lock_dice` | 🐍 ล็อกเต๋า (เขียว) |
| `pet.effect === "dodge_once" && !dodgeUsed` | `bank` | 🏦 แบงค์ (ทอง) |

ใช้ `AnimatePresence mode="popLayout"` ทำให้ badge เด้งเข้า-ออกนุ่ม ๆ

---

## DamagePopup (`components/fx/DamagePopup.jsx`)

- ใส่ใน `PlayerCard` แต่ละใบ (ทำงานเฉพาะตอน `targetIndex === playerIndex` ตรงกัน)
- subscribe `DAMAGE_DEALT` + `HEAL` events
- Cap 5 popups ต่อครั้ง กัน DOM clutter
- Auto-cleanup 1.1s
- สีตาม type (แดง=โดน, เขียว=ฮีล)

---

## 3D Hit Feedback (`components/board3d/PlayerTokens.jsx`)

เพิ่ม state `hitState` และ `castState` (ใช้ `useRef` + `useFrame`):

### Hit
- subscribe `DAMAGE_DEALT` เมื่อ `targetIndex === index` ของ token ตัวเอง
- duration: 0.6s
- ภาพ: token สั่นแบบ sin noise × scale decay, `emissive` ผสม `#ef4444` แดงแวบ ๆ
- เฟรมละครั้งจะ `mat.emissive.set(color)` ก่อนแล้วค่อย `lerp` เพื่อกันสะสมสี

### Cast
- subscribe `SKILL_CAST` เมื่อ `playerId === index` ของ token ตัวเอง
- duration: 0.8s
- สีตาม effect ของสกิล:
  - `invincible` → ฟ้า `#3b82f6`
  - `lock_dice` → เขียว `#22c55e`
  - `shuffle_positions` → ม่วง `#a855f7`
  - มี dmg → แดง `#ef4444`
  - default → ม่วง `#a855f7`
- cast ชนะ hit (cast แสดงแทนถ้าเกิดพร้อมกัน)

---

## SkillFxLayer 3D (`components/board3d/SkillFxLayer.jsx`)

เลเยอร์ effect 3D แยกจาก PlayerTokens ทำให้แก้ง่าย/ไม่กระทบเดินหมาก

### effect types

| fx.type | ภาพ | สกิล |
|---|---|---|
| `shield` | sphere wireframe expand + fade | `stay_stupid` (invincible) |
| `diceGlow` | torus เขียวรอบลูกเต๋า หมุน + pulse | `ngo_leng_ngeng_khiao` (lock_dice) |
| `shuffle` | ring ม่วงใหญ่กลางกระดาน หมุน 360° | `korat_chaos` (shuffle_positions) |
| `lightningBolt` | cylinder เหลือง 1.5-unit ตั้งตรงผู้ร่าย | `thunder_star` (monster target) |
| `beam` | cylinder แดงวางจากผู้ร่าย → เป้า ตามตำแหน่งจริง | `phoenix_force` (player target) |
| `burst` | sphere ขยาย + จาง (default) | สกิลอื่น ๆ |

### การเพิ่ม effect ใหม่

แก้ที่ฟังก์ชัน `buildEffect()` ใน `SkillFxLayer.jsx:81`:

```js
case "your_new_effect":
  return {
    id,
    type: "burst",           // หรือ type ใหม่
    position: casterPos,
    color: "#your-color",
    duration: 1.0,
  };
```

ถ้าอยากใช้ mesh รูปแบบใหม่ ให้ไปเพิ่ม case ใน `renderFxMesh()` ที่อยู่ท้ายไฟล์ด้วย

---

## SFX (`lib/sfx.js`)

ใช้ Web Audio API oscillator เลย ไม่ต้องโหลดไฟล์เสียง (ลด latency + ไม่มี asset โหลด)

### API

```js
import { setSfxMuted, attachSfxListeners } from "@/lib/sfx";

// ปิด/เปิด
setSfxMuted(true);

// mount listeners (BgmPlayer.jsx เรียบร้อยแล้ว)
const detach = attachSfxListeners();
detach(); // เอาออก
```

### เสียงตาม event
| Event | เสียง |
|---|---|
| `SKILL_CAST` (invincible) | sine ขึ้น 2 ชั้น |
| `SKILL_CAST` (lock_dice) | sawtooth ลง |
| `SKILL_CAST` (shuffle) | square ขึ้น |
| `SKILL_CAST` (มี dmg) | sawtooth ตก |
| `SKILL_CAST` (default) | triangle ขึ้น |
| `DAMAGE_DEALT` | square ตกหนัก |
| `HEAL` | sine ขึ้น |

AudioContext จะ Unlock หลัง user interaction ครั้งแรก (click/keydown) — ตรงตามนโยบาย browser

---

## Combat Hit-stop (`components/CombatModal.jsx`)

- ตอน `WheelOfFate.onSpinComplete` ทำให้ `setHitStop(true)` + หน่วง 80ms แล้วค่อยเรียก `onResolveCombat`
- ขณะ hit-stop มี `<motion.div bg-yellow-200 mix-blend-screen>` แฟลชทั้งจอ fade ออก 0.18s

## Spring HP Bar

เดิมใช้ CSS `transition-all duration-300` ตอนนี้ใช้:

```jsx
<motion.div
  className="h-full bg-red-500 rounded-full"
  initial={false}
  animate={{ width: `${hpPct}%` }}
  transition={{ type: "spring", stiffness: 200, damping: 22 }}
/>
```

ทำให้แถบเลือดเด้งนุ่มนิ่มกว่าเดิม

---

## Screen Shake (`app/page.jsx`)

ห่อ root `<div className="game-shell">` เป็น `<motion.div>` พร้อม `useAnimation()`:

```js
const shakeControls = useAnimation();

useEffect(() => {
  const u1 = on(FX_EVENTS.DAMAGE_DEALT, () => {
    shakeControls.start({
      x: [0, -3, 2, -2, 0],
      y: [0, 2, -2, 1, 0],
      transition: { duration: 0.18, ease: "easeOut" },
    });
  });
  const u2 = on(FX_EVENTS.SKILL_CAST, () => {
    shakeControls.start({
      x: [0, -2, 2, 0],
      transition: { duration: 0.1, ease: "easeOut" },
    });
  });
  return () => { u1(); u2(); };
}, [shakeControls]);
```

---

## การทดสอบ

```powershell
npm run dev
# เปิด http://localhost:3005
```

เช็คลิสต์ทดสอบ:
- [ ] Admin mode (`👑`) → give skill ให้บ้าน → `playersCollapsed` ขยาย → กดปุ่มสกิล
- [ ] ปุ่มมี overlay หมุน + ตัวเลข cd เด้ง
- [ ] `stay_stupid` → บนการ์ดขึ้น 🛡️ badge + token ฟ้าเรืองแสงตอนร่าย + shield bubble 3D
- [ ] `thunder_star` (combat) → เสียง sawtooth + token ผู้ร่ายเรืองแดง + lightning 3D
- [ ] `phoenix_force` → beam แดงจากผู้ร่ายไปยังเป้า + เป้าสั่น + เป้าเด้ง -80 DMG popup
- [ ] `korat_chaos` → ring ม่วงหมุนกลางกระดาน + สกิลทุกบ้าน emit ไปด้วย
- [ ] `lock_dice` → token เขียวเรือง + torus เขียวรอบลูกเต๋า
- [ ] HP bar ใน `CombatModal` เด้งแบบ spring ไม่ใช่ linear
- [ ] ตอน resolve combat มีแฟลชเหลือง + จอสั่นเล็กน้อย
- [ ] ปิด BGM (ลำโพง icon) → SFX เงียบด้วย

```powershell
npm run build
# ผ่าน lint + typecheck + prerender
```

---

## ข้อควรระวัง

1. **Event bus เป็น singleton ข้าม component** — อย่า emit ใน render function โดยตรงใช่ reducer/engine เท่านั้น
2. **สี emissive ใน 3D** — ต้อง `.set()` ทุกเฟรมก่อน `lerp()` ไม่งั้นค่าสะสมจนบานนอก
3. **motion/react** — ทุก component ที่ใช้ต้องมี `"use client"` (component ในโครงสร้างปัจจุบันเป็น client อยู่แล้ว)
4. **AudioContext** — ถ้าเปิดหน้าแล้วเสียงไม่ออก ให้คลิกจอ 1 ครั้ง (browser policy บังคับ user gesture)
5. **SkillFxLayer auto-cleanup** — `setTimeout` ใช้ `fx.duration * 1000 + 100` กัน race condition

## ทิศทางขยายต่อ

- เพิ่ม fx.type ใหม่ใน `SkillFxLayer` สำหรับ `steal_potion`, `banish_monster`, `steal_turn` (ตอนนี้ใช้ general `burst`)
- ใช้ `THREE.Points` ทำ particle จริงแทน sphere mesh (เดี๋ยวนี้ใช้ mesh เบสิก)
- เพิ่ม `BUFF_LOST` event ใน `tickCooldowns` ตอน buff หมด เพื่อสั่น 3D / เสียง off
- แยก SFX volume ต่างหากจาก BGM (ตอนนี้ผูกกับ `isMuted` ตัวเดียวกัน)