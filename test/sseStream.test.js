const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const { splitSseEvents } = require('../lib/sseStream');

describe('splitSseEvents', () => {
  test('空字符串返回空数组', () => {
    assert.deepEqual(splitSseEvents(''), []);
  });

  test('按空行边界切分事件并保留分隔符', () => {
    const body = 'data: a\n\ndata: b\n\n';
    assert.deepEqual(splitSseEvents(body), ['data: a\n\n', 'data: b\n\n']);
  });

  test('支持 CRLF 边界', () => {
    const body = 'data: a\r\n\r\ndata: b\r\n\r\n';
    assert.deepEqual(splitSseEvents(body), ['data: a\r\n\r\n', 'data: b\r\n\r\n']);
  });

  test('末尾不完整事件作为独立分片保留', () => {
    const body = 'data: a\n\ndata: partial';
    assert.deepEqual(splitSseEvents(body), ['data: a\n\n', 'data: partial']);
  });

  test('无空行边界时退化为按行切分', () => {
    assert.deepEqual(splitSseEvents('line1\nline2\n'), ['line1\n', 'line2\n']);
    assert.deepEqual(splitSseEvents('data: x'), ['data: x']);
  });

  test('多行事件作为一个分片', () => {
    const body = 'event: message\ndata: {"a":1}\n\n';
    assert.deepEqual(splitSseEvents(body), ['event: message\ndata: {"a":1}\n\n']);
  });
});
