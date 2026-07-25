const fs = require('fs');
const path = require('path');
const { check: checkFilter, update: updateFilter } = require('./filter');

const noop = () => {};

// 根据 content-type 返回文件扩展名；返回 null 表示跳过（图片等）
const getExt = (contentType) => {
  if (!contentType || typeof contentType !== 'string') {
    return null;
  }
  const ct = contentType.toLowerCase();
  if (ct.indexOf('application/json') !== -1) {
    return 'json';
  }
  if (ct.indexOf('image/') !== -1) {
    return null; // 图片等跳过
  }
  if (ct.indexOf('text/') !== -1) {
    return 'txt';
  }
  return null; // 其他类型默认跳过
};

// 取请求路径最后一段作为方法名（去掉 query 与 hash）
const getMethodName = (url) => {
  if (!url || typeof url !== 'string') {
    return 'unknown';
  }
  const pathname = url.split('?')[0].split('#')[0];
  const segments = pathname.split('/').filter(Boolean);
  return segments.length ? segments[segments.length - 1] : 'unknown';
};

module.exports = (server, { storage, config }) => {
  const username = config.username ? `${encodeURIComponent(config.username)}_` : '';
  updateFilter(storage.getProperty('filterText'));
  server.on('request', (req) => {
    // filter
    const active = storage.getProperty('active');
    if (!active) {
      return;
    }
    const dir = storage.getProperty('sessionsDir');
    if (!dir || typeof dir !== 'string') {
      return;
    }
    if (!checkFilter(req.originalReq.url)) {
      return;
    }
    req.getSession((s) => {
      if (!s) {
        return;
      }
      // 取响应头，识别响应类型
      const headers = s.resHeaders || (s.res && s.res.headers) || {};
      const contentType = headers['content-type'] || headers['Content-Type'] || '';
      const ext = getExt(contentType);
      if (!ext) {
        return; // 跳过不支持的类型（图片等）
      }
      // 只取响应体，不存请求体
      let body = s.resBody != null ? s.resBody : (s.res && s.res.body);
      if (body == null) {
        return;
      }
      if (Buffer.isBuffer(body)) {
        body = body.toString('utf8');
      }
      const method = getMethodName(req.originalReq.url);
      const fileName = `${username}${method}_${Date.now()}.${ext}`;
      const filePath = path.resolve(dir, fileName);
      fs.writeFile(filePath, body, (err) => {
        if (err) {
          fs.writeFile(filePath, body, noop);
        }
      });
    });
  });
};
