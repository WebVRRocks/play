#!/usr/bin/env node

const path = require('path');

const shell = require('shelljs');

const routes = require('./routes.json');

const rootDir = path.join(__dirname, '..');

shell.cd(rootDir);

const spaDocFilenames = Object.keys(routes).map(route => {
  const src = routes[route].substr(1) + 'index.html';
  const dest = route.substr(1) + '.html';
  if (src !== dest) {
    shell.cp(src, dest);
  }
});
