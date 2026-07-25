"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
const node_fs_1 = __importDefault(require("node:fs"));
const filter_1 = require("../../filter");
const getSettings_1 = __importDefault(require("./getSettings"));
const readStat = (dir) => new Promise((resolve) => {
    node_fs_1.default.stat(dir, (err, stat) => {
        if (err) {
            resolve({
                ec: 2,
                em: err.code === 'ENOENT' ? '该目录不存在，请手动创建' : '系统异常，请稍后再试',
            });
            return;
        }
        if (!stat.isDirectory()) {
            resolve({
                ec: 3,
                em: '路径非目录',
            });
            return;
        }
        resolve(undefined);
    });
});
async function setSettings(ctx) {
    const body = ctx.request.body;
    const sessionsDir = typeof body.sessionsDir === 'string' ? body.sessionsDir : '';
    if (sessionsDir) {
        const result = await readStat(sessionsDir);
        if (result) {
            ctx.body = result;
            return;
        }
    }
    const { localStorage } = ctx.req;
    (0, filter_1.update)(body.filterText);
    localStorage.setProperty('sessionsDir', sessionsDir);
    localStorage.setProperty('filterText', typeof body.filterText === 'string' ? body.filterText : null);
    (0, getSettings_1.default)(ctx);
}
module.exports = setSettings;
