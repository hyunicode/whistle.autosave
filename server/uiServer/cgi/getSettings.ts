import type { Context } from 'koa';

function getSettings(ctx: Context): void {
  const { localStorage } = ctx.req;
  ctx.body = {
    ec: 0,
    active: localStorage.getProperty('active'),
    sessionsDir: localStorage.getProperty('sessionsDir'),
    filterText: localStorage.getProperty('filterText'),
  };
}

export = getSettings;
