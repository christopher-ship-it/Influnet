import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "path";

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  define:
    mode === "production"
      ? {
          "process.env.NODE_ENV": JSON.stringify("production"),
          "process.env": JSON.stringify({ NODE_ENV: "production" }),
        }
      : {},
  build: {
    outDir: resolve(__dirname, "../influnet/messaging"),
    emptyOutDir: true,
    lib: {
      entry: resolve(__dirname, "src/main.tsx"),
      name: "InflunetMessenger",
      formats: ["iife"],
      fileName: () => "infl-messenger.js",
    },
    rollupOptions: {
      output: {
        assetFileNames: "infl-messenger.[ext]",
        inlineDynamicImports: true,
      },
    },
    cssCodeSplit: false,
    sourcemap: mode === "development",
  },
  server: {
    port: 5174,
    open: "/index.html",
  },
}));
