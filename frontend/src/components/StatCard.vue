<script setup>
import { computed } from 'vue'
import { Top, Bottom } from '@element-plus/icons-vue'

const props = defineProps({
  title: { type: String, default: '' },
  value: { type: [Number, String], default: 0 },
  icon: { type: String, default: 'DataLine' },
  trend: { type: Number, default: null },
  color: { type: String, default: '' },
})

const formattedValue = computed(() => {
  if (typeof props.value === 'number') {
    return props.value.toLocaleString()
  }
  return props.value
})

const trendClass = computed(() => {
  if (props.trend > 0) return 'trend-up'
  if (props.trend < 0) return 'trend-down'
  return ''
})

const iconBgColor = computed(() => {
  const c = props.color || 'var(--primary)'
  if (c.startsWith('var(') || c.startsWith('#') === false) {
    return 'var(--primary-bg)'
  }
  return hexToRgba(c, 0.1)
})

function hexToRgba(hex, alpha) {
  const h = hex.replace('#', '')
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
</script>

<template>
  <div
    class="stat-card"
    :style="{ borderTopColor: color || 'var(--primary)' }"
  >
    <div class="stat-card-body">
      <div class="stat-info">
        <div class="stat-title">
          {{ title }}
        </div>
        <div class="stat-value">
          {{ formattedValue }}
        </div>
        <div
          v-if="trend !== undefined && trend !== null"
          :class="['stat-trend', trendClass]"
        >
          <el-icon
            v-if="trend > 0"
            :size="14"
          >
            <Top />
          </el-icon>
          <el-icon
            v-else-if="trend < 0"
            :size="14"
          >
            <Bottom />
          </el-icon>
          <span>{{ Math.abs(trend) }}%</span>
          <span class="trend-label">较上期</span>
        </div>
      </div>
      <div
        class="stat-icon"
        :style="{ backgroundColor: iconBgColor }"
      >
        <el-icon
          :size="28"
          :style="{ color: color || 'var(--primary)' }"
        >
          <component :is="icon" />
        </el-icon>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stat-card {
  background: var(--card);
  border: 1px solid var(--border-light);
  border-top: 3px solid var(--primary);
  border-radius: var(--radius-lg);
  padding: 20px;
  transition: transform var(--transition-fast), box-shadow var(--transition-fast);
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.stat-card-body {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.stat-info {
  flex: 1;
}

.stat-title {
  font-size: var(--font-size-caption);
  color: var(--text-muted);
  margin-bottom: 8px;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--text);
  line-height: 1.2;
}

.stat-trend {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 8px;
  font-size: var(--font-size-caption);
}

.trend-up {
  color: var(--success);
}

.trend-down {
  color: var(--danger);
}

.trend-label {
  color: var(--text-muted);
  margin-left: 2px;
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--radius);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
</style>
