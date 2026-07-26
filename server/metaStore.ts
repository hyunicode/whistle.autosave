/** 保存目录内的索引文件管理：记录每个响应文件的来源 URL 与 Content-Type */

import fs from 'node:fs';
import path from 'node:path';

export const INDEX_FILE = '.autosave-index.json';
export const MAX_META = 500;

export interface FileMeta {
  url: string;
  contentType: string;
  time: number;
}

export type MetaMap = Record<string, FileMeta>;

export function readMeta(dir: string): MetaMap {
  try {
    const raw = fs.readFileSync(path.join(dir, INDEX_FILE), 'utf8');
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return {};
    }
    return data as MetaMap;
  } catch {
    return {};
  }
}

export function recordMeta(dir: string, file: string, meta: FileMeta): void {
  try {
    const data = readMeta(dir);
    data[file] = meta;
    const keys = Object.keys(data);
    if (keys.length > MAX_META) {
      // 按时间淘汰最旧记录，避免索引无限增长
      keys.sort((a, b) => (data[b].time || 0) - (data[a].time || 0));
      for (const key of keys.slice(MAX_META)) {
        delete data[key];
      }
    }
    fs.writeFileSync(path.join(dir, INDEX_FILE), JSON.stringify(data));
  } catch {
    // 索引仅用于展示与类型推断，失败不影响保存主流程
  }
}
