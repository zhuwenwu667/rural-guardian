<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { View, Hide, Cpu, ChatDotRound, ArrowLeft } from '@element-plus/icons-vue'
import { getConfigs, updateConfig } from '../../api/config'
import { testServiceConnection, testAIChat } from '../../api/service'
import * as echarts from 'echarts'

const router = useRouter()

// ---- 状态 ----
const saving = ref(false)
const testing = ref(false)
const showApiKey = ref(false)

// ---- 配置表单 ----
const form = reactive({
  ai_enabled: false,
  ai_provider: 'zhipu',
  ai_api_key: '',
  ai_api_url: '',
  ai_model: '',
  ai_health_prompt: '',
})

const providerLabel = computed(() => {
  const map = { zhipu: '智谱GLM', tongyi: '通义千问', moonshot: '月之暗面', custom: '自定义' }
  return map[form.ai_provider] || 'AI'
})

// ---- 对话测试 ----
const chatMessages = ref([])
const chatInput = ref('')
const chatLoading = ref(false)
const chatMessagesRef = ref(null)

async function sendMessage() {
  const text = chatInput.value.trim()
  if (!text || chatLoading.value) return

  chatMessages.value.push({ role: 'user', content: text })
  chatInput.value = ''
  chatLoading.value = true

  await nextTick()
  scrollToBottom()

  try {
    const res = await testAIChat(text)
    if (res.code === 200) {
      chatMessages.value.push({ role: 'ai', content: res.data?.reply || res.data || '回复成功' })
    } else {
      chatMessages.value.push({ role: 'ai', content: res.message || '请求失败，请检查配置' })
    }
  } catch (err) {
    chatMessages.value.push({ role: 'ai', content: `请求失败：${  err.message || '网络异常'}` })
  } finally {
    chatLoading.value = false
    await nextTick()
    scrollToBottom()
  }
}

function scrollToBottom() {
  if (chatMessagesRef.value) {
    chatMessagesRef.value.scrollTop = chatMessagesRef.value.scrollHeight
  }
}

// ---- 调用统计 ----
const stats = reactive({
  todayCalls: 0,
  successRate: 0,
  avgResponseTime: 0,
  tokenUsage: 0,
})

const trendChartRef = ref(null)
let trendChart = null

function initTrendChart() {
  if (!trendChartRef.value) return
  trendChart = echarts.init(trendChartRef.value)

  // 生成近7天日期标签
  const days = []
  const now = new Date()
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    days.push(`${d.getMonth() + 1}/${d.getDate()}`)
  }

  const option = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(0,0,0,0.75)',
      borderColor: 'transparent',
      textStyle: { color: '#fff', fontSize: 12 },
    },
    grid: {
      top: 20,
      right: 16,
      bottom: 24,
      left: 40,
    },
    xAxis: {
      type: 'category',
      data: days,
      axisLine: { lineStyle: { color: 'var(--border, #e4e7ed)' } },
      axisLabel: { color: 'var(--text-muted, #909399)', fontSize: 11 },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: 'var(--border, #e4e7ed)', type: 'dashed' } },
      axisLabel: { color: 'var(--text-muted, #909399)', fontSize: 11 },
    },
    series: [
      {
        name: '调用次数',
        type: 'line',
        data: stats.trendData || [0, 0, 0, 0, 0, 0, 0],
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { color: '#8b5cf6', width: 2 },
        itemStyle: { color: '#8b5cf6' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(139, 92, 246, 0.25)' },
            { offset: 1, color: 'rgba(139, 92, 246, 0.02)' },
          ]),
        },
      },
    ],
  }

  trendChart.setOption(option)
}

function handleResize() {
  trendChart?.resize()
}

// ---- 加载配置 ----
async function loadConfigs() {
  try {
    const res = await getConfigs()
    if (res.code === 200 && res.data) {
      const configs = Array.isArray(res.data) ? res.data : []
      const aiKeys = ['ai_enabled', 'ai_provider', 'ai_api_key', 'ai_api_url', 'ai_model', 'ai_health_prompt']
      configs.forEach((item) => {
        const key = item.config_key || item.key
        const value = item.config_value !== undefined ? item.config_value : item.value
        if (aiKeys.includes(key)) {
          if (value === 'true' || value === true) {
            form[key] = true
          } else if (value === 'false' || value === false) {
            form[key] = false
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

// ---- 切换开关 ----
async function onSwitchChange() {
  try {
    await updateConfig('ai_enabled', form.ai_enabled)
    ElMessage.success(form.ai_enabled ? 'AI 服务已启用' : 'AI 服务已禁用')
  } catch (err) {
    console.error(err)
  }
}

// ---- 保存配置 ----
async function saveConfig() {
  saving.value = true
  try {
    const fields = ['ai_provider', 'ai_api_key', 'ai_api_url', 'ai_model', 'ai_health_prompt']
    let successCount = 0
    for (const key of fields) {
      try {
        await updateConfig(key, form[key])
        successCount++
      } catch (err) {
        console.error(`保存 ${key} 失败:`, err)
      }
    }
    if (successCount === fields.length) {
      ElMessage.success('配置保存成功')
    } else {
      ElMessage.warning(`已保存 ${successCount}/${fields.length} 项配置`)
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
    const res = await testServiceConnection('ai')
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

// ---- 生命周期 ----
onMounted(() => {
  loadConfigs()
  nextTick(() => {
    initTrendChart()
  })
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  trendChart?.dispose()
})
</script>

<template>
  <div class="page-container ai-service-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="page-header-left">
        <el-button
          text
          @click="$router.push('/gov/service-center')"
        >
          <el-icon><ArrowLeft /></el-icon>
          返回服务中心
        </el-button>
        <div>
          <h2>AI 服务管理</h2>
          <p class="page-subtitle">
            配置和管理 AI 大模型服务，用于智能健康分析与对话
          </p>
        </div>
      </div>
    </div>

    <!-- 状态卡片 -->
    <div class="status-card">
      <div class="status-card-left">
        <el-icon
          :size="36"
          color="#fff"
        >
          <Cpu />
        </el-icon>
        <div>
          <div class="status-card-title">
            {{ providerLabel }} AI 服务
          </div>
          <div class="status-card-desc">
            当前状态：
            <el-tag
              :type="form.ai_enabled ? 'success' : 'info'"
              effect="dark"
              size="small"
            >
              {{ form.ai_enabled ? '运行中' : '已停用' }}
            </el-tag>
          </div>
        </div>
      </div>
      <div class="status-card-right">
        <span class="status-text">{{ form.ai_enabled ? '已启用' : '未启用' }}</span>
        <el-switch
          v-model="form.ai_enabled"
          @change="onSwitchChange"
        />
      </div>
    </div>

    <!-- 配置表单 -->
    <el-card
      shadow="never"
      class="section-card"
    >
      <template #header>
        <div class="card-header">
          <el-icon><Cpu /></el-icon>
          <span>服务配置</span>
        </div>
      </template>
      <el-form
        :model="form"
        label-width="140px"
        class="config-form"
      >
        <el-form-item label="服务提供商">
          <el-select
            v-model="form.ai_provider"
            placeholder="请选择服务提供商"
            style="width: 100%"
          >
            <el-option
              label="智谱GLM"
              value="zhipu"
            />
            <el-option
              label="通义千问"
              value="tongyi"
            />
            <el-option
              label="月之暗面"
              value="moonshot"
            />
            <el-option
              label="自定义"
              value="custom"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="API Key">
          <el-input
            v-model="form.ai_api_key"
            :type="showApiKey ? 'text' : 'password'"
            placeholder="请输入 API Key"
          >
            <template #suffix>
              <el-icon
                class="password-toggle"
                @click="showApiKey = !showApiKey"
              >
                <View v-if="showApiKey" />
                <Hide v-else />
              </el-icon>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item
          v-if="form.ai_provider === 'custom'"
          label="接口地址"
        >
          <el-input
            v-model="form.ai_api_url"
            placeholder="请输入自定义 API 接口地址"
          />
        </el-form-item>
        <el-form-item label="模型名称">
          <el-input
            v-model="form.ai_model"
            placeholder="请输入模型名称，如 glm-4"
          />
        </el-form-item>
        <el-form-item label="健康分析提示词">
          <el-input
            v-model="form.ai_health_prompt"
            type="textarea"
            :rows="4"
            placeholder="请输入健康分析提示词，用于 AI 分析老人健康数据"
          />
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

    <!-- AI 对话测试 -->
    <el-card
      shadow="never"
      class="section-card"
    >
      <template #header>
        <div class="card-header">
          <el-icon><ChatDotRound /></el-icon>
          <span>AI 对话测试</span>
        </div>
      </template>
      <div class="chat-container">
        <div
          ref="chatMessagesRef"
          class="chat-messages"
        >
          <div
            v-if="chatMessages.length === 0"
            class="chat-empty"
          >
            <el-icon
              :size="48"
              color="var(--text-muted)"
            >
              <ChatDotRound />
            </el-icon>
            <p>暂无对话记录，请在下方输入消息进行测试</p>
          </div>
          <div
            v-for="(msg, index) in chatMessages"
            :key="index"
            :class="['chat-message', msg.role === 'user' ? 'message-user' : 'message-ai']"
          >
            <div
              class="message-bubble"
              :class="msg.role === 'user' ? 'bubble-user' : 'bubble-ai'"
            >
              <div class="message-role">
                {{ msg.role === 'user' ? '我' : 'AI' }}
              </div>
              <div class="message-content">
                {{ msg.content }}
              </div>
            </div>
          </div>
          <div
            v-if="chatLoading"
            class="chat-message message-ai"
          >
            <div class="message-bubble bubble-ai">
              <div class="message-role">
                AI
              </div>
              <div class="message-content">
                <span class="typing-indicator">
                  <span /><span /><span />
                </span>
              </div>
            </div>
          </div>
        </div>
        <div class="chat-input-area">
          <el-input
            v-model="chatInput"
            placeholder="输入测试消息..."
            :disabled="chatLoading"
            @keyup.enter="sendMessage"
          >
            <template #append>
              <el-button
                :loading="chatLoading"
                :disabled="!chatInput.trim()"
                @click="sendMessage"
              >
                发送
              </el-button>
            </template>
          </el-input>
        </div>
      </div>
    </el-card>

    <!-- 调用统计 -->
    <el-card
      shadow="never"
      class="section-card"
    >
      <template #header>
        <div class="card-header">
          <el-icon><Cpu /></el-icon>
          <span>调用统计</span>
        </div>
      </template>
      <el-row
        :gutter="20"
        class="stats-row"
      >
        <el-col :span="6">
          <div class="stat-item">
            <div class="stat-value">
              {{ stats.todayCalls }}
            </div>
            <div class="stat-label">
              今日调用
            </div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-item">
            <div class="stat-value">
              {{ stats.successRate }}%
            </div>
            <div class="stat-label">
              成功率
            </div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-item">
            <div class="stat-value">
              {{ stats.avgResponseTime }}ms
            </div>
            <div class="stat-label">
              平均响应
            </div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-item">
            <div class="stat-value">
              {{ stats.tokenUsage }}
            </div>
            <div class="stat-label">
              Token 用量
            </div>
          </div>
        </el-col>
      </el-row>
      <div class="trend-chart-wrapper">
        <div class="trend-chart-title">
          近 7 天调用趋势
        </div>
        <div
          ref="trendChartRef"
          class="trend-chart"
        />
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.ai-service-page {
  max-width: 960px;
}

/* 页面头部 */
.page-header {
  margin-bottom: 20px;
}

.page-header-left {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.page-header-left .el-button {
  align-self: flex-start;
  color: var(--text-secondary);
  font-size: 13px;
  margin: 0;
  padding: 4px 0;
}

.page-header-left .el-button:hover {
  color: var(--primary);
}

.page-subtitle {
  font-size: 13px;
  color: var(--text-muted);
  margin-top: 4px;
}

/* 状态卡片 */
.status-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 28px;
  border-radius: 12px;
  margin-bottom: 20px;
  color: #fff;
  background: linear-gradient(135deg, #8b5cf6, #7c3aed);
}

.status-card-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.status-card-title {
  font-size: 18px;
  font-weight: 600;
}

.status-card-desc {
  font-size: 13px;
  opacity: 0.85;
  margin-top: 6px;
  display: flex;
  align-items: center;
  gap: 8px;
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

.status-card :deep(.el-tag) {
  border: none;
}

/* 区块卡片 */
.section-card {
  margin-bottom: 20px;
  border-radius: 12px;
  border: 1px solid var(--border, #e4e7ed);
}

.section-card :deep(.el-card__header) {
  padding: 16px 24px;
  border-bottom: 1px solid var(--border, #e4e7ed);
}

.section-card :deep(.el-card__body) {
  padding: 24px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  color: var(--text, #303133);
}

.card-header .el-icon {
  color: #8b5cf6;
}

/* 配置表单 */
.config-form {
  max-width: 640px;
}

.config-form .el-form-item {
  margin-bottom: 20px;
}

.password-toggle {
  cursor: pointer;
  color: var(--text-muted, #909399);
  transition: color 0.2s;
}

.password-toggle:hover {
  color: var(--primary, #409eff);
}

.action-bar {
  display: flex;
  gap: 12px;
  padding-top: 8px;
  border-top: 1px solid var(--border, #e4e7ed);
  margin-top: 8px;
}

/* 对话测试 */
.chat-container {
  display: flex;
  flex-direction: column;
}

.chat-messages {
  height: 400px;
  max-height: 400px;
  overflow-y: auto;
  padding: 16px;
  background: var(--bg-secondary, #f5f7fa);
  border-radius: 8px;
  margin-bottom: 16px;
}

.chat-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 12px;
  color: var(--text-muted, #909399);
  font-size: 13px;
}

.chat-message {
  display: flex;
  margin-bottom: 16px;
}

.chat-message:last-child {
  margin-bottom: 0;
}

.message-user {
  justify-content: flex-end;
}

.message-ai {
  justify-content: flex-start;
}

.message-bubble {
  max-width: 70%;
  padding: 10px 14px;
  border-radius: 12px;
  line-height: 1.6;
}

.bubble-user {
  background: #3b82f6;
  color: #fff;
  border-bottom-right-radius: 4px;
}

.bubble-ai {
  background: var(--card, #fff);
  color: var(--text, #303133);
  border: 1px solid var(--border, #e4e7ed);
  border-bottom-left-radius: 4px;
}

.message-role {
  font-size: 11px;
  font-weight: 600;
  margin-bottom: 4px;
  opacity: 0.7;
}

.message-content {
  font-size: 14px;
  word-break: break-word;
  white-space: pre-wrap;
}

/* 打字动画 */
.typing-indicator {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  padding: 4px 0;
}

.typing-indicator span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--text-muted, #909399);
  animation: typing 1.2s infinite;
}

.typing-indicator span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-indicator span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing {
  0%, 60%, 100% {
    opacity: 0.3;
    transform: scale(0.8);
  }
  30% {
    opacity: 1;
    transform: scale(1);
  }
}

.chat-input-area {
  flex-shrink: 0;
}

/* 调用统计 */
.stats-row {
  margin-bottom: 24px;
}

.stat-item {
  text-align: center;
  padding: 16px 8px;
  background: var(--bg-secondary, #f5f7fa);
  border-radius: 8px;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--text, #303133);
  line-height: 1.2;
}

.stat-label {
  font-size: 12px;
  color: var(--text-muted, #909399);
  margin-top: 6px;
}

.trend-chart-wrapper {
  background: var(--bg-secondary, #f5f7fa);
  border-radius: 8px;
  padding: 16px;
}

.trend-chart-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary, #606266);
  margin-bottom: 12px;
}

.trend-chart {
  width: 100%;
  height: 220px;
}
</style>
