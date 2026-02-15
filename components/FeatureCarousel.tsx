"use client";

import React, { useEffect, useRef } from "react";
import Image from "next/image";

const features = [
  {
    image: "/carousel/satellite.webp",
    title: "Satellite Database",
    description:
      "Browse 10,000+ satellites with detailed orbital parameters, launch dates, and mission status all in one place.",
  },
  {
    image: "/carousel/globe-view.webp",
    title: "3D Globe Tracking",
    description:
      "Visualize satellite positions in real-time on an interactive 3D globe with ground tracks and coverage areas.",
  },
  {
    image: "/carousel/polar-chart.webp",
    title: "Polar Pass Chart",
    description:
      "See upcoming satellite passes in a polar chart view with azimuth, elevation, and optimal observation times.",
  },
  {
    image: "/carousel/grid-square.webp",
    title: "Grid Square Locator",
    description:
      "Automatically calculate your Maidenhead grid square for precise amateur radio satellite communications.",
  },
  {
    image: "/carousel/explainations.webp",
    title: "Orbital Mechanics",
    description:
      "Learn about TLE data, orbital elements, and space mechanics with interactive educational content.",
  },
];

const CARD_W = 340;
const GAP = 24;
const ITEM_W = CARD_W + GAP;
const SET_W = features.length * ITEM_W;
const AUTO_SPEED = 0.5;
const FRICTION = 0.92;

export function FeatureCarousel() {
  const innerRef = useRef<HTMLDivElement>(null);
  // All mutable state lives in refs so the rAF loop never restarts
  const scrollX = useRef(SET_W); // start in 2nd copy
  const velocity = useRef(0);
  const dragging = useRef(false);
  const paused = useRef(false);
  const dragStartX = useRef(0);
  const dragScrollStart = useRef(0);
  const lastX = useRef(0);
  const lastTime = useRef(0);

  // Triple items: [A B C D E] [A B C D E] [A B C D E]
  const tripled = React.useMemo(
    () => [...features, ...features, ...features],
    []
  );

  // Single rAF loop — never torn down, no deps
  useEffect(() => {
    let id = 0;
    function tick() {
      // Auto-scroll when idle
      if (!dragging.current && !paused.current) {
        scrollX.current += AUTO_SPEED;
      }
      // Momentum after drag release
      if (!dragging.current && Math.abs(velocity.current) > 0.05) {
        scrollX.current += velocity.current;
        velocity.current *= FRICTION;
      } else if (!dragging.current) {
        velocity.current = 0;
      }
      // Seamless wrap — stay in [0, SET_W*3)
      if (scrollX.current >= SET_W * 2) scrollX.current -= SET_W;
      else if (scrollX.current < 0) scrollX.current += SET_W;

      if (innerRef.current) {
        innerRef.current.style.transform = `translate3d(${-scrollX.current}px,0,0)`;
      }
      id = requestAnimationFrame(tick);
    }
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, []);

  // Unified pointer helpers
  function onDown(clientX: number) {
    dragging.current = true;
    paused.current = true;
    dragStartX.current = clientX;
    dragScrollStart.current = scrollX.current;
    lastX.current = clientX;
    lastTime.current = performance.now();
    velocity.current = 0;
  }
  function onMove(clientX: number) {
    if (!dragging.current) return;
    scrollX.current = dragScrollStart.current - (clientX - dragStartX.current);
    const now = performance.now();
    const dt = now - lastTime.current;
    if (dt > 0) velocity.current = ((lastX.current - clientX) / dt) * 16;
    lastX.current = clientX;
    lastTime.current = now;
  }
  function onUp() {
    dragging.current = false;
    setTimeout(() => {
      if (!dragging.current) paused.current = false;
    }, 3000);
  }

  return (
    <div
      className="relative overflow-hidden cursor-grab active:cursor-grabbing select-none"
      onMouseDown={(e) => { e.preventDefault(); onDown(e.clientX); }}
      onMouseMove={(e) => onMove(e.clientX)}
      onMouseUp={() => onUp()}
      onMouseLeave={() => { dragging.current = false; paused.current = false; }}
      onTouchStart={(e) => onDown(e.touches[0].clientX)}
      onTouchMove={(e) => onMove(e.touches[0].clientX)}
      onTouchEnd={() => onUp()}
    >
      {/* Fade edges */}
      <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-16 md:w-24 z-10 bg-gradient-to-r from-dark to-transparent" />
      <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-16 md:w-24 z-10 bg-gradient-to-l from-dark to-transparent" />

      <div
        ref={innerRef}
        className="flex will-change-transform"
        style={{ gap: `${GAP}px` }}
      >
        {tripled.map((feature, i) => (
          <div
            key={`${feature.title}-${i}`}
            className="flex-shrink-0 group"
            style={{ width: `${CARD_W}px` }}
          >
            <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-700/40 rounded-2xl overflow-hidden transition-all duration-300 hover:border-blue-500/40 hover:shadow-lg hover:shadow-blue-500/10 h-full">
              <div className="relative h-[360px] sm:h-[420px] md:h-[480px] overflow-hidden">
                <Image
                  src={feature.image}
                  alt={feature.title}
                  fill
                  className="object-cover object-top transition-transform duration-500 group-hover:scale-[1.03] pointer-events-none"
                  draggable={false}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/20 to-transparent" />
              </div>
              <div className="p-4 md:p-5 -mt-16 relative z-10">
                <h3 className="text-lg md:text-xl font-bold text-white mb-1.5 md:mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-400 text-xs md:text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
