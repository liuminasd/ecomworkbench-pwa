// ============================================
// security.js — 数据安全工具（复用自仰止AI，保留核心方法）
// ============================================

const Security = {
  /**
   * HTML 转义（防 XSS）
   */
  escapeHtml(str) {
    if (str === null || str === undefined) return '';
    // 手动转义全部 HTML 特殊字符（含引号），属性上下文（value/data-*）也安全
    return String(str).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  },

  /**
   * 简单的文本清理
   */
  sanitize(str) {
    return String(str || '').replace(/[<>]/g, '');
  },

  /**
   * 生成 UUID v4
   */
  uuid() {
    if (crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  },

  /**
   * 格式化日期为简短显示
   */
  formatTime(ts) {
    const d = new Date(ts);
    const now = new Date();
    const diffDays = Math.floor((now - d) / 86400000);
    if (diffDays === 0) return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 1) return '昨天';
    if (diffDays < 7) return `${diffDays}天前`;
    return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  },

  /**
   * 金额格式化（¥ + 两位小数）
   */
  money(v) {
    const n = Number(v);
    if (!Number.isFinite(n)) return '—';
    return '¥' + n.toFixed(2);
  },

  /**
   * 数字安全读取（非法/空 → 0 或 null）
   */
  num(v, fallback = 0) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  },

  /**
   * 日期转 YYYY-MM-DD
   */
  todayStr() {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
  },
};

export default Security;
