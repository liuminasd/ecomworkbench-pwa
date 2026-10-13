// ============================================
// seed.js — 预置示例数据（PET-DEO-001 一套，取自 Obsidian 现有示例文件）
// 仅当库为空时写入，不覆盖用户真实数据
// ============================================

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

const today = daysAgo(0);

const Seed = {
  skus: [
    {
      sku_id: 'PET-DEO-001', 名称: '宠物除臭喷雾', 状态: '候选',
      平台: 'TikTokShop', 品类: '宠物用品', 货源: '1688 宠物除臭喷雾',
      采购价: 9, 预估售价: 45, 预估毛利率: 40, 退货率: 5, 评分: 8.3,
      风险点: '液体运输需确认可寄渠道',
    },
  ],
  instances: [
    { id: 'seed-inst-petdeo', sku_id: 'PET-DEO-001', 平台: 'TikTokShop', 站点: '菲律宾', 平台商品ID: '', 售价: 45, 佣金率: 3, 上架状态: '未上架', 商品链接: '' },
  ],
  daily: [
    { id: 'seed-daily-1', sku_id: 'PET-DEO-001', 平台: 'TikTokShop', 日期: daysAgo(2), 订单数: 3, GMV: 135, 总成本: 81, 广告花费: 13.5, 退货数: 0, 访客数: 50 },
    { id: 'seed-daily-2', sku_id: 'PET-DEO-001', 平台: 'TikTokShop', 日期: daysAgo(1), 订单数: 5, GMV: 225, 总成本: 135, 广告花费: 22.5, 退货数: 1, 访客数: 80 },
    { id: 'seed-daily-3', sku_id: 'PET-DEO-001', 平台: 'TikTokShop', 日期: daysAgo(0), 订单数: 4, GMV: 180, 总成本: 108, 广告花费: 18, 退货数: 0, 访客数: 60 },
  ],
  payments: [
    { id: 'seed-pay-1', sku_id: 'PET-DEO-001', 平台: 'TikTokShop', 金额: 135, 回款状态: '待回款', 账期: 'T+7', 预计到账: '' },
  ],
  suppliers: [
    { id: 'seed-sup-1', 供应商名称: '1688 示例宠物用品厂', 品类: '宠物用品', 结算方式: '支付宝', 起订量: 100 },
  ],
  creators: [
    { id: 'seed-creator-1', 达人昵称: '示例达人', 平台: 'TikTokShop', 粉丝量: 15000, 粉丝级别: '尾部', 建联状态: '待联系', 报价: 300, 最近联系: today },
  ],
  pricings: [
    { id: 'seed-pricing-1', sku_id: 'PET-DEO-001', 平台: 'TikTokShop', 站点: '菲律宾', 币种: 'CNY', 采购价: 9, 头程运费: 3.5, 尾程运费: 4, 平台佣金率: 3, 广告占比: 10, 退货率: 5, 支付汇损率: 2, 目标净利率: 30 },
  ],
  competitors: [
    { id: 'seed-comp-1', sku_id: 'PET-DEO-001', 平台: 'TikTokShop', 站点: '菲律宾', 品类: '宠物用品', 分析日期: today, 竞品数: 2, 备注: '竞品价格带 ¥42–49，我方 ¥45 居中；差异化：防堵喷头 + 不漏液' },
  ],
  tasks: [
    { id: 'seed-task-1', 内容: '液体品类需确认物流可寄', sku_id: 'PET-DEO-001', done: false },
    { id: 'seed-task-2', 内容: '需确认目的地成分合规', sku_id: 'PET-DEO-001', done: false },
    { id: 'seed-task-3', 内容: '确认下一个大促节点', sku_id: '', done: false },
  ],
};

/**
 * 若库为空，写入示例数据；返回是否执行了 seed
 */
async function seedIfEmpty(DB) {
  try {
    const count = await DB.count('skus');
    if (count > 0) return false;
    for (const [table, rows] of Object.entries(Seed)) {
      for (const row of rows) {
        await DB.add(table, row);
      }
    }
    return true;
  } catch (e) {
    console.warn('seed 写入失败（可忽略）', e);
    return false;
  }
}

export { Seed, seedIfEmpty };
