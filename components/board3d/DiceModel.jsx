"use client";

import React, { useRef } from "react";
import { useGLTF } from "@react-three/drei";

export default function DiceModel(props) {
  const { nodes, materials } = useGLTF("/models/dice.glb");

  return (
    <group {...props} dispose={null}>
      {nodes.Cube && materials.phong1SG ? (
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.Cube.geometry}
          material={materials.phong1SG}
        />
      ) : null}
    </group>
  );
}

useGLTF.preload("/models/dice.glb");
