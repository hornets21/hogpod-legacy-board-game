"use client";

// ============================================================
// BoardCanvas — ฉาก 3D หลักของกระดาน (react-three-fiber)
// ธีม Hogwarts Legacy: ปราสาทมืด, แสงเทียนทอง, แสงจันทร์ฟ้า,
// หมอก, ฝุ่นเวทมนตร์, Bloom
// ============================================================

import { Suspense, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import BoardTiles from "./BoardTiles";
import PlayerTokens from "./PlayerTokens";
import CellMarkers from "./CellMarkers";
import Atmosphere from "./Atmosphere";
import DiceModel from "./DiceModel";

function Animated3DDice({ isRolling }) {
  const diceGroupRef = useRef(null);

  useFrame(({ clock }, dt) => {
    if (diceGroupRef.current && isRolling) {
      diceGroupRef.current.rotation.x += dt * 12;
      diceGroupRef.current.rotation.y += dt * 15;
      diceGroupRef.current.rotation.z += dt * 8;
      diceGroupRef.current.position.y = 2.5 + Math.abs(Math.sin(clock.elapsedTime * 15)) * 0.8;
    } else if (diceGroupRef.current) {
      diceGroupRef.current.position.y = 1.6 + Math.sin(clock.elapsedTime * 2) * 0.1;
      diceGroupRef.current.rotation.x = 0.4;
      diceGroupRef.current.rotation.y = clock.elapsedTime * 0.5;
    }
  });

  return (
    <group ref={diceGroupRef} position={[0, 1.8, 2]} scale={[0.75, 0.75, 0.75]}>
      <DiceModel />
    </group>
  );
}

// กล้องเอียงมองลงกระดาน + parallax ตามเมาส์เล็กน้อย
function CameraRig() {
  useFrame(({ camera, pointer }, dt) => {
    const k = Math.min(1, dt * 2.2);
    camera.position.x += (pointer.x * 1.1 - camera.position.x) * k;
    camera.position.y += (11 + pointer.y * 0.7 - camera.position.y) * k;
    camera.position.z += (10.8 - camera.position.z) * k;
    camera.lookAt(0, 0, 0.3);
  });
  return null;
}

function SceneLights() {
  return (
    <group>
      {/* แสงรอบทิศเย็นๆ */}
      <ambientLight color="#33405e" intensity={0.9} />
      {/* แสงจันทร์สีฟ้า พร้อมเงา */}
      <directionalLight
        position={[-7, 13, 7]}
        color="#8fb4ff"
        intensity={1.5}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-9}
        shadow-camera-right={9}
        shadow-camera-top={9}
        shadow-camera-bottom={-9}
        shadow-camera-far={30}
        shadow-bias={-0.0004}
      />
    </group>
  );
}

function describeHover(info) {
  if (!info) return null;
  const { cell, type, monster, monsterInfo, teleport } = info;
  const lines = [];

  if (type === "win") {
    lines.push({ icon: "🏆", text: "แท่นชัยชนะ — เอาชนะบอสมหาเวทย์ที่นี่" });
  } else if (monster) {
    lines.push({ icon: monster.emoji || "👾", text: monster.name, strong: true });
    lines.push({ icon: "❤️", text: `HP ${monster.hp}  ·  ⚔️ DMG ${monster.dmg}` });
  } else if (type === "boss") {
    lines.push({ icon: "👿", text: "รังของบอสมหาเวทย์!", strong: true });
  } else if (type === "elite") {
    lines.push({ icon: "⚔️", text: "มอนสเตอร์ระดับสูงซ่อนอยู่ที่นี่" });
  } else if (type === "healer" && monsterInfo) {
    lines.push({ icon: monsterInfo.emoji || "👼", text: monsterInfo.name, strong: true });
  } else if (type === "monster" || type === "hidden") {
    lines.push({ icon: "🌫️", text: "มีบางอย่างซ่อนอยู่ในความมืด..." });
  }

  if (teleport) {
    lines.push({
      icon: teleport.type === "ladder" ? "🪜" : "🐍",
      text:
        teleport.type === "ladder"
          ? `บันไดวิเศษ → ขึ้นไปช่อง ${teleport.to}`
          : `งูยักษ์ → ร่วงลงช่อง ${teleport.to}`,
    });
  }

  if (lines.length === 0) {
    lines.push({ icon: "⬜", text: "ช่องว่าง — ไม่มีอันตราย" });
  }
  return lines;
}

export default function BoardCanvas({
  players,
  revealedMonsters,
  trapCells,
  currentPlayerIndex,
  phase,
  isRolling,
  diceResult,
}) {
  const [hoverInfo, setHoverInfo] = useState(null);
  const hoverLines = describeHover(hoverInfo);

  return (
    <div className="board3d-wrap">
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [0, 11, 10.8], fov: 40, near: 0.1, far: 80 }}
        gl={{ antialias: true }}
      >
        <color attach="background" args={["#070912"]} />
        <fog attach="fog" args={["#070912", 15, 36]} />

        <SceneLights />
        <CameraRig />

        <Suspense fallback={null}>
          <Atmosphere />
          <BoardTiles
            revealedMonsters={revealedMonsters}
            onHoverCell={setHoverInfo}
          />
          <CellMarkers
            revealedMonsters={revealedMonsters}
            trapCells={trapCells}
          />
          <PlayerTokens
            players={players}
            currentPlayerIndex={currentPlayerIndex}
            phase={phase}
          />
          {/* 3D Dice Model บนกระดาน */}
          <Animated3DDice isRolling={isRolling} diceResult={diceResult} />
        </Suspense>

        <EffectComposer>
          <Bloom
            mipmapBlur
            intensity={0.85}
            luminanceThreshold={0.32}
            luminanceSmoothing={0.25}
          />
          <Vignette eskil={false} offset={0.22} darkness={0.72} />
        </EffectComposer>
      </Canvas>

      {/* Tooltip ข้อมูลช่อง (HTML overlay) */}
      {hoverInfo && hoverLines && (
        <div className="board3d-tooltip">
          <div className="board3d-tooltip-cell">ช่อง #{hoverInfo.cell}</div>
          {hoverLines.map((l, i) => (
            <div key={i} className={l.strong ? "font-black text-white" : "text-white/70"}>
              {l.icon} {l.text}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
