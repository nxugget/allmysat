"use client";

import React, { useState, useRef } from "react";
import {
  motion,
  useTransform,
  AnimatePresence,
  useMotionValue,
  useSpring,
} from "motion/react";

export type StationItem = {
  id: number;
  name: string;
  type: string;
  color: string;
  lat: number;
  lng: number;
};

const typeIcons: Record<string, string> = {
  "Phased Array Radar": "📡",
  "Mechanical Radar": "🔭",
  "Optical Telescope": "🔬",
  "SDA C2": "🛡️",
};

export const AnimatedTooltip = ({
  items,
}: {
  items: StationItem[];
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const springConfig = { stiffness: 100, damping: 15 };
  const x = useMotionValue(0);
  const animationFrameRef = useRef<number | null>(null);

  const rotate = useSpring(
    useTransform(x, [-100, 100], [-45, 45]),
    springConfig,
  );
  const translateX = useSpring(
    useTransform(x, [-100, 100], [-50, 50]),
    springConfig,
  );

  const handleMouseMove = (event: any) => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    animationFrameRef.current = requestAnimationFrame(() => {
      const halfWidth = event.target.offsetWidth / 2;
      x.set(event.nativeEvent.offsetX - halfWidth);
    });
  };

  return (
    <>
      {items.map((item) => (
        <div
          className="group relative -mr-2 md:-mr-1"
          key={item.id}
          onMouseEnter={() => setHoveredIndex(item.id)}
          onMouseLeave={() => setHoveredIndex(null)}
        >
          <AnimatePresence>
            {hoveredIndex === item.id && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.6 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  transition: {
                    type: "spring",
                    stiffness: 260,
                    damping: 10,
                  },
                }}
                exit={{ opacity: 0, y: 20, scale: 0.6 }}
                style={{
                  translateX: translateX,
                  rotate: rotate,
                  whiteSpace: "nowrap",
                }}
                className="absolute -top-20 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center justify-center rounded-xl bg-slate-900/95 backdrop-blur-md border border-slate-600/50 px-4 py-2.5 text-xs shadow-xl shadow-black/40"
              >
                <div
                  className="absolute inset-x-10 -bottom-px z-30 h-px w-[40%]"
                  style={{
                    background: `linear-gradient(to right, transparent, ${item.color}, transparent)`,
                  }}
                />
                <div className="absolute -bottom-px left-10 z-30 h-px w-[30%] bg-gradient-to-r from-transparent via-sky-500 to-transparent" />
                <div className="relative z-30 text-sm font-bold text-white">
                  {item.name}
                </div>
                <div className="text-xs text-gray-300 mt-0.5 flex items-center gap-1">
                  <span>{typeIcons[item.type] || "📍"}</span>
                  <span>{item.type}</span>
                </div>
                <div className="text-[10px] text-gray-500 mt-0.5">
                  {item.lat.toFixed(1)}° {item.lat >= 0 ? "N" : "S"}, {Math.abs(item.lng).toFixed(1)}° {item.lng >= 0 ? "E" : "W"}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div
            onMouseMove={handleMouseMove}
            className="relative flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-slate-700/60 bg-slate-900/80 cursor-pointer transition-all duration-300 group-hover:z-30 group-hover:scale-110 group-hover:border-slate-500/80 group-hover:shadow-lg"
            style={{
              boxShadow: hoveredIndex === item.id ? `0 0 20px ${item.color}40` : undefined,
            }}
          >
            <div
              className="w-3 h-3 md:w-3.5 md:h-3.5 rounded-full transition-all duration-300 group-hover:scale-125"
              style={{
                backgroundColor: item.color,
                boxShadow: `0 0 8px ${item.color}80`,
              }}
            />
          </div>
        </div>
      ))}
    </>
  );
};
