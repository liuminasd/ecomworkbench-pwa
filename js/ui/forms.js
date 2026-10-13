// ============================================
// forms.js — 各实体录入表单（模态框），字段对齐字段字典
// ============================================

import Config from '../config.js';
import DB from '../db/store.js';
import Security from '../utils/security.js';
import { esc, openModal, closeModal, toast } from './ui.js';

const E = Config.enums;

/** 输入字段 */
function input(name, label, value = '', type = 'text', hint = '', readonly = false) {
  return `<div class="field"><label>${esc(label)}</label>
    <input name="${esc(name)}" type="${type}" value="${esc(value)}" ${type === 'number' ? 'inputmode="decimal"' : ''} ${readonly ? 'readonly style="opacity:.6"' : ''}>
    ${hint ? `<div class="hint">${esc(hint)}</div>` : ''}</div>`;
}

/** 下拉字段 */
function select(name, label, value, options, hint = '') {
  const opts = options.map(o => `<option value="${esc(o)}" ${o === value ? 'selected' : ''}>${esc(o)}</option>`).join('');
  return `<div class="field"><label>${esc(label)}</label>
    <select name="${esc(name)}"><option value="">—</option>${opts}</select>
    ${hint ? `<div class="hint">${esc(hint)}</div>` : ''}</div>`;
}

/** 文本域 */
function textarea(name, label, value = '') {
  return `<div class="field"><label>${esc(label)}</label><textarea name="${esc(name)}">${esc(value)}</textarea></div>`;
}

/** 表单框架：标题 + 字段 + 保存按钮 */
function formShell(title, fieldsHtml, saveFn) {
  openModal(`<h3>${esc(title)}</h3>
    <form id="entity-form">${fieldsHtml}
    <div class="modal-actions">
      <button type="button" class="btn" id="btn-form-cancel">取消</button>
      <button type="submit" class="btn btn-primary">保存</button>
    </div></form>`);
  document.getElementById('btn-form-cancel').onclick = closeModal;
  document.getElementById('entity-form').onsubmit = (e) => {
    e.preventDefault();
    Promise.resolve(saveFn()).catch(err => toast('保存失败：' + (err?.message || ''), 'error'));
  };
  injectSkuOptions().catch(err => console.warn('SKU 下拉加载失败', err)); // 填充 sku_id 下拉（如有）
}

/** 读取表单所有命名字段 */
function readForm() {
  const obj = {};
  document.querySelectorAll('#entity-form [name]').forEach(el => {
    if (el.type === 'checkbox') { obj[el.name] = el.checked; return; }
    const v = el.value;
    // 文本类字段 trim，避免 sku_id/名称带空格导致关联静默失败
    obj[el.name] = (el.type === 'number') ? v : (typeof v === 'string' ? v.trim() : v);
  });
  return obj;
}

/** 保存成功后统一动作 */
function saved(msg) {
  closeModal();
  toast(msg, 'success');
  document.dispatchEvent(new CustomEvent('data-changed'));
}

/** 数字字段转数值（空串保留空串） */
function toNumObj(obj, keys) {
  keys.forEach(k => { if (obj[k] !== undefined && obj[k] !== '') obj[k] = Number(obj[k]); });
  return obj;
}

/* ============ SKU 主数据 ============ */
function openSkuForm(sku = null) {
  const isEdit = !!sku;
  formShell(isEdit ? '编辑 SKU' : '新增 SKU',
    input('sku_id', 'sku_id（唯一键）', sku?.sku_id || '', 'text', '格式：品类缩写-二级缩写-序号，如 PET-DEO-001', isEdit) +
    input('名称', '商品名称', sku?.名称 || '') +
    select('状态', '状态', sku?.状态 || '候选', E.skuStatus) +
    select('平台', '主推平台', sku?.平台 || '', E.platforms) +
    select('品类', '品类', sku?.品类 || '', E.categories) +
    input('货源', '货源', sku?.货源 || '') +
    input('采购价', '采购价（元）', sku?.采购价 ?? '', 'number') +
    input('预估售价', '预估售价（元）', sku?.预估售价 ?? '', 'number') +
    input('预估毛利率', '预估毛利率（%）', sku?.预估毛利率 ?? '', 'number', '数值，40 = 40%；是净利率口径') +
    input('退货率', '退货率（%）', sku?.退货率 ?? '', 'number') +
    input('评分', '评分（0–10）', sku?.评分 ?? '', 'number') +
    textarea('风险点', '风险点', sku?.风险点 || ''),
    async () => {
      const obj = toNumObj(readForm(), ['采购价', '预估售价', '预估毛利率', '退货率', '评分']);
      if (!obj.sku_id) return toast('sku_id 必填', 'error');
      try {
        if (isEdit) await DB.put('skus', { ...sku, ...obj, sku_id: sku.sku_id });
        else await DB.add('skus', obj);
        saved('SKU 已保存');
      } catch (e) { toast('保存失败：' + (e?.message || 'sku_id 可能已存在'), 'error'); }
    });
}

/* ============ 平台实例 ============ */
function openInstanceForm(inst = null) {
  const isEdit = !!inst;
  formShell(isEdit ? '编辑平台实例' : '新增平台实例',
    select('sku_id', '关联 SKU', inst?.sku_id || '', []) +
    select('平台', '平台', inst?.平台 || '', E.platforms) +
    select('站点', '站点', inst?.站点 || '', E.sites) +
    input('平台商品ID', '平台商品ID', inst?.平台商品ID || '') +
    input('售价', '售价（元）', inst?.售价 ?? '', 'number') +
    input('佣金率', '佣金率（%）', inst?.佣金率 ?? '', 'number') +
    select('上架状态', '上架状态', inst?.上架状态 || '未上架', E.listingStatus),
    async () => {
      const obj = toNumObj(readForm(), ['售价', '佣金率']);
      if (!obj.sku_id) return toast('必须关联 SKU', 'error');
      if (isEdit) await DB.put('instances', { ...inst, ...obj, id: inst.id });
      else await DB.add('instances', { ...obj, id: Security.uuid() });
      saved('平台实例已保存');
    });
}

/* ============ 日跟踪 ============ */
function openDailyForm() {
  formShell('录入日跟踪',
    select('sku_id', '关联 SKU', '', []) +
    select('平台', '平台', '', E.platforms) +
    input('日期', '日期', Security.todayStr(), 'date') +
    input('订单数', '订单数', '', 'number') +
    input('GMV', 'GMV（元）', '', 'number') +
    input('总成本', '总成本（元）', '', 'number', '全包口径：含商品+佣金+广告+退货+运费') +
    input('广告花费', '广告花费（元）', '', 'number') +
    input('退货数', '退货数', '', 'number') +
    input('访客数', '访客数', '', 'number'),
    async () => {
      const obj = toNumObj(readForm(), ['订单数', 'GMV', '总成本', '广告花费', '退货数', '访客数']);
      if (!obj.sku_id) return toast('必须关联 SKU', 'error');
      await DB.add('daily', { ...obj, id: Security.uuid() });
      saved('日跟踪已录入');
    });
}

/* ============ 回款 ============ */
function openPaymentForm() {
  formShell('录入回款',
    select('sku_id', '关联 SKU', '', []) +
    select('平台', '平台', '', E.platforms) +
    input('金额', '应收金额（元）', '', 'number') +
    select('回款状态', '回款状态', '待回款', E.paymentStatus) +
    input('账期', '账期', 'T+7') +
    input('预计到账', '预计到账', '', 'date'),
    async () => {
      const obj = toNumObj(readForm(), ['金额']);
      if (!obj.sku_id) return toast('必须关联 SKU', 'error');
      await DB.add('payments', { ...obj, id: Security.uuid() });
      saved('回款已录入');
    });
}

/* ============ 供应商 ============ */
function openSupplierForm(sup = null) {
  const isEdit = !!sup;
  formShell(isEdit ? '编辑供应商' : '新增供应商',
    input('供应商名称', '供应商名称', sup?.供应商名称 || '') +
    select('品类', '品类', sup?.品类 || '', E.categories) +
    select('结算方式', '结算方式', sup?.结算方式 || '', Config.settleModes) +
    input('起订量', '起订量', sup?.起订量 ?? '', 'number'),
    async () => {
      const obj = toNumObj(readForm(), ['起订量']);
      if (!obj.供应商名称) return toast('供应商名称必填', 'error');
      if (isEdit) await DB.put('suppliers', { ...sup, ...obj, id: sup.id });
      else await DB.add('suppliers', { ...obj, id: Security.uuid() });
      saved('供应商已保存');
    });
}

/* ============ 达人 ============ */
function openCreatorForm(c = null) {
  const isEdit = !!c;
  formShell(isEdit ? '编辑达人' : '新增达人',
    input('达人昵称', '达人昵称', c?.达人昵称 || '') +
    select('平台', '平台', c?.平台 || '', E.platforms) +
    input('粉丝量', '粉丝量', c?.粉丝量 ?? '', 'number') +
    select('粉丝级别', '粉丝级别', c?.粉丝级别 || '', Config.creatorTiers) +
    select('建联状态', '建联状态', c?.建联状态 || '待联系', E.creatorStatus) +
    input('报价', '报价（元）', c?.报价 ?? '', 'number') +
    input('最近联系', '最近联系', c?.最近联系 || Security.todayStr(), 'date'),
    async () => {
      const obj = toNumObj(readForm(), ['粉丝量', '报价']);
      if (!obj.达人昵称) return toast('达人昵称必填', 'error');
      if (isEdit) await DB.put('creators', { ...c, ...obj, id: c.id });
      else await DB.add('creators', { ...obj, id: Security.uuid() });
      saved('达人已保存');
    });
}

/* ============ 定价测算 ============ */
function openPricingForm(pricing = null) {
  const isEdit = !!pricing;
  formShell(isEdit ? '编辑定价测算' : '新增定价测算',
    select('sku_id', '关联 SKU', pricing?.sku_id || '', []) +
    select('平台', '平台', pricing?.平台 || '', E.platforms) +
    select('站点', '站点', pricing?.站点 || '', E.sites) +
    select('币种', '币种', pricing?.币种 || 'CNY', E.currencies) +
    input('采购价', '采购价（元）', pricing?.采购价 ?? '', 'number') +
    input('头程运费', '头程运费（元）', pricing?.头程运费 ?? '', 'number') +
    input('尾程运费', '尾程运费（元）', pricing?.尾程运费 ?? '', 'number') +
    input('平台佣金率', '平台佣金率（%）', pricing?.平台佣金率 ?? '', 'number') +
    input('广告占比', '广告占比（%）', pricing?.广告占比 ?? '', 'number') +
    input('退货率', '退货率（%）', pricing?.退货率 ?? '', 'number') +
    input('支付汇损率', '支付汇损率（%）', pricing?.支付汇损率 ?? '', 'number') +
    input('目标净利率', '目标净利率（%）', pricing?.目标净利率 ?? '', 'number', '净利÷售价，非成本加成率'),
    async () => {
      const obj = toNumObj(readForm(), ['采购价', '头程运费', '尾程运费', '平台佣金率', '广告占比', '退货率', '支付汇损率', '目标净利率']);
      if (!obj.sku_id) return toast('必须关联 SKU', 'error');
      if (isEdit) await DB.put('pricings', { ...pricing, ...obj, id: pricing.id });
      else await DB.add('pricings', { ...obj, id: Security.uuid() });
      saved('定价测算已保存');
    });
}

/* ============ 竞品分析 ============ */
function openCompetitorForm(comp = null) {
  const isEdit = !!comp;
  formShell(isEdit ? '编辑竞品分析' : '新增竞品分析',
    select('sku_id', '关联 SKU', comp?.sku_id || '', []) +
    select('平台', '平台', comp?.平台 || '', E.platforms) +
    select('站点', '站点', comp?.站点 || '', E.sites) +
    select('品类', '品类', comp?.品类 || '', E.categories) +
    input('分析日期', '分析日期', comp?.分析日期 || Security.todayStr(), 'date') +
    input('竞品数', '竞品数', comp?.竞品数 ?? '', 'number') +
    textarea('备注', '备注（竞品价格带/差异化）', comp?.备注 || ''),
    async () => {
      const obj = toNumObj(readForm(), ['竞品数']);
      if (!obj.sku_id) return toast('必须关联 SKU', 'error');
      if (isEdit) await DB.put('competitors', { ...comp, ...obj, id: comp.id });
      else await DB.add('competitors', { ...obj, id: Security.uuid() });
      saved('竞品分析已保存');
    });
}

/* ============ 任务 ============ */
function openTaskForm() {
  formShell('新增待办',
    textarea('内容', '任务内容') +
    select('sku_id', '关联 SKU（可选）', '', []),
    async () => {
      const obj = readForm();
      if (!obj.内容) return toast('任务内容必填', 'error');
      await DB.add('tasks', { ...obj, done: false, id: Security.uuid() });
      saved('任务已添加');
    });
}

/**
 * 将 SKU 列表注入到下拉框中（打开表单时调用）
 */
async function injectSkuOptions() {
  const skus = await DB.getAll('skus');
  const html = skus.map(s => `<option value="${esc(s.sku_id)}">${esc(s.名称 || s.sku_id)}</option>`).join('');
  document.querySelectorAll('#entity-form select[name="sku_id"]').forEach(sel => {
    const cur = sel.value;
    sel.innerHTML = `<option value="">—</option>${html}`;
    if (cur) sel.value = cur;
  });
}

export {
  openSkuForm, openInstanceForm, openDailyForm, openPaymentForm,
  openSupplierForm, openCreatorForm, openPricingForm, openCompetitorForm, openTaskForm,
  injectSkuOptions,
};
