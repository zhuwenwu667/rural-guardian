<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { Plus, FirstAidKit, Odometer, Sunny, WindPower } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import * as echarts from 'echarts'
import { useUserStore } from '../../stores/user'

const userStore = useUserStore()
const loading = ref(false)
const submitting = ref(false)
const showAddDialog = ref(false)
const isEdit = ref(false)
const formRef = ref(null)
const heartRateChart = ref(null)
const bloodPressureChart = ref(null)

// 健康记录数据
const healthRecords = ref([])

// 最新数据
const latestHeartRate = ref(null)
const latestBloodPressure = ref(null)
const latestTemperature = ref(null)
const latestOxygen = ref(null)

// 表单
const form = ref({
  id: null,
  recordDate: new Date(),
  heartRate: 75,
  systolic: 120,
  diastolic: 80,
  temperature: 36.5,
  oxygen: 98,
  weight: 65,
  remark: ''
})

// 表单验证规则
const rules = {
  recordDate: [{ required: true, message: '请选择记录日期', trigger: 'change' }],
  heartRate: [{ required: true, message: '请输入心率', trigger: 'blur' }],
  systolic: [{ required: true, message: '请输入收缩压', trigger: 'blur' }],
  diastolic: [{ required: true, message: '请输入舒张压', trigger: 'blur' }],
  temperature: [{ required: true, message: '请输入体温', trigger: 'blur' }],
  oxygen: [{ required: true, message: '请输入血氧', trigger: 'blur' }]
}

// 加载健康记录
async function loadHealthRecords() {
  loading.value = true
  try {
    const elderlyId = userStore.userId
    const res = await fetch(`/api/elderly/${elderlyId}/health-records`)
    const data = await res.json()
    if (data.code === 200) {
      healthRecords.value = data.data || []
      updateLatestData()
      nextTick(() => {
        initCharts()
      })
    }
  } catch (err) {
    console.error('加载健康记录失败:', err)
    ElMessage.error('加载失败')
  } finally {
    loading.value = false
  }
}

// 更新最新数据
function updateLatestData() {
  if (healthRecords.value.length > 0) {
    const latest = healthRecords.value[0]
    latestHeartRate.value = latest.heartRate
    latestBloodPressure.value = `${latest.systolic}/${latest.diastolic}`
    latestTemperature.value = latest.temperature
    latestOxygen.value = latest.oxygen
  }
}

// 初始化图表
function initCharts() {
  initHeartRateChart()
  initBloodPressureChart()
}

// 心率趋势图
function initHeartRateChart() {
  if (!heartRateChart.value) return
  const chart = echarts.init(heartRateChart.value)
  const records = healthRecords.value.slice(0, 7).reverse()
  
  const option = {
    tooltip: { trigger: 'axis' },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'category',
      data: records.map(r => formatDate(r.recordDate)),
      axisLine: { lineStyle: { color: '#e2e8f0' } },
      axisLabel: { color: '#64748b' }
    },
    yAxis: {
      type: 'value',
      min: 40,
      max: 120,
      axisLine: { show: false },
      axisLabel: { color: '#64748b' },
      splitLine: { lineStyle: { color: '#f1f5f9' } }
    },
    series: [{
      name: '心率',
      type: 'line',
      data: records.map(r => r.heartRate),
      smooth: true,
      symbol: 'circle',
      symbolSize: 8,
      lineStyle: { color: '#0d9488', width: 3 },
      itemStyle: { color: '#0d9488' },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(13, 148, 136, 0.3)' },
            { offset: 1, color: 'rgba(13, 148, 136, 0.05)' }
          ]
        }
      }
    }]
  }
  chart.setOption(option)
}

// 血压趋势图
function initBloodPressureChart() {
  if (!bloodPressureChart.value) return
  const chart = echarts.init(bloodPressureChart.value)
  const records = healthRecords.value.slice(0, 7).reverse()
  
  const option = {
    tooltip: { trigger: 'axis' },
    legend: { data: ['收缩压', '舒张压'] },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'category',
      data: records.map(r => formatDate(r.recordDate)),
      axisLine: { lineStyle: { color: '#e2e8f0' } },
      axisLabel: { color: '#64748b' }
    },
    yAxis: {
      type: 'value',
      min: 50,
      max: 180,
      axisLine: { show: false },
      axisLabel: { color: '#64748b' },
      splitLine: { lineStyle: { color: '#f1f5f9' } }
    },
    series: [
      {
        name: '收缩压',
        type: 'line',
        data: records.map(r => r.systolic),
        smooth: true,
        lineStyle: { color: '#ef4444', width: 2 },
        itemStyle: { color: '#ef4444' }
      },
      {
        name: '舒张压',
        type: 'line',
        data: records.map(r => r.diastolic),
        smooth: true,
        lineStyle: { color: '#3b82f6', width: 2 },
        itemStyle: { color: '#3b82f6' }
      }
    ]
  }
  chart.setOption(option)
}

// 提交表单
async function submitForm() {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  try {
    const url = isEdit.value 
      ? `/api/health-records/${form.value.id}` 
      : '/api/health-records'
    const method = isEdit.value ? 'PUT' : 'POST'
    
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form.value,
        elderlyId: userStore.userId
      })
    })
    
    const data = await res.json()
    if (data.code === 200) {
      ElMessage.success(isEdit.value ? '更新成功' : '录入成功')
      showAddDialog.value = false
      loadHealthRecords()
    } else {
      ElMessage.error(data.message || '操作失败')
    }
  } catch (err) {
    console.error('提交失败:', err)
    ElMessage.error('提交失败')
  } finally {
    submitting.value = false
  }
}

// 编辑记录
function editRecord(row) {
  isEdit.value = true
  form.value = { ...row }
  showAddDialog.value = true
}

// 删除记录
async function deleteRecord(row) {
  try {
    await ElMessageBox.confirm('确定要删除这条记录吗？', '提示', { type: 'warning' })
    const res = await fetch(`/api/health-records/${row.id}`, { method: 'DELETE' })
    const data = await res.json()
    if (data.code === 200) {
      ElMessage.success('删除成功')
      loadHealthRecords()
    }
  } catch (err) {
    if (err !== 'cancel') {
      console.error('删除失败:', err)
      ElMessage.error('删除失败')
    }
  }
}

// 格式化日期
function formatDate(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}/${date.getDate()}`
}

// 获取状态样式
function getHeartRateClass(value) {
  if (value < 60 || value > 100) return 'warning'
  return 'normal'
}

function getBPClass(systolic, diastolic) {
  if (systolic > 140 || diastolic > 90) return 'warning'
  if (systolic < 90 || diastolic < 60) return 'warning'
  return 'normal'
}

function getTempClass(value) {
  if (value > 37.3 || value < 36) return 'warning'
  return 'normal'
}

function getOxygenClass(value) {
  if (value < 95) return 'warning'
  return 'normal'
}

onMounted(() => {
  loadHealthRecords()
})
</script>

<template>
  <div class="health-record-page">
    <div class="page-header">
      <h2 class="page-title">
        健康档案
      </h2>
      <el-button
        type="primary"
        @click="showAddDialog = true"
      >
        <el-icon><Plus /></el-icon> 录入健康数据
      </el-button>
    </div>

    <!-- 健康概览卡片 -->
    <div class="health-overview">
      <div class="overview-card">
        <div class="card-icon heart">
          <el-icon><FirstAidKit /></el-icon>
        </div>
        <div class="card-info">
          <span class="card-value">{{ latestHeartRate || '--' }}</span>
          <span class="card-unit">bpm</span>
          <span class="card-label">最新心率</span>
        </div>
      </div>
      <div class="overview-card">
        <div class="card-icon blood">
          <el-icon><Odometer /></el-icon>
        </div>
        <div class="card-info">
          <span class="card-value">{{ latestBloodPressure || '--/--' }}</span>
          <span class="card-unit">mmHg</span>
          <span class="card-label">最新血压</span>
        </div>
      </div>
      <div class="overview-card">
        <div class="card-icon temp">
          <el-icon><Sunny /></el-icon>
        </div>
        <div class="card-info">
          <span class="card-value">{{ latestTemperature || '--' }}</span>
          <span class="card-unit">°C</span>
          <span class="card-label">最新体温</span>
        </div>
      </div>
      <div class="overview-card">
        <div class="card-icon oxygen">
          <el-icon><WindPower /></el-icon>
        </div>
        <div class="card-info">
          <span class="card-value">{{ latestOxygen || '--' }}</span>
          <span class="card-unit">%</span>
          <span class="card-label">血氧饱和度</span>
        </div>
      </div>
    </div>

    <!-- 健康趋势图 -->
    <div class="chart-section">
      <div class="chart-card">
        <h3 class="chart-title">
          心率趋势（近7天）
        </h3>
        <div
          ref="heartRateChart"
          class="chart-container"
        />
      </div>
      <div class="chart-card">
        <h3 class="chart-title">
          血压趋势（近7天）
        </h3>
        <div
          ref="bloodPressureChart"
          class="chart-container"
        />
      </div>
    </div>

    <!-- 健康记录列表 -->
    <div class="record-section">
      <h3 class="section-title">
        健康记录历史
      </h3>
      <el-table
        v-loading="loading"
        :data="healthRecords"
        stripe
      >
        <el-table-column
          prop="recordDate"
          label="日期"
          width="120"
        >
          <template #default="{ row }">
            {{ formatDate(row.recordDate) }}
          </template>
        </el-table-column>
        <el-table-column
          prop="heartRate"
          label="心率"
          width="100"
        >
          <template #default="{ row }">
            <span :class="getHeartRateClass(row.heartRate)">{{ row.heartRate }} bpm</span>
          </template>
        </el-table-column>
        <el-table-column
          prop="bloodPressure"
          label="血压"
          width="120"
        >
          <template #default="{ row }">
            <span :class="getBPClass(row.systolic, row.diastolic)">
              {{ row.systolic }}/{{ row.diastolic }}
            </span>
          </template>
        </el-table-column>
        <el-table-column
          prop="temperature"
          label="体温"
          width="100"
        >
          <template #default="{ row }">
            <span :class="getTempClass(row.temperature)">{{ row.temperature }}°C</span>
          </template>
        </el-table-column>
        <el-table-column
          prop="oxygen"
          label="血氧"
          width="100"
        >
          <template #default="{ row }">
            <span :class="getOxygenClass(row.oxygen)">{{ row.oxygen }}%</span>
          </template>
        </el-table-column>
        <el-table-column
          prop="weight"
          label="体重"
          width="100"
        >
          <template #default="{ row }">
            {{ row.weight }} kg
          </template>
        </el-table-column>
        <el-table-column
          prop="remark"
          label="备注"
          show-overflow-tooltip
        />
        <el-table-column
          label="操作"
          width="120"
          fixed="right"
        >
          <template #default="{ row }">
            <el-button
              type="primary"
              link
              @click="editRecord(row)"
            >
              编辑
            </el-button>
            <el-button
              type="danger"
              link
              @click="deleteRecord(row)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 空状态 -->
      <el-empty
        v-if="!loading && healthRecords.length === 0"
        description="暂无健康记录"
      >
        <el-button
          type="primary"
          @click="showAddDialog = true"
        >
          录入第一条记录
        </el-button>
      </el-empty>
    </div>

    <!-- 录入/编辑对话框 -->
    <el-dialog
      v-model="showAddDialog"
      :title="isEdit ? '编辑健康记录' : '录入健康数据'"
      width="500px"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="100px"
      >
        <el-form-item
          label="记录日期"
          prop="recordDate"
        >
          <el-date-picker
            v-model="form.recordDate"
            type="date"
            placeholder="选择日期"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item
          label="心率"
          prop="heartRate"
        >
          <el-input-number
            v-model="form.heartRate"
            :min="40"
            :max="200"
            style="width: 100%"
          />
          <span class="unit">bpm</span>
        </el-form-item>
        <el-form-item
          label="血压"
          required
        >
          <el-col :span="11">
            <el-form-item prop="systolic">
              <el-input-number
                v-model="form.systolic"
                :min="70"
                :max="200"
                placeholder="收缩压"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col
            :span="2"
            class="text-center"
          >
            /
          </el-col>
          <el-col :span="11">
            <el-form-item prop="diastolic">
              <el-input-number
                v-model="form.diastolic"
                :min="40"
                :max="130"
                placeholder="舒张压"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-form-item>
        <el-form-item
          label="体温"
          prop="temperature"
        >
          <el-input-number
            v-model="form.temperature"
            :min="35"
            :max="42"
            :precision="1"
            :step="0.1"
            style="width: 100%"
          />
          <span class="unit">°C</span>
        </el-form-item>
        <el-form-item
          label="血氧"
          prop="oxygen"
        >
          <el-input-number
            v-model="form.oxygen"
            :min="80"
            :max="100"
            style="width: 100%"
          />
          <span class="unit">%</span>
        </el-form-item>
        <el-form-item
          label="体重"
          prop="weight"
        >
          <el-input-number
            v-model="form.weight"
            :min="30"
            :max="150"
            :precision="1"
            style="width: 100%"
          />
          <span class="unit">kg</span>
        </el-form-item>
        <el-form-item
          label="备注"
          prop="remark"
        >
          <el-input
            v-model="form.remark"
            type="textarea"
            :rows="3"
            placeholder="请输入备注信息"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddDialog = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="submitting"
          @click="submitForm"
        >
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.health-record-page {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-title {
  margin: 0;
  font-size: 20px;
  color: #1e293b;
}

/* 概览卡片 */
.health-overview {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}

.overview-card {
  display: flex;
  align-items: center;
  padding: 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.card-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  margin-right: 16px;
}

.card-icon.heart {
  background: #fee2e2;
  color: #ef4444;
}

.card-icon.blood {
  background: #dbeafe;
  color: #3b82f6;
}

.card-icon.temp {
  background: #fef3c7;
  color: #f59e0b;
}

.card-icon.oxygen {
  background: #d1fae5;
  color: #10b981;
}

.card-info {
  display: flex;
  flex-direction: column;
}

.card-value {
  font-size: 24px;
  font-weight: 600;
  color: #1e293b;
}

.card-unit {
  font-size: 12px;
  color: #64748b;
  margin-left: 4px;
}

.card-label {
  font-size: 14px;
  color: #64748b;
  margin-top: 4px;
}

/* 图表区域 */
.chart-section {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}

.chart-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.chart-title {
  margin: 0 0 16px;
  font-size: 16px;
  color: #1e293b;
}

.chart-container {
  height: 250px;
}

/* 记录列表 */
.record-section {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.section-title {
  margin: 0 0 16px;
  font-size: 16px;
  color: #1e293b;
}

/* 状态样式 */
.normal {
  color: #10b981;
}

.warning {
  color: #ef4444;
  font-weight: 600;
}

.unit {
  margin-left: 8px;
  color: #64748b;
}

.text-center {
  text-align: center;
}

@media (max-width: 1200px) {
  .health-overview {
    grid-template-columns: repeat(2, 1fr);
  }
  .chart-section {
    grid-template-columns: 1fr;
  }
}
</style>
