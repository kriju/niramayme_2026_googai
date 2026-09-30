import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      // Picks the Firebase project in src/lib/firebase.ts: Vercel preview
      // builds use the separate preview project, everything else the live one.
      'import.meta.env.VITE_FIREBASE_TARGET': JSON.stringify(process.env.VERCEL_ENV === 'preview' ? 'preview' : 'production'),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify — file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
    build: {
      rollupOptions: {
        output: {
          // Large third-party libraries change far less often than app code,
          // so they get their own cacheable chunks instead of being
          // reshipped (and re-parsed as one monolith) on every deploy.
          manualChunks: {
            'vendor-firebase': ['firebase/app', 'firebase/firestore'],
            'vendor-motion': ['motion/react'],
            'vendor-ui': ['@base-ui/react', 'lucide-react'],
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          },
        },
      },
    },
  };
});
