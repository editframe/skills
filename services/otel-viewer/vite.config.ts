import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
  },
  root: ".",
  server: {
    port: 4320,
    host: true,
  },
  build: {
    outDir: "dist",
  },
});
