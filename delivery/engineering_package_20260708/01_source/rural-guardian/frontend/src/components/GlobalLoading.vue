<script setup>
defineProps({
  visible: { type: Boolean, default: false },
  text: { type: String, default: '加载中...' },
  fullscreen: { type: Boolean, default: true }
})
</script>

<template>
  <div
    v-if="visible"
    class="global-loading"
    :class="{ 'fullscreen': fullscreen }"
  >
    <div class="loading-content">
      <div class="loading-spinner">
        <div class="spinner-ring" />
        <div class="spinner-ring inner" />
      </div>
      <p class="loading-text">
        {{ text }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.global-loading {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.loading-spinner {
  position: relative;
  width: 60px;
  height: 60px;
}

.spinner-ring {
  position: absolute;
  width: 100%;
  height: 100%;
  border: 3px solid transparent;
  border-top-color: #0d9488;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.spinner-ring.inner {
  width: 70%;
  height: 70%;
  top: 15%;
  left: 15%;
  border-top-color: #14b8a6;
  animation-direction: reverse;
  animation-duration: 0.8s;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.loading-text {
  margin-top: 16px;
  font-size: 14px;
  color: #64748b;
}
</style>
