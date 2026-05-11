import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Stats } from "@react-three/drei";
import { useRef } from "react";
import type { Mesh } from "three";

function SpinningCube() {
  const ref = useRef<Mesh>(null);
  useFrame((_, delta) => {
    if (!ref.current) return;
    ref.current.rotation.x += delta * 0.5;
    ref.current.rotation.y += delta * 0.3;
  });
  return (
    <mesh ref={ref}>
      <boxGeometry args={[1.5, 1.5, 1.5]} />
      <meshStandardMaterial color="#7dd3fc" metalness={0.3} roughness={0.4} />
    </mesh>
  );
}

export default function App() {
  return (
    <Canvas
      camera={{ position: [3, 3, 5], fov: 50 }}
      shadows
      dpr={[1, 2]}              // cap DPR at 2 — perf budget
      gl={{ antialias: true, powerPreference: "high-performance" }}
    >
      <color attach="background" args={["#0b0b0b"]} />
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 10, 5]} intensity={1.2} castShadow />
      <SpinningCube />
      <gridHelper args={[10, 10, "#333", "#222"]} />
      <OrbitControls />
      <Stats />
    </Canvas>
  );
}
