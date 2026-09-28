# 五端连通性整改 Spec

## Why
当前系统存在多个前后端接口契约不一致、状态枚举不统一、登录态字段缺失、部分页面仍为 Mock 数据的问题，导致五端功能可进入但多处核心流程无法真正闭环，直接影响交付演示质量。

## What Changes

### P0 — 阻塞链路修复（4项）
- `P0-1`：家属端告警确认/申诉 `confirmAlert` 前端调用参数对齐后端契约（`confirmed` / `appealReason`）
- `P0-2`：工单流转 HTTP 方法统一，`acceptOrder`/`rejectOrder`/`startOrder`/`completeOrder` 从 `POST` 改为 `PUT`
- `P0-3`：审批中心前后端参数统一，前端 `submitApprove`/`submitReject` 从传 `action` 改为传 `approved`
- `P0-4`：JWT payload 追加 `village_id`，使村级数据范围过滤生效

### P1 — 重要缺口修复（7项）
- `P1-1`：补齐/修正前端指向不存在的 14 个后端接口（URL、方法、参数对齐）
- `P1-2`：告警状态枚举前后端统一，前端删除自定义状态常量
- `P1-3`：工单状态枚举前后端统一
- `P1-4`：家属工单 `family_id` → `created_by` 字段统一
- `P1-5`：服务商 `provider_id` 语义统一（统一使用 `sys_user.id`）
- `P1-6`：家属端首页绑定老人和服务预约从 Mock 改为调真实 API
- `P1-7`：老人端 `elderlyId` 从写死改为从登录态关联，store 补充 `userId`

### P2 — 优化完善（8项）
- `P2-1`：村级/服务商/老人首页/工作台 Mock → 真实聚合
- `P2-2`：告警列表 `list.map(async ...)` 改为 `await Promise.all`
- `P2-3`：工单列表 `list.map(async ...)` 改为 `await Promise.all`
- `P2-4`：告警升级后新增 `ESCALATED_TO_GOV` 状态语义
- `P2-5`：审批中心前端子路由统一改用后端已有通用接口
- `P2-6`：政府端服务子页（AI/语音/地图/推送）补全 sidebar 菜单入口
- `P2-7`：客服端账号体系补充（注册枚举、demo-login、种子用户）
- `P2-8`：RBAC 权限体系完善（后端角色-权限查询 + 前端权限拉取）

## Impact
- 影响范围：`backend/routes/`、`backend/middleware/`、`frontend/src/api/`、`frontend/src/views/`、`frontend/src/stores/`
- **BREAKING**：`P0-3` 和 `P0-4` 涉及登录返回结构和审批接口参数变更，需同步前端调用方
- **BREAKING**：`P1-4` 和 `P1-5` 涉及字段语义变更，需确认 seed 数据一致性
