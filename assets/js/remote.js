/* global ga, SocketPeer, SpatialNavigation, state */
(function () {
  var htmlEl = document.documentElement;
  var remoteSocketPath = 'https://remote.webvr.rocks/socketpeer/';
  var spatialNavigationPath = 'assets/js/spatial_navigation.js';

  var remoteEl = document.querySelector('#remote');
  if (remoteEl) {
    remoteEl.setAttribute('data-remote-state', 'pending');
  }

  function getPathname (url) {
    var pathname = null;
    if ('URL' in window) {
      return new URL(url).pathname;
    }
    var a = document.createElement('a');
    a.href = url;
    return a.pathname;
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
      } else {
        var xhr = new XMLHttpRequest();
        xhr.open('get', state.remoteSocketOrigin);
        xhr.addEventListener('readystatechange', function () {
          // TODO: Update PIN on page.
          try {
            code = window.localStorage.remote_code = getPathname(xhr.responseURL).substr(1);
          } catch (err) {
          }
          if (code) {
            peerConnect(code);
          }
        });
        xhr.send();
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
          var sceneEls = scenesFormEl.querySelectorAll('[data-slug-clickable] input[name="scene"]');
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

    var peer;

    var peerConnectBtnEl = document.querySelector('#peer-connect-btn');
    if (peerConnectBtnEl) {
      peerConnectBtnEl.addEventListener('click', function () {
        // TODO: Handle `popState` navigation.
        code = redirectToNewPin();
        peerConnect(code);
      });
    }

    var addFormEl = document.querySelector('form[data-form="add"]');
    if (addFormEl) {
      addFormEl.addEventListener('submit', function (evt) {
        evt.preventDefault();
        evt.stopPropagation();

        var urlEl = addFormEl.querySelector('input[name="url"]');

        if (!urlEl) {
          return;
        }

        var url = urlEl.value;

        var sceneEl = document.querySelector('#scene');
        if (sceneEl) {
          sceneEl.setAttribute('src', url);
        }

        var peerMsg = {
          action: 'navigate',
          value: url
        };
        log('navigating to ' + url);
        peer.send(peerMsg);
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

        peer = new SocketPeer({
          pairCode: code,
          url: remoteSocketPath
        });
        var connected = false;

        function directionChanged (value) {
          log('<button press> ' + value);

          var peerMsg = {
            action: 'move',
            value: value
          };

          peer.send(peerMsg);

          // window.top.postMessage(JSON.stringify(peerMsg), '*');
          // window.location.hash = '#' + value;

          return stateData;
        }

        peer.on('data', function (data) {
          console.log(typeof data.value);
          log('received data: ' + JSON.stringify(data));

          var action = data.action;
          var value = data.value;

          if (action === 'move') {
            SpatialNavigation.focus();
            if (action === 'up' || action === 'right' || action === 'down' || action === 'left') {
              if (action === 'up') {
                action = 'left';
              }
              if (action === 'down') {
                action = 'right';
              }
              SpatialNavigation.move(action);
            } else if (action === 'select') {
              var el = document.activeElement;
              el.click();
              try {
                el.closest('[data-slug-clickable]').querySelector('a').click();
              } catch (err) {
              }
            }
          } else if (action === 'navigate') {
            var sceneEl = document.querySelector('#scene');
            if (sceneEl) {
              sceneEl.setAttribute('src', value);
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

        log('waiting for another user to go to ' + window.state.serverOrigin + window.state.rootPath + code);

        if (cb) {
          return cb(null, peer);
        } else {
          return peer;
        }
      }
    }
  });
})();
