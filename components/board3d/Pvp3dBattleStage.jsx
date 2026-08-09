"use client";

// ============================================================
// Pvp3dBattleStage — Mini 3D Canvas แสดงหมาก 3D ของผู้เล่นชนกัน
// ในหน้าต่าง PVP Combat Modal (ใช้ Three.js R3F Canvas ขนาดจิ๋ว)
// ============================================================

import { Suspense, useRef, useMemo, useState, useEffect } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { motion } from "motion/react";
import * as THREE from "three";

export default function Pvp3dBattleStage({ participants, clashResult, selectedSkills }) {
  if (!participants || participants.length === 0) return null;

  const [flashActive, setFlashActive] = useState(false);
  const prevClashRef = useRef(null);

  // CSS flash overlay ตอน clash เกิดขึ้น
  useEffect(() => {
    if (clashResult && clashResult !== prevClashRef.current) {
      prevClashRef.current = clashResult;
      setFlashActive(true);
    }
  }, [clashResult]);

  return (
    <motion.div
      className="w-full h-full relative flex items-center justify-center"
      animate={
        flashActive
          ? { x: [0, -7, 7, -5, 5, -2, 2, 0], y: [0, 5, -5, 3, -3, 1, -1, 0] }
          : {}
      }
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      {/* ── Full clash overlay ── */}
      {flashActive && (
        <ClashFlashOverlay onDone={() => setFlashActive(false)} />
      )}

      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 2.5, 4.5], fov: 45 }}
        shadows
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      >
        <ambientLight intensity={0.75} />
        <pointLight position={[0, 3.5, 1.5]} intensity={3} color="#fbbf24" castShadow />
        <pointLight position={[-3, 1.5, -2]} intensity={2} color="#38bdf8" />
        <directionalLight position={[3, 5, 2]} intensity={2} castShadow />

        <ArenaPlatform />

        {/* RENDER 3D PLAYER TOKENS & SPELL BEAMS IN WORLD SPACE */}
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
                const color = p.color || "#f59e0b";
                const enemyPositions = positions.filter((_, i) => i !== idx);

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
                    {/* ลำแสงเวทปรากฏเฉพาะตอนประลองเริ่มแล้วเท่านั้น */}
                    {clashResult && (
                      <SpellBeamAnimation
                        startPos={[x, 0.45, z]}
                        enemyPositions={enemyPositions}
                        color={color}
                        isClashing={true}
                      />
                    )}
                  </group>
                );
              })}
              {/* Center explosion — render ครั้งเดียว ไม่ stack per-participant */}
              {clashResult && <CenterExplosion />}
            </>
          );
        })()}
      </Canvas>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────
function ArenaPlatform() {
  const texture = useLoader(
    THREE.TextureLoader,
    "/images/textures/ancient-dark-stone-pedestal-slab.webp"
  );

  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  texture.offset.set(0, 0);

  return (
    <group position={[0, -0.12, 0]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[3.9, 0.16, 3.9]} />
        <meshStandardMaterial color="#090d18" roughness={0.48} metalness={0.6} />
      </mesh>

      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3.92, 3.92]} />
        <meshBasicMaterial color="#d99a32" transparent opacity={0.18} side={THREE.DoubleSide} />
      </mesh>

      <mesh position={[0, 0.085, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
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
        <ringGeometry args={[1.15, 1.18, 96]} />
        <meshBasicMaterial color="#fbbf24" transparent opacity={0.55} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

// ─────────────────────────────────────────────────────────────
function Fighter3dMesh({ player, position, targetAngle, clashResult, isCasting, skillId }) {
  const groupRef = useRef(null);
  const crystalRef = useRef(null);
  const auraRef = useRef(null);

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

    // Aura glow สีบ้านรอบหมากตอนกำลัง cast
    if (auraRef.current?.material) {
      const pulse = 1 + Math.sin(t * (isCasting ? 8 : 3)) * 0.25;
      auraRef.current.scale.setScalar(pulse);
      auraRef.current.material.opacity = isCasting ? 0.35 : 0.12;
    }
  });

  const color = player.color || "#f59e0b";

  return (
    <group ref={groupRef} position={position}>
      {/* Soft aura glow รอบหมาก */}
      <mesh ref={auraRef} position={[0, 0.5, 0]}>
        <sphereGeometry args={[0.45, 14, 14]} />
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
          <mesh ref={crystalRef} position={[0, 0.5, 0]}>
            <octahedronGeometry args={[0.48]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.5} />
          </mesh>
        }>
          <HouseModel modelPath={HOUSE_MODELS[player.houseId]} position={[0, 0.05, 0]} scale={[0.5, 0.5, 0.5]} />
        </Suspense>
      ) : (
        <mesh ref={crystalRef} position={[0, 0.5, 0]}>
          <octahedronGeometry args={[0.48]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={isCasting ? 2.5 : 1.2}
            roughness={0.2}
            metalness={0.3}
          />
        </mesh>
      )}

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

// ─── 3D ANIMATED SPELL BEAM (multi-layer + traveling rings + impact) ──────────
function SpellBeamAnimation({ startPos, enemyPositions, color, isClashing }) {
  // Beam layers
  const outerRef  = useRef(null);
  const midRef    = useRef(null);
  const coreRef   = useRef(null);
  // Traveling torus rings along beam
  const ring1Ref  = useRef(null);
  const ring2Ref  = useRef(null);
  // Caster aura + orb
  const auraRef   = useRef(null);
  const orbRef    = useRef(null);
  // Impact ring at target
  const impactRef = useRef(null);
  const orbStartRef = useRef(null);

  const start = useMemo(() => new THREE.Vector3(...startPos), [startPos]);

  const target = useMemo(() => {
    if (!enemyPositions?.length) return new THREE.Vector3(0, 0.45, 0);
    if (enemyPositions.length === 1) return new THREE.Vector3(...enemyPositions[0]);
    const avg = enemyPositions.reduce(
      (acc, p) => [acc[0] + p[0], acc[1] + p[1], acc[2] + p[2]],
      [0, 0, 0]
    ).map((v) => v / enemyPositions.length);
    return new THREE.Vector3(...avg);
  }, [enemyPositions]);

  const dir = useMemo(() => new THREE.Vector3().subVectors(target, start), [start, target]);
  const dist = dir.length();
  const mid  = useMemo(() => new THREE.Vector3().addVectors(start, target).multiplyScalar(0.5), [start, target]);

  // Quaternion เพื่อให้ cylinder ชี้ไปตาม dir
  const beamQuat = useMemo(
    () => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize()),
    [dir]
  );
  // Quaternion สำหรับ torus rings (หน้าตั้งฉากกับลำแสง)
  const ringQuat = useMemo(
    () => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir.clone().normalize()),
    [dir]
  );

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;

    // ── ชั้นนอก (outer glow) ──
    if (outerRef.current?.material) {
      outerRef.current.material.opacity = isClashing
        ? 0.14 + Math.sin(t * 10) * 0.06
        : 0.06 + Math.sin(t * 3) * 0.03;
    }
    // ── ชั้นกลาง ──
    if (midRef.current?.material) {
      midRef.current.material.opacity = isClashing
        ? 0.50 + Math.sin(t * 14) * 0.18
        : 0.22 + Math.sin(t * 4) * 0.08;
    }
    // ── แกนกลางสีขาว (core) ──
    if (coreRef.current?.material) {
      coreRef.current.material.opacity = isClashing
        ? 0.92 + Math.sin(t * 22) * 0.08
        : 0.48 + Math.sin(t * 6) * 0.14;
    }

    // ── Traveling torus rings ──
    const beamSpeed = isClashing ? 3.2 : 1.1;
    if (ring1Ref.current) {
      const p = (t * beamSpeed) % 1;
      ring1Ref.current.position.lerpVectors(start, target, p);
      ring1Ref.current.rotation.y = t * 4;
      if (ring1Ref.current.material)
        ring1Ref.current.material.opacity = isClashing ? 0.9 : 0.45;
      ring1Ref.current.scale.setScalar(isClashing ? 1.4 : 1.0);
    }
    if (ring2Ref.current) {
      const p = ((t * beamSpeed) + 0.5) % 1;
      ring2Ref.current.position.lerpVectors(start, target, p);
      ring2Ref.current.rotation.y = -t * 5;
      if (ring2Ref.current.material)
        ring2Ref.current.material.opacity = isClashing ? 0.75 : 0.35;
      ring2Ref.current.scale.setScalar(isClashing ? 1.1 : 0.8);
    }

    // ── Caster aura ──
    if (auraRef.current) {
      const pulse = 1 + Math.sin(t * (isClashing ? 9 : 4)) * 0.25;
      auraRef.current.scale.setScalar(pulse);
      if (auraRef.current.material)
        auraRef.current.material.opacity = isClashing ? 0.50 : 0.20;
    }

    // ── Traveling orb: ยิงครั้งเดียวตอน clash, loop ก่อน clash ──
    if (orbRef.current) {
      if (isClashing) {
        if (orbStartRef.current === null) orbStartRef.current = t;
        const elapsed = t - orbStartRef.current;
        const prog  = Math.min(1, elapsed / 0.50);
        const eased = 1 - Math.pow(1 - prog, 3);
        orbRef.current.position.lerpVectors(start, target, eased);
        if (orbRef.current.material)
          orbRef.current.material.opacity = prog < 0.96 ? 0.98 : 0;
        orbRef.current.scale.setScalar(1.5 + Math.sin(elapsed * 30) * 0.55);
      } else {
        orbStartRef.current = null;
        const prog = (t * 0.75) % 1;
        orbRef.current.position.lerpVectors(start, target, prog);
        if (orbRef.current.material)
          orbRef.current.material.opacity = 0.72 + Math.sin(t * 5) * 0.22;
        orbRef.current.scale.setScalar(1);
      }
    }

    // ── Impact ring ที่ปลายทาง ──
    if (impactRef.current) {
      const pulse = 0.8 + Math.sin(t * (isClashing ? 12 : 5)) * 0.22;
      impactRef.current.scale.setScalar(pulse + (isClashing ? 0.85 : 0));
      if (impactRef.current.material)
        impactRef.current.material.opacity = isClashing
          ? 0.72 + Math.sin(t * 10) * 0.25
          : 0.12;
    }
  });

  return (
    <group>
      {/* ── 3-layer beam ── */}
      <group position={mid.toArray()} quaternion={beamQuat}>
        {/* Outer soft glow */}
        <mesh ref={outerRef}>
          <cylinderGeometry args={[0.24, 0.24, dist, 8, 1, true]} />
          <meshBasicMaterial color={color} transparent opacity={0.08} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
        {/* Mid colored layer */}
        <mesh ref={midRef}>
          <cylinderGeometry args={[0.07, 0.07, dist, 8, 1, true]} />
          <meshBasicMaterial color={color} transparent opacity={0.35} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
        {/* Bright white core */}
        <mesh ref={coreRef}>
          <cylinderGeometry args={[0.018, 0.018, dist, 6, 1, true]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.75} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      </group>

      {/* ── Torus rings วิ่งตามลำแสง ── */}
      <mesh ref={ring1Ref} position={start.toArray()} quaternion={ringQuat}>
        <torusGeometry args={[0.13, 0.03, 6, 20]} />
        <meshBasicMaterial color={color} transparent opacity={0.7} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh ref={ring2Ref} position={start.toArray()} quaternion={ringQuat}>
        <torusGeometry args={[0.09, 0.02, 6, 16]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.55} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>

      {/* ── Caster aura sphere ── */}
      <mesh ref={auraRef} position={start.toArray()}>
        <sphereGeometry args={[0.32, 14, 14]} />
        <meshBasicMaterial color={color} transparent opacity={0.22} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>

      {/* ── Traveling orb ── */}
      <mesh ref={orbRef} position={start.toArray()}>
        <sphereGeometry args={[0.09, 12, 12]} />
        <meshBasicMaterial color={color} transparent opacity={0.95} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>

      {/* ── Impact ring ที่ปลายทาง ── */}
      <mesh ref={impactRef} position={target.toArray()} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.06, 0.24, 28]} />
        <meshBasicMaterial color={color} transparent opacity={0.15} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
    </group>
  );
}

// ─── Center Explosion: 5 rings + pillar + 8 burst particles + spinning torus ──
function CenterExplosion() {
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
    { r1: 0.03, r2: 1.72, color: "#a855f7", spd: 1.3, delay: 0.46 },
  ], []);

  const PART_ANGLES = useMemo(
    () => Array.from({ length: 8 }, (_, i) => (i / 8) * Math.PI * 2),
    []
  );
  const PART_COLORS = ["#fbbf24", "#ef4444", "#f97316", "#a855f7", "#fbbf24", "#38bdf8", "#f97316", "#ffffff"];

  useFrame(({ clock }) => {
    if (startRef.current === null) startRef.current = clock.elapsedTime;
    const el = clock.elapsedTime - startRef.current;

    // ── Rings ──
    ringsRef.current?.children.forEach((ring, i) => {
      const cfg = RINGS[i];
      const t = Math.max(0, el - cfg.delay);
      const k = Math.min(1, t * cfg.spd);
      const s = 0.15 + k * 3.0;
      ring.scale.set(s, s, 1);
      if (ring.material) ring.material.opacity = Math.pow(1 - k, 0.6) * 0.95;
    });

    // ── Light Pillar ──
    if (pillarRef.current) {
      const k = Math.min(1, el * 3.5);
      pillarRef.current.scale.y = 0.05 + k * 5.0;
      pillarRef.current.position.y = k * 0.65;
      if (pillarRef.current.material)
        pillarRef.current.material.opacity = Math.max(0, 1 - el * 1.6) * 0.92;
    }

    // ── Burst particles ──
    if (particlesRef.current) {
      const k = Math.min(1, el * 2.5);
      const eased = 1 - Math.pow(1 - k, 2.8);
      particlesRef.current.children.forEach((child, i) => {
        const angle = PART_ANGLES[i];
        const r = eased * 2.6;
        child.position.x = Math.cos(angle) * r;
        child.position.z = Math.sin(angle) * r;
        // arc ขึ้นแล้วลง
        child.position.y = eased * 1.1 - eased * eased * 0.7;
        if (child.material) child.material.opacity = Math.max(0, (1 - k) * 0.96);
      });
    }

    // ── Spinning torus ──
    if (spinnerRef.current) {
      spinnerRef.current.rotation.z = el * 6;
      spinnerRef.current.rotation.x = el * 2.5;
      if (spinnerRef.current.material)
        spinnerRef.current.material.opacity = Math.max(0, 1 - el * 2.0) * 0.88;
    }
  });

  return (
    <group>
      {/* Rings บนพื้นลาน */}
      <group ref={ringsRef} position={[0, 0.09, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        {RINGS.map((ring, i) => (
          <mesh key={i}>
            <ringGeometry args={[ring.r1, ring.r2, 56]} />
            <meshBasicMaterial
              color={ring.color}
              transparent opacity={0}
              blending={THREE.AdditiveBlending}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
        ))}
      </group>

      {/* Light pillar พุ่งขึ้น */}
      <mesh ref={pillarRef} position={[0, 0, 0]}>
        <cylinderGeometry args={[0.10, 0.03, 1, 10, 1, true]} />
        <meshBasicMaterial
          color="#fde68a"
          transparent opacity={0.88}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Burst particles 8 ทิศ */}
      <group ref={particlesRef}>
        {PART_ANGLES.map((_, i) => (
          <mesh key={i} position={[0, 0.2, 0]}>
            <sphereGeometry args={[0.055 + (i % 3) * 0.028, 8, 8]} />
            <meshBasicMaterial
              color={PART_COLORS[i]}
              transparent opacity={0.92}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        ))}
      </group>

      {/* Spinning inner torus */}
      <mesh ref={spinnerRef} position={[0, 0.14, 0]}>
        <torusGeometry args={[0.32, 0.032, 8, 28]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent opacity={0.78}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

// ─── Full CSS Clash Overlay: flash + rings + particles + CLASH text ──────────
function ClashFlashOverlay({ onDone }) {
  const particles = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => {
        const angle = (i / 14) * Math.PI * 2;
        const dist  = 55 + (i % 4) * 35;
        return {
          id:    i,
          dx:    Math.cos(angle) * dist,
          dy:    Math.sin(angle) * dist,
          size:  5 + (i % 4) * 3,
          color: ["#fbbf24","#ef4444","#f97316","#a855f7","#38bdf8","#ffffff","#fde68a"][i % 7],
          dur:   0.45 + (i % 3) * 0.14,
          delay: (i % 5) * 0.025,
        };
      }),
    []
  );

  const rings = useMemo(
    () => [
      { target: 3.5,  delay: 0.00, color: "rgba(255,255,255,0.95)", dur: 0.45 },
      { target: 6.0,  delay: 0.07, color: "rgba(251,191,36,0.75)",  dur: 0.60 },
      { target: 9.5,  delay: 0.16, color: "rgba(239,68,68,0.55)",   dur: 0.78 },
      { target: 14.0, delay: 0.28, color: "rgba(168,85,247,0.38)",  dur: 1.00 },
    ],
    []
  );

  return (
    <div className="absolute inset-0 pointer-events-none z-20 flex items-center justify-center overflow-hidden">

      {/* 1. Instant white flash */}
      <motion.div
        className="absolute inset-0 bg-white"
        initial={{ opacity: 0.88 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
      />

      {/* 2. Gold radial burst (lingers longer) */}
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0.82 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.75, ease: "easeOut", delay: 0.06 }}
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(251,191,36,0.92) 0%, rgba(239,68,68,0.65) 32%, rgba(168,85,247,0.35) 58%, transparent 78%)",
        }}
      />

      {/* 3. Expanding ring shockwaves */}
      {rings.map((ring, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border-2"
          style={{
            width: 64, height: 64,
            marginLeft: -32, marginTop: -32,
            borderColor: ring.color,
            boxShadow: `0 0 18px 4px ${ring.color}`,
          }}
          initial={{ scale: 0.05, opacity: 1 }}
          animate={{ scale: ring.target, opacity: 0 }}
          transition={{ duration: ring.dur, delay: ring.delay, ease: "easeOut" }}
        />
      ))}

      {/* 4. Burst particles */}
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            width: p.size, height: p.size,
            backgroundColor: p.color,
            boxShadow: `0 0 ${p.size * 2.5}px ${p.color}, 0 0 ${p.size * 5}px ${p.color}`,
          }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1.4 }}
          animate={{ x: p.dx, y: p.dy, opacity: 0, scale: 0.2 }}
          transition={{ duration: p.dur, delay: p.delay, ease: "easeOut" }}
        />
      ))}

      {/* 5. ⚔️ CLASH! impact text */}
      <motion.div
        className="absolute select-none font-black tracking-widest uppercase"
        style={{
          fontSize: "clamp(1.6rem, 5vw, 2.8rem)",
          color: "#fff",
          textShadow: "0 0 24px #fbbf24, 0 0 48px #ef4444, 0 0 80px #fbbf24",
          letterSpacing: "0.25em",
        }}
        initial={{ scale: 3.0, opacity: 0 }}
        animate={{ scale: [3.0, 0.92, 1.05, 1.0], opacity: [0, 1, 1, 0] }}
        transition={{ duration: 0.85, delay: 0.04, times: [0, 0.22, 0.65, 1], ease: "easeOut" }}
        onAnimationComplete={onDone}
      >
        ⚔️&nbsp;CLASH!
      </motion.div>
    </div>
  );
}

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
