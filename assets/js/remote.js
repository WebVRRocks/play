/* global ga, SocketPeer, SpatialNavigation */
(function () {
  var rootPath = '/';
  // var remoteSocketPath = 'https://remote.webvr.rocks/socketpeer/';
  var remoteSocketPath = 'http://0.0.0.0:3000/socketpeer/';
  var spatialNavigationPath = 'assets/js/spatial_navigation.js';

  var remoteEl = document.querySelector('#remote');
  if (remoteEl) {
    remoteEl.setAttribute('data-remote-state', 'pending');
  }

  function Dependencies () {
    this.scripts = {};
  }
  Dependencies.prototype.require = function (src, cb) {
    var self = this;
    if (self.hasLoaded(src)) {
      if (cb) {
        return true;
      } else {
        cb(null, true);
      }
    }

    var script = document.createElement('script');
    script.src = src;
    script.async = script.defer = true;

    self.scripts[src] = null;

    script.addEventListener('load', function () {
      self.scripts[src] = true;
      if (cb) {
        cb(null, true);
      }
    });

    script.addEventListener('error', function (err) {
      self.scripts[src] = err;
      if (cb) {
        cb(err);
      }
    });

    document.head.appendChild(script);
  };
  Dependencies.prototype.hasLoaded = function (src) {
    return this.scripts[src] === true;
  };

  var dependencies = new Dependencies();

  window.addEventListener('load', function () {
    rootPath = document.documentElement.getAttribute('data-root') || rootPath;
    remoteSocketPath = document.documentElement.getAttribute('data-remote-socket-path') || remoteSocketPath;

    remoteEl = document.querySelector('#remote');

    remoteEl.setAttribute('data-remote-state', 'pending');

    setTimeout(function () {
      remoteEl.setAttribute('data-remote-state', 'loaded');
    });

    function newPin () {
      var big = Math.pow(16, 10);
      var code = ((Math.random() * big | 0) + big).toString(16);
      return code;
    }

    function redirectToNewPin (code) {
      if (!code) {
        code = newPin();
      }
      var pathWithPin = rootPath + code;
      window.history.replaceState(null, null, pathWithPin);
      return code;
    }

    function log (msg) {
      console.log('[remote] ' + msg);
    }

    var pathname = window.location.pathname;
    var pathQS = window.location.search;
    var pathHash = window.location.hash;
    var code = '';

    function handleCurrentPin (code) {
      pathname = window.location.pathname;
      pathQS = window.location.search;
      pathHash = window.location.hash;

      if (!code) {
        code = '';
        if (/^\/[0-9]+$/.test(pathname)) {
          code = pathname.substr(1);
        } else if (/^\?[0-9]+$/.test(pathQS)) {
          code = pathQS.substr(1);
          code = redirectToNewPin(code);  // Change `?1234` to `/1234`.
        } else if (/^#[0-9]+$/.test(pathHash)) {
          code = pathHash.substr(1);
          code = redirectToNewPin(code);  // Change `#1234` to `/1234`.
        }
      }

      if (code) {
        return peerConnect(code);
      }

      return null;
    }

    function initSpatialNavigation () {
      if (initSpatialNavigation.called) {
        return;
      }

      initSpatialNavigation.called = true;

      dependencies.require(rootPath + spatialNavigationPath, function () {
        SpatialNavigation.init();

        SpatialNavigation.add({
          id: 'scenes-form',
          selector: '.focusable-radio'
        });

        SpatialNavigation.makeFocusable();

        SpatialNavigation.focus();
      });
    }

    window.addEventListener('hashchange', function () {
      handleCurrentPin();
    });

    handleCurrentPin();
    initSpatialNavigation();

    var peerConnectBtnEl = document.querySelector('#peer-connect-btn');
    if (peerConnectBtnEl) {
      peerConnectBtnEl.addEventListener('click', function () {
        // TODO: Handle `popState` navigation.
        code = redirectToNewPin();
        peerConnect(code);
      });
    }

    function peerConnect (code, cb) {
      return dependencies.require(remoteSocketPath + 'socketpeer.js', function () {
        _peerConnect(cb);
        initSpatialNavigation();
      });

      function _peerConnect (cb) {
        if (!code) {
          var err = new Error('PIN code required');
          if (cb) {
            return cb(err);
          } else {
            throw err;
          }
        }

        var peer = new SocketPeer({
          pairCode: code,
          url: remoteSocketPath
        });
        var connected = false;

        function directionChanged (value) {
          log('<button press> ' + value);

          peer.send(value);

          var stateData = {
            type: 'buttondown',
            value: value
          };

          window.top.postMessage(JSON.stringify(stateData), '*');

          window.location.hash = '#' + value;

          return stateData;
        }

        peer.on('data', function (data) {
          log('received data: ' + data);

          if (data) {
            SpatialNavigation.move(data);
          }
        });

        peer.on('upgrade', function () {
          log('upgraded to p2p');
          connected = true;
        });

        peer.on('upgrade_attempt', function () {
          log('negotiating with peer');
        });

        peer.on('busy', function () {
          log('peer connected to someone else');
        });

        peer.on('error', function (err) {
          log('connection error: ' + err);
        });

        peer.on('downgrade', function () {
          log('p2p connection broken');
          connected = false;
        });

        log('waiting for another user to go to ' + location.href);

        if (cb) {
          return cb(null, peer);
        } else {
          return peer;
        }
      }
    }
  });
})();
