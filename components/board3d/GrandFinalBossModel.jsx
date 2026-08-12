"use client";

import React, { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useAnimations, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { cellToWorld } from "@/lib/boardLayout";

const MODEL_PATH = "/models/granfinalboss.glb";
const MODEL_SCALE = 0.009;

const GrandFinalBossModel = React.memo(function GrandFinalBossModel({ cell = 90 }) {
  const groupRef = useRef(null);
  const auraRef = useRef(null);
  const { scene, animations } = useGLTF(MODEL_PATH);
  const [x, , z] = cellToWorld(cell);
  const { actions } = useAnimations(animations, groupRef);

  useEffect(() => {
    const nativeAction = Object.values(actions || {})[0];
    if (!nativeAction) return undefined;

    nativeAction.reset().fadeIn(0.25).play();
    return () => nativeAction.fadeOut(0.25);
  }, [actions]);

  const normalizedScene = useMemo(() => {
    const clone = scene.clone();
    const bounds = new THREE.Box3().setFromObject(clone);
    const center = bounds.getCenter(new THREE.Vector3());

    // The source model is roughly 170 units tall; normalize it to board scale.
    // Apply the centering offset in the model's scaled coordinate space.
    clone.scale.setScalar(MODEL_SCALE);
    clone.position.set(
      -center.x * MODEL_SCALE,
      -bounds.min.y * MODEL_SCALE,
      -center.z * MODEL_SCALE
    );
    return clone;
  }, [scene]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (groupRef.current) {
      // Meshy clips take over the model pose when present; this only adds a subtle
      // stage hover and remains the fallback motion for a static GLB export.
      groupRef.current.position.y = 0.5 + Math.sin(t * 1.8) * 0.055;
      groupRef.current.rotation.y = Math.sin(t * 0.45) * 0.12;
    }
    if (auraRef.current) {
      auraRef.current.rotation.z = t * 0.65;
      auraRef.current.material.opacity = 0.38 + Math.sin(t * 2.4) * 0.12;
    }
  });

  return (
    <group position={[x, 0, z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.52, 0]}>
        <circleGeometry args={[0.42, 48]} />
        <meshBasicMaterial color="#7f1d1d" transparent opacity={0.28} depthWrite={false} />
      </mesh>
      <mesh ref={auraRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.535, 0]}>
        <ringGeometry args={[0.38, 0.46, 48]} />
        <meshBasicMaterial
          color="#f59e0b"
          transparent
          opacity={0.42}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <group ref={groupRef}>
        <primitive object={normalizedScene} />
      </group>
    </group>
  );
});

export default GrandFinalBossModel;

useGLTF.preload(MODEL_PATH);
