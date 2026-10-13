// ============================================
// app.js — 应用入口：打开 DB、seed、Tab 导航、数据刷新
// ============================================

import DB from '../db/store.js';
import { seedIfEmpty } from '../domain/seed.js';
import * as Dashboard from './dashboard.js';
import * as Modules from './modules.js';
import * as Sop from './sop.js';

// 全局状态（缓存所有表数据）
const state = {
  skus: [], instances: [], daily: [], payments: [],
  suppliers: [], creators: [], pricings: [], competitors: [], tasks: [],
};

async function loadAll() {
  state.skus = await DB.getAll('skus');
  state.instances = await DB.getAll('instances');
  state.daily = await DB.getAll('daily');
  state.payments = await DB.getAll('payments');
  state.suppliers = await DB.getAll('suppliers');
  state.creators = await DB.getAll('creators');
  state.pricings = await DB.getAll('pricings');
  state.competitors = await DB.getAll('competitors');
  state.tasks = await DB.getAll('tasks');
}

function getState() { return state; }

async function refresh() {
  await loadAll();
  Dashboard.render(state);
  Modules.render(state);
  Sop.render(state);
}

// 数据变更事件：其他模块保存后 dispatch，这里统一刷新
document.addEventListener('data-changed', () => { refresh().catch(console.error); });

// Tab 导航
function bindNav() {
  const refreshBtn = document.getElementById('btn-refresh');
  if (refreshBtn) refreshBtn.addEventListener('click', () => refresh().catch(console.error));

  const btns = document.querySelectorAll('#bottom-nav .nav-btn');
  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      document.querySelectorAll('#bottom-nav .nav-btn').forEach(b => b.classList.toggle('active', b === btn));
      document.querySelectorAll('.tab-page').forEach(p => p.classList.toggle('active', p.id === 'tab-' + tab));
      // 切换时刷新该页数据（录入页有表单，交给各模块自己处理）
      if (tab === 'dashboard') Dashboard.render(state);
    });
  });
}

function registerSW() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(e => console.warn('SW 注册失败', e));
    });
  }
}

async function init() {
  try {
    await DB.open();
  } catch (e) {
    console.error('数据库打开失败', e);
    return;
  }
  await seedIfEmpty(DB);
  bindNav();
  registerSW();
  await refresh();
  document.getElementById('app').classList.remove('hidden');
}

export { getState, refresh };
init();
