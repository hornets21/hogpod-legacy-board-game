"use client";

// ============================================================
// Pvp3dBattleStage — Full Magic Arena Scene (docs/magic-arena-threejs.html)
// Locked Perspective Camera Angle, Zero Manual Rotation, Zero Emojis
// Features: Back Portal, 4 Corner Obelisks, Crystals, Arcane Rune Floor
// ============================================================

import { Suspense, useRef, useMemo, memo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

const HOUSE_MODELS = {
  watrat: "/models/wartaurus.glb",
  plodfindr: "/models/podfindor.glb",
  anal: "/models/analyze.glb",
  slarf: "/models/sraraff.glb",
};

const HOUSE_COLORS = {
  watrat: "#f59e0b",
  plodfindr: "#ef4444",
  anal: "#3b82f6",
  slarf: "#10b981",
};

// Module-level geometries (Zero Garbage Collection)
const CAST_RING_GEO = new THREE.RingGeometry(1.0, 1.35, 36);
const PROJECTILE_ORB_GEO = new THREE.IcosahedronGeometry(0.35, 1);
const PROJECTILE_TRAIL_GEO = new THREE.SphereGeometry(0.12, 6, 6);
const SPARK_GEO = new THREE.SphereGeometry(0.08, 6, 6);
const FIGHTER_BASE_RING_GEO = new THREE.RingGeometry(0.9, 1.15, 40);

const _V_START = new THREE.Vector3();
const _V_END = new THREE.Vector3();
const _V_MID = new THREE.Vector3();
const _V_CUR = new THREE.Vector3();

// Helper to create 3D Sprite text label without emojis
function createTextLabelSprite(text, colorHex) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");

  ctx.clearRect(0, 0, 256, 128);
  ctx.fillStyle = "rgba(10, 10, 24, 0.88)";
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(52, 20, 152, 78, 26);
  } else {
    ctx.rect(52, 20, 152, 78);
  }
  ctx.fill();

  ctx.strokeStyle = colorHex;
  ctx.lineWidth = 5;
  ctx.stroke();

  ctx.font = "bold 40px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(text, 128, 60);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  const mat = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
  });

  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(2.0, 1.0, 1);
  return sprite;
}

// ─── MAIN 3D BATTLE STAGE CANVAS (LOCKED CAMERA) ────────────
export default memo(function Pvp3dBattleStage({
  fighters = [],
  activeCast = null,
  activeProjectile = null,
  activeHit = null,
  currentTurn = 0,
  lockedTargetIndex = null,
}) {
  return (
    <div className="w-full h-full relative flex items-center justify-center select-none pointer-events-none">
      <Canvas
        frameloop="always"
        dpr={1}
        camera={{
          position: [0, 13.5, 17.5], // Tilted locked perspective framing entire magic arena
          fov: 46,
          near: 0.1,
          far: 300,
        }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
          stencil: false,
          depth: true,
        }}
      >
        <SceneController
          fighters={fighters}
          activeCast={activeCast}
          activeProjectile={activeProjectile}
          activeHit={activeHit}
          currentTurn={currentTurn}
          lockedTargetIndex={lockedTargetIndex}
        />
      </Canvas>
    </div>
  );
});

// ─── SCENE CONTROLLER (LOCKED CAMERA WITH IMPACT SHAKE) ───────
function SceneController({
  fighters,
  activeCast,
  activeProjectile,
  activeHit,
  currentTurn,
  lockedTargetIndex,
}) {
  const { camera } = useThree();
  const shakeTimeRef = useRef(0);

  // Radial positions from docs/magic-arena-threejs.html (P1: South, P2: West, P3: East, P4: North)
  const fighterPositions = useMemo(() => {
    const total = fighters.length || 2;
    if (total === 2) {
      return [
        new THREE.Vector3(0, 0, 6.8),   // P1 (South)
        new THREE.Vector3(0, 0, -6.8),  // P2 (North)
      ];
    }
    if (total === 3) {
      return [
        new THREE.Vector3(0, 0, 7.0),
        new THREE.Vector3(-6.2, 0, -3.5),
        new THREE.Vector3(6.2, 0, -3.5),
      ];
    }
    // 4 Players
    return [
      new THREE.Vector3(0, 0, 7.0),   // P1: South
      new THREE.Vector3(-7.0, 0, 0),  // P2: West
      new THREE.Vector3(7.0, 0, 0),   // P3: East
      new THREE.Vector3(0, 0, -7.0),  // P4: North
    ];
  }, [fighters.length]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;

    // Locked camera with impact shake
    if (activeHit) {
      shakeTimeRef.current = t;
    }
    const shakeElapsed = t - shakeTimeRef.current;
    if (shakeElapsed < 0.25) {
      const amt = (1 - shakeElapsed / 0.25) * 0.28;
      camera.position.x = THREE.MathUtils.randFloatSpread(amt);
      camera.position.y = 13.5 + THREE.MathUtils.randFloatSpread(amt * 0.6);
    } else {
      camera.position.x = 0;
      camera.position.y = 13.5;
    }
    camera.position.z = 17.5;
    camera.lookAt(0, 1.2, -1.0);
  });

  return (
    <group>
      {/* Lighting from docs/magic-arena-threejs.html */}
      <hemisphereLight args={[0x9db8ff, 0x24142f, 2.4]} />
      <directionalLight
        position={[-8, 18, 8]}
        intensity={2.6}
        color="#dcc7ff"
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <pointLight position={[0, 6, -8]} intensity={25} distance={30} decay={2} color="#8a4dff" />

      {/* 1. Floating Island Base */}
      <FloatingIsland />

      {/* 2. Arena Stone Floor & Rings */}
      <ArenaFloorAndRings />

      {/* 3. Arcane Magic Circle */}
      <ArcaneMagicCircle />

      {/* 4. Back Portal */}
      <BackPortal />

      {/* 5. Crystals, Trees, Rocks, Obelisks, Background Floating chunks */}
      <ArenaEnvironment />

      {/* 6. Cosmos Stars & Magical Particles */}
      <CosmosAndParticles />

      {/* 7. 3D Fighters */}
      {fighters.map((fighter, idx) => {
        const pos = fighterPositions[idx] || new THREE.Vector3(0, 0, 0);
        const isCurrentTurn = idx === currentTurn && fighter.hp > 0;
        const isLockedTarget = idx === lockedTargetIndex && fighter.hp > 0;
        const isHit = activeHit?.targetIndex === idx;

        // Facing direction: if attacking, look at target; in 2p, face opponent; in 3p+, face center
        let lookTarget = new THREE.Vector3(0, 0, 0);
        if (activeCast && activeCast.attackerIndex === idx && fighterPositions[activeCast.targetIndex]) {
          lookTarget = fighterPositions[activeCast.targetIndex];
        } else if (activeProjectile && activeProjectile.attackerIndex === idx && fighterPositions[activeProjectile.targetIndex]) {
          lookTarget = fighterPositions[activeProjectile.targetIndex];
        } else if (fighters.length === 2) {
          const otherIdx = idx === 0 ? 1 : 0;
          if (fighterPositions[otherIdx]) {
            lookTarget = fighterPositions[otherIdx];
          }
        }

        return (
          <FighterToken
            key={fighter.houseId || idx}
            fighter={fighter}
            position={pos}
            lookTarget={lookTarget}
            isCurrentTurn={isCurrentTurn}
            isLockedTarget={isLockedTarget}
            isHit={isHit}
            color={fighter.color || HOUSE_COLORS[fighter.houseId] || "#f59e0b"}
          />
        );
      })}

      {/* Active Casting Ring */}
      {activeCast && fighterPositions[activeCast.attackerIndex] && (
        <CastRingVfx
          position={fighterPositions[activeCast.attackerIndex]}
          color={activeCast.color || "#f59e0b"}
        />
      )}

      {/* Active Flying Projectile */}
      {activeProjectile &&
        fighterPositions[activeProjectile.attackerIndex] &&
        fighterPositions[activeProjectile.targetIndex] && (
          <FlyingProjectileVfx
            startPos={fighterPositions[activeProjectile.attackerIndex]}
            endPos={fighterPositions[activeProjectile.targetIndex]}
            color={activeProjectile.color || "#f59e0b"}
            progress={activeProjectile.progress || 0}
          />
        )}

      {/* Active Hit Burst */}
      {activeHit && fighterPositions[activeHit.targetIndex] && (
        <HitBurstVfx
          position={fighterPositions[activeHit.targetIndex]}
          color={activeHit.color || "#f59e0b"}
        />
      )}
    </group>
  );
}

// ─── 1. FLOATING ISLAND BASE (docs/magic-arena-threejs.html) ───
const FloatingIsland = memo(function FloatingIsland() {
  const rockOffsets = useMemo(() => {
    const rocks = [];
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2;
      const r = THREE.MathUtils.randFloat(7.5, 12);
      rocks.push({
        x: Math.cos(a) * r,
        y: THREE.MathUtils.randFloat(-2.6, -1.2),
        z: Math.sin(a) * r,
        radius: THREE.MathUtils.randFloat(0.7, 1.5),
        height: THREE.MathUtils.randFloat(2.5, 5.5),
        segments: THREE.MathUtils.randInt(5, 7),
        rotX: THREE.MathUtils.randFloat(-0.25, 0.25),
        rotZ: THREE.MathUtils.randFloat(-0.25, 0.25),
        color: [0x272333, 0x312b3b, 0x3a3146][Math.floor(Math.random() * 3)],
      });
    }
    return rocks;
  }, []);

  return (
    <group>
      {/* Island Top Solid Cylinder */}
      <mesh position={[0, -0.55, 0]}>
        <cylinderGeometry args={[12.8, 13.4, 1.4, 32]} />
        <meshStandardMaterial color="#3d3547" roughness={0.82} metalness={0.05} flatShading />
      </mesh>

      {/* Angular Rock Underside */}
      {rockOffsets.map((r, i) => (
        <mesh
          key={`rock_${i}`}
          position={[r.x, r.y, r.z]}
          rotation={[r.rotX, 0, r.rotZ]}
        >
          <coneGeometry args={[r.radius, r.height, r.segments]} />
          <meshStandardMaterial color={r.color} roughness={0.85} metalness={0.05} flatShading />
        </mesh>
      ))}
    </group>
  );
});

// ─── 2. ARENA FLOOR & STONE RINGS (docs/magic-arena-threejs.html) ──
const ArenaFloorAndRings = memo(function ArenaFloorAndRings() {
  const radialStrips = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const a = (i / 12) * Math.PI * 2;
      return {
        x: Math.sin(a) * 4.25,
        z: Math.cos(a) * 4.25,
        rotY: a,
      };
    });
  }, []);

  return (
    <group>
      {/* Ground Circle */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <circleGeometry args={[10.3, 48]} />
        <meshStandardMaterial color="#4a4452" roughness={0.82} metalness={0.05} flatShading />
      </mesh>

      {/* 3 Stone Rings */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, 0]}>
        <ringGeometry args={[8.3, 8.8, 48]} />
        <meshStandardMaterial color="#75637f" roughness={0.82} flatShading />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, 0]}>
        <ringGeometry args={[5.8, 6.05, 48]} />
        <meshStandardMaterial color="#75637f" roughness={0.82} flatShading />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, 0]}>
        <ringGeometry args={[3.6, 3.78, 48]} />
        <meshStandardMaterial color="#75637f" roughness={0.82} flatShading />
      </mesh>

      {/* 12 Radial Stone Lines */}
      {radialStrips.map((s, idx) => (
        <mesh key={`strip_${idx}`} position={[s.x, 0.035, s.z]} rotation={[0, s.rotY, 0]}>
          <boxGeometry args={[0.07, 0.025, 8.5]} />
          <meshBasicMaterial color="#6b5a72" transparent opacity={0.72} />
        </mesh>
      ))}
    </group>
  );
});

// ─── 3. ARCANE MAGIC CIRCLE (docs/magic-arena-threejs.html) ────
const ArcaneMagicCircle = memo(function ArcaneMagicCircle() {
  const centerRingRef = useRef(null);

  const starLines = useMemo(() => {
    const starR = 1.65;
    const pts = [];
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI / 2 + (i / 6) * Math.PI * 2;
      pts.push({ x: Math.cos(a) * starR, z: Math.sin(a) * starR });
    }
    const pairs = [
      [0, 2], [2, 4], [4, 0], [1, 3], [3, 5], [5, 1],
    ];
    return pairs.map(([a, b]) => {
      const p1 = pts[a];
      const p2 = pts[b];
      const dx = p2.x - p1.x;
      const dz = p2.z - p1.z;
      const len = Math.hypot(dx, dz);
      return {
        posX: (p1.x + p2.x) / 2,
        posZ: (p1.z + p2.z) / 2,
        rotY: Math.atan2(dx, dz),
        len,
      };
    });
  }, []);

  const runePoints = useMemo(() => {
    return Array.from({ length: 18 }, (_, i) => {
      const a = (i / 18) * Math.PI * 2;
      return {
        x: Math.cos(a) * 2.75,
        z: Math.sin(a) * 2.75,
        rotY: -a,
      };
    });
  }, []);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (centerRingRef.current?.material) {
      centerRingRef.current.material.opacity = 0.55 + Math.sin(t * 2.4) * 0.18;
    }
  });

  return (
    <group>
      {/* Center Ring */}
      <mesh
        ref={centerRingRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.08, 0]}
      >
        <ringGeometry args={[2.2, 2.28, 64]} />
        <meshBasicMaterial color="#b875ff" transparent opacity={0.75} side={THREE.DoubleSide} />
      </mesh>

      {/* Hexagram Star Lines */}
      {starLines.map((line, idx) => (
        <mesh
          key={`star_${idx}`}
          position={[line.posX, 0.085, line.posZ]}
          rotation={[0, line.rotY, 0]}
        >
          <boxGeometry args={[0.045, 0.025, line.len]} />
          <meshBasicMaterial color="#b875ff" transparent opacity={0.75} />
        </mesh>
      ))}

      {/* 18 Glowing Runes */}
      {runePoints.map((pt, i) => (
        <mesh key={`rune_${i}`} position={[pt.x, 0.09, pt.z]} rotation={[0, pt.rotY, 0]}>
          <boxGeometry args={[0.18, 0.02, 0.04]} />
          <meshBasicMaterial color="#b875ff" transparent opacity={0.75} />
        </mesh>
      ))}
    </group>
  );
});

// ─── 4. BACK PORTAL (docs/magic-arena-threejs.html) ────────────
const BackPortal = memo(function BackPortal() {
  const ring1Ref = useRef(null);
  const ring2Ref = useRef(null);
  const discRef = useRef(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (ring1Ref.current) ring1Ref.current.rotation.z = t * 0.55;
    if (ring2Ref.current) ring2Ref.current.rotation.z = -t * 0.75;
    if (discRef.current?.material) {
      discRef.current.material.opacity = 0.63 + Math.sin(t * 2.0) * 0.1;
    }
  });

  return (
    <group position={[0, 0, -10]}>
      {/* Pillars */}
      <mesh position={[-2.25, 2.3, 0]}>
        <boxGeometry args={[1, 4.6, 1.3]} />
        <meshStandardMaterial color="#4c4057" roughness={0.82} flatShading />
      </mesh>
      <mesh position={[2.25, 2.3, 0]}>
        <boxGeometry args={[1, 4.6, 1.3]} />
        <meshStandardMaterial color="#4c4057" roughness={0.82} flatShading />
      </mesh>

      {/* Top Arch */}
      <mesh position={[0, 4.45, 0]} rotation={[0, 0, Math.PI]}>
        <torusGeometry args={[2.25, 0.52, 8, 24, Math.PI]} />
        <meshStandardMaterial color="#4c4057" roughness={0.82} flatShading />
      </mesh>

      {/* Portal Disc */}
      <mesh ref={discRef} position={[0, 2.75, 0]}>
        <circleGeometry args={[1.75, 48]} />
        <meshBasicMaterial color="#8d47ff" transparent opacity={0.74} side={THREE.DoubleSide} />
      </mesh>

      {/* Rotating Portal Rings */}
      <mesh ref={ring1Ref} position={[0, 2.75, 0]}>
        <torusGeometry args={[1.82, 0.09, 8, 48]} />
        <meshBasicMaterial color="#d2adff" />
      </mesh>
      <mesh ref={ring2Ref} position={[0, 2.75, 0]}>
        <torusGeometry args={[1.42, 0.05, 8, 48]} />
        <meshBasicMaterial color="#6ee7ff" />
      </mesh>

      <pointLight position={[0, 3, 0]} color="#9a55ff" intensity={35} distance={18} decay={2} />
    </group>
  );
});

// ─── 5. ARENA ENVIRONMENT (CRYSTALS, TREES, OBELISKS, ROCKS) ──
const ArenaEnvironment = memo(function ArenaEnvironment() {
  const crystalPositions = useMemo(
    () => [
      { pos: [-9, -3], color: 0x59a8ff, scale: 0.9 },
      { pos: [-8, 5], color: 0xa15cff, scale: 1.1 },
      { pos: [8, -5], color: 0x59a8ff, scale: 0.95 },
      { pos: [9, 3], color: 0xa15cff, scale: 1.0 },
      { pos: [-4, -9], color: 0x59a8ff, scale: 0.85 },
      { pos: [5, 9], color: 0xa15cff, scale: 1.15 },
    ],
    []
  );

  const obelisks = useMemo(
    () => [
      { x: -8, z: 7, rot: 0 },
      { x: 8, z: 7, rot: Math.PI / 2 },
      { x: -8, z: -7, rot: Math.PI },
      { x: 8, z: -7, rot: (3 * Math.PI) / 2 },
    ],
    []
  );

  const treesAndRocks = useMemo(() => {
    const list = [];
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * Math.PI * 2 + THREE.MathUtils.randFloat(-0.14, 0.14);
      const r = THREE.MathUtils.randFloat(10.6, 12.2);
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      const isTree = i % 4 === 0;
      list.push({
        x,
        z,
        isTree,
        scale: isTree ? THREE.MathUtils.randFloat(0.7, 1.2) : THREE.MathUtils.randFloat(0.5, 1.25),
        rockColor: [0x3d3544, 0x4b4251, 0x574b5c][Math.floor(Math.random() * 3)],
      });
    }
    return list;
  }, []);

  const bgChunks = useMemo(() => {
    const chunks = [];
    for (let i = 0; i < 12; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = THREE.MathUtils.randFloat(16, 27);
      chunks.push({
        x: Math.cos(a) * r,
        y: THREE.MathUtils.randFloat(3, 10),
        z: Math.sin(a) * r,
        rad: THREE.MathUtils.randFloat(0.8, 2),
        height: THREE.MathUtils.randFloat(2, 5),
        seg: THREE.MathUtils.randInt(5, 7),
      });
    }
    return chunks;
  }, []);

  return (
    <group>
      {/* Crystal Clusters */}
      {crystalPositions.map((c, idx) => (
        <group key={`crys_${idx}`} position={[c.pos[0], 0, c.pos[1]]}>
          {[0, 1, 2].map((ci) => (
            <mesh
              key={ci}
              position={[(ci - 1) * 0.32 * c.scale, (0.6 + ci * 0.15) * c.scale, (ci % 2) * 0.12]}
              rotation={[0, 0, THREE.MathUtils.randFloat(-0.18, 0.18)]}
            >
              <coneGeometry args={[0.25 * c.scale, (1.2 + ci * 0.3) * c.scale, 5]} />
              <meshStandardMaterial
                color={c.color}
                emissive={c.color}
                emissiveIntensity={1.1}
                roughness={0.35}
                metalness={0.05}
                flatShading
              />
            </mesh>
          ))}
          <pointLight position={[0, 1.2 * c.scale, 0]} color={c.color} intensity={6 * c.scale} distance={4 * c.scale} decay={2} />
        </group>
      ))}

      {/* 4 Corner Obelisks with glowing gems */}
      {obelisks.map((ob, idx) => (
        <group key={`ob_${idx}`} position={[ob.x, 0, ob.z]} rotation={[0, ob.rot, 0]}>
          <mesh position={[0, 1.25, 0]}>
            <cylinderGeometry args={[0.38, 0.52, 2.5, 4]} />
            <meshStandardMaterial color="#4d4357" roughness={0.82} flatShading />
          </mesh>
          <mesh position={[0, 2.55, 0]}>
            <octahedronGeometry args={[0.26, 0]} />
            <meshStandardMaterial color="#a460ff" emissive="#7c28ff" emissiveIntensity={2.4} flatShading />
          </mesh>
          <pointLight position={[0, 2.6, 0]} color="#9b4dff" intensity={5} distance={4} decay={2} />
        </group>
      ))}

      {/* Perimeter Magic Trees & Rocks */}
      {treesAndRocks.map((item, idx) =>
        item.isTree ? (
          <group key={`tree_${idx}`} position={[item.x, 0, item.z]} scale={item.scale}>
            <mesh position={[0, 0.75, 0]}>
              <cylinderGeometry args={[0.18, 0.28, 1.5, 6]} />
              <meshStandardMaterial color="#4b314a" roughness={0.82} flatShading />
            </mesh>
            <mesh position={[0, 2.05, 0]} scale={[1.15, 0.8, 1.0]}>
              <icosahedronGeometry args={[1.0, 0]} />
              <meshStandardMaterial color="#57306f" emissive="#34124f" emissiveIntensity={0.15} roughness={0.82} flatShading />
            </mesh>
          </group>
        ) : (
          <mesh
            key={`rock_${idx}`}
            position={[item.x, 0.45 * item.scale, item.z]}
            scale={[1.2 * item.scale, 0.75 * item.scale, 1.0 * item.scale]}
          >
            <dodecahedronGeometry args={[0.85, 0]} />
            <meshStandardMaterial color={item.rockColor} roughness={0.82} flatShading />
          </mesh>
        )
      )}

      {/* Background Floating Island Chunks */}
      {bgChunks.map((bg, idx) => (
        <mesh key={`bgchunk_${idx}`} position={[bg.x, bg.y, bg.z]} rotation={[0, 0, Math.PI]}>
          <coneGeometry args={[bg.rad, bg.height, bg.seg]} />
          <meshStandardMaterial color="#302a3c" roughness={0.82} flatShading />
        </mesh>
      ))}
    </group>
  );
});

// ─── 6. COSMOS & PARTICLES ────────────────────────────────────
const CosmosAndParticles = memo(function CosmosAndParticles() {
  const particlesRef = useRef(null);

  const particlesGeo = useMemo(() => {
    const particleCount = 180;
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const r = THREE.MathUtils.randFloat(2, 16);
      const a = Math.random() * Math.PI * 2;
      positions[i * 3] = Math.cos(a) * r;
      positions[i * 3 + 1] = THREE.MathUtils.randFloat(0.4, 8);
      positions[i * 3 + 2] = Math.sin(a) * r;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return geo;
  }, []);

  const starsGeo = useMemo(() => {
    const starCount = 500;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      starPos[i * 3] = THREE.MathUtils.randFloatSpread(120);
      starPos[i * 3 + 1] = THREE.MathUtils.randFloat(8, 65);
      starPos[i * 3 + 2] = THREE.MathUtils.randFloatSpread(120);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    return geo;
  }, []);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (particlesRef.current) {
      particlesRef.current.rotation.y = t * 0.035;
      particlesRef.current.position.y = Math.sin(t * 0.7) * 0.12;
    }
  });

  return (
    <group>
      <points ref={particlesRef} geometry={particlesGeo}>
        <pointsMaterial color="#c590ff" size={0.07} transparent opacity={0.9} depthWrite={false} />
      </points>
      <points geometry={starsGeo}>
        <pointsMaterial color="#b8ccff" size={0.12} transparent opacity={0.75} depthWrite={false} />
      </points>
    </group>
  );
});

// ─── 7. FIGHTER TOKEN (LOW-POLY WIZARD / GLTF MODEL) ──────────
const FighterToken = memo(function FighterToken({
  fighter,
  position,
  lookTarget,
  isCurrentTurn,
  isLockedTarget,
  isHit,
  color,
}) {
  const groupRef = useRef(null);
  const ringRef = useRef(null);
  const isDefeated = fighter.hp <= 0;

  const labelSprite = useMemo(() => {
    return createTextLabelSprite(fighter.id || "P1", isLockedTarget ? "#f43f5e" : color);
  }, [fighter.id, isLockedTarget, color]);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.elapsedTime;

    if (isDefeated) {
      groupRef.current.scale.set(1, 0.25, 1);
      groupRef.current.position.y = -0.15;
      return;
    }

    // Orient smoothly on XZ plane only (100% upright, ZERO tilt!)
    const dx = lookTarget.x - position.x;
    const dz = lookTarget.z - position.z;
    if (Math.abs(dx) > 0.001 || Math.abs(dz) > 0.001) {
      const targetYaw = Math.atan2(dx, dz);
      groupRef.current.rotation.set(0, targetYaw, 0);
    }

    // Hit shake animation
    if (isHit) {
      groupRef.current.position.x = position.x + Math.sin(t * 50) * 0.15;
      groupRef.current.position.z = position.z + Math.cos(t * 50) * 0.15;
    } else {
      groupRef.current.position.x = position.x;
      groupRef.current.position.z = position.z;
    }

    // Breathing float
    groupRef.current.position.y = isCurrentTurn
      ? 0.15 + Math.sin(t * 4) * 0.06
      : Math.sin(t * 2 + (fighter.playerIndex || 0)) * 0.03;

    // Ground Ring pulse
    if (ringRef.current) {
      const pulse = 1 + Math.sin(t * 2.2 + (fighter.playerIndex || 0)) * 0.05;
      ringRef.current.scale.setScalar(pulse);
      if (ringRef.current.material) {
        ringRef.current.material.opacity = isCurrentTurn ? 0.95 : isLockedTarget ? 0.85 : 0.65;
      }
    }
  });

  const modelPath = HOUSE_MODELS[fighter.houseId];

  return (
    <group ref={groupRef} position={position.toArray()}>
      {/* Player Ground Ring */}
      <mesh
        ref={ringRef}
        position={[0, 0.07, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        geometry={FIGHTER_BASE_RING_GEO}
      >
        <meshBasicMaterial
          color={isLockedTarget ? "#f43f5e" : color}
          transparent
          opacity={0.95}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Player Floor Light */}
      <pointLight position={[0, 0.7, 0]} color={color} intensity={8} distance={4.5} decay={2} />

      {/* 3D Character Model or Showcase Low-Poly Wizard */}
      {modelPath ? (
        <Suspense fallback={<LowPolyWizardMesh color={color} isDefeated={isDefeated} />}>
          <HouseModelObject modelPath={modelPath} targetHeight={1.9} />
        </Suspense>
      ) : (
        <LowPolyWizardMesh color={color} isDefeated={isDefeated} />
      )}

      {/* Floating 3D Label Sprite above head */}
      <primitive object={labelSprite} position={[0, 3.0, 0]} />
    </group>
  );
});

function LowPolyWizardMesh({ color, isDefeated }) {
  return (
    <group position={[0, 0, 0]}>
      <mesh position={[0, 0.65, 0]} castShadow>
        <coneGeometry args={[0.45, 1.2, 6]} />
        <meshStandardMaterial color={isDefeated ? "#64748b" : color} roughness={0.82} flatShading />
      </mesh>
      <mesh position={[0, 1.45, 0]} castShadow>
        <icosahedronGeometry args={[0.33, 0]} />
        <meshStandardMaterial color={isDefeated ? "#94a3b8" : "#e6d5c8"} roughness={0.82} flatShading />
      </mesh>
      <mesh position={[0, 2.05, 0]} castShadow>
        <coneGeometry args={[0.38, 0.9, 6]} />
        <meshStandardMaterial color="#211c38" roughness={0.82} flatShading />
      </mesh>
    </group>
  );
}

// ─── 8. 3D CAST RING VFX ─────────────────────────────────────
const CastRingVfx = memo(function CastRingVfx({ position, color }) {
  const ringRef = useRef(null);

  useFrame(({ clock }) => {
    if (ringRef.current) {
      const t = clock.elapsedTime;
      ringRef.current.rotation.z += 0.14;
      const s = 1.0 + Math.sin(t * 8) * 0.3;
      ringRef.current.scale.set(s, s, 1);
    }
  });

  return (
    <mesh
      ref={ringRef}
      position={[position.x, 0.09, position.z]}
      rotation={[-Math.PI / 2, 0, 0]}
      geometry={CAST_RING_GEO}
    >
      <meshBasicMaterial color={color} transparent opacity={0.95} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  );
});

// ─── 9. 3D FLYING PROJECTILE VFX ─────────────────────────────
const FlyingProjectileVfx = memo(function FlyingProjectileVfx({
  startPos,
  endPos,
  color,
  progress = 0,
}) {
  const orbRef = useRef(null);
  const lightRef = useRef(null);
  const trailRefs = useRef([]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const p = Math.min(Math.max(progress, 0), 1);
    const eased = p * p * (3 - 2 * p);

    _V_START.copy(startPos).setY(1.4);
    _V_END.copy(endPos).setY(1.2);

    _V_CUR.lerpVectors(_V_START, _V_END, eased);
    _V_CUR.y += Math.sin(p * Math.PI) * 2.2; // High jump arc

    if (orbRef.current) {
      orbRef.current.position.copy(_V_CUR);
      orbRef.current.rotation.x += 0.3;
      orbRef.current.rotation.y += 0.35;
      orbRef.current.scale.setScalar(1 + Math.sin(t * 20) * 0.18);
    }

    if (lightRef.current) {
      lightRef.current.position.copy(_V_CUR);
    }

    trailRefs.current.forEach((mesh, idx) => {
      if (mesh) {
        const trailP = Math.max(0, eased - (idx + 1) * 0.05);
        _V_MID.lerpVectors(_V_START, _V_END, trailP);
        _V_MID.y += Math.sin(Math.max(0, p - (idx + 1) * 0.05) * Math.PI) * 2.2;
        mesh.position.copy(_V_MID);
        const life = Math.max(0, 1 - (idx + 1) * 0.22);
        mesh.scale.setScalar(life);
        if (mesh.material) mesh.material.opacity = life * 0.85;
      }
    });
  });

  return (
    <group>
      <pointLight ref={lightRef} color={color} intensity={16} distance={9} decay={2} />
      <mesh ref={orbRef} geometry={PROJECTILE_ORB_GEO}>
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={3.5} flatShading />
      </mesh>
      {[0, 1, 2, 3].map((idx) => (
        <mesh key={`ptrail_${idx}`} ref={(el) => (trailRefs.current[idx] = el)} geometry={PROJECTILE_TRAIL_GEO}>
          <meshBasicMaterial color={color} transparent opacity={0.75} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
});

// ─── 10. 3D HIT BURST VFX ────────────────────────────────────
const HitBurstVfx = memo(function HitBurstVfx({ position, color }) {
  const sparksRef = useRef([]);

  const sparkOffsets = useMemo(() => {
    return Array.from({ length: 16 }, () => ({
      dir: new THREE.Vector3(
        THREE.MathUtils.randFloatSpread(1.2),
        THREE.MathUtils.randFloat(0.2, 1.2),
        THREE.MathUtils.randFloatSpread(1.2)
      ),
      speed: THREE.MathUtils.randFloat(1.8, 3.5),
    }));
  }, []);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    sparksRef.current.forEach((mesh, idx) => {
      if (mesh) {
        const cfg = sparkOffsets[idx];
        const prog = (t * cfg.speed) % 1;
        mesh.position.set(
          position.x + cfg.dir.x * prog,
          position.y + 1.2 + cfg.dir.y * prog - prog * prog * 0.6,
          position.z + cfg.dir.z * prog
        );
        mesh.scale.setScalar(Math.max(0, 1 - prog));
        if (mesh.material) mesh.material.opacity = Math.max(0, 1 - prog);
      }
    });
  });

  return (
    <group>
      {sparkOffsets.map((_, idx) => (
        <mesh key={`spark_${idx}`} ref={(el) => (sparksRef.current[idx] = el)} geometry={SPARK_GEO}>
          <meshBasicMaterial color={color} transparent opacity={0.9} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
});

// ─── GLTF MODEL OBJECT WRAPPER ────────────────────────────────
function HouseModelObject({ modelPath, targetHeight = 1.9 }) {
  const { scene } = useGLTF(modelPath);

  const normalizedScene = useMemo(() => {
    const clone = scene.clone();
    const box = new THREE.Box3().setFromObject(clone);
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);

    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const scale = targetHeight / maxDim;

    clone.scale.setScalar(scale);
    clone.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);
    return clone;
  }, [scene, targetHeight]);

  return <primitive object={normalizedScene} />;
}
