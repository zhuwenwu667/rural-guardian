<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const mapContainer = ref(null)
const isLoading = ref(true)
let map = null

// 统计数据
const stats = ref({
  elderly: 1424,
  devices: 714,
  alerts: 49
})

// 天津市各区数据
const districtData = [
  { name: '和平区', center: [39.1183, 117.1959], elderly: 89 },
  { name: '河东区', center: [39.1221, 117.2266], elderly: 134 },
  { name: '河西区', center: [39.1019, 117.2175], elderly: 156 },
  { name: '南开区', center: [39.1205, 117.1641], elderly: 178 },
  { name: '河北区', center: [39.1566, 117.2016], elderly: 112 },
  { name: '红桥区', center: [39.1751, 117.1633], elderly: 98 },
  { name: '东丽区', center: [39.0878, 117.3140], elderly: 76 },
  { name: '西青区', center: [39.1394, 117.0122], elderly: 65 },
  { name: '津南区', center: [38.9876, 117.3583], elderly: 58 },
  { name: '北辰区', center: [39.2253, 117.1352], elderly: 72 },
  { name: '武清区', center: [39.3842, 117.0444], elderly: 45 },
  { name: '宝坻区', center: [39.7175, 117.3096], elderly: 38 },
  { name: '滨海新区', center: [39.0333, 117.7016], elderly: 198 },
  { name: '宁河区', center: [39.3306, 117.8261], elderly: 28 },
  { name: '静海区', center: [38.9477, 116.9743], elderly: 42 },
  { name: '蓟州区', center: [40.0458, 117.4080], elderly: 35 },
]

// 街道级数据
const streetData = [
  { name: '劝业场街道', lat: 39.1178, lng: 117.1912, elderly: 32 },
  { name: '小白楼街道', lat: 39.1135, lng: 117.2010, elderly: 28 },
  { name: '南营门街道', lat: 39.1245, lng: 117.1920, elderly: 15 },
  { name: '新兴街道', lat: 39.1090, lng: 117.1870, elderly: 14 },
  { name: '鼓楼街道', lat: 39.1280, lng: 117.1550, elderly: 45 },
  { name: '长虹街道', lat: 39.1420, lng: 117.1480, elderly: 38 },
  { name: '万兴街道', lat: 39.1380, lng: 117.1720, elderly: 35 },
  { name: '学府街道', lat: 39.1050, lng: 117.1780, elderly: 42 },
  { name: '水上公园街道', lat: 39.1000, lng: 117.1600, elderly: 18 },
  { name: '友谊路街道', lat: 39.0980, lng: 117.2100, elderly: 40 },
  { name: '越秀路街道', lat: 39.0950, lng: 117.2250, elderly: 36 },
  { name: '马场街道', lat: 39.0880, lng: 117.2050, elderly: 32 },
  { name: '挂甲寺街道', lat: 39.1120, lng: 117.2180, elderly: 28 },
  { name: '下瓦房街道', lat: 39.1050, lng: 117.2280, elderly: 20 },
  { name: '大王庄街道', lat: 39.1200, lng: 117.2250, elderly: 38 },
  { name: '大直沽街道', lat: 39.1150, lng: 117.2320, elderly: 34 },
  { name: '中山门街道', lat: 39.1100, lng: 117.2400, elderly: 30 },
  { name: '常州道街道', lat: 39.1250, lng: 117.2350, elderly: 22 },
  { name: '泰达街道', lat: 39.0200, lng: 117.6800, elderly: 65 },
  { name: '塘沽街道', lat: 39.0000, lng: 117.6500, elderly: 52 },
  { name: '新北街道', lat: 39.0250, lng: 117.7100, elderly: 35 },
  { name: '杭州道街道', lat: 39.0150, lng: 117.6400, elderly: 28 },
]

function getColor(elderly) {
  if (elderly > 100) return '#ef4444'
  if (elderly > 50) return '#fbbf24'
  return '#4fc3f7'
}

function createCircleMarker(lat, lng, elderly, name) {
  const color = getColor(elderly)
  const radius = Math.min(elderly / 3 + 8, 20)

  return L.circleMarker([lat, lng], {
    radius: radius,
    fillColor: color,
    color: '#fff',
    weight: 2,
    opacity: 1,
    fillOpacity: 0.8
  }).bindTooltip(`
    <div style="font-size: 12px; padding: 4px;">
      <strong>${name}</strong><br/>
      服务老人: ${elderly}人
    </div>
  `, {
    permanent: false,
    direction: 'top',
    className: 'custom-tooltip'
  })
}

function initMap() {
  if (!mapContainer.value) return

  // 创建地图 - 使用 Canvas 渲染器提升性能
  map = L.map(mapContainer.value, {
    center: [39.2, 117.3],
    zoom: 11,
    minZoom: 9,
    maxZoom: 16,
    zoomControl: false,
    attributionControl: false,
    preferCanvas: true, // Canvas 渲染
    loadingControl: false,
    // 限制地图范围为天津区域
    maxBounds: [[38.5, 116.5], [40.2, 118.5]],
    maxBoundsViscosity: 1.0
  })

  // 使用高德矢量地图（中文）
  L.tileLayer('https://webrd01.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}', {
    maxZoom: 18,
    crossOrigin: true
  }).addTo(map)

  // 添加区级圆形
  districtData.forEach(d => {
    createCircleMarker(d.center[0], d.center[1], d.elderly, d.name).addTo(map)
  })

  // 添加街道级标记
  streetData.forEach(s => {
    createCircleMarker(s.lat, s.lng, s.elderly, s.name).addTo(map)
  })

  // 加载完成
  setTimeout(() => {
    isLoading.value = false
  }, 500)
}

onMounted(() => {
  initMap()
})

onBeforeUnmount(() => {
  if (map) {
    map.remove()
    map = null
  }
})
</script>

<template>
  <div class="optimized-map-wrapper">
    <!-- 加载指示器 -->
    <div
      v-if="isLoading"
      class="loading-overlay"
    >
      <div class="loading-spinner" />
      <span>加载地图中...</span>
    </div>

    <div
      ref="mapContainer"
      class="map-container"
    />

    <!-- 简化图例 -->
    <div class="map-legend">
      <div class="legend-item">
        <span class="dot high" />
        <span>高密度</span>
      </div>
      <div class="legend-item">
        <span class="dot medium" />
        <span>中密度</span>
      </div>
      <div class="legend-item">
        <span class="dot low" />
        <span>低密度</span>
      </div>
    </div>

    <!-- 统计数据 -->
    <div class="map-stats">
      <div class="stat-item">
        <span class="stat-value">{{ stats.elderly }}</span>
        <span class="stat-label">服务老人</span>
      </div>
      <div class="stat-divider" />
      <div class="stat-item">
        <span class="stat-value">{{ stats.devices }}</span>
        <span class="stat-label">设备</span>
      </div>
      <div class="stat-divider" />
      <div class="stat-item">
        <span class="stat-value alert">{{ stats.alerts }}</span>
        <span class="stat-label">告警</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.optimized-map-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 8px;
  overflow: hidden;
  background: #0a1628;
}

.map-container {
  width: 100%;
  height: 100%;
}

/* 加载指示器 */
.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 2000;
  background: rgba(10, 22, 40, 0.95);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #4fc3f7;
  font-size: 14px;
}

.loading-spinner {
  width: 36px;
  height: 36px;
  border: 3px solid rgba(79, 195, 247, 0.3);
  border-top-color: #4fc3f7;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 简化图例 */
.map-legend {
  position: absolute;
  bottom: 16px;
  right: 16px;
  z-index: 1000;
  background: rgba(10, 22, 40, 0.9);
  border: 1px solid rgba(79, 195, 247, 0.3);
  border-radius: 6px;
  padding: 8px 12px;
  display: flex;
  gap: 12px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: #e0e0e0;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.dot.high { background: #ef4444; }
.dot.medium { background: #fbbf24; }
.dot.low { background: #4fc3f7; }

/* 统计数据 */
.map-stats {
  position: absolute;
  top: 16px;
  left: 16px;
  z-index: 1000;
  background: rgba(10, 22, 40, 0.9);
  border: 1px solid rgba(79, 195, 247, 0.3);
  border-radius: 6px;
  padding: 10px 16px;
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-value {
  font-size: 18px;
  font-weight: 700;
  color: #4fc3f7;
}

.stat-value.alert {
  color: #ef4444;
}

.stat-label {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.6);
  margin-top: 2px;
}

.stat-divider {
  width: 1px;
  height: 30px;
  background: rgba(79, 195, 247, 0.3);
}

/* Tooltip 样式 */
:deep(.custom-tooltip) {
  background: rgba(10, 22, 40, 0.95) !important;
  border: 1px solid rgba(79, 195, 247, 0.5) !important;
  border-radius: 6px !important;
  color: #e0e0e0 !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important;
}

:deep(.custom-tooltip::before) {
  border-top-color: rgba(79, 195, 247, 0.5) !important;
}

:deep(.leaflet-tooltip-top::before) {
  border-top-color: rgba(10, 22, 40, 0.95) !important;
}
</style>
