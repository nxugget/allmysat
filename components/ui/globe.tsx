"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Color, Scene, Fog, PerspectiveCamera, Vector3, DoubleSide } from "three";
import ThreeGlobe from "three-globe";
import { useThree, Canvas, extend } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import countries from "@/data/globe.json";

declare module "@react-three/fiber" {
  interface ThreeElements {
    threeGlobe: ThreeElements["mesh"] & {
      new (): ThreeGlobe;
    };
  }
}

extend({ ThreeGlobe: ThreeGlobe });

const RING_PROPAGATION_SPEED = 3;
const aspect = 1;
const cameraZ = 300;

type Position = {
  order: number;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  arcAlt: number;
  color: string;
  startStation: string;
  startType: string;
  endStation: string;
  endType: string;
};

export type GlobeConfig = {
  pointSize?: number;
  globeColor?: string;
  showAtmosphere?: boolean;
  atmosphereColor?: string;
  atmosphereAltitude?: number;
  emissive?: string;
  emissiveIntensity?: number;
  shininess?: number;
  polygonColor?: string;
  ambientLight?: string;
  directionalLeftLight?: string;
  directionalTopLight?: string;
  pointLight?: string;
  arcTime?: number;
  arcLength?: number;
  rings?: number;
  maxRings?: number;
  initialPosition?: {
    lat: number;
    lng: number;
  };
  autoRotate?: boolean;
  autoRotateSpeed?: number;
};

export type StationData = {
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
function StationMarker({
  station,
  globeInstance,
}: {
  station: StationData;
  globeInstance: ThreeGlobe;
}) {
  const groupRef = useRef<any>(null);
  const ringRef = useRef<any>(null);
  const [hovered, setHovered] = useState(false);
  
  // Random delay for this station's ring pulsation (0 to 1.2s)
  const ringDelayRef = useRef(Math.random() * 1.2);

  // Use three-globe's own getCoords so markers match arc endpoints exactly
  const coords = globeInstance.getCoords(station.lat, station.lng, 0.01);
  const basePos = useRef(new Vector3(coords.x, coords.y, coords.z));
  // Normal pointing away from globe center (for lookAt)
  const outwardDir = useRef(new Vector3(coords.x, coords.y, coords.z).normalize().multiplyScalar(200));

  const onPointerOver = useCallback((e: any) => {
    e.stopPropagation();
    setHovered(true);
    document.body.style.cursor = "pointer";
  }, []);

  const onPointerOut = useCallback((e: any) => {
    e.stopPropagation();
    setHovered(false);
    document.body.style.cursor = "auto";
  }, []);

  // Orient group to face outward from globe + animate ring with random delay
  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.lookAt(outwardDir.current);
    }
    if (ringRef.current) {
      const time = (clock.elapsedTime - ringDelayRef.current) % 1.2; // fast cycle: 1.2s with random offset
      const scale = 1 + time * 2.5;
      const opacity = Math.max(0, 1 - time / 1.2);
      ringRef.current.scale.setScalar(scale);
      ringRef.current.material.opacity = opacity * 0.7;
    }
  });

  return (
    <group
      ref={groupRef}
      position={basePos.current}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
    >
      {/* Flat 2D circle - station dot */}
      <mesh>
        <circleGeometry args={[1.8, 32]} />
        <meshBasicMaterial
          color={station.color}
          transparent
          opacity={0.9}
          side={DoubleSide}
        />
      </mesh>
      {/* Propagating white ring - thin 2D line */}
      <mesh ref={ringRef} position={[0, 0, 0.01]}>
        <ringGeometry args={[1.6, 1.9, 64]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.7}
          side={DoubleSide}
        />
      </mesh>
      {hovered && (
        <>
          {/* Hover ring */}
          <mesh position={[0, 0, 0.02]}>
            <ringGeometry args={[2.5, 4, 32]} />
            <meshBasicMaterial
              color={station.color}
              transparent
              opacity={0.5}
              side={DoubleSide}
            />
          </mesh>
          {/* HTML tooltip */}
          <Html
            distanceFactor={300}
            style={{ pointerEvents: "none" }}
            center
            position={[0, 8, 0]}
          >
            <div className="bg-slate-900/95 backdrop-blur-md border border-slate-600/50 rounded-xl px-4 py-2.5 shadow-xl shadow-black/40 whitespace-nowrap animate-in fade-in zoom-in-95 duration-150">
              <div
                className="absolute inset-x-6 -bottom-px h-px"
                style={{
                  background: `linear-gradient(to right, transparent, ${station.color}, transparent)`,
                }}
              />
              <div className="text-sm font-bold text-white">{station.name}</div>
              <div className="text-xs text-gray-300 mt-0.5 flex items-center gap-1">
                <span>{typeIcons[station.type] || "📍"}</span>
                <span>{station.type}</span>
              </div>
              <div className="text-[10px] text-gray-500 mt-0.5">
                {station.lat.toFixed(1)}°{" "}
                {station.lat >= 0 ? "N" : "S"},{" "}
                {Math.abs(station.lng).toFixed(1)}°{" "}
                {station.lng >= 0 ? "E" : "W"}
              </div>
            </div>
          </Html>
        </>
      )}
    </group>
  );
}

interface WorldProps {
  globeConfig: GlobeConfig;
  data: Position[];
  stations?: StationData[];
  isPaused?: boolean;
}

export function Globe({ globeConfig, data, stations = [] }: WorldProps) {
  const globeRef = useRef<ThreeGlobe | null>(null);
  const groupRef = useRef<any>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const defaultProps = {
    pointSize: 1,
    atmosphereColor: "#ffffff",
    showAtmosphere: true,
    atmosphereAltitude: 0.1,
    polygonColor: "rgba(255,255,255,0.7)",
    globeColor: "#1d072e",
    emissive: "#000000",
    emissiveIntensity: 0.1,
    shininess: 0.9,
    arcTime: 2000,
    arcLength: 0.9,
    rings: 1,
    maxRings: 3,
    ...globeConfig,
  };

  useEffect(() => {
    if (!globeRef.current && groupRef.current) {
      globeRef.current = new ThreeGlobe();
      (groupRef.current as any).add(globeRef.current);
      setIsInitialized(true);
    }
  }, []);

  useEffect(() => {
    if (!globeRef.current || !isInitialized) return;

    const globeMaterial = globeRef.current.globeMaterial() as unknown as {
      color: Color;
      emissive: Color;
      emissiveIntensity: number;
      shininess: number;
    };
    globeMaterial.color = new Color(globeConfig.globeColor);
    globeMaterial.emissive = new Color(globeConfig.emissive);
    globeMaterial.emissiveIntensity = globeConfig.emissiveIntensity || 0.1;
    globeMaterial.shininess = globeConfig.shininess || 0.9;
  }, [
    isInitialized,
    globeConfig.globeColor,
    globeConfig.emissive,
    globeConfig.emissiveIntensity,
    globeConfig.shininess,
  ]);

  useEffect(() => {
    if (!globeRef.current || !isInitialized || !data) return;

    const arcs = data;
    const points: {
      size: number;
      order: number;
      color: string;
      lat: number;
      lng: number;
    }[] = [];

    for (let i = 0; i < arcs.length; i++) {
      const arc = arcs[i];
      points.push({
        size: defaultProps.pointSize,
        order: arc.order,
        color: arc.color,
        lat: arc.startLat,
        lng: arc.startLng,
      });
      points.push({
        size: defaultProps.pointSize,
        order: arc.order,
        color: arc.color,
        lat: arc.endLat,
        lng: arc.endLng,
      });
    }

    const filteredPoints = points.filter(
      (v, i, a) =>
        a.findIndex((v2) =>
          (["lat", "lng"] as const).every((k) => v2[k] === v[k])
        ) === i
    );

    globeRef.current
      .hexPolygonsData(countries.features)
      .hexPolygonResolution(3)
      .hexPolygonMargin(0.7)
      .showAtmosphere(defaultProps.showAtmosphere)
      .atmosphereColor(defaultProps.atmosphereColor)
      .atmosphereAltitude(defaultProps.atmosphereAltitude)
      .hexPolygonColor(() => defaultProps.polygonColor);

    globeRef.current
      .arcsData(data)
      .arcStartLat((d) => (d as { startLat: number }).startLat * 1)
      .arcStartLng((d) => (d as { startLng: number }).startLng * 1)
      .arcEndLat((d) => (d as { endLat: number }).endLat * 1)
      .arcEndLng((d) => (d as { endLng: number }).endLng * 1)
      .arcColor((e: any) => (e as { color: string }).color)
      .arcAltitude((e) => (e as { arcAlt: number }).arcAlt * 1)
      .arcStroke(() => [0.32, 0.28, 0.3][Math.round(Math.random() * 2)])
      .arcDashLength(defaultProps.arcLength)
      .arcDashInitialGap((e) => (e as { order: number }).order * 1)
      .arcDashGap(4)
      .arcDashAnimateTime(() => defaultProps.arcTime);

    // Don't add pointsData - use StationMarker components instead to avoid duplicates

    globeRef.current
      .ringsData([])
      .ringColor(() => defaultProps.polygonColor)
      .ringMaxRadius(defaultProps.maxRings)
      .ringPropagationSpeed(RING_PROPAGATION_SPEED)
      .ringRepeatPeriod(
        (defaultProps.arcTime * defaultProps.arcLength) / defaultProps.rings
      );
  }, [
    isInitialized,
    data,
    defaultProps.pointSize,
    defaultProps.showAtmosphere,
    defaultProps.atmosphereColor,
    defaultProps.atmosphereAltitude,
    defaultProps.polygonColor,
    defaultProps.arcLength,
    defaultProps.arcTime,
    defaultProps.rings,
    defaultProps.maxRings,
  ]);

  useEffect(() => {
    if (!globeRef.current || !isInitialized || !data) return;

    // Build a pool of ALL unique points (both start and end of each arc)
    const allPoints: { lat: number; lng: number; color: string }[] = [];
    data.forEach((d) => {
      allPoints.push({ lat: d.startLat, lng: d.startLng, color: d.color });
      allPoints.push({ lat: d.endLat, lng: d.endLng, color: d.color });
    });
    // Deduplicate by lat+lng
    const uniquePoints = allPoints.filter(
      (v, i, a) => a.findIndex((p) => p.lat === v.lat && p.lng === v.lng) === i
    );

    const interval = setInterval(() => {
      if (!globeRef.current) return;

      // Pick a random subset of unique points for ring animation
      const count = Math.max(1, Math.floor(Math.random() * uniquePoints.length * 0.5) + 1);
      const indices = genRandomNumbers(0, uniquePoints.length, count);

      const ringsData = indices.map((i) => uniquePoints[i]);

      globeRef.current.ringsData(ringsData);
    }, 2000);

    return () => {
      clearInterval(interval);
    };
  }, [isInitialized, data]);

  return (
    <group ref={groupRef}>
      {isInitialized && globeRef.current && stations.map((st, i) => (
        <StationMarker key={`${st.lat}-${st.lng}-${i}`} station={st} globeInstance={globeRef.current!} />
      ))}
    </group>
  );
}

export function WebGLRendererConfig() {
  const { gl, size } = useThree();

  useEffect(() => {
    gl.setPixelRatio(window.devicePixelRatio);
    gl.setSize(size.width, size.height);
    gl.setClearColor(0xffaaff, 0);
  }, [gl, size]);

  return null;
}

const scene = new Scene();
scene.fog = new Fog(0xffffff, 400, 2000);
const camera = new PerspectiveCamera(50, aspect, 180, 1800);

export function World(props: WorldProps) {
  const { globeConfig, isPaused = false } = props;

  return (
    <Canvas scene={scene} camera={camera}>
      <WebGLRendererConfig />
      <ambientLight color={globeConfig.ambientLight} intensity={0.6} />
      <directionalLight
        color={globeConfig.directionalLeftLight}
        position={new Vector3(-400, 100, 400)}
      />
      <directionalLight
        color={globeConfig.directionalTopLight}
        position={new Vector3(-200, 500, 200)}
      />
      <pointLight
        color={globeConfig.pointLight}
        position={new Vector3(-200, 500, 200)}
        intensity={0.8}
      />
      <Globe {...props} />
      <OrbitControls
        enablePan={false}
        enableZoom={false}
        minDistance={cameraZ}
        maxDistance={cameraZ}
        autoRotateSpeed={1}
        autoRotate={!isPaused}
        minPolarAngle={Math.PI / 3.5}
        maxPolarAngle={Math.PI - Math.PI / 3}
      />
    </Canvas>
  );
}

export function hexToRgb(hex: string) {
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  hex = hex.replace(shorthandRegex, function (_m, r, g, b) {
    return r + r + g + g + b + b;
  });

  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

export function genRandomNumbers(min: number, max: number, count: number) {
  const arr: number[] = [];
  while (arr.length < count) {
    const r = Math.floor(Math.random() * (max - min)) + min;
    if (arr.indexOf(r) === -1) arr.push(r);
  }
  return arr;
}
