import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5173 },
  build: {
    // Vite default emits to packages/client/dist. vercel.json mirrors it
    // to ./dist at repo root via a symlink so the same artifact resolves
    // whether the deploy target's project root is the repo or the
    // packages/client subdirectory.
    //
    // CCC's core + connector are the bulk of the bundle (~450kB minified
    // unsplit). Splitting them into their own chunk lets the browser cache
    // them independently and keeps the app shell well under the 500kB
    // warning threshold.
    rollupOptions: {
      output: {
        manualChunks(id): string | undefined {
          if (id.includes('node_modules/@ckb-ccc/')) return 'ccc';
          if (id.includes('node_modules/react')) return 'react';
          if (id.includes('node_modules/zod')) return 'zod';
          return undefined;
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: ['./tests/setup.ts'],
  },
});
