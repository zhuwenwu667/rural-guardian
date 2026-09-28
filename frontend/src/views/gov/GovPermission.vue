<template>
  <div class="gov-permission">
    <el-card shadow="never" class="page-card">
      <template #header>
        <div class="card-header">
          <span class="card-title">菜单管理</span>
          <el-button type="primary" @click="openAddDialog">新增菜单</el-button>
        </div>
      </template>

      <el-table :data="menuTree" row-key="id" default-expand-all :tree-props="{ children: 'children' }" v-loading="loading" border stripe>
        <el-table-column prop="name" label="菜单名称" min-width="180" />
        <el-table-column prop="path" label="路由路径" width="200" />
        <el-table-column prop="icon" label="图标" width="100" align="center" />
        <el-table-column prop="menuType" label="类型" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.menuType === 1 ? '' : row.menuType === 2 ? 'primary' : 'warning'" size="small">
              {{ row.menuType === 1 ? '目录' : row.menuType === 2 ? '菜单' : '按钮' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="sortOrder" label="排序" width="80" align="center" />
        <el-table-column prop="visible" label="可见" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="row.visible === 1 ? 'success' : 'info'" size="small">{{ row.visible === 1 ? '是' : '否' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="permission" label="权限标识" width="160" />
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="openEditDialog(row)">编辑</el-button>
            <el-button type="danger" link size="small" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑菜单' : '新增菜单'" width="520px" :close-on-click-modal="false">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="菜单名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入菜单名称" />
        </el-form-item>
        <el-form-item label="父级菜单">
          <el-tree-select v-model="form.parentId" :data="menuTreeForSelect" :props="{ value: 'id', label: 'name', children: 'children' }" placeholder="选择父级菜单（顶级菜单留空）" clearable check-strictly filterable style="width:100%" />
        </el-form-item>
        <el-form-item label="路由路径" prop="path">
          <el-input v-model="form.path" placeholder="如 /gov/xxx" />
        </el-form-item>
        <el-form-item label="图标">
          <el-input v-model="form.icon" placeholder="Element Plus 图标名" />
        </el-form-item>
        <el-form-item label="类型" prop="menuType">
          <el-radio-group v-model="form.menuType">
            <el-radio :value="1">目录</el-radio>
            <el-radio :value="2">菜单</el-radio>
            <el-radio :value="3">按钮权限</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sortOrder" :min="0" :max="999" />
        </el-form-item>
        <el-form-item label="可见">
          <el-switch v-model="form.visible" :active-value="1" :inactive-value="0" />
        </el-form-item>
        <el-form-item label="权限标识">
          <el-input v-model="form.permission" placeholder="如 menu:add" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="handleSubmit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getMenuList, createMenu, updateMenu, deleteMenu } from '../../api/permission'

const loading = ref(false)
const menuTree = ref([])
const menuTreeForSelect = ref([])
const dialogVisible = ref(false)
const isEdit = ref(false)
const submitLoading = ref(false)
const formRef = ref(null)
const editId = ref(null)

const defaultForm = {
  parentId: null,
  name: '',
  path: '',
  icon: '',
  menuType: 2,
  sortOrder: 0,
  visible: 1,
  permission: '',
  status: 1,
}
const form = ref({ ...defaultForm })

const rules = {
  name: [{ required: true, message: '请输入菜单名称', trigger: 'blur' }],
  menuType: [{ required: true, message: '请选择类型', trigger: 'change' }],
}

async function fetchMenus() {
  loading.value = true
  try {
    const res = await getMenuList()
    if (res.code === 200) {
      menuTree.value = res.data.tree || []
      const flat = (list) => {
        const result = []
        for (const item of list) {
          result.push({ id: item.id, name: item.name, children: item.children || [] })
          if (item.children && item.children.length > 0) {
            result.push(...flat(item.children))
          }
        }
        return result
      }
      menuTreeForSelect.value = [{ id: 0, name: '顶级菜单', children: flat(menuTree.value) }]
    }
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
}

function openAddDialog() {
  isEdit.value = false
  editId.value = null
  form.value = { ...defaultForm }
  dialogVisible.value = true
}

function openEditDialog(row) {
  isEdit.value = true
  editId.value = row.id
  form.value = {
    parentId: row.parentId || null,
    name: row.name,
    path: row.path || '',
    icon: row.icon || '',
    menuType: row.menuType,
    sortOrder: row.sortOrder,
    visible: row.visible,
    permission: row.permission || '',
    status: row.status ?? 1,
  }
  dialogVisible.value = true
}

async function handleSubmit() {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  submitLoading.value = true
  try {
    const data = { ...form.value }
    if (!data.parentId) data.parentId = 0
    let res
    if (isEdit.value) {
      res = await updateMenu(editId.value, data)
    } else {
      res = await createMenu(data)
    }
    if (res.code === 200) {
      ElMessage.success(isEdit.value ? '菜单更新成功' : '菜单创建成功')
      dialogVisible.value = false
      fetchMenus()
    } else {
      ElMessage.error(res.message || '操作失败')
    }
  } catch (err) {
    ElMessage.error('操作失败')
  } finally {
    submitLoading.value = false
  }
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(`确定删除菜单「${row.name}」吗？`, '确认删除', { type: 'warning', confirmButtonText: '确定删除', cancelButtonText: '取消' })
    const res = await deleteMenu(row.id)
    if (res.code === 200) {
      ElMessage.success('删除成功')
      fetchMenus()
    } else {
      ElMessage.error(res.message || '删除失败')
    }
  } catch (err) {
    if (err !== 'cancel') console.error(err)
  }
}

onMounted(() => {
  fetchMenus()
})
</script>

<style scoped>
.gov-permission {
  padding: 20px;
}
.page-card {
  border-radius: 12px;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.card-title {
  font-size: 18px;
  font-weight: 600;
}
</style>
