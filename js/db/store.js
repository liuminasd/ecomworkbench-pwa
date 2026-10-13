// ============================================
// store.js — IndexedDB 封装层（复用仰止AI Store 类，改为 9 张业务表）
// 表结构对齐 D:\EcomWorkbench\09-知识库\字段字典.md
// ============================================

import Config from '../config.js';

const DB_NAME = Config.dbName;
const DB_VERSION = Config.dbVersion;

class Store {
  constructor() {
    this.db = null;
  }

  async open() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (e) => {
        const db = e.target.result;

        // 1. SKU 主数据（keyPath = sku_id，全库唯一键）
        if (!db.objectStoreNames.contains('skus')) {
          const s = db.createObjectStore('skus', { keyPath: 'sku_id' });
          s.createIndex('状态', '状态', { unique: false });
          s.createIndex('评分', '评分', { unique: false });
          s.createIndex('品类', '品类', { unique: false });
        }

        // 2. 平台实例（一个 SKU 在多平台的记录）
        if (!db.objectStoreNames.contains('instances')) {
          const s = db.createObjectStore('instances', { keyPath: 'id' });
          s.createIndex('sku_id', 'sku_id', { unique: false });
          s.createIndex('平台', '平台', { unique: false });
        }

        // 3. SKU 日跟踪（每日出单/成本）
        if (!db.objectStoreNames.contains('daily')) {
          const s = db.createObjectStore('daily', { keyPath: 'id' });
          s.createIndex('sku_id', 'sku_id', { unique: false });
          s.createIndex('日期', '日期', { unique: false });
        }

        // 4. 回款（结算记录）
        if (!db.objectStoreNames.contains('payments')) {
          const s = db.createObjectStore('payments', { keyPath: 'id' });
          s.createIndex('sku_id', 'sku_id', { unique: false });
          s.createIndex('回款状态', '回款状态', { unique: false });
        }

        // 5. 供应商
        if (!db.objectStoreNames.contains('suppliers')) {
          const s = db.createObjectStore('suppliers', { keyPath: 'id' });
          s.createIndex('品类', '品类', { unique: false });
        }

        // 6. 达人
        if (!db.objectStoreNames.contains('creators')) {
          const s = db.createObjectStore('creators', { keyPath: 'id' });
          s.createIndex('平台', '平台', { unique: false });
          s.createIndex('建联状态', '建联状态', { unique: false });
        }

        // 7. 定价测算
        if (!db.objectStoreNames.contains('pricings')) {
          const s = db.createObjectStore('pricings', { keyPath: 'id' });
          s.createIndex('sku_id', 'sku_id', { unique: false });
        }

        // 8. 竞品分析
        if (!db.objectStoreNames.contains('competitors')) {
          const s = db.createObjectStore('competitors', { keyPath: 'id' });
          s.createIndex('sku_id', 'sku_id', { unique: false });
          s.createIndex('分析日期', '分析日期', { unique: false });
        }

        // 9. 任务（待办）
        if (!db.objectStoreNames.contains('tasks')) {
          const s = db.createObjectStore('tasks', { keyPath: 'id' });
          s.createIndex('sku_id', 'sku_id', { unique: false });
          s.createIndex('done', 'done', { unique: false });
        }
      };

      request.onsuccess = (e) => {
        this.db = e.target.result;
        this.db.onversionchange = () => {
          this.db.close();
          this.db = null;
          console.warn('IndexedDB 版本变更，连接已关闭，请刷新页面');
        };
        resolve(this.db);
      };

      request.onerror = (e) => {
        console.error('IndexedDB 打开失败', e);
        reject(e);
      };
    });
  }

  _db() {
    if (!this.db) throw new Error('数据库未就绪');
    return this.db;
  }

  async add(storeName, item) {
    return new Promise((resolve, reject) => {
      const tx = this._db().transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.add(item);
      request.onsuccess = () => resolve(item);
      request.onerror = () => reject(request.error);
    });
  }

  async put(storeName, item) {
    return new Promise((resolve, reject) => {
      const tx = this._db().transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.put(item);
      request.onsuccess = () => resolve(item);
      request.onerror = () => reject(request.error);
    });
  }

  async get(storeName, id) {
    return new Promise((resolve, reject) => {
      const tx = this._db().transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAll(storeName, indexName, direction = 'next') {
    return new Promise((resolve, reject) => {
      const tx = this._db().transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const index = indexName ? store.index(indexName) : null;
      const results = [];
      const request = (index || store).openCursor(null, direction);
      request.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) { results.push(cursor.value); cursor.continue(); }
        else resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getByIndex(storeName, indexName, value) {
    return new Promise((resolve, reject) => {
      const tx = this._db().transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const index = store.index(indexName);
      const results = [];
      const request = index.openCursor(IDBKeyRange.only(value));
      request.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) { results.push(cursor.value); cursor.continue(); }
        else resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async delete(storeName, id) {
    return new Promise((resolve, reject) => {
      const tx = this._db().transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clear(storeName) {
    return new Promise((resolve, reject) => {
      const tx = this._db().transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async execInTransaction(storeNames, callback) {
    return new Promise((resolve, reject) => {
      const tx = this._db().transaction(storeNames, 'readwrite');
      const stores = {};
      for (const name of storeNames) stores[name] = tx.objectStore(name);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('Transaction aborted'));
      try { callback(stores, tx); } catch (e) { reject(e); }
    });
  }

  async count(storeName) {
    return new Promise((resolve, reject) => {
      const tx = this._db().transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}

// 单例
const DB = new Store();
export default DB;
