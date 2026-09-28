<script setup>
import { useRouter } from 'vue-router'
import { HomeFilled } from '@element-plus/icons-vue'
import { useUserStore } from '../stores/user'

const router = useRouter()
const userStore = useUserStore()

function goHome() {
  const roleDefaultRoutes = {
    GOV_ADMIN: '/gov/dashboard',
    VILLAGE_STAFF: '/village/dashboard',
    PROVIDER: '/provider/dashboard',
    FAMILY_MEMBER: '/family/dashboard',
    ELDERLY: '/elderly/home',
  }
  const targetPath = roleDefaultRoutes[userStore.role] || '/login'
  router.push(targetPath)
}
</script>

<template>
  <div class="not-found-page">
    <div class="not-found-content">
      <div class="error-code">
        404
      </div>
      <h1 class="error-title">
        页面不存在
      </h1>
      <p class="error-desc">
        抱歉，您访问的页面不存在或已被移除。
      </p>
      <el-button
        type="primary"
        size="large"
        @click="goHome"
      >
        <el-icon><HomeFilled /></el-icon>
        <span>返回首页</span>
      </el-button>
    </div>
  </div>
</template>

<style scoped>
.not-found-page {
  width: 100%;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg);
}

.not-found-content {
  text-align: center;
  padding: 40px;
}

.error-code {
  font-size: 120px;
  font-weight: 800;
  line-height: 1;
  background: linear-gradient(135deg, var(--primary), var(--primary-light));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 16px;
  opacity: 0.8;
}

.error-title {
  font-size: 28px;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 12px;
}

.error-desc {
  font-size: 16px;
  color: var(--text-muted);
  margin-bottom: 32px;
}
</style>
