// ============================================
// pricing.js — 定价计算（翻译 08-财务/利润测算 的 dataviewjs）
// 口径（第 6 轮审查定死）：
//   目标净利率 = 净利 ÷ 售价（售价利润率，非成本加成率）
//   退货率按「成本口径」放大固定成本（退货损失的是货值，非售价）
//   随售价变动的只有三项：佣金 + 广告 + 汇损
// ============================================

const Pricing = {
  /**
   * 计算定价结论
   * @param {object} p 含 采购价/头程运费/尾程运费/平台佣金率/广告占比/退货率/支付汇损率/目标净利率（百分比存数值，3=3%）
   */
  calc(p) {
    const 采购价 = Number(p.采购价) || 0;
    const 头程 = Number(p.头程运费) || 0;
    const 尾程 = Number(p.尾程运费) || 0;
    const 佣金率 = (Number(p.平台佣金率) || 0) / 100;
    const 广告率 = (Number(p.广告占比) || 0) / 100;
    const 退货率 = (Number(p.退货率) || 0) / 100;
    const 汇损率 = (Number(p.支付汇损率) || 0) / 100;
    const 目标净利率v = p.目标净利率;
    const 目标净利 = (目标净利率v === '' || 目标净利率v == null || Number.isNaN(Number(目标净利率v))) ? 0.3 : Number(目标净利率v) / 100;

    const 固本 = 采购价 + 头程 + 尾程;
    const 有效固本 = 固本 * (1 + 退货率);
    const 变率 = 佣金率 + 广告率 + 汇损率;

    const 保本价 = 变率 < 1 ? 有效固本 / (1 - 变率) : Infinity;
    const 目标价 = (1 - 变率 - 目标净利) > 0 ? 有效固本 / (1 - 变率 - 目标净利) : Infinity;
    const 高利润价 = (1 - 变率 - 0.4) > 0 ? 有效固本 / (1 - 变率 - 0.4) : Infinity;

    // 三档净利率对照
    const 档位 = [0.15, 0.25, 0.40].map(t => {
      const price = (1 - 变率 - t) > 0 ? 有效固本 / (1 - 变率 - t) : Infinity;
      const profit = isFinite(price) ? price * (1 - 变率) - 有效固本 : NaN;
      return { 净利率: t, 售价: price, 净利: profit };
    });

    return {
      固本, 有效固本, 变率,
      佣金率, 广告率, 退货率, 汇损率,
      保本价, 目标价, 高利润价,
      目标净利率: 目标净利,
      档位,
    };
  },
};

export default Pricing;
