<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ArrowLeft } from '@element-plus/icons-vue'
import { getOrderList } from '../../api/order'

const loading = ref(false)
const orderList = ref([])

const pagination = reactive({ page: 1, pageSize: 10, total: 0 })

const typeMap = { MEDICAL: '医疗', LIFE_CARE: '生活照料', EMERGENCY: '紧急救援', COMPANION: '陪护', OTHER: '其他' }
const statusMap = { CREATED: '已创建', ASSIGNED: '已分配', IN_PROGRESS: '进行中', COMPLETED: '已完成', CANCELLED: '已取消' }

function statusTagType(status) {
  const map = { CREATED: 'info', ASSIGNED: '', IN_PROGRESS: 'warning', COMPLETED: 'success', CANCELLED: 'danger' }
  return map[status] || 'info'
}

const statusCounts = computed(() => {
  const active = orderList.value.filter((o) => ['CREATED', 'ASSIGNED', 'IN_PROGRESS'].includes(o.status)).length
  const completed = orderList.value.filter((o) => o.status === 'COMPLETED').length
  return { active, completed, total: orderList.value.length }
})

async function fetchData() {
  loading.value = true
  try {
    const res = await getOrderList({ page: pagination.page, pageSize: pagination.pageSize })
    if (res.code === 200) {
      orderList.value = res.data.list
      pagination.total = res.data.total
    }
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
}

onMounted(() => { fetchData() })
</script>

<template>
  <div class="elderly-page">
    <div class="page-title-bar">
      <el-button
        text
        style="color: var(--primary); font-size: 20px"
        @click="$router.push('/elderly/home')"
      >
        <el-icon :size="24">
          <ArrowLeft />
        </el-icon> 返回
      </el-button>
      <h2>我的服务</h2>
    </div>

    <!-- 服务状态统计 -->
    <div class="status-cards">
      <div class="status-card active">
        <div class="status-count">
          {{ statusCounts.active }}
        </div>
        <div class="status-label">
          进行中
        </div>
      </div>
      <div class="status-card done">
        <div class="status-count">
          {{ statusCounts.completed }}
        </div>
        <div class="status-label">
          已完成
        </div>
      </div>
      <div class="status-card total">
        <div class="status-count">
          {{ statusCounts.total }}
        </div>
        <div class="status-label">
          全部
        </div>
      </div>
    </div>

    <!-- 工单列表 -->
    <div
      v-loading="loading"
      class="order-list"
    >
      <div
        v-for="order in orderList"
        :key="order.id"
        class="order-card"
      >
        <div class="order-header">
          <el-tag
            :type="statusTagType(order.status)"
            size="large"
            effect="dark"
          >
            {{ statusMap[order.status] || order.status }}
          </el-tag>
          <span class="order-type">{{ typeMap[order.type] || order.type }}</span>
          <span class="order-time">{{ order.createdAt }}</span>
        </div>
        <div class="order-desc">
          {{ order.description || '暂无描述' }}
        </div>
        <div
          v-if="order.providerName"
          class="order-footer"
        >
          <span>服务商: {{ order.providerName }}</span>
          <span
            v-if="order.rating"
            style="color: var(--warning)"
          >评分: {{ order.rating }}分</span>
        </div>
      </div>

      <el-empty
        v-if="!loading && orderList.length === 0"
        description="暂无服务记录"
        :image-size="120"
      />
    </div>

    <!-- 分页 -->
    <div
      v-if="pagination.total > pagination.pageSize"
      style="display: flex; justify-content: center; margin-top: 20px"
    >
      <el-pagination
        v-model:current-page="pagination.page"
        :total="pagination.total"
        :page-size="pagination.pageSize"
        layout="prev, pager, next"
        @current-change="fetchData"
      />
    </div>
  </div>
</template>

<style scoped>
.elderly-page {
  padding: 24px;
  max-width: 800px;
  margin: 0 auto;
}

.page-title-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
}

.page-title-bar h2 {
  font-size: 28px;
  font-weight: 600;
  color: var(--text);
}

.status-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.status-card {
  text-align: center;
  padding: 20px;
  border-radius: 16px;
  background: var(--card);
  border: 1px solid var(--border);
}

.status-count {
  font-size: 36px;
  font-weight: 700;
  line-height: 1.2;
}

.status-label {
  font-size: 16px;
  color: var(--text-muted);
  margin-top: 4px;
}

.status-card.active .status-count { color: var(--warning); }
.status-card.done .status-count { color: var(--primary); }
.status-card.total .status-count { color: var(--info); }

.order-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.order-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 20px;
}

.order-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}

.order-type {
  font-size: 18px;
  font-weight: 600;
  color: var(--text);
}

.order-time {
  margin-left: auto;
  font-size: 14px;
  color: var(--text-muted);
}

.order-desc {
  font-size: 16px;
  color: var(--text-secondary);
  margin-bottom: 8px;
  line-height: 1.5;
}

.order-footer {
  display: flex;
  justify-content: space-between;
  font-size: 15px;
  color: var(--text-muted);
}

@media (max-width: 600px) {
  .elderly-page {
    padding: 16px;
  }

  .page-title-bar h2 {
    font-size: 22px;
  }

  .status-cards {
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }

  .status-count {
    font-size: 28px;
  }

  .status-label {
    font-size: 14px;
  }

  .order-card {
    padding: 16px;
  }

  .order-type {
    font-size: 16px;
  }

  .order-desc {
    font-size: 14px;
  }

  .order-footer {
    font-size: 13px;
    flex-direction: column;
    gap: 4px;
  }
}
</style>
