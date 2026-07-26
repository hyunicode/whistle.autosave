const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { INDEX_FILE, MAX_META, readMeta, recordMeta } = require('../lib/metaStore');

describe('metaStore', () => {
  let dir;

  before(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'autosave-meta-'));
  });

  after(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test('索引文件名为隐藏文件', () => {
    assert.equal(INDEX_FILE, '.autosave-index.json');
  });

  test('目录无索引时返回空对象', () => {
    assert.deepEqual(readMeta(dir), {});
  });

  test('recordMeta 后可读回', () => {
    recordMeta(dir, 'list_1.json', { url: 'https://ke.qq.com/api/list', contentType: 'application/json', time: 100 });
    const meta = readMeta(dir);
    assert.equal(meta['list_1.json'].url, 'https://ke.qq.com/api/list');
    assert.equal(meta['list_1.json'].contentType, 'application/json');
  });

  test('重复记录覆盖同名文件', () => {
    recordMeta(dir, 'list_1.json', { url: 'https://ke.qq.com/api/list?v=2', contentType: 'application/json', time: 200 });
    assert.equal(readMeta(dir)['list_1.json'].url, 'https://ke.qq.com/api/list?v=2');
  });

  test('索引损坏时返回空对象而不是抛错', () => {
    const badDir = fs.mkdtempSync(path.join(os.tmpdir(), 'autosave-bad-'));
    fs.writeFileSync(path.join(badDir, INDEX_FILE), '{not json');
    assert.deepEqual(readMeta(badDir), {});
    fs.rmSync(badDir, { recursive: true, force: true });
  });

  test('条目数量封顶并淘汰最旧记录', () => {
    const capDir = fs.mkdtempSync(path.join(os.tmpdir(), 'autosave-cap-'));
    for (let i = 0; i < MAX_META + 10; i += 1) {
      recordMeta(capDir, `f_${i}.json`, { url: `https://a.com/${i}`, contentType: 'application/json', time: i });
    }
    const meta = readMeta(capDir);
    const keys = Object.keys(meta);
    assert.equal(keys.length, MAX_META);
    assert.equal(meta['f_0.json'], undefined);
    assert.ok(meta[`f_${MAX_META + 9}.json`]);
    fs.rmSync(capDir, { recursive: true, force: true });
  });
});
