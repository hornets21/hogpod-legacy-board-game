"use client";

// ============================================================
// BoardTiles — แผ่นหิน 90 ช่องของกระดาน 3D
// ============================================================

import { useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { useTexture, Text, Html } from "@react-three/drei";
import * as THREE from "three";
import {
  buildGrid,
  getCellType,
  cellToWorld,
  TILE_SIZE,
} from "@/lib/boardLayout";
import { CELL_TELEPORT, MONSTER_MAP } from "@/lib/gameData";
import { getTileTopTexture } from "./textures";

// โทนสีแผ่นหินแต่ละประเภท (ธีม Hogwarts Legacy: หินเข้ม + เรืองแสงเวทมนตร์)
const TILE_STYLES = {
  normal:  { bg: "#232b3d", border: "rgba(255,255,255,0.07)",  emissive: "#000000", ei: 0 },
  ladder:  { bg: "#123f2b", border: "rgba(34,197,94,0.45)",    emissive: "#22c55e", ei: 0.28 },
  snake:   { bg: "#451a1a", border: "rgba(239,68,68,0.5)",     emissive: "#ef4444", ei: 0.28 },
  boss:    { bg: "#3d0f0f", border: "rgba(255,60,60,0.8)",     emissive: "#ef4444", ei: 0.6 },
  elite:   { bg: "#40350a", border: "rgba(234,179,8,0.6)",     emissive: "#eab308", ei: 0.38 },
  monster: { bg: "#2d1b45", border: "rgba(168,85,247,0.55)",   emissive: "#a855f7", ei: 0.3 },
  hidden:  { bg: "#141926", border: "rgba(255,255,255,0.05)",  emissive: "#000000", ei: 0 },
  healer:  { bg: "#0e3b2e", border: "rgba(52,211,153,0.55)",   emissive: "#34d399", ei: 0.32 },
  win:     { bg: "#4a3a10", border: "rgba(240,184,91,0.95)",   emissive: "#f0b85b", ei: 0.5 },
  trap:    { bg: "#1a0d2e", border: "rgba(217,70,239,0.65)",   emissive: "#d946ef", ei: 0.45 },
};

const TILE_HEIGHT = 0.34;
const geometryCache = { box: null, side: null, bottom: null };

function getShared() {
  if (!geometryCache.box) {
    geometryCache.box = new THREE.BoxGeometry(TILE_SIZE, TILE_HEIGHT, TILE_SIZE);
    geometryCache.side = new THREE.MeshStandardMaterial({
      color: "#151a29",
      roughness: 0.9,
      metalness: 0.05,
    });
    geometryCache.bottom = new THREE.MeshStandardMaterial({
      color: "#0b0e18",
      roughness: 1,
    });
  }
  return geometryCache;
}

// material หน้าบนของแต่ละช่อง
const topMatCache = new Map();
function getTopMaterial(cell, type, imageTexture, hasTrap) {
  const trapStyle = hasTrap ? TILE_STYLES.trap : null;
  const style = trapStyle || TILE_STYLES[type] || TILE_STYLES.normal;
  const key = `${cell}|${type}|${hasTrap ? 1 : 0}`;
  if (!topMatCache.has(key)) {
    const mat = new THREE.MeshStandardMaterial({
      map: imageTexture || getTileTopTexture(cell, style.bg, style.border),
      color: hasTrap ? "#c4b5fd" : "#ffffff", // ย้อมม่วงจาง ๆ สำหรับช่องกับดัก
      emissive: new THREE.Color(style.emissive),
      emissiveIntensity: style.ei,
      roughness: 0.72,
      metalness: 0.08,
    });
    topMatCache.set(key, mat);
  }
  return topMatCache.get(key);
}

export default function BoardTiles({ revealedMonsters, usedLadders, monsterMap, cellTeleport, trapCells, onHoverCell }) {
  const grid = useMemo(() => buildGrid(), []);
  const [hoveredCell, setHoveredCell] = useState(null);
  const highlightRef = useRef(null);

  // โหลด Texture ฝั่ง WebGL ด้วย useTexture (Standard drei helper)
  const textures = useTexture({
    odd: "/images/textures/texture-1-board.webp",
    even: "/images/textures/texture-2-board.webp",
  });

  // แสงกะพริบของแถบ highlight ช่องที่ hover
  useFrame(({ clock }) => {
    if (highlightRef.current) {
      highlightRef.current.material.opacity =
        0.35 + Math.sin(clock.elapsedTime * 6) * 0.15;
    }
  });

  const handleHover = (cell) => (e) => {
    e.stopPropagation();
    setHoveredCell(cell);
    document.body.style.cursor = 'url("/images/system/click_cursor.cur"), pointer';
    if (onHoverCell) {
      const type = getCellType(cell, usedLadders, monsterMap, cellTeleport);
      onHoverCell({
        cell,
        type,
        monster: revealedMonsters?.[cell] || null,
        monsterInfo: (monsterMap || MONSTER_MAP)[cell] || null,
        teleport: (cellTeleport || CELL_TELEPORT)[cell] || null,
      });
    }
  };

  const handleOut = () => {
    setHoveredCell(null);
    document.body.style.cursor = 'url("/images/system/main_cursor.cur"), auto';
    if (onHoverCell) onHoverCell(null);
  };

  const shared = getShared();

  return (
    <group>
      {grid.flatMap((row) =>
        row.map((cell) => {
          const type = cell === 90 ? "win" : getCellType(cell, usedLadders, monsterMap, cellTeleport);
          const [x, , z] = cellToWorld(cell);
          const isOdd = cell % 2 !== 0;
          const bgTex = isOdd ? textures.odd : textures.even;
          const hasTrap = !!trapCells?.[cell];
          const top = getTopMaterial(cell, type, bgTex, hasTrap);
          const mats = [shared.side, shared.side, top, shared.bottom, shared.side, shared.side];
          const isBoss = type === "boss";
          const yScale = isBoss ? 1.5 : type === "win" ? 1.35 : 1;
          const topY = TILE_HEIGHT * yScale - 0.01;

          return (
            <group key={cell}>
              <mesh
                geometry={shared.box}
                material={mats}
                position={[x, (TILE_HEIGHT * yScale) / 2 - 0.02, z]}
                scale={[1, yScale, 1]}
                receiveShadow
                onPointerOver={handleHover(cell)}
                onPointerOut={handleOut}
              />
              {/* เลขช่อง 3D ลอยอยู่บนหน้าแผ่นหิน */}
              <Text
                font="/fonts/HarryP-MVZ6w.ttf"
                position={[x, topY + 0.01, z]}
                rotation={[-Math.PI / 2, 0, 0]}
                fontSize={0.55}
                color="#ffffff"
                anchorX="center"
                anchorY="middle"
                outlineWidth={0.04}
                outlineColor="#000000"
              >
                {cell}
              </Text>

              {/* ป้ายสัญลักษณ์เวทมนตร์กรณีมอนสเตอร์บาดเจ็บ: ลอยแบบป้าย NPC ด้วย Html Component */}
              {revealedMonsters?.[cell] && typeof revealedMonsters[cell].currentHp === "number" && revealedMonsters[cell].currentHp < revealedMonsters[cell].hp && (
                <Html position={[x, 1.25, z]} center distanceFactor={12} zIndexRange={[100, 0]}>
                  <div
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-black shadow-[0_0_12px_rgba(0,0,0,0.8)] border backdrop-blur-md transition-all duration-300 pointer-events-none whitespace-nowrap ${
                      hoveredCell === cell
                        ? "bg-red-950/95 border-rose-400 text-rose-200 scale-110 shadow-rose-500/60 ring-2 ring-rose-400/40"
                        : "bg-slate-950/85 border-red-500/40 text-red-400 opacity-90"
                    }`}
                  >
                    <span className="text-xs">❤️</span>
                    {hoveredCell === cell ? (
                      <span>{revealedMonsters[cell].currentHp} / {revealedMonsters[cell].hp}</span>
                    ) : (
                      <span className="text-[10px] font-bold opacity-90">{revealedMonsters[cell].currentHp}</span>
                    )}
                  </div>
                </Html>
              )}
            </group>
          );
        })
      )}

      {/* แถบเรืองแสงช่องที่ hover */}
      {hoveredCell != null && (
        <mesh
          ref={highlightRef}
          position={[
            cellToWorld(hoveredCell)[0],
            TILE_HEIGHT + 0.03,
            cellToWorld(hoveredCell)[2],
          ]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[TILE_SIZE * 1.06, TILE_SIZE * 1.06]} />
          <meshBasicMaterial
            color="#f0b85b"
            transparent
            opacity={0.4}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* ลำแสงแท่นชัยชนะ (ช่อง 90) */}
      <WinBeacon />
    </group>
  );
}

function WinBeacon() {
  const beamRef = useRef(null);
  const [x, , z] = cellToWorld(90);

  useFrame(({ clock }) => {
    if (beamRef.current) {
      beamRef.current.material.opacity =
        0.12 + Math.sin(clock.elapsedTime * 1.6) * 0.05;
      beamRef.current.rotation.y = clock.elapsedTime * 0.4;
    }
  });

  return (
    <mesh ref={beamRef} position={[x, 3.2, z]}>
      <cylinderGeometry args={[0.34, 0.55, 6, 20, 1, true]} />
      <meshBasicMaterial
        color="#f0b85b"
        transparent
        opacity={0.14}
        blending={THREE.AdditiveBlending}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}
