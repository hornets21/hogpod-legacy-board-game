"use client";

// ============================================================
// AnimatedMonster — Component แสดงมอนสเตอร์แบบ 8-frame Sprite Animation
// ทั้งบนกระดาน 3D (PlaneGeometry Billboard) และ 2D UI (HTML img)
// ============================================================

import { useState, useEffect, useMemo, useRef } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import * as THREE from "three";
import { cellToWorld } from "@/lib/boardLayout";

/**
 * 3D Cutout Sprite Monster Component สำหรับ Render บนกระดาน 3D
 * แสดงผลภาพ 2D Cutout ใส คมชัด 100% ไร้ขอบดำ พร้อมมิติความหนาจากแสงและเงา (Clean Cutout + Dynamic Shadow)
 */
export function AnimatedPlaneMonster({
  cell,
  frames = [],
  fps = 8,
  isBoss = false,
  isDefeated = false,
  fallbackImage = "/images/monsters/ชบ7000.webp",
}) {
  const meshRef = useRef(null);
  const shadowRef = useRef(null);

  const opacityRef = useRef(1);
  const frameIndexRef = useRef(0);

  // กำหนดไฟล์รูปภาพตามเฟรมปัจจุบัน หรือ fallback หากไม่มีเฟรม
  const validFrames = useMemo(() => {
    if (Array.isArray(frames) && frames.length > 0) {
      return frames;
    }
    return [fallbackImage];
  }, [frames, fallbackImage]);

  // Preload textures ทั้งหมดของมอนสเตอร์ตัวนี้
  const textures = useLoader(THREE.TextureLoader, validFrames);

  const textureList = useMemo(() => {
    const list = Array.isArray(textures) ? textures : [textures];
    list.forEach((tex) => {
      if (tex) {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
      }
    });
    return list;
  }, [textures]);

  const [x, , z] = cellToWorld(cell);
  const width = isBoss ? 1.0 : 0.75;
  const height = isBoss ? 1.0 : 0.75;
  const baseY = height / 2 + 0.15;

  const matRef = useRef(null);

  useFrame(({ clock, camera }, dt) => {
    // 1. Sprite Frame Animation Loop
    if (textureList.length > 1) {
      frameIndexRef.current = (frameIndexRef.current + dt * fps) % textureList.length;
      const nextIndex = Math.floor(frameIndexRef.current);
      if (matRef.current && textureList[nextIndex]) {
        matRef.current.map = textureList[nextIndex];
        matRef.current.needsUpdate = true;
      }
    }

    if (meshRef.current) {
      const t = clock.elapsedTime;

      // 2. Defeated Animation
      if (isDefeated) {
        opacityRef.current = Math.max(0, opacityRef.current - dt * 1.5);
        meshRef.current.position.y += dt * 0.8;
        meshRef.current.scale.x *= 0.98;
        meshRef.current.scale.y *= 0.98;
        if (meshRef.current.material) meshRef.current.material.opacity = opacityRef.current;
        if (shadowRef.current?.material) shadowRef.current.material.opacity = opacityRef.current * 0.45;
        return;
      }

      // 3. Hovering Animation
      const hoverY = baseY + Math.sin(t * 2.2 + cell * 1.5) * 0.05;
      meshRef.current.position.y = hoverY;

      // 4. Billboard Effect (หันหน้าเข้าหากล้อง)
      meshRef.current.quaternion.copy(camera.quaternion);

      // 5. Dynamic Shadow (เงาตามระดับการลอย)
      if (shadowRef.current) {
        const shadowScale = 0.45 - (hoverY - baseY) * 0.5;
        shadowRef.current.scale.set(shadowScale, shadowScale, 1);
        shadowRef.current.material.opacity = 0.45 - (hoverY - baseY) * 0.6;
      }
    }
  });

  return (
    <group position={[x, 0, z]}>
      {/* 1. เงาสีดำรูปวงกลมบนพื้นหิน */}
      <mesh ref={shadowRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.18, 0]}>
        <planeGeometry args={[0.7, 0.7]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.45} depthWrite={false} />
      </mesh>

      {/* 2. Plane Cutout Mesh — แสดงรูป 2D ใสตามรอยไดคัท สะอาดคมชัด ไร้ขอบทึบ/ขอบดำ 100% */}
      <mesh ref={meshRef} position={[0, baseY, 0]}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial
          ref={matRef}
          map={textureList[0]}
          transparent={true}
          alphaTest={0.05} // ตัดส่วนโปร่งใสออกเนียนตา ไม่เห็นขอบสี่เหลี่ยมดำ
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

/**
 * 2D UI Animated Monster Image สำหรับแสดงใน HTML Modal / Combat / UI Cards
 */
export function AnimatedUiMonster({
  frames = [],
  fallbackImage = "/images/monsters/ชบ7000.webp",
  fps = 8,
  alt = "Monster",
  className = "w-full h-full object-cover",
}) {
  const [frameIndex, setFrameIndex] = useState(0);

  const validFrames = useMemo(() => {
    if (Array.isArray(frames) && frames.length > 0) {
      return frames;
    }
    return [fallbackImage];
  }, [frames, fallbackImage]);

  useEffect(() => {
    if (validFrames.length <= 1) return;

    const intervalMs = 1000 / fps;
    const timer = setInterval(() => {
      setFrameIndex((prev) => (prev + 1) % validFrames.length);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [validFrames, fps]);

  const currentSrc = validFrames[frameIndex] || fallbackImage;

  return (
    <img
      src={currentSrc}
      alt={alt}
      className={className}
      onError={(e) => {
        e.currentTarget.onerror = null;
        e.currentTarget.src = fallbackImage;
      }}
    />
  );
}
