"use strict";
/** Mock 条目的数据模型与纯逻辑（不含 IO，便于测试） */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_PATTERN_LEN = exports.MAX_ENTRIES = exports.MAX_DELAY = exports.DEFAULT_DELAY = void 0;
exports.testPattern = testPattern;
exports.contentTypeOf = contentTypeOf;
exports.sanitizeEntries = sanitizeEntries;
exports.parseEntries = parseEntries;
exports.markMocked = markMocked;
exports.consumeMocked = consumeMocked;
exports.setStreamPort = setStreamPort;
exports.getStreamPort = getStreamPort;
exports.isStreamReq = isStreamReq;
exports.DEFAULT_DELAY = 50;
exports.MAX_DELAY = 5000;
exports.MAX_ENTRIES = 200;
exports.MAX_PATTERN_LEN = 512;
const REG_EXP_RE = /^\/(.+)\/(i)?$/;
const MARK_TTL = 60 * 1000;
const MARK_MAX = 1000;
/** URL 是否命中匹配规则 */
function testPattern(url, pattern) {
    var _a;
    const p = typeof pattern === 'string' ? pattern.trim() : '';
    if (!p || !url) {
        return false;
    }
    const matched = REG_EXP_RE.exec(p);
    if (matched) {
        try {
            return new RegExp(matched[1], (_a = matched[2]) !== null && _a !== void 0 ? _a : '').test(url);
        }
        catch (_b) {
            return false;
        }
    }
    return url.includes(p);
}
function contentTypeOf(type) {
    if (type === 'json') {
        return 'application/json; charset=utf-8';
    }
    if (type === 'sse') {
        return 'text/event-stream; charset=utf-8';
    }
    return 'text/plain; charset=utf-8';
}
/** 文件名必须留在保存目录内：拒绝路径分隔符、.. 与隐藏文件 */
const isSafeFileName = (name) => typeof name === 'string' &&
    name.length > 0 &&
    name.length <= 255 &&
    /\.(json|txt)$/i.test(name) &&
    !name.startsWith('.') &&
    !name.includes('..') &&
    !/[\\/]/.test(name);
const toType = (val, file) => {
    if (val === 'json' || val === 'sse' || val === 'text') {
        return val;
    }
    return /\.json$/i.test(file) ? 'json' : 'text';
};
const toDelay = (val) => {
    if (typeof val !== 'number' || !Number.isFinite(val)) {
        return exports.DEFAULT_DELAY;
    }
    return Math.min(exports.MAX_DELAY, Math.max(0, Math.round(val)));
};
/** 清洗外部输入为合法条目列表（去重、封顶、填默认值） */
function sanitizeEntries(input) {
    if (!Array.isArray(input)) {
        return [];
    }
    const seen = new Set();
    const result = [];
    for (const item of input) {
        if (result.length >= exports.MAX_ENTRIES) {
            break;
        }
        if (!item || typeof item !== 'object') {
            continue;
        }
        const { file, pattern, type, delay, enabled } = item;
        if (!isSafeFileName(file) || seen.has(file)) {
            continue;
        }
        if (typeof pattern !== 'string') {
            continue;
        }
        const trimmed = pattern.trim();
        if (!trimmed || trimmed.length > exports.MAX_PATTERN_LEN) {
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
function parseEntries(raw) {
    if (typeof raw !== 'string' || !raw) {
        return [];
    }
    try {
        return sanitizeEntries(JSON.parse(raw));
    }
    catch (_a) {
        return [];
    }
}
/* ---- mock 命中标记：避免被 mock 的响应又被自动保存 ---- */
const marks = new Map();
function markMocked(url) {
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
function consumeMocked(url) {
    const time = marks.get(url);
    if (time == null) {
        return false;
    }
    marks.delete(url);
    return Date.now() - time <= MARK_TTL;
}
/* ---- 内置流式服务状态（rulesServer 监听成功后写入端口） ---- */
let streamPort = 0;
function setStreamPort(port) {
    streamPort = port > 0 ? Math.floor(port) : 0;
}
function getStreamPort() {
    return streamPort;
}
/** 是否为发往内置流式服务的内部请求（防止规则循环命中） */
function isStreamReq(url) {
    return streamPort > 0 && url.startsWith(`http://127.0.0.1:${streamPort}/mock/`);
}
