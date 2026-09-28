<script setup>
import { Check } from '@element-plus/icons-vue'
import { computed } from 'vue'

const props = defineProps({
  currentStatus: { type: String, required: true },
  history: { type: Array, default: () => [] }
})

const statusMap = {
  'CREATED': { title: '工单创建', text: '待分配' },
  'ASSIGNED': { title: '已分配', text: '待接单' },
  'ACCEPTED': { title: '已接单', text: '服务中' },
  'IN_PROGRESS': { title: '服务中', text: '进行中' },
  'COMPLETED': { title: '已完成', text: '待评价' },
  'EVALUATED': { title: '已评价', text: '已结束' },
  'CANCELLED': { title: '已取消', text: '已取消' }
}

const statusOrder = ['CREATED', 'ASSIGNED', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'EVALUATED']

const timelineSteps = computed(() => {
  const currentIndex = statusOrder.indexOf(props.currentStatus)
  
  return statusOrder.map((status, index) => {
    const historyItem = props.history.find(h => h.status === status)
    return {
      status,
      title: statusMap[status]?.title || status,
      completed: index <= currentIndex && currentIndex !== -1,
      time: historyItem?.time,
      user: historyItem?.user
    }
  })
})

function getStatusType(status) {
  const typeMap = {
    'CREATED': 'info',
    'ASSIGNED': 'primary',
    'ACCEPTED': 'warning',
    'IN_PROGRESS': 'warning',
    'COMPLETED': 'success',
    'EVALUATED': 'success',
    'CANCELLED': 'danger'
  }
  return typeMap[status] || 'info'
}

function getStatusText(status) {
  return statusMap[status]?.text || status
}
</script>

<template>
  <div class="order-timeline">
    <div class="timeline-header">
      <h4>工单状态流转</h4>
      <el-tag :type="getStatusType(currentStatus)">
        {{ getStatusText(currentStatus) }}
      </el-tag>
    </div>
    
    <div class="timeline-content">
      <div 
        v-for="(step, index) in timelineSteps" 
        :key="step.status"
        class="timeline-item"
        :class="{
          'is-active': step.status === currentStatus,
          'is-completed': step.completed,
          'is-pending': !step.completed && step.status !== currentStatus
        }"
      >
        <div class="timeline-dot">
          <el-icon v-if="step.completed">
            <Check />
          </el-icon>
          <span v-else>{{ index + 1 }}</span>
        </div>
        <div
          v-if="index < timelineSteps.length - 1"
          class="timeline-line"
        />
        <div class="timeline-info">
          <span class="timeline-title">{{ step.title }}</span>
          <span
            v-if="step.time"
            class="timeline-time"
          >{{ step.time }}</span>
          <span
            v-if="step.user"
            class="timeline-user"
          >{{ step.user }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.order-timeline {
  background: #f8fafc;
  border-radius: 8px;
  padding: 16px;
}

.timeline-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.timeline-header h4 {
  margin: 0;
  font-size: 16px;
  color: #1e293b;
}

.timeline-content {
  position: relative;
}

.timeline-item {
  display: flex;
  align-items: flex-start;
  position: relative;
  padding-bottom: 24px;
}

.timeline-item:last-child {
  padding-bottom: 0;
}

.timeline-dot {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #e2e8f0;
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  z-index: 1;
  flex-shrink: 0;
}

.timeline-item.is-completed .timeline-dot {
  background: #10b981;
  color: white;
}

.timeline-item.is-active .timeline-dot {
  background: #0d9488;
  color: white;
  box-shadow: 0 0 0 4px rgba(13, 148, 136, 0.2);
}

.timeline-line {
  position: absolute;
  left: 13px;
  top: 28px;
  width: 2px;
  height: calc(100% - 28px);
  background: #e2e8f0;
}

.timeline-item.is-completed .timeline-line {
  background: #10b981;
}

.timeline-info {
  margin-left: 12px;
  display: flex;
  flex-direction: column;
}

.timeline-title {
  font-size: 14px;
  color: #1e293b;
  font-weight: 500;
}

.timeline-time {
  font-size: 12px;
  color: #64748b;
  margin-top: 4px;
}

.timeline-user {
  font-size: 12px;
  color: #94a3b8;
  margin-top: 2px;
}

.timeline-item.is-pending .timeline-title {
  color: #94a3b8;
}
</style>
