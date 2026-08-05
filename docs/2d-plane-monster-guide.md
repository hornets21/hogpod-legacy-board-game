# 2D Image in 3D Board Standard Guide

คู่มือมาตรฐานการนำภาพ 2D (PNG/WEBP) มาแสดงผลเป็นวัตถุ 3D บนกระดานด้วยเทคนิค **PlaneGeometry + MeshBasicMaterial (Billboard)**

---

## 📌 WHY THIS APPROACH? (ทำไมถึงใช้วิธีนี้?)
- **คมชัด 100%**: ไม่เจอปัญหาขอบหนา ภาพซ้อน หรือภาพกลายเป็นแท่งจากการ Extrude 3D
- **ประมวลผลเร็วมาก**: ไม่กินสเปกการ์ดจอ คอมพิวเตอร์หรืออุปกรณ์สเปกต่ำรันได้ลื่นไหล
- **Billboard Effect**: ภาพจะหันหน้าเข้าหากล้องเสมอในมุมมอง 3D สไตล์เกม 2.5D (Paper Mario / Ragnarok)

---

## 📂 FILE LOCATION & NAMING CONVENTION

1. **ตำแหน่งเก็บรูปภาพ:**
   `public/images/monsters/`
2. **รูปแบบไฟล์ที่รองรับ:**
   `.png` หรือ `.webp` (ต้องเป็นภาพที่ **ไดคัทตัดพื้นหลังใส** เรียบร้อยแล้ว)

---

## 🛠️ HOW TO ADD NEW MONSTERS (วิธีเพิ่มมอนสเตอร์ตัวใหม่)

### Step 1: วางไฟล์ภาพ 2D
นำไฟล์รูปมอนสเตอร์ตัดพื้นหลังใสไปวางไว้ที่:
`public/images/monsters/your_monster_name.png`

### Step 2: ผูกข้อมูลใน `lib/gameData.js`
เพิ่มหรือแก้ไขข้อมูลมอนสเตอร์ใน `MONSTERS` array โดยใส่ฟิลด์ `image`:

```javascript
export const MONSTERS = [
  {
    id: "your_monster_id",
    name: "ชื่อมอนสเตอร์",
    nameEn: "Monster Name",
    cell: 15, // เลขช่องบนกระดาน
    hp: 100,
    dmg: 10,
    emoji: "👾",
    image: "/images/monsters/your_monster_name.png" // 👈 ใส่ path รูปภาพตรงนี้
  },
];
```

---

## 💻 COMPONENT ARCHITECTURE (`components/board3d/PlaneMonster.jsx`)

```jsx
import { useMemo, useRef } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import * as THREE from "three";
import { cellToWorld } from "@/lib/boardLayout";

export default function PlaneMonster({ cell, imagePath, isBoss = false }) {
  const meshRef = useRef(null);
  
  // Fallback ป้องกัน Error หากหาไฟล์ไม่เจอ
  const validPath = imagePath || "/images/monsters/ชบ7000.webp";
  const texture = useLoader(THREE.TextureLoader, validPath);

  // หันหน้าเข้าหากล้องตลอดเวลา (Billboard Effect)
  useFrame(({ camera }) => {
    if (meshRef.current) {
      meshRef.current.quaternion.copy(camera.quaternion);
    }
  });

  return (
    <mesh ref={meshRef} position={[x, baseY, z]}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial
        map={texture}
        transparent={true}
        alphaTest={0.05}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
```

---

> **Note:** หากไม่ระบุรูปภาพมอนสเตอร์ ระบบจะใช้ภาพสำรอง `/images/monsters/ชบ7000.webp` แสดงผลอัตโนมัติเพื่อป้องกันระบบค้าง!
