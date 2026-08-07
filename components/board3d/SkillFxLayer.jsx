"use client";

// ============================================================
// SkillFxLayer — เลเยอร์เอฟเฟกต์ 3D สำหรับสกิลที่ร่ายบนกระดาน
// Subscribe skill_cast จาก bus แล้ว spawn particle ชั่วคราว
// รองรับ priority 5 skills:
//   • invincible        → shield bubble expand + fade
//   • lock_dice         → green glow รอบลูกเต๋า
//   • shuffle_positions → all tokens spin challenge ring
//   • thunder_star      → ring สายฟ้าจากผู้ร่ายไปยังมอนสเตอร์ (combat only)
//   • phoenix_force    → beam แดงจากผู้ร่ายไปยังเป้า player
// สกิลอื่นใช้ general purple burst เป็น default
// ============================================================

import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { cellToWorld, TOKEN_OFFSETS } from "@/lib/boardLayout";
import { on, FX_EVENTS } from "@/lib/skillFxBus";

let _fxId = 0;

// ─── Component หลัก ──────────────────────────────────────
export default function SkillFxLayer({ players, currentPlayerIndex }) {
  const [effects, setEffects] = useState([]);

  useEffect(() => {
    // 1. ดักจับการร่ายสกิล (Skill Cast)
    const unsubSkill = on(FX_EVENTS.SKILL_CAST, (payload) => {
      const id = ++_fxId;
      const fx = buildEffect(id, payload, players);
      if (!fx) return;

      setEffects((prev) => [...prev.slice(-8), fx]);

      setTimeout(() => {
        setEffects((prev) => prev.filter((e) => e.id !== id));
      }, fx.duration * 1000 + 100);
    });

    // 2. ดักจับความเสียหาย (Damage Dealt / PvP Clash Shockwave)
    const unsubDmg = on(FX_EVENTS.DAMAGE_DEALT, (payload) => {
      const id = ++_fxId;
      const targetPos = getPlayerWorldPos(payload.targetIndex, players);
      const fx = {
        id,
        type: "shockwave",
        position: targetPos,
        color: payload.type === "pvp" ? "#ef4444" : "#f59e0b",
        duration: 0.8,
      };

      setEffects((prev) => [...prev.slice(-8), fx]);

      setTimeout(() => {
        setEffects((prev) => prev.filter((e) => e.id !== id));
      }, fx.duration * 1000 + 100);
    });

    return () => {
      unsubSkill();
      unsubDmg();
    };
  }, [players]);

  return (
    <group>
      {effects.map((fx) => (
        <EffectInstance key={fx.id} fx={fx} />
      ))}
    </group>
  );
}

// ─── Helper: สร้างข้อมูล fx ตาม skillId/effect ────────────
function buildEffect(id, payload, players) {
  const player = players[payload.playerId];
  if (!player) return null;

  const casterPos = getPlayerWorldPos(payload.playerId, players);
  const effect = payload.skillData?.effect;
  const skillId = payload.skillId;

  switch (effect) {
    case "invincible":
      return {
        id,
        type: "shield",
        position: casterPos,
        color: "#3b82f6",
        duration: 1.2,
      };
    case "lock_dice":
      return {
        id,
        type: "diceGlow",
        position: [0, 1.35, -0.5], // ตำแหน่งลูกเต๋า
        color: "#22c55e",
        duration: 1.0,
      };
    case "shuffle_positions":
      return {
        id,
        type: "shuffle",
        color: "#a855f7",
        duration: 1.4,
        tokens: players.map((p, i) => getPlayerWorldPos(i, players)),
      };
    case "banish_monster":
    case "steal_turn":
    case "steal_potion":
      return {
        id,
        type: "burst",
        position: casterPos,
        color: "#f59e0b",
        duration: 0.9,
      };
    default:
      // damage skills
      if (payload.skillData?.dmg) {
        if (payload.skillData.target === "monster") {
          // ring เหลือง ตรงผู้ร่าย (เพราะ monster อยู่ใน combat modal)
          return {
            id,
            type: "lightningBolt",
            position: casterPos,
            color: "#fbbf24",
            duration: 1.0,
            skillId,
          };
        }
        if (payload.skillData.target === "player" && payload.targetIndex != null) {
          const targetPos = getPlayerWorldPos(payload.targetIndex, players);
          return {
            id,
            type: "beam",
            from: casterPos,
            to: targetPos,
            targetIndex: payload.targetIndex,
            color: "#ef4444",
            duration: 1.1,
            skillId,
          };
        }
      }
      // default: general burst ที่ผู้ร่าย
      return {
        id,
        type: "burst",
        position: casterPos,
        color: "#a855f7",
        duration: 0.9,
      };
  }
}

function getPlayerWorldPos(playerIndex, players) {
  const p = players[playerIndex];
  if (!p) return [0, 0.5, 0];
  const offset = TOKEN_OFFSETS[playerIndex % TOKEN_OFFSETS.length];
  const [x, , z] = cellToWorld(p.position);
  return [x + offset[0], 0.6, z + offset[2]];
}

// ─── Renderer single fx instance, animate via useFrame ───
function EffectInstance({ fx }) {
  const ref = useRef(null);
  const startRef = useRef(null);

  useFrame(({ clock }, dt) => {
    if (startRef.current === null) startRef.current = clock.elapsedTime;
    const t = clock.elapsedTime - startRef.current;
    const k = Math.min(1, t / fx.duration);

    const g = ref.current;
    if (!g) return;

    switch (fx.type) {
      case "shield": {
        g.scale.setScalar(1 + k * 2.4);
        if (g.material) g.material.opacity = (1 - k) * 0.7;
        break;
      }
      case "burst": {
        const s = 0.2 + k * 2.0;
        g.scale.setScalar(s);
        if (g.material) g.material.opacity = (1 - k) * 0.9;
        break;
      }
      case "diceGlow": {
        const s = 0.8 + Math.sin(k * Math.PI) * 0.6;
        g.scale.setScalar(s);
        if (g.material) g.material.opacity = (1 - k) * 0.6;
        g.rotation.y = t * 3;
        break;
      }
      case "shuffle": {
        g.rotation.y = k * Math.PI * 4;
        if (g.material) g.material.opacity = (1 - k) * 0.8;
        g.scale.setScalar(1 + k * 0.4);
        break;
      }
      case "lightningBolt": {
        if (g.material) g.material.opacity = (1 - k) * 0.95;
        g.scale.y = 1 + k * 0.2;
        break;
      }
      case "beam": {
        if (g.material) g.material.opacity = (1 - k) * 0.9;
        break;
      }
      case "shockwave": {
        const s = 0.5 + k * 2.8;
        g.scale.set(s, s, s);
        if (g.material) g.material.opacity = (1 - k) * 0.9;
        break;
      }
      default:
        break;
    }
  });

  return renderFxMesh(fx, ref);
}

// ─── Render mesh ตาม fx.type ─────────────────────────────
function renderFxMesh(fx, ref) {
  switch (fx.type) {
    case "shockwave":
      return (
        <mesh ref={ref} position={fx.position} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.3, 0.6, 32]} />
          <meshBasicMaterial
            color={fx.color}
            transparent
            opacity={0.9}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      );
    case "shield":
      return (
        <mesh ref={ref} position={fx.position}>
          <sphereGeometry args={[0.5, 24, 24]} />
          <meshBasicMaterial
            color={fx.color}
            transparent
            opacity={0.7}
            wireframe
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      );
    case "burst":
      return (
        <mesh ref={ref} position={fx.position}>
          <sphereGeometry args={[0.3, 16, 16]} />
          <meshBasicMaterial
            color={fx.color}
            transparent
            opacity={0.9}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      );
    case "diceGlow":
      return (
        <mesh ref={ref} position={fx.position}>
          <torusGeometry args={[0.6, 0.05, 8, 24]} />
          <meshBasicMaterial
            color={fx.color}
            transparent
            opacity={0.6}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      );
    case "shuffle":
      // วงแหวนใหญ่ครอบกระดานกลาง
      return (
        <mesh ref={ref} position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[3.5, 4.0, 64]} />
          <meshBasicMaterial
            color={fx.color}
            transparent
            opacity={0.8}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      );
    case "lightningBolt": {
      // Lightning zigzag — ใช้ line2 ไม่ได้ ใช้ simple cylinder แทน
      return (
        <mesh ref={ref} position={fx.position}>
          <cylinderGeometry args={[0.04, 0.04, 1.5, 8]} />
          <meshBasicMaterial
            color={fx.color}
            transparent
            opacity={0.95}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      );
    }
    case "beam": {
      // beam จาก from → to
      const from = new THREE.Vector3(...fx.from);
      const to = new THREE.Vector3(...fx.to);
      const dir = new THREE.Vector3().subVectors(to, from);
      const len = dir.length();
      const mid = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);
      const quat = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        dir.clone().normalize(),
      );
      return (
        <group position={mid.toArray()} quaternion={quat}>
          <mesh ref={ref}>
            <cylinderGeometry args={[0.05, 0.05, len, 12, 1, true]} />
            <meshBasicMaterial
              color={fx.color}
              transparent
              opacity={0.9}
              blending={THREE.AdditiveBlending}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
        </group>
      );
    }
    default:
      return null;
  }
}