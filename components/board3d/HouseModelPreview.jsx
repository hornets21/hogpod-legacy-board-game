"use client";

import React, { Suspense, useMemo, useRef, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

export const HOUSE_MODELS = {
  watrat: "/models/wartaurus.glb",
  plodfindr: "/models/podfindor.glb",
  anal: "/models/analyze.glb",
  slarf: "/models/sraraff.glb",
};

export const HOUSE_PREVIEW_SCALES = {
  watrat: 0.95,
  plodfindr: 1.2,
  anal: 1.45,
  slarf: 0.95,
};

class PreviewErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.warn("HouseModelPreview 3D error, showing fallback:", error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

function InnerHouseModel({ modelPath, scale = 1, autoRotate = true, floatAnim = true }) {
  const { scene } = useGLTF(modelPath);
  const groupRef = useRef(null);

  const clonedScene = useMemo(() => {
    const clone = scene.clone(true);
    const box = new THREE.Box3().setFromObject(clone);
    const center = box.getCenter(new THREE.Vector3());
    clone.position.set(-center.x, -box.min.y, -center.z);
    return clone;
  }, [scene]);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.elapsedTime;
    if (floatAnim) {
      groupRef.current.position.y = -0.92 + Math.sin(t * 1.4) * 0.035;
    }
    if (autoRotate) {
      groupRef.current.rotation.y = Math.sin(t * 0.5) * 0.35;
    }
  });

  return (
    <group ref={groupRef} position={[0, -0.92, 0]} rotation={[0, 0.1, 0]}>
      <primitive object={clonedScene} scale={[scale, scale, scale]} />
    </group>
  );
}

export default function HouseModelPreview({
  houseId,
  scale: customScale,
  autoRotate = true,
  floatAnim = true,
  fallbackImage = null,
  fallbackEmoji = null,
  className = "w-full h-full",
}) {
  const modelPath = HOUSE_MODELS[houseId];
  const scale = customScale || HOUSE_PREVIEW_SCALES[houseId] || 1.0;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fallbackView = (
    <div className="w-full h-full flex items-center justify-center">
      {fallbackImage ? (
        <img
          src={fallbackImage}
          alt={houseId}
          className="w-full h-full object-cover"
        />
      ) : (
        <span className="text-5xl">{fallbackEmoji || "🧙"}</span>
      )}
    </div>
  );

  if (!mounted || !modelPath) {
    return <div className={className}>{fallbackView}</div>;
  }

  return (
    <div className={`relative ${className}`}>
      <PreviewErrorBoundary fallback={fallbackView}>
        <Canvas
          camera={{ position: [0, 0.9, 4.2], fov: 46 }}
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: true }}
          style={{ width: "100%", height: "100%", pointerEvents: "none" }}
        >
          <ambientLight intensity={2.0} />
          <directionalLight position={[2, 4, 3]} intensity={3.0} color="#fff4d6" />
          <directionalLight position={[-3, 2, 2]} intensity={1.5} color="#8ab4ff" />
          <pointLight position={[0, 1.5, 1]} intensity={1.4} color="#f59e0b" />
          <Suspense fallback={null}>
            <InnerHouseModel
              modelPath={modelPath}
              scale={scale}
              autoRotate={autoRotate}
              floatAnim={floatAnim}
            />
          </Suspense>
        </Canvas>
      </PreviewErrorBoundary>
    </div>
  );
}

// Preload models for immediate display
if (typeof window !== "undefined") {
  Object.values(HOUSE_MODELS).forEach((path) => {
    try {
      useGLTF.preload(path);
    } catch (e) {
      // ignore
    }
  });
}
