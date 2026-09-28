# Tasks

## 第一轮：P0（阻塞链路）
- [x] Task 1: P0-1 告警家属确认参数对齐
  - Step 1: 修改后端 `/alerts/:id/confirm` 兼容 `{ action, remark }`（`CONFIRM`→confirmed=true，`APPEAL`→confirmed=false）
  - Step 2: 修改前端 `FamilyAlert.vue` `submitConfirm` 调用参数 `confirmAlert(id, { confirmed, appealReason })`
- [x] Task 2: P0-2 工单 HTTP 方法统一
  - Step 1: `frontend/src/api/order-flow.js` 中 `acceptOrder/rejectOrder/startOrder/completeOrder` 从 `post` 改为 `put`
- [x] Task 3: P0-3 审批参数统一
  - Step 1: `GovApproval.vue` `submitApprove` 从 `{ action: 'APPROVE' }` 改为 `{ approved: true }`
  - Step 2: `GovApproval.vue` `submitReject` 从 `{ action: 'REJECT' }` 改为 `{ approved: false }`
  - Step 3: `VillageApproval.vue` 同步修改
- [x] Task 4: P0-4 JWT 补充 village_id
  - Step 1: `backend/routes/auth.js` JWT payload 追加 `village_id: user.village_id`
  - Step 2: `backend/routes/auth.js` demo-login 同步追加

## 第二轮：P1（稳定核心）
- [x] Task 5: P1-1 补齐/修正缺失接口
  - Step 1: `approval-center.js` 前端 API 文件改用后端已有通用接口
  - Step 2: `alert-flow.js` 前端 API 文件 URL 修正（`/flow-records`→`/flow`，`/my-pending`→`/pending`）
  - Step 3: `order-flow.js` 前端 API 文件 URL 修正（`/flow-records`→`/flow`，`/available-providers`→`/available`）
  - Step 4: 后端新增 `PUT /alerts/:id/close`、`POST /orders/:id/cancel`、`GET /approvals/pending-count`、`GET /approvals/stats` 接口
- [x] Task 6: P1-2 告警状态枚举统一
  - Step 1: `GovAlert.vue` / `VillageAlert.vue` 统一使用后端枚举（`PENDING/PROCESSING/PENDING_CONFIRM/RESOLVED`）
- [x] Task 7: P1-3 工单状态枚举统一
  - Step 1: `ProviderOrder.vue` / `FamilyOrder.vue` 统一使用后端枚举
- [x] Task 8: P1-4 家属工单归属字段统一
  - Step 1: `order-flow.js`(backend) 派单/评价校验 `family_id` → `created_by`
- [x] Task 9: P1-5 服务商 provider_id 语义统一
  - Step 1: 确认 `provider_id` 统一使用 `sys_user.id`
  - Step 2: 修正 `order-flow.js`(backend) 中关联 `provider_info` 的 JOIN 条件
- [x] Task 10: P1-6 家属首页 Mock→真实 API
  - Step 1: `FamilyDashboard.vue` 绑定老人调 `POST /approvals/family-binding`
  - Step 2: `FamilyDashboard.vue` 服务卡片跳转 `router.push('/family/order')`
- [x] Task 11: P1-7 老人端 elderlyId 登录态关联
  - Step 1: `user.js`(store) 补充 `userId` 计算属性
  - Step 2: `ElderlyHealth.vue` 从 `userInfo` 关联 elderlyId

## 第三轮：P2（优化完善）
- [x] Task 12: P2-1 工作台/首页 Mock→真实
  - Step 1: `VillageDashboard.vue` 看板数据接真实聚合接口
  - Step 2: `ProviderDashboard.vue` 接工单统计/待办接口
  - Step 3: `ElderlyHome.vue` 接健康/服务聚合接口
- [x] Task 13: P2-2 告警列表异步未等待
  - Step 1: `alert-flow.js`(backend) `list.map(async ...)` → `await Promise.all(list.map(...))`
- [x] Task 14: P2-3 工单列表异步未等待
  - Step 1: `order-flow.js`(backend) `list.map(async ...)` → `await Promise.all(list.map(...))`
- [x] Task 15: P2-4 告警升级状态语义
  - Step 1: `alert-flow.js`(backend) escalate 后设置 `status:'ESCALATED_TO_GOV'`
- [x] Task 16: P2-5 审批中心子路由归一
  - Step 1: `approval-center.js`(frontend) `getFamilyBindingList`/`getDeviceBindingList` 改用通用 `/approvals`+`type` 参数
- [x] Task 17: P2-6 政府端菜单补全
  - Step 1: `AppLayout.vue` 政府端 sidebar 补全 AI/语音/地图/推送入口
- [x] Task 18: P2-7 客服端账号体系
  - Step 1: `auth.js`(backend) 注册枚举、demo-login 映射补 `CS`
  - Step 2: `seed-demo.js` 补客服种子用户
- [x] Task 19: P2-8 RBAC 权限完善
  - Step 1: `middleware/auth.js` `requirePermission` 补充角色-权限表查询
  - Step 2: `user.js`(store) 登录后调用 `fetchPermissions()`

## Task Dependencies
- P0 tasks (Task 1-4) 无相互依赖，可并行
- P1 tasks 中 Task 5 依赖 P0-3、P0-4 完成（涉及接口契约变更）
- Task 6/7（状态枚举）依赖 Task 5（接口修正后重新确认枚举）
- Task 10/11 依赖 Task 5（需要真实 API 可调用）
- P2 tasks 依赖 P0 和 P1 完成
