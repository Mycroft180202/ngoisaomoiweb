"use client";

import { Component, useEffect, useMemo, useRef, useState } from "react";
import type { ComponentRef, ErrorInfo, ReactNode, RefObject } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Html, OrbitControls, Sparkles, Stars } from "@react-three/drei";

export interface GlobeDestination {
  key: string;
  name: string;
  country: string;
  eyebrow: string;
  lat: number;
  lng: number;
}

interface TravelGlobeProps {
  destinations: GlobeDestination[];
  activeKey: string;
  onSelect: (key: string) => void;
}

const GLOBE_RADIUS = 2;
const MARKER_RADIUS = GLOBE_RADIUS + 0.018;
const SELECTION_ROTATION_DURATION = 1.8;
const COASTLINE_DATA_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/land-50m.json";

/**
 * WGS84 latitude/longitude to the single right-handed coordinate system used
 * by the globe: +Y North, +X Greenwich (0°), -Z 90° East.
 */
export const latLngToVector3 = (lat: number, lng: number, radius = MARKER_RADIUS) => {
  const latRadians = lat * (Math.PI / 180);
  const lngRadians = lng * (Math.PI / 180);
  return new THREE.Vector3(
    radius * Math.cos(latRadians) * Math.cos(lngRadians),
    radius * Math.sin(latRadians),
    -radius * Math.cos(latRadians) * Math.sin(lngRadians),
  );
};

function DestinationMarker({
  destination,
  active,
  onSelect,
  surfaceRef,
}: {
  destination: GlobeDestination;
  active: boolean;
  onSelect: () => void;
  surfaceRef: RefObject<THREE.Mesh>;
}) {
  const haloRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const position = useMemo(
    () => latLngToVector3(destination.lat, destination.lng),
    [destination.lat, destination.lng],
  );

  useFrame(({ clock }) => {
    if (!haloRef.current) return;
    const pulse = 1 + Math.sin(clock.elapsedTime * 3.2 + destination.lat) * 0.22;
    haloRef.current.scale.setScalar((active ? 1.2 : 1) * (hovered ? 1.2 : 1) * pulse);
  });

  return (
    <group position={position}>
      <mesh
        onClick={(event) => {
          event.stopPropagation();
          onSelect();
        }}
        onPointerEnter={() => { setHovered(true); document.body.style.cursor = "pointer"; }}
        onPointerLeave={() => { setHovered(false); document.body.style.cursor = ""; }}
      >
        <sphereGeometry args={[active ? 0.06 : hovered ? 0.059 : 0.046, 20, 20]} />
        <meshBasicMaterial color={active ? "#ff8a4c" : "#53ddf4"} toneMapped={false} />
      </mesh>
      <mesh ref={haloRef}>
        <sphereGeometry args={[active ? 0.11 : 0.088, 16, 16]} />
        <meshBasicMaterial
          color={active ? "#ff6b35" : "#00d4d0"}
          transparent
          opacity={active ? 0.2 : 0.1}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      {active && (
        <Html position={[0, 0, 0]} center={false} occlude={[surfaceRef]} zIndexRange={[20, 0]}>
          <article className="v2-globe-card" aria-live="polite">
            <span className="v2-globe-card__connector" aria-hidden="true" />
            <small>{destination.eyebrow}</small>
            <strong>{destination.name}</strong>
            <p><i /> Sẵn sàng khám phá</p>
          </article>
        </Html>
      )}
    </group>
  );
}

function GlobeGrid() {
  const geometry = useMemo(() => {
    const radius = GLOBE_RADIUS + 0.008;
    const segments = 96;
    const points: number[] = [];
    const addSegment = (a: THREE.Vector3, b: THREE.Vector3) => points.push(a.x, a.y, a.z, b.x, b.y, b.z);

    for (let latitude = -75; latitude <= 75; latitude += 15) {
      for (let segment = 0; segment < segments; segment += 1) {
        const start = (segment / segments) * 360;
        const end = ((segment + 1) / segments) * 360;
        addSegment(
          latLngToVector3(latitude, start, radius),
          latLngToVector3(latitude, end, radius),
        );
      }
    }

    for (let longitude = 0; longitude < 360; longitude += 15) {
      for (let segment = 0; segment < segments; segment += 1) {
        const start = -90 + (segment / segments) * 180;
        const end = -90 + ((segment + 1) / segments) * 180;
        addSegment(
          latLngToVector3(start, longitude, radius),
          latLngToVector3(end, longitude, radius),
        );
      }
    }

    return new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
  }, []);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <lineSegments geometry={geometry} renderOrder={2}>
      <lineBasicMaterial color="#69dff4" transparent opacity={0.24} depthWrite={false} />
    </lineSegments>
  );
}

type WorldAtlasTopology = {
  transform: { scale: [number, number]; translate: [number, number] };
  arcs: number[][][];
};

/** Natural Earth land outlines, decoded with the same WGS84 conversion as markers. */
function CoastlineOutlines() {
  const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null);

  useEffect(() => {
    let active = true;

    const loadCoastlines = async () => {
      try {
        const response = await fetch(COASTLINE_DATA_URL);
        if (!response.ok) return;
        const topology = await response.json() as WorldAtlasTopology;
        const positions: number[] = [];
        const radius = GLOBE_RADIUS + 0.012;

        for (const arc of topology.arcs) {
          let x = 0;
          let y = 0;
          const vectors: THREE.Vector3[] = [];
          for (const [deltaX, deltaY] of arc) {
            x += deltaX;
            y += deltaY;
            const longitude = x * topology.transform.scale[0] + topology.transform.translate[0];
            const latitude = y * topology.transform.scale[1] + topology.transform.translate[1];
            vectors.push(latLngToVector3(latitude, longitude, radius));
          }
          for (let index = 1; index < vectors.length; index += 1) {
            const previous = vectors[index - 1];
            const current = vectors[index];
            positions.push(previous.x, previous.y, previous.z, current.x, current.y, current.z);
          }
        }

        const nextGeometry = new THREE.BufferGeometry();
        nextGeometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
        if (active) setGeometry(nextGeometry);
        else nextGeometry.dispose();
      } catch {
        // The globe still works with the coordinate grid if the public dataset is unavailable.
      }
    };

    void loadCoastlines();
    return () => { active = false; };
  }, []);

  useEffect(() => () => geometry?.dispose(), [geometry]);
  if (!geometry) return null;

  return (
    <lineSegments geometry={geometry} renderOrder={3}>
      <lineBasicMaterial color="#8be8f6" transparent opacity={0.34} depthWrite={false} />
    </lineSegments>
  );
}

function GlobeMesh({
  destinations,
  activeKey,
  onSelect,
  reduceMotion,
}: TravelGlobeProps & { reduceMotion: boolean }) {
  const globeRef = useRef<THREE.Group>(null);
  const surfaceRef = useRef<THREE.Mesh>(null!);
  const selectedDestination = destinations.find((destination) => destination.key === activeKey) || destinations[0];
  const selection = selectedDestination
    ? `${selectedDestination.key}:${selectedDestination.lat}:${selectedDestination.lng}`
    : "";
  const rotationRef = useRef<{
    selection: string;
    start: THREE.Quaternion;
    target: THREE.Quaternion;
    elapsed: number;
  } | null>(null);

  useFrame(({ camera }, delta) => {
    const globe = globeRef.current;
    if (!globe || !selectedDestination) return;

    if (rotationRef.current?.selection !== selection) {
      const cameraPosition = camera.getWorldPosition(new THREE.Vector3());
      globe.parent?.worldToLocal(cameraPosition);
      const cameraAzimuth = Math.atan2(cameraPosition.x, cameraPosition.z);
      const cameraElevation = Math.atan2(cameraPosition.y, Math.hypot(cameraPosition.x, cameraPosition.z));
      const position = latLngToVector3(selectedDestination.lat, selectedDestination.lng);
      const northAxis = new THREE.Vector3(0, 1, 0);
      const target = new THREE.Quaternion().setFromAxisAngle(northAxis, cameraAzimuth)
        .multiply(new THREE.Quaternion().setFromAxisAngle(
          new THREE.Vector3(1, 0, 0),
          THREE.MathUtils.degToRad(selectedDestination.lat) - cameraElevation,
        ))
        .multiply(new THREE.Quaternion().setFromAxisAngle(northAxis, -Math.atan2(position.x, position.z)));
      const initialSelection = rotationRef.current === null;
      rotationRef.current = {
        selection,
        start: globe.quaternion.clone(),
        target,
        elapsed: initialSelection ? SELECTION_ROTATION_DURATION : 0,
      };
      if (initialSelection) globe.quaternion.copy(target);
    }

    const rotation = rotationRef.current;
    if (rotation.elapsed >= SELECTION_ROTATION_DURATION) return;
    rotation.elapsed = Math.min(rotation.elapsed + delta, SELECTION_ROTATION_DURATION);
    const progress = rotation.elapsed / SELECTION_ROTATION_DURATION;
    const easedProgress = progress * progress * (3 - 2 * progress);
    globe.quaternion.slerpQuaternions(rotation.start, rotation.target, easedProgress);
  });

  return (
    <Float speed={reduceMotion ? 0 : 1.15} rotationIntensity={reduceMotion ? 0 : 0.08} floatIntensity={reduceMotion ? 0 : 0.22}>
      <group ref={globeRef}>
        <mesh ref={surfaceRef} castShadow receiveShadow>
          <sphereGeometry args={[GLOBE_RADIUS, 72, 72]} />
          <meshStandardMaterial
            color="#063b69"
            emissive="#02192d"
            emissiveIntensity={0.55}
            roughness={0.62}
            metalness={0.18}
          />
        </mesh>
        <GlobeGrid />
        <CoastlineOutlines />
        <mesh scale={1.055}>
          <sphereGeometry args={[GLOBE_RADIUS, 64, 64]} />
          <meshBasicMaterial
            color="#148dc5"
            side={THREE.BackSide}
            transparent
            opacity={0.12}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>

        <mesh rotation={[Math.PI / 2.45, 0.2, 0.1]}>
          <torusGeometry args={[2.28, 0.012, 8, 160]} />
          <meshBasicMaterial color="#00d4aa" transparent opacity={0.44} toneMapped={false} />
        </mesh>
        <mesh rotation={[Math.PI / 1.85, 0.45, -0.2]}>
          <torusGeometry args={[2.42, 0.007, 8, 160]} />
          <meshBasicMaterial color="#8a7dff" transparent opacity={0.28} toneMapped={false} />
        </mesh>

        {destinations.map((destination) => (
          <DestinationMarker
            key={destination.key}
            destination={destination}
            active={destination.key === activeKey}
            onSelect={() => onSelect(destination.key)}
            surfaceRef={surfaceRef}
          />
        ))}
      </group>
    </Float>
  );
}

function GlobeCanvas(props: TravelGlobeProps & { reduceMotion: boolean }) {
  const controlsRef = useRef<ComponentRef<typeof OrbitControls>>(null);
  const [isInteracting, setIsInteracting] = useState(false);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
  }, []);

  const pauseAutoRotation = () => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    setIsInteracting(true);
  };

  const resumeAutoRotation = () => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => setIsInteracting(false), 2800);
  };

  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 7], fov: 42 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      shadows={false}
    >
      <ambientLight intensity={0.52} />
      <directionalLight position={[4, 3, 5]} intensity={3.1} color="#bdeeff" />
      <pointLight position={[-4, -1, 3]} intensity={24} color="#1a4a8a" distance={10} />
      <pointLight position={[2, -3, -2]} intensity={17} color="#ff6b35" distance={8} />
      <Stars radius={60} depth={20} count={900} factor={2.1} saturation={0.7} fade speed={props.reduceMotion ? 0 : 0.25} />
      <Sparkles count={36} scale={7} size={1.5} speed={props.reduceMotion ? 0 : 0.22} color="#75e8ff" opacity={0.45} />
      <GlobeMesh {...props} />
      <OrbitControls
        ref={controlsRef}
        enablePan={false}
        enableZoom={false}
        enableDamping
        dampingFactor={0.07}
        minPolarAngle={Math.PI * 0.25}
        maxPolarAngle={Math.PI * 0.75}
        autoRotate={!props.reduceMotion && !isInteracting}
        autoRotateSpeed={0.14}
        onStart={pauseAutoRotation}
        onEnd={resumeAutoRotation}
      />
    </Canvas>
  );
}

function GlobeFallback() {
  return (
    <div className="v2-globe-fallback" role="img" aria-label="Mô hình quả địa cầu cách điệu">
      <span className="v2-globe-fallback__planet" />
      <span className="v2-globe-fallback__orbit" />
    </div>
  );
}

class GlobeErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn("Không thể khởi tạo trải nghiệm 3D, đang dùng giao diện dự phòng.", error, info);
  }

  render() {
    return this.state.failed ? <GlobeFallback /> : this.props.children;
  }
}

export default function TravelGlobe(props: TravelGlobeProps) {
  const [webGlSupported] = useState(() => {
    try {
      const canvas = document.createElement("canvas");
      return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
    } catch {
      return false;
    }
  });
  const [reduceMotion, setReduceMotion] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = () => setReduceMotion(media.matches);
    media.addEventListener?.("change", updateMotion);

    return () => media.removeEventListener?.("change", updateMotion);
  }, []);

  if (!webGlSupported) return <GlobeFallback />;

  return (
    <GlobeErrorBoundary>
      <div className="v2-globe-canvas" role="img" aria-label="Quả địa cầu 3D tương tác với các điểm đến nổi bật">
        <GlobeCanvas {...props} reduceMotion={reduceMotion} />
      </div>
    </GlobeErrorBoundary>
  );
}
