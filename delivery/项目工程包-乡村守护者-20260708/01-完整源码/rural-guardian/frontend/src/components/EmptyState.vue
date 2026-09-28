<script setup>
defineProps({
  title: { type: String, default: '暂无数据' },
  description: { type: String, default: '' },
  actionText: { type: String, default: '' },
  size: { type: String, default: 'default' } // small, default, large
})

defineEmits(['action'])
</script>

<template>
  <div
    class="empty-state"
    :class="`size-${size}`"
  >
    <div class="empty-icon">
      <slot name="icon">
        <svg
          viewBox="0 0 64 64"
          width="64"
          height="64"
          fill="none"
        >
          <rect
            x="8"
            y="16"
            width="48"
            height="40"
            rx="4"
            stroke="#cbd5e1"
            stroke-width="2"
          />
          <path
            d="M24 32h16M32 24v16"
            stroke="#94a3b8"
            stroke-width="2"
            stroke-linecap="round"
          />
        </svg>
      </slot>
    </div>
    <h4 class="empty-title">
      {{ title }}
    </h4>
    <p
      v-if="description"
      class="empty-desc"
    >
      {{ description }}
    </p>
    <div
      v-if="$slots.action || actionText"
      class="empty-action"
    >
      <slot name="action">
        <el-button
          type="primary"
          @click="$emit('action')"
        >
          {{ actionText }}
        </el-button>
      </slot>
    </div>
  </div>
</template>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
}

.empty-icon {
  margin-bottom: 16px;
  opacity: 0.6;
}

.empty-title {
  margin: 0 0 8px;
  font-size: 16px;
  font-weight: 500;
  color: #334155;
}

.empty-desc {
  margin: 0 0 20px;
  font-size: 14px;
  color: #94a3b8;
  max-width: 400px;
}

.empty-action {
  margin-top: 8px;
}

/* Size variants */
.size-small {
  padding: 24px 16px;
}

.size-small .empty-icon {
  transform: scale(0.75);
  margin-bottom: 12px;
}

.size-small .empty-title {
  font-size: 14px;
}

.size-small .empty-desc {
  font-size: 12px;
  margin-bottom: 12px;
}

.size-large {
  padding: 60px 20px;
}

.size-large .empty-icon {
  transform: scale(1.25);
  margin-bottom: 24px;
}

.size-large .empty-title {
  font-size: 20px;
}

.size-large .empty-desc {
  font-size: 16px;
  margin-bottom: 24px;
}
</style>
