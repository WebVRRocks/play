const urlParse = require('url').parse;

const liveServer = require('live-server');

const spaRoutes = require('./routes.json');

let settings = {
  root: process.env.WWW_ROOT || process.env.ROOT || process.cwd(),
  port: process.env.WWW_PORT || process.env.PORT || 8080,
  host: process.env.WWW_HOST || process.env.HOST || '0.0.0.0',
  open: (process.env.WWW_OPEN || process.env.OPEN) === 'true',
  ignore: process.env.WWW_IGNORE || process.env.IGNORE || '.git,node_modules',
  logLevel: parseInt(process.env.WWW_LOGS || process.env.LOGS || '2', 10),  // 0 = errors only; 1 = some errors; 2 = many errors.
  middleware: []
};

function redirectMiddleware (req, res, next) {
  const urlParsed = urlParse(req.url);
  const pathname = urlParsed.pathname;
  const qs = urlParsed.search;
  const pathnameClean = pathname.replace(/\/.html$/i, '').replace(/\/+/g, '/');

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

settings.middleware.push(redirectMiddleware);

liveServer.start(settings);
