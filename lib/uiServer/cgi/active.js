"use strict";
function active(ctx) {
    const { localStorage } = ctx.req;
    const isActive = ctx.request.body.active === '1';
    localStorage.setProperty('active', isActive);
    ctx.body = { ec: 0, active: isActive };
}
module.exports = active;
