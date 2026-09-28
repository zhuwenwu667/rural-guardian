# Checklist

## P0 阻塞链路
- [x] P0-1: 家属确认/申诉全链路可走通（`confirmAlert(id, {confirmed, appealReason})` → 后端正确更新状态）
- [x] P0-2: 服务商接单/拒单/开始/完成 HTTP PUT 请求成功
- [x] P0-3: 政府/村级审批通过/拒绝页面操作成功（后端收到 `approved: true/false`）
- [x] P0-4: 村级专员登录后 JWT 含 `village_id`，查看告警/工单仅看到本村数据

## P1 重要缺口
- [x] P1-1: 前端 14 个缺失接口调用均修正为后端真实存在的接口
- [x] P1-2: 告警状态枚举前后端一致（`PENDING/PROCESSING/PENDING_CONFIRM/RESOLVED`）
- [x] P1-3: 工单状态枚举前后端一致（`CREATED/ASSIGNED/IN_PROGRESS/PENDING_REVIEW/COMPLETED`）
- [x] P1-4: 家属派单/评价校验使用 `created_by` 而非 `family_id`
- [x] P1-5: 服务商 `provider_id` 统一使用 `sys_user.id`，关联查询正确
- [x] P1-6: 家属首页绑定老人和服务预约可调通真实 API
- [x] P1-7: 老人端 elderlyId 从登录态关联而非写死

## P2 优化完善
- [x] P2-1: 村级/服务商/老人工作台数据来自真实聚合接口
- [x] P2-2: 告警列表 `flowRecords` 是真实数据而非 Promise 数组
- [x] P2-3: 工单列表 `flowRecords` 是真实数据而非 Promise 数组
- [x] P2-4: 告警升级后状态明确为 `ESCALATED_TO_GOV`
- [x] P2-5: 审批中心前端不再调用不存在的子路由接口
- [x] P2-6: 政府端 sidebar 菜单能看到 AI/语音/地图/推送入口
- [x] P2-7: 客服端可通过登录流程进入（注册/demo/种子用户）
- [x] P2-8: `requirePermission` 能按角色-权限表真正拦截
