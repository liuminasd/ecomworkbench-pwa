// 核心逻辑回归测试：对照 Obsidian 已知结果验证
import Pricing from '../js/domain/pricing.js';
import Queries from '../js/domain/queries.js';

let pass = 0, fail = 0;
function eq(name, actual, expected) {
  const ok = Math.abs(actual - expected) < 0.01;
  console.log(`${ok ? '✅' : '❌'} ${name}: ${actual} ${ok ? '' : `(期望 ${expected})`}`);
  ok ? pass++ : fail++;
}

// ===== 定价：对照 定价-PET-DEO-001.md =====
const r = Pricing.calc({
  采购价: 9, 头程运费: 3.5, 尾程运费: 4,
  平台佣金率: 3, 广告占比: 10, 退货率: 5, 支付汇损率: 2, 目标净利率: 30,
});
eq('固本', r.固本, 16.5);
eq('有效固本(退货5%成本口径)', r.有效固本, 17.325);
eq('可变成本率', r.变率, 0.15);
eq('保本价', r.保本价, 20.382);
eq('目标价(净利30%)', r.目标价, 31.5);
const net45 = 45 * (1 - r.变率) - r.有效固本;
eq('售价45净利', net45, 20.925);
eq('售价45净利率%', net45 / 45 * 100, 46.5);

// ===== 查询：对照总控台规则 =====
const skus = [
  { sku_id: 'PET-DEO-001', 名称: '宠物除臭喷雾', 状态: '候选', 评分: 8.3, 预估毛利率: 40, 退货率: 5, 采购价: 9 },
  { sku_id: 'HOM-WIP-002', 名称: '亏本品', 状态: '已定品', 评分: 6, 预估毛利率: 10, 退货率: 3, 采购价: 5 },
  { sku_id: 'BEA-CRM-003', 名称: '高退货', 状态: '评估中', 评分: 7.8, 预估毛利率: 30, 退货率: 18, 采购价: 12 },
];
eq('高分候选数(≥7.5且未淘汰)', Queries.highScoreCandidates(skus).length, 2);
eq('亏损品数(毛利<15或退货>10)', Queries.lossMaking(skus).length, 2);

const competitors = [{ sku_id: 'PET-DEO-001', 竞品数: 2 }];
const cov = Queries.competitorCoverage(skus, competitors);
eq('竞品覆盖率 1/3', cov.done, 1);
eq('竞品覆盖率%', cov.rate, 33.333);

const daily = [
  { sku_id: 'PET-DEO-001', 日期: '2026-10-13', 订单数: 4, GMV: 180, 总成本: 108 },
  { sku_id: 'PET-DEO-001', 日期: '2026-10-12', 订单数: 5, GMV: 225, 总成本: 135 },
];
const r7 = Queries.recent7Days(daily);
eq('近7天GMV', r7.合计.GMV, 405);
eq('近7天净利', r7.合计.净利, 162);
eq('近7天净利率%', 162 / 405 * 100, 40);

console.log(`\n结果：${pass} 通过，${fail} 失败`);
process.exit(fail ? 1 : 0);
