import { defineConfig } from 'vitest/config';
import { existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const compilerSrcExists = existsSync(resolve(__dirname, '../compiler/src'));

export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom',
    ...(compilerSrcExists ? {} : {
      exclude: [
        '**/node_modules/**',
        'tests/unit/compiler-byte-determinism.test.js',
        'tests/unit/compiler-constraints-parser-css-architecture.test.js',
      ],
    }),
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
