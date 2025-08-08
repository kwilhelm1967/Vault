import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { loadEnv } from 'vite';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on mode
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [react()],
    base: './',
    define: {
      __BUILD_ID__: JSON.stringify(Date.now().toString(36)),
      __VERSION__: JSON.stringify(env.VITE_APP_VERSION || '1.2.0'),
      __MODE__: JSON.stringify(env.VITE_APP_MODE || mode)
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: mode !== 'production', // Enable source maps for development and test
      rollupOptions: {
        output: {
          manualChunks: undefined,
          // Obfuscate chunk names in production
          chunkFileNames: mode === 'production' 
            ? 'assets/[hash].js' 
            : 'assets/[name]-[hash].js',
          entryFileNames: mode === 'production'
            ? 'assets/[hash].js'
            : 'assets/[name]-[hash].js',
          assetFileNames: mode === 'production'
            ? 'assets/[hash].[ext]'
            : 'assets/[name]-[hash].[ext]'
        }
      }
    },
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
    server: {
      port: 5173,
      strictPort: true
    }
    }
});