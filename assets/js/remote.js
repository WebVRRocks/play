/* global ga, SocketPeer, SpatialNavigation, state */
(function () {
  var htmlEl = document.documentElement;
  var remoteSocketPath = 'https://remote.webvr.rocks/socketpeer/';
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
    remoteSocketPath = htmlEl.getAttribute('data-remote-socket-path') || remoteSocketPath;

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
      var pathWithPin = state.rootPath + code;
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
        try {
          window.localStorage.remote_code = code;
        } catch (err) {
        }
        return peerConnect(code);
      }

      return null;
    }

    function initSpatialNavigation () {
      if (initSpatialNavigation.called) {
        return;
      }

      initSpatialNavigation.called = true;

      dependencies.require(state.rootPath + spatialNavigationPath, function () {
        var scenesFormEl = document.querySelector('[data-form="scenes"]');

        if (scenesFormEl) {
          var sceneEls = scenesFormEl.querySelectorAll('[itemprop="scene"] input[name="scene"]');
          var firstSceneRadioEl = sceneEls[0];
          var lastSceneRadioEl = sceneEls[sceneEls.length - 1];
          if (firstSceneRadioEl && lastSceneRadioEl) {
            var lastSceneSelector = 'input[name="scene"][value="' + lastSceneRadioEl.value + '"]';
            firstSceneRadioEl.setAttribute('data-sn-left', lastSceneSelector);
            firstSceneRadioEl.setAttribute('data-sn-up', lastSceneSelector);

            var firstSceneSelector = 'input[name="scene"][value="' + firstSceneRadioEl.value + '"]';
            lastSceneRadioEl.setAttribute('data-sn-right', firstSceneSelector);
            lastSceneRadioEl.setAttribute('data-sn-down', firstSceneSelector);
          }
        }

        SpatialNavigation.init();

        SpatialNavigation.add({
          id: 'scenes-form',
          selector: '.focusable-radio'
        });

        SpatialNavigation.makeFocusable();
      });
    }

    window.addEventListener('hashchange', function () {
      handleCurrentPin();
    });

    try {
      code = window.localStorage.remote_code;
    } catch (err) {
    }

    handleCurrentPin(code);
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
          SpatialNavigation.focus();

          log('received data: ' + data);

          if (data === 'up' || data === 'right' || data === 'down' || data === 'left') {
            if (data === 'up') {
              data = 'left';
            }
            if (data === 'down') {
              data = 'right';
            }
            SpatialNavigation.move(data);
          } else if (data === 'select') {
            document.activeElement.click();
            var urlEl = document.activeElement.closest('li').querySelector('[itemprop="url"]');
            if (urlEl) {
              urlEl.click();
            }
          }
        });

        peer.on('upgrade', function () {
          log('upgraded to p2p');

          connected = true;

          try {
            window.localStorage.remote_code = code;
          } catch (err) {
          }
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
