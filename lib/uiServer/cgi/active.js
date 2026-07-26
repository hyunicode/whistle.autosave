"use strict";
function active(ctx) {
    const { localStorage } = ctx.req;
    const body = ctx.request.body;
    const isActive = body.active === '1';
    const key = body.type === 'mock' ? 'mockActive' : 'active';
    localStorage.setProperty(key, isActive);
    ctx.body = { ec: 0, active: isActive };
}
module.exports = active;
