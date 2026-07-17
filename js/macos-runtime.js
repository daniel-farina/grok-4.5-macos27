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
    var tabTitle =
      el.querySelector('.safari-url-title') ||
      el.querySelector('.safari-chrome .safari-tab.is-active .safari-tab-title') ||
      el.querySelector('.safari-tab-title');
    var backBtn = el.querySelector('.safari-nav-seg[aria-label="Back"]');
    var fwdBtn = el.querySelector('.safari-nav-seg[aria-label="Forward"]');
    var history = [];
    var histIdx = -1;
    var tabs = [{ title: 'Start Page', url: '', history: [], histIdx: -1 }];
    var tabIdx = 0;
    var tabStrip = el.querySelector('.safari-tabstrip');

    function syncChrome() {
      if (tabTitle) tabTitle.textContent = tabs[tabIdx].title;
      if (input) input.value = (tabs[tabIdx].url || '').replace(/^https?:\/\//, '');
      history = tabs[tabIdx].history || [];
      histIdx = tabs[tabIdx].histIdx;
      if (backBtn) {
        backBtn.disabled = histIdx <= 0 && !tabs[tabIdx].url;
        backBtn.classList.toggle('is-disabled', backBtn.disabled);
      }
      if (fwdBtn) {
        fwdBtn.disabled = histIdx < 0 || histIdx >= history.length - 1;
        fwdBtn.classList.toggle('is-disabled', fwdBtn.disabled);
      }
      renderTabs();
    }

    function renderTabs() {
      if (!tabStrip) {
        var chrome = el.querySelector('.safari-chrome');
        if (!chrome) return;
        tabStrip = document.createElement('div');
        tabStrip.className = 'safari-tabstrip';
        tabStrip.setAttribute('aria-label', 'Tabs');
        chrome.appendChild(tabStrip);
      }
      tabStrip.innerHTML = '';
      tabs.forEach(function (t, i) {
        var btn = document.createElement('div');
        btn.className = 'safari-tab' + (i === tabIdx ? ' is-active' : '');
        btn.setAttribute('role', 'tab');
        btn.innerHTML =
          '<span class="safari-tab-favicon" aria-hidden="true">🧭</span>' +
          '<span class="safari-tab-title"></span>' +
          '<button type="button" class="safari-tab-close" aria-label="Close tab">×</button>';
        btn.querySelector('.safari-tab-title').textContent =
          t.title.length > 18 ? t.title.slice(0, 18) + '…' : t.title;
        btn.addEventListener('click', function (e) {
          if (e.target.closest('.safari-tab-close')) {
            e.stopPropagation();
            closeTab(i);
            return;
          }
          switchTab(i);
        });
        tabStrip.appendChild(btn);
      });
      var add = document.createElement('button');
      add.type = 'button';
      add.className = 'safari-tab-add';
      add.title = 'New Tab';
      add.setAttribute('aria-label', 'New Tab');
      add.textContent = '+';
      add.addEventListener('click', function () {
        newTab();
      });
      tabStrip.appendChild(add);
    }

    function saveTabState() {
      tabs[tabIdx].history = history.slice();
      tabs[tabIdx].histIdx = histIdx;
      tabs[tabIdx].url = input ? input.value : tabs[tabIdx].url;
      if (tabTitle) tabs[tabIdx].title = tabTitle.textContent || 'Tab';
    }

    function switchTab(i) {
      if (i < 0 || i >= tabs.length || i === tabIdx) return;
      saveTabState();
      tabIdx = i;
      history = tabs[tabIdx].history || [];
      histIdx = tabs[tabIdx].histIdx;
      if (tabs[tabIdx].url) {
        navigate(tabs[tabIdx].url, true);
      } else {
        showStart(true);
      }
      syncChrome();
      sound('pop');
    }

    function closeTab(i) {
      if (tabs.length <= 1) {
        showStart();
        return;
      }
      tabs.splice(i, 1);
      if (tabIdx >= tabs.length) tabIdx = tabs.length - 1;
      else if (i < tabIdx) tabIdx--;
      history = tabs[tabIdx].history || [];
      histIdx = tabs[tabIdx].histIdx;
      if (tabs[tabIdx].url) navigate(tabs[tabIdx].url, true);
      else showStart(true);
      syncChrome();
      sound('tink');
    }

    function newTab() {
      saveTabState();
      tabs.push({ title: 'Start Page', url: '', history: [], histIdx: -1 });
      tabIdx = tabs.length - 1;
      history = [];
      histIdx = -1;
      showStart(true);
      syncChrome();
      sound('hero');
    }

    function showStart(skipSound) {
      if (!page) return;
      page.innerHTML = page._startHTML || '';
      if (!page.innerHTML) {
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
      tabs[tabIdx].title = 'Start Page';
      tabs[tabIdx].url = '';
      if (tabTitle) tabTitle.textContent = 'Start Page';
      if (input) input.value = '';
      if (backBtn) {
        backBtn.disabled = true;
        backBtn.classList.add('is-disabled');
      }
      if (fwdBtn) {
        fwdBtn.disabled = true;
        fwdBtn.classList.add('is-disabled');
      }
      if (!skipSound) sound('pop');
      wireSafariStartClicks(el, navigate);
      renderTabs();
    }

    if (page && !page._startHTML) page._startHTML = page.innerHTML;

    function navigate(raw, fromTab) {
      var q = (raw || '').trim();
      if (!q) return;
      var url = q;
      if (!/^https?:\/\//i.test(url)) {
        if (/^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(url)) url = 'https://' + url;
        else url = 'https://duckduckgo.com/?q=' + encodeURIComponent(q);
      }
      var embed = url;
      if (/wikipedia\.org/i.test(url) || /example\.com/i.test(url) || /duckduckgo\.com/i.test(url)) {
        /* ok */
      } else if (/apple\.com/i.test(url)) {
        embed = 'https://www.apple.com/';
      }

      if (!fromTab) {
        history = history.slice(0, histIdx + 1);
        history.push({ url: url, title: q });
        histIdx = history.length - 1;
      }

      var shortTitle = q.length > 28 ? q.slice(0, 28) + '…' : q;
      if (input) input.value = url.replace(/^https?:\/\//, '');
      if (tabTitle) tabTitle.textContent = shortTitle;
      tabs[tabIdx].title = shortTitle;
      tabs[tabIdx].url = url;
      tabs[tabIdx].history = history.slice();
      tabs[tabIdx].histIdx = histIdx;

      if (backBtn) {
        backBtn.disabled = histIdx <= 0;
        backBtn.classList.toggle('is-disabled', histIdx <= 0);
      }
      if (fwdBtn) {
        fwdBtn.disabled = histIdx >= history.length - 1;
        fwdBtn.classList.toggle('is-disabled', fwdBtn.disabled);
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
      if (start) start.addEventListener('click', function () {
        showStart();
      });
      if (!fromTab) sound('pop');
      renderTabs();
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
          if (h) navigate(h.url, true);
          tabs[tabIdx].histIdx = histIdx;
          syncChrome();
        } else showStart();
      });
    }
    if (fwdBtn) {
      fwdBtn.addEventListener('click', function () {
        if (histIdx < history.length - 1) {
          histIdx++;
          var h = history[histIdx];
          if (h) navigate(h.url, true);
          tabs[tabIdx].histIdx = histIdx;
          syncChrome();
          sound('pop');
        }
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
      btn.addEventListener('click', newTab);
    });
    wireSafariStartClicks(el, navigate);
    renderTabs();
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
          Weather: 'https://en.wikipedia.org/wiki/Weather',
          News: 'https://en.wikipedia.org/wiki/News',
          Google: 'https://duckduckgo.com',
          YouTube: 'https://en.wikipedia.org/wiki/YouTube',
          Maps: 'https://en.wikipedia.org/wiki/Map',
          Bing: 'https://duckduckgo.com',
          X: 'https://en.wikipedia.org/wiki/Twitter',
          LinkedIn: 'https://en.wikipedia.org/wiki/LinkedIn',
          Reddit: 'https://en.wikipedia.org/wiki/Reddit',
          NYT: 'https://en.wikipedia.org/wiki/The_New_York_Times',
          BBC: 'https://en.wikipedia.org/wiki/BBC',
          'App Store': 'https://www.apple.com/app-store/',
          iCloud: 'https://www.apple.com/icloud/',
        };
        navigate(map[n] || 'https://en.wikipedia.org/wiki/' + encodeURIComponent(n || 'Apple_Inc.'));
      });
    });
    el.querySelectorAll('.safari-read-item').forEach(function (item) {
      item.addEventListener('click', function () {
        var t = item.querySelector('.safari-read-title');
        var s = item.querySelector('.safari-read-site');
        var site = s ? s.textContent : 'apple.com';
        navigate('https://' + site.replace(/^https?:\/\//, ''));
        if (t && global.MacShell && MacShell.notify) {
          MacShell.notify('Safari', 'Reading List', t.textContent, 'now');
        }
      });
    });
    el.querySelectorAll('.safari-closed-item').forEach(function (item) {
      item.addEventListener('click', function () {
        var n = item.querySelector('.safari-closed-name');
        navigate((n && n.textContent) || 'example.com');
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
    var search = el.querySelector('.photos-search');
    var idx = 0;
    var favorites = {};
    try {
      favorites = JSON.parse(localStorage.getItem('macos-photo-favs') || '{}') || {};
    } catch (e) {
      favorites = {};
    }

    function visibleTiles() {
      return tiles.filter(function (t) {
        return t.style.display !== 'none';
      });
    }

    function openAt(i) {
      var vis = visibleTiles();
      if (!vis.length) return;
      idx = (i + vis.length) % vis.length;
      var t = vis[idx];
      if (img) {
        img.src = t.getAttribute('data-src');
        img.alt = t.getAttribute('data-title') || '';
      }
      if (title) {
        var fav = favorites[t.getAttribute('data-src')] ? ' ★' : '';
        title.textContent = (t.getAttribute('data-title') || '') + fav;
      }
      if (lb) {
        lb.hidden = false;
        lb.classList.add('is-open');
      }
      sound('pop');
    }

    function toggleFav(tile) {
      var src = tile.getAttribute('data-src');
      if (favorites[src]) delete favorites[src];
      else favorites[src] = 1;
      try {
        localStorage.setItem('macos-photo-favs', JSON.stringify(favorites));
      } catch (e) {}
      tile.classList.toggle('is-favorite', !!favorites[src]);
      sound(favorites[src] ? 'hero' : 'tink');
    }

    tiles.forEach(function (t, i) {
      if (favorites[t.getAttribute('data-src')]) t.classList.add('is-favorite');
      t.addEventListener('click', function () {
        openAt(visibleTiles().indexOf(t));
      });
      t.addEventListener('contextmenu', function (e) {
        e.preventDefault();
        toggleFav(t);
      });
    });

    /* heart button in lightbox */
    if (lb && !lb.querySelector('.photo-lb-fav')) {
      var favBtn = document.createElement('button');
      favBtn.type = 'button';
      favBtn.className = 'photo-lb-fav';
      favBtn.title = 'Favorite';
      favBtn.textContent = '★';
      lb.appendChild(favBtn);
      favBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        var vis = visibleTiles();
        var t = vis[idx];
        if (t) {
          toggleFav(t);
          openAt(idx);
        }
      });
    }

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
    document.addEventListener('keydown', function onKey(e) {
      if (!el.isConnected) {
        document.removeEventListener('keydown', onKey);
        return;
      }
      if (!lb || lb.hidden) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        openAt(idx - 1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        openAt(idx + 1);
      } else if (e.key === 'Escape') {
        lb.hidden = true;
        lb.classList.remove('is-open');
      } else if (e.key === 'f' || e.key === 'F') {
        var vis = visibleTiles();
        if (vis[idx]) toggleFav(vis[idx]);
      }
    });

    el.querySelectorAll('.photos-sidebar .app-sidebar-item, [data-nav]').forEach(function (nav) {
      nav.addEventListener('click', function () {
        el.querySelectorAll('.photos-sidebar .app-sidebar-item').forEach(function (n) {
          n.classList.remove('active');
        });
        nav.classList.add('active');
        var id = nav.getAttribute('data-nav');
        tiles.forEach(function (t, i) {
          var show = true;
          if (id === 'favorites') show = !!favorites[t.getAttribute('data-src')];
          else if (id === 'recents') show = i >= tiles.length - 8;
          t.style.display = show ? '' : 'none';
        });
        var head = el.querySelector('.photos-section-head h2');
        var count = el.querySelector('.photos-section-head .muted');
        var n = visibleTiles().length;
        if (head) {
          head.textContent =
            id === 'favorites' ? 'Favorites' : id === 'recents' ? 'Recents' : 'Funny Collection';
        }
        if (count) count.textContent = n + ' Photo' + (n === 1 ? '' : 's');
        sound('tink');
      });
    });

    if (search) {
      search.addEventListener('input', function () {
        var q = search.value.toLowerCase().trim();
        tiles.forEach(function (t) {
          var title = (t.getAttribute('data-title') || '').toLowerCase();
          t.style.display = !q || title.indexOf(q) >= 0 ? '' : 'none';
        });
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
        { icon: '📹', name: 'FaceTime', app: 'facetime' },
        { icon: '🎛', name: 'Controls', app: 'control' },
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
      '<button type="button" class="iphone-dock-icon" data-iapp="phone" title="Phone">📞</button>' +
      '<button type="button" class="iphone-dock-icon" data-iapp="safari" title="Safari">🧭</button>' +
      '<button type="button" class="iphone-dock-icon" data-iapp="messages" title="Messages">💬</button>' +
      '<button type="button" class="iphone-dock-icon" data-iapp="music" title="Music">🎵</button>' +
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
    var locked = false;
    var dialBuf = '';
    var musicPlaying = false;
    var wxIdx = 0;
    var wxCities = [
      { city: 'Cupertino', temp: 68, cond: 'Foggy' },
      { city: 'Seattle', temp: 59, cond: 'Rain' },
      { city: 'Miami', temp: 86, cond: 'Sunny' },
      { city: 'Denver', temp: 64, cond: 'Clear' },
    ];

    function fmtClock() {
      var n = new Date();
      var h = n.getHours() % 12 || 12;
      var m = n.getMinutes();
      return h + ':' + (m < 10 ? '0' : '') + m;
    }

    /* live status clock */
    var clockEl = el.querySelector('.iphone-clock');
    if (clockEl) {
      var tick = function () {
        clockEl.textContent = fmtClock();
      };
      tick();
      setInterval(tick, 15000);
    }

    function goHome() {
      locked = false;
      if (home) home.hidden = false;
      if (view) {
        view.hidden = true;
        view.innerHTML = '';
      }
      if (dock) dock.style.display = '';
      sound('pop');
    }

    function photoGridHtml() {
      var html = '';
      for (var i = 1; i <= 20; i++) {
        var n = i < 10 ? '0' + i : String(i);
        html += '<img src="assets/photos/funny/funny-' + n + '.jpg" alt="" data-i="' + i + '" />';
      }
      return html;
    }

    function wireAppChrome() {
      if (!view) return;
      /* Phone keypad */
      var disp = view.querySelector('#iphone-dial-disp');
      view.querySelectorAll('.iapp-key[data-k]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          dialBuf += btn.getAttribute('data-k') || '';
          if (disp) disp.textContent = dialBuf;
          sound('volume');
        });
      });
      var del = view.querySelector('#iphone-dial-del');
      if (del) {
        del.addEventListener('click', function () {
          dialBuf = dialBuf.slice(0, -1);
          if (disp) disp.textContent = dialBuf || ' ';
          sound('pop');
        });
      }
      var call = view.querySelector('.iapp-call');
      if (call) {
        call.addEventListener('click', function () {
          var num = dialBuf || '555-0100';
          call.textContent = 'End';
          call.classList.add('is-on-call');
          sound('submarine');
          if (global.MacShell && MacShell.notify) {
            MacShell.notify('Phone', 'Calling…', num, 'now');
          }
          setTimeout(function () {
            call.textContent = 'Call';
            call.classList.remove('is-on-call');
            sound('pop');
          }, 2800);
        });
      }
      /* Messages */
      var send = view.querySelector('#iphone-msg-send');
      var min = view.querySelector('#iphone-msg-in');
      function sendMsg() {
        if (!min || !min.value.trim()) return;
        var th = view.querySelector('.iapp-thread');
        if (!th) return;
        var b = document.createElement('div');
        b.className = 'bubble me';
        b.textContent = min.value.trim();
        th.appendChild(b);
        min.value = '';
        th.scrollTop = th.scrollHeight;
        sound('messageSent');
        setTimeout(function () {
          var r = document.createElement('div');
          r.className = 'bubble them';
          r.textContent = 'Got it on iPhone 👍';
          th.appendChild(r);
          th.scrollTop = th.scrollHeight;
          sound('messageReceived');
        }, 800);
      }
      if (send) send.addEventListener('click', sendMsg);
      if (min) {
        min.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') {
            e.preventDefault();
            sendMsg();
          }
        });
      }
      /* Camera */
      var shutter = view.querySelector('#iphone-shutter');
      if (shutter) {
        shutter.addEventListener('click', function () {
          sound('tink');
          shutter.classList.add('flash');
          var vf = view.querySelector('.iapp-viewfinder');
          if (vf) {
            var n = 1 + Math.floor(Math.random() * 20);
            var nn = n < 10 ? '0' + n : String(n);
            vf.style.backgroundImage = 'url(assets/photos/funny/funny-' + nn + '.jpg)';
            vf.style.backgroundSize = 'cover';
          }
          setTimeout(function () {
            shutter.classList.remove('flash');
          }, 200);
          if (global.MacShell && MacShell.notify) {
            MacShell.notify('Camera', 'Photo saved', 'Library · Recents', 'now');
          }
        });
      }
      /* Photos lightbox-ish */
      view.querySelectorAll('.iapp-photo-grid img').forEach(function (img) {
        img.addEventListener('click', function () {
          var lb = view.querySelector('.iapp-photo-lb');
          if (!lb) {
            lb = document.createElement('div');
            lb.className = 'iapp-photo-lb';
            lb.innerHTML = '<img alt="" /><button type="button" class="iapp-lb-close">Close</button>';
            view.appendChild(lb);
            lb.querySelector('.iapp-lb-close').addEventListener('click', function () {
              lb.hidden = true;
            });
            lb.addEventListener('click', function (e) {
              if (e.target === lb) lb.hidden = true;
            });
          }
          lb.querySelector('img').src = img.src;
          lb.hidden = false;
          sound('pop');
        });
      });
      /* Safari */
      var urlIn = view.querySelector('.iapp-url');
      var web = view.querySelector('.iapp-web');
      function navSafari() {
        if (!urlIn || !web) return;
        var u = (urlIn.value || '').trim() || 'apple.com';
        if (!/^https?:/i.test(u) && u.indexOf('.') > 0) u = 'https://' + u;
        web.innerHTML =
          '<div class="iapp-web-card"><strong></strong><p class="muted">Loaded on iPhone Safari (demo)</p><p class="iapp-web-url"></p></div>';
        web.querySelector('strong').textContent = u.replace(/^https?:\/\//, '').split('/')[0];
        web.querySelector('.iapp-web-url').textContent = u;
        sound('pop');
      }
      if (urlIn) {
        urlIn.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') {
            e.preventDefault();
            navSafari();
          }
        });
      }
      var goBtn = view.querySelector('#iphone-safari-go');
      if (goBtn) goBtn.addEventListener('click', navSafari);
      /* Music */
      var play = view.querySelector('#iphone-play');
      if (play) {
        play.addEventListener('click', function () {
          musicPlaying = !musicPlaying;
          play.textContent = musicPlaying ? 'Pause' : 'Play';
          sound(musicPlaying ? 'funk' : 'tink');
        });
      }
      var skip = view.querySelector('#iphone-skip');
      if (skip) {
        skip.addEventListener('click', function () {
          var now = view.querySelector('.iapp-now');
          var tracks = ['Liquid Glass · Ensemble', 'Focus Flow · Demo', 'Weekend · Chill Mix', 'Neon Dock · Lo-Fi'];
          if (now) now.textContent = tracks[Math.floor(Math.random() * tracks.length)];
          sound('pop');
        });
      }
      /* Weather */
      var wxTap = view.querySelector('.iapp-weather');
      if (wxTap) {
        wxTap.style.cursor = 'pointer';
        wxTap.addEventListener('click', function () {
          wxIdx = (wxIdx + 1) % wxCities.length;
          var c = wxCities[wxIdx];
          var t = view.querySelector('.iapp-wx-city');
          var temp = view.querySelector('.iapp-bigtime');
          var cond = view.querySelector('.iapp-wx-cond');
          if (t) t.textContent = c.city;
          if (temp) temp.textContent = c.temp + '°';
          if (cond) cond.textContent = c.cond;
          sound('pop');
        });
      }
      /* Settings rows */
      view.querySelectorAll('.iapp-row[data-toggle]').forEach(function (row) {
        row.addEventListener('click', function () {
          row.classList.toggle('is-on');
          var val = row.querySelector('.iapp-row-val');
          if (val) val.textContent = row.classList.contains('is-on') ? 'On' : 'Off';
          sound('tink');
        });
      });
      /* Mail open */
      view.querySelectorAll('.iapp-mail-item').forEach(function (item) {
        item.addEventListener('click', function () {
          view.querySelectorAll('.iapp-mail-item').forEach(function (x) {
            x.classList.remove('is-active');
          });
          item.classList.add('is-active');
          sound('pop');
        });
      });
      /* Maps search */
      var mapSearch = view.querySelector('#iphone-map-search');
      var mapCanvas = view.querySelector('.iapp-map-canvas');
      if (mapSearch && mapCanvas) {
        mapSearch.addEventListener('keydown', function (e) {
          if (e.key !== 'Enter') return;
          e.preventDefault();
          var q = mapSearch.value.trim() || 'Apple Park';
          mapCanvas.innerHTML = '<div class="iapp-map-pin">📍</div><p></p>';
          mapCanvas.querySelector('p').textContent = q;
          sound('pop');
        });
      }
      /* Clock live */
      var big = view.querySelector('.iapp-clock .iapp-bigtime');
      if (big) {
        big.textContent = fmtClock();
      }
      /* Notes autosave toast */
      var note = view.querySelector('.iapp-note');
      if (note) {
        var noteTimer;
        note.addEventListener('input', function () {
          clearTimeout(noteTimer);
          noteTimer = setTimeout(function () {
            sound('tink');
          }, 600);
        });
      }
      /* Control Center tiles */
      view.querySelectorAll('.icc-tile').forEach(function (tile) {
        tile.addEventListener('click', function () {
          tile.classList.toggle('is-active');
          sound('pop');
        });
      });
      /* FaceTime */
      var ft = view.querySelector('#iphone-ft-call');
      if (ft) {
        ft.addEventListener('click', function () {
          var st = view.querySelector('.iapp-ft-status');
          if (st) st.textContent = 'Connected · 00:08';
          sound('submarine');
        });
      }
    }

    function openIApp(id) {
      if (!view) return;
      if (locked && id !== 'lock') return;
      locked = false;
      if (home) home.hidden = true;
      if (dock) dock.style.display = 'none';
      view.hidden = false;
      dialBuf = '';
      var photoImgs = photoGridHtml();
      var screens = {
        phone:
          '<div class="iapp-phone"><div class="iapp-nav"><button type="button" class="iapp-back" data-back>‹</button><div class="iapp-title">Phone</div></div>' +
          '<div class="iapp-dial-disp" id="iphone-dial-disp"> </div>' +
          '<div class="iapp-keypad">' +
          '123456789*0#'.split('').map(function (k) {
            return '<button type="button" class="iapp-key" data-k="' + k + '">' + k + '</button>';
          }).join('') +
          '</div><div class="iapp-phone-actions"><button type="button" class="iapp-call">Call</button>' +
          '<button type="button" class="btn-glass" id="iphone-dial-del">Delete</button></div></div>',
        messages:
          '<div class="iapp-msg"><div class="iapp-nav"><button type="button" class="iapp-back" data-back>‹</button><div class="iapp-title">Messages</div></div>' +
          '<div class="iapp-thread">' +
          '<div class="bubble them">Hey from iPhone!</div><div class="bubble me">Mirroring works ✨</div></div>' +
          '<div class="iapp-compose"><input placeholder="iMessage" id="iphone-msg-in" autocomplete="off" /><button type="button" id="iphone-msg-send">↑</button></div></div>',
        camera:
          '<div class="iapp-camera"><div class="iapp-nav"><button type="button" class="iapp-back" data-back>‹</button><div class="iapp-title">Camera</div></div>' +
          '<div class="iapp-viewfinder"></div><button type="button" class="iapp-shutter" id="iphone-shutter" aria-label="Shutter"></button><p class="muted">Tap shutter · photo lands in Recents</p></div>',
        photos:
          '<div class="iapp-photos"><div class="iapp-nav"><button type="button" class="iapp-back" data-back>‹</button><div class="iapp-title">Photos</div></div>' +
          '<div class="iapp-photo-grid">' +
          photoImgs +
          '</div></div>',
        settings:
          '<div class="iapp-settings"><div class="iapp-nav"><button type="button" class="iapp-back" data-back>‹</button><div class="iapp-title">Settings</div></div>' +
          '<div class="iapp-row" data-toggle><span>Wi‑Fi</span><span class="iapp-row-val">On</span></div>' +
          '<div class="iapp-row" data-toggle><span>Bluetooth</span><span class="iapp-row-val">On</span></div>' +
          '<div class="iapp-row" data-toggle><span>Airplane Mode</span><span class="iapp-row-val">Off</span></div>' +
          '<div class="iapp-row"><span>Display</span><span class="iapp-row-val">Light</span></div>' +
          '<div class="iapp-row"><span>Sounds</span><span class="iapp-row-val">Default</span></div></div>',
        safari:
          '<div class="iapp-safari"><div class="iapp-nav"><button type="button" class="iapp-back" data-back>‹</button><div class="iapp-title">Safari</div></div>' +
          '<div class="iapp-url-row"><input class="iapp-url" value="apple.com" spellcheck="false" /><button type="button" class="btn-glass" id="iphone-safari-go">Go</button></div>' +
          '<div class="iapp-web muted"><div class="iapp-web-card"><strong>Start Page</strong><p class="muted">Enter a site and press Go</p></div></div></div>',
        music:
          '<div class="iapp-music"><div class="iapp-nav"><button type="button" class="iapp-back" data-back>‹</button><div class="iapp-title">Music</div></div>' +
          '<div class="iapp-art" aria-hidden="true">♪</div><div class="iapp-now">Liquid Glass · Ensemble</div>' +
          '<div class="iapp-music-btns"><button type="button" class="btn-primary" id="iphone-play">Play</button>' +
          '<button type="button" class="btn-glass" id="iphone-skip">Next</button></div></div>',
        maps:
          '<div class="iapp-maps"><div class="iapp-nav"><button type="button" class="iapp-back" data-back>‹</button><div class="iapp-title">Maps</div></div>' +
          '<input class="iapp-url" id="iphone-map-search" placeholder="Search Maps" value="Apple Park" />' +
          '<div class="iapp-map-canvas"><div class="iapp-map-pin">📍</div><p>Apple Park</p></div></div>',
        mail:
          '<div class="iapp-mail"><div class="iapp-nav"><button type="button" class="iapp-back" data-back>‹</button><div class="iapp-title">Mail</div></div>' +
          '<div class="iapp-mail-item is-active"><strong>Design Weekly</strong><span class="muted">Liquid Glass roundup</span></div>' +
          '<div class="iapp-mail-item"><strong>App Store</strong><span class="muted">Your receipt</span></div>' +
          '<div class="iapp-mail-item"><strong>Team</strong><span class="muted">Ship checklist</span></div></div>',
        clock:
          '<div class="iapp-clock"><div class="iapp-nav"><button type="button" class="iapp-back" data-back>‹</button><div class="iapp-title">Clock</div></div>' +
          '<div class="iapp-bigtime">' +
          fmtClock() +
          '</div><div class="muted">Local · World Clock</div>' +
          '<div class="iapp-row"><span>Cupertino</span><span class="iapp-row-val">−0h</span></div>' +
          '<div class="iapp-row"><span>London</span><span class="iapp-row-val">+8h</span></div></div>',
        weather:
          '<div class="iapp-weather"><div class="iapp-nav"><button type="button" class="iapp-back" data-back>‹</button><div class="iapp-title">Weather</div></div>' +
          '<div class="iapp-wx-city">Cupertino</div><div class="iapp-bigtime">68°</div><div class="muted iapp-wx-cond">Foggy</div>' +
          '<p class="muted" style="margin-top:12px">Tap to cycle cities</p></div>',
        notes:
          '<div class="iapp-notes"><div class="iapp-nav"><button type="button" class="iapp-back" data-back>‹</button><div class="iapp-title">Notes</div></div>' +
          '<textarea class="iapp-note" placeholder="Quick note…">Quick note from iPhone…</textarea></div>',
        facetime:
          '<div class="iapp-ft"><div class="iapp-nav"><button type="button" class="iapp-back" data-back>‹</button><div class="iapp-title">FaceTime</div></div>' +
          '<div class="iapp-ft-preview"></div><p class="iapp-ft-status muted">Ready</p>' +
          '<button type="button" class="btn-primary" id="iphone-ft-call">Video Call</button></div>',
        control:
          '<div class="iapp-cc"><div class="iapp-nav"><button type="button" class="iapp-back" data-back>‹</button><div class="iapp-title">Control Center</div></div>' +
          '<div class="icc-grid">' +
          '<button type="button" class="icc-tile is-active">Wi‑Fi</button>' +
          '<button type="button" class="icc-tile is-active">Bluetooth</button>' +
          '<button type="button" class="icc-tile">AirDrop</button>' +
          '<button type="button" class="icc-tile">Focus</button>' +
          '<button type="button" class="icc-tile">Flashlight</button>' +
          '<button type="button" class="icc-tile">Camera</button>' +
          '</div></div>',
      };
      view.innerHTML =
        screens[id] ||
        '<div class="iapp-nav"><button type="button" class="iapp-back" data-back>‹</button><div class="iapp-title">' +
          id +
          '</div></div><p class="muted">App placeholder</p>';
      sound('pop');
      wireAppChrome();
      var back = view.querySelector('[data-back]');
      if (back) back.addEventListener('click', goHome);
    }

    el.querySelectorAll('.iphone-icon, .iphone-dock-icon').forEach(function (btn) {
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
        locked = true;
        if (view) {
          view.hidden = false;
          view.innerHTML =
            '<div class="iphone-lockscreen"><div class="iapp-bigtime">' +
            fmtClock() +
            '</div><div class="muted">Home to unlock</div>' +
            '<button type="button" class="btn-primary" data-unlock>Unlock</button></div>';
          var un = view.querySelector('[data-unlock]');
          if (un) un.addEventListener('click', goHome);
        }
        if (home) home.hidden = true;
        if (dock) dock.style.display = 'none';
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
    /* extra caption actions */
    var cap = el.querySelector('.device-actions');
    if (cap && !cap.querySelector('#iphone-cc')) {
      var ccBtn = document.createElement('button');
      ccBtn.type = 'button';
      ccBtn.className = 'btn-glass';
      ccBtn.id = 'iphone-cc';
      ccBtn.textContent = 'CC';
      cap.insertBefore(ccBtn, homeBtn || null);
      ccBtn.addEventListener('click', function () {
        openIApp('control');
      });
    }
    if (cap && !cap.querySelector('#iphone-ft')) {
      var ftBtn = document.createElement('button');
      ftBtn.type = 'button';
      ftBtn.className = 'btn-glass';
      ftBtn.id = 'iphone-ft';
      ftBtn.textContent = 'FaceTime';
      cap.insertBefore(ftBtn, homeBtn || null);
      ftBtn.addEventListener('click', function () {
        openIApp('facetime');
      });
    }
  }

  /* ── Sidecar iPad ───────────────────────────────────── */
  function sidecarHTML() {
    return (
      '<div class="device-stage sidecar-stage">' +
      '<div class="ipad-bezel">' +
      '<div class="ipad-screen">' +
      '<div class="ipad-menubar"><span class="ipad-status-dot is-on"></span><span>Sidecar · Connected</span><span class="ipad-clock">9:41</span></div>' +
      '<div class="ipad-main">' +
      '<div class="ipad-sidebar">' +
      '<button type="button" data-tool="pen" class="is-active" title="Pen">✏️</button>' +
      '<button type="button" data-tool="marker" title="Marker">🖊️</button>' +
      '<button type="button" data-tool="highlighter" title="Highlighter">🖍</button>' +
      '<button type="button" data-tool="eraser" title="Eraser">🧽</button>' +
      '<button type="button" data-tool="undo" title="Undo">↩</button>' +
      '<button type="button" data-tool="clear" title="Clear">🗑</button>' +
      '<div class="ipad-swatches">' +
      '<button type="button" class="ipad-swatch is-active" data-color="#1d1d1f" style="background:#1d1d1f" title="Black"></button>' +
      '<button type="button" class="ipad-swatch" data-color="#0a84ff" style="background:#0a84ff" title="Blue"></button>' +
      '<button type="button" class="ipad-swatch" data-color="#ff3b30" style="background:#ff3b30" title="Red"></button>' +
      '<button type="button" class="ipad-swatch" data-color="#30d158" style="background:#30d158" title="Green"></button>' +
      '<button type="button" class="ipad-swatch" data-color="#bf5af2" style="background:#bf5af2" title="Purple"></button>' +
      '</div></div>' +
      '<div class="ipad-canvas-wrap">' +
      '<div class="ipad-extended">' +
      '<div class="ipad-win">' +
      '<div class="ipad-win-tb"><span class="ipad-dots"></span><span>Extended Desktop</span></div>' +
      '<p class="muted">Drag windows here · Continuity Sketch</p>' +
      '</div></div>' +
      '<canvas id="sidecar-draw" width="720" height="420" aria-label="Sidecar sketch"></canvas>' +
      '<p class="ipad-hint">Apple Pencil simulation · draw on the canvas</p>' +
      '</div></div></div></div>' +
      '<div class="device-caption">' +
      '<strong>Sidecar</strong><span class="muted ipad-conn-label">iPad as second display · Connected</span>' +
      '<div class="device-actions">' +
      '<button type="button" class="btn-glass" id="sidecar-disconnect">Disconnect</button>' +
      '<button type="button" class="btn-glass" id="sidecar-mirror">Mirror</button>' +
      '<button type="button" class="btn-primary" id="sidecar-extend">Extend</button>' +
      '</div></div></div>'
    );
  }

  function wireSidecar(el) {
    if (!el || el.dataset.wired) return;
    el.dataset.wired = '1';
    var canvas = el.querySelector('#sidecar-draw');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    function blank() {
      ctx.fillStyle = '#f5f5f7';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    blank();
    ctx.strokeStyle = '#1d1d1f';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    var drawing = false;
    var tool = 'pen';
    var color = '#1d1d1f';
    var connected = true;
    var history = [];
    var maxHist = 20;

    function snapshot() {
      try {
        history.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
        if (history.length > maxHist) history.shift();
      } catch (e) {}
    }
    snapshot();

    function pos(e) {
      var r = canvas.getBoundingClientRect();
      var sx = canvas.width / r.width;
      var sy = canvas.height / r.height;
      return { x: (e.clientX - r.left) * sx, y: (e.clientY - r.top) * sy };
    }

    function setToolStyles() {
      if (tool === 'marker') {
        ctx.strokeStyle = color;
        ctx.lineWidth = 8;
        ctx.globalAlpha = 0.85;
      } else if (tool === 'highlighter') {
        ctx.strokeStyle = color;
        ctx.lineWidth = 16;
        ctx.globalAlpha = 0.28;
      } else {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.globalAlpha = 1;
      }
    }

    canvas.addEventListener('pointerdown', function (e) {
      if (!connected) return;
      drawing = true;
      canvas.setPointerCapture(e.pointerId);
      snapshot();
      var p = pos(e);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      setToolStyles();
      sound('pop');
    });
    canvas.addEventListener('pointermove', function (e) {
      if (!drawing || !connected) return;
      var p = pos(e);
      if (tool === 'eraser') {
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#f5f5f7';
        ctx.fillRect(p.x - 14, p.y - 14, 28, 28);
      } else {
        setToolStyles();
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
      }
    });
    canvas.addEventListener('pointerup', function () {
      drawing = false;
      ctx.globalAlpha = 1;
    });

    el.querySelectorAll('[data-tool]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var t = btn.getAttribute('data-tool');
        if (t === 'clear') {
          snapshot();
          blank();
          sound('emptyTrash');
          return;
        }
        if (t === 'undo') {
          if (history.length > 1) {
            history.pop();
            ctx.putImageData(history[history.length - 1], 0, 0);
            sound('tink');
          } else sound('sosumi');
          return;
        }
        el.querySelectorAll('[data-tool]').forEach(function (b) {
          if (b.getAttribute('data-tool') !== 'clear' && b.getAttribute('data-tool') !== 'undo') {
            b.classList.remove('is-active');
          }
        });
        btn.classList.add('is-active');
        tool = t;
        sound('tink');
      });
    });

    el.querySelectorAll('.ipad-swatch').forEach(function (s) {
      s.addEventListener('click', function () {
        el.querySelectorAll('.ipad-swatch').forEach(function (x) {
          x.classList.remove('is-active');
        });
        s.classList.add('is-active');
        color = s.getAttribute('data-color') || '#1d1d1f';
        sound('pop');
      });
    });

    function setConnected(on) {
      connected = on;
      var dot = el.querySelector('.ipad-status-dot');
      var label = el.querySelector('.ipad-conn-label');
      var bar = el.querySelector('.ipad-menubar span:nth-child(2)');
      if (dot) dot.classList.toggle('is-on', on);
      if (label) label.textContent = on ? 'iPad as second display · Connected' : 'Disconnected';
      if (bar) bar.textContent = on ? 'Sidecar · Connected' : 'Sidecar · Off';
      canvas.style.opacity = on ? '1' : '0.45';
      canvas.style.pointerEvents = on ? '' : 'none';
    }

    var disc = el.querySelector('#sidecar-disconnect');
    if (disc) {
      disc.addEventListener('click', function () {
        setConnected(!connected);
        disc.textContent = connected ? 'Disconnect' : 'Connect';
        sound(connected ? 'hero' : 'purr');
        if (global.MacShell && MacShell.notify) {
          MacShell.notify('Sidecar', connected ? 'Connected' : 'Disconnected', 'iPad display', 'now');
        }
      });
    }
    var mirror = el.querySelector('#sidecar-mirror');
    if (mirror) {
      mirror.addEventListener('click', function () {
        el.classList.add('is-mirror');
        el.classList.remove('is-extend');
        sound('pop');
        if (global.MacShell && MacShell.notify) {
          MacShell.notify('Sidecar', 'Mirror', 'Mirroring main display', 'now');
        }
      });
    }
    var extend = el.querySelector('#sidecar-extend');
    if (extend) {
      extend.addEventListener('click', function () {
        el.classList.add('is-extend');
        el.classList.remove('is-mirror');
        sound('hero');
        if (global.MacShell && MacShell.notify) {
          MacShell.notify('Sidecar', 'Extend', 'Using as extended desktop', 'now');
        }
      });
    }

    var clock = el.querySelector('.ipad-clock');
    if (clock) {
      var tick = function () {
        var n = new Date();
        var h = n.getHours() % 12 || 12;
        var m = n.getMinutes();
        clock.textContent = h + ':' + (m < 10 ? '0' : '') + m;
      };
      tick();
      setInterval(tick, 30000);
    }
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

    if (body) {
      if (!body.getAttribute('contenteditable')) body.setAttribute('contenteditable', 'true');
      body.addEventListener('input', function () {
        var meta = el.querySelector('.notes27-item.selected .notes27-item-meta');
        if (!meta) return;
        var plain = (body.innerText || '').trim().replace(/\s+/g, ' ');
        var preview = plain.length > 48 ? plain.slice(0, 48) + '…' : plain || 'Start typing…';
        var timeSpan = meta.querySelector('span');
        var time = timeSpan ? timeSpan.textContent : 'Just now';
        meta.innerHTML = '<span></span> ';
        meta.querySelector('span').textContent = time;
        meta.appendChild(document.createTextNode(preview));
      });
    }
  }

  /* ── Calendar: month nav, views, events ─────────────── */
  function wireCalendar(el) {
    if (!el || el.dataset.wired) return;
    el.dataset.wired = '1';
    var monthNames = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    var year = 2026;
    var month = 3; /* April 0-based */
    var titleEl = el.querySelector('.cal27-month-title');
    var gridEl = el.querySelector('.cal27-grid');

    function daysInMonth(y, m) {
      return new Date(y, m + 1, 0).getDate();
    }
    function startPad(y, m) {
      return new Date(y, m, 1).getDay();
    }
    function renderMonth() {
      if (!gridEl) return;
      var dim = daysInMonth(year, month);
      var pad = startPad(year, month);
      var prevDim = daysInMonth(year, month === 0 ? 11 : month - 1);
      var html = '';
      var i;
      for (i = 0; i < pad; i++) {
        var dn = prevDim - pad + i + 1;
        html +=
          '<div class="cal27-cell muted"><div class="cal27-num">' +
          dn +
          '</div><div class="cal27-evs"></div></div>';
      }
      var today = new Date();
      for (var d = 1; d <= dim; d++) {
        var isToday =
          today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;
        /* demo highlight: day 17 in April 2026 sample */
        if (year === 2026 && month === 3 && d === 17) isToday = true;
        html +=
          '<div class="cal27-cell' +
          (isToday ? ' today' : '') +
          '"><div class="cal27-num">' +
          d +
          '</div><div class="cal27-evs"></div></div>';
      }
      var total = pad + dim;
      var next = 1;
      while (total % 7 !== 0) {
        html +=
          '<div class="cal27-cell muted next-m"><div class="cal27-num"><span class="cal27-month-tag">' +
          monthNames[(month + 1) % 12].slice(0, 3) +
          '</span> ' +
          next +
          '</div><div class="cal27-evs"></div></div>';
        next++;
        total++;
      }
      gridEl.innerHTML = html;
      if (titleEl) titleEl.textContent = monthNames[month] + ' ' + year;
      /* click day to select */
      gridEl.querySelectorAll('.cal27-cell:not(.muted)').forEach(function (cell) {
        cell.addEventListener('click', function () {
          gridEl.querySelectorAll('.cal27-cell').forEach(function (c) {
            c.classList.remove('is-selected');
          });
          cell.classList.add('is-selected');
          sound('tink');
        });
      });
    }

    el.querySelectorAll('.cal27-seg-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        el.querySelectorAll('.cal27-seg-btn').forEach(function (b) {
          b.classList.remove('is-active');
        });
        btn.classList.add('is-active');
        sound('pop');
        var view = (btn.textContent || '').trim();
        if (view === 'Month') {
          var wrap = el.querySelector('.cal27-grid-wrap');
          if (wrap) wrap.style.display = '';
          if (titleEl) titleEl.textContent = monthNames[month] + ' ' + year;
        } else if (global.MacShell && MacShell.notify) {
          MacShell.notify('Calendar', view + ' view', 'Showing ' + view + ' layout (demo)', 'now');
        }
      });
    });
    var todayBtn = el.querySelector('.cal27-today');
    if (todayBtn) {
      todayBtn.addEventListener('click', function () {
        var now = new Date();
        year = now.getFullYear();
        month = now.getMonth();
        renderMonth();
        sound('tink');
      });
    }
    function addEventToCell(name, cell) {
      if (!cell) return;
      var ev = document.createElement('div');
      ev.className = 'cal27-ev timed blue';
      ev.innerHTML =
        '<span class="cal27-ev-bar"></span><span class="cal27-ev-t"></span><span class="cal27-ev-time">Now</span>';
      ev.querySelector('.cal27-ev-t').textContent = name;
      cell.insertBefore(ev, cell.firstChild);
      sound('hero');
      if (global.MacShell && MacShell.notify) {
        MacShell.notify('Calendar', 'Event added', name, 'now');
      }
    }

    var add = el.querySelector('.cal27-icon-btn.plus');
    if (add) {
      add.addEventListener('click', function () {
        var cell =
          el.querySelector('.cal27-cell.is-selected .cal27-evs') ||
          el.querySelector('.cal27-cell.today .cal27-evs') ||
          el.querySelector('.cal27-cell:not(.muted) .cal27-evs');
        /* inline sheet instead of prompt */
        var existing = el.querySelector('.cal-new-event');
        if (existing) {
          existing.remove();
          return;
        }
        var sheet = document.createElement('div');
        sheet.className = 'cal-new-event';
        sheet.innerHTML =
          '<strong>New Event</strong>' +
          '<input type="text" class="cal-new-input" placeholder="Event title" maxlength="80" value="New Event" />' +
          '<div class="cal-new-actions">' +
          '<button type="button" class="btn-glass cal-new-cancel">Cancel</button>' +
          '<button type="button" class="btn-primary cal-new-ok">Add</button></div>';
        el.appendChild(sheet);
        var input = sheet.querySelector('.cal-new-input');
        if (input) {
          input.focus();
          input.select();
        }
        function commit() {
          var name = (input && input.value.trim()) || 'New Event';
          sheet.remove();
          addEventToCell(name, cell);
        }
        sheet.querySelector('.cal-new-ok').addEventListener('click', commit);
        sheet.querySelector('.cal-new-cancel').addEventListener('click', function () {
          sheet.remove();
        });
        if (input) {
          input.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
              e.preventDefault();
              commit();
            } else if (e.key === 'Escape') sheet.remove();
          });
        }
      });
    }
    var navs = el.querySelectorAll('.cal27-nav');
    if (navs[0]) {
      navs[0].addEventListener('click', function () {
        month--;
        if (month < 0) {
          month = 11;
          year--;
        }
        renderMonth();
        sound('pop');
      });
    }
    if (navs[1]) {
      navs[1].addEventListener('click', function () {
        month++;
        if (month > 11) {
          month = 0;
          year++;
        }
        renderMonth();
        sound('pop');
      });
    }
    /* initial: keep dense April sample until first nav */
    el.querySelectorAll('.cal27-cell:not(.muted)').forEach(function (cell) {
      cell.addEventListener('click', function () {
        el.querySelectorAll('.cal27-cell').forEach(function (c) {
          c.classList.remove('is-selected');
        });
        cell.classList.add('is-selected');
      });
    });
  }

  /* ── Maps: search, modes, zoom ──────────────────────── */
  function wireMaps(el) {
    if (!el || el.dataset.wired) return;
    el.dataset.wired = '1';
    var search = el.querySelector('.maps27-search');
    var cardTitle = el.querySelector('.maps27-card-info strong');
    var cardSub = el.querySelector('.maps27-card-info .muted, .maps27-card-info p');
    var pin = el.querySelector('.maps27-pin');
    var places = {
      'apple park': { sub: 'Cupertino · Infinite Loop area', x: 48, y: 42 },
      coffee: { sub: 'Nearby cafés', x: 36, y: 55 },
      park: { sub: 'City park · Open space', x: 62, y: 38 },
      airport: { sub: 'International Airport', x: 22, y: 60 },
    };
    function go(q) {
      if (!q) return;
      var key = q.toLowerCase();
      var hit = null;
      Object.keys(places).forEach(function (k) {
        if (key.indexOf(k) >= 0) hit = places[k];
      });
      if (cardTitle) cardTitle.textContent = q;
      if (cardSub) cardSub.textContent = hit ? hit.sub : 'Search result · demo location';
      if (pin) {
        pin.style.left = (hit ? hit.x : 30 + Math.random() * 40) + '%';
        pin.style.top = (hit ? hit.y : 30 + Math.random() * 40) + '%';
        pin.classList.add('is-bounce');
        setTimeout(function () {
          pin.classList.remove('is-bounce');
        }, 400);
      }
      sound('pop');
      if (global.MacShell && MacShell.notify) {
        MacShell.notify('Maps', 'Location', q, 'now');
      }
    }
    if (search) {
      search.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') go(search.value.trim());
      });
    }
    var searchBtn = el.querySelector('.maps27-search-btn, [aria-label="Search"]');
    if (searchBtn && search) {
      searchBtn.addEventListener('click', function () {
        go(search.value.trim() || 'Apple Park');
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
            var sec = s % 60;
            tEl.textContent = Math.floor(s / 60) + ':' + (sec < 10 ? '0' : '') + sec;
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
      card.style.cursor = 'pointer';
      function playAlbum() {
        var t = card.querySelector('strong');
        var a = card.querySelector('.muted');
        var meta = el.querySelector('.np-meta strong, .mini-player strong');
        var sub = el.querySelector('.np-meta .muted, .mini-player .muted');
        if (meta && t) meta.textContent = t.textContent;
        if (sub && a) sub.textContent = a.textContent;
        el.querySelectorAll('.album-card').forEach(function (c) {
          c.classList.remove('is-playing');
        });
        card.classList.add('is-playing');
        playing = false;
        toggle();
      }
      card.addEventListener('click', playAlbum);
      card.addEventListener('dblclick', playAlbum);
    });
    el.querySelectorAll('.music-side-item, .music27-nav, [data-music-nav]').forEach(function (nav) {
      nav.addEventListener('click', function () {
        el.querySelectorAll('.music-side-item, .music27-nav, [data-music-nav]').forEach(function (n) {
          n.classList.remove('active', 'is-active');
        });
        nav.classList.add('active');
        sound('tink');
      });
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
    var main = el.querySelector('.reminders-main');
    if (!main) return;
    var listEl = el.querySelector('#rem-items, .reminder-list');
    var titleEl = el.querySelector('#rem-title');
    var activeList = 'today';

    function refreshCounts() {
      el.querySelectorAll('.rem-list-item[data-rem-list]').forEach(function (nav) {
        var id = nav.getAttribute('data-rem-list');
        var countEl = nav.querySelector('.rem-count');
        if (!countEl) return;
        if (id === activeList && listEl) {
          var open = listEl.querySelectorAll('.reminder-item:not(.is-done)').length;
          countEl.textContent = String(open);
        } else if (id === 'all' && listEl) {
          /* leave static unless on all list */
        }
      });
      var activeNav = el.querySelector('.rem-list-item.active .rem-count');
      if (activeNav && listEl) {
        activeNav.textContent = String(listEl.querySelectorAll('.reminder-item:not(.is-done)').length);
      }
    }

    function wireItem(row) {
      var cb = row.querySelector('input[type="checkbox"]');
      if (!cb || cb.dataset.snd) return;
      cb.dataset.snd = '1';
      cb.addEventListener('change', function () {
        row.classList.toggle('is-done', cb.checked);
        var text = row.querySelector('.rem-text');
        if (text) text.classList.toggle('done', cb.checked);
        sound(cb.checked ? 'tink' : 'pop');
        refreshCounts();
      });
    }

    function startInlineAdd() {
      if (!listEl) return;
      if (listEl.querySelector('.reminder-item.is-editing')) return;
      var row = document.createElement('label');
      row.className = 'reminder-item is-editing';
      row.innerHTML =
        '<input type="checkbox" disabled /><span class="rem-circle" aria-hidden="true"></span>' +
        '<span class="rem-text"><input type="text" class="rem-inline-input" placeholder="New Reminder" maxlength="120" /></span>';
      listEl.appendChild(row);
      var input = row.querySelector('.rem-inline-input');
      if (input) {
        input.focus();
        function commit() {
          var t = (input.value || '').trim();
          if (!t) {
            row.remove();
            return;
          }
          row.classList.remove('is-editing');
          row.innerHTML =
            '<input type="checkbox" /><span class="rem-circle" aria-hidden="true"></span>' +
            '<span class="rem-text"></span>';
          row.querySelector('.rem-text').textContent = t;
          wireItem(row);
          refreshCounts();
          sound('hero');
          if (global.MacShell && MacShell.notify) {
            MacShell.notify('Reminders', 'Added', t, 'now');
          }
        }
        input.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') {
            e.preventDefault();
            commit();
          } else if (e.key === 'Escape') {
            row.remove();
          }
        });
        input.addEventListener('blur', function () {
          setTimeout(commit, 80);
        });
      }
    }

    /* Prefer registry onMount for + New Reminder; fallback if not wired */
    var add = el.querySelector('.rem-add');
    if (add && !add.dataset.wired && !add.dataset.regWired) {
      add.dataset.wired = '1';
      add.style.cursor = 'pointer';
      add.addEventListener('click', startInlineAdd);
    }

    /* After sidebar switch, re-bind checkbox sounds and refresh counts */
    el.querySelectorAll('.rem-list-item[data-rem-list]').forEach(function (nav) {
      nav.addEventListener('click', function () {
        activeList = nav.getAttribute('data-rem-list') || 'today';
        setTimeout(function () {
          listEl = el.querySelector('#rem-items, .reminder-list');
          if (listEl) {
            listEl.querySelectorAll('.reminder-item').forEach(wireItem);
          }
          refreshCounts();
        }, 0);
      });
    });

    el.querySelectorAll('.reminder-item').forEach(wireItem);
    refreshCounts();
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
    /* Open a funny photo as the preview document */
    var openPhoto = el.querySelector('[title="Open"], .preview27-tb-btn[title="Open"], #preview-open');
    function loadSamplePhoto() {
      var n = 1 + Math.floor(Math.random() * 20);
      var nn = n < 10 ? '0' + n : String(n);
      var canvas = el.querySelector('.preview27-canvas, .preview27-page');
      if (!canvas) return;
      var img = canvas.querySelector('.preview-sample-img');
      if (!img) {
        img = document.createElement('img');
        img.className = 'preview-sample-img';
        img.alt = '';
        img.style.cssText = 'max-width:100%;border-radius:8px;display:block;margin:0 auto';
        canvas.insertBefore(img, canvas.firstChild);
      }
      img.src = 'assets/photos/funny/funny-' + nn + '.jpg';
      sound('hero');
      if (global.MacShell && MacShell.notify) {
        MacShell.notify('Preview', 'Opened', 'funny-' + nn + '.jpg', 'now');
      }
    }
    if (openPhoto) openPhoto.addEventListener('click', loadSamplePhoto);
    else {
      var tb = el.querySelector('.preview27-toolbar, .preview27-tb');
      if (tb && !tb.querySelector('#preview-open')) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'preview27-tb-btn';
        btn.id = 'preview-open';
        btn.title = 'Open';
        btn.textContent = 'Open…';
        tb.appendChild(btn);
        btn.addEventListener('click', loadSamplePhoto);
      }
    }
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
          var rn = 1 + Math.floor(Math.random() * 20);
          var rnn = rn < 10 ? '0' + rn : String(rn);
          img.src = 'assets/photos/funny/funny-' + rnn + '.jpg';
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
    var remote = el.querySelector('.ft-remote');
    var calling = false;
    var muted = false;
    var videoOff = false;
    var secs = 0;
    var timer = null;
    var stream = null;

    if (selfVid && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ video: true, audio: false })
        .then(function (s) {
          stream = s;
          selfVid.srcObject = s;
          var fb = el.querySelector('.ft-self-fallback');
          if (fb) fb.style.display = 'none';
        })
        .catch(function () {});
    }

    function fmt(s) {
      var m = Math.floor(s / 60);
      var r = s % 60;
      return (m < 10 ? '0' : '') + m + ':' + (r < 10 ? '0' : '') + r;
    }

    function setCalling(on, name) {
      calling = on;
      clearInterval(timer);
      secs = 0;
      if (name && nameEl) nameEl.textContent = name;
      if (status) status.textContent = on ? 'Connecting…' : 'Ready to call';
      el.classList.toggle('is-in-call', on);
      if (remote) remote.classList.toggle('is-connected', on);
      sound(on ? 'submarine' : 'pop');
      if (on) {
        if (global.MacShell && MacShell.notify) {
          MacShell.notify('FaceTime', 'Calling', name || 'Friend', 'now');
        }
        setTimeout(function () {
          if (!calling) return;
          if (status) status.textContent = 'Connected · 00:00';
          timer = setInterval(function () {
            secs += 1;
            if (status) status.textContent = 'Connected · ' + fmt(secs);
          }, 1000);
        }, 900);
      }
    }

    el.querySelectorAll('[data-ft]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var a = btn.getAttribute('data-ft');
        if (a === 'call') setCalling(true, nameEl ? nameEl.textContent : 'Friend');
        if (a === 'end') setCalling(false);
        if (a === 'mute') {
          muted = !muted;
          btn.classList.toggle('is-active', muted);
          btn.textContent = muted ? '🔈' : '🔇';
          sound('tink');
          if (status && calling) status.textContent = (muted ? 'Muted · ' : 'Connected · ') + fmt(secs);
        }
        if (a === 'flip' || a === 'camera') {
          videoOff = !videoOff;
          btn.classList.toggle('is-active', videoOff);
          if (selfVid) selfVid.style.opacity = videoOff ? '0.15' : '1';
          if (stream) {
            stream.getVideoTracks().forEach(function (t) {
              t.enabled = !videoOff;
            });
          }
          sound('pop');
        }
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
    if (page && !page.getAttribute('contenteditable')) page.setAttribute('contenteditable', 'true');
    var docname = el.querySelector('.te27-docname');
    var dirty = false;
    var colors = ['#1d1d1f', '#0a84ff', '#ff3b30', '#30d158', '#ff9f0a', '#bf5af2'];
    var colorIdx = 0;

    function wordCount() {
      if (!page) return { words: 0, chars: 0 };
      var text = (page.innerText || '').replace(/\s+/g, ' ').trim();
      var words = text ? text.split(' ').length : 0;
      return { words: words, chars: (page.innerText || '').length };
    }

    function updateStatus() {
      var st = el.querySelector('.te27-status');
      if (!st) {
        st = document.createElement('div');
        st.className = 'te27-status';
        el.appendChild(st);
      }
      var w = wordCount();
      st.textContent =
        w.words +
        ' word' +
        (w.words === 1 ? '' : 's') +
        ' · ' +
        w.chars +
        ' characters' +
        (dirty ? ' · Edited' : '');
    }

    el.querySelectorAll('.te27-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var t = btn.getAttribute('title') || '';
        if (page) page.focus();
        if (t === 'Bold') document.execCommand('bold');
        else if (t === 'Italic') document.execCommand('italic');
        else if (t === 'Underline') document.execCommand('underline');
        else if (t === 'Align Left') document.execCommand('justifyLeft');
        else if (t === 'Align Center') document.execCommand('justifyCenter');
        else if (t === 'Align Right') document.execCommand('justifyRight');
        else if (t === 'Lists') {
          document.execCommand('insertUnorderedList');
        } else if (t === 'Text Color') {
          colorIdx = (colorIdx + 1) % colors.length;
          document.execCommand('foreColor', false, colors[colorIdx]);
        } else if (t === 'Show Ruler' || btn.hasAttribute('data-te-ruler')) {
          var ruler = el.querySelector('.te27-ruler');
          if (ruler) ruler.hidden = !ruler.hidden;
          btn.classList.toggle('is-active');
        }
        dirty = true;
        updateStatus();
        sound('tink');
      });
    });
    var font = el.querySelector('.te27-select[aria-label="Font"]');
    var size = el.querySelector('.te27-select.te27-size');
    if (font && page) {
      font.addEventListener('change', function () {
        page.style.fontFamily = font.value;
        dirty = true;
        updateStatus();
      });
    }
    if (size && page) {
      size.addEventListener('change', function () {
        page.style.fontSize = size.value + 'px';
        dirty = true;
        updateStatus();
      });
    }
    if (page) {
      page.addEventListener('input', function () {
        dirty = true;
        if (docname && docname.textContent === 'Untitled') {
          var first = (page.innerText || '').trim().split('\n')[0].slice(0, 24);
          if (first) docname.textContent = first;
        }
        updateStatus();
      });
    }

    /* Save / New controls */
    var right = el.querySelector('.te27-tb-right');
    if (right && !right.querySelector('.te27-save')) {
      var save = document.createElement('button');
      save.type = 'button';
      save.className = 'te27-btn te27-save';
      save.title = 'Save';
      save.textContent = 'Save';
      var neu = document.createElement('button');
      neu.type = 'button';
      neu.className = 'te27-btn te27-new';
      neu.title = 'New';
      neu.textContent = 'New';
      right.insertBefore(neu, right.firstChild);
      right.insertBefore(save, right.firstChild);
      save.addEventListener('click', function () {
        dirty = false;
        updateStatus();
        sound('hero');
        if (global.MacShell && MacShell.notify) {
          MacShell.notify(
            'TextEdit',
            'Saved',
            (docname && docname.textContent) || 'Untitled',
            'now'
          );
        }
      });
      neu.addEventListener('click', function () {
        if (page) page.innerHTML = '';
        if (docname) docname.textContent = 'Untitled';
        dirty = false;
        updateStatus();
        if (page) page.focus();
        sound('pop');
      });
    }
    updateStatus();
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
    /* Keyboard support when window focused */
    function pressKey(k) {
      var btn = el.querySelector('.calc-key[data-key="' + k + '"]');
      if (btn) {
        btn.classList.add('is-pressed');
        btn.click();
        setTimeout(function () {
          btn.classList.remove('is-pressed');
        }, 80);
      }
    }
    el.tabIndex = 0;
    el.addEventListener('keydown', function (e) {
      var map = {
        Enter: '=',
        '=': '=',
        Escape: 'AC',
        Backspace: 'AC',
        '/': '÷',
        '*': '×',
        '-': '−',
        '+': '+',
        '.': '.',
        '%': '%',
      };
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        pressKey(e.key);
      } else if (map[e.key]) {
        e.preventDefault();
        pressKey(map[e.key]);
      }
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
        var list = el.querySelector('.ct27-list');
        if (!list) return;
        if (list.querySelector('.ct27-row.is-editing')) return;
        var row = document.createElement('div');
        row.className = 'ct27-row is-editing is-selected';
        row.innerHTML =
          '<span class="ct27-row-av" style="--h:200">+</span>' +
          '<input type="text" class="ct27-inline-name" placeholder="Full name" maxlength="40" />';
        list.querySelectorAll('.ct27-row').forEach(function (r) {
          r.classList.remove('is-selected', 'active');
        });
        list.insertBefore(row, list.firstChild);
        var input = row.querySelector('.ct27-inline-name');
        if (input) {
          input.focus();
          var done = false;
          function commit() {
            if (done) return;
            done = true;
            var n = (input.value || '').trim() || 'New Contact';
            row.classList.remove('is-editing');
            row.innerHTML =
              '<span class="ct27-row-av" style="--h:' +
              Math.floor(Math.random() * 360) +
              '">' +
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
            row.addEventListener('click', function () {
              el.querySelectorAll('.ct27-row').forEach(function (r) {
                r.classList.remove('active', 'is-selected');
              });
              row.classList.add('active');
              var dName = el.querySelector('.ct27-name');
              var dAv = el.querySelector('.ct27-avatar');
              var av = row.querySelector('.ct27-row-av');
              if (dName) dName.textContent = n;
              if (dAv && av) {
                dAv.textContent = av.textContent;
                dAv.style.setProperty('--h', av.style.getPropertyValue('--h') || '200');
              }
              sound('pop');
            });
            row.click();
            sound('hero');
          }
          input.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
              e.preventDefault();
              commit();
            } else if (e.key === 'Escape') {
              done = true;
              row.remove();
            }
          });
          input.addEventListener('blur', function () {
            setTimeout(commit, 80);
          });
        }
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

  /* ── Stocks range chips + mild live tick ────────────── */
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
    el.querySelectorAll('.stock-row').forEach(function (row) {
      row.addEventListener('click', function () {
        sound('pop');
      });
    });
    /* Demo tick: nudge selected price slightly every few seconds */
    var iv = setInterval(function () {
      if (!el.isConnected) {
        clearInterval(iv);
        return;
      }
      var sel = el.querySelector('.stock-row.is-selected');
      if (!sel) return;
      var priceEl = sel.querySelector('.stock-price');
      var chartPrice = el.querySelector('#stock-chart-price');
      if (!priceEl) return;
      var p = parseFloat(priceEl.textContent);
      if (!isFinite(p)) return;
      var delta = (Math.random() - 0.5) * 0.4;
      var next = Math.max(1, p + delta);
      var txt = next.toFixed(2);
      priceEl.textContent = txt;
      sel.setAttribute('data-price', txt);
      if (chartPrice) chartPrice.textContent = txt;
      var up = delta >= 0;
      var chg = sel.querySelector('.stock-change');
      if (chg) {
        var pct = ((delta / p) * 100).toFixed(2);
        chg.textContent = (up ? '+' : '') + pct + '%';
        chg.classList.toggle('up', up);
        chg.classList.toggle('down', !up);
        sel.setAttribute('data-up', up ? '1' : '0');
        sel.setAttribute('data-change', chg.textContent);
        var chartChg = el.querySelector('#stock-chart-chg');
        if (chartChg) {
          chartChg.textContent = chg.textContent;
          chartChg.className = 'stock-change ' + (up ? 'up' : 'down');
        }
      }
    }, 3200);
  }

  /* ── Phone dialer ───────────────────────────────────── */
  function wirePhone(el) {
    if (!el || el.dataset.wired) return;
    el.dataset.wired = '1';
    /* Full demo dialer if stub/list only */
    if (!el.querySelector('.phone-dialer') && !el.querySelector('.phone-app')) {
      el.innerHTML =
        '<div class="phone-app">' +
        '<div class="phone-tabs">' +
        '<button type="button" class="phone-tab active" data-ptab="keypad">Keypad</button>' +
        '<button type="button" class="phone-tab" data-ptab="recents">Recents</button>' +
        '<button type="button" class="phone-tab" data-ptab="contacts">Contacts</button>' +
        '</div>' +
        '<div class="phone-pane" data-ppane="keypad">' +
        '<div class="phone-dialer">' +
        '<div class="phone-display" id="phone-display"></div>' +
        '<div class="phone-keys">' +
        '123456789*0#'.split('').map(function (k) {
          return '<button type="button" class="phone-key" data-k="' + k + '">' + k + '</button>';
        }).join('') +
        '</div>' +
        '<div class="phone-actions">' +
        '<button type="button" class="btn-glass phone-del" aria-label="Delete">⌫</button>' +
        '<button type="button" class="btn-primary phone-call">Call</button>' +
        '</div>' +
        '<p class="muted center phone-status">Phone · Ready</p></div></div>' +
        '<div class="phone-pane" data-ppane="recents" hidden>' +
        '<div class="phone-recent" data-num="5550100"><strong>Alex Chen</strong><span class="muted">Mobile · 2m · ↗</span></div>' +
        '<div class="phone-recent" data-num="5550199"><strong>Unknown</strong><span class="muted">555-0199 · ↙</span></div>' +
        '<div class="phone-recent" data-num="5550142"><strong>Blake Morgan</strong><span class="muted">Work · Yesterday</span></div>' +
        '</div>' +
        '<div class="phone-pane" data-ppane="contacts" hidden>' +
        '<div class="phone-recent" data-num="5550100"><strong>Alex Chen</strong><span class="muted">Mobile</span></div>' +
        '<div class="phone-recent" data-num="5550110"><strong>Casey Quinn</strong><span class="muted">Mobile</span></div>' +
        '<div class="phone-recent" data-num="5550166"><strong>Jordan Lee</strong><span class="muted">Mobile</span></div>' +
        '</div></div>';
    }
    var disp = el.querySelector('#phone-display, .phone-display');
    var st = el.querySelector('.phone-status');
    var calling = false;

    function appendDigit(d) {
      if (!disp || calling) return;
      if ((disp.textContent || '').length > 16) return;
      disp.textContent = (disp.textContent || '') + d;
    }

    el.querySelectorAll('.phone-key, .iapp-key').forEach(function (k) {
      k.addEventListener('click', function () {
        appendDigit(k.getAttribute('data-k') || k.textContent);
        sound('volume');
      });
    });
    var del = el.querySelector('.phone-del');
    if (del) {
      del.addEventListener('click', function () {
        if (disp) disp.textContent = (disp.textContent || '').slice(0, -1);
        sound('pop');
      });
    }
    function placeCall(num) {
      if (calling) return;
      calling = true;
      var n = num || (disp && disp.textContent) || '555-0100';
      if (disp && !disp.textContent) disp.textContent = n;
      if (st) st.textContent = 'Calling ' + n + '…';
      var callBtn = el.querySelector('.phone-call');
      if (callBtn) {
        callBtn.textContent = 'End';
        callBtn.classList.add('is-on-call');
      }
      sound('submarine');
      if (global.MacShell && MacShell.notify) {
        MacShell.notify('Phone', 'Calling…', n, 'now');
      }
      setTimeout(function () {
        calling = false;
        if (st) st.textContent = 'Call ended · ' + n;
        if (callBtn) {
          callBtn.textContent = 'Call';
          callBtn.classList.remove('is-on-call');
        }
        sound('pop');
      }, 2800);
    }
    var call = el.querySelector('.phone-call, .iapp-call');
    if (call) {
      call.addEventListener('click', function () {
        if (calling) {
          calling = false;
          if (st) st.textContent = 'Call ended';
          call.textContent = 'Call';
          call.classList.remove('is-on-call');
          sound('pop');
          return;
        }
        placeCall();
      });
    }
    el.querySelectorAll('.phone-tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        el.querySelectorAll('.phone-tab').forEach(function (t) {
          t.classList.remove('active');
        });
        tab.classList.add('active');
        var id = tab.getAttribute('data-ptab');
        el.querySelectorAll('.phone-pane').forEach(function (p) {
          p.hidden = p.getAttribute('data-ppane') !== id;
        });
        sound('tink');
      });
    });
    el.querySelectorAll('.phone-recent').forEach(function (row) {
      row.addEventListener('click', function () {
        var num = row.getAttribute('data-num') || '';
        var name = row.querySelector('strong');
        if (disp) disp.textContent = num;
        el.querySelectorAll('.phone-tab').forEach(function (t) {
          t.classList.toggle('active', t.getAttribute('data-ptab') === 'keypad');
        });
        el.querySelectorAll('.phone-pane').forEach(function (p) {
          p.hidden = p.getAttribute('data-ppane') !== 'keypad';
        });
        placeCall(num || (name && name.textContent));
      });
    });
    el.tabIndex = 0;
    el.addEventListener('keydown', function (e) {
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        appendDigit(e.key);
        sound('volume');
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        if (disp) disp.textContent = (disp.textContent || '').slice(0, -1);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        placeCall();
      }
    });
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
    var shapeCycle = ['rect', 'circle', 'diamond'];
    var shapeIdx = 0;
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
        el.querySelectorAll('.ff27-swatch').forEach(function (x) {
          x.classList.toggle('is-active', x === s);
        });
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
      return sticky;
    }

    function addShape(x, y) {
      var kind = shapeCycle[shapeIdx % shapeCycle.length];
      shapeIdx += 1;
      var shape = document.createElement('div');
      shape.className = 'ff27-shape ' + kind;
      shape.style.left = x + 'px';
      shape.style.top = y + 'px';
      canvas.appendChild(shape);
      makeDraggable(shape);
      sound('pop');
      return shape;
    }

    function addTextBox(x, y) {
      var box = document.createElement('div');
      box.className = 'ff27-text-box';
      box.style.left = x + 'px';
      box.style.top = y + 'px';
      box.innerHTML = '<strong contenteditable="true">Label</strong><p class="muted" contenteditable="true">Double-click to edit</p>';
      canvas.appendChild(box);
      makeDraggable(box);
      sound('hero');
      return box;
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
        e.stopPropagation();
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
      if (e.target.closest('.ff27-sticky, .ff27-shape, .ff27-text-box, .ff27-note, .ff27-ink')) return;
      var cr = canvas.getBoundingClientRect();
      addSticky(e.clientX - cr.left - 40, e.clientY - cr.top - 20, 'Sticky note');
    });

    /* Single-click place when sticky/shapes/text tools active */
    canvas.addEventListener('click', function (e) {
      if (e.target.closest('.ff27-sticky, .ff27-shape, .ff27-text-box, .ff27-note, .ff27-ink')) return;
      var cr = canvas.getBoundingClientRect();
      var x = e.clientX - cr.left - 30;
      var y = e.clientY - cr.top - 20;
      if (tool.indexOf('sticky') >= 0) {
        addSticky(x, y, 'New idea');
      } else if (tool.indexOf('shape') >= 0) {
        addShape(x, y);
      } else if (tool === 't' || tool.indexOf('text') >= 0) {
        addTextBox(x, y);
      }
    });

    var share = el.querySelector('.ff27-btn');
    if (share) {
      share.addEventListener('click', function () {
        sound('hero');
        if (global.MacShell && MacShell.notify) {
          MacShell.notify('Freeform', 'Shared', 'Board link copied (demo)', 'now');
        }
      });
    }

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
    var nameToId = {
      pages: 'pages',
      numbers: 'numbers',
      keynote: 'keynote',
      freeform: 'freeform',
      garageband: 'garageband',
      imovie: 'imovie',
      'final cut': 'imovie',
      xcode: 'terminal',
      'pixelmator': 'preview',
      'logic pro': 'garageband',
      notes: 'notes',
      reminders: 'reminders',
      calendar: 'calendar',
      photos: 'photos',
      music: 'music',
      podcasts: 'podcasts',
      books: 'books',
      news: 'news',
      stocks: 'stocks',
      weather: 'weather',
      maps: 'maps',
      safari: 'safari',
      mail: 'mail',
      messages: 'messages',
      chess: 'chess',
      games: 'games',
    };
    function resolveApp(title) {
      var t = (title || '').toLowerCase();
      var keys = Object.keys(nameToId);
      for (var i = 0; i < keys.length; i++) {
        if (t.indexOf(keys[i]) >= 0) return nameToId[keys[i]];
      }
      return null;
    }
    el.querySelectorAll('.btn-get, .game-play').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (btn.classList.contains('is-installed') || btn.textContent === 'OPEN') {
          var row = btn.closest('.store-row, .game-card, .store-card');
          var title = row && row.querySelector('strong');
          var id = resolveApp(title ? title.textContent : '');
          sound('pop');
          if (id && global.MacShell && MacShell.openApp) MacShell.openApp(id);
          else if (global.MacShell && MacShell.notify) {
            MacShell.notify('App Store', 'Open', title ? title.textContent : 'App', 'now');
          }
          return;
        }
        if (btn.dataset.busy) return;
        btn.dataset.busy = '1';
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
            btn.dataset.busy = '';
            sound('hero');
            if (global.MacShell && MacShell.notify) {
              var name = btn.closest('.store-row, .game-card, .store-card');
              var titleEl = name && name.querySelector('strong');
              MacShell.notify(
                'App Store',
                'Download Complete',
                titleEl ? titleEl.textContent : 'App',
                'now'
              );
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
        var section = item.textContent.trim();
        var head = el.querySelector('.store-hero h2, .app-main h2, .store-section-title');
        if (head) head.textContent = section;
      });
    });
    var search = el.querySelector('.search-field, input[type="search"]');
    if (search) {
      search.addEventListener('input', function () {
        var q = search.value.toLowerCase();
        el.querySelectorAll('.store-row, .game-card').forEach(function (row) {
          var t = (row.textContent || '').toLowerCase();
          row.style.display = !q || t.indexOf(q) >= 0 ? '' : 'none';
        });
      });
    }
  }

  /* ── Activity Monitor: select process + tabs ────────── */
  function wireActivityMonitor(el) {
    if (!el || el.dataset.wired) return;
    el.dataset.wired = '1';
    el.querySelectorAll('tbody tr, .am27-row, .am-row').forEach(function (row) {
      row.addEventListener('click', function () {
        el.querySelectorAll('tbody tr, .am27-row, .am-row').forEach(function (r) {
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
        var name = tab.getAttribute('data-am-tab') || tab.textContent;
        var summary = el.querySelector('.am27-cpu-summary');
        if (summary && !summary.dataset.base) {
          summary.dataset.base = summary.innerHTML;
        }
        if (summary) {
          summary.innerHTML =
            (summary.dataset.base || summary.innerHTML) +
            ' · <span class="muted">' +
            name +
            ' view</span>';
        }
        sound('tink');
      });
    });
    var search = el.querySelector('.am27-search');
    if (search) {
      search.addEventListener('input', function () {
        var q = search.value.toLowerCase();
        el.querySelectorAll('.am27-table tbody tr').forEach(function (row) {
          var name = (row.querySelector('.am27-col-name') || row).textContent.toLowerCase();
          row.style.display = !q || name.indexOf(q) >= 0 ? '' : 'none';
        });
      });
    }
    /* Force Quit selected process */
    var tb = el.querySelector('.am27-tb-right, .am27-toolbar');
    if (tb && !el.querySelector('#am-force-quit')) {
      var fq = document.createElement('button');
      fq.type = 'button';
      fq.className = 'btn-glass';
      fq.id = 'am-force-quit';
      fq.textContent = 'Force Quit';
      tb.appendChild(fq);
      fq.addEventListener('click', function () {
        var sel = el.querySelector('tbody tr.is-selected, .am27-row.is-selected');
        if (!sel) {
          sound('sosumi');
          return;
        }
        var nameEl = sel.querySelector('.am27-col-name');
        var name = nameEl ? nameEl.textContent.replace(/^\s*/, '').trim() : 'Process';
        if (/kernel_task|launchd|WindowServer/i.test(name)) {
          sound('sosumi');
          if (global.MacShell && MacShell.notify) {
            MacShell.notify('Activity Monitor', 'Cannot quit', name + ' is required by the system', 'now');
          }
          return;
        }
        sel.remove();
        sound('emptyTrash');
        if (global.MacShell && MacShell.notify) {
          MacShell.notify('Activity Monitor', 'Force Quit', name + ' quit', 'now');
        }
      });
    }
  }

  /* ── Generic list apps (bulk) ───────────────────────── */
  function wireGenericList(el) {
    if (!el || el.dataset.wiredGeneric) return;
    el.dataset.wiredGeneric = '1';
    var appId = el.getAttribute('data-simple-app') || '';
    el.querySelectorAll('.app-list-row, .simple-row').forEach(function (row) {
      row.style.cursor = 'pointer';
      row.addEventListener('click', function () {
        el.querySelectorAll('.app-list-row, .simple-row').forEach(function (r) {
          r.classList.remove('active', 'is-selected', 'selected');
        });
        row.classList.add('is-selected', 'active');
        var title =
          row.getAttribute('data-title') ||
          (row.querySelector('strong') && row.querySelector('strong').textContent);
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
      row.addEventListener('dblclick', function () {
        runSimplePrimary(el, appId, row);
      });
    });
    el.querySelectorAll('.app-sidebar-item').forEach(function (row) {
      row.style.cursor = 'pointer';
      row.addEventListener('click', function () {
        el.querySelectorAll('.app-sidebar-item').forEach(function (r) {
          r.classList.remove('active');
        });
        row.classList.add('active');
        sound('tink');
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
        if (act === 'primary') {
          runSimplePrimary(el, appId, sel);
          return;
        }
        /* refresh */
        sound('tink');
        if (global.MacShell && MacShell.notify) {
          MacShell.notify(appId || 'App', 'Refreshed', 'List updated (demo)', 'now');
        }
        el.querySelectorAll('.simple-row, .app-list-row').forEach(function (r) {
          r.style.display = '';
        });
        var s = el.querySelector('.simple-search');
        if (s) s.value = '';
      });
    });
  }

  function runSimplePrimary(el, appId, sel) {
    var name =
      (sel && (sel.getAttribute('data-title') || (sel.querySelector('strong') && sel.querySelector('strong').textContent))) ||
      'Item';
    sound('hero');
    var openMap = {
      games: 'chess',
      chess: 'chess',
      screenshot: null,
      siri: 'siri',
      tips: 'tips',
      'photo-booth': 'photo-booth',
      'image-capture': 'image-capture',
      'image-playground': 'image-playground',
      console: 'console',
      passwords: 'passwords',
      'find-my': 'find-my',
      journal: 'journal',
      shortcuts: 'shortcuts',
      'time-machine': 'time-machine',
      'system-information': 'system-information',
      'print-center': 'print-center',
      quicktime: 'quicktime',
      'voice-memos': 'voice-memos',
      garageband: 'garageband',
      imovie: 'imovie',
      automator: 'automator',
      'script-editor': 'script-editor',
      grapher: 'grapher',
      'keychain-access': 'keychain-access',
      'airport-utility': 'airport-utility',
      'audio-midi-setup': 'audio-midi-setup',
      'bluetooth-file-exchange': 'bluetooth-file-exchange',
      colorsync: 'colorsync',
      'digital-color-meter': 'digital-color-meter',
      'directory-utility': 'directory-utility',
      'dvd-player': 'dvd-player',
      'migration-assistant': 'migration-assistant',
      'boot-camp': 'boot-camp',
      'voiceover-utility': 'voiceover-utility',
      'font-book': 'font-book',
      dictionary: 'dictionary',
      home: 'home',
      stickies: 'stickies',
      magnifier: 'magnifier',
      phone: 'phone',
    };
    if (appId === 'screenshot' && global.MacShell && MacShell.captureScreenshot) {
      MacShell.captureScreenshot('full');
      return;
    }
    if (appId === 'games' && /chess/i.test(name) && global.MacShell && MacShell.openApp) {
      MacShell.openApp('chess');
      return;
    }
    if (global.MacShell && MacShell.notify) {
      MacShell.notify(appId || 'App', 'Open', name, 'now');
    }
    /* Re-open specialized UI if bulk stub was used */
    if (openMap[appId] && global.AppRegistry && AppRegistry.get) {
      var app = AppRegistry.get(appId);
      if (app && typeof app.open === 'function') {
        /* already in app - primary just confirms */
      }
    }
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
    var pos = 0;
    var timer = null;
    function setStatus(msg) {
      if (status) status.textContent = msg;
    }
    function setPlay(on) {
      playing = on;
      clearInterval(timer);
      if (play) play.textContent = on ? '❚❚' : '▶';
      if (on) {
        timer = setInterval(function () {
          pos += 1;
          var m = Math.floor(pos / 60);
          var s = pos % 60;
          setStatus(
            'Playing · ' +
              m +
              ':' +
              (s < 10 ? '0' : '') +
              s +
              ' · Chapter ' +
              (1 + Math.floor(pos / 30))
          );
        }, 1000);
        sound('funk');
      } else {
        sound('pop');
      }
    }
    var eject = el.querySelector('#dvd-eject');
    if (eject) {
      eject.addEventListener('click', function () {
        hasDisc = !hasDisc;
        setPlay(false);
        pos = 0;
        if (disc) disc.style.animation = hasDisc ? 'dvd-spin 3s linear infinite' : '';
        setStatus(hasDisc ? 'DVD inserted · Ready' : 'No disc · Insert a DVD to begin');
        sound(hasDisc ? 'hero' : 'emptyTrash');
      });
    }
    if (play) {
      play.addEventListener('click', function () {
        if (!hasDisc) {
          hasDisc = true;
          if (disc) disc.style.animation = 'dvd-spin 3s linear infinite';
        }
        setPlay(!playing);
        if (!playing) setStatus('Paused');
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
    var status = el.querySelector('#mig-status, #ma-status, .ma-status');
    var labels = [
      '',
      'Select transfer method',
      'Looking for Macs, Time Machine backups…',
      'Transfer complete',
    ];
    function setStep(n) {
      step = n;
      if (status) status.textContent = labels[step] || 'Step ' + step + ' of 3';
      var prog = el.querySelector('#ma-progress, .ma-progress');
      if (prog) prog.style.width = Math.min(100, ((step - 1) / 2) * 100) + '%';
    }
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
        setStep(Math.min(3, step + 1));
        sound(step === 3 ? 'hero' : 'tink');
        if (step === 3 && global.MacShell && MacShell.notify) {
          MacShell.notify('Migration Assistant', 'Complete', 'Demo migration finished', 'now');
        }
      });
    }
    var back = el.querySelector('#mig-back');
    if (back) {
      back.addEventListener('click', function () {
        setStep(Math.max(1, step - 1));
        sound('pop');
      });
    }
    el.querySelectorAll('button, .btn-primary, .btn-glass').forEach(function (btn) {
      if (btn.id === 'mig-continue' || btn.id === 'mig-back' || btn.dataset.ma) return;
      btn.dataset.ma = '1';
      btn.addEventListener('click', function () {
        var t = (btn.textContent || '').toLowerCase();
        if (/continue|next|transfer|start/i.test(t)) {
          setStep(Math.min(3, step + 1));
          sound(step === 3 ? 'hero' : 'pop');
        } else if (/back|previous/i.test(t)) {
          setStep(Math.max(1, step - 1));
          sound('tink');
        }
      });
    });
    setStep(1);
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
    var scan = el.querySelector('#ap-scan') || el.querySelector('.btn-primary');
    var list = el.querySelector('#ap-list');
    if (scan && !scan.dataset.apWired) {
      scan.dataset.apWired = '1';
      scan.addEventListener('click', function () {
        var status = el.querySelector('#ap-status');
        if (status) status.textContent = 'Scanning…';
        if (list) list.innerHTML = '<p class="muted">Scanning…</p>';
        sound('purr');
        setTimeout(function () {
          if (status) status.textContent = 'No AirPort base stations found (demo network)';
          if (list) {
            list.innerHTML =
              '<div class="settings-card glass" style="padding:14px;text-align:left;max-width:360px;margin:0 auto">' +
              '<strong>No base stations</strong><p class="muted" style="margin:6px 0 0">Still no AirPort devices on this network (demo).</p></div>';
          }
          sound('sosumi');
          if (global.MacShell && MacShell.notify) {
            MacShell.notify('AirPort Utility', 'Scan complete', 'No base stations nearby', 'now');
          }
        }, 1000);
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

  /* ── Finder share + Quick Look ──────────────────────── */
  function wireFinderExtras(el) {
    if (!el || el.dataset.wiredExtras) return;
    el.dataset.wiredExtras = '1';
    var share = el.querySelector('.tb-glass-btn[title="Share"]');
    if (share) {
      share.addEventListener('click', function (e) {
        e.stopPropagation();
        var sel =
          el.querySelector('.finder-icon-item.is-selected .finder-label') ||
          el.querySelector('.finder-list-row.is-selected .fl-title') ||
          el.querySelector('.finder-col-item.is-selected .fc-title');
        var name = sel ? sel.textContent.trim() : 'Item';
        sound('pop');
        if (global.MacShell && MacShell.notify) {
          MacShell.notify('Share', name, 'AirDrop · Messages · Mail (demo)', 'now');
        }
      });
    }
    el.addEventListener('keydown', function (e) {
      if (e.key !== ' ' && e.code !== 'Space') return;
      if (e.target.tagName === 'INPUT') return;
      var sel =
        el.querySelector('.finder-icon-item.is-selected .finder-label') ||
        el.querySelector('.finder-list-row.is-selected .fl-title');
      if (!sel) return;
      e.preventDefault();
      var name = sel.textContent.trim();
      showQuickLook(name);
      sound('tink');
    });

    /* Empty Trash when in trash view */
    var emptyBtn = el.querySelector('[data-empty-trash], .tb-glass-btn[title="Empty Trash"]');
    function emptyTrash() {
      document.dispatchEvent(new CustomEvent('finder:empty-trash'));
      sound('emptyTrash');
      if (global.MacShell && MacShell.notify) {
        MacShell.notify('Finder', 'Trash', 'Trash is empty', 'now');
      }
      var list = el.querySelector('#finder-list, #finder-content');
      if (list && el.querySelector('.finder-sb-item[data-nav="trash"].active')) {
        list.innerHTML =
          '<div class="finder-empty"><div class="empty-title">Trash is Empty</div><div class="muted">Items you delete will appear here.</div></div>';
      }
    }
    if (emptyBtn) emptyBtn.addEventListener('click', emptyTrash);

    /* New Folder toolbar */
    var newFolder = el.querySelector('.tb-glass-btn[title="New Folder"], [data-new-folder]');
    if (!newFolder) {
      var tb = el.querySelector('.finder-toolbar .tb-right, .finder-toolbar, .tb-glass-group');
      if (tb && !el.querySelector('[data-new-folder]')) {
        newFolder = document.createElement('button');
        newFolder.type = 'button';
        newFolder.className = 'tb-glass-btn';
        newFolder.title = 'New Folder';
        newFolder.setAttribute('data-new-folder', '1');
        newFolder.textContent = 'New Folder';
        tb.appendChild(newFolder);
      }
    }
    function createNewFolder() {
      var host =
        el.querySelector('#finder-list') ||
        el.querySelector('.finder-icon-view') ||
        el.querySelector('#finder-content');
      if (!host) return;
      var n = document.createElement('div');
      n.className = 'finder-icon-item is-selected is-new-folder';
      n.innerHTML =
        '<div class="finder-thumb kind-folder" style="--h:210"><div class="finder-thumb-inner"></div></div>' +
        '<span class="finder-label" contenteditable="true">untitled folder</span>';
      host.querySelectorAll('.finder-icon-item.is-selected').forEach(function (x) {
        x.classList.remove('is-selected');
      });
      if (host.id === 'finder-list' || host.classList.contains('finder-icon-view')) {
        host.appendChild(n);
      } else {
        var grid = host.querySelector('.finder-icon-view, #finder-list') || host;
        grid.appendChild(n);
      }
      var label = n.querySelector('.finder-label');
      if (label) {
        label.focus();
        try {
          document.execCommand('selectAll', false, null);
        } catch (err) {}
        label.addEventListener('keydown', function (ev) {
          if (ev.key === 'Enter') {
            ev.preventDefault();
            label.blur();
          }
        });
        label.addEventListener('blur', function () {
          if (!(label.textContent || '').trim()) label.textContent = 'untitled folder';
          sound('hero');
        });
      }
      sound('pop');
      if (global.MacShell && MacShell.notify) {
        MacShell.notify('Finder', 'New Folder', 'untitled folder', 'now');
      }
    }

    if (newFolder && !newFolder.dataset.nfWired) {
      newFolder.dataset.nfWired = '1';
      newFolder.addEventListener('click', function (e) {
        e.stopPropagation();
        createNewFolder();
      });
    }
    document.addEventListener('finder:new-folder', function onNewFolder() {
      if (!el.isConnected) {
        document.removeEventListener('finder:new-folder', onNewFolder);
        return;
      }
      createNewFolder();
    });
  }

  function showQuickLook(name) {
    var existing = document.getElementById('quick-look');
    if (existing) existing.remove();
    var ov = document.createElement('div');
    ov.id = 'quick-look';
    ov.className = 'quick-look-overlay';
    var isImg =
      /\.(png|jpe?g|gif|webp)$/i.test(name) ||
      /photo|image|picture|screenshot|funny/i.test(name);
    var n = 1 + Math.floor(Math.random() * 20);
    var nn = n < 10 ? '0' + n : String(n);
    var body = isImg
      ? '<img class="ql-img" src="assets/photos/funny/funny-' + nn + '.jpg" alt="" />'
      : '<div class="ql-doc"><div class="ql-doc-icon">📄</div><p class="muted">Preview</p><p></p></div>';
    ov.innerHTML =
      '<div class="quick-look-panel glass">' +
      '<div class="ql-titlebar"><strong></strong><button type="button" class="ql-close" aria-label="Close">✕</button></div>' +
      '<div class="ql-body">' +
      body +
      '</div></div>';
    ov.querySelector('.ql-titlebar strong').textContent = name;
    document.body.appendChild(ov);
    function close() {
      ov.remove();
    }
    ov.querySelector('.ql-close').addEventListener('click', close);
    ov.addEventListener('click', function (e) {
      if (e.target === ov) close();
    });
    document.addEventListener('keydown', function onEsc(e) {
      if (e.key === 'Escape') {
        close();
        document.removeEventListener('keydown', onEsc);
      }
    });
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
      Mission: function () {
        if (global.MacShell && MacShell.openMissionControl) MacShell.openMissionControl();
      },
      Screenshot: function () {
        if (global.MacShell && MacShell.captureScreenshot) MacShell.captureScreenshot('full');
      },
      Appearance: function () {
        if (global.MacShell && MacShell.cycleAppearance) MacShell.cycleAppearance();
        else if (global.MacShell && MacShell.openApp) MacShell.openApp('system-settings');
      },
      Wallpaper: function () {
        if (global.MacShell && MacShell.cycleWallpaper) MacShell.cycleWallpaper();
      },
      Continuity: function () {
        if (global.MacShell && MacShell.openApp) MacShell.openApp('iphone-mirroring');
      },
      iPhone: function () {
        if (global.MacShell && MacShell.openApp) MacShell.openApp('iphone-mirroring');
      },
      Sidecar: function () {
        if (global.MacShell && MacShell.openApp) MacShell.openApp('sidecar');
      },
      Finder: function () {
        if (global.MacShell && MacShell.openApp) MacShell.openApp('finder');
      },
      Settings: function () {
        if (global.MacShell && MacShell.openApp) MacShell.openApp('system-settings');
      },
    };
    function runTip(t, body) {
      var text = (t + ' ' + (body || '')).toLowerCase();
      sound('tink');
      if (map[t]) {
        map[t]();
        return;
      }
      var keys = Object.keys(map);
      for (var i = 0; i < keys.length; i++) {
        if (text.indexOf(keys[i].toLowerCase()) >= 0) {
          map[keys[i]]();
          return;
        }
      }
      if (/spotlight|⌘space|command.space/i.test(text)) map.Spotlight();
      else if (/launchpad/i.test(text)) map.Launchpad();
      else if (/control center/i.test(text)) map['Control Center']();
      else if (/mission control/i.test(text)) map.Mission();
      else if (/stage manager/i.test(text)) map['Stage Manager']();
      else if (/screenshot/i.test(text)) map.Screenshot();
      else if (/wallpaper/i.test(text)) map.Wallpaper();
      else if (/iphone|mirroring|continuity/i.test(text)) map.Continuity();
      else if (/sidecar|ipad/i.test(text)) map.Sidecar();
      else if (/settings|system settings/i.test(text)) map.Settings();
      else if (global.MacShell && MacShell.notify) {
        MacShell.notify('Tips', t, 'Try this feature from the menu bar or Dock', 'now');
      }
    }
    el.querySelectorAll('.settings-card, .glass, .tip-card').forEach(function (card) {
      var strong = card.querySelector('strong');
      if (!strong) return;
      card.style.cursor = 'pointer';
      card.addEventListener('click', function () {
        var t = strong.textContent.trim();
        var p = card.querySelector('p, .muted');
        runTip(t, p ? p.textContent : '');
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
    var colors = ['y', 'p', 'b', 'g', 'o'];
    var colorIdx = 0;

    function wireOne(s, i) {
      if (s.dataset.stickyWired) return;
      s.dataset.stickyWired = '1';
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
      s.addEventListener('dblclick', function (e) {
        if (e.shiftKey) {
          e.preventDefault();
          colorIdx = (colorIdx + 1) % colors.length;
          colors.forEach(function (c) {
            s.classList.remove(c);
          });
          s.classList.add(colors[colorIdx]);
          sound('tink');
        }
      });
      var drag = false;
      var ox = 0;
      var oy = 0;
      s.addEventListener('pointerdown', function (e) {
        if (e.metaKey || e.altKey) return;
        if (document.activeElement === s && !e.shiftKey) return;
        drag = true;
        s.setPointerCapture(e.pointerId);
        var r = s.getBoundingClientRect();
        var br = board.getBoundingClientRect();
        ox = e.clientX - r.left;
        oy = e.clientY - r.top;
        s.style.cursor = 'grabbing';
        s.style.zIndex = String(30 + board.querySelectorAll('.sticky').length);
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
    }

    board.querySelectorAll('.sticky').forEach(wireOne);

    if (!el.querySelector('.sticky-add')) {
      var bar = document.createElement('div');
      bar.className = 'sticky-toolbar';
      bar.innerHTML =
        '<button type="button" class="btn-primary sticky-add">+ Note</button>' +
        '<button type="button" class="btn-glass sticky-color" title="Next color">Color</button>';
      board.appendChild(bar);
      bar.querySelector('.sticky-add').addEventListener('click', function () {
        var n = document.createElement('div');
        var c = colors[colorIdx % colors.length];
        colorIdx++;
        n.className = 'sticky ' + c;
        n.contentEditable = 'true';
        n.textContent = 'New sticky';
        n.style.left = 40 + Math.random() * 160 + 'px';
        n.style.top = 40 + Math.random() * 100 + 'px';
        board.appendChild(n);
        wireOne(n, board.querySelectorAll('.sticky').length);
        n.focus();
        sound('hero');
      });
      bar.querySelector('.sticky-color').addEventListener('click', function () {
        var active = board.querySelector('.sticky:focus') || board.querySelector('.sticky');
        if (!active) return;
        colorIdx = (colorIdx + 1) % colors.length;
        colors.forEach(function (c) {
          active.classList.remove(c);
        });
        active.classList.add(colors[colorIdx]);
        sound('tink');
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
    /* Timer completion chime: watch display hit 00:00 while was running */
    var timerDisplay = el.querySelector('#timer-display');
    var timerToggle = el.querySelector('#timer-toggle');
    if (timerDisplay && timerToggle) {
      var last = timerDisplay.textContent;
      var watch = setInterval(function () {
        if (!el.isConnected) {
          clearInterval(watch);
          return;
        }
        var cur = timerDisplay.textContent;
        if (last && last !== '00:00' && cur === '00:00') {
          sound('sosumi');
          if (global.MacShell && MacShell.notify) {
            MacShell.notify('Clock', 'Timer', 'Time is up', 'now', { force: true });
          }
        }
        last = cur;
      }, 400);
    }
    /* Alarm toggle rows */
    el.querySelectorAll('.alarm-row, .alarm-toggle, .clock-alarm').forEach(function (row) {
      row.addEventListener('click', function (e) {
        if (e.target.closest('input, button, .toggle')) return;
        var tog = row.querySelector('.toggle, input[type="checkbox"]');
        if (tog) {
          if (tog.type === 'checkbox') tog.checked = !tog.checked;
          else tog.classList.toggle('on');
          sound('pop');
        }
      });
    });
    el.querySelectorAll('.alarm-row .toggle, .alarm-toggle').forEach(function (tog) {
      if (tog.dataset.clk) return;
      tog.dataset.clk = '1';
      tog.addEventListener('click', function (e) {
        e.stopPropagation();
        tog.classList.toggle('on');
        sound(tog.classList.contains('on') ? 'hero' : 'tink');
      });
    });
  }

  /* ── iWork: Pages / Numbers / Keynote ───────────────── */
  function wireIWork(el) {
    if (!el || el.dataset.wired) return;
    el.dataset.wired = '1';
    var page = el.querySelector('.pages27-page, [contenteditable="true"]');
    if (page && !page.getAttribute('contenteditable')) page.setAttribute('contenteditable', 'true');

    function fmt(cmd, val) {
      if (page) page.focus();
      try {
        document.execCommand(cmd, false, val || null);
      } catch (e) {}
      sound('tink');
    }

    el.querySelectorAll('.iwork27-icon-btn[title="Bold"]').forEach(function (b) {
      b.addEventListener('click', function () {
        fmt('bold');
        b.classList.toggle('active');
      });
    });
    el.querySelectorAll('.iwork27-icon-btn[title="Italic"]').forEach(function (b) {
      b.addEventListener('click', function () {
        fmt('italic');
        b.classList.toggle('active');
      });
    });
    el.querySelectorAll('.iwork27-icon-btn[title="Underline"]').forEach(function (b) {
      b.addEventListener('click', function () {
        fmt('underline');
        b.classList.toggle('active');
      });
    });
    el.querySelectorAll('.iwork27-icon-btn[title="Undo"]').forEach(function (b) {
      b.addEventListener('click', function () {
        fmt('undo');
      });
    });
    el.querySelectorAll('.iwork27-icon-btn[title="Redo"]').forEach(function (b) {
      b.addEventListener('click', function () {
        fmt('redo');
      });
    });
    el.querySelectorAll('.iwork27-style').forEach(function (s) {
      s.addEventListener('click', function () {
        el.querySelectorAll('.iwork27-style').forEach(function (x) {
          x.classList.remove('active');
        });
        s.classList.add('active');
        var style = (s.textContent || '').trim();
        if (style === 'Title') fmt('formatBlock', 'h1');
        else if (style === 'Heading') fmt('formatBlock', 'h2');
        else if (style === 'Body') fmt('formatBlock', 'p');
        else if (style === 'Caption') fmt('formatBlock', 'p');
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
    /* Numbers cells editable */
    el.querySelectorAll('.num27-sheet td').forEach(function (td) {
      if (!td.getAttribute('contenteditable')) td.setAttribute('contenteditable', 'true');
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
        } else if (e.key === 'Tab') {
          e.preventDefault();
          var cells = Array.prototype.slice.call(el.querySelectorAll('.num27-sheet td'));
          var i = cells.indexOf(td);
          var next = cells[i + (e.shiftKey ? -1 : 1)];
          if (next) next.focus();
        }
      });
      td.addEventListener('input', function () {
        td.classList.add('is-edited');
      });
    });
    /* Keynote slides */
    var knSlide = 0;
    el.querySelectorAll('.kn27-slide, .keynote-slide, [data-slide]').forEach(function (slide, i) {
      slide.addEventListener('click', function () {
        el.querySelectorAll('.kn27-slide, .keynote-slide, [data-slide]').forEach(function (s) {
          s.classList.remove('active', 'is-active');
        });
        slide.classList.add('active');
        knSlide = i;
        var stage = el.querySelector('.kn27-stage, .keynote-stage, .iwork27-canvas');
        var title = slide.querySelector('strong, .kn27-slide-title');
        if (stage && title) {
          var h = stage.querySelector('h1, .kn27-title');
          if (h) h.textContent = title.textContent;
        }
        sound('pop');
      });
    });
    el.querySelectorAll('.iwork27-tb-btn.primary, .iwork27-tb-btn').forEach(function (btn) {
      if (btn.dataset.iwork) return;
      btn.dataset.iwork = '1';
      var label = (btn.textContent || '').trim();
      if (label === 'Insert') {
        btn.addEventListener('click', function () {
          if (page) {
            page.focus();
            document.execCommand(
              'insertHTML',
              false,
              '<p><em>Inserted block · ' + new Date().toLocaleTimeString() + '</em></p>'
            );
          }
          sound('hero');
        });
      } else if (label === 'Format') {
        btn.addEventListener('click', function () {
          var insp = el.querySelector('.iwork27-inspector');
          if (insp) insp.classList.toggle('is-hidden');
          sound('tink');
        });
      } else if (label === 'Share' || label === 'Play') {
        btn.addEventListener('click', function () {
          sound(label === 'Play' ? 'hero' : 'messageSent');
          if (label === 'Play') {
            var slides = el.querySelectorAll('.kn27-slide, .keynote-slide, [data-slide]');
            if (slides.length) {
              knSlide = (knSlide + 1) % slides.length;
              slides[knSlide].click();
            }
          }
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
    var playing = false;
    var nowEl = el.querySelector('.pod-now, .media-now-playing');

    function wirePlayBtn(btn) {
      if (!btn || btn.dataset.podWired) return;
      btn.dataset.podWired = '1';
      btn.addEventListener('click', function () {
        playing = !playing;
        btn.textContent = playing ? 'Pause' : 'Play';
        sound(playing ? 'funk' : 'tink');
      });
    }

    function setNow(title, sub) {
      if (!nowEl) {
        nowEl = document.createElement('div');
        nowEl.className = 'pod-now';
        nowEl.innerHTML =
          '<div class="pod-now-art">🎙</div><div class="pod-now-meta"><strong></strong><span class="muted"></span></div>' +
          '<button type="button" class="btn-primary pod-play-btn">Play</button>';
        el.appendChild(nowEl);
      }
      wirePlayBtn(nowEl.querySelector('.pod-play-btn'));
      var s = nowEl.querySelector('strong');
      var m = nowEl.querySelector('.pod-now-meta .muted, .muted');
      if (s) s.textContent = title || 'Episode';
      if (m) m.textContent = sub || appName;
    }

    wirePlayBtn(el.querySelector('.pod-play-btn'));

    el.querySelectorAll('.app-list-row, .pod-episode').forEach(function (row) {
      row.style.cursor = 'pointer';
      row.addEventListener('click', function () {
        el.querySelectorAll('.app-list-row, .pod-episode').forEach(function (r) {
          r.classList.remove('is-selected', 'active');
        });
        row.classList.add('is-selected');
        sound('pop');
        var t = row.querySelector('strong, .row-title');
        var sub = row.querySelector('.pod-info .muted, .muted, .row-sub');
        if (appName === 'Podcasts' || appName === 'Music') {
          setNow(t ? t.textContent : 'Item', sub ? sub.textContent : '');
        }
      });
      row.addEventListener('dblclick', function () {
        sound(appName === 'News' ? 'tink' : 'funk');
        var t = row.querySelector('strong, .row-title');
        var sub = row.querySelector('.pod-info .muted, .muted, .row-sub');
        if (appName !== 'News') {
          setNow(t ? t.textContent : 'Item', sub ? sub.textContent : '');
          playing = true;
          var pb = el.querySelector('.pod-play-btn');
          if (pb) pb.textContent = 'Pause';
        }
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
    var selected = 'Macintosh HD';
    el.querySelectorAll('.du27-item, .du-volume, [data-volume]').forEach(function (item) {
      item.addEventListener('click', function () {
        el.querySelectorAll('.du27-item, .du-volume, [data-volume]').forEach(function (i) {
          i.classList.remove('active', 'is-selected');
        });
        item.classList.add('active');
        selected =
          item.getAttribute('data-volume') ||
          (item.querySelector('strong') && item.querySelector('strong').textContent) ||
          item.textContent.trim().split('\n')[0] ||
          selected;
        sound('pop');
      });
    });
    el.querySelectorAll('button, .du27-tb-btn').forEach(function (btn) {
      if (btn.dataset.du) return;
      btn.dataset.du = '1';
      btn.addEventListener('click', function () {
        var title = (btn.getAttribute('title') || btn.textContent || 'Action').trim();
        var status = el.querySelector('#du-status, .du-status, .du27-status');
        if (/first aid|verify|repair/i.test(title)) {
          if (status) status.textContent = 'Running First Aid on ' + selected + '…';
          sound('purr');
          var n = 0;
          var iv = setInterval(function () {
            n += 25;
            if (status) status.textContent = 'First Aid… ' + n + '%';
            if (n >= 100) {
              clearInterval(iv);
              if (status) status.textContent = selected + ' appears to be OK';
              sound('hero');
              if (global.MacShell && MacShell.notify) {
                MacShell.notify('Disk Utility', 'First Aid', selected + ' · OK', 'now');
              }
            }
          }, 280);
          return;
        }
        if (/erase|format/i.test(title)) {
          sound('sosumi');
          if (global.MacShell && MacShell.notify) {
            MacShell.notify('Disk Utility', 'Erase', 'Demo only — no disk was erased', 'now');
          }
          return;
        }
        sound('tink');
        if (status) status.textContent = title + ' · simulated';
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
    function reply(q) {
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
      var openId = null;
      if (/weather/i.test(q)) {
        a = 'It is 72° and partly cloudy. Opening Weather.';
        openId = 'weather';
      } else if (/time|clock/i.test(q)) {
        a = 'It is ' + nowTime() + '. Opening Clock.';
        openId = 'clock';
      } else if (/calendar|meeting|schedule/i.test(q)) {
        a = 'You have Design Review at 10:00 AM and Team Sync at 2:00 PM.';
        openId = 'calendar';
      } else if (/music|play|song/i.test(q)) {
        a = 'Playing Liquid Glass on Music.';
        openId = 'music';
      } else if (/message|text/i.test(q)) {
        a = 'Opening Messages.';
        openId = 'messages';
      } else if (/mail|email/i.test(q)) {
        a = 'Opening Mail.';
        openId = 'mail';
      } else if (/photo/i.test(q)) {
        a = 'Opening Photos.';
        openId = 'photos';
      } else if (/safari|browser|web/i.test(q)) {
        a = 'Opening Safari.';
        openId = 'safari';
      } else if (/setting|preference/i.test(q)) {
        a = 'Opening System Settings.';
        openId = 'system-settings';
      } else if (/iphone|mirror/i.test(q)) {
        a = 'Opening iPhone Mirroring.';
        openId = 'iphone-mirroring';
      } else if (/sidecar|ipad/i.test(q)) {
        a = 'Opening Sidecar.';
        openId = 'sidecar';
      } else if (/screenshot|capture/i.test(q)) {
        a = 'Taking a screenshot.';
        if (global.MacShell && MacShell.captureScreenshot) MacShell.captureScreenshot('full');
      } else if (/lock/i.test(q)) {
        a = 'Locking your Mac.';
        if (global.MacShell && MacShell.showLockScreen) MacShell.showLockScreen('Lock Screen');
      } else if (/facetime|video call/i.test(q)) {
        a = 'Opening FaceTime.';
        openId = 'facetime';
      }
      si.innerHTML = '<span class="muted">Siri</span><p style="margin:4px 0 0"></p>';
      si.querySelector('p').textContent = a;
      var host = el.querySelector('[style*="justify-content:flex-end"]');
      if (host) {
        host.appendChild(you);
        host.appendChild(si);
        host.scrollTop = host.scrollHeight;
      }
      sound('messageReceived');
      if (openId && global.MacShell && MacShell.openApp) {
        setTimeout(function () {
          MacShell.openApp(openId);
        }, 500);
      }
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
      liquid: {
        pos: 'adjective & noun',
        def: 'Having a consistency like that of water or oil; flowing freely but of constant volume.',
        related: ['fluid', 'aqueous', 'molten', 'glass'],
      },
      glass: {
        pos: 'noun',
        def: 'A hard, brittle substance, typically transparent, made by fusing sand with soda and lime.',
        related: ['crystal', 'pane', 'liquid', 'blur'],
      },
      interface: {
        pos: 'noun',
        def: 'A point where two systems, subjects, or organizations meet and interact.',
        related: ['macos', 'design', 'blur', 'glass'],
      },
      macos: {
        pos: 'noun',
        def: 'The operating system designed by Apple for Mac computers (this build is a web simulation of macOS 27).',
        related: ['interface', 'siri', 'finder', 'dock'],
      },
      blur: {
        pos: 'verb & noun',
        def: 'To make or become unclear or less distinct; soft diffusion used in Liquid Glass materials.',
        related: ['glass', 'liquid', 'vibrancy', 'depth'],
      },
      dock: {
        pos: 'noun',
        def: 'A row of application icons at the edge of the screen used to launch and switch apps.',
        related: ['macos', 'finder', 'spotlight'],
      },
      finder: {
        pos: 'noun',
        def: 'The macOS file manager used to browse folders, open files, and manage the desktop.',
        related: ['macos', 'folder', 'dock'],
      },
      spotlight: {
        pos: 'noun',
        def: 'System-wide search opened with ⌘Space to find apps, files, and web results.',
        related: ['macos', 'siri', 'finder'],
      },
      siri: {
        pos: 'noun',
        def: 'Apple’s voice assistant for questions, shortcuts, and system actions (demo mode here).',
        related: ['macos', 'spotlight', 'intelligence'],
      },
      vibrancy: {
        pos: 'noun',
        def: 'A translucent material effect that samples and tints content behind a surface.',
        related: ['blur', 'glass', 'liquid'],
      },
    };
    var input = el.querySelector('.search-field, input[type="search"], input');
    function show(word) {
      var w = (word || 'liquid').toLowerCase().trim().replace(/[^a-z0-9-]/g, '');
      var entry = dict[w];
      var main = el.querySelector('.app-main') || el;
      var body = main.querySelector('.dict-body') || main.querySelector('[style*="padding:20px"]');
      if (!body) {
        body = document.createElement('div');
        body.className = 'dict-body';
        main.appendChild(body);
      }
      body.className = 'dict-body';
      if (!entry) {
        var keys = Object.keys(dict).join(', ');
        body.innerHTML =
          '<div style="padding:20px 24px"><h2 style="margin:0 0 4px"></h2>' +
          '<p class="muted">No exact match in the sample dictionary.</p>' +
          '<p class="muted" style="margin-top:12px">Try: ' +
          keys +
          '</p>' +
          '<div class="dict-chips"></div></div>';
        body.querySelector('h2').textContent = w || '—';
        var chips = body.querySelector('.dict-chips');
        Object.keys(dict).forEach(function (k) {
          var b = document.createElement('button');
          b.type = 'button';
          b.className = 'dict-chip';
          b.textContent = k;
          b.addEventListener('click', function () {
            if (input) input.value = k;
            show(k);
          });
          chips.appendChild(b);
        });
        sound('sosumi');
        return;
      }
      body.innerHTML =
        '<div style="padding:20px 24px"><h2 style="margin:0 0 4px"></h2>' +
        '<p class="muted" style="margin:0 0 16px" id="dict-pos"></p>' +
        '<div class="settings-card glass" style="padding:14px 16px;margin-bottom:12px"><strong>Definition</strong>' +
        '<p class="muted" style="margin:6px 0 0" id="dict-def"></p></div>' +
        '<div class="settings-card glass" style="padding:14px 16px"><strong>Related</strong>' +
        '<div class="dict-chips" id="dict-related" style="margin-top:8px"></div></div></div>';
      body.querySelector('h2').textContent = w;
      body.querySelector('#dict-pos').textContent = entry.pos + ' · Sample dictionary';
      body.querySelector('#dict-def').textContent = entry.def;
      var rel = body.querySelector('#dict-related');
      (entry.related || []).forEach(function (k) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'dict-chip';
        b.textContent = k;
        b.addEventListener('click', function () {
          if (input) input.value = k;
          show(k);
        });
        rel.appendChild(b);
      });
      if (input) input.value = w;
      sound('pop');
    }
    if (input) {
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          show(input.value);
        }
      });
    }
    el.querySelectorAll('.app-sidebar-item, .app-nav-item').forEach(function (item) {
      item.addEventListener('click', function () {
        el.querySelectorAll('.app-sidebar-item, .app-nav-item').forEach(function (x) {
          x.classList.remove('active');
        });
        item.classList.add('active');
        sound('tink');
      });
    });
    /* seed related chips on first open if static page present */
    var existing = el.querySelector('.dict-chips');
    if (!existing) {
      var seed = el.querySelector('.settings-card:last-child p.muted');
      if (seed && /fluid/i.test(seed.textContent || '')) {
        seed.innerHTML = '';
        seed.className = 'dict-chips';
        ['liquid', 'glass', 'interface', 'macos', 'blur', 'dock'].forEach(function (k) {
          var b = document.createElement('button');
          b.type = 'button';
          b.className = 'dict-chip';
          b.textContent = k;
          b.addEventListener('click', function () {
            if (input) input.value = k;
            show(k);
          });
          seed.appendChild(b);
        });
      }
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

    function applyTile(tile, on) {
      tile.classList.toggle('is-on', on);
      var st = tile.querySelector('.home-tile-state');
      var kind = tile.getAttribute('data-kind');
      if (!st) return;
      if (kind === 'light') st.textContent = on ? 'On · 80%' : 'Off';
      else if (kind === 'lock') st.textContent = on ? 'Locked' : 'Unlocked';
      else if (kind === 'opener') st.textContent = on ? 'Open' : 'Closed';
      else if (kind === 'climate') st.textContent = on ? '72°' : 'Off';
      else if (kind === 'fan') st.textContent = on ? 'On · Low' : 'Off';
      else st.textContent = on ? 'On' : 'Off';
    }

    el.querySelectorAll('.home-tile').forEach(function (tile) {
      tile.addEventListener('click', function () {
        var on = !tile.classList.contains('is-on');
        applyTile(tile, on);
        sound(on ? 'pop' : 'tink');
      });
    });

    function scene(name) {
      el.querySelectorAll('.home-tile').forEach(function (tile) {
        var kind = tile.getAttribute('data-kind');
        if (name === 'morning') {
          applyTile(tile, kind === 'light' || kind === 'climate' || kind === 'fan');
        } else if (name === 'night') {
          applyTile(tile, kind === 'lock');
        } else if (name === 'away') {
          applyTile(tile, kind === 'lock');
          el.querySelectorAll('.home-tile[data-kind="light"], .home-tile[data-kind="fan"]').forEach(function (t) {
            applyTile(t, false);
          });
        } else if (name === 'all-on') {
          applyTile(tile, true);
        } else if (name === 'all-off') {
          applyTile(tile, kind === 'lock');
        }
      });
      sound('hero');
      if (global.MacShell && MacShell.notify) {
        MacShell.notify('Home', 'Scene', name.replace(/-/g, ' '), 'now');
      }
    }

    el.querySelectorAll('[data-home-scene]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        scene(btn.getAttribute('data-home-scene'));
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
    var playing = false;
    var t0 = 0;
    var timer = null;
    var playTimer = null;
    var recCount = 0;

    function wireRow(row) {
      if (!row || row.dataset.vm) return;
      row.dataset.vm = '1';
      row.style.cursor = 'pointer';
      row.addEventListener('click', function () {
        el.querySelectorAll('.vm-row').forEach(function (r) {
          r.classList.remove('is-selected', 'is-playing');
        });
        row.classList.add('is-selected');
        sound('pop');
      });
      row.addEventListener('dblclick', function () {
        playRow(row);
      });
    }

    function playRow(row) {
      if (playTimer) clearInterval(playTimer);
      el.querySelectorAll('.vm-row').forEach(function (r) {
        r.classList.remove('is-playing');
      });
      row.classList.add('is-playing', 'is-selected');
      playing = true;
      var title = row.querySelector('strong');
      var name = title ? title.textContent : 'Recording';
      var elapsed = 0;
      var durText = (row.querySelector('.muted') || {}).textContent || '0:30';
      var parts = durText.split(':');
      var dur = (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 30);
      if (dur > 20) dur = 8;
      if (status) status.textContent = 'Playing · ' + name;
      sound('funk');
      playTimer = setInterval(function () {
        elapsed++;
        if (status) status.textContent = 'Playing 0:' + (elapsed < 10 ? '0' : '') + elapsed;
        if (elapsed >= dur) {
          clearInterval(playTimer);
          playing = false;
          row.classList.remove('is-playing');
          if (status) status.textContent = 'Ready';
          sound('tink');
        }
      }, 1000);
    }

    if (list) {
      list.querySelectorAll('.vm-row').forEach(wireRow);
    }

    if (rec) {
      rec.addEventListener('click', function () {
        if (playing && playTimer) {
          clearInterval(playTimer);
          playing = false;
        }
        recording = !recording;
        if (recording) {
          rec.textContent = '■ Stop';
          rec.classList.add('is-recording');
          t0 = Date.now();
          sound('purr');
          timer = setInterval(function () {
            var s = Math.floor((Date.now() - t0) / 1000);
            if (status) status.textContent = 'Recording 0:' + (s < 10 ? '0' : '') + s;
          }, 250);
        } else {
          rec.textContent = '● Record';
          rec.classList.remove('is-recording');
          if (timer) clearInterval(timer);
          var s = Math.floor((Date.now() - t0) / 1000);
          if (status) status.textContent = 'Saved';
          recCount++;
          if (list) {
            var row = document.createElement('div');
            row.className = 'vm-row is-selected';
            list.querySelectorAll('.vm-row').forEach(function (r) {
              r.classList.remove('is-selected');
            });
            row.innerHTML =
              '<strong>New Recording ' +
              recCount +
              '</strong><span class="muted">0:' +
              (s < 10 ? '0' : '') +
              s +
              '</span>';
            list.insertBefore(row, list.firstChild);
            wireRow(row);
          }
          sound('hero');
          if (global.MacShell && MacShell.notify) {
            MacShell.notify('Voice Memos', 'Saved', 'New Recording ' + recCount, 'now');
          }
        }
      });
    }
  }

  /* ── Image Playground ───────────────────────────────── */
  function wireImagePlayground(el) {
    if (!el || el.dataset.wired) return;
    el.dataset.wired = '1';
    var style = 'Animation';
    var lastSrc = '';
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
    function setPreview(src) {
      lastSrc = src;
      if (!preview) return;
      preview.innerHTML =
        '<img src="' +
        src +
        '" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:12px" />' +
        '<div class="ip-actions" style="display:flex;gap:8px;margin-top:10px;justify-content:center">' +
        '<button type="button" class="btn-glass" id="ip-save">Save</button>' +
        '<button type="button" class="btn-glass" id="ip-again">Vary</button></div>';
      var save = preview.querySelector('#ip-save');
      var again = preview.querySelector('#ip-again');
      if (save) {
        save.addEventListener('click', function () {
          var a = document.createElement('a');
          a.href = lastSrc;
          a.download = 'Image-Playground-' + Date.now() + '.jpg';
          document.body.appendChild(a);
          a.click();
          a.remove();
          sound('hero');
          if (global.MacShell && MacShell.notify) {
            MacShell.notify('Image Playground', 'Saved', 'Image downloaded', 'now');
          }
        });
      }
      if (again) {
        again.addEventListener('click', function () {
          if (create) create.click();
        });
      }
    }
    if (create) {
      create.addEventListener('click', function () {
        create.textContent = 'Creating…';
        create.disabled = true;
        sound('pop');
        setTimeout(function () {
          create.textContent = 'Create';
          create.disabled = false;
          var n = 1 + Math.floor(Math.random() * 20);
          var nn = n < 10 ? '0' + n : String(n);
          setPreview('assets/photos/funny/funny-' + nn + '.jpg');
          sound('hero');
          if (global.MacShell && MacShell.notify) {
            MacShell.notify(
              'Image Playground',
              'Created · ' + style,
              (prompt && prompt.value) || 'Demo image',
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
    var lastHex = '#7CA8FF';
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
      lastHex = hex;
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
    var hexEl = el.querySelector('#dcm-hex');
    if (hexEl) {
      hexEl.style.cursor = 'pointer';
      hexEl.title = 'Click to copy';
      hexEl.addEventListener('click', function () {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(lastHex).catch(function () {});
        }
        sound('tink');
        if (global.MacShell && MacShell.notify) {
          MacShell.notify('Digital Color Meter', 'Copied', lastHex, 'now');
        }
      });
    }
    if (!el.querySelector('#dcm-copy')) {
      var bar = el.querySelector('.app-layout, #dcm-app') || el;
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn-primary';
      btn.id = 'dcm-copy';
      btn.textContent = 'Copy Hex';
      btn.style.cssText = 'margin:12px auto 16px;display:block';
      bar.appendChild(btn);
      btn.addEventListener('click', function () {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(lastHex).catch(function () {});
        }
        sound('hero');
        if (global.MacShell && MacShell.notify) {
          MacShell.notify('Digital Color Meter', 'Copied', lastHex, 'now');
        }
      });
    }
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
        /* Capture a real screenshot as "recording finished" clip later */
        setTimeout(function () {
          if (global.MacShell && MacShell.captureScreenshot) {
            MacShell.captureScreenshot('window');
          }
          if (global.MacShell && MacShell.notify) {
            MacShell.notify('QuickTime Player', 'Recording saved', 'Demo clip on Desktop', 'now');
          }
          sound('hero');
        }, 2200);
      });
    }
    var progress = el.querySelector('.qt-progress, #qt-fill');
    var bar = el.querySelector('.qt-progress') || (fill && fill.parentElement);
    if (bar) {
      bar.style.cursor = 'pointer';
      bar.addEventListener('click', function (e) {
        var r = bar.getBoundingClientRect();
        var pct = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
        t = Math.floor(pct * dur);
        if (fill) fill.style.width = pct * 100 + '%';
        if (timeEl) timeEl.textContent = fmt(t) + ' / ' + fmt(dur);
        sound('volume');
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
    var selected = null;
    function select(name) {
      selected = name;
      el.querySelectorAll('.fm-row, .fm-pin').forEach(function (n) {
        n.classList.toggle('is-selected', n.getAttribute('data-dev') === name);
      });
      var detail = el.querySelector('.fm-detail-name, #fm-detail-name');
      if (detail) detail.textContent = name || 'Device';
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
          MacShell.notify(
            'Find My',
            'Playing Sound',
            (selected || 'Device') + ' is playing a sound',
            'now'
          );
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
    var actions = el.querySelector('.fm-actions, .device-actions, .findmy-app');
    if (actions && !el.querySelector('#fm-lost')) {
      var lost = document.createElement('button');
      lost.type = 'button';
      lost.className = 'btn-glass';
      lost.id = 'fm-lost';
      lost.textContent = 'Mark As Lost';
      var host = el.querySelector('.fm-actions') || el.querySelector('.fm-detail') || actions;
      if (host) host.appendChild(lost);
      lost.addEventListener('click', function () {
        sound('purr');
        if (global.MacShell && MacShell.notify) {
          MacShell.notify(
            'Find My',
            'Lost Mode',
            (selected || 'Device') + ' marked as lost (demo)',
            'now'
          );
        }
        lost.textContent = 'Lost Mode On';
        lost.classList.add('is-active');
      });
    }
    var notifyBtn = el.querySelector('#fm-notify');
    if (notifyBtn) {
      notifyBtn.addEventListener('click', function () {
        sound('messageReceived');
        if (global.MacShell && MacShell.notify) {
          MacShell.notify('Find My', 'Notify When Found', selected || 'Device', 'now');
        }
      });
    }
    /* select first device by default */
    var first = el.querySelector('.fm-row[data-dev], .fm-pin[data-dev]');
    if (first) select(first.getAttribute('data-dev'));
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
    var filterQ = '';
    var sources = ['kernel', 'WindowServer', 'Safari', 'Finder', 'dock', 'bluetoothd', 'mds'];
    var msgs = [
      'IOKit: power state change',
      'Display sleep prevented',
      'Network reachability changed',
      'Sandbox: allow file-read-data',
      'LaunchServices: registered app',
      'CoreAudio: device sample rate 48000',
    ];
    function applyFilter() {
      if (!log) return;
      log.querySelectorAll(':scope > div').forEach(function (line) {
        var t = (line.textContent || '').toLowerCase();
        line.style.display = !filterQ || t.indexOf(filterQ) >= 0 ? '' : 'none';
      });
    }
    var iv = setInterval(function () {
      if (!el.isConnected) {
        clearInterval(iv);
        return;
      }
      if (paused || !log) return;
      var d = new Date();
      var t =
        (function () {
        function p2(n) { n = String(n); return n.length < 2 ? '0' + n : n; }
        return p2(d.getHours()) + ':' + p2(d.getMinutes()) + ':' + p2(d.getSeconds());
      })();
      var src = sources[Math.floor(Math.random() * sources.length)];
      var msg = msgs[Math.floor(Math.random() * msgs.length)];
      var line = document.createElement('div');
      line.innerHTML =
        '<span class="c-time">' +
        t +
        '</span> <span class="c-src">' +
        src +
        '</span> ' +
        msg;
      log.appendChild(line);
      if (filterQ && (line.textContent || '').toLowerCase().indexOf(filterQ) < 0) {
        line.style.display = 'none';
      }
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
    var search = el.querySelector('#console-search, .console-search, input[type="search"]');
    if (!search) {
      var tb = el.querySelector('.toolbar, .app-toolbar') || el.querySelector('[class*="toolbar"]');
      if (tb) {
        search = document.createElement('input');
        search.type = 'search';
        search.id = 'console-search';
        search.placeholder = 'Filter';
        search.className = 'search-field';
        search.style.cssText = 'max-width:160px;margin-left:auto';
        tb.appendChild(search);
      }
    }
    if (search) {
      search.addEventListener('input', function () {
        filterQ = search.value.toLowerCase().trim();
        applyFilter();
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
    /* Use a funny photo as sample content to magnify */
    if (content && !content.querySelector('img')) {
      var n = 1 + Math.floor(Math.random() * 20);
      var nn = n < 10 ? '0' + n : String(n);
      content.innerHTML =
        '<img src="assets/photos/funny/funny-' +
        nn +
        '.jpg" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:8px" />' +
        '<p class="muted" style="text-align:center;margin-top:8px">Sample · drag sliders to zoom</p>';
    }
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
      content.style.transformOrigin = 'center center';
      content.style.filter = filt;
      var label = el.querySelector('#mag-zoom-label, .mag-zoom-val');
      if (label) label.textContent = z + '×';
    }
    if (zoom) {
      zoom.addEventListener('input', function () {
        apply();
        sound('volume');
      });
    }
    if (bright) bright.addEventListener('input', apply);
    if (filter) {
      filter.addEventListener('change', function () {
        apply();
        sound('tink');
      });
    }
    var cycle = el.querySelector('#mag-cycle');
    if (!cycle) {
      var controls = el.querySelector('.mag-controls, .app-layout') || el;
      cycle = document.createElement('button');
      cycle.type = 'button';
      cycle.className = 'btn-glass';
      cycle.id = 'mag-cycle';
      cycle.textContent = 'Next sample';
      cycle.style.cssText = 'margin:8px auto;display:block';
      controls.appendChild(cycle);
    }
    cycle.addEventListener('click', function () {
      var img = content && content.querySelector('img');
      if (img) {
        var n = 1 + Math.floor(Math.random() * 20);
        var nn = n < 10 ? '0' + n : String(n);
        img.src = 'assets/photos/funny/funny-' + nn + '.jpg';
        sound('pop');
      }
    });
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
    var customSample = '';
    el.querySelectorAll('.fb-font').forEach(function (btn) {
      btn.addEventListener('click', function () {
        el.querySelectorAll('.fb-font').forEach(function (b) {
          b.classList.remove('active');
        });
        btn.classList.add('active');
        var font = btn.getAttribute('data-font') || 'SF Pro';
        var sample = customSample || btn.getAttribute('data-sample') || 'Sample';
        if (name) name.textContent = font;
        if (preview) {
          preview.style.fontFamily =
            font === 'Menlo'
              ? 'Menlo, monospace'
              : font === 'Georgia' || font === 'New York'
                ? 'Georgia, serif'
                : '-apple-system, "' + font + '", system-ui, sans-serif';
          preview.textContent = sample + ' — The quick brown fox jumps over the lazy dog 0123456789';
        }
        sound('pop');
      });
    });
    el.querySelectorAll('.fb-size').forEach(function (btn) {
      btn.addEventListener('click', function () {
        el.querySelectorAll('.fb-size').forEach(function (b) {
          b.classList.remove('active', 'is-active');
        });
        btn.classList.add('is-active');
        if (preview) preview.style.fontSize = btn.getAttribute('data-size') + 'px';
        sound('tink');
      });
    });
    /* editable sample line */
    if (preview && !preview.dataset.edit) {
      preview.dataset.edit = '1';
      preview.contentEditable = 'true';
      preview.title = 'Click to edit sample text';
      preview.addEventListener('input', function () {
        customSample = (preview.textContent || '').split('—')[0].trim() || 'Sample';
      });
    }
    var search = el.querySelector('.fb-search, input[type="search"]');
    if (search) {
      search.addEventListener('input', function () {
        var q = search.value.toLowerCase();
        el.querySelectorAll('.fb-font').forEach(function (btn) {
          var f = (btn.getAttribute('data-font') || btn.textContent || '').toLowerCase();
          btn.style.display = !q || f.indexOf(q) >= 0 ? '' : 'none';
        });
      });
    }
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
      function launch() {
        var name = card.getAttribute('data-game') || 'Game';
        sound('funk');
        if (/chess/i.test(name) && global.MacShell && MacShell.openApp) {
          MacShell.openApp('chess');
          return;
        }
        /* Mini arcade overlay for other titles */
        var ov = document.createElement('div');
        ov.className = 'game-play-overlay';
        ov.innerHTML =
          '<div class="game-play-panel glass">' +
          '<h2></h2><p class="muted">Demo session · click to score</p>' +
          '<div class="game-score">Score: <strong id="gs">0</strong></div>' +
          '<button type="button" class="btn-primary" id="gs-tap">Tap!</button>' +
          '<button type="button" class="btn-glass" id="gs-quit">Quit</button></div>';
        ov.querySelector('h2').textContent = name;
        el.appendChild(ov);
        var score = 0;
        var scoreEl = ov.querySelector('#gs');
        ov.querySelector('#gs-tap').addEventListener('click', function () {
          score += 1 + Math.floor(Math.random() * 5);
          if (scoreEl) scoreEl.textContent = String(score);
          sound('tink');
        });
        ov.querySelector('#gs-quit').addEventListener('click', function () {
          ov.remove();
          sound('pop');
          if (global.MacShell && MacShell.notify) {
            MacShell.notify('Games', 'Session over', name + ' · ' + score + ' pts', 'now');
          }
        });
        ov.addEventListener('click', function (e) {
          if (e.target === ov) ov.remove();
        });
      }
      var play = card.querySelector('.game-play, .btn-get');
      if (play) {
        play.addEventListener('click', function (e) {
          e.stopPropagation();
          launch();
        });
      }
      card.addEventListener('dblclick', launch);
      card.addEventListener('click', function () {
        el.querySelectorAll('.game-card').forEach(function (c) {
          c.classList.remove('is-selected');
        });
        card.classList.add('is-selected');
        sound('pop');
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
    var jobN = 0;
    var docs = ['Design Brief.pdf', 'Invoice.pdf', 'Notes.txt', 'Photo.jpg', 'Report.pdf'];
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
    function runJob(row) {
      var meta = row.querySelector('.muted');
      var stages = ['Printing · 1 of 2', 'Printing · 2 of 2', 'Finishing…', 'Completed'];
      var i = 0;
      var iv = setInterval(function () {
        if (!row.isConnected) {
          clearInterval(iv);
          return;
        }
        if (meta) meta.textContent = stages[i];
        i++;
        if (i >= stages.length) {
          clearInterval(iv);
          sound('tink');
          setTimeout(function () {
            if (row.isConnected) {
              row.style.opacity = '0.5';
              if (meta) meta.textContent = 'Done';
            }
          }, 600);
        }
      }, 700);
    }
    function addJob() {
      if (!jobs) return;
      if (jobs.querySelector('.muted') && !jobs.querySelector('.pc-job')) jobs.innerHTML = '';
      jobN++;
      var row = document.createElement('div');
      row.className = 'pc-job';
      var name = docs[jobN % docs.length];
      row.innerHTML =
        '<strong></strong><span class="muted">Queued · 2 pages</span><button type="button" class="btn-glass pc-job-del">✕</button>';
      row.querySelector('strong').textContent = name;
      jobs.appendChild(row);
      row.querySelector('.pc-job-del').addEventListener('click', function () {
        row.remove();
        sound('emptyTrash');
      });
      sound('hero');
      setTimeout(function () {
        runJob(row);
      }, 400);
    }
    var add = el.querySelector('#pc-add');
    if (add) add.addEventListener('click', addJob);
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
        if (jobs && !jobs.querySelector('.pc-job')) addJob();
      });
    }
    var pause = el.querySelector('#pc-pause');
    if (pause) {
      pause.addEventListener('click', function () {
        sound('pop');
        if (global.MacShell && MacShell.notify) {
          MacShell.notify('Print Center', 'Printer', 'Queue paused', 'now');
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
            var captured = sq.textContent;
            sq.textContent = selected.textContent;
            selected.textContent = '';
            sound(captured ? 'hero' : 'tink');
            if (captured && global.MacShell && MacShell.notify) {
              MacShell.notify('Chess', 'Capture', captured + ' taken', 'now');
            }
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
        wireFinderExtras(el);
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
        if (id === 'finder') wireFinderExtras(body);
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
