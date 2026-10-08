import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { setupFiles: ['./tests/setup.js'], clearMocks: true, restoreMocks: true } });
