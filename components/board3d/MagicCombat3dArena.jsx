"use client";

import React, { Suspense, useMemo, useRef, useEffect, useState, memo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, useAnimations, OrbitControls } from "@react-three/drei";
import * as THREE from "three";

// ─── MODULE-LEVEL SHARED GEOMETRIES & VECTORS (Zero Garbage Collection) ───
const SPHERE_GEO = new THREE.SphereGeometry(1, 10, 10);
const DODECA_GEO = new THREE.DodecahedronGeometry(0.32, 0);
const OCTA_GEO = new THREE.OctahedronGeometry(0.42, 1);
const ICOSA_GEO = new THREE.IcosahedronGeometry(0.28, 1);
const MONSTER_ORB_GEO = new THREE.DodecahedronGeometry(0.35, 1);
const TORUS_ORB_GEO = new THREE.TorusGeometry(0.62, 0.035, 6, 24);
const TRAIL_GEO = new THREE.OctahedronGeometry(0.08, 0);
const FIGHTER_BASE_RING_GEO = new THREE.RingGeometry(0.85, 1.1, 36);

// ─── BUFF VFX SHARED GEOMETRIES (Inspired by Three.js Showcase) ───
const BUFF_RING_GEO = new THREE.RingGeometry(0.65, 1.05, 32);
const BUFF_SPARK_GEO = new THREE.OctahedronGeometry(0.06, 0);
const BUFF_SPHERE_GEO = new THREE.SphereGeometry(1.25, 14, 10);
const BUFF_HALO_GEO = new THREE.TorusGeometry(0.52, 0.05, 8, 24);
const BUFF_TORUS_GEO = new THREE.TorusGeometry(0.75, 0.035, 6, 20);
const BUFF_CONE_GEO = new THREE.ConeGeometry(0.09, 0.32, 5);
const BUFF_OCTA_GEO = new THREE.OctahedronGeometry(0.16, 0);
const BUFF_AURA_CONE_GEO = new THREE.ConeGeometry(1.1, 2.2, 8, 1, true);

// ─── MONSTER ATTACK SHARED GEOMETRIES (Inspired by Monster Showcase) ───
const MONSTER_SLASH_GEO = new THREE.TorusGeometry(0.85, 0.065, 6, 24, Math.PI * 1.3);
const MONSTER_BEAM_GEO = new THREE.CylinderGeometry(0.65, 0.28, 1, 16);
const MONSTER_SHOCKWAVE_GEO = new THREE.RingGeometry(0.3, 2.2, 32);
const MONSTER_TETRA_GEO = new THREE.TetrahedronGeometry(0.24, 0);
const MONSTER_BITE_GEO = new THREE.TorusGeometry(0.65, 0.07, 6, 20, Math.PI * 0.9);
const SONIC_RING_GEO = new THREE.TorusGeometry(0.55, 0.045, 6, 24);
const SPIKE_CONE_GEO = new THREE.ConeGeometry(0.08, 0.6, 5);

// Pre-allocated static vectors (zero allocations in useFrame)
const _P_POS = new THREE.Vector3(-2.4, 1.2, 1.3);
const _M_POS = new THREE.Vector3(2.4, 1.2, -1.3);
const _M_HOME_POS = new THREE.Vector3(2.4, 0.05, -1.3);
const _M_MELEE_POS = new THREE.Vector3(-1.0, 0.05, 0.5); // Close melee position in front of player
const _M_MOUTH_POS = new THREE.Vector3(1.7, 0.85, -0.9); // Monster mouth position (forward & lower)
const _P_CHEST_POS = new THREE.Vector3(-1.7, 0.85, 0.9); // Player target chest position
const _V_TEMP = new THREE.Vector3();
const _BEAM_DIR = new THREE.Vector3();
const _UP_VEC = new THREE.Vector3(0, 1, 0);
const _LIGHTNING_PTS = Array.from({ length: 19 }, () => new THREE.Vector3());

// Helper for monster attack archetype lookup
export function getMonsterAttackType(monster) {
  if (!monster) return "dark_magic";
  
  // 0. หากในมอนสเตอร์มีการระบุ attackType ไว้โดยตรง ให้ใช้ค่านั้นทันที
  if (typeof monster === "object" && monster.attackType) {
    return monster.attackType;
  }

  const id = typeof monster === "string" ? monster : monster.id;

  if (id === "grand_boss" || id === "unbeatable" || id === "iron_tao" || id === "yam") return "mega_beam";
  if (id === "dragon_fap" || id === "som_devil" || id === "pi_muet" || id === "p_a_akatsuki") return "fire_breath";
  if (id === "suu_suu" || id === "pla_thong_rong_phong" || id === "pi_rin" || id === "webtood") return "ice_frost";
  if (id === "centipede_ev_shop" || id === "yaga" || id === "mungty" || id === "nong_hamas") return "poison_acid";
  if (id === "deadpool" || id === "butter_bear_original") return "beast_rampage";
  if (id === "gollum" || id === "nu_uan" || id === "kick_kick" || id === "himi_ney") return "pounce";
  if (id === "seaboon" || id === "ma_moo") return "tail_whip";
  if (id === "okaruto") return "ghost_rush";
  if (id === "chicky" || id === "chai_tong" || id === "maew_a" || id === "ping_g" || id === "yossakorn" || id === "master_m") return "claw_slash";
  if (id === "daimon" || id === "pi_pak_ma" || id === "ma_tang" || id === "nong_cake" || id === "sara_bass") return "bite_rush";
  if (id === "mighty" || id === "bai_sung" || id === "bai_sung_original" || id === "som_normal" || id === "som_roy" || id === "manut_fai" || id === "go_lang" || id === "ai_to_ai_den_khon" || id === "bank_leicester" || id === "p_kong" || id === "pedo_luffy" || id === "lew_2018" || id === "little_b" || id === "m_all_new" || id === "gang_nam_mai_arp") return "horn_charge";
  if (id === "pi_mong" || id === "malee_suay_mak") return "roar";
  if (id === "kitti_bom") return "spike_shot";

  return "dark_magic";
}

export const MONSTER_ATTACK_CONFIGS = {
  // ── 1. Melee / Close-Range Archetypes (วิ่งประชิดตัว / พุ่งชน / ฟาดฟัน / ขย้ำ / กระโดดทับ) ──
  claw_slash: {
    name: "Claw Slash",
    isMelee: true,
    castColor: "#67e8f9",
    projectileColor: "#06b6d4",
    impactColor: "#67e8f9",
    lightColor: "#06b6d4",
    geo: "slash",
    shake: 0.22,
  },
  bite_rush: {
    name: "Bite Rush",
    isMelee: true,
    castColor: "#fbbf24",
    projectileColor: "#d97706",
    impactColor: "#fbbf24",
    lightColor: "#f59e0b",
    geo: "bite",
    shake: 0.2,
  },
  horn_charge: {
    name: "Horn Charge",
    isMelee: true,
    castColor: "#f43f5e",
    projectileColor: "#e11d48",
    impactColor: "#f43f5e",
    lightColor: "#f43f5e",
    geo: "charge",
    shake: 0.3,
  },
  pounce: {
    name: "Pounce (Leap)",
    isMelee: true,
    isPounce: true,
    castColor: "#f59e0b",
    projectileColor: "#d97706",
    impactColor: "#f59e0b",
    lightColor: "#f59e0b",
    geo: "pounce",
    shake: 0.32,
  },
  tail_whip: {
    name: "Tail Whip",
    isMelee: true,
    isTailWhip: true,
    castColor: "#38bdf8",
    projectileColor: "#0284c7",
    impactColor: "#38bdf8",
    lightColor: "#38bdf8",
    geo: "slash",
    shake: 0.25,
  },
  beast_rampage: {
    name: "Beast Rampage",
    isMelee: true,
    isRampage: true,
    castColor: "#f97316",
    projectileColor: "#ea580c",
    impactColor: "#f97316",
    lightColor: "#f97316",
    geo: "slash",
    shake: 0.35,
  },
  ghost_rush: {
    name: "Ghost Rush",
    isMelee: true,
    castColor: "#c084fc",
    projectileColor: "#9333ea",
    impactColor: "#c084fc",
    lightColor: "#a855f7",
    geo: "charge",
    shake: 0.26,
  },

  // ── 2. Breath & Beam Archetypes ──
  fire_breath: {
    name: "Fire Breath",
    castColor: "#f97316",
    projectileColor: "#ea580c",
    emissive: "#c2410c",
    trailColor: "#fb923c",
    impactColor: "#f97316",
    lightColor: "#f97316",
    geo: "tetra",
    shake: 0.2,
  },
  ice_frost: {
    name: "Ice Breath / Frost",
    castColor: "#38bdf8",
    projectileColor: "#0284c7",
    emissive: "#0369a1",
    trailColor: "#7dd3fc",
    impactColor: "#38bdf8",
    lightColor: "#38bdf8",
    geo: "octa",
    shake: 0.16,
  },
  poison_acid: {
    name: "Poison / Acid Spit",
    castColor: "#22c55e",
    projectileColor: "#16a34a",
    emissive: "#15803d",
    trailColor: "#86efac",
    impactColor: "#22c55e",
    lightColor: "#22c55e",
    geo: "dodeca",
    shake: 0.16,
  },
  mega_beam: {
    name: "Mega Breath / Boss Beam",
    castColor: "#c084fc",
    projectileColor: "#9333ea",
    emissive: "#7e22ce",
    trailColor: "#e9d5ff",
    impactColor: "#c084fc",
    lightColor: "#a855f7",
    geo: "beam",
    shake: 0.35,
  },
  roar: {
    name: "Sonic Roar",
    castColor: "#38bdf8",
    projectileColor: "#0284c7",
    impactColor: "#38bdf8",
    lightColor: "#38bdf8",
    geo: "roar",
    shake: 0.28,
  },

  // ── 3. Ranged Projectile Archetypes ──
  spike_shot: {
    name: "Spike Volley",
    castColor: "#94a3b8",
    projectileColor: "#cbd5e1",
    impactColor: "#e2e8f0",
    lightColor: "#cbd5e1",
    geo: "spike",
    shake: 0.2,
  },
  dark_magic: {
    name: "Dark Magic / Shadow Blast",
    castColor: "#ef4444",
    projectileColor: "#dc2626",
    emissive: "#991b1b",
    trailColor: "#f87171",
    impactColor: "#ef4444",
    lightColor: "#ef4444",
    geo: "orb",
    shake: 0.2,
  },
};

// Helper for house spell type lookup
export function getHouseSpellType(houseId) {
  switch (houseId) {
    case "slarf": // Sraraff (Red)
      return "fireball";
    case "plodfindr": // Podfindor (Yellow)
      return "lightning";
    case "anal": // Analyze (Purple)
      return "arcane";
    case "watrat": // Wartaurus (Green)
    default:
      return "poison";
  }
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
    <group position={[0, 0, -8.5]}>
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

// ─── 4. GLTF MODEL RENDERER ────────────────────────────────────────────────
function ModelObject({ modelPath, targetHeight = 1.85, hitState, isCasting }) {
  const groupRef = useRef(null);
  const { scene, animations } = useGLTF(modelPath);
  const { actions } = useAnimations(animations, groupRef);

  useEffect(() => {
    const action = Object.values(actions || {})[0];
    if (action) {
      action.reset().fadeIn(0.25).play();
    }
    return () => {
      if (action) action.fadeOut(0.25);
    };
  }, [actions]);

  const normalizedScene = useMemo(() => {
    const clone = scene.clone(true);
    const box = new THREE.Box3().setFromObject(clone);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    const center = new THREE.Vector3();
    box.getCenter(center);
    const bounds = new THREE.Box3().setFromObject(clone);
    const scale = maxDim > 0 ? targetHeight / maxDim : 1;

    clone.scale.setScalar(scale);
    clone.position.set(-center.x * scale, -bounds.min.y * scale + 0.06, -center.z * scale);
    return clone;
  }, [scene, targetHeight]);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.elapsedTime;
    const shake = hitState ? Math.sin(t * 35) * 0.08 : 0;
    const castingVibe = isCasting ? Math.sin(t * 25) * 0.03 : 0;
    groupRef.current.position.y = (Math.sin(t * 2.0) + 1) * 0.02;
    groupRef.current.position.x = shake + castingVibe;
  });

  return (
    <group ref={groupRef}>
      <primitive object={normalizedScene} />
    </group>
  );
}

// ─── 4. 2-WAY MAGIC COMBAT VFX (Player House Magic + Monster Counter Attack) ──
const SpellVfxOrchestrator = memo(function SpellVfxOrchestrator({
  monster,
  monsterGroupRef,
  attackAction,
  onPlayerImpact,
  onMonsterImpact,
  onComplete,
}) {
  const { camera } = useThree();

  const [startTime, setStartTime] = useState(null);
  const [phase, setPhase] = useState("idle");

  const hasPlayerImpacted = useRef(false);
  const hasMonsterImpacted = useRef(false);
  const hasCompleted = useRef(false);

  // Player Spell Refs
  const playerCastCircleRef = useRef(null);
  const playerOrbRef = useRef(null);
  const ringARef = useRef(null);
  const ringBRef = useRef(null);
  const lightningGeoRef = useRef(null);
  const lightningMatRef = useRef(null);
  const spellLightRef = useRef(null);
  const playerTrailRefs = useRef([]);
  const monsterImpactPointsRef = useRef(null);
  const monsterImpactVelocities = useRef([]);

  // Monster Counter-Spell Refs
  const monsterCastCircleRef = useRef(null);
  const monsterOrbRef = useRef(null);
  const monsterBeamRef = useRef(null);
  const monsterSlashRefA = useRef(null);
  const monsterSlashRefB = useRef(null);
  const monsterBiteRefA = useRef(null);
  const monsterBiteRefB = useRef(null);
  const monsterShockwaveRef = useRef(null);
  const monsterTrailRefs = useRef([]);
  const monsterRoarRefs = useRef([]);
  const monsterSpikeRefs = useRef([]);
  const playerImpactPointsRef = useRef(null);
  const playerImpactVelocities = useRef([]);

  const spellType = attackAction?.spellType || "fireball";
  const mAttackType = useMemo(() => getMonsterAttackType(monster), [monster]);
  const mCfg = useMemo(() => MONSTER_ATTACK_CONFIGS[mAttackType] || MONSTER_ATTACK_CONFIGS.dark_magic, [mAttackType]);

  // Player Spell Config
  const playerSpellConfig = useMemo(() => {
    switch (spellType) {
      case "fireball":
        return {
          castColor: "#ff7030",
          orbColor: "#ffb23b",
          emissive: "#ff3c00",
          trailColor: "#ff8a32",
          impactColor: "#ff6a26",
          lightColor: "#ff5a1f",
          duration: 0.6,
          arc: 1.1,
        };
      case "lightning":
        return {
          castColor: "#78a2ff",
          orbColor: "#9fc4ff",
          emissive: "#3b82f6",
          trailColor: "#9fc4ff",
          impactColor: "#83aaff",
          lightColor: "#75a6ff",
          duration: 0.42,
          arc: 0,
        };
      case "arcane":
        return {
          castColor: "#a76cff",
          orbColor: "#be8cff",
          emissive: "#6f2fff",
          trailColor: "#b678ff",
          impactColor: "#b978ff",
          lightColor: "#a855f7",
          duration: 0.72,
          arc: 0.7,
        };
      case "poison":
      default:
        return {
          castColor: "#55d66f",
          orbColor: "#77e874",
          emissive: "#1e9c3f",
          trailColor: "#76ef7a",
          impactColor: "#60db6c",
          lightColor: "#22c55e",
          duration: 0.68,
          arc: 0.45,
        };
    }
  }, [spellType]);

  const trailSlots = useMemo(() => {
    return Array.from({ length: 8 }, (_, i) => ({ id: i }));
  }, []);

  // Monster Impact geometry
  const monsterImpactGeo = useMemo(() => {
    const count = 20;
    const positions = new Float32Array(count * 3);
    const vels = [];
    for (let i = 0; i < count; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 0;
      vels.push(
        new THREE.Vector3(
          THREE.MathUtils.randFloatSpread(0.16),
          THREE.MathUtils.randFloat(0.04, 0.18),
          THREE.MathUtils.randFloatSpread(0.16)
        )
      );
    }
    monsterImpactVelocities.current = vels;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return geo;
  }, []);

  // Player Impact geometry
  const playerImpactGeo = useMemo(() => {
    const count = 22;
    const positions = new Float32Array(count * 3);
    const vels = [];
    for (let i = 0; i < count; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 0;
      vels.push(
        new THREE.Vector3(
          THREE.MathUtils.randFloatSpread(0.18),
          THREE.MathUtils.randFloat(0.04, 0.2),
          THREE.MathUtils.randFloatSpread(0.18)
        )
      );
    }
    playerImpactVelocities.current = vels;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return geo;
  }, []);

  // Reset state when attack triggers
  useEffect(() => {
    if (attackAction?.active) {
      setStartTime(null);
      setPhase("running");
      hasPlayerImpacted.current = false;
      hasMonsterImpacted.current = false;
      hasCompleted.current = false;

      // Reset monster group to home position
      if (monsterGroupRef?.current) {
        monsterGroupRef.current.position.copy(_M_HOME_POS);
        monsterGroupRef.current.rotation.y = -Math.PI * 0.24;
      }

      // Force zero out all monster attack elements at attack start
      if (monsterCastCircleRef.current) {
        monsterCastCircleRef.current.scale.set(0, 0, 0);
        if (monsterCastCircleRef.current.material) monsterCastCircleRef.current.material.opacity = 0;
      }
      if (monsterOrbRef.current) monsterOrbRef.current.scale.set(0, 0, 0);
      if (monsterBeamRef.current) {
        monsterBeamRef.current.scale.set(0, 0, 0);
        if (monsterBeamRef.current.material) monsterBeamRef.current.material.opacity = 0;
      }
      if (monsterSlashRefA.current) {
        monsterSlashRefA.current.scale.set(0, 0, 0);
        if (monsterSlashRefA.current.material) monsterSlashRefA.current.material.opacity = 0;
      }
      if (monsterSlashRefB.current) {
        monsterSlashRefB.current.scale.set(0, 0, 0);
        if (monsterSlashRefB.current.material) monsterSlashRefB.current.material.opacity = 0;
      }
      if (monsterBiteRefA.current) {
        monsterBiteRefA.current.scale.set(0, 0, 0);
        if (monsterBiteRefA.current.material) monsterBiteRefA.current.material.opacity = 0;
      }
      if (monsterBiteRefB.current) {
        monsterBiteRefB.current.scale.set(0, 0, 0);
        if (monsterBiteRefB.current.material) monsterBiteRefB.current.material.opacity = 0;
      }
      if (monsterShockwaveRef.current) {
        monsterShockwaveRef.current.scale.set(0, 0, 0);
        if (monsterShockwaveRef.current.material) monsterShockwaveRef.current.material.opacity = 0;
      }
      for (let i = 0; i < monsterTrailRefs.current.length; i++) {
        const mesh = monsterTrailRefs.current[i];
        if (mesh) {
          mesh.scale.set(0, 0, 0);
          if (mesh.material) mesh.material.opacity = 0;
        }
      }
      for (let i = 0; i < monsterRoarRefs.current.length; i++) {
        const mesh = monsterRoarRefs.current[i];
        if (mesh) {
          mesh.scale.set(0, 0, 0);
          if (mesh.material) mesh.material.opacity = 0;
        }
      }
      for (let i = 0; i < monsterSpikeRefs.current.length; i++) {
        const mesh = monsterSpikeRefs.current[i];
        if (mesh) {
          mesh.scale.set(0, 0, 0);
          if (mesh.material) mesh.material.opacity = 0;
        }
      }
    } else {
      setPhase("idle");
      if (monsterGroupRef?.current) {
        monsterGroupRef.current.position.copy(_M_HOME_POS);
        monsterGroupRef.current.rotation.y = -Math.PI * 0.24;
      }
    }
  }, [attackAction?.active, attackAction?.id, monsterGroupRef]);

  useFrame(({ clock }) => {
    if (phase === "idle" || !attackAction?.active) {
      if (monsterGroupRef?.current) {
        monsterGroupRef.current.position.copy(_M_HOME_POS);
        monsterGroupRef.current.rotation.y = -Math.PI * 0.24;
      }
      return;
    }

    const t = clock.elapsedTime;
    if (startTime === null) {
      setStartTime(t);
      return;
    }

    const elapsed = t - startTime;

    // ─────────────────────────────────────────────────────────────
    // 1. PHASE 1: PLAYER CASTS SPELL AT MONSTER (0.0s - 0.85s)
    // ─────────────────────────────────────────────────────────────
    if (playerCastCircleRef.current) {
      const p = Math.min(elapsed / 0.5, 1);
      playerCastCircleRef.current.rotation.z += 0.08;
      const s = 0.4 + p * 1.5;
      playerCastCircleRef.current.scale.set(s, s, 1);
      if (playerCastCircleRef.current.material) {
        playerCastCircleRef.current.material.opacity = Math.max(0, 1 - p);
      }
    }

    const pFlightElapsed = Math.max(0, elapsed - 0.12);
    const pFlightProgress = Math.min(pFlightElapsed / playerSpellConfig.duration, 1);
    const pEased = pFlightProgress * pFlightProgress * (3 - 2 * pFlightProgress);

    if (spellType === "lightning") {
      if (pFlightProgress > 0 && pFlightProgress < 1) {
        if (lightningGeoRef.current) {
          const segments = 18;
          for (let i = 0; i <= segments; i++) {
            const p = i / segments;
            _LIGHTNING_PTS[i].lerpVectors(_P_POS, _M_POS, p);
            if (i !== 0 && i !== segments) {
              _LIGHTNING_PTS[i].x += THREE.MathUtils.randFloatSpread(0.4);
              _LIGHTNING_PTS[i].y += THREE.MathUtils.randFloatSpread(0.4);
              _LIGHTNING_PTS[i].z += THREE.MathUtils.randFloatSpread(0.4);
            }
          }
          lightningGeoRef.current.setFromPoints(_LIGHTNING_PTS);
        }
        if (lightningMatRef.current) {
          lightningMatRef.current.opacity = Math.sin(elapsed * 40) > 0 ? 1 : 0.2;
        }
      } else if (pFlightProgress >= 1) {
        if (lightningMatRef.current) lightningMatRef.current.opacity = 0;
      }
    } else {
      if (playerOrbRef.current && pFlightProgress > 0 && pFlightProgress < 1) {
        _V_TEMP.lerpVectors(_P_POS, _M_POS, pEased);

        if (spellType === "fireball") {
          _V_TEMP.y += Math.sin(pFlightProgress * Math.PI) * playerSpellConfig.arc;
          playerOrbRef.current.rotation.x += 0.2;
          playerOrbRef.current.rotation.y += 0.25;
        } else if (spellType === "arcane") {
          _V_TEMP.y += Math.sin(pFlightProgress * Math.PI) * playerSpellConfig.arc;
          if (ringARef.current) ringARef.current.rotation.z += 0.25;
          if (ringBRef.current) ringBRef.current.rotation.z -= 0.3;
          playerOrbRef.current.rotation.y += 0.1;
        } else if (spellType === "poison") {
          _V_TEMP.x += Math.sin(pFlightProgress * Math.PI * 6) * 0.16;
          _V_TEMP.y += Math.sin(pFlightProgress * Math.PI) * playerSpellConfig.arc;
        }

        playerOrbRef.current.position.copy(_V_TEMP);
        playerOrbRef.current.scale.setScalar(1);

        // Move dynamic spell light
        if (spellLightRef.current) {
          spellLightRef.current.position.copy(_V_TEMP);
          spellLightRef.current.color.set(playerSpellConfig.lightColor);
          spellLightRef.current.intensity = 8;
        }

        // Update player trail particles
        for (let i = 0; i < trailSlots.length; i++) {
          const mesh = playerTrailRefs.current[i];
          if (mesh && pFlightProgress > (i / trailSlots.length) * 0.9) {
            mesh.position.lerpVectors(_P_POS, _M_POS, Math.max(0, pEased - i * 0.06));
            if (spellType === "fireball" || spellType === "arcane") {
              mesh.position.y += Math.sin(Math.max(0, pFlightProgress - i * 0.06) * Math.PI) * playerSpellConfig.arc;
            }
            const pLife = Math.max(0, 1 - (pFlightElapsed * 3 - i * 0.18));
            mesh.scale.setScalar(pLife * 0.85);
            if (mesh.material) mesh.material.opacity = pLife * 0.8;
          }
        }
      } else if (playerOrbRef.current && pFlightProgress >= 1) {
        playerOrbRef.current.scale.setScalar(0);
      }
    }

    // Player spell impact on monster (at ~0.72s)
    if (pFlightProgress >= 1 && !hasPlayerImpacted.current) {
      hasPlayerImpacted.current = true;
      if (typeof onPlayerImpact === "function") onPlayerImpact();
    }

    // Update monster impact burst
    if (hasPlayerImpacted.current && monsterImpactPointsRef.current) {
      const impactAge = pFlightElapsed - playerSpellConfig.duration;
      const prog = Math.min(impactAge / 0.45, 1);
      const arr = monsterImpactGeo.attributes.position.array;

      for (let i = 0; i < monsterImpactVelocities.current.length; i++) {
        const v = monsterImpactVelocities.current[i];
        arr[i * 3] += v.x;
        arr[i * 3 + 1] += v.y;
        arr[i * 3 + 2] += v.z;
        v.y -= 0.005;
      }

      monsterImpactGeo.attributes.position.needsUpdate = true;
      if (monsterImpactPointsRef.current.material) {
        monsterImpactPointsRef.current.material.opacity = Math.max(0, 1 - prog);
      }
    }

    // ─────────────────────────────────────────────────────────────
    // 2. PHASE 2: MONSTER COUNTER-ATTACKS PLAYER (0.85s - 1.65s)
    // ─────────────────────────────────────────────────────────────
    const mStartDelay = 0.85;

    // Strict suppression before 0.85s (Monster must wait for player attack to impact first)
    if (elapsed < mStartDelay) {
      if (monsterGroupRef?.current) {
        monsterGroupRef.current.position.copy(_M_HOME_POS);
        monsterGroupRef.current.rotation.y = -Math.PI * 0.24;
      }
      if (monsterCastCircleRef.current) {
        monsterCastCircleRef.current.scale.set(0, 0, 0);
        if (monsterCastCircleRef.current.material) monsterCastCircleRef.current.material.opacity = 0;
      }
      if (monsterOrbRef.current) monsterOrbRef.current.scale.set(0, 0, 0);
      if (monsterBeamRef.current) {
        monsterBeamRef.current.scale.set(0, 0, 0);
        if (monsterBeamRef.current.material) monsterBeamRef.current.material.opacity = 0;
      }
      if (monsterSlashRefA.current) {
        monsterSlashRefA.current.scale.set(0, 0, 0);
        if (monsterSlashRefA.current.material) monsterSlashRefA.current.material.opacity = 0;
      }
      if (monsterSlashRefB.current) {
        monsterSlashRefB.current.scale.set(0, 0, 0);
        if (monsterSlashRefB.current.material) monsterSlashRefB.current.material.opacity = 0;
      }
      if (monsterBiteRefA.current) {
        monsterBiteRefA.current.scale.set(0, 0, 0);
        if (monsterBiteRefA.current.material) monsterBiteRefA.current.material.opacity = 0;
      }
      if (monsterBiteRefB.current) {
        monsterBiteRefB.current.scale.set(0, 0, 0);
        if (monsterBiteRefB.current.material) monsterBiteRefB.current.material.opacity = 0;
      }
      if (monsterShockwaveRef.current) {
        monsterShockwaveRef.current.scale.set(0, 0, 0);
        if (monsterShockwaveRef.current.material) monsterShockwaveRef.current.material.opacity = 0;
      }
      return;
    }

    const mElapsed = elapsed - mStartDelay;

    // Cast Circle at Monster feet (Spawns at 0.85s)
    if (monsterCastCircleRef.current) {
      const p = Math.min(mElapsed / 0.45, 1);
      monsterCastCircleRef.current.rotation.z -= 0.08;
      const s = 0.4 + p * 1.5;
      monsterCastCircleRef.current.scale.set(s, s, 1);
      if (monsterCastCircleRef.current.material) {
        monsterCastCircleRef.current.material.opacity = Math.max(0, 1 - p);
      }
    }

    const mFlightDuration = 0.6;
    const mFlightElapsed = Math.max(0, mElapsed - 0.1);
    const mFlightProgress = Math.min(mFlightElapsed / mFlightDuration, 1);
    const mEased = mFlightProgress * mFlightProgress * (3 - 2 * mFlightProgress);

    // ── MONSTER 3D PHYSICAL MOVEMENT (Melee Dash / Leap / Spin / Return Home) ──
    if (monsterGroupRef?.current) {
      if (mCfg.isMelee) {
        if (mFlightProgress < 1) {
          // Rush towards player
          monsterGroupRef.current.position.lerpVectors(_M_HOME_POS, _M_MELEE_POS, mEased);
          if (mCfg.isPounce) {
            monsterGroupRef.current.position.y = 0.05 + Math.sin(mFlightProgress * Math.PI) * 2.2;
          }
          if (mCfg.isTailWhip) {
            monsterGroupRef.current.rotation.y = -Math.PI * 0.24 + Math.sin(mFlightProgress * Math.PI) * Math.PI * 2.0;
          }
        } else {
          // Strike at melee range, then smoothly dash back home
          const retP = Math.min((mFlightElapsed - mFlightDuration) / 0.35, 1);
          const retEased = retP * retP * (3 - 2 * retP);
          monsterGroupRef.current.position.lerpVectors(_M_MELEE_POS, _M_HOME_POS, retEased);
          monsterGroupRef.current.rotation.y = -Math.PI * 0.24;
        }
      } else {
        // Stationary for breath / beam / ranged spells
        monsterGroupRef.current.position.copy(_M_HOME_POS);
        monsterGroupRef.current.rotation.y = -Math.PI * 0.24;
      }
    }

    // Dynamic handling per monster attack archetype
    if (mFlightProgress > 0 && mFlightProgress < 1) {
      if (spellLightRef.current) {
        spellLightRef.current.color.set(mCfg.lightColor);
        spellLightRef.current.intensity = 8;
      }

      if (mCfg.geo === "beam" && monsterBeamRef.current) {
        // Mega Beam from monster mouth directly to player chest
        const start = _M_MOUTH_POS;
        const end = _P_CHEST_POS;
        const dirLen = start.distanceTo(end);

        _V_TEMP.lerpVectors(start, end, 0.5);
        monsterBeamRef.current.position.copy(_V_TEMP);

        _BEAM_DIR.subVectors(end, start).normalize();
        monsterBeamRef.current.quaternion.setFromUnitVectors(_UP_VEC, _BEAM_DIR);

        const beamPulse = 1 + Math.sin(t * 28) * 0.2;
        monsterBeamRef.current.scale.set(beamPulse, dirLen, beamPulse);

        if (monsterBeamRef.current.material) {
          monsterBeamRef.current.material.opacity = Math.min(mFlightProgress * 2.5, (1 - mFlightProgress) * 2.5) * 0.95;
        }

        // Swirling energy particles along the beam
        for (let i = 0; i < trailSlots.length; i++) {
          const mesh = monsterTrailRefs.current[i];
          if (mesh) {
            const pAlong = ((i / trailSlots.length) + t * 2.5) % 1;
            _V_TEMP.lerpVectors(start, end, pAlong);
            const spiralAngle = t * 14 + i * (Math.PI * 2 / trailSlots.length);
            _V_TEMP.x += Math.cos(spiralAngle) * 0.35;
            _V_TEMP.y += Math.sin(spiralAngle) * 0.35;
            mesh.position.copy(_V_TEMP);
            mesh.scale.setScalar(0.7);
            if (mesh.material) mesh.material.opacity = 0.85;
          }
        }

        if (spellLightRef.current) {
          spellLightRef.current.position.copy(_V_TEMP);
          spellLightRef.current.intensity = 10;
        }
      } else if (mCfg.geo === "slash" || mCfg.isMelee) {
        // Melee Slashing Arcs / Claws / Rampage / Tail Whip on Player
        if (monsterSlashRefA.current && monsterSlashRefB.current) {
          const slashP = Math.min(mFlightElapsed / 0.45, 1);
          monsterSlashRefA.current.position.copy(_P_CHEST_POS);
          monsterSlashRefB.current.position.copy(_P_CHEST_POS);
          monsterSlashRefA.current.scale.setScalar(0.4 + slashP * 1.3);
          monsterSlashRefB.current.scale.setScalar(0.4 + slashP * 1.3);
          if (mCfg.isRampage) {
            const cycle = Math.floor(mFlightElapsed * 8) % 3;
            monsterSlashRefA.current.rotation.z = Math.PI / 4 + cycle * 0.6;
            monsterSlashRefB.current.rotation.z = -Math.PI / 4 - cycle * 0.6;
          } else {
            monsterSlashRefA.current.rotation.z += 0.08;
            monsterSlashRefB.current.rotation.z -= 0.08;
          }
          monsterSlashRefA.current.material.opacity = Math.max(0, 1 - slashP);
          monsterSlashRefB.current.material.opacity = Math.max(0, 1 - slashP);
        }
      } else if (mCfg.geo === "bite") {
        // Clamping jaw arcs centered on player chest
        if (monsterBiteRefA.current && monsterBiteRefB.current) {
          const biteP = Math.min(mFlightElapsed / 0.45, 1);
          monsterBiteRefA.current.position.set(_P_CHEST_POS.x, _P_CHEST_POS.y + (1 - biteP) * 0.35, _P_CHEST_POS.z);
          monsterBiteRefB.current.position.set(_P_CHEST_POS.x, _P_CHEST_POS.y - (1 - biteP) * 0.35, _P_CHEST_POS.z);
          monsterBiteRefA.current.scale.setScalar(1);
          monsterBiteRefB.current.scale.setScalar(1);
          monsterBiteRefA.current.material.opacity = Math.max(0, 1 - biteP);
          monsterBiteRefB.current.material.opacity = Math.max(0, 1 - biteP);
        }
      } else if (mCfg.geo === "roar") {
        // Sonic Roar: 3 expanding ripple rings
        for (let i = 0; i < 3; i++) {
          const rMesh = monsterRoarRefs.current[i];
          if (rMesh) {
            const rDelay = i * 0.12;
            const rProg = Math.max(0, Math.min(1, (mFlightElapsed - rDelay) / 0.45));
            if (rProg > 0 && rProg < 1) {
              _V_TEMP.lerpVectors(_M_MOUTH_POS, _P_CHEST_POS, rProg);
              rMesh.position.copy(_V_TEMP);
              rMesh.lookAt(_P_CHEST_POS);
              rMesh.scale.setScalar(0.4 + rProg * 2.2);
              if (rMesh.material) rMesh.material.opacity = (1 - rProg) * 0.85;
            } else {
              rMesh.scale.setScalar(0);
              if (rMesh.material) rMesh.material.opacity = 0;
            }
          }
        }
      } else if (mCfg.geo === "spike") {
        // Spike Volley: 5 needle spikes flying forward in spread formation
        for (let i = 0; i < 5; i++) {
          const sMesh = monsterSpikeRefs.current[i];
          if (sMesh) {
            _V_TEMP.lerpVectors(_M_MOUTH_POS, _P_CHEST_POS, mEased);
            const spread = (i - 2) * 0.22 * mFlightProgress;
            _V_TEMP.y += Math.sin(mFlightProgress * Math.PI) * 0.2 + (i % 2 === 0 ? spread * 0.5 : -spread * 0.5);
            _V_TEMP.x += spread;
            sMesh.position.copy(_V_TEMP);
            sMesh.lookAt(_P_CHEST_POS);
            sMesh.rotation.x += Math.PI / 2;
            sMesh.scale.setScalar(1);
            if (sMesh.material) sMesh.material.opacity = 1;
          }
        }
      } else if (mCfg.geo === "tetra" || mCfg.geo === "octa" || mCfg.geo === "dodeca") {
        // Breath Attacks (Fire Breath, Ice Frost, Poison Acid):
        // Hide central head orb completely - NO ball on head!
        if (monsterOrbRef.current) monsterOrbRef.current.scale.setScalar(0);

        // Continuous stream of breath particles surging from mouth to player chest
        for (let i = 0; i < trailSlots.length; i++) {
          const mesh = monsterTrailRefs.current[i];
          if (mesh) {
            const streamDelay = (i / trailSlots.length) * 0.35;
            const pProg = Math.max(0, Math.min(1, (mFlightElapsed - streamDelay) / (mFlightDuration * 0.72)));
            if (pProg > 0 && pProg < 1) {
              _V_TEMP.lerpVectors(_M_MOUTH_POS, _P_CHEST_POS, pProg);
              _V_TEMP.y += Math.sin(pProg * Math.PI) * 0.15 + Math.sin(t * 18 + i * 2) * 0.08 * pProg;
              _V_TEMP.x += Math.cos(t * 16 + i * 2) * 0.07 * pProg;
              _V_TEMP.z += Math.sin(t * 14 + i * 2) * 0.07 * pProg;
              mesh.position.copy(_V_TEMP);
              mesh.rotation.x += 0.16;
              mesh.rotation.y += 0.22;
              const scaleFactor = 0.45 + pProg * 0.7;
              mesh.scale.setScalar(scaleFactor);
              if (mesh.material) mesh.material.opacity = Math.min(1, pProg * 3) * (1 - pProg * 0.3);

              if (i === 0 && spellLightRef.current) {
                spellLightRef.current.position.copy(_V_TEMP);
                spellLightRef.current.intensity = 8;
              }
            } else {
              mesh.scale.setScalar(0);
              if (mesh.material) mesh.material.opacity = 0;
            }
          }
        }
      } else {
        // Projectile attack (Dark Magic Shadow Orb / Horn Charge):
        // Clean compact projectile starting from mouth position (NOT on head)
        if (monsterOrbRef.current) {
          _V_TEMP.lerpVectors(_M_MOUTH_POS, _P_CHEST_POS, mEased);
          _V_TEMP.y += Math.sin(mFlightProgress * Math.PI) * (mCfg.geo === "charge" ? 0.25 : 0.35);
          monsterOrbRef.current.position.copy(_V_TEMP);
          monsterOrbRef.current.rotation.x += 0.22;
          monsterOrbRef.current.rotation.z += 0.18;
          monsterOrbRef.current.scale.setScalar(0.65);
          if (spellLightRef.current) spellLightRef.current.position.copy(_V_TEMP);
        }

        // Trail particles
        for (let i = 0; i < trailSlots.length; i++) {
          const mesh = monsterTrailRefs.current[i];
          if (mesh && mFlightProgress > (i / trailSlots.length) * 0.9) {
            mesh.position.lerpVectors(_M_MOUTH_POS, _P_CHEST_POS, Math.max(0, mEased - i * 0.06));
            mesh.position.y += Math.sin(Math.max(0, mFlightProgress - i * 0.06) * Math.PI) * 0.35;
            const pLife = Math.max(0, 1 - (mFlightElapsed * 3 - i * 0.18));
            mesh.scale.setScalar(pLife * 0.65);
            if (mesh.material) mesh.material.opacity = pLife * 0.8;
          }
        }
      }
    } else if (mFlightProgress >= 1) {
      if (monsterOrbRef.current) monsterOrbRef.current.scale.setScalar(0);
      if (monsterBeamRef.current) monsterBeamRef.current.scale.setScalar(0);
      if (monsterSlashRefA.current) monsterSlashRefA.current.scale.setScalar(0);
      if (monsterSlashRefB.current) monsterSlashRefB.current.scale.setScalar(0);
      if (monsterBiteRefA.current) monsterBiteRefA.current.scale.setScalar(0);
      if (monsterBiteRefB.current) monsterBiteRefB.current.scale.setScalar(0);
      for (let i = 0; i < monsterRoarRefs.current.length; i++) {
        if (monsterRoarRefs.current[i]) monsterRoarRefs.current[i].scale.setScalar(0);
      }
      for (let i = 0; i < monsterSpikeRefs.current.length; i++) {
        if (monsterSpikeRefs.current[i]) monsterSpikeRefs.current[i].scale.setScalar(0);
      }
      if (spellLightRef.current) spellLightRef.current.intensity = 0;
    }

    // Monster counter-spell impact on player (at ~1.55s)
    if (mFlightProgress >= 1 && !hasMonsterImpacted.current) {
      hasMonsterImpacted.current = true;
      if (typeof onMonsterImpact === "function") onMonsterImpact();
    }

    // Update player impact burst & shockwave
    if (hasMonsterImpacted.current && playerImpactPointsRef.current) {
      const impactAge = mFlightElapsed - mFlightDuration;
      const prog = Math.min(impactAge / 0.45, 1);
      const arr = playerImpactGeo.attributes.position.array;

      for (let i = 0; i < playerImpactVelocities.current.length; i++) {
        const v = playerImpactVelocities.current[i];
        arr[i * 3] += v.x;
        arr[i * 3 + 1] += v.y;
        arr[i * 3 + 2] += v.z;
        v.y -= 0.005;
      }

      playerImpactGeo.attributes.position.needsUpdate = true;
      if (playerImpactPointsRef.current.material) {
        playerImpactPointsRef.current.material.opacity = Math.max(0, 1 - prog);
      }

      // Expanding ground shockwave for heavy / melee attacks
      if (monsterShockwaveRef.current && (mCfg.isMelee || mCfg.geo === "beam" || mCfg.geo === "roar")) {
        const swProgress = Math.min(impactAge / 0.45, 1);
        monsterShockwaveRef.current.position.set(_P_POS.x, 0.05, _P_POS.z);
        monsterShockwaveRef.current.scale.setScalar(0.4 + swProgress * 2.2);
        if (monsterShockwaveRef.current.material) {
          monsterShockwaveRef.current.material.opacity = Math.max(0, 0.9 * (1 - swProgress));
        }
      }

      // Camera hit shake tailored to monster attack power
      if (impactAge < 0.2) {
        const sAmt = mCfg.shake || 0.16;
        camera.position.x = THREE.MathUtils.randFloatSpread(sAmt);
        camera.position.y = 4.0 + THREE.MathUtils.randFloatSpread(sAmt * 0.8);
      } else {
        camera.position.x = 0;
        camera.position.y = 4.0;
      }
    }

    // ─────────────────────────────────────────────────────────────
    // 3. SEQUENCE COMPLETION (at ~1.95s)
    // ─────────────────────────────────────────────────────────────
    if (elapsed >= 1.95 && !hasCompleted.current) {
      hasCompleted.current = true;
      setPhase("done");
      if (monsterGroupRef?.current) {
        monsterGroupRef.current.position.copy(_M_HOME_POS);
        monsterGroupRef.current.rotation.y = -Math.PI * 0.24;
      }
      if (typeof onComplete === "function") onComplete();
    }
  });

  if (phase === "idle" || !attackAction?.active) return null;

  return (
    <group>
      {/* Dynamic Single Spell Light (Reused for both Player & Monster for max FPS) */}
      <pointLight ref={spellLightRef} color={playerSpellConfig.lightColor} intensity={0} distance={7} />

      {/* ── PLAYER SPELL ELEMENTS ── */}
      <mesh
        ref={playerCastCircleRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[-2.4, 0.06, 1.3]}
      >
        <ringGeometry args={[1.0, 1.2, 32]} />
        <meshBasicMaterial color={playerSpellConfig.castColor} transparent opacity={0.95} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>

      {spellType === "fireball" && (
        <mesh ref={playerOrbRef} position={_P_POS.toArray()} geometry={ICOSA_GEO}>
          <meshStandardMaterial color={playerSpellConfig.orbColor} emissive={playerSpellConfig.emissive} emissiveIntensity={3.2} flatShading />
        </mesh>
      )}

      {spellType === "arcane" && (
        <group ref={playerOrbRef} position={_P_POS.toArray()}>
          <mesh geometry={OCTA_GEO}>
            <meshStandardMaterial color={playerSpellConfig.orbColor} emissive={playerSpellConfig.emissive} emissiveIntensity={3.5} flatShading />
          </mesh>
          <mesh ref={ringARef} geometry={TORUS_ORB_GEO}>
            <meshBasicMaterial color="#e0c6ff" transparent opacity={0.9} />
          </mesh>
          <mesh ref={ringBRef} rotation={[Math.PI / 2, 0, 0]} geometry={TORUS_ORB_GEO}>
            <meshBasicMaterial color="#e0c6ff" transparent opacity={0.9} />
          </mesh>
        </group>
      )}

      {spellType === "poison" && (
        <mesh ref={playerOrbRef} position={_P_POS.toArray()} geometry={DODECA_GEO}>
          <meshStandardMaterial color={playerSpellConfig.orbColor} emissive={playerSpellConfig.emissive} emissiveIntensity={2.8} flatShading />
        </mesh>
      )}

      {spellType === "lightning" && (
        <group>
          <line>
            <bufferGeometry ref={lightningGeoRef} />
            <lineBasicMaterial ref={lightningMatRef} color="#9fc4ff" transparent opacity={1} />
          </line>
        </group>
      )}

      {trailSlots.map((s, idx) => (
        <mesh key={`p_trail_${s.id}`} ref={(el) => (playerTrailRefs.current[idx] = el)} position={_P_POS.toArray()} geometry={TRAIL_GEO}>
          <meshBasicMaterial color={playerSpellConfig.trailColor} transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}

      <points ref={monsterImpactPointsRef} position={_M_POS.toArray()} geometry={monsterImpactGeo}>
        <pointsMaterial color={playerSpellConfig.impactColor} size={0.12} transparent opacity={0} depthWrite={false} />
      </points>

      {/* ── MONSTER COUNTER-ATTACK ELEMENTS (Archetype-driven VFX) ── */}
      <mesh
        ref={monsterCastCircleRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[2.4, 0.06, -1.3]}
        scale={[0, 0, 0]}
      >
        <ringGeometry args={[1.0, 1.2, 32]} />
        <meshBasicMaterial color={mCfg.castColor} transparent opacity={0} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>

      {/* Monster Projectile (Adapts to monster archetype) */}
      {mCfg.geo === "tetra" && (
        <mesh ref={monsterOrbRef} position={_M_POS.toArray()} scale={[0, 0, 0]} geometry={MONSTER_TETRA_GEO}>
          <meshStandardMaterial color={mCfg.projectileColor} emissive={mCfg.emissive} emissiveIntensity={3.2} flatShading />
        </mesh>
      )}
      {mCfg.geo === "octa" && (
        <mesh ref={monsterOrbRef} position={_M_POS.toArray()} scale={[0, 0, 0]} geometry={OCTA_GEO}>
          <meshStandardMaterial color={mCfg.projectileColor} emissive={mCfg.emissive} emissiveIntensity={3.2} flatShading />
        </mesh>
      )}
      {mCfg.geo === "dodeca" && (
        <mesh ref={monsterOrbRef} position={_M_POS.toArray()} scale={[0, 0, 0]} geometry={DODECA_GEO}>
          <meshStandardMaterial color={mCfg.projectileColor} emissive={mCfg.emissive} emissiveIntensity={3.0} flatShading />
        </mesh>
      )}
      {(mCfg.geo === "orb" || mCfg.geo === "charge") && (
        <mesh ref={monsterOrbRef} position={_M_POS.toArray()} scale={[0, 0, 0]} geometry={MONSTER_ORB_GEO}>
          <meshStandardMaterial color={mCfg.projectileColor} emissive={mCfg.emissive} emissiveIntensity={3.2} flatShading />
        </mesh>
      )}

      {/* Mega Beam Cylinder */}
      {mCfg.geo === "beam" && (
        <mesh ref={monsterBeamRef} scale={[0, 0, 0]} geometry={MONSTER_BEAM_GEO}>
          <meshBasicMaterial color={mCfg.projectileColor} transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      )}

      {/* Dual Claw Slash Arcs */}
      {(mCfg.geo === "slash" || mCfg.isMelee) && (
        <group>
          <mesh ref={monsterSlashRefA} scale={[0, 0, 0]} rotation={[Math.PI / 2, 0, Math.PI / 4]} geometry={MONSTER_SLASH_GEO}>
            <meshBasicMaterial color={mCfg.projectileColor} transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} />
          </mesh>
          <mesh ref={monsterSlashRefB} scale={[0, 0, 0]} rotation={[Math.PI / 2, 0, -Math.PI / 4]} geometry={MONSTER_SLASH_GEO}>
            <meshBasicMaterial color="#ffffff" transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} />
          </mesh>
        </group>
      )}

      {/* Dual Bite Jaw Arcs */}
      {mCfg.geo === "bite" && (
        <group>
          <mesh ref={monsterBiteRefA} scale={[0, 0, 0]} rotation={[0, 0, 0]} geometry={MONSTER_BITE_GEO}>
            <meshBasicMaterial color={mCfg.projectileColor} transparent opacity={0} depthWrite={false} />
          </mesh>
          <mesh ref={monsterBiteRefB} scale={[0, 0, 0]} rotation={[Math.PI, 0, 0]} geometry={MONSTER_BITE_GEO}>
            <meshBasicMaterial color={mCfg.projectileColor} transparent opacity={0} depthWrite={false} />
          </mesh>
        </group>
      )}

      {/* Sonic Roar Torus Rings */}
      {mCfg.geo === "roar" && (
        <group>
          {[0, 1, 2].map((idx) => (
            <mesh key={`roar_${idx}`} ref={(el) => (monsterRoarRefs.current[idx] = el)} scale={[0, 0, 0]} geometry={SONIC_RING_GEO}>
              <meshBasicMaterial color={mCfg.projectileColor} transparent opacity={0} depthWrite={false} />
            </mesh>
          ))}
        </group>
      )}

      {/* Spike Volley Cones */}
      {mCfg.geo === "spike" && (
        <group>
          {[0, 1, 2, 3, 4].map((idx) => (
            <mesh key={`spike_${idx}`} ref={(el) => (monsterSpikeRefs.current[idx] = el)} scale={[0, 0, 0]} geometry={SPIKE_CONE_GEO}>
              <meshBasicMaterial color={mCfg.projectileColor} transparent opacity={0} depthWrite={false} />
            </mesh>
          ))}
        </group>
      )}

      {/* Shockwave Ground Ring */}
      <mesh ref={monsterShockwaveRef} scale={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} position={[-2.4, 0.05, 1.3]} geometry={MONSTER_SHOCKWAVE_GEO}>
        <meshBasicMaterial color={mCfg.impactColor} transparent opacity={0} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>

      {/* Trail particles */}
      {trailSlots.map((s, idx) => (
        <mesh key={`m_trail_${s.id}`} ref={(el) => (monsterTrailRefs.current[idx] = el)} position={_M_POS.toArray()} geometry={TRAIL_GEO}>
          <meshBasicMaterial color={mCfg.trailColor} transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}

      {/* Player impact burst */}
      <points ref={playerImpactPointsRef} position={_P_POS.toArray()} geometry={playerImpactGeo}>
        <pointsMaterial color={mCfg.impactColor} size={0.14} transparent opacity={0} depthWrite={false} />
      </points>
    </group>
  );
});

// ─── 5. CHARACTER BUFF & SUPPORT VFX (Inspired by Three.js Showcase) ─────────
const BUFF_SETTINGS = {
  heal: {
    color: "#10b981",
    emissive: "#059669",
    sparkColor: "#6ee7b7",
    ringColor: "#34d399",
    type: "heal",
  },
  damage: {
    color: "#ef4444",
    emissive: "#b91c1c",
    sparkColor: "#f87171",
    ringColor: "#f87171",
    type: "attackUp",
  },
  attack_up: {
    color: "#ef4444",
    emissive: "#b91c1c",
    sparkColor: "#f87171",
    ringColor: "#f87171",
    type: "attackUp",
  },
  speed: {
    color: "#06b6d4",
    emissive: "#0891b2",
    sparkColor: "#67e8f9",
    ringColor: "#22d3ee",
    type: "speedUp",
  },
  cooldown: {
    color: "#06b6d4",
    emissive: "#0891b2",
    sparkColor: "#67e8f9",
    ringColor: "#22d3ee",
    type: "speedUp",
  },
  haste: {
    color: "#06b6d4",
    emissive: "#0891b2",
    sparkColor: "#67e8f9",
    ringColor: "#22d3ee",
    type: "speedUp",
  },
  invincible: {
    color: "#eab308",
    emissive: "#ca8a04",
    sparkColor: "#fde047",
    ringColor: "#fde047",
    type: "invincible",
  },
  shield: {
    color: "#38bdf8",
    emissive: "#0284c7",
    sparkColor: "#7dd3fc",
    ringColor: "#38bdf8",
    type: "shield",
  },
  defense_up: {
    color: "#38bdf8",
    emissive: "#0284c7",
    sparkColor: "#7dd3fc",
    ringColor: "#38bdf8",
    type: "shield",
  },
  crit: {
    color: "#f59e0b",
    emissive: "#d97706",
    sparkColor: "#fcd34d",
    ringColor: "#fbbf24",
    type: "critUp",
  },
  magic: {
    color: "#a855f7",
    emissive: "#7e22ce",
    sparkColor: "#d8b4fe",
    ringColor: "#c084fc",
    type: "magicUp",
  },
  revive: {
    color: "#fde047",
    emissive: "#eab308",
    sparkColor: "#fef08a",
    ringColor: "#fef08a",
    type: "revive",
  },
  fire: {
    color: "#f97316",
    emissive: "#ea580c",
    sparkColor: "#fdba74",
    ringColor: "#fb923c",
    type: "attackUp",
  },
  lightning: {
    color: "#38bdf8",
    emissive: "#0284c7",
    sparkColor: "#93c5fd",
    ringColor: "#60a5fa",
    type: "magicUp",
  },
};

const CharacterBuffVfx = memo(function CharacterBuffVfx({ buffType }) {
  const groupRef = useRef(null);
  const ringRef = useRef(null);
  const sphereRef = useRef(null);
  const haloRef = useRef(null);
  const auraConeRef = useRef(null);
  const subItemsRef = useRef([]);
  const sparksRef = useRef([]);
  const startTimeRef = useRef(0);

  const cfg = BUFF_SETTINGS[buffType] || null;

  useEffect(() => {
    if (buffType) {
      startTimeRef.current = performance.now();
    }
  }, [buffType]);

  const sparkSeeds = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => ({
      angle: (i / 12) * Math.PI * 2,
      rad: 0.35 + (i % 3) * 0.2,
      speed: 0.8 + (i % 3) * 0.3,
      offsetY: (i % 4) * 0.35,
    }));
  }, []);

  useFrame(() => {
    if (!cfg || !groupRef.current) return;
    const elapsed = (performance.now() - startTimeRef.current) / 1000;
    const t = performance.now() * 0.001;

    // 1. Expanding Ground Cast Ring
    if (ringRef.current) {
      const ringP = Math.min(elapsed / 0.8, 1);
      ringRef.current.scale.setScalar(0.4 + ringP * 1.8);
      ringRef.current.rotation.z += 0.04;
      ringRef.current.material.opacity = Math.max(0, 0.9 * (1 - ringP));
    }

    // 2. Pulse Wireframe Sphere
    if (sphereRef.current) {
      const sphereP = Math.min(elapsed / 0.7, 1);
      sphereRef.current.scale.setScalar(0.4 + sphereP * 1.1);
      sphereRef.current.material.opacity = Math.max(0, 0.45 * (1 - sphereP));
    }

    // 3. Rising Sparkle Particles
    sparksRef.current.forEach((sp, idx) => {
      if (!sp) return;
      const seed = sparkSeeds[idx];
      const life = (elapsed * seed.speed + seed.offsetY) % 1.4;
      const progress = life / 1.4;
      const curRad = seed.rad * (1 + progress * 0.35);
      sp.position.set(
        Math.cos(seed.angle + t * 0.6) * curRad,
        0.1 + progress * 2.3,
        Math.sin(seed.angle + t * 0.6) * curRad
      );
      sp.rotation.y += 0.05;
      sp.material.opacity = Math.sin(progress * Math.PI) * 0.85;
    });

    // 4. Type-Specific Dynamic Animations
    if (cfg.type === "heal") {
      subItemsRef.current.forEach((item, idx) => {
        if (!item) return;
        item.position.y = 0.6 + idx * 0.45 + Math.sin(t * 3 + idx) * 0.1;
        item.rotation.z += 0.03 * (idx % 2 === 0 ? 1 : -1);
        item.scale.setScalar(1 + Math.sin(t * 4 + idx) * 0.08);
      });
    } else if (cfg.type === "attackUp") {
      subItemsRef.current.forEach((item, idx) => {
        if (!item) return;
        const a = (idx / 4) * Math.PI * 2;
        const h = 0.3 + (((t * 0.8 + idx * 0.25) % 1) * 1.9);
        item.position.set(Math.cos(a) * 0.95, h, Math.sin(a) * 0.95);
        item.rotation.y += 0.04;
      });
      if (auraConeRef.current) {
        auraConeRef.current.rotation.y += 0.04;
        auraConeRef.current.scale.setScalar(1 + Math.sin(t * 6) * 0.06);
      }
    } else if (cfg.type === "speedUp") {
      subItemsRef.current.forEach((item, idx) => {
        if (!item) return;
        item.position.y = 0.45 + idx * 0.45;
        item.rotation.z -= 0.05 + idx * 0.02;
        item.scale.setScalar(1 + Math.sin(t * 5 + idx) * 0.08);
      });
    } else if (cfg.type === "invincible" || cfg.type === "revive") {
      if (haloRef.current) {
        haloRef.current.position.y = 2.45 + Math.sin(t * 3) * 0.08;
        haloRef.current.rotation.z += 0.03;
      }
    } else if (cfg.type === "shield") {
      subItemsRef.current.forEach((item, idx) => {
        if (!item) return;
        const a = t * 1.8 + (idx * Math.PI * 2) / 4;
        item.position.set(Math.cos(a) * 1.1, 1.0 + Math.sin(t * 2.5 + idx) * 0.15, Math.sin(a) * 1.1);
        item.rotation.y += 0.04;
      });
    } else if (cfg.type === "critUp") {
      subItemsRef.current.forEach((item, idx) => {
        if (!item) return;
        const a = t * 3.0 + (idx * Math.PI * 2) / 3;
        item.position.set(Math.cos(a) * 0.85, 1.1 + Math.sin(t * 4 + idx) * 0.12, Math.sin(a) * 0.85);
        item.rotation.y += 0.08;
      });
    } else if (cfg.type === "magicUp") {
      subItemsRef.current.forEach((item, idx) => {
        if (!item) return;
        const a = t * 1.6 + (idx * Math.PI * 2) / 5;
        item.position.set(Math.cos(a) * 1.05, 1.15 + Math.sin(t * 2 + idx) * 0.18, Math.sin(a) * 1.05);
        item.rotation.y += 0.03;
      });
    }
  });

  if (!cfg) return null;

  return (
    <group ref={groupRef}>
      {/* 1. Ground Cast Ring */}
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]} geometry={BUFF_RING_GEO}>
        <meshBasicMaterial color={cfg.ringColor} transparent opacity={0.85} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>

      {/* 2. Pulse Wireframe Sphere */}
      <mesh ref={sphereRef} position={[0, 1.05, 0]} geometry={BUFF_SPHERE_GEO}>
        <meshBasicMaterial color={cfg.color} wireframe transparent opacity={0.3} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>

      {/* 3. Rising Sparkle Particles */}
      {sparkSeeds.map((_, idx) => (
        <mesh key={`sp_${idx}`} ref={(el) => (sparksRef.current[idx] = el)} geometry={BUFF_SPARK_GEO}>
          <meshBasicMaterial color={cfg.sparkColor} transparent opacity={0.85} depthWrite={false} />
        </mesh>
      ))}

      {/* 4. Sub-Effect Geometries based on buff type */}
      {cfg.type === "heal" && (
        <group>
          {[0, 1].map((idx) => (
            <mesh key={`heal_${idx}`} ref={(el) => (subItemsRef.current[idx] = el)} rotation={[Math.PI / 2, 0, 0]} geometry={BUFF_TORUS_GEO}>
              <meshBasicMaterial color="#34d399" transparent opacity={0.7} depthWrite={false} />
            </mesh>
          ))}
        </group>
      )}

      {cfg.type === "attackUp" && (
        <group>
          {[0, 1, 2, 3].map((idx) => (
            <mesh key={`atk_${idx}`} ref={(el) => (subItemsRef.current[idx] = el)} geometry={BUFF_CONE_GEO}>
              <meshStandardMaterial color="#ef4444" emissive="#b91c1c" emissiveIntensity={2.0} flatShading />
            </mesh>
          ))}
          <mesh ref={auraConeRef} position={[0, 1.1, 0]} geometry={BUFF_AURA_CONE_GEO}>
            <meshBasicMaterial color="#ef4444" wireframe transparent opacity={0.18} blending={THREE.AdditiveBlending} depthWrite={false} />
          </mesh>
        </group>
      )}

      {cfg.type === "speedUp" && (
        <group>
          {[0, 1, 2].map((idx) => (
            <mesh key={`spd_${idx}`} ref={(el) => (subItemsRef.current[idx] = el)} rotation={[Math.PI / 2, 0, 0]} geometry={BUFF_TORUS_GEO}>
              <meshBasicMaterial color="#22d3ee" transparent opacity={0.65} depthWrite={false} />
            </mesh>
          ))}
        </group>
      )}

      {(cfg.type === "invincible" || cfg.type === "revive") && (
        <mesh ref={haloRef} rotation={[Math.PI / 2, 0, 0]} geometry={BUFF_HALO_GEO}>
          <meshStandardMaterial color="#fef08a" emissive="#eab308" emissiveIntensity={2.5} roughness={0.2} />
        </mesh>
      )}

      {cfg.type === "shield" && (
        <group>
          {[0, 1, 2, 3].map((idx) => (
            <mesh key={`shd_${idx}`} ref={(el) => (subItemsRef.current[idx] = el)} geometry={BUFF_OCTA_GEO}>
              <meshStandardMaterial color="#38bdf8" emissive="#0284c7" emissiveIntensity={1.8} flatShading />
            </mesh>
          ))}
        </group>
      )}

      {cfg.type === "critUp" && (
        <group>
          {[0, 1, 2].map((idx) => (
            <mesh key={`crt_${idx}`} ref={(el) => (subItemsRef.current[idx] = el)} geometry={BUFF_OCTA_GEO}>
              <meshStandardMaterial color="#f59e0b" emissive="#d97706" emissiveIntensity={2.2} flatShading />
            </mesh>
          ))}
        </group>
      )}

      {cfg.type === "magicUp" && (
        <group>
          {[0, 1, 2, 3, 4].map((idx) => (
            <mesh key={`mgc_${idx}`} ref={(el) => (subItemsRef.current[idx] = el)} geometry={BUFF_OCTA_GEO}>
              <meshStandardMaterial color="#c084fc" emissive="#9333ea" emissiveIntensity={2.2} flatShading />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
});

// ─── 5. SCENE SHAKE GROUP (SCREEN SHAKE ON HIT WITHOUT CONFLICTING ORBIT CONTROLS) ──
function SceneShakeGroup({ hitStop, children }) {
  const groupRef = useRef(null);
  const shakeTimeRef = useRef(0);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.elapsedTime;
    if (hitStop) {
      shakeTimeRef.current = t;
    }
    const shakeElapsed = t - shakeTimeRef.current;
    if (shakeElapsed < 0.25) {
      const amt = (1 - shakeElapsed / 0.25) * 0.25;
      groupRef.current.position.x = THREE.MathUtils.randFloatSpread(amt);
      groupRef.current.position.y = THREE.MathUtils.randFloatSpread(amt * 0.5);
    } else {
      groupRef.current.position.x = 0;
      groupRef.current.position.y = 0;
    }
  });

  return <group ref={groupRef}>{children}</group>;
}

// ─── 6. MAIN EXPORT: FULL MAGIC COMBAT 3D ARENA (INTERACTIVE ORBIT & ZOOM) ──
export default memo(function MagicCombat3dArena({
  player,
  monster,
  playerModelPath,
  monsterModelPath,
  attackAction,
  hitStop,
  playerFx,
  monsterFx,
  onSpellImpact,
  onMonsterImpact,
  onSpellComplete,
}) {
  const monsterGroupRef = useRef(null);

  return (
    <div className="absolute inset-0 w-full h-full pointer-events-auto select-none overflow-hidden">
      <Canvas
        frameloop="always"
        dpr={1}
        camera={{
          position: [0, 8.5, 12.8], // Closer cinematic perspective framing fighters and arena
          fov: 44,
          near: 0.1,
          far: 350,
        }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
          stencil: false,
          depth: true,
        }}
      >
        {/* Interactive Orbit & Zoom Controls */}
        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          minDistance={4}
          maxDistance={45}
          maxPolarAngle={Math.PI / 2 - 0.05}
          minPolarAngle={0.05}
          target={[0, 1.0, -0.5]}
        />

        {/* Natural Neutral Illumination for crisp character models & textures */}
        <ambientLight intensity={0.9} color="#ffffff" />
        <hemisphereLight args={[0xffffff, 0x333348, 2.0]} />
        <directionalLight
          position={[-6, 16, 8]}
          intensity={2.4}
          color="#ffffff"
          castShadow
          shadow-mapSize={[1024, 1024]}
        />
        <directionalLight position={[6, 10, -6]} intensity={1.2} color="#f8fafc" />
        <pointLight position={[0, 6, -8]} intensity={16} distance={30} decay={2} color="#8a4dff" />

        {/* Scene Objects wrapped in Hit Shake Group */}
        <SceneShakeGroup hitStop={hitStop}>
          {/* 1. Floating Island Base */}
          <FloatingIsland />

          {/* 2. Arena Stone Floor & Concentric Rings */}
          <ArenaFloorAndRings />

          {/* 3. Arcane Magic Circle & Glowing Runes */}
          <ArcaneMagicCircle />

          {/* 4. Back Portal with Spinning Dual Rings */}
          <BackPortal />

          {/* 5. Crystals, Trees, Rocks, Corner Obelisks, Background Floating Chunks */}
          <ArenaEnvironment />

          {/* 6. Cosmos Stars & Magical Orbiting Particles */}
          <CosmosAndParticles />

          {/* 7. Player 3D Character Group */}
          <group position={[-2.4, 0.10, 1.3]} rotation={[0, Math.PI * 0.68, 0]}>
            {/* Subtle Ground Ring */}
            <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} geometry={FIGHTER_BASE_RING_GEO}>
              <meshBasicMaterial color={player?.color || "#f59e0b"} transparent opacity={0.45} side={THREE.DoubleSide} />
            </mesh>

            {playerModelPath ? (
              <Suspense fallback={null}>
                <ModelObject
                  modelPath={playerModelPath}
                  targetHeight={1.9}
                  hitState={hitStop}
                  isCasting={attackAction?.active}
                />
              </Suspense>
            ) : (
              <group position={[0, 0, 0]}>
                <mesh position={[0, 0.7, 0]}>
                  <coneGeometry args={[0.45, 1.3, 6]} />
                  <meshStandardMaterial color={player?.color || "#f59e0b"} roughness={0.6} flatShading />
                </mesh>
                <mesh position={[0, 1.5, 0]}>
                  <icosahedronGeometry args={[0.32, 0]} />
                  <meshStandardMaterial color="#fef3c7" roughness={0.7} flatShading />
                </mesh>
                <mesh position={[0, 2.05, 0]} rotation={[0, 0, 0.12]}>
                  <coneGeometry args={[0.36, 0.85, 6]} />
                  <meshStandardMaterial color="#1e1b4b" roughness={0.6} flatShading />
                </mesh>
              </group>
            )}

            {/* Dynamic Buff & Support VFX */}
            <CharacterBuffVfx buffType={playerFx} />
          </group>

          {/* 8. Monster 3D Character Group */}
          <group ref={monsterGroupRef} position={[2.4, 0.10, -1.3]} rotation={[0, -Math.PI * 0.24, 0]}>
            {/* Subtle Ground Ring */}
            <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} geometry={FIGHTER_BASE_RING_GEO}>
              <meshBasicMaterial color="#ef4444" transparent opacity={0.45} side={THREE.DoubleSide} />
            </mesh>

            {monsterModelPath ? (
              <Suspense fallback={null}>
                <ModelObject
                  modelPath={monsterModelPath}
                  targetHeight={monster?.isBoss ? 2.3 : 1.9}
                  hitState={hitStop}
                  isCasting={false}
                />
              </Suspense>
            ) : (
              <group position={[0, 0, 0]}>
                <mesh position={[0, 0.75, 0]}>
                  <dodecahedronGeometry args={[0.65, 0]} />
                  <meshStandardMaterial color="#991b1b" roughness={0.6} flatShading />
                </mesh>
                <mesh position={[0, 1.45, 0]}>
                  <octahedronGeometry args={[0.42, 0]} />
                  <meshStandardMaterial color="#7f1d1d" roughness={0.5} flatShading />
                </mesh>
              </group>
            )}

            {/* Dynamic Buff & Support VFX for Monster */}
            <CharacterBuffVfx buffType={monsterFx} />
          </group>

          {/* 9. 2-Way Magic Combat VFX (Player Spell + Monster Counter Spell) */}
          <SpellVfxOrchestrator
            monster={monster}
            monsterGroupRef={monsterGroupRef}
            attackAction={attackAction}
            onPlayerImpact={onSpellImpact}
            onMonsterImpact={onMonsterImpact}
            onComplete={onSpellComplete}
          />
        </SceneShakeGroup>
      </Canvas>
    </div>
  );
});
