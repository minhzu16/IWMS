import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'lcov'],
      reportsDirectory: './coverage',
      exclude: ['node_modules/', 'dist/', 'e2e/', '**/*.d.ts', '**/*.config.*', 'src/api/types/**'],
      thresholds: {
        lines: 6,
        functions: 35,
        branches: 60,
        statements: 6,
      },
    },
  },
});
