import path from "path"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const R2_BASE = 'https://cdn.pubnihtruyen.com';

export default defineConfig({
  plugins: [
    react(),
    {
      // Prevent vite from bundling large onnxruntime-web WASM into dist.
      // ort.env.wasm.wasmPaths (set in ChapterPage.tsx) loads these from R2 at runtime.
      name: 'ort-wasm-r2',
      transform(code, id) {
        if (id.includes('onnxruntime-web') && code.includes('ort-wasm-simd-threaded.jsep.wasm')) {
          return code.replace(
            /new URL\("ort-wasm-simd-threaded\.jsep\.wasm",import\.meta\.url\)/g,
            `"${R2_BASE}/wasm/ort-wasm-simd-threaded.jsep.wasm"`
          );
        }
      }
    }
  ],
  base: '/',
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'credentialless',
    }
  },
  preview: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'credentialless',
    }
  }
})
