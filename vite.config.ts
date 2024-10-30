import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import json from '@rollup/plugin-json'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue(), json()],
  server: {
    host: '0.0.0.0',
    port: 1199
  }
})
