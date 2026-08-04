"use client";

// ============================================================
// Atmosphere — บรรยากาศปราสาท: พื้นหิน, เทียนลอย, ฝุ่นเวทมนตร์,
// ไฟเทียนกะพริบ (ธีม Hogwarts Legacy)
// ============================================================

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { BOARD_COLS, BOARD_ROWS, TILE_GAP } from "@/lib/boardLayout";
import { getGlowTexture } from "./textures";

const BOARD_W = BOARD_COLS * TILE_GAP;
const BOARD_D = BOARD_ROWS * TILE_GAP;

export default function Atmosphere() {
  return (
    <group>
      {/* พื้นปราสาทรอบกระดาน */}
      <mesh position={[0, -0.46, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[70, 70]} />
        <meshStandardMaterial color="#0a0d17" roughness={1} metalness={0} />
      </mesh>

      {/* แท่นหินรองกระดาน */}
      <mesh position={[0, -0.24, 0]} receiveShadow>
        <boxGeometry args={[BOARD_W + 0.9, 0.44, BOARD_D + 0.9]} />
        <meshStandardMaterial color="#171c2c" roughness={0.92} metalness={0.05} />
      </mesh>
      {/* ขอบทองของแท่น */}
      <mesh position={[0, -0.03, 0]}>
        <boxGeometry args={[BOARD_W + 0.94, 0.03, BOARD_D + 0.94]} />
        <meshStandardMaterial
          color="#3a2f14"
          emissive="#f0b85b"
          emissiveIntensity={0.25}
          roughness={0.5}
          metalness={0.4}
        />
      </mesh>

      <FloatingCandles />
      <DustMotes />
      <FlickeringLights />
    </group>
  );
}

// ─── เทียนลอยสองข้างกระดาน ──────────────────────────────────
function FloatingCandles() {
  const groupRef = useRef(null);

  const candles = useMemo(() => {
    const list = [];
    const perSide = 5;
    for (let side = -1; side <= 1; side += 2) {
      for (let i = 0; i < perSide; i++) {
        const z = -BOARD_D / 2 + (i + 0.5) * (BOARD_D / perSide);
        list.push({
          x: side * (BOARD_W / 2 + 1.7),
          y: 2.1 + ((i * 37) % 10) / 10 + (side > 0 ? 0.4 : 0),
          z,
          phase: i * 1.3 + (side > 0 ? 2.1 : 0),
        });
      }
    }
    return list;
  }, []);

  useFrame(({ clock }) => {
    const g = groupRef.current;
    if (!g) return;
    const t = clock.elapsedTime;
    g.children.forEach((child, i) => {
      const c = candles[i];
      child.position.y = c.y + Math.sin(t * 0.9 + c.phase) * 0.14;
      child.rotation.z = Math.sin(t * 0.6 + c.phase) * 0.05;
    });
  });

  return (
    <group ref={groupRef}>
      {candles.map((c, i) => (
        <group key={i} position={[c.x, c.y, c.z]}>
          {/* ตัวเทียน */}
          <mesh castShadow>
            <cylinderGeometry args={[0.05, 0.06, 0.42, 10]} />
            <meshStandardMaterial color="#e8dfc8" roughness={0.6} />
          </mesh>
          {/* เปลวไฟ */}
          <mesh position={[0, 0.3, 0]}>
            <sphereGeometry args={[0.055, 10, 10]} />
            <meshStandardMaterial
              color="#ff9d3c"
              emissive="#ff9d3c"
              emissiveIntensity={4}
              toneMapped={false}
            />
          </mesh>
          {/* รัศมีแวบๆ รอบเปลวไฟ */}
          <sprite position={[0, 0.3, 0]} scale={[0.55, 0.55, 0.55]}>
            <spriteMaterial
              map={getGlowTexture()}
              color="#ffb45e"
              transparent
              opacity={0.6}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </sprite>
        </group>
      ))}
    </group>
  );
}

// ─── ฝุ่นเวทมนตร์ลอยช้าๆ ────────────────────────────────────
function DustMotes() {
  const pointsRef = useRef(null);
  const COUNT = 260;

  const positions = useMemo(() => {
    const arr = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      arr[i * 3] = (Math.random() - 0.5) * (BOARD_W + 10);
      arr[i * 3 + 1] = 0.4 + Math.random() * 4.6;
      arr[i * 3 + 2] = (Math.random() - 0.5) * (BOARD_D + 10);
    }
    return arr;
  }, []);

  useFrame(({ clock }) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y = clock.elapsedTime * 0.02;
      pointsRef.current.position.y =
        Math.sin(clock.elapsedTime * 0.35) * 0.25;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={COUNT}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.055}
        color="#ffd9a0"
        transparent
        opacity={0.55}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}

// ─── ไฟเทียนสีทองกะพริบ 2 จุด ───────────────────────────────
function FlickeringLights() {
  const l1 = useRef(null);
  const l2 = useRef(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (l1.current) {
      l1.current.intensity =
        26 * (0.85 + Math.sin(t * 7.3) * 0.08 + Math.sin(t * 13.7) * 0.07);
    }
    if (l2.current) {
      l2.current.intensity =
        22 * (0.85 + Math.sin(t * 6.1 + 2) * 0.08 + Math.sin(t * 11.3) * 0.07);
    }
  });

  return (
    <group>
      <pointLight
        ref={l1}
        position={[-(BOARD_W / 2 + 1.7), 3, 0]}
        color="#ffb45e"
        intensity={26}
        distance={16}
        decay={2}
      />
      <pointLight
        ref={l2}
        position={[BOARD_W / 2 + 1.7, 3.4, 0]}
        color="#ffb45e"
        intensity={22}
        distance={16}
        decay={2}
      />
    </group>
  );
}
