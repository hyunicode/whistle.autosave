"use strict";
const mockStore_1 = require("../../mockStore");
function getSettings(ctx) {
    const { localStorage } = ctx.req;
    ctx.body = {
        ec: 0,
        active: localStorage.getProperty('active'),
        sessionsDir: localStorage.getProperty('sessionsDir'),
        filterText: localStorage.getProperty('filterText'),
        mockActive: localStorage.getProperty('mockActive'),
        mockEntries: (0, mockStore_1.parseEntries)(localStorage.getProperty('mockEntries')),
    };
}
module.exports = getSettings;
