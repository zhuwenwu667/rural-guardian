import { useUserStore } from '../stores/user'

/**
 * v-permission 自定义指令
 * 用于按钮级权限控制
 *
 * 用法:
 *   <el-button v-permission="'elderly:add'">新增</el-button>
 *   <el-button v-permission="['elderly:add', 'elderly:edit']">操作</el-button>
 *
 * 当用户没有对应权限时，元素将被从 DOM 中移除
 */
const permissionDirective = {
  mounted(el, binding) {
    const { value } = binding
    const userStore = useUserStore()

    if (value) {
      const requiredPermissions = Array.isArray(value) ? value : [value]
      const hasPerm = requiredPermissions.some(perm => userStore.hasPermission(perm))

      if (!hasPerm) {
        // 没有权限，移除元素
        el.parentNode && el.parentNode.removeChild(el)
      }
    }
  },

  updated(el, binding) {
    // 当权限数据可能变化时重新检查
    const { value } = binding
    const userStore = useUserStore()

    if (value) {
      const requiredPermissions = Array.isArray(value) ? value : [value]
      const hasPerm = requiredPermissions.some(perm => userStore.hasPermission(perm))

      if (!hasPerm) {
        el.parentNode && el.parentNode.removeChild(el)
      }
    }
  },
}

export default permissionDirective
