# 交叉审查日志 · EcomWorkbench PWA

> 时间：2026-10-13
> 审查方：Claude（本 agent）+ DeepSeek Harness（`dsh --profile headless`）双模型交叉审查
> 范围：`C:\Users\32066\ecomworkbench-pwa`（初版，纯前端 PWA）
> 聚焦：XSS/注入、数据一致性、空值边界、逻辑正确性、异常路径、安全

## 统计

Claude 发现 7 条，DeepSeek 发现 22 条，合并去重后 **23 条**。

| 来源 | 数量 | 复核结果 |
|---|---|---|
| 双方共同 | 4 | 高置信度 |
| 仅 DeepSeek | 18 | Claude 复核：确认 17 / 降级 1 |
| 仅 Claude | 3 | DeepSeek 复核：确认 1 / 降级 1 / 并入 1 |

## 关键发现（按级别）

**严重**：`escapeHtml` 用 `textContent→innerHTML` 只转义 `<>&`、不转义引号，`value`/`data-*` 属性上下文可注入 `on*` 事件（仅 DeepSeek 发现，Claude 盲区）。

**高危**（3）：裸插值未转义（评分/竞品数/订单数/起订量/粉丝量直接拼 innerHTML）；删除 SKU 不级联删除关联记录；importData 无 schema 校验。

**中危**（8）：pricing `目标净利率` 用 `||` 兜底致填 0 变 30%；表单保存无 try/catch；injectSkuOptions 未 await/catch；store 方法对 `this.db` 无判空；importData 非原子+吞异常；exportData 无 try/catch+revoke 泄漏；toNumObj 无范围校验；readForm 不 trim。

## 修复情况（全部采纳）

| 级别 | 修复 |
|---|---|
| 严重 | escapeHtml 改手动转义（含引号） |
| 高危 | 6 处裸插值补 `esc()`；`deleteSku()` 级联删除 6 张关联表；importData 加结构/字段校验 |
| 中危 | pricing 改显式判空；formShell 统一 try/catch + await injectSkuOptions；readForm 文本 trim；store 加 `_db()` 判空；importData/exportData 加 try/catch 与分段错误提示 |
| 低危 | money 改 `Number.isFinite`；清理死代码 import Config |

## 未修（记录为已知限制，低风险）

- store.js `execInTransaction` 异步回调不捕获（当前零调用）
- store.js `open()` 缺 `onblocked`（DB_VERSION=1 暂不触发）
- skuPanorama 售价取 `prices[0]`（多平台简化）
- highScoreCandidates 标题「未评估」措辞有歧义（查询逻辑与 Obsidian 原版一致）

## 验证

修复后 `npm test` 全绿：语法 9 + test-logic 14 + test-db 27 + test-dom 9 = 50 项通过。
