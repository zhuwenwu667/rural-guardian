<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import * as THREE from 'three'
import gsap from 'gsap'

const props = defineProps({
  villageData: {
    type: Array,
    default: () => []
  }
})

const mapContainer = ref(null)
const loading = ref(true)
const villageCount = ref(0)
const onlineDevices = ref(0)

let scene, camera, renderer, animationId
let mapGroup, flyLines = []

// 模拟村庄位置数据（实际应从后端获取）
const mockVillages = [
  { name: '幸福村', x: 0, y: 0, z: 0, alerts: 5, devices: 12 },
  { name: '平安村', x: 30, y: 10, z: -20, alerts: 2, devices: 8 },
  { name: '健康村', x: -25, y: 15, z: 15, alerts: 0, devices: 15 },
  { name: '长寿村', x: 20, y: -10, z: 25, alerts: 3, devices: 10 },
  { name: '和谐村', x: -15, y: 20, z: -30, alerts: 1, devices: 6 },
  { name: '安宁村', x: 40, y: 5, z: 10, alerts: 4, devices: 9 },
]

// 初始化场景
function initScene() {
  const container = mapContainer.value
  const width = container.clientWidth
  const height = container.clientHeight

  // 场景
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x0a1628)
  scene.fog = new THREE.Fog(0x0a1628, 50, 200)

  // 相机
  camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000)
  camera.position.set(0, 80, 120)
  camera.lookAt(0, 0, 0)

  // 渲染器
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setSize(width, height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  container.appendChild(renderer.domElement)

  // 添加光源
  const ambientLight = new THREE.AmbientLight(0x404040, 2)
  scene.add(ambientLight)

  const directionalLight = new THREE.DirectionalLight(0x4fc3f7, 1)
  directionalLight.position.set(50, 100, 50)
  scene.add(directionalLight)

  const pointLight = new THREE.PointLight(0x00bcd4, 1, 100)
  pointLight.position.set(0, 50, 0)
  scene.add(pointLight)

  // 创建地图组
  mapGroup = new THREE.Group()
  scene.add(mapGroup)

  // 创建地面
  createGround()

  // 创建村庄标记
  createVillages()

  // 创建飞线
  createFlyLines()

  // 开始动画
  animate()

  // 隐藏加载
  loading.value = false
  villageCount.value = mockVillages.length
  onlineDevices.value = mockVillages.reduce((sum, v) => sum + v.devices, 0)
}

// 创建地面
function createGround() {
  // 主地面
  const geometry = new THREE.CircleGeometry(80, 64)
  const material = new THREE.MeshPhongMaterial({
    color: 0x1a237e,
    transparent: true,
    opacity: 0.3,
    side: THREE.DoubleSide
  })
  const ground = new THREE.Mesh(geometry, material)
  ground.rotation.x = -Math.PI / 2
  ground.position.y = -5
  mapGroup.add(ground)

  // 网格线
  const gridHelper = new THREE.GridHelper(160, 20, 0x00bcd4, 0x1a237e)
  gridHelper.position.y = -4.9
  gridHelper.material.transparent = true
  gridHelper.material.opacity = 0.3
  mapGroup.add(gridHelper)

  // 外圈光环
  const ringGeometry = new THREE.RingGeometry(75, 80, 64)
  const ringMaterial = new THREE.MeshBasicMaterial({
    color: 0x00bcd4,
    transparent: true,
    opacity: 0.5,
    side: THREE.DoubleSide
  })
  const ring = new THREE.Mesh(ringGeometry, ringMaterial)
  ring.rotation.x = -Math.PI / 2
  ring.position.y = -4.8
  mapGroup.add(ring)

  // 光环动画
  gsap.to(ring.scale, {
    x: 1.1,
    y: 1.1,
    duration: 2,
    repeat: -1,
    yoyo: true,
    ease: 'power1.inOut'
  })
}

// 创建村庄标记
function createVillages() {
  mockVillages.forEach((village, index) => {
    // 柱状体高度根据告警数
    const height = Math.max(5, village.alerts * 3 + 5)
    const geometry = new THREE.CylinderGeometry(2, 3, height, 8)
    
    // 颜色根据告警级别
    let color = 0x4caf50 // 绿色 - 正常
    if (village.alerts > 3) color = 0xf44336 // 红色 - 严重
    else if (village.alerts > 0) color = 0xff9800 // 橙色 - 警告

    const material = new THREE.MeshPhongMaterial({
      color: color,
      transparent: true,
      opacity: 0.8,
      emissive: color,
      emissiveIntensity: 0.3
    })

    const pillar = new THREE.Mesh(geometry, material)
    pillar.position.set(village.x, height / 2 - 5, village.z)
    pillar.userData = village
    mapGroup.add(pillar)

    // 顶部光点
    const dotGeometry = new THREE.SphereGeometry(1.5, 16, 16)
    const dotMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.9
    })
    const dot = new THREE.Mesh(dotGeometry, dotMaterial)
    dot.position.set(village.x, height - 5 + 2, village.z)
    mapGroup.add(dot)

    // 光点闪烁动画
    gsap.to(dotMaterial, {
      opacity: 0.4,
      duration: 1 + index * 0.2,
      repeat: -1,
      yoyo: true,
      ease: 'power1.inOut'
    })

    // 柱状体生长动画
    pillar.scale.y = 0
    gsap.to(pillar.scale, {
      y: 1,
      duration: 1,
      delay: index * 0.1,
      ease: 'back.out(1.7)'
    })
  })
}

// 创建飞线
function createFlyLines() {
  // 从中心向外辐射的飞线
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2
    const startX = Math.cos(angle) * 10
    const startZ = Math.sin(angle) * 10
    const endX = Math.cos(angle) * 70
    const endZ = Math.sin(angle) * 70

    createFlyLine(startX, 0, startZ, endX, 0, endZ, i * 0.3)
  }
}

// 创建单条飞线
function createFlyLine(x1, y1, z1, x2, y2, z2, delay) {
  const points = []
  const segments = 50
  
  for (let i = 0; i <= segments; i++) {
    const t = i / segments
    const x = x1 + (x2 - x1) * t
    const z = z1 + (z2 - z1) * t
    const y = y1 + Math.sin(t * Math.PI) * 10 // 弧线
    points.push(new THREE.Vector3(x, y, z))
  }

  const geometry = new THREE.BufferGeometry().setFromPoints(points)
  const material = new THREE.LineBasicMaterial({
    color: 0x00e5ff,
    transparent: true,
    opacity: 0.3
  })

  const line = new THREE.Line(geometry, material)
  mapGroup.add(line)

  // 飞点
  const dotGeometry = new THREE.SphereGeometry(0.8, 8, 8)
  const dotMaterial = new THREE.MeshBasicMaterial({
    color: 0x00e5ff,
    transparent: true,
    opacity: 1
  })
  const dot = new THREE.Mesh(dotGeometry, dotMaterial)
  mapGroup.add(dot)

  // 飞点动画
  const flyObj = { t: 0 }
  gsap.to(flyObj, {
    t: 1,
    duration: 3,
    delay: delay,
    repeat: -1,
    ease: 'none',
    onUpdate: () => {
      const idx = Math.floor(flyObj.t * segments)
      const point = points[idx]
      if (point) {
        dot.position.copy(point)
      }
    }
  })

  flyLines.push({ line, dot })
}

// 动画循环
function animate() {
  animationId = requestAnimationFrame(animate)

  // 缓慢旋转地图
  if (mapGroup) {
    mapGroup.rotation.y += 0.001
  }

  renderer.render(scene, camera)
}

// 窗口大小调整
function handleResize() {
  if (!mapContainer.value || !camera || !renderer) return
  
  const width = mapContainer.value.clientWidth
  const height = mapContainer.value.clientHeight
  
  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height)
}

onMounted(() => {
  initScene()
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  if (animationId) cancelAnimationFrame(animationId)
  if (renderer) {
    renderer.dispose()
    mapContainer.value?.removeChild(renderer.domElement)
  }
})
</script>

<template>
  <div
    ref="mapContainer"
    class="map-3d-container"
  >
    <div
      v-if="loading"
      class="map-loading"
    >
      <div class="loading-spinner" />
      <span>加载3D地图...</span>
    </div>
    <div
      v-if="!loading"
      class="map-info"
    >
      <div class="info-item">
        <span class="info-label">村庄数</span>
        <span class="info-value">{{ villageCount }}</span>
      </div>
      <div class="info-item">
        <span class="info-label">在线设备</span>
        <span class="info-value info-online">{{ onlineDevices }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.map-3d-container {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  border-radius: 8px;
}

.map-loading {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: #4fc3f7;
  font-size: 14px;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(79, 195, 247, 0.3);
  border-top-color: #4fc3f7;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.map-info {
  position: absolute;
  bottom: 16px;
  left: 16px;
  display: flex;
  gap: 24px;
  padding: 12px 20px;
  background: rgba(10, 22, 40, 0.8);
  border: 1px solid rgba(79, 195, 247, 0.3);
  border-radius: 8px;
  backdrop-filter: blur(4px);
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
}

.info-value {
  font-size: 20px;
  font-weight: 600;
  color: #fff;
}

.info-online {
  color: #4caf50;
}
</style>
