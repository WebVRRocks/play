/* global ga, UAParser, URLSearchParams */
(function () {
  var rootPath = '/';
  try {
    rootPath = document.documentElement.getAttribute('data-root') || rootPath;
  } catch (err) {
  }

  // Register a Service Worker, if supported by the browser.
  if ('URLSearchParams' in window) {
    var qs = new URLSearchParams(window.location.search.substr(1));
    var swEnabled = qs.get('sw') !== '0';
    if (swEnabled && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register(rootPath + 'sw.js').then(function (reg) {
        console.log('Service Worker registration succeeded (scope: %s)', reg.scope);
      }).catch(function (err) {
        console.error('Service Worker registration failed:', err);
      });
    }
  }

  // Adapted from source: https://github.com/feross/arch/blob/master/browser.js
  function arch () {
    /**
     * User-Agent strings that indicate a 64-bit OS.
     * See: http://stackoverflow.com/a/13709431/292185
     */
    var userAgent = navigator.userAgent;
    if ([
      'x86_64',
      'x86-64',
      'Win64',
      'x64;',
      'amd64',
      'AMD64',
      'WOW64',
      'x64_64'
    ].some(function (str) {
      return userAgent.indexOf(str) > -1;
    })) {
      return 'x64';
    }

    /**
     * Platform strings that indicate a 64-bit OS.
     * See: http://stackoverflow.com/a/19883965/292185
     */
    var platform = navigator.platform;
    if (platform === 'MacIntel' || platform === 'Linux x86_64') {
      return 'x64';
    }

    /**
     * CPU class strings that indicate a 64-bit OS.
     * See: http://stackoverflow.com/a/6267019/292185
     */
    if (navigator.cpuClass === 'x64') {
      return 'x64';
    }

    /**
     * If none of the above, assume the architecture is 32-bit.
     */
    return 'x86';
  }

  var uaParsed = new UAParser(navigator.userAgent);
  var ua = uaParsed.getResult();
  ua.os.name = ua.os.name || '';
  ua.os.version = ua.os.version || '';
  ua.browser.name = ua.browser.name || '';
  ua.browser.version = ua.browser.version || '';
  if (!ua.device.vendor && !ua.device.model && !ua.device.type) {
    ua.device.vendor = ua.device.vendor || '';
    ua.device.model = ua.device.model || '';
    ua.device.type = ua.device.type || '';
  }
  ua.cpu.architecture = arch();

  var osValueEl;
  var browserValueEl;
  var deviceValueEl;
  var cpuValueEl;
  var vrdisplaysValueEl;

  var osCompatValueEl;

  var supports = {};

  var l10nStrings = {};

  function parseProfile () {
    osValueEl = document.querySelector('#os_value');
    browserValueEl = document.querySelector('#browser_value');
    deviceValueEl = document.querySelector('#device_value');
    cpuValueEl = document.querySelector('#cpu_value');
    vrdisplaysValueEl = document.querySelector('#vrdisplays_value');

    osCompatValueEl = document.querySelector('#os_compat_value > span');

    supports.touch = 'ontouchstart' in window;
    supports.mobile = isMobile();
    supports.tablet = isTablet();
    supports.webvr = !!navigator.getVRDisplays;
    supports.desktop = !supports.mobile && !supports.tablet;

    document.documentElement.setAttribute('data-desktop', supports.desktop);
    document.documentElement.setAttribute('data-tablet', supports.tablet);
    document.documentElement.setAttribute('data-mobile', supports.mobile);
    document.documentElement.setAttribute('data-platform', supports.touch);
    document.documentElement.setAttribute('data-supports-touch', supports.touch);
    document.documentElement.setAttribute('data-supports-webvr-positional', supports.webvrPositional);
    document.documentElement.setAttribute('data-supports-webvr', supports.webvr);
    document.documentElement.setAttribute('data-supports-webvr-disconnected', supports.webvrPositional);
  }

  function renderProfile () {
    if (osValueEl) {
      if (ua.os.name) {
        var osStr = JSON.stringify(ua.os);
        osValueEl.innerHTML = '&nbsp;';
        osValueEl.setAttribute('data-l10n-args', osStr);
      } else {
        osValueEl.removeAttribute('data-l10n-args');
        osValueEl.setAttribute('data-l10n-id', 'os_value_unknown');
      }

      osCompatValueEl.innerHTML = '&nbsp;';

      if (ua.os.name === 'Windows') {
        if (ua.os.version.indexOf('10') === 0) {
          osCompatValueEl.setAttribute('data-l10n-id', 'os_compat_supported');
        } else {
          osCompatValueEl.setAttribute('data-l10n-id', 'os_compat_unsupported');
        }
      } else if (ua.os.name === 'Mac OS') {
        if (ua.os.version.indexOf('10.') === 0) {
          osCompatValueEl.setAttribute('data-l10n-id', 'os_compat_experimental');
          var msgEl = osCompatValueEl.parentNode.querySelector('[data-l10n-id^="os_compat_message_"]');
          if (!msgEl) {
            msgEl = document.createElement('p');
            osCompatValueEl.parentNode.appendChild(msgEl);
          }
          if (ua.browser.name === 'Firefox' && parseFloat(ua.browser.version) > 55.0) {
            msgEl.setAttribute('data-l10n-id', 'os_compat_message_experimental_firefox_enable');
          } else {
            msgEl.setAttribute('data-l10n-id', 'os_compat_message_experimental_firefox_download');
          }
        } else {
          osCompatValueEl.setAttribute('data-l10n-id', 'os_compat_unsupported');
        }
      } else if (ua.os.name === 'Linux') {
        if (ua.os.version.indexOf('10.') === 0) {
          osCompatValueEl.setAttribute('data-l10n-id', 'os_compat_experimental');
        }
      } else if (ua.os.name === 'Android') {
        // TODO: Check the version of Android.
        osCompatValueEl.setAttribute('data-l10n-id', 'os_compat_experimental');
      } else if (ua.os.name === 'iOS') {
        // TODO: Check the version of iOS.
        osCompatValueEl.setAttribute('data-l10n-id', 'os_compat_polyfilled');
      }
    }

    if (browserValueEl) {
      if (ua.browser.name) {
        var browserStr = JSON.stringify(ua.browser);
        browserValueEl.innerHTML = '&nbsp;';
        browserValueEl.setAttribute('data-l10n-args', browserStr);
      } else {
        browserValueEl.removeAttribute('data-l10n-args');
        browserValueEl.setAttribute('data-l10n-id', 'browser_value_unknown');
      }
    }

    if (deviceValueEl) {
      if (ua.device.vendor || ua.device.model || ua.device.type) {
        var deviceStr = JSON.stringify(ua.device);
        deviceValueEl.innerHTML = '&nbsp;';
        deviceValueEl.setAttribute('data-l10n-args', deviceStr);
      } else {
        if (navigator.platform && navigator.platform === 'MacIntel') {
          ua.device.vendor = 'Apple';
          ua.device.model = 'Mac';
          ua.device.type = 'Intel';
          var deviceStr = JSON.stringify(ua.device);
          deviceValueEl.innerHTML = '&nbsp;';
          deviceValueEl.setAttribute('data-l10n-args', deviceStr);
        } else {
          deviceValueEl.removeAttribute('data-l10n-args');
          if (supports.tablet) {
            deviceValueEl.setAttribute('data-l10n-id', 'device_value_type_tablet');
          } else if (supports.mobile) {
            deviceValueEl.setAttribute('data-l10n-id', 'device_value_type_mobile');
          } else {
            deviceValueEl.setAttribute('data-l10n-id', 'device_value_type_desktop');
          }
        }
      }
    }

    if (cpuValueEl) {
      if (ua.cpu.architecture) {
        var cpuStr = JSON.stringify(ua.cpu);
        cpuValueEl.innerHTML = '&nbsp;';
        if (ua.cpu.architecture === 'x64') {
          cpuValueEl.setAttribute('data-l10n-id', 'cpu_value_64_bit');
        } else if (ua.cpu.architecture === 'x86') {
          cpuValueEl.setAttribute('data-l10n-id', 'cpu_value_32_bit');
        } else {
          cpuValueEl.setAttribute('data-l10n-args', cpuStr);
        }
      } else {
        cpuValueEl.removeAttribute('data-l10n-args', cpuStr);
        cpuValueEl.setAttribute('data-l10n-id', 'cpu_value_unknown');
      }
    }

    if ('getVRDisplays' in navigator) {
      navigator.getVRDisplays().then(function (displays) {
        vrdisplaysValueEl.innerHTML = '';
        displays.forEach(function (display) {
          var displayEl = document.createElement('div');
          var strongEl = document.createElement('strong');
          strongEl.textContent = display.displayName;
          displayEl.appendChild(strongEl);
          vrdisplaysValueEl.appendChild(displayEl);
        });
      });
    } else {
      vrdisplaysValueEl.innerHTML = 'Unsupported';
    }
  }

  var pageTitles = {};
  var startUrls = {};

  function getPath (href) {
    var pathname = href || window.location.pathname;
    if (pathname === rootPath || pathname === '/' || pathname === '/index' || pathname === '/index.html') {
      return rootPath;
    }
    return pathname.replace(/\/+$/g, '').replace(/.html$/g, '');
  }

  var sceneEl = document.querySelector('#scene');
  if (sceneEl) {
    sceneEl.setAttribute('data-state', 'pending');
  }

  window.addEventListener('load', function () {
    rootPath = document.documentElement.getAttribute('data-root') || rootPath;

    sceneEl = document.querySelector('#scene');  // This element is the `<iframe>` container for the current scene.

    sceneEl.setAttribute('data-state', 'pending');
    setTimeout(function () {
      sceneEl.setAttribute('data-state', 'loaded');
    }, 2000);
    // TODO: Fix this such that the child `<iframe>` sends a `postMessage` event to this parent window.
    // sceneEl.addEventListener('load', function () {
    //   sceneEl.setAttribute('data-state', 'loaded');
    // });

    var cssDynamicRulesEl = document.querySelector('#css-dynamic-rules');

    Array.prototype.forEach.call(document.querySelectorAll('[data-slug]'), function (sceneItemEl) {
      var slug = sceneItemEl.getAttribute('data-slug');
      pageTitles[rootPath + slug] = sceneItemEl.querySelector('[itemprop="name"]').textContent;
      startUrls[rootPath + slug] = sceneItemEl.querySelector('[itemprop="url"]').getAttribute('href');
      cssDynamicRulesEl.cssText += 'html[data-path^="/' + slug + '"] [data-page~="play"] { display: block; }';
      cssDynamicRulesEl.cssText += 'html[data-path^="/' + slug + '"] [data-slug="' + slug + '"] { box-shadow: 0 0 10px rgba(255,255,255,.5); opacity: 1; }';
    });

    var titleEl = document.querySelector('[data-l10n-id="title_default"]');
    pageTitles[rootPath] = titleEl.textContent;
    cssDynamicRulesEl.cssText += 'html[data-layout~="play"] [data-slug="play"] { opacity: 1; }';

    var profileHeadingEl = document.querySelector('[data-l10n-id="system_profile"]');
    pageTitles[rootPath + 'profile'] = profileHeadingEl.textContent;
    cssDynamicRulesEl.cssText += 'html[data-layout~="profile"] [data-slug="profile"] { opacity: 1; }';

    var polyfillV2HeadingEl = document.querySelector('[data-l10n-id="polyfill_v2"]');
    pageTitles[rootPath + 'polyfill_v2'] = polyfillV2HeadingEl.textContent;
    cssDynamicRulesEl.cssText += 'html[data-layout~="polyfill_v2"] [data-slug="profile"] { opacity: 1; }';

    var redirectPath = null;
    try {
      redirectPath = window.sessionStorage.redirect;
      delete window.sessionStorage.redirect;
    } catch (err) {
    }
    if (redirectPath) {
      if (redirectPath in pageTitles && redirectPath !== window.location.href) {
        history.replaceState(null, null, redirectPath);
        routeUpdate(redirectPath, false);
      }
    } else {
      var path = getPath();
      routeUpdate(path, false);
    }

    parseProfile();

    renderProfile();

    var pathname = window.location.pathname;
    var pathnameHasPin = /^\/[0-9]+$/.test(pathname);
    if (pathnameHasPin) {
      var remoteEl = document.getElementById('remote');
      if (remoteEl) {
        remoteEl.src = remoteEl.getAttribute('data-base-url').replace(/\/+$/g, '') + pathname;
      }
    }

    window.addEventListener('message', function (evt) {
      console.log('Received postMessage:', evt.data);
      if (evt.data === 'right') {
        console.log('go right');
        var selectedSceneEl = document.querySelector('input[name="scene"]:checked');
        if (selectedSceneEl) {
          var nextSceneEl = selectedSceneEl.closest('[itemprop="scene"] + [itemprop="scene"]');
          console.log(nextSceneEl);
          if (nextSceneEl) {
            selectedSceneEl.checked = false;
            nextSceneEl.checked = true;
          }
        } else {
          var nextSceneEl = document.querySelector('input[name="scene"]');
          nextSceneEl.checked = true;
        }
      }
    });

    var scenesFormEl = document.querySelector('[data-form="scenes"]');

    var scenesEl = document.querySelector('[data-section~="scenes"]');
    scenesEl.addEventListener('click', function (evt) {
      if (!evt.target.closest || evt.shiftKey || evt.altKey || evt.ctrlKey) {
        return;
      }

      var linkEl = evt.target.closest('[itemprop="url"]');
      if (!linkEl) {
        return;
      }
      var sceneItemEl = linkEl.closest('[itemprop="scene"]');
      if (!sceneItemEl) {
        return;
      }

      evt.preventDefault();
      evt.stopPropagation();

      var slug = sceneItemEl.getAttribute('data-slug');

      var selectedSceneEl = document.querySelector('input[name="scene"]:checked');
      if (selectedSceneEl) {
        selectedSceneEl.checked = false;
      }

      var newSelectedSceneEl = sceneItemEl.querySelector('input[name="scene"]');
      if (newSelectedSceneEl) {
        newSelectedSceneEl.checked = true;
        newSelectedSceneEl.focus();
      }

      scenesFormEl.setAttribute('data-scene', slug);

      var pageUrl = rootPath + slug;
      routeUpdate(pageUrl, true, {slug: slug});
    });

    if (scenesFormEl) {
      scenesFormEl.addEventListener('submit', function (evt) {
        evt.preventDefault();
        evt.stopPropagation();

        var selectedSceneEl = document.querySelector('input[name="scene"]:checked');
        if (selectedSceneEl) {
          var slug = selectedSceneEl.value;

          var pageUrl = rootPath + slug;
          routeUpdate(pageUrl, true, {slug: slug});

          scenesFormEl.setAttribute('data-scene', slug);
        }
      });
    }
  });

  function routeUpdate (href, push, data) {
    var path = getPath(href);

    if (path === rootPath + 'profile') {
      document.documentElement.setAttribute('data-layout', 'profile');
    } else if (path.indexOf(rootPath + 'polyfill') === 0) {
      document.documentElement.setAttribute('data-layout', 'polyfill');
    } else {
      document.documentElement.setAttribute('data-layout', 'play');
    }
    document.documentElement.setAttribute('data-path', path);

    if ((!(href in pageTitles) && !(href in startUrls)) || href === window.location.href) {
      return false;
    }

    var titleEl = document.querySelector('title');
    var title = pageTitles[path];

    if (path !== rootPath && title) {
      titleEl.setAttribute('data-l10n-args', JSON.stringify({title: title}));
      titleEl.setAttribute('data-l10n-id', 'title_page');
    } else {
      titleEl.removeAttribute('data-l10n-args');
      titleEl.setAttribute('data-l10n-id', 'title_default');
    }

    if (href in startUrls) {
      sceneEl.setAttribute('src', startUrls[path]);
    }

    // TODO: Handle `popState` navigation.
    if (push !== false) {
      var state = {};
      state.path = path;
      state.title = title;
      if (href in startUrls) {
        state.startUrl = startUrls[href];
      }
      window.history.pushState(state, title, path);

      if ('ga' in window) {
        ga('set', {
          page: window.location.pathname,
          title: title
        });
        ga('send', 'pageview');
      }
    }

    return true;
  }

  // document.addEventListener('click', function (evt) {
  //   if (evt.target.tagName === 'A' &&
  //       evt.target.origin === window.location.origin) {
  //     evt.preventDefault();
  //     if (evt.target.href !== window.location.href) {
  //       routeUpdate(e.target.href, true);
  //     }
  //   }
  // }, true);

  /**
   * Check for positional tracking.
   */
  function hasPositionalTracking (isMobile) {
    var supportsPositional = isMobile;
    if (supportsPositional) {
      return true;
    }
    displays.connected.concat(displays.presenting).forEach(function (display) {
      if (display && display.capabilities && display.capabilities.hasPosition) {
        supportsPositional = true;
      }
    });
    if (supportsPositional) {
      return true;
    }
    if (!supports.desktop && ('ondevicemotion' in window)) {
      return true;
    }
  }

  /**
   * Detect tablet devices.
   * @param {String} `mockUserAgent` - Allow passing a mock user agent for testing.
   * @returns {Boolean} `true` if device is a tablet.
   */
  function isTablet (mockUserAgent) {
    var userAgent = mockUserAgent || window.navigator.userAgent;
    return /ipad|Nexus (7|9)|xoom|sch-i800|playbook|tablet|kindle/i.test(userAgent);
  }

  function isIOS () {
    return /iPad|iPhone|iPod/.test(window.navigator.platform);
  }

  function isSamsungGearVR () {
    return /Samsung\s*Browser.+Mobile\s*VR/i.test(window.navigator.userAgent);
  }

  /**
   * Checks if browser is mobile.
   * @returns {Boolean} `true` if mobile browser detected.
   */
  var isMobile = (function () {
    var _isMobile = false;
    (function (a) {
      // eslint-disable-next-line no-useless-escape
      if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0, 4))) {
        _isMobile = true;
      }
      if (isIOS() || isTablet()) {
        _isMobile = true;
      }
    })(window.navigator.userAgent || window.navigator.vendor || window.opera);
    return function () {
      return _isMobile || isSamsungGearVR();
    };
  })();

    // var displays = {
    //   available: [],
    //   connected: [],
    //   presenting: []
    // };
    //
    // var headsets = {
    //   htc_vive: {
    //     name: 'HTC Vive',
    //     slug: 'htc_vive'
    //   },
    //   oculus_rift: {
    //     name: 'Oculus Rift',
    //     slug: 'oculus_rift'
    //   },
    //   google_daydream: {
    //     name: 'Google Daydream',
    //     slug: 'google_daydream'
    //   },
    //   samsung_gear_vr: {
    //     name: 'Samsung Gear VR',
    //     slug: 'samsung_gear_vr'
    //   },
    //   google_cardboard: {
    //     name: 'Google Cardboard',
    //     slug: 'google_cardboard'
    //   },
    //   osvr_hdk2: {
    //     name: 'OSVR HDK2',
    //     slug: 'osvr_hdk2'
    //   },
    //   none: {
    //     name: '(None)',
    //     slug: 'none'
    //   }
    // };
    //
    // var filteredHeadsets = {};
    // Object.keys(headsets).forEach(function (headsetKey) {
    //   filteredHeadsets[headsetKey] = '';
    // });
    //
    // function getDisplaySlug (display) {
    //   var displayName = (display.displayName || display.name || '').toLowerCase();
    //   if (displayName.indexOf('oculus') > -1) {
    //     return headsets.oculus_rift.slug;
    //   } else if (displayName.indexOf('openvr') > -1 || displayName.indexOf('vive') > -1) {
    //     return headsets.htc_vive.slug;
    //   } else if (displayName.indexOf('gear') > -1) {
    //     return headsets.samsung_gear_vr.slug;
    //   } else if (displayName.indexOf('daydream') > -1) {
    //     return headsets.google_daydream.slug;
    //   } else if (displayName.indexOf('osvr') > -1) {
    //     return headsets.osvr_hdk2.slug;
    //   }
    //   return supports.webvrPositional ? headsets.google_cardboard.slug : headsets.none.slug;
    // }
    //
    // function addOrUpdateDisplay (display, displayGroupType) {
    //   var displaysList = displays[displayGroupType];
    //   if (!displaysList) {
    //     return;
    //   }
    //   var idx = displaysList.indexOf(display.displayId);
    //   if (idx > -1) {
    //     displaysList[idx] = display;
    //     headsets[getDisplaySlug(display)][displayGroupType] = true;
    //     return;
    //   }
    //   displaysList.push(display);
    //   headsets[getDisplaySlug(display)][displayGroupType] = true;
    // }
    //
    // function removeDisplay (display, displayGroupType) {
    //   var displaysList = displays[displayGroupType];
    //   if (!displaysList) {
    //     return;
    //   }
    //   var idx = displaysList.indexOf(display.displayId);
    //   if (idx > -1) {
    //     displaysList.splice(idx, 1);
    //     headsets[getDisplaySlug(display)][displayGroupType] = true;
    //   }
    // }
    //
    // if (supports.webvr) {
    //   navigator.getVRDisplays().then(function (displays) {
    //     displays.forEach(function (display) {
    //       if (display.isConnected) {
    //         addOrUpdateDisplay(display, 'available');
    //       } else {
    //         removeDisplay(display, 'available');
    //         addOrUpdateDisplay(display, 'connected');
    //       }
    //     });
    //     supports.webvrPositional = hasPositionalTracking(isMobile);
    //   });
    //
    //   window.addEventListener('vrdisplayconnect', function (evt) {
    //     addOrUpdateDisplay(evt.display, 'available');
    //     addOrUpdateDisplay(evt.display, 'connected');
    //   });
    //
    //   window.addEventListener('vrdisplaydisconnect', function (evt) {
    //     addOrUpdateDisplay(evt.display, 'available');
    //     addOrUpdateDisplay(evt.display, 'disconnected');
    //   });
    //
    //   window.addEventListener('vrdisplaypresentchange', function (evt) {
    //     if (evt.isPresenting) {
    //       addOrUpdateDisplay(evt.display, 'presenting');
    //     } else {
    //       removeDisplay(evt.display, 'presenting');
    //     }
    //   });
    // }
})();
