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

export default function CellMarkers({ revealedMonsters, trapCells }) {
  const grid = useMemo(() => buildGrid(), []);

  const markers = useMemo(() => {
    const list = [];
    for (const row of grid) {
      for (const cell of row) {
        const type = getCellType(cell);
        const revealed = revealedMonsters?.[cell];
        const monsterInfo = MONSTER_MAP[cell];
        const hasTrap = trapCells?.[cell];

        if (type === "ladder") {
          list.push({ key: `lad-${cell}`, cell, emoji: "🪜", opacity: 0.95 });
        } else if (type === "snake") {
          list.push({ key: `snk-${cell}`, cell, emoji: "🐍", opacity: 0.95 });
        }

        if (revealed) {
          list.push({ key: `mon-${cell}`, cell, emoji: revealed.emoji || "👾", opacity: 1 });
        } else if (type === "boss") {
          list.push({ key: `boss-${cell}`, cell, emoji: "👿", opacity: 0.35 });
        } else if (type === "elite") {
          list.push({ key: `elite-${cell}`, cell, emoji: "⚔️", opacity: 0.35 });
        } else if (type === "healer" && monsterInfo) {
          list.push({ key: `heal-${cell}`, cell, emoji: monsterInfo.emoji || "👼", opacity: 0.95 });
        }

        if (hasTrap) {
          list.push({ key: `trap-${cell}`, cell, emoji: "☠️", opacity: 1, dy: 0.28 });
        }

        if (cell === 90) {
          list.push({ key: "win-90", cell, emoji: "🏆", opacity: 1, dy: 0.5, scale: 0.8 });
        }
      }
    }
    return list;
  }, [grid, revealedMonsters, trapCells]);

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
