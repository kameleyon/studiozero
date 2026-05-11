import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    target: "es2022",
    rollupOptions: {
      output: {
        manualChunks: {
          three: ["three"],
          r3f: ["@react-three/fiber", "@react-three/drei"],
          xr: ["@react-three/xr"],
        },
      },
    },
  },
  // WebXR requires HTTPS in production. For dev on real devices, use:
  //   vite --host --https  (then trust the cert on your headset)
});
