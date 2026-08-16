"use client";

import { Suspense, useMemo, useRef, memo } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import { Html, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { cellToWorld } from "@/lib/boardLayout";
import { NPCS } from "@/lib/gameData";

const NPC_MODELS = {
  skill_trainer: "/models/npc_skills.glb",
  pet_trainer: "/models/npc_animal.glb",
  doctor: "/models/npc_docter.glb",
  merchant: "/models/npc_mysterious_merchant.glb",
};

const FALLBACK_IMAGE = "/images/npc/npc_ผู้ฝึก_skills.webp";

function NpcModel({ modelPath }) {
  const { scene } = useGLTF(modelPath);
  const clonedScene = useMemo(() => {
    const clone = scene.clone();
    const box = new THREE.Box3().setFromObject(clone);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const targetHeight = 0.95;
    const modelScale = size.y > 0 ? targetHeight / size.y : 1;

    // Normalize different source models so all NPCs stand at a similar size
    // and touch the same board floor.
    clone.scale.setScalar(modelScale);
    clone.position.set(-center.x * modelScale, -box.min.y * modelScale, -center.z * modelScale);

    clone.traverse((object) => {
      if (object.isMesh) {
        object.castShadow = false;
        object.receiveShadow = false;
      }
    });

    return clone;
  }, [scene]);

  return <primitive object={clonedScene} />;
}

function NpcImageFallback({ imagePath }) {
  const texture = useLoader(THREE.TextureLoader, imagePath || FALLBACK_IMAGE);

  useMemo(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
  }, [texture]);

  return (
    <mesh position={[0, 0.63, 0]}>
      <planeGeometry args={[0.75, 0.75]} />
      <meshBasicMaterial map={texture} transparent alphaTest={0.05} side={THREE.DoubleSide} />
    </mesh>
  );
}

const SingleNpc = memo(function SingleNpc({ npcState, npcInfo }) {
  const visualRef = useRef(null);
  const shadowRef = useRef(null);
  const ringRef = useRef(null);
  const [x, , z] = cellToWorld(npcState.cell);
  const modelPath = NPC_MODELS[npcState.id];
  const auraColor = npcInfo?.color || "#f0b85b";

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime;
    const hoverY = 0.2 + Math.sin(t * 2.5 + Number(npcState.cell)) * 0.06;

    if (visualRef.current) {
      visualRef.current.position.y = hoverY;
      visualRef.current.rotation.y += delta * 0.25;
    }

    if (shadowRef.current) {
      const shadowScale = 0.5 - (hoverY - 0.2) * 0.5;
      shadowRef.current.scale.set(shadowScale, shadowScale, 1);
    }

    if (ringRef.current) ringRef.current.rotation.z = t * 0.8;
  });

  return (
    <group position={[x, 0, z]}>
      <mesh ref={shadowRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.18, 0]}>
        <planeGeometry args={[0.8, 0.8]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.5} depthWrite={false} />
      </mesh>

      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.19, 0]}>
        <ringGeometry args={[0.3, 0.42, 32]} />
        <meshBasicMaterial color={auraColor} transparent opacity={0.8} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>

      <group ref={visualRef}>
        {modelPath ? (
          <Suspense fallback={<NpcImageFallback imagePath={npcInfo?.image} />}>
            <NpcModel modelPath={modelPath} />
          </Suspense>
        ) : (
          <NpcImageFallback imagePath={npcInfo?.image} />
        )}
      </group>

      <Html position={[0, 1.55, 0]} center distanceFactor={12} zIndexRange={[100, 0]} prepend>
        <div
          className="flex items-center px-2.5 py-1 rounded-full text-xs font-bold shadow-[0_0_12px_rgba(0,0,0,0.8)] border pointer-events-none whitespace-nowrap"
          style={{
            backgroundColor: "rgba(10, 15, 30, 0.92)",
            borderColor: auraColor,
            color: auraColor,
            fontFamily: '"HarryP", sans-serif',
          }}
        >
          <span>{npcInfo?.nameEn || npcInfo?.name}</span>
        </div>
      </Html>
    </group>
  );
});

const NpcModels = memo(function NpcModels({ npcs }) {
  if (!npcs) return null;

  const activeNpcs = Object.values(npcs).filter((npc) => npc && npc.isSpawned && npc.cell);

  return (
    <group>
      {activeNpcs.map((npcState) => {
        const npcInfo = NPCS[npcState.id];
        if (!npcInfo) return null;
        return <SingleNpc key={npcState.id} npcState={npcState} npcInfo={npcInfo} />;
      })}
    </group>
  );
});

export default NpcModels;
