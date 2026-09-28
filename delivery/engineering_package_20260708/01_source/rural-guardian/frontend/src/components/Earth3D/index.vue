<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import * as THREE from 'three'
import gsap from 'gsap'

const container = ref(null)
const loading = ref(true)
const cityCount = ref(0)
const dataFlow = ref('0 GB')

let scene, camera, renderer, earth, atmosphere, stars
const flyLines = []
let cityMarkers = []
let animationId

// 城市数据（经纬度）
const cities = [
  { name: '北京', lat: 39.9042, lon: 116.4074, value: 100 },
  { name: '上海', lat: 31.2304, lon: 121.4737, value: 95 },
  { name: '广州', lat: 23.1291, lon: 113.2644, value: 85 },
  { name: '深圳', lat: 22.5431, lon: 114.0579, value: 90 },
  { name: '成都', lat: 30.5728, lon: 104.0668, value: 75 },
  { name: '杭州', lat: 30.2741, lon: 120.1551, value: 80 },
  { name: '武汉', lat: 30.5928, lon: 114.3055, value: 70 },
  { name: '西安', lat: 34.3416, lon: 108.9398, value: 65 },
  { name: '重庆', lat: 29.5630, lon: 106.5516, value: 72 },
  { name: '南京', lat: 32.0603, lon: 118.7969, value: 78 },
  { name: '天津', lat: 39.0842, lon: 117.2010, value: 68 },
  { name: '苏州', lat: 31.2989, lon: 120.5853, value: 82 },
  { name: '郑州', lat: 34.7466, lon: 113.6253, value: 60 },
  { name: '长沙', lat: 28.2282, lon: 112.9388, value: 63 },
  { name: '沈阳', lat: 41.8057, lon: 123.4315, value: 55 },
  { name: '青岛', lat: 36.0671, lon: 120.3826, value: 58 },
  { name: '宁波', lat: 29.8683, lon: 121.5440, value: 62 },
  { name: '东莞', lat: 23.0489, lon: 113.7447, value: 57 },
  { name: '佛山', lat: 23.0218, lon: 113.1219, value: 59 },
  { name: '合肥', lat: 31.8206, lon: 117.2272, value: 54 },
]

// 经纬度转3D坐标
function latLonToVector3(lat, lon, radius) {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (lon + 180) * (Math.PI / 180)
  const x = -(radius * Math.sin(phi) * Math.cos(theta))
  const z = radius * Math.sin(phi) * Math.sin(theta)
  const y = radius * Math.cos(phi)
  return new THREE.Vector3(x, y, z)
}

// 创建地球纹理
function createEarthTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 512
  const ctx = canvas.getContext('2d')
  
  // 绘制海洋背景
  const gradient = ctx.createLinearGradient(0, 0, 0, 512)
  gradient.addColorStop(0, '#0a1628')
  gradient.addColorStop(0.5, '#1a3a5c')
  gradient.addColorStop(1, '#0a1628')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 1024, 512)
  
  // 绘制简单的陆地轮廓（简化版）
  ctx.fillStyle = '#2d5016'
  ctx.globalAlpha = 0.6
  
  // 亚洲
  ctx.beginPath()
  ctx.ellipse(700, 200, 150, 100, 0, 0, Math.PI * 2)
  ctx.fill()
  
  // 欧洲
  ctx.beginPath()
  ctx.ellipse(550, 180, 80, 60, 0, 0, Math.PI * 2)
  ctx.fill()
  
  // 非洲
  ctx.beginPath()
  ctx.ellipse(520, 300, 70, 120, 0, 0, Math.PI * 2)
  ctx.fill()
  
  // 北美
  ctx.beginPath()
  ctx.ellipse(200, 180, 120, 100, 0, 0, Math.PI * 2)
  ctx.fill()
  
  // 南美
  ctx.beginPath()
  ctx.ellipse(280, 350, 60, 100, 0, 0, Math.PI * 2)
  ctx.fill()
  
  // 澳洲
  ctx.beginPath()
  ctx.ellipse(850, 380, 80, 50, 0, 0, Math.PI * 2)
  ctx.fill()
  
  const texture = new THREE.CanvasTexture(canvas)
  return texture
}

// 创建星空背景
function createStars() {
  const geometry = new THREE.BufferGeometry()
  const vertices = []
  const colors = []
  
  for (let i = 0; i < 3000; i++) {
    const x = (Math.random() - 0.5) * 2000
    const y = (Math.random() - 0.5) * 2000
    const z = (Math.random() - 0.5) * 2000
    vertices.push(x, y, z)
    
    // 星星颜色
    const color = new THREE.Color()
    color.setHSL(Math.random() * 0.2 + 0.5, 0.8, Math.random() * 0.5 + 0.5)
    colors.push(color.r, color.g, color.b)
  }
  
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  
  const material = new THREE.PointsMaterial({
    size: 2,
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
    sizeAttenuation: true
  })
  
  return new THREE.Points(geometry, material)
}

// 创建地球
function createEarth() {
  const geometry = new THREE.SphereGeometry(50, 64, 64)
  const texture = createEarthTexture()
  
  const material = new THREE.MeshPhongMaterial({
    map: texture,
    color: 0x4fc3f7,
    emissive: 0x001133,
    emissiveIntensity: 0.3,
    shininess: 50,
    transparent: true,
    opacity: 0.95
  })
  
  const earth = new THREE.Mesh(geometry, material)
  return earth
}

// 创建大气层
function createAtmosphere() {
  const geometry = new THREE.SphereGeometry(52, 64, 64)
  const material = new THREE.MeshPhongMaterial({
    color: 0x4fc3f7,
    transparent: true,
    opacity: 0.15,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending
  })
  
  return new THREE.Mesh(geometry, material)
}

// 创建城市标记
function createCityMarkers() {
  const markers = []
  
  cities.forEach((city, index) => {
    const pos = latLonToVector3(city.lat, city.lon, 50)
    
    // 光柱
    const cylinderGeometry = new THREE.CylinderGeometry(0.3, 0.3, city.value / 5, 8)
    const cylinderMaterial = new THREE.MeshPhongMaterial({
      color: 0x4fc3f7,
      transparent: true,
      opacity: 0.8,
      emissive: 0x4fc3f7,
      emissiveIntensity: 0.5
    })
    
    const cylinder = new THREE.Mesh(cylinderGeometry, cylinderMaterial)
    cylinder.position.copy(pos)
    cylinder.lookAt(new THREE.Vector3(0, 0, 0))
    cylinder.rotateX(Math.PI / 2)
    cylinder.translateZ(city.value / 10)
    
    // 光点
    const dotGeometry = new THREE.SphereGeometry(0.8, 16, 16)
    const dotMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      emissive: 0x00ffff,
      emissiveIntensity: 1
    })
    
    const dot = new THREE.Mesh(dotGeometry, dotMaterial)
    dot.position.copy(pos)
    
    // 光环动画
    gsap.to(dot.scale, {
      x: 1.5,
      y: 1.5,
      z: 1.5,
      duration: 1 + Math.random(),
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
      delay: index * 0.1
    })
    
    markers.push({ cylinder, dot, city })
  })
  
  return markers
}

// 创建飞线
function createFlyLine(startCity, endCity) {
  const start = latLonToVector3(startCity.lat, startCity.lon, 51)
  const end = latLonToVector3(endCity.lat, endCity.lon, 51)
  
  // 计算中点（抬高形成弧线）
  const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5)
  mid.normalize().multiplyScalar(70)
  
  // 创建曲线
  const curve = new THREE.QuadraticBezierCurve3(start, mid, end)
  const points = curve.getPoints(100)
  
  const geometry = new THREE.BufferGeometry().setFromPoints(points)
  
  // 渐变色
  const colors = []
  const color1 = new THREE.Color(0x4fc3f7)
  const color2 = new THREE.Color(0xff6b6b)
  
  for (let i = 0; i < points.length; i++) {
    const alpha = i / points.length
    const color = color1.clone().lerp(color2, alpha)
    colors.push(color.r, color.g, color.b)
  }
  
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  
  const material = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.6,
    linewidth: 2
  })
  
  const line = new THREE.Line(geometry, material)
  
  // 流动动画
  const dotGeometry = new THREE.SphereGeometry(0.5, 8, 8)
  const dotMaterial = new THREE.MeshBasicMaterial({
    color: 0xffff00,
    emissive: 0xffff00,
    emissiveIntensity: 1
  })
  const dot = new THREE.Mesh(dotGeometry, dotMaterial)
  
  // 动画对象
  const animObj = { t: 0 }
  gsap.to(animObj, {
    t: 1,
    duration: 2,
    repeat: -1,
    ease: 'none',
    onUpdate: () => {
      const point = curve.getPoint(animObj.t)
      dot.position.copy(point)
    }
  })
  
  return { line, dot }
}

// 初始化场景
function init() {
  if (!container.value) return
  
  const width = container.value.clientWidth
  const height = container.value.clientHeight
  
  // 场景
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x050a14)
  
  // 相机
  camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 2000)
  camera.position.set(0, 0, 180)
  
  // 渲染器
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setSize(width, height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  container.value.appendChild(renderer.domElement)
  
  // 星空
  stars = createStars()
  scene.add(stars)
  
  // 地球
  earth = createEarth()
  scene.add(earth)
  
  // 大气层
  atmosphere = createAtmosphere()
  scene.add(atmosphere)
  
  // 光源
  const ambientLight = new THREE.AmbientLight(0x404040, 1.5)
  scene.add(ambientLight)
  
  const directionalLight = new THREE.DirectionalLight(0x4fc3f7, 1)
  directionalLight.position.set(100, 50, 50)
  scene.add(directionalLight)
  
  const pointLight = new THREE.PointLight(0x00bcd4, 0.8, 200)
  pointLight.position.set(-50, 30, 50)
  scene.add(pointLight)
  
  // 城市标记
  cityMarkers = createCityMarkers()
  cityMarkers.forEach(({ cylinder, dot }) => {
    earth.add(cylinder)
    earth.add(dot)
  })
  
  // 创建飞线
  for (let i = 0; i < 15; i++) {
    const startIdx = Math.floor(Math.random() * cities.length)
    let endIdx = Math.floor(Math.random() * cities.length)
    while (endIdx === startIdx) {
      endIdx = Math.floor(Math.random() * cities.length)
    }
    
    const flyLine = createFlyLine(cities[startIdx], cities[endIdx])
    earth.add(flyLine.line)
    earth.add(flyLine.dot)
    flyLines.push(flyLine)
  }
  
  // 地球自转动画
  gsap.to(earth.rotation, {
    y: Math.PI * 2,
    duration: 120,
    repeat: -1,
    ease: 'none'
  })
  
  // 星空缓慢旋转
  gsap.to(stars.rotation, {
    y: Math.PI * 2,
    duration: 600,
    repeat: -1,
    ease: 'none'
  })
  
  // 更新数据
  cityCount.value = cities.length
  dataFlow.value = '2.4 TB'
  
  // 隐藏加载
  loading.value = false
  
  // 开始动画
  animate()
  
  // 响应式
  window.addEventListener('resize', onResize)
}

function onResize() {
  if (!container.value || !camera || !renderer) return
  const width = container.value.clientWidth
  const height = container.value.clientHeight
  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height)
}

function animate() {
  animationId = requestAnimationFrame(animate)
  renderer.render(scene, camera)
}

onMounted(() => {
  init()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  if (animationId) cancelAnimationFrame(animationId)
  if (renderer) {
    renderer.dispose()
    if (container.value && renderer.domElement) {
      container.value.removeChild(renderer.domElement)
    }
  }
})
</script>

<template>
  <div
    ref="container"
    class="earth-container"
  >
    <div
      v-if="loading"
      class="loading"
    >
      <div class="spinner" />
      <span>加载3D地球...</span>
    </div>
    <div class="earth-info">
      <div class="info-item">
        <span class="info-label">覆盖城市</span>
        <span class="info-value">{{ cityCount }}</span>
      </div>
      <div class="info-item">
        <span class="info-label">数据流量</span>
        <span class="info-value">{{ dataFlow }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.earth-container {
  position: relative;
  width: 100%;
  height: 100%;
  background: radial-gradient(ellipse at center, #0a1628 0%, #050a14 100%);
  border-radius: 8px;
  overflow: hidden;
}

.loading {
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

.spinner {
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

.earth-info {
  position: absolute;
  bottom: 16px;
  left: 16px;
  display: flex;
  gap: 24px;
  z-index: 10;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-label {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.6);
}

.info-value {
  font-size: 18px;
  font-weight: 600;
  color: #4fc3f7;
}
</style>
