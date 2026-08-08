"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useAnimations, useGLTF } from "@react-three/drei";
import * as THREE from "three";

const MODEL_PATH = "/models/granfinalboss.glb";
const MODEL_SCALE = 0.009;

function BossScene() {
  const groupRef = useRef(null);
  const { scene, animations } = useGLTF(MODEL_PATH);
  const { actions } = useAnimations(animations, groupRef);

  useEffect(() => {
    const action = Object.values(actions || {})[0];
    if (!action) return undefined;

    action.reset().fadeIn(0.2).play();
    return () => action.fadeOut(0.2);
  }, [actions]);

  const normalizedScene = useMemo(() => {
    const clone = scene.clone();
    const bounds = new THREE.Box3().setFromObject(clone);
    const center = bounds.getCenter(new THREE.Vector3());

    clone.scale.setScalar(MODEL_SCALE);
    clone.position.set(
      -center.x * MODEL_SCALE,
      -bounds.min.y * MODEL_SCALE,
      -center.z * MODEL_SCALE
    );
    return clone;
  }, [scene]);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;

    const t = clock.elapsedTime;
    groupRef.current.position.y = Math.sin(t * 1.8) * 0.05;
    groupRef.current.rotation.y = Math.sin(t * 0.45) * 0.12;
  });

  return (
    <group ref={groupRef} position={[0, -0.75, 0]}>
      <primitive object={normalizedScene} />
    </group>
  );
}

export default function GrandFinalBossModalModel() {
  return (
    <Canvas
      shadows
      dpr={[1, 1.5]}
      camera={{ position: [0, 1.35, 3.8], fov: 38, near: 0.1, far: 20 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
    >
      <ambientLight intensity={1.5} color="#fef3c7" />
      <directionalLight position={[3, 5, 4]} intensity={2.8} color="#fff7ed" castShadow />
      <pointLight position={[-2, 1.5, 1]} intensity={2.2} color="#ef4444" />
      <pointLight position={[2, 1, -1]} intensity={1.8} color="#f59e0b" />
      <Suspense fallback={null}>
        <BossScene />
      </Suspense>
    </Canvas>
  );
}

useGLTF.preload(MODEL_PATH);
