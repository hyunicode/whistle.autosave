import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import {
  contentTypeOf,
  getStreamPort,
  isStreamReq,
  markMocked,
  parseEntries,
  setStreamPort,
  testPattern,
} from './mockStore';
import { splitSseEvents } from './sseStream';
import type { WhistlePluginContext, WhistleServer, WhistleStorage } from './types/whistle';

const noop = (): void => {};

/** 内置 SSE 流式回放服务（仅监听 127.0.0.1）：按事件逐段推送保存的响应内容 */
function startStreamServer(storage: WhistleStorage): void {
  const app = http.createServer((req, res) => {
    req.resume(); // 排空请求体，避免上传阻塞
    const notFound = (): void => {
      res.statusCode = 404;
      res.end();
    };
    const matched = /^\/mock\/(\d{1,4})\/(.+)$/.exec((req.url ?? '').split('?')[0]);
    const dir = storage.getProperty('sessionsDir');
    if (!matched || typeof dir !== 'string' || !dir) {
      notFound();
      return;
    }
    let name = '';
    try {
      name = decodeURIComponent(matched[2]);
    } catch {
      name = '';
    }
    // 与 mockStore 文件名安全校验一致，防止路径穿越
    if (
      !name ||
      name.includes('..') ||
      /[\\/]/.test(name) ||
      name.startsWith('.') ||
      !/\.(json|txt)$/i.test(name)
    ) {
      notFound();
      return;
    }
    const delay = Math.min(5000, Math.max(0, parseInt(matched[1], 10) || 0));
    fs.readFile(path.join(dir, name), (err, body) => {
      if (err) {
        notFound();
        return;
      }
      res.writeHead(200, {
        'content-type': 'text/event-stream; charset=utf-8',
        'cache-control': 'no-store',
        'x-accel-buffering': 'no',
      });
      const chunks = splitSseEvents(body.toString('utf8'));
      let index = 0;
      let closed = false;
      res.on('close', () => {
        closed = true;
      });
      const push = (): void => {
        if (closed) {
          return;
        }
        if (index >= chunks.length) {
          res.end();
          return;
        }
        res.write(chunks[index]);
        index += 1;
        setTimeout(push, delay);
      };
      push();
    });
  });
  app.on('error', noop);
  app.listen(0, '127.0.0.1', () => {
    const address = app.address();
    if (address && typeof address === 'object') {
      setStreamPort((address as AddressInfo).port);
    }
  });
  app.unref();
}

/**
 * 动态规则：命中 mock 条目的请求直接返回本地保存的响应（不发往真实服务器）。
 * - json/text：file:// 一次性返回，并按条目类型修正 Content-Type
 * - sse：转发到内置流式服务逐段推送；服务未就绪时退化为一次性返回
 */
function rulesServer(server: WhistleServer, { storage }: WhistlePluginContext): void {
  startStreamServer(storage);
  server.on('request', (req, res) => {
    const done = (data?: string): void => {
      try {
        res.end(data ?? '');
      } catch {
        noop();
      }
    };
    try {
      if (!storage.getProperty('mockActive')) {
        done();
        return;
      }
      const dir = storage.getProperty('sessionsDir');
      if (typeof dir !== 'string' || !dir) {
        done();
        return;
      }
      const url = req.originalReq.url ?? '';
      // isStreamReq：防止内部转发请求被再次命中造成循环
      if (!url || isStreamReq(url)) {
        done();
        return;
      }
      const entry = parseEntries(storage.getProperty('mockEntries')).find(
        (item) => item.enabled && testPattern(url, item.pattern)
      );
      if (!entry) {
        done();
        return;
      }
      const root = path.resolve(dir);
      const filePath = path.resolve(root, entry.file);
      if (path.dirname(filePath) !== root || !fs.existsSync(filePath)) {
        done();
        return;
      }
      markMocked(url);
      const port = getStreamPort();
      if (entry.type === 'sse' && port) {
        const target = `http://127.0.0.1:${port}/mock/${entry.delay}/${encodeURIComponent(entry.file)}`;
        done(JSON.stringify({ rules: `${url} ${target}` }));
        return;
      }
      const headers = JSON.stringify({
        'content-type': contentTypeOf(entry.type),
        'cache-control': 'no-store',
      });
      // 路径含空白或 > 时规则语法无法表达，改用 values 内联文件内容
      if (/[\s>]/.test(filePath)) {
        let body: string;
        try {
          body = fs.readFileSync(filePath, 'utf8');
        } catch {
          done();
          return;
        }
        done(
          JSON.stringify({
            rules: `${url} file://{asMockBody} resHeaders://{asMockH}`,
            values: { asMockBody: body, asMockH: headers },
          })
        );
        return;
      }
      done(
        JSON.stringify({
          rules: `${url} file://<${filePath}> resHeaders://{asMockH}`,
          values: { asMockH: headers },
        })
      );
    } catch {
      done();
    }
  });
}

export = rulesServer;
