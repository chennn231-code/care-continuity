import { defineConfig, type UserConfig } from 'vite';
import react from '@vitejs/plugin-react';

type AppTestConfig = UserConfig & {
  test: {
    environment: 'node';
    environmentMatchGlobs: [string, string][];
  };
};

const config: AppTestConfig = {
  plugins: [react()],
  test: {
    environment: 'node',
    environmentMatchGlobs: [['tests/**/*.test.tsx', 'jsdom']]
  },
  server: {
    host: '127.0.0.1',
    port: 3000,
    strictPort: true
  },
  preview: {
    host: '127.0.0.1',
    port: 3000,
    strictPort: true
  }
};

export default defineConfig(config);
