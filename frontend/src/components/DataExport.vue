<script setup>
import { ref } from 'vue'
import { Download } from '@element-plus/icons-vue'
import { exportData } from '../utils/export'

const props = defineProps({
  text: { type: String, default: '导出' },
  type: { type: String, default: 'default' },
  size: { type: String, default: 'default' },
  format: { type: String, default: 'csv' },
  columns: { type: Array, required: true },
  data: { type: Array, required: true },
  filename: { type: String, default: 'export' }
})

const loading = ref(false)

function handleExport() {
  loading.value = true
  try {
    exportData(props.data, props.filename, {
      format: props.format,
      columns: props.columns
    })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <el-button
    :type="type"
    :size="size"
    :icon="Download"
    :loading="loading"
    @click="handleExport"
  >
    {{ text }}
  </el-button>
</template>
