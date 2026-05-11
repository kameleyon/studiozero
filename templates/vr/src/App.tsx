import { Canvas, useFrame } from "@react-three/fiber";
import { XR, createXRStore } from "@react-three/xr";
import { OrbitControls, Stats } from "@react-three/drei";
import { useRef, useState, useEffect } from "react";
import type { Mesh } from "three";

const xrStore = createXRStore({
  // Comfort defaults — VR hurts when these aren't tuned
  controller: { teleportPointer: true },
  hand: { teleportPointer: true },
  // foveation: 1 (max) saves frame budget on Quest at the cost of edge sharpness
  foveation: 1,
  // Frame rate cap — 90fps is the Quest 3 baseline; 72/80/120 also supported
  frameRate: 90,
});

function FloatingBox() {
  const ref = useRef<Mesh>(null);
  useFrame((_, delta) => {
    if (!ref.current) return;
    ref.current.rotation.y += delta * 0.4;
  });
  return (
    <mesh ref={ref} position={[0, 1.5, -2]} castShadow>
      <boxGeometry args={[0.5, 0.5, 0.5]} />
      <meshStandardMaterial color="#7dd3fc" metalness={0.3} roughness={0.4} />
    </mesh>
  );
}

function Floor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[20, 20]} />
      <meshStandardMaterial color="#222" />
    </mesh>
  );
}

function VRSceneContent() {
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 10, 5]} intensity={1.2} castShadow />
      <FloatingBox />
      <Floor />
      <gridHelper args={[10, 10, "#333", "#222"]} />
    </>
  );
}

export default function App() {
  const [xrSupported, setXrSupported] = useState<boolean | null>(null);
  useEffect(() => {
    if (typeof navigator !== "undefined" && "xr" in navigator) {
      navigator.xr?.isSessionSupported("immersive-vr").then(setXrSupported);
    } else {
      setXrSupported(false);
    }
  }, []);

  return (
    <>
      <Canvas
        shadows
        dpr={[1, 1.5]}                              // cap DPR for headset GPU budget
        camera={{ position: [0, 1.6, 3], fov: 70 }} // 1.6m = average eye height
        gl={{ antialias: true, powerPreference: "high-performance" }}
      >
        <XR store={xrStore}>
          <color attach="background" args={["#000"]} />
          <VRSceneContent />
        </XR>
        {!xrSupported && <OrbitControls />}
        <Stats />
      </Canvas>

      <div className="enter-vr-overlay" style={{ display: xrSupported === false ? "grid" : "none" }}>
        <div style={{ textAlign: "center", padding: 24 }}>
          <h1 style={{ fontSize: 24, marginBottom: 8 }}>WebXR not detected</h1>
          <p style={{ opacity: 0.7, maxWidth: 360 }}>
            Open this page on a Quest browser or any WebXR-capable browser (Chrome on desktop with a connected
            headset, or any browser on Quest 2/3, Vision Pro, etc.).
          </p>
        </div>
      </div>

      {xrSupported && (
        <button
          onClick={() => xrStore.enterVR()}
          style={{
            position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
            padding: "14px 28px", borderRadius: 8, border: "none",
            background: "#7dd3fc", color: "#000", fontWeight: 700, fontSize: 16, cursor: "pointer",
          }}
        >
          Enter VR
        </button>
      )}
    </>
  );
}
