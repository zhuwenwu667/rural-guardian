<script setup>
import { ref, shallowRef, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import '@geoman-io/leaflet-geoman-free'
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css'
import RegionSelect from './RegionSelect.vue'

// Props
const props = defineProps({
  villageData: {
    type: Array,
    default: () => []
  }
})

// Emits
const emit = defineEmits(['region-select', 'download-complete'])

// Refs
const mapContainer = ref(null)
const map = shallowRef(null)
const baseMapLayer = shallowRef(null)
const regionLayer = shallowRef(null)
const rectLayer = shallowRef(null)
const villageMarkers = shallowRef([])

// State
const currentBaseMap = ref('gaode_satellite')
const selectedRegion = ref(null)
const selectedRegionName = ref('')
const allRegions = ref([])
const zoomLevel = ref(12)
const tileCount = ref(0)
const isDownloading = ref(false)
const downloadProgress = ref(0)
const currentMode = ref(null) // 'rect' | 'region' | null
const regionGeoJSON = ref(null)

// 底图配置
const baseMapOptions = [
  {
    id: 'gaode_satellite',
    name: '高德卫星',
    url: 'https://webst01.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}'
  },
  {
    id: 'esri_imagery',
    name: 'ESRI影像',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
  },
  {
    id: 'google_satellite',
    name: 'Google卫星',
    url: 'http://mt0.google.com/vt/lyrs=s&hl=en&x={x}&y={y}&z={z}'
  },
  {
    id: 'esri_terrain',
    name: '地形图',
    url: 'https://server.arcgisonline.com/arcgis/rest/services/Elevation/World_Hillshade/MapServer/tile/{z}/{y}/{x}'
  }
]

// 计算属性
const modeText = computed(() => {
  if (currentMode.value === 'rect') return '矩形框选'
  if (currentMode.value === 'region') return '区域轮廓'
  return '等待操作'
})

const canDownload = computed(() => {
  return (currentMode.value === 'rect' || currentMode.value === 'region') && tileCount.value > 0 && tileCount.value <= 1500
})

// 初始化地图
function initMap() {
  if (!mapContainer.value) return

  // 创建地图实例
  const mapInstance = L.map(mapContainer.value, {
    center: [30.5, 120.5], // 默认中心点（浙江地区）
    zoom: zoomLevel.value,
    zoomControl: false,
    attributionControl: false
  })
  map.value = mapInstance

  // 设置底图
  setBaseMap(currentBaseMap.value)

  // 添加绘制控件
  mapInstance.pm.addControls({
    position: 'topleft',
    drawCircleMarker: false,
    drawMarker: false,
    drawCircle: false,
    drawPolyline: false,
    drawPolygon: false,
    drawText: false,
    drawRectangle: true,
    editMode: true,
    dragMode: false,
    cutPolygon: false,
    removalMode: true,
    rotateMode: false
  })

  // 设置绘制样式
  mapInstance.pm.setPathOptions({
    color: '#4fc3f7',
    fillColor: '#4fc3f7',
    fillOpacity: 0.2,
    weight: 2
  })

  // 设置中文
  mapInstance.pm.setLang('zh')

  // 监听绘制事件
  mapInstance.on('pm:create', (e) => {
    clearRegion()
    rectLayer.value = e.layer
    currentMode.value = 'rect'
    e.layer.on('pm:edit', updateTileEstimate)
    updateTileEstimate()
  })

  mapInstance.on('pm:remove', (e) => {
    if (e.layer === rectLayer.value) {
      rectLayer.value = null
      currentMode.value = null
      tileCount.value = 0
    }
  })

  // 添加村庄标记
  addVillageMarkers()

  // 加载区域数据
  loadRegionData()
}

// 设置底图
function setBaseMap(id) {
  if (!map.value) return
  if (currentBaseMap.value === id && baseMapLayer.value) return

  currentBaseMap.value = id

  if (baseMapLayer.value) {
    map.value.removeLayer(baseMapLayer.value)
  }

  const config = baseMapOptions.find(item => item.id === id)
  if (!config) return

  const layer = L.tileLayer(config.url, {
    maxZoom: 19,
    crossOrigin: 'anonymous'
  })
  layer.addTo(map.value)
  baseMapLayer.value = layer
}

// 加载区域数据
async function loadRegionData() {
  try {
    const res = await fetch('https://geo.datav.aliyun.com/areas_v3/bound/all.json')
    if (!res.ok) throw new Error('加载失败')
    const data = await res.json()
    if (Array.isArray(data)) {
      allRegions.value = data
    }
  } catch (e) {
    console.error('加载区域数据失败:', e)
  }
}

// 处理区域选择
async function handleRegionSelect(adcode) {
  if (!adcode) return

  clearRect()
  currentMode.value = 'region'

  const region = allRegions.value.find(r => r.adcode === adcode)
  if (region) {
    selectedRegionName.value = region.name
    // 根据区域级别设置缩放
    const levelZoom = { country: 6, province: 8, city: 10, district: 12 }
    zoomLevel.value = levelZoom[region.level] || 10
  }

  try {
    const res = await fetch(`https://geo.datav.aliyun.com/areas_v3/bound/${adcode}.json`)
    if (!res.ok) throw new Error('获取轮廓失败')
    const json = await res.json()

    let geometry = null
    if (json?.type === 'FeatureCollection' && Array.isArray(json.features)) {
      const polys = []
      json.features.forEach(f => {
        if (f?.geometry) {
          if (f.geometry.type === 'Polygon') {
            polys.push(f.geometry.coordinates)
          } else if (f.geometry.type === 'MultiPolygon') {
            polys.push(...f.geometry.coordinates)
          }
        }
      })
      if (polys.length > 0) {
        geometry = { type: 'MultiPolygon', coordinates: polys }
      }
    } else if (json?.type === 'Polygon' || json?.type === 'MultiPolygon') {
      geometry = { type: json.type, coordinates: json.coordinates }
    }

    if (!geometry) {
      currentMode.value = null
      return
    }

    regionGeoJSON.value = geometry
    if (map.value) {
      const layer = L.geoJSON(geometry, {
        style: {
          color: '#ef4444',
          weight: 2,
          fillColor: '#ef4444',
          fillOpacity: 0.15
        }
      }).addTo(map.value)
      regionLayer.value = layer
      map.value.fitBounds(layer.getBounds())
      updateTileEstimate()
    }

    emit('region-select', { adcode, name: selectedRegionName.value, geometry })
  } catch (e) {
    console.error('获取区域轮廓失败:', e)
    currentMode.value = null
  }
}

// 清除区域
function clearRegion() {
  if (regionLayer.value && map.value) {
    map.value.removeLayer(regionLayer.value)
    regionLayer.value = null
  }
  regionGeoJSON.value = null
}

// 清除矩形
function clearRect() {
  if (rectLayer.value && map.value) {
    map.value.removeLayer(rectLayer.value)
    rectLayer.value = null
  }
}

// 添加村庄标记
function addVillageMarkers() {
  if (!map.value || !props.villageData?.length) return

  // 清除旧标记
  villageMarkers.value.forEach(m => map.value.removeLayer(m))
  villageMarkers.value = []

  props.villageData.forEach(village => {
    if (village.lat && village.lng) {
      // 根据告警数量确定颜色
      const alertCount = village.alerts || 0
      let color = '#4ade80' // 绿色 - 正常
      if (alertCount > 3) color = '#ef4444' // 红色 - 高告警
      else if (alertCount > 0) color = '#fbbf24' // 黄色 - 低告警

      const marker = L.circleMarker([village.lat, village.lng], {
        radius: 8,
        fillColor: color,
        color: '#fff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8
      }).bindPopup(`
        <div style="min-width: 150px;">
          <h4 style="margin: 0 0 8px; color: #333;">${village.name}</h4>
          <p style="margin: 4px 0; color: #666;">告警数: ${alertCount}</p>
          <p style="margin: 4px 0; color: #666;">设备数: ${village.devices || 0}</p>
        </div>
      `)

      marker.addTo(map.value)
      villageMarkers.value.push(marker)
    }
  })
}

// 更新瓦片估算
function updateTileEstimate() {
  let bounds = null

  if (currentMode.value === 'rect' && rectLayer.value) {
    bounds = rectLayer.value.getBounds()
  } else if (currentMode.value === 'region' && regionLayer.value) {
    bounds = regionLayer.value.getBounds()
  }

  if (!bounds) {
    tileCount.value = 0
    return
  }

  const z = zoomLevel.value
  const nw = bounds.getNorthWest()
  const se = bounds.getSouthEast()
  const tMin = latLonToTile(nw.lat, nw.lng, z)
  const tMax = latLonToTile(se.lat, se.lng, z)

  tileCount.value = (Math.abs(tMax.x - tMin.x) + 1) * (Math.abs(tMax.y - tMin.y) + 1)
}

// 经纬度转瓦片坐标
function latLonToTile(lat, lon, zoom) {
  const x = Math.floor(((lon + 180) / 360) * Math.pow(2, zoom))
  const y = Math.floor(
    ((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) * Math.pow(2, zoom)
  )
  return { x, y }
}

// 开始下载
async function startDownload() {
  let bounds = null
  if (currentMode.value === 'rect' && rectLayer.value) {
    bounds = rectLayer.value.getBounds()
  } else if (currentMode.value === 'region' && regionLayer.value) {
    bounds = regionLayer.value.getBounds()
  }

  if (!bounds || tileCount.value > 1500) return

  isDownloading.value = true
  downloadProgress.value = 0

  const z = zoomLevel.value
  const nw = bounds.getNorthWest()
  const se = bounds.getSouthEast()

  const tMin = latLonToTile(nw.lat, nw.lng, z)
  const tMax = latLonToTile(se.lat, se.lng, z)

  const minX = Math.min(tMin.x, tMax.x)
  const maxX = Math.max(tMin.x, tMax.x)
  const minY = Math.min(tMin.y, tMax.y)
  const maxY = Math.max(tMin.y, tMax.y)

  const tilesX = maxX - minX + 1
  const tilesY = maxY - minY + 1
  const totalTiles = tilesX * tilesY

  // 创建 Canvas
  const canvas = document.createElement('canvas')
  canvas.width = tilesX * 256
  canvas.height = tilesY * 256
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    isDownloading.value = false
    return
  }

  // 获取当前底图 URL
  const activeBaseMap = baseMapOptions.find(item => item.id === currentBaseMap.value) || baseMapOptions[0]
  const tileBaseUrl = activeBaseMap.url

  // 下载瓦片
  let loaded = 0
  const promises = []

  for (let x = minX; x <= maxX; x++) {
    for (let y = minY; y <= maxY; y++) {
      promises.push(
        new Promise((resolve) => {
          const img = new Image()
          img.crossOrigin = 'Anonymous'
          img.src = tileBaseUrl
            .replace('{z}', z.toString())
            .replace('{y}', y.toString())
            .replace('{x}', x.toString())

          img.onload = () => {
            ctx.drawImage(img, (x - minX) * 256, (y - minY) * 256)
            loaded++
            downloadProgress.value = Math.floor((loaded / totalTiles) * 100)
            resolve()
          }
          img.onerror = () => resolve()
        })
      )
    }
  }

  await Promise.all(promises)

  // 区域轮廓裁剪
  if (currentMode.value === 'region' && regionGeoJSON.value) {
    ctx.globalCompositeOperation = 'destination-in'
    ctx.beginPath()

    const originX = minX * 256
    const originY = minY * 256

    const getCanvasPixel = (lat, lng) => {
      const p = project(lat, lng, z)
      return { x: p.x - originX, y: p.y - originY }
    }

    drawGeoJSONPath(ctx, regionGeoJSON.value, getCanvasPixel)
    ctx.fill()
    ctx.globalCompositeOperation = 'source-over'
  }

  // 导出图片
  canvas.toBlob((blob) => {
    if (blob) {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${selectedRegionName.value || 'map'}_z${z}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      emit('download-complete', { name: a.download })
    }
    isDownloading.value = false
  }, 'image/png')
}

// 坐标投影
function project(lat, lng, zoom) {
  let siny = Math.sin((lat * Math.PI) / 180)
  siny = Math.min(Math.max(siny, -0.9999), 0.9999)
  return {
    x: (256 * Math.pow(2, zoom) * (lng + 180)) / 360,
    y: 256 * Math.pow(2, zoom) * (0.5 - Math.log((1 + siny) / (1 - siny)) / (4 * Math.PI))
  }
}

// 绘制 GeoJSON 路径
function drawGeoJSONPath(ctx, geometry, converter) {
  if (geometry.type === 'Polygon') {
    drawPolygonCoordinates(ctx, geometry.coordinates, converter)
  } else if (geometry.type === 'MultiPolygon') {
    geometry.coordinates.forEach(polyCoords => {
      drawPolygonCoordinates(ctx, polyCoords, converter)
    })
  }
}

function drawPolygonCoordinates(ctx, coordinates, converter) {
  coordinates.forEach(ring => {
    ring.forEach((coord, index) => {
      const p = converter(coord[1], coord[0])
      if (index === 0) ctx.moveTo(p.x, p.y)
      else ctx.lineTo(p.x, p.y)
    })
    ctx.closePath()
  })
}

// 监听缩放级别变化
watch(zoomLevel, () => {
  if (map.value) {
    map.value.setZoom(zoomLevel.value)
  }
  updateTileEstimate()
})

// 监听村庄数据变化
watch(() => props.villageData, () => {
  addVillageMarkers()
}, { deep: true })

// 生命周期
onMounted(() => {
  initMap()
})

onBeforeUnmount(() => {
  if (map.value) {
    map.value.remove()
    map.value = null
  }
})
</script>

<template>
  <div class="leaflet-map-wrapper">
    <!-- 控制面板 -->
    <div class="map-controls">
      <!-- 底图切换 -->
      <div class="control-group">
        <label class="control-label">底图</label>
        <div class="basemap-buttons">
          <button
            v-for="option in baseMapOptions"
            :key="option.id"
            class="basemap-btn"
            :class="{ active: currentBaseMap === option.id }"
            :title="option.name"
            @click="setBaseMap(option.id)"
          >
            {{ option.name }}
          </button>
        </div>
      </div>

      <!-- 区域搜索 -->
      <div class="control-group">
        <label class="control-label">区域搜索</label>
        <RegionSelect
          v-model="selectedRegion"
          :options="allRegions"
          placeholder="输入城市名称搜索"
          @change="handleRegionSelect"
        />
      </div>

      <!-- 缩放级别 -->
      <div class="control-group">
        <label class="control-label">缩放级别: {{ zoomLevel }}</label>
        <input
          v-model.number="zoomLevel"
          type="range"
          min="6"
          max="18"
          class="zoom-slider"
        >
      </div>

      <!-- 瓦片估算 -->
      <div
        v-if="tileCount > 0"
        class="tile-info"
      >
        <span class="tile-count">预计瓦片: {{ tileCount }} 张</span>
        <span
          v-if="tileCount > 1000"
          class="tile-warning"
        >⚠️ 瓦片量较大</span>
      </div>

      <!-- 下载按钮 -->
      <button
        class="download-btn"
        :disabled="!canDownload || isDownloading"
        @click="startDownload"
      >
        {{ isDownloading ? `下载中 ${downloadProgress}%` : '下载选中区域' }}
      </button>

      <!-- 进度条 -->
      <div
        v-if="isDownloading"
        class="progress-bar"
      >
        <div
          class="progress-fill"
          :style="{ width: downloadProgress + '%' }"
        />
      </div>
    </div>

    <!-- 地图容器 -->
    <div
      ref="mapContainer"
      class="map-container"
    />

    <!-- 信息面板 -->
    <div class="map-info-panel">
      <div class="info-item">
        <span class="info-label">当前模式</span>
        <span class="info-value">{{ modeText }}</span>
      </div>
      <div class="info-item">
        <span class="info-label">选中区域</span>
        <span class="info-value">{{ selectedRegionName || '未选择' }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.leaflet-map-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  background: #0a1628;
  border-radius: 8px;
  overflow: hidden;
}

.map-container {
  width: 100%;
  height: 100%;
}

/* 控制面板 */
.map-controls {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 1000;
  background: rgba(10, 22, 40, 0.95);
  border: 1px solid rgba(79, 195, 247, 0.3);
  border-radius: 8px;
  padding: 12px;
  width: 200px;
  backdrop-filter: blur(10px);
}

.control-group {
  margin-bottom: 12px;
}

.control-label {
  display: block;
  font-size: 12px;
  color: #4fc3f7;
  margin-bottom: 6px;
  font-weight: 500;
}

.basemap-buttons {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 4px;
}

.basemap-btn {
  padding: 4px 8px;
  font-size: 11px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(79, 195, 247, 0.3);
  border-radius: 4px;
  color: #e0e0e0;
  cursor: pointer;
  transition: all 0.2s;
}

.basemap-btn:hover {
  background: rgba(79, 195, 247, 0.2);
}

.basemap-btn.active {
  background: #4fc3f7;
  color: #0a1628;
  border-color: #4fc3f7;
}

.zoom-slider {
  width: 100%;
  height: 4px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
  appearance: none;
  cursor: pointer;
}

.zoom-slider::-webkit-slider-thumb {
  appearance: none;
  width: 14px;
  height: 14px;
  background: #4fc3f7;
  border-radius: 50%;
  cursor: pointer;
}

.tile-info {
  padding: 8px;
  background: rgba(79, 195, 247, 0.1);
  border-radius: 4px;
  margin-bottom: 12px;
}

.tile-count {
  font-size: 12px;
  color: #e0e0e0;
}

.tile-warning {
  display: block;
  font-size: 11px;
  color: #fbbf24;
  margin-top: 4px;
}

.download-btn {
  width: 100%;
  padding: 8px;
  font-size: 12px;
  font-weight: 600;
  background: linear-gradient(135deg, #4fc3f7, #00bcd4);
  border: none;
  border-radius: 4px;
  color: #0a1628;
  cursor: pointer;
  transition: all 0.2s;
}

.download-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(79, 195, 247, 0.4);
}

.download-btn:disabled {
  background: rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.5);
  cursor: not-allowed;
}

.progress-bar {
  height: 4px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
  margin-top: 8px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #4ade80, #22c55e);
  transition: width 0.3s;
}

/* 信息面板 */
.map-info-panel {
  position: absolute;
  bottom: 12px;
  left: 12px;
  z-index: 1000;
  background: rgba(10, 22, 40, 0.95);
  border: 1px solid rgba(79, 195, 247, 0.3);
  border-radius: 8px;
  padding: 10px 14px;
  backdrop-filter: blur(10px);
}

.info-item {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.info-item:last-child {
  margin-bottom: 0;
}

.info-label {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.6);
}

.info-value {
  font-size: 12px;
  color: #4fc3f7;
  font-weight: 500;
}

/* 隐藏 Leaflet 默认控件 */
:deep(.leaflet-bottom) {
  display: none;
}

:deep(.leaflet-top) {
  z-index: 999;
}

/* Leaflet-Geoman 按钮样式覆盖 */
:deep(.leaflet-pm-toolbar) {
  margin-top: 10px !important;
  margin-left: 10px !important;
}

:deep(.leaflet-pm-toolbar .leaflet-buttons-pane-button) {
  background: rgba(10, 22, 40, 0.95) !important;
  border: 1px solid rgba(79, 195, 247, 0.3) !important;
  color: #4fc3f7 !important;
}

:deep(.leaflet-pm-toolbar .leaflet-buttons-pane-button:hover) {
  background: rgba(79, 195, 247, 0.2) !important;
}
</style>
