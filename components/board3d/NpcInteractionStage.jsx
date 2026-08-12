"use client";

import React, { Suspense, useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

const HOUSE_MODELS = {
  watrat: "/models/wartaurus.glb",
  plodfindr: "/models/podfindor.glb",
  anal: "/models/analyze.glb",
  slarf: "/models/sraraff.glb",
};

const NpcInteractionStage = React.memo(function NpcInteractionStage({ player, npcInfo }) {
  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none z-0">
      <Canvas
        camera={{ position: [0, 1.2, 3.8], fov: 42 }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={1.5} />
        <directionalLight position={[4, 8, 5]} intensity={2.2} color="#fff" />
        <directionalLight position={[-4, 4, -2]} intensity={1.2} color="#60a5fa" />
        <pointLight position={[0, 1.5, 0]} intensity={2.0} color="#fbbf24" />

        {/* 3D PEDESTALS & MAGICAL ENCOUNTER CIRCLE */}
        <group position={[0, -0.6, 0]}>
          {/* Central Magic Crest Floor */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
            <ringGeometry args={[0.3, 2.2, 48]} />
            <meshBasicMaterial color="#3b82f6" transparent opacity={0.2} side={THREE.DoubleSide} />
          </mesh>

          {/* Player Pedestal (Left Side) */}
          <mesh position={[-1.2, 0, 0]}>
            <cylinderGeometry args={[0.45, 0.55, 0.18, 32]} />
            <meshStandardMaterial color="#1e293b" roughness={0.4} metalness={0.8} />
          </mesh>

          {/* NPC Pedestal (Right Side) */}
          <mesh position={[1.2, 0, 0]}>
            <cylinderGeometry args={[0.45, 0.55, 0.18, 32]} />
            <meshStandardMaterial color="#312e81" roughness={0.4} metalness={0.8} />
          </mesh>

          {/* 3D Player Character Model (Left) */}
          <NpcFighter3dMesh
            modelPath={HOUSE_MODELS[player.houseId]}
            position={[-1.2, 0, 0]}
            targetPoint={[1.2, 0.45, 0]}
            color={player.color || "#eab308"}
            scale={0.36}
          />

          {/* 3D NPC Character Model (Right) */}
          <NpcFighter3dMesh
            modelPath={npcInfo?.modelPath || "/models/wartaurus.glb"}
            position={[1.2, 0, 0]}
            targetPoint={[-1.2, 0.45, 0]}
            color="#ec4899"
            scale={0.36}
            isNpc
          />

          {/* 3D Magical Particle Link Beam Between Player & NPC */}
          <NpcMagicLinkBeam startPos={[-1.2, 0.45, 0]} targetPos={[1.2, 0.45, 0]} color={player.color || "#3b82f6"} />
        </group>
      </Canvas>
    </div>
  );
});

function NpcFighter3dMesh({ modelPath, position, targetPoint, color, scale = 0.36, isNpc = false }) {
  const groupRef = useRef(null);

  useFrame(({ clock }) => {
    const g = groupRef.current;
    if (!g) return;
    const t = clock.elapsedTime;

    // Turn 3D character facing target partner directly
    const targetAngle = Math.atan2(targetPoint[0] - position[0], targetPoint[2] - position[2]);
    g.rotation.y = targetAngle;

    // Gentle hover animation
    g.position.y = Math.sin(t * 2.5 + (isNpc ? 1.5 : 0)) * 0.04;
  });

  return (
    <group ref={groupRef} position={position}>
      {modelPath ? (
        <Suspense fallback={
          <mesh position={[0, 0.45, 0]}>
            <octahedronGeometry args={[0.38]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.5} />
          </mesh>
        }>
          <GenericHouseModel modelPath={modelPath} position={[0, 0.05, 0]} scale={[scale, scale, scale]} />
        </Suspense>
      ) : (
        <mesh position={[0, 0.45, 0]}>
          <octahedronGeometry args={[0.38]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.5} />
        </mesh>
      )}
    </group>
  );
}

function GenericHouseModel({ modelPath, ...props }) {
  const { scene } = useGLTF(modelPath);
  const clonedScene = useMemo(() => {
    const clone = scene.clone();
    const box = new THREE.Box3().setFromObject(clone);
    const center = box.getCenter(new THREE.Vector3());
    clone.position.set(-center.x, -box.min.y, -center.z);
    return clone;
  }, [scene]);

  return (
    <group {...props} dispose={null}>
      <primitive object={clonedScene} />
    </group>
  );
}

const NpcMagicLinkBeam = React.memo(function NpcMagicLinkBeam({ startPos, targetPos, color }) {
  const meshRef = useRef(null);
  const orbRef = useRef(null);

  const { start, target, dist, midPoint, quat } = useMemo(() => {
    const s = new THREE.Vector3(startPos[0], startPos[1], startPos[2]);
    const t = new THREE.Vector3(targetPos[0], targetPos[1], targetPos[2]);
    const d = new THREE.Vector3().subVectors(t, s);
    const distance = d.length();
    const mid = new THREE.Vector3().addVectors(s, t).multiplyScalar(0.5);
    const q = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      d.clone().normalize()
    );
    return { start: s, target: t, dist: distance, midPoint: mid, quat: q };
  }, [startPos[0], startPos[1], startPos[2], targetPos[0], targetPos[1], targetPos[2]]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (meshRef.current?.material) {
      meshRef.current.material.opacity = 0.5 + Math.sin(t * 8) * 0.25;
    }
    if (orbRef.current) {
      const progress = (t * 1.5) % 1;
      orbRef.current.position.lerpVectors(start, target, progress);
    }
  });

  return (
    <group>
      <group position={midPoint.toArray()} quaternion={quat}>
        <mesh ref={meshRef}>
          <cylinderGeometry args={[0.03, 0.03, dist, 16, 1, true]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.6}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      </group>

      <mesh ref={orbRef} position={start.toArray()}>
        <sphereGeometry args={[0.09, 16, 16]} />
        <meshBasicMaterial color="#fbbf24" transparent opacity={0.9} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
});

export default NpcInteractionStage;
