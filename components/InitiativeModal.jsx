"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

const HOUSE_MODELS = {
  watrat: "/models/wartaurus.glb",
  plodfindr: "/models/podfindor.glb",
  anal: "/models/analyze.glb",
  slarf: "/models/sraraff.glb",
};

const HOUSE_PREVIEW_SCALES = {
  watrat: 0.95,
  plodfindr: 1.25,
  anal: 1.5,
  slarf: 0.95,
};

function HouseModelPreview({ houseId }) {
  const modelPath = HOUSE_MODELS[houseId];
  if (!modelPath) return null;

  return (
    <Canvas camera={{ position: [0, 1, 4.5], fov: 48 }} dpr={[1, 2]}>
      <ambientLight intensity={2.2} />
      <directionalLight position={[2, 4, 3]} intensity={3.2} color="#fff4d6" />
      <directionalLight position={[-3, 2, 2]} intensity={1.4} color="#8ab4ff" />
      <pointLight position={[0, 1.5, 1]} intensity={1.5} color="#f59e0b" />
      <Suspense fallback={null}>
        <HouseModel modelPath={modelPath} scale={HOUSE_PREVIEW_SCALES[houseId] || 0.95} />
      </Suspense>
    </Canvas>
  );
}

function HouseModel({ modelPath, scale }) {
  const { scene } = useGLTF(modelPath);
  const groupRef = useRef(null);
  const clonedScene = useMemo(() => {
    const clone = scene.clone();
    const box = new THREE.Box3().setFromObject(clone);
    const center = box.getCenter(new THREE.Vector3());
    clone.position.set(-center.x, -box.min.y, -center.z);
    return clone;
  }, [scene]);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.position.y = -0.95 + Math.sin(clock.elapsedTime * 1.2) * 0.035;
    }
  });

  return (
    <group ref={groupRef} position={[0, -0.95, 0]} rotation={[0, 0.18, 0]}>
      <primitive object={clonedScene} scale={[scale, scale, scale]} />
    </group>
  );
}

export default function InitiativeModal({ initiativeRolls, onStartPlay, onOpenAdmin, isHost = false }) {
  const [isRevealed, setIsRevealed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsRevealed(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  if (!initiativeRolls || initiativeRolls.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 min-h-screen select-none overflow-y-auto bg-[#050711] text-white animate-fade-in">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_-10%,rgba(111,78,170,0.42),transparent_42%),radial-gradient(circle_at_8%_70%,rgba(19,104,123,0.18),transparent_30%)]" />
      <div className="pointer-events-none fixed inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] [background-size:56px_56px]" />
      <div className="relative min-h-full w-full flex flex-col items-center text-center px-5 py-8 md:px-10 md:py-12 lg:px-16">
        
        {/* Title */}
        <div className="hidden mb-3 text-[10px] md:text-xs font-black uppercase tracking-[0.45em] text-cyan-200/60">
          The Houses · The Initiative Ritual
        </div>
        <div className="w-full max-w-5xl mb-10">
          <div className="mb-4 text-[0px] font-black uppercase tracking-[0.55em] text-cyan-200/60">
            <span className="text-[11px]">TURN ORDER</span>
            Initiative Phase · Turn Order
          </div>
          <h1 className="text-4xl md:text-7xl font-black uppercase tracking-[0.12em] leading-none text-transparent bg-clip-text bg-gradient-to-b from-amber-100 via-amber-300 to-amber-600 drop-shadow-[0_0_24px_rgba(245,158,11,0.35)]">
            First Move
          </h1>
          <div className="mx-auto mt-5 h-px w-32 bg-gradient-to-r from-transparent via-amber-300 to-transparent" />
        </div>
        <h2 className="hidden text-3xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-amber-100 via-amber-300 to-amber-600 uppercase tracking-[0.08em] mb-3 drop-shadow-[0_0_22px_rgba(245,158,11,0.35)]">
          Turn Order Roll
        </h2>
        <p className="hidden max-w-xl text-sm text-slate-300/70 font-bold mb-10">
          The realm now turns to fate. Each house casts the die to claim the right of first passage across the board.
        </p>

        {/* Rolls Cards Grid */}
        <div className="w-full max-w-[1500px] grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2 mb-10">
          {initiativeRolls.map((item, rank) => {
            const p = item.player;
            const isWinner = rank === 0;

            return (
              <div
                key={p.houseId}
                className={`relative min-h-[430px] p-4 flex flex-col items-stretch justify-between gap-5 overflow-hidden transition-all duration-500 ${
                  isWinner && isRevealed
                    ? "bg-amber-400/[0.04] shadow-[0_0_80px_rgba(245,158,11,0.18)] scale-[1.02]"
                    : "bg-white/[0.015] hover:bg-white/[0.04]"
                }`}
              >
                {isWinner && isRevealed && (
                  <>
                    <div className="pointer-events-none absolute -inset-8 -z-10 rounded-[3rem] bg-[conic-gradient(from_180deg,transparent_0deg,#ef4444_70deg,#f59e0b_140deg,transparent_220deg,#f97316_300deg,transparent_360deg)] opacity-80 blur-2xl animate-[spin_7s_linear_infinite]" />
                    <div className="pointer-events-none absolute inset-x-8 bottom-2 -z-10 h-16 rounded-full bg-orange-500/70 blur-2xl animate-pulse" />
                    <div className="pointer-events-none absolute left-[18%] bottom-3 -z-10 h-20 w-8 rotate-[-12deg] rounded-full bg-gradient-to-t from-red-600 via-orange-400 to-yellow-200 blur-md animate-bounce" />
                    <div className="pointer-events-none absolute left-[45%] bottom-1 -z-10 h-28 w-10 rotate-[4deg] rounded-full bg-gradient-to-t from-red-600 via-orange-400 to-yellow-100 blur-md animate-pulse" />
                    <div className="pointer-events-none absolute right-[18%] bottom-3 -z-10 h-20 w-8 rotate-[14deg] rounded-full bg-gradient-to-t from-red-600 via-orange-400 to-yellow-200 blur-md animate-bounce" />
                  </>
                )}
                <div className="w-full flex items-start justify-between">
                  <div className="text-left">
                    <div className="font-black text-white text-xl tracking-wide">{p.name}</div>
                    <div className="mt-1 text-xs text-amber-200/60 font-bold uppercase tracking-[0.2em]">{p.house}</div>
                  </div>
                  <div className="h-9 min-w-9 px-2 flex items-center justify-center text-sm font-black text-amber-300">
                    #{rank + 1}
                  </div>
                </div>
                  <div className="w-full h-64 bg-[radial-gradient(ellipse_at_center,rgba(104,80,161,0.34),transparent_68%)] overflow-hidden drop-shadow-[0_0_35px_rgba(104,80,161,0.35)]">
                    <HouseModelPreview houseId={p.houseId} />
                  </div>

                <div className="flex items-end justify-between pt-3 text-[0px]">
                  <div className="text-[10px] text-white/50 uppercase tracking-[0.35em] font-black">ROLL</div>
                  <div className="text-[10px] text-white/50 uppercase font-black tracking-[0.25em]">SCORE</div>
                  <div className={`text-5xl font-black tabular-nums ${isWinner && isRevealed ? "text-amber-200 animate-pulse drop-shadow-[0_0_15px_rgba(245,158,11,0.8)]" : "text-cyan-200"}`}>
                    {isRevealed ? item.score : "..."}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Winner banner (kept hidden — the #1 card is already highlighted). */}
        {false && (
          <div className="w-full max-w-7xl p-4 bg-[linear-gradient(90deg,transparent,rgba(245,158,11,0.1),rgba(34,211,238,0.08),rgba(245,158,11,0.1),transparent)] mb-8 text-amber-100 font-black text-base flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(245,158,11,0.12)] animate-fade-in">
            <span>🏆</span>
            <span>{initiativeRolls[0].player.name} rolled the highest ({initiativeRolls[0].score}) and claims the first move!</span>
          </div>
        )}

        {/* Action Buttons — host-only. Players wait while the host launches the match. */}
        <div className="w-full max-w-7xl flex flex-col items-center gap-4">
          {onOpenAdmin && isHost && (
            <button
              onClick={onOpenAdmin}
              className="order-2 w-full max-w-md py-3 px-6 bg-white/[0.04] hover:bg-white/[0.1] text-amber-200/80 font-black text-xs flex items-center justify-center gap-2 shadow-lg transition-all hover:-translate-y-0.5"
              title="Open the Admin panel to configure equipment, gold, and statuses before the board opens."
            >
              <span>Admin Setup</span>
            </button>
          )}

          {isHost && onStartPlay ? (
            <button
              onClick={onStartPlay}
              className="order-1 w-full max-w-md py-4 px-8 bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 hover:from-amber-200 hover:via-yellow-300 hover:to-amber-400 text-slate-950 font-black tracking-wide shadow-[0_0_35px_rgba(245,158,11,0.42)] transition-all hover:-translate-y-0.5 active:scale-[0.98] flex items-center justify-center gap-2 text-base"
            >
              <span>Start Turn 1</span>
            </button>
          ) : (
            <div className="order-1 w-full max-w-md py-4 px-8 bg-white/[0.04] border border-amber-300/20 rounded-xl text-amber-100/70 font-black flex items-center justify-center gap-2 text-sm">
              <span>Awaiting host to begin Turn 1...</span>
            </div>
          )}

          {!isHost && onOpenAdmin && (
            // Non-host admins (e.g. spectator/admins) may still open admin settings
            // while the host controls the match start.
            <button
              onClick={onOpenAdmin}
              className="order-2 w-full max-w-md py-3 px-6 bg-white/[0.04] hover:bg-white/[0.1] text-amber-200/80 font-black text-xs flex items-center justify-center gap-2 shadow-lg transition-all hover:-translate-y-0.5"
              title="Open the Admin panel to configure equipment, gold, and statuses before the board opens."
            >
              <span>Admin Settings</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
