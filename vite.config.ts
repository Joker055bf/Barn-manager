import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      // Relative so the same build resolves under a Pages project subpath and at a domain root.
      base: './',
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      optimizeDeps: {
        entries: ['./index.html']
      },
      plugins: [react()],
      build: {
        target: ['es2015', 'edge88', 'firefox78', 'chrome87', 'safari13'],
        chunkSizeWarningLimit: 2000
      },
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
