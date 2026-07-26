import type { Context } from 'koa';
import { sanitizeEntries } from '../../mockStore';

interface SetMockBody {
  entries?: unknown;
}

/** 保存 mock 条目列表（JSON 字符串形式提交，服务端统一清洗校验） */
function setMock(ctx: Context): void {
  const body = ctx.request.body as SetMockBody;
  let parsed: unknown = [];
  if (typeof body.entries === 'string' && body.entries) {
    try {
      parsed = JSON.parse(body.entries);
    } catch {
      ctx.body = { ec: 2, em: '条目数据格式错误' };
      return;
    }
  }
  const entries = sanitizeEntries(parsed);
  ctx.req.localStorage.setProperty('mockEntries', JSON.stringify(entries));
  ctx.body = { ec: 0, entries };
}

export = setMock;
