"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.update = update;
exports.check = check;
const REG_EXP_RE = /^\/(.+)\/(i)?$/;
let filterList = null;
const toRegExp = (str) => {
    var _a;
    const matched = REG_EXP_RE.exec(str);
    if (!matched) {
        return null;
    }
    try {
        return new RegExp(matched[1], (_a = matched[2]) !== null && _a !== void 0 ? _a : '');
    }
    catch (_b) {
        return null;
    }
};
function update(text) {
    // 每次更新都全量重建，避免历史条件残留
    filterList = null;
    const trimmed = typeof text === 'string' ? text.trim() : '';
    if (!trimmed) {
        return;
    }
    const lines = trimmed.substring(0, 3072).split(/\r\n|\r|\n/);
    for (const line of lines) {
        let str = line;
        const not = str[0] === '!';
        if (not) {
            str = str.substring(1);
        }
        str = str.trim();
        if (!str) {
            continue;
        }
        const pattern = toRegExp(str);
        filterList = filterList !== null && filterList !== void 0 ? filterList : [];
        filterList.push({ not, pattern, str });
    }
}
function check(url) {
    if (!filterList) {
        return true;
    }
    if (!url) {
        return false;
    }
    for (const { not, pattern, str } of filterList) {
        const result = pattern ? pattern.test(url) : url.includes(str);
        if (not ? !result : result) {
            return true;
        }
    }
    return false;
}
