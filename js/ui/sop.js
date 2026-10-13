// ============================================
// sop.js — SOP 清单（内容迁移自 Obsidian 06-运营SOP/，勾选状态存 localStorage）
// ============================================

import { esc } from './ui.js';

const LS_KEY = 'ew-sop-checked';

// SOP 数据（标题 + 环节 + 步骤）
const SOP = [
  {
    环节: '开店与合规', 标题: '开店前资质清单',
    步骤: ['倒推目标平台所需资质（执照/收款/税务）', '逐项列出办理材料与周期', '标注费用与办理渠道', '建立办理进度跟踪'],
  },
  {
    环节: '开店与合规', 标题: '多平台入驻对比',
    步骤: ['列出候选平台（TK东南亚/亚马逊/独立站）', '按门槛、佣金、保证金、回款周期逐项对比', '结合自身阶段选主战场', '记录最终决策与理由'],
  },
  {
    环节: '日常运营', 标题: '新品上架',
    步骤: ['标题：核心词+场景词+功效词', '主图：首图突出卖点，符合平台规格', '详情：痛点→方案→信任→促单', '定价：含全部成本，参考竞品带', '库存与交期确认', '上架后 24h 内检查展示是否正常'],
  },
  {
    环节: '日常运营', 标题: '每日运营巡检',
    步骤: ['看总控台 5 个决策问题', '检查昨日异常：低毛利/高退货/超期回款', '达人待跟进回复', '广告预算与消耗', '库存与补货预警', '录入昨日日跟踪数据'],
  },
  {
    环节: '广告投流', 标题: '冷启动投放',
    步骤: ['D1–D3：小额多计划测素材', 'D4–D7：砍掉高消耗无转化计划，加码有转化的', 'D8–D14：放量+优化出价，测第二组素材', '全程记录花费与 ROAS 到日跟踪'],
  },
  {
    环节: '客服售后', 标题: '退货挽留话术',
    步骤: ['开场共情（不辩解）', '复述问题确认理解', '给补偿方案（补发/部分退款/优惠券）', '仍坚持退货 → 顺畅走流程，不纠缠'],
  },
];

function loadChecked() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; }
  catch { return {}; }
}
function saveChecked(o) { localStorage.setItem(LS_KEY, JSON.stringify(o)); }

function render() {
  const el = document.getElementById('sop-content');
  if (!el) return;
  const checked = loadChecked();

  // 按环节分组
  const groups = {};
  SOP.forEach(s => { (groups[s.环节] = groups[s.环节] || []).push(s); });

  let html = '';
  for (const [环节, sops] of Object.entries(groups)) {
    html += `<div class="section-title">${esc(环节)}</div>`;
    sops.forEach(s => {
      const key = `${s.标题}`;
      html += `<div class="card" style="padding:10px 12px;margin-bottom:8px">
        <div class="title" style="font-weight:600;font-size:14px;margin-bottom:6px">${esc(s.标题)}</div>
        ${s.步骤.map((step, i) => {
          const ck = checked[key]?.[i] ? 'checked' : '';
          return `<label class="list-item" style="cursor:pointer;padding:8px 10px;margin-bottom:4px">
            <input type="checkbox" class="sop-check" data-sop="${esc(key)}" data-idx="${i}" ${ck} style="width:16px;height:16px;flex-shrink:0">
            <span class="main"><span class="title" style="font-size:13px">${esc(step)}</span></span>
          </label>`;
        }).join('')}
      </div>`;
    });
  }
  el.innerHTML = html;

  el.querySelectorAll('.sop-check').forEach(cb => {
    cb.addEventListener('change', () => {
      const key = cb.dataset.sop;
      const idx = cb.dataset.idx;
      const c = loadChecked();
      c[key] = c[key] || {};
      c[key][idx] = cb.checked;
      saveChecked(c);
    });
  });
}

export { render };
