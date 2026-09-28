<script setup>
import { ref, onMounted, onBeforeUnmount, onDeactivated } from 'vue'
import * as echarts from 'echarts'
import 'echarts-gl'

const props = defineProps({
  villageData: {
    type: Array,
    default: () => []
  }
})

const chartRef = ref(null)
let chart = null

// 城市数据
const cityData = [
  { name: '杭州市', value: [120.1551, 30.2741, 156] },
  { name: '宁波市', value: [121.5440, 29.8683, 128] },
  { name: '温州市', value: [120.7010, 28.0008, 98] },
  { name: '嘉兴市', value: [120.7555, 30.7460, 76] },
  { name: '湖州市', value: [120.0880, 30.8931, 54] },
  { name: '绍兴市', value: [120.5802, 30.0302, 67] },
  { name: '金华市', value: [119.6475, 29.0781, 82] },
  { name: '台州市', value: [121.4206, 28.6564, 71] },
  { name: '丽水市', value: [119.9228, 28.4676, 42] },
  { name: '南京市', value: [118.7969, 32.0603, 189] },
  { name: '苏州市', value: [120.5853, 31.2989, 167] },
  { name: '无锡市', value: [120.3119, 31.4912, 134] },
  { name: '常州市', value: [119.9741, 31.8122, 98] },
  { name: '南通市', value: [120.8943, 32.0146, 112] },
  { name: '上海市', value: [121.4737, 31.2304, 234] },
  { name: '北京市', value: [116.4074, 39.9042, 267] },
  { name: '广州市', value: [113.2644, 23.1291, 198] },
  { name: '深圳市', value: [114.0579, 22.5431, 156] },
  { name: '成都市', value: [104.0668, 30.5728, 145] },
  { name: '武汉市', value: [114.3055, 30.5928, 132] },
  { name: '西安市', value: [108.9398, 34.3416, 118] },
  { name: '重庆市', value: [106.5516, 29.5630, 125] },
]

// 飞线数据（从主要城市出发）
const flyLineData = [
  { from: '北京市', to: '上海市' },
  { from: '北京市', to: '广州市' },
  { from: '北京市', to: '成都市' },
  { from: '上海市', to: '广州市' },
  { from: '上海市', to: '成都市' },
  { from: '广州市', to: '深圳市' },
  { from: '广州市', to: '成都市' },
  { from: '杭州市', to: '南京市' },
  { from: '杭州市', to: '上海市' },
  { from: '南京市', to: '武汉市' },
  { from: '成都市', to: '重庆市' },
  { from: '武汉市', to: '西安市' },
  { from: '上海市', to: '北京市' },
  { from: '深圳市', to: '杭州市' },
]

// 散点涟漪数据
const scatterData = cityData.map(c => ({
  name: c.name,
  value: [...c.value, c.value[2]],
}))

async function initChart() {
  if (!chartRef.value) return

  // 加载中国地图 GeoJSON
  let chinaJson
  try {
    const res = await fetch('https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json')
    chinaJson = await res.json()
  } catch (e) {
    console.error('加载地图数据失败:', e)
    return
  }

  // 注册地图
  echarts.registerMap('china', chinaJson)

  chart = echarts.init(chartRef.value, null, { renderer: 'canvas' })

  // 构建飞线坐标
  const geoCoordMap = {}
  cityData.forEach(c => {
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
      backgroundColor: 'rgba(10, 22, 40, 0.9)',
      borderColor: 'rgba(79, 195, 247, 0.5)',
      textStyle: { color: '#e0e0e0', fontSize: 12 },
      formatter: (params) => {
        if (params.seriesType === 'bar3D') {
          return `<b>${params.name}</b><br/>服务老人: ${params.value[2]}人`
        }
        if (params.seriesType === 'effectScatter3D') {
          return `<b>${params.name}</b><br/>服务老人: ${params.value[2]}人`
        }
        if (params.seriesType === 'lines3D') {
          return `${params.data.fromName} → ${params.data.toName}`
        }
        return params.name
      }
    },

    // 3D 地理坐标系
    geo3D: {
      map: 'china',
      roam: true,
      silent: false,

      // 3D 地形设置
      shading: 'realistic',
      realisticMaterial: {
        roughness: 0.6,
        metalness: 0.1,
        textureTiling: 1
      },

      // 后处理特效
      postEffect: {
        enable: true,
        bloom: {
          enable: true,
          bloomIntensity: 0.15
        },
        SSAO: {
          enable: true,
          radius: 3,
          intensity: 1.2
        },
        depthOfField: {
          enable: false
        }
      },

      // 临时光照
      temporalSuperSampling: {
        enable: true
      },

      // 视角控制
      viewControl: {
        autoRotate: true,
        autoRotateSpeed: 3,
        autoRotateAfterStill: 3,
        distance: 110,
        alpha: 40,
        beta: 5,
        minAlpha: 5,
        maxAlpha: 80,
        minDistance: 60,
        maxDistance: 200,
        rotateSensitivity: 2,
        zoomSensitivity: 1.5,
        panSensitivity: 1,
        damping: 0.93,
        animation: true,
        animationDurationUpdate: 1000
      },

      // 环境贴图
      environment: 'none',

      // 光照
      light: {
        main: {
          intensity: 1.2,
          shadow: true,
          shadowQuality: 'high',
          alpha: 40,
          beta: 30
        },
        ambient: {
          intensity: 0.4
        },
        ambientCubemap: {
          exposure: 1,
          diffuseIntensity: 0.5,
          specularIntensity: 2
        }
      },

      // 地图区域样式
      itemStyle: {
        color: '#1a3a5c',
        opacity: 1,
        borderWidth: 1.5,
        borderColor: '#4fc3f7'
      },

      // 高亮样式
      emphasis: {
        itemStyle: {
          color: '#2d6a9f'
        },
        label: {
          show: false
        }
      },

      // 区域标签
      label: {
        show: false,
        textStyle: {
          color: '#fff',
          fontSize: 10,
          backgroundColor: 'transparent'
        }
      },

      // 地形高度
      regionHeight: 2.5,

      // 边界线
      groundPlane: {
        show: false
      }
    },

    // 3D 柱状图 - 城市数据
    series: [
      {
        name: '城市数据',
        type: 'bar3D',
        coordinateSystem: 'geo3D',
        shading: 'realistic',
        realisticMaterial: {
          roughness: 0.4,
          metalness: 0.2
        },
        barSize: 1.2,
        bevelSize: 0.3,
        minHeight: 0.5,

        data: cityData.map(c => ({
          name: c.name,
          value: [c.value[0], c.value[1], c.value[2] / 8]
        })),

        itemStyle: {
          color: (params) => {
            const v = params.value[2]
            if (v > 25) return '#ef4444'
            if (v > 15) return '#fbbf24'
            if (v > 10) return '#4fc3f7'
            return '#4ade80'
          },
          opacity: 0.9
        },

        emphasis: {
          itemStyle: {
            color: '#00ffff'
          }
        },

        label: {
          show: false
        },

        animation: true,
        animationDurationUpdate: 800,
        animationEasingUpdate: 'cubicInOut'
      },

      // 3D 散点 - 城市位置涟漪
      {
        name: '城市标记',
        type: 'scatter3D',
        coordinateSystem: 'geo3D',
        symbol: 'circle',
        symbolSize: 8,
        itemStyle: {
          color: '#00ffff',
          opacity: 0.9,
          borderWidth: 1,
          borderColor: '#fff'
        },
        label: {
          show: true,
          position: 'top',
          formatter: '{b}',
          textStyle: {
            color: '#fff',
            fontSize: 10,
            backgroundColor: 'rgba(10, 22, 40, 0.7)',
            padding: [2, 4],
            borderRadius: 2
          }
        },
        emphasis: {
          itemStyle: {
            color: '#ffff00',
            borderColor: '#ffff00'
          }
        },
        data: scatterData
      },

      // 3D 飞线
      {
        name: '数据流动',
        type: 'lines3D',
        coordinateSystem: 'geo3D',
        effect: {
          show: true,
          period: 4,
          trailWidth: 3,
          trailLength: 0.3,
          trailColor: '#ffff00',
          trailOpacity: 0.8,
          symbolSize: 4
        },
        lineStyle: {
          width: 1.5,
          color: '#4fc3f7',
          opacity: 0.3
        },
        blendMode: 'lighter',
        data: linesData
      }
    ]
  }

  chart.setOption(option)

  // 响应式
  window.addEventListener('resize', handleResize)
}

function handleResize() {
  if (chart) chart.resize()
}

onMounted(() => {
  initChart()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  if (chart) {
    chart.dispose()
    chart = null
  }
})

onDeactivated(() => {
  if (chart) chart.dispose()
})
</script>

<template>
  <div
    ref="chartRef"
    class="echarts-gl-map"
  />
</template>

<style scoped>
.echarts-gl-map {
  width: 100%;
  height: 100%;
  min-height: 400px;
}
</style>
