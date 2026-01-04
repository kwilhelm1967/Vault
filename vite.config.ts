import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { loadEnv } from "vite";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// Properly handle Windows paths with spaces (e.g., "Kelly's Laptop")
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
      cssCodeSplit: true,
      rollupOptions: {
        input: {
          main: resolve(__dirname, "index.html"),
          floatingButton: resolve(__dirname, "LPV/floating-button.html"),
        },
        output: {
          // Code splitting for better caching and smaller initial bundle
          manualChunks: {
            // Vendor chunks
            "vendor-react": ["react", "react-dom"],
            "vendor-i18n": ["i18next", "react-i18next"],
            "vendor-icons": ["lucide-react"],
            // Feature chunks
            "feature-settings": [
              "./src/components/Settings.tsx",
              "./src/components/settings/SettingsModals.tsx",
            ],
            "feature-faq": ["./src/components/FAQ.tsx"],
            "feature-onboarding": [
              "./src/components/OnboardingTutorial.tsx",
              "./src/components/WhatsNewModal.tsx",
            ],
            "feature-mobile": [
              "./src/components/MobileAccess.tsx",
              "./src/utils/mobileService.ts",
            ],
          },
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
