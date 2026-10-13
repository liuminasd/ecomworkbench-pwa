// ============================================
// dashboard.js — 总控台渲染（对应 Obsidian 总控台的 5 决策问题 + 全景 + 指标）
// ============================================

import Queries from '../domain/queries.js';
import DB from '../db/store.js';
import { esc, statusBadge, money, pct } from './ui.js';

function empty(msg) {
  return `<div class="empty">${esc(msg)}</div>`;
}

function render(state) {
  const el = document.getElementById('dash-content');
  if (!el) return;
  el.innerHTML = buildHTML(state);
  bindTasks();
}

function buildHTML(state) {
  const m = Queries.globalMetrics(state.skus, state.suppliers, state.creators);

  // 全局指标
  const metrics = `
  <div class="stat-grid">
    <div class="stat-card"><div class="label">🎯 候选 SKU</div><div class="value">${m.候选}</div></div>
    <div class="stat-card"><div class="label">🔬 评估中</div><div class="value">${m.评估中}</div></div>
    <div class="stat-card"><div class="label">✅ 已定品</div><div class="value">${m.已定品}</div></div>
    <div class="stat-card"><div class="label">🏭 供应商</div><div class="value">${m.供应商}</div></div>
    <div class="stat-card"><div class="label">🤝 达人</div><div class="value">${m.达人}</div></div>
    <div class="stat-card"><div class="label">📦 累计订单</div><div class="value">${state.daily.reduce((s,d)=>s+(Number(d.订单数)||0),0)}</div></div>
  </div>`;

  return `
    ${metrics}

    <div class="card decision-block">
      <h3>1️⃣ 哪些品该动？（评分 ≥7.5 未评估）</h3>
      ${q1(state)}
    </div>

    <div class="card decision-block">
      <h3>2️⃣ 哪个品在亏钱？（毛利 <15% 或 退货 >10%）</h3>
      ${q2(state)}
    </div>

    <div class="card decision-block">
      <h3>3️⃣ 钱回来了吗？（未回款）</h3>
      ${q3(state)}
    </div>

    <div class="card decision-block">
      <h3>4️⃣ 谁在等我？（达人超 3 天未联系）</h3>
      ${q4(state)}
    </div>

    <div class="card decision-block">
      <h3>5️⃣ 今天做什么？（未完成任务）</h3>
      ${q5(state)}
    </div>

    <div class="card">
      <h3>🔍 单 SKU 全景</h3>
      <div class="table-wrap">${panorama(state)}</div>
    </div>

    <div class="card">
      <h3>📈 近 7 天汇总</h3>
      <div class="table-wrap">${recent7(state)}</div>
    </div>

    <div class="card">
      <h3>📊 竞品分析覆盖率</h3>
      ${coverage(state)}
    </div>`;
}

function q1(state) {
  const rows = Queries.highScoreCandidates(state.skus);
  if (!rows.length) return empty('暂无高分候选。录入 SKU 并打分后这里会出现。');
  return `<table><thead><tr><th>SKU</th><th>评分</th><th>状态</th><th>下一步</th></tr></thead><tbody>
    ${rows.map(s => `<tr><td>${esc(s.名称 || s.sku_id)}<div class="text-muted" style="font-size:11px">${esc(s.sku_id)}</div></td>
      <td>${esc(s.评分)}</td><td>${statusBadge(s.状态, 'sku')}</td>
      <td>${s.状态 === '候选' ? '<span class="text-warning">⚠ 评分够但还没动</span>' : '<span class="text-success">已进入流程</span>'}</td></tr>`).join('')}
  </tbody></table>`;
}

function q2(state) {
  const rows = Queries.lossMaking(state.skus);
  if (!rows.length) return empty('暂无亏损品。');
  return `<table><thead><tr><th>SKU</th><th>毛利率</th><th>退货率</th><th>状态</th></tr></thead><tbody>
    ${rows.map(s => `<tr><td>${esc(s.名称 || s.sku_id)}</td>
      <td class="${Number(s.预估毛利率)<15?'text-danger':''}">${pct(s.预估毛利率)}</td>
      <td class="${Number(s.退货率)>10?'text-danger':''}">${pct(s.退货率)}</td>
      <td>${statusBadge(s.状态, 'sku')}</td></tr>`).join('')}
  </tbody></table>`;
}

function q3(state) {
  const rows = Queries.unpaidPayments(state.payments);
  if (!rows.length) return empty('暂无未回款记录。');
  return `<table><thead><tr><th>SKU</th><th>应收</th><th>状态</th><th>处置</th></tr></thead><tbody>
    ${rows.map(p => `<tr><td>${esc(p.sku_id)}</td><td>${money(p.金额)}</td>
      <td>${statusBadge(p.回款状态, 'payment')}</td>
      <td>${p.回款状态 === '异常' ? '<span class="text-danger">🚨 超期未到账，立即追</span>' : '<span class="text-muted">在途/跟进中</span>'}</td></tr>`).join('')}
  </tbody></table>`;
}

function q4(state) {
  const rows = Queries.staleCreators(state.creators);
  if (!rows.length) return empty('暂无超 3 天未联系的达人。');
  const now = Date.now();
  return `<table><thead><tr><th>达人</th><th>状态</th><th>最近联系</th><th>已过天数</th></tr></thead><tbody>
    ${rows.map(c => {
      const days = Math.floor((now - new Date(c.最近联系).getTime()) / 86400000);
      return `<tr><td>${esc(c.达人昵称 || c.id)}</td><td>${statusBadge(c.建联状态, 'creator')}</td>
      <td>${esc(c.最近联系 || '')}</td><td class="text-warning">${days} 天</td></tr>`;
    }).join('')}
  </tbody></table>`;
}

function q5(state) {
  const rows = Queries.openTasks(state.tasks);
  if (!rows.length) return empty('暂无待办任务。');
  return `<div id="dash-task-list">
    ${rows.map(t => `<label class="list-item" style="cursor:pointer">
      <input type="checkbox" class="task-check" data-id="${esc(t.id)}" style="width:18px;height:18px;flex-shrink:0">
      <span class="main"><span class="title">${esc(t.内容)}</span>
      ${t.sku_id ? `<div class="meta">${esc(t.sku_id)}</div>` : ''}</span>
    </label>`).join('')}
  </div>`;
}

function panorama(state) {
  if (!state.skus.length) return empty('暂无 SKU。先录入 SKU 主数据。');
  const rows = state.skus.map(s => {
    const p = Queries.skuPanorama(s, state.instances, state.daily, state.payments);
    return `<tr><td>${esc(s.名称 || s.sku_id)}<div class="text-muted" style="font-size:11px">${esc(s.sku_id)}</div></td>
      <td>${money(s.采购价)}</td><td>${p.售价 ? money(p.售价) : '—'}</td>
      <td>${pct(s.预估毛利率)}</td><td>${p.累计订单}</td><td>${money(p.累计GMV)}</td>
      <td class="${p.累计净利<0?'text-danger':'text-success'}">${money(p.累计净利)}</td>
      <td>${p.回款状态 ? p.回款状态.split('/').map(x=>statusBadge(x,'payment')).join('') : '—'}</td></tr>`;
  }).join('');
  return `<table><thead><tr><th>SKU</th><th>采购成本</th><th>售价</th><th>预估毛利</th><th>累计订单</th><th>累计GMV</th><th>累计净利</th><th>回款</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function recent7(state) {
  const r = Queries.recent7Days(state.daily);
  if (!r.hasData) return empty('暂无近 7 天数据。用「录入」页录入每日出单。');
  const rows = r.rows.map(x => `<tr><td>${esc(x.sku_id)}</td><td>${x.订单}</td><td>${money(x.GMV)}</td><td>${money(x.成本)}</td>
    <td class="${x.净利<0?'text-danger':'text-success'}">${money(x.净利)}</td><td>${x.毛利率!=null?x.毛利率.toFixed(1)+'%':'—'}</td></tr>`).join('');
  return `<table><thead><tr><th>SKU</th><th>订单</th><th>GMV</th><th>成本</th><th>净利</th><th>毛利率</th></tr></thead><tbody>${rows}</tbody></table>
  <div style="margin-top:8px;font-size:12px;color:var(--text-muted)">近 7 天合计：订单 <b>${r.合计.订单}</b> · GMV <b>${money(r.合计.GMV)}</b> · 成本 <b>${money(r.合计.成本)}</b> · 净利 <b class="${r.合计.净利<0?'text-danger':'text-success'}">${money(r.合计.净利)}</b></div>`;
}

function coverage(state) {
  const c = Queries.competitorCoverage(state.skus, state.competitors);
  if (!state.skus.length) return empty('暂无 SKU。');
  const rows = c.rows.map(x => `<tr><td>${esc(x.名称)}</td><td>${esc(x.sku_id)}</td>
    <td>${x.已分析 ? '<span class="text-success">✅ 已分析</span>' : '<span class="text-warning">⚠️ 未分析</span>'}</td></tr>`).join('');
  return `<div style="margin-bottom:8px;font-size:14px">覆盖率：<b>${c.done}/${c.total}</b>（${c.rate}%）</div>
  <div class="table-wrap"><table><thead><tr><th>SKU</th><th>sku_id</th><th>竞品分析</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

// 任务勾选：更新 DB 并刷新
function bindTasks() {
  document.querySelectorAll('#dash-content .task-check').forEach(cb => {
    cb.addEventListener('change', async () => {
      const id = cb.dataset.id;
      const task = await DB.get('tasks', id);
      if (task) {
        task.done = cb.checked;
        await DB.put('tasks', task);
        document.dispatchEvent(new CustomEvent('data-changed'));
      }
    });
  });
}

export { render };
