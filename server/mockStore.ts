/** Mock 条目的数据模型与纯逻辑（不含 IO，便于测试） */

export type MockType = 'json' | 'sse' | 'text';

export interface MockEntry {
  /** 保存目录内的文件名（不含路径） */
  file: string;
  /** URL 匹配规则：子串 或 /正则/ 或 /正则/i */
  pattern: string;
  /** mock 响应类型 */
  type: MockType;
  /** SSE 逐段推送间隔（ms） */
  delay: number;
  enabled: boolean;
}

export const DEFAULT_DELAY = 50;
export const MAX_DELAY = 5000;
export const MAX_ENTRIES = 200;
export const MAX_PATTERN_LEN = 512;

const REG_EXP_RE = /^\/(.+)\/(i)?$/;
const MARK_TTL = 60 * 1000;
const MARK_MAX = 1000;

/** URL 是否命中匹配规则 */
export function testPattern(url: string, pattern: string): boolean {
  const p = typeof pattern === 'string' ? pattern.trim() : '';
  if (!p || !url) {
    return false;
  }
  const matched = REG_EXP_RE.exec(p);
  if (matched) {
    try {
      return new RegExp(matched[1], matched[2] ?? '').test(url);
    } catch {
      return false;
    }
  }
  return url.includes(p);
}

export function contentTypeOf(type: MockType): string {
  if (type === 'json') {
    return 'application/json; charset=utf-8';
  }
  if (type === 'sse') {
    return 'text/event-stream; charset=utf-8';
  }
  return 'text/plain; charset=utf-8';
}

/** 文件名必须留在保存目录内：拒绝路径分隔符、.. 与隐藏文件 */
const isSafeFileName = (name: unknown): name is string =>
  typeof name === 'string' &&
  name.length > 0 &&
  name.length <= 255 &&
  /\.(json|txt)$/i.test(name) &&
  !name.startsWith('.') &&
  !name.includes('..') &&
  !/[\\/]/.test(name);

const toType = (val: unknown, file: string): MockType => {
  if (val === 'json' || val === 'sse' || val === 'text') {
    return val;
  }
  return /\.json$/i.test(file) ? 'json' : 'text';
};

const toDelay = (val: unknown): number => {
  if (typeof val !== 'number' || !Number.isFinite(val)) {
    return DEFAULT_DELAY;
  }
  return Math.min(MAX_DELAY, Math.max(0, Math.round(val)));
};

/** 清洗外部输入为合法条目列表（去重、封顶、填默认值） */
export function sanitizeEntries(input: unknown): MockEntry[] {
  if (!Array.isArray(input)) {
    return [];
  }
  const seen = new Set<string>();
  const result: MockEntry[] = [];
  for (const item of input) {
    if (result.length >= MAX_ENTRIES) {
      break;
    }
    if (!item || typeof item !== 'object') {
      continue;
    }
    const { file, pattern, type, delay, enabled } = item as Record<string, unknown>;
    if (!isSafeFileName(file) || seen.has(file)) {
      continue;
    }
    if (typeof pattern !== 'string') {
      continue;
    }
    const trimmed = pattern.trim();
    if (!trimmed || trimmed.length > MAX_PATTERN_LEN) {
      continue;
    }
    seen.add(file);
    result.push({
      file,
      pattern: trimmed,
      type: toType(type, file),
      delay: toDelay(delay),
      enabled: enabled === true,
    });
  }
  return result;
}

/** 从 storage 中的 JSON 字符串解析条目 */
export function parseEntries(raw: unknown): MockEntry[] {
  if (typeof raw !== 'string' || !raw) {
    return [];
  }
  try {
    return sanitizeEntries(JSON.parse(raw));
  } catch {
    return [];
  }
}

/* ---- mock 命中标记：避免被 mock 的响应又被自动保存 ---- */
const marks = new Map<string, number>();

export function markMocked(url: string): void {
  if (!url) {
    return;
  }
  if (marks.size >= MARK_MAX) {
    const now = Date.now();
    for (const [key, time] of marks) {
      if (now - time > MARK_TTL) {
        marks.delete(key);
      }
    }
  }
  marks.set(url, Date.now());
}

export function consumeMocked(url: string): boolean {
  const time = marks.get(url);
  if (time == null) {
    return false;
  }
  marks.delete(url);
  return Date.now() - time <= MARK_TTL;
}

/* ---- 内置流式服务状态（rulesServer 监听成功后写入端口） ---- */
let streamPort = 0;

export function setStreamPort(port: number): void {
  streamPort = port > 0 ? Math.floor(port) : 0;
}

export function getStreamPort(): number {
  return streamPort;
}

/** 是否为发往内置流式服务的内部请求（防止规则循环命中） */
export function isStreamReq(url: string): boolean {
  return streamPort > 0 && url.startsWith(`http://127.0.0.1:${streamPort}/mock/`);
}
