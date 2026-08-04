"use client";

// ============================================================
// PlayerTokens — ตัวหมากผู้เล่น 3D (คริสตัลเรืองแสงสีบ้าน)
// เดินทีละช่องตามแต้มเต๋า / เทเลพอร์ตเมื่อขึ้นบันได-ลงงู/เกิดใหม่
// ============================================================

import { Suspense, useEffect, useRef } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import * as THREE from "three";
import { cellToWorld, TOKEN_OFFSETS } from "@/lib/boardLayout";
import { getEmojiTexture } from "./textures";

const WALK_SPEED = 2.8; // ช่องต่อวินาที (เดินนุ่มนวลเห็นจังหวะก้าวชัดเจน)
const TELEPORT_SPEED = 4.5;

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

  const anim = useRef({
    mode: "idle", // "idle" | "walk" | "teleportOut" | "teleportIn"
    queue: [],
    targetCell: null,
    scale: 1,
  });
  const prevPos = useRef(player.position);

  const offset = TOKEN_OFFSETS[index % TOKEN_OFFSETS.length];

  // วางตำแหน่งเริ่มต้นทันที
  useEffect(() => {
    const [x, , z] = cellToWorld(player.position);
    groupRef.current?.position.set(x + offset[0], 0, z + offset[2]);
    prevPos.current = player.position;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ตรวจการเปลี่ยนช่อง → เดินทีละช่อง (≤6) หรือเทเลพอร์ต
  useEffect(() => {
    const prev = prevPos.current;
    const next = player.position;
    if (prev === next) return;
    prevPos.current = next;

    const diff = next - prev;
    const a = anim.current;
    if (diff > 0 && diff <= 6) {
      for (let c = prev + 1; c <= next; c++) a.queue.push(c);
      if (a.mode === "idle") a.mode = "walk";
    } else {
      a.queue = [];
      a.targetCell = next;
      a.mode = "teleportOut";
    }
  }, [player.position]);

  const isDead = player.hp <= 0;

  useFrame(({ clock }, dt) => {
    const g = groupRef.current;
    if (!g) return;
    const a = anim.current;
    const t = clock.elapsedTime;
    const delta = Math.min(dt, 0.05);

    if (a.mode === "walk" && a.queue.length > 0) {
      const [tx, , tz] = cellToWorld(a.queue[0]);
      const targetX = tx + offset[0];
      const targetZ = tz + offset[2];
      const dx = targetX - g.position.x;
      const dz = targetZ - g.position.z;
      const dist = Math.hypot(dx, dz);
      const step = WALK_SPEED * delta;

      if (dist <= step) {
        g.position.x = targetX;
        g.position.z = targetZ;
        a.queue.shift();
        if (a.queue.length === 0) a.mode = "idle";
      } else {
        g.position.x += (dx / dist) * step;
        g.position.z += (dz / dist) * step;
      }
      // กระโดดเด้งๆ ระหว่างเดิน
      g.position.y = Math.abs(Math.sin(t * 14)) * 0.38 + 0.05;
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
      // idle: ลอยเบาๆ
      g.position.y = Math.sin(t * 2 + index * 1.7) * 0.045 + 0.03;
    }

    // คริสตัลหมุนช้าๆ
    if (crystalRef.current) {
      crystalRef.current.rotation.y = t * 1.4 + index;
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
    <group ref={groupRef}>
      <group rotation={[isDead ? 0.9 : 0, 0, isDead ? 0.9 : 0]}>
        {/* ฐานหิน */}
        <mesh position={[0, 0.4, 0]} castShadow>
          <cylinderGeometry args={[0.19, 0.24, 0.1, 24]} />
          <meshStandardMaterial color="#1a2030" roughness={0.85} />
        </mesh>

        {/* คริสตัลสีบ้าน */}
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

        {/* ตราบ้านลอยเหนือคริสตัล (ใช้รูปจริง ถ้าโหลดไม่ได้ใช้ emoji) */}
        {player.image ? (
          <Suspense
            fallback={
              <sprite position={[0, 1.14, 0]} scale={[0.46, 0.46, 0.46]}>
                <spriteMaterial
                  map={getEmojiTexture(player.emoji)}
                  transparent
                  depthWrite={false}
                />
              </sprite>
            }
          >
            <CrestSprite url={player.image} />
          </Suspense>
        ) : (
          <sprite position={[0, 1.14, 0]} scale={[0.46, 0.46, 0.46]}>
            <spriteMaterial
              map={getEmojiTexture(player.emoji)}
              transparent
              depthWrite={false}
            />
          </sprite>
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

function CrestSprite({ url }) {
  const tex = useLoader(THREE.TextureLoader, url);
  tex.colorSpace = THREE.SRGBColorSpace;
  return (
    <sprite position={[0, 1.14, 0]} scale={[0.5, 0.5, 0.5]}>
      <spriteMaterial map={tex} transparent depthWrite={false} />
    </sprite>
  );
}
