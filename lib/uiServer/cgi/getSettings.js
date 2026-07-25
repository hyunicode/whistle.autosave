"use strict";
function getSettings(ctx) {
    const { localStorage } = ctx.req;
    ctx.body = {
        ec: 0,
        active: localStorage.getProperty('active'),
        sessionsDir: localStorage.getProperty('sessionsDir'),
        filterText: localStorage.getProperty('filterText'),
    };
}
module.exports = getSettings;
