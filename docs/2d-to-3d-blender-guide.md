# 2D Image to 3D Model Conversion Guide (Blender)

คู่มือแปลงภาพ 2D (PNG) เป็นโมเดล 3D (`.glb`) สำหรับนำมาใช้ในโปรเจกต์บอร์ดเกม โดยใช้โปรแกรม **Blender** (ฟรี 100% ไม่ต้องใช้การ์ดจอแรง)

---

## 🛠️ REQUIREMENTS
- **Blender**: โหลดฟรีจาก [blender.org](https://www.blender.org/) (รองรับทุกระบบปฏิบัติการ/การ์ดจอออนบอร์ดทำได้สบาย)
- **ภาพ 2D**: ไฟล์ PNG ที่ไดคัทพื้นหลังใสเรียบร้อยแล้ว

---

## 📌 STEP-BY-STEP INSTRUCTIONS

### 1. นำภาพ 2D เข้ามาใน Blender
#### สำหรับ Blender 4.2 ขึ้นไป (เวอร์ชั่นใหม่):
- **วิธียกมาวาง (ง่ายที่สุด):** ลากไฟล์ภาพ PNG จากโฟลเดอร์ใน Windows มาวางในหน้าต่าง Blender ได้เลย
- **หรือใช้เมนู:** กด `Shift + A` (หรือเมนู `Add`) -> เลือก `Image` -> เลือก `Mesh Plane` หรือ `Image Plane`

#### สำหรับ Blender เวอร์ชั่นเก่า (4.1 ลงไป):
1. ไปที่เมนู `Edit` -> `Preferences...` -> หัวข้อ `Add-ons`
2. ค้นหาคำว่า `Images as Planes` แล้ว **ติ๊กถูก** เปิดใช้งาน
3. ไปที่เมนู `File` -> `Import` -> `Images as Planes` เลือกไฟล์ PNG

---

### 2. นำภาพ 2D เข้ามาและดึงความหนา (Extrude)
1. คลิกที่กล่องสี่เหลี่ยม Cube ตรงกลางหน้าจอ แล้วกดปุ่ม `Delete` บนคีย์บอร์ดเพื่อลบออกก่อน
2. ไปที่เมนู `File` -> `Import` -> `Images as Planes`
3. เลือกไฟล์ภาพ 2D PNG ที่ต้องการ
4. คลิกเลือกแผ่นภาพที่เข้ามาในฉาก
5. กดปุ่ม `Tab` บนคีย์บอร์ด (เพื่อเข้าสู่ **Edit Mode**)
6. กดปุ่ม `A` บนคีย์บอร์ด (เพื่อเลือกพื้นที่ทั้งหมดของแผ่นภาพ)
7. กดปุ่ม `E` แล้วเลื่อนเมาส์ขึ้นหรือลงเล็กน้อย เพื่อ **ดึงความหนา (Extrude)** ออกมาให้กลายเป็นทรงการ์ดแข็ง/แผ่นอะคริลิก 3D
8. กดปุ่ม `Tab` อีกครั้งเพื่อออกจาก Edit Mode (กลับสู่ **Object Mode**)

---

### 3. ส่งออกเป็นไฟล์ 3D (.glb) สำหรับ Web
1. ไปที่เมนู `File` -> `Export` -> `glTF 2.0 (.glb/.gltf)`
2. ในหน้าต่าง Export ให้สังเกตเมนูด้านขวา หัวข้อ **Include**:
   - ติ๊กถูกที่ `Limit to Selected Objects` (เพื่อส่งออกเฉพาะตัวโมเดลที่เราเลือก)
3. เลือกตำแหน่งเซฟไฟล์ไว้ที่โฟลเดอร์ของโปรเจกต์:
   `public/models/your-model-name.glb`
4. กดปุ่ม **Export glTF 2.0**

---

## 💻 USAGE IN REACT THREE FIBER (R3F)

นำไฟล์ `.glb` มาใช้ในโค้ด React component เช่น:

```jsx
import { useGLTF } from '@react-three/drei';

export function StandeeModel(props) {
  const { scene } = useGLTF('/models/your-model-name.glb');
  return <primitive object={scene} {...props} />;
}

useGLTF.preload('/models/your-model-name.glb');
```

---

> **Note:** วิธีนี้ไม่กินทรัพยากรการ์ดจอ ฟรี 100% ไม่ต้องง้อ AI หรือเว็บแปลงไฟล์ที่ต้องเสียเงินดาวน์โหลด!
