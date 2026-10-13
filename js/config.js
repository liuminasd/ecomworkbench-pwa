// ============================================
// config.js — 应用配置、枚举、阈值
// 字段口径以 D:\EcomWorkbench\09-知识库\字段字典.md 为唯一事实源
// ============================================

const Config = {
  // 数据库
  dbName: 'ecomworkbench',
  dbVersion: 1,

  // 品牌
  appName: 'EcomWorkbench',
  appShortName: '工作台',

  // 阈值（对应总控台的决策规则）
  thresholds: {
    scoreMin: 7.5,        // 高分候选门槛（评分 ≥ 7.5）
    marginMin: 15,        // 毛利率红线（< 15% 判亏）
    returnMax: 10,        // 退货率红线（> 10% 判险）
    creatorStaleDays: 3,  // 达人待跟进超 3 天
  },

  // 枚举（严格照抄字段字典，不加粗不加引号）
  enums: {
    // SKU 状态：候选 → 评估中 → 已定品 ／ 已淘汰
    skuStatus: ['候选', '评估中', '已定品', '已淘汰'],
    // 达人建联状态
    creatorStatus: ['待联系', '已触达', '寄样中', '视频已上线', '已完成', '已放弃'],
    // 回款状态
    paymentStatus: ['待回款', '部分回款', '已回款', '异常'],
    // 上架状态
    listingStatus: ['未上架', '在售', '已下架'],
    // 平台
    platforms: ['TikTokShop', '亚马逊', '独立站'],
    // 站点
    sites: ['菲律宾', '泰国', '马来西亚', '越南', '新加坡', '北美', '其他'],
    // 品类（一级）
    categories: ['宠物用品', '家居日用', '美妆个护', '数码配件', '玩具', '户外', '服饰配件'],
    // 币种
    currencies: ['CNY', 'USD', 'PHP', 'THB', 'MYR', 'VND', 'SGD'],
  },

  // 品类缩写字典（用于生成 sku_id 前缀）
  categoryCodes: {
    '宠物用品': 'PET', '家居日用': 'HOM', '美妆个护': 'BEA', '数码配件': 'DIG',
    '玩具': 'TOY', '户外': 'OUT', '服饰配件': 'APP',
  },

  // 达人粉丝级别
  creatorTiers: ['头', '腰', '尾'],

  // 结算方式
  settleModes: ['支付宝', '微信', '对公转账', 'PayPal', '货到付款', '其他'],
};

export default Config;
