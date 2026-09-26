import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  root: resolve(__dirname, 'webview'),
  build: {
    outDir: resolve(__dirname, 'dist-webview'),
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, 'webview/main.ts'),
      output: {
        entryFileNames: 'bundle.js',
        assetFileNames: 'bundle.[ext]',
        format: 'iife',
        name: 'EwvmWebview'
      }
    }
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify('production')
  }
})
