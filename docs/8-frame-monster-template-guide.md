# 8-Frame Animated Monster & 3D Battle Arena Template Guide

คู่มือมาตรฐานสำหรับการเพิ่มมอนสเตอร์อนิเมชันแบบ 8 Frame (หรือ N-Frame Animated Sprites) และระบบฉากประลองยุทธ์ 3D In-World Camera Zoom Focus

---

## 📂 1. การจัดวางโฟลเดอร์และไฟล์ภาพ (Directory Structure)

สร้างโฟลเดอร์ตาม **Monster ID** ไว้ในโฟลเดอร์ประเภทมอนสเตอร์ (`common`, `elite`, `boss`, `secret`, `events`):

```text
public/
  images/
    monsters/
      common/
        nong_cake/
          frame_01.webp
          frame_02.webp
          frame_03.webp
          frame_04.webp
          frame_05.webp
          frame_06.webp
          frame_07.webp
          frame_08.webp
        cake_monster.jpg  (รูป 3D ภาพนิ่ง Fallback)
```

> **ข้อแนะนำ:**
> - ลำดับชื่อไฟล์แนะนำให้ใช้ `frame_01.webp` ถึง `frame_08.webp` (หรือ `.png`, `.jpg`)
> - หากต้องการเน้นความคมชัด 2.5D แบบเนียนตา ควรใช้ไฟล์รูปภาพที่ **ตัดพื้นหลังใส (Alpha Cutout)**

---

## ⚙️ 2. การประกาศข้อมูลมอนสเตอร์ใน `lib/gameData/monsters.js`

เพิ่ม Array `frames` และระบุ `fps` (ความเร็วเฟรมต่อวินาที เช่น 8) ในวัตถุมอนสเตอร์:

```javascript
export const MONSTERS = [
  {
    id: "nong_cake",
    name: "น้องเค้ก",
    nameEn: "Nong Cake",
    cell: 8,
    hp: 30,
    dmg: 2,
    image: "/images/monsters/common/cake_monster.jpg", // รูป 3D fallback
    frames: [
      "/images/monsters/common/nong_cake/frame_01.webp",
      "/images/monsters/common/nong_cake/frame_02.webp",
      "/images/monsters/common/nong_cake/frame_03.webp",
      "/images/monsters/common/nong_cake/frame_04.webp",
      "/images/monsters/common/nong_cake/frame_05.webp",
      "/images/monsters/common/nong_cake/frame_06.webp",
      "/images/monsters/common/nong_cake/frame_07.webp",
      "/images/monsters/common/nong_cake/frame_08.webp",
    ],
    fps: 8, // กำหนดความเร็วในการเล่นอนิเมชัน (Default คือ 8 FPS)
  },
];
```

---

## 🎥 3. การทำงานของระบบ 3D In-World Camera Zoom Focus & Component Architecture

1. **`AnimatedPlaneMonster` ([`AnimatedMonster.jsx`](file:///C:/project/podBoardGame/components/board3d/AnimatedMonster.jsx))**:
   - **Clean Cutout Material**: แสดงผลด้วย PlaneGeometry ไร้ขอบดำ ควบคู่กับ Dynamic Shadow ใต้ฐานมอนสเตอร์
   - **Billboard Effect**: หันหน้าเข้าหากล้อง 3D ตลอดเวลา สลับ Texture ตาม FPS ลื่นไหล
2. **`CameraRig` ([`BoardCanvas.jsx`](file:///C:/project/podBoardGame/components/board3d/BoardCanvas.jsx#L170-L188))**:
   - **In-World Camera Zoom Focus**: เมื่อเข้าสู่ฉากการต่อสู้ กล้อง Three.js จะซูมและแพนภาพโฉบลงไปที่พิกัดช่องต่อสู้ 3D บนกระดานจริง
3. **`AnimatedUiMonster` ([`AnimatedMonster.jsx`](file:///C:/project/podBoardGame/components/board3d/AnimatedMonster.jsx#L130-L170))**:
   - สำหรับแสดงผลรูปภาพอนิเมชัน 8 เฟรมใน UI หน้าต่างต่อสู้ ([`CombatModal.jsx`](file:///C:/project/podBoardGame/components/CombatModal.jsx) / [`PvpCombatModal.jsx`](file:///C:/project/podBoardGame/components/PvpCombatModal.jsx))

---

## 🚀 Template สรุปสั้นสำหรับมอนสเตอร์ตัวใหม่ (Copy & Paste)

```javascript
  {
    id: "YOUR_MONSTER_ID",
    name: "ชื่อมอนสเตอร์",
    nameEn: "Monster Name",
    cell: 10,
    hp: 50,
    dmg: 5,
    image: "/images/monsters/common/YOUR_FALLBACK.jpg",
    frames: Array.from({ length: 8 }, (_, i) => 
      `/images/monsters/common/YOUR_MONSTER_ID/frame_0${i + 1}.webp`
    ),
    fps: 8,
  },
```

