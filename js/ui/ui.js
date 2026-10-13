// ============================================
// ui.js — 通用 UI 工具（toast / modal / 徽章 / DOM 帮助）
// ============================================

import Security from '../utils/security.js';

const esc = Security.escapeHtml;

/** Toast 提示 */
function toast(msg, type = '') {
  let box = document.getElementById('toast-container');
  if (!box) { box = document.createElement('div'); box.id = 'toast-container'; document.body.appendChild(box); }
  const t = document.createElement('div');
  t.className = 'toast ' + type;
  t.textContent = msg;
  box.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity 0.3s'; setTimeout(() => t.remove(), 300); }, 2200);
}

/** Modal 打开/关闭 */
function openModal(html) {
  const overlay = document.getElementById('modal-overlay');
  const box = document.getElementById('modal-box');
  box.innerHTML = html;
  overlay.classList.remove('hidden');
  overlay.onclick = (e) => { if (e.target === overlay) closeModal(); };
}
function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
  document.getElementById('modal-box').innerHTML = '';
}

/** 状态徽章 */
function badge(text, kind = 'gray') {
  return `<span class="badge badge-${kind}">${esc(text)}</span>`;
}

// 状态 → 徽章颜色映射
const BADGE_MAP = {
  sku: { '候选': 'blue', '评估中': 'yellow', '已定品': 'green', '已淘汰': 'gray' },
  payment: { '待回款': 'yellow', '部分回款': 'blue', '已回款': 'green', '异常': 'red' },
  creator: { '待联系': 'gray', '已触达': 'blue', '寄样中': 'yellow', '视频已上线': 'green', '已完成': 'green', '已放弃': 'gray' },
  listing: { '未上架': 'gray', '在售': 'green', '已下架': 'red' },
};

function statusBadge(status, group) {
  const map = BADGE_MAP[group] || {};
  const kind = map[status] || 'gray';
  return badge(status || '—', kind);
}

/** 金额/数字格式化 */
function money(v) { return Security.money(v); }
function num(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }
function pct(v) { const n = Number(v); return Number.isFinite(n) ? n + '%' : '—'; }

export { esc, toast, openModal, closeModal, badge, statusBadge, money, num, pct };
