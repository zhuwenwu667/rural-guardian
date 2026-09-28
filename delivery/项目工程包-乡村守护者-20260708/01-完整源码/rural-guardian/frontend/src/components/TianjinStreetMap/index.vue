<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import * as echarts from 'echarts'
import 'echarts-gl'

const props = defineProps({
  villageData: { type: Array, default: () => [] }
})

const chartRef = ref(null)
let chart = null

// 天津市各区模拟数据
const districtData = [
  { name: '和平区', value: [117.1959, 39.1183, 89] },
  { name: '河东区', value: [117.2266, 39.1221, 134] },
  { name: '河西区', value: [117.2175, 39.1019, 156] },
  { name: '南开区', value: [117.1641, 39.1205, 178] },
  { name: '河北区', value: [117.2016, 39.1566, 112] },
  { name: '红桥区', value: [117.1633, 39.1751, 98] },
  { name: '东丽区', value: [117.3140, 39.0878, 76] },
  { name: '西青区', value: [117.0122, 39.1394, 65] },
  { name: '津南区', value: [117.3583, 38.9876, 58] },
  { name: '北辰区', value: [117.1352, 39.2253, 72] },
  { name: '武清区', value: [117.0444, 39.3842, 45] },
  { name: '宝坻区', value: [117.3096, 39.7175, 38] },
  { name: '滨海新区', value: [117.7016, 39.0333, 198] },
  { name: '宁河区', value: [117.8261, 39.3306, 28] },
  { name: '静海区', value: [116.9743, 38.9477, 42] },
  { name: '蓟州区', value: [117.4080, 40.0458, 35] },
]

// 街道级数据（主要城区）
const streetData = [
  // 和平区街道
  { name: '劝业场街道', value: [117.1912, 39.1178, 32], district: '和平区' },
  { name: '小白楼街道', value: [117.2010, 39.1135, 28], district: '和平区' },
  { name: '南营门街道', value: [117.1920, 39.1245, 15], district: '和平区' },
  { name: '新兴街道', value: [117.1870, 39.1090, 14], district: '和平区' },
  // 南开区街道
  { name: '鼓楼街道', value: [117.1550, 39.1280, 45], district: '南开区' },
  { name: '长虹街道', value: [117.1480, 39.1420, 38], district: '南开区' },
  { name: '万兴街道', value: [117.1720, 39.1380, 35], district: '南开区' },
  { name: '学府街道', value: [117.1780, 39.1050, 42], district: '南开区' },
  { name: '水上公园街道', value: [117.1600, 39.1000, 18], district: '南开区' },
  // 河西区街道
  { name: '友谊路街道', value: [117.2100, 39.0980, 40], district: '河西区' },
  { name: '越秀路街道', value: [117.2250, 39.0950, 36], district: '河西区' },
  { name: '马场街道', value: [117.2050, 39.0880, 32], district: '河西区' },
  { name: '挂甲寺街道', value: [117.2180, 39.1120, 28], district: '河西区' },
  { name: '下瓦房街道', value: [117.2280, 39.1050, 20], district: '河西区' },
  // 河东区街道
  { name: '大王庄街道', value: [117.2250, 39.1200, 38], district: '河东区' },
  { name: '大直沽街道', value: [117.2320, 39.1150, 34], district: '河东区' },
  { name: '中山门街道', value: [117.2400, 39.1100, 30], district: '河东区' },
  { name: '常州道街道', value: [117.2350, 39.1250, 22], district: '河东区' },
  // 河北区街道
  { name: '光复道街道', value: [117.1950, 39.1550, 35], district: '河北区' },
  { name: '望海楼街道', value: [117.2050, 39.1600, 30], district: '河北区' },
  { name: '铁东路街道', value: [117.2150, 39.1650, 28], district: '河北区' },
  { name: '建昌道街道', value: [117.1950, 39.1700, 19], district: '河北区' },
  // 红桥区街道
  { name: '西于庄街道', value: [117.1550, 39.1700, 32], district: '红桥区' },
  { name: '芥园街道', value: [117.1650, 39.1650, 28], district: '红桥区' },
  { name: '三条石街道', value: [117.1750, 39.1750, 25], district: '红桥区' },
  { name: '咸阳北路街道', value: [117.1500, 39.1800, 13], district: '红桥区' },
  // 滨海新区
  { name: '泰达街道', value: [117.6800, 39.0200, 65], district: '滨海新区' },
  { name: '塘沽街道', value: [117.6500, 39.0000, 52], district: '滨海新区' },
  { name: '汉沽街道', value: [117.8000, 39.2500, 28], district: '滨海新区' },
  { name: '大港街道', value: [117.4600, 38.8300, 35], district: '滨海新区' },
  { name: '中新天津生态城', value: [117.7500, 39.0800, 18], district: '滨海新区' },
]

// 飞线数据
const flyLineData = [
  { from: '滨海新区', to: '南开区' },
  { from: '滨海新区', to: '河西区' },
  { from: '和平区', to: '南开区' },
  { from: '河西区', to: '南开区' },
  { from: '河东区', to: '河北区' },
  { from: '西青区', to: '南开区' },
  { from: '北辰区', to: '河北区' },
  { from: '东丽区', to: '河东区' },
  { from: '津南区', to: '河西区' },
  { from: '武清区', to: '北辰区' },
]

async function initChart() {
  if (!chartRef.value) return

  // 加载天津市 GeoJSON
  let tianjinJson
  try {
    const res = await fetch('https://geo.datav.aliyun.com/areas_v3/bound/120000_full.json')
    tianjinJson = await res.json()
  } catch (e) {
    console.error('加载天津地图失败:', e)
    return
  }

  echarts.registerMap('tianjin', tianjinJson)

  chart = echarts.init(chartRef.value, null, { renderer: 'canvas' })

  // 构建飞线坐标
  const geoCoordMap = {}
  districtData.forEach(c => {
    geoCoordMap[c.name] = [c.value[0], c.value[1]]
  })

  const linesData = flyLineData.map(item => ({
    fromName: item.from,
    toName: item.to,
    coords: [geoCoordMap[item.from], geoCoordMap[item.to]]
  }))

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      show: true,
      trigger: 'item',
      backgroundColor: 'rgba(10, 22, 40, 0.95)',
      borderColor: 'rgba(79, 195, 247, 0.5)',
      textStyle: { color: '#e0e0e0', fontSize: 12 },
      formatter: (params) => {
        if (params.seriesType === 'bar3D') {
          return `<b>${params.name}</b><br/>服务老人: ${Math.round(params.value[2] * 8)}人`
        }
        if (params.seriesType === 'scatter3D') {
          return `<b>${params.name}</b><br/>服务老人: ${Math.round(params.value[2] * 8)}人`
        }
        if (params.seriesType === 'lines3D') {
          return `${params.data.fromName} → ${params.data.toName}`
        }
        if (params.seriesType === 'map3D') {
          const d = districtData.find(dd => dd.name === params.name)
          if (d) return `<b>${params.name}</b><br/>服务老人: ${d.value[2]}人`
          return params.name
        }
        return params.name
      }
    },

    // 3D 地理坐标系
    geo3D: {
      map: 'tianjin',
      roam: true,
      silent: false,

      shading: 'realistic',
      realisticMaterial: {
        roughness: 0.5,
        metalness: 0.15,
        textureTiling: 1
      },

      postEffect: {
        enable: true,
        bloom: {
          enable: true,
          bloomIntensity: 0.12
        },
        SSAO: {
          enable: true,
          radius: 2,
          intensity: 1.0
        }
      },

      temporalSuperSampling: { enable: true },

      viewControl: {
        autoRotate: true,
        autoRotateSpeed: 4,
        autoRotateAfterStill: 3,
        distance: 55,
        alpha: 45,
        beta: 10,
        minAlpha: 5,
        maxAlpha: 85,
        minDistance: 25,
        maxDistance: 120,
        rotateSensitivity: 2,
        zoomSensitivity: 1.5,
        panSensitivity: 1,
        damping: 0.93,
        animation: true,
        animationDurationUpdate: 800
      },

      environment: 'none',

      light: {
        main: {
          intensity: 1.5,
          shadow: true,
          shadowQuality: 'high',
          alpha: 35,
          beta: 40
        },
        ambient: { intensity: 0.5 },
        ambientCubemap: {
          exposure: 1,
          diffuseIntensity: 0.5,
          specularIntensity: 2
        }
      },

      itemStyle: {
        color: '#1a3a5c',
        opacity: 1,
        borderWidth: 1.5,
        borderColor: '#4fc3f7'
      },

      emphasis: {
        itemStyle: {
          color: '#2d6a9f'
        },
        label: {
          show: true,
          textStyle: {
            color: '#fff',
            fontSize: 11,
            backgroundColor: 'rgba(10, 22, 40, 0.7)',
            padding: [2, 6],
            borderRadius: 3
          }
        }
      },

      label: {
        show: true,
        textStyle: {
          color: 'rgba(255, 255, 255, 0.8)',
          fontSize: 10,
          backgroundColor: 'transparent'
        }
      },

      regionHeight: 2.5,
      groundPlane: { show: false }
    },

    series: [
      // 3D 柱状图 - 各区数据
      {
        name: '区域数据',
        type: 'bar3D',
        coordinateSystem: 'geo3D',
        shading: 'realistic',
        realisticMaterial: {
          roughness: 0.3,
          metalness: 0.3
        },
        barSize: 1.0,
        bevelSize: 0.2,
        minHeight: 0.3,

        data: districtData.map(c => ({
          name: c.name,
          value: [c.value[0], c.value[1], c.value[2] / 10]
        })),

        itemStyle: {
          color: (params) => {
            const v = params.value[2]
            if (v > 15) return '#ef4444'
            if (v > 10) return '#fbbf24'
            if (v > 6) return '#4fc3f7'
            return '#4ade80'
          },
          opacity: 0.9
        },

        emphasis: {
          itemStyle: { color: '#00ffff' }
        },

        animation: true,
        animationDurationUpdate: 600
      },

      // 3D 散点 - 街道级数据
      {
        name: '街道数据',
        type: 'scatter3D',
        coordinateSystem: 'geo3D',
        symbol: 'circle',
        symbolSize: (val) => Math.max(val[2] / 3, 4),
        itemStyle: {
          color: (params) => {
            const v = params.value[2]
            if (v > 35) return '#ef4444'
            if (v > 25) return '#fbbf24'
            if (v > 15) return '#4fc3f7'
            return '#4ade80'
          },
          opacity: 0.9,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.6)'
        },
        label: {
          show: false
        },
        emphasis: {
          label: {
            show: true,
            position: 'top',
            formatter: (params) => {
              return `${params.name}\n${Math.round(params.value[2] * 8)}人`
            },
            textStyle: {
              color: '#fff',
              fontSize: 10,
              backgroundColor: 'rgba(10, 22, 40, 0.85)',
              padding: [3, 6],
              borderRadius: 3
            }
          },
          itemStyle: {
            color: '#ffff00',
            borderColor: '#ffff00'
          }
        },
        data: streetData.map(c => ({
          name: c.name,
          value: [c.value[0], c.value[1], c.value[2] / 4]
        }))
      },

      // 3D 飞线
      {
        name: '数据流动',
        type: 'lines3D',
        coordinateSystem: 'geo3D',
        effect: {
          show: true,
          period: 3,
          trailWidth: 3,
          trailLength: 0.35,
          trailColor: '#ffff00',
          trailOpacity: 0.8,
          symbolSize: 3
        },
        lineStyle: {
          width: 1.2,
          color: '#4fc3f7',
          opacity: 0.3
        },
        blendMode: 'lighter',
        data: linesData
      }
    ]
  }

  chart.setOption(option)
  window.addEventListener('resize', handleResize)
}

function handleResize() {
  if (chart) chart.resize()
}

onMounted(() => { initChart() })

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  if (chart) {
    chart.dispose()
    chart = null
  }
})
</script>

<template>
  <div
    ref="chartRef"
    class="tianjin-map"
  />
</template>

<style scoped>
.tianjin-map {
  width: 100%;
  height: 100%;
  min-height: 400px;
}
</style>
