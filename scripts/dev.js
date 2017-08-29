const http = require('http');
const https = require('https');
const urlParse = require('url').parse;

const liveServer = require('live-server');

const spaRoutes = require('./routes.json');

const remoteHost = process.env.REMOTE_HOST || '0.0.0.0';
const remotePort = parseInt(process.env.REMOTE_PORT || '3000', 10);
const remoteHttps = process.env.REMOTE_HTTPS === '1' || process.env.REMOTE_HTTPS === 'true';

const remoteSocketPathname = '/socketpeer/';
const remoteSocketPath = `http${remoteHttps ? 's' : ''}://${remoteHost}:${remotePort}${remoteSocketPathname}`;
const prodRemoteSocketPath = 'https://remote.webvr.rocks/socketpeer/';

let settings = {
  root: process.env.WWW_ROOT || process.env.ROOT || process.cwd(),
  host: process.env.WWW_HOST || process.env.HOST || '0.0.0.0',
  port: process.env.WWW_PORT || process.env.PORT || 8080,
  open: (process.env.WWW_OPEN || process.env.OPEN) === 'true',
  ignore: process.env.WWW_IGNORE || process.env.IGNORE || '.git,node_modules',
  logLevel: parseInt(process.env.WWW_LOGS || process.env.LOGS || '2', 10),  // 0 = errors only; 1 = some errors; 2 = many errors.
  middleware: [
    redirectMiddleware
  ]
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

const rewriteRemoteSocketPathMiddleware = require('connect-body-rewrite')({
  accept: function (res) {
    return res.getHeader('content-type').match(/text\/html/i);
  },
  rewrite: function (body) {
    return body.replace(/data-remote-socket-path=.*/, `data-remote-socket-path="${remoteSocketPath}"`);
  }
});

function startServer (socketpeerRunningLocally) {
  if (socketpeerRunningLocally) {
    console.log(`Using detected local Remote Control server: ${remoteSocketPath}`);
    settings.middleware.push(rewriteRemoteSocketPathMiddleware);
  } else {
    console.log(`Falling back to hosted Remote Control server: ${prodRemoteSocketPath}`);
  }
  liveServer.start(settings);
}

let socketpeerRunningLocally = false;
let protocolHandler = remoteHttps ? https : http;
const spReqOptions = {
  method: 'GET',
  protocol: `http${remoteHttps ? 's' : ''}:`,
  hostname: remoteHost,
  port: remotePort,
  path: remoteSocketPathname + 'socketpeer.js'
};
new Promise((resolve, reject) => {
  let reqTimeout = setTimeout(() => {
    reject(new Error('Request timed out after 3 seconds'));
  }, 3000);
  let req = http.request(spReqOptions, res => {
    res.setEncoding('utf8');
    res.on('error', () => {
      reject('Error occurred');
    });
    res.on('end', () => {
      clearTimeout(reqTimeout);
    });
    resolve(res.statusCode);
  });
  req.on('error', err => {
    reject(err);
  });
  req.end();
}).then(statusCode => {
  const socketpeerRunningLocally = statusCode === 200;
  startServer(socketpeerRunningLocally);
}).catch(err => {
  console.warn(`Could not reach Remote Control server: ${remoteSocketPath}`);
  startServer(false);
});
