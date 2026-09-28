<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { View, Hide, Location, ArrowLeft, Plus, Edit, Delete } from '@element-plus/icons-vue'
import { getConfigs, updateConfig } from '../../api/config'
import { testServiceConnection, getFences, createFence, updateFence, deleteFence } from '../../api/service'
import { getVillageList } from '../../api/village'
import { getDeviceList } from '../../api/device'

// ---- 状态 ----
const saving = ref(false)
const testing = ref(false)

// ---- 密码显示/隐藏控制 ----
const showPasswords = reactive({
  apiKey: false,
  apiSecret: false,
})

// ---- 配置表单 ----
const form = reactive({
  map_enabled: false,
  map_provider: 'amap',
  map_api_key: '',
  map_api_secret: '',
  map_geo_fence_radius: 500,
  map_tracking_interval: 300,
  map_power_saving: false,
  map_fence_check_freq: 30,
})

const providerLabel = computed(() => {
  const map = { amap: '高德', baidu: '百度' }
  return map[form.map_provider] || '地图'
})

// ---- 配置项键名列表 ----
const configKeys = [
  'map_enabled',
  'map_provider',
  'map_api_key',
  'map_api_secret',
  'map_geo_fence_radius',
  'map_tracking_interval',
  'map_power_saving',
  'map_fence_check_freq',
]

// ---- 电子围栏 ----
const fenceList = ref([])
const fenceLoading = ref(false)
const fenceSaving = ref(false)
const fenceDialogVisible = ref(false)
const villageOptions = ref([])

const fenceForm = reactive({
  id: null,
  name: '',
  longitude: null,
  latitude: null,
  radius: 500,
  village_id: null,
  status: true,
})

// ---- 设备统计 & 地图 ----
const onlineCount = ref(0)
const offlineCount = ref(0)
const mapLoadError = ref(false)
let mapInstance = null
let markers = []

async function loadDeviceLocations() {
  try {
    const res = await getDeviceList({ pageSize: 100 })
    if (res.code === 200) {
      const devices = res.data.list || []
      onlineCount.value = devices.filter(d => d.status === 'ONLINE').length
      offlineCount.value = devices.filter(d => d.status !== 'ONLINE').length
      addDeviceMarkers(devices)
    }
  } catch (err) {
    console.error('加载设备位置失败', err)
  }
}

function initMap() {
  mapLoadError.value = false
  const mapKey = form.map_api_key
  if (!mapKey) {
    mapLoadError.value = true
    return
  }

  // Dynamically load Amap SDK
  if (!window.AMap) {
    const script = document.createElement('script')
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${mapKey}`
    script.onerror = () => { mapLoadError.value = true }
    script.onload = () => {
      setTimeout(() => createMap(), 500)
    }
    document.head.appendChild(script)
  } else {
    createMap()
  }
}

function createMap() {
  const container = document.getElementById('amap-container')
  if (!container || !window.AMap) { mapLoadError.value = true; return }

  mapInstance = new window.AMap.Map('amap-container', {
    zoom: 12,
    center: [116.397428, 39.90923], // Default: Beijing
    mapStyle: 'amap://styles/normal',
  })

  loadDeviceLocations()
}

function addDeviceMarkers(devices) {
  if (!mapInstance || !window.AMap) return

  // Clear existing markers
  markers.forEach(m => mapInstance.remove(m))
  markers = []

  // Default center coordinates for demo (since real devices don't have GPS data yet)
  const defaultLocations = [
    [116.397428, 39.90923], [116.410428, 39.91523], [116.385428, 39.90523],
    [116.400428, 39.91223], [116.395428, 39.90823], [116.405428, 39.91023],
    [116.390428, 39.90723], [116.398428, 39.91123], [116.402428, 39.90623],
    [116.393428, 39.91323],
  ]

  devices.forEach((device, index) => {
    const pos = defaultLocations[index % defaultLocations.length]
    const isOnline = device.status === 'ONLINE'

    const marker = new window.AMap.Marker({
      position: pos,
      title: device.device_sn || '设备',
      content: `<div style="text-align:center;cursor:pointer;">
        <div style="width:32px;height:32px;border-radius:50%;background:${isOnline ? '#10b981' : '#94a3b8'};display:flex;align-items:center;justify-content:center;margin:0 auto;">
          <span style="color:#fff;font-size:14px;">${isOnline ? '🟢' : '⚪'}</span>
        </div>
        <div style="font-size:11px;color:#333;margin-top:2px;white-space:nowrap;">${device.device_sn || '设备'}</div>
      </div>`,
    })

    marker.on('click', () => {
      const infoWindow = new window.AMap.InfoWindow({
        content: `<div style="padding:8px;">
          <div style="font-weight:600;margin-bottom:4px;">设备: ${device.device_sn || '-'}</div>
          <div>类型: ${device.type || '-'}</div>
          <div>状态: ${isOnline ? '在线' : '离线'}</div>
          <div>电量: ${device.battery_level || '-'}%</div>
          <div>最后心跳: ${device.last_heartbeat || '-'}</div>
        </div>`,
        offset: new window.AMap.Pixel(0, -20),
      })
      infoWindow.open(mapInstance, pos)
    })

    mapInstance.add(marker)
    markers.push(marker)
  })

  // Auto-fit bounds if markers exist
  if (markers.length > 0) {
    mapInstance.setFitView(markers)
  }
}

// ---- 加载配置 ----
async function loadConfigs() {
  try {
    const res = await getConfigs()
    if (res.code === 200 && res.data) {
      const configs = Array.isArray(res.data) ? res.data : []
      configs.forEach((item) => {
        const key = item.config_key || item.key
        const value = item.config_value !== undefined ? item.config_value : item.value
        if (key && key in form) {
          if (value === 'true' || value === true) {
            form[key] = true
          } else if (value === 'false' || value === false) {
            form[key] = false
          } else if (!isNaN(value) && value !== '' && value !== null) {
            form[key] = Number(value)
          } else {
            form[key] = value
          }
        }
      })
    }
  } catch (err) {
    console.error('加载配置失败:', err)
  }
}

// ---- 切换启用/禁用开关 ----
async function onSwitchChange() {
  try {
    await updateConfig('map_enabled', form.map_enabled)
    ElMessage.success(form.map_enabled ? '地图服务已启用' : '地图服务已禁用')
  } catch (err) {
    console.error(err)
    ElMessage.error('操作失败')
  }
}

// ---- 保存配置 ----
async function saveConfig() {
  saving.value = true
  try {
    let successCount = 0
    for (const key of configKeys) {
      try {
        await updateConfig(key, form[key])
        successCount++
      } catch (err) {
        console.error(`保存 ${key} 失败:`, err)
      }
    }
    if (successCount === configKeys.length) {
      ElMessage.success('配置保存成功')
    } else {
      ElMessage.warning(`已保存 ${successCount}/${configKeys.length} 项配置`)
    }
  } catch (err) {
    ElMessage.error('保存配置失败')
  } finally {
    saving.value = false
  }
}

// ---- 测试连接 ----
async function testConnection() {
  testing.value = true
  try {
    const res = await testServiceConnection('map')
    if (res.code === 200) {
      ElMessage.success('连接测试成功')
    } else {
      ElMessage.error(res.message || '连接测试失败')
    }
  } catch (err) {
    ElMessage.error('连接测试失败，请检查配置')
  } finally {
    testing.value = false
  }
}

// ---- 加载围栏列表 ----
async function loadFences() {
  fenceLoading.value = true
  try {
    const res = await getFences()
    if (res.code === 200) {
      fenceList.value = Array.isArray(res.data) ? res.data : res.data?.list || []
    }
  } catch (err) {
    console.error('加载围栏列表失败:', err)
  } finally {
    fenceLoading.value = false
  }
}

// ---- 加载村庄列表 ----
async function loadVillages() {
  try {
    const res = await getVillageList()
    if (res.code === 200) {
      villageOptions.value = Array.isArray(res.data) ? res.data : res.data?.list || []
    }
  } catch (err) {
    console.error('加载村庄列表失败:', err)
  }
}

// ---- 获取村庄名称 ----
function getVillageName(villageId) {
  const village = villageOptions.value.find((v) => v.id === villageId)
  return village ? village.name : '-'
}

// ---- 打开围栏弹窗 ----
function openFenceDialog(row) {
  if (row && row.id) {
    // 编辑模式
    fenceForm.id = row.id
    fenceForm.name = row.name
    fenceForm.longitude = row.longitude
    fenceForm.latitude = row.latitude
    fenceForm.radius = row.radius
    fenceForm.village_id = row.village_id
    fenceForm.status = row.status
  } else {
    // 新增模式
    fenceForm.id = null
    fenceForm.name = ''
    fenceForm.longitude = null
    fenceForm.latitude = null
    fenceForm.radius = 500
    fenceForm.village_id = null
    fenceForm.status = true
  }
  fenceDialogVisible.value = true
}

// ---- 保存围栏 ----
async function handleSaveFence() {
  if (!fenceForm.name.trim()) {
    ElMessage.warning('请输入围栏名称')
    return
  }
  if (fenceForm.longitude === null || fenceForm.latitude === null) {
    ElMessage.warning('请输入经纬度坐标')
    return
  }
  if (!fenceForm.village_id) {
    ElMessage.warning('请选择所属村庄')
    return
  }

  fenceSaving.value = true
  try {
    const data = {
      name: fenceForm.name,
      longitude: fenceForm.longitude,
      latitude: fenceForm.latitude,
      radius: fenceForm.radius,
      village_id: fenceForm.village_id,
      status: fenceForm.status,
    }
    let res
    if (fenceForm.id) {
      res = await updateFence(fenceForm.id, data)
    } else {
      res = await createFence(data)
    }
    if (res.code === 200) {
      ElMessage.success(fenceForm.id ? '围栏更新成功' : '围栏添加成功')
      fenceDialogVisible.value = false
      loadFences()
    } else {
      ElMessage.error(res.message || '操作失败')
    }
  } catch (err) {
    ElMessage.error('操作失败，请重试')
  } finally {
    fenceSaving.value = false
  }
}

// ---- 删除围栏 ----
async function handleDeleteFence(row) {
  try {
    await ElMessageBox.confirm(
      `确定要删除围栏「${row.name}」吗？删除后不可恢复。`,
      '删除确认',
      { type: 'warning', confirmButtonText: '确定删除', cancelButtonText: '取消' }
    )
    const res = await deleteFence(row.id)
    if (res.code === 200) {
      ElMessage.success('围栏删除成功')
      loadFences()
    } else {
      ElMessage.error(res.message || '删除失败')
    }
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

// ---- 生命周期 ----
onMounted(async () => {
  await loadConfigs()
  nextTick(() => initMap())
  loadFences()
  loadVillages()
})

onBeforeUnmount(() => {
  if (mapInstance) { mapInstance.destroy(); mapInstance = null }
})
</script>

<template>
  <div class="page-container map-service-page">
    <!-- 返回按钮与页面标题 -->
    <div class="page-header">
      <div class="header-left">
        <el-button
          text
          @click="$router.push('/gov/service-center')"
        >
          <el-icon><ArrowLeft /></el-icon>
          <span>返回服务中心</span>
        </el-button>
        <h2>地图服务管理</h2>
        <p class="page-subtitle">
          高德/百度地图定位与电子围栏服务配置
        </p>
      </div>
    </div>

    <!-- 状态卡片 -->
    <div class="status-card">
      <div class="status-card-left">
        <el-icon
          :size="36"
          color="#fff"
        >
          <Location />
        </el-icon>
        <div>
          <div class="status-card-title">
            {{ providerLabel }}地图服务
          </div>
          <div class="status-card-desc">
            地图定位与电子围栏服务，用于老人位置追踪与安全防护
          </div>
        </div>
      </div>
      <div class="status-card-right">
        <span class="status-text">{{ form.map_enabled ? '已启用' : '未启用' }}</span>
        <el-switch
          v-model="form.map_enabled"
          @change="onSwitchChange"
        />
      </div>
    </div>

    <!-- 基础配置 -->
    <el-card
      shadow="never"
      class="config-card"
    >
      <template #header>
        <div class="card-header">
          <span class="card-title">基础配置</span>
          <span class="card-desc">地图服务商凭证配置</span>
        </div>
      </template>
      <el-form
        :model="form"
        label-width="120px"
        class="config-form"
      >
        <el-form-item label="地图服务商">
          <el-select
            v-model="form.map_provider"
            placeholder="请选择地图服务商"
            style="width: 100%"
          >
            <el-option
              label="高德地图"
              value="amap"
            />
            <el-option
              label="百度地图"
              value="baidu"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="API Key">
          <el-input
            v-model="form.map_api_key"
            :type="showPasswords.apiKey ? 'text' : 'password'"
            placeholder="请输入 API Key"
          >
            <template #suffix>
              <el-icon
                class="password-toggle"
                @click="showPasswords.apiKey = !showPasswords.apiKey"
              >
                <View v-if="showPasswords.apiKey" />
                <Hide v-else />
              </el-icon>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item label="API Secret">
          <el-input
            v-model="form.map_api_secret"
            :type="showPasswords.apiSecret ? 'text' : 'password'"
            placeholder="请输入 API Secret"
          >
            <template #suffix>
              <el-icon
                class="password-toggle"
                @click="showPasswords.apiSecret = !showPasswords.apiSecret"
              >
                <View v-if="showPasswords.apiSecret" />
                <Hide v-else />
              </el-icon>
            </template>
          </el-input>
        </el-form-item>
      </el-form>
      <div class="action-bar">
        <el-button
          type="primary"
          :loading="saving"
          @click="saveConfig"
        >
          保存配置
        </el-button>
        <el-button
          type="success"
          :loading="testing"
          @click="testConnection"
        >
          测试连接
        </el-button>
      </div>
    </el-card>

    <!-- 电子围栏管理 -->
    <el-card
      shadow="never"
      class="config-card"
    >
      <template #header>
        <div class="card-header">
          <div class="card-header-info">
            <span class="card-title">电子围栏管理</span>
            <span class="card-desc">管理老人安全活动区域</span>
          </div>
          <el-button
            type="primary"
            size="small"
            @click="openFenceDialog()"
          >
            <el-icon><Plus /></el-icon>
            <span>添加围栏</span>
          </el-button>
        </div>
      </template>
      <el-table
        v-loading="fenceLoading"
        :data="fenceList"
        stripe
        style="width: 100%"
        empty-text="暂无围栏数据"
      >
        <el-table-column
          prop="name"
          label="围栏名称"
          min-width="120"
        />
        <el-table-column
          label="坐标 (lng,lat)"
          min-width="180"
        >
          <template #default="{ row }">
            {{ row.longitude }}, {{ row.latitude }}
          </template>
        </el-table-column>
        <el-table-column
          prop="radius"
          label="半径(m)"
          width="100"
        />
        <el-table-column
          label="所属村庄"
          min-width="120"
        >
          <template #default="{ row }">
            {{ getVillageName(row.village_id) }}
          </template>
        </el-table-column>
        <el-table-column
          label="状态"
          width="80"
          align="center"
        >
          <template #default="{ row }">
            <el-tag
              :type="row.status ? 'success' : 'info'"
              size="small"
            >
              {{ row.status ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          label="操作"
          width="140"
          align="center"
        >
          <template #default="{ row }">
            <el-button
              type="primary"
              text
              size="small"
              @click="openFenceDialog(row)"
            >
              <el-icon><Edit /></el-icon>
              编辑
            </el-button>
            <el-button
              type="danger"
              text
              size="small"
              @click="handleDeleteFence(row)"
            >
              <el-icon><Delete /></el-icon>
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 围栏编辑弹窗 -->
    <el-dialog
      v-model="fenceDialogVisible"
      :title="fenceForm.id ? '编辑围栏' : '添加围栏'"
      width="520px"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <el-form
        :model="fenceForm"
        label-width="100px"
        class="config-form"
      >
        <el-form-item label="围栏名称">
          <el-input
            v-model="fenceForm.name"
            placeholder="请输入围栏名称"
          />
        </el-form-item>
        <el-form-item label="经度">
          <el-input-number
            v-model="fenceForm.longitude"
            :precision="6"
            :step="0.0001"
            :min="-180"
            :max="180"
            controls-position="right"
            style="width: 100%"
            placeholder="请输入经度"
          />
        </el-form-item>
        <el-form-item label="纬度">
          <el-input-number
            v-model="fenceForm.latitude"
            :precision="6"
            :step="0.0001"
            :min="-90"
            :max="90"
            controls-position="right"
            style="width: 100%"
            placeholder="请输入纬度"
          />
        </el-form-item>
        <el-form-item label="半径 (米)">
          <el-input-number
            v-model="fenceForm.radius"
            :min="50"
            :max="50000"
            :step="100"
            controls-position="right"
            style="width: 100%"
            placeholder="请输入围栏半径"
          />
        </el-form-item>
        <el-form-item label="所属村庄">
          <el-select
            v-model="fenceForm.village_id"
            placeholder="请选择所属村庄"
            style="width: 100%"
          >
            <el-option
              v-for="item in villageOptions"
              :key="item.id"
              :label="item.name"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-switch
            v-model="fenceForm.status"
            active-text="启用"
            inactive-text="禁用"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="fenceDialogVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="fenceSaving"
          @click="handleSaveFence"
        >
          确定
        </el-button>
      </template>
    </el-dialog>

    <!-- 定位策略 -->
    <el-card
      shadow="never"
      class="config-card"
    >
      <template #header>
        <div class="card-header">
          <span class="card-title">定位策略</span>
          <span class="card-desc">设备上报频率与功耗配置</span>
        </div>
      </template>
      <el-form
        :model="form"
        label-width="140px"
        class="config-form"
      >
        <el-form-item label="上报间隔">
          <el-select
            v-model="form.map_tracking_interval"
            placeholder="请选择上报间隔"
            style="width: 100%"
          >
            <el-option
              label="60 秒（高频）"
              :value="60"
            />
            <el-option
              label="120 秒（中频）"
              :value="120"
            />
            <el-option
              label="300 秒（低频）"
              :value="300"
            />
            <el-option
              label="600 秒（超低频）"
              :value="600"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="省电模式">
          <el-switch
            v-model="form.map_power_saving"
            active-text="开启"
            inactive-text="关闭"
          />
        </el-form-item>
        <el-form-item label="围栏检测频率">
          <el-select
            v-model="form.map_fence_check_freq"
            placeholder="请选择围栏检测频率"
            style="width: 100%"
          >
            <el-option
              label="10 秒"
              :value="10"
            />
            <el-option
              label="30 秒"
              :value="30"
            />
            <el-option
              label="60 秒"
              :value="60"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <div class="action-bar">
        <el-button
          type="primary"
          :loading="saving"
          @click="saveConfig"
        >
          保存配置
        </el-button>
      </div>
    </el-card>

    <!-- 设备定位预览 -->
    <div class="map-preview-card">
      <el-card shadow="never">
        <template #header>
          <div class="card-header">
            <span class="card-title">设备位置预览</span>
            <div class="device-stats">
              <el-tag
                type="success"
                size="small"
              >
                在线: {{ onlineCount }}
              </el-tag>
              <el-tag
                type="info"
                size="small"
              >
                离线: {{ offlineCount }}
              </el-tag>
            </div>
          </div>
        </template>
        <div
          id="amap-container"
          style="width: 100%; height: 400px; border-radius: 8px;"
        />
        <div
          v-if="mapLoadError"
          class="map-error"
        >
          <el-empty description="地图加载失败，请检查API Key配置">
            <el-button
              type="primary"
              @click="initMap"
            >
              重新加载
            </el-button>
          </el-empty>
        </div>
      </el-card>
    </div>
  </div>
</template>

<style scoped>
.map-service-page {
  max-width: 960px;
}

/* 页面头部 */
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.header-left h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--text);
}

.page-subtitle {
  font-size: 13px;
  color: var(--text-muted);
  margin: 0;
}

/* 状态卡片 */
.status-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-radius: 12px;
  margin-bottom: 20px;
  color: #fff;
  background: linear-gradient(135deg, #10b981, #059669);
}

.status-card-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.status-card-title {
  font-size: 16px;
  font-weight: 600;
}

.status-card-desc {
  font-size: 12px;
  opacity: 0.8;
  margin-top: 4px;
}

.status-card-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.status-text {
  font-size: 13px;
  opacity: 0.9;
}

.status-card :deep(.el-switch) {
  --el-switch-on-color: rgba(255, 255, 255, 0.9);
  --el-switch-off-color: rgba(255, 255, 255, 0.3);
}

/* 配置卡片 */
.config-card {
  margin-bottom: 20px;
  border-radius: 12px;
  border: 1px solid var(--border);
}

.config-card :deep(.el-card__header) {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
}

.config-card :deep(.el-card__body) {
  padding: 20px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.card-header-info {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.card-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
}

.card-desc {
  font-size: 12px;
  color: var(--text-muted);
}

/* 表单 */
.config-form {
  max-width: 600px;
}

.config-form .el-form-item {
  margin-bottom: 18px;
}

/* 密码切换图标 */
.password-toggle {
  cursor: pointer;
  color: var(--text-muted);
  transition: color 0.2s;
}

.password-toggle:hover {
  color: var(--primary);
}

/* 操作栏 */
.action-bar {
  display: flex;
  gap: 12px;
  padding-top: 8px;
  padding-left: 120px;
}

/* 地图预览区域 */
.map-preview {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.map-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 320px;
  background: var(--bg-secondary, #f5f7fa);
  border-radius: 8px;
  border: 2px dashed var(--border, #dcdfe6);
  color: var(--text-muted);
}

.map-placeholder p {
  margin: 12px 0 4px;
  font-size: 16px;
  font-weight: 500;
  color: var(--text-secondary, #606266);
}

.map-note {
  font-size: 12px;
  color: var(--text-muted, #909399);
}

/* 设备统计 */
.device-stats {
  display: flex;
  gap: 24px;
  justify-content: center;
}

.device-stat-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: var(--bg-secondary, #f5f7fa);
  border-radius: 8px;
}

.stat-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.online-dot {
  background: #10b981;
}

.offline-dot {
  background: #909399;
}

.stat-label {
  font-size: 13px;
  color: var(--text-secondary, #606266);
}

.stat-value {
  font-size: 16px;
  font-weight: 600;
  color: var(--text, #303133);
}

/* Select 暗色覆盖 */
.config-form :deep(.el-select .el-input__wrapper) {
  background-color: var(--bg-secondary, #fff);
}

/* 地图预览卡片 */
.map-preview-card {
  margin-top: 20px;
}

.map-preview-card :deep(.el-card) {
  border-radius: 12px;
  border: 1px solid var(--border);
}

.map-preview-card :deep(.el-card__header) {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
}

.map-preview-card :deep(.el-card__body) {
  padding: 20px;
}

.map-error {
  padding: 20px;
  text-align: center;
}
</style>
