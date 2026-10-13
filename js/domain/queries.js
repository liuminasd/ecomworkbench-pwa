// ============================================
// queries.js — 查询引擎（翻译总控台的 10 个 Dataview 查询）
// 均为纯函数：接收数据数组，返回结果；字段名对齐字段字典
// ============================================

import Config from '../config.js';

const T = Config.thresholds;

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const Queries = {
  // 1️⃣ 有哪些品该动：评分 ≥ 7.5 且未淘汰
  highScoreCandidates(skus) {
    return skus
      .filter(s => num(s.评分) >= T.scoreMin && s.状态 !== '已淘汰')
      .sort((a, b) => num(b.评分) - num(a.评分));
  },

  // 2️⃣ 哪个品在亏钱：预估毛利率 < 15 或 退货率 > 10
  lossMaking(skus) {
    return skus
      .filter(s => {
        const m = s.预估毛利率;
        const r = s.退货率;
        return (m !== null && m !== undefined && m !== '' && num(m) < T.marginMin)
          || (r !== null && r !== undefined && r !== '' && num(r) > T.returnMax);
      })
      .sort((a, b) => num(a.预估毛利率) - num(b.预估毛利率));
  },

  // 3️⃣ 钱回来了吗：回款状态 ≠ 已回款
  unpaidPayments(payments) {
    const order = { '异常': 0, '待回款': 1, '部分回款': 2 };
    return payments
      .filter(p => p.回款状态 !== '已回款')
      .sort((a, b) => (order[a.回款状态] ?? 9) - (order[b.回款状态] ?? 9));
  },

  // 4️⃣ 谁在等我：建联未完成 且 距最近联系 > 3 天
  staleCreators(creators) {
    const now = Date.now();
    return creators
      .filter(c => {
        if (c.建联状态 === '已完成' || c.建联状态 === '已放弃') return false;
        if (!c.最近联系) return false;
        const days = (now - new Date(c.最近联系).getTime()) / 86400000;
        return days > T.creatorStaleDays;
      })
      .sort((a, b) => new Date(a.最近联系) - new Date(b.最近联系));
  },

  // 5️⃣ 今天要做什么：未完成任务
  openTasks(tasks) {
    return tasks.filter(t => !t.done);
  },

  // 🔍 单 SKU 全景：采购/售价/毛利/累计订单/GMV/净利/回款
  skuPanorama(sku, instances, daily, payments) {
    const id = sku.sku_id;
    const inst = instances.filter(i => i.sku_id === id);
    const prices = inst.map(i => num(i.售价)).filter(x => x > 0);
    const 售价 = prices.length ? prices[0] : null;

    const days = daily.filter(d => d.sku_id === id);
    const gmv = days.reduce((s, d) => s + num(d.GMV), 0);
    const cost = days.reduce((s, d) => s + num(d.总成本), 0);
    const ord = days.reduce((s, d) => s + num(d.订单数), 0);

    const pays = payments.filter(p => p.sku_id === id);
    const 回款状态 = pays.length ? [...new Set(pays.map(p => p.回款状态))].join('/') : null;

    return {
      sku_id: id,
      采购价: num(sku.采购价),
      售价,
      预估毛利率: sku.预估毛利率,
      累计订单: ord,
      累计GMV: gmv,
      累计净利: gmv - cost,
      回款状态,
    };
  },

  // 📊 全局指标
  globalMetrics(skus, suppliers, creators) {
    const byStatus = (st) => skus.filter(s => s.状态 === st).length;
    return {
      候选: byStatus('候选'),
      评估中: byStatus('评估中'),
      已定品: byStatus('已定品'),
      已淘汰: byStatus('已淘汰'),
      供应商: suppliers.length,
      达人: creators.length,
    };
  },

  // 📈 近 7 天汇总（按 sku_id 分组）
  recent7Days(daily) {
    const cutoff = Date.now() - 7 * 86400000;
    const recent = daily.filter(d => {
      const t = new Date(d.日期).getTime();
      return Number.isFinite(t) && t >= cutoff;
    });
    const ids = [...new Set(recent.map(d => d.sku_id).filter(Boolean))];
    const rows = ids.map(id => {
      const rs = recent.filter(d => d.sku_id === id);
      const gmv = rs.reduce((s, d) => s + num(d.GMV), 0);
      const cost = rs.reduce((s, d) => s + num(d.总成本), 0);
      const ord = rs.reduce((s, d) => s + num(d.订单数), 0);
      const profit = gmv - cost;
      const margin = gmv ? (profit / gmv * 100) : null;
      return { sku_id: id, 订单: ord, GMV: gmv, 成本: cost, 净利: profit, 毛利率: margin };
    });
    const 合计 = rows.reduce((s, r) => ({
      订单: s.订单 + r.订单, GMV: s.GMV + r.GMV, 成本: s.成本 + r.成本, 净利: s.净利 + r.净利,
    }), { 订单: 0, GMV: 0, 成本: 0, 净利: 0 });
    return { rows, 合计, hasData: recent.length > 0 };
  },

  // 竞品覆盖率
  competitorCoverage(skus, competitors) {
    const doneIds = new Set(competitors.map(c => c.sku_id).filter(Boolean));
    let done = 0;
    const rows = skus.map(s => {
      const has = doneIds.has(s.sku_id);
      if (has) done++;
      return { sku_id: s.sku_id, 名称: s.名称 || s.sku_id, 已分析: has };
    });
    const rate = skus.length ? (done / skus.length * 100) : 0;
    return { done, total: skus.length, rate, rows };
  },
};

export default Queries;
