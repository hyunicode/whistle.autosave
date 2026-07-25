import type { EventEmitter } from 'node:events';
import type { IncomingMessage, ServerResponse } from 'node:http';

/** whistle 注入到插件 ctx.req 上的本地存储 */
export interface WhistleStorage {
  getProperty(name: string): unknown;
  setProperty(name: string, value: unknown): void;
}

/** whistle 传给插件的 config（含用户名等） */
export interface WhistlePluginConfig {
  username?: string;
  [key: string]: unknown;
}

/** resStatsServer 等插件入口的第二个参数 */
export interface WhistlePluginContext {
  storage: WhistleStorage;
  config: WhistlePluginConfig;
}

/** req.getSession 回调中的会话数据（仅列出本插件用到的字段） */
export interface WhistleSession {
  res?: {
    headers?: Record<string, string | string[] | undefined>;
    body?: string | Buffer | null;
  } | null;
  resHeaders?: Record<string, string | string[] | undefined> | null;
  resBody?: string | Buffer | null;
  [key: string]: unknown;
}

/** whistle 增强后的请求对象 */
export interface WhistleRequest extends IncomingMessage {
  originalReq: {
    url?: string;
    [key: string]: unknown;
  };
  getSession(cb: (session: WhistleSession | null) => void): void;
}

/** whistle 传给 uiServer / resStatsServer 的 server 对象 */
export interface WhistleServer extends EventEmitter {
  on(event: 'request', listener: (req: WhistleRequest, res: ServerResponse) => void): this;
}

declare module 'http' {
  interface IncomingMessage {
    /** whistle 在 uiServer 请求上注入的本地存储（koa 的 ctx.req 即原生 req） */
    localStorage: WhistleStorage;
  }
}
