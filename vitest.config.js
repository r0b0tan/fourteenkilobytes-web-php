import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov', 'json-summary'],
      include: [
        'public/admin/lib/**/*.js',
        'public/admin/i18n.js',
        'public/admin/app.js',
        'public/admin/dashboard.js',
      ],
    },
    setupFiles: ['./tests/setup.js'],
  },
});
