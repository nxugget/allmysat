"use client";

import React, { useCallback, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type StationPoint = {
  name: string;
  type: string;
  color: string;
  lat: number;
  lng: number;
};

type Arc = {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  color: string;
  startStation: string;
  startType: string;
  endStation: string;
  endType: string;
};

const typeIcons: Record<string, string> = {
  "Phased Array Radar": "📡",
  "Mechanical Radar": "🔭",
  "Optical Telescope": "🔬",
  "SDA C2": "🛡️",
};

/**
 * Converts lat/lng to a 2D position on the globe assuming an orthographic-ish
 * projection from the front. The globe auto-rotates, so we factor in elapsed time.
 * Since we can't easily read the actual Three.js camera rotation, we use the
 * OrbitControls autoRotateSpeed (1 deg/s) to estimate rotation.
 */
function latLngToScreenPercent(
  lat: number,
  lng: number,
  rotationDeg: number,
  globeCenterX: number,
  globeCenterY: number,
  globeRadius: number
): { x: number; y: number; visible: boolean } {
  const latRad = (lat * Math.PI) / 180;
  const lngRad = ((lng + rotationDeg) * Math.PI) / 180;

  // 3D point on unit sphere
  const x3d = Math.cos(latRad) * Math.sin(lngRad);
  const y3d = Math.sin(latRad);
  const z3d = Math.cos(latRad) * Math.cos(lngRad);

  // Only visible if facing camera (z > 0)
  const visible = z3d > 0.1;

  const screenX = globeCenterX + x3d * globeRadius;
  const screenY = globeCenterY - y3d * globeRadius;

  return { x: screenX, y: screenY, visible };
}

export function GlobeOverlay({ arcs }: { arcs: Arc[] }) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<StationPoint | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const startTimeRef = useRef(Date.now());

  // Build unique station points
  const stations = React.useMemo(() => {
    const map = new Map<string, StationPoint>();
    arcs.forEach((arc) => {
      const sk = `${arc.startLat},${arc.startLng}`;
      if (!map.has(sk)) {
        map.set(sk, {
          name: arc.startStation,
          type: arc.startType,
          color: arc.color,
          lat: arc.startLat,
          lng: arc.startLng,
        });
      }
      const ek = `${arc.endLat},${arc.endLng}`;
      if (!map.has(ek)) {
        map.set(ek, {
          name: arc.endStation,
          type: arc.endType,
          color: arc.color,
          lat: arc.endLat,
          lng: arc.endLng,
        });
      }
    });
    return Array.from(map.values());
  }, [arcs]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!overlayRef.current) return;

      const rect = overlayRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Globe is centered in the container
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      // Globe radius is roughly 40% of the smaller dimension
      const radius = Math.min(rect.width, rect.height) * 0.38;

      // Estimate rotation from OrbitControls autoRotateSpeed
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const rotationDeg = elapsed * 12; // ~12 deg/s matches autoRotateSpeed: 1

      let closest: StationPoint | null = null;
      let closestDist = Infinity;

      stations.forEach((st) => {
        const { x, y, visible } = latLngToScreenPercent(
          st.lat,
          st.lng,
          rotationDeg,
          cx,
          cy,
          radius
        );
        if (!visible) return;

        const dist = Math.sqrt((mouseX - x) ** 2 + (mouseY - y) ** 2);
        if (dist < closestDist && dist < 35) { // Slightly larger hitbox
          closestDist = dist;
          closest = st;
        }
      });

      if (closest) {
        setHovered(closest);
        setTooltipPos({ x: mouseX, y: mouseY });
      } else {
        setHovered(null);
      }
    },
    [stations]
  );

  return (
    <div
      ref={overlayRef}
      className="absolute inset-0 z-10"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHovered(null)}
      style={{ cursor: hovered ? "pointer" : "default" }}
    >
      {/* Render glow ring for hovered station on globe */}
      {hovered && (
        <>
          {(() => {
            const rect = overlayRef.current?.getBoundingClientRect();
            if (!rect) return null;

            const cx = rect.width / 2;
            const cy = rect.height / 2;
            const radius = Math.min(rect.width, rect.height) * 0.38;

            const elapsed = (Date.now() - startTimeRef.current) / 1000;
            const rotationDeg = elapsed * 12;

            const { x, y, visible } = latLngToScreenPercent(
              hovered.lat,
              hovered.lng,
              rotationDeg,
              cx,
              cy,
              radius
            );

            if (!visible) return null;

            return (
              <div key={`station-glow-${hovered.name}`}>
                {/* Pulsing glow ring on the station point */}
                <motion.div
                  className="absolute pointer-events-none"
                  style={{
                    left: x,
                    top: y,
                    transform: "translate(-50%, -50%)",
                  }}
                  initial={{ scale: 0 }}
                  animate={{ scale: [1, 1.5, 1] }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  <div
                    className="absolute rounded-full"
                    style={{
                      left: -20,
                      top: -20,
                      width: 40,
                      height: 40,
                      border: `2px solid ${hovered.color}40`,
                      boxShadow: `0 0 20px ${hovered.color}60`,
                    }}
                  />
                </motion.div>

                {/* Bright center dot */}
                <motion.div
                  className="absolute pointer-events-none rounded-full"
                  style={{
                    left: x - 6,
                    top: y - 6,
                    width: 12,
                    height: 12,
                    backgroundColor: hovered.color,
                    boxShadow: `0 0 12px ${hovered.color}, 0 0 24px ${hovered.color}`,
                  }}
                  initial={{ opacity: 0.5, scale: 1 }}
                  animate={{ opacity: [1, 0.5, 1], scale: [1, 1.3, 1] }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
              </div>
            );
          })()}
        </>
      )}

      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            transition={{ duration: 0.15 }}
            className="pointer-events-none absolute z-50"
            style={{
              left: tooltipPos.x,
              top: tooltipPos.y - 70,
              transform: "translateX(-50%)",
            }}
          >
            <div className="bg-slate-900/95 backdrop-blur-md border border-slate-600/50 rounded-xl px-4 py-2.5 shadow-xl shadow-black/40">
              <div
                className="absolute inset-x-6 -bottom-px h-px"
                style={{
                  background: `linear-gradient(to right, transparent, ${hovered.color}, transparent)`,
                }}
              />
              <div className="text-sm font-bold text-white">{hovered.name}</div>
              <div className="text-xs text-gray-300 mt-0.5 flex items-center gap-1">
                <span>{typeIcons[hovered.type] || "📍"}</span>
                <span>{hovered.type}</span>
              </div>
              <div className="text-[10px] text-gray-500 mt-0.5">
                {hovered.lat.toFixed(1)}°{" "}
                {hovered.lat >= 0 ? "N" : "S"},{" "}
                {Math.abs(hovered.lng).toFixed(1)}°{" "}
                {hovered.lng >= 0 ? "E" : "W"}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
