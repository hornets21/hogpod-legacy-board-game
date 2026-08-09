"use client";

// ============================================================
// BoardCanvas — ฉาก 3D หลักของกระดาน (react-three-fiber)
// ธีม Hogwarts Legacy: ปราสาทมืด, แสงเทียนทอง, แสงจันทร์ฟ้า,
// หมอก, ฝุ่นเวทมนตร์, Bloom
// ============================================================

import { Suspense, useState, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import BoardTiles from "./BoardTiles";
import PlayerTokens from "./PlayerTokens";
import Atmosphere from "./Atmosphere";
import DiceModel from "./DiceModel";
import SkillFxLayer from "./SkillFxLayer";
import NpcModels from "./NpcModels";
import GrandFinalBossModel from "./GrandFinalBossModel";
import { MONSTER_MAP } from "@/lib/gameData";
import { cellToWorld } from "@/lib/boardLayout";

// ─── พิกัดประจำและค่าฟิสิกส์การกระเด้งของลูกเต๋า 3D ──────────
const BOARD_DICE_POS = [0, 1.8, 4.2];
const DICE_FLOOR_Y = 1.35; // ระดับพื้นกระทบเหนือแผ่นหินกระดาน (ไม่จมหิน)

// ─── มุมหมุนสำหรับหันหน้าแต้ม 1-6 ของลูกเต๋า 3D ขึ้นด้านบน ───────
const DICE_FACE_ROTATIONS = {
  1: [0, 0, 0],
  2: [Math.PI, 0, 0],
  3: [0, 0, -Math.PI / 2],
  4: [0, 0, Math.PI / 2],
  5: [-Math.PI / 2, 0, 0],
  6: [Math.PI / 2, 0, 0],
};

function Animated3DDice({ isRolling, diceResult, onRoll, canRoll, resetDiceKey }) {
  const diceGroupRef = useRef(null);

  const phys = useRef({
    x: 0,
    y: 1.8,
    z: -0.5,
    vx: 0, vy: 0, vz: 0,
    rx: 0, ry: 0, rz: 0,
    bouncesLeft: 0,
    isBouncing: false,
    wasRolling: false,
  });

  // รีเซ็ตตำแหน่งกลับสู่ศูนย์กลางด้านบนเมื่อ resetDiceKey เปลี่ยน
  const prevResetKey = useRef(resetDiceKey);
  if (prevResetKey.current !== resetDiceKey) {
    prevResetKey.current = resetDiceKey;
    phys.current.x = 0;
    phys.current.y = 1.8;
    phys.current.z = -0.5;
    phys.current.vx = 0;
    phys.current.vy = 0;
    phys.current.vz = 0;
    phys.current.isBouncing = false;
  }

  useFrame(({ clock }, dt) => {
    const ref = diceGroupRef.current;
    if (!ref) return;

    const p = phys.current;
    const delta = Math.min(dt, 0.033); // ล็อก Delta Time ป้องกันการกระตุกหรือเร่งความเร็วตาม FPS เครื่อง

    // เมื่อกดทอย: สุ่มแรงโยนกระเด้ง
    if (isRolling && !p.wasRolling) {
      p.isBouncing = true;
      p.bouncesLeft = Math.floor(Math.random() * 4) + 2;
      p.x = 0; p.z = 1.0; p.y = 2.4;
      p.vy = 8.5;
      p.rx = (Math.random() - 0.5) * 30;
      p.ry = (Math.random() - 0.5) * 35;
      p.rz = (Math.random() - 0.5) * 30;
    }
    p.wasRolling = isRolling;

    if (p.isBouncing) {
      p.vy -= delta * 24;
      p.x += p.vx * delta;
      p.y += p.vy * delta;
      p.z += p.vz * delta;

      ref.rotation.x += p.rx * delta;
      ref.rotation.y += p.ry * delta;
      ref.rotation.z += p.rz * delta;

      if (p.y <= DICE_FLOOR_Y) {
        p.y = DICE_FLOOR_Y;
        if (p.bouncesLeft > 1) {
          p.bouncesLeft -= 1;
          p.vy = Math.abs(p.vy) * 0.5;
          p.vx *= 0.6;
          p.vz *= 0.6;
          p.rx *= 0.6;
          p.ry *= 0.6;
          p.rz *= 0.6;
        } else {
          p.isBouncing = false;
          p.vy = 0; p.vx = 0; p.vz = 0;
        }
      }
      ref.position.set(p.x, p.y, p.z);
    } else if (diceResult && DICE_FACE_ROTATIONS[diceResult]) {
      // เมื่อกระเด้งจบ ให้ล็อกมุมหน้าแต้มที่ออกจริงอย่างแม่นยำ 100% เหนือพื้นกระดาน
      const targetRot = DICE_FACE_ROTATIONS[diceResult];

      ref.position.set(p.x, DICE_FLOOR_Y, p.z);
      ref.rotation.x = targetRot[0];
      ref.rotation.y = targetRot[1];
      ref.rotation.z = targetRot[2];
    } else {
      // สภาวะรอทอยปกติ: วางนิ่งอยู่อย่างสวยงามเหนือกระดานด้านบน
      ref.position.set(0, DICE_FLOOR_Y, -0.5);
      ref.rotation.x = 0;
      ref.rotation.y = 0;
      ref.rotation.z = 0;
    }

    phys.current.x = ref.position.x;
    phys.current.y = ref.position.y;
    phys.current.z = ref.position.z;
  });

  const handleClick = (e) => {
    e.stopPropagation();
    if (canRoll && onRoll) {
      onRoll();
    }
  };

  const handlePointerOver = (e) => {
    e.stopPropagation();
    document.body.style.cursor = canRoll
      ? 'url("/images/system/click_cursor.cur"), pointer'
      : 'url("/images/system/main_cursor.cur"), auto';
  };

  const handlePointerOut = () => {
    document.body.style.cursor = 'url("/images/system/main_cursor.cur"), auto';
  };

  // ขนาด Scale 18.0 ตามคำสั่งอย่างแม่นยำ
  const scale = 18.0;


  return (
    <group
      ref={diceGroupRef}
      position={[phys.current.x, phys.current.y, phys.current.z]}
      scale={[scale, scale, scale]}
      onClick={handleClick}
      onPointerDown={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      <DiceModel />
    </group>
  );
}

// กล้องเอียงมองลงกระดาน + parallax ตามเมาส์ + Dynamic 3D Combat Camera Zoom Focus (Fast Crisp Glide Return)
function CameraRig({ focusCell = null, isCombatActive = false }) {
  const currentCamPos = useRef(new THREE.Vector3(0, 11, 10.8));
  const currentLookAt = useRef(new THREE.Vector3(0, 0.5, 0.3));
  const wasCombat = useRef(false);

  useFrame(({ camera, pointer }, dt) => {
    const delta = Math.min(dt, 0.033);

    let destX = 0;
    let destY = 11;
    let destZ = 10.8;

    let lookX = 0;
    let lookY = 0.5;
    let lookZ = 0.3;

    if (isCombatActive && focusCell) {
      const [wx, , wz] = cellToWorld(focusCell);
      destX = wx + pointer.x * 0.3;
      destY = 4.2 + pointer.y * 0.2;
      destZ = wz + 3.8;

      lookX = wx;
      lookY = 0.5;
      lookZ = wz;

      wasCombat.current = true;
    } else {
      destX = pointer.x * 1.1;
      destY = 11 + pointer.y * 0.7;
      destZ = 10.8;

      lookX = 0;
      lookY = 0.5;
      lookZ = 0.3;
    }

    // เมื่อพึ่งจบการต่อสู้ (wasCombat == true) ให้ใช้สปีดดึงกล้องกลับอย่างรวดเร็วและกระชับ (0.2s) ป้องกันกล้องยืดลากกระตุก
    const k = wasCombat.current && !isCombatActive ? Math.min(1, delta * 14.0) : Math.min(1, delta * 7.0);

    currentCamPos.current.x += (destX - currentCamPos.current.x) * k;
    currentCamPos.current.y += (destY - currentCamPos.current.y) * k;
    currentCamPos.current.z += (destZ - currentCamPos.current.z) * k;

    currentLookAt.current.x += (lookX - currentLookAt.current.x) * k;
    currentLookAt.current.y += (lookY - currentLookAt.current.y) * k;
    currentLookAt.current.z += (lookZ - currentLookAt.current.z) * k;

    // เช็คเมื่อกล้องกลับถึงตำแหน่งกระดานปกติแล้ว ให้รีเซ็ต flag
    if (!isCombatActive && wasCombat.current) {
      const dist = Math.hypot(
        currentCamPos.current.x - destX,
        currentCamPos.current.y - destY,
        currentCamPos.current.z - destZ
      );
      if (dist < 0.1) {
        wasCombat.current = false;
      }
    }

    camera.position.copy(currentCamPos.current);
    camera.lookAt(currentLookAt.current);
  });

  return null;
}

function SceneLights() {
  return (
    <group>
      {/* แสงรอบทิศเย็นๆ */}
      <ambientLight color="#33405e" intensity={1.1} />
      {/* แสงจันทร์สีฟ้า ประหยัดทรัพยากรการ์ดจอ สำหรับคอมสเปกต่ำ */}
      <directionalLight
        position={[-7, 13, 7]}
        color="#8fb4ff"
        intensity={1.5}
        castShadow
        shadow-mapSize-width={512}
        shadow-mapSize-height={512}
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
    const curHp = typeof monster.currentHp === "number" ? monster.currentHp : monster.hp;
    const isDamaged = curHp < monster.hp;
    lines.push({ icon: monster.emoji || "👾", text: isDamaged ? `${monster.name} (บาดเจ็บ)` : monster.name, strong: true });
    lines.push({ icon: "❤️", text: `HP คงเหลือ ${curHp}/${monster.hp}  ·  DMG ${monster.dmg}` });
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
  monsterCells,
  monsterMap,
  cellTeleport,
  trapCells,
  usedLadders,
  npcs,
  currentPlayerIndex,
  phase,
  isRolling,
  diceResult,
  onRoll,
  canRoll,
  resetDiceKey,
  focusCell = null,
  isCombatActive = false,
}) {
  const [hoverInfo, setHoverInfo] = useState(null);
  const hoverLines = describeHover(hoverInfo);

  return (
    <div className="board3d-wrap">
      <Canvas
        shadows={{ type: THREE.PCFSoftShadowMap }}
        dpr={[1, 1.5]}
        performance={{ min: 0.5 }}
        camera={{ position: [0, 11, 10.8], fov: 40, near: 0.1, far: 80 }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
      >
        <SceneLights />
        <CameraRig focusCell={focusCell} isCombatActive={isCombatActive} />

        <Suspense fallback={null}>
          <Atmosphere />
          <BoardTiles
            revealedMonsters={revealedMonsters}
            usedLadders={usedLadders}
            monsterMap={monsterMap}
            cellTeleport={cellTeleport}
            trapCells={trapCells}
            onHoverCell={setHoverInfo}
          />
          {/* NPC Models Layer — สุ่มเกิด 3D Billboard บนกระดาน */}
          <NpcModels npcs={npcs} />
          {Array.from(monsterCells || []).some((cellNum) => Number(cellNum) === 90) && (
            <GrandFinalBossModel cell={90} />
          )}
          <PlayerTokens
            players={players}
            currentPlayerIndex={currentPlayerIndex}
            phase={phase}
          />
          {/* Skill VFX Layer — spawn 3D effect ตอนร่ายสกิล / โดนดาเมจ */}
          <SkillFxLayer
            players={players}
            currentPlayerIndex={currentPlayerIndex}
          />
          {/* 3D Dice Model บนกระดาน (คลิกเพื่อทอยได้) */}
          <Animated3DDice
            isRolling={isRolling}
            diceResult={diceResult}
            onRoll={onRoll}
            canRoll={canRoll}
            resetDiceKey={resetDiceKey}
          />
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
              {l.text}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
