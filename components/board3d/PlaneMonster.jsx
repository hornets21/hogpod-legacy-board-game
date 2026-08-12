"use client";

// ============================================================
// PlaneMonster — 2D Image on 3D PlaneGeometry + MeshBasicMaterial
// ใช้ PlaneGeometry สี่เหลี่ยมระนาบตรง + Texture PNG ใส
// หันหน้าเข้าหากล้องเสมอ (Billboard Effect) คมชัด 100% ไร้ขอบหนา
// ============================================================

import React, { useMemo, useRef } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import * as THREE from "three";
import { cellToWorld } from "@/lib/boardLayout";

// โหลด Texture พร้อมป้อน Fallback กรณีหาไฟล์รูปไม่พบ
function useMonsterTexture(imagePath) {
  const defaultPath = "/images/monsters/ชบ7000.webp";
  const validPath = imagePath || defaultPath;
  
  try {
    return useLoader(THREE.TextureLoader, validPath);
  } catch (err) {
    return useLoader(THREE.TextureLoader, defaultPath);
  }
}

const PlaneMonster = React.memo(function PlaneMonster({ cell, imagePath, isBoss = false, isDefeated = false }) {
  const meshRef = useRef(null);
  const shadowRef = useRef(null);
  const opacityRef = useRef(1);

  // ป้องกัน Error กรณีรูปภาพไม่มีในเครื่อง ให้ Fallback ไปยังรูปที่มีแน่นอนเสมอ
  const texture = useMonsterTexture(imagePath);

  // ปรับการตั้งค่า Texture ให้คมชัดสูง
  useMemo(() => {
    if (texture) {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
    }
  }, [texture]);

  const [x, , z] = cellToWorld(cell);
  const width = isBoss ? 1.0 : 0.65;
  const height = isBoss ? 1.0 : 0.65;
  const baseY = height / 2 + 0.2; // วางฐานล่างแตะพื้นพอดี

  useFrame(({ clock, camera }, dt) => {
    if (meshRef.current) {
      const t = clock.elapsedTime;
      
      // อนิเมชันเมื่อมอนสเตอร์ตาย (สลายและจางหายไป)
      if (isDefeated) {
        opacityRef.current = Math.max(0, opacityRef.current - dt * 1.5);
        meshRef.current.position.y += dt * 0.8;
        meshRef.current.scale.x *= 0.98;
        meshRef.current.scale.y *= 0.98;
        if (meshRef.current.material) {
          meshRef.current.material.opacity = opacityRef.current;
        }
        if (shadowRef.current && shadowRef.current.material) {
          shadowRef.current.material.opacity = opacityRef.current * 0.45;
        }
        return;
      }

      // อนิเมชันลอยขยับนุ่มนวลปกติ
      const hoverY = baseY + Math.sin(t * 2.2 + cell * 1.5) * 0.05;
      meshRef.current.position.y = hoverY;

      // หันหน้าPlane เข้าหากล้องตลอดเวลา (Billboard Effect)
      meshRef.current.quaternion.copy(camera.quaternion);

      // ปรับขนาดเงาใต้มอนสเตอร์
      if (shadowRef.current) {
        const shadowScale = 0.4 - (hoverY - baseY) * 0.5;
        shadowRef.current.scale.set(shadowScale, shadowScale, 1);
        shadowRef.current.material.opacity = 0.45 - (hoverY - baseY) * 0.6;
      }
    }
  });

  return (
    <group position={[x, 0, z]}>
      {/* 1. เงาสีดำรูปวงกลมบนพื้นหิน */}
      <mesh
        ref={shadowRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.18, 0]}
      >
        <planeGeometry args={[0.7, 0.7]} />
        <meshBasicMaterial
          color="#000000"
          transparent
          opacity={0.45}
          depthWrite={false}
        />
      </mesh>

      {/* 2. PlaneGeometry + MeshBasicMaterial แสดงรูปภาพ 2D แนวตั้งใส */}
      <mesh ref={meshRef} position={[0, baseY, 0]}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial
          map={texture}
          transparent={true}
          alphaTest={0.05} // ตัดขอบใสเนียนตา
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
});

export default PlaneMonster;
