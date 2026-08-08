"use client";

import { Suspense, useMemo } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { useEffect } from "react";

const NPC_MODEL_PATHS = {
  skill_trainer: "/models/npc_skills.glb",
  pet_trainer: "/models/npc_animal.glb",
  doctor: "/models/npc_docter.glb",
};

function PreviewModel({ modelPath }) {
  const { scene } = useGLTF(modelPath);
  const clonedScene = useMemo(() => {
    const clone = scene.clone();
    const box = new THREE.Box3().setFromObject(clone);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    // Give the NPC enough headroom to read its face and silhouette. The old
    // value made the model look like a tiny object inside the preview card.
    const targetHeight = 2.35;
    const scale = size.y > 0 ? targetHeight / size.y : 1;

    clone.scale.setScalar(scale);
    clone.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);
    return clone;
  }, [scene]);

  return <primitive object={clonedScene} />;
}

function PreviewFallback({ color }) {
  return (
    <mesh position={[0, 0.8, 0]}>
      <octahedronGeometry args={[0.48]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.2} />
    </mesh>
  );
}

function PreviewCameraTarget() {
  const { camera } = useThree();

  useEffect(() => {
    // The models are framed from the floor up. Looking at the origin clips
    // their faces after normalization, so aim at the upper body instead.
    camera.lookAt(0, 1.15, 0);
    camera.updateProjectionMatrix();
  }, [camera]);

  return null;
}

export default function NpcModelPreview({ npcId, color = "#f0b85b" }) {
  const modelPath = NPC_MODEL_PATHS[npcId];
  if (!modelPath) return null;

  return (
    <div className="npc-model-preview relative h-64 w-full overflow-hidden rounded-2xl border border-white/10">
      <Canvas camera={{ position: [0, 1.25, 4.25], fov: 38 }} dpr={[1, 1.5]}>
        <PreviewCameraTarget />
        <ambientLight intensity={1.8} />
        <directionalLight position={[3, 5, 4]} intensity={2.2} color="#fff" />
        <pointLight position={[-2, 1.5, 1]} intensity={2} color={color} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
          <circleGeometry args={[1.25, 40]} />
          <meshBasicMaterial color={color} transparent opacity={0.1} />
        </mesh>
        <Suspense fallback={<PreviewFallback color={color} />}>
          {/* The NPC assets already face the preview camera (+Z). */}
          <group rotation={[0, 0, 0]}>
            <PreviewModel modelPath={modelPath} />
          </group>
        </Suspense>
      </Canvas>
    </div>
  );
}

Object.values(NPC_MODEL_PATHS).forEach((path) => useGLTF.preload(path));
