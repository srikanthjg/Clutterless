import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.js'],
    include: [
      'tests/**/*.test.js',
      'lib/**/*.test.js',
      'background/**/*.test.js',
      'content/**/*.test.js',
      'popup/**/*.test.js'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.test.js'
      ]
    }
  }
});
