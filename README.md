# EcomWorkbench · 跨境电商运营数据工作台

纯前端 PWA，把 Obsidian 工作台（`D:\EcomWorkbench`）重建成独立应用：选品、日跟踪、回款、定价测算、竞品分析，数据全部本地存储（IndexedDB），可离线、可打包 APK。

## 功能

- **总控台**：5 个决策问题（哪些品该动 / 哪个品在亏钱 / 钱回来了吗 / 谁在等我 / 今天做什么）+ 单 SKU 全景 + 全局指标 + 近 7 天汇总 + 竞品覆盖率
- **选品**：SKU 主数据 CRUD + 竞品分析
- **录入**：日跟踪 / 回款 / 待办（对齐「单日录入 ≤5 分钟」红线）
- **财务**：定价测算（保本价 / 目标价 / 三档净利率，口径对齐字段字典）+ 回款记录
- **更多**：供应商 / 达人 / SOP 清单 / JSON 备份导入导出

## 技术栈

纯 HTML/CSS/JS + IndexedDB + Service Worker + GitHub Pages + bubblewrap（APK）。零服务器成本。

## 数据模型

字段口径以 Obsidian 库 `09-知识库/字段字典.md` 为唯一事实源（`sku_id` 唯一键、全包成本口径、状态枚举）。

| 表 | keyPath | 说明 |
|---|---|---|
| skus | sku_id | SKU 主数据 |
| instances | id | 平台实例（一 SKU 多平台） |
| daily | id | 日跟踪 |
| payments | id | 回款 |
| suppliers | id | 供应商 |
| creators | id | 达人 |
| pricings | id | 定价测算 |
| competitors | id | 竞品分析 |
| tasks | id | 待办任务 |

## 本地运行

```bash
npx serve . -p 3000
```

或任意静态服务器。打开后若库为空会自动预置 PET-DEO-001 示例数据。

## 部署

推送到 GitHub 后由 Actions 自动部署到 GitHub Pages（见 `.github/workflows/deploy.yml`）。

## 打包 APK

```bash
node scripts/build_apk.js
```

需预装 JDK 21 + Android SDK + Gradle（脚本复用仰止AI 的 bubblewrap 程序化流程）。

## 与 Obsidian 库的关系

- 本应用 = 结构化运营数据 + 自动聚合（原 Obsidian 数据区）
- `D:\EcomWorkbench` = 长文 / 方法论 / 素材资料区（保留，不迁移）
