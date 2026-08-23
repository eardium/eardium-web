import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  return {
    base: env.VITE_BASE_PATH || '/eardium-web/',
    plugins: [react()],
    test: {
      environment: 'node',
      globals: true,
      include: [
        'tests/**/*.test.ts',
        'tests/**/*.test.tsx',
        'supabase/functions/_shared/__tests__/**/*.test.ts',
      ],
    },
  };
});
