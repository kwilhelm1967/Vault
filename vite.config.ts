import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { loadEnv } from "vite";
import { resolve } from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on mode
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react()],
    base: "./",
    define: {
      __BUILD_ID__: JSON.stringify(Date.now().toString(36)),
      __VERSION__: JSON.stringify(env.VITE_APP_VERSION || "1.0.0"),
      __MODE__: JSON.stringify(env.VITE_APP_MODE || mode),
    },
    build: {
      outDir: "dist",
      emptyOutDir: true,
      assetsDir: "assets",
      sourcemap: mode !== "production",
      // Production minification
      minify: mode === "production" ? "esbuild" : false,
      // CSS optimization
      cssCodeSplit: true,
      cssMinify: mode === "production",
      // Chunk size warning
      chunkSizeWarningLimit: 1000,
      // Inline small assets
      assetsInlineLimit: 4096,
      // Performance optimizations
      target: "esnext",
      reportCompressedSize: false,
      rollupOptions: {
        input: {
          main: resolve(__dirname, "index.html"),
        },
        output: {
          // Optimized chunk splitting for faster loading
          manualChunks: (id) => {
            // Vendor chunks - split large libraries separately
            if (id.includes('node_modules')) {
              // React and ReactDOM - critical, load first
              if (id.includes('react') || id.includes('react-dom')) {
                return 'vendor-react';
              }
              // jsPDF - large (~200KB), lazy load only when exporting
              if (id.includes('jspdf')) {
                return 'vendor-jspdf';
              }
              // QR code - medium (~50KB), lazy load
              if (id.includes('qrcode')) {
                return 'vendor-qrcode';
              }
              // Icon library - split separately for tree-shaking
              if (id.includes('lucide-react')) {
                return 'vendor-icons';
              }
              // Stripe - only needed for purchase flow
              if (id.includes('stripe') || id.includes('@stripe')) {
                return 'vendor-stripe';
              }
              // i18next - internationalization
              if (id.includes('i18next') || id.includes('react-i18next')) {
                return 'vendor-i18n';
              }
              // Other small node_modules
              return 'vendor-misc';
            }
            // Large utility services - split for better caching
            if (id.includes('/utils/')) {
              // Export/Import services - large, lazy loaded
              if (id.includes('importService') || id.includes('export')) {
                return 'utils-export';
              }
              // Admin services - rarely used
              if (id.includes('admin')) {
                return 'utils-admin';
              }
            }
            // Admin components - rarely used, lazy load
            if (id.includes('/components/') && id.includes('Admin')) {
              return 'feature-admin';
            }
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
      // Include lucide-react for better tree-shaking
      include: ["lucide-react"],
      // Exclude large dependencies that should be lazy-loaded
      exclude: ["jspdf", "qrcode"],
      // Force pre-bundling of critical dependencies
      force: false,
    },
    // Performance: reduce initial bundle size
    esbuild: {
      // Drop console in production builds
      drop: mode === "production" ? ["console", "debugger"] : [],
    },
    server: {
      port: 5173,
      host: '0.0.0.0',
      strictPort: true,
      hmr: {
        port: 5173,
      },
    },
  };
});
