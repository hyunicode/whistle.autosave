"use strict";
const mockStore_1 = require("../../mockStore");
/** 保存 mock 条目列表（JSON 字符串形式提交，服务端统一清洗校验） */
function setMock(ctx) {
    const body = ctx.request.body;
    let parsed = [];
    if (typeof body.entries === 'string' && body.entries) {
        try {
            parsed = JSON.parse(body.entries);
        }
        catch (_a) {
            ctx.body = { ec: 2, em: '条目数据格式错误' };
            return;
        }
    }
    const entries = (0, mockStore_1.sanitizeEntries)(parsed);
    ctx.req.localStorage.setProperty('mockEntries', JSON.stringify(entries));
    ctx.body = { ec: 0, entries };
}
module.exports = setMock;
