import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 构建产物输出到 public/，由 whistle 的 koa-static 直接托管。
// 不用 package.json 的 "type": "module"（lib 是 CommonJS，被 whistle 直接 require），
// 因此本配置用 .mjs 后缀以 ESM 方式加载。
export default defineConfig({
  plugins: [react()],
  // 相对路径，兼容 whistle 把插件挂载在 /whistle.autosave/ 下的情况
  base: './',
  // 没有需要拷贝的静态资源，关掉 publicDir 以免与 outDir 冲突
  publicDir: false,
  build: {
    outDir: 'public',
    emptyOutDir: true,
    target: 'es2018',
  },
  server: {
    // 开发时把 CGI 请求代理到正在运行的 whistle（默认 8899 端口，可用 WHISTLE_PORT 覆盖）
    proxy: {
      '/cgi-bin': {
        target: `http://127.0.0.1:${process.env.WHISTLE_PORT || 8899}`,
        changeOrigin: true,
        // whistle 把插件挂在 /whistle.autosave 下，代理时补上该前缀
        rewrite: (p) => `/whistle.autosave${p}`,
      },
    },
  },
});
