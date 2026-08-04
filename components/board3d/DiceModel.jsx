"use client";

import React, { useRef } from "react";
import { useGLTF } from "@react-three/drei";

export default function DiceModel(props) {
  const { scene, nodes, materials } = useGLTF("/models/dice.glb");

  if (nodes?.Cube && materials?.phong1SG) {
    return (
      <group {...props} dispose={null}>
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.Cube.geometry}
          material={materials.phong1SG}
        />
      </group>
    );
  }

  return (
    <group {...props} dispose={null}>
      <primitive object={scene} />
    </group>
  );
}

useGLTF.preload("/models/dice.glb");
