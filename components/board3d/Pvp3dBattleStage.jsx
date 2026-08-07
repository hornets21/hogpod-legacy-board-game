"use client";

// ============================================================
// Pvp3dBattleStage — Mini 3D Canvas แสดงหมาก 3D ของผู้เล่นชนกัน
// ในหน้าต่าง PVP Combat Modal (ใช้ Three.js R3F Canvas ขนาดจิ๋ว)
// ============================================================

import { Suspense, useRef, useMemo } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

export default function Pvp3dBattleStage({ participants, clashResult, selectedSkills }) {
  if (!participants || participants.length === 0) return null;

  return (
    <div className="w-full h-full relative flex items-center justify-center">
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 2.5, 4.5], fov: 45 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      >
        <ambientLight intensity={1.2} />
        <pointLight position={[0, 4, 2]} intensity={2} color="#fbbf24" />
        <directionalLight position={[3, 5, 2]} intensity={1.5} />

        {/* BATTLE STAGE GROUND RING */}
        <mesh position={[0, -0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.2, 1.8, 48]} />
          <meshBasicMaterial color="#f59e0b" transparent opacity={0.3} side={THREE.DoubleSide} />
        </mesh>

        {/* RENDER 3D PLAYER TOKENS & SPELL BEAMS IN WORLD SPACE */}
        {participants.map((p, idx) => {
          const total = participants.length;
          let x = 0, z = 0, targetAngle = 0;

          if (total === 2) {
            // ดวล 1-1: ผู้เล่น 1 ยืนซ้าย (-1.35), ผู้เล่น 2 ยืนขวา (+1.35)
            x = idx === 0 ? -1.35 : 1.35;
            z = 0;
            // หันหน้าประจันชนกันตรงๆ (ซ้ายหันไปขวา +90 deg, ขวาหันไปซ้าย -90 deg)
            targetAngle = idx === 0 ? Math.PI / 2 : -Math.PI / 2;
          } else {
            // ดวลหลากบ้าน 3+ คน: จัดวงกลมลานประลอง
            const angle = (idx / total) * Math.PI * 2 - Math.PI / 2;
            const radius = 1.6;
            x = Math.cos(angle) * radius;
            z = Math.sin(angle) * radius;
            targetAngle = Math.atan2(-x, -z);
          }

          const color = p.color || "#f59e0b";

          return (
            <group key={p.houseId || idx}>
              <Fighter3dMesh
                player={p}
                position={[x, 0, z]}
                targetAngle={targetAngle}
                clashResult={clashResult}
                isCasting={!!selectedSkills?.[p.houseId]}
                skillId={selectedSkills?.[p.houseId]}
              />
              <SpellBeamAnimation startPos={[x, 0.45, z]} color={color} isClashing={!!clashResult} />
            </group>
          );
        })}
      </Canvas>
    </div>
  );
}

function Fighter3dMesh({ player, position, targetAngle, clashResult, isCasting, skillId }) {
  const groupRef = useRef(null);
  const crystalRef = useRef(null);

  useFrame(({ clock }) => {
    const g = groupRef.current;
    if (!g) return;
    const t = clock.elapsedTime;

    // ล็อกมุมหันหน้าประจันชนกันตรงๆ
    g.rotation.y = targetAngle;

    // อนิเมชันลอยตัวเบาๆ เมื่อสู้กัน
    if (isCasting || clashResult) {
      g.position.y = Math.sin(t * 6) * 0.08 + 0.05;
    } else {
      g.position.y = Math.sin(t * 2 + (player.playerIndex || 0)) * 0.03;
    }
  });

  const color = player.color || "#f59e0b";

  return (
    <group ref={groupRef} position={position}>
      {/* 3D BASE PEDESTAL */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.35, 0.42, 0.15, 24]} />
        <meshStandardMaterial color="#1e293b" roughness={0.5} metalness={0.8} />
      </mesh>

      {/* 3D MODEL FOR ALL HOUSES (wartaurus, podfindor, analyze, sraraff) */}
      {HOUSE_MODELS[player.houseId] ? (
        <Suspense fallback={
          <mesh ref={crystalRef} position={[0, 0.45, 0]}>
            <octahedronGeometry args={[0.38]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.5} />
          </mesh>
        }>
          <HouseModel modelPath={HOUSE_MODELS[player.houseId]} position={[0, 0.35, 0]} scale={[0.32, 0.32, 0.32]} />
        </Suspense>
      ) : (
        <mesh ref={crystalRef} position={[0, 0.45, 0]}>
          <octahedronGeometry args={[0.38]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={isCasting ? 2.5 : 1.2}
            roughness={0.2}
            metalness={0.3}
          />
        </mesh>
      )}

      {/* INVINCIBLE SHIELD BUBBLE */}
      {skillId === "stay_stupid" && (
        <mesh position={[0, 0.45, 0]}>
          <sphereGeometry args={[0.65, 24, 24]} />
          <meshBasicMaterial color="#3b82f6" transparent opacity={0.5} wireframe />
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

// ─── 3D ANIMATED SPELL BEAM & ORB PULSE COMPONENT ────────────────
function SpellBeamAnimation({ startPos, color, isClashing }) {
  const meshRef = useRef(null);
  const orbRef = useRef(null);

  const start = new THREE.Vector3(startPos[0], startPos[1], startPos[2]);
  const target = new THREE.Vector3(0, 0.45, 0);
  const dir = new THREE.Vector3().subVectors(target, start);
  const dist = dir.length();
  const midPoint = new THREE.Vector3().addVectors(start, target).multiplyScalar(0.5);

  const quat = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    dir.clone().normalize()
  );

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (meshRef.current) {
      if (meshRef.current.material) {
        meshRef.current.material.opacity = isClashing ? (0.85 + Math.sin(t * 16) * 0.15) : (0.5 + Math.sin(t * 6) * 0.2);
      }
    }
    if (orbRef.current) {
      // ลูกบอลพลังงานเวทวิ่งจากตัวหมากไปชนที่จุดปะทะกลางลาน [0, 0.45, 0]
      const speed = isClashing ? 2.5 : 1.2;
      const progress = (t * speed) % 1;
      orbRef.current.position.lerpVectors(start, target, progress);
    }
  });

  return (
    <group>
      {/* ลำแสงทรงกระบอก 3D ยิงเชื่อมระหว่างตัวหมากกับจุดปะทะกลางลาน [0, 0.45, 0] */}
      <group position={midPoint.toArray()} quaternion={quat}>
        <mesh ref={meshRef}>
          <cylinderGeometry args={[isClashing ? 0.07 : 0.035, isClashing ? 0.07 : 0.035, dist, 16, 1, true]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.7}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      </group>

      {/* บอลพลังงานเวทวิ่งตามลำแสง */}
      <mesh ref={orbRef} position={start.toArray()}>
        <sphereGeometry args={[isClashing ? 0.14 : 0.08, 16, 16]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.9}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* วงแหวนพลังงานระเบิดปะทะตรงกลางลานประลอง [0, 0.45, 0] */}
      <group position={target.toArray()}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.05, isClashing ? 0.45 : 0.25, 32]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={isClashing ? 0.95 : 0.5}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>
    </group>
  );
}

function PvpCrestSprite({ url }) {
  const tex = useLoader(THREE.TextureLoader, url);
  tex.colorSpace = THREE.SRGBColorSpace;
  return (
    <sprite position={[0, 1.0, 0]} scale={[0.55, 0.55, 0.55]}>
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
