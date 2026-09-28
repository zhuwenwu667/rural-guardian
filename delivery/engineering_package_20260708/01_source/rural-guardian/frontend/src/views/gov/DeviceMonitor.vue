<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { CircleCheck, CircleClose, Warning, DataLine, Refresh, ArrowDown } from '@element-plus/icons-vue'
import {
  getRealtimeData,
  getAlertRules,
  updateAlertRule,
  getDeviceStatistics,
  sendDeviceCommand,
  getDeviceHistory,
} from '../../api/device-monitor'
import * as echarts from 'echarts'

// ===== 统计数据 =====
const stats = ref({
  totalDevices: 0,
  onlineCount: 0,
  offlineCount: 0,
  alertCount: 0,
  onlineRate: '0.0',
})

// ===== 实时数据 =====
const realtimeData = ref([])
let refreshTimer = null

// ===== 告警规则 =====
const alertRules = ref([])

// ===== 趋势图 =====
const trendDialogVisible = ref(false)
const trendDialogTitle = ref('')
const trendMetric = ref('heart_rate')
const trendChartRef = ref(null)
let trendChart = null
let currentTrendDeviceId = null

// ===== 数据加载 =====
async function fetchRealtimeData() {
  try {
    const res = await getRealtimeData()
    if (res.code === 200) {
      realtimeData.value = res.data || []
    }
  } catch (err) {
    console.error('获取实时数据失败', err)
  }
}

async function fetchStatistics() {
  try {
    const res = await getDeviceStatistics()
    if (res.code === 200) {
      stats.value = res.data || {}
    }
  } catch (err) {
    console.error('获取统计数据失败', err)
  }
}

async function fetchAlertRules() {
  try {
    const res = await getAlertRules()
    if (res.code === 200) {
      alertRules.value = res.data || []
    }
  } catch (err) {
    console.error('获取告警规则失败', err)
  }
}

// ===== 告警规则操作 =====
async function toggleRule(rule) {
  try {
    await updateAlertRule(rule.id, { enabled: rule.enabled })
    ElMessage.success(rule.enabled ? '规则已启用' : '规则已禁用')
  } catch (err) {
    rule.enabled = rule.enabled ? 0 : 1
    ElMessage.error('操作失败')
  }
}

async function saveRule(rule) {
  try {
    await updateAlertRule(rule.id, {
      name: rule.name,
      metric: rule.metric,
      condition: rule.condition,
      threshold: rule.threshold,
      level: rule.level,
      enabled: rule.enabled,
      description: rule.description,
    })
    ElMessage.success('规则已更新')
  } catch (err) {
    ElMessage.error('更新失败')
  }
}

// ===== 设备指令 =====
async function handleCommand(row, command) {
  const commandNames = {
    REBOOT: '重启设备',
    SYNC: '同步数据',
    LOCATE: '定位查询',
  }
  try {
    const res = await sendDeviceCommand(row.deviceId, command)
    if (res.code === 200) {
      ElMessage.success(`${commandNames[command]}: ${res.data.message}`)
      if (command === 'REBOOT' || command === 'SYNC') {
        fetchRealtimeData()
      }
    } else {
      ElMessage.error(res.message || '指令发送失败')
    }
  } catch (err) {
    ElMessage.error('指令发送失败')
  }
}

// ===== 趋势图 =====
function showTrend(row) {
  currentTrendDeviceId = row.deviceId
  trendDialogTitle.value = `${row.elderlyName} - ${row.deviceSn} 数据趋势`
  trendMetric.value = 'heart_rate'
  trendDialogVisible.value = true
  nextTick(() => {
    loadTrendData()
  })
}

async function loadTrendData() {
  if (!currentTrendDeviceId) return
  try {
    const res = await getDeviceHistory(currentTrendDeviceId, 30)
    if (res.code === 200) {
      renderTrendChart(res.data || [])
    }
  } catch (err) {
    console.error('获取历史数据失败', err)
  }
}

function renderTrendChart(historyData) {
  if (!trendChartRef.value) return

  if (!trendChart) {
    trendChart = echarts.init(trendChartRef.value)
  }

  const metricFieldMap = {
    heart_rate: 'heart_rate',
    blood_pressure_systolic: 'blood_pressure_systolic',
    blood_oxygen: 'blood_oxygen',
    temperature: 'temperature',
    battery: 'battery',
  }

  const metricNameMap = {
    heart_rate: '心率 (bpm)',
    blood_pressure_systolic: '收缩压 (mmHg)',
    blood_oxygen: '血氧 (%)',
    temperature: '体温 (°C)',
    battery: '电量 (%)',
  }

  const field = metricFieldMap[trendMetric.value]
  const metricName = metricNameMap[trendMetric.value]

  const times = historyData.map(d => {
    const t = new Date(d.recorded_at)
    return `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}:${String(t.getSeconds()).padStart(2, '0')}`
  })
  const values = historyData.map(d => d[field])

  const option = {
    tooltip: {
      trigger: 'axis',
      formatter: `{b}<br/>${metricName}: {c}`,
      textStyle: { fontSize: 12 },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '15%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: times,
      boundaryGap: false,
      axisLabel: {
        fontSize: 11,
        rotate: 30,
      },
    },
    yAxis: {
      type: 'value',
      name: metricName,
      axisLabel: {
        fontSize: 11,
      },
    },
    series: [
      {
        name: metricName,
        type: 'line',
        data: values,
        smooth: true,
        symbol: 'circle',
        symbolSize: 4,
        lineStyle: {
          width: 2,
          color: '#1677ff',
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(22, 119, 255, 0.3)' },
            { offset: 1, color: 'rgba(22, 119, 255, 0.02)' },
          ]),
        },
        itemStyle: {
          color: '#1677ff',
        },
      },
    ],
  }

  trendChart.setOption(option, true)
}

// ===== 样式辅助方法 =====
function getHeartRateClass(val) {
  if (val > 100 || val < 50) return 'value-danger'
  if (val > 90 || val < 60) return 'value-warning'
  return 'value-normal'
}

function getBpClass(systolic) {
  if (systolic > 140) return 'value-danger'
  if (systolic > 130) return 'value-warning'
  return 'value-normal'
}

function getBloodOxygenClass(val) {
  if (val < 90) return 'value-danger'
  if (val < 95) return 'value-warning'
  return 'value-normal'
}

function getTemperatureClass(val) {
  if (val > 37.5) return 'value-danger'
  if (val > 37.0) return 'value-warning'
  return 'value-normal'
}

function getBatteryClass(val) {
  if (val < 10) return 'value-danger'
  if (val < 20) return 'value-warning'
  return 'value-normal'
}

function getLevelType(level) {
  const map = { P0: 'danger', P1: 'warning', P2: 'info' }
  return map[level] || 'info'
}

function getMetricLabel(metric) {
  const map = {
    heart_rate: '心率',
    blood_oxygen: '血氧',
    temperature: '体温',
    battery: '电量',
    fall: '跌倒',
    offline: '离线',
    blood_pressure_systolic: '收缩压',
    blood_pressure_diastolic: '舒张压',
  }
  return map[metric] || metric
}

function getConditionLabel(condition) {
  const map = { gt: '>', lt: '<', eq: '=', gte: '>=', lte: '<=' }
  return map[condition] || condition
}

function getStep(metric) {
  if (metric === 'temperature') return 0.1
  if (metric === 'blood_oxygen') return 0.5
  return 1
}

// ===== 生命周期 =====
onMounted(() => {
  fetchRealtimeData()
  fetchStatistics()
  fetchAlertRules()

  // 每5秒自动刷新实时数据
  refreshTimer = setInterval(() => {
    fetchRealtimeData()
    fetchStatistics()
  }, 5000)
})

onUnmounted(() => {
  if (refreshTimer) clearInterval(refreshTimer)
  if (trendChart) {
    trendChart.dispose()
    trendChart = null
  }
})
</script>

<template>
  <div class="device-monitor">
    <!-- 顶部统计卡片 -->
    <div class="stat-row">
      <div
        class="stat-card-item"
        style="border-top-color: #52c41a"
      >
        <div class="stat-card-body">
          <div class="stat-info">
            <div class="stat-title">
              在线设备
            </div>
            <div
              class="stat-value"
              style="color: #52c41a"
            >
              {{ stats.onlineCount }}
            </div>
          </div>
          <div
            class="stat-icon"
            style="background-color: rgba(82, 196, 26, 0.1)"
          >
            <el-icon
              :size="28"
              style="color: #52c41a"
            >
              <CircleCheck />
            </el-icon>
          </div>
        </div>
      </div>
      <div
        class="stat-card-item"
        style="border-top-color: #ff4d4f"
      >
        <div class="stat-card-body">
          <div class="stat-info">
            <div class="stat-title">
              离线设备
            </div>
            <div
              class="stat-value"
              style="color: #ff4d4f"
            >
              {{ stats.offlineCount }}
            </div>
          </div>
          <div
            class="stat-icon"
            style="background-color: rgba(255, 77, 79, 0.1)"
          >
            <el-icon
              :size="28"
              style="color: #ff4d4f"
            >
              <CircleClose />
            </el-icon>
          </div>
        </div>
      </div>
      <div
        class="stat-card-item"
        style="border-top-color: #faad14"
      >
        <div class="stat-card-body">
          <div class="stat-info">
            <div class="stat-title">
              待处理告警
            </div>
            <div
              class="stat-value"
              style="color: #faad14"
            >
              {{ stats.alertCount }}
            </div>
          </div>
          <div
            class="stat-icon"
            style="background-color: rgba(250, 173, 20, 0.1)"
          >
            <el-icon
              :size="28"
              style="color: #faad14"
            >
              <Warning />
            </el-icon>
          </div>
        </div>
      </div>
      <div
        class="stat-card-item"
        style="border-top-color: #1677ff"
      >
        <div class="stat-card-body">
          <div class="stat-info">
            <div class="stat-title">
              在线率
            </div>
            <div
              class="stat-value"
              style="color: #1677ff"
            >
              {{ stats.onlineRate }}%
            </div>
          </div>
          <div
            class="stat-icon"
            style="background-color: rgba(22, 119, 255, 0.1)"
          >
            <el-icon
              :size="28"
              style="color: #1677ff"
            >
              <DataLine />
            </el-icon>
          </div>
        </div>
      </div>
    </div>

    <!-- 主内容区域 -->
    <div class="main-content">
      <!-- 左侧：设备实时数据表格 -->
      <div class="left-panel">
        <div class="panel-card">
          <div class="panel-header">
            <span class="panel-title">设备实时数据</span>
            <div class="panel-actions">
              <el-tag
                type="success"
                effect="light"
                size="small"
              >
                每5秒自动刷新
              </el-tag>
              <el-button
                type="primary"
                size="small"
                @click="fetchRealtimeData"
              >
                <el-icon><Refresh /></el-icon> 刷新
              </el-button>
            </div>
          </div>
          <el-table
            :data="realtimeData"
            stripe
            style="width: 100%"
            :header-cell-style="{ background: '#fafafa', color: '#333', fontWeight: 600 }"
            size="small"
          >
            <el-table-column
              prop="elderlyName"
              label="老人"
              width="80"
            />
            <el-table-column
              prop="deviceSn"
              label="设备编号"
              width="130"
            />
            <el-table-column
              label="状态"
              width="70"
              align="center"
            >
              <template #default="{ row }">
                <el-tag
                  :type="row.status === 'ONLINE' ? 'success' : 'danger'"
                  size="small"
                  effect="dark"
                >
                  {{ row.status === 'ONLINE' ? '在线' : '离线' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column
              label="心率"
              width="70"
              align="center"
            >
              <template #default="{ row }">
                <span :class="getHeartRateClass(row.heartRate)">{{ row.heartRate }}</span>
              </template>
            </el-table-column>
            <el-table-column
              label="血压"
              width="90"
              align="center"
            >
              <template #default="{ row }">
                <span :class="getBpClass(row.bloodPressureSystolic)">
                  {{ row.bloodPressureSystolic }}/{{ row.bloodPressureDiastolic }}
                </span>
              </template>
            </el-table-column>
            <el-table-column
              label="血氧"
              width="65"
              align="center"
            >
              <template #default="{ row }">
                <span :class="getBloodOxygenClass(row.bloodOxygen)">{{ row.bloodOxygen }}%</span>
              </template>
            </el-table-column>
            <el-table-column
              label="体温"
              width="65"
              align="center"
            >
              <template #default="{ row }">
                <span :class="getTemperatureClass(row.temperature)">{{ row.temperature }}</span>
              </template>
            </el-table-column>
            <el-table-column
              label="步数"
              width="70"
              align="center"
            >
              <template #default="{ row }">
                {{ row.steps }}
              </template>
            </el-table-column>
            <el-table-column
              label="电量"
              width="70"
              align="center"
            >
              <template #default="{ row }">
                <span :class="getBatteryClass(row.battery)">{{ row.battery }}%</span>
              </template>
            </el-table-column>
            <el-table-column
              label="操作"
              width="100"
              align="center"
              fixed="right"
            >
              <template #default="{ row }">
                <el-button
                  type="primary"
                  link
                  size="small"
                  @click="showTrend(row)"
                >
                  趋势
                </el-button>
                <el-dropdown
                  trigger="click"
                  @command="(cmd) => handleCommand(row, cmd)"
                >
                  <el-button
                    type="primary"
                    link
                    size="small"
                  >
                    指令<el-icon class="el-icon--right">
                      <ArrowDown />
                    </el-icon>
                  </el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item command="REBOOT">
                        重启设备
                      </el-dropdown-item>
                      <el-dropdown-item command="SYNC">
                        同步数据
                      </el-dropdown-item>
                      <el-dropdown-item command="LOCATE">
                        定位查询
                      </el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>

      <!-- 右侧：告警规则配置 -->
      <div class="right-panel">
        <div class="panel-card">
          <div class="panel-header">
            <span class="panel-title">告警规则配置</span>
          </div>
          <div class="rules-list">
            <div
              v-for="rule in alertRules"
              :key="rule.id"
              class="rule-item"
            >
              <div class="rule-header">
                <div class="rule-name">
                  <el-tag
                    :type="getLevelType(rule.level)"
                    size="small"
                    effect="dark"
                  >
                    {{ rule.level }}
                  </el-tag>
                  <span>{{ rule.name }}</span>
                </div>
                <el-switch
                  v-model="rule.enabled"
                  :active-value="1"
                  :inactive-value="0"
                  size="small"
                  @change="toggleRule(rule)"
                />
              </div>
              <div class="rule-detail">
                <span class="rule-metric">{{ getMetricLabel(rule.metric) }}</span>
                <span class="rule-condition">{{ getConditionLabel(rule.condition) }}</span>
                <el-input-number
                  v-model="rule.threshold"
                  :min="0"
                  :max="999"
                  :step="getStep(rule.metric)"
                  size="small"
                  style="width: 100px"
                  :disabled="!rule.enabled"
                />
                <el-button
                  type="primary"
                  size="small"
                  :disabled="!rule.enabled"
                  @click="saveRule(rule)"
                >
                  保存
                </el-button>
              </div>
              <div class="rule-desc">
                {{ rule.description }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 趋势图弹窗 -->
    <el-dialog
      v-model="trendDialogVisible"
      :title="trendDialogTitle"
      width="800px"
      destroy-on-close
    >
      <div class="trend-metrics">
        <el-radio-group
          v-model="trendMetric"
          size="small"
          @change="loadTrendData"
        >
          <el-radio-button value="heart_rate">
            心率
          </el-radio-button>
          <el-radio-button value="blood_pressure_systolic">
            收缩压
          </el-radio-button>
          <el-radio-button value="blood_oxygen">
            血氧
          </el-radio-button>
          <el-radio-button value="temperature">
            体温
          </el-radio-button>
          <el-radio-button value="battery">
            电量
          </el-radio-button>
        </el-radio-group>
      </div>
      <div
        ref="trendChartRef"
        style="width: 100%; height: 350px; margin-top: 16px"
      />
    </el-dialog>
  </div>
</template>

<style scoped>
.device-monitor {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* ===== 统计卡片行 ===== */
.stat-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.stat-card-item {
  background: #ffffff;
  border: 1px solid #e4e7ed;
  border-top: 3px solid #409EFF;
  border-radius: 4px;
  padding: 16px 20px;
  transition: box-shadow 0.2s;
}

.stat-card-item:hover {
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.stat-card-body {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.stat-info {
  flex: 1;
}

.stat-title {
  font-size: 13px;
  color: #909399;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  line-height: 1.2;
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

/* ===== 主内容区 ===== */
.main-content {
  display: grid;
  grid-template-columns: 1fr 360px;
  gap: 20px;
}

/* ===== 面板卡片 ===== */
.panel-card {
  background: #ffffff;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
}

.panel-title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}

.panel-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* ===== 值样式 ===== */
.value-normal {
  color: #303133;
  font-weight: 500;
}

.value-warning {
  color: #e6a23c;
  font-weight: 600;
}

.value-danger {
  color: #f56c6c;
  font-weight: 600;
}

/* ===== 告警规则列表 ===== */
.rules-list {
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 500px;
  overflow-y: auto;
}

.rule-item {
  border: 1px solid #ebeef5;
  border-radius: 6px;
  padding: 12px;
  transition: border-color 0.2s;
}

.rule-item:hover {
  border-color: #d9d9d9;
}

.rule-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.rule-name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #303133;
}

.rule-detail {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.rule-metric {
  font-size: 12px;
  color: #606266;
  background: #f5f7fa;
  padding: 2px 8px;
  border-radius: 4px;
  white-space: nowrap;
}

.rule-condition {
  font-size: 14px;
  font-weight: 600;
  color: #1677ff;
}

.rule-desc {
  font-size: 12px;
  color: #909399;
  line-height: 1.4;
}

/* ===== 趋势图 ===== */
.trend-metrics {
  display: flex;
  justify-content: center;
}

/* ===== 响应式 ===== */
@media (max-width: 1200px) {
  .main-content {
    grid-template-columns: 1fr;
  }

  .stat-row {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
