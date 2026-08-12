# Three.js VFX Guide สำหรับเกม Stylized Low-Poly

## เป้าหมายของโปรเจกต์

-   ตัวละครประมาณ 70--80 โมเดล
-   Stylized Low-Poly
-   ประมาณ 4,000 triangles / ตัว
-   สร้างโมเดลด้วย Meshy AI
-   บนกระดานแสดงพร้อมกันประมาณ 5--15 ตัว
-   หน้าต่อสู้เป็น 1 vs 1
-   โมเดล GLB ควรเก็บเป็นตัวละครสะอาด ๆ โดยไม่ต้องปั้น VFX ติดกับโมเดล
-   VFX ทำเพิ่มใน Three.js เพื่อให้ reuse กับตัวละครทุกตัวได้

------------------------------------------------------------------------

## Pipeline ที่แนะนำ

### 1. Character

ใช้ Meshy AI สำหรับ:

-   ปั้นตัวละคร
-   Texture ตัวละคร
-   Export เป็น GLB
-   เป้าหมายประมาณ 3,000--5,000 triangles
-   พยายามใช้ 1 material / character
-   ลด texture เหลือ 512x512 เป็นหลัก
-   ตัวละครที่ต้องซูมใกล้มากอาจใช้ 1024x1024

ไม่จำเป็นต้องให้ Meshy สร้าง:

-   ไฟ
-   สายฟ้า
-   วงเวท
-   Aura
-   ควัน
-   Projectile
-   Explosion
-   Hit effect

สิ่งเหล่านี้ควรทำใน Three.js

------------------------------------------------------------------------

# VFX Stack

## 1. three.quarks

Particle/VFX engine สำหรับ Three.js โดยตรง

Official GitHub: https://github.com/Alchemist0823/three.quarks

เหมาะสำหรับ:

-   Fire
-   Ice
-   Lightning
-   Smoke
-   Sparks
-   Aura
-   Projectile trail
-   Explosion
-   Heal
-   Poison
-   Portal
-   Summon effect

จุดเด่น:

-   ใช้กับ Three.js โดยตรง
-   มี particle batching
-   รองรับ texture atlas
-   มี Visual Editor
-   Export effect เป็น JSON ได้
-   สามารถสร้าง effect ครั้งเดียวแล้ว reuse กับตัวละครหลายตัว

ติดตั้ง:

``` bash
npm install three.quarks
```

------------------------------------------------------------------------

## 2. Three.js UnrealBloomPass

ใช้ทำ Glow/Bloom ให้เวทมนตร์ดูสว่างและมีพลัง

Documentation: https://threejs.org/docs/pages/UnrealBloomPass.html

ตัวอย่างการใช้งาน:

``` javascript
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  1.5,
  0.4,
  0.85
);

composer.addPass(bloomPass);
```

เหมาะกับ:

-   ปลายไม้กายสิทธิ์
-   Magic Orb
-   Fireball
-   Lightning
-   Magic Circle
-   Portal
-   Ultimate Skill

------------------------------------------------------------------------

# แหล่งหา VFX Asset

## itch.io VFX Assets

https://itch.io/game-assets/tag-vfx

ค้นคำว่า:

-   stylized vfx
-   magic vfx
-   spell effects
-   particle texture
-   magic circle
-   impact vfx
-   projectile vfx
-   smoke texture
-   fire spritesheet
-   lightning texture

ถ้าใช้กับ Three.js ให้มองหาไฟล์ประเภท:

-   PNG
-   Transparent PNG
-   Spritesheet
-   Flipbook
-   Particle Texture

ไม่จำเป็นต้องหา Effect เป็น GLB

### Sprite + VFX

https://itch.io/game-assets/tag-sprites/tag-vfx

เหมาะสำหรับหา:

-   Explosion spritesheet
-   Slash
-   Hit impact
-   Smoke
-   Fire
-   Magic burst

------------------------------------------------------------------------

## Kenney Assets

https://kenney.nl/assets

ใช้หา asset เสริม เช่น:

-   Particle textures
-   UI
-   Icons
-   Environment
-   Props
-   Audio

------------------------------------------------------------------------

# Effect หลักที่ควรมี

ไม่จำเป็นต้องสร้าง Effect แยก 80 ชุด

สร้างระบบ Effect กลางประมาณ 8--10 ชุดแล้ว reuse

## 1. Magic Circle

ใช้ตอน:

-   Spawn
-   Cast spell
-   Summon
-   Battle entrance

โครงสร้าง:

``` text
Transparent PNG
    ↓
THREE.PlaneGeometry
    ↓
Rotate
    ↓
Scale animation
    ↓
Opacity animation
    ↓
Bloom
```

------------------------------------------------------------------------

## 2. Wand Glow

ติด Object3D ไว้ที่ปลายไม้กายสิทธิ์

``` text
Character
└── Wand
    └── WandTip
        └── VFX Spawn Point
```

Effect:

-   glowing orb
-   small particles
-   sparks
-   emissive material
-   bloom

------------------------------------------------------------------------

## 3. Projectile

ระบบกลางสำหรับเวทยิง

``` text
Caster
   ↓
Charge
   ↓
Projectile
   ↓
Trail
   ↓
Enemy
   ↓
Impact
```

ระบบเดียวสามารถเปลี่ยน config เป็นหลายธาตุได้

### Fire

-   orange/red particles
-   sparks
-   smoke
-   fire trail

### Ice

-   blue particles
-   ice shards
-   frost trail

### Lightning

-   electric arc
-   flash
-   sparks

### Earth

-   rocks
-   dust
-   debris

### Wind

-   curved slash
-   white particles
-   spiral trail

### Dark

-   purple particles
-   smoke
-   dark orb

### Heal

-   upward particles
-   glowing symbols
-   soft bloom

------------------------------------------------------------------------

# Hit Impact

ทุกการโจมตีควรมี Hit Effect

``` text
Projectile Hit
      ↓
Impact Burst
      ↓
Enemy Flash
      ↓
Small Recoil
      ↓
Damage Number
      ↓
Small Camera Shake
```

ทำให้การต่อสู้รู้สึกมีน้ำหนักขึ้นมากกว่าการลด HP เฉย ๆ

------------------------------------------------------------------------

# Battle Entrance

สำหรับหน้า 1 vs 1

``` text
Camera Enter
     ↓
Magic Circle Spawn
     ↓
Particles Rise
     ↓
Character Appear
     ↓
Scale 0 → 1
     ↓
Magic Burst
     ↓
Battle Start
```

สามารถใช้ Effect ชุดเดียวกับตัวละครทุกตัว

------------------------------------------------------------------------

# Board Mode

บนกระดานมีประมาณ 5--15 ตัว

ไม่ควรเปิด Effect หนักตลอดเวลา

แนะนำ:

### Idle Character

-   Wand glow เล็ก ๆ
-   particle 2--10 เม็ด
-   aura เบามาก

### Selected Character

เพิ่ม:

-   Magic circle
-   outline
-   stronger glow
-   particles

### Active Turn

เพิ่ม:

-   pulse
-   magic circle animation
-   floating particles

------------------------------------------------------------------------

# Battle Mode

เพราะมีแค่ประมาณ 2 ตัว สามารถใช้ Effect หนักกว่าหน้ากระดานได้

เช่น:

-   Bloom
-   Projectile trail
-   Particle burst
-   Camera shake
-   Screen flash
-   Magic circle
-   Aura
-   Environmental particles

------------------------------------------------------------------------

# Performance Target

Character:

``` text
~4,000 triangles
512x512 texture
1 material
GLB
```

Board:

``` text
5–15 characters
≈ 20,000–60,000 character triangles
```

ถือว่าเบาสำหรับ WebGL/Three.js

สิ่งที่ต้องระวังมากกว่า polygon:

1.  Draw calls
2.  จำนวน material
3.  Texture memory
4.  Transparent particles
5.  Overdraw
6.  จำนวน PointLight
7.  Post-processing

------------------------------------------------------------------------

# สิ่งที่ไม่ควรทำ

อย่าใส่ PointLight ให้ particle ทุกเม็ด

อย่าให้ NPC ทุกตัวเปิด particle หลายร้อยเม็ดตลอดเวลา

อย่าใช้ texture 2K/4K กับ NPC ทุกตัว

อย่า preload ตัวละครทั้ง 70--80 GLB หากไม่ได้ใช้พร้อมกัน

อย่าสร้าง VFX เป็นส่วนหนึ่งของ Meshy character ถ้าต้องการ reuse

------------------------------------------------------------------------

# Asset Loading Strategy

``` text
Game Start
    ↓
Load UI / Board
    ↓
Load เฉพาะ Character ที่อยู่ใน Board
    ↓
5–15 GLB
```

เมื่อเข้า Battle:

``` text
Board
   ↓
Battle Scene
   ↓
Player GLB
Enemy GLB
   ↓
Load Battle VFX
```

Collection สามารถใช้ thumbnail/icon ก่อน โดยไม่ต้องโหลด GLB ทั้งหมด

------------------------------------------------------------------------

# VFX Architecture ที่แนะนำ

``` text
src/
├── vfx/
│   ├── VFXManager.ts
│   ├── MagicCircle.ts
│   ├── Projectile.ts
│   ├── Impact.ts
│   ├── Aura.ts
│   ├── Heal.ts
│   ├── Shield.ts
│   └── elements/
│       ├── fire.ts
│       ├── ice.ts
│       ├── lightning.ts
│       ├── earth.ts
│       ├── wind.ts
│       └── dark.ts
│
├── assets/
│   └── vfx/
│       ├── particles/
│       ├── circles/
│       ├── impacts/
│       ├── trails/
│       └── spritesheets/
```

------------------------------------------------------------------------

# แนวคิดสำคัญ

ตัวละครกับ Effect ควรแยกออกจากกัน

``` text
Character GLB
     +
Animation
     +
VFX
     +
Lighting
     +
Camera
     +
Sound
     =
Final Game Character
```

ดังนั้นโมเดลที่ Meshy สร้างออกมาดูเรียบ ๆ ไม่ใช่ปัญหา

Meshy มีหน้าที่สร้าง Character Asset

ส่วนความรู้สึกว่าเป็นเกมเวทมนตร์จะมาจาก:

-   Animation
-   Particle
-   Magic Circle
-   Projectile
-   Impact
-   Bloom
-   Camera movement
-   Sound Effect

------------------------------------------------------------------------

# Recommended First 8 Effects

เริ่มทำแค่:

1.  Magic Circle
2.  Wand Glow
3.  Fire Projectile
4.  Ice Projectile
5.  Lightning
6.  Hit Impact
7.  Heal
8.  Shield

เมื่อระบบเหล่านี้ทำงานแล้ว ค่อยเพิ่ม Ultimate และ Effect เฉพาะตัวละคร

------------------------------------------------------------------------

# Links

three.quarks: https://github.com/Alchemist0823/three.quarks

Three.js UnrealBloomPass:
https://threejs.org/docs/pages/UnrealBloomPass.html

itch.io VFX: https://itch.io/game-assets/tag-vfx

itch.io Sprite VFX: https://itch.io/game-assets/tag-sprites/tag-vfx

Kenney: https://kenney.nl/assets
