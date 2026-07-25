import fs from 'node:fs';
import type { Context } from 'koa';
import { update as updateFilter } from '../../filter';
import getSettings from './getSettings';

interface StatError {
  ec: number;
  em: string;
}

interface SettingsBody {
  sessionsDir?: unknown;
  filterText?: unknown;
}

const readStat = (dir: string): Promise<StatError | undefined> =>
  new Promise((resolve) => {
    fs.stat(dir, (err, stat) => {
      if (err) {
        resolve({
          ec: 2,
          em: err.code === 'ENOENT' ? '该目录不存在，请手动创建' : '系统异常，请稍后再试',
        });
        return;
      }
      if (!stat.isDirectory()) {
        resolve({
          ec: 3,
          em: '路径非目录',
        });
        return;
      }
      resolve(undefined);
    });
  });

async function setSettings(ctx: Context): Promise<void> {
  const body = ctx.request.body as SettingsBody;
  const sessionsDir = typeof body.sessionsDir === 'string' ? body.sessionsDir : '';
  if (sessionsDir) {
    const result = await readStat(sessionsDir);
    if (result) {
      ctx.body = result;
      return;
    }
  }
  const { localStorage } = ctx.req;
  updateFilter(body.filterText);
  localStorage.setProperty('sessionsDir', sessionsDir);
  localStorage.setProperty('filterText', typeof body.filterText === 'string' ? body.filterText : null);
  getSettings(ctx);
}

export = setSettings;
