<script setup>
defineProps({
  text: { type: String, default: '加载中...' }
})
</script>

<template>
  <div class="page-loading">
    <div class="loading-spinner">
      <div class="spinner-ring" />
      <div class="spinner-ring inner" />
    </div>
    <p
      v-if="text"
      class="loading-text"
    >
      {{ text }}
    </p>
  </div>
</template>

<style scoped>
.page-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 0;
}

.loading-spinner {
  position: relative;
  width: 40px;
  height: 40px;
}

.spinner-ring {
  position: absolute;
  top: 0;
  left: 0;
  width: 40px;
  height: 40px;
  border: 3px solid transparent;
  border-top: 3px solid #14b8a6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.spinner-ring.inner {
  top: 6px;
  left: 6px;
  width: 28px;
  height: 28px;
  border-top-color: #0d9488;
  animation: spin-reverse 0.8s linear infinite;
}

.loading-text {
  margin-top: 16px;
  font-size: 14px;
  color: #64748b;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

@keyframes spin-reverse {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(-360deg);
  }
}
</style>
