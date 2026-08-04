"use client";

import React, { useRef } from "react";
import { useGLTF } from "@react-three/drei";

export default function DiceModel(props) {
  try {
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

    if (scene) {
      return (
        <group {...props} dispose={null}>
          <primitive object={scene} />
        </group>
      );
    }
  } catch (e) {
    // Fallback ถ้าโหลดไฟล์ .glb ไม่สำเร็จ
  }

  // Procedural Fallback 3D Cube (ลูกเต๋าสำรอง)
  return (
    <group {...props}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#f0b85b" roughness={0.3} metalness={0.2} />
      </mesh>
    </group>
  );
}
