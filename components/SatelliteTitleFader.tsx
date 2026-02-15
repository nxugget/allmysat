"use client";

import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

const satellites = [
  { name: "ISS", color: "#60a5fa" },
  { name: "NOAA-18", color: "#fde047" },
  { name: "Hubble", color: "#f472b6" },
  { name: "Starlink", color: "#34d399" },
  { name: "Galileo", color: "#c084fc" },
  { name: "Iridium", color: "#fb923c" },
  { name: "GOES-18", color: "#f87171" },
  { name: "GPS", color: "#22d3ee" },
];

export function SatelliteTitleFader({
  onIndex,
}: {
  onIndex?: (i: number) => void;
}) {
  const [index, setIndex] = useState(0);

  const handleIndexChange = useCallback((newIndex: number) => {
    onIndex?.(newIndex);
  }, [onIndex]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const nextIndex = (index + 1) % satellites.length;
      setIndex(nextIndex);
      handleIndexChange(nextIndex);
    }, 4000);
    return () => clearTimeout(timer);
  }, [index, handleIndexChange]);

  const sat = satellites[index];

  return (
    <div className="relative flex items-center justify-center min-h-[3em] w-full">
      <AnimatePresence mode="wait">
        <motion.span
          key={sat.name}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 text-4xl sm:text-6xl md:text-8xl font-extrabold"
          style={{ 
            color: sat.color,
            textShadow: `0 0 50px ${sat.color}cc, 0 0 100px ${sat.color}80, 0 0 150px ${sat.color}40`
          }}
        >
          {sat.name}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}
