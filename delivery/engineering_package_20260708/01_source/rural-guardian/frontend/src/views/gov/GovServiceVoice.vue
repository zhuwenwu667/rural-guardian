<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { View, Hide, Microphone, ArrowLeft } from '@element-plus/icons-vue'
import { getConfigs, updateConfig } from '../../api/config'
import { testServiceConnection } from '../../api/service'

const router = useRouter()
const saving = ref(false)
const testing = ref(false)
const testingRecognition = ref(false)
const testingSynthesis = ref(false)
const testText = ref('')
const testResult = ref(null)

// 密码显示/隐藏控制
const showPasswords = reactive({
  apiKey: false,
  apiSecret: false,
})

// 表单数据
const form = reactive({
  voice_enabled: false,
  xfyun_app_id: '',
  xfyun_api_key: '',
  xfyun_api_secret: '',
  voice_language: 'zh_cn',
  voice_dialect: 'mandarin',
  voice_sample_rate: 16000,
  voice_tts_voice: 'xiaoyan',
  voice_tts_speed: 50,
  voice_tts_pitch: 50,
  voice_tts_volume: 50,
})

// 配置项键名列表
const configKeys = [
  'voice_enabled',
  'xfyun_app_id',
  'xfyun_api_key',
  'xfyun_api_secret',
  'voice_language',
  'voice_dialect',
  'voice_sample_rate',
  'voice_tts_voice',
  'voice_tts_speed',
  'voice_tts_pitch',
  'voice_tts_volume',
]

// 加载配置
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

// 切换启用/禁用开关
async function onSwitchChange() {
  try {
    await updateConfig('voice_enabled', form.voice_enabled)
    ElMessage.success(form.voice_enabled ? '语音服务已启用' : '语音服务已禁用')
  } catch (err) {
    console.error(err)
    ElMessage.error('操作失败')
  }
}

// 保存配置
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

// 测试连接
async function testConnection() {
  testing.value = true
  try {
    const res = await testServiceConnection('voice')
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

// 测试语音识别（模拟）
function testRecognition() {
  testingRecognition.value = true
  testResult.value = null
  setTimeout(() => {
    testingRecognition.value = false
    testResult.value = {
      type: 'warning',
      title: '模拟测试',
      message: '语音识别功能需要在实际设备上使用麦克风进行测试。当前为管理后台环境，无法直接访问麦克风。请部署至终端设备后进行实际语音识别测试。',
    }
  }, 1500)
}

// 测试语音合成（模拟）
function testSynthesis() {
  if (!testText.value.trim()) {
    ElMessage.warning('请输入测试文本')
    return
  }
  testingSynthesis.value = true
  testResult.value = null
  setTimeout(() => {
    testingSynthesis.value = false
    testResult.value = {
      type: 'warning',
      title: '模拟测试',
      message: `语音合成功能已模拟调用。文本内容："${testText.value}"。实际合成效果需要在终端设备上播放音频进行验证，管理后台环境暂不支持直接播放合成音频。`,
    }
  }, 1500)
}

onMounted(() => {
  loadConfigs()
})
</script>

<template>
  <div class="page-container voice-service-page">
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
        <h2>语音服务管理</h2>
        <p class="page-subtitle">
          科大讯飞语音识别与合成服务配置
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
          <Microphone />
        </el-icon>
        <div>
          <div class="status-card-title">
            语音服务（科大讯飞）
          </div>
          <div class="status-card-desc">
            语音识别与合成服务，用于老人语音交互
          </div>
        </div>
      </div>
      <div class="status-card-right">
        <span class="status-text">{{ form.voice_enabled ? '已启用' : '未启用' }}</span>
        <el-switch
          v-model="form.voice_enabled"
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
          <span class="card-desc">讯飞开放平台应用凭证</span>
        </div>
      </template>
      <el-form
        :model="form"
        label-width="120px"
        class="config-form"
      >
        <el-form-item label="App ID">
          <el-input
            v-model="form.xfyun_app_id"
            placeholder="请输入讯飞开放平台 App ID"
          />
        </el-form-item>
        <el-form-item label="API Key">
          <el-input
            v-model="form.xfyun_api_key"
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
            v-model="form.xfyun_api_secret"
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

    <!-- 语音识别配置 -->
    <el-card
      shadow="never"
      class="config-card"
    >
      <template #header>
        <div class="card-header">
          <span class="card-title">语音识别配置</span>
          <span class="card-desc">语音转文字相关参数</span>
        </div>
      </template>
      <el-form
        :model="form"
        label-width="120px"
        class="config-form"
      >
        <el-form-item label="识别语言">
          <el-select
            v-model="form.voice_language"
            placeholder="请选择识别语言"
            style="width: 100%"
          >
            <el-option
              label="普通话"
              value="zh_cn"
            />
            <el-option
              label="天津方言"
              value="zh_tj"
            />
            <el-option
              label="四川方言"
              value="zh_sc"
            />
            <el-option
              label="粤语"
              value="zh_yue"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="方言模式">
          <el-select
            v-model="form.voice_dialect"
            placeholder="请选择方言模式"
            style="width: 100%"
          >
            <el-option
              label="普通话（默认）"
              value="mandarin"
            />
            <el-option
              label="方言（带方言普通话）"
              value="dialect"
            />
            <el-option
              label="纯方言"
              value="pure_dialect"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="采样率">
          <el-select
            v-model="form.voice_sample_rate"
            placeholder="请选择采样率"
            style="width: 100%"
          >
            <el-option
              label="8000 Hz（电话语音）"
              :value="8000"
            />
            <el-option
              label="16000 Hz（推荐）"
              :value="16000"
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

    <!-- 语音合成配置 -->
    <el-card
      shadow="never"
      class="config-card"
    >
      <template #header>
        <div class="card-header">
          <span class="card-title">语音合成配置</span>
          <span class="card-desc">文字转语音相关参数</span>
        </div>
      </template>
      <el-form
        :model="form"
        label-width="120px"
        class="config-form"
      >
        <el-form-item label="发音人">
          <el-select
            v-model="form.voice_tts_voice"
            placeholder="请选择发音人"
            style="width: 100%"
          >
            <el-option
              label="小燕（女声，亲和）"
              value="xiaoyan"
            />
            <el-option
              label="小宇（男声，沉稳）"
              value="xiaoyu"
            />
            <el-option
              label="小刚（男声，磁性）"
              value="xiaogang"
            />
            <el-option
              label="小梅（女声，温柔）"
              value="xiaomei"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="语速">
          <div class="slider-row">
            <el-slider
              v-model="form.voice_tts_speed"
              :min="0"
              :max="100"
              :step="1"
              show-input
              :show-input-controls="false"
              input-size="small"
            />
          </div>
        </el-form-item>
        <el-form-item label="音调">
          <div class="slider-row">
            <el-slider
              v-model="form.voice_tts_pitch"
              :min="0"
              :max="100"
              :step="1"
              show-input
              :show-input-controls="false"
              input-size="small"
            />
          </div>
        </el-form-item>
        <el-form-item label="音量">
          <div class="slider-row">
            <el-slider
              v-model="form.voice_tts_volume"
              :min="0"
              :max="100"
              :step="1"
              show-input
              :show-input-controls="false"
              input-size="small"
            />
          </div>
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

    <!-- 语音测试 -->
    <el-card
      shadow="never"
      class="config-card"
    >
      <template #header>
        <div class="card-header">
          <span class="card-title">语音测试</span>
          <span class="card-desc">验证语音识别与合成功能是否正常</span>
        </div>
      </template>
      <el-form
        label-width="120px"
        class="config-form"
      >
        <el-form-item label="测试文本">
          <el-input
            v-model="testText"
            type="textarea"
            :rows="3"
            placeholder="请输入用于语音合成测试的文本内容"
          />
        </el-form-item>
        <el-form-item label="测试操作">
          <div class="test-buttons">
            <el-button
              type="warning"
              :loading="testingRecognition"
              @click="testRecognition"
            >
              <el-icon><Microphone /></el-icon>
              <span>测试识别</span>
            </el-button>
            <el-button
              type="primary"
              :loading="testingSynthesis"
              @click="testSynthesis"
            >
              <el-icon><Microphone /></el-icon>
              <span>测试合成</span>
            </el-button>
          </div>
        </el-form-item>
        <el-form-item
          v-if="testResult"
          label="测试结果"
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
  </div>
</template>

<style scoped>
.voice-service-page {
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
  padding-left: 120px;
}

/* 滑块行 */
.slider-row {
  width: 100%;
  padding-right: 80px;
}

.slider-row :deep(.el-slider__runway) {
  margin-right: 80px;
}

/* 测试按钮 */
.test-buttons {
  display: flex;
  gap: 12px;
}

/* 测试结果 */
.test-result {
  width: 100%;
}

/* Select 暗色覆盖 */
.config-form :deep(.el-select .el-input__wrapper) {
  background-color: var(--bg-secondary, #fff);
}

/* Slider 暗色覆盖 */
.config-form :deep(.el-slider__bar) {
  background-color: var(--primary);
}

.config-form :deep(.el-slider__button) {
  border-color: var(--primary);
}
</style>
