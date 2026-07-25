"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resStatsServer = exports.uiServer = void 0;
const uiServer_1 = __importDefault(require("./uiServer"));
exports.uiServer = uiServer_1.default;
const resStatsServer_1 = __importDefault(require("./resStatsServer"));
exports.resStatsServer = resStatsServer_1.default;
