import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import dts from "vite-plugin-dts";

export default defineConfig(async () => {
  return {
    build: {
      lib: {
        entry: "index.ts",
        name: "XmtpHooks",
      },
      rollupOptions: {
        external: ["react", "react-dom"],
      },
    },
    plugins: [react(), dts({ outputDir: "dist/types" })],
  };
});
