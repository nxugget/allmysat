"use client";

import React from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import dynamic from "next/dynamic";
import { TypewriterEffectSmooth } from "@/components/ui/typewriter-effect";
import { SatelliteTitleFader } from "@/components/SatelliteTitleFader";
import { FeatureCarousel } from "@/components/FeatureCarousel";
import type { StationData } from "@/components/ui/globe";

const World = dynamic(
  () => import("@/components/ui/globe").then((m) => m.World),
  { ssr: false }
);

export default function Home() {
  const [isPaused, setIsPaused] = React.useState(false);

  const globeConfig = React.useMemo(() => ({
    pointSize: 6,
    globeColor: "#0a1e3f",
    showAtmosphere: true,
    atmosphereColor: "#1e3a5f",
    atmosphereAltitude: 0.15,
    emissive: "#051a35",
    emissiveIntensity: 0.3,
    shininess: 80,
    polygonColor: "rgba(245, 245, 245, 0.8)",
    ambientLight: "#4a7ba7",
    directionalLeftLight: "#ffffff",
    directionalTopLight: "#ffffff",
    pointLight: "#ffffff",
    arcTime: 2000,
    arcLength: 0.9,
    rings: 1,
    maxRings: 3,
    initialPosition: { lat: 0, lng: 0 },
    autoRotate: true,
    autoRotateSpeed: 0.5,
  }), []);

  // Define unique stations with their true coordinates and types
  const stations: StationData[] = React.useMemo(() => [
    // Phased Array Radar (Blue #3b82f6)
    { name: "Cape Cod", type: "Phased Array Radar", color: "#3b82f6", lat: 41.75, lng: -70.54 },
    { name: "Eglin", type: "Phased Array Radar", color: "#3b82f6", lat: 30.57, lng: -86.55 },
    { name: "Beale", type: "Phased Array Radar", color: "#3b82f6", lat: 39.13, lng: -121.44 },
    { name: "Cavalier SFS", type: "Phased Array Radar", color: "#3b82f6", lat: 48.72, lng: -97.9 },
    { name: "Clear SFS", type: "Phased Array Radar", color: "#3b82f6", lat: 64.29, lng: -149.19 },
    { name: "Thule", type: "Phased Array Radar", color: "#3b82f6", lat: 76.53, lng: -68.7 },
    { name: "Fylingdales", type: "Phased Array Radar", color: "#3b82f6", lat: 54.36, lng: -0.67 },
    { name: "Cobra Dane", type: "Phased Array Radar", color: "#3b82f6", lat: 52.71, lng: 174.11 },
    { name: "Globus II", type: "Phased Array Radar", color: "#3b82f6", lat: 70.37, lng: 31.11 },
    // Mechanical Radar (Green #10b981)
    { name: "Lincoln Space Surveillance Complex", type: "Mechanical Radar", color: "#10b981", lat: 42.623, lng: -71.488 },
    { name: "Reagan Test Site", type: "Mechanical Radar", color: "#10b981", lat: 8.7167, lng: 167.7333 },
    { name: "Holt", type: "Mechanical Radar", color: "#10b981", lat: -21.816, lng: 114.165 },
    { name: "Ascension", type: "Mechanical Radar", color: "#10b981", lat: -7.97, lng: -14.37 },
    // SDA C2 (Violet #a855f7)
    { name: "18th Space Defense Squadron", type: "SDA C2", color: "#a855f7", lat: 34.74, lng: -120.57 },
    { name: "18th Space Defense Squadron Detachment 1", type: "SDA C2", color: "#a855f7", lat: 32.38, lng: -80.72 },
    // Optical Telescope (Orange #f97316)
    { name: "Maui Space Surveillance Complex", type: "Optical Telescope", color: "#f97316", lat: 20.708010, lng: -156.2576 },
    { name: "Diego Garcia", type: "Optical Telescope", color: "#f97316", lat: -7.41, lng: 72.45 },
    { name: "Socorro", type: "Optical Telescope", color: "#f97316", lat: 34.1, lng: -106.85 },
  ], []);

  const stationArcs = React.useMemo(() => [
    // Phased Array Radar (Blue #3b82f6)
    { order: 1, startLat: 41.75, startLng: -70.54, endLat: 30.57, endLng: -86.55, arcAlt: 0.15, color: "#3b82f6", startStation: "Cape Cod", startType: "Phased Array Radar", endStation: "Eglin", endType: "Phased Array Radar" },
    { order: 1, startLat: 30.57, startLng: -86.55, endLat: 39.13, endLng: -121.44, arcAlt: 0.20, color: "#3b82f6", startStation: "Eglin", startType: "Phased Array Radar", endStation: "Beale AFB", endType: "Phased Array Radar" },
    { order: 1, startLat: 39.13, startLng: -121.44, endLat: 48.72, endLng: -97.9, arcAlt: 0.18, color: "#3b82f6", startStation: "Beale AFB", startType: "Phased Array Radar", endStation: "Cavalier SFS", endType: "Phased Array Radar" },
    { order: 1, startLat: 48.72, startLng: -97.9, endLat: 64.29, endLng: -149.19, arcAlt: 0.30, color: "#3b82f6", startStation: "Cavalier SFS", startType: "Phased Array Radar", endStation: "Clear SFS", endType: "Phased Array Radar" },
    { order: 1, startLat: 64.29, startLng: -149.19, endLat: 76.53, endLng: -68.7, arcAlt: 0.35, color: "#3b82f6", startStation: "Clear SFS", startType: "Phased Array Radar", endStation: "Thule Air Base", endType: "Phased Array Radar" },
    { order: 1, startLat: 76.53, startLng: -68.7, endLat: 54.36, endLng: -0.67, arcAlt: 0.35, color: "#3b82f6", startStation: "Thule Air Base", startType: "Phased Array Radar", endStation: "RAF Fylingdales", endType: "Phased Array Radar" },
    { order: 1, startLat: 54.36, startLng: -0.67, endLat: 41.75, endLng: -70.54, arcAlt: 0.38, color: "#3b82f6", startStation: "RAF Fylingdales", startType: "Phased Array Radar", endStation: "Cape Cod", endType: "Phased Array Radar" },
    { order: 1, startLat: 52.71, startLng: 174.11, endLat: 64.29, endLng: -149.19, arcAlt: 0.30, color: "#3b82f6", startStation: "Cobra Dane", startType: "Phased Array Radar", endStation: "Clear SFS", endType: "Phased Array Radar" },
    { order: 1, startLat: 70.37, startLng: 31.11, endLat: 54.36, endLng: -0.67, arcAlt: 0.32, color: "#3b82f6", startStation: "Globus II", startType: "Phased Array Radar", endStation: "RAF Fylingdales", endType: "Phased Array Radar" },
    
    // Mechanical Radar (Green #10b981)
    { order: 2, startLat: 42.623, startLng: -71.488, endLat: 8.7167, endLng: 167.7333, arcAlt: 0.45, color: "#10b981", startStation: "Lincoln Space Surveillance Complex", startType: "Mechanical Radar", endStation: "Reagan Test Site", endType: "Mechanical Radar" },
    { order: 2, startLat: 8.7167, startLng: 167.7333, endLat: -21.816, endLng: 114.165, arcAlt: 0.35, color: "#10b981", startStation: "Reagan Test Site", startType: "Mechanical Radar", endStation: "Holt SST", endType: "Mechanical Radar" },
    { order: 2, startLat: -21.816, startLng: 114.165, endLat: -7.97, endLng: -14.37, arcAlt: 0.40, color: "#10b981", startStation: "Holt SST", startType: "Mechanical Radar", endStation: "Ascension Island", endType: "Mechanical Radar" },
    { order: 2, startLat: -7.97, startLng: -14.37, endLat: 70.37, endLng: 31.11, arcAlt: 0.48, color: "#10b981", startStation: "Ascension Island", startType: "Mechanical Radar", endStation: "Globus II", endType: "Mechanical Radar" },
    { order: 2, startLat: 70.37, startLng: 31.11, endLat: 52.71, endLng: 174.11, arcAlt: 0.32, color: "#10b981", startStation: "Globus II", startType: "Mechanical Radar", endStation: "Cobra Dane", endType: "Mechanical Radar" },
    
    // Optical Telescope (Orange #f97316)
    { order: 3, startLat: 20.708010, startLng: -156.2576, endLat: -7.41, endLng: 72.45, arcAlt: 0.55, color: "#f97316", startStation: "Maui Space Surveillance Complex", startType: "Optical Telescope", endStation: "Diego Garcia", endType: "Optical Telescope" },
    { order: 3, startLat: -7.41, startLng: 72.45, endLat: 34.1, endLng: -106.85, arcAlt: 0.65, color: "#f97316", startStation: "Diego Garcia", startType: "Optical Telescope", endStation: "Socorro", endType: "Optical Telescope" },
    { order: 3, startLat: 34.1, startLng: -106.85, endLat: 20.708010, endLng: -156.2576, arcAlt: 0.50, color: "#f97316", startStation: "Socorro", startType: "Optical Telescope", endStation: "Maui Space Surveillance Complex", endType: "Optical Telescope" },
    
    // SDA C2 (Violet #a855f7)
    { order: 4, startLat: 34.74, startLng: -120.57, endLat: 32.38, endLng: -80.72, arcAlt: 0.30, color: "#a855f7", startStation: "18th Space Defense Squadron", startType: "SDA C2", endStation: "18th Space Defense Squadron Detachment 1", endType: "SDA C2" },
    { order: 4, startLat: 32.38, startLng: -80.72, endLat: 34.74, endLng: -120.57, arcAlt: 0.30, color: "#a855f7", startStation: "18th Space Defense Squadron Detachment 1", startType: "SDA C2", endStation: "18th Space Defense Squadron", endType: "SDA C2" },
  ], []);


  return (
    <main className="relative overflow-y-auto h-screen snap-y snap-mandatory scrollbar-hide">
      {/* Coming soon banner */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 text-white text-center py-1.5 px-4 text-xs sm:text-sm font-medium shadow-lg">
        <span className="inline-flex items-center gap-1.5">
          <span>📡</span>
          <span>Houston, we have a delay! AllMySat launches April 2026 — currently in orbit, awaiting clearance for landing.</span>
          <span>🛰️</span>
        </span>
      </div>

      {/* AllMySat top-left */}
      <motion.h1
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="fixed top-10 left-4 sm:top-14 sm:left-8 z-30 text-2xl sm:text-4xl md:text-5xl font-extrabold gradient-text"
      >
        AllMySat
      </motion.h1>

      {/* Hero */}
      <section className="relative z-10 overflow-hidden h-screen snap-start snap-always">
      <div className="flex flex-col items-center justify-center h-full px-4 sm:px-6">
        {/* Typewriter */}
        <div className="mb-4 sm:mb-8 text-lg sm:text-2xl md:text-3xl font-semibold text-center text-white/90">
          <TypewriterEffectSmooth
            words={[
              {
                text: "Your companion app for satellite lovers.",
                className: "text-white",
              },
            ]}
            className="text-lg sm:text-2xl md:text-4xl mb-2"
            cursorClassName="bg-blue-400"
          />
        </div>
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-4"
        >
          <span className="text-4xl sm:text-5xl md:text-6xl">🛰️</span>
        </motion.div>
        {/* SatelliteTitleFader */}
        <div className="mb-4 sm:mb-8 w-full flex justify-center">
          <SatelliteTitleFader />
        </div>
        {/* Description */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-center text-gray-200 text-base sm:text-lg md:text-2xl max-w-3xl mb-8 sm:mb-12 px-2"
        >
          The essential app for radio amateurs and satellite enthusiasts.
          Track your favorite satellites in real-time with precise orbital
          data. Get detailed informations for <span className="font-bold text-purple-600" style={{ textShadow: "0 0 15px rgba(124, 58, 237, 1)" }}>10,000+ satellites</span>.
        </motion.p>
        {/* App Store button */}
        <motion.a
          href="#"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="inline-block transition-all duration-300 hover:scale-105 hover:brightness-125 hover:drop-shadow-[0_0_20px_rgba(59,130,246,0.4)]"
        >
          <img
            src="/appstore.svg"
            alt="Download on App Store"
            className="w-[240px] sm:w-[300px] md:w-[360px] h-auto"
          />
        </motion.a>
        {/* Scroll indicator */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3">
          <div className="flex flex-col items-center animate-bounce-slow">
            <span className="text-xs tracking-widest text-gray-500 uppercase mb-2">Scroll</span>
            <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>
        </div>
      </div>
      </section>

      {/* Data Sources & Globe */}
      <section className="relative z-10 h-screen snap-start snap-always flex flex-col overflow-y-auto">

      {/* Data Sources */}
      <div className="flex-shrink-0 w-full px-4 py-8 sm:py-12">
        <div className="max-w-5xl mx-auto">
          {/* Section title */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-8"
          >
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2 sm:mb-3">
              Powered by the most reliable sources
            </h2>
            <p className="text-gray-400 text-sm sm:text-lg md:text-xl max-w-2xl mx-auto px-2">
              AllMySat aggregates orbital data from world-class space agencies and open-source databases, <span className="font-bold text-purple-600" style={{ textShadow: "0 0 15px rgba(124, 58, 237, 1)" }}>updated every 6 hours</span>.
            </p>
          </motion.div>

          {/* Data flow – Desktop */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            viewport={{ once: true }}
            className="hidden md:flex items-center justify-center gap-8"
          >
            {/* Group 1: agencies */}
            <div className="flex items-center gap-6">
              <div className="w-32 h-32 flex-shrink-0 flex items-center justify-center">
                <Image src="/nasa.webp" alt="NASA" width={128} height={128} className="object-contain" />
              </div>
              <div className="w-px h-24 bg-gradient-to-b from-transparent via-slate-500/50 to-transparent" />
              <div className="w-32 h-32 flex-shrink-0 flex items-center justify-center">
                <Image src="/us-space-force.webp" alt="US Space Force" width={128} height={128} className="object-contain" />
              </div>
            </div>

            {/* Arrow */}
            <svg className="w-10 h-10 text-cyan-400/70 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>

            {/* Group 2: data providers */}
            <div className="flex items-center gap-6">
              <div className="w-32 h-32 flex-shrink-0 flex items-center justify-center">
                <Image src="/celestrak.webp" alt="CelesTrak" width={128} height={128} className="object-contain" />
              </div>
              <div className="w-px h-24 bg-gradient-to-b from-transparent via-slate-500/50 to-transparent" />
              <div className="w-32 h-32 flex-shrink-0 flex items-center justify-center">
                <Image src="/satnogs.webp" alt="SatNOGS" width={128} height={128} className="object-contain" />
              </div>
            </div>

            {/* Arrow */}
            <svg className="w-10 h-10 text-blue-400/70 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>

            {/* AllMySat */}
            <div className="flex flex-col items-center gap-1">
              <span className="text-5xl">🛰️</span>
              <span className="text-lg font-bold bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent">
                AllMySat
              </span>
            </div>
          </motion.div>

          {/* Data flow – Mobile */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            viewport={{ once: true }}
            className="md:hidden flex flex-col items-center gap-5"
          >
            <div className="flex items-center gap-8">
              <div className="w-20 h-20 flex-shrink-0 flex items-center justify-center">
                <Image src="/nasa.webp" alt="NASA" width={80} height={80} className="object-contain" />
              </div>
              <div className="w-20 h-20 flex-shrink-0 flex items-center justify-center">
                <Image src="/us-space-force.webp" alt="US Space Force" width={80} height={80} className="object-contain" />
              </div>
            </div>
            <svg className="w-7 h-7 text-cyan-400/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
            <div className="flex items-center gap-8">
              <div className="w-20 h-20 flex-shrink-0 flex items-center justify-center">
                <Image src="/celestrak.webp" alt="CelesTrak" width={80} height={80} className="object-contain" />
              </div>
              <div className="w-20 h-20 flex-shrink-0 flex items-center justify-center">
                <Image src="/satnogs.webp" alt="SatNOGS" width={80} height={80} className="object-contain" />
              </div>
            </div>
            <svg className="w-7 h-7 text-blue-400/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
            <p className="text-2xl font-bold bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent">
              🛰️ AllMySat
            </p>
          </motion.div>
        </div>
      </div>

      {/* Globe Section */}
      <div className="flex-1 flex items-center w-full px-2 sm:px-4">
        <div className="max-w-5xl mx-auto w-full">
          {/* Globe title */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-4 flex flex-col items-center"
          >
            <h2 className="text-xl sm:text-3xl md:text-4xl font-bold text-white mb-2">
              United States Space Surveillance Network
            </h2>
            <p className="text-gray-400 text-xs sm:text-base md:text-lg max-w-2xl mx-auto px-2 mb-3">
              A worldwide network of radars and optical sensors tracking over 27,000 objects in Earth orbit.
            </p>

          </motion.div>

          {/* Globe */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="relative w-full h-[45vh] sm:h-[50vh] md:h-[55vh] rounded-2xl overflow-visible"
          >
            <div className="absolute w-full h-full rounded-2xl overflow-hidden">
              <World data={stationArcs} globeConfig={globeConfig} stations={stations} isPaused={isPaused} />
            </div>
            {/* Pause button - side positioned */}
            <button
              onClick={() => setIsPaused(!isPaused)}
              className="absolute -right-16 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-gradient-to-br from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white transition-all duration-300 shadow-lg hover:shadow-violet-500/50 hover:scale-110"
              title={isPaused ? "Resume" : "Pause"}
            >
              {isPaused ? (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
              )}
            </button>
          </motion.div>
        </div>
      </div>
      </section>

      {/* Features Carousel & Footer */}
      <section className="relative z-10 h-screen snap-start snap-always flex flex-col">

      <div className="flex-1 flex items-center w-full px-2 sm:px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-8 sm:mb-12"
          >
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2 sm:mb-3">
              Everything you need, in your pocket
            </h2>
            <p className="text-gray-400 text-sm sm:text-lg md:text-xl max-w-2xl mx-auto px-2">
              Designed for amateur radio operators and space enthusiasts.
            </p>
          </motion.div>

          <FeatureCarousel />
        </div>
      </div>
      
      {/* Footer */}
      <footer className="relative z-10 w-full border-t border-slate-800/60 bg-slate-950 flex-shrink-0">
        <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <span>Made with</span>
              <span className="text-red-400 animate-pulse">♥</span>
              <span>by the hamradio</span>
              <span className="font-mono text-cyan-400 font-semibold">F4MDX</span>
            </div>
            <div className="flex items-center gap-6">
              <a
                href="/privacy"
                className="text-gray-500 hover:text-gray-300 text-sm transition-colors"
              >
                Privacy Policy
              </a>
              <span className="text-gray-700">·</span>
              <a
                href="https://github.com/nugget"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-500 hover:text-gray-300 text-sm transition-colors"
              >
                GitHub
              </a>
              <span className="text-gray-700">·</span>
              <span className="text-gray-500 text-sm">
                © {new Date().getFullYear()} AllMySat
              </span>
            </div>
          </div>
        </div>
      </footer>
      </section>
    </main>
  );
}
