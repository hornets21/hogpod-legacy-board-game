"use client";

import { useMemo, useRef } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import * as THREE from "three";
import { Html } from "@react-three/drei";
import { cellToWorld } from "@/lib/boardLayout";
import { NPCS } from "@/lib/gameData";

function SingleNpcBillboard({ npcState, npcInfo }) {
  const meshRef = useRef(null);
  const shadowRef = useRef(null);
  const ringRef = useRef(null);

  const imagePath = npcInfo?.image || "/images/npc/npc_ผู้ฝึก_skills.webp";

  let texture;
  try {
    texture = useLoader(THREE.TextureLoader, imagePath);
  } catch (e) {
    texture = useLoader(THREE.TextureLoader, "/images/npc/npc_ผู้ฝึก_skills.webp");
  }

  useMemo(() => {
    if (texture) {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
    }
  }, [texture]);

  const [x, , z] = cellToWorld(npcState.cell);
  const width = 0.75;
  const height = 0.75;
  const baseY = height / 2 + 0.25;

  useFrame(({ clock, camera }) => {
    const t = clock.elapsedTime;

    if (meshRef.current) {
      // Gentle floating animation
      const hoverY = baseY + Math.sin(t * 2.5 + npcState.cell) * 0.08;
      meshRef.current.position.y = hoverY;

      // Face camera
      meshRef.current.quaternion.copy(camera.quaternion);

      // Shadow animation
      if (shadowRef.current) {
        const shadowScale = 0.5 - (hoverY - baseY) * 0.5;
        shadowRef.current.scale.set(shadowScale, shadowScale, 1);
      }
    }

    if (ringRef.current) {
      ringRef.current.rotation.z = t * 0.8;
    }
  });

  const auraColor = npcInfo?.color || "#f0b85b";

  return (
    <group position={[x, 0, z]}>
      {/* 1. Shadow on ground */}
      <mesh ref={shadowRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.18, 0]}>
        <planeGeometry args={[0.8, 0.8]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.5} depthWrite={false} />
      </mesh>

      {/* 2. Glowing Magic Ring on Tile Floor */}
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.19, 0]}>
        <ringGeometry args={[0.3, 0.42, 32]} />
        <meshBasicMaterial color={auraColor} transparent opacity={0.8} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>

      {/* 3. 2D Billboard Image Mesh */}
      <mesh ref={meshRef} position={[0, baseY, 0]}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial map={texture} transparent alphaTest={0.05} side={THREE.DoubleSide} />
      </mesh>

      {/* 4. HTML Floating Tag Header */}
      <Html position={[0, height + 0.5, 0]} center distanceFactor={12} zIndexRange={[100, 0]}>
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold shadow-[0_0_12px_rgba(0,0,0,0.8)] border backdrop-blur-md pointer-events-none whitespace-nowrap animate-bounce"
          style={{
            backgroundColor: "rgba(13, 16, 23, 0.9)",
            borderColor: auraColor,
            color: auraColor,
          }}
        >
          <span>{npcInfo?.name}</span>
        </div>
      </Html>
    </group>
  );
}

export default function NpcModels({ npcs }) {
  if (!npcs) return null;

  const activeNpcs = Object.values(npcs).filter((n) => n && n.isSpawned && n.cell);

  return (
    <group>
      {activeNpcs.map((npcState) => {
        const npcInfo = NPCS[npcState.id];
        if (!npcInfo) return null;
        return <SingleNpcBillboard key={npcState.id} npcState={npcState} npcInfo={npcInfo} />;
      })}
    </group>
  );
}
