"use strict";
/** 保存目录内的索引文件管理：记录每个响应文件的来源 URL 与 Content-Type */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_META = exports.INDEX_FILE = void 0;
exports.readMeta = readMeta;
exports.recordMeta = recordMeta;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
exports.INDEX_FILE = '.autosave-index.json';
exports.MAX_META = 500;
function readMeta(dir) {
    try {
        const raw = node_fs_1.default.readFileSync(node_path_1.default.join(dir, exports.INDEX_FILE), 'utf8');
        const data = JSON.parse(raw);
        if (!data || typeof data !== 'object' || Array.isArray(data)) {
            return {};
        }
        return data;
    }
    catch (_a) {
        return {};
    }
}
function recordMeta(dir, file, meta) {
    try {
        const data = readMeta(dir);
        data[file] = meta;
        const keys = Object.keys(data);
        if (keys.length > exports.MAX_META) {
            // 按时间淘汰最旧记录，避免索引无限增长
            keys.sort((a, b) => (data[b].time || 0) - (data[a].time || 0));
            for (const key of keys.slice(exports.MAX_META)) {
                delete data[key];
            }
        }
        node_fs_1.default.writeFileSync(node_path_1.default.join(dir, exports.INDEX_FILE), JSON.stringify(data));
    }
    catch (_a) {
        // 索引仅用于展示与类型推断，失败不影响保存主流程
    }
}
