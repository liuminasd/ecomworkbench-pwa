// DOM 渲染测试：jsdom 模拟浏览器，验证 dashboard/modules/sop 的 render 不抛异常且正确填充
import { JSDOM } from 'jsdom';
import 'fake-indexeddb/auto';
import DB from '../js/db/store.js';
import { seedIfEmpty } from '../js/domain/seed.js';
import * as Dashboard from '../js/ui/dashboard.js';
import * as Modules from '../js/ui/modules.js';
import * as Sop from '../js/ui/sop.js';

const html = `<!DOCTYPE html><html><body>
  <div id="app">
    <div id="dash-content"></div>
    <div id="selection-content"></div>
    <div id="entry-content"></div>
    <div id="finance-content"></div>
    <div id="more-content"></div>
  </div>
  <div id="toast-container"></div>
  <div id="modal-overlay" class="hidden"><div id="modal-box"></div></div>
</body></html>`;

const dom = new JSDOM(html, { url: 'http://localhost/' });
global.window = dom.window;
global.document = dom.window.document;
global.confirm = () => true; // 删除确认直接通过

let pass = 0, fail = 0;
const check = (name, cond) => { console.log(`${cond ? '✅' : '❌'} ${name}`); cond ? pass++ : fail++; };

await DB.open();
await seedIfEmpty(DB);

const state = {
  skus: await DB.getAll('skus'),
  instances: await DB.getAll('instances'),
  daily: await DB.getAll('daily'),
  payments: await DB.getAll('payments'),
  suppliers: await DB.getAll('suppliers'),
  creators: await DB.getAll('creators'),
  pricings: await DB.getAll('pricings'),
  competitors: await DB.getAll('competitors'),
  tasks: await DB.getAll('tasks'),
};

let threw = null;
try {
  Dashboard.render(state);
  Modules.render(state);
  Sop.render(state);
} catch (e) { threw = e; }
check('render 无异常', !threw);

const dashHtml = document.getElementById('dash-content').innerHTML;
check('dash 渲染 SKU 名称', dashHtml.includes('宠物除臭喷雾'));
check('dash 渲染决策问题①', dashHtml.includes('哪些品该动'));
check('dash 渲染覆盖率', dashHtml.includes('竞品分析覆盖率'));
check('dash 渲染近7天', dashHtml.includes('近 7 天'));

const selHtml = document.getElementById('selection-content').innerHTML;
check('选品页渲染 SKU', selHtml.includes('宠物除臭喷雾'));

const finHtml = document.getElementById('finance-content').innerHTML;
check('财务页渲染保本价', finHtml.includes('保本价'));

const moreHtml = document.getElementById('more-content').innerHTML;
check('更多页渲染供应商', moreHtml.includes('1688 示例宠物用品厂'));

const sopHtml = document.getElementById('sop-content').innerHTML;
check('SOP 渲染冷启动投放', sopHtml.includes('冷启动投放'));

console.log(`\n结果：${pass} 通过，${fail} 失败`);
if (threw) console.log('异常:', threw.message);
process.exit(fail ? 1 : 0);
