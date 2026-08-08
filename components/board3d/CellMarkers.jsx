"use client";

// ============================================================
// CellMarkers — emoji sprite ลอยเหนือช่อง (มอนสเตอร์/งู/บันได/กับดัก/ถ้วยรางวัล)
// ============================================================

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { buildGrid, getCellType, cellToWorld } from "@/lib/boardLayout";
import { MONSTER_MAP } from "@/lib/gameData";
import { getEmojiTexture } from "./textures";

const FLOAT_Y = 1.02;

export default function CellMarkers({ revealedMonsters, trapCells, usedLadders, monsterMap, cellTeleport }) {
  const grid = useMemo(() => buildGrid(), []);

  const markers = useMemo(() => {
    const list = [];
    for (const row of grid) {
      for (const cell of row) {
        const type = getCellType(cell, usedLadders, monsterMap, cellTeleport);
        const revealed = revealedMonsters?.[cell];
        const monsterInfo = (monsterMap || MONSTER_MAP)[cell];
        const hasTrap = trapCells?.[cell];

        if (type === "ladder") {
          list.push({ key: `lad-${cell}`, cell, emoji: "🪜", opacity: 0.95 });
        } else if (type === "snake") {
          list.push({ key: `snk-${cell}`, cell, emoji: "🐍", opacity: 0.95 });
        }

        // ยกเลิก Emoji มอนสเตอร์ทั้งหมด — ใช้ PlaneMonster (รูปภาพ 2D) แสดงแทนใน BoardCanvas

        if (hasTrap) {
          list.push({ key: `trap-${cell}`, cell, emoji: "☠️", opacity: 1, dy: 0.28 });
        }

      }
    }
    return list;
  }, [grid, revealedMonsters, trapCells, usedLadders, monsterMap, cellTeleport]);

  return (
    <group>
      {markers.map((m, i) => (
        <MarkerSprite key={m.key} marker={m} phase={i * 0.9} />
      ))}
    </group>
  );
}

function MarkerSprite({ marker, phase }) {
  const ref = useRef(null);
  const [x, , z] = cellToWorld(marker.cell);
  const y = FLOAT_Y + (marker.dy || 0);
  const scale = marker.scale || 0.55;

  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.position.y =
        y + Math.sin(clock.elapsedTime * 1.8 + phase) * 0.06;
    }
  });

  return (
    <sprite
      ref={ref}
      position={[x, y, z]}
      scale={[scale, scale, scale]}
    >
      <spriteMaterial
        map={getEmojiTexture(marker.emoji)}
        transparent
        opacity={marker.opacity}
        depthWrite={false}
      />
    </sprite>
  );
}
