import path from 'node:path';
import Koa from 'koa';
import onerror from 'koa-onerror';
import bodyParser from 'koa-bodyparser';
import serve from 'koa-static';
import Router from 'koa-router';
import setupRouter from './router';
import type { WhistleServer } from '../types/whistle';

function uiServer(server: WhistleServer): void {
  const app = new Koa();
  app.proxy = true;
  onerror(app);
  const router = new Router();
  setupRouter(router);
  app.use(bodyParser());
  app.use(router.routes());
  app.use(router.allowedMethods());
  // 注：旧代码第二参直接传数字 MAX_AGE，但 koa-static@5 的签名是 (root, options)，
  // 数字会被忽略（实际等价于无缓存）。为不改变运行行为，此处不再传该参数；
  // 如需缓存可改为 serve(root, { maxage: ... })。
  app.use(serve(path.join(__dirname, '../../public')));
  server.on('request', app.callback());
}

export = uiServer;
