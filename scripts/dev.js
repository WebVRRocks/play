const path = require('path');

const urlParse = require('url').parse;

const liveServer = require('live-server');

const spaRoutes = require('./routes.json');

liveServer.start({
  root: process.env.WWW_DIR || process.cwd(),
  port: process.env.PORT || 8080,
  host: process.env.HOST || '0.0.0.0',
  open: false,
  ignore: '.git,node_modules',
  logLevel: 2,  // 0 = errors only; 1 = some errors; 2 = many errors.
  middleware: [
    function (req, res, next) {
      const urlParsed = urlParse(req.url);
      const pathname = urlParsed.pathname;
      const qs = urlParsed.search;
      const urlClean = req.url.replace(/\/+$/, '').replace(/.html$/, '');

      // TODO: Fix infinite-redirect bug with query-string parameters (e.g., `?sw=0`).
      if (urlClean === '/' && qs) {
        req.url = urlClean;
        next();
        return;
      }

      // Handle redirects for URLs with trailing slashes.
      if (pathname.endsWith('.html') || (path !== '/' && pathname.endsWith('/'))) {
        res.statusCode = 302;
        res.setHeader('Location', urlClean);
        res.setHeader('Content-Length', '0');
        next();
        return;
      }

      const pathnameHasPin = /^\/[0-9]+$/.test(pathname);
      if (pathnameHasPin) {
        req.url = '/';
        next();
        return;
      }

      if (path !== '/' &&
          !pathname.startsWith('/assets') &&
          !pathname.endsWith('.js') &&
          !pathname.endsWith('.ico') &&
          !pathname.endsWith('.css') &&
          !pathname.endsWith('.md') &&
          !pathname.endsWith('.webmanifest') &&
          !pathname.endsWith('.manifest') &&
          !pathname.endsWith('.json')) {
        let redirectPath = '/404.html';
        const spaRoutesKeys = Object.keys(spaRoutes);
        for (let idx = 0; idx < spaRoutesKeys.length; idx++) {
          let route = spaRoutesKeys[idx];
          if (route !== '/' && path === route) {
            redirectPath = spaRoutes[route];
            break;
          }
        }
        req.url = redirectPath;
      }

      next();
    }
  ]
});
