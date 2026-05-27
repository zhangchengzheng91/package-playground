import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import onerror from 'koa-onerror';
import serve from 'koa-static';
import path from 'path';
import Router from '@koa/router';
import setupRouter from './router';

/** 0 = dev / 避免 Whistle 内置 WebView 强缓存已带 contenthash 的旧 index.html */
const MAX_AGE = 0;

export default (server: Whistle.PluginServer, options: Whistle.PluginOptions) => {
  const app = new Koa();
  app.proxy = true;
  app.silent = true;
  onerror(app);
  const router = new Router();
  setupRouter(router);
  app.use(bodyParser());
  app.use(router.routes());
  app.use(router.allowedMethods());

  const staticOpts: {
    maxage: number;
    setHeaders?: (res: { setHeader: (k: string, v: string) => void }) => void;
  } = { maxage: MAX_AGE };
  if (MAX_AGE === 0) {
    staticOpts.setHeaders = (res) => {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
    };
  }

  app.use(serve(path.join(__dirname, '../../webui/dist'), staticOpts));
  server.on('request', app.callback());
};
