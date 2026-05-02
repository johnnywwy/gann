import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  base:'/gann/',
  plugins: [vue()],
  server:{
    host: true,
    proxy: {
      '/api/yahoo': {
        target: 'https://query1.finance.yahoo.com',
        changeOrigin: true,
        secure: true,
        rewrite: path => path.replace(/^\/api\/yahoo/, ''),
      },
    },
  }
})
