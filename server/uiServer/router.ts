import type Router from 'koa-router';
import active from './cgi/active';
import getSettings from './cgi/getSettings';
import setSettings from './cgi/setSettings';

function setupRouter(router: Router): void {
  router.post('/cgi-bin/active', active);
  router.get('/cgi-bin/get-settings', getSettings);
  router.post('/cgi-bin/set-settings', setSettings);
}

export = setupRouter;
