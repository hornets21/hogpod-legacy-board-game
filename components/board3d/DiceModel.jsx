"use client";

import React, { useMemo } from "react";
import { useGLTF } from "@react-three/drei";

export default function DiceModel(props) {
  const { scene } = useGLTF("/models/dice.glb");
  const clonedScene = useMemo(() => scene.clone(), [scene]);

  return (
    <group {...props} dispose={null}>
      <primitive object={clonedScene} />
    </group>
  );
}

useGLTF.preload("/models/dice.glb");
