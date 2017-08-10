const urlParse = require('url').parse;

const liveServer = require('live-server');

const spaRoutes = require('./routes.json');

liveServer.start({
  root: process.env.WWW_DIR || process.cwd(),
  port: process.env.PORT || 8080,
  host: process.env.HOST || '0.0.0.0',
  open: false,
  ignore: '.git,node_modules',
  // file: 'index.html',  // When set, serve this file for every 404 (useful for SPAs).
  logLevel: 2,  // 0 = errors only; 1 = some errors; 2 = many errors.
  middleware: [
    function (req, res, next) {
      var path = urlParse(req.url).pathname;

      // Handle redirects for URLs with trailing slashes.
      if (path !== '/' && path.endsWith('/')) {
        res.statusCode = 302;
        res.setHeader('Location', req.url.replace(/\/+$/, ''));
        res.setHeader('Content-Length', '0');
        res.end();
        next();
        return;
      }

      Object.keys(spaRoutes).forEach(route => {
        if (path.startsWith(route)) {
          req.url = spaRoutes[route];
        }
      });
      next();
    }
  ]
});
