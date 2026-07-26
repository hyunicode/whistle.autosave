"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const metaStore_1 = require("../../metaStore");
const FILE_RE = /\.(json|txt)$/i;
const MAX_FILES = 200;
const statFile = (dir, name) => new Promise((resolve) => {
    node_fs_1.default.stat(node_path_1.default.join(dir, name), (err, stat) => {
        if (err || !stat.isFile()) {
            resolve(null);
            return;
        }
        resolve({ name, size: stat.size, mtime: Math.round(stat.mtimeMs) });
    });
});
/** 扫描保存目录，返回可 mock 的响应文件列表（合并索引中的来源信息） */
async function listFiles(ctx) {
    const { localStorage } = ctx.req;
    const queryDir = typeof ctx.query.dir === 'string' ? ctx.query.dir : '';
    const stored = localStorage.getProperty('sessionsDir');
    const dir = queryDir || (typeof stored === 'string' ? stored : '');
    if (!dir) {
        ctx.body = { ec: 0, dir: '', files: [] };
        return;
    }
    const names = await new Promise((resolve) => {
        node_fs_1.default.readdir(dir, (err, list) => {
            resolve(err ? [] : list.filter((name) => FILE_RE.test(name) && !name.startsWith('.')));
        });
    });
    const stats = await Promise.all(names.map((name) => statFile(dir, name)));
    const meta = (0, metaStore_1.readMeta)(dir);
    const files = stats
        .filter((info) => info !== null)
        .map((info) => { var _a, _b; return ({ ...info, url: (_a = meta[info.name]) === null || _a === void 0 ? void 0 : _a.url, contentType: (_b = meta[info.name]) === null || _b === void 0 ? void 0 : _b.contentType }); })
        .sort((a, b) => b.mtime - a.mtime)
        .slice(0, MAX_FILES);
    ctx.body = { ec: 0, dir, files };
}
module.exports = listFiles;
