<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import gsap from 'gsap'
import { useRouter } from 'vue-router'

const container = ref(null)
const selectedDistrict = ref(null)
const serviceResponseRate = ref('90.0') // 预设值避免 hydration 问题
const searchKeyword = ref('')
const sortMode = ref('elderly_desc')
const filterMode = ref('all')
const leftCollapsed = ref(false)
const rightCollapsed = ref(false)
const autoRotate = ref(true)
const hoverDistrict = ref(null)
const tooltipVisible = ref(false)
const tooltipX = ref(0)
const tooltipY = ref(0)

const router = useRouter()

let scene, camera, renderer, composer, mapGroup, animationId, raycaster, mouse
const districtMeshes = [] // 存储各区mesh用于点击检测
let containerRect = null

// 天津市各区数据
const districtData = [
  { name: '和平区', center: [117.1959, 39.1183], elderly: 89 },
  { name: '河东区', center: [117.2266, 39.1221], elderly: 134 },
  { name: '河西区', center: [117.2175, 39.1019], elderly: 156 },
  { name: '南开区', center: [117.1641, 39.1205], elderly: 178 },
  { name: '河北区', center: [117.2016, 39.1566], elderly: 112 },
  { name: '红桥区', center: [117.1633, 39.1751], elderly: 98 },
  { name: '东丽区', center: [117.3140, 39.0878], elderly: 76 },
  { name: '西青区', center: [117.0122, 39.1394], elderly: 65 },
  { name: '津南区', center: [117.3583, 38.9876], elderly: 58 },
  { name: '北辰区', center: [117.1352, 39.2253], elderly: 72 },
  { name: '武清区', center: [117.0444, 39.3842], elderly: 45 },
  { name: '宝坻区', center: [117.3096, 39.7175], elderly: 38 },
  { name: '滨海新区', center: [117.7016, 39.0333], elderly: 198 },
  { name: '宁河区', center: [117.8261, 39.3306], elderly: 28 },
  { name: '静海区', center: [116.9743, 38.9477], elderly: 42 },
  { name: '蓟州区', center: [117.4080, 40.0458], elderly: 35 },
]

const CENTER_LON = 117.3
const CENTER_LAT = 39.35
const SCALE = 18

function geoToWorld(lon, lat) {
  const x = (lon - CENTER_LON) * SCALE
  const z = -(lat - CENTER_LAT) * SCALE
  return { x, z }
}

// 热力颜色
function getHeatColor(value, min, max) {
  const t = Math.max(0, Math.min(1, (value - min) / (max - min)))
  if (t < 0.33) {
    return new THREE.Color(0x00e396) // 绿
  } else if (t < 0.66) {
    return new THREE.Color(0xfbbf24) // 黄
  } 
    return new THREE.Color(0xff4560) // 红
  
}

// 选中高亮色
const SELECTED_COLOR = new THREE.Color(0x00d4ff)

const minElderly = Math.min(...districtData.map(d => d.elderly))
const maxElderly = Math.max(...districtData.map(d => d.elderly))

function deriveDistrict(d) {
  const responseRate = Number(calcResponseRate(d.elderly))
  const onlineDevices = Math.max(1, Math.floor(d.elderly * 0.67))
  const todayAlerts = Math.max(0, Math.floor(d.elderly * 0.05))
  const riskScore = d.elderly * 0.45 + todayAlerts * 18 + (100 - responseRate) * 3.6
  const riskLevel = riskScore > 150 ? 'high' : riskScore > 95 ? 'mid' : 'low'
  return { responseRate, onlineDevices, todayAlerts, riskScore, riskLevel }
}

const districtRows = computed(() => {
  const keyword = searchKeyword.value.trim()
  const base = keyword ? districtData.filter((d) => d.name.includes(keyword)) : districtData.slice()
  const filtered = filterMode.value === 'high'
    ? base.filter((d) => deriveDistrict(d).riskLevel === 'high')
    : filterMode.value === 'mid'
      ? base.filter((d) => {
        const level = deriveDistrict(d).riskLevel
        return level === 'mid' || level === 'high'
      })
      : base

  const sorted = filtered.slice().sort((a, b) => {
    if (sortMode.value === 'name_asc') return a.name.localeCompare(b.name, 'zh-Hans-CN')
    if (sortMode.value === 'name_desc') return b.name.localeCompare(a.name, 'zh-Hans-CN')
    if (sortMode.value === 'elderly_asc') return a.elderly - b.elderly
    return b.elderly - a.elderly
  })
  return sorted.map((d) => ({ ...d, __derived: deriveDistrict(d) }))
})

const selectedSummary = computed(() => {
  if (!selectedDistrict.value) return null
  const elderly = selectedDistrict.value.elderly
  const onlineDevices = Math.max(1, Math.floor(elderly * 0.67))
  const todayAlerts = Math.max(0, Math.floor(elderly * 0.05))
  const responseRate = Number(serviceResponseRate.value || '0')
  const riskScore = elderly * 0.45 + todayAlerts * 18 + (100 - responseRate) * 3.6
  return {
    elderly,
    onlineDevices,
    todayAlerts,
    responseRate,
    riskScore: Math.round(riskScore),
  }
})

function calcResponseRate(elderly) {
  const raw = 88 + (elderly % 17) * 0.45
  return Math.min(98.8, Math.max(82.0, raw)).toFixed(1)
}

async function init() {
  await nextTick()
  if (!container.value) return

  for (let i = 0; i < 20; i++) {
    if (container.value.clientWidth > 0) break
    await new Promise(r => setTimeout(r, 100))
  }

  const width = container.value.clientWidth
  const height = container.value.clientHeight
  if (width === 0 || height === 0) return

  // 初始化射线检测
  raycaster = new THREE.Raycaster()
  mouse = new THREE.Vector2()

  // === 场景 ===
  scene = new THREE.Scene()

  // === 相机 ===
  camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 500)
  camera.position.set(0, 40, 50)
  camera.lookAt(0, 0, 0)

  // === 渲染器 ===
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setSize(width, height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setClearColor(0x000000, 0)
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.2
  container.value.appendChild(renderer.domElement)

  // === Bloom 后处理（降低强度） ===
  composer = new EffectComposer(renderer)
  composer.addPass(new RenderPass(scene, camera))
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(width, height),
    0.35,   // strength 从 0.8 降到 0.35
    0.3,    // radius
    0.5     // threshold 从 0.3 提高到 0.5（更难触发泛光）
  )
  composer.addPass(bloomPass)

  // === 地图组 ===
  mapGroup = new THREE.Group()
  scene.add(mapGroup)

  // === 光源（降低强度） ===
  scene.add(new THREE.AmbientLight(0xffeedd, 0.8))
  const dirLight1 = new THREE.DirectionalLight(0xffcc88, 0.8)
  dirLight1.position.set(30, 50, 30)
  scene.add(dirLight1)
  const dirLight2 = new THREE.DirectionalLight(0xff8844, 0.5)
  dirLight2.position.set(-20, 30, -20)
  scene.add(dirLight2)

  // === 加载地图 ===
  await loadTianjinMap()
  frameToContent()
  addBasePlane()

  // === 粒子 ===
  addParticles()

  // === 飞线 ===
  addFlyLines()

  // === 点击事件 ===
  renderer.domElement.addEventListener('click', onMouseClick)
  renderer.domElement.addEventListener('mousemove', onMouseMove)
  renderer.domElement.addEventListener('mouseleave', onMouseLeave)
  renderer.domElement.addEventListener('mouseenter', onMouseEnter)

  // === 入场动画 ===
  const intro = getDefaultCamera()
  camera.position.set(intro.x, intro.y + 20, intro.z + 20)
  gsap.to(camera.position, { x: intro.x, y: intro.y, z: intro.z, duration: 2.2, ease: 'power2.out' })

  // === 渲染循环 ===
  function animate() {
    animationId = requestAnimationFrame(animate)
    if (mapGroup && autoRotate.value) mapGroup.rotation.y += 0.00035
    composer.render()
  }
  animate()

  // === resize ===
  const onResize = () => {
    if (!container.value) return
    const w = container.value.clientWidth
    const h = container.value.clientHeight
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    renderer.setSize(w, h)
    composer.setSize(w, h)
  }
  window.addEventListener('resize', onResize)

  onBeforeUnmount(() => {
    window.removeEventListener('resize', onResize)
    renderer.domElement.removeEventListener('click', onMouseClick)
    renderer.domElement.removeEventListener('mousemove', onMouseMove)
    renderer.domElement.removeEventListener('mouseleave', onMouseLeave)
    renderer.domElement.removeEventListener('mouseenter', onMouseEnter)
    if (animationId) cancelAnimationFrame(animationId)
    if (renderer) {
      renderer.dispose()
      if (container.value && renderer.domElement) {
        container.value.removeChild(renderer.domElement)
      }
    }
  })
}

async function loadTianjinMap() {
  let geoData = null
  try {
    const res = await fetch('https://geo.datav.aliyun.com/areas_v3/bound/120000_full.json')
    geoData = await res.json()
  } catch (e) {
    console.warn('加载GeoJSON失败:', e)
  }

  if (geoData && geoData.type === 'FeatureCollection') {
    geoData.features.forEach((feature) => {
      const name = feature.properties.name
      const district = districtData.find(d => d.name === name)
      if (!district) return

      const heatColor = getHeatColor(district.elderly, minElderly, maxElderly)
      const coords = feature.geometry.coordinates
      const geomType = feature.geometry.type

      // MultiPolygon: coords = [ [ [ring], [ring] ], [ [ring] ], ... ]
      // Polygon:    coords = [ [ring], [ring], ... ]
      let polygons
      if (geomType === 'MultiPolygon') {
        polygons = coords // 每个元素是一个 Polygon
      } else {
        polygons = [coords] // 单个 Polygon 包裹成数组
      }

      const districtGroup = new THREE.Group()
      districtGroup.userData = { district, originalColor: heatColor }

      polygons.forEach((polygon) => {
        const ring = polygon[0]
        const validRing = ensureValidCoords(ring)
        if (!validRing || validRing.length < 3) return
        const simplified = simplifyCoords(validRing, 0.003)
        if (!simplified || simplified.length < 3) return

        const worldPoints = simplified.map(c => geoToWorld(c[0], c[1]))
        const shape = new THREE.Shape()
        shape.moveTo(worldPoints[0].x, worldPoints[0].z)
        for (let i = 1; i < worldPoints.length; i++) {
          shape.lineTo(worldPoints[i].x, worldPoints[i].z)
        }
        shape.closePath()

        const extrudeHeight = 0.5 + (district.elderly / maxElderly) * 2.5
        const geometry = new THREE.ExtrudeGeometry(shape, {
          depth: extrudeHeight, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 2
        })

        const topMaterial = new THREE.MeshPhongMaterial({
          color: heatColor, emissive: heatColor, emissiveIntensity: 0.15, transparent: true, opacity: 0.85
        })
        const sideMaterial = new THREE.MeshPhongMaterial({
          color: 0x1a1a2e, emissive: heatColor, emissiveIntensity: 0.05, transparent: true, opacity: 0.9
        })

        const mesh = new THREE.Mesh(geometry, [topMaterial, sideMaterial])
        mesh.rotation.x = -Math.PI / 2
        mesh.userData = { district, isDistrict: true, originalColor: heatColor }
        districtGroup.add(mesh)
        districtMeshes.push(mesh)

        // 描边
        const points2D = worldPoints.map(p => new THREE.Vector3(p.x, 0.01, p.z))
        points2D.push(points2D[0].clone())
        const lineGeo = new THREE.BufferGeometry().setFromPoints(points2D)
        const lineMat = new THREE.LineBasicMaterial({ color: heatColor, transparent: true, opacity: 0.55 })
        const line = new THREE.Line(lineGeo, lineMat)
        line.userData = { district, isOutline: true }
        districtGroup.add(line)
      })

      mapGroup.add(districtGroup)
      addLightBeam(district, heatColor, maxElderly, districtGroup)
      addGlowRing(district, heatColor, districtGroup)
    })
  }
}

function frameToContent() {
  if (!mapGroup || districtMeshes.length === 0) return
  const box = new THREE.Box3()
  districtMeshes.forEach((m) => box.expandByObject(m))
  const size = new THREE.Vector3()
  const center = new THREE.Vector3()
  box.getSize(size)
  box.getCenter(center)
  mapGroup.position.x -= center.x
  mapGroup.position.z -= center.z
  const radius = Math.max(size.x, size.z) * 0.65
  camera.position.set(0, Math.max(28, radius * 1.35), radius * 1.55)
  camera.lookAt(0, 0, 0)
}

function getDefaultCamera() {
  if (!mapGroup || districtMeshes.length === 0) return { x: 0, y: 40, z: 50 }
  const box = new THREE.Box3()
  districtMeshes.forEach((m) => box.expandByObject(m))
  const size = new THREE.Vector3()
  box.getSize(size)
  const radius = Math.max(size.x, size.z) * 0.65
  return { x: 0, y: Math.max(28, radius * 1.35), z: radius * 1.55 }
}

function addBasePlane() {
  if (!mapGroup || districtMeshes.length === 0) return
  const box = new THREE.Box3()
  districtMeshes.forEach((m) => box.expandByObject(m))
  const size = new THREE.Vector3()
  box.getSize(size)
  const planeGeo = new THREE.PlaneGeometry(size.x * 1.55, size.z * 1.55)
  const planeMat = new THREE.MeshBasicMaterial({ color: 0x050a14, transparent: true, opacity: 0.85 })
  const plane = new THREE.Mesh(planeGeo, planeMat)
  plane.rotation.x = -Math.PI / 2
  plane.position.y = -0.08
  mapGroup.add(plane)
}

function ensureValidCoords(coords) {
  if (!coords || coords.length < 3) return null
  return coords.filter(c => c && typeof c[0] === 'number' && typeof c[1] === 'number' && isFinite(c[0]) && isFinite(c[1]))
}

function simplifyCoords(coords, tolerance) {
  if (!coords || coords.length <= 3) return coords
  let maxDist = 0, maxIdx = 0
  const first = coords[0], last = coords[coords.length - 1]
  for (let i = 1; i < coords.length - 1; i++) {
    const d = pointLineDistance(coords[i], first, last)
    if (d > maxDist) { maxDist = d; maxIdx = i }
  }
  if (maxDist > tolerance) {
    const left = simplifyCoords(coords.slice(0, maxIdx + 1), tolerance)
    const right = simplifyCoords(coords.slice(maxIdx), tolerance)
    return left.slice(0, -1).concat(right)
  }
  return [first, last]
}

function pointLineDistance(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1]
  const len2 = dx * dx + dy * dy
  if (len2 === 0) return Math.sqrt((p[0] - a[0]) ** 2 + (p[1] - a[1]) ** 2)
  let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2
  t = Math.max(0, Math.min(1, t))
  const proj = [a[0] + t * dx, a[1] + t * dy]
  return Math.sqrt((p[0] - proj[0]) ** 2 + (p[1] - proj[1]) ** 2)
}

function addLightBeam(district, color, maxElderly, parent) {
  const pos = geoToWorld(district.center[0], district.center[1])
  const beamHeight = 3 + (district.elderly / maxElderly) * 8

  const geo = new THREE.CylinderGeometry(0.15, 0.4, beamHeight, 8)
  const mat = new THREE.MeshPhongMaterial({
    color: color, emissive: color, emissiveIntensity: 0.3, transparent: true, opacity: 0.4
  })
  const beam = new THREE.Mesh(geo, mat)
  beam.position.set(pos.x, beamHeight / 2 + 0.5, pos.z)
  parent.add(beam)

  const dotGeo = new THREE.SphereGeometry(0.35, 16, 16)
  const dotMat = new THREE.MeshPhongMaterial({
    color: 0xffffff, emissive: color, emissiveIntensity: 0.55
  })
  const dot = new THREE.Mesh(dotGeo, dotMat)
  dot.position.set(pos.x, beamHeight + 0.5, pos.z)
  parent.add(dot)

  gsap.to(dot.scale, { x: 1.6, y: 1.6, z: 1.6, duration: 1 + Math.random() * 0.5, repeat: -1, yoyo: true, ease: 'sine.inOut' })
}

function addGlowRing(district, color, parent) {
  const pos = geoToWorld(district.center[0], district.center[1])
  const ringGeo = new THREE.RingGeometry(1.2, 1.8, 32)
  const ringMat = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.3, side: THREE.DoubleSide })
  const ring = new THREE.Mesh(ringGeo, ringMat)
  ring.rotation.x = -Math.PI / 2
  ring.position.set(pos.x, 0.02, pos.z)
  parent.add(ring)

  gsap.to(ring.material, { opacity: 0.1, duration: 2 + Math.random(), repeat: -1, yoyo: true, ease: 'sine.inOut' })
  gsap.to(ring.scale, { x: 1.3, y: 1.3, z: 1.3, duration: 2 + Math.random(), repeat: -1, yoyo: true, ease: 'sine.inOut' })
}

function addParticles() {
  const count = 500
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const minLon = 116.8, maxLon = 118.0, minLat = 38.6, maxLat = 40.2

  for (let i = 0; i < count; i++) {
    const lon = minLon + Math.random() * (maxLon - minLon)
    const lat = minLat + Math.random() * (maxLat - minLat)
    const pos = geoToWorld(lon, lat)
    positions[i * 3] = pos.x
    positions[i * 3 + 1] = 0.2 + Math.random() * 2
    positions[i * 3 + 2] = pos.z
    const t = Math.random()
    const c = new THREE.Color().setHSL(0.05 + t * 0.1, 0.9, 0.5 + t * 0.3)
    colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  const mat = new THREE.PointsMaterial({ size: 0.2, vertexColors: true, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false })
  const particles = new THREE.Points(geo, mat)
  mapGroup.add(particles)
}

function addFlyLines() {
  const mainDistricts = districtData.filter(d => d.elderly > 60)
  for (let i = 0; i < mainDistricts.length - 1; i++) {
    const start = geoToWorld(mainDistricts[i].center[0], mainDistricts[i].center[1])
    const end = geoToWorld(mainDistricts[i + 1].center[0], mainDistricts[i + 1].center[1])
    const mid = { x: (start.x + end.x) / 2, z: (start.z + end.z) / 2 }
    const dist = Math.sqrt((start.x - end.x) ** 2 + (start.z - end.z) ** 2)
    const arcHeight = 5 + dist * 0.4

    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(start.x, 2, start.z),
      new THREE.Vector3(mid.x, arcHeight + 2, mid.z),
      new THREE.Vector3(end.x, 2, end.z),
    )

    const points = curve.getPoints(50)
    const geo = new THREE.BufferGeometry().setFromPoints(points)
    const colors = []
    const c1 = new THREE.Color(0xffaa00), c2 = new THREE.Color(0xff3300)
    for (let j = 0; j < points.length; j++) {
      const c = c1.clone().lerp(c2, j / points.length)
      colors.push(c.r, c.g, c.b)
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    const lineMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending })
    mapGroup.add(new THREE.Line(geo, lineMat))

    const dotGeo = new THREE.SphereGeometry(0.2, 8, 8)
    const dotMat = new THREE.MeshPhongMaterial({ color: 0x60a5fa, emissive: 0x60a5fa, emissiveIntensity: 0.7 })
    const dot = new THREE.Mesh(dotGeo, dotMat)
    mapGroup.add(dot)

    const anim = { t: 0 }
    gsap.to(anim, { t: 1, duration: 1.5 + Math.random() * 1.5, repeat: -1, ease: 'none', onUpdate: () => {
      const p = curve.getPoint(anim.t)
      dot.position.copy(p)
    }})
  }
}

// ========== 交互功能 ==========

function onMouseMove(event) {
  if (!renderer || !raycaster || !mouse) return
  const rect = renderer.domElement.getBoundingClientRect()
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

  raycaster.setFromCamera(mouse, camera)
  const intersects = raycaster.intersectObjects(districtMeshes)

  renderer.domElement.style.cursor = intersects.length > 0 ? 'pointer' : 'default'
  if (!containerRect && container.value) {
    containerRect = container.value.getBoundingClientRect()
  }

  if (intersects.length > 0) {
    const district = intersects[0].object.userData.district
    hoverDistrict.value = district
    tooltipVisible.value = true
    tooltipX.value = event.clientX - (containerRect?.left || 0) + 14
    tooltipY.value = event.clientY - (containerRect?.top || 0) + 12
  } else {
    hoverDistrict.value = null
    tooltipVisible.value = false
  }
}

function onMouseClick(event) {
  if (!renderer || !raycaster || !mouse) return
  const rect = renderer.domElement.getBoundingClientRect()
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

  raycaster.setFromCamera(mouse, camera)
  const intersects = raycaster.intersectObjects(districtMeshes)

  if (intersects.length > 0) {
    const district = intersects[0].object.userData.district
    selectDistrict(district)
  }
}

function onMouseLeave() {
  hoverDistrict.value = null
  tooltipVisible.value = false
}

function onMouseEnter() {
  if (container.value) containerRect = container.value.getBoundingClientRect()
}

function selectDistrict(district) {
  selectedDistrict.value = district
  serviceResponseRate.value = calcResponseRate(district.elderly)
  rightCollapsed.value = false

  // 重置所有区域颜色
  districtMeshes.forEach(mesh => {
    const originalColor = mesh.userData.originalColor
    mesh.material[0].color.copy(originalColor)
    mesh.material[0].emissive.copy(originalColor)
    mesh.material[0].emissiveIntensity = 0.22
  })

  // 高亮选中区域
  const selectedMeshes = districtMeshes.filter(m => m.userData.district.name === district.name)
  selectedMeshes.forEach(mesh => {
    mesh.material[0].color.copy(SELECTED_COLOR)
    mesh.material[0].emissive.copy(SELECTED_COLOR)
    mesh.material[0].emissiveIntensity = 0.35

    // 弹跳动画
    gsap.to(mesh.position, { y: mesh.position.y + 0.5, duration: 0.3, yoyo: true, repeat: 1 })
  })

  // 相机聚焦到选中区域
  const pos = geoToWorld(district.center[0], district.center[1])
  gsap.to(camera.position, {
    x: pos.x * 0.3,
    y: 35,
    z: pos.z * 0.3 + 40,
    duration: 1.5,
    ease: 'power2.out'
  })
}

function resetView() {
  const next = getDefaultCamera()
  gsap.to(camera.position, { x: next.x, y: next.y, z: next.z, duration: 1.2, ease: 'power2.out' })
}

function navigateToAlerts() {
  if (!selectedDistrict.value) return
  router.push('/gov/alert')
}

function navigateToElderly() {
  if (!selectedDistrict.value) return
  router.push('/gov/elderly')
}

onMounted(() => { init() })
</script>

<template>
  <div
    ref="container"
    class="tianjin-3d-map"
  >
    <div class="hud">
      <div class="hud-top">
        <div class="hud-title">
          <span class="hud-kicker">Tianjin Overview</span>
          <span class="hud-name">区县分布与风险态势</span>
        </div>

        <div class="hud-controls">
          <div class="legend">
            <span class="legend-label">热度</span>
            <span class="legend-chip is-low">低</span>
            <span class="legend-chip is-mid">中</span>
            <span class="legend-chip is-high">高</span>
            <span class="legend-range">{{ minElderly }}–{{ maxElderly }} 人</span>
          </div>

          <button class="hud-btn" type="button" :aria-pressed="autoRotate" @click="autoRotate = !autoRotate">
            {{ autoRotate ? '暂停旋转' : '自动旋转' }}
          </button>
          <button class="hud-btn" type="button" @click="resetView">重置视角</button>
        </div>
      </div>

      <div class="panel panel-left" :class="{ collapsed: leftCollapsed }">
        <div class="panel-head">
          <div class="panel-head-main">
            <span class="panel-title">区县列表</span>
            <span class="panel-sub">{{ districtRows.length }} / {{ districtData.length }}</span>
          </div>
          <button
            class="panel-toggle"
            type="button"
            :aria-expanded="!leftCollapsed"
            @click="leftCollapsed = !leftCollapsed"
          >
            {{ leftCollapsed ? '展开' : '收起' }}
          </button>
        </div>

        <div v-if="!leftCollapsed" class="panel-tools">
          <input
            v-model="searchKeyword"
            class="panel-input"
            type="text"
            name="district-search"
            autocomplete="off"
            spellcheck="false"
            aria-label="搜索区县"
            placeholder="搜索区县…"
          >
          <div class="filter-row">
            <button
              class="filter-chip"
              :class="{ active: filterMode === 'all' }"
              type="button"
              :aria-pressed="filterMode === 'all'"
              @click="filterMode = 'all'"
            >
              全部
            </button>
            <button
              class="filter-chip"
              :class="{ active: filterMode === 'mid' }"
              type="button"
              :aria-pressed="filterMode === 'mid'"
              @click="filterMode = 'mid'"
            >
              中高风险
            </button>
            <button
              class="filter-chip danger"
              :class="{ active: filterMode === 'high' }"
              type="button"
              :aria-pressed="filterMode === 'high'"
              @click="filterMode = 'high'"
            >
              高风险
            </button>
          </div>
          <select v-model="sortMode" class="panel-select" aria-label="区县排序方式">
            <option value="elderly_desc">按人数（高→低）</option>
            <option value="elderly_asc">按人数（低→高）</option>
            <option value="name_asc">按名称（A→Z）</option>
            <option value="name_desc">按名称（Z→A）</option>
          </select>
        </div>

        <div v-if="!leftCollapsed" class="district-list" role="listbox" aria-label="天津市各区">
          <button
            v-for="district in districtRows"
            :key="district.name"
            class="district-item"
            :class="{ active: selectedDistrict?.name === district.name }"
            :aria-selected="selectedDistrict?.name === district.name"
            role="option"
            type="button"
            @click="selectDistrict(district)"
          >
            <span class="district-name">{{ district.name }}</span>
            <span class="district-meta">
              <span class="district-count">{{ district.elderly }}</span>
              <span class="district-unit">人</span>
            </span>
            <span class="district-risk" :class="`is-${district.__derived.riskLevel}`">
              {{ district.__derived.riskLevel === 'high' ? '高风险' : district.__derived.riskLevel === 'mid' ? '关注' : '稳定' }}
            </span>
            <span class="district-bar">
              <span class="district-fill" :style="{ width: `${(district.elderly / maxElderly) * 100}%` }" />
            </span>
          </button>
        </div>
      </div>

      <div class="panel panel-right" :class="{ collapsed: rightCollapsed }">
        <div class="panel-head">
          <div class="panel-head-main">
            <span class="panel-title">区域概览</span>
            <span class="panel-sub">{{ selectedDistrict ? selectedDistrict.name : '未选择' }}</span>
          </div>
          <button
            class="panel-toggle"
            type="button"
            :aria-expanded="!rightCollapsed"
            @click="rightCollapsed = !rightCollapsed"
          >
            {{ rightCollapsed ? '展开' : '收起' }}
          </button>
        </div>

        <div v-if="!rightCollapsed" class="panel-body">
          <div v-if="selectedDistrict" class="summary">
            <div class="summary-main">
              <div class="summary-big">{{ selectedSummary?.elderly }}<span>人</span></div>
              <div class="summary-label">在档服务老人</div>
            </div>
            <div class="summary-grid">
              <div class="summary-card">
                <span>在线设备</span>
                <strong>{{ selectedSummary?.onlineDevices }}</strong>
              </div>
              <div class="summary-card warn">
                <span>今日告警</span>
                <strong>{{ selectedSummary?.todayAlerts }}</strong>
              </div>
              <div class="summary-card ok">
                <span>响应率</span>
                <strong>{{ selectedSummary?.responseRate }}%</strong>
              </div>
            </div>
            <div class="risk-strip">
              <span class="risk-label">综合风险</span>
              <strong class="risk-score">{{ selectedSummary?.riskScore }}</strong>
              <span class="risk-note">用于值守优先级排序</span>
            </div>
            <div class="panel-actions">
              <button class="action-btn" type="button" @click="navigateToElderly">查看老人</button>
              <button class="action-btn danger" type="button" @click="navigateToAlerts">查看预警</button>
            </div>
            <div class="panel-foot">
              中心坐标 {{ selectedDistrict.center[0].toFixed(4) }}, {{ selectedDistrict.center[1].toFixed(4) }}
            </div>
          </div>

          <div v-else class="empty">
            <div class="empty-title">选择区县查看概览</div>
            <div class="empty-desc">点击左侧列表或地图区域，可快速下钻到该区的老人、设备与告警。</div>
          </div>
        </div>
      </div>

      <div
        v-if="tooltipVisible && hoverDistrict"
        class="tooltip"
        :style="{ transform: `translate(${tooltipX}px, ${tooltipY}px)` }"
      >
        <div class="tooltip-name">{{ hoverDistrict.name }}</div>
        <div class="tooltip-row">
          <span>服务老人</span>
          <strong>{{ hoverDistrict.elderly }}</strong>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tianjin-3d-map {
  position: relative;
  width: 100%;
  height: 100%;
  background: radial-gradient(circle at 20% 0%, rgba(59, 130, 246, 0.18), transparent 52%),
    radial-gradient(circle at 85% 25%, rgba(16, 185, 129, 0.12), transparent 55%),
    radial-gradient(circle at 60% 90%, rgba(236, 72, 153, 0.08), transparent 60%),
    #050914;
  border-radius: 14px;
  overflow: hidden;
}

.tianjin-3d-map::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background:
    radial-gradient(circle at 50% 45%, rgba(56, 189, 248, 0.12), transparent 55%),
    radial-gradient(circle at 16% 12%, rgba(99, 102, 241, 0.12), transparent 54%),
    radial-gradient(circle at 88% 20%, rgba(34, 197, 94, 0.09), transparent 56%),
    repeating-linear-gradient(
      0deg,
      rgba(148, 163, 184, 0.04) 0px,
      rgba(148, 163, 184, 0.04) 1px,
      transparent 1px,
      transparent 96px
    ),
    repeating-linear-gradient(
      90deg,
      rgba(148, 163, 184, 0.035) 0px,
      rgba(148, 163, 184, 0.035) 1px,
      transparent 1px,
      transparent 96px
    );
  opacity: 0.95;
}

.tianjin-3d-map::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background:
    radial-gradient(rgba(255, 255, 255, 0.06) 1px, transparent 1px),
    radial-gradient(rgba(0, 0, 0, 0.12) 1px, transparent 1px);
  background-size: 3px 3px, 4px 4px;
  background-position: 0 0, 1px 1px;
  opacity: 0.16;
  mix-blend-mode: overlay;
}

.tianjin-3d-map :deep(canvas) {
  position: absolute;
  inset: 0;
  z-index: 1;
}

.hud {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
}

.hud-top {
  position: absolute;
  top: 14px;
  left: 14px;
  right: 14px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.hud-title {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.16);
  background: rgba(2, 6, 23, 0.72);
  box-shadow: 0 18px 30px rgba(0, 0, 0, 0.35);
  pointer-events: auto;
}

.hud-kicker {
  font-size: 11px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(226, 232, 240, 0.55);
}

.hud-name {
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: rgba(255, 255, 255, 0.92);
}

.hud-controls {
  display: flex;
  align-items: center;
  gap: 10px;
  pointer-events: auto;
}

.legend {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.16);
  background: rgba(2, 6, 23, 0.68);
  color: rgba(226, 232, 240, 0.7);
  font-size: 12px;
}

.legend-label {
  color: rgba(226, 232, 240, 0.5);
}

.legend-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 18px;
  padding: 0 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.legend-chip.is-low {
  background: rgba(16, 185, 129, 0.16);
  color: rgba(110, 231, 183, 0.9);
}

.legend-chip.is-mid {
  background: rgba(245, 158, 11, 0.18);
  color: rgba(253, 230, 138, 0.92);
}

.legend-chip.is-high {
  background: rgba(244, 63, 94, 0.18);
  color: rgba(253, 164, 175, 0.92);
}

.legend-range {
  margin-left: 4px;
  font-variant-numeric: tabular-nums;
  color: rgba(226, 232, 240, 0.45);
}

.hud-btn {
  height: 38px;
  padding: 0 14px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  background: rgba(2, 6, 23, 0.6);
  color: rgba(255, 255, 255, 0.86);
  cursor: pointer;
  transition: transform 0.18s ease, border-color 0.18s ease, background-color 0.18s ease;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

.hud-btn:hover {
  transform: translateY(-1px);
  border-color: rgba(56, 189, 248, 0.35);
  background: rgba(15, 23, 42, 0.72);
}

.hud-btn:focus-visible,
.panel-toggle:focus-visible,
.filter-chip:focus-visible,
.district-item:focus-visible,
.action-btn:focus-visible {
  outline: 2px solid rgba(56, 189, 248, 0.72);
  outline-offset: 2px;
}

.panel-input:focus-visible,
.panel-select:focus-visible {
  outline: 2px solid rgba(56, 189, 248, 0.62);
  outline-offset: 2px;
}

.panel {
  position: absolute;
  top: 76px;
  bottom: 14px;
  width: 270px;
  border-radius: 18px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  background: rgba(2, 6, 23, 0.7);
  box-shadow: 0 22px 42px rgba(0, 0, 0, 0.45);
  display: flex;
  flex-direction: column;
  pointer-events: auto;
  overflow: hidden;
}

.panel-left {
  left: 14px;
}

.panel-right {
  right: 14px;
}

.panel.collapsed {
  width: 110px;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 14px 14px 12px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.12);
}

.panel-head-main {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.panel-title {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.92);
}

.panel-sub {
  font-size: 12px;
  color: rgba(226, 232, 240, 0.55);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.panel-toggle {
  height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  background: rgba(15, 23, 42, 0.4);
  color: rgba(226, 232, 240, 0.7);
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

.panel-tools {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
  padding: 12px 14px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.12);
}

.filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.filter-chip {
  height: 30px;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  background: rgba(15, 23, 42, 0.24);
  color: rgba(226, 232, 240, 0.7);
  cursor: pointer;
  font-weight: 700;
  font-size: 12px;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

.filter-chip.active {
  border-color: rgba(56, 189, 248, 0.42);
  background: rgba(14, 165, 233, 0.12);
  color: rgba(255, 255, 255, 0.9);
}

.filter-chip.danger.active {
  border-color: rgba(244, 63, 94, 0.42);
  background: rgba(244, 63, 94, 0.14);
}

.panel-input,
.panel-select {
  width: 100%;
  height: 38px;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  background: rgba(15, 23, 42, 0.32);
  color: rgba(255, 255, 255, 0.88);
  padding: 0 12px;
  outline: none;
}

.panel-input::placeholder {
  color: rgba(226, 232, 240, 0.38);
}

.district-list {
  flex: 1;
  overflow: auto;
  padding: 10px 10px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.district-list::-webkit-scrollbar {
  width: 6px;
}

.district-list::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.22);
  border-radius: 999px;
}

.district-item {
  position: relative;
  display: grid;
  grid-template-columns: 1fr auto;
  grid-template-rows: auto auto;
  gap: 6px 10px;
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.12);
  background: rgba(15, 23, 42, 0.26);
  color: rgba(226, 232, 240, 0.78);
  cursor: pointer;
  text-align: left;
  transition: transform 0.18s ease, border-color 0.18s ease, background-color 0.18s ease;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

.district-item:hover {
  transform: translateY(-1px);
  border-color: rgba(56, 189, 248, 0.26);
  background: rgba(15, 23, 42, 0.36);
}

.district-item.active {
  border-color: rgba(56, 189, 248, 0.5);
  background: rgba(14, 165, 233, 0.12);
}

.district-name {
  font-size: 13px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.92);
}

.district-meta {
  display: inline-flex;
  align-items: baseline;
  gap: 3px;
  font-variant-numeric: tabular-nums;
}

.district-count {
  font-size: 14px;
  font-weight: 800;
  color: rgba(253, 230, 138, 0.92);
}

.district-unit {
  font-size: 11px;
  color: rgba(226, 232, 240, 0.5);
}

.district-bar {
  grid-column: 1 / -1;
  height: 8px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.12);
  overflow: hidden;
}

.district-risk {
  justify-self: end;
  align-self: start;
  height: 20px;
  padding: 0 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  border: 1px solid rgba(148, 163, 184, 0.16);
  background: rgba(15, 23, 42, 0.28);
  color: rgba(226, 232, 240, 0.62);
}

.district-risk.is-low {
  border-color: rgba(34, 197, 94, 0.22);
  color: rgba(110, 231, 183, 0.9);
}

.district-risk.is-mid {
  border-color: rgba(245, 158, 11, 0.22);
  color: rgba(253, 230, 138, 0.92);
}

.district-risk.is-high {
  border-color: rgba(244, 63, 94, 0.26);
  color: rgba(253, 164, 175, 0.92);
}

.district-fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, rgba(56, 189, 248, 0.7), rgba(34, 197, 94, 0.55));
}

.panel-body {
  flex: 1;
  padding: 14px;
  overflow: auto;
}

.summary {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.summary-main {
  padding: 14px 14px 12px;
  border-radius: 18px;
  border: 1px solid rgba(148, 163, 184, 0.14);
  background: rgba(15, 23, 42, 0.32);
}

.summary-big {
  font-size: 34px;
  font-weight: 900;
  letter-spacing: -0.02em;
  color: rgba(255, 255, 255, 0.94);
  font-variant-numeric: tabular-nums;
}

.summary-big span {
  margin-left: 6px;
  font-size: 13px;
  font-weight: 700;
  color: rgba(226, 232, 240, 0.55);
}

.summary-label {
  margin-top: 6px;
  font-size: 12px;
  color: rgba(226, 232, 240, 0.55);
  letter-spacing: 0.08em;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.summary-card {
  padding: 12px 10px;
  border-radius: 16px;
  border: 1px solid rgba(148, 163, 184, 0.14);
  background: rgba(15, 23, 42, 0.26);
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: rgba(226, 232, 240, 0.62);
}

.summary-card strong {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.92);
  font-variant-numeric: tabular-nums;
}

.summary-card.warn strong {
  color: rgba(253, 164, 175, 0.92);
}

.summary-card.ok strong {
  color: rgba(110, 231, 183, 0.92);
}

.panel-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.risk-strip {
  display: grid;
  grid-template-columns: auto auto 1fr;
  gap: 10px;
  align-items: center;
  padding: 12px 14px;
  border-radius: 18px;
  border: 1px solid rgba(148, 163, 184, 0.14);
  background: rgba(15, 23, 42, 0.22);
}

.risk-label,
.risk-note {
  font-size: 12px;
  color: rgba(226, 232, 240, 0.55);
}

.risk-score {
  font-size: 18px;
  color: rgba(253, 164, 175, 0.92);
  font-variant-numeric: tabular-nums;
}

.risk-note {
  justify-self: end;
}

.action-btn {
  height: 40px;
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  background: rgba(15, 23, 42, 0.35);
  color: rgba(255, 255, 255, 0.88);
  cursor: pointer;
  font-weight: 700;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

.action-btn.danger {
  border-color: rgba(244, 63, 94, 0.26);
  background: rgba(244, 63, 94, 0.14);
}

.panel-foot {
  font-size: 12px;
  color: rgba(226, 232, 240, 0.45);
  letter-spacing: 0.02em;
}

.empty {
  padding: 14px 10px;
  border-radius: 18px;
  border: 1px dashed rgba(148, 163, 184, 0.18);
  background: rgba(15, 23, 42, 0.18);
  color: rgba(226, 232, 240, 0.6);
}

.empty-title {
  font-size: 14px;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.9);
}

.empty-desc {
  margin-top: 8px;
  font-size: 12px;
  line-height: 1.6;
  color: rgba(226, 232, 240, 0.5);
}

.tooltip {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 20;
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  background: rgba(2, 6, 23, 0.75);
  box-shadow: 0 22px 36px rgba(0, 0, 0, 0.45);
  pointer-events: none;
  min-width: 140px;
}

.tooltip-name {
  font-size: 13px;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.92);
  letter-spacing: 0.06em;
}

.tooltip-row {
  margin-top: 6px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  color: rgba(226, 232, 240, 0.6);
  font-size: 12px;
}

.tooltip-row strong {
  color: rgba(253, 230, 138, 0.92);
  font-variant-numeric: tabular-nums;
}

/* ===== 尊重用户动画偏好 ===== */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
</style>
