import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts', 'src/game/**/*.test.ts'],
    environment: 'node',
  },
});
