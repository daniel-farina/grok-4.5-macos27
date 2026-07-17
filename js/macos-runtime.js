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

  /* ── Mail: select, folders, compose, send ───────────── */
  function wireMail(el) {
    if (!el || el.dataset.wired) return;
    el.dataset.wired = '1';
    var list = el.querySelector('.mail27-list');
    var read = el.querySelector('.mail27-read');

    function selectRow(row) {
      el.querySelectorAll('.mail27-row').forEach(function (r) {
        r.classList.remove('selected');
      });
      row.classList.add('selected');
      row.classList.remove('unread');
      var from = row.querySelector('.mail27-from');
      var subject = row.querySelector('.mail27-subject');
      var preview = row.querySelector('.mail27-preview');
      var date = row.querySelector('.mail27-date');
      if (!read) return;
      var subEl = read.querySelector('.mail27-read-subject');
      var nameEl = read.querySelector('.mail27-read-name');
      var emailEl = read.querySelector('.mail27-read-email');
      var av = read.querySelector('.mail27-read-avatar');
      var dateEl = read.querySelector('.mail27-read-date');
      var body = read.querySelector('.mail27-content');
      if (subEl && subject) subEl.textContent = subject.textContent;
      if (nameEl && from) nameEl.textContent = from.textContent;
      if (av && from) av.textContent = from.textContent.charAt(0);
      if (emailEl && from)
        emailEl.textContent =
          '<' + from.textContent.toLowerCase().replace(/\s+/g, '.') + '@example.com>';
      if (dateEl && date) dateEl.textContent = date.textContent;
      if (body && preview) {
        body.innerHTML =
          '<p>Hello,</p><p></p><p></p><p class="mail27-signoff">— ' +
          (from ? from.textContent : 'Sender') +
          '</p>';
        body.querySelectorAll('p')[1].textContent = preview.textContent;
      }
      sound('pop');
      var meta = el.querySelector('.mail27-list-meta');
      if (meta) {
        var n = el.querySelectorAll('.mail27-row.unread').length;
        meta.textContent = n + ' Unread';
      }
    }

    el.querySelectorAll('.mail27-row').forEach(function (row) {
      row.addEventListener('click', function () {
        selectRow(row);
      });
    });

    el.querySelectorAll('.mail27-side-item').forEach(function (item) {
      item.addEventListener('click', function () {
        el.querySelectorAll('.mail27-side-item').forEach(function (i) {
          i.classList.remove('active');
        });
        item.classList.add('active');
        var name = item.getAttribute('data-folder') || 'Inbox';
        var title = el.querySelector('.mail27-list-title');
        if (title) title.textContent = name;
        sound('tink');
      });
    });

    var newBtn = el.querySelector('.mail27-tb.primary, .mail27-tb[title="New Message"]');
    function openCompose(replyTo) {
      var existing = el.querySelector('.mail-compose-modal');
      if (existing) existing.remove();
      var modal = document.createElement('div');
      modal.className = 'mail-compose-modal';
      modal.innerHTML =
        '<div class="mail-compose-sheet">' +
        '<div class="mail-compose-bar">' +
        '<strong>New Message</strong>' +
        '<button type="button" class="mail-compose-close" aria-label="Close">✕</button></div>' +
        '<div class="mail-compose-fields">' +
        '<label>To <input class="mail-c-to" value="' +
        (replyTo || 'friend@example.com') +
        '" /></label>' +
        '<label>Subject <input class="mail-c-sub" value="' +
        (replyTo ? 'Re: Hello' : '') +
        '" placeholder="Subject" /></label>' +
        '<textarea class="mail-c-body" placeholder="Write your message…">Hi,\n\n</textarea>' +
        '</div>' +
        '<div class="mail-compose-actions">' +
        '<button type="button" class="btn-primary mail-c-send">Send</button>' +
        '<button type="button" class="btn-glass mail-c-cancel">Cancel</button>' +
        '</div></div>';
      el.appendChild(modal);
      modal.querySelector('.mail-compose-close').addEventListener('click', function () {
        modal.remove();
      });
      modal.querySelector('.mail-c-cancel').addEventListener('click', function () {
        modal.remove();
      });
      modal.querySelector('.mail-c-send').addEventListener('click', function () {
        var sub = modal.querySelector('.mail-c-sub').value || '(no subject)';
        var to = modal.querySelector('.mail-c-to').value || 'friend@example.com';
        if (list) {
          var row = document.createElement('div');
          row.className = 'mail27-row';
          row.innerHTML =
            '<span class="mail27-dot" aria-hidden="true"></span>' +
            '<div class="mail27-row-main"><div class="mail27-row-top">' +
            '<span class="mail27-from">Me → ' +
            to.split('@')[0] +
            '</span><span class="mail27-date">Just now</span></div>' +
            '<div class="mail27-subject">' +
            sub.replace(/</g, '') +
            '</div>' +
            '<div class="mail27-preview">Sent from Mail</div></div>';
          var head = list.querySelector('.mail27-list-head');
          if (head && head.nextSibling) list.insertBefore(row, head.nextSibling);
          else list.appendChild(row);
          row.addEventListener('click', function () {
            selectRow(row);
          });
        }
        /* bump Sent count */
        var sent = el.querySelector('.mail27-side-item[data-folder="Sent"] .mail27-side-count');
        if (sent) sent.textContent = String((parseInt(sent.textContent, 10) || 0) + 1);
        else {
          var sentItem = el.querySelector('.mail27-side-item[data-folder="Sent"]');
          if (sentItem && !sentItem.querySelector('.mail27-side-count')) {
            var c = document.createElement('span');
            c.className = 'mail27-side-count';
            c.textContent = '1';
            sentItem.appendChild(c);
          }
        }
        modal.remove();
        sound('messageSent');
        if (global.MacShell && MacShell.notify) {
          MacShell.notify('Mail', 'Message Sent', sub, 'now');
        }
      });
      sound('pop');
    }
    if (newBtn) newBtn.addEventListener('click', function () {
      openCompose('');
    });
    var reply = el.querySelector('.mail27-tb[title="Reply"]');
    if (reply) {
      reply.addEventListener('click', function () {
        var from = el.querySelector('.mail27-row.selected .mail27-from');
        openCompose(from ? from.textContent.toLowerCase().replace(/\s+/g, '.') + '@example.com' : '');
      });
    }
    var trash = el.querySelector('.mail27-tb[title="Trash"]');
    if (trash) {
      trash.addEventListener('click', function () {
        var row = el.querySelector('.mail27-row.selected');
        if (row) {
          row.remove();
          sound('emptyTrash');
        }
      });
    }
    var getMail = el.querySelector('.mail27-tb[title="Get Mail"]');
    if (getMail) {
      getMail.addEventListener('click', function () {
        sound('tink');
        if (global.MacShell && MacShell.notify) {
          MacShell.notify('Mail', 'No new mail', 'Your inbox is up to date', 'now');
        }
      });
    }
  }

  /* ── Notes: new note, select, folders, format ───────── */
  function wireNotes(el) {
    if (!el || el.dataset.wired) return;
    el.dataset.wired = '1';
    var list = el.querySelector('.notes27-list');
    var title = el.querySelector('.notes27-title');
    var body = el.querySelector('.notes27-body-text');
    var dateEl = el.querySelector('.notes27-date');

    el.querySelectorAll('.notes27-item').forEach(function (item) {
      item.addEventListener('click', function () {
        el.querySelectorAll('.notes27-item').forEach(function (i) {
          i.classList.remove('selected');
        });
        item.classList.add('selected');
        var t = item.querySelector('.notes27-item-title');
        var p = item.querySelector('.notes27-item-meta');
        if (title && t) title.textContent = t.textContent;
        if (body && p) {
          var text = p.textContent.replace(/^\S+\s*/, '');
          body.innerHTML = '<p></p>';
          body.querySelector('p').textContent = text || 'Start typing…';
        }
        if (dateEl) dateEl.textContent = 'Today at ' + nowTime();
        sound('pop');
      });
    });

    el.querySelectorAll('.notes27-folder').forEach(function (f) {
      f.addEventListener('click', function () {
        el.querySelectorAll('.notes27-folder').forEach(function (x) {
          x.classList.remove('active');
        });
        f.classList.add('active');
        sound('tink');
      });
    });

    var newBtn = el.querySelector('.notes27-tb-btn[title="New Note"]');
    if (newBtn && list) {
      newBtn.addEventListener('click', function () {
        var item = document.createElement('div');
        item.className = 'notes27-item selected';
        item.innerHTML =
          '<div class="notes27-item-title">New Note</div>' +
          '<div class="notes27-item-meta"><span>Just now</span> Start typing…</div>';
        el.querySelectorAll('.notes27-item').forEach(function (i) {
          i.classList.remove('selected');
        });
        list.insertBefore(item, list.firstChild);
        if (title) title.textContent = 'New Note';
        if (body) body.innerHTML = '<p><br></p>';
        if (dateEl) dateEl.textContent = 'Today at ' + nowTime();
        item.addEventListener('click', function () {
          el.querySelectorAll('.notes27-item').forEach(function (i) {
            i.classList.remove('selected');
          });
          item.classList.add('selected');
        });
        if (title) title.focus();
        sound('pop');
      });
    }

    var del = el.querySelector('.notes27-tb-btn[title="Delete"]');
    if (del) {
      del.addEventListener('click', function () {
        var sel = el.querySelector('.notes27-item.selected');
        if (sel) {
          sel.remove();
          sound('emptyTrash');
        }
      });
    }

    el.querySelectorAll('.notes27-fmt').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var cmd = { B: 'bold', I: 'italic', U: 'underline' }[btn.textContent.trim()];
        if (cmd) document.execCommand(cmd, false, null);
        sound('tink');
      });
    });

    if (title) {
      title.addEventListener('input', function () {
        var sel = el.querySelector('.notes27-item.selected .notes27-item-title');
        if (sel) sel.textContent = title.textContent || 'New Note';
      });
    }
  }

  /* ── Calendar: view switch, today, add event ────────── */
  function wireCalendar(el) {
    if (!el || el.dataset.wired) return;
    el.dataset.wired = '1';
    el.querySelectorAll('.cal27-seg-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        el.querySelectorAll('.cal27-seg-btn').forEach(function (b) {
          b.classList.remove('is-active');
        });
        btn.classList.add('is-active');
        sound('pop');
        if (global.MacShell && MacShell.notify) {
          MacShell.notify('Calendar', btn.textContent + ' view', 'Showing ' + btn.textContent + ' layout', 'now');
        }
      });
    });
    var today = el.querySelector('.cal27-today');
    if (today) {
      today.addEventListener('click', function () {
        el.querySelectorAll('.cal27-cell').forEach(function (c) {
          c.classList.remove('today');
        });
        var cell = el.querySelector('.cal27-cell:not(.muted)');
        /* highlight day 17 in sample month or first available */
        el.querySelectorAll('.cal27-cell:not(.muted) .cal27-num').forEach(function (n) {
          if (n.textContent.trim() === '17') {
            n.closest('.cal27-cell').classList.add('today');
          }
        });
        sound('tink');
      });
    }
    var add = el.querySelector('.cal27-icon-btn.plus');
    if (add) {
      add.addEventListener('click', function () {
        var name = prompt('Event title', 'New Event');
        if (!name) return;
        var cell = el.querySelector('.cal27-cell.today .cal27-evs') || el.querySelector('.cal27-cell:not(.muted) .cal27-evs');
        if (cell) {
          var ev = document.createElement('div');
          ev.className = 'cal27-ev timed blue';
          ev.innerHTML =
            '<span class="cal27-ev-bar"></span><span class="cal27-ev-t"></span><span class="cal27-ev-time">Now</span>';
          ev.querySelector('.cal27-ev-t').textContent = name;
          cell.insertBefore(ev, cell.firstChild);
          sound('hero');
        }
      });
    }
    el.querySelectorAll('.cal27-nav').forEach(function (btn) {
      btn.addEventListener('click', function () {
        sound('pop');
      });
    });
  }

  /* ── Maps: search, modes, zoom ──────────────────────── */
  function wireMaps(el) {
    if (!el || el.dataset.wired) return;
    el.dataset.wired = '1';
    var search = el.querySelector('.maps27-search');
    var cardTitle = el.querySelector('.maps27-card-info strong');
    var pin = el.querySelector('.maps27-pin');
    function go(q) {
      if (!q) return;
      if (cardTitle) cardTitle.textContent = q;
      if (pin) {
        pin.style.left = 30 + Math.random() * 40 + '%';
        pin.style.top = 30 + Math.random() * 40 + '%';
      }
      sound('pop');
    }
    if (search) {
      search.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') go(search.value.trim());
      });
    }
    var clear = el.querySelector('.maps27-search-clear');
    if (clear && search) {
      clear.addEventListener('click', function () {
        search.value = '';
        search.focus();
      });
    }
    el.querySelectorAll('.maps27-mode').forEach(function (m) {
      m.addEventListener('click', function () {
        el.querySelectorAll('.maps27-mode').forEach(function (x) {
          x.classList.remove('active');
        });
        m.classList.add('active');
        sound('tink');
      });
    });
    var canvas = el.querySelector('.maps27-canvas');
    var scale = 1;
    el.querySelectorAll('.maps27-ctrl').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var t = btn.getAttribute('title') || '';
        if (t.indexOf('In') >= 0) scale = Math.min(2, scale + 0.15);
        else if (t.indexOf('Out') >= 0) scale = Math.max(0.6, scale - 0.15);
        if (canvas) canvas.style.transform = 'scale(' + scale + ')';
        sound('volume');
      });
    });
    el.querySelectorAll('.maps27-btn.primary, .maps27-chip.primary').forEach(function (btn) {
      btn.addEventListener('click', function () {
        sound('hero');
        if (global.MacShell && MacShell.notify) {
          MacShell.notify('Maps', 'Route', 'Directions started (demo)', 'now');
        }
      });
    });
  }

  /* ── Music: play / pause / progress ─────────────────── */
  function wireMusic(el) {
    if (!el || el.dataset.wired) return;
    el.dataset.wired = '1';
    var playing = false;
    var playBtn =
      el.querySelector('.np-play, .mini-player button[aria-label="Play"], .mp-play');
    el.querySelectorAll('.mini-player button, .np-controls button').forEach(function (b) {
      var label = (b.getAttribute('aria-label') || b.getAttribute('title') || b.textContent || '').toLowerCase();
      if (label.indexOf('play') >= 0 || b.textContent === '▶' || b.textContent === '❚❚') {
        playBtn = playBtn || b;
      }
    });
    var timer = null;
    var pos = 38;
    function toggle() {
      playing = !playing;
      if (playBtn) {
        playBtn.textContent = playing ? '❚❚' : '▶';
        playBtn.setAttribute('aria-label', playing ? 'Pause' : 'Play');
      }
      sound(playing ? 'funk' : 'pop');
      if (timer) clearInterval(timer);
      if (playing) {
        var bar = el.querySelector('.np-bar-fill, .mini-player .fill, .mp-fill, .progress-fill');
        timer = setInterval(function () {
          pos = (pos + 1) % 100;
          if (bar) bar.style.width = pos + '%';
          var tEl = el.querySelector('.np-time');
          if (tEl) {
            var s = Math.floor((pos / 100) * 222);
            tEl.textContent = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
          }
        }, 250);
      }
    }
    if (playBtn) playBtn.addEventListener('click', toggle);
    el.querySelectorAll('.np-btn[aria-label="Previous"], .np-btn[aria-label="Next"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        sound('tink');
        var tracks = ['Liquid Glass', 'Neon Rain', 'Soft Static', 'Harbor Lights', 'Golden Hour'];
        var meta = el.querySelector('.np-meta strong, .mini-player strong');
        if (meta) meta.textContent = tracks[Math.floor(Math.random() * tracks.length)];
        pos = 0;
      });
    });
    el.querySelectorAll('.album-card').forEach(function (card) {
      card.addEventListener('dblclick', function () {
        var t = card.querySelector('strong');
        var a = card.querySelector('.muted');
        var meta = el.querySelector('.np-meta strong, .mini-player strong');
        var sub = el.querySelector('.np-meta .muted, .mini-player .muted');
        if (meta && t) meta.textContent = t.textContent;
        if (sub && a) sub.textContent = a.textContent;
        playing = false;
        toggle();
      });
      card.style.cursor = 'default';
    });
  }

  /* ── Terminal extras ────────────────────────────────── */
  function wireTerminal(el) {
    if (!el || el.dataset.wiredExtra) return;
    el.dataset.wiredExtra = '1';
    var input = el.querySelector('#term-input');
    var lines = el.querySelector('#term-lines');
    if (!input || !lines) return;
    /* enhance existing handler by capturing enter after */
    input.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      setTimeout(function () {
        var last = lines.lastElementChild;
        if (last && /command not found|not found/i.test(last.textContent || '')) {
          sound('sosumi');
        } else if (last) {
          sound('tink');
        }
      }, 10);
    });
  }

  /* ── Reminders: add new ─────────────────────────────── */
  function wireReminders(el) {
    if (!el || el.dataset.wiredExtra) return;
    el.dataset.wiredExtra = '1';
    var list = el.querySelector('.reminders-list, .rem-list, #reminders-list');
    var main = el.querySelector('.reminders-main');
    if (!main) return;
    if (!el.querySelector('.rem-add-row')) {
      var row = document.createElement('div');
      row.className = 'rem-add-row';
      row.innerHTML =
        '<button type="button" class="btn-primary rem-add-btn">+ New Reminder</button>';
      main.appendChild(row);
      row.querySelector('.rem-add-btn').addEventListener('click', function () {
        var t = prompt('Reminder', 'New reminder');
        if (!t) return;
        var listEl = el.querySelector('.reminders-list, .rem-items, [class*="reminder-list"]') || main.querySelector('div:last-of-type');
        var label = document.createElement('label');
        label.className = 'reminder-item';
        label.innerHTML =
          '<input type="checkbox" /><span class="rem-circle"></span><span class="rem-text"></span>';
        label.querySelector('.rem-text').textContent = t;
        var host = el.querySelector('.reminders-items') || el.querySelector('.reminders-main > div:last-child');
        if (host) host.appendChild(label);
        else main.insertBefore(label, row);
        label.querySelector('input').addEventListener('change', function () {
          label.classList.toggle('is-done', label.querySelector('input').checked);
          sound('pop');
        });
        sound('hero');
      });
    }
    el.querySelectorAll('.reminder-item input[type="checkbox"]').forEach(function (cb) {
      if (cb.dataset.snd) return;
      cb.dataset.snd = '1';
      cb.addEventListener('change', function () {
        sound(cb.checked ? 'tink' : 'pop');
      });
    });
  }

  /* ── Preview: zoom + markup tools ───────────────────── */
  function wirePreview(el) {
    if (!el || el.dataset.wired) return;
    el.dataset.wired = '1';
    var page = el.querySelector('.preview27-page');
    var zoomLabel = el.querySelector('.preview27-zoom');
    var zoom = 1;
    function applyZoom() {
      if (page) page.style.transform = 'scale(' + zoom + ')';
      if (page) page.style.transformOrigin = 'top center';
      if (zoomLabel) zoomLabel.textContent = Math.round(zoom * 100) + '%';
    }
    el.querySelectorAll('.preview27-tb-btn').forEach(function (btn) {
      var t = btn.getAttribute('title') || '';
      if (t.indexOf('Zoom in') >= 0) {
        btn.addEventListener('click', function () {
          zoom = Math.min(2.5, zoom + 0.15);
          applyZoom();
          sound('volume');
        });
      }
      if (t.indexOf('Zoom out') >= 0) {
        btn.addEventListener('click', function () {
          zoom = Math.max(0.4, zoom - 0.15);
          applyZoom();
          sound('volume');
        });
      }
    });
    el.querySelectorAll('.preview27-tool').forEach(function (tool) {
      tool.addEventListener('click', function () {
        el.querySelectorAll('.preview27-tool').forEach(function (t) {
          t.classList.remove('is-active');
        });
        tool.classList.add('is-active');
        var id = tool.getAttribute('data-tool');
        if (id === 'sketch' || id === 'shapes' || id === 'text') {
          var canvas = el.querySelector('.preview27-canvas');
          if (canvas && !canvas.querySelector('.preview-draw-layer')) {
            var layer = document.createElement('canvas');
            layer.className = 'preview-draw-layer';
            layer.width = 600;
            layer.height = 780;
            canvas.appendChild(layer);
            var ctx = layer.getContext('2d');
            ctx.strokeStyle = '#ff3b30';
            ctx.lineWidth = 2;
            var drawing = false;
            layer.addEventListener('pointerdown', function (e) {
              drawing = true;
              var r = layer.getBoundingClientRect();
              ctx.beginPath();
              ctx.moveTo(
                ((e.clientX - r.left) / r.width) * layer.width,
                ((e.clientY - r.top) / r.height) * layer.height
              );
            });
            layer.addEventListener('pointermove', function (e) {
              if (!drawing) return;
              var r = layer.getBoundingClientRect();
              ctx.lineTo(
                ((e.clientX - r.left) / r.width) * layer.width,
                ((e.clientY - r.top) / r.height) * layer.height
              );
              ctx.stroke();
            });
            layer.addEventListener('pointerup', function () {
              drawing = false;
            });
          }
        }
        if (id === 'text' && page) {
          var note = document.createElement('div');
          note.contentEditable = 'true';
          note.className = 'preview-text-ann';
          note.textContent = 'Annotation';
          page.appendChild(note);
          note.focus();
        }
        sound('tink');
      });
    });
  }

  /* ── Photo Booth: camera + effects + capture ────────── */
  function wirePhotoBooth(el) {
    if (!el || el.dataset.wired) return;
    el.dataset.wired = '1';
    var video = el.querySelector('.pb-video');
    var canvas = el.querySelector('.pb-canvas');
    var fallback = el.querySelector('.pb-fallback');
    var strip = el.querySelector('#pb-strip');
    var flash = el.querySelector('.pb-flash');
    var fx = 'normal';

    if (video && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ video: { facingMode: 'user' }, audio: false })
        .then(function (stream) {
          video.srcObject = stream;
          video.style.display = 'block';
          if (fallback) fallback.style.display = 'none';
        })
        .catch(function () {
          if (fallback) fallback.style.display = 'grid';
        });
    }

    function applyFx() {
      var filter = 'none';
      if (fx === 'sepia') filter = 'sepia(1)';
      else if (fx === 'noir') filter = 'grayscale(1) contrast(1.2)';
      else if (fx === 'comic') filter = 'contrast(1.4) saturate(1.6)';
      else if (fx === 'glow') filter = 'brightness(1.15) saturate(1.3)';
      else if (fx === 'mirror') filter = 'none';
      if (video) {
        video.style.filter = filter;
        video.style.transform = fx === 'mirror' ? 'scaleX(-1)' : 'scaleX(1)';
      }
      if (fallback) {
        fallback.style.filter = filter;
        fallback.style.transform = fx === 'mirror' ? 'scaleX(-1)' : '';
      }
    }

    el.querySelectorAll('.pb-fx').forEach(function (btn) {
      btn.addEventListener('click', function () {
        el.querySelectorAll('.pb-fx').forEach(function (b) {
          b.classList.remove('active');
        });
        btn.classList.add('active');
        fx = btn.getAttribute('data-fx') || 'normal';
        applyFx();
        sound('pop');
      });
    });

    var shutter = el.querySelector('.pb-shutter');
    if (shutter) {
      shutter.addEventListener('click', function () {
        sound('tink');
        if (flash) {
          flash.hidden = false;
          setTimeout(function () {
            flash.hidden = true;
          }, 120);
        }
        var img = document.createElement('img');
        img.className = 'pb-thumb';
        if (video && video.srcObject && canvas) {
          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 480;
          var ctx = canvas.getContext('2d');
          if (fx === 'mirror') {
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
          }
          ctx.filter =
            fx === 'sepia'
              ? 'sepia(1)'
              : fx === 'noir'
                ? 'grayscale(1)'
                : fx === 'comic'
                  ? 'contrast(1.4) saturate(1.6)'
                  : fx === 'glow'
                    ? 'brightness(1.15)'
                    : 'none';
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          img.src = canvas.toDataURL('image/jpeg', 0.85);
        } else {
          img.src = 'assets/photos/funny/funny-0' + (1 + Math.floor(Math.random() * 6)) + '.jpg';
        }
        if (strip) {
          strip.insertBefore(img, strip.firstChild);
        }
      });
    }
  }

  /* ── FaceTime ───────────────────────────────────────── */
  function wireFaceTime(el) {
    if (!el || el.dataset.wired) return;
    el.dataset.wired = '1';
    var status = el.querySelector('.ft-remote-status');
    var nameEl = el.querySelector('.ft-remote-name');
    var selfVid = el.querySelector('.ft-self-video');
    var calling = false;

    if (selfVid && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ video: true, audio: false })
        .then(function (stream) {
          selfVid.srcObject = stream;
        })
        .catch(function () {});
    }

    function setCalling(on, name) {
      calling = on;
      if (status) status.textContent = on ? 'Connected · 00:12' : 'Ready to call';
      if (name && nameEl) nameEl.textContent = name;
      el.classList.toggle('is-in-call', on);
      sound(on ? 'submarine' : 'pop');
    }

    el.querySelectorAll('[data-ft]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var a = btn.getAttribute('data-ft');
        if (a === 'call') setCalling(true, nameEl ? nameEl.textContent : 'Friend');
        if (a === 'end') setCalling(false);
        if (a === 'mute') {
          btn.classList.toggle('is-active');
          sound('tink');
        }
        if (a === 'flip') sound('pop');
      });
    });
    el.querySelectorAll('.ft-contact').forEach(function (row) {
      row.addEventListener('click', function () {
        var n = row.querySelector('strong');
        setCalling(true, n ? n.textContent : 'Friend');
      });
    });
  }

  /* ── TextEdit ───────────────────────────────────────── */
  function wireTextEdit(el) {
    if (!el || el.dataset.wired) return;
    el.dataset.wired = '1';
    var page = el.querySelector('.te27-page');
    el.querySelectorAll('.te27-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var t = btn.getAttribute('title') || '';
        if (t === 'Bold') document.execCommand('bold');
        else if (t === 'Italic') document.execCommand('italic');
        else if (t === 'Underline') document.execCommand('underline');
        else if (t === 'Align Left') document.execCommand('justifyLeft');
        else if (t === 'Align Center') document.execCommand('justifyCenter');
        else if (t === 'Align Right') document.execCommand('justifyRight');
        else if (t === 'Show Ruler' || btn.hasAttribute('data-te-ruler')) {
          var ruler = el.querySelector('.te27-ruler');
          if (ruler) ruler.hidden = !ruler.hidden;
          btn.classList.toggle('is-active');
        }
        sound('tink');
      });
    });
    var font = el.querySelector('.te27-select[aria-label="Font"]');
    var size = el.querySelector('.te27-select.te27-size');
    if (font && page) {
      font.addEventListener('change', function () {
        page.style.fontFamily = font.value;
      });
    }
    if (size && page) {
      size.addEventListener('change', function () {
        page.style.fontSize = size.value + 'px';
      });
    }
  }

  /* ── Calculator history ─────────────────────────────── */
  function wireCalculator(el) {
    if (!el || el.dataset.hist) return;
    el.dataset.hist = '1';
    if (!el.querySelector('.calc-history')) {
      var hist = document.createElement('div');
      hist.className = 'calc-history';
      hist.setAttribute('aria-label', 'History');
      el.insertBefore(hist, el.firstChild);
    }
    var histEl = el.querySelector('.calc-history');
    var display = el.querySelector('#calc-display, .calc-display');
    el.querySelectorAll('.calc-key[data-key="="]').forEach(function (eq) {
      eq.addEventListener('click', function () {
        setTimeout(function () {
          if (!display || !histEl) return;
          var line = document.createElement('div');
          line.className = 'calc-hist-line';
          line.textContent = display.textContent;
          histEl.insertBefore(line, histEl.firstChild);
          while (histEl.children.length > 8) histEl.removeChild(histEl.lastChild);
          sound('tink');
        }, 0);
      });
    });
  }

  /* ── Contacts select + actions ──────────────────────── */
  function wireContacts(el) {
    if (!el || el.dataset.wired) return;
    el.dataset.wired = '1';
    var people = {};
    el.querySelectorAll('.ct27-row').forEach(function (row) {
      var name = row.querySelector('.ct27-row-name');
      if (name) people[name.textContent] = row;
      row.addEventListener('click', function () {
        el.querySelectorAll('.ct27-row').forEach(function (r) {
          r.classList.remove('active');
        });
        row.classList.add('active');
        var n = name ? name.textContent : 'Contact';
        var av = row.querySelector('.ct27-row-av');
        var dName = el.querySelector('.ct27-name');
        var dAv = el.querySelector('.ct27-avatar');
        if (dName) dName.textContent = n;
        if (dAv && av) {
          dAv.textContent = av.textContent;
          dAv.style.setProperty('--h', av.style.getPropertyValue('--h') || '200');
        }
        sound('pop');
      });
    });
    el.querySelectorAll('.ct27-act').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var label = (btn.textContent || '').toLowerCase();
        if (label.indexOf('message') >= 0 && global.MacShell) MacShell.openApp('messages');
        else if (label.indexOf('call') >= 0 && global.MacShell) MacShell.openApp('phone');
        else if (label.indexOf('video') >= 0 && global.MacShell) MacShell.openApp('facetime');
        else if (label.indexOf('mail') >= 0 && global.MacShell) MacShell.openApp('mail');
        sound('pop');
      });
    });
    var add = el.querySelector('.ct27-icon-btn[title="Add"]');
    if (add) {
      add.addEventListener('click', function () {
        var n = prompt('Name', 'New Contact');
        if (!n) return;
        var list = el.querySelector('.ct27-list');
        if (!list) return;
        var row = document.createElement('div');
        row.className = 'ct27-row';
        row.innerHTML =
          '<span class="ct27-row-av" style="--h:200">' +
          n
            .split(/\s+/)
            .map(function (p) {
              return p[0];
            })
            .join('')
            .slice(0, 2)
            .toUpperCase() +
          '</span><span class="ct27-row-name"></span>';
        row.querySelector('.ct27-row-name').textContent = n;
        list.appendChild(row);
        row.click();
        sound('hero');
      });
    }
    el.querySelectorAll('.ct27-group').forEach(function (g) {
      g.addEventListener('click', function () {
        el.querySelectorAll('.ct27-group').forEach(function (x) {
          x.classList.remove('active');
        });
        g.classList.add('active');
        sound('tink');
      });
    });
  }

  /* ── Stocks range chips sound ───────────────────────── */
  function wireStocks(el) {
    if (!el || el.dataset.wiredExtra) return;
    el.dataset.wiredExtra = '1';
    el.querySelectorAll('.stock-range span').forEach(function (s) {
      s.addEventListener('click', function () {
        el.querySelectorAll('.stock-range span').forEach(function (x) {
          x.classList.remove('active');
        });
        s.classList.add('active');
        sound('pop');
      });
    });
  }

  /* ── Phone dialer ───────────────────────────────────── */
  function wirePhone(el) {
    if (!el || el.dataset.wired) return;
    el.dataset.wired = '1';
    /* if stub, inject dialer */
    if (!el.querySelector('.phone-dialer')) {
      el.innerHTML =
        '<div class="phone-dialer">' +
        '<div class="phone-display" id="phone-display"></div>' +
        '<div class="phone-keys">' +
        '123456789*0#'.split('').map(function (k) {
          return '<button type="button" class="phone-key" data-k="' + k + '">' + k + '</button>';
        }).join('') +
        '</div>' +
        '<button type="button" class="btn-primary phone-call">Call</button>' +
        '<p class="muted center phone-status">Phone · Ready</p></div>';
    }
    var disp = el.querySelector('#phone-display, .phone-display');
    el.querySelectorAll('.phone-key, .iapp-key').forEach(function (k) {
      k.addEventListener('click', function () {
        if (disp) disp.textContent = (disp.textContent || '') + (k.getAttribute('data-k') || k.textContent);
        sound('volume');
      });
    });
    var call = el.querySelector('.phone-call, .iapp-call');
    if (call) {
      call.addEventListener('click', function () {
        var st = el.querySelector('.phone-status');
        if (st) st.textContent = 'Calling ' + (disp && disp.textContent ? disp.textContent : '…') + '…';
        sound('submarine');
        setTimeout(function () {
          if (st) st.textContent = 'Call ended';
          sound('pop');
        }, 2500);
      });
    }
  }

  /* ── Weather: city switch ───────────────────────────── */
  var WX_CITIES = [
    { city: 'City', temp: 72, cond: 'Partly Cloudy', hi: 78, lo: 58 },
    { city: 'Cupertino', temp: 68, cond: 'Foggy', hi: 72, lo: 54 },
    { city: 'Seattle', temp: 59, cond: 'Light Rain', hi: 62, lo: 50 },
    { city: 'Miami', temp: 86, cond: 'Mostly Sunny', hi: 90, lo: 76 },
    { city: 'Denver', temp: 64, cond: 'Clear', hi: 71, lo: 48 },
  ];
  function wireWeather(el) {
    if (!el || el.dataset.wired) return;
    el.dataset.wired = '1';
    var idx = 0;
    var cityEl = el.querySelector('.wx-city');
    if (cityEl) {
      cityEl.style.cursor = 'pointer';
      cityEl.title = 'Click to change city';
      cityEl.addEventListener('click', function () {
        idx = (idx + 1) % WX_CITIES.length;
        var c = WX_CITIES[idx];
        cityEl.textContent = c.city;
        var t = el.querySelector('.wx-temp');
        var cond = el.querySelector('.wx-cond');
        var hl = el.querySelector('.wx-hl');
        if (t) t.textContent = c.temp + '°';
        if (cond) cond.textContent = c.cond;
        if (hl) hl.textContent = 'H:' + c.hi + '°  L:' + c.lo + '°';
        sound('pop');
      });
    }
    el.querySelectorAll('.wx-d').forEach(function (row) {
      row.style.cursor = 'pointer';
      row.addEventListener('click', function () {
        el.querySelectorAll('.wx-d').forEach(function (r) {
          r.classList.remove('is-selected');
        });
        row.classList.add('is-selected');
        var day = row.querySelector('.wx-d-day');
        var cond = el.querySelector('.wx-cond');
        if (cond && day) cond.textContent = day.textContent + ' forecast';
        sound('tink');
      });
    });
  }

  /* ── Freeform: tools, stickies, pen draw ────────────── */
  function wireFreeform(el) {
    if (!el || el.dataset.wired) return;
    el.dataset.wired = '1';
    var canvas = el.querySelector('.ff27-canvas');
    var tool = 'select';
    var color = 'y';
    if (!canvas) return;

    el.querySelectorAll('.ff27-tool').forEach(function (btn) {
      btn.addEventListener('click', function () {
        el.querySelectorAll('.ff27-tool').forEach(function (b) {
          b.classList.remove('active');
        });
        btn.classList.add('active');
        tool = (btn.getAttribute('title') || 'select').toLowerCase();
        sound('tink');
      });
    });
    el.querySelectorAll('.ff27-swatch').forEach(function (s) {
      s.addEventListener('click', function () {
        color = s.classList.contains('p')
          ? 'p'
          : s.classList.contains('b')
            ? 'b'
            : s.classList.contains('g')
              ? 'g'
              : 'y';
        sound('pop');
      });
    });

    function addSticky(x, y, text) {
      var sticky = document.createElement('div');
      sticky.className = 'ff27-sticky ' + color;
      sticky.style.left = x + 'px';
      sticky.style.top = y + 'px';
      sticky.innerHTML =
        '<div class="ff27-sticky-bar"></div><p contenteditable="true"></p><span class="ff27-sticky-meta">just now</span>';
      sticky.querySelector('p').textContent = text || 'New idea';
      canvas.appendChild(sticky);
      makeDraggable(sticky);
      sound('hero');
    }

    function makeDraggable(node) {
      var ox, oy, sx, sy, drag = false;
      node.addEventListener('pointerdown', function (e) {
        if (tool.indexOf('pen') >= 0) return;
        if (e.target.isContentEditable) return;
        drag = true;
        node.setPointerCapture(e.pointerId);
        var r = node.getBoundingClientRect();
        var cr = canvas.getBoundingClientRect();
        ox = e.clientX;
        oy = e.clientY;
        sx = r.left - cr.left;
        sy = r.top - cr.top;
      });
      node.addEventListener('pointermove', function (e) {
        if (!drag) return;
        node.style.left = sx + (e.clientX - ox) + 'px';
        node.style.top = sy + (e.clientY - oy) + 'px';
      });
      node.addEventListener('pointerup', function () {
        drag = false;
      });
    }

    el.querySelectorAll('.ff27-sticky, .ff27-shape, .ff27-text-box').forEach(makeDraggable);

    canvas.addEventListener('dblclick', function (e) {
      if (e.target.closest('.ff27-sticky, .ff27-shape, .ff27-text-box, .ff27-note')) return;
      var cr = canvas.getBoundingClientRect();
      addSticky(e.clientX - cr.left - 40, e.clientY - cr.top - 20, 'Sticky note');
    });

    /* pen layer */
    var ink = document.createElement('canvas');
    ink.className = 'ff27-ink';
    ink.width = 960;
    ink.height = 560;
    ink.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:5';
    canvas.style.position = 'relative';
    canvas.appendChild(ink);
    var ctx = ink.getContext('2d');
    ctx.strokeStyle = '#1d1d1f';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    var drawing = false;

    canvas.addEventListener('pointerdown', function (e) {
      if (tool.indexOf('pen') < 0) return;
      drawing = true;
      ink.style.pointerEvents = 'auto';
      var r = ink.getBoundingClientRect();
      ctx.beginPath();
      ctx.moveTo(((e.clientX - r.left) / r.width) * ink.width, ((e.clientY - r.top) / r.height) * ink.height);
    });
    canvas.addEventListener('pointermove', function (e) {
      if (!drawing) return;
      var r = ink.getBoundingClientRect();
      ctx.lineTo(((e.clientX - r.left) / r.width) * ink.width, ((e.clientY - r.top) / r.height) * ink.height);
      ctx.stroke();
    });
    canvas.addEventListener('pointerup', function () {
      drawing = false;
      ink.style.pointerEvents = tool.indexOf('pen') >= 0 ? 'auto' : 'none';
    });

    el.querySelectorAll('.ff27-tool').forEach(function (btn) {
      btn.addEventListener('click', function () {
        ink.style.pointerEvents = (btn.getAttribute('title') || '').toLowerCase().indexOf('pen') >= 0 ? 'auto' : 'none';
      });
    });
  }

  /* ── App Store GET / install ────────────────────────── */
  function wireAppStore(el) {
    if (!el || el.dataset.wired) return;
    el.dataset.wired = '1';
    el.querySelectorAll('.btn-get').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (btn.dataset.busy) return;
        btn.dataset.busy = '1';
        var label = btn.textContent;
        btn.textContent = '…';
        sound('pop');
        var n = 0;
        var t = setInterval(function () {
          n += 20;
          btn.textContent = n + '%';
          if (n >= 100) {
            clearInterval(t);
            btn.textContent = 'OPEN';
            btn.classList.add('is-installed');
            sound('hero');
            if (global.MacShell && MacShell.notify) {
              var name = btn.closest('.store-row');
              var title = name && name.querySelector('strong');
              MacShell.notify('App Store', 'Download Complete', title ? title.textContent : 'App', 'now');
            }
          }
        }, 180);
      });
    });
    el.querySelectorAll('.app-sidebar-item, [data-nav]').forEach(function (item) {
      item.addEventListener('click', function () {
        el.querySelectorAll('.app-sidebar-item, [data-nav]').forEach(function (i) {
          i.classList.remove('active');
        });
        item.classList.add('active');
        sound('tink');
      });
    });
  }

  /* ── Activity Monitor: select process + tabs ────────── */
  function wireActivityMonitor(el) {
    if (!el || el.dataset.wired) return;
    el.dataset.wired = '1';
    el.querySelectorAll('tr, .am27-row, .am-row').forEach(function (row) {
      row.addEventListener('click', function () {
        el.querySelectorAll('tr, .am27-row, .am-row').forEach(function (r) {
          r.classList.remove('is-selected', 'selected');
        });
        row.classList.add('is-selected');
        sound('pop');
      });
    });
    el.querySelectorAll('.am27-tab, [data-am-tab], .am-tabs button').forEach(function (tab) {
      tab.addEventListener('click', function () {
        el.querySelectorAll('.am27-tab, [data-am-tab], .am-tabs button').forEach(function (t) {
          t.classList.remove('is-active', 'active');
        });
        tab.classList.add('is-active');
        sound('tink');
      });
    });
  }

  /* ── Generic list apps (bulk) ───────────────────────── */
  function wireGenericList(el) {
    if (!el || el.dataset.wiredGeneric) return;
    el.dataset.wiredGeneric = '1';
    el.querySelectorAll('.app-list-row, .simple-row, .app-sidebar-item').forEach(function (row) {
      row.style.cursor = 'default';
      row.addEventListener('click', function () {
        var parent = row.parentElement;
        if (parent) {
          parent.querySelectorAll('.app-list-row, .simple-row, .app-sidebar-item').forEach(function (r) {
            r.classList.remove('active', 'is-selected', 'selected');
          });
        }
        row.classList.add(row.classList.contains('app-sidebar-item') ? 'active' : 'is-selected');
        row.classList.add('active');
        var title = row.getAttribute('data-title') || (row.querySelector('strong') && row.querySelector('strong').textContent);
        var sub = row.getAttribute('data-sub') || '';
        var meta = row.getAttribute('data-meta') || '';
        var dt = el.querySelector('.simple-detail-title');
        var ds = el.querySelector('.simple-detail-sub');
        var dm = el.querySelector('.simple-detail-meta');
        if (dt && title) dt.textContent = title;
        if (ds) ds.textContent = sub || 'Selected';
        if (dm) dm.textContent = meta;
        sound('pop');
      });
    });
    var search = el.querySelector('.simple-search, .search-field');
    if (search && !search.dataset.wiredSearch) {
      search.dataset.wiredSearch = '1';
      search.addEventListener('input', function () {
        var q = search.value.toLowerCase();
        el.querySelectorAll('.simple-row, .app-list-row').forEach(function (row) {
          var t = (row.getAttribute('data-title') || row.textContent || '').toLowerCase();
          row.style.display = !q || t.indexOf(q) >= 0 ? '' : 'none';
        });
      });
    }
    el.querySelectorAll('.simple-action').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var act = btn.getAttribute('data-action');
        var sel = el.querySelector('.simple-row.is-selected, .app-list-row.is-selected');
        var name = sel && (sel.getAttribute('data-title') || sel.textContent);
        sound(act === 'primary' ? 'hero' : 'tink');
        if (global.MacShell && MacShell.notify) {
          MacShell.notify(
            el.getAttribute('data-simple-app') || 'App',
            act === 'primary' ? 'Open' : 'Refresh',
            name || 'Done',
            'now'
          );
        }
      });
    });
    el.querySelectorAll('button, .btn-primary, .btn-glass').forEach(function (btn) {
      if (btn.dataset.snd || btn.classList.contains('simple-action') || btn.classList.contains('simple-row')) return;
      btn.dataset.snd = '1';
      btn.addEventListener('click', function () {
        sound('tink');
      });
    });
  }

  /* ── Image Capture ──────────────────────────────────── */
  function wireImageCapture(el) {
    if (!el || el.dataset.wired) return;
    el.dataset.wired = '1';
    el.querySelectorAll('.ic-dev').forEach(function (d) {
      d.addEventListener('click', function () {
        el.querySelectorAll('.ic-dev').forEach(function (x) {
          x.classList.remove('is-selected');
        });
        d.classList.add('is-selected');
        sound('pop');
      });
    });
    el.querySelectorAll('.ic-thumb').forEach(function (t) {
      t.addEventListener('click', function () {
        t.classList.toggle('is-selected');
        sound('tink');
      });
    });
    var imp = el.querySelector('#ic-import');
    if (imp) {
      imp.addEventListener('click', function () {
        var n = el.querySelectorAll('.ic-thumb.is-selected').length || el.querySelectorAll('.ic-thumb').length;
        sound('hero');
        if (global.MacShell && MacShell.notify) {
          MacShell.notify('Image Capture', 'Import', n + ' item(s) imported to Photos (demo)', 'now');
        }
      });
    }
    var del = el.querySelector('#ic-delete');
    if (del) {
      del.addEventListener('click', function () {
        el.querySelectorAll('.ic-thumb.is-selected').forEach(function (t) {
          t.remove();
        });
        sound('emptyTrash');
      });
    }
  }

  /* ── Automator ──────────────────────────────────────── */
  function wireAutomator(el) {
    if (!el || el.dataset.wired) return;
    el.dataset.wired = '1';
    var workflow = el.querySelector('#am-workflow');
    var log = el.querySelector('#am-log');
    var step = 1;
    el.querySelectorAll('.am-action').forEach(function (a) {
      a.addEventListener('click', function () {
        el.querySelectorAll('.am-action').forEach(function (x) {
          x.classList.remove('active');
        });
        a.classList.add('active');
        sound('pop');
      });
    });
    var add = el.querySelector('#am-add');
    if (add && workflow) {
      add.addEventListener('click', function () {
        var active = el.querySelector('.am-action.active');
        var name = active ? active.getAttribute('data-action') : 'Action';
        step++;
        var div = document.createElement('div');
        div.className = 'am-step';
        div.textContent = step + '. ' + name;
        workflow.appendChild(div);
        if (log) log.textContent = 'Ready · Workflow has ' + step + ' action(s)';
        sound('tink');
      });
    }
    var run = el.querySelector('#am-run');
    if (run) {
      run.addEventListener('click', function () {
        if (log) log.textContent = 'Running…';
        sound('pop');
        setTimeout(function () {
          if (log) log.textContent = 'Workflow completed successfully';
          sound('hero');
          if (global.MacShell && MacShell.notify) {
            MacShell.notify('Automator', 'Workflow', 'Finished running', 'now');
          }
        }, 800);
      });
    }
  }

  /* ── Keychain ───────────────────────────────────────── */
  function wireKeychain(el) {
    if (!el || el.dataset.wired) return;
    el.dataset.wired = '1';
    var shown = false;
    el.querySelectorAll('.kc-row').forEach(function (row) {
      row.addEventListener('click', function () {
        el.querySelectorAll('.kc-row').forEach(function (r) {
          r.classList.remove('is-selected');
        });
        row.classList.add('is-selected');
        var n = el.querySelector('#kc-name');
        var k = el.querySelector('#kc-kind');
        var p = el.querySelector('#kc-pass');
        if (n) n.textContent = row.getAttribute('data-name') || '';
        if (k) k.textContent = row.querySelector('.muted') ? row.querySelector('.muted').textContent : '';
        if (p) p.textContent = '••••••••••••';
        shown = false;
        sound('pop');
      });
    });
    var show = el.querySelector('#kc-show');
    if (show) {
      show.addEventListener('click', function () {
        var p = el.querySelector('#kc-pass');
        shown = !shown;
        if (p) p.textContent = shown ? 'demo-keychain-secret' : '••••••••••••';
        sound('tink');
      });
    }
    var copy = el.querySelector('#kc-copy');
    if (copy) {
      copy.addEventListener('click', function () {
        var p = el.querySelector('#kc-pass');
        var val = p && shown ? p.textContent : 'demo-keychain-secret';
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(val).catch(function () {});
        }
        sound('hero');
        if (global.MacShell && MacShell.notify) {
          MacShell.notify('Keychain Access', 'Copied', 'Password copied (demo)', 'now');
        }
      });
    }
  }

  /* ── Audio MIDI Setup ───────────────────────────────── */
  function wireAudioMidi(el) {
    if (!el || el.dataset.wired) return;
    el.dataset.wired = '1';
    el.querySelectorAll('.ams-row').forEach(function (row) {
      row.addEventListener('click', function () {
        el.querySelectorAll('.ams-row').forEach(function (r) {
          r.classList.remove('is-selected');
        });
        row.classList.add('is-selected');
        var n = el.querySelector('#ams-name');
        var c = el.querySelector('#ams-ch');
        var rate = el.querySelector('#ams-rate');
        if (n) n.textContent = row.getAttribute('data-dev') || '';
        if (c) c.textContent = row.getAttribute('data-ch') || '';
        if (rate) rate.value = row.getAttribute('data-rate') || '48000';
        sound('pop');
      });
    });
    var vol = el.querySelector('#ams-vol');
    if (vol) {
      vol.addEventListener('input', function () {
        sound('volume');
      });
    }
  }

  /* ── DVD Player ─────────────────────────────────────── */
  function wireDvdPlayer(el) {
    if (!el || el.dataset.wired) return;
    el.dataset.wired = '1';
    var hasDisc = false;
    var playing = false;
    var status = el.querySelector('#dvd-status');
    var disc = el.querySelector('#dvd-disc');
    var play = el.querySelector('#dvd-play');
    function setStatus(t) {
      if (status) status.textContent = t;
    }
    var eject = el.querySelector('#dvd-eject');
    if (eject) {
      eject.addEventListener('click', function () {
        hasDisc = !hasDisc;
        playing = false;
        if (disc) disc.style.animation = hasDisc ? 'dvd-spin 3s linear infinite' : '';
        setStatus(hasDisc ? 'DVD inserted · Ready' : 'No disc · Insert a DVD to begin');
        if (play) play.textContent = '▶';
        sound(hasDisc ? 'hero' : 'emptyTrash');
      });
    }
    if (play) {
      play.addEventListener('click', function () {
        if (!hasDisc) {
          hasDisc = true;
          if (disc) disc.style.animation = 'dvd-spin 3s linear infinite';
        }
        playing = !playing;
        play.textContent = playing ? '❚❚' : '▶';
        setStatus(playing ? 'Playing · Title 1 Chapter 1' : 'Paused');
        sound(playing ? 'funk' : 'pop');
      });
    }
    ['dvd-prev', 'dvd-next', 'dvd-menu'].forEach(function (id) {
      var b = el.querySelector('#' + id);
      if (b) {
        b.addEventListener('click', function () {
          sound('tink');
          setStatus(id === 'dvd-menu' ? 'Disc Menu' : 'Chapter change');
        });
      }
    });
  }

  /* ── Migration Assistant ────────────────────────────── */
  function wireMigration(el) {
    if (!el || el.dataset.wired) return;
    el.dataset.wired = '1';
    var step = 1;
    var status = el.querySelector('#mig-status');
    el.querySelectorAll('.mig-opt').forEach(function (opt) {
      opt.addEventListener('click', function () {
        el.querySelectorAll('.mig-opt').forEach(function (o) {
          o.classList.remove('is-selected');
        });
        opt.classList.add('is-selected');
        var input = opt.querySelector('input');
        if (input) input.checked = true;
        sound('pop');
      });
    });
    var cont = el.querySelector('#mig-continue');
    if (cont) {
      cont.addEventListener('click', function () {
        step = Math.min(3, step + 1);
        if (status) status.textContent = 'Step ' + step + ' of 3';
        sound(step === 3 ? 'hero' : 'tink');
        if (step === 3 && global.MacShell && MacShell.notify) {
          MacShell.notify('Migration Assistant', 'Complete', 'Demo migration finished', 'now');
        }
      });
    }
    var back = el.querySelector('#mig-back');
    if (back) {
      back.addEventListener('click', function () {
        step = Math.max(1, step - 1);
        if (status) status.textContent = 'Step ' + step + ' of 3';
        sound('pop');
      });
    }
  }

  /* ── VoiceOver Utility ──────────────────────────────── */
  function wireVoiceOver(el) {
    if (!el || el.dataset.wired) return;
    el.dataset.wired = '1';
    el.querySelectorAll('.vo-nav').forEach(function (nav) {
      nav.addEventListener('click', function () {
        el.querySelectorAll('.vo-nav').forEach(function (n) {
          n.classList.remove('active');
        });
        nav.classList.add('active');
        var t = el.querySelector('#vo-title');
        if (t) t.textContent = nav.getAttribute('data-vo') || 'General';
        sound('pop');
      });
    });
    var en = el.querySelector('#vo-enable');
    if (en) {
      en.addEventListener('change', function () {
        sound(en.checked ? 'hero' : 'pop');
        if (global.MacShell && MacShell.notify) {
          MacShell.notify('VoiceOver', en.checked ? 'On' : 'Off', 'VoiceOver ' + (en.checked ? 'enabled' : 'disabled') + ' (demo)', 'now');
        }
      });
    }
    var test = el.querySelector('#vo-test');
    if (test) {
      test.addEventListener('click', function () {
        sound('submarine');
        if (window.speechSynthesis) {
          var u = new SpeechSynthesisUtterance('Welcome to macOS 27 Liquid Glass');
          var rate = el.querySelector('#vo-rate');
          if (rate) u.rate = 0.5 + (Number(rate.value) / 100) * 1.2;
          window.speechSynthesis.speak(u);
        }
      });
    }
  }

  /* ── Bluetooth File Exchange ────────────────────────── */
  function wireBtFile(el) {
    if (!el || el.dataset.wired) return;
    el.dataset.wired = '1';
    var list = el.querySelector('#bt-devices');
    var status = el.querySelector('#bt-status');
    var browse = el.querySelector('#bt-browse');
    if (browse) {
      browse.addEventListener('click', function () {
        if (list) {
          list.innerHTML =
            '<button type="button" class="btn-glass bt-dev">iPhone</button> ' +
            '<button type="button" class="btn-glass bt-dev">Magic Keyboard</button> ' +
            '<button type="button" class="btn-glass bt-dev">Headphones</button>';
        }
        if (status) status.textContent = '3 devices found';
        sound('tink');
      });
    }
    var send = el.querySelector('#bt-send');
    if (send) {
      send.addEventListener('click', function () {
        sound('hero');
        if (status) status.textContent = 'Sending sample file… Done';
        if (global.MacShell && MacShell.notify) {
          MacShell.notify('Bluetooth File Exchange', 'Sent', 'Document.pdf', 'now');
        }
      });
    }
  }

  /* ── Boot Camp ──────────────────────────────────────── */
  function wireBootCamp(el) {
    if (!el || el.dataset.wired) return;
    el.dataset.wired = '1';
    var ok = el.querySelector('#bc-ok');
    if (ok) {
      ok.addEventListener('click', function () {
        sound('pop');
        if (global.WindowManager && WindowManager.closeApp) {
          WindowManager.closeApp('boot-camp');
        }
      });
    }
  }

  /* ── AirPort Utility ────────────────────────────────── */
  function wireAirport(el) {
    if (!el || el.dataset.wired) return;
    el.dataset.wired = '1';
    var scan = el.querySelector('#ap-scan');
    var list = el.querySelector('#ap-list');
    if (scan) {
      scan.addEventListener('click', function () {
        if (list) {
          list.innerHTML =
            '<p class="muted">Scanning…</p>';
          sound('pop');
          setTimeout(function () {
            list.innerHTML =
              '<div class="settings-card glass" style="padding:14px;text-align:left;max-width:360px;margin:0 auto">' +
              '<strong>No base stations</strong><p class="muted" style="margin:6px 0 0">Still no AirPort devices on this network (demo).</p></div>';
            sound('sosumi');
          }, 900);
        }
      });
    }
  }

  /* ── ColorSync ──────────────────────────────────────── */
  function wireColorSync(el) {
    if (!el || el.dataset.wired) return;
    el.dataset.wired = '1';
    el.querySelectorAll('.cs-row').forEach(function (row) {
      row.addEventListener('click', function () {
        el.querySelectorAll('.cs-row').forEach(function (r) {
          r.classList.remove('is-selected');
        });
        row.classList.add('is-selected');
        var n = el.querySelector('#cs-name');
        if (n) n.textContent = row.getAttribute('data-profile') || '';
        sound('pop');
      });
    });
    var fa = el.querySelector('#cs-firstaid');
    if (fa) {
      fa.addEventListener('click', function () {
        var st = el.querySelector('#cs-status');
        if (st) st.textContent = 'Repairing…';
        sound('pop');
        setTimeout(function () {
          if (st) st.textContent = 'Repaired · OK';
          sound('hero');
        }, 700);
      });
    }
  }

  /* ── Tips: open related demos ───────────────────────── */
  function wireTips(el) {
    if (!el || el.dataset.wired) return;
    el.dataset.wired = '1';
    var map = {
      Spotlight: function () {
        if (global.MacShell && MacShell.toggleSpotlight) MacShell.toggleSpotlight();
        else if (global.MacShell && MacShell.showSpotlight) MacShell.showSpotlight();
      },
      Launchpad: function () {
        if (global.MacShell && MacShell.openLaunchpad) MacShell.openLaunchpad();
      },
      'Control Center': function () {
        if (global.MacShell && MacShell.toggleControlCenter) MacShell.toggleControlCenter();
      },
      'Lock Screen': function () {
        if (global.MacShell && MacShell.showLockScreen) MacShell.showLockScreen('Lock Screen');
      },
      'Force Quit': function () {
        if (global.MacShell && MacShell.showForceQuit) MacShell.showForceQuit();
      },
      'Stage Manager': function () {
        if (global.MacShell && MacShell.toggleStageManager) MacShell.toggleStageManager();
      },
      Sounds: function () {
        if (global.MacShell && MacShell.openApp) MacShell.openApp('system-settings');
      },
      Widgets: function () {
        sound('pop');
      },
    };
    el.querySelectorAll('.settings-card, .glass').forEach(function (card) {
      var strong = card.querySelector('strong');
      if (!strong) return;
      card.style.cursor = 'pointer';
      card.addEventListener('click', function () {
        var t = strong.textContent.trim();
        sound('tink');
        if (map[t]) map[t]();
        else if (global.MacShell && MacShell.notify) {
          MacShell.notify('Tips', t, 'Try this feature from the menu bar or Dock', 'now');
        }
      });
    });
  }

  /* ── Directory Utility ──────────────────────────────── */
  function wireDirectoryUtility(el) {
    if (!el || el.dataset.wired) return;
    el.dataset.wired = '1';
    var locked = true;
    var lock = el.querySelector('#du-lock');
    var status = el.querySelector('#du-status');
    var boxes = el.querySelectorAll('#du-ad, #du-ldap, #du-nis');
    function setLocked(on) {
      locked = on;
      boxes.forEach(function (b) {
        b.disabled = on;
      });
      if (lock) lock.textContent = on ? '🔒 Click the lock to make changes' : '🔓 Unlocked';
      if (status) status.textContent = on ? 'Locked · Services cannot be changed' : 'Unlocked · Authenticated (demo)';
    }
    setLocked(true);
    if (lock) {
      lock.addEventListener('click', function () {
        setLocked(!locked);
        sound(locked ? 'pop' : 'hero');
      });
    }
    boxes.forEach(function (b) {
      b.addEventListener('change', function () {
        var lab = b.parentElement;
        if (lab && lab.childNodes[1]) {
          /* update label text node roughly */
        }
        sound('tink');
      });
    });
  }

  /* ── Stickies ───────────────────────────────────────── */
  function wireStickies(el) {
    if (!el || el.dataset.wired) return;
    el.dataset.wired = '1';
    var board = el.querySelector('.stickies-board') || el;
    board.style.position = board.style.position || 'relative';
    board.style.minHeight = board.style.minHeight || '360px';
    el.querySelectorAll('.sticky').forEach(function (s, i) {
      s.contentEditable = 'true';
      s.style.position = 'absolute';
      if (!s.style.left) s.style.left = 24 + (i % 3) * 160 + 'px';
      if (!s.style.top) s.style.top = 24 + Math.floor(i / 3) * 140 + 'px';
      s.style.cursor = 'grab';
      s.style.minWidth = '140px';
      s.style.minHeight = '120px';
      s.style.zIndex = String(1 + i);
      s.addEventListener('focus', function () {
        sound('pop');
      });
      var drag = false;
      var ox = 0;
      var oy = 0;
      s.addEventListener('pointerdown', function (e) {
        if (e.target !== s && e.target.isContentEditable && e.detail > 0) {
          /* allow text selection when clicking inside after focus */
        }
        if (e.metaKey || e.altKey) return;
        // drag from edge: hold shift or drag when not selecting text
        if (document.activeElement === s && !e.shiftKey) return;
        drag = true;
        s.setPointerCapture(e.pointerId);
        var r = s.getBoundingClientRect();
        var br = board.getBoundingClientRect();
        ox = e.clientX - r.left;
        oy = e.clientY - r.top;
        s.style.cursor = 'grabbing';
        s.style.zIndex = '20';
      });
      s.addEventListener('pointermove', function (e) {
        if (!drag) return;
        var br = board.getBoundingClientRect();
        var x = e.clientX - br.left - ox;
        var y = e.clientY - br.top - oy;
        s.style.left = Math.max(0, x) + 'px';
        s.style.top = Math.max(0, y) + 'px';
      });
      s.addEventListener('pointerup', function () {
        drag = false;
        s.style.cursor = 'grab';
      });
    });
    // Add sticky button if missing
    if (!el.querySelector('.sticky-add')) {
      var add = document.createElement('button');
      add.type = 'button';
      add.className = 'btn-primary sticky-add';
      add.textContent = '+ Note';
      add.style.cssText = 'position:absolute;right:12px;bottom:12px;z-index:30';
      board.appendChild(add);
      add.addEventListener('click', function () {
        var n = document.createElement('div');
        n.className = 'sticky y';
        n.contentEditable = 'true';
        n.textContent = 'New sticky';
        n.style.position = 'absolute';
        n.style.left = 40 + Math.random() * 120 + 'px';
        n.style.top = 40 + Math.random() * 80 + 'px';
        n.style.minWidth = '140px';
        n.style.minHeight = '120px';
        board.appendChild(n);
        sound('hero');
        // re-wire simply
        el.dataset.wired = '';
        wireStickies(el);
      });
    }
  }

  /* ── Clock tabs already have onMount; add sound ─────── */
  function wireClock(el) {
    if (!el || el.dataset.wiredExtra) return;
    el.dataset.wiredExtra = '1';
    el.querySelectorAll('button, .clock-tab, [data-clock-tab]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        sound('tink');
      });
    });
  }

  /* ── iWork: Pages / Numbers / Keynote ───────────────── */
  function wireIWork(el) {
    if (!el || el.dataset.wired) return;
    el.dataset.wired = '1';
    el.querySelectorAll('.iwork27-icon-btn[title="Bold"]').forEach(function (b) {
      b.addEventListener('click', function () {
        document.execCommand('bold');
        b.classList.toggle('active');
        sound('tink');
      });
    });
    el.querySelectorAll('.iwork27-icon-btn[title="Italic"]').forEach(function (b) {
      b.addEventListener('click', function () {
        document.execCommand('italic');
        b.classList.toggle('active');
        sound('tink');
      });
    });
    el.querySelectorAll('.iwork27-icon-btn[title="Underline"]').forEach(function (b) {
      b.addEventListener('click', function () {
        document.execCommand('underline');
        b.classList.toggle('active');
        sound('tink');
      });
    });
    el.querySelectorAll('.iwork27-icon-btn[title="Undo"]').forEach(function (b) {
      b.addEventListener('click', function () {
        document.execCommand('undo');
        sound('pop');
      });
    });
    el.querySelectorAll('.iwork27-icon-btn[title="Redo"]').forEach(function (b) {
      b.addEventListener('click', function () {
        document.execCommand('redo');
        sound('pop');
      });
    });
    el.querySelectorAll('.iwork27-style').forEach(function (s) {
      s.addEventListener('click', function () {
        el.querySelectorAll('.iwork27-style').forEach(function (x) {
          x.classList.remove('active');
        });
        s.classList.add('active');
        sound('tink');
      });
    });
    el.querySelectorAll('.iwork27-insp-tabs span').forEach(function (tab) {
      tab.addEventListener('click', function () {
        el.querySelectorAll('.iwork27-insp-tabs span').forEach(function (t) {
          t.classList.remove('active');
        });
        tab.classList.add('active');
        sound('pop');
      });
    });
    /* Numbers cells */
    el.querySelectorAll('.num27-sheet td').forEach(function (td) {
      td.addEventListener('focus', function () {
        el.querySelectorAll('.num27-sheet td').forEach(function (c) {
          c.classList.remove('active');
        });
        td.classList.add('active');
      });
      td.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          td.blur();
          sound('tink');
        }
      });
    });
    /* Keynote slides */
    el.querySelectorAll('.kn27-slide, .keynote-slide, [data-slide]').forEach(function (slide, i) {
      slide.addEventListener('click', function () {
        el.querySelectorAll('.kn27-slide, .keynote-slide, [data-slide]').forEach(function (s) {
          s.classList.remove('active', 'is-active');
        });
        slide.classList.add('active');
        sound('pop');
      });
    });
    el.querySelectorAll('.iwork27-tb-btn.primary, .iwork27-tb-btn').forEach(function (btn) {
      if (btn.dataset.iwork) return;
      btn.dataset.iwork = '1';
      var label = (btn.textContent || '').trim();
      if (label === 'Share' || label === 'Play') {
        btn.addEventListener('click', function () {
          sound(label === 'Play' ? 'hero' : 'messageSent');
          if (global.MacShell && MacShell.notify) {
            MacShell.notify(
              label === 'Play' ? 'Keynote' : 'iWork',
              label === 'Play' ? 'Slideshow' : 'Share',
              label === 'Play' ? 'Playing slideshow (demo)' : 'Link copied (demo)',
              'now'
            );
          }
        });
      }
    });
  }

  /* ── TV: tabs, play, my list, cards ─────────────────── */
  function wireTV(el) {
    if (!el || el.dataset.wired) return;
    el.dataset.wired = '1';
    el.querySelectorAll('.tv-tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        el.querySelectorAll('.tv-tab').forEach(function (t) {
          t.classList.remove('active');
        });
        tab.classList.add('active');
        sound('pop');
      });
    });
    el.querySelectorAll('.tv-hero-actions .btn-primary, .tv-hero .btn-primary').forEach(function (btn) {
      btn.addEventListener('click', function () {
        sound('funk');
        btn.textContent = btn.textContent === 'Play' ? '❚❚ Pause' : 'Play';
        if (global.MacShell && MacShell.notify) {
          MacShell.notify('TV', 'Now Playing', 'Featured title', 'now');
        }
      });
    });
    el.querySelectorAll('.tv-hero-actions .btn-glass').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var on = btn.classList.toggle('is-added');
        btn.textContent = on ? '✓ In My List' : '+ My List';
        sound(on ? 'hero' : 'pop');
      });
    });
    el.querySelectorAll('.tv-card').forEach(function (card) {
      card.style.cursor = 'pointer';
      card.addEventListener('click', function () {
        el.querySelectorAll('.tv-card').forEach(function (c) {
          c.classList.remove('is-selected');
        });
        card.classList.add('is-selected');
        var t = card.querySelector('strong');
        var hero = el.querySelector('.tv-hero h1');
        if (hero && t) hero.textContent = t.textContent;
        sound('tink');
      });
      card.addEventListener('dblclick', function () {
        sound('funk');
        if (global.MacShell && MacShell.notify) {
          var t = card.querySelector('strong');
          MacShell.notify('TV', 'Playing', t ? t.textContent : 'Show', 'now');
        }
      });
    });
  }

  /* ── Podcasts / News / Books ────────────────────────── */
  function wireMediaList(el, appName) {
    if (!el || el.dataset.wiredMedia) return;
    el.dataset.wiredMedia = '1';
    el.querySelectorAll('.app-list-row').forEach(function (row) {
      row.style.cursor = 'pointer';
      row.addEventListener('click', function () {
        el.querySelectorAll('.app-list-row').forEach(function (r) {
          r.classList.remove('is-selected', 'active');
        });
        row.classList.add('is-selected');
        sound('pop');
      });
      row.addEventListener('dblclick', function () {
        sound(appName === 'News' ? 'tink' : 'funk');
        var t = row.querySelector('strong, .row-title');
        if (global.MacShell && MacShell.notify) {
          MacShell.notify(
            appName,
            appName === 'News' ? 'Opening' : 'Now Playing',
            t ? t.textContent : 'Item',
            'now'
          );
        }
      });
    });
  }

  /* ── Disk Utility select ────────────────────────────── */
  function wireDiskUtility(el) {
    if (!el || el.dataset.wired) return;
    el.dataset.wired = '1';
    el.querySelectorAll('.du27-item, .du-volume, [data-volume]').forEach(function (item) {
      item.addEventListener('click', function () {
        el.querySelectorAll('.du27-item, .du-volume, [data-volume]').forEach(function (i) {
          i.classList.remove('active', 'is-selected');
        });
        item.classList.add('active');
        sound('pop');
      });
    });
    el.querySelectorAll('button, .du27-tb-btn').forEach(function (btn) {
      if (btn.dataset.du) return;
      btn.dataset.du = '1';
      btn.addEventListener('click', function () {
        sound('tink');
        var title = btn.getAttribute('title') || btn.textContent || 'Action';
        if (global.MacShell && MacShell.notify) {
          MacShell.notify('Disk Utility', title, 'Operation simulated', 'now');
        }
      });
    });
  }

  /* ── Siri ───────────────────────────────────────────── */
  function wireSiri(el) {
    if (!el || el.dataset.wired) return;
    el.dataset.wired = '1';
    var input = el.querySelector('input');
    var ask = el.querySelector('.btn-primary');
    var thread = el.querySelector('[style*="flex-direction:column"]') || el.querySelector('.app-layout') || el;
    function reply(q) {
      var box = el.querySelector('[style*="justify-content:flex-end"]') || el.querySelector('.app-main') || el;
      var you = document.createElement('div');
      you.className = 'settings-card glass';
      you.style.cssText = 'padding:12px 14px;align-self:flex-start;max-width:85%;margin:6px 0';
      you.innerHTML = '<span class="muted">You</span><p style="margin:4px 0 0"></p>';
      you.querySelector('p').textContent = q;
      var si = document.createElement('div');
      si.className = 'settings-card glass';
      si.style.cssText = 'padding:12px 14px;align-self:flex-end;max-width:85%;margin:6px 0';
      var answers = [
        'Here is what I found in your simulated calendar and apps.',
        'It is a great day for Liquid Glass demos.',
        'I set a timer for 5 minutes (demo).',
        'Opening System Settings is a good place to start.',
        'Your Mac is running macOS 27 (virtual).',
      ];
      var a = answers[Math.floor(Math.random() * answers.length)];
      if (/weather/i.test(q)) a = 'It is 72° and partly cloudy in City.';
      if (/time|clock/i.test(q)) a = 'It is ' + nowTime() + '.';
      if (/calendar|meeting/i.test(q)) a = 'You have Design Review at 10:00 AM and Team Sync at 2:00 PM.';
      si.innerHTML = '<span class="muted">Siri</span><p style="margin:4px 0 0"></p>';
      si.querySelector('p').textContent = a;
      var host = el.querySelector('[style*="justify-content:flex-end"]');
      if (host) {
        host.appendChild(you);
        host.appendChild(si);
        host.scrollTop = host.scrollHeight;
      }
      sound('messageReceived');
    }
    function go() {
      if (!input || !input.value.trim()) return;
      reply(input.value.trim());
      input.value = '';
    }
    if (ask) ask.addEventListener('click', go);
    if (input) {
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') go();
      });
    }
  }

  /* ── Dictionary lookup ──────────────────────────────── */
  function wireDictionary(el) {
    if (!el || el.dataset.wired) return;
    el.dataset.wired = '1';
    var dict = {
      liquid: 'Having a consistency like that of water or oil; flowing freely.',
      glass: 'A hard, brittle substance, typically transparent, made by fusing sand with soda.',
      interface: 'A point where two systems meet and interact.',
      macos: 'The operating system designed by Apple for Mac computers.',
      blur: 'To make or become unclear or less distinct.',
    };
    var input = el.querySelector('.search-field, input[type="search"], input');
    function show(word) {
      var w = (word || 'liquid').toLowerCase().trim();
      var def = dict[w] || 'No exact match in the sample dictionary. Try: liquid, glass, interface, macos, blur.';
      var main = el.querySelector('.app-main') || el;
      var body = main.querySelector('[style*="padding:20px"]') || main;
      if (body) {
        body.innerHTML =
          '<div style="padding:20px 24px"><h2 style="margin:0 0 4px"></h2>' +
          '<p class="muted" style="margin:0 0 16px">Sample dictionary</p>' +
          '<div class="settings-card glass" style="padding:14px 16px"><strong>Definition</strong>' +
          '<p class="muted" style="margin:6px 0 0" id="dict-def"></p></div></div>';
        body.querySelector('h2').textContent = w;
        body.querySelector('#dict-def').textContent = def;
      }
      sound('pop');
    }
    if (input) {
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') show(input.value);
      });
    }
  }

  /* ── Grapher plot ───────────────────────────────────── */
  function wireGrapher(el) {
    if (!el || el.dataset.wired) return;
    el.dataset.wired = '1';
    var canvas = el.querySelector('#grapher-canvas');
    var sel = el.querySelector('#grapher-eq');
    var btn = el.querySelector('#grapher-plot');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    function plot() {
      var w = canvas.width;
      var h = canvas.height;
      ctx.fillStyle = '#0b1220';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.moveTo(w / 2, 0);
      ctx.lineTo(w / 2, h);
      ctx.stroke();
      var type = sel ? sel.value : 'sin';
      ctx.strokeStyle = '#5ac8fa';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (var i = 0; i <= w; i++) {
        var x = (i / w) * 4 * Math.PI - 2 * Math.PI;
        var y = 0;
        if (type === 'sin') y = Math.sin(x);
        else if (type === 'cos') y = Math.cos(x);
        else if (type === 'x2') y = (x * x) / 10 - 1;
        else y = Math.sin(x) + 0.5 * Math.sin(3 * x);
        var py = h / 2 - y * (h * 0.28);
        if (i === 0) ctx.moveTo(i, py);
        else ctx.lineTo(i, py);
      }
      ctx.stroke();
      sound('tink');
    }
    if (btn) btn.addEventListener('click', plot);
    if (sel) sel.addEventListener('change', plot);
    plot();
  }

  /* ── Script Editor ──────────────────────────────────── */
  function wireScriptEditor(el) {
    if (!el || el.dataset.wired) return;
    el.dataset.wired = '1';
    var run = el.querySelector('#se-run');
    var compile = el.querySelector('#se-compile');
    var log = el.querySelector('#se-log');
    var code = el.querySelector('#se-code');
    if (compile) {
      compile.addEventListener('click', function () {
        if (log) log.innerHTML = '<span style="color:#30d158">✓ Compiled successfully</span>';
        sound('hero');
      });
    }
    if (run) {
      run.addEventListener('click', function () {
        var src = code ? code.value : '';
        var m = src.match(/display dialog\s+"([^"]+)"/i);
        var ret = src.match(/return\s+(\w+)/i);
        var out = m ? 'dialog → “' + m[1] + '”' : 'script finished';
        if (ret) out += ' · result: ' + ret[1];
        if (log) log.innerHTML = '<strong>Result</strong><br/>' + out;
        sound('funk');
        if (m && global.MacShell && MacShell.notify) {
          MacShell.notify('Script Editor', 'Dialog', m[1], 'now');
        }
      });
    }
  }

  /* ── Home app toggles ───────────────────────────────── */
  function wireHome(el) {
    if (!el || el.dataset.wired) return;
    el.dataset.wired = '1';
    el.querySelectorAll('.home-tile').forEach(function (tile) {
      tile.addEventListener('click', function () {
        var on = tile.classList.toggle('is-on');
        var st = tile.querySelector('.home-tile-state');
        var kind = tile.getAttribute('data-kind');
        if (st) {
          if (kind === 'light') st.textContent = on ? 'On · 80%' : 'Off';
          else if (kind === 'lock') st.textContent = on ? 'Locked' : 'Unlocked';
          else if (kind === 'opener') st.textContent = on ? 'Open' : 'Closed';
          else if (kind === 'climate') st.textContent = on ? '72°' : 'Off';
          else st.textContent = on ? 'On' : 'Off';
        }
        sound(on ? 'pop' : 'tink');
      });
    });
  }

  /* ── Shortcuts run ──────────────────────────────────── */
  function wireShortcuts(el) {
    if (!el || el.dataset.wired) return;
    el.dataset.wired = '1';
    el.querySelectorAll('.sc-run').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var name = btn.getAttribute('data-sc') || 'Shortcut';
        btn.textContent = '…';
        sound('pop');
        setTimeout(function () {
          btn.textContent = 'Run';
          sound('hero');
          if (global.MacShell && MacShell.notify) {
            MacShell.notify('Shortcuts', 'Finished', name, 'now');
          }
          if (/Screenshot/i.test(name) && global.MacShell && MacShell.openApp) {
            MacShell.openApp('screenshot');
          }
        }, 700);
      });
    });
  }

  /* ── Voice Memos ────────────────────────────────────── */
  function wireVoiceMemos(el) {
    if (!el || el.dataset.wired) return;
    el.dataset.wired = '1';
    var rec = el.querySelector('#vm-record');
    var status = el.querySelector('#vm-status');
    var list = el.querySelector('.vm-list');
    var recording = false;
    var t0 = 0;
    var timer = null;
    if (rec) {
      rec.addEventListener('click', function () {
        recording = !recording;
        if (recording) {
          rec.textContent = '■ Stop';
          t0 = Date.now();
          sound('purr');
          timer = setInterval(function () {
            var s = Math.floor((Date.now() - t0) / 1000);
            if (status) status.textContent = 'Recording 0:' + (s < 10 ? '0' : '') + s;
          }, 250);
        } else {
          rec.textContent = '● Record';
          if (timer) clearInterval(timer);
          var s = Math.floor((Date.now() - t0) / 1000);
          if (status) status.textContent = 'Saved';
          if (list) {
            var row = document.createElement('div');
            row.className = 'vm-row';
            row.innerHTML =
              '<strong>New Recording</strong><span class="muted">0:' +
              (s < 10 ? '0' : '') +
              s +
              '</span>';
            list.insertBefore(row, list.firstChild);
          }
          sound('hero');
        }
      });
    }
  }

  /* ── Image Playground ───────────────────────────────── */
  function wireImagePlayground(el) {
    if (!el || el.dataset.wired) return;
    el.dataset.wired = '1';
    var style = 'Animation';
    el.querySelectorAll('.ip-style').forEach(function (btn) {
      btn.addEventListener('click', function () {
        el.querySelectorAll('.ip-style').forEach(function (b) {
          b.classList.remove('active');
        });
        btn.classList.add('active');
        style = btn.getAttribute('data-style') || style;
        sound('tink');
      });
    });
    var create = el.querySelector('#ip-create');
    var preview = el.querySelector('#ip-preview');
    var prompt = el.querySelector('#ip-prompt');
    if (create) {
      create.addEventListener('click', function () {
        create.textContent = 'Creating…';
        sound('pop');
        setTimeout(function () {
          create.textContent = 'Create';
          if (preview) {
            var n = 1 + Math.floor(Math.random() * 12);
            var nn = n < 10 ? '0' + n : String(n);
            preview.innerHTML =
              '<img src="assets/photos/funny/funny-' +
              nn +
              '.jpg" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:12px" />';
          }
          sound('hero');
          if (global.MacShell && MacShell.notify) {
            MacShell.notify(
              'Image Playground',
              'Created',
              (prompt && prompt.value) || style,
              'now'
            );
          }
        }, 900);
      });
    }
  }

  /* ── Digital Color Meter sample ─────────────────────── */
  function wireColorMeter(el) {
    if (!el || el.dataset.wired) return;
    el.dataset.wired = '1';
    function sample(e) {
      var r = Math.min(255, Math.max(0, Math.floor((e.clientX / window.innerWidth) * 255)));
      var g = Math.min(255, Math.max(0, Math.floor((e.clientY / window.innerHeight) * 255)));
      var b = Math.min(255, Math.max(0, 255 - Math.floor(((r + g) / 2) % 256)));
      var hex =
        '#' +
        [r, g, b]
          .map(function (v) {
            var h = v.toString(16);
            return h.length === 1 ? '0' + h : h;
          })
          .join('')
          .toUpperCase();
      var sw = el.querySelector('#dcm-swatch');
      if (sw) sw.style.background = hex;
      var er = el.querySelector('#dcm-r');
      var eg = el.querySelector('#dcm-g');
      var eb = el.querySelector('#dcm-b');
      var eh = el.querySelector('#dcm-hex');
      if (er) er.textContent = r;
      if (eg) eg.textContent = g;
      if (eb) eb.textContent = b;
      if (eh) eh.textContent = hex;
    }
    document.addEventListener('mousemove', function (e) {
      if (!el.isConnected) return;
      sample(e);
    });
  }

  /* ── QuickTime ──────────────────────────────────────── */
  function wireQuickTime(el) {
    if (!el || el.dataset.wired) return;
    el.dataset.wired = '1';
    var playing = false;
    var t = 0;
    var dur = 90;
    var fill = el.querySelector('#qt-fill');
    var timeEl = el.querySelector('#qt-time');
    var toggle = el.querySelector('#qt-toggle');
    var playBtn = el.querySelector('#qt-play');
    var timer = null;
    function fmt(s) {
      var m = Math.floor(s / 60);
      var r = s % 60;
      return m + ':' + (r < 10 ? '0' : '') + r;
    }
    function tick() {
      if (!playing) return;
      t = Math.min(dur, t + 1);
      if (fill) fill.style.width = (t / dur) * 100 + '%';
      if (timeEl) timeEl.textContent = fmt(t) + ' / ' + fmt(dur);
      if (t >= dur) {
        playing = false;
        if (toggle) toggle.textContent = 'Play';
        clearInterval(timer);
        sound('pop');
      }
    }
    function setPlay(on) {
      playing = on;
      if (toggle) toggle.textContent = on ? 'Pause' : 'Play';
      if (playBtn) playBtn.textContent = on ? '❚❚' : '▶';
      sound(on ? 'funk' : 'pop');
      clearInterval(timer);
      if (on) timer = setInterval(tick, 400);
    }
    if (toggle) toggle.addEventListener('click', function () { setPlay(!playing); });
    if (playBtn) playBtn.addEventListener('click', function () { setPlay(!playing); });
    var rw = el.querySelector('#qt-rw');
    var ff = el.querySelector('#qt-ff');
    if (rw) {
      rw.addEventListener('click', function () {
        t = Math.max(0, t - 10);
        if (fill) fill.style.width = (t / dur) * 100 + '%';
        if (timeEl) timeEl.textContent = fmt(t) + ' / ' + fmt(dur);
        sound('volume');
      });
    }
    if (ff) {
      ff.addEventListener('click', function () {
        t = Math.min(dur, t + 10);
        if (fill) fill.style.width = (t / dur) * 100 + '%';
        if (timeEl) timeEl.textContent = fmt(t) + ' / ' + fmt(dur);
        sound('volume');
      });
    }
    var open = el.querySelector('#qt-open');
    if (open) {
      open.addEventListener('click', function () {
        t = 0;
        setPlay(true);
        if (global.MacShell && MacShell.notify) {
          MacShell.notify('QuickTime Player', 'Sample Movie', 'Playing demo clip', 'now');
        }
      });
    }
    var rec = el.querySelector('#qt-record');
    if (rec) {
      rec.addEventListener('click', function () {
        sound('purr');
        if (global.MacShell && MacShell.notify) {
          MacShell.notify('QuickTime Player', 'Recording', 'Screen recording started (demo)', 'now');
        }
      });
    }
  }

  /* ── News reader ────────────────────────────────────── */
  function wireNews(el) {
    if (!el || el.dataset.wired) return;
    el.dataset.wired = '1';
    var articles = [
      {
        t: 'macOS 27 redefines the desktop with Liquid Glass',
        b: 'Apple · 2h ago',
        body: 'Apple’s next desktop design language uses translucent materials, specular edges, and adaptive light to make windows feel part of the wallpaper.',
      },
      {
        t: 'How Liquid Glass changes app design',
        b: 'Design · 4h',
        body: 'Designers are rethinking hierarchy with blur, vibrancy, and thinner chrome while keeping controls recognizable.',
      },
      {
        t: 'Apple Intelligence expands on Mac',
        b: 'Tech · 6h',
        body: 'On-device models power writing tools and smarter Siri experiences across system apps in this simulation.',
      },
      {
        t: 'Best wallpapers for the new look',
        b: 'Lifestyle · 8h',
        body: 'Soft gradients and crystal textures show off menu bar translucency and dock glass in macOS 27.',
      },
    ];
    el.querySelectorAll('.news-item').forEach(function (item) {
      item.addEventListener('click', function () {
        el.querySelectorAll('.news-item').forEach(function (i) {
          i.classList.remove('is-active');
        });
        item.classList.add('is-active');
        var idx = parseInt(item.getAttribute('data-news'), 10) || 0;
        var a = articles[idx] || articles[0];
        var title = el.querySelector('#news-title');
        var by = el.querySelector('#news-byline');
        var body = el.querySelector('#news-body');
        if (title) title.textContent = a.t;
        if (by) by.textContent = a.b;
        if (body) body.textContent = a.body;
        sound('pop');
      });
    });
  }

  /* ── Books reader ───────────────────────────────────── */
  function wireBooks(el) {
    if (!el || el.dataset.wired) return;
    el.dataset.wired = '1';
    var page = 1;
    var title = 'Book';
    var reader = el.querySelector('#book-reader');
    var grid = el.querySelector('#books-grid');
    var text = el.querySelector('#book-text');
    var pageEl = el.querySelector('#book-page');
    var titleEl = el.querySelector('#book-title');
    function renderPage() {
      if (text) {
        text.innerHTML =
          '<p class="book-drop">' +
          title +
          '</p><p>Chapter ' +
          page +
          '. In a virtual library of sample text, Liquid Glass pages turn with a soft shadow and generous margins—comfortable reading for long sessions.</p><p class="muted">Page ' +
          page +
          ' of 12</p>';
      }
      if (pageEl) pageEl.textContent = page + ' / 12';
      if (titleEl) titleEl.textContent = title;
    }
    el.querySelectorAll('.book-cover').forEach(function (cover) {
      cover.addEventListener('click', function () {
        title = cover.getAttribute('data-book') || 'Book';
        page = 1;
        if (grid) grid.hidden = true;
        if (reader) reader.hidden = false;
        renderPage();
        sound('pop');
      });
    });
    var back = el.querySelector('#book-back');
    if (back) {
      back.addEventListener('click', function () {
        if (reader) reader.hidden = true;
        if (grid) grid.hidden = false;
        sound('tink');
      });
    }
    var prev = el.querySelector('#book-prev');
    var next = el.querySelector('#book-next');
    if (prev) {
      prev.addEventListener('click', function () {
        page = Math.max(1, page - 1);
        renderPage();
        sound('volume');
      });
    }
    if (next) {
      next.addEventListener('click', function () {
        page = Math.min(12, page + 1);
        renderPage();
        sound('volume');
      });
    }
  }

  /* ── Find My ────────────────────────────────────────── */
  function wireFindMy(el) {
    if (!el || el.dataset.wired) return;
    el.dataset.wired = '1';
    function select(name) {
      el.querySelectorAll('.fm-row, .fm-pin').forEach(function (n) {
        n.classList.toggle('is-selected', n.getAttribute('data-dev') === name);
      });
      sound('pop');
    }
    el.querySelectorAll('.fm-row, .fm-pin').forEach(function (n) {
      n.addEventListener('click', function () {
        select(n.getAttribute('data-dev'));
      });
    });
    el.querySelectorAll('.fm-tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        el.querySelectorAll('.fm-tab').forEach(function (t) {
          t.classList.remove('active');
        });
        tab.classList.add('active');
        sound('tink');
      });
    });
    var play = el.querySelector('#fm-play');
    if (play) {
      play.addEventListener('click', function () {
        sound('sosumi');
        if (global.MacShell && MacShell.notify) {
          MacShell.notify('Find My', 'Playing Sound', 'Device is playing a sound', 'now');
        }
      });
    }
    var dir = el.querySelector('#fm-directions');
    if (dir) {
      dir.addEventListener('click', function () {
        sound('pop');
        if (global.MacShell && MacShell.openApp) MacShell.openApp('maps');
      });
    }
  }

  /* ── Time Machine ───────────────────────────────────── */
  function wireTimeMachine(el) {
    if (!el || el.dataset.wired) return;
    el.dataset.wired = '1';
    var idx = 0;
    var labels = ['Today, 9:00 AM', 'Yesterday, 9:00 AM', '2 days ago', '3 days ago', 'Last Week'];
    var label = el.querySelector('#tm-label');
    var stack = el.querySelector('#tm-stack');
    function update() {
      if (label) label.textContent = labels[idx] || labels[0];
      if (stack) stack.style.setProperty('--tm', idx);
      sound('pop');
    }
    var back = el.querySelector('#tm-back');
    var fwd = el.querySelector('#tm-fwd');
    if (back) {
      back.addEventListener('click', function () {
        idx = Math.min(labels.length - 1, idx + 1);
        update();
      });
    }
    if (fwd) {
      fwd.addEventListener('click', function () {
        idx = Math.max(0, idx - 1);
        update();
      });
    }
    var restore = el.querySelector('#tm-restore');
    if (restore) {
      restore.addEventListener('click', function () {
        sound('hero');
        if (global.MacShell && MacShell.notify) {
          MacShell.notify('Time Machine', 'Restore', 'Restored sample files from ' + (labels[idx] || ''), 'now');
        }
      });
    }
  }

  /* ── Passwords ──────────────────────────────────────── */
  function wirePasswords(el) {
    if (!el || el.dataset.wired) return;
    el.dataset.wired = '1';
    el.querySelectorAll('.pw-copy').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var site = btn.getAttribute('data-site') || 'site';
        var demo = 'demo-password-' + site.replace(/\W/g, '');
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(demo).catch(function () {});
        }
        btn.textContent = 'Copied';
        sound('tink');
        setTimeout(function () {
          btn.textContent = 'Copy';
        }, 1200);
        if (global.MacShell && MacShell.notify) {
          MacShell.notify('Passwords', 'Copied', 'Password for ' + site, 'now');
        }
      });
    });
    var search = el.querySelector('#pw-search');
    if (search) {
      search.addEventListener('input', function () {
        var q = search.value.toLowerCase();
        el.querySelectorAll('.pw-row').forEach(function (row) {
          var site = (row.getAttribute('data-site') || '').toLowerCase();
          row.style.display = !q || site.indexOf(q) >= 0 ? '' : 'none';
        });
      });
    }
  }

  /* ── Console live log ───────────────────────────────── */
  function wireConsole(el) {
    if (!el || el.dataset.wired) return;
    el.dataset.wired = '1';
    var log = el.querySelector('#console-log');
    var paused = false;
    var sources = ['kernel', 'WindowServer', 'Safari', 'Finder', 'dock', 'bluetoothd', 'mds'];
    var msgs = [
      'IOKit: power state change',
      'Display sleep prevented',
      'Network reachability changed',
      'Sandbox: allow file-read-data',
      'LaunchServices: registered app',
      'CoreAudio: device sample rate 48000',
    ];
    var iv = setInterval(function () {
      if (!el.isConnected) {
        clearInterval(iv);
        return;
      }
      if (paused || !log) return;
      var d = new Date();
      var t =
        String(d.getHours()).padStart(2, '0') +
        ':' +
        String(d.getMinutes()).padStart(2, '0') +
        ':' +
        String(d.getSeconds()).padStart(2, '0');
      var line = document.createElement('div');
      line.innerHTML =
        '<span class="c-time">' +
        t +
        '</span> <span class="c-src">' +
        sources[Math.floor(Math.random() * sources.length)] +
        '</span> ' +
        msgs[Math.floor(Math.random() * msgs.length)];
      log.appendChild(line);
      log.scrollTop = log.scrollHeight;
      while (log.children.length > 80) log.removeChild(log.firstChild);
    }, 1500);
    var clear = el.querySelector('#console-clear');
    if (clear) {
      clear.addEventListener('click', function () {
        if (log) log.innerHTML = '';
        sound('emptyTrash');
      });
    }
    var pause = el.querySelector('#console-pause');
    if (pause) {
      pause.addEventListener('click', function () {
        paused = !paused;
        pause.textContent = paused ? 'Resume' : 'Pause';
        sound('pop');
      });
    }
  }

  /* ── Magnifier ──────────────────────────────────────── */
  function wireMagnifier(el) {
    if (!el || el.dataset.wired) return;
    el.dataset.wired = '1';
    var content = el.querySelector('#mag-content');
    var zoom = el.querySelector('#mag-zoom');
    var bright = el.querySelector('#mag-bright');
    var filter = el.querySelector('#mag-filter');
    function apply() {
      if (!content) return;
      var z = zoom ? zoom.value : 2;
      var b = bright ? bright.value / 100 : 1;
      var f = filter ? filter.value : 'none';
      var filt = 'brightness(' + b + ')';
      if (f === 'invert') filt += ' invert(1)';
      if (f === 'gray') filt += ' grayscale(1)';
      if (f === 'contrast') filt += ' contrast(1.6)';
      content.style.transform = 'scale(' + z + ')';
      content.style.filter = filt;
    }
    if (zoom) zoom.addEventListener('input', function () { apply(); sound('volume'); });
    if (bright) bright.addEventListener('input', apply);
    if (filter) filter.addEventListener('change', function () { apply(); sound('tink'); });
    apply();
  }

  /* ── GarageBand ─────────────────────────────────────── */
  function wireGarageBand(el) {
    if (!el || el.dataset.wired) return;
    el.dataset.wired = '1';
    var playing = false;
    var beat = 0;
    var timer = null;
    var timeEl = el.querySelector('#gb-time');
    var play = el.querySelector('#gb-play');
    var stop = el.querySelector('#gb-stop');
    function setPlay(on) {
      playing = on;
      if (play) play.textContent = on ? '❚❚ Pause' : '▶ Play';
      clearInterval(timer);
      if (on) {
        sound('funk');
        timer = setInterval(function () {
          beat++;
          var bar = 1 + Math.floor(beat / 4);
          var b = 1 + (beat % 4);
          if (timeEl) timeEl.textContent = bar + '.' + b + '.1';
          if (beat % 4 === 0) sound('tink');
        }, 350);
      } else sound('pop');
    }
    if (play) play.addEventListener('click', function () { setPlay(!playing); });
    if (stop) {
      stop.addEventListener('click', function () {
        beat = 0;
        setPlay(false);
        if (timeEl) timeEl.textContent = '1.1.1';
      });
    }
    el.querySelectorAll('.gb-mute').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        btn.classList.toggle('is-on');
        btn.closest('.gb-track').classList.toggle('is-muted');
        sound('tink');
      });
    });
    el.querySelectorAll('.gb-solo').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        btn.classList.toggle('is-on');
        sound('pop');
      });
    });
    el.querySelectorAll('.gb-key').forEach(function (key) {
      key.addEventListener('click', function () {
        sound('volume');
        key.classList.add('is-down');
        setTimeout(function () {
          key.classList.remove('is-down');
        }, 120);
      });
    });
  }

  /* ── iMovie ─────────────────────────────────────────── */
  function wireIMovie(el) {
    if (!el || el.dataset.wired) return;
    el.dataset.wired = '1';
    var track = el.querySelector('#im-tl-track');
    var playhead = el.querySelector('#im-playhead');
    var preview = el.querySelector('#im-preview .im-frame');
    var playing = false;
    var pos = 0;
    var timer = null;
    el.querySelectorAll('.im-clip').forEach(function (clip) {
      clip.addEventListener('click', function () {
        if (!track) return;
        var c = document.createElement('div');
        c.className = 'im-tl-clip';
        c.style.backgroundImage = 'url(' + clip.querySelector('img').src + ')';
        c.textContent = clip.querySelector('span').textContent;
        track.appendChild(c);
        if (preview) {
          preview.style.backgroundImage = 'url(' + clip.querySelector('img').src + ')';
          preview.style.backgroundSize = 'cover';
          preview.textContent = '';
        }
        sound('pop');
      });
    });
    var play = el.querySelector('#im-play');
    if (play) {
      play.addEventListener('click', function () {
        playing = !playing;
        play.textContent = playing ? '❚❚ Pause' : '▶ Play';
        sound(playing ? 'funk' : 'pop');
        clearInterval(timer);
        if (playing) {
          timer = setInterval(function () {
            pos = (pos + 2) % 100;
            if (playhead) playhead.style.left = pos + '%';
          }, 80);
        }
      });
    }
    var exp = el.querySelector('#im-export');
    if (exp) {
      exp.addEventListener('click', function () {
        sound('hero');
        if (global.MacShell && MacShell.notify) {
          MacShell.notify('iMovie', 'Share', 'Exported movie to Desktop (demo)', 'now');
        }
      });
    }
  }

  /* ── Font Book ──────────────────────────────────────── */
  function wireFontBook(el) {
    if (!el || el.dataset.wired) return;
    el.dataset.wired = '1';
    var preview = el.querySelector('#fb-preview');
    var name = el.querySelector('#fb-name');
    el.querySelectorAll('.fb-font').forEach(function (btn) {
      btn.addEventListener('click', function () {
        el.querySelectorAll('.fb-font').forEach(function (b) {
          b.classList.remove('active');
        });
        btn.classList.add('active');
        var font = btn.getAttribute('data-font') || 'SF Pro';
        var sample = btn.getAttribute('data-sample') || 'Sample';
        if (name) name.textContent = font;
        if (preview) {
          preview.style.fontFamily = font === 'Menlo' ? 'Menlo, monospace' : font === 'Georgia' ? 'Georgia, serif' : font === 'New York' ? 'Georgia, serif' : '-apple-system, "' + font + '", system-ui, sans-serif';
          preview.textContent = sample + ' — The quick brown fox jumps over the lazy dog 0123456789';
        }
        sound('pop');
      });
    });
    el.querySelectorAll('.fb-size').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (preview) preview.style.fontSize = btn.getAttribute('data-size') + 'px';
        sound('tink');
      });
    });
  }

  /* ── Journal ────────────────────────────────────────── */
  function wireJournal(el) {
    if (!el || el.dataset.wired) return;
    el.dataset.wired = '1';
    var entries = [
      { t: 'July 17, 2026', body: 'Built a virtual Mac today with Liquid Glass chrome and interactive apps. Feeling productive.' },
      { t: 'July 14, 2026', body: 'Beautiful golden hour walk. Captured ideas for the demo desktop.' },
    ];
    var title = el.querySelector('#journal-title');
    var text = el.querySelector('#journal-text');
    var list = el.querySelector('#journal-list');
    function show(i) {
      var e = entries[i] || entries[0];
      if (title) title.value = e.t;
      if (text) text.value = e.body;
      el.querySelectorAll('.journal-item').forEach(function (item, j) {
        item.classList.toggle('is-active', j === i);
      });
      sound('pop');
    }
    el.querySelectorAll('.journal-item').forEach(function (item) {
      item.addEventListener('click', function () {
        show(parseInt(item.getAttribute('data-j'), 10) || 0);
      });
    });
    if (title) {
      title.addEventListener('input', function () {
        var active = el.querySelector('.journal-item.is-active');
        if (active) {
          var s = active.querySelector('strong');
          if (s) s.textContent = title.value;
          var idx = parseInt(active.getAttribute('data-j'), 10);
          if (entries[idx]) entries[idx].t = title.value;
        }
      });
    }
    if (text) {
      text.addEventListener('input', function () {
        var active = el.querySelector('.journal-item.is-active');
        if (active) {
          var m = active.querySelector('.muted');
          if (m) m.textContent = text.value.slice(0, 40) + (text.value.length > 40 ? '…' : '');
          var idx = parseInt(active.getAttribute('data-j'), 10);
          if (entries[idx]) entries[idx].body = text.value;
        }
      });
    }
    var neu = el.querySelector('#journal-new');
    if (neu && list) {
      neu.addEventListener('click', function () {
        var d = new Date();
        var t =
          d.toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        entries.unshift({ t: t, body: '' });
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'journal-item is-active';
        btn.setAttribute('data-j', '0');
        btn.innerHTML = '<strong></strong><span class="muted">New entry…</span>';
        btn.querySelector('strong').textContent = t;
        el.querySelectorAll('.journal-item').forEach(function (item, i) {
          item.classList.remove('is-active');
          item.setAttribute('data-j', String(i + 1));
        });
        list.insertBefore(btn, list.firstChild);
        btn.addEventListener('click', function () {
          show(0);
        });
        show(0);
        if (text) text.focus();
        sound('hero');
      });
    }
  }

  /* ── Games ──────────────────────────────────────────── */
  function wireGames(el) {
    if (!el || el.dataset.wired) return;
    el.dataset.wired = '1';
    el.querySelectorAll('.game-card').forEach(function (card) {
      card.addEventListener('click', function () {
        var name = card.getAttribute('data-game') || 'Game';
        sound('funk');
        if (name === 'Chess' && global.MacShell && MacShell.openApp) {
          MacShell.openApp('chess');
          return;
        }
        if (global.MacShell && MacShell.notify) {
          MacShell.notify('Games', 'Launching', name + ' (demo)', 'now');
        }
      });
    });
  }

  /* ── System Information ─────────────────────────────── */
  function wireSystemInfo(el) {
    if (!el || el.dataset.wired) return;
    el.dataset.wired = '1';
    var nav = typeof navigator !== 'undefined' ? navigator : {};
    var scr = typeof screen !== 'undefined' ? screen : { width: 1920, height: 1080 };
    var panes = {
      overview: [
        ['Model Name', 'Virtual Mac'],
        ['Chip', 'Apple Silicon (sim)'],
        ['Memory', (nav.deviceMemory || 16) + ' GB'],
        ['macOS', '27.0 (Liquid Glass)'],
        ['Browser', (nav.userAgent && nav.userAgent.split(' ').slice(-1)[0]) || 'Web'],
      ],
      display: [
        ['Resolution', (scr.width || 1920) + ' × ' + (scr.height || 1080)],
        ['Color Profile', 'sRGB'],
        ['Pixel Ratio', String((typeof window !== 'undefined' && window.devicePixelRatio) || 1)],
      ],
      storage: [
        ['Macintosh HD', '1 TB APFS'],
        ['Available', '494 GB'],
        ['Used', '530 GB'],
      ],
      network: [
        ['Wi‑Fi', 'Home Network'],
        ['Online', nav.onLine === false ? 'No' : 'Yes'],
        ['Language', nav.language || 'en-US'],
      ],
    };
    el.querySelectorAll('.si-nav').forEach(function (nav) {
      nav.addEventListener('click', function () {
        el.querySelectorAll('.si-nav').forEach(function (n) {
          n.classList.remove('active');
        });
        nav.classList.add('active');
        var key = nav.getAttribute('data-si');
        var rows = panes[key] || panes.overview;
        var host = el.querySelector('#si-rows');
        var title = el.querySelector('#si-title');
        if (title) title.textContent = nav.textContent;
        if (host) {
          host.innerHTML = rows
            .map(function (r) {
              return (
                '<div class="settings-row"><span>' +
                r[0] +
                '</span><strong>' +
                r[1] +
                '</strong></div>'
              );
            })
            .join('');
        }
        sound('pop');
      });
    });
  }

  /* ── Print Center ───────────────────────────────────── */
  function wirePrintCenter(el) {
    if (!el || el.dataset.wired) return;
    el.dataset.wired = '1';
    el.querySelectorAll('.pc-printer').forEach(function (p) {
      p.addEventListener('click', function () {
        el.querySelectorAll('.pc-printer').forEach(function (x) {
          x.classList.remove('is-selected');
        });
        p.classList.add('is-selected');
        sound('pop');
      });
    });
    var jobs = el.querySelector('#pc-jobs');
    var add = el.querySelector('#pc-add');
    if (add && jobs) {
      add.addEventListener('click', function () {
        if (jobs.querySelector('.muted')) jobs.innerHTML = '';
        var row = document.createElement('div');
        row.className = 'pc-job';
        row.innerHTML =
          '<strong>Document.pdf</strong><span class="muted">Queued · 2 pages</span><button type="button" class="btn-glass pc-job-del">✕</button>';
        jobs.appendChild(row);
        row.querySelector('.pc-job-del').addEventListener('click', function () {
          row.remove();
          sound('emptyTrash');
        });
        sound('hero');
      });
    }
    var del = el.querySelector('#pc-delete');
    if (del && jobs) {
      del.addEventListener('click', function () {
        var job = jobs.querySelector('.pc-job');
        if (job) {
          job.remove();
          sound('emptyTrash');
        }
      });
    }
    var resume = el.querySelector('#pc-resume');
    if (resume) {
      resume.addEventListener('click', function () {
        sound('tink');
        if (global.MacShell && MacShell.notify) {
          MacShell.notify('Print Center', 'Printer', 'Queue resumed', 'now');
        }
      });
    }
  }

  /* ── Activity Monitor live meters ───────────────────── */
  function wireActivityMonitorLive(el) {
    if (!el || el.dataset.live) return;
    el.dataset.live = '1';
    var fills = el.querySelectorAll('.am27-meter-fill');
    var vals = el.querySelectorAll('.am27-meter-val');
    var summary = el.querySelector('.am27-cpu-summary strong');
    var rows = el.querySelectorAll('.am27-table tbody tr');
    var iv = setInterval(function () {
      if (!el.isConnected) {
        clearInterval(iv);
        return;
      }
      var sys = 10 + Math.random() * 25;
      var user = 5 + Math.random() * 20;
      var idle = Math.max(5, 100 - sys - user);
      var arr = [sys, user, idle];
      fills.forEach(function (f, i) {
        if (arr[i] != null) f.style.width = arr[i].toFixed(0) + '%';
      });
      vals.forEach(function (v, i) {
        if (arr[i] != null) v.textContent = arr[i].toFixed(0) + '%';
      });
      if (summary) summary.textContent = (sys + user).toFixed(0) + '%';
      rows.forEach(function (row) {
        var cpuCell = row.querySelectorAll('.am27-num')[0];
        if (!cpuCell) return;
        var base = parseFloat(cpuCell.textContent) || 1;
        var n = Math.max(0.1, base + (Math.random() - 0.5) * 1.5);
        cpuCell.textContent = n.toFixed(1);
      });
    }, 1200);
  }

  /* ── Chess / Games simple interact ──────────────────── */
  function wireChess(el) {
    if (!el || el.dataset.wired) return;
    el.dataset.wired = '1';
    if (!el.querySelector('.chess-board')) {
      var board = document.createElement('div');
      board.className = 'chess-board';
      var pieces = '♜♞♝♛♚♝♞♜♟♟♟♟♟♟♟♟                ♙♙♙♙♙♙♙♙♖♘♗♕♔♗♘♖';
      for (var i = 0; i < 64; i++) {
        var sq = document.createElement('button');
        sq.type = 'button';
        sq.className = 'chess-sq ' + ((Math.floor(i / 8) + i) % 2 ? 'dark' : 'light');
        sq.textContent = pieces[i] === ' ' ? '' : pieces[i];
        board.appendChild(sq);
      }
      el.innerHTML =
        '<div class="chess-wrap"><h3>Chess</h3><p class="muted">Click a piece, then a square</p></div>';
      el.querySelector('.chess-wrap').appendChild(board);
    }
    var selected = null;
    el.querySelectorAll('.chess-sq').forEach(function (sq) {
      sq.addEventListener('click', function () {
        if (selected && selected !== sq) {
          if (selected.textContent) {
            sq.textContent = selected.textContent;
            selected.textContent = '';
            sound('tink');
          }
          selected.classList.remove('is-selected');
          selected = null;
        } else if (sq.textContent) {
          if (selected) selected.classList.remove('is-selected');
          selected = sq;
          sq.classList.add('is-selected');
          sound('pop');
        }
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

    /* Finder: open folders on double-click + empty trash */
    var finder = AppRegistry.get('finder');
    if (finder && finder.onMount) {
      var prevF = finder.onMount;
      finder.onMount = function (el) {
        prevF.call(finder, el);
        /* Empty trash when navigating to trash location via sidebar */
        el.querySelectorAll('.finder-sb-item[data-nav="trash"]').forEach(function (trashNav) {
          trashNav.addEventListener('dblclick', function () {
            sound('emptyTrash');
            if (global.MacShell && MacShell.notify) {
              MacShell.notify('Finder', 'Trash', 'Trash is empty', 'now');
            }
          });
        });
        /* Path bar / toolbar more menu empty trash hint */
        var more = el.querySelector('.tb-glass-btn[title="More"]');
        if (more && !more.dataset.trashWired) {
          more.dataset.trashWired = '1';
          more.addEventListener('click', function () {
            if (el.getAttribute('data-view') || true) {
              /* quick empty if on trash */
              var title = el.querySelector('#finder-title');
              if (title && /trash/i.test(title.textContent || '')) {
                sound('emptyTrash');
                if (global.MacShell && MacShell.notify) {
                  MacShell.notify('Finder', 'Trash', 'Trash is empty', 'now');
                }
              }
            }
          });
        }
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
        if (id === 'mail') wireMail(body);
        if (id === 'notes') wireNotes(body);
        if (id === 'calendar') wireCalendar(body);
        if (id === 'maps') wireMaps(body);
        if (id === 'music') wireMusic(body);
        if (id === 'terminal') wireTerminal(body);
        if (id === 'reminders') wireReminders(body);
        if (id === 'phone') wirePhone(body);
        if (id === 'preview') wirePreview(body);
        if (id === 'photo-booth') wirePhotoBooth(body);
        if (id === 'facetime') wireFaceTime(body);
        if (id === 'textedit') wireTextEdit(body);
        if (id === 'calculator') wireCalculator(body);
        if (id === 'contacts') wireContacts(body);
        if (id === 'stocks') wireStocks(body);
        if (id === 'weather') wireWeather(body);
        if (id === 'freeform') wireFreeform(body);
        if (id === 'appstore') wireAppStore(body);
        if (id === 'activity-monitor') {
          wireActivityMonitor(body);
          wireActivityMonitorLive(body);
        }
        if (id === 'stickies') wireStickies(body);
        if (id === 'clock') wireClock(body);
        if (id === 'pages' || id === 'numbers' || id === 'keynote') wireIWork(body);
        if (id === 'tv') wireTV(body);
        if (id === 'podcasts') wireMediaList(body, 'Podcasts');
        if (id === 'news') wireMediaList(body, 'News');
        if (id === 'books') wireMediaList(body, 'Books');
        if (id === 'disk-utility') wireDiskUtility(body);
        if (id === 'chess' || id === 'games') wireChess(body);
        if (id === 'siri') wireSiri(body);
        if (id === 'dictionary') wireDictionary(body);
        if (id === 'grapher') wireGrapher(body);
        if (id === 'script-editor') wireScriptEditor(body);
        if (id === 'home') wireHome(body);
        if (id === 'shortcuts') wireShortcuts(body);
        if (id === 'voice-memos') wireVoiceMemos(body);
        if (id === 'image-playground') wireImagePlayground(body);
        if (id === 'digital-color-meter') wireColorMeter(body);
        if (id === 'quicktime') wireQuickTime(body);
        if (id === 'news') wireNews(body);
        if (id === 'books') wireBooks(body);
        if (id === 'find-my') wireFindMy(body);
        if (id === 'time-machine') wireTimeMachine(body);
        if (id === 'passwords') wirePasswords(body);
        if (id === 'console') wireConsole(body);
        if (id === 'magnifier') wireMagnifier(body);
        if (id === 'garageband') wireGarageBand(body);
        if (id === 'imovie') wireIMovie(body);
        if (id === 'font-book') wireFontBook(body);
        if (id === 'journal') wireJournal(body);
        if (id === 'games') wireGames(body);
        if (id === 'system-information') wireSystemInfo(body);
        if (id === 'print-center') wirePrintCenter(body);
        if (id === 'image-capture') wireImageCapture(body);
        if (id === 'automator') wireAutomator(body);
        if (id === 'keychain-access') wireKeychain(body);
        if (id === 'audio-midi-setup') wireAudioMidi(body);
        if (id === 'dvd-player') wireDvdPlayer(body);
        if (id === 'migration-assistant') wireMigration(body);
        if (id === 'voiceover-utility') wireVoiceOver(body);
        if (id === 'bluetooth-file-exchange') wireBtFile(body);
        if (id === 'boot-camp') wireBootCamp(body);
        if (id === 'airport-utility') wireAirport(body);
        if (id === 'colorsync') wireColorSync(body);
        if (id === 'directory-utility') wireDirectoryUtility(body);
        if (id === 'tips') wireTips(body);
        if (id === 'system-settings') {
          wireSoundButtons(body);
          enhanceSoundPane(body);
        }
        /* bulk / simple list apps */
        if (
          body.querySelector('.app-list-row') ||
          body.querySelector('.simple-row') ||
          body.querySelector('.app-sidebar-item') ||
          body.classList.contains('simple-app') ||
          body.querySelector('.simple-app')
        ) {
          wireGenericList(body.querySelector('.simple-app') || body);
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
