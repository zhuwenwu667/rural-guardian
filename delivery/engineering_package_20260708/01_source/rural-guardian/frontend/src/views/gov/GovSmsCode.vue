<script setup>
import { ref, reactive, onMounted, onUnmounted, nextTick } from 'vue'
import { ArrowLeft, Search, Refresh, ChatDotSquare, CircleCheck, Clock } from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import { getSmsLogs, getSmsStats } from '../../api/service'

// ==================== 统计数据 ====================
const stats = ref({
  todaySent: 0,
  todayVerified: 0,
  todayExpired: 0,
  totalSent: 0,
})

const trendData = ref({
  dates: [],
  sentCounts: [],
  verifiedCounts: [],
})

// ==================== 筛选条件 ====================
const filters = reactive({
  phone: '',
  status: '',
  dateRange: null,
})

// ==================== 表格数据 ====================
const tableData = ref([])
const loading = ref(false)
const total = ref(0)
const pagination = reactive({
  page: 1,
  pageSize: 10,
})

// ==================== 图表 ====================
const trendChartRef = ref(null)
let trendChart = null
let statsTimer = null

// ==================== 角色标签映射 ====================
const roleMap = {
  admin: '管理员',
  village_admin: '村管理员',
  provider: '服务商',
  elderly: '老人',
  family: '家属',
}

const roleTagMap = {
  admin: 'danger',
  village_admin: 'warning',
  provider: '',
  elderly: 'success',
  family: 'info',
}

function roleLabel(role) {
  return roleMap[role] || role
}

function roleTagType(role) {
  return roleTagMap[role] || 'info'
}

// ==================== 数据加载 ====================
async function fetchStats() {
  try {
    const res = await getSmsStats()
    if (res.code === 200 && res.data) {
      const d = res.data
      stats.value = {
        todaySent: d.today || 0,
        todayVerified: d.todayVerified || 0,
        todayExpired: d.todayExpired || 0,
        totalSent: d.totalAll || 0,
      }
      trendData.value = {
        dates: (d.trend || []).map((i) => i.date),
        sentCounts: (d.trend || []).map((i) => i.total),
        verifiedCounts: (d.trend || []).map((i) => i.verified),
      }
      await nextTick()
      renderTrendChart()
    }
  } catch (err) {
    console.error('获取短信统计失败:', err)
  }
}

async function fetchLogs() {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      pageSize: pagination.pageSize,
    }
    if (filters.phone) {
      params.phone = filters.phone
    }
    if (filters.status) {
      params.status = filters.status
    }
    if (filters.dateRange && filters.dateRange.length === 2) {
      params.startDate = filters.dateRange[0]
      params.endDate = filters.dateRange[1]
    }
    const res = await getSmsLogs(params)
    if (res.code === 200) {
      const data = res.data || {}
      tableData.value = Array.isArray(data) ? data : (data.list || data.records || [])
      total.value = data.total || tableData.value.length
    }
  } catch (err) {
    console.error('获取短信日志失败:', err)
  } finally {
    loading.value = false
  }
}

// ==================== 图表渲染 ====================
function renderTrendChart() {
  if (!trendChartRef.value) return

  if (!trendChart) {
    trendChart = echarts.init(trendChartRef.value)
  }

  const dates = trendData.value.dates.map((d) => {
    if (!d) return ''
    const parts = d.split('-')
    return parts.length >= 3 ? `${parts[1]}-${parts[2]}` : d
  })

  const option = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255, 255, 255, 0.96)',
      borderColor: '#e5e7eb',
      borderWidth: 1,
      textStyle: { color: '#1f2937', fontSize: 13 },
      axisPointer: {
        type: 'cross',
        crossStyle: { color: '#999' },
      },
    },
    legend: {
      data: ['发送量', '验证成功'],
      top: 0,
      right: 0,
      textStyle: { color: '#6b7280', fontSize: 13 },
    },
    grid: {
      left: 10,
      right: 20,
      bottom: 10,
      top: 40,
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: dates,
      axisLine: { lineStyle: { color: '#e5e7eb' } },
      axisTick: { show: false },
      axisLabel: { color: '#6b7280', fontSize: 12 },
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: '#f3f4f6', type: 'dashed' } },
      axisLabel: { color: '#9ca3af', fontSize: 12 },
    },
    series: [
      {
        name: '发送量',
        type: 'line',
        data: trendData.value.sentCounts,
        smooth: true,
        symbol: 'circle',
        symbolSize: 8,
        lineStyle: { width: 2.5, color: '#3b82f6' },
        itemStyle: { color: '#3b82f6' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(59, 130, 246, 0.15)' },
            { offset: 1, color: 'rgba(59, 130, 246, 0.01)' },
          ]),
        },
      },
      {
        name: '验证成功',
        type: 'line',
        data: trendData.value.verifiedCounts,
        smooth: true,
        symbol: 'circle',
        symbolSize: 8,
        lineStyle: { width: 2.5, color: '#10b981' },
        itemStyle: { color: '#10b981' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(16, 185, 129, 0.15)' },
            { offset: 1, color: 'rgba(16, 185, 129, 0.01)' },
          ]),
        },
      },
    ],
  }

  trendChart.setOption(option, true)
}

// ==================== 筛选操作 ====================
function handleSearch() {
  pagination.page = 1
  fetchLogs()
}

function handleReset() {
  filters.phone = ''
  filters.status = ''
  filters.dateRange = null
  pagination.page = 1
  fetchLogs()
}

// ==================== 窗口resize处理 ====================
function handleResize() {
  if (trendChart) {
    trendChart.resize()
  }
}

// ==================== 生命周期 ====================
onMounted(() => {
  fetchStats()
  fetchLogs()

  // 每30秒刷新统计数据
  statsTimer = setInterval(() => {
    fetchStats()
  }, 30000)

  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  if (statsTimer) {
    clearInterval(statsTimer)
    statsTimer = null
  }
  if (trendChart) {
    trendChart.dispose()
    trendChart = null
  }
  window.removeEventListener('resize', handleResize)
})
</script>

<template>
  <div class="page-container sms-code-page">
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
        <h2>短信验证码管理</h2>
        <p class="page-subtitle">
          查看验证码发送记录与统计数据
        </p>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="stat-cards">
      <div
        class="stat-card"
        style="--card-color: #3b82f6"
      >
        <div class="stat-card-icon">
          <el-icon :size="28">
            <ChatDotSquare />
          </el-icon>
        </div>
        <div class="stat-card-info">
          <div class="stat-card-value">
            {{ stats.todaySent }}
          </div>
          <div class="stat-card-label">
            今日发送
          </div>
        </div>
      </div>
      <div
        class="stat-card"
        style="--card-color: #10b981"
      >
        <div class="stat-card-icon">
          <el-icon :size="28">
            <CircleCheck />
          </el-icon>
        </div>
        <div class="stat-card-info">
          <div class="stat-card-value">
            {{ stats.todayVerified }}
          </div>
          <div class="stat-card-label">
            今日验证成功
          </div>
        </div>
      </div>
      <div
        class="stat-card"
        style="--card-color: #f59e0b"
      >
        <div class="stat-card-icon">
          <el-icon :size="28">
            <Clock />
          </el-icon>
        </div>
        <div class="stat-card-info">
          <div class="stat-card-value">
            {{ stats.todayExpired }}
          </div>
          <div class="stat-card-label">
            今日已过期
          </div>
        </div>
      </div>
      <div
        class="stat-card"
        style="--card-color: #8b5cf6"
      >
        <div class="stat-card-icon">
          <el-icon :size="28">
            <ChatDotSquare />
          </el-icon>
        </div>
        <div class="stat-card-info">
          <div class="stat-card-value">
            {{ stats.totalSent }}
          </div>
          <div class="stat-card-label">
            累计发送
          </div>
        </div>
      </div>
    </div>

    <!-- 7天趋势图 -->
    <el-card
      shadow="never"
      class="chart-card"
    >
      <template #header>
        <div class="card-header">
          <div class="card-header-left">
            <span class="card-title">近7天发送趋势</span>
          </div>
        </div>
      </template>
      <div
        ref="trendChartRef"
        style="height: 320px; width: 100%"
      />
    </el-card>

    <!-- 筛选栏 -->
    <el-card
      shadow="never"
      class="filter-card"
    >
      <div class="filter-bar">
        <el-input
          v-model="filters.phone"
          placeholder="手机号搜索"
          clearable
          style="width: 200px"
          @keyup.enter="handleSearch"
          @clear="handleSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        <el-select
          v-model="filters.status"
          placeholder="全部状态"
          clearable
          style="width: 140px"
          @change="handleSearch"
        >
          <el-option
            label="全部"
            value=""
          />
          <el-option
            label="已发送"
            value="sent"
          />
          <el-option
            label="已验证"
            value="verified"
          />
        </el-select>
        <el-date-picker
          v-model="filters.dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          value-format="YYYY-MM-DD"
          style="width: 260px"
          @change="handleSearch"
        />
        <el-button
          type="primary"
          :icon="Search"
          @click="handleSearch"
        >
          搜索
        </el-button>
        <el-button
          :icon="Refresh"
          @click="handleReset"
        >
          重置
        </el-button>
      </div>
    </el-card>

    <!-- 日志表格 -->
    <el-card
      shadow="never"
      class="table-card"
    >
      <el-table
        v-loading="loading"
        :data="tableData"
        stripe
        style="width: 100%"
        class="logs-table"
      >
        <el-table-column
          prop="id"
          label="ID"
          width="70"
          align="center"
        />
        <el-table-column
          prop="phone"
          label="手机号"
          width="140"
        />
        <el-table-column
          prop="code"
          label="验证码"
          width="100"
          align="center"
        />
        <el-table-column
          prop="status"
          label="状态"
          width="100"
          align="center"
        >
          <template #default="{ row }">
            <el-tag
              :type="row.status === 'verified' ? 'success' : 'info'"
              size="small"
              effect="light"
            >
              {{ row.status === 'verified' ? '已验证' : '已发送' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          prop="real_name"
          label="关联用户"
          width="120"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            {{ row.real_name || '-' }}
          </template>
        </el-table-column>
        <el-table-column
          prop="role"
          label="角色"
          width="110"
          align="center"
        >
          <template #default="{ row }">
            <el-tag
              v-if="row.role"
              :type="roleTagType(row.role)"
              size="small"
              effect="plain"
            >
              {{ roleLabel(row.role) }}
            </el-tag>
            <span
              v-else
              class="text-muted"
            >-</span>
          </template>
        </el-table-column>
        <el-table-column
          prop="ip"
          label="IP"
          width="140"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            {{ row.ip || '-' }}
          </template>
        </el-table-column>
        <el-table-column
          prop="created_at"
          label="发送时间"
          width="170"
          show-overflow-tooltip
        />
        <el-table-column
          prop="verified_at"
          label="验证时间"
          width="170"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            {{ row.verified_at || '-' }}
          </template>
        </el-table-column>
        <el-table-column
          prop="expired_at"
          label="过期时间"
          width="170"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            {{ row.expired_at || '-' }}
          </template>
        </el-table-column>
      </el-table>

      <el-empty
        v-if="!loading && tableData.length === 0"
        description="暂无验证码记录"
        :image-size="80"
      />

      <div
        v-if="total > 0"
        class="pagination-wrapper"
      >
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :total="total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next, jumper"
          background
          size="small"
          @size-change="fetchLogs"
          @current-change="fetchLogs"
        />
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.sms-code-page {
  max-width: 1200px;
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

/* 统计卡片 */
.stat-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 20px;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 12px;
  transition: box-shadow 0.2s;
  min-height: 92px;
}

.stat-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
}

.stat-card-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--card-color) 10%, transparent);
  color: var(--card-color);
  flex-shrink: 0;
}

.stat-card-info {
  min-width: 0;
  flex: 1;
}

.stat-card-value {
  font-size: 26px;
  font-weight: 700;
  color: var(--text);
  line-height: 1.2;
}

.stat-card-label {
  font-size: 13px;
  color: var(--text-secondary);
  margin-top: 4px;
}

/* 响应式 */
@media (max-width: 1200px) {
  .stat-cards {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .stat-cards {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }
  
  .stat-card {
    padding: 16px;
    min-height: 80px;
  }
  
  .stat-card-icon {
    width: 44px;
    height: 44px;
  }
  
  .stat-card-value {
    font-size: 22px;
  }
}

/* 图表卡片 */
.chart-card {
  margin-bottom: 20px;
  border-radius: 12px;
  border: 1px solid var(--border);
}

.chart-card :deep(.el-card__header) {
  padding: 14px 20px;
  border-bottom: 1px solid var(--border);
}

.chart-card :deep(.el-card__body) {
  padding: 16px 20px 20px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.card-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.card-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
}

/* 筛选栏 */
.filter-card {
  margin-bottom: 20px;
  border-radius: 12px;
  border: 1px solid var(--border);
}

.filter-card :deep(.el-card__body) {
  padding: 16px 20px;
}

.filter-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

/* 表格卡片 */
.table-card {
  margin-bottom: 20px;
  border-radius: 12px;
  border: 1px solid var(--border);
}

.table-card :deep(.el-card__body) {
  padding: 20px;
}

/* 表格样式 */
.logs-table :deep(.el-table__header th) {
  background-color: var(--bg, #f5f7fa);
}

.logs-table :deep(.el-table) {
  --el-table-border-color: var(--border, #e5e7eb);
  --el-table-header-bg-color: var(--bg, #f5f7fa);
  --el-table-text-color: var(--text, #1f2937);
  --el-table-header-text-color: var(--text-secondary, #6b7280);
}

.text-muted {
  color: var(--text-muted);
}

/* 分页 */
.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  padding-top: 16px;
}

/* 响应式 */
@media (max-width: 768px) {
  .filter-bar {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-bar .el-input,
  .filter-bar .el-select,
  .filter-bar .el-date-picker {
    width: 100% !important;
  }
}
</style>
