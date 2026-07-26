import type Router from 'koa-router';
import active from './cgi/active';
import getSettings from './cgi/getSettings';
import listFiles from './cgi/listFiles';
import setMock from './cgi/setMock';
import setSettings from './cgi/setSettings';

function setupRouter(router: Router): void {
  router.post('/cgi-bin/active', active);
  router.get('/cgi-bin/get-settings', getSettings);
  router.post('/cgi-bin/set-settings', setSettings);
  router.get('/cgi-bin/list-files', listFiles);
  router.post('/cgi-bin/set-mock', setMock);
}

export = setupRouter;
