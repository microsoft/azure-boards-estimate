import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    basicSsl(),
    react(),
    dts({
      insertTypesEntry: true,
    }),
  ],
  build: {
    outDir: 'build',
    sourcemap: true,
    rollupOptions: {
      input: resolve(__dirname, 'public/index.html'),
      external: ['azure-devops-ui'],
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'vendor';
            }
            if (id.includes('azure-devops')) {
              return 'azure';
            }
            if (id.includes('redux') || id.includes('@reduxjs/toolkit')) {
              return 'redux';
            }
            return 'vendor';
          }
        },
        globals: {
          'azure-devops-ui': 'AzureDevOpsUI'
        }
      },
    },
    target: 'es2020',
    minify: 'esbuild',
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
    strictPort: true,
  },
  publicDir: 'public',
  root: '.',
  define: {
    global: 'globalThis',
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        // Remove the global import to avoid circular dependencies
      },
    },
  },
});
