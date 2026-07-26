"use strict";
/** 把保存的 SSE/文本内容切分为可逐段推送的分片（每个分片保留原始分隔符） */
Object.defineProperty(exports, "__esModule", { value: true });
exports.splitSseEvents = splitSseEvents;
const BOUNDARY_RE = /\r?\n\r?\n/;
const EVENT_RE = /[\s\S]*?\r?\n\r?\n/g;
const LINE_RE = /[^\n]*\n|[^\n]+/g;
function splitSseEvents(body) {
    var _a;
    if (!body) {
        return [];
    }
    // 无空行边界的内容（普通文本）退化为按行推送
    if (!BOUNDARY_RE.test(body)) {
        return (_a = body.match(LINE_RE)) !== null && _a !== void 0 ? _a : [];
    }
    const events = [];
    let lastIndex = 0;
    let matched;
    EVENT_RE.lastIndex = 0;
    while ((matched = EVENT_RE.exec(body)) !== null) {
        events.push(matched[0]);
        lastIndex = EVENT_RE.lastIndex;
    }
    // 末尾不完整的事件（无结束边界）作为最后一个分片
    const rest = body.slice(lastIndex);
    if (rest) {
        events.push(rest);
    }
    return events;
}
