import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/tests/setup.ts',
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/tests/**', // Exclude Playwright E2E tests
      '**/*.spec.ts', // Exclude Playwright test files
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      // vitest 4 only reports files loaded by tests unless include is set;
      // list src so untested modules still count toward the thresholds.
      include: ['src/**'],
      exclude: [
        'node_modules/',
        'src/tests/',
        'tests/', // Playwright/WebdriverIO e2e infrastructure, not unit-testable
        'src/lib/vendor/', // vendored third-party code
        'src/types/', // type declarations only
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
        'dist/',
      ],
      // Coverage thresholds - fail tests if coverage drops below these values.
      // Set from the suite's measured coverage to catch regressions; raise as
      // coverage improves. Re-baselined for vitest 4, whose AST-based
      // remapping counts the functions and branches of untested files
      // (vitest 3 reported those as covered).
      thresholds: {
        lines: 40,
        functions: 37,
        branches: 30,
        statements: 39,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
