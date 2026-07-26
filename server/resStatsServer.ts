import fs from 'node:fs';
import path from 'node:path';
import { check as checkFilter, update as updateFilter } from './filter';
import { recordMeta } from './metaStore';
import { consumeMocked, isStreamReq } from './mockStore';
import type { WhistlePluginContext, WhistleServer } from './types/whistle';

/** 保存响应体并在索引中记录来源信息（供 mock 界面展示与类型推断） */
const saveBody = (dir: string, fileName: string, body: string, url: string, contentType: string): void => {
  const filePath = path.resolve(dir, fileName);
  const record = (): void => {
    recordMeta(dir, fileName, { url, contentType, time: Date.now() });
  };
  fs.writeFile(filePath, body, (err) => {
    if (err) {
      fs.writeFile(filePath, body, (retryErr) => {
        if (!retryErr) {
          record();
        }
      });
      return;
    }
    record();
  });
};

/** 根据 content-type 返回文件扩展名；返回 null 表示跳过（图片等） */
const getExt = (contentType: unknown): string | null => {
  if (!contentType || typeof contentType !== 'string') {
    return null;
  }
  const ct = contentType.toLowerCase();
  if (ct.includes('application/json')) {
    return 'json';
  }
  if (ct.includes('image/')) {
    return null; // 图片等跳过
  }
  if (ct.includes('text/')) {
    return 'txt';
  }
  return null; // 其他类型默认跳过
};

/** 取请求路径最后一段作为方法名（去掉 query 与 hash） */
const getMethodName = (url?: string): string => {
  if (!url) {
    return 'unknown';
  }
  const pathname = url.split('?')[0].split('#')[0];
  const segments = pathname.split('/').filter(Boolean);
  return segments.length ? segments[segments.length - 1] : 'unknown';
};

function resStatsServer(server: WhistleServer, { storage, config }: WhistlePluginContext): void {
  const username = config.username ? `${encodeURIComponent(config.username)}_` : '';
  updateFilter(storage.getProperty('filterText'));
  server.on('request', (req) => {
    if (!storage.getProperty('active')) {
      return;
    }
    const dir = storage.getProperty('sessionsDir');
    if (typeof dir !== 'string' || !dir) {
      return;
    }
    const url = req.originalReq.url;
    if (!checkFilter(url)) {
      return;
    }
    // 跳过被 mock 命中的请求与内置流式服务的内部请求，避免 mock 响应被再次保存
    if (!url || isStreamReq(url) || consumeMocked(url)) {
      return;
    }
    req.getSession((s) => {
      if (!s) {
        return;
      }
      // 取响应头，识别响应类型
      const headers = s.resHeaders ?? s.res?.headers ?? {};
      const contentType = headers['content-type'] ?? headers['Content-Type'] ?? '';
      const ext = getExt(contentType);
      if (!ext) {
        return; // 跳过不支持的类型（图片等）
      }
      // 只取响应体，不存请求体
      let body = s.resBody ?? s.res?.body;
      if (body == null) {
        return;
      }
      if (Buffer.isBuffer(body)) {
        body = body.toString('utf8');
      }
      const method = getMethodName(url);
      const fileName = `${username}${method}_${Date.now()}.${ext}`;
      saveBody(dir, fileName, body, url, typeof contentType === 'string' ? contentType : '');
    });
  });
}

export = resStatsServer;
