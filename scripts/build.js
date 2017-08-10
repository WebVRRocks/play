#!/usr/bin/env node

const path = require('path');

const shell = require('shelljs');

const routes = require('./routes.json');

const rootDir = path.join(__dirname, '..');

shell.cd(rootDir);

const spaDocFilenames = Object.keys(routes).map(route => {
  shell.cp(routes[route].substr(1) + 'index.html', route.substr(1) + '.html');
});
