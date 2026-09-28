import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'

export default defineConfig({
  plugins: [
    vue(),
    // Element Plus 组件自动按需引入
    AutoImport({
      resolvers: [ElementPlusResolver()],
      dts: 'src/auto-imports.d.ts',
    }),
    Components({
      resolvers: [ElementPlusResolver()],
      dts: 'src/components.d.ts',
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Vue 核心生态
          if (id.includes('node_modules/vue') || id.includes('node_modules/vue-router') || id.includes('node_modules/pinia')) {
            return 'vue-vendor'
          }
          // Element Plus
          if (id.includes('node_modules/element-plus') || id.includes('@element-plus/icons-vue')) {
            return 'element-plus'
          }
          // ECharts
          if (id.includes('node_modules/echarts') || id.includes('node_modules/zrender')) {
            return 'echarts'
          }
          // 3D 相关 (three.js)
          if (id.includes('node_modules/three')) {
            return 'three'
          }
          // GSAP 动画
          if (id.includes('node_modules/gsap')) {
            return 'gsap'
          }
          // Leaflet 地图
          if (id.includes('node_modules/leaflet') || id.includes('node_modules/@vue-leaflet')) {
            return 'leaflet'
          }
          // 其他工具库
          if (id.includes('node_modules/lodash') || id.includes('node_modules/axios') || id.includes('node_modules/dayjs')) {
            return 'utils'
          }
        },
      },
    },
  },
})
