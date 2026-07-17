/**
 * Functional wiring for demo apps: messages, safari, photos, finder, sounds, devices.
 * Loads after registry.js. Generic content only.
 */
(function (global) {
  'use strict';

  function sound(name) {
    if (global.MacSounds && MacSounds.play) MacSounds.play(name);
  }

  function nowTime() {
    var d = new Date();
    var h = d.getHours();
    var m = d.getMinutes();
    var am = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return h + ':' + (m < 10 ? '0' : '') + m + ' ' + am;
  }

  /* ── Messages: send + conversation switch ───────────── */
  function wireMessages(el) {
    if (!el || el.dataset.wired) return;
    el.dataset.wired = '1';
    var bubbles = el.querySelector('.msg27-bubbles');
    var input = el.querySelector('.msg27-input');
    var sendBtn = el.querySelector('.msg27-send');
    var list = el.querySelector('.msg27-list');

    function send() {
      if (!input || !bubbles) return;
      var text = input.value.trim();
      if (!text) return;
      var row = document.createElement('div');
      row.className = 'msg27-bubble-row me';
      row.innerHTML = '<div class="bubble me"></div>';
      row.querySelector('.bubble').textContent = text;
      bubbles.appendChild(row);
      bubbles.scrollTop = bubbles.scrollHeight;
      input.value = '';
      sound('messageSent');
      /* Simulated reply */
      setTimeout(function () {
        var reply = document.createElement('div');
        reply.className = 'msg27-bubble-row them';
        reply.innerHTML = '<div class="bubble them"></div>';
        reply.querySelector('.bubble').textContent = 'Got it! 👍';
        bubbles.appendChild(reply);
        bubbles.scrollTop = bubbles.scrollHeight;
        sound('messageReceived');
        var active = el.querySelector('.msg27-convo.active .msg27-prev');
        if (active) active.textContent = text.length > 36 ? text.slice(0, 36) + '…' : text;
        var time = el.querySelector('.msg27-convo.active .msg27-time');
        if (time) time.textContent = 'Now';
      }, 700 + Math.random() * 600);
    }

    if (sendBtn) sendBtn.addEventListener('click', send);
    if (input) {
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          send();
        }
      });
    }

    if (list) {
      list.querySelectorAll('.msg27-convo').forEach(function (convo) {
        convo.addEventListener('click', function () {
          list.querySelectorAll('.msg27-convo').forEach(function (c) {
            c.classList.remove('active');
          });
          convo.classList.add('active');
          convo.classList.remove('unread');
          var badge = convo.querySelector('.msg27-badge');
          if (badge) badge.remove();
          var name = convo.querySelector('.msg27-name');
          var header = el.querySelector('.msg27-header-name');
          var avatar = el.querySelector('.msg27-header-avatar');
          if (name && header) header.textContent = name.textContent;
          if (avatar && name) avatar.textContent = name.textContent.charAt(0);
          var hue = convo.querySelector('.msg27-avatar');
          if (hue && avatar) {
            avatar.style.setProperty('--msg-hue', hue.style.getPropertyValue('--msg-hue') || '210');
          }
          sound('pop');
        });
      });
    }
  }

  /* ── Safari: real navigate via iframe when possible ─── */
  function wireSafari(el) {
    if (!el || el.dataset.wired) return;
    el.dataset.wired = '1';
    var input = el.querySelector('.safari-url-input');
    var page = el.querySelector('.safari-startpage');
    var tabTitle = el.querySelector('.safari-tab-title');
    var backBtn = el.querySelector('.safari-nav-seg[aria-label="Back"]');
    var history = [];
    var histIdx = -1;

    function showStart() {
      if (!page) return;
      page.innerHTML = page._startHTML || '';
      if (!page.innerHTML) {
        /* remount via registry if we lost start page */
        if (global.AppRegistry) {
          var app = AppRegistry.get('safari');
          if (app) {
            var tmp = document.createElement('div');
            tmp.innerHTML = app.open();
            var sp = tmp.querySelector('.safari-startpage');
            if (sp) page.innerHTML = sp.innerHTML;
          }
        }
      }
      if (tabTitle) tabTitle.textContent = 'Start Page';
      if (input) input.value = '';
      if (backBtn) {
        backBtn.disabled = true;
        backBtn.classList.add('is-disabled');
      }
      sound('pop');
      wireSafariStartClicks(el, navigate);
    }

    if (page && !page._startHTML) page._startHTML = page.innerHTML;

    function navigate(raw) {
      var q = (raw || '').trim();
      if (!q) return;
      var url = q;
      if (!/^https?:\/\//i.test(url)) {
        if (/^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(url)) url = 'https://' + url;
        else url = 'https://duckduckgo.com/?q=' + encodeURIComponent(q);
      }
      /* Prefer embeddable demo pages; many sites block iframes */
      var embed = url;
      if (/wikipedia\.org/i.test(url) || /example\.com/i.test(url) || /duckduckgo\.com/i.test(url)) {
        /* ok */
      } else if (/apple\.com/i.test(url)) {
        embed = 'https://www.apple.com/';
      }

      history = history.slice(0, histIdx + 1);
      history.push({ url: url, title: q });
      histIdx = history.length - 1;

      if (input) input.value = url.replace(/^https?:\/\//, '');
      if (tabTitle) tabTitle.textContent = (q.length > 28 ? q.slice(0, 28) + '…' : q);
      if (backBtn) {
        backBtn.disabled = histIdx <= 0;
        backBtn.classList.toggle('is-disabled', histIdx <= 0);
      }

      page.innerHTML =
        '<div class="safari-browser-view">' +
        '<div class="safari-browser-bar"><span class="safari-browser-status">Loading…</span>' +
        '<button type="button" class="safari-banner-cta" id="safari-to-start">Start Page</button></div>' +
        '<iframe class="safari-iframe" src="' +
        embed.replace(/"/g, '') +
        '" title="Web content" sandbox="allow-scripts allow-same-origin allow-forms allow-popups"></iframe>' +
        '<div class="safari-browser-fallback muted">If the page is blank, the site blocks embedding. Try Wikipedia, example.com, or a search.</div>' +
        '</div>';

      var iframe = page.querySelector('.safari-iframe');
      var status = page.querySelector('.safari-browser-status');
      if (iframe) {
        iframe.addEventListener('load', function () {
          if (status) status.textContent = 'Done';
          sound('tink');
        });
      }
      var start = page.querySelector('#safari-to-start');
      if (start) start.addEventListener('click', showStart);
      sound('pop');
    }

    if (input) {
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          navigate(input.value);
        }
      });
    }
    if (backBtn) {
      backBtn.addEventListener('click', function () {
        if (histIdx > 0) {
          histIdx--;
          var h = history[histIdx];
          if (h) navigate(h.url);
        } else showStart();
      });
    }
    var refresh = el.querySelector('.safari-url-refresh');
    if (refresh) {
      refresh.addEventListener('click', function () {
        var iframe = el.querySelector('.safari-iframe');
        if (iframe) {
          iframe.src = iframe.src;
          sound('pop');
        } else showStart();
      });
    }
    el.querySelectorAll('.safari-tab-add, .safari-tb-btn[title="New Tab"]').forEach(function (btn) {
      btn.addEventListener('click', showStart);
    });
    wireSafariStartClicks(el, navigate);
  }

  function wireSafariStartClicks(el, navigate) {
    el.querySelectorAll('.safari-fav').forEach(function (fav) {
      fav.addEventListener('click', function () {
        var name = fav.getAttribute('title') || fav.querySelector('.safari-fav-name');
        var n = typeof name === 'string' ? name : name && name.textContent;
        var map = {
          Apple: 'https://www.apple.com',
          Wikipedia: 'https://en.wikipedia.org/wiki/Main_Page',
          GitHub: 'https://example.com',
          Weather: 'https://example.com',
          News: 'https://example.com',
          Google: 'https://example.com',
          YouTube: 'https://example.com',
          Maps: 'https://example.com',
          Bing: 'https://example.com',
          X: 'https://example.com',
          LinkedIn: 'https://example.com',
          Reddit: 'https://example.com',
          NYT: 'https://example.com',
          BBC: 'https://example.com',
          'App Store': 'https://www.apple.com',
          iCloud: 'https://www.apple.com/icloud/',
        };
        navigate(map[n] || 'https://en.wikipedia.org/wiki/' + encodeURIComponent(n || 'Apple_Inc.'));
      });
    });
    var close = el.querySelector('.safari-banner-close');
    if (close) {
      close.addEventListener('click', function () {
        var b = el.querySelector('.safari-banner');
        if (b) b.remove();
      });
    }
  }

  /* ── Photos: real funny library + lightbox ───────────── */
  var FUNNY_TITLES = [
    'Rubber Duck CEO',
    'Cat Astronaut',
    'Corgi Mayor',
    'Penguin DJ',
    'Taco UFO',
    'Otter Barista',
    'Banana Phone',
    'Frog Wizard',
    'Donut Planet',
    'Llama Lawyer',
    'Robot Gardener',
    'Owl Librarian',
    'Sloth Express',
    'Cloud Sheep',
    'Pickle Band',
    'Toast Rocket',
    'Sushi Surfer',
    'Unicorn Bus',
    'Beaver Architect',
    'Octopus Chef',
  ];

  function photosHTML() {
    var tiles = '';
    for (var i = 1; i <= 20; i++) {
      var n = i < 10 ? '0' + i : String(i);
      var src = 'assets/photos/funny/funny-' + n + '.jpg';
      var title = FUNNY_TITLES[i - 1] || 'Funny ' + i;
      tiles +=
        '<button type="button" class="photo-tile photo-tile-img" data-src="' +
        src +
        '" data-title="' +
        title +
        '" title="' +
        title +
        '">' +
        '<img src="' +
        src +
        '" alt="' +
        title +
        '" loading="lazy" />' +
        '</button>';
    }
    return (
      '<div class="app-layout photos-app" id="photos-app-root">' +
      '<aside class="app-sidebar photos-sidebar">' +
      '<div class="sb-section-label">Library</div>' +
      '<div class="app-sidebar-item active" data-nav="lib"><span class="sb-icon">📷</span><span>Library</span></div>' +
      '<div class="app-sidebar-item" data-nav="funny"><span class="sb-icon">😂</span><span>Funny</span></div>' +
      '<div class="app-sidebar-item" data-nav="recents"><span class="sb-icon">🕐</span><span>Recents</span></div>' +
      '<div class="app-sidebar-item" data-nav="favorites"><span class="sb-icon">★</span><span>Favorites</span></div>' +
      '</aside>' +
      '<div class="app-main photos-main">' +
      '<div class="app-toolbar photos-toolbar" data-drag-region data-drag-handle>' +
      '<div class="photos-tb-left"><strong>Funny Library</strong><span class="muted">20 photos</span></div>' +
      '<input class="search-field photos-search" placeholder="Search" />' +
      '</div>' +
      '<div class="photos-scroll">' +
      '<div class="photos-section-head"><h2>Funny Collection</h2><span class="muted">20 Photos</span></div>' +
      '<div class="photo-grid photo-grid-real">' +
      tiles +
      '</div></div>' +
      '<div class="photo-lightbox" id="photo-lightbox" hidden>' +
      '<button type="button" class="photo-lb-close" aria-label="Close">✕</button>' +
      '<img class="photo-lb-img" alt="" />' +
      '<div class="photo-lb-title"></div>' +
      '<button type="button" class="photo-lb-prev" aria-label="Previous">‹</button>' +
      '<button type="button" class="photo-lb-next" aria-label="Next">›</button>' +
      '</div></div></div>'
    );
  }

  function wirePhotos(el) {
    if (!el || el.dataset.wired) return;
    el.dataset.wired = '1';
    var tiles = Array.prototype.slice.call(el.querySelectorAll('.photo-tile-img'));
    var lb = el.querySelector('#photo-lightbox');
    var img = el.querySelector('.photo-lb-img');
    var title = el.querySelector('.photo-lb-title');
    var idx = 0;

    function openAt(i) {
      if (!tiles.length) return;
      idx = (i + tiles.length) % tiles.length;
      var t = tiles[idx];
      if (img) {
        img.src = t.getAttribute('data-src');
        img.alt = t.getAttribute('data-title') || '';
      }
      if (title) title.textContent = t.getAttribute('data-title') || '';
      if (lb) {
        lb.hidden = false;
        lb.classList.add('is-open');
      }
      sound('pop');
    }

    tiles.forEach(function (t, i) {
      t.addEventListener('click', function () {
        openAt(i);
      });
    });
    var close = el.querySelector('.photo-lb-close');
    if (close) {
      close.addEventListener('click', function () {
        if (lb) {
          lb.hidden = true;
          lb.classList.remove('is-open');
        }
      });
    }
    var prev = el.querySelector('.photo-lb-prev');
    var next = el.querySelector('.photo-lb-next');
    if (prev) prev.addEventListener('click', function () { openAt(idx - 1); });
    if (next) next.addEventListener('click', function () { openAt(idx + 1); });
    if (lb) {
      lb.addEventListener('click', function (e) {
        if (e.target === lb) {
          lb.hidden = true;
          lb.classList.remove('is-open');
        }
      });
    }
  }

  /* ── iPhone Mirroring full demo ─────────────────────── */
  function iphoneHTML() {
    return (
      '<div class="device-stage iphone-stage">' +
      '<div class="iphone-bezel">' +
      '<div class="iphone-dynamic-island"></div>' +
      '<div class="iphone-screen" id="iphone-screen">' +
      '<div class="iphone-status">' +
      '<span class="iphone-clock">9:41</span>' +
      '<span class="iphone-status-right">●●●● 5G ⌁</span>' +
      '</div>' +
      '<div class="iphone-home" id="iphone-home">' +
      '<div class="iphone-page">' +
      [
        { icon: '📞', name: 'Phone', app: 'phone' },
        { icon: '💬', name: 'Messages', app: 'messages' },
        { icon: '📷', name: 'Camera', app: 'camera' },
        { icon: '🎵', name: 'Music', app: 'music' },
        { icon: '🗺', name: 'Maps', app: 'maps' },
        { icon: '🧭', name: 'Safari', app: 'safari' },
        { icon: '✉', name: 'Mail', app: 'mail' },
        { icon: '⚙️', name: 'Settings', app: 'settings' },
        { icon: '📸', name: 'Photos', app: 'photos' },
        { icon: '🕐', name: 'Clock', app: 'clock' },
        { icon: '🌤', name: 'Weather', app: 'weather' },
        { icon: '📝', name: 'Notes', app: 'notes' },
      ]
        .map(function (a) {
          return (
            '<button type="button" class="iphone-icon" data-iapp="' +
            a.app +
            '"><span class="iphone-icon-glyph">' +
            a.icon +
            '</span><span class="iphone-icon-label">' +
            a.name +
            '</span></button>'
          );
        })
        .join('') +
      '</div></div>' +
      '<div class="iphone-app-view" id="iphone-app-view" hidden></div>' +
      '<div class="iphone-dock-bar">' +
      '<span>📞</span><span>🧭</span><span>💬</span><span>🎵</span>' +
      '</div>' +
      '<div class="iphone-home-indicator"></div>' +
      '</div></div>' +
      '<div class="device-caption">' +
      '<strong>iPhone Mirroring</strong>' +
      '<span class="muted">Continuity · Click apps · Home bar returns home</span>' +
      '<div class="device-actions">' +
      '<button type="button" class="btn-glass" id="iphone-lock">Lock</button>' +
      '<button type="button" class="btn-glass" id="iphone-notify">Notify</button>' +
      '<button type="button" class="btn-primary" id="iphone-home-btn">Home</button>' +
      '</div></div></div>'
    );
  }

  function wireIphone(el) {
    if (!el || el.dataset.wired) return;
    el.dataset.wired = '1';
    var home = el.querySelector('#iphone-home');
    var view = el.querySelector('#iphone-app-view');
    var dock = el.querySelector('.iphone-dock-bar');

    function goHome() {
      if (home) home.hidden = false;
      if (view) {
        view.hidden = true;
        view.innerHTML = '';
      }
      if (dock) dock.style.display = '';
      sound('pop');
    }

    function openIApp(id) {
      if (!view) return;
      if (home) home.hidden = true;
      if (dock) dock.style.display = 'none';
      view.hidden = false;
      var screens = {
        phone:
          '<div class="iapp-phone"><div class="iapp-title">Phone</div><div class="iapp-keypad">' +
          '123456789*0#'.split('').map(function (k) {
            return '<button type="button" class="iapp-key">' + k + '</button>';
          }).join('') +
          '</div><button type="button" class="iapp-call">Call</button></div>',
        messages:
          '<div class="iapp-msg"><div class="iapp-title">Messages</div><div class="iapp-thread">' +
          '<div class="bubble them">Hey from iPhone!</div><div class="bubble me">Mirroring works ✨</div></div>' +
          '<div class="iapp-compose"><input placeholder="iMessage" id="iphone-msg-in" /><button type="button" id="iphone-msg-send">↑</button></div></div>',
        camera:
          '<div class="iapp-camera"><div class="iapp-viewfinder"></div><button type="button" class="iapp-shutter" id="iphone-shutter"></button><p class="muted">Tap to capture</p></div>',
        photos:
          '<div class="iapp-photos"><div class="iapp-title">Photos</div><div class="iapp-photo-grid">' +
          [1, 2, 3, 4, 5, 6]
            .map(function (i) {
              return '<img src="assets/photos/funny/funny-0' + i + '.jpg" alt="" />';
            })
            .join('') +
          '</div></div>',
        settings:
          '<div class="iapp-settings"><div class="iapp-title">Settings</div><div class="iapp-row">Wi‑Fi · Home Network</div><div class="iapp-row">Bluetooth · On</div><div class="iapp-row">Display · Light</div><div class="iapp-row">Sounds · Default</div></div>',
        safari:
          '<div class="iapp-safari"><div class="iapp-title">Safari</div><input class="iapp-url" value="apple.com" /><div class="iapp-web muted">Mobile Safari simulation</div></div>',
        music:
          '<div class="iapp-music"><div class="iapp-title">Music</div><div class="iapp-now">Liquid Glass · Ensemble</div><button type="button" class="btn-primary" id="iphone-play">Play</button></div>',
        maps: '<div class="iapp-maps"><div class="iapp-title">Maps</div><div class="iapp-map-canvas"></div></div>',
        mail: '<div class="iapp-mail"><div class="iapp-title">Mail</div><div class="iapp-row">Inbox · 3 Unread</div></div>',
        clock: '<div class="iapp-clock"><div class="iapp-bigtime">9:41</div><div class="muted">World Clock</div></div>',
        weather: '<div class="iapp-weather"><div class="iapp-title">City</div><div class="iapp-bigtime">72°</div><div class="muted">Sunny</div></div>',
        notes: '<div class="iapp-notes"><div class="iapp-title">Notes</div><textarea class="iapp-note">Quick note from iPhone…</textarea></div>',
      };
      view.innerHTML = screens[id] || '<div class="iapp-title">' + id + '</div><p class="muted">App placeholder</p>';
      sound('pop');

      var send = view.querySelector('#iphone-msg-send');
      var min = view.querySelector('#iphone-msg-in');
      if (send && min) {
        send.addEventListener('click', function () {
          if (!min.value.trim()) return;
          var th = view.querySelector('.iapp-thread');
          if (th) {
            var b = document.createElement('div');
            b.className = 'bubble me';
            b.textContent = min.value.trim();
            th.appendChild(b);
            min.value = '';
            sound('messageSent');
          }
        });
      }
      var shutter = view.querySelector('#iphone-shutter');
      if (shutter) {
        shutter.addEventListener('click', function () {
          sound('tink');
          shutter.classList.add('flash');
          setTimeout(function () {
            shutter.classList.remove('flash');
          }, 200);
        });
      }
      var play = view.querySelector('#iphone-play');
      if (play) {
        play.addEventListener('click', function () {
          sound('funk');
        });
      }
    }

    el.querySelectorAll('.iphone-icon').forEach(function (btn) {
      btn.addEventListener('click', function () {
        openIApp(btn.getAttribute('data-iapp'));
      });
    });
    var homeBtn = el.querySelector('#iphone-home-btn');
    var indicator = el.querySelector('.iphone-home-indicator');
    if (homeBtn) homeBtn.addEventListener('click', goHome);
    if (indicator) indicator.addEventListener('click', goHome);
    var lock = el.querySelector('#iphone-lock');
    if (lock) {
      lock.addEventListener('click', function () {
        if (view) {
          view.hidden = false;
          view.innerHTML =
            '<div class="iphone-lockscreen"><div class="iapp-bigtime">9:41</div><div class="muted">Swipe or Home to unlock</div></div>';
        }
        if (home) home.hidden = true;
        sound('purr');
      });
    }
    var notify = el.querySelector('#iphone-notify');
    if (notify) {
      notify.addEventListener('click', function () {
        sound('messageReceived');
        if (global.MacShell && MacShell.notify) {
          MacShell.notify('iPhone', 'Messages', 'New message on iPhone', 'now');
        }
      });
    }
  }

  /* ── Sidecar iPad ───────────────────────────────────── */
  function sidecarHTML() {
    return (
      '<div class="device-stage sidecar-stage">' +
      '<div class="ipad-bezel">' +
      '<div class="ipad-screen">' +
      '<div class="ipad-menubar"><span>Sidecar</span><span>9:41</span></div>' +
      '<div class="ipad-canvas" id="ipad-canvas">' +
      '<p class="ipad-hint">Use as second display · Draw with pointer</p>' +
      '</div>' +
      '<div class="ipad-sidebar">' +
      '<button type="button" data-tool="pen" class="is-active">✏️</button>' +
      '<button type="button" data-tool="marker">🖊️</button>' +
      '<button type="button" data-tool="eraser">🧽</button>' +
      '<button type="button" data-tool="clear">🗑</button>' +
      '</div></div></div>' +
      '<div class="device-caption">' +
      '<strong>Sidecar</strong><span class="muted">iPad as second display · Sketch below</span>' +
      '<canvas id="sidecar-draw" width="720" height="420"></canvas>' +
      '</div></div>'
    );
  }

  function wireSidecar(el) {
    if (!el || el.dataset.wired) return;
    el.dataset.wired = '1';
    var canvas = el.querySelector('#sidecar-draw');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    ctx.fillStyle = '#f5f5f7';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#1d1d1f';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    var drawing = false;
    var tool = 'pen';

    function pos(e) {
      var r = canvas.getBoundingClientRect();
      var sx = canvas.width / r.width;
      var sy = canvas.height / r.height;
      return { x: (e.clientX - r.left) * sx, y: (e.clientY - r.top) * sy };
    }

    canvas.addEventListener('pointerdown', function (e) {
      drawing = true;
      canvas.setPointerCapture(e.pointerId);
      var p = pos(e);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      sound('pop');
    });
    canvas.addEventListener('pointermove', function (e) {
      if (!drawing) return;
      var p = pos(e);
      if (tool === 'eraser') {
        ctx.clearRect(p.x - 12, p.y - 12, 24, 24);
        ctx.fillStyle = '#f5f5f7';
        ctx.fillRect(p.x - 12, p.y - 12, 24, 24);
      } else {
        ctx.strokeStyle = tool === 'marker' ? 'rgba(10,132,255,0.45)' : '#1d1d1f';
        ctx.lineWidth = tool === 'marker' ? 8 : 2.5;
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
      }
    });
    canvas.addEventListener('pointerup', function () {
      drawing = false;
    });

    el.querySelectorAll('[data-tool]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        el.querySelectorAll('[data-tool]').forEach(function (b) {
          b.classList.remove('is-active');
        });
        btn.classList.add('is-active');
        tool = btn.getAttribute('data-tool');
        if (tool === 'clear') {
          ctx.fillStyle = '#f5f5f7';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          tool = 'pen';
          sound('emptyTrash');
        } else sound('tink');
      });
    });
  }

  /* ── Sound panel buttons in Settings ────────────────── */
  function wireSoundButtons(el) {
    el.querySelectorAll('[data-sound]').forEach(function (btn) {
      if (btn.dataset.wired) return;
      btn.dataset.wired = '1';
      btn.addEventListener('click', function () {
        sound(btn.getAttribute('data-sound'));
      });
    });
  }

  /* ── Patch AppRegistry apps ─────────────────────────── */
  function patchApps() {
    if (!global.AppRegistry || !global.AppRegistry.get) return;
    var APPS = global.AppRegistry._apps || null;
    /* registry may not expose _apps — use get */
    var messages = AppRegistry.get('messages');
    if (messages) {
      var prevMsg = messages.onMount;
      messages.onMount = function (el) {
        if (prevMsg) prevMsg.call(messages, el);
        wireMessages(el);
      };
    }

    var safari = AppRegistry.get('safari');
    if (safari) {
      var prevSaf = safari.onMount;
      safari.onMount = function (el) {
        /* replace previous sim-only mount */
        wireSafari(el);
        if (prevSaf) {
          /* avoid double wire on start page remounts */
        }
      };
    }

    var photos = AppRegistry.get('photos');
    if (photos) {
      photos.open = photosHTML;
      photos.width = 980;
      photos.height = 640;
      photos.onMount = function (el) {
        wirePhotos(el);
      };
    }

    var iphone = AppRegistry.get('iphone-mirroring');
    if (iphone) {
      iphone.open = iphoneHTML;
      iphone.width = 420;
      iphone.height = 780;
      iphone.onMount = function (el) {
        wireIphone(el);
      };
    }

    /* Sidecar as dedicated app if missing */
    if (!AppRegistry.get('sidecar') && typeof AppRegistry.register === 'function') {
      AppRegistry.register({
        id: 'sidecar',
        name: 'Sidecar',
        category: 'System',
        width: 900,
        height: 620,
        open: sidecarHTML,
        onMount: wireSidecar,
      });
    } else if (AppRegistry.get('sidecar')) {
      var sc = AppRegistry.get('sidecar');
      sc.open = sidecarHTML;
      sc.onMount = wireSidecar;
    } else {
      /* bulk apps may have registered a stub — override via APPS global if present */
      try {
        if (global.AppRegistry && AppRegistry.get('iphone-mirroring')) {
          /* also allow opening sidecar via openApp by aliasing */
        }
      } catch (e) {}
    }

    /* Enhance System Settings sound pane when rendered */
    var settings = AppRegistry.get('system-settings');
    if (settings && settings.onMount) {
      var prevSet = settings.onMount;
      settings.onMount = function (el) {
        prevSet.call(settings, el);
        /* observe pane changes */
        var obs = new MutationObserver(function () {
          wireSoundButtons(el);
          enhanceSoundPane(el);
        });
        obs.observe(el, { childList: true, subtree: true });
        enhanceSoundPane(el);
      };
    }

    /* Finder: open folders on double-click */
    var finder = AppRegistry.get('finder');
    if (finder && finder.onMount) {
      var prevF = finder.onMount;
      finder.onMount = function (el) {
        prevF.call(finder, el);
        el.addEventListener('dblclick', function (e) {
          var item = e.target.closest('.finder-icon-item, .finder-list-row, .finder-col-item');
          if (!item) return;
          var label =
            item.querySelector('.finder-label, .fl-title, .fc-title') ||
            item.querySelector('.finder-gal-label');
          var name = label ? label.textContent.trim() : '';
          var map = {
            Applications: 'apps',
            Desktop: 'desktop',
            Documents: 'docs',
            Downloads: 'down',
            'iCloud Drive': 'icloud',
            User: 'home',
            'Macintosh HD': 'drive',
            AirDrop: 'airdrop',
            Network: 'network',
            Trash: 'trash',
            Photos: 'photos',
          };
          /* sidebar nav ids by folder title in content */
          var navMap = {
            Applications: 'apps',
            Desktop: 'desktop',
            Documents: 'docs',
            Downloads: 'down',
            Pictures: 'docs',
            Movies: 'docs',
            Music: 'docs',
            Library: 'home',
            Users: 'drive',
            System: 'drive',
          };
          var target = navMap[name];
          if (target) {
            var sb = el.querySelector('.finder-sb-item[data-nav="' + target + '"]');
            if (sb) {
              sb.click();
              sound('pop');
            }
          } else if (name && /\.app$/i.test(name) === false) {
            /* open app if kind app */
            var appIds = {
              Safari: 'safari',
              Mail: 'mail',
              Messages: 'messages',
              Photos: 'photos',
              Music: 'music',
              Calendar: 'calendar',
              Notes: 'notes',
              Terminal: 'terminal',
              'System Settings': 'system-settings',
              Finder: 'finder',
            };
            var aid = appIds[name.replace(/\.app$/i, '')];
            if (aid && global.MacShell && MacShell.openApp) {
              sound('pop');
              MacShell.openApp(aid);
            } else {
              sound('tink');
            }
          }
        });
      };
    }
  }

  function enhanceSoundPane(el) {
    var pane = el.querySelector('.settings-pane, .ss-pane, .app-main');
    if (!pane) return;
    if (pane.querySelector('.sound-demo-grid')) return;
    var h2 = pane.querySelector('h2');
    if (!h2 || (h2.textContent || '').indexOf('Sound') === -1) return;
    var grid = document.createElement('div');
    grid.className = 'sound-demo-grid';
    grid.innerHTML =
      '<p class="muted">Alert sounds (synthesized macOS-style)</p>' +
      ['blow', 'glass', 'hero', 'sosumi', 'pop', 'tink', 'purr', 'submarine', 'funk', 'emptyTrash', 'messageSent', 'boot']
        .map(function (n) {
          return (
            '<button type="button" class="btn-glass" data-sound="' +
            n +
            '">' +
            n +
            '</button>'
          );
        })
        .join('');
    pane.appendChild(grid);
    wireSoundButtons(grid);
  }

  /* Hook AppRegistry.open to wire after mount */
  function hookOpen() {
    if (!global.AppRegistry || !AppRegistry.open || AppRegistry.open._macosRuntime) return;
    var orig = AppRegistry.open.bind(AppRegistry);
    function wrapped(id) {
      var r = orig(id);
      sound('pop');
      setTimeout(function () {
        var win =
          global.WindowManager &&
          WindowManager.getWindowByAppId &&
          WindowManager.getWindowByAppId(id);
        var body = win && win.el && win.el.querySelector('.window-content, .window-body');
        if (!body) return;
        if (id === 'messages') wireMessages(body);
        if (id === 'safari') wireSafari(body);
        if (id === 'photos') wirePhotos(body);
        if (id === 'iphone-mirroring') wireIphone(body);
        if (id === 'sidecar') wireSidecar(body);
        if (id === 'system-settings') {
          wireSoundButtons(body);
          enhanceSoundPane(body);
        }
      }, 30);
      return r;
    }
    wrapped._macosRuntime = true;
    AppRegistry.open = wrapped;
  }

  /* Expose openApp on MacShell if missing */
  function patchShell() {
    if (!global.MacShell) return;
    if (!MacShell.openApp && typeof global.openApp === 'undefined') {
      /* shell internal openApp is private — dock already works */
    }
    var origNotify = MacShell.notify;
    if (origNotify && !MacShell.notify._sound) {
      MacShell.notify = function () {
        sound('messageReceived');
        return origNotify.apply(MacShell, arguments);
      };
      MacShell.notify._sound = true;
    }
  }

  function init() {
    patchApps();
    hookOpen();
    patchShell();
    /* Register sidecar via bulk if needed */
    if (global.AppRegistry && AppRegistry.get && !AppRegistry.get('sidecar')) {
      try {
        /* direct inject into registry list if register exists */
        if (typeof AppRegistry.register === 'function') {
          AppRegistry.register({
            id: 'sidecar',
            name: 'Sidecar',
            category: 'System',
            width: 900,
            height: 640,
            open: sidecarHTML,
            onMount: wireSidecar,
          });
        }
      } catch (e) {}
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  global.MacOSRuntime = { init: init, sound: sound, wireMessages: wireMessages };
})(typeof window !== 'undefined' ? window : globalThis);
