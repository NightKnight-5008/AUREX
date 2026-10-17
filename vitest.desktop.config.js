import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node', // Use node environment for Electron tests
        testTimeout: 20000, // 20 second timeout for tests
        hookTimeout: 20000,
    },
});
