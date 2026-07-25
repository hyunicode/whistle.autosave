import type { Context } from 'koa';

interface ActiveBody {
  active?: string;
}

function active(ctx: Context): void {
  const { localStorage } = ctx.req;
  const isActive = (ctx.request.body as ActiveBody).active === '1';
  localStorage.setProperty('active', isActive);
  ctx.body = { ec: 0, active: isActive };
}

export = active;
