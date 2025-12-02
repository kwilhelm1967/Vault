import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { loadEnv } from "vite";
import { resolve } from "path";

const __dirname = new URL(".", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on mode
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react()],
    base: "./",
    resolve: {
      alias: {
        "@": resolve(__dirname, "src"),
        "@components": resolve(__dirname, "src/components"),
        "@utils": resolve(__dirname, "src/utils"),
        "@hooks": resolve(__dirname, "src/hooks"),
        "@config": resolve(__dirname, "src/config"),
        "@types": resolve(__dirname, "src/types"),
      },
    },
    define: {
      __BUILD_ID__: JSON.stringify(Date.now().toString(36)),
      __VERSION__: JSON.stringify(env.VITE_APP_VERSION || "1.2.0"),
      __MODE__: JSON.stringify(env.VITE_APP_MODE || mode),
    },
    build: {
      outDir: "dist",
      assetsDir: "assets",
      sourcemap: mode !== "production", // Enable source maps for development and test
      rollupOptions: {
        input: {
          main: resolve(__dirname, "index.html"),
          floatingButton: resolve(__dirname, "floating-button.html"),
        },
        output: {
          manualChunks: undefined,
          // Obfuscate chunk names in production
          chunkFileNames:
            mode === "production"
              ? "assets/[hash].js"
              : "assets/[name]-[hash].js",
          entryFileNames:
            mode === "production"
              ? "assets/[hash].js"
              : "assets/[name]-[hash].js",
          assetFileNames:
            mode === "production"
              ? "assets/[hash].[ext]"
              : "assets/[name]-[hash].[ext]",
        },
      },
    },
    optimizeDeps: {
      exclude: ["lucide-react"],
    },
    server: {
      port: 5173,
      strictPort: true,
      hmr: {
        port: 5173,
      },
    },
  };
});
