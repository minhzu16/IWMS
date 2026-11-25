import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'lcov'],
      reportsDirectory: './coverage',
      exclude: ['node_modules/', 'dist/', '**/*.d.ts', '**/*.config.*'],
      thresholds: {
        lines: 20,
        functions: 35,
        branches: 55,
        statements: 20,
      },
    },
  },
});
