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
      var path = urlParse(req.url).pathname;

      // Handle redirects for URLs with trailing slashes.
      if (path.endsWith('.html') || (path !== '/' && path.endsWith('/'))) {
        res.statusCode = 302;
        res.setHeader('Location', req.url.replace(/\/+$/, '').replace(/.html$/, ''));
        res.setHeader('Content-Length', '0');
        next();
        return;
      }

      if (path !== '/' && !path.startsWith('/assets')) {
        let redirectPath = '/404.html';
        const spaRoutesKeys = Object.keys(spaRoutes);
        for (let idx = 0; idx < spaRoutesKeys.length; idx++) {
          let route = spaRoutesKeys[idx];
          console.log('route, ', route, path);
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
