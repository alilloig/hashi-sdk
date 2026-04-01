import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Ensure the local hashi-sdk workspace link is resolved correctly
  optimizeDeps: {
    include: ['hashi-sdk'],
  },
});
