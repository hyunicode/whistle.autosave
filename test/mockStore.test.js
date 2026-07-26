const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const {
  testPattern,
  contentTypeOf,
  sanitizeEntries,
  parseEntries,
  markMocked,
  consumeMocked,
  setStreamPort,
  isStreamReq,
  DEFAULT_DELAY,
  MAX_ENTRIES,
} = require('../lib/mockStore');

describe('testPattern', () => {
  test('空 pattern 不匹配', () => {
    assert.equal(testPattern('https://a.com/x', ''), false);
    assert.equal(testPattern('https://a.com/x', '   '), false);
  });

  test('子串匹配', () => {
    assert.equal(testPattern('https://ke.qq.com/api/list?p=1', 'ke.qq.com/api'), true);
    assert.equal(testPattern('https://ke.qq.com/api/list', 'other.com'), false);
  });

  test('正则匹配与忽略大小写', () => {
    assert.equal(testPattern('https://a.com/Api/List', '/api\\/list/i'), true);
    assert.equal(testPattern('https://a.com/api/list', '/^https:\\/\\/a\\.com/'), true);
    assert.equal(testPattern('https://b.com/api', '/^https:\\/\\/a\\.com/'), false);
  });

  test('非法正则返回 false 而不是抛错', () => {
    assert.equal(testPattern('https://a.com/x', '/(/'), false);
  });
});

describe('contentTypeOf', () => {
  test('映射到正确的 Content-Type', () => {
    assert.equal(contentTypeOf('json'), 'application/json; charset=utf-8');
    assert.equal(contentTypeOf('sse'), 'text/event-stream; charset=utf-8');
    assert.equal(contentTypeOf('text'), 'text/plain; charset=utf-8');
  });
});

describe('sanitizeEntries', () => {
  test('非数组输入返回空数组', () => {
    assert.deepEqual(sanitizeEntries(null), []);
    assert.deepEqual(sanitizeEntries('x'), []);
    assert.deepEqual(sanitizeEntries({}), []);
  });

  test('保留合法条目并填充默认值', () => {
    const result = sanitizeEntries([
      { file: 'list_1.json', pattern: '/api/list', type: 'json', delay: 80, enabled: true },
      { file: 'stream_2.txt', pattern: '/api/stream' },
    ]);
    assert.equal(result.length, 2);
    assert.deepEqual(result[0], { file: 'list_1.json', pattern: '/api/list', type: 'json', delay: 80, enabled: true });
    assert.deepEqual(result[1], { file: 'stream_2.txt', pattern: '/api/stream', type: 'text', delay: DEFAULT_DELAY, enabled: false });
  });

  test('按扩展名推断默认类型', () => {
    const result = sanitizeEntries([{ file: 'a_1.json', pattern: 'x' }]);
    assert.equal(result[0].type, 'json');
  });

  test('拒绝路径穿越与非法文件名', () => {
    const result = sanitizeEntries([
      { file: '../evil.json', pattern: 'x', enabled: true },
      { file: 'a/b.json', pattern: 'x', enabled: true },
      { file: '..\\evil.json', pattern: 'x', enabled: true },
      { file: '.hidden.json', pattern: 'x', enabled: true },
      { file: 'noext', pattern: 'x', enabled: true },
      { file: 'ok_1.json', pattern: 'x', enabled: true },
    ]);
    assert.deepEqual(result.map((e) => e.file), ['ok_1.json']);
  });

  test('丢弃空 pattern 与超长 pattern', () => {
    const result = sanitizeEntries([
      { file: 'a_1.json', pattern: '', enabled: true },
      { file: 'b_1.json', pattern: 'x'.repeat(600), enabled: true },
      { file: 'c_1.json', pattern: 123, enabled: true },
    ]);
    assert.deepEqual(result, []);
  });

  test('delay 越界收敛到合法区间', () => {
    const result = sanitizeEntries([
      { file: 'a_1.txt', pattern: 'x', type: 'sse', delay: 99999 },
      { file: 'b_1.txt', pattern: 'y', type: 'sse', delay: -5 },
      { file: 'c_1.txt', pattern: 'z', type: 'sse', delay: 'abc' },
    ]);
    assert.equal(result[0].delay, 5000);
    assert.equal(result[1].delay, 0);
    assert.equal(result[2].delay, DEFAULT_DELAY);
  });

  test('条目数量封顶且按 file 去重', () => {
    const many = [];
    for (let i = 0; i < MAX_ENTRIES + 50; i += 1) {
      many.push({ file: `f_${i}.json`, pattern: `p${i}` });
    }
    many.push({ file: 'f_0.json', pattern: 'dup' });
    const result = sanitizeEntries(many);
    assert.equal(result.length, MAX_ENTRIES);
    assert.equal(new Set(result.map((e) => e.file)).size, result.length);
  });
});

describe('parseEntries', () => {
  test('解析 JSON 字符串', () => {
    const raw = JSON.stringify([{ file: 'a_1.json', pattern: 'x', enabled: true }]);
    const result = parseEntries(raw);
    assert.equal(result.length, 1);
    assert.equal(result[0].enabled, true);
  });

  test('非法 JSON 返回空数组', () => {
    assert.deepEqual(parseEntries('{oops'), []);
    assert.deepEqual(parseEntries(undefined), []);
  });
});

describe('markMocked / consumeMocked', () => {
  test('标记后只能消费一次', () => {
    markMocked('https://a.com/once');
    assert.equal(consumeMocked('https://a.com/once'), true);
    assert.equal(consumeMocked('https://a.com/once'), false);
  });

  test('未标记的 URL 返回 false', () => {
    assert.equal(consumeMocked('https://a.com/never'), false);
  });
});

describe('stream 内部请求识别', () => {
  test('识别发往内置流式服务的 URL', () => {
    setStreamPort(61234);
    assert.equal(isStreamReq('http://127.0.0.1:61234/mock/50/a.txt'), true);
    assert.equal(isStreamReq('http://127.0.0.1:61234/other/a.txt'), false);
    assert.equal(isStreamReq('https://ke.qq.com/api'), false);
  });
});
