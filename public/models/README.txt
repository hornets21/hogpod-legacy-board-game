# 3D Models Folder (`public/models`)

วางไฟล์โมเดล 3D นามสกุล `.glb` หรือ `.gltf` ในโฟลเดอร์นี้

## ตัวอย่างโครงสร้าง:
- `public/models/castle.glb`
- `public/models/island.glb`

## การเรียกใช้ใน React Three Fiber:
```jsx
import { useGLTF } from "@react-three/drei";

function Model() {
  const { scene } = useGLTF("/models/castle.glb");
  return <primitive object={scene} scale={[0.5, 0.5, 0.5]} />;
}
```
