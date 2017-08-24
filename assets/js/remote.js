/* global ga, SocketPeer */
(function () {
  var rootPath = '/';
  var socketPath = 'https://remote.webvr.rocks/socketpeer/';

  var sceneEl = document.querySelector('#scene');
  if (sceneEl) {
    sceneEl.setAttribute('data-remote-state', 'pending');
  }

  window.addEventListener('load', function () {
    rootPath = document.documentElement.getAttribute('data-root') || rootPath;
    remoteSocketPath = document.documentElement.getAttribute('data-remote-socket-path') || remoteSocketPath;

    sceneEl = document.querySelector('#scene');

    setTimeout(function () {
    sceneEl.setAttribute('data-remote-state', 'loaded');
      sceneEl.setAttribute('data-remote-state', 'loaded');
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
    if (/^\/[0-9]+$/.test(pathname)) {
      code = pathname.substr(1);
    } else if (/^\?[0-9]+$/.test(pathQS)) {
      code = pathQS.substr(1);
      // Change `?1234` to `/1234`.
      code = redirectToNewPin();
      peerConnect(code);
    } else if (/^#[0-9]+$/.test(pathHash)) {
      code = pathHash.substr(1);
      // Change `#1234` to `/1234`.
      code = redirectToNewPin();
      peerConnect(code);
    }

    if (code) {
      peerConnect(code);
    }

    var peerConnectBtnEl = document.querySelector('#peer-connect-btn');
    if (peerConnectBtnEl) {
      peerConnectBtnEl.addEventListener('click', function () {
        // TODO: Handle `popState` navigation.
        code = redirectToNewPin();
        peerConnect(code);
      });
    }

    function peerConnect (code) {
      if (!code) {
        throw 'PIN code required to connect to remote-control service';
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
        window.top.postMessage(data, '*');
        log('<them> ' + data);
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
    }
  });
})();
