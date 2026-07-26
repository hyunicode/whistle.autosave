import type { Context } from 'koa';
import { parseEntries } from '../../mockStore';

function getSettings(ctx: Context): void {
  const { localStorage } = ctx.req;
  ctx.body = {
    ec: 0,
    active: localStorage.getProperty('active'),
    sessionsDir: localStorage.getProperty('sessionsDir'),
    filterText: localStorage.getProperty('filterText'),
    mockActive: localStorage.getProperty('mockActive'),
    mockEntries: parseEntries(localStorage.getProperty('mockEntries')),
  };
}

export = getSettings;
