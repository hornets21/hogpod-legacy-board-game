# 3D Board Redesign & Architectural Reference Guide
**Project**: Hogpod Legacy Board Game (`podBoardGame`)  
**Topic**: แนวทางการปรับแต่งกระดาน 3D (Non-Rectangular 3D Board Design & References)

---

## 1. แนวทางการออกแบบกระดาน 3D รูปแบบใหม่ (Board Layout Approaches)

การเปลี่ยนจากกระดานสี่เหลี่ยมตาราง 10x9 เดิม ไปเป็นกระดาน 3D ดีไซน์พรีเมียม สามารถเลือกได้ 3 รูปแบบหลัก:

### 🌀 รูปแบบที่ 1: Spiral Magic Tower (หอคอยเวทมนตร์วนก้นหอย)
* **แนวคิด**: วางตำแหน่งช่อง 1-90 เรียงเป็นวงกลมวนขึ้นไปเรื่อยๆ ตามระดับความสูง (Spiral Elevation) 
* **จุดจบ**: ช่อง 90 (บอสมหาเวทย์) จะประดิษฐานอยู่บนยอดหอคอยตรงกลางฉาก
* **ข้อดี**:
  * แสดงมิติความสูง-ต่ำ 3D ได้สมจริงและอลังการ
  * ให้ความรู้สึกเหมือนกำลังปีนขึ้นไปพิชิตยอดปราสาท
* **การคำนวณตำแหน่ง 3D (Procedural Spiral Formula)**:
  ```js
  // r = รัศมี, theta = มุมการหมุน, h = ความสูงที่ไต่ระดับขึ้นไป
  const theta = (cell / TOTAL_CELLS) * Math.PI * 6; // วน 3 รอบ
  const radius = MAX_RADIUS * (1 - (cell / TOTAL_CELLS) * 0.65);
  const x = radius * Math.cos(theta);
  const z = radius * Math.sin(theta);
  const y = (cell / TOTAL_CELLS) * MAX_HEIGHT;
  ```

---

### 🔷 รูปแบบที่ 2: Hexagonal Crystal Island (เกาะลอยฟ้าหกเหลี่ยมรวงผึ้ง)
* **แนวคิด**: เปลี่ยนรูปทรงแผ่นหินจากสี่เหลี่ยมเป็น **หกเหลี่ยม (Hexagon Geometry)** ที่ต่อเชื่อมกันเป็นเกาะลอยฟ้า 
* **จุดเด่น**: 
  * ขอบหกเหลี่ยมมีแสงไฟเวทมนตร์เรืองแสง 6 ด้าน (Neon Edge / Bloom Effect)
  * แต่ละช่องสามารถปรับระดับความสูง (Y-offset) อิสระ ดูมีมิติเหมือนรวงผึ้งคริสตัล
* **การสร้างรูปทรง 3D (Procedural Hexagon)**:
  ```js
  // ใน Three.js สามารถใช้ CylinderGeometry 6 ด้านทำแผ่นหกเหลี่ยมได้อย่างมีประสิทธิภาพ
  const geometry = new THREE.CylinderGeometry(radius, radius, height, 6);
  ```

---

### 🌉 รูปแบบที่ 3: Winding Fantasy Floating Path (เส้นทางเกาะลอยฟ้าคดเคี้ยว)
* **แนวคิด**: วางแผ่นหินเป็นเส้นทางเดินคดเคี้ยวรูปตัว S เชื่อมต่อระหว่างเกาะลอยฟ้า 3D หลายๆ เกาะ (Floating Islands)
* **จุดเด่น**: มีสะพานหินโม่ หรือสะพานพลังเวทมนตร์เชื่อมระหว่างเกาะ ฉากหลังใส่หมอก (Fog) และฝุ่นเวทมนตร์ไต่ระดับ

---

## 2. วิธีการพัฒนา (Implementation Methods)

### วิธีที่ 1: Procedural 3D Mesh (สร้างด้วย Code + Three.js Geometries) ⭐ [แนะนำ]
* **ไม่ต้องดาวน์โหลดไฟล์โมเดล 3D (.glb / .gltf) ขนาดใหญ่**
* ใช้รูปทรงคณิตศาสตร์พื้นฐานใน React Three Fiber (R3F) เช่น `CylinderGeometry`, `ExtrudeGeometry`, `BoxGeometry`
* **ข้อดี**: ⚡ โหลดเร็วมาก (0.1 วินาที), ปรับแต่งโทนสี แสงเรืองแสง (Bloom Effect) และ Animation การตอบสนองตามการ hover ได้ง่าย

### วิธีที่ 2: 3D Asset Models (.glb / .gltf)
* ดาวน์โหลดโมเดล 3D สำเร็จรูป เช่น ปราสาท, แท่นบูชา, หีบสมบัติ นำมาวางตกแต่งใจกลางกระดาน

---

## 3. แหล่งอ้างอิงและค้นหาโมเดล / References

| เว็บไซต์อ้างอิง | ประเภทข้อมูล / Asset | คำค้นหาที่แนะนำ (Search Keywords) |
| :--- | :--- | :--- |
| **[Poly Pizza](https://poly.pizza)** | Low-Poly 3D Models ฟรี (ไฟล์เบา เหมาะกับ Web 3D) | `floating island`, `magic tower`, `hex tile`, `castle`, `board game tile` |
| **[Sketchfab](https://sketchfab.com)** | 3D Models & Diorama References | `fantasy board game`, `magic portal 3d`, `diorama castle` |
| **[gltf.pmnd.rs](https://gltf.pmnd.rs/)** | เครื่องมือแปลง `.glb` / `.gltf` เป็น React Three Fiber Components | N/A |
| **[Three.js Journey](https://threejs-journey.com)** | บทเรียน R3F & Procedural Shaders / Layouts | `Custom Geometries`, `Shaders`, `R3F Physics` |

---

## 4. แผนงานขั้นถัดไป (Next Steps)
1. **เลือกแนวทางกระดาน 3D** ที่ต้องการ (Spiral Tower หรือ Hexagon Grid)
2. **อัปเดตไฟล์ `lib/boardLayout.js`**: ปรับเปลี่ยนฟังก์ชัน `cellToWorld(cell)` คำนวณพิกัด [X, Y, Z] ใหม่ตามทรงกระดานที่เลือก
3. **ปรับแต่ง `components/board3d/BoardTiles.jsx`**: เปลี่ยน Mesh และ Geometry ของแผ่นหินให้สอดคล้องกับรูปทรงใหม่
