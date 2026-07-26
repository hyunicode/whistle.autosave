"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
const active_1 = __importDefault(require("./cgi/active"));
const getSettings_1 = __importDefault(require("./cgi/getSettings"));
const listFiles_1 = __importDefault(require("./cgi/listFiles"));
const setMock_1 = __importDefault(require("./cgi/setMock"));
const setSettings_1 = __importDefault(require("./cgi/setSettings"));
function setupRouter(router) {
    router.post('/cgi-bin/active', active_1.default);
    router.get('/cgi-bin/get-settings', getSettings_1.default);
    router.post('/cgi-bin/set-settings', setSettings_1.default);
    router.get('/cgi-bin/list-files', listFiles_1.default);
    router.post('/cgi-bin/set-mock', setMock_1.default);
}
module.exports = setupRouter;
