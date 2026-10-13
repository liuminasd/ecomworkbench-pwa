// ============================================
// modules.js — 选品 / 录入 / 财务 / 更多 四个 Tab 的列表渲染
// ============================================

import DB from '../db/store.js';
import Security from '../utils/security.js';
import Queries from '../domain/queries.js';
import Pricing from '../domain/pricing.js';
import { esc, toast, statusBadge, money, pct } from './ui.js';
import * as Forms from './forms.js';

function empty(msg) { return `<div class="empty">${esc(msg)}</div>`; }

function render(state) {
  renderSelection(state);
  renderEntry(state);
  renderFinance(state);
  renderMore(state);
}

/* ============ 选品 Tab ============ */
function renderSelection(state) {
  const el = document.getElementById('selection-content');
  if (!el) return;

  const skuRows = state.skus.map(s => `
    <div class="list-item">
      <div class="main">
        <div class="title">${esc(s.名称 || s.sku_id)} ${statusBadge(s.状态, 'sku')}</div>
        <div class="meta">${esc(s.sku_id)} · ${esc(s.品类 || '')} · 评分 ${esc(s.评分 ?? '—')} · 毛利 ${pct(s.预估毛利率)}</div>
      </div>
      <button class="btn-icon" data-edit-sku="${esc(s.sku_id)}" title="编辑">✎</button>
      <button class="btn-icon" data-del-sku="${esc(s.sku_id)}" title="删除" style="color:var(--danger)">🗑</button>
    </div>`).join('');

  const compRows = state.competitors.map(c => `
    <div class="list-item">
      <div class="main">
        <div class="title">${esc(c.sku_id)} · 竞品分析</div>
        <div class="meta">竞品数 ${esc(c.竞品数 ?? '—')} · ${esc(c.分析日期 || '')} · ${esc(c.备注 || '')}</div>
      </div>
      <button class="btn-icon" data-edit-comp="${esc(c.id)}" title="编辑">✎</button>
      <button class="btn-icon" data-del-comp="${esc(c.id)}" title="删除" style="color:var(--danger)">🗑</button>
    </div>`).join('');

  el.innerHTML = `
    <div class="page-body">
      <button class="btn btn-primary btn-block" id="btn-add-sku">＋ 新增 SKU</button>
      <div class="section-title">SKU 列表（${state.skus.length}）</div>
      ${skuRows || empty('暂无 SKU，点上方按钮录入第一条')}
      <button class="btn btn-block" id="btn-add-comp">＋ 新增竞品分析</button>
      <div class="section-title">竞品分析（${state.competitors.length}）</div>
      ${compRows || empty('暂无竞品分析')}
    </div>`;

  document.getElementById('btn-add-sku').onclick = () => Forms.openSkuForm();
  document.getElementById('btn-add-comp').onclick = () => Forms.openCompetitorForm();
  el.querySelectorAll('[data-edit-sku]').forEach(b => b.onclick = () => {
    Forms.openSkuForm(state.skus.find(s => s.sku_id === b.dataset.editSku));
  });
  el.querySelectorAll('[data-del-sku]').forEach(b => b.onclick = () => {
    deleteSku(b.dataset.delSku);
  });
  el.querySelectorAll('[data-edit-comp]').forEach(b => b.onclick = () => {
    Forms.openCompetitorForm(state.competitors.find(c => c.id === b.dataset.editComp));
  });
  el.querySelectorAll('[data-del-comp]').forEach(b => b.onclick = () => {
    delEntity('competitors', b.dataset.delComp);
  });
}

/* ============ 录入 Tab ============ */
function renderEntry(state) {
  const el = document.getElementById('entry-content');
  if (!el) return;

  const recentDaily = [...state.daily].sort((a, b) => (b.日期 || '').localeCompare(a.日期 || '')).slice(0, 10);
  const dailyRows = recentDaily.map(d => `
    <div class="list-item">
      <div class="main">
        <div class="title">${esc(d.sku_id)} · ${esc(d.日期 || '')}</div>
        <div class="meta">订单 ${esc(d.订单数 ?? 0)} · GMV ${money(d.GMV)} · 成本 ${money(d.总成本)}</div>
      </div>
      <button class="btn-icon" data-del-daily="${esc(d.id)}" style="color:var(--danger)">🗑</button>
    </div>`).join('');

  const openTasks = Queries.openTasks(state.tasks);
  const taskRows = openTasks.map(t => `
    <label class="list-item" style="cursor:pointer">
      <input type="checkbox" class="task-check" data-id="${esc(t.id)}" style="width:18px;height:18px;flex-shrink:0">
      <span class="main"><span class="title">${esc(t.内容)}</span>
      ${t.sku_id ? `<div class="meta">${esc(t.sku_id)}</div>` : ''}</span>
    </label>`).join('');

  el.innerHTML = `
    <div class="page-body">
      <div class="field-row">
        <button class="btn btn-primary" id="btn-add-daily">＋ 日跟踪</button>
        <button class="btn" id="btn-add-payment">＋ 回款</button>
        <button class="btn" id="btn-add-task">＋ 待办</button>
      </div>
      <div class="section-title">最近日跟踪（${state.daily.length}）</div>
      ${dailyRows || empty('暂无日跟踪。点「＋ 日跟踪」录入第一笔。')}
      <div class="section-title">待办任务（${openTasks.length}）</div>
      ${taskRows || empty('暂无待办。')}
    </div>`;

  document.getElementById('btn-add-daily').onclick = () => Forms.openDailyForm();
  document.getElementById('btn-add-payment').onclick = () => Forms.openPaymentForm();
  document.getElementById('btn-add-task').onclick = () => Forms.openTaskForm();
  el.querySelectorAll('[data-del-daily]').forEach(b => b.onclick = () => delEntity('daily', b.dataset.delDaily));
  el.querySelectorAll('.task-check').forEach(cb => cb.addEventListener('change', async () => {
    const t = await DB.get('tasks', cb.dataset.id);
    if (t) { t.done = cb.checked; await DB.put('tasks', t); document.dispatchEvent(new CustomEvent('data-changed')); }
  }));
}

/* ============ 财务 Tab ============ */
function renderFinance(state) {
  const el = document.getElementById('finance-content');
  if (!el) return;

  const payRows = state.payments.map(p => `
    <div class="list-item">
      <div class="main">
        <div class="title">${esc(p.sku_id)} · ${money(p.金额)} ${statusBadge(p.回款状态, 'payment')}</div>
        <div class="meta">${esc(p.平台 || '')} · 账期 ${esc(p.账期 || '—')} · 预计 ${esc(p.预计到账 || '—')}</div>
      </div>
      <button class="btn-icon" data-del-pay="${esc(p.id)}" style="color:var(--danger)">🗑</button>
    </div>`).join('');

  const pricingCards = state.pricings.map(pr => {
    const r = Pricing.calc(pr);
    return `<div class="list-item" style="flex-direction:column;align-items:stretch">
      <div class="main" style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <div class="title">${esc(pr.sku_id)} 定价测算</div>
          <div class="meta">固本 ${money(r.固本)} · 可变率 ${(r.变率*100).toFixed(1)}%</div>
        </div>
        <button class="btn-icon" data-del-pricing="${esc(pr.id)}" style="color:var(--danger)">🗑</button>
      </div>
      <div style="margin-top:8px;font-size:13px">
        <div>🔴 保本价：<b>${isFinite(r.保本价) ? money(r.保本价) : '不可达'}</b></div>
        <div>🟡 目标价（净利 ${(r.目标净利率*100).toFixed(0)}%）：<b>${isFinite(r.目标价) ? money(r.目标价) : '不可达'}</b></div>
        <div>🟢 高利润价（净利 40%）：<b>${isFinite(r.高利润价) ? money(r.高利润价) : '不可达'}</b></div>
      </div>
    </div>`;
  }).join('');

  el.innerHTML = `
    <div class="page-body">
      <button class="btn btn-block" id="btn-add-pricing">＋ 新增定价测算</button>
      <div class="section-title">定价测算（${state.pricings.length}）</div>
      ${pricingCards || empty('暂无定价测算。')}
      <div class="section-title">回款记录（${state.payments.length}）</div>
      ${payRows || empty('暂无回款记录。')}
    </div>`;

  document.getElementById('btn-add-pricing').onclick = () => Forms.openPricingForm();
  el.querySelectorAll('[data-del-pay]').forEach(b => b.onclick = () => delEntity('payments', b.dataset.delPay));
  el.querySelectorAll('[data-del-pricing]').forEach(b => b.onclick = () => delEntity('pricings', b.dataset.delPricing));
}

/* ============ 更多 Tab ============ */
function renderMore(state) {
  const el = document.getElementById('more-content');
  if (!el) return;

  const supRows = state.suppliers.map(s => `
    <div class="list-item">
      <div class="main">
        <div class="title">${esc(s.供应商名称)}</div>
        <div class="meta">${esc(s.品类 || '')} · 起订 ${esc(s.起订量 ?? '—')} · ${esc(s.结算方式 || '')}</div>
      </div>
      <button class="btn-icon" data-del-sup="${esc(s.id)}" style="color:var(--danger)">🗑</button>
    </div>`).join('');

  const creatorRows = state.creators.map(c => `
    <div class="list-item">
      <div class="main">
        <div class="title">${esc(c.达人昵称)} ${statusBadge(c.建联状态, 'creator')}</div>
        <div class="meta">${esc(c.平台 || '')} · 粉丝 ${esc(c.粉丝量 ?? '—')} · ${esc(c.粉丝级别 || '')} · 报价 ${money(c.报价)}</div>
      </div>
      <button class="btn-icon" data-del-creator="${esc(c.id)}" style="color:var(--danger)">🗑</button>
    </div>`).join('');

  el.innerHTML = `
    <div class="page-body">
      <button class="btn btn-block" id="btn-add-sup">＋ 新增供应商</button>
      <div class="section-title">供应商（${state.suppliers.length}）</div>
      ${supRows || empty('暂无供应商。')}

      <button class="btn btn-block" id="btn-add-creator">＋ 新增达人</button>
      <div class="section-title">达人（${state.creators.length}）</div>
      ${creatorRows || empty('暂无达人。')}

      <div class="section-title">SOP 清单</div>
      <div id="sop-content"></div>

      <div class="section-title">数据备份</div>
      <div class="field-row">
        <button class="btn" id="btn-export">导出 JSON</button>
        <button class="btn" id="btn-import">导入 JSON</button>
      </div>
      <input type="file" id="import-file" accept="application/json" style="display:none">

      <div class="section-title">危险操作</div>
      <button class="btn btn-danger btn-block" id="btn-reset">清空所有数据</button>
    </div>`;

  document.getElementById('btn-add-sup').onclick = () => Forms.openSupplierForm();
  document.getElementById('btn-add-creator').onclick = () => Forms.openCreatorForm();
  document.getElementById('btn-export').onclick = exportData;
  document.getElementById('btn-import').onclick = () => document.getElementById('import-file').click();
  document.getElementById('import-file').onchange = importData;
  document.getElementById('btn-reset').onclick = resetData;
  el.querySelectorAll('[data-del-sup]').forEach(b => b.onclick = () => delEntity('suppliers', b.dataset.delSup));
  el.querySelectorAll('[data-del-creator]').forEach(b => b.onclick = () => delEntity('creators', b.dataset.delCreator));
}

/* ============ 通用：删除 ============ */
async function delEntity(storeName, id, msg = '确认删除？') {
  if (!confirm(msg)) return;
  await DB.delete(storeName, id);
  toast('已删除', 'success');
  document.dispatchEvent(new CustomEvent('data-changed'));
}

// 删除 SKU 及其所有关联记录（级联）
const SKU_REF_TABLES = ['instances', 'daily', 'payments', 'pricings', 'competitors', 'tasks'];
async function deleteSku(skuId) {
  // 统计引用条数，二次确认
  const refs = [];
  for (const t of SKU_REF_TABLES) {
    const rows = await DB.getByIndex(t, 'sku_id', skuId);
    if (rows.length) refs.push(`${t} ${rows.length} 条`);
  }
  const msg = refs.length
    ? `将删除该 SKU 及其关联的 ${refs.join('、')}，确认？`
    : '删除该 SKU？';
  if (!confirm(msg)) return;
  await DB.delete('skus', skuId);
  for (const t of SKU_REF_TABLES) {
    const rows = await DB.getByIndex(t, 'sku_id', skuId);
    for (const r of rows) await DB.delete(t, r.id);
  }
  toast('已删除', 'success');
  document.dispatchEvent(new CustomEvent('data-changed'));
}

/* ============ 数据导入导出 ============ */
const TABLES = ['skus', 'instances', 'daily', 'payments', 'suppliers', 'creators', 'pricings', 'competitors', 'tasks'];

async function exportData() {
  try {
    const dump = {};
    for (const t of TABLES) dump[t] = await DB.getAll(t);
    const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ecomworkbench-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('已导出备份');
  } catch (err) {
    toast('导出失败：' + (err?.message || ''), 'error');
  }
}

async function importData(e) {
  const file = e.target.files[0];
  if (!file) return;

  // 1. 解析 JSON（与写入分离，错误提示更准确）
  let data;
  try {
    data = JSON.parse(await file.text());
  } catch (err) {
    toast('导入失败：JSON 解析错误', 'error');
    e.target.value = '';
    return;
  }

  // 2. 基本结构校验
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    toast('导入失败：根应为对象', 'error');
    e.target.value = '';
    return;
  }

  // 3. 逐表写入（带字段校验）
  let n = 0;
  try {
    for (const t of TABLES) {
      const rows = data[t];
      if (rows === undefined) continue;
      if (!Array.isArray(rows)) { toast(`表 ${t} 不是数组，已跳过`, 'error'); continue; }
      for (const row of rows) {
        if (!row || typeof row !== 'object') continue;
        // skus 必须含合法 sku_id；其他表无 id 则补 uuid
        if (t === 'skus') {
          if (typeof row.sku_id !== 'string' || !row.sku_id) continue;
        } else if (!row.id) {
          row.id = Security.uuid();
        }
        await DB.put(t, row);
        n++;
      }
    }
  } catch (err) {
    toast(`导入中断：已写入 ${n} 条，其余失败（${err?.message || ''}）`, 'error');
    e.target.value = '';
    document.dispatchEvent(new CustomEvent('data-changed'));
    return;
  }

  toast(`导入成功，共 ${n} 条`, 'success');
  document.dispatchEvent(new CustomEvent('data-changed'));
  e.target.value = '';
}

async function resetData() {
  if (!confirm('确定清空所有数据？此操作不可恢复。')) return;
  for (const t of TABLES) await DB.clear(t);
  toast('已清空');
  document.dispatchEvent(new CustomEvent('data-changed'));
}

export { render };
