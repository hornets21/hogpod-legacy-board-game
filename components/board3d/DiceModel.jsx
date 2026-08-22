"use client";

import React, { useMemo } from "react";
import { useGLTF } from "@react-three/drei";

export default function DiceModel(props) {
  let scene = null;
  try {
    const gltf = useGLTF("/models/dice.glb");
    scene = gltf.scene;
  } catch (e) {
    scene = null;
  }

  const clonedScene = useMemo(() => (scene ? scene.clone() : null), [scene]);

  if (!clonedScene) {
    return (
      <group {...props} dispose={null}>
        <mesh>
          <boxGeometry args={[1.2, 1.2, 1.2]} />
          <meshStandardMaterial color="#d97706" roughness={0.3} metalness={0.6} />
        </mesh>
      </group>
    );
  }

  return (
    <group {...props} dispose={null}>
      <primitive object={clonedScene} />
    </group>
  );
}

useGLTF.preload("/models/dice.glb");
