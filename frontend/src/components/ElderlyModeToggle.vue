<script setup>
import accessibilityService from '../services/accessibility'

function handleToggle() {
  accessibilityService.toggleElderlyMode()
}
</script>

<template>
  <div class="elderly-mode-toggle">
    <!-- 适老模式切换按钮 -->
    <el-tooltip
      :content="accessibilityService.isElderlyMode.value ? '关闭适老模式' : '开启适老模式'"
      placement="bottom"
    >
      <el-button
        text
        class="header-icon-btn"
        :class="{ 'is-active': accessibilityService.isElderlyMode.value }"
        @click="handleToggle"
      >
        <el-icon :size="18">
          <svg
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <!-- 无障碍/适老化图标 -->
            <circle
              cx="12"
              cy="5"
              r="2.5"
              stroke="currentColor"
              stroke-width="1.8"
              fill="none"
            />
            <path
              d="M12 9v5"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
            />
            <path
              d="M8 21l2-7h4l2 7"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
              fill="none"
            />
            <circle
              cx="12"
              cy="12"
              r="9"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-dasharray="3 2"
              fill="none"
              opacity="0.4"
            />
          </svg>
        </el-icon>
      </el-button>
    </el-tooltip>
  </div>
</template>

<style scoped>
.elderly-mode-toggle {
  display: inline-flex;
  align-items: center;
}

.header-icon-btn.is-active {
  color: #1677ff !important;
  background-color: rgba(22, 119, 255, 0.1) !important;
}
</style>
