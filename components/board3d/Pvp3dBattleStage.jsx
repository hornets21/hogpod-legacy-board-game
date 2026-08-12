"use client";

// ============================================================
// Pvp3dBattleStage — Mini 3D Canvas แสดงหมาก 3D ของผู้เล่นชนกัน
// ปรับแต่งตาม threejs_stylized_vfx_guide.md เพื่อความลื่นไหล 60 FPS
// ============================================================

import { Suspense, useRef, useMemo, useState, useEffect, memo } from "react";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

// ─── MODULE-LEVEL SHARED GEOMETRIES (Zero GC / Zero Re-allocations) ──
const SPHERE_GEO = new THREE.SphereGeometry(1, 12, 12);
const CYLINDER_GEO = new THREE.CylinderGeometry(1, 1, 1, 10, 1, true);
const RING_GEO = new THREE.RingGeometry(0.15, 0.55, 32);
const BEAM_OUTER_GEO = new THREE.CylinderGeometry(0.22, 0.22, 1, 10, 1, true);
const BEAM_FIRE_OUTER_GEO = new THREE.CylinderGeometry(0.35, 0.35, 1, 10, 1, true);
const BEAM_MID_GEO = new THREE.CylinderGeometry(0.1, 0.1, 1, 10, 1, true);
const BEAM_CORE_GEO = new THREE.CylinderGeometry(0.03, 0.03, 1, 8, 1, true);
const TORUS_GEO = new THREE.TorusGeometry(1, 0.04, 8, 24);
const DODECA_GEO = new THREE.DodecahedronGeometry(0.18, 1);
const OCTA_GEO = new THREE.OctahedronGeometry(0.16);

// ─── SKILL COLOR PALETTE MAP ────────────────────────────────
const SKILL_COLORS = {
  phoenix_force: "#f97316",
  thunder_star: "#eab308",
  stay_stupid: "#3b82f6",
  ngo_leng_ngeng_khiao: "#22c55e",
  god_ntr: "#a855f7",
  korat_chaos: "#c084fc",
  morelody: "#ec4899",
  skunk_blast: "#84cc16",
};

export default memo(function Pvp3dBattleStage({ participants, clashResult, selectedSkills }) {
  if (!participants || participants.length === 0) return null;

  const [flashActive, setFlashActive] = useState(false);
  const prevClashRef = useRef(null);

  useEffect(() => {
    if (clashResult && clashResult !== prevClashRef.current) {
      prevClashRef.current = clashResult;
      setFlashActive(true);
    }
  }, [clashResult]);

  return (
    <div className="w-full h-full relative flex items-center justify-center">
      {flashActive && (
        <ClashFlashOverlay onDone={() => setFlashActive(false)} />
      )}

      <Canvas
        dpr={1}
        camera={{ position: [0, 2.5, 4.5], fov: 45 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      >
        <CameraShakeController flashActive={flashActive} />

        <ambientLight intensity={0.85} />
        <pointLight position={[0, 3.5, 1.5]} intensity={2.5} color="#fbbf24" />
        <pointLight position={[-3, 1.5, -2]} intensity={1.8} color="#38bdf8" />
        <directionalLight position={[3, 5, 2]} intensity={2.2} />

        <ArenaPlatform />

        {(() => {
          const total = participants.length;
          const positions = participants.map((_, idx) => {
            let x = 0, z = 0;
            if (total === 2) {
              x = idx === 0 ? -1.35 : 1.35;
              z = 0;
            } else {
              const angle = (idx / total) * Math.PI * 2 - Math.PI / 2;
              const radius = 1.6;
              x = Math.cos(angle) * radius;
              z = Math.sin(angle) * radius;
            }
            return [x, 0.45, z];
          });

          return (
            <>
              {participants.map((p, idx) => {
                const [x,, z] = positions[idx];
                const targetAngle = total === 2
                  ? (idx === 0 ? Math.PI / 2 : -Math.PI / 2)
                  : Math.atan2(-x, -z);
                const activeSkillId = selectedSkills?.[p.houseId];
                const color = SKILL_COLORS[activeSkillId] || p.color || "#f59e0b";
                const enemyPositions = positions.filter((_, i) => i !== idx);

                return (
                  <group key={p.houseId || idx}>
                    <Fighter3dMesh
                      player={p}
                      position={[x, 0, z]}
                      targetAngle={targetAngle}
                      clashResult={clashResult}
                      isCasting={!!activeSkillId}
                      skillId={activeSkillId}
                    />
                    {clashResult && (
                      <SpellBeamAnimation
                        startPos={[x, 0.45, z]}
                        enemyPositions={enemyPositions}
                        color={color}
                        isClashing={true}
                        skillId={activeSkillId}
                      />
                    )}
                  </group>
                );
              })}
              {clashResult && <CenterExplosion />}
            </>
          );
        })()}
      </Canvas>
    </div>
  );
});

// ─── 🎥 HARDWARE-ACCELERATED R3F CAMERA SHAKE CONTROLLER ───────────
function CameraShakeController({ flashActive }) {
  const { camera } = useThree();
  const basePos = useRef([0, 2.5, 4.5]);

  useFrame(({ clock }) => {
    if (flashActive) {
      const t = clock.elapsedTime;
      const shakeX = Math.sin(t * 45) * 0.12;
      const shakeY = Math.cos(t * 38) * 0.08;
      camera.position.x = basePos.current[0] + shakeX;
      camera.position.y = basePos.current[1] + shakeY;
    } else {
      camera.position.x = basePos.current[0];
      camera.position.y = basePos.current[1];
    }
  });

  return null;
}

// ─────────────────────────────────────────────────────────────
const ArenaPlatform = memo(function ArenaPlatform() {
  const texture = useLoader(
    THREE.TextureLoader,
    "/images/textures/ancient-dark-stone-pedestal-slab.webp"
  );

  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);

  return (
    <group position={[0, -0.12, 0]}>
      <mesh>
        <boxGeometry args={[3.9, 0.16, 3.9]} />
        <meshStandardMaterial color="#090d18" roughness={0.48} metalness={0.6} />
      </mesh>

      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3.92, 3.92]} />
        <meshBasicMaterial color="#d99a32" transparent opacity={0.18} side={THREE.DoubleSide} />
      </mesh>

      <mesh position={[0, 0.085, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3.78, 3.78]} />
        <meshStandardMaterial
          map={texture}
          color="#c9b28a"
          emissive="#24170a"
          emissiveIntensity={0.22}
          roughness={0.7}
          metalness={0.28}
        />
      </mesh>

      <mesh position={[0, 0.095, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.15, 1.18, 64]} />
        <meshBasicMaterial color="#fbbf24" transparent opacity={0.55} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
});

// ─────────────────────────────────────────────────────────────
const Fighter3dMesh = memo(function Fighter3dMesh({ player, position, targetAngle, clashResult, isCasting, skillId }) {
  const groupRef = useRef(null);
  const auraRef = useRef(null);
  const circleRef = useRef(null);

  useFrame(({ clock }) => {
    const g = groupRef.current;
    if (!g) return;
    const t = clock.elapsedTime;
    g.rotation.y = targetAngle;
    if (isCasting || clashResult) {
      g.position.y = Math.sin(t * 6) * 0.08 + 0.05;
    } else {
      g.position.y = Math.sin(t * 2 + (player.playerIndex || 0)) * 0.03;
    }
    if (auraRef.current?.material) {
      const pulse = 1 + Math.sin(t * (isCasting ? 8 : 3)) * 0.25;
      auraRef.current.scale.setScalar(pulse);
      auraRef.current.material.opacity = isCasting ? 0.45 : 0.12;
    }
    if (circleRef.current) circleRef.current.rotation.z = t * 2.2;
  });

  const color = SKILL_COLORS[skillId] || player.color || "#f59e0b";

  return (
    <group ref={groupRef} position={position}>
      {isCasting && (
        <mesh ref={circleRef} position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.32, 0.62, 32]} />
          <meshBasicMaterial color={color} transparent opacity={0.85} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      )}

      <mesh ref={auraRef} position={[0, 0.5, 0]} geometry={SPHERE_GEO} scale={0.45}>
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.12}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {HOUSE_MODELS[player.houseId] ? (
        <Suspense fallback={
          <mesh position={[0, 0.5, 0]}>
            <octahedronGeometry args={[0.48]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.5} />
          </mesh>
        }>
          <HouseModel modelPath={HOUSE_MODELS[player.houseId]} position={[0, 0.05, 0]} scale={[0.5, 0.5, 0.5]} />
        </Suspense>
      ) : (
        <mesh position={[0, 0.5, 0]}>
          <octahedronGeometry args={[0.48]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={isCasting ? 2.5 : 1.2} roughness={0.2} metalness={0.3} />
        </mesh>
      )}

      {skillId === "stay_stupid" && (
        <mesh position={[0, 0.45, 0]} geometry={SPHERE_GEO} scale={0.65}>
          <meshBasicMaterial color="#3b82f6" transparent opacity={0.6} wireframe blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      )}

      {skillId === "phoenix_force" && isCasting && (
        <mesh position={[0, 0.48, 0]} geometry={TORUS_GEO} scale={0.52}>
          <meshBasicMaterial color="#f97316" transparent opacity={0.9} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      )}

      {skillId === "thunder_star" && isCasting && (
        <mesh position={[0, 1.0, 0]} geometry={CYLINDER_GEO} scale={[0.04, 1.2, 0.04]}>
          <meshBasicMaterial color="#fef08a" transparent opacity={0.95} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      )}

      {skillId === "ngo_leng_ngeng_khiao" && isCasting && (
        <mesh position={[0, 0.48, 0]} rotation={[Math.PI / 4, 0, 0]} geometry={TORUS_GEO} scale={0.58}>
          <meshBasicMaterial color="#22c55e" transparent opacity={0.9} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      )}

      {(skillId === "god_ntr" || skillId === "korat_chaos") && isCasting && (
        <mesh position={[0, 0.48, 0]}>
          <ringGeometry args={[0.2, 0.55, 24]} />
          <meshBasicMaterial color="#c084fc" transparent opacity={0.85} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
});

const HOUSE_MODELS = {
  watrat: "/models/wartaurus.glb",
  plodfindr: "/models/podfindor.glb",
  anal: "/models/analyze.glb",
  slarf: "/models/sraraff.glb",
};

// ─── 3D ANIMATED SPELL BEAM (ELEMENTAL PROJECTILE & BEAM SYSTEM) ──────────
const SpellBeamAnimation = memo(function SpellBeamAnimation({ startPos, enemyPositions, color, isClashing, skillId }) {
  const outerRef  = useRef(null);
  const midRef    = useRef(null);
  const coreRef   = useRef(null);
  const auraRef   = useRef(null);
  const orbRef    = useRef(null);
  const impactRef = useRef(null);
  const orbStartRef = useRef(null);
  const sparkRefs = useRef([]);

  const start = useMemo(() => new THREE.Vector3(...startPos), [startPos]);
  const target = useMemo(() => {
    if (!enemyPositions?.length) return new THREE.Vector3(0, 0.45, 0);
    if (enemyPositions.length === 1) return new THREE.Vector3(...enemyPositions[0]);
    const avg = enemyPositions.reduce((acc, p) => [acc[0] + p[0], acc[1] + p[1], acc[2] + p[2]], [0, 0, 0]).map((v) => v / enemyPositions.length);
    return new THREE.Vector3(...avg);
  }, [enemyPositions]);

  const dir = useMemo(() => new THREE.Vector3().subVectors(target, start), [start, target]);
  const dist = dir.length();
  const mid  = useMemo(() => new THREE.Vector3().addVectors(start, target).multiplyScalar(0.5), [start, target]);
  const beamQuat = useMemo(() => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize()), [dir]);

  const particles = useMemo(() => Array.from({ length: 8 }, (_, i) => ({ id: i, offset: (i / 8) * Math.PI * 2, size: 0.04 + (i % 3) * 0.025 })), []);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (orbStartRef.current === null) orbStartRef.current = t;
    const elapsed = t - orbStartRef.current;
    const prog = Math.min(1, elapsed / 0.55);
    const eased = 1 - Math.pow(1 - prog, 3);
    if (coreRef.current?.material) coreRef.current.material.opacity = isClashing ? 0.95 + Math.sin(t * 25) * 0.05 : 0.5 + Math.sin(t * 6) * 0.15;
    if (midRef.current?.material) midRef.current.material.opacity = isClashing ? 0.65 : 0.25;
    if (outerRef.current?.material) outerRef.current.material.opacity = isClashing ? 0.25 : 0.08;
    if (orbRef.current) {
      orbRef.current.position.lerpVectors(start, target, eased);
      orbRef.current.rotation.y = t * 6;
      const s = skillId === "phoenix_force" ? 1.8 + Math.sin(elapsed * 20) * 0.4 : 1.3 + Math.sin(elapsed * 25) * 0.3;
      orbRef.current.scale.setScalar(s);
      if (orbRef.current.material) orbRef.current.material.opacity = prog < 0.95 ? 0.98 : (1 - prog) * 10;
    }
    sparkRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const p = particles[i];
      const pk = Math.max(0, eased - (p.id % 4) * 0.08);
      const pos = new THREE.Vector3().lerpVectors(start, target, pk);
      pos.x += Math.cos(t * 12 + p.offset) * 0.22 * (1 - pk);
      pos.y += Math.sin(t * 12 + p.offset) * 0.22 * (1 - pk);
      mesh.position.copy(pos);
      if (mesh.material) mesh.material.opacity = (1 - pk) * 0.95;
    });
  });

  return (
    <group>
      <group position={mid.toArray()} quaternion={beamQuat} scale={[1, dist, 1]}>
        <mesh ref={outerRef} geometry={skillId === "phoenix_force" ? BEAM_FIRE_OUTER_GEO : BEAM_OUTER_GEO}>
          <meshBasicMaterial color={color} transparent opacity={0.2} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
        <mesh ref={midRef} geometry={BEAM_MID_GEO}>
          <meshBasicMaterial color={color} transparent opacity={0.6} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
        <mesh ref={coreRef} geometry={BEAM_CORE_GEO}>
          <meshBasicMaterial color="#ffffff" transparent opacity={0.9} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      </group>
      <mesh ref={orbRef} position={start.toArray()} geometry={skillId === "phoenix_force" ? DODECA_GEO : skillId === "thunder_star" ? OCTA_GEO : SPHERE_GEO}>
        <meshBasicMaterial color={color} transparent opacity={0.98} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      {particles.map((p, i) => (
        <mesh key={p.id} ref={(el) => (sparkRefs.current[i] = el)} geometry={SPHERE_GEO} scale={p.size}>
          <meshBasicMaterial color={color} transparent opacity={0.9} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      ))}
      <mesh ref={auraRef} position={start.toArray()} geometry={SPHERE_GEO} scale={0.35}>
        <meshBasicMaterial color={color} transparent opacity={0.4} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh ref={impactRef} position={target.toArray()} rotation={[-Math.PI / 2, 0, 0]} geometry={RING_GEO}>
        <meshBasicMaterial color={color} transparent opacity={0.9} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
    </group>
  );
});

// ─── Center Explosion ─────────────────────────────────────────
const CenterExplosion = memo(function CenterExplosion() {
  const ringsRef     = useRef(null);
  const pillarRef    = useRef(null);
  const particlesRef = useRef(null);
  const spinnerRef   = useRef(null);
  const startRef     = useRef(null);

  const RINGS = useMemo(() => [
    { r1: 0.03, r2: 0.35, color: "#ffffff", spd: 4.5, delay: 0.00 },
    { r1: 0.03, r2: 0.62, color: "#fbbf24", spd: 3.3, delay: 0.07 },
    { r1: 0.03, r2: 0.92, color: "#f97316", spd: 2.4, delay: 0.17 },
    { r1: 0.03, r2: 1.28, color: "#ef4444", spd: 1.8, delay: 0.30 },
  ], []);

  const PART_ANGLES = useMemo(() => Array.from({ length: 6 }, (_, i) => (i / 6) * Math.PI * 2), []);
  const PART_COLORS = ["#fbbf24", "#ef4444", "#f97316", "#a855f7", "#38bdf8", "#ffffff"];

  useFrame(({ clock }) => {
    if (startRef.current === null) startRef.current = clock.elapsedTime;
    const el = clock.elapsedTime - startRef.current;
    ringsRef.current?.children.forEach((ring, i) => {
      const cfg = RINGS[i];
      const t = Math.max(0, el - cfg.delay);
      const k = Math.min(1, t * cfg.spd);
      const s = 0.15 + k * 3.0;
      ring.scale.set(s, s, 1);
      if (ring.material) ring.material.opacity = Math.pow(1 - k, 0.6) * 0.95;
    });
    if (pillarRef.current) {
      const k = Math.min(1, el * 3.5);
      pillarRef.current.scale.y = 0.05 + k * 5.0;
      pillarRef.current.position.y = k * 0.65;
      if (pillarRef.current.material) pillarRef.current.material.opacity = Math.max(0, 1 - el * 1.6) * 0.92;
    }
    if (particlesRef.current) {
      const k = Math.min(1, el * 2.5);
      const eased = 1 - Math.pow(1 - k, 2.8);
      particlesRef.current.children.forEach((child, i) => {
        const angle = PART_ANGLES[i];
        const r = eased * 2.6;
        child.position.x = Math.cos(angle) * r;
        child.position.z = Math.sin(angle) * r;
        child.position.y = eased * 1.1 - eased * eased * 0.7;
        if (child.material) child.material.opacity = Math.max(0, (1 - k) * 0.96);
      });
    }
    if (spinnerRef.current) {
      spinnerRef.current.rotation.z = el * 6;
      spinnerRef.current.rotation.x = el * 2.5;
      if (spinnerRef.current.material) spinnerRef.current.material.opacity = Math.max(0, 1 - el * 2.0) * 0.88;
    }
  });

  return (
    <group>
      <group ref={ringsRef} position={[0, 0.09, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        {RINGS.map((ring, i) => (
          <mesh key={i}>
            <ringGeometry args={[ring.r1, ring.r2, 40]} />
            <meshBasicMaterial color={ring.color} transparent opacity={0} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
        ))}
      </group>
      <mesh ref={pillarRef} position={[0, 0, 0]} geometry={CYLINDER_GEO} scale={[0.1, 1, 0.1]}>
        <meshBasicMaterial color="#fde68a" transparent opacity={0.88} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <group ref={particlesRef}>
        {PART_ANGLES.map((_, i) => (
          <mesh key={i} position={[0, 0.2, 0]} geometry={SPHERE_GEO} scale={0.06}>
            <meshBasicMaterial color={PART_COLORS[i]} transparent opacity={0.92} blending={THREE.AdditiveBlending} depthWrite={false} />
          </mesh>
        ))}
      </group>
      <mesh ref={spinnerRef} position={[0, 0.14, 0]} geometry={TORUS_GEO} scale={0.32}>
        <meshBasicMaterial color="#ffffff" transparent opacity={0.78} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  );
});

// ─── Full CSS Clash Overlay ──────────
const ClashFlashOverlay = memo(function ClashFlashOverlay({ onDone }) {
  return (
    <div className="absolute inset-0 pointer-events-none z-20 flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-white opacity-0 animate-[ping_0.15s_ease-out]" />
      <div className="absolute inset-0 opacity-80" style={{ background: "radial-gradient(ellipse at center, rgba(251,191,36,0.9) 0%, rgba(239,68,68,0.6) 35%, transparent 75%)" }} />
      <div
        className="absolute select-none font-black tracking-widest uppercase text-white animate-bounce text-3xl md:text-5xl"
        style={{
          textShadow: "0 0 24px #fbbf24, 0 0 48px #ef4444",
          letterSpacing: "0.25em",
        }}
        onAnimationEnd={onDone}
      >
        ⚔️&nbsp;CLASH!
      </div>
    </div>
  );
});

// ─────────────────────────────────────────────────────────────
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
