import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'EwvmVue',
      fileName: (format) => `index.${format === 'es' ? 'js' : 'cjs'}`
    },
    rollupOptions: {
      external: ['vue', 'ewvm'],
      output: {
        exports: 'named',
        globals: {
          vue: 'Vue',
          ewvm: 'ewvm'
        }
      }
    }
  }
})
