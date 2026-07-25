"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
const node_path_1 = __importDefault(require("node:path"));
const koa_1 = __importDefault(require("koa"));
const koa_onerror_1 = __importDefault(require("koa-onerror"));
const koa_bodyparser_1 = __importDefault(require("koa-bodyparser"));
const koa_static_1 = __importDefault(require("koa-static"));
const koa_router_1 = __importDefault(require("koa-router"));
const router_1 = __importDefault(require("./router"));
function uiServer(server) {
    const app = new koa_1.default();
    app.proxy = true;
    (0, koa_onerror_1.default)(app);
    const router = new koa_router_1.default();
    (0, router_1.default)(router);
    app.use((0, koa_bodyparser_1.default)());
    app.use(router.routes());
    app.use(router.allowedMethods());
    // 注：旧代码第二参直接传数字 MAX_AGE，但 koa-static@5 的签名是 (root, options)，
    // 数字会被忽略（实际等价于无缓存）。为不改变运行行为，此处不再传该参数；
    // 如需缓存可改为 serve(root, { maxage: ... })。
    app.use((0, koa_static_1.default)(node_path_1.default.join(__dirname, '../../public')));
    server.on('request', app.callback());
}
module.exports = uiServer;
