import { useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import type { Group } from "three";

const TILES: Array<[number, number, number, number, string]> = [
  [0.55, 0.85, 0.05, 0.42, "#ffffff"],
  [1.55, 0.7, -0.1, 0.5, "#f7f7f8"],
  [2.35, 0.15, 0.08, 0.48, "#1a1a1e"],
  [0.85, -0.05, 0.12, 0.4, "#ffffff"],
  [1.7, -0.25, -0.05, 0.44, "#161618"],
  [2.45, -0.75, 0.02, 0.46, "#f4f4f6"],
];

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function TileCluster({ animate }: { animate: boolean }) {
  const group = useRef<Group>(null);

  useFrame((state) => {
    if (!group.current) return;
    if (!animate) {
      group.current.rotation.set(0.04, -0.18, 0);
      return;
    }
    const targetY = -0.12 + state.pointer.x * 0.28;
    const targetX = 0.06 - state.pointer.y * 0.16;
    group.current.rotation.y += (targetY - group.current.rotation.y) * 0.05;
    group.current.rotation.x += (targetX - group.current.rotation.x) * 0.05;
    group.current.position.y = Math.sin(state.clock.elapsedTime * 0.6) * 0.05;
  });

  return (
    <>
      <ambientLight intensity={0.85} />
      <directionalLight position={[2, 3, 4]} intensity={1.15} color="#ffffff" />
      <pointLight position={[1.8, 1.2, 2]} intensity={8} color="#c4b5fd" distance={8} />
      <group ref={group} position={[-1.35, 0, 0]}>
        {TILES.map(([x, y, z, scale, color], index) => (
          <Float
            key={index}
            speed={animate ? 1 + index * 0.12 : 0}
            rotationIntensity={0}
            floatIntensity={animate ? 0.28 : 0}
          >
            <mesh position={[x, y, z]} scale={scale}>
              <circleGeometry args={[1, 48]} />
              <meshPhysicalMaterial
                color={color}
                metalness={0.08}
                roughness={0.22}
                clearcoat={1}
                clearcoatRoughness={0.12}
              />
            </mesh>
          </Float>
        ))}
      </group>
    </>
  );
}

export default function AiGuidanceScene() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    setAnimate(!prefersReducedMotion());
    const node = hostRef.current;
    if (!node) return undefined;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.15 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={hostRef} className="h-full w-full">
      <Canvas
        className="ai-hero-canvas"
        camera={{ position: [0, 0.1, 5.2], fov: 38 }}
        dpr={[1, 1.5]}
        frameloop={visible && animate ? "always" : "demand"}
        gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
        }}
      >
        <TileCluster animate={animate} />
      </Canvas>
    </div>
  );
}
