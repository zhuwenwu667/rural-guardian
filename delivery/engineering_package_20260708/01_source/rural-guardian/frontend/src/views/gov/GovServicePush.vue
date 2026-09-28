<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { View, Hide, Promotion, ArrowLeft, Plus, Edit, Delete, ChatDotRound, Iphone } from '@element-plus/icons-vue'
import { getConfigs, updateConfig } from '../../api/config'
import { testServiceConnection, getServiceLogs, getTemplates, createTemplate, updateTemplate, deleteTemplate } from '../../api/service'

// ==================== 通用状态 ====================
const saving = ref(false)
const testing = ref(false)
const activeTab = ref('sms')

// 密码显示/隐藏控制
const showPasswords = reactive({
  smsSecret: false,
  pushSecret: false,
})

// ==================== 短信服务表单 ====================
const smsForm = reactive({
  sms_enabled: false,
  sms_provider: '',
  sms_access_key_id: '',
  sms_access_key_secret: '',
  sms_sign_name: '',
  sms_template_code: '',
})

const smsConfigKeys = [
  'sms_enabled',
  'sms_provider',
  'sms_access_key_id',
  'sms_access_key_secret',
  'sms_sign_name',
  'sms_template_code',
]

// ==================== APP推送表单 ====================
const pushForm = reactive({
  push_enabled: false,
  push_provider: '',
  push_app_key: '',
  push_master_secret: '',
})

const pushConfigKeys = [
  'push_enabled',
  'push_provider',
  'push_app_key',
  'push_master_secret',
]

// 总开关（短信或推送任一启用即为启用）
const pushEnabled = ref(false)

function syncPushEnabled() {
  pushEnabled.value = smsForm.sms_enabled || pushForm.push_enabled
}

// ==================== 推送规则（静态数据） ====================
const pushRules = reactive([
  {
    level: 'CRITICAL',
    levelType: 'danger',
    sms: true,
    appPush: true,
    targets: ['专员', '家属', '管理员'],
    description: '紧急告警，短信与APP推送同时发送，通知所有相关人员',
  },
  {
    level: 'HIGH',
    levelType: 'warning',
    sms: true,
    appPush: true,
    targets: ['专员', '家属'],
    description: '高级告警，短信与APP推送同时发送，通知专员和家属',
  },
  {
    level: 'MEDIUM',
    levelType: '',
    sms: false,
    appPush: true,
    targets: ['专员'],
    description: '中级告警，仅通过APP推送通知专员',
  },
  {
    level: 'LOW',
    levelType: 'info',
    sms: false,
    appPush: false,
    targets: ['仅记录'],
    description: '低级告警，仅记录日志，不主动推送通知',
  },
])

// ==================== 消息模板 ====================
const templates = ref([])
const loadingTemplates = ref(false)
const savingTemplate = ref(false)
const templateDialogVisible = ref(false)

const templateTypeLabelMap = {
  sms: '短信',
  app_push: 'APP推送',
  voice: '语音',
}

const templateTypeTagMap = {
  sms: 'warning',
  app_push: 'primary',
  voice: 'success',
}

const defaultTemplateForm = () => ({
  id: null,
  name: '',
  type: 'sms',
  channel: '',
  content: '',
  variables: '',
  status: 1,
})

const templateForm = reactive(defaultTemplateForm())

function openTemplateDialog(row) {
  if (row) {
    Object.assign(templateForm, {
      id: row.id,
      name: row.name,
      type: row.type,
      channel: row.channel,
      content: row.content,
      variables: typeof row.variables === 'object' ? JSON.stringify(row.variables, null, 2) : (row.variables || ''),
      status: row.status,
    })
  } else {
    Object.assign(templateForm, defaultTemplateForm())
  }
  templateDialogVisible.value = true
}

async function fetchTemplates() {
  loadingTemplates.value = true
  try {
    const res = await getTemplates()
    if (res.code === 200) {
      templates.value = res.data || []
    }
  } catch (err) {
    console.error('获取消息模板失败:', err)
  } finally {
    loadingTemplates.value = false
  }
}

async function handleSaveTemplate() {
  if (!templateForm.name.trim()) {
    ElMessage.warning('请输入模板名称')
    return
  }
  if (!templateForm.content.trim()) {
    ElMessage.warning('请输入模板内容')
    return
  }
  savingTemplate.value = true
  try {
    const payload = {
      name: templateForm.name,
      type: templateForm.type,
      channel: templateForm.channel,
      content: templateForm.content,
      variables: templateForm.variables || null,
      status: templateForm.status,
    }
    let res
    if (templateForm.id) {
      res = await updateTemplate(templateForm.id, payload)
    } else {
      res = await createTemplate(payload)
    }
    if (res.code === 200) {
      ElMessage.success(templateForm.id ? '模板更新成功' : '模板创建成功')
      templateDialogVisible.value = false
      fetchTemplates()
    } else {
      ElMessage.error(res.message || '操作失败')
    }
  } catch (err) {
    ElMessage.error('操作失败')
  } finally {
    savingTemplate.value = false
  }
}

async function handleDeleteTemplate(row) {
  try {
    await ElMessageBox.confirm(`确定要删除模板"${row.name}"吗？`, '确认删除', {
      type: 'warning',
      confirmButtonText: '确定',
      cancelButtonText: '取消',
    })
    const res = await deleteTemplate(row.id)
    if (res.code === 200) {
      ElMessage.success('模板已删除')
      fetchTemplates()
    } else {
      ElMessage.error(res.message || '删除失败')
    }
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

// ==================== 发送记录 ====================
const logs = ref([])
const loadingLogs = ref(false)
const logTotal = ref(0)
const logPagination = reactive({
  page: 1,
  pageSize: 10,
})
const logFilters = reactive({
  service_group: '',
  status: '',
})

const serviceLabelMap = {
  sms: '短信',
  push: '推送',
  sms_aliyun: '阿里云短信',
  sms_tencent: '腾讯云短信',
  jpush: '极光推送',
  getui: '个推',
}

const serviceTagTypeMap = {
  sms: 'warning',
  push: '',
  sms_aliyun: 'warning',
  sms_tencent: 'warning',
  jpush: '',
  getui: '',
}

async function fetchLogs() {
  loadingLogs.value = true
  try {
    const params = {
      page: logPagination.page,
      page_size: logPagination.pageSize,
    }
    if (logFilters.service_group) {
      params.service_group = logFilters.service_group
    }
    if (logFilters.status) {
      params.status = logFilters.status
    }
    const res = await getServiceLogs(params)
    if (res.code === 200) {
      const data = res.data || {}
      logs.value = Array.isArray(data) ? data : (data.list || data.records || [])
      logTotal.value = data.total || logs.value.length
    }
  } catch (err) {
    console.error('获取发送记录失败:', err)
  } finally {
    loadingLogs.value = false
  }
}

// ==================== 配置加载与保存 ====================
async function loadConfigs() {
  try {
    const res = await getConfigs()
    if (res.code === 200 && res.data) {
      const configs = Array.isArray(res.data) ? res.data : []
      configs.forEach((item) => {
        const key = item.config_key || item.key
        const value = item.config_value !== undefined ? item.config_value : item.value
        if (key && key in smsForm) {
          if (value === 'true' || value === true) {
            smsForm[key] = true
          } else if (value === 'false' || value === false) {
            smsForm[key] = false
          } else {
            smsForm[key] = value
          }
        }
        if (key && key in pushForm) {
          if (value === 'true' || value === true) {
            pushForm[key] = true
          } else if (value === 'false' || value === false) {
            pushForm[key] = false
          } else {
            pushForm[key] = value
          }
        }
      })
      syncPushEnabled()
    }
  } catch (err) {
    console.error('加载配置失败:', err)
  }
}

async function onSwitchChange(val) {
  try {
    await updateConfig('sms_enabled', val)
    await updateConfig('push_enabled', val)
    smsForm.sms_enabled = val
    pushForm.push_enabled = val
    ElMessage.success(val ? '消息推送服务已启用' : '消息推送服务已禁用')
  } catch (err) {
    console.error(err)
    ElMessage.error('操作失败')
    syncPushEnabled()
  }
}

async function saveSmsConfig() {
  saving.value = true
  try {
    let successCount = 0
    for (const key of smsConfigKeys) {
      try {
        await updateConfig(key, smsForm[key])
        successCount++
      } catch (err) {
        console.error(`保存 ${key} 失败:`, err)
      }
    }
    if (successCount === smsConfigKeys.length) {
      ElMessage.success('短信服务配置保存成功')
    } else {
      ElMessage.warning(`已保存 ${successCount}/${smsConfigKeys.length} 项配置`)
    }
    syncPushEnabled()
  } catch (err) {
    ElMessage.error('保存配置失败')
  } finally {
    saving.value = false
  }
}

async function savePushConfig() {
  saving.value = true
  try {
    let successCount = 0
    for (const key of pushConfigKeys) {
      try {
        await updateConfig(key, pushForm[key])
        successCount++
      } catch (err) {
        console.error(`保存 ${key} 失败:`, err)
      }
    }
    if (successCount === pushConfigKeys.length) {
      ElMessage.success('APP推送配置保存成功')
    } else {
      ElMessage.warning(`已保存 ${successCount}/${pushConfigKeys.length} 项配置`)
    }
    syncPushEnabled()
  } catch (err) {
    ElMessage.error('保存配置失败')
  } finally {
    saving.value = false
  }
}

async function testSmsConnection() {
  testing.value = true
  try {
    const res = await testServiceConnection('sms')
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

async function testPushConnection() {
  testing.value = true
  try {
    const res = await testServiceConnection('push')
    if (res.code === 200) {
      ElMessage.success('APP推送服务连接测试成功')
    } else {
      ElMessage.error(res.message || '连接测试失败')
    }
  } catch (err) {
    ElMessage.error('连接测试失败，请检查配置')
  } finally {
    testing.value = false
  }
}

// ==================== 初始化 ====================
onMounted(() => {
  loadConfigs()
  fetchTemplates()
  fetchLogs()
})
</script>

<template>
  <div class="page-container push-service-page">
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
        <h2>消息推送服务管理</h2>
        <p class="page-subtitle">
          短信通知与APP推送服务配置、推送规则与消息模板管理
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
          <Promotion />
        </el-icon>
        <div>
          <div class="status-card-title">
            消息推送服务
          </div>
          <div class="status-card-desc">
            短信通知与APP消息推送，用于告警及时触达相关人员
          </div>
        </div>
      </div>
      <div class="status-card-right">
        <span class="status-text">{{ smsForm.sms_enabled || pushForm.push_enabled ? '已启用' : '未启用' }}</span>
        <el-switch
          v-model="pushEnabled"
          @change="onSwitchChange"
        />
      </div>
    </div>

    <!-- 标签页 -->
    <el-tabs
      v-model="activeTab"
      class="push-tabs"
    >
      <!-- Tab 1: 短信服务 -->
      <el-tab-pane
        label="短信服务"
        name="sms"
      >
        <el-card
          shadow="never"
          class="config-card"
        >
          <template #header>
            <div class="card-header">
              <div class="card-header-left">
                <el-icon
                  :size="18"
                  color="#f59e0b"
                >
                  <ChatDotRound />
                </el-icon>
                <span class="card-title">短信服务配置</span>
              </div>
              <span class="card-desc">短信服务商接入参数</span>
            </div>
          </template>
          <el-form
            :model="smsForm"
            label-width="140px"
            class="config-form"
          >
            <el-form-item label="短信服务商">
              <el-select
                v-model="smsForm.sms_provider"
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
                v-model="smsForm.sms_access_key_id"
                placeholder="请输入 Access Key ID"
              />
            </el-form-item>
            <el-form-item label="Access Key Secret">
              <el-input
                v-model="smsForm.sms_access_key_secret"
                :type="showPasswords.smsSecret ? 'text' : 'password'"
                placeholder="请输入 Access Key Secret"
              >
                <template #suffix>
                  <el-icon
                    class="password-toggle"
                    @click="showPasswords.smsSecret = !showPasswords.smsSecret"
                  >
                    <View v-if="showPasswords.smsSecret" />
                    <Hide v-else />
                  </el-icon>
                </template>
              </el-input>
            </el-form-item>
            <el-form-item label="短信签名">
              <el-input
                v-model="smsForm.sms_sign_name"
                placeholder="请输入短信签名名称"
              />
            </el-form-item>
            <el-form-item label="模板编码">
              <el-input
                v-model="smsForm.sms_template_code"
                placeholder="请输入短信模板编码"
              />
            </el-form-item>
          </el-form>
          <div class="action-bar">
            <el-button
              type="primary"
              :loading="saving"
              @click="saveSmsConfig"
            >
              保存配置
            </el-button>
            <el-button
              type="success"
              :loading="testing"
              @click="testSmsConnection"
            >
              测试连接
            </el-button>
          </div>
        </el-card>
      </el-tab-pane>

      <!-- Tab 2: APP推送 -->
      <el-tab-pane
        label="APP推送"
        name="push"
      >
        <el-card
          shadow="never"
          class="config-card"
        >
          <template #header>
            <div class="card-header">
              <div class="card-header-left">
                <el-icon
                  :size="18"
                  color="#f59e0b"
                >
                  <Iphone />
                </el-icon>
                <span class="card-title">APP推送配置</span>
              </div>
              <span class="card-desc">移动端消息推送服务接入参数</span>
            </div>
          </template>
          <el-form
            :model="pushForm"
            label-width="140px"
            class="config-form"
          >
            <el-form-item label="推送服务商">
              <el-select
                v-model="pushForm.push_provider"
                placeholder="请选择推送服务商"
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
                v-model="pushForm.push_app_key"
                placeholder="请输入 App Key"
              />
            </el-form-item>
            <el-form-item label="Master Secret">
              <el-input
                v-model="pushForm.push_master_secret"
                :type="showPasswords.pushSecret ? 'text' : 'password'"
                placeholder="请输入 Master Secret"
              >
                <template #suffix>
                  <el-icon
                    class="password-toggle"
                    @click="showPasswords.pushSecret = !showPasswords.pushSecret"
                  >
                    <View v-if="showPasswords.pushSecret" />
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
              @click="savePushConfig"
            >
              保存配置
            </el-button>
            <el-button
              type="success"
              :loading="testing"
              @click="testPushConnection"
            >
              测试连接
            </el-button>
          </div>
        </el-card>
      </el-tab-pane>

      <!-- Tab 3: 推送规则 -->
      <el-tab-pane
        label="推送规则"
        name="rules"
      >
        <el-card
          shadow="never"
          class="config-card"
        >
          <template #header>
            <div class="card-header">
              <div class="card-header-left">
                <el-icon
                  :size="18"
                  color="#f59e0b"
                >
                  <Promotion />
                </el-icon>
                <span class="card-title">推送规则配置</span>
              </div>
              <span class="card-desc">不同告警级别的推送方式与通知对象</span>
            </div>
          </template>
          <el-table
            :data="pushRules"
            stripe
            style="width: 100%"
            class="rules-table"
          >
            <el-table-column
              prop="level"
              label="告警级别"
              width="120"
            >
              <template #default="{ row }">
                <el-tag
                  :type="row.levelType"
                  effect="dark"
                  size="small"
                >
                  {{ row.level }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column
              prop="sms"
              label="短信"
              width="100"
              align="center"
            >
              <template #default="{ row }">
                <span :class="['rule-icon', row.sms ? 'rule-enabled' : 'rule-disabled']">
                  {{ row.sms ? '\u2705' : '\u274C' }}
                </span>
              </template>
            </el-table-column>
            <el-table-column
              prop="appPush"
              label="APP推送"
              width="100"
              align="center"
            >
              <template #default="{ row }">
                <span :class="['rule-icon', row.appPush ? 'rule-enabled' : 'rule-disabled']">
                  {{ row.appPush ? '\u2705' : '\u274C' }}
                </span>
              </template>
            </el-table-column>
            <el-table-column
              prop="targets"
              label="通知对象"
              min-width="200"
            >
              <template #default="{ row }">
                <div class="targets-list">
                  <el-tag
                    v-for="target in row.targets"
                    :key="target"
                    size="small"
                    effect="plain"
                    class="target-tag"
                  >
                    {{ target }}
                  </el-tag>
                </div>
              </template>
            </el-table-column>
            <el-table-column
              prop="description"
              label="说明"
              min-width="200"
              show-overflow-tooltip
            />
          </el-table>
          <div class="rules-note">
            <el-icon
              :size="14"
              color="#f59e0b"
            >
              <Promotion />
            </el-icon>
            <span>推送规则由系统预设，如需调整请联系管理员修改系统配置。</span>
          </div>
        </el-card>
      </el-tab-pane>

      <!-- Tab 4: 消息模板 -->
      <el-tab-pane
        label="消息模板"
        name="templates"
      >
        <el-card
          shadow="never"
          class="config-card"
        >
          <template #header>
            <div class="card-header">
              <div class="card-header-left">
                <el-icon
                  :size="18"
                  color="#f59e0b"
                >
                  <ChatDotRound />
                </el-icon>
                <span class="card-title">消息模板管理</span>
              </div>
              <el-button
                type="primary"
                size="small"
                @click="openTemplateDialog(null)"
              >
                <el-icon><Plus /></el-icon>
                <span>添加模板</span>
              </el-button>
            </div>
          </template>
          <el-table
            v-loading="loadingTemplates"
            :data="templates"
            stripe
            style="width: 100%"
          >
            <el-table-column
              prop="name"
              label="模板名称"
              width="160"
              show-overflow-tooltip
            />
            <el-table-column
              prop="type"
              label="类型"
              width="110"
              align="center"
            >
              <template #default="{ row }">
                <el-tag
                  :type="templateTypeTagMap[row.type] || 'info'"
                  size="small"
                  effect="plain"
                >
                  {{ templateTypeLabelMap[row.type] || row.type }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column
              prop="channel"
              label="推送渠道"
              width="120"
              show-overflow-tooltip
            />
            <el-table-column
              prop="content"
              label="内容预览"
              min-width="220"
              show-overflow-tooltip
            >
              <template #default="{ row }">
                {{ row.content && row.content.length > 60 ? row.content.substring(0, 60) + '...' : row.content }}
              </template>
            </el-table-column>
            <el-table-column
              prop="status"
              label="状态"
              width="80"
              align="center"
            >
              <template #default="{ row }">
                <el-tag
                  :type="row.status === 1 ? 'success' : 'info'"
                  size="small"
                  effect="light"
                >
                  {{ row.status === 1 ? '启用' : '禁用' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column
              label="操作"
              width="140"
              align="center"
              fixed="right"
            >
              <template #default="{ row }">
                <el-button
                  type="primary"
                  link
                  size="small"
                  @click="openTemplateDialog(row)"
                >
                  <el-icon><Edit /></el-icon>
                  编辑
                </el-button>
                <el-button
                  type="danger"
                  link
                  size="small"
                  @click="handleDeleteTemplate(row)"
                >
                  <el-icon><Delete /></el-icon>
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-empty
            v-if="!loadingTemplates && templates.length === 0"
            description="暂无消息模板"
            :image-size="80"
          />
        </el-card>

        <!-- 模板编辑对话框 -->
        <el-dialog
          v-model="templateDialogVisible"
          :title="templateForm.id ? '编辑模板' : '添加模板'"
          width="580px"
          :close-on-click-modal="false"
          destroy-on-close
        >
          <el-form
            :model="templateForm"
            label-width="100px"
            class="template-form"
          >
            <el-form-item label="模板名称">
              <el-input
                v-model="templateForm.name"
                placeholder="请输入模板名称"
              />
            </el-form-item>
            <el-form-item label="模板类型">
              <el-select
                v-model="templateForm.type"
                placeholder="请选择模板类型"
                style="width: 100%"
              >
                <el-option
                  label="短信"
                  value="sms"
                />
                <el-option
                  label="APP推送"
                  value="app_push"
                />
                <el-option
                  label="语音"
                  value="voice"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="推送渠道">
              <el-input
                v-model="templateForm.channel"
                placeholder="请输入推送渠道标识"
              />
            </el-form-item>
            <el-form-item label="模板内容">
              <el-input
                v-model="templateForm.content"
                type="textarea"
                :rows="4"
                placeholder="请输入模板内容，变量使用 {{变量名}} 格式"
              />
            </el-form-item>
            <el-form-item label="变量定义">
              <el-input
                v-model="templateForm.variables"
                type="textarea"
                :rows="3"
                placeholder="JSON格式，如：{&quot;name&quot;:&quot;老人姓名&quot;,&quot;time&quot;:&quot;告警时间&quot;}"
              />
            </el-form-item>
            <el-form-item label="状态">
              <el-switch
                v-model="templateForm.status"
                :active-value="1"
                :inactive-value="0"
                active-text="启用"
                inactive-text="禁用"
              />
            </el-form-item>
          </el-form>
          <template #footer>
            <el-button @click="templateDialogVisible = false">
              取消
            </el-button>
            <el-button
              type="primary"
              :loading="savingTemplate"
              @click="handleSaveTemplate"
            >
              确定
            </el-button>
          </template>
        </el-dialog>
      </el-tab-pane>

      <!-- Tab 5: 发送记录 -->
      <el-tab-pane
        label="发送记录"
        name="logs"
      >
        <el-card
          shadow="never"
          class="config-card"
        >
          <template #header>
            <div class="card-header">
              <div class="card-header-left">
                <el-icon
                  :size="18"
                  color="#f59e0b"
                >
                  <Promotion />
                </el-icon>
                <span class="card-title">发送记录</span>
              </div>
              <div class="log-filters">
                <el-select
                  v-model="logFilters.service_group"
                  placeholder="服务类型"
                  clearable
                  size="small"
                  style="width: 130px"
                  @change="fetchLogs"
                >
                  <el-option
                    label="短信服务"
                    value="sms"
                  />
                  <el-option
                    label="APP推送"
                    value="push"
                  />
                </el-select>
                <el-select
                  v-model="logFilters.status"
                  placeholder="状态"
                  clearable
                  size="small"
                  style="width: 110px"
                  @change="fetchLogs"
                >
                  <el-option
                    label="成功"
                    value="success"
                  />
                  <el-option
                    label="失败"
                    value="failed"
                  />
                </el-select>
              </div>
            </div>
          </template>
          <el-table
            v-loading="loadingLogs"
            :data="logs"
            stripe
            style="width: 100%"
          >
            <el-table-column
              prop="created_at"
              label="时间"
              width="180"
              show-overflow-tooltip
            />
            <el-table-column
              prop="service"
              label="服务"
              width="120"
              align="center"
            >
              <template #default="{ row }">
                <el-tag
                  :type="serviceTagTypeMap[row.service] || 'info'"
                  size="small"
                  effect="plain"
                >
                  {{ serviceLabelMap[row.service] || row.service }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column
              prop="action"
              label="操作"
              width="140"
              show-overflow-tooltip
            />
            <el-table-column
              prop="status"
              label="状态"
              width="90"
              align="center"
            >
              <template #default="{ row }">
                <el-tag
                  :type="row.status === 'success' ? 'success' : 'danger'"
                  size="small"
                  effect="light"
                >
                  {{ row.status === 'success' ? '成功' : '失败' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column
              prop="duration"
              label="耗时"
              width="100"
              align="center"
            >
              <template #default="{ row }">
                {{ row.duration != null ? row.duration + 'ms' : '-' }}
              </template>
            </el-table-column>
            <el-table-column
              prop="error_msg"
              label="错误信息"
              min-width="200"
              show-overflow-tooltip
            >
              <template #default="{ row }">
                <span class="error-msg">{{ row.error_msg || '-' }}</span>
              </template>
            </el-table-column>
          </el-table>
          <el-empty
            v-if="!loadingLogs && logs.length === 0"
            description="暂无发送记录"
            :image-size="80"
          />
          <div
            v-if="logTotal > 0"
            class="pagination-wrapper"
          >
            <el-pagination
              v-model:current-page="logPagination.page"
              v-model:page-size="logPagination.pageSize"
              :total="logTotal"
              :page-sizes="[10, 20, 50]"
              layout="total, sizes, prev, pager, next, jumper"
              background
              size="small"
              @size-change="fetchLogs"
              @current-change="fetchLogs"
            />
          </div>
        </el-card>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<style scoped>
.push-service-page {
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

/* 状态卡片 - 橙色渐变 */
.status-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-radius: 12px;
  margin-bottom: 20px;
  color: #fff;
  background: linear-gradient(135deg, #f59e0b, #d97706);
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

/* 标签页 */
.push-tabs {
  margin-bottom: 20px;
}

.push-tabs :deep(.el-tabs__header) {
  margin-bottom: 16px;
}

.push-tabs :deep(.el-tabs__item) {
  font-size: 14px;
  font-weight: 500;
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

/* 推送规则表格 */
.rules-table :deep(.el-table__header th) {
  background-color: var(--bg-secondary, #fafafa);
}

.rule-icon {
  font-size: 16px;
}

.rule-enabled {
  color: #10b981;
}

.rule-disabled {
  color: #d1d5db;
}

.targets-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.target-tag {
  border-radius: 4px;
}

.rules-note {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 16px;
  padding: 10px 14px;
  background-color: #fffbeb;
  border-radius: 8px;
  font-size: 12px;
  color: #92400e;
}

/* 模板表单 */
.template-form .el-form-item {
  margin-bottom: 18px;
}

/* 日志筛选 */
.log-filters {
  display: flex;
  gap: 8px;
}

/* 错误信息 */
.error-msg {
  color: #ef4444;
  font-size: 13px;
}

/* 分页 */
.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  padding-top: 16px;
}

/* Select 暗色覆盖 */
.config-form :deep(.el-select .el-input__wrapper) {
  background-color: var(--bg-secondary, #fff);
}

/* 表格暗色覆盖 */
.config-card :deep(.el-table) {
  --el-table-border-color: var(--border, #e5e7eb);
  --el-table-header-bg-color: var(--bg, #f5f7fa);
  --el-table-text-color: var(--text, #1f2937);
  --el-table-header-text-color: var(--text-secondary, #6b7280);
}
</style>
