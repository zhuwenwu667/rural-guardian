// vite.config.mjs
import { defineConfig } from "file:///C:/Users/50453/Desktop/rural-guardian/rural-guardian/node_modules/vite/dist/node/index.js";
import vue from "file:///C:/Users/50453/Desktop/rural-guardian/rural-guardian/frontend/node_modules/@vitejs/plugin-vue/dist/index.mjs";
import path from "path";
import AutoImport from "file:///C:/Users/50453/Desktop/rural-guardian/rural-guardian/node_modules/unplugin-auto-import/dist/vite.mjs";
import Components from "file:///C:/Users/50453/Desktop/rural-guardian/rural-guardian/node_modules/unplugin-vue-components/dist/vite.mjs";
import { ElementPlusResolver } from "file:///C:/Users/50453/Desktop/rural-guardian/rural-guardian/node_modules/unplugin-vue-components/dist/resolvers.mjs";
var __vite_injected_original_dirname = "C:\\Users\\50453\\Desktop\\rural-guardian\\rural-guardian\\frontend";
var vite_config_default = defineConfig({
  plugins: [
    vue(),
    // Element Plus 组件自动按需引入
    AutoImport({
      resolvers: [ElementPlusResolver()],
      dts: "src/auto-imports.d.ts"
    }),
    Components({
      resolvers: [ElementPlusResolver()],
      dts: "src/components.d.ts"
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "src")
    }
  },
  server: {
    port: 3e3,
    proxy: {
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true
      }
    }
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/vue") || id.includes("node_modules/vue-router") || id.includes("node_modules/pinia")) {
            return "vue-vendor";
          }
          if (id.includes("node_modules/element-plus") || id.includes("@element-plus/icons-vue")) {
            return "element-plus";
          }
          if (id.includes("node_modules/echarts") || id.includes("node_modules/zrender")) {
            return "echarts";
          }
          if (id.includes("node_modules/three")) {
            return "three";
          }
          if (id.includes("node_modules/gsap")) {
            return "gsap";
          }
          if (id.includes("node_modules/leaflet") || id.includes("node_modules/@vue-leaflet")) {
            return "leaflet";
          }
          if (id.includes("node_modules/lodash") || id.includes("node_modules/axios") || id.includes("node_modules/dayjs")) {
            return "utils";
          }
        }
      }
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcubWpzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcNTA0NTNcXFxcRGVza3RvcFxcXFxydXJhbC1ndWFyZGlhblxcXFxydXJhbC1ndWFyZGlhblxcXFxmcm9udGVuZFwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcNTA0NTNcXFxcRGVza3RvcFxcXFxydXJhbC1ndWFyZGlhblxcXFxydXJhbC1ndWFyZGlhblxcXFxmcm9udGVuZFxcXFx2aXRlLmNvbmZpZy5tanNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L1VzZXJzLzUwNDUzL0Rlc2t0b3AvcnVyYWwtZ3VhcmRpYW4vcnVyYWwtZ3VhcmRpYW4vZnJvbnRlbmQvdml0ZS5jb25maWcubWpzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSdcbmltcG9ydCB2dWUgZnJvbSAnQHZpdGVqcy9wbHVnaW4tdnVlJ1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCdcbmltcG9ydCBBdXRvSW1wb3J0IGZyb20gJ3VucGx1Z2luLWF1dG8taW1wb3J0L3ZpdGUnXG5pbXBvcnQgQ29tcG9uZW50cyBmcm9tICd1bnBsdWdpbi12dWUtY29tcG9uZW50cy92aXRlJ1xuaW1wb3J0IHsgRWxlbWVudFBsdXNSZXNvbHZlciB9IGZyb20gJ3VucGx1Z2luLXZ1ZS1jb21wb25lbnRzL3Jlc29sdmVycydcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgcGx1Z2luczogW1xuICAgIHZ1ZSgpLFxuICAgIC8vIEVsZW1lbnQgUGx1cyBcdTdFQzRcdTRFRjZcdTgxRUFcdTUyQThcdTYzMDlcdTk3MDBcdTVGMTVcdTUxNjVcbiAgICBBdXRvSW1wb3J0KHtcbiAgICAgIHJlc29sdmVyczogW0VsZW1lbnRQbHVzUmVzb2x2ZXIoKV0sXG4gICAgICBkdHM6ICdzcmMvYXV0by1pbXBvcnRzLmQudHMnLFxuICAgIH0pLFxuICAgIENvbXBvbmVudHMoe1xuICAgICAgcmVzb2x2ZXJzOiBbRWxlbWVudFBsdXNSZXNvbHZlcigpXSxcbiAgICAgIGR0czogJ3NyYy9jb21wb25lbnRzLmQudHMnLFxuICAgIH0pLFxuICBdLFxuICByZXNvbHZlOiB7XG4gICAgYWxpYXM6IHtcbiAgICAgICdAJzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJ3NyYycpLFxuICAgIH0sXG4gIH0sXG4gIHNlcnZlcjoge1xuICAgIHBvcnQ6IDMwMDAsXG4gICAgcHJveHk6IHtcbiAgICAgICcvYXBpJzoge1xuICAgICAgICB0YXJnZXQ6ICdodHRwOi8vbG9jYWxob3N0OjgwODAnLFxuICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICB9LFxuICAgIH0sXG4gIH0sXG4gIGJ1aWxkOiB7XG4gICAgY2h1bmtTaXplV2FybmluZ0xpbWl0OiA2MDAsXG4gICAgcm9sbHVwT3B0aW9uczoge1xuICAgICAgb3V0cHV0OiB7XG4gICAgICAgIG1hbnVhbENodW5rcyhpZCkge1xuICAgICAgICAgIC8vIFZ1ZSBcdTY4MzhcdTVGQzNcdTc1MUZcdTYwMDFcbiAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ25vZGVfbW9kdWxlcy92dWUnKSB8fCBpZC5pbmNsdWRlcygnbm9kZV9tb2R1bGVzL3Z1ZS1yb3V0ZXInKSB8fCBpZC5pbmNsdWRlcygnbm9kZV9tb2R1bGVzL3BpbmlhJykpIHtcbiAgICAgICAgICAgIHJldHVybiAndnVlLXZlbmRvcidcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gRWxlbWVudCBQbHVzXG4gICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdub2RlX21vZHVsZXMvZWxlbWVudC1wbHVzJykgfHwgaWQuaW5jbHVkZXMoJ0BlbGVtZW50LXBsdXMvaWNvbnMtdnVlJykpIHtcbiAgICAgICAgICAgIHJldHVybiAnZWxlbWVudC1wbHVzJ1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBFQ2hhcnRzXG4gICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdub2RlX21vZHVsZXMvZWNoYXJ0cycpIHx8IGlkLmluY2x1ZGVzKCdub2RlX21vZHVsZXMvenJlbmRlcicpKSB7XG4gICAgICAgICAgICByZXR1cm4gJ2VjaGFydHMnXG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIDNEIFx1NzZGOFx1NTE3MyAodGhyZWUuanMpXG4gICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdub2RlX21vZHVsZXMvdGhyZWUnKSkge1xuICAgICAgICAgICAgcmV0dXJuICd0aHJlZSdcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gR1NBUCBcdTUyQThcdTc1M0JcbiAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ25vZGVfbW9kdWxlcy9nc2FwJykpIHtcbiAgICAgICAgICAgIHJldHVybiAnZ3NhcCdcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gTGVhZmxldCBcdTU3MzBcdTU2RkVcbiAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ25vZGVfbW9kdWxlcy9sZWFmbGV0JykgfHwgaWQuaW5jbHVkZXMoJ25vZGVfbW9kdWxlcy9AdnVlLWxlYWZsZXQnKSkge1xuICAgICAgICAgICAgcmV0dXJuICdsZWFmbGV0J1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBcdTUxNzZcdTRFRDZcdTVERTVcdTUxNzdcdTVFOTNcbiAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ25vZGVfbW9kdWxlcy9sb2Rhc2gnKSB8fCBpZC5pbmNsdWRlcygnbm9kZV9tb2R1bGVzL2F4aW9zJykgfHwgaWQuaW5jbHVkZXMoJ25vZGVfbW9kdWxlcy9kYXlqcycpKSB7XG4gICAgICAgICAgICByZXR1cm4gJ3V0aWxzJ1xuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgfSxcbiAgfSxcbn0pXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQXlYLFNBQVMsb0JBQW9CO0FBQ3RaLE9BQU8sU0FBUztBQUNoQixPQUFPLFVBQVU7QUFDakIsT0FBTyxnQkFBZ0I7QUFDdkIsT0FBTyxnQkFBZ0I7QUFDdkIsU0FBUywyQkFBMkI7QUFMcEMsSUFBTSxtQ0FBbUM7QUFPekMsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDMUIsU0FBUztBQUFBLElBQ1AsSUFBSTtBQUFBO0FBQUEsSUFFSixXQUFXO0FBQUEsTUFDVCxXQUFXLENBQUMsb0JBQW9CLENBQUM7QUFBQSxNQUNqQyxLQUFLO0FBQUEsSUFDUCxDQUFDO0FBQUEsSUFDRCxXQUFXO0FBQUEsTUFDVCxXQUFXLENBQUMsb0JBQW9CLENBQUM7QUFBQSxNQUNqQyxLQUFLO0FBQUEsSUFDUCxDQUFDO0FBQUEsRUFDSDtBQUFBLEVBQ0EsU0FBUztBQUFBLElBQ1AsT0FBTztBQUFBLE1BQ0wsS0FBSyxLQUFLLFFBQVEsa0NBQVcsS0FBSztBQUFBLElBQ3BDO0FBQUEsRUFDRjtBQUFBLEVBQ0EsUUFBUTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sT0FBTztBQUFBLE1BQ0wsUUFBUTtBQUFBLFFBQ04sUUFBUTtBQUFBLFFBQ1IsY0FBYztBQUFBLE1BQ2hCO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFBQSxFQUNBLE9BQU87QUFBQSxJQUNMLHVCQUF1QjtBQUFBLElBQ3ZCLGVBQWU7QUFBQSxNQUNiLFFBQVE7QUFBQSxRQUNOLGFBQWEsSUFBSTtBQUVmLGNBQUksR0FBRyxTQUFTLGtCQUFrQixLQUFLLEdBQUcsU0FBUyx5QkFBeUIsS0FBSyxHQUFHLFNBQVMsb0JBQW9CLEdBQUc7QUFDbEgsbUJBQU87QUFBQSxVQUNUO0FBRUEsY0FBSSxHQUFHLFNBQVMsMkJBQTJCLEtBQUssR0FBRyxTQUFTLHlCQUF5QixHQUFHO0FBQ3RGLG1CQUFPO0FBQUEsVUFDVDtBQUVBLGNBQUksR0FBRyxTQUFTLHNCQUFzQixLQUFLLEdBQUcsU0FBUyxzQkFBc0IsR0FBRztBQUM5RSxtQkFBTztBQUFBLFVBQ1Q7QUFFQSxjQUFJLEdBQUcsU0FBUyxvQkFBb0IsR0FBRztBQUNyQyxtQkFBTztBQUFBLFVBQ1Q7QUFFQSxjQUFJLEdBQUcsU0FBUyxtQkFBbUIsR0FBRztBQUNwQyxtQkFBTztBQUFBLFVBQ1Q7QUFFQSxjQUFJLEdBQUcsU0FBUyxzQkFBc0IsS0FBSyxHQUFHLFNBQVMsMkJBQTJCLEdBQUc7QUFDbkYsbUJBQU87QUFBQSxVQUNUO0FBRUEsY0FBSSxHQUFHLFNBQVMscUJBQXFCLEtBQUssR0FBRyxTQUFTLG9CQUFvQixLQUFLLEdBQUcsU0FBUyxvQkFBb0IsR0FBRztBQUNoSCxtQkFBTztBQUFBLFVBQ1Q7QUFBQSxRQUNGO0FBQUEsTUFDRjtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
