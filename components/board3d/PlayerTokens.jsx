"use client";

// ============================================================
// PlayerTokens — ตัวหมากผู้เล่น 3D (คริสตัลเรืองแสงสีบ้าน)
// เดินทีละช่องตามแต้มเต๋า / เทเลพอร์ตเมื่อขึ้นบันได-ลงงู/เกิดใหม่
// Phase 2: เพิ่ม state "hit" (สั่น + แดง) และ "cast" (เรืองแสง)
// ============================================================

import { Suspense, useEffect, useRef, useMemo } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { cellToWorld, TOKEN_OFFSETS } from "@/lib/boardLayout";
import { getEmojiTexture } from "./textures";
import { on, FX_EVENTS } from "@/lib/skillFxBus";

const WALK_SPEED = 6.5; // เพิ่มความเร็วเดินเพื่อก้าวทันครบ 6 ช่องสมบูรณ์
const TELEPORT_SPEED = 5.0;

export default function PlayerTokens({ players, currentPlayerIndex, phase }) {
  return (
    <group>
      {players.map((p, i) => (
        <Token
          key={p.houseId}
          player={p}
          index={i}
          isActive={i === currentPlayerIndex && phase === "play"}
        />
      ))}
    </group>
  );
}

function Token({ player, index, isActive }) {
  const groupRef = useRef(null);
  const crystalRef = useRef(null);
  const beaconRef = useRef(null);
  // Hit state (อ่านได้ทั้งใน useFrame และจาก event listener)
  const hitState = useRef({ active: false, t: 0, duration: 0.6 });
  const castState = useRef({ active: false, t: 0, duration: 0.8, color: "#a855f7" });

  const anim = useRef({
    mode: "idle", // "idle" | "walk" | "teleportOut" | "teleportIn"
    queue: [],
    targetCell: null,
    scale: 1,
    segmentDistance: 0,
    segmentProgress: 0,
  });
  const prevPos = useRef(player.position);

  const offset = TOKEN_OFFSETS[index % TOKEN_OFFSETS.length];
  const initialPosition = useRef(null);
  if (initialPosition.current === null) {
    const [initialX, , initialZ] = cellToWorld(player.position);
    initialPosition.current = [initialX + offset[0], 0, initialZ + offset[2]];
  }

  // ตรวจการเปลี่ยนช่อง → เดินทีละช่อง (≤100) หรือเทเลพอร์ตเมื่อเกิดใหม่/กับดัก/RESET
  useEffect(() => {
    const prev = prevPos.current;
    const next = player.position;
    if (prev === next) return;
    prevPos.current = next;

    const a = anim.current;
    if (next === 1) {
      // ถ้าเป็นการ Reset เกม ให้ตั้งตำแหน่งกลับมาช่อง 1 ทันที และล้าง queue เดิน
      a.queue = [];
      a.mode = "idle";
      const [x, , z] = cellToWorld(1);
      groupRef.current?.position.set(x + offset[0], 0, z + offset[2]);
      return;
    }

    const diff = next - prev;

    // ถ้าเป็นการเดินปกติไปข้างหน้า (1-6 ช่อง) ให้คิวเดินทีละช่องจนครบก้าว
    if (diff > 0 && diff <= 90) {
      for (let c = prev + 1; c <= next; c++) a.queue.push(c);
      a.segmentDistance = 0;
      a.segmentProgress = 0;
      if (a.mode === "idle") a.mode = "walk";
    } else {
      // ถ้าเป็นการถอยกลับ (งูเห่า/ตายกลับจุดเริ่มต้น) ให้วาร์ป
      a.queue = [];
      a.targetCell = next;
      a.mode = "teleportOut";
    }
  }, [player.position]);

  // Subscribe skill_fx events สำหรับ token ตัวนี้ (โดนดาเมจ / ตัวเองร่าย)
  useEffect(() => {
    const unsubDamage = on(FX_EVENTS.DAMAGE_DEALT, (payload) => {
      if (payload.targetIndex === index) {
        hitState.current.active = true;
        hitState.current.t = 0;
      }
    });
    const unsubCast = on(FX_EVENTS.SKILL_CAST, (payload) => {
      if (payload.playerId === index && payload.skillData) {
        // เลือกสีตาม effect
        const effect = payload.skillData.effect;
        const color =
          effect === "invincible" ? "#3b82f6" :
          effect === "lock_dice"  ? "#22c55e" :
          effect === "shuffle_positions" ? "#a855f7" :
          payload.skillData.dmg ? "#ef4444" :
          "#a855f7";
        castState.current = { active: true, t: 0, duration: 0.8, color };
      }
    });
    return () => {
      unsubDamage();
      unsubCast();
    };
  }, [index]);

  const isDead = player.hp <= 0;

  useFrame(({ clock }, dt) => {
    const g = groupRef.current;
    if (!g) return;
    const a = anim.current;
    const t = clock.elapsedTime;
    const delta = Math.min(dt, 0.05);

    if (a.mode === "walk" && a.queue.length > 0) {
      const nextCell = a.queue[0];
      const [tx, , tz] = cellToWorld(nextCell);
      const targetX = tx + offset[0];
      const targetZ = tz + offset[2];
      const dx = targetX - g.position.x;
      const dz = targetZ - g.position.z;
      const dist = Math.hypot(dx, dz);
      const step = 8.0 * delta; // ความเร็วก้าวเดินเหมาะสม ก้าวละช่องชัดเจน

      // เริ่มรอบกระโดดใหม่ทุกครั้งที่เข้าสู่ช่องถัดไป
      if (a.segmentDistance <= 0) {
        a.segmentDistance = Math.max(dist, 0.001);
        a.segmentProgress = 0;
      }

      if (dist <= step) {
        // เมื่อย่างก้าวถึงช่องเป้าหมายแล้ว ให้ขยับเข้าช่องถัดไปในคิว
        g.position.x = targetX;
        g.position.z = targetZ;
        a.segmentProgress = 1;
        a.queue.shift();
        if (a.queue.length === 0) {
          a.mode = "idle";
          a.segmentDistance = 0;
          g.position.y = 0;
          g.rotation.x = 0;
          g.rotation.z = 0;
        } else {
          a.segmentDistance = 0;
        }
      } else {
        // ก้าวเดินทีละช่องตามพิกัด XZ จริงของกระดาน
        const dirX = dx / dist;
        const dirZ = dz / dist;
        g.position.x += dirX * step;
        g.position.z += dirZ * step;

        // ปรับทิศทางการหันหน้าของตัวหมาก 3D ตามทิศทางเวกเตอร์ก้าวเดินจริง
        const targetAngle = Math.atan2(dirX, dirZ);
        g.rotation.y = THREE.MathUtils.lerp(g.rotation.y, targetAngle, delta * 10);

        a.segmentProgress = THREE.MathUtils.clamp(
          1 - dist / a.segmentDistance,
          0,
          1,
        );

        // กระเด้งหนึ่งรอบต่อหนึ่งช่อง: ยกตัวสูงสุดตรงกลาง แล้วลงนุ่ม ๆ
        const hop = Math.sin(a.segmentProgress * Math.PI);
        g.position.y = 0.04 + hop * 0.5;
        g.rotation.x = Math.sin(a.segmentProgress * Math.PI * 2) * 0.12;
      }
    } else if (a.mode === "teleportOut") {
      a.scale = Math.max(0.01, a.scale - TELEPORT_SPEED * delta);
      g.scale.setScalar(a.scale);
      if (a.scale <= 0.02 && a.targetCell != null) {
        const [tx, , tz] = cellToWorld(a.targetCell);
        g.position.set(tx + offset[0], 0, tz + offset[2]);
        a.targetCell = null;
        a.mode = "teleportIn";
      }
    } else if (a.mode === "teleportIn") {
      a.scale = Math.min(1, a.scale + TELEPORT_SPEED * delta);
      g.scale.setScalar(a.scale);
      if (a.scale >= 1) a.mode = "idle";
    } else {
      // idle: ลอยเบาๆ + หันหน้าไปตามทิศทางแนวงูกระดาน (ขวา = 90 deg, ซ้าย = -90 deg)
      g.position.y = Math.sin(t * 2 + index * 1.7) * 0.045 + 0.03;
      const rowFromBottom = Math.floor((player.position - 1) / 10);
      const idleFacingAngle = rowFromBottom % 2 === 0 ? Math.PI / 2 : -Math.PI / 2;
      g.rotation.y = THREE.MathUtils.lerp(g.rotation.y, idleFacingAngle, delta * 6);
    }

    // ── Hit Feedback: token สั่น + เรืองแสงแดง + กระเด้งถอยหลัง ──
    let shakeX = 0, shakeZ = 0;
    let hitEmissiveBoost = 0;
    let hitColorMix = null;
    if (hitState.current.active) {
      hitState.current.t += delta;
      const h = hitState.current;
      if (h.t < h.duration) {
        const k = 1 - h.t / h.duration;
        shakeX = (Math.sin(h.t * 60) * 0.15) * k;
        shakeZ = (Math.cos(h.t * 55) * 0.12) * k;
        hitEmissiveBoost = k * 5;
        hitColorMix = new THREE.Color("#ef4444");
        // อนิเมชันกระโดดสะท้อนกระแทกเมื่อโดนโจมตี
        g.position.y += Math.sin(h.t * Math.PI * 4) * 0.2 * k;
        g.rotation.z = Math.sin(h.t * 30) * 0.3 * k;
      } else {
        h.active = false;
      }
    }
    g.position.x += shakeX;
    g.position.z += shakeZ;

    // ── Cast Feedback: token หมุนคริสตัล + พุ่งร่ายเวท ──
    let castEmissiveBoost = 0;
    let castColorMix = null;
    if (castState.current.active) {
      castState.current.t += delta;
      const c = castState.current;
      if (c.t < c.duration) {
        const k = 1 - c.t / c.duration;
        castEmissiveBoost = k * 4;
        castColorMix = new THREE.Color(c.color);
        // อนิเมชันหมากหมุนลอยตัวร่ายเวทมนตร์
        g.rotation.y += delta * 12 * k;
        g.position.y += Math.sin(c.t * Math.PI * 3) * 0.25 * k;
      } else {
        c.active = false;
      }
    }

    // คริสตัลหมุนช้าๆ + ปรับ emissive ตามสถานะ
    if (crystalRef.current) {
      crystalRef.current.rotation.y = t * 1.4 + index;
      const mat = crystalRef.current.material;
      if (mat) {
        const baseIntensity = isDead ? 0.15 : 1.5;
        mat.emissiveIntensity = baseIntensity + hitEmissiveBoost + castEmissiveBoost;
        // รีเซ็ต emissive เป็นสีฐานก่อน แล้วค่อยผสมกับ hit/cast ทุกเฟรม (กันการสะสม)
        mat.emissive.set(color);
        if (castColorMix) {
          mat.emissive.lerp(castColorMix, 0.5);
        } else if (hitColorMix) {
          mat.emissive.lerp(hitColorMix, 0.5);
        }
      }
    }

    // วงแหวนผู้เล่นตาปัจจุบัน: ขยาย-หด
    if (beaconRef.current) {
      const s = 1 + Math.sin(t * 4) * 0.12;
      beaconRef.current.scale.setScalar(s);
      beaconRef.current.material.opacity = 0.55 + Math.sin(t * 4) * 0.25;
    }
  });

  const color = isDead ? "#6b7280" : player.color;

  return (
    <group ref={groupRef} position={initialPosition.current}>
      <group rotation={[isDead ? 0.9 : 0, 0, isDead ? 0.9 : 0]}>
        {/* ฐานหิน */}
        <mesh position={[0, 0.4, 0]} castShadow>
          <cylinderGeometry args={[0.19, 0.24, 0.1, 24]} />
          <meshStandardMaterial color="#1a2030" roughness={0.85} />
        </mesh>

        {/* โมเดล 3D จริงสำหรับทุกบ้าน (wartaurus, podfindor, analyze, sraraff) */}
        {HOUSE_MODELS[player.houseId] ? (
          <Suspense fallback={
            <mesh ref={crystalRef} position={[0, 0.68, 0]} castShadow>
              <octahedronGeometry args={[0.21]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.5} />
            </mesh>
          }>
            <HouseModel modelPath={HOUSE_MODELS[player.houseId]} position={[0, 0.46, 0]} scale={[0.22, 0.22, 0.22]} />
          </Suspense>
        ) : (
          <mesh ref={crystalRef} position={[0, 0.68, 0]} castShadow>
            <octahedronGeometry args={[0.21]} />
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={isDead ? 0.15 : 1.5}
              roughness={0.25}
              metalness={0.1}
            />
          </mesh>
        )}
      </group>

      {/* วงแหวนใต้ผู้เล่นตาปัจจุบัน */}
      {isActive && !isDead && (
        <mesh
          ref={beaconRef}
          position={[0, 0.37, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <ringGeometry args={[0.28, 0.4, 40]} />
          <meshBasicMaterial
            color={player.color}
            transparent
            opacity={0.7}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  );
}

const HOUSE_MODELS = {
  watrat: "/models/wartaurus.glb",
  plodfindr: "/models/podfindor.glb",
  anal: "/models/analyze.glb",
  slarf: "/models/sraraff.glb",
};

function CrestSprite({ url }) {
  const tex = useLoader(THREE.TextureLoader, url);
  tex.colorSpace = THREE.SRGBColorSpace;
  return (
    <sprite position={[0, 1.14, 0]} scale={[0.5, 0.5, 0.5]}>
      <spriteMaterial map={tex} transparent depthWrite={false} />
    </sprite>
  );
}

function HouseModel({ modelPath, ...props }) {
  const { scene } = useGLTF(modelPath);
  const clonedScene = useMemo(() => {
    const clone = scene.clone();
    const box = new THREE.Box3().setFromObject(clone);
    const center = box.getCenter(new THREE.Vector3());
    // จัดศูนย์กลาง XZ และขยับฐานล่างสุด (min.y) มาวางแตะพื้น Y=0 พอดี
    clone.position.set(-center.x, -box.min.y, -center.z);
    return clone;
  }, [scene]);

  return (
    <group {...props} dispose={null}>
      <primitive object={clonedScene} />
    </group>
  );
}

Object.values(HOUSE_MODELS).forEach((path) => useGLTF.preload(path));
