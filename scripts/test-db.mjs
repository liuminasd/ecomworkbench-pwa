// 数据层端到端测试：fake-indexeddb 模拟浏览器，验证 store.js + seed + queries
import 'fake-indexeddb/auto';
import DB from '../js/db/store.js';
import { seedIfEmpty } from '../js/domain/seed.js';
import Queries from '../js/domain/queries.js';
import Pricing from '../js/domain/pricing.js';

let pass = 0, fail = 0;
const eq = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`${ok ? '✅' : '❌'} ${name}: ${JSON.stringify(actual)} ${ok ? '' : '(期望 ' + JSON.stringify(expected) + ')'}`);
  ok ? pass++ : fail++;
};

await DB.open();
console.log('数据库打开成功');

const seeded = await seedIfEmpty(DB);
eq('首次 seed 执行', seeded, true);
const seeded2 = await seedIfEmpty(DB);
eq('二次 seed 跳过(不覆盖)', seeded2, false);

const skus = await DB.getAll('skus');
const instances = await DB.getAll('instances');
const daily = await DB.getAll('daily');
const payments = await DB.getAll('payments');
const suppliers = await DB.getAll('suppliers');
const creators = await DB.getAll('creators');
const pricings = await DB.getAll('pricings');
const competitors = await DB.getAll('competitors');
const tasks = await DB.getAll('tasks');

eq('skus 数量', skus.length, 1);
eq('sku_id', skus[0].sku_id, 'PET-DEO-001');
eq('sku 名称', skus[0].名称, '宠物除臭喷雾');
eq('instances 数量', instances.length, 1);
eq('daily 数量', daily.length, 3);
eq('payments 数量', payments.length, 1);
eq('suppliers 数量', suppliers.length, 1);
eq('creators 数量', creators.length, 1);
eq('pricings 数量', pricings.length, 1);
eq('competitors 数量', competitors.length, 1);
eq('tasks 数量', tasks.length, 3);

// 查询引擎（用真实 seed 数据）
const state = { skus, instances, daily, payments, suppliers, creators, pricings, competitors, tasks };
eq('高分候选数', Queries.highScoreCandidates(skus).length, 1);
eq('亏损品数', Queries.lossMaking(skus).length, 0);
eq('未回款数', Queries.unpaidPayments(payments).length, 1);
eq('超期达人数', Queries.staleCreators(creators).length, 0);
eq('未完成任务数', Queries.openTasks(tasks).length, 3);
eq('覆盖率 done', Queries.competitorCoverage(skus, competitors).done, 1);
eq('覆盖率 rate', Queries.competitorCoverage(skus, competitors).rate, 100);

const pano = Queries.skuPanorama(skus[0], instances, daily, payments);
eq('全景累计订单', pano.累计订单, 12);
eq('全景累计GMV', pano.累计GMV, 540);
eq('全景累计净利', pano.累计净利, 216);
eq('全景售价', pano.售价, 45);

const r7 = Queries.recent7Days(daily);
eq('近7天合计订单', r7.合计.订单, 12);
eq('近7天合计GMV', r7.合计.GMV, 540);

const pr = Pricing.calc(pricings[0]);
eq('定价目标价', Math.round(pr.目标价 * 100) / 100, 31.5);

console.log(`\n结果：${pass} 通过，${fail} 失败`);
process.exit(fail ? 1 : 0);
