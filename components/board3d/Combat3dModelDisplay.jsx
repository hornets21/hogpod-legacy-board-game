"use client";

import React, { Suspense, useMemo, useRef, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, useAnimations } from "@react-three/drei";
import * as THREE from "three";

// === Shared Module-Level Geometries (Zero GC) ===
const PEDESTAL_RING_GEO = new THREE.RingGeometry(0.7, 0.98, 32);
const PEDESTAL_TORUS_GEO = new THREE.TorusGeometry(0.55, 0.03, 8, 28);
const SPARK_GEO = new THREE.SphereGeometry(1, 8, 8); // Scaled dynamically on mesh
const LIGHTNING_GEO = new THREE.CylinderGeometry(0.08, 0.15, 3.2, 8);
const SHIELD_GEO = new THREE.SphereGeometry(1.1, 20, 20);
const FIRE_GEO = new THREE.SphereGeometry(0.6, 16, 16);
const IMPACT_RING_GEO = new THREE.RingGeometry(0.3, 0.8, 32);

// Pre-defined model mappings
export const HOUSE_MODELS = {
  watrat: "/models/wartaurus.glb",
  plodfindr: "/models/podfindor.glb",
  anal: "/models/analyze.glb",
  slarf: "/models/sraraff.glb",
};

export const MONSTER_MODELS = {
  grand_boss: "/models/granfinalboss.glb",
  bai_sung: "/models/bai_sung.glb",
  daimon: "/models/diamon_dog.glb",
  p_a_akatsuki: "/models/p_a_กระเทยแสงอุษา.glb",
};

class ModelErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.warn("3D Model load error, falling back to 2D image:", error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

function ModelMesh({ modelPath, targetHeight = 2.1, hitState }) {
  const groupRef = useRef(null);
  const { scene, animations } = useGLTF(modelPath);
  const { actions } = useAnimations(animations, groupRef);

  useEffect(() => {
    const action = Object.values(actions || {})[0];
    if (!action) return undefined;

    action.reset().fadeIn(0.2).play();
    return () => {
      try {
        action.fadeOut(0.2);
      } catch (e) {
        // ignore fadeOut error on unmount
      }
    };
  }, [actions]);

  const normalizedScene = useMemo(() => {
    const clone = scene.clone();
    const bounds = new THREE.Box3().setFromObject(clone);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());

    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = maxDim > 0 ? targetHeight / maxDim : 1;

    clone.scale.setScalar(scale);
    clone.position.set(
      -center.x * scale,
      -bounds.min.y * scale,
      -center.z * scale
    );
    return clone;
  }, [scene, targetHeight]);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.elapsedTime;
    // Animation float + hit shake
    const shake = hitState ? Math.sin(t * 35) * 0.08 : 0;
    groupRef.current.position.y = -1.0 + Math.sin(t * 1.8) * 0.04;
    groupRef.current.position.x = shake;
    groupRef.current.rotation.y = Math.sin(t * 0.45) * 0.25;
  });

  return (
    <group ref={groupRef} position={[0, -1.0, 0]}>
      <primitive object={normalizedScene} />
    </group>
  );
}

function CameraTarget() {
  const { camera } = useThree();

  useEffect(() => {
    camera.lookAt(0, 0.05, 0);
    camera.updateProjectionMatrix();
  }, [camera]);

  return null;
}

// ─── 🔮 3D MAGIC PEDESTAL (แท่นวงเวท 3D หมุนใต้โมเดล) ──────────────
const GroundMagicPedestal = React.memo(function GroundMagicPedestal({ color = "#ef4444" }) {
  const outerRingRef = useRef(null);
  const innerRingRef = useRef(null);

  const sparkles = useMemo(() => {
    return Array.from({ length: 8 }, (_, i) => ({
      id: i,
      angle: (i / 8) * Math.PI * 2,
      radius: 0.35 + (i % 3) * 0.2,
      speed: 1.2 + (i % 3) * 0.4,
      size: 0.04 + (i % 3) * 0.02,
    }));
  }, []);

  const sparkRefs = useRef([]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (outerRingRef.current) outerRingRef.current.rotation.z = t * 1.2;
    if (innerRingRef.current) innerRingRef.current.rotation.z = -t * 1.8;

    sparkRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const sp = sparkles[i];
      const pk = (t * sp.speed * 0.5) % 1;
      mesh.position.y = -1.0 + pk * 2.0;
      mesh.position.x = Math.cos(sp.angle + t) * sp.radius;
      mesh.position.z = Math.sin(sp.angle + t) * sp.radius;
      if (mesh.material) mesh.material.opacity = Math.sin(pk * Math.PI) * 0.8;
    });
  });

  return (
    <group position={[0, 0, 0]}>
      {/* Outer Rune Ring */}
      <mesh ref={outerRingRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.04, 0]} geometry={PEDESTAL_RING_GEO}>
        <meshBasicMaterial color={color} transparent opacity={0.65} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>

      {/* Inner Torus Ring */}
      <mesh ref={innerRingRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.03, 0]} geometry={PEDESTAL_TORUS_GEO}>
        <meshBasicMaterial color="#ffffff" transparent opacity={0.7} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>

      {/* Upward sparkles */}
      {sparkles.map((sp, i) => (
        <mesh key={sp.id} ref={(el) => (sparkRefs.current[i] = el)} geometry={SPARK_GEO} scale={sp.size}>
          <meshBasicMaterial color={color} transparent opacity={0.8} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
});

// ─── ✨ COMBAT SPELL FX OVERLAY ────────────────────────────
const CombatFxOverlay = React.memo(function CombatFxOverlay({ activeFx, color }) {
  const startRef = useRef(null);
  const meshRef = useRef(null);

  useFrame(({ clock }) => {
    if (startRef.current === null) startRef.current = clock.elapsedTime;
    const t = clock.elapsedTime - startRef.current;
    const k = Math.min(1, t / 1.2);
    const fade = Math.sin(k * Math.PI);

    if (meshRef.current) {
      if (activeFx === "shield") {
        meshRef.current.rotation.y = t * 2;
        meshRef.current.scale.setScalar(1.0 + Math.sin(t * 6) * 0.05);
        if (meshRef.current.material) meshRef.current.material.opacity = 0.55;
      } else if (activeFx === "lightning") {
        const jitter = (Math.random() - 0.5) * 0.06;
        meshRef.current.position.x = jitter;
        if (meshRef.current.material) meshRef.current.material.opacity = (1 - k) * (Math.random() > 0.3 ? 0.95 : 0.2);
      } else {
        const s = 0.3 + k * 2.2;
        meshRef.current.scale.set(s, s, s);
        if (meshRef.current.material) meshRef.current.material.opacity = fade * 0.9;
      }
    }
  });

  if (!activeFx) return null;

  switch (activeFx) {
    case "lightning":
      return (
        <mesh ref={meshRef} position={[0, 0.5, 0]} geometry={LIGHTNING_GEO}>
          <meshBasicMaterial color="#fef08a" transparent opacity={0.95} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      );
    case "shield":
      return (
        <mesh ref={meshRef} position={[0, 0.1, 0]} geometry={SHIELD_GEO}>
          <meshBasicMaterial color="#3b82f6" transparent opacity={0.5} wireframe blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      );
    case "fire":
      return (
        <mesh ref={meshRef} position={[0, 0, 0]} geometry={FIRE_GEO}>
          <meshBasicMaterial color="#f97316" transparent opacity={0.9} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      );
    default:
      return (
        <mesh ref={meshRef} position={[0, -0.9, 0]} rotation={[-Math.PI / 2, 0, 0]} geometry={IMPACT_RING_GEO}>
          <meshBasicMaterial color={color || "#fbbf24"} transparent opacity={0.9} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      );
  }
});

// ─── MAIN DISPLAY COMPONENT ────────────────────────────────
const Combat3dModelDisplay = React.memo(function Combat3dModelDisplay({ modelPath, color = "#ef4444", activeFx = null, hitState = false, fallback }) {
  if (!modelPath) return fallback;

  return (
    <ModelErrorBoundary fallback={fallback}>
      <div className="w-full h-full relative flex items-center justify-center">
        <Canvas
          shadows
          dpr={[1, 1.5]}
          camera={{ position: [0, 0.5, 3.8], fov: 38, near: 0.1, far: 20 }}
          gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        >
          <CameraTarget />
          <ambientLight intensity={1.8} color="#ffffff" />
          <directionalLight position={[3, 5, 4]} intensity={2.8} color="#ffffff" castShadow />
          <pointLight position={[-2, 1.5, 1]} intensity={2.0} color={color} />
          <pointLight position={[2, 1, -1]} intensity={1.5} color="#f59e0b" />

          {/* 🔮 Ground Magic Pedestal */}
          <GroundMagicPedestal color={color} />

          {/* ✨ Active Spell / Impact FX Overlay */}
          <CombatFxOverlay key={activeFx} activeFx={activeFx} color={color} />

          <Suspense fallback={fallback}>
            <ModelMesh modelPath={modelPath} hitState={hitState} />
          </Suspense>
        </Canvas>
      </div>
    </ModelErrorBoundary>
  );
});

export default Combat3dModelDisplay;

// Preload models into useGLTF cache
const ALL_PRELOAD_MODELS = [
  ...Object.values(HOUSE_MODELS),
  ...Object.values(MONSTER_MODELS),
];
ALL_PRELOAD_MODELS.forEach((path) => {
  try {
    useGLTF.preload(path);
  } catch (e) {
    // ignore
  }
});

