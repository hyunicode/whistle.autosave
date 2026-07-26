"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const filter_1 = require("./filter");
const metaStore_1 = require("./metaStore");
const mockStore_1 = require("./mockStore");
/** 保存响应体并在索引中记录来源信息（供 mock 界面展示与类型推断） */
const saveBody = (dir, fileName, body, url, contentType) => {
    const filePath = node_path_1.default.resolve(dir, fileName);
    const record = () => {
        (0, metaStore_1.recordMeta)(dir, fileName, { url, contentType, time: Date.now() });
    };
    node_fs_1.default.writeFile(filePath, body, (err) => {
        if (err) {
            node_fs_1.default.writeFile(filePath, body, (retryErr) => {
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
const getExt = (contentType) => {
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
const getMethodName = (url) => {
    if (!url) {
        return 'unknown';
    }
    const pathname = url.split('?')[0].split('#')[0];
    const segments = pathname.split('/').filter(Boolean);
    return segments.length ? segments[segments.length - 1] : 'unknown';
};
function resStatsServer(server, { storage, config }) {
    const username = config.username ? `${encodeURIComponent(config.username)}_` : '';
    (0, filter_1.update)(storage.getProperty('filterText'));
    server.on('request', (req) => {
        if (!storage.getProperty('active')) {
            return;
        }
        const dir = storage.getProperty('sessionsDir');
        if (typeof dir !== 'string' || !dir) {
            return;
        }
        const url = req.originalReq.url;
        if (!(0, filter_1.check)(url)) {
            return;
        }
        // 跳过被 mock 命中的请求与内置流式服务的内部请求，避免 mock 响应被再次保存
        if (!url || (0, mockStore_1.isStreamReq)(url) || (0, mockStore_1.consumeMocked)(url)) {
            return;
        }
        req.getSession((s) => {
            var _a, _b, _c, _d, _e, _f, _g;
            if (!s) {
                return;
            }
            // 取响应头，识别响应类型
            const headers = (_c = (_a = s.resHeaders) !== null && _a !== void 0 ? _a : (_b = s.res) === null || _b === void 0 ? void 0 : _b.headers) !== null && _c !== void 0 ? _c : {};
            const contentType = (_e = (_d = headers['content-type']) !== null && _d !== void 0 ? _d : headers['Content-Type']) !== null && _e !== void 0 ? _e : '';
            const ext = getExt(contentType);
            if (!ext) {
                return; // 跳过不支持的类型（图片等）
            }
            // 只取响应体，不存请求体
            let body = (_f = s.resBody) !== null && _f !== void 0 ? _f : (_g = s.res) === null || _g === void 0 ? void 0 : _g.body;
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
module.exports = resStatsServer;
