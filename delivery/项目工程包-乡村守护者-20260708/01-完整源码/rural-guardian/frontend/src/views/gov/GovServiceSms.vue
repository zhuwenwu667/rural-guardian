<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { View, Hide, ArrowLeft, ChatDotSquare, Connection, Search } from '@element-plus/icons-vue'
import { getConfigs, updateConfig, testApiConnection } from '../../api/config'
import { getSmsStats, getSmsLogs } from '../../api/service'

// ==================== 通用状态 ====================
const saving = ref(false)
const testing = ref(false)
const sendingTest = ref(false)
const loadingLogs = ref(false)

// 密码显示/隐藏控制
const showPasswords = reactive({
  accessKeyId: false,
  accessKeySecret: false,
})

// ==================== 服务配置表单 ====================
const form = reactive({
  sms_enabled: false,
  sms_provider: '',
  sms_access_key_id: '',
  sms_access_key_secret: '',
  sms_sign_name: '',
  sms_template_code: '',
  sms_variable_format: '',
})

const configKeys = [
  'sms_enabled',
  'sms_provider',
  'sms_access_key_id',
  'sms_access_key_secret',
  'sms_sign_name',
  'sms_template_code',
  'sms_variable_format',
]

// ==================== 发送测试 ====================
const testPhone = ref('')
const testVariables = ref('')
const testResult = ref(null)

// ==================== 调用统计 ====================
const stats = reactive({
  today: 0,
  todayVerified: 0,
  todayExpired: 0,
  totalAll: 0,
})

// ==================== 发送记录 ====================
const logs = ref([])

// ==================== 配置加载与保存 ====================
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

async function onSwitchChange() {
  try {
    await updateConfig('sms_enabled', form.sms_enabled)
    ElMessage.success(form.sms_enabled ? '短信服务已启用' : '短信服务已禁用')
  } catch (err) {
    console.error(err)
    ElMessage.error('操作失败')
  }
}

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
      ElMessage.success('短信服务配置保存成功')
    } else {
      ElMessage.warning(`已保存 ${successCount}/${configKeys.length} 项配置`)
    }
  } catch (err) {
    ElMessage.error('保存配置失败')
  } finally {
    saving.value = false
  }
}

async function testConnection() {
  testing.value = true
  try {
    const res = await testApiConnection('sms')
    if (res.code === 200) {
      ElMessage.success('短信服务连接测试成功')
    } else {
      ElMessage.error(res.message || '连接测试失败')
    }
  } catch (err) {
    ElMessage.error('连接测试失败，请检查配置')
  } finally {
    testing.value = false
  }
}

// ==================== 发送测试 ====================
async function sendTestSms() {
  if (!testPhone.value.trim()) {
    ElMessage.warning('请输入接收手机号')
    return
  }
  if (!/^1\d{10}$/.test(testPhone.value.trim())) {
    ElMessage.warning('请输入正确的手机号格式')
    return
  }
  sendingTest.value = true
  testResult.value = null
  try {
    const res = await testApiConnection('sms', {
      phone: testPhone.value.trim(),
      variables: testVariables.value.trim(),
    })
    if (res.code === 200) {
      testResult.value = {
        type: 'success',
        title: '发送成功',
        message: `测试短信已成功发送至 ${testPhone.value.trim()}`,
      }
    } else {
      testResult.value = {
        type: 'error',
        title: '发送失败',
        message: res.message || '短信发送失败，请检查配置和网络',
      }
    }
  } catch (err) {
    testResult.value = {
      type: 'error',
      title: '发送失败',
      message: err.message || '短信发送异常，请检查配置和网络',
    }
  } finally {
    sendingTest.value = false
  }
}

// ==================== 调用统计 ====================
async function fetchStats() {
  try {
    const res = await getSmsStats()
    if (res.code === 200 && res.data) {
      stats.today = res.data.today || 0
      stats.todayVerified = res.data.todayVerified || 0
      stats.todayExpired = res.data.todayExpired || 0
      stats.totalAll = res.data.totalAll || 0
    }
  } catch (err) {
    console.error('获取短信统计失败:', err)
  }
}

// ==================== 发送记录 ====================
async function fetchLogs() {
  loadingLogs.value = true
  try {
    const res = await getSmsLogs({ page: 1, page_size: 10 })
    if (res.code === 200) {
      const data = res.data || {}
      logs.value = Array.isArray(data) ? data.slice(0, 10) : (data.list || data.records || []).slice(0, 10)
    }
  } catch (err) {
    console.error('获取短信发送记录失败:', err)
  } finally {
    loadingLogs.value = false
  }
}

// ==================== 初始化 ====================
onMounted(() => {
  loadConfigs()
  fetchStats()
  fetchLogs()
})
</script>

<template>
  <div class="page-container sms-service-page">
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
        <h2>短信服务管理</h2>
        <p class="page-subtitle">
          短信API配置、发送测试与调用统计
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
          <ChatDotSquare />
        </el-icon>
        <div>
          <div class="status-card-title">
            短信服务
          </div>
          <div class="status-card-desc">
            管理短信API配置与发送测试
          </div>
        </div>
      </div>
      <div class="status-card-right">
        <span class="status-text">{{ form.sms_enabled ? '已启用' : '未启用' }}</span>
        <el-switch
          v-model="form.sms_enabled"
          @change="onSwitchChange"
        />
      </div>
    </div>

    <!-- 服务配置 -->
    <el-card
      shadow="never"
      class="config-card"
    >
      <template #header>
        <div class="card-header">
          <span class="card-title">服务配置</span>
          <span class="card-desc">短信服务商接入参数</span>
        </div>
      </template>
      <el-form
        :model="form"
        label-width="140px"
        class="config-form"
      >
        <el-form-item label="短信服务商">
          <el-select
            v-model="form.sms_provider"
            placeholder="请选择短信服务商"
            style="width: 100%"
          >
            <el-option
              label="阿里云短信"
              value="aliyun"
            />
            <el-option
              label="腾讯云短信"
              value="tencent"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="Access Key ID">
          <el-input
            v-model="form.sms_access_key_id"
            :type="showPasswords.accessKeyId ? 'text' : 'password'"
            placeholder="请输入 Access Key ID"
          >
            <template #suffix>
              <el-icon
                class="password-toggle"
                @click="showPasswords.accessKeyId = !showPasswords.accessKeyId"
              >
                <View v-if="showPasswords.accessKeyId" />
                <Hide v-else />
              </el-icon>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item label="Access Key Secret">
          <el-input
            v-model="form.sms_access_key_secret"
            :type="showPasswords.accessKeySecret ? 'text' : 'password'"
            placeholder="请输入 Access Key Secret"
          >
            <template #suffix>
              <el-icon
                class="password-toggle"
                @click="showPasswords.accessKeySecret = !showPasswords.accessKeySecret"
              >
                <View v-if="showPasswords.accessKeySecret" />
                <Hide v-else />
              </el-icon>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item label="短信签名">
          <el-input
            v-model="form.sms_sign_name"
            placeholder="请输入短信签名，如：乡村守护"
          />
        </el-form-item>
        <el-form-item label="模板编码">
          <el-input
            v-model="form.sms_template_code"
            placeholder="请输入模板编码，如：SMS_123456"
          />
        </el-form-item>
        <el-form-item label="变量格式">
          <el-input
            v-model="form.sms_variable_format"
            placeholder="请输入变量格式，如：${var}"
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
          <el-icon><Connection /></el-icon>
          <span>测试连接</span>
        </el-button>
      </div>
    </el-card>

    <!-- 发送测试 -->
    <el-card
      shadow="never"
      class="config-card"
    >
      <template #header>
        <div class="card-header">
          <span class="card-title">发送测试</span>
          <span class="card-desc">验证短信服务是否可正常发送</span>
        </div>
      </template>
      <el-form
        label-width="140px"
        class="config-form"
      >
        <el-form-item label="接收手机号">
          <el-input
            v-model="testPhone"
            placeholder="请输入接收手机号"
            clearable
          />
        </el-form-item>
        <el-form-item label="模板变量">
          <el-input
            v-model="testVariables"
            placeholder="如: name=张三,type=预警,level=紧急"
            clearable
          />
        </el-form-item>
        <el-form-item label="发送操作">
          <el-button
            type="warning"
            :loading="sendingTest"
            @click="sendTestSms"
          >
            <el-icon><ChatDotSquare /></el-icon>
            <span>发送测试短信</span>
          </el-button>
        </el-form-item>
        <el-form-item
          v-if="testResult"
          label="发送结果"
        >
          <div class="test-result">
            <el-alert
              :title="testResult.title"
              :type="testResult.type"
              :description="testResult.message"
              show-icon
              :closable="false"
            />
          </div>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 调用统计 -->
    <el-card
      shadow="never"
      class="config-card"
    >
      <template #header>
        <div class="card-header">
          <span class="card-title">调用统计</span>
          <span class="card-desc">短信服务调用数据概览</span>
        </div>
      </template>
      <el-row :gutter="16">
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-value">
              {{ stats.today || 0 }}
            </div>
            <div class="stat-label">
              今日发送
            </div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card stat-success">
            <div class="stat-value">
              {{ stats.todayVerified || 0 }}
            </div>
            <div class="stat-label">
              今日成功
            </div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card stat-danger">
            <div class="stat-value">
              {{ stats.todayExpired || 0 }}
            </div>
            <div class="stat-label">
              今日失败
            </div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card stat-primary">
            <div class="stat-value">
              {{ stats.totalAll || 0 }}
            </div>
            <div class="stat-label">
              累计发送
            </div>
          </div>
        </el-col>
      </el-row>
    </el-card>

    <!-- 最近发送记录 -->
    <el-card
      shadow="never"
      class="config-card"
    >
      <template #header>
        <div class="card-header">
          <span class="card-title">最近发送记录</span>
          <span class="card-desc">最近10条短信发送记录</span>
        </div>
      </template>
      <el-table
        v-loading="loadingLogs"
        :data="logs"
        stripe
        style="width: 100%"
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
          show-overflow-tooltip
        />
        <el-table-column
          prop="status"
          label="状态"
          width="100"
          align="center"
        >
          <template #default="{ row }">
            <el-tag
              :type="row.status === 'success' || row.status === 'verified' ? 'success' : 'danger'"
              size="small"
              effect="light"
            >
              {{ row.status === 'success' || row.status === 'verified' ? '成功' : '失败' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          prop="user_name"
          label="关联用户"
          width="120"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            {{ row.user_name || row.username || '-' }}
          </template>
        </el-table-column>
        <el-table-column
          prop="ip"
          label="IP"
          width="140"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            {{ row.ip || row.ip_address || '-' }}
          </template>
        </el-table-column>
        <el-table-column
          prop="created_at"
          label="发送时间"
          min-width="180"
          show-overflow-tooltip
        />
      </el-table>
      <el-empty
        v-if="!loadingLogs && logs.length === 0"
        description="暂无发送记录"
        :image-size="80"
      />
    </el-card>
  </div>
</template>

<style scoped>
.sms-service-page {
  max-width: 1060px;
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

/* 状态卡片 - 蓝色渐变 */
.status-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-radius: 12px;
  margin-bottom: 20px;
  color: #fff;
  background: linear-gradient(135deg, #3b82f6, #2563eb);
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
  padding-left: 140px;
}

/* 测试结果 */
.test-result {
  width: 100%;
}

/* 统计卡片 */
.stat-card {
  background: var(--card, #fff);
  border: 1px solid var(--border, #e5e7eb);
  border-radius: 10px;
  padding: 20px 16px;
  text-align: center;
  transition: box-shadow 0.2s;
}

.stat-card:hover {
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--text, #1f2937);
  line-height: 1.2;
}

.stat-label {
  font-size: 13px;
  color: var(--text-secondary, #6b7280);
  margin-top: 8px;
}

.stat-success .stat-value {
  color: #10b981;
}

.stat-danger .stat-value {
  color: #ef4444;
}

.stat-primary .stat-value {
  color: #3b82f6;
}

/* 表格暗色覆盖 */
.config-card :deep(.el-table) {
  --el-table-border-color: var(--border, #e5e7eb);
  --el-table-header-bg-color: var(--bg, #f5f7fa);
  --el-table-text-color: var(--text, #1f2937);
  --el-table-header-text-color: var(--text-secondary, #6b7280);
}

/* Select 暗色覆盖 */
.config-form :deep(.el-select .el-input__wrapper) {
  background-color: var(--bg-secondary, #fff);
}
</style>
