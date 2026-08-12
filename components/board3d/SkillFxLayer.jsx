"use client";

// ============================================================
// SkillFxLayer — เลเยอร์เอฟเฟกต์ 3D คุณภาพสูงสำหรับกระดาน (Stylized Low-Poly VFX)
// Subscribe สัญญาณจาก skillFxBus เพื่อ spawn Particle, Magic Circle, Elemental Spells
// และ Impact Flash ชั่วคราวบนกระดาน 3D
// ============================================================

import React, { useEffect, useRef, useState, useMemo, memo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { cellToWorld, TOKEN_OFFSETS } from "@/lib/boardLayout";
import { on, FX_EVENTS } from "@/lib/skillFxBus";

// === Shared Module-Level Geometries (Zero GC) ===
const SPARK_GEO = new THREE.SphereGeometry(1, 8, 8);
const MAGIC_RING_GEO = new THREE.RingGeometry(0.5, 0.75, 32);
const MAGIC_TORUS_GEO = new THREE.TorusGeometry(0.38, 0.04, 8, 24);
const MAGIC_PILLAR_GEO = new THREE.CylinderGeometry(0.45, 0.55, 1, 16, 1, true);

const SHIELD_SPHERE_GEO = new THREE.SphereGeometry(0.65, 24, 24);
const SHIELD_WIRE_GEO = new THREE.SphereGeometry(0.66, 14, 14);
const SHIELD_TORUS_GEO = new THREE.TorusGeometry(0.6, 0.03, 8, 32);

const HEAL_RING_GEO = new THREE.RingGeometry(0.2, 0.6, 32);

const FIRE_CORE_GEO = new THREE.SphereGeometry(0.35, 16, 16);

const ICE_RING_GEO = new THREE.RingGeometry(0.3, 0.7, 32);
const ICE_CONE_GEO = new THREE.ConeGeometry(0.08, 0.35, 5);

const LIGHTNING_CYL_GEO = new THREE.CylinderGeometry(0.06, 0.12, 2.5, 8);
const LIGHTNING_RING_GEO = new THREE.RingGeometry(0.2, 0.7, 32);

const TRAP_RING_GEO = new THREE.RingGeometry(0.2, 0.65, 32);
const TRAP_PUFF_GEO = new THREE.SphereGeometry(1, 10, 10);

const MONSTER_RING_GEO = new THREE.RingGeometry(0.3, 0.8, 32);

const UNIT_CYLINDER_GEO = new THREE.CylinderGeometry(1, 1, 1, 12, 1, true);
const BEAM_ORB_GEO = new THREE.SphereGeometry(0.18, 12, 12);

const SHOCKWAVE_RING_GEO = new THREE.RingGeometry(0.3, 0.65, 32);

const DICE_TORUS_GEO = new THREE.TorusGeometry(0.65, 0.05, 8, 28);

let _fxId = 0;

// ─── Component หลัก ──────────────────────────────────────
export default memo(function SkillFxLayer({ players, currentPlayerIndex }) {
  const [effects, setEffects] = useState([]);

  useEffect(() => {
    // Helper: เพิ่ม FX ลงใน State
    const pushFx = (fx) => {
      if (!fx) return;
      setEffects((prev) => [...prev.slice(-12), fx]);
      setTimeout(() => {
        setEffects((prev) => prev.filter((e) => e.id !== fx.id));
      }, fx.duration * 1000 + 150);
    };

    // 1. SKILL CAST
    const unsubSkill = on(FX_EVENTS.SKILL_CAST, (payload) => {
      if (payload.visualContext === "pvp") return;
      const id = ++_fxId;
      const fx = buildSkillEffect(id, payload, players);
      pushFx(fx);
    });

    // 2. DAMAGE DEALT
    const unsubDmg = on(FX_EVENTS.DAMAGE_DEALT, (payload) => {
      if (payload.visualContext === "pvp") return;
      const id = ++_fxId;
      const targetPos = getPlayerWorldPos(payload.targetIndex, players);
      pushFx({
        id,
        type: "shockwave",
        position: targetPos,
        color: payload.type === "pvp" ? "#ef4444" : "#f59e0b",
        duration: 0.95,
      });
    });

    // 3. HEAL
    const unsubHeal = on(FX_EVENTS.HEAL, (payload) => {
      const id = ++_fxId;
      const targetPos = getPlayerWorldPos(payload.targetIndex, players);
      pushFx({
        id,
        type: "heal",
        position: targetPos,
        color: "#22c55e",
        duration: 1.5,
      });
    });

    // 4. MONSTER KILLED
    const unsubMonster = on(FX_EVENTS.MONSTER_KILLED, (payload) => {
      const id = ++_fxId;
      const pos = getCellWorldPos(payload.cell);
      pushFx({
        id,
        type: "monsterKill",
        position: pos,
        color: "#fbbf24",
        duration: 1.6,
      });
    });

    // 5. TRAP TRIGGER
    const unsubTrap = on(FX_EVENTS.TRAP_TRIGGER, (payload) => {
      const id = ++_fxId;
      const pos = payload.targetIndex != null
        ? getPlayerWorldPos(payload.targetIndex, players)
        : getCellWorldPos(payload.cell);
      pushFx({
        id,
        type: "trap",
        position: pos,
        color: "#a855f7",
        duration: 1.2,
      });
    });

    return () => {
      unsubSkill();
      unsubDmg();
      unsubHeal();
      unsubMonster();
      unsubTrap();
    };
  }, [players]);

  return (
    <group>
      {effects.map((fx) => (
        <EffectInstance key={fx.id} fx={fx} />
      ))}
    </group>
  );
});

// ─── Helper: สร้างข้อมูล fx ตาม skillId/effect ────────────
function buildSkillEffect(id, payload, players) {
  const casterPos = getPlayerWorldPos(payload.playerId, players);
  const effect = payload.skillData?.effect;
  const skillId = payload.skillId || "";

  // 1. สกิลโล่ / ป้องกัน
  if (effect === "invincible" || skillId.includes("shield") || skillId.includes("barrier")) {
    return { id, type: "shield", position: casterPos, color: "#3b82f6", duration: 1.5 };
  }

  // 2. สกิลล็อกลูกเต๋า
  if (effect === "lock_dice" || skillId.includes("dice")) {
    return { id, type: "diceGlow", position: [0, 1.35, -0.5], color: "#22c55e", duration: 1.2 };
  }

  // 3. สกิลสลับตำแหน่ง
  if (effect === "shuffle_positions" || skillId.includes("teleport") || skillId.includes("swap")) {
    return { id, type: "magicCircle", position: casterPos, color: "#c084fc", duration: 1.6 };
  }

  // 4. ธาตุไฟ (Fire)
  if (skillId.includes("fire") || skillId.includes("flame") || skillId.includes("burn") || skillId.includes("phoenix")) {
    if (payload.targetIndex != null) {
      const targetPos = getPlayerWorldPos(payload.targetIndex, players);
      return { id, type: "beam", from: casterPos, to: targetPos, color: "#ef4444", duration: 1.2, element: "fire" };
    }
    return { id, type: "fireBurst", position: casterPos, color: "#f97316", duration: 1.3 };
  }

  // 5. ธาตุสายฟ้า (Lightning)
  if (skillId.includes("thunder") || skillId.includes("lightning") || skillId.includes("zap") || skillId.includes("bolt")) {
    return { id, type: "lightning", position: casterPos, color: "#eab308", duration: 1.1 };
  }

  // 6. ธาตุน้ำแข็ง (Ice / Frost)
  if (skillId.includes("ice") || skillId.includes("frost") || skillId.includes("freeze")) {
    return { id, type: "iceBurst", position: casterPos, color: "#06b6d4", duration: 1.3 };
  }

  // 7. สกิลโจมตีระบุเป้าหมาย (Player / Target Beam)
  if (payload.skillData?.target === "player" && payload.targetIndex != null) {
    const targetPos = getPlayerWorldPos(payload.targetIndex, players);
    return { id, type: "beam", from: casterPos, to: targetPos, color: "#a855f7", duration: 1.2 };
  }

  // Default Magic Burst
  return { id, type: "magicCircle", position: casterPos, color: "#fbbf24", duration: 1.4 };
}

function getPlayerWorldPos(playerIndex, players) {
  if (playerIndex == null) return [0, 0.6, 0];
  const p = players[playerIndex];
  if (!p) return [0, 0.6, 0];
  const offset = TOKEN_OFFSETS[playerIndex % TOKEN_OFFSETS.length];
  const [x, , z] = cellToWorld(p.position);
  return [x + offset[0], 0.6, z + offset[2]];
}

function getCellWorldPos(cell) {
  if (cell == null) return [0, 0.6, 0];
  const [x, , z] = cellToWorld(cell);
  return [x, 0.6, z];
}

// ─── Renderer สำหรับ Single FX Instance ───────────────────
const EffectInstance = memo(function EffectInstance({ fx }) {
  switch (fx.type) {
    case "magicCircle":
      return <MagicCircleFx fx={fx} />;
    case "shield":
      return <ShieldFx fx={fx} />;
    case "heal":
      return <HealFx fx={fx} />;
    case "fireBurst":
      return <FireBurstFx fx={fx} />;
    case "iceBurst":
      return <IceBurstFx fx={fx} />;
    case "lightning":
      return <LightningFx fx={fx} />;
    case "trap":
      return <TrapFx fx={fx} />;
    case "monsterKill":
      return <MonsterKillFx fx={fx} />;
    case "beam":
      return <BeamFx fx={fx} />;
    case "shockwave":
      return <ShockwaveFx fx={fx} />;
    case "diceGlow":
      return <DiceGlowFx fx={fx} />;
    default:
      return <MagicCircleFx fx={fx} />;
  }
});

// ============================================================
// 1. STYLIZED MAGIC CIRCLE (วงเวทเรืองแสง + ลำแสงพุ่งขึ้น)
// ============================================================
const MagicCircleFx = React.memo(function MagicCircleFx({ fx }) {
  const groupRef = useRef(null);
  const outerRingRef = useRef(null);
  const innerStarRef = useRef(null);
  const pillarRef = useRef(null);
  const startRef = useRef(null);

  // Particles ที่ลอยขึ้นจากวงเวท
  const particles = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => ({
      id: i,
      angle: (i / 12) * Math.PI * 2,
      radius: 0.2 + (i % 3) * 0.15,
      speed: 1.2 + (i % 4) * 0.4,
      size: 0.04 + (i % 3) * 0.02,
    }));
  }, []);

  const partRefs = useRef([]);

  useFrame(({ clock }, dt) => {
    const delta = Math.min(dt, 0.033);
    if (startRef.current === null) startRef.current = clock.elapsedTime;
    const t = clock.elapsedTime - startRef.current;
    const k = Math.min(1, t / fx.duration);
    const fade = Math.sin(k * Math.PI);

    if (outerRingRef.current) {
      outerRingRef.current.rotation.z = t * 1.5;
      const s = 1 + k * 0.6;
      outerRingRef.current.scale.set(s, s, 1);
      if (outerRingRef.current.material) outerRingRef.current.material.opacity = fade * 0.85;
    }

    if (innerStarRef.current) {
      innerStarRef.current.rotation.z = -t * 2.5;
      const s = 0.8 + k * 0.4;
      innerStarRef.current.scale.set(s, s, 1);
      if (innerStarRef.current.material) innerStarRef.current.material.opacity = fade * 0.95;
    }

    if (pillarRef.current) {
      pillarRef.current.scale.set(1 + k * 0.3, k * 2.2 + 0.1, 1 + k * 0.3);
      pillarRef.current.position.y = (k * 2.2) / 2;
      if (pillarRef.current.material) pillarRef.current.material.opacity = fade * 0.6;
    }

    // Sparkles ลอยขึ้น
    partRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const p = particles[i];
      const pk = (k * p.speed) % 1;
      mesh.position.y = pk * 1.8;
      const r = p.radius * (1 - pk * 0.4);
      mesh.position.x = Math.cos(p.angle + t * 2) * r;
      mesh.position.z = Math.sin(p.angle + t * 2) * r;
      if (mesh.material) mesh.material.opacity = Math.sin(pk * Math.PI) * fade * 0.9;
    });
  });

  return (
    <group position={fx.position} ref={groupRef}>
      {/* วงแหวนรอบนอก */}
      <mesh ref={outerRingRef} position={[0, -0.5, 0]} rotation={[-Math.PI / 2, 0, 0]} geometry={MAGIC_RING_GEO}>
        <meshBasicMaterial color={fx.color} transparent opacity={0.85} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>

      {/* วงแหวนแกนใน */}
      <mesh ref={innerStarRef} position={[0, -0.49, 0]} rotation={[-Math.PI / 2, 0, 0]} geometry={MAGIC_TORUS_GEO}>
        <meshBasicMaterial color="#ffffff" transparent opacity={0.9} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>

      {/* ลำแสงแนวตั้งพุ่งขึ้น */}
      <mesh ref={pillarRef} position={[0, 0, 0]} geometry={MAGIC_PILLAR_GEO}>
        <meshBasicMaterial color={fx.color} transparent opacity={0.5} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>

      {/* Sparkles ลอยขึ้น */}
      {particles.map((p, i) => (
        <mesh key={p.id} ref={(el) => (partRefs.current[i] = el)} scale={p.size} geometry={SPARK_GEO}>
          <meshBasicMaterial color={fx.color} transparent opacity={0.9} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
});

// ============================================================
// 2. SHIELD BUBBLE (เกราะพลังงานใสเรืองแสง + วงแหวนหมุน)
// ============================================================
const ShieldFx = React.memo(function ShieldFx({ fx }) {
  const sphereRef = useRef(null);
  const wireframeRef = useRef(null);
  const ringRef = useRef(null);
  const startRef = useRef(null);

  useFrame(({ clock }, dt) => {
    const delta = Math.min(dt, 0.033);
    if (startRef.current === null) startRef.current = clock.elapsedTime;
    const t = clock.elapsedTime - startRef.current;
    const k = Math.min(1, t / fx.duration);
    const fade = Math.sin(k * Math.PI);

    const scale = 1.1 + Math.sin(t * 8) * 0.05 + k * 0.3;

    if (sphereRef.current) {
      sphereRef.current.scale.setScalar(scale);
      if (sphereRef.current.material) sphereRef.current.material.opacity = fade * 0.45;
    }

    if (wireframeRef.current) {
      wireframeRef.current.scale.setScalar(scale * 1.02);
      wireframeRef.current.rotation.y = t * 1.5;
      wireframeRef.current.rotation.x = t * 0.8;
      if (wireframeRef.current.material) wireframeRef.current.material.opacity = fade * 0.75;
    }

    if (ringRef.current) {
      ringRef.current.rotation.z = t * 3;
      ringRef.current.scale.setScalar(scale * 1.3);
      if (ringRef.current.material) ringRef.current.material.opacity = fade * 0.85;
    }
  });

  return (
    <group position={fx.position}>
      {/* ทรงกลมโปร่งใส */}
      <mesh ref={sphereRef} geometry={SHIELD_SPHERE_GEO}>
        <meshBasicMaterial color={fx.color} transparent opacity={0.4} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>

      {/* Wireframe Lattice */}
      <mesh ref={wireframeRef} geometry={SHIELD_WIRE_GEO}>
        <meshBasicMaterial color="#60a5fa" transparent opacity={0.7} wireframe blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>

      {/* วงแหวนหมุนรอบเอว */}
      <mesh ref={ringRef} rotation={[Math.PI / 3, 0, 0]} geometry={SHIELD_TORUS_GEO}>
        <meshBasicMaterial color="#ffffff" transparent opacity={0.8} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  );
});

// ============================================================
// 3. HEAL AURA (ละอองเวทมนตร์เขียว-ทองลอยวนขึ้น)
// ============================================================
const HealFx = React.memo(function HealFx({ fx }) {
  const startRef = useRef(null);
  const ringRef = useRef(null);

  const sparkles = useMemo(() => {
    return Array.from({ length: 16 }, (_, i) => ({
      id: i,
      angleOffset: (i / 16) * Math.PI * 2,
      radius: 0.25 + (i % 3) * 0.12,
      speed: 1.5 + (i % 5) * 0.3,
      color: i % 2 === 0 ? "#22c55e" : "#fbbf24",
      size: 0.045 + (i % 3) * 0.02,
    }));
  }, []);

  const sparkRefs = useRef([]);

  useFrame(({ clock }, dt) => {
    const delta = Math.min(dt, 0.033);
    if (startRef.current === null) startRef.current = clock.elapsedTime;
    const t = clock.elapsedTime - startRef.current;
    const k = Math.min(1, t / fx.duration);
    const fade = Math.sin(k * Math.PI);

    if (ringRef.current) {
      const s = 0.5 + k * 1.2;
      ringRef.current.scale.set(s, s, 1);
      if (ringRef.current.material) ringRef.current.material.opacity = fade * 0.75;
    }

    sparkRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const sp = sparkles[i];
      const progress = (t * sp.speed * 0.6) % 1;
      const angle = sp.angleOffset + progress * Math.PI * 4;
      const r = sp.radius * (1.2 - progress * 0.5);

      mesh.position.x = Math.cos(angle) * r;
      mesh.position.z = Math.sin(angle) * r;
      mesh.position.y = progress * 2.2 - 0.4;

      if (mesh.material) mesh.material.opacity = Math.sin(progress * Math.PI) * fade * 0.95;
    });
  });

  return (
    <group position={fx.position}>
      {/* วงแสงเขียวบนพื้น */}
      <mesh ref={ringRef} position={[0, -0.5, 0]} rotation={[-Math.PI / 2, 0, 0]} geometry={HEAL_RING_GEO}>
        <meshBasicMaterial color="#4ade80" transparent opacity={0.8} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>

      {/* Sparkles หมุนวนขึ้น */}
      {sparkles.map((sp, i) => (
        <mesh key={sp.id} ref={(el) => (sparkRefs.current[i] = el)} scale={sp.size} geometry={SPARK_GEO}>
          <meshBasicMaterial color={sp.color} transparent opacity={0.9} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
});

// ============================================================
// 4. FIRE BURST (ลูกไฟระเบิด + เถ้าถ่านลอย)
// ============================================================
const FireBurstFx = React.memo(function FireBurstFx({ fx }) {
  const startRef = useRef(null);
  const coreRef = useRef(null);

  const embers = useMemo(() => {
    return Array.from({ length: 18 }, (_, i) => {
      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.3) * Math.PI;
      const speed = 1.8 + Math.random() * 2.2;
      return {
        id: i,
        vx: Math.cos(theta) * Math.cos(phi) * speed,
        vy: Math.sin(phi) * speed + 1.2,
        vz: Math.sin(theta) * Math.cos(phi) * speed,
        size: 0.05 + Math.random() * 0.04,
        color: i % 3 === 0 ? "#f97316" : i % 3 === 1 ? "#ef4444" : "#fbbf24",
      };
    });
  }, []);

  const emberRefs = useRef([]);

  useFrame(({ clock }, dt) => {
    const delta = Math.min(dt, 0.033);
    if (startRef.current === null) startRef.current = clock.elapsedTime;
    const t = clock.elapsedTime - startRef.current;
    const k = Math.min(1, t / fx.duration);
    const fade = Math.pow(1 - k, 1.2);

    if (coreRef.current) {
      const s = 0.2 + k * 2.2;
      coreRef.current.scale.setScalar(s);
      if (coreRef.current.material) coreRef.current.material.opacity = fade * 0.95;
    }

    emberRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const e = embers[i];
      mesh.position.x = e.vx * k * 0.7;
      mesh.position.y = e.vy * k * 0.7;
      mesh.position.z = e.vz * k * 0.7;
      mesh.scale.setScalar(Math.max(0.1, (1 - k) * 1.5) * e.size);
      if (mesh.material) mesh.material.opacity = fade * 0.9;
    });
  });

  return (
    <group position={fx.position}>
      {/* Core Flash */}
      <mesh ref={coreRef} geometry={FIRE_CORE_GEO}>
        <meshBasicMaterial color="#f97316" transparent opacity={0.9} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>

      {/* Embers */}
      {embers.map((e, i) => (
        <mesh key={e.id} ref={(el) => (emberRefs.current[i] = el)} scale={e.size} geometry={SPARK_GEO}>
          <meshBasicMaterial color={e.color} transparent opacity={0.9} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
});

// ============================================================
// 5. ICE BURST (ผลึกน้ำแข็ง + เกล็ดฟ้าแตกกระจาย)
// ============================================================
const IceBurstFx = React.memo(function IceBurstFx({ fx }) {
  const startRef = useRef(null);
  const ringRef = useRef(null);

  const shards = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const angle = (i / 12) * Math.PI * 2;
      const dist = 0.8 + (i % 3) * 0.3;
      return {
        id: i,
        x: Math.cos(angle) * dist,
        z: Math.sin(angle) * dist,
        rotY: Math.random() * Math.PI,
        scale: 0.3 + (i % 4) * 0.15,
      };
    });
  }, []);

  const shardRefs = useRef([]);

  useFrame(({ clock }, dt) => {
    const delta = Math.min(dt, 0.033);
    if (startRef.current === null) startRef.current = clock.elapsedTime;
    const t = clock.elapsedTime - startRef.current;
    const k = Math.min(1, t / fx.duration);
    const fade = Math.pow(1 - k, 1.5);

    if (ringRef.current) {
      const s = 0.4 + k * 2.5;
      ringRef.current.scale.set(s, s, 1);
      if (ringRef.current.material) ringRef.current.material.opacity = fade * 0.9;
    }

    shardRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const s = shards[i];
      const sk = Math.min(1, k * 2.0);
      mesh.position.x = s.x * sk;
      mesh.position.z = s.z * sk;
      mesh.position.y = (1 - Math.abs(sk - 0.5) * 2) * 0.4;
      mesh.rotation.y = s.rotY + t * 4;
      if (mesh.material) mesh.material.opacity = fade * 0.9;
    });
  });

  return (
    <group position={fx.position}>
      {/* Shockwave ฟ้า */}
      <mesh ref={ringRef} position={[0, -0.48, 0]} rotation={[-Math.PI / 2, 0, 0]} geometry={ICE_RING_GEO}>
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.9} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>

      {/* Shards น้ำแข็ง */}
      {shards.map((s, i) => (
        <mesh key={s.id} ref={(el) => (shardRefs.current[i] = el)} scale={s.scale} geometry={ICE_CONE_GEO}>
          <meshBasicMaterial color="#a5f3fc" transparent opacity={0.9} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
});

// ============================================================
// 6. LIGHTNING BOLT (สายฟ้าฟาด + ประกายไฟกระจาย)
// ============================================================
const LightningFx = React.memo(function LightningFx({ fx }) {
  const startRef = useRef(null);
  const boltRef = useRef(null);
  const flashRef = useRef(null);

  const sparks = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => {
      const angle = (i / 14) * Math.PI * 2;
      const speed = 2.0 + (i % 3) * 1.2;
      return {
        id: i,
        vx: Math.cos(angle) * speed,
        vz: Math.sin(angle) * speed,
        vy: (Math.random() - 0.2) * speed,
        size: 0.04 + (i % 3) * 0.02,
      };
    });
  }, []);

  const sparkRefs = useRef([]);

  useFrame(({ clock }, dt) => {
    const delta = Math.min(dt, 0.033);
    if (startRef.current === null) startRef.current = clock.elapsedTime;
    const t = clock.elapsedTime - startRef.current;
    const k = Math.min(1, t / fx.duration);
    const fade = Math.max(0, 1 - k * 1.3);

    if (boltRef.current) {
      // แฟลชสั่นสายฟ้า
      const jitter = (Math.random() - 0.5) * 0.08;
      boltRef.current.position.x = jitter;
      boltRef.current.position.z = jitter;
      if (boltRef.current.material) boltRef.current.material.opacity = (Math.random() > 0.3 ? 0.95 : 0.2) * fade;
    }

    if (flashRef.current) {
      const s = 0.5 + k * 2.8;
      flashRef.current.scale.set(s, s, 1);
      if (flashRef.current.material) flashRef.current.material.opacity = fade * 0.85;
    }

    sparkRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const sp = sparks[i];
      mesh.position.x = sp.vx * k * 0.5;
      mesh.position.y = sp.vy * k * 0.5;
      mesh.position.z = sp.vz * k * 0.5;
      if (mesh.material) mesh.material.opacity = fade * 0.9;
    });
  });

  return (
    <group position={fx.position}>
      {/* แกนสายฟ้า */}
      <mesh ref={boltRef} position={[0, 1.2, 0]} geometry={LIGHTNING_CYL_GEO}>
        <meshBasicMaterial color="#fef08a" transparent opacity={0.95} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>

      {/* แฟลชวงเหลืองกระแทกพื้น */}
      <mesh ref={flashRef} position={[0, -0.48, 0]} rotation={[-Math.PI / 2, 0, 0]} geometry={LIGHTNING_RING_GEO}>
        <meshBasicMaterial color="#eab308" transparent opacity={0.9} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>

      {/* ประกายไฟ */}
      {sparks.map((sp, i) => (
        <mesh key={sp.id} ref={(el) => (sparkRefs.current[i] = el)} scale={sp.size} geometry={SPARK_GEO}>
          <meshBasicMaterial color="#fef08a" transparent opacity={0.9} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
});

// ============================================================
// 7. TRAP FX (หนาม/พิษเหยียบกับดักระเบิด)
// ============================================================
const TrapFx = React.memo(function TrapFx({ fx }) {
  const startRef = useRef(null);
  const ringRef = useRef(null);

  const puffs = useMemo(() => {
    return Array.from({ length: 10 }, (_, i) => {
      const angle = (i / 10) * Math.PI * 2;
      return {
        id: i,
        angle,
        speed: 1.2 + (i % 3) * 0.4,
        size: 0.12 + (i % 3) * 0.05,
      };
    });
  }, []);

  const puffRefs = useRef([]);

  useFrame(({ clock }, dt) => {
    const delta = Math.min(dt, 0.033);
    if (startRef.current === null) startRef.current = clock.elapsedTime;
    const t = clock.elapsedTime - startRef.current;
    const k = Math.min(1, t / fx.duration);
    const fade = Math.pow(1 - k, 1.2);

    if (ringRef.current) {
      const s = 0.3 + k * 2.2;
      ringRef.current.scale.set(s, s, 1);
      if (ringRef.current.material) ringRef.current.material.opacity = fade * 0.85;
    }

    puffRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const p = puffs[i];
      const dist = k * p.speed;
      mesh.position.x = Math.cos(p.angle) * dist;
      mesh.position.z = Math.sin(p.angle) * dist;
      mesh.position.y = (1 - k) * 0.5;
      mesh.scale.setScalar((1 + k * 1.5) * p.size);
      if (mesh.material) mesh.material.opacity = fade * 0.8;
    });
  });

  return (
    <group position={fx.position}>
      <mesh ref={ringRef} position={[0, -0.48, 0]} rotation={[-Math.PI / 2, 0, 0]} geometry={TRAP_RING_GEO}>
        <meshBasicMaterial color={fx.color} transparent opacity={0.9} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>

      {puffs.map((p, i) => (
        <mesh key={p.id} ref={(el) => (puffRefs.current[i] = el)} scale={p.size} geometry={TRAP_PUFF_GEO}>
          <meshBasicMaterial color="#c084fc" transparent opacity={0.8} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
});

// ============================================================
// 8. MONSTER KILL FX (วิญญาณมอนสเตอร์ระเบิดแสงทองพุ่งขึ้น)
// ============================================================
const MonsterKillFx = React.memo(function MonsterKillFx({ fx }) {
  const startRef = useRef(null);
  const ringRef = useRef(null);

  const souls = useMemo(() => {
    return Array.from({ length: 20 }, (_, i) => {
      const theta = Math.random() * Math.PI * 2;
      const speed = 1.0 + Math.random() * 1.8;
      return {
        id: i,
        vx: Math.cos(theta) * speed * 0.6,
        vz: Math.sin(theta) * speed * 0.6,
        vy: 1.5 + Math.random() * 2.2,
        size: 0.05 + Math.random() * 0.04,
        color: i % 2 === 0 ? "#fbbf24" : "#f59e0b",
      };
    });
  }, []);

  const soulRefs = useRef([]);

  useFrame(({ clock }, dt) => {
    const delta = Math.min(dt, 0.033);
    if (startRef.current === null) startRef.current = clock.elapsedTime;
    const t = clock.elapsedTime - startRef.current;
    const k = Math.min(1, t / fx.duration);
    const fade = Math.pow(1 - k, 1.4);

    if (ringRef.current) {
      const s = 0.4 + k * 3.2;
      ringRef.current.scale.set(s, s, 1);
      if (ringRef.current.material) ringRef.current.material.opacity = fade * 0.9;
    }

    soulRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const s = souls[i];
      mesh.position.x = s.vx * k;
      mesh.position.z = s.vz * k;
      mesh.position.y = s.vy * k;
      if (mesh.material) mesh.material.opacity = fade * 0.95;
    });
  });

  return (
    <group position={fx.position}>
      <mesh ref={ringRef} position={[0, -0.48, 0]} rotation={[-Math.PI / 2, 0, 0]} geometry={MONSTER_RING_GEO}>
        <meshBasicMaterial color="#fbbf24" transparent opacity={0.9} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>

      {souls.map((s, i) => (
        <mesh key={s.id} ref={(el) => (soulRefs.current[i] = el)} scale={s.size} geometry={SPARK_GEO}>
          <meshBasicMaterial color={s.color} transparent opacity={0.9} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
});

// ============================================================
// 9. SPELL BEAM FX (ลำแสงเวทจากผู้ร่ายยิงไปยังเป้าหมาย)
// ============================================================
const BeamFx = React.memo(function BeamFx({ fx }) {
  const startRef = useRef(null);
  const coreRef = useRef(null);
  const orbRef = useRef(null);
  const impactRef = useRef(null);

  const { mid, quaternion, length, fromVec, toVec } = useMemo(() => {
    const from = new THREE.Vector3(...fx.from);
    const to = new THREE.Vector3(...fx.to);
    const dir = new THREE.Vector3().subVectors(to, from);
    const len = dir.length();
    const center = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);
    const quat = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      dir.clone().normalize()
    );
    return { mid: center, quaternion: quat, length: len, fromVec: from, toVec: to };
  }, [fx.from, fx.to]);

  useFrame(({ clock }, dt) => {
    const delta = Math.min(dt, 0.033);
    if (startRef.current === null) startRef.current = clock.elapsedTime;
    const t = clock.elapsedTime - startRef.current;
    const k = Math.min(1, t / fx.duration);
    const fade = Math.sin(k * Math.PI);

    if (coreRef.current && coreRef.current.material) {
      coreRef.current.material.opacity = fade * 0.9;
    }

    if (orbRef.current) {
      const orbProg = Math.min(1, k * 1.5);
      orbRef.current.position.lerpVectors(fromVec, toVec, orbProg);
      if (orbRef.current.material) orbRef.current.material.opacity = orbProg < 0.95 ? 0.95 : (1 - k) * 2;
    }

    if (impactRef.current) {
      const s = 0.5 + k * 2.0;
      impactRef.current.scale.set(s, s, 1);
      if (impactRef.current.material) impactRef.current.material.opacity = fade * 0.85;
    }
  });

  return (
    <group>
      {/* แกนลำแสง 3D */}
      <group position={mid.toArray()} quaternion={quaternion}>
        <mesh ref={coreRef} scale={[0.08, length, 0.08]} geometry={UNIT_CYLINDER_GEO}>
          <meshBasicMaterial color={fx.color} transparent opacity={0.9} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      </group>

      {/* Energy Orb วิ่งตามลำแสง */}
      <mesh ref={orbRef} geometry={BEAM_ORB_GEO}>
        <meshBasicMaterial color="#ffffff" transparent opacity={0.95} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>

      {/* Impact burst ที่เป้าหมาย */}
      <mesh ref={impactRef} position={toVec.toArray()} rotation={[-Math.PI / 2, 0, 0]} geometry={HEAL_RING_GEO}>
        <meshBasicMaterial color={fx.color} transparent opacity={0.8} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
    </group>
  );
});

// ============================================================
// 10. SHOCKWAVE FX (คลื่นกระแทกความเสียหายบนพื้น)
// ============================================================
const ShockwaveFx = React.memo(function ShockwaveFx({ fx }) {
  const startRef = useRef(null);
  const ringRef = useRef(null);

  useFrame(({ clock }, dt) => {
    const delta = Math.min(dt, 0.033);
    if (startRef.current === null) startRef.current = clock.elapsedTime;
    const t = clock.elapsedTime - startRef.current;
    const k = Math.min(1, t / fx.duration);
    const fade = Math.pow(1 - k, 1.5);

    if (ringRef.current) {
      const s = 0.4 + k * 3.0;
      ringRef.current.scale.set(s, s, 1);
      if (ringRef.current.material) ringRef.current.material.opacity = fade * 0.9;
    }
  });

  return (
    <group position={fx.position}>
      <mesh ref={ringRef} position={[0, -0.48, 0]} rotation={[-Math.PI / 2, 0, 0]} geometry={SHOCKWAVE_RING_GEO}>
        <meshBasicMaterial color={fx.color} transparent opacity={0.9} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
    </group>
  );
});

// ============================================================
// 11. DICE GLOW FX (แสงเขียวหมุนรอบลูกเต๋า)
// ============================================================
const DiceGlowFx = React.memo(function DiceGlowFx({ fx }) {
  const startRef = useRef(null);
  const ringRef = useRef(null);

  useFrame(({ clock }, dt) => {
    const delta = Math.min(dt, 0.033);
    if (startRef.current === null) startRef.current = clock.elapsedTime;
    const t = clock.elapsedTime - startRef.current;
    const k = Math.min(1, t / fx.duration);
    const fade = Math.sin(k * Math.PI);

    if (ringRef.current) {
      ringRef.current.rotation.y = t * 4;
      const s = 0.8 + Math.sin(k * Math.PI) * 0.4;
      ringRef.current.scale.setScalar(s);
      if (ringRef.current.material) ringRef.current.material.opacity = fade * 0.85;
    }
  });

  return (
    <group position={fx.position}>
      <mesh ref={ringRef} geometry={DICE_TORUS_GEO}>
        <meshBasicMaterial color={fx.color} transparent opacity={0.8} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  );
});

