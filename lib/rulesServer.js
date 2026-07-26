"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
const node_fs_1 = __importDefault(require("node:fs"));
const node_http_1 = __importDefault(require("node:http"));
const node_path_1 = __importDefault(require("node:path"));
const mockStore_1 = require("./mockStore");
const sseStream_1 = require("./sseStream");
const noop = () => { };
/** 内置 SSE 流式回放服务（仅监听 127.0.0.1）：按事件逐段推送保存的响应内容 */
function startStreamServer(storage) {
    const app = node_http_1.default.createServer((req, res) => {
        var _a;
        req.resume(); // 排空请求体，避免上传阻塞
        const notFound = () => {
            res.statusCode = 404;
            res.end();
        };
        const matched = /^\/mock\/(\d{1,4})\/(.+)$/.exec(((_a = req.url) !== null && _a !== void 0 ? _a : '').split('?')[0]);
        const dir = storage.getProperty('sessionsDir');
        if (!matched || typeof dir !== 'string' || !dir) {
            notFound();
            return;
        }
        let name = '';
        try {
            name = decodeURIComponent(matched[2]);
        }
        catch (_b) {
            name = '';
        }
        // 与 mockStore 文件名安全校验一致，防止路径穿越
        if (!name ||
            name.includes('..') ||
            /[\\/]/.test(name) ||
            name.startsWith('.') ||
            !/\.(json|txt)$/i.test(name)) {
            notFound();
            return;
        }
        const delay = Math.min(5000, Math.max(0, parseInt(matched[1], 10) || 0));
        node_fs_1.default.readFile(node_path_1.default.join(dir, name), (err, body) => {
            if (err) {
                notFound();
                return;
            }
            res.writeHead(200, {
                'content-type': 'text/event-stream; charset=utf-8',
                'cache-control': 'no-store',
                'x-accel-buffering': 'no',
            });
            const chunks = (0, sseStream_1.splitSseEvents)(body.toString('utf8'));
            let index = 0;
            let closed = false;
            res.on('close', () => {
                closed = true;
            });
            const push = () => {
                if (closed) {
                    return;
                }
                if (index >= chunks.length) {
                    res.end();
                    return;
                }
                res.write(chunks[index]);
                index += 1;
                setTimeout(push, delay);
            };
            push();
        });
    });
    app.on('error', noop);
    app.listen(0, '127.0.0.1', () => {
        const address = app.address();
        if (address && typeof address === 'object') {
            (0, mockStore_1.setStreamPort)(address.port);
        }
    });
    app.unref();
}
/**
 * 动态规则：命中 mock 条目的请求直接返回本地保存的响应（不发往真实服务器）。
 * - json/text：file:// 一次性返回，并按条目类型修正 Content-Type
 * - sse：转发到内置流式服务逐段推送；服务未就绪时退化为一次性返回
 */
function rulesServer(server, { storage }) {
    startStreamServer(storage);
    server.on('request', (req, res) => {
        var _a;
        const done = (data) => {
            try {
                res.end(data !== null && data !== void 0 ? data : '');
            }
            catch (_a) {
                noop();
            }
        };
        try {
            if (!storage.getProperty('mockActive')) {
                done();
                return;
            }
            const dir = storage.getProperty('sessionsDir');
            if (typeof dir !== 'string' || !dir) {
                done();
                return;
            }
            const url = (_a = req.originalReq.url) !== null && _a !== void 0 ? _a : '';
            // isStreamReq：防止内部转发请求被再次命中造成循环
            if (!url || (0, mockStore_1.isStreamReq)(url)) {
                done();
                return;
            }
            const entry = (0, mockStore_1.parseEntries)(storage.getProperty('mockEntries')).find((item) => item.enabled && (0, mockStore_1.testPattern)(url, item.pattern));
            if (!entry) {
                done();
                return;
            }
            const root = node_path_1.default.resolve(dir);
            const filePath = node_path_1.default.resolve(root, entry.file);
            if (node_path_1.default.dirname(filePath) !== root || !node_fs_1.default.existsSync(filePath)) {
                done();
                return;
            }
            (0, mockStore_1.markMocked)(url);
            const port = (0, mockStore_1.getStreamPort)();
            if (entry.type === 'sse' && port) {
                const target = `http://127.0.0.1:${port}/mock/${entry.delay}/${encodeURIComponent(entry.file)}`;
                done(JSON.stringify({ rules: `${url} ${target}` }));
                return;
            }
            const headers = JSON.stringify({
                'content-type': (0, mockStore_1.contentTypeOf)(entry.type),
                'cache-control': 'no-store',
            });
            // 路径含空白或 > 时规则语法无法表达，改用 values 内联文件内容
            if (/[\s>]/.test(filePath)) {
                let body;
                try {
                    body = node_fs_1.default.readFileSync(filePath, 'utf8');
                }
                catch (_b) {
                    done();
                    return;
                }
                done(JSON.stringify({
                    rules: `${url} file://{asMockBody} resHeaders://{asMockH}`,
                    values: { asMockBody: body, asMockH: headers },
                }));
                return;
            }
            done(JSON.stringify({
                rules: `${url} file://<${filePath}> resHeaders://{asMockH}`,
                values: { asMockH: headers },
            }));
        }
        catch (_c) {
            done();
        }
    });
}
module.exports = rulesServer;
