<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Microphone, Cpu, Location, Promotion, View, Hide, ChatDotRound, Iphone } from '@element-plus/icons-vue'
import { getConfigs, updateConfig, testApiConnection } from '../../api/config'

const activeTab = ref('voice')
const saving = ref(false)
const testing = ref(false)

// 密码显示/隐藏控制
const showPasswords = reactive({
  voice_api_key: false,
  voice_api_secret: false,
  ai_api_key: false,
  map_api_key: false,
  map_api_secret: false,
  sms_access_key_id: false,
  sms_access_key_secret: false,
  push_app_key: false,
  push_master_secret: false,
})

// 表单数据
const form = reactive({
  // 语音服务
  voice_enabled: false,
  voice_app_id: '',
  voice_api_key: '',
  voice_api_secret: '',
  voice_language: 'zh_cn',
  voice_speaker: 'xiaoyan',
  // AI大模型
  ai_enabled: false,
  ai_provider: 'zhipu',
  ai_api_key: '',
  ai_endpoint: '',
  ai_model: '',
  ai_health_prompt: '',
  // 地图定位
  map_enabled: false,
  map_provider: 'amap',
  map_api_key: '',
  map_api_secret: '',
  map_fence_radius: 500,
  map_report_interval: 60,
  // 消息推送
  push_enabled: false,
  sms_provider: 'aliyun',
  sms_access_key_id: '',
  sms_access_key_secret: '',
  sms_sign: '',
  sms_template_code: '',
  push_provider: 'jpush',
  push_app_key: '',
  push_master_secret: '',
})

// 每个 Tab 对应的表单字段映射
const tabFieldsMap = {
  voice: [
    'voice_enabled', 'voice_app_id', 'voice_api_key', 'voice_api_secret',
    'voice_language', 'voice_speaker',
  ],
  ai: [
    'ai_enabled', 'ai_provider', 'ai_api_key', 'ai_endpoint',
    'ai_model', 'ai_health_prompt',
  ],
  map: [
    'map_enabled', 'map_provider', 'map_api_key', 'map_api_secret',
    'map_fence_radius', 'map_report_interval',
  ],
  push: [
    'push_enabled', 'sms_provider', 'sms_access_key_id', 'sms_access_key_secret',
    'sms_sign', 'sms_template_code', 'push_provider', 'push_app_key', 'push_master_secret',
  ],
}

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
          // 处理布尔值
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

// 切换总开关时立即保存
async function onSwitchChange(group) {
  const enabledKey = `${group}_enabled`
  try {
    await updateConfig(enabledKey, form[enabledKey])
    ElMessage.success(form[enabledKey] ? '服务已启用' : '服务已禁用')
  } catch (err) {
    console.error(err)
  }
}

// 保存当前Tab配置
async function saveConfig(group) {
  const fields = tabFieldsMap[group]
  if (!fields) return

  saving.value = true
  try {
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

// 测试连接
async function testConnection(group) {
  testing.value = true
  try {
    const res = await testApiConnection(group)
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

onMounted(() => {
  loadConfigs()
})
</script>

<template>
  <div class="page-container api-config-page">
    <div class="page-header">
      <div>
        <h2>API服务管理</h2>
        <p class="page-subtitle">
          管理平台接入的第三方服务配置
        </p>
      </div>
    </div>

    <el-tabs
      v-model="activeTab"
      class="config-tabs"
    >
      <!-- Tab 1: 语音服务 -->
      <el-tab-pane
        label="语音服务"
        name="voice"
      >
        <template #label>
          <span class="tab-label"><el-icon><Microphone /></el-icon> 语音服务</span>
        </template>

        <!-- 状态卡片 -->
        <div class="status-card voice-card">
          <div class="status-card-left">
            <el-icon
              :size="32"
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
              @change="onSwitchChange('voice')"
            />
          </div>
        </div>

        <!-- 配置表单 -->
        <div class="config-card">
          <el-form
            :model="form"
            label-width="140px"
            class="config-form"
          >
            <el-form-item label="App ID">
              <el-input
                v-model="form.voice_app_id"
                placeholder="请输入讯飞开放平台 App ID"
              />
            </el-form-item>
            <el-form-item label="API Key">
              <el-input
                v-model="form.voice_api_key"
                :type="showPasswords.voice_api_key ? 'text' : 'password'"
                placeholder="请输入 API Key"
              >
                <template #suffix>
                  <el-icon
                    class="password-toggle"
                    @click="showPasswords.voice_api_key = !showPasswords.voice_api_key"
                  >
                    <View v-if="showPasswords.voice_api_key" />
                    <Hide v-else />
                  </el-icon>
                </template>
              </el-input>
            </el-form-item>
            <el-form-item label="API Secret">
              <el-input
                v-model="form.voice_api_secret"
                :type="showPasswords.voice_api_secret ? 'text' : 'password'"
                placeholder="请输入 API Secret"
              >
                <template #suffix>
                  <el-icon
                    class="password-toggle"
                    @click="showPasswords.voice_api_secret = !showPasswords.voice_api_secret"
                  >
                    <View v-if="showPasswords.voice_api_secret" />
                    <Hide v-else />
                  </el-icon>
                </template>
              </el-input>
            </el-form-item>
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
            <el-form-item label="合成发音人">
              <el-select
                v-model="form.voice_speaker"
                placeholder="请选择合成发音人"
                style="width: 100%"
              >
                <el-option
                  label="小燕"
                  value="xiaoyan"
                />
                <el-option
                  label="小宇"
                  value="xiaoyu"
                />
                <el-option
                  label="小刚"
                  value="xiaogang"
                />
                <el-option
                  label="小梅"
                  value="xiaomei"
                />
              </el-select>
            </el-form-item>
          </el-form>
        </div>

        <div class="action-bar">
          <el-button
            type="primary"
            :loading="saving"
            @click="saveConfig('voice')"
          >
            保存配置
          </el-button>
          <el-button
            type="success"
            :loading="testing"
            @click="testConnection('voice')"
          >
            测试连接
          </el-button>
        </div>
      </el-tab-pane>

      <!-- Tab 2: AI大模型服务 -->
      <el-tab-pane
        label="AI大模型"
        name="ai"
      >
        <template #label>
          <span class="tab-label"><el-icon><Cpu /></el-icon> AI大模型</span>
        </template>

        <div class="status-card ai-card">
          <div class="status-card-left">
            <el-icon
              :size="32"
              color="#fff"
            >
              <Cpu />
            </el-icon>
            <div>
              <div class="status-card-title">
                AI大模型服务
              </div>
              <div class="status-card-desc">
                智能健康分析与对话服务
              </div>
            </div>
          </div>
          <div class="status-card-right">
            <span class="status-text">{{ form.ai_enabled ? '已启用' : '未启用' }}</span>
            <el-switch
              v-model="form.ai_enabled"
              @change="onSwitchChange('ai')"
            />
          </div>
        </div>

        <div class="config-card">
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
                :type="showPasswords.ai_api_key ? 'text' : 'password'"
                placeholder="请输入 API Key"
              >
                <template #suffix>
                  <el-icon
                    class="password-toggle"
                    @click="showPasswords.ai_api_key = !showPasswords.ai_api_key"
                  >
                    <View v-if="showPasswords.ai_api_key" />
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
                v-model="form.ai_endpoint"
                placeholder="请输入自定义接口地址"
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
                :rows="3"
                placeholder="请输入健康分析提示词"
              />
            </el-form-item>
          </el-form>
        </div>

        <div class="action-bar">
          <el-button
            type="primary"
            :loading="saving"
            @click="saveConfig('ai')"
          >
            保存配置
          </el-button>
          <el-button
            type="success"
            :loading="testing"
            @click="testConnection('ai')"
          >
            测试连接
          </el-button>
        </div>
      </el-tab-pane>

      <!-- Tab 3: 地图定位服务 -->
      <el-tab-pane
        label="地图定位"
        name="map"
      >
        <template #label>
          <span class="tab-label"><el-icon><Location /></el-icon> 地图定位</span>
        </template>

        <div class="status-card map-card">
          <div class="status-card-left">
            <el-icon
              :size="32"
              color="#fff"
            >
              <Location />
            </el-icon>
            <div>
              <div class="status-card-title">
                地图定位服务
              </div>
              <div class="status-card-desc">
                老人定位追踪与电子围栏服务
              </div>
            </div>
          </div>
          <div class="status-card-right">
            <span class="status-text">{{ form.map_enabled ? '已启用' : '未启用' }}</span>
            <el-switch
              v-model="form.map_enabled"
              @change="onSwitchChange('map')"
            />
          </div>
        </div>

        <div class="config-card">
          <el-form
            :model="form"
            label-width="140px"
            class="config-form"
          >
            <el-form-item label="服务提供商">
              <el-select
                v-model="form.map_provider"
                placeholder="请选择服务提供商"
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
                :type="showPasswords.map_api_key ? 'text' : 'password'"
                placeholder="请输入 API Key"
              >
                <template #suffix>
                  <el-icon
                    class="password-toggle"
                    @click="showPasswords.map_api_key = !showPasswords.map_api_key"
                  >
                    <View v-if="showPasswords.map_api_key" />
                    <Hide v-else />
                  </el-icon>
                </template>
              </el-input>
            </el-form-item>
            <el-form-item label="API Secret">
              <el-input
                v-model="form.map_api_secret"
                :type="showPasswords.map_api_secret ? 'text' : 'password'"
                placeholder="请输入 API Secret"
              >
                <template #suffix>
                  <el-icon
                    class="password-toggle"
                    @click="showPasswords.map_api_secret = !showPasswords.map_api_secret"
                  >
                    <View v-if="showPasswords.map_api_secret" />
                    <Hide v-else />
                  </el-icon>
                </template>
              </el-input>
            </el-form-item>
            <el-form-item label="电子围栏半径">
              <el-input-number
                v-model="form.map_fence_radius"
                :min="100"
                :max="10000"
                :step="100"
              />
              <span class="input-unit">米</span>
            </el-form-item>
            <el-form-item label="定位上报间隔">
              <el-input-number
                v-model="form.map_report_interval"
                :min="10"
                :max="3600"
                :step="10"
              />
              <span class="input-unit">秒</span>
            </el-form-item>
          </el-form>
        </div>

        <div class="action-bar">
          <el-button
            type="primary"
            :loading="saving"
            @click="saveConfig('map')"
          >
            保存配置
          </el-button>
          <el-button
            type="success"
            :loading="testing"
            @click="testConnection('map')"
          >
            测试连接
          </el-button>
        </div>
      </el-tab-pane>

      <!-- Tab 4: 消息推送服务 -->
      <el-tab-pane
        label="消息推送"
        name="push"
      >
        <template #label>
          <span class="tab-label"><el-icon><Promotion /></el-icon> 消息推送</span>
        </template>

        <div class="status-card push-card">
          <div class="status-card-left">
            <el-icon
              :size="32"
              color="#fff"
            >
              <Promotion />
            </el-icon>
            <div>
              <div class="status-card-title">
                消息推送服务
              </div>
              <div class="status-card-desc">
                短信通知与APP推送服务
              </div>
            </div>
          </div>
          <div class="status-card-right">
            <span class="status-text">{{ form.push_enabled ? '已启用' : '未启用' }}</span>
            <el-switch
              v-model="form.push_enabled"
              @change="onSwitchChange('push')"
            />
          </div>
        </div>

        <!-- 短信服务 -->
        <div class="config-card">
          <div class="sub-card-title">
            <el-icon><ChatDotRound /></el-icon>
            <span>短信服务</span>
          </div>
          <el-form
            :model="form"
            label-width="140px"
            class="config-form"
          >
            <el-form-item label="服务提供商">
              <el-select
                v-model="form.sms_provider"
                placeholder="请选择服务提供商"
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
                :type="showPasswords.sms_access_key_id ? 'text' : 'password'"
                placeholder="请输入 Access Key ID"
              >
                <template #suffix>
                  <el-icon
                    class="password-toggle"
                    @click="showPasswords.sms_access_key_id = !showPasswords.sms_access_key_id"
                  >
                    <View v-if="showPasswords.sms_access_key_id" />
                    <Hide v-else />
                  </el-icon>
                </template>
              </el-input>
            </el-form-item>
            <el-form-item label="Access Key Secret">
              <el-input
                v-model="form.sms_access_key_secret"
                :type="showPasswords.sms_access_key_secret ? 'text' : 'password'"
                placeholder="请输入 Access Key Secret"
              >
                <template #suffix>
                  <el-icon
                    class="password-toggle"
                    @click="showPasswords.sms_access_key_secret = !showPasswords.sms_access_key_secret"
                  >
                    <View v-if="showPasswords.sms_access_key_secret" />
                    <Hide v-else />
                  </el-icon>
                </template>
              </el-input>
            </el-form-item>
            <el-form-item label="短信签名">
              <el-input
                v-model="form.sms_sign"
                placeholder="请输入短信签名"
              />
            </el-form-item>
            <el-form-item label="模板Code">
              <el-input
                v-model="form.sms_template_code"
                placeholder="请输入短信模板Code"
              />
            </el-form-item>
          </el-form>
        </div>

        <!-- APP推送 -->
        <div class="config-card">
          <div class="sub-card-title">
            <el-icon><Iphone /></el-icon>
            <span>APP推送</span>
          </div>
          <el-form
            :model="form"
            label-width="140px"
            class="config-form"
          >
            <el-form-item label="服务提供商">
              <el-select
                v-model="form.push_provider"
                placeholder="请选择服务提供商"
                style="width: 100%"
              >
                <el-option
                  label="极光推送"
                  value="jpush"
                />
                <el-option
                  label="个推"
                  value="getui"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="App Key">
              <el-input
                v-model="form.push_app_key"
                :type="showPasswords.push_app_key ? 'text' : 'password'"
                placeholder="请输入 App Key"
              >
                <template #suffix>
                  <el-icon
                    class="password-toggle"
                    @click="showPasswords.push_app_key = !showPasswords.push_app_key"
                  >
                    <View v-if="showPasswords.push_app_key" />
                    <Hide v-else />
                  </el-icon>
                </template>
              </el-input>
            </el-form-item>
            <el-form-item label="Master Secret">
              <el-input
                v-model="form.push_master_secret"
                :type="showPasswords.push_master_secret ? 'text' : 'password'"
                placeholder="请输入 Master Secret"
              >
                <template #suffix>
                  <el-icon
                    class="password-toggle"
                    @click="showPasswords.push_master_secret = !showPasswords.push_master_secret"
                  >
                    <View v-if="showPasswords.push_master_secret" />
                    <Hide v-else />
                  </el-icon>
                </template>
              </el-input>
            </el-form-item>
          </el-form>
        </div>

        <div class="action-bar">
          <el-button
            type="primary"
            :loading="saving"
            @click="saveConfig('push')"
          >
            保存配置
          </el-button>
          <el-button
            type="success"
            :loading="testing"
            @click="testConnection('push')"
          >
            测试连接
          </el-button>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<style scoped>
.api-config-page {
  max-width: 960px;
}

.page-subtitle {
  font-size: 13px;
  color: var(--text-muted);
  margin-top: 4px;
}

/* Tab 样式 */
.config-tabs {
  --el-tabs-header-height: 44px;
}

.config-tabs :deep(.el-tabs__nav-wrap::after) {
  background-color: var(--border);
}

.config-tabs :deep(.el-tabs__item) {
  color: var(--text-secondary);
  font-size: 14px;
  height: 44px;
  line-height: 44px;
}

.config-tabs :deep(.el-tabs__item.is-active) {
  color: var(--primary);
}

.config-tabs :deep(.el-tabs__item:hover) {
  color: var(--primary-light);
}

.config-tabs :deep(.el-tabs__active-bar) {
  background-color: var(--primary);
}

.tab-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

/* 状态卡片 */
.status-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-radius: 12px;
  margin-bottom: 16px;
  color: #fff;
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

/* 不同Tab的渐变颜色 */
.voice-card {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
}

.ai-card {
  background: linear-gradient(135deg, #8b5cf6, #7c3aed);
}

.map-card {
  background: linear-gradient(135deg, #10b981, #059669);
}

.push-card {
  background: linear-gradient(135deg, #f59e0b, #d97706);
}

/* 配置卡片 */
.config-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 16px;
}

.sub-card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border);
}

.config-form {
  max-width: 600px;
}

.config-form .el-form-item {
  margin-bottom: 18px;
}

.input-unit {
  margin-left: 8px;
  color: var(--text-muted);
  font-size: 13px;
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
  padding: 16px 0;
}

/* Switch 暗色覆盖 */
.status-card :deep(.el-switch) {
  --el-switch-on-color: rgba(255, 255, 255, 0.9);
  --el-switch-off-color: rgba(255, 255, 255, 0.3);
}

/* InputNumber 暗色覆盖 */
.config-form :deep(.el-input-number) {
  width: 200px;
}

.config-form :deep(.el-input-number .el-input__wrapper) {
  background-color: var(--bg-secondary) !important;
  box-shadow: 0 0 0 1px var(--border) inset !important;
}

.config-form :deep(.el-input-number .el-input-number__decrease),
.config-form :deep(.el-input-number .el-input-number__increase) {
  background: var(--bg-secondary);
  border-color: var(--border);
  color: var(--text-secondary);
}

.config-form :deep(.el-input-number .el-input-number__decrease:hover),
.config-form :deep(.el-input-number .el-input-number__increase:hover) {
  color: var(--primary);
}
</style>
