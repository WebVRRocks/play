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
      const pathnameClean = pathname.replace(/\/+/g, '/').replace(/\/index.html$/i, '');

      const pathnameHasPin = /^\/[0-9]+$/.test(pathname);

      if (pathnameClean === '/' || pathnameHasPin || spaRoutes[pathnameClean] === '/') {
        req.url = '/';
      } else if (pathname !== pathnameClean) {
        res.statusCode = 302;
        res.setHeader('Location', pathnameClean);
        res.setHeader('Content-Length', '0');
      }

      next();
    }
  ]
});
