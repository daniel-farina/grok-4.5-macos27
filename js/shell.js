/**
 * MacShell - Desktop shell chrome for macOS 27 virtual desktop
 * Works with existing index.html + liquid-glass.css structure.
 *
 * Depends on: WindowManager, MacIcons, AppRegistry (optional)
 * Global: window.MacShell
 *
 * Public API expected by AppRegistry:
 *   openLaunchpad(), setRunning(appId, bool), bounceDock(appId), setActiveApp(name)
 */
(function (global) {
  'use strict';

  var clockTimer = null;
  var spotlightIndex = 0;
  var bootDone = false;
  var runningApps = Object.create(null);
  var recentApps = [];
  var wallpaperIndex = 0;
  /** User preference: 'auto' | 'light' | 'dark' — default follows system */
  var appearancePref = 'auto';
  var systemDarkMql = null;
  var stageManagerOn = false;
  var hotCornerTimer = null;
  var WALLPAPERS = [
    'assets/wallpaper.jpg',
    'assets/wallpaper-glass.jpg',
    'assets/wallpaper-crystal.jpg'
  ];

  var FALLBACK_DOCK = [
    'finder', 'launchpad', 'safari', 'mail', 'messages', 'maps', 'photos',
    'notes', 'calendar', 'music', 'system-settings', 'trash'
  ];

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }

  function $$(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function titleFor(appId) {
    if (global.AppRegistry && typeof AppRegistry.get === 'function') {
      var app = AppRegistry.get(appId);
      if (app && app.name) return app.name;
    }
    if (!appId) return 'Finder';
    return appId.replace(/-/g, ' ').replace(/\b\w/g, function (c) {
      return c.toUpperCase();
    });
  }

  function iconHtml(appId) {
    var svg = '';
    if (global.MacIcons) {
      if (typeof MacIcons.get === 'function') svg = MacIcons.get(appId);
      else if (MacIcons[appId]) svg = MacIcons[appId];
    }
    return svg || '<span class="dock-emoji">📦</span>';
  }

  function allApps() {
    if (global.AppRegistry && typeof AppRegistry.all === 'function') {
      return AppRegistry.all().map(function (a) {
        return { id: a.id, name: a.name, category: a.category };
      });
    }
    if (global.MacIcons && MacIcons.ids) {
      return MacIcons.ids.filter(function (id) {
        return id !== 'spotlight';
      }).map(function (id) {
        return { id: id, name: titleFor(id) };
      });
    }
    return FALLBACK_DOCK.map(function (id) {
      return { id: id, name: titleFor(id) };
    });
  }

  function dockAppList() {
    if (global.AppRegistry && typeof AppRegistry.dockApps === 'function') {
      return AppRegistry.dockApps().map(function (a) {
        return a.id || a;
      });
    }
    return FALLBACK_DOCK.slice();
  }

  function pushRecentApp(appId) {
    if (!appId || appId === 'launchpad' || appId === 'trash') return;
    recentApps = recentApps.filter(function (id) {
      return id !== appId;
    });
    recentApps.unshift(appId);
    if (recentApps.length > 8) recentApps.length = 8;
    try {
      localStorage.setItem('macos-recent-apps', JSON.stringify(recentApps));
    } catch (e) {}
    renderRecentAppsMenu();
  }

  function loadRecentApps() {
    try {
      var raw = JSON.parse(localStorage.getItem('macos-recent-apps') || '[]');
      if (Array.isArray(raw)) recentApps = raw.slice(0, 8);
    } catch (e) {
      recentApps = [];
    }
  }

  function renderRecentAppsMenu() {
    var host = document.getElementById('apple-recent-apps');
    if (!host) return;
    if (!recentApps.length) {
      host.innerHTML = '<div class="menu-dropdown-item is-disabled" role="menuitem">No Recent Items</div>';
      return;
    }
    host.innerHTML = recentApps
      .map(function (id) {
        return (
          '<div class="menu-dropdown-item" data-action="open-app" data-app="' +
          escapeHtml(id) +
          '" role="menuitem">' +
          escapeHtml(titleFor(id)) +
          '</div>'
        );
      })
      .join('');
  }

  function openApp(appId) {
    if (appId === 'launchpad') {
      MacShell.openLaunchpad();
      return;
    }
    if (appId === 'settings') appId = 'system-settings';
    pushRecentApp(appId);
    /* Continuity handoff toast for device apps */
    if (appId === 'iphone-mirroring' || appId === 'sidecar' || appId === 'phone') {
      setTimeout(function () {
        notify(
          'Continuity',
          appId === 'sidecar' ? 'Sidecar' : appId === 'phone' ? 'Phone' : 'iPhone Mirroring',
          appId === 'sidecar'
            ? 'Using iPad as second display'
            : 'Connected · Continuity session active',
          'now'
        );
      }, 400);
    }
    if (global.AppRegistry && typeof AppRegistry.open === 'function') {
      AppRegistry.open(appId);
    } else if (global.WindowManager) {
      WindowManager.open(
        appId,
        titleFor(appId),
        '<div class="app-empty"><div class="empty-title">' +
          escapeHtml(titleFor(appId)) +
          '</div><div class="muted">App content pending.</div></div>',
        { width: 720, height: 480 }
      );
      MacShell.bounceDock(appId);
      MacShell.setRunning(appId, true);
      MacShell.setActiveApp(titleFor(appId));
    }
  }

  /* ── Clock ─────────────────────────────────────────── */

  function formatClock(date) {
    var days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var day = days[date.getDay()];
    var mon = months[date.getMonth()];
    var d = date.getDate();
    var h = date.getHours();
    var m = date.getMinutes();
    var ampm = h >= 12 ? 'PM' : 'AM';
    var h12 = h % 12 || 12;
    var mm = m < 10 ? '0' + m : String(m);
    // e.g. "Fri Jul 17  9:41 PM"
    return day + ' ' + mon + ' ' + d + '  ' + h12 + ':' + mm + ' ' + ampm;
  }

  function formatDateLong(date) {
    var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return days[date.getDay()] + ', ' + months[date.getMonth()] + ' ' + date.getDate();
  }

  function formatWidgetTime(date) {
    var h = date.getHours();
    var m = date.getMinutes();
    var h12 = h % 12 || 12;
    var mm = m < 10 ? '0' + m : String(m);
    return h12 + ':' + mm;
  }

  var batteryPercent = 100;
  var batteryTimer = null;

  function wireMenubarClock() {
    var btn = $('#menubar-clock');
    if (!btn || btn.dataset.clockWired) return;
    btn.dataset.clockWired = '1';
    btn.addEventListener('contextmenu', function (e) {
      e.preventDefault();
      e.stopPropagation();
      var text = ($('#clock-text') && $('#clock-text').textContent) || formatClock(new Date());
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).catch(function () {});
      }
      notify('Clock', 'Copied', text, 'now');
      if (global.MacSounds && MacSounds.play) MacSounds.play('tink');
    });
    btn.addEventListener('dblclick', function (e) {
      e.preventDefault();
      e.stopPropagation();
      openApp('clock');
      if (global.MacSounds && MacSounds.play) MacSounds.play('pop');
    });
    btn.title = 'Notification Center · Double-click Clock · Right-click to copy';
  }

  function updateClock() {
    var now = new Date();
    var el = $('#clock-text');
    if (el) el.textContent = formatClock(now);
    var ncDate = $('#nc-date');
    if (ncDate) ncDate.textContent = formatDateLong(now);

    // Desktop widgets
    var wTime = $('#widget-time');
    if (wTime) wTime.textContent = formatWidgetTime(now);
    var wDate = $('#widget-date');
    if (wDate) wDate.textContent = formatDateLong(now);
    var calDow = $('#widget-cal-dow');
    if (calDow) {
      var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      calDow.textContent = days[now.getDay()];
    }
    var calDay = $('#widget-cal-day');
    if (calDay) calDay.textContent = String(now.getDate());
  }

  function wireNetworkStatus() {
    var wifiBtn = $('#wifi-btn');
    function paint() {
      var online = navigator.onLine !== false;
      if (wifiBtn) {
        wifiBtn.classList.toggle('is-offline', !online);
        wifiBtn.title = online ? 'Wi-Fi · Home Network' : 'Wi-Fi · Offline';
        wifiBtn.setAttribute('aria-label', online ? 'Wi-Fi connected' : 'Wi-Fi offline');
      }
      document.documentElement.classList.toggle('is-offline', !online);
    }
    paint();
    window.addEventListener('online', function () {
      paint();
      notify('Network', 'Connected', 'Internet connection restored', 'now');
      if (global.MacSounds && MacSounds.play) MacSounds.play('hero');
    });
    window.addEventListener('offline', function () {
      paint();
      notify('Network', 'Offline', 'No internet connection', 'now');
      if (global.MacSounds && MacSounds.play) MacSounds.play('sosumi');
    });
  }

  function wireBattery() {
    var btn = $('#menubar-battery');
    var level = $('#battery-level');
    var pct = $('#battery-percent');
    function paint() {
      if (pct) pct.textContent = Math.round(batteryPercent) + '%';
      if (level) {
        level.style.width = Math.max(8, batteryPercent) + '%';
        level.style.background =
          batteryPercent < 20 ? '#ff453a' : batteryPercent < 40 ? '#ffd60a' : '#30d158';
      }
    }
    paint();
    if (batteryTimer) clearInterval(batteryTimer);
    batteryTimer = setInterval(function () {
      batteryPercent = Math.max(5, batteryPercent - 0.15);
      if (batteryPercent < 8) batteryPercent = 100; // "charged" cycle for demo
      paint();
    }, 12000);
    if (btn) {
      btn.addEventListener('click', function (e) {
        // also opens CC via data-action; add toast
        notify(
          'Battery',
          Math.round(batteryPercent) + '%',
          batteryPercent > 80 ? 'Power Source: Power Adapter (sim)' : 'Power Source: Battery (sim)',
          'now'
        );
        if (global.MacSounds && MacSounds.play) MacSounds.play('tink');
      });
    }
  }

  function wireNotificationList() {
    var list = $('#notification-list');
    if (!list || list.dataset.wired) return;
    list.dataset.wired = '1';
    list.addEventListener('click', function (e) {
      var dismiss = e.target.closest('.notification-dismiss');
      var card = e.target.closest('.notification-card');
      if (dismiss && card) {
        e.preventDefault();
        e.stopPropagation();
        card.classList.add('is-dismissing');
        setTimeout(function () {
          card.remove();
          if (!list.querySelector('.notification-card')) {
            list.innerHTML = '<p class="muted nc-empty" style="padding:16px">No Notifications</p>';
          }
        }, 180);
        if (global.MacSounds && MacSounds.play) MacSounds.play('pop');
        return;
      }
      if (card && !dismiss) {
        var appEl = card.querySelector('.notification-app');
        var appName = appEl ? appEl.textContent : '';
        var openMap = {
          Messages: 'messages',
          Mail: 'mail',
          Calendar: 'calendar',
          Music: 'music',
          Photos: 'photos',
          Safari: 'safari',
          Reminders: 'reminders',
          FaceTime: 'facetime',
          Weather: 'weather',
          Clock: 'clock',
        };
        var id = openMap[appName];
        if (id) {
          hideOverlay($('#notification-center'));
          openApp(id);
          if (global.MacSounds && MacSounds.play) MacSounds.play('pop');
        }
      }
    });
    // Ensure sample cards have dismiss
    $$('.notification-card', list).forEach(function (card) {
      if (!card.querySelector('.notification-dismiss')) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'notification-dismiss';
        b.setAttribute('aria-label', 'Dismiss');
        b.textContent = '✕';
        card.insertBefore(b, card.firstChild);
      }
    });
  }

  function wireDesktopWidgets(root) {
    if (!root || root.dataset.wiredWidgets) return;
    root.dataset.wiredWidgets = '1';

    // Weather widget: click cycles city
    var wxCities = [
      { city: 'Cupertino', cond: 'Partly Cloudy', temp: '72°', hl: 'H:78°  L:58°' },
      { city: 'Seattle', cond: 'Light Rain', temp: '59°', hl: 'H:62°  L:50°' },
      { city: 'Miami', cond: 'Sunny', temp: '86°', hl: 'H:90°  L:76°' },
      { city: 'Denver', cond: 'Clear', temp: '64°', hl: 'H:71°  L:48°' },
    ];
    var wxIdx = 0;
    var wx = root.querySelector('.widget-weather');
    if (wx) {
      wx.style.cursor = 'pointer';
      wx.title = 'Click to change city · Double-click for Weather app';
      wx.addEventListener('click', function (e) {
        if (e.detail > 1) return;
        wxIdx = (wxIdx + 1) % wxCities.length;
        var c = wxCities[wxIdx];
        var city = wx.querySelector('.widget-wx-city');
        var cond = wx.querySelector('.widget-wx-cond');
        var temp = wx.querySelector('.widget-wx-temp');
        var hl = wx.querySelector('.widget-wx-hl');
        if (city) city.textContent = c.city;
        if (cond) cond.textContent = c.cond;
        if (temp) temp.textContent = c.temp;
        if (hl) hl.textContent = c.hl;
        if (global.MacSounds && MacSounds.play) MacSounds.play('pop');
      });
    }

    // Music widget controls
    var music = root.querySelector('.widget-music');
    if (music) {
      var playing = false;
      var controls = music.querySelector('.widget-music-controls');
      if (controls) {
        controls.style.pointerEvents = 'auto';
        $$('button, span', controls).forEach(function (btn) {
          btn.addEventListener('click', function (e) {
            e.stopPropagation();
            var act = btn.getAttribute('data-wm') || '';
            var isPlay = act === 'play' || btn.classList.contains('play');
            if (isPlay) {
              playing = !playing;
              btn.textContent = playing ? '❚❚' : '▶';
              btn.setAttribute('aria-label', playing ? 'Pause' : 'Play');
              if (global.MacSounds && MacSounds.play) MacSounds.play(playing ? 'funk' : 'pop');
            } else {
              if (global.MacSounds && MacSounds.play) MacSounds.play('tink');
              var title = music.querySelector('.widget-music-title');
              var tracks = ['Liquid Glass', 'Neon Rain', 'Soft Static', 'Harbor Lights'];
              if (title) title.textContent = tracks[Math.floor(Math.random() * tracks.length)];
            }
          });
        });
      }
    }

    // Calendar widget click selects event / opens on dblclick already
    var cal = root.querySelector('.widget-calendar');
    if (cal) {
      $$('.widget-event', cal).forEach(function (ev) {
        ev.style.cursor = 'pointer';
        ev.addEventListener('click', function (e) {
          e.stopPropagation();
          $$('.widget-event', cal).forEach(function (x) {
            x.classList.remove('is-selected');
          });
          ev.classList.add('is-selected');
          if (global.MacSounds && MacSounds.play) MacSounds.play('tink');
        });
      });
    }

    // Live clock widget
    var clockW = root.querySelector('.widget-clock, [data-widget="clock"]');
    if (clockW) {
      var timeEl =
        clockW.querySelector('.widget-clock-time, .widget-time, .clock-time') ||
        clockW.querySelector('strong');
      var dateEl = clockW.querySelector('.widget-clock-date, .widget-date, .muted');
      function tickClock() {
        var now = new Date();
        if (timeEl) timeEl.textContent = formatWidgetTime(now);
        if (dateEl && /day|date|week/i.test(dateEl.textContent + 'date')) {
          dateEl.textContent = formatDateLong(now);
        }
      }
      tickClock();
      setInterval(tickClock, 15000);
    }
  }

  /* ── Appearance (Light / Dark / Auto) ──────────────── */

  function loadAppearancePref() {
    try {
      var v = localStorage.getItem('macos-appearance');
      if (v === 'light' || v === 'dark' || v === 'auto') appearancePref = v;
      else appearancePref = 'auto';
    } catch (e) {
      appearancePref = 'auto';
    }
    return appearancePref;
  }

  function systemPrefersDark() {
    try {
      return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    } catch (e) {
      return false;
    }
  }

  function resolveTheme(pref) {
    pref = pref || appearancePref;
    if (pref === 'dark') return 'dark';
    if (pref === 'light') return 'light';
    return systemPrefersDark() ? 'dark' : 'light';
  }

  function appearanceLabel(pref) {
    pref = pref || appearancePref;
    if (pref === 'dark') return 'Dark';
    if (pref === 'light') return 'Light';
    return 'Automatic';
  }

  function appearanceIcon(pref) {
    pref = pref || appearancePref;
    if (pref === 'dark') return '☾';
    if (pref === 'light') return '☀';
    return '◐';
  }

  function syncAppearanceUI() {
    var label = $('#cc-appearance-label');
    var icon = $('#cc-appearance-icon');
    var tile = $('#control-center [data-cc="appearance"]');
    if (label) label.textContent = appearanceLabel();
    if (icon) {
      // Display module end button — laptop glyph like real CC
      var theme = resolveTheme();
      icon.textContent = theme === 'dark' ? '☾' : '💻';
    }
    if (tile) {
      tile.classList.toggle('is-active', appearancePref !== 'auto' || resolveTheme() === 'dark');
      tile.setAttribute('aria-label', 'Appearance: ' + appearanceLabel());
      tile.setAttribute('title', 'Appearance: ' + appearanceLabel() + ' (click to cycle)');
    }
    // Sync any open System Settings appearance segment
    document.querySelectorAll('.appearance-seg button[data-appearance]').forEach(function (btn) {
      btn.classList.toggle('is-selected', btn.getAttribute('data-appearance') === appearancePref);
    });
    var status = document.getElementById('appearance-status');
    if (status) {
      status.textContent =
        appearancePref === 'auto'
          ? 'Automatic · currently ' + (resolveTheme() === 'dark' ? 'Dark' : 'Light') + ' (follows system)'
          : appearanceLabel() + ' mode';
    }
  }

  function applyAppearance(pref, opts) {
    opts = opts || {};
    if (pref === 'light' || pref === 'dark' || pref === 'auto') {
      appearancePref = pref;
    }
    try {
      localStorage.setItem('macos-appearance', appearancePref);
    } catch (e) { /* ignore */ }

    var theme = resolveTheme(appearancePref);
    var root = document.documentElement;
    root.setAttribute('data-appearance', appearancePref);
    root.setAttribute('data-theme', theme);
    if (document.body) {
      document.body.setAttribute('data-theme', theme);
      document.body.classList.toggle('theme-dark', theme === 'dark');
      document.body.classList.toggle('theme-light', theme === 'light');
    }
    var macos = $('#macos');
    if (macos) {
      macos.setAttribute('data-theme', theme);
      macos.setAttribute('data-appearance', appearancePref);
    }

    syncAppearanceUI();

    if (opts.notify) {
      notify('System Settings', 'Appearance', appearanceLabel(appearancePref), 'now');
    }

    try {
      document.dispatchEvent(
        new CustomEvent('macos:appearance', {
          detail: { preference: appearancePref, theme: theme }
        })
      );
    } catch (e) { /* ignore */ }

    return theme;
  }

  function cycleAppearance() {
    var order = ['auto', 'light', 'dark'];
    var i = order.indexOf(appearancePref);
    if (i < 0) i = 0;
    applyAppearance(order[(i + 1) % order.length], { notify: true });
  }

  function setAppearance(pref, opts) {
    applyAppearance(pref, opts || {});
  }

  function wireSystemAppearanceListener() {
    if (!window.matchMedia) return;
    try {
      if (systemDarkMql && systemDarkMql.removeEventListener) {
        systemDarkMql.removeEventListener('change', onSystemSchemeChange);
      }
    } catch (e) { /* ignore */ }
    systemDarkMql = window.matchMedia('(prefers-color-scheme: dark)');
    function onSystemSchemeChange() {
      if (appearancePref === 'auto') {
        applyAppearance('auto', { notify: false });
      }
    }
    if (systemDarkMql.addEventListener) {
      systemDarkMql.addEventListener('change', onSystemSchemeChange);
    } else if (systemDarkMql.addListener) {
      systemDarkMql.addListener(onSystemSchemeChange);
    }
  }

  /* ── Wallpaper ─────────────────────────────────────── */

  function applyWallpaper(url) {
    var wall = $('#wallpaper');
    if (!wall) return;
    var isGlass = !!(url && url.indexOf('wallpaper-glass') !== -1);
    if (url) {
      wall.style.backgroundImage = 'url("' + url + '")';
      wall.dataset.wallpaper = url;
    }
    wall.classList.toggle('wallpaper-glass', isGlass);
    wall.classList.toggle('glass-wallpaper', isGlass);
  }

  function cycleWallpaper() {
    wallpaperIndex = (wallpaperIndex + 1) % WALLPAPERS.length;
    applyWallpaper(WALLPAPERS[wallpaperIndex]);
    var names = ['macOS 27 Default', 'Liquid Glass', 'Crystal Mist'];
    notify(
      'Desktop',
      'Wallpaper',
      names[wallpaperIndex] || 'Wallpaper changed',
      'now'
    );
  }

  function setWallpaperByIndex(i) {
    if (i < 0 || i >= WALLPAPERS.length) return;
    wallpaperIndex = i;
    applyWallpaper(WALLPAPERS[wallpaperIndex]);
  }

  function isFocusModeOn() {
    try {
      return localStorage.getItem('macos-cc-focus') === '1';
    } catch (e) {
      return false;
    }
  }

  function setFocusMode(on) {
    try {
      localStorage.setItem('macos-cc-focus', on ? '1' : '0');
    } catch (e) {}
    document.documentElement.classList.toggle('focus-mode', !!on);
    var badge = $('#focus-menubar-badge');
    if (badge) badge.hidden = !on;
    var tile = $('#control-center [data-cc="focus"]');
    if (tile) {
      tile.classList.toggle('is-active', !!on);
      var sub = tile.querySelector('.cc-sublabel');
      if (sub) sub.textContent = on ? 'On' : 'Off';
    }
  }

  function notify(app, title, message, time, opts) {
    opts = opts || {};
    /* Do Not Disturb: suppress banners unless forced (e.g. system critical) */
    if (isFocusModeOn() && !opts.force && app !== 'Focus') {
      return;
    }
    var list = $('#notification-list');
    if (!list) return;
    // Remove empty state
    var empty = list.querySelector('.nc-empty, .muted');
    if (empty && !empty.classList.contains('notification-message')) {
      if (list.querySelector('.nc-empty') || (list.children.length === 1 && empty.classList.contains('muted'))) {
        list.innerHTML = '';
      }
    }
    var card = document.createElement('div');
    card.className = 'notification-card is-new';
    card.innerHTML =
      '<button type="button" class="notification-dismiss" aria-label="Dismiss">✕</button>' +
      '<div class="notification-icon">💻</div>' +
      '<div class="notification-body">' +
      '<div class="notification-app">' + escapeHtml(app || 'macOS') + '</div>' +
      '<div class="notification-title">' + escapeHtml(title || '') + '</div>' +
      '<div class="notification-message">' + escapeHtml(message || '') + '</div>' +
      '<div class="notification-time">' + escapeHtml(time || 'now') + '</div>' +
      '</div>';
    list.insertBefore(card, list.firstChild);
    var dismiss = card.querySelector('.notification-dismiss');
    if (dismiss) {
      dismiss.addEventListener('click', function (e) {
        e.stopPropagation();
        card.remove();
        if (!list.children.length) {
          list.innerHTML = '<p class="muted nc-empty" style="padding:16px">No Notifications</p>';
        }
        if (global.MacSounds && MacSounds.play) MacSounds.play('pop');
      });
    }
    card.addEventListener('click', function (e) {
      if (e.target.closest('.notification-dismiss')) return;
      card.classList.remove('is-new');
      /* Open related app when possible */
      var appName = (app || '').toLowerCase();
      var openMap = {
        messages: 'messages',
        mail: 'mail',
        calendar: 'calendar',
        music: 'music',
        photos: 'photos',
        safari: 'safari',
        finder: 'finder',
        reminders: 'reminders',
        clock: 'clock',
        weather: 'weather',
        facetime: 'facetime',
        phone: 'phone',
        'app store': 'appstore',
        spotlight: null,
        focus: null,
        macos: null,
        desktop: null,
      };
      var id = openMap[appName];
      if (!id) {
        /* fuzzy */
        if (/message|imessage/i.test(appName)) id = 'messages';
        else if (/mail/i.test(appName)) id = 'mail';
        else if (/calendar|event/i.test(appName)) id = 'calendar';
        else if (/music|podcast/i.test(appName)) id = 'music';
        else if (/photo/i.test(appName)) id = 'photos';
        else if (/safari|browser/i.test(appName)) id = 'safari';
        else if (/setting/i.test(appName)) id = 'system-settings';
        else if (/iphone|continuity/i.test(appName)) id = 'iphone-mirroring';
      }
      if (id) {
        hideOverlay($('#notification-center'));
        openApp(id);
        if (global.MacSounds && MacSounds.play) MacSounds.play('pop');
      }
    });
    // Cap list length
    while (list.querySelectorAll('.notification-card').length > 12) {
      var last = list.querySelector('.notification-card:last-child');
      if (last) last.remove();
      else break;
    }
    setTimeout(function () {
      card.classList.remove('is-new');
    }, 4000);
  }

  /* ── Overlay helpers (CSS uses .is-open + aria-hidden) ─ */

  function isOpen(el) {
    return el && el.classList.contains('is-open');
  }

  function showOverlay(el) {
    if (!el) return;
    el.classList.add('is-open');
    el.setAttribute('aria-hidden', 'false');
  }

  function hideOverlay(el) {
    if (!el) return;
    el.classList.remove('is-open');
    el.setAttribute('aria-hidden', 'true');
  }

  function closeAllOverlays() {
    hideOverlay($('#spotlight'));
    hideOverlay($('#launchpad'));
    hideOverlay($('#mission-control'));
    hideOverlay($('#control-center'));
    hideOverlay($('#notification-center'));
    hideOverlay($('#context-menu'));
    closeMenubarMenus();
    var ccBtn = $('#control-center-btn');
    if (ccBtn) ccBtn.setAttribute('aria-expanded', 'false');
    var ncBtn = $('#menubar-clock');
    if (ncBtn) ncBtn.setAttribute('aria-expanded', 'false');
  }

  function closeMenubarMenus() {
    $$('.menubar-item.is-open').forEach(function (item) {
      item.classList.remove('is-open');
      item.setAttribute('aria-expanded', 'false');
    });
    $$('.menu-dropdown.is-open').forEach(function (d) {
      d.classList.remove('is-open');
    });
  }

  /* ── Dock ──────────────────────────────────────────── */

  function renderDock() {
    var dock = $('#dock');
    if (!dock) return;

    var apps = dockAppList();
    var html = '';
    apps.forEach(function (appId, i) {
      // separator before trash
      if (appId === 'trash' && i > 0) {
        html += '<div class="dock-separator" role="separator" aria-hidden="true"></div>';
      }
      var name = titleFor(appId);
      var running = runningApps[appId] ? ' is-running' : '';
      html +=
        '<div class="dock-item' + running + '" data-app="' + escapeHtml(appId) +
        '" data-tooltip="' + escapeHtml(name) + '" tabindex="0" role="button" aria-label="' +
        escapeHtml(name) + '">' +
        '<span class="dock-tooltip">' + escapeHtml(name) + '</span>' +
        '<div class="dock-icon" data-icon="' + escapeHtml(appId) + '">' + iconHtml(appId) + '</div>' +
        '</div>';
    });
    dock.innerHTML = html;
    wireDockInteractions(dock);
    syncRunningFromWindows();
  }

  function loadDesktopIconPositions() {
    try {
      return JSON.parse(localStorage.getItem('macos-desktop-icons') || '{}') || {};
    } catch (e) {
      return {};
    }
  }

  function saveDesktopIconPositions(map) {
    try {
      localStorage.setItem('macos-desktop-icons', JSON.stringify(map || {}));
    } catch (e) {}
  }

  function openDesktopIcon(btn) {
    if (!btn) return;
    var app = btn.getAttribute('data-open');
    var nav = btn.getAttribute('data-nav');
    var kind = btn.getAttribute('data-kind') || '';
    if (kind === 'trash' || app === 'trash' || nav === 'trash') {
      finderGo('trash');
      return;
    }
    if (nav) {
      finderGo(nav);
      return;
    }
    if (app === 'finder' || kind === 'drive' || kind === 'folder') {
      finderGo(kind === 'drive' ? 'drive' : nav || 'desktop');
      return;
    }
    if (app) {
      openApp(app);
      if (global.MacSounds && MacSounds.play) MacSounds.play('pop');
    }
  }

  function desktopIconGlyph(it) {
    if (it.kind === 'app') return iconHtml(it.id);
    if (it.kind === 'drive') return iconHtml('disk-utility');
    if (it.kind === 'trash') return iconHtml('trash');
    if (it.key === 'down') return iconHtml('downloads');
    return iconHtml('folder');
  }

  function renderDesktopIcons() {
    var host = $('#desktop-icons');
    if (!host) return;
    /* Dock carries Notes/Calendar/Trash — desktop stays a short right column */
    var items = [
      { key: 'hd', id: 'finder', label: 'Macintosh HD', kind: 'drive', nav: 'drive' },
      { key: 'apps', id: 'finder', label: 'Applications', kind: 'folder', nav: 'apps' },
      { key: 'docs', id: 'finder', label: 'Documents', kind: 'folder', nav: 'docs' },
      { key: 'down', id: 'finder', label: 'Downloads', kind: 'folder', nav: 'down' },
      { key: 'safari', id: 'safari', label: 'Safari', kind: 'app' },
      { key: 'photos', id: 'photos', label: 'Photos', kind: 'app' },
      { key: 'messages', id: 'messages', label: 'Messages', kind: 'app' },
    ];
    var pos = loadDesktopIconPositions();
    host.classList.add('is-freeform');
    var topPad = 32;
    var dockReserve = 128;
    var colWidth = 96;
    var iconW = 88;
    var iconBlock = 70;
    var vh = window.innerHeight || 800;
    var vw = window.innerWidth || 1280;
    /* Prefer live host size once laid out (full-bleed freeform layer) */
    var hostW = Math.max(host.clientWidth || 0, vw);
    var hostH = Math.max(host.clientHeight || 0, vh);
    var avail = Math.max(220, hostH - topPad - dockReserve);
    /* Fit all icons so last bottom <= hostH - dockReserve */
    var step = Math.floor((avail - iconBlock) / Math.max(items.length - 1, 1));
    step = Math.min(78, Math.max(54, step));
    /* Safety: if last icon would still clip, tighten further */
    while (
      items.length > 1 &&
      topPad + (items.length - 1) * step + iconBlock > hostH - dockReserve &&
      step > 52
    ) {
      step -= 2;
    }
    var perCol = Math.max(1, Math.floor((avail - iconBlock) / step) + 1);
    /* Drop corrupt saved coords (from old shrink-wrapped host / viewport-coord bug) */
    var cleanPos = {};
    Object.keys(pos).forEach(function (k) {
      var p = pos[k];
      if (!p || typeof p.x !== 'number' || typeof p.y !== 'number') return;
      if (!isFinite(p.x) || !isFinite(p.y)) return;
      if (p.x < -20 || p.y < 0 || p.x > hostW - 40 || p.y > hostH - 40) return;
      cleanPos[k] = {
        x: Math.max(8, Math.min(hostW - iconW - 8, p.x)),
        y: Math.max(36, Math.min(hostH - 100, p.y)),
      };
    });
    if (Object.keys(cleanPos).length !== Object.keys(pos).length) {
      saveDesktopIconPositions(cleanPos);
    }
    pos = cleanPos;
    /* Always position with left/top (never right) so drag never flips coordinate systems */
    host.innerHTML = items
      .map(function (it, i) {
        var p = pos[it.key];
        var left;
        var top;
        if (p && typeof p.x === 'number' && typeof p.y === 'number') {
          left = p.x;
          top = p.y;
        } else {
          var col = Math.floor(i / perCol);
          var row = i % perCol;
          left = Math.max(8, hostW - 14 - iconW - col * colWidth);
          top = topPad + row * step;
        }
        var style = 'left:' + left + 'px;top:' + top + 'px;right:auto;bottom:auto;';
        return (
          '<button type="button" class="desktop-icon" data-key="' +
          escapeHtml(it.key) +
          '" data-open="' +
          escapeHtml(it.id) +
          '" data-nav="' +
          escapeHtml(it.nav || '') +
          '" data-kind="' +
          escapeHtml(it.kind) +
          '" style="' +
          style +
          '">' +
          '<div class="desktop-icon-img kind-' +
          escapeHtml(it.kind) +
          '">' +
          desktopIconGlyph(it) +
          '</div>' +
          '<span class="desktop-icon-label">' +
          escapeHtml(it.label) +
          '</span></button>'
        );
      })
      .join('');
    $$('.desktop-icon', host).forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (btn._suppressClick) {
          btn._suppressClick = false;
          return;
        }
        $$('.desktop-icon', host).forEach(function (b) {
          b.classList.remove('is-selected');
        });
        btn.classList.add('is-selected');
        /* Single-click opens (Finder-style desktop); drag sets _suppressClick */
        openDesktopIcon(btn);
      });
      btn.addEventListener('dblclick', function (e) {
        e.preventDefault();
        openDesktopIcon(btn);
      });
      btn.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openDesktopIcon(btn);
        }
      });
      enableDesktopIconDrag(btn, host);
    });
  }

  function enableDesktopIconDrag(btn, host) {
    var dragging = false;
    var pointerId = null;
    var ox = 0;
    var oy = 0;
    var startX = 0;
    var startY = 0;
    var moved = false;

    function hostRect() {
      return host.getBoundingClientRect();
    }

    function clampPos(x, y) {
      var hr = hostRect();
      var w = btn.offsetWidth || 88;
      var h = btn.offsetHeight || 72;
      /* Host-local coordinates (full-bleed #desktop-icons) */
      var maxX = Math.max(8, (hr.width || host.clientWidth || 0) - w - 8);
      var maxY = Math.max(36, (hr.height || host.clientHeight || 0) - h - 88);
      return {
        x: Math.max(8, Math.min(maxX, x)),
        y: Math.max(36, Math.min(maxY, y)),
      };
    }

    function applyPos(x, y) {
      var p = clampPos(x, y);
      btn.style.left = p.x + 'px';
      btn.style.top = p.y + 'px';
      btn.style.right = 'auto';
      btn.style.bottom = 'auto';
      return p;
    }

    function onMove(e) {
      if (!dragging) return;
      if (pointerId != null && e.pointerId !== pointerId) return;
      var dist = Math.abs(e.clientX - startX) + Math.abs(e.clientY - startY);
      if (dist > 5) {
        if (!moved) {
          moved = true;
          btn.classList.add('is-dragging');
          btn._suppressClick = true;
          try {
            btn.setPointerCapture(e.pointerId);
          } catch (err) {}
        }
      }
      if (!moved) return;
      e.preventDefault();
      var hr = hostRect();
      applyPos(e.clientX - ox - hr.left, e.clientY - oy - hr.top);
    }

    function endDrag(e) {
      if (!dragging) return;
      if (e && pointerId != null && e.pointerId != null && e.pointerId !== pointerId) return;
      dragging = false;
      btn.classList.remove('is-dragging');
      document.removeEventListener('pointermove', onMove, true);
      document.removeEventListener('pointerup', endDrag, true);
      document.removeEventListener('pointercancel', endDrag, true);
      try {
        if (e && e.pointerId != null) btn.releasePointerCapture(e.pointerId);
      } catch (err) {}
      pointerId = null;
      if (!moved) return;
      btn._suppressClick = true;
      var key = btn.getAttribute('data-key');
      if (!key) return;
      var hr = hostRect();
      var br = btn.getBoundingClientRect();
      var p = applyPos(br.left - hr.left, br.top - hr.top);
      var map = loadDesktopIconPositions();
      map[key] = { x: p.x, y: p.y };
      saveDesktopIconPositions(map);
      setTimeout(function () {
        btn._suppressClick = false;
      }, 120);
    }

    btn.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      /* Ignore if a window is under the pointer (icons are below windows in z) */
      dragging = true;
      moved = false;
      pointerId = e.pointerId;
      var r = btn.getBoundingClientRect();
      ox = e.clientX - r.left;
      oy = e.clientY - r.top;
      startX = e.clientX;
      startY = e.clientY;
      /* Document capture so drag continues when pointer leaves the icon */
      document.addEventListener('pointermove', onMove, true);
      document.addEventListener('pointerup', endDrag, true);
      document.addEventListener('pointercancel', endDrag, true);
    });
  }

  function wireDockInteractions(dock) {
    var items = $$('.dock-item', dock);

    // Magnification via --scale + data-magnify (can be disabled in System Settings)
    function magEnabled() {
      if (dock.classList.contains('no-magnify')) return false;
      if (document.documentElement.classList.contains('dock-mag-off')) return false;
      try {
        return localStorage.getItem('macos-dock-mag') !== '0';
      } catch (e) {
        return true;
      }
    }
    dock.addEventListener('mousemove', function (e) {
      if (!magEnabled()) {
        items.forEach(function (item) {
          item.style.setProperty('--scale', '1');
          item.removeAttribute('data-magnify');
        });
        return;
      }
      items.forEach(function (item) {
        var rect = item.getBoundingClientRect();
        var mid = rect.left + rect.width / 2;
        var dist = Math.abs(e.clientX - mid);
        var scale = 1 + Math.max(0, 1 - dist / 140) * 0.6;
        item.setAttribute('data-magnify', '');
        item.style.setProperty('--scale', scale.toFixed(3));
      });
    });
    dock.addEventListener('mouseleave', function () {
      items.forEach(function (item) {
        item.style.setProperty('--scale', '1');
        item.removeAttribute('data-magnify');
      });
    });
    /* restore mag preference */
    try {
      if (localStorage.getItem('macos-dock-mag') === '0') {
        dock.classList.add('no-magnify');
        document.documentElement.classList.add('dock-mag-off');
      }
    } catch (e) {}

    items.forEach(function (item) {
      function activate() {
        var appId = item.getAttribute('data-app');
        if (appId === 'trash') {
          openApp('finder');
          setTimeout(function () {
            var win =
              global.WindowManager &&
              WindowManager.getWindowByAppId &&
              WindowManager.getWindowByAppId('finder');
            var body = win && win.el && win.el.querySelector('.window-content');
            var t = body && body.querySelector('.finder-sb-item[data-nav="trash"]');
            if (t) t.click();
          }, 100);
          return;
        }
        /* macOS-like: if app focused → minimize; if minimized/other → restore/focus */
        if (global.WindowManager && runningApps[appId]) {
          var win = WindowManager.getWindowByAppId && WindowManager.getWindowByAppId(appId);
          var focused = WindowManager.getFocused && WindowManager.getFocused();
          if (win && win.minimized) {
            WindowManager.restore(win.id);
            WindowManager.focus(win.id);
            if (global.MacSounds && MacSounds.play) MacSounds.play('pop');
            return;
          }
          if (win && focused && focused.appId === appId && !win.minimized) {
            WindowManager.minimize(win.id);
            bounceDock(appId);
            if (global.MacSounds && MacSounds.play) MacSounds.play('tink');
            return;
          }
        }
        openApp(appId);
      }
      item.addEventListener('click', activate);
      item.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          activate();
        }
      });
      item.addEventListener('contextmenu', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var appId = item.getAttribute('data-app');
        showDockContextMenu(e.clientX, e.clientY, appId);
      });
    });
  }

  var DESKTOP_CONTEXT_HTML =
    '<div class="context-item" data-action="new-folder" role="menuitem">New Folder</div>' +
    '<div class="context-item" data-action="get-info" role="menuitem">Get Info</div>' +
    '<div class="context-separator" role="separator"></div>' +
    '<div class="context-item" data-action="change-wallpaper" role="menuitem">Change Wallpaper…</div>' +
    '<div class="context-item" data-action="wallpaper" role="menuitem">Wallpaper Settings…</div>' +
    '<div class="context-item" data-action="sort-by" role="menuitem">Sort By Name</div>' +
    '<div class="context-separator" role="separator"></div>' +
    '<div class="context-item" data-action="clean-up" role="menuitem">Clean Up</div>' +
    '<div class="context-item" data-action="as-icons" role="menuitem">as Icons</div>' +
    '<div class="context-item" data-action="show-path-bar" role="menuitem">Show Path Bar</div>' +
    '<div class="context-separator" role="separator"></div>' +
    '<div class="context-item" data-action="system-settings" role="menuitem">System Settings…</div>' +
    '<div class="context-item" data-action="refresh" role="menuitem">Refresh Desktop</div>';

  function positionContextMenu(menu, x, y) {
    if (!menu) return;
    var pad = 8;
    /* Force layout so offsetWidth/Height are real while visible */
    var mw = menu.offsetWidth || 220;
    var mh = menu.offsetHeight || 240;
    var left = Math.max(pad, Math.min(x, window.innerWidth - mw - pad));
    var top = Math.max(pad, Math.min(y, window.innerHeight - mh - pad));
    menu.style.left = left + 'px';
    menu.style.top = top + 'px';
  }

  function openContextMenu(x, y, html) {
    var menu = $('#context-menu');
    if (!menu) return;
    closeAllOverlays();
    menu.innerHTML = html || DESKTOP_CONTEXT_HTML;
    showOverlay(menu);
    positionContextMenu(menu, x, y);
    /* Reposition after paint in case content height differed */
    requestAnimationFrame(function () {
      positionContextMenu(menu, x, y);
    });
  }

  function showDockContextMenu(x, y, appId) {
    var name = titleFor(appId);
    var isTrash = appId === 'trash';
    var html =
      (isTrash
        ? '<div class="context-item" data-action="dock-open-trash" role="menuitem">Open Trash</div>' +
          '<div class="context-item" data-action="empty-trash" role="menuitem">Empty Trash</div>'
        : '<div class="context-item" data-action="dock-open" data-app="' +
          escapeHtml(appId) +
          '" role="menuitem">Open ' +
          escapeHtml(name) +
          '</div>') +
      (runningApps[appId] && !isTrash
        ? '<div class="context-item" data-action="dock-quit" data-app="' +
          escapeHtml(appId) +
          '" role="menuitem">Quit</div>' +
          '<div class="context-item" data-action="dock-hide" data-app="' +
          escapeHtml(appId) +
          '" role="menuitem">Hide</div>'
        : '') +
      '<div class="context-separator" role="separator"></div>' +
      (isTrash
        ? ''
        : '<div class="context-item" data-action="dock-show-finder" data-app="' +
          escapeHtml(appId) +
          '" role="menuitem">Show in Finder</div>') +
      '<div class="context-item" data-action="dock-options" role="menuitem">Options</div>';
    openContextMenu(x, y, html);
  }

  function showIconContextMenu(x, y, iconEl) {
    if (!iconEl) {
      openContextMenu(x, y, DESKTOP_CONTEXT_HTML);
      return;
    }
    $$('.desktop-icon').forEach(function (b) {
      b.classList.remove('is-selected');
    });
    iconEl.classList.add('is-selected');
    var label =
      ((iconEl.querySelector('.desktop-icon-label') || {}).textContent || 'Item').trim();
    var openId = iconEl.getAttribute('data-open') || '';
    var nav = iconEl.getAttribute('data-nav') || '';
    var kind = iconEl.getAttribute('data-kind') || '';
    var html =
      '<div class="context-item" data-action="icon-open" data-open="' +
      escapeHtml(openId) +
      '" data-nav="' +
      escapeHtml(nav) +
      '" role="menuitem">Open</div>' +
      '<div class="context-item" data-action="get-info" role="menuitem">Get Info</div>' +
      '<div class="context-separator" role="separator"></div>' +
      (kind === 'trash'
        ? '<div class="context-item" data-action="empty-trash" role="menuitem">Empty Trash</div>' +
          '<div class="context-separator" role="separator"></div>'
        : '') +
      '<div class="context-item" data-action="clean-up" role="menuitem">Clean Up</div>' +
      '<div class="context-item" data-action="change-wallpaper" role="menuitem">Change Wallpaper…</div>' +
      '<div class="context-separator" role="separator"></div>' +
      '<div class="context-item is-disabled" role="menuitem">' +
      escapeHtml(label) +
      '</div>';
    openContextMenu(x, y, html);
  }

  function runDockContextAction(a, id) {
    if (a === 'dock-open') openApp(id);
    if (a === 'dock-open-trash') {
      openApp('finder');
      setTimeout(function () {
        var win =
          global.WindowManager &&
          WindowManager.getWindowByAppId &&
          WindowManager.getWindowByAppId('finder');
        var body = win && win.el && win.el.querySelector('.window-content');
        var t = body && body.querySelector('.finder-sb-item[data-nav="trash"]');
        if (t) t.click();
      }, 100);
    }
    if (a === 'empty-trash') handleMenuAction('empty-trash');
    if (a === 'dock-quit' && global.WindowManager) {
      WindowManager.closeApp(id);
      syncRunningFromWindows();
    }
    if (a === 'dock-hide' && global.WindowManager) {
      var w = WindowManager.getWindowByAppId && WindowManager.getWindowByAppId(id);
      if (w) WindowManager.minimize(w.id);
    }
    if (a === 'dock-show-finder') {
      openApp('finder');
      setTimeout(function () {
        finderGo('apps');
      }, 100);
    }
    if (a === 'dock-options') {
      notify('Dock', 'Options', 'Keep in Dock · Open at Login (demo)', 'now');
    }
    if (a === 'icon-open') {
      var sel = document.querySelector('.desktop-icon.is-selected');
      if (sel) openDesktopIcon(sel);
      else if (id) openApp(id);
    }
    if (global.MacSounds && MacSounds.play) MacSounds.play('pop');
  }

  function bounceDock(appId) {
    var item = $('.dock-item[data-app="' + appId + '"]');
    if (!item) return;
    item.classList.remove('is-bouncing');
    void item.offsetWidth;
    item.classList.add('is-bouncing');
    setTimeout(function () {
      item.classList.remove('is-bouncing');
    }, 700);
  }

  function setRunning(appId, isRunning) {
    if (isRunning) runningApps[appId] = true;
    else delete runningApps[appId];

    // Also derive from open windows when clearing
    if (!isRunning && global.WindowManager && WindowManager.isOpen(appId)) {
      runningApps[appId] = true;
    }

    var item = $('.dock-item[data-app="' + appId + '"]');
    if (item) {
      item.classList.toggle('is-running', !!runningApps[appId]);
    }
  }

  function syncRunningFromWindows() {
    if (!global.WindowManager) return;
    var open = Object.create(null);
    WindowManager.getOpenWindows().forEach(function (w) {
      open[w.appId] = true;
      runningApps[w.appId] = true;
    });
    // Clear apps no longer open
    Object.keys(runningApps).forEach(function (id) {
      if (!open[id]) delete runningApps[id];
    });
    $$('.dock-item').forEach(function (item) {
      var id = item.getAttribute('data-app');
      item.classList.toggle('is-running', !!runningApps[id] && id !== 'launchpad');
      item.classList.toggle('is-open', false);
    });
    var focused = WindowManager.getFocused && WindowManager.getFocused();
    if (focused) {
      var fi = $('.dock-item[data-app="' + focused.appId + '"]');
      if (fi) fi.classList.add('is-open');
    }
  }

  /**
   * Set the frontmost app name in the menu bar.
   * CRITICAL: only ever set textContent on #menubar-app-title — never append.
   */
  function setActiveApp(name) {
    var text = String(name == null ? 'Finder' : name).replace(/\s+/g, ' ').trim() || 'Finder';
    // Guard against accidental accumulation if a bad caller passes the whole string
    if (/^(Finder){2,}$/i.test(text) || text.indexOf('FinderFinder') !== -1) {
      text = 'Finder';
    }

    var host = document.getElementById('active-app-name');
    var titleEl = document.getElementById('menubar-app-title');

    // Nuclear cleanup: remove every direct child text node and extra title spans
    if (host) {
      host.dataset.appName = text;
      Array.prototype.slice.call(host.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          host.removeChild(n);
        } else if (
          n.nodeType === 1 &&
          n.id !== 'app-menu' &&
          !n.classList.contains('menu-dropdown') &&
          n.id !== 'menubar-app-title'
        ) {
          // Remove duplicate label spans if any were ever created
          if (n.classList && n.classList.contains('app-name-label') && n.id !== 'menubar-app-title') {
            host.removeChild(n);
          }
        }
      });
      // Deduplicate #menubar-app-title
      var titles = host.querySelectorAll('#menubar-app-title, .app-name-label');
      if (titles.length > 1) {
        for (var i = 1; i < titles.length; i++) {
          if (titles[i].parentNode) titles[i].parentNode.removeChild(titles[i]);
        }
        titleEl = document.getElementById('menubar-app-title') || titles[0];
      }
    }

    if (!titleEl && host) {
      titleEl = document.createElement('span');
      titleEl.id = 'menubar-app-title';
      titleEl.className = 'app-name-label';
      var dd = host.querySelector('.menu-dropdown');
      host.insertBefore(titleEl, dd || host.firstChild);
    }

    if (titleEl) {
      // REPLACE only — never += or appendChild of text
      titleEl.textContent = text;
    }

    var about = document.getElementById('menubar-about-app');
    if (about) about.textContent = 'About ' + text;
    else {
      var aboutItem = host && host.querySelector('[data-action="about-app"]');
      if (aboutItem) aboutItem.textContent = 'About ' + text;
    }

    var hide = document.getElementById('menubar-hide-app');
    if (hide) hide.textContent = 'Hide ' + text;

    var quit = document.getElementById('menubar-quit-app');
    if (quit) quit.textContent = 'Quit ' + text;

    var newWin = document.getElementById('menubar-new-window');
    if (newWin) newWin.textContent = text === 'Finder' ? 'New Finder Window' : 'New Window';
  }

  /* ── Spotlight ─────────────────────────────────────── */

  function showSpotlight() {
    closeAllOverlays();
    var ov = $('#spotlight');
    showOverlay(ov);
    var input = $('#spotlight-input');
    if (input) {
      input.value = '';
      renderSpotlightResults('');
      setTimeout(function () { input.focus(); }, 40);
    }
  }

  function hideSpotlight() {
    hideOverlay($('#spotlight'));
  }

  function toggleSpotlight() {
    var ov = $('#spotlight');
    if (isOpen(ov)) hideSpotlight();
    else showSpotlight();
  }

  function filterApps(query, limit) {
    var q = (query || '').trim().toLowerCase();
    var apps = allApps().filter(function (a) {
      return a.id !== 'spotlight';
    });
    if (!q) return apps.slice(0, limit != null ? limit : 10);
    return apps.filter(function (a) {
      return (a.name || '').toLowerCase().indexOf(q) !== -1 ||
        a.id.indexOf(q) !== -1 ||
        (a.category || '').toLowerCase().indexOf(q) !== -1;
    }).slice(0, limit != null ? limit : 24);
  }

  function spotlightCommands(query) {
    var q = (query || '').trim().toLowerCase();
    var cmds = [
      { id: 'cmd:lock', name: 'Lock Screen', sub: 'System', action: function () { showLockScreen('Lock Screen'); } },
      { id: 'cmd:sleep', name: 'Sleep', sub: 'System', action: function () { handleMenuAction('sleep'); } },
      { id: 'cmd:screenshot', name: 'Take Screenshot', sub: 'Capture entire screen', action: function () { captureScreenshot('full'); } },
      { id: 'cmd:mission', name: 'Mission Control', sub: 'Show all windows', action: function () { openMissionControl(); } },
      { id: 'cmd:launchpad', name: 'Launchpad', sub: 'Show all apps', action: function () { openLaunchpad(); } },
      { id: 'cmd:settings', name: 'System Settings', sub: 'Application', action: function () { openApp('system-settings'); } },
      { id: 'cmd:trash', name: 'Empty Trash', sub: 'Finder', action: function () { handleMenuAction('empty-trash'); } },
      { id: 'cmd:wallpaper', name: 'Change Wallpaper', sub: 'Desktop', action: function () { cycleWallpaper(); } },
      { id: 'cmd:dark', name: 'Toggle Dark Mode', sub: 'Appearance', action: function () { cycleAppearance(); } },
      { id: 'cmd:forcequit', name: 'Force Quit…', sub: '⌥⌘Esc', action: function () { showForceQuit(); } },
      { id: 'cmd:siri', name: 'Ask Siri', sub: 'Assistant', action: function () { openApp('siri'); } },
      { id: 'cmd:facetime', name: 'FaceTime', sub: 'Video call', action: function () { openApp('facetime'); } },
      { id: 'cmd:iphone', name: 'iPhone Mirroring', sub: 'Continuity', action: function () { openApp('iphone-mirroring'); } },
      { id: 'cmd:sidecar', name: 'Sidecar', sub: 'iPad display', action: function () { openApp('sidecar'); } },
      { id: 'cmd:maps', name: 'Maps', sub: 'Directions', action: function () { openApp('maps'); } },
      { id: 'cmd:music', name: 'Music', sub: 'Play', action: function () { openApp('music'); } },
      { id: 'cmd:photos', name: 'Photos', sub: 'Library', action: function () { openApp('photos'); } },
      { id: 'cmd:terminal', name: 'Terminal', sub: 'Shell', action: function () { openApp('terminal'); } },
      { id: 'cmd:finder', name: 'Finder', sub: 'Files', action: function () { openApp('finder'); } },
      { id: 'cmd:nc', name: 'Notification Center', sub: 'System', action: function () {
        var nc = document.getElementById('notification-center');
        if (nc) {
          if (typeof showOverlay === 'function') showOverlay(nc);
          else nc.classList.add('is-open');
        }
      } },
    ];
    if (!q) return [];
    return cmds.filter(function (c) {
      return c.name.toLowerCase().indexOf(q) !== -1 || c.sub.toLowerCase().indexOf(q) !== -1;
    });
  }

  function spotlightCalc(query) {
    var q = (query || '').trim();
    if (!/^[\d\s+\-*/().%]+$/.test(q) || q.length < 2) return null;
    try {
      var expr = q.replace(/%/g, '/100');
      // eslint-disable-next-line no-new-func
      var val = Function('"use strict"; return (' + expr + ')')();
      if (typeof val === 'number' && isFinite(val)) {
        return { id: 'calc:' + val, name: '= ' + val, sub: 'Calculator', value: val };
      }
    } catch (e) {}
    return null;
  }

  function renderSpotlightResults(query) {
    var list = $('#spotlight-results');
    if (!list) return;
    var q = (query || '').trim();
    var rows = [];
    var calc = spotlightCalc(q);
    if (calc) {
      rows.push({
        kind: 'calc',
        id: calc.id,
        name: calc.name,
        sub: calc.sub,
        icon: iconHtml('calculator'),
        run: function () {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(String(calc.value)).catch(function () {});
          }
          notify('Spotlight', 'Copied', String(calc.value), 'now');
          if (global.MacSounds && MacSounds.play) MacSounds.play('tink');
        },
      });
    }
    spotlightCommands(q).forEach(function (c) {
      rows.push({
        kind: 'cmd',
        id: c.id,
        name: c.name,
        sub: c.sub,
        icon: '⚙️',
        run: c.action,
      });
    });
    var apps;
    if (!q) {
      apps = recentApps.length
        ? recentApps.map(function (id) {
            return { id: id, name: titleFor(id), category: 'Recent' };
          })
        : filterApps('', 10);
    } else {
      apps = filterApps(q, 12);
    }
    apps.forEach(function (a) {
      rows.push({
        kind: 'app',
        id: a.id,
        name: a.name,
        sub: a.category === 'Recent' ? 'Recent' : 'Application',
        icon: iconHtml(a.id),
        run: function () {
          openApp(a.id);
        },
      });
    });
    /* unique by id */
    var seen = {};
    rows = rows.filter(function (r) {
      if (seen[r.id]) return false;
      seen[r.id] = true;
      return true;
    }).slice(0, 16);

    spotlightIndex = 0;
    if (!rows.length) {
      list.innerHTML = '<div class="spotlight-empty">No Results</div>';
      return;
    }
    list.innerHTML = rows
      .map(function (r, i) {
        return (
          '<div class="spotlight-result' +
          (i === 0 ? ' is-selected' : '') +
          '" role="option" data-idx="' +
          i +
          '" tabindex="-1">' +
          '<div class="spotlight-result-icon">' +
          (typeof r.icon === 'string' && r.icon.indexOf('<') === 0 ? r.icon : '<span>' + r.icon + '</span>') +
          '</div>' +
          '<div class="spotlight-result-text">' +
          '<div class="spotlight-result-title">' +
          escapeHtml(r.name) +
          '</div>' +
          '<div class="spotlight-result-sub">' +
          escapeHtml(r.sub) +
          '</div>' +
          '</div></div>'
        );
      })
      .join('');
    list._spotlightRows = rows;

    $$('.spotlight-result', list).forEach(function (row, idx) {
      row.addEventListener('click', function () {
        hideSpotlight();
        if (rows[idx] && rows[idx].run) rows[idx].run();
      });
      row.addEventListener('mouseenter', function () {
        $$('.spotlight-result', list).forEach(function (r) {
          r.classList.remove('is-selected');
        });
        row.classList.add('is-selected');
        spotlightIndex = idx;
      });
    });
  }

  function moveSpotlight(delta) {
    var items = $$('.spotlight-result');
    if (!items.length) return;
    items[spotlightIndex] && items[spotlightIndex].classList.remove('is-selected');
    spotlightIndex = (spotlightIndex + delta + items.length) % items.length;
    items[spotlightIndex].classList.add('is-selected');
    items[spotlightIndex].scrollIntoView({ block: 'nearest' });
  }

  function activateSpotlight() {
    var list = $('#spotlight-results');
    var rows = list && list._spotlightRows;
    if (rows && rows[spotlightIndex] && rows[spotlightIndex].run) {
      hideSpotlight();
      rows[spotlightIndex].run();
      return;
    }
    var sel = $('.spotlight-result.is-selected');
    if (sel) sel.click();
  }

  /* ── Applications drawer (centered glass panel) ─────── */

  var appsCategoryFilter = 'All';
  var APPS_CATEGORY_CHIPS = [
    'All',
    'Productivity',
    'Social',
    'Utilities',
    'Entertainment',
    'Developer Tools',
    'Creativity',
    'Information & Reading',
    'System',
    'Internet'
  ];

  /** Map registry categories onto drawer chips (generic, not personal) */
  function normalizeAppCategory(cat) {
    cat = (cat || '').trim();
    if (!cat) return 'Utilities';
    var c = cat.toLowerCase();
    if (c === 'system') return 'System';
    if (c === 'internet') return 'Internet';
    if (c === 'productivity') return 'Productivity';
    if (c === 'utilities') return 'Utilities';
    if (c === 'entertainment') return 'Entertainment';
    if (c === 'creativity') return 'Creativity';
    if (c.indexOf('developer') !== -1 || c === 'developer tools') return 'Developer Tools';
    if (c.indexOf('social') !== -1) return 'Social';
    if (c.indexOf('information') !== -1 || c.indexOf('reading') !== -1) return 'Information & Reading';
    // Map common aliases
    if (c === 'travel') return 'Utilities';
    return cat;
  }

  function openLaunchpad() {
    closeAllOverlays();
    var lp = $('#launchpad');
    showOverlay(lp);
    var search = $('#launchpad-search');
    if (search) search.value = '';
    appsCategoryFilter = 'All';
    renderAppsCategories();
    renderLaunchpadGrid('');
    setTimeout(function () {
      if (search) search.focus();
    }, 50);
  }

  function hideLaunchpad() {
    hideOverlay($('#launchpad'));
  }

  function toggleLaunchpad() {
    var lp = $('#launchpad');
    if (isOpen(lp)) hideLaunchpad();
    else openLaunchpad();
  }

  function renderAppsCategories() {
    var row = $('#apps-categories');
    if (!row) return;
    row.innerHTML = APPS_CATEGORY_CHIPS.map(function (chip) {
      return (
        '<button type="button" class="apps-chip' +
        (chip === appsCategoryFilter ? ' is-active' : '') +
        '" data-category="' + escapeHtml(chip) + '" role="tab" aria-selected="' +
        (chip === appsCategoryFilter ? 'true' : 'false') + '">' +
        escapeHtml(chip) +
        '</button>'
      );
    }).join('');
    $$('.apps-chip', row).forEach(function (btn) {
      btn.addEventListener('click', function () {
        appsCategoryFilter = btn.getAttribute('data-category') || 'All';
        renderAppsCategories();
        var search = $('#launchpad-search');
        renderLaunchpadGrid(search ? search.value : '');
      });
    });
  }

  function renderLaunchpadGrid(query) {
    var grid = $('#launchpad-grid');
    if (!grid) return;
    var q = (query || '').trim().toLowerCase();
    var apps = allApps().filter(function (a) {
      return a.id !== 'spotlight' && a.id !== 'trash' && a.id !== 'launchpad';
    });

    if (appsCategoryFilter && appsCategoryFilter !== 'All') {
      apps = apps.filter(function (a) {
        return normalizeAppCategory(a.category) === appsCategoryFilter;
      });
    }

    if (q) {
      apps = apps.filter(function (a) {
        return (a.name || '').toLowerCase().indexOf(q) !== -1 ||
          a.id.indexOf(q) !== -1 ||
          (a.category || '').toLowerCase().indexOf(q) !== -1;
      });
    }

    // Stable name sort for drawer
    apps = apps.slice().sort(function (a, b) {
      return (a.name || '').localeCompare(b.name || '');
    });

    if (!apps.length) {
      grid.innerHTML = '<div class="apps-empty">No Applications</div>';
      return;
    }

    grid.innerHTML = apps.map(function (a) {
      return (
        '<button type="button" class="launchpad-app" data-app="' + escapeHtml(a.id) + '" role="listitem">' +
        '<span class="launchpad-app-icon">' + iconHtml(a.id) + '</span>' +
        '<span class="launchpad-app-name">' + escapeHtml(a.name) + '</span>' +
        '</button>'
      );
    }).join('');

    $$('.launchpad-app', grid).forEach(function (btn) {
      btn.addEventListener('click', function () {
        hideLaunchpad();
        openApp(btn.getAttribute('data-app'));
        if (global.MacSounds && MacSounds.play) MacSounds.play('pop');
      });
    });
    if (apps.length && q) {
      var first = grid.querySelector('.launchpad-app');
      if (first) first.classList.add('is-focused');
    }
  }

  /* ── Mission Control ───────────────────────────────── */

  var mcFocusIdx = 0;

  function openMissionControl() {
    closeAllOverlays();
    mcFocusIdx = 0;
    renderMissionControl();
    showOverlay($('#mission-control'));
    if (global.MacSounds && MacSounds.play) {
      try {
        MacSounds.play('pop');
      } catch (e) {}
    }
  }

  function closeMissionControl() {
    hideOverlay($('#mission-control'));
  }

  function toggleMissionControl() {
    var mc = $('#mission-control');
    if (isOpen(mc)) closeMissionControl();
    else openMissionControl();
  }

  function renderMissionControl() {
    var grid = $('#mc-windows');
    var empty = $('#mc-empty');
    if (!grid) return;

    var wins = [];
    if (global.WindowManager && typeof WindowManager.getOpenWindows === 'function') {
      wins = WindowManager.getOpenWindows().filter(function (w) {
        return !w.minimized;
      });
      // Frontmost first
      wins.sort(function (a, b) {
        return (b.zIndex || 0) - (a.zIndex || 0);
      });
    }

    if (!wins.length) {
      grid.innerHTML = '';
      if (empty) empty.hidden = false;
      return;
    }
    if (empty) empty.hidden = true;
    if (mcFocusIdx >= wins.length) mcFocusIdx = 0;

    grid.innerHTML = wins.map(function (w, i) {
      var name = w.title || titleFor(w.appId);
      return (
        '<button type="button" class="mc-thumb' +
        (i === mcFocusIdx || w.focused ? ' is-focused' : '') +
        '" role="listitem" data-window-id="' + escapeHtml(w.id) +
        '" data-app="' + escapeHtml(w.appId) + '" data-mc-idx="' + i +
        '" aria-label="' + escapeHtml(name) + '">' +
        '<div class="mc-thumb-frame">' +
        '<div class="mc-thumb-titlebar">' +
        '<span class="mc-thumb-dot close"></span>' +
        '<span class="mc-thumb-dot min"></span>' +
        '<span class="mc-thumb-dot zoom"></span>' +
        '</div>' +
        '<div class="mc-thumb-body">' +
        '<div class="mc-thumb-icon">' + iconHtml(w.appId) + '</div>' +
        '<div class="mc-thumb-app">' + escapeHtml(name) + '</div>' +
        '</div></div>' +
        '<div class="mc-thumb-label">' + escapeHtml(name) + '</div>' +
        '</button>'
      );
    }).join('');

    function activate(id) {
      closeMissionControl();
      if (global.WindowManager && id) {
        WindowManager.focus(id);
        if (stageManagerOn) applyStageManagerLayout();
        if (global.MacSounds && MacSounds.play) MacSounds.play('tink');
      }
    }

    $$('.mc-thumb', grid).forEach(function (thumb) {
      thumb.addEventListener('click', function () {
        activate(thumb.getAttribute('data-window-id'));
      });
      thumb.addEventListener('mouseenter', function () {
        mcFocusIdx = parseInt(thumb.getAttribute('data-mc-idx'), 10) || 0;
        $$('.mc-thumb', grid).forEach(function (t) {
          t.classList.toggle('is-focused', t === thumb);
        });
      });
    });
    grid._mcWins = wins;
  }

  function missionControlKey(key) {
    var grid = $('#mc-windows');
    if (!grid || !grid._mcWins || !grid._mcWins.length) return false;
    var n = grid._mcWins.length;
    if (key === 'ArrowRight' || key === 'ArrowDown') {
      mcFocusIdx = (mcFocusIdx + 1) % n;
    } else if (key === 'ArrowLeft' || key === 'ArrowUp') {
      mcFocusIdx = (mcFocusIdx + n - 1) % n;
    } else if (key === 'Enter') {
      var w = grid._mcWins[mcFocusIdx];
      if (w) {
        closeMissionControl();
        if (WindowManager.focus) WindowManager.focus(w.id);
      }
      return true;
    } else return false;
    $$('.mc-thumb', grid).forEach(function (t, i) {
      t.classList.toggle('is-focused', i === mcFocusIdx);
    });
    var el = grid.querySelector('.mc-thumb.is-focused');
    if (el) el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    return true;
  }

  /* ── Stage Manager ─────────────────────────────────── */

  function isStageManagerOn() {
    return stageManagerOn;
  }

  function setStageManager(on) {
    stageManagerOn = !!on;
    var root = $('#macos');
    if (root) root.classList.toggle('stage-manager-on', stageManagerOn);
    document.body.classList.toggle('stage-manager-on', stageManagerOn);

    var strip = $('#stage-manager-strip');
    if (strip) {
      strip.setAttribute('aria-hidden', stageManagerOn ? 'false' : 'true');
    }

    var tile = $('#control-center [data-cc="stage-manager"]');
    if (tile) tile.classList.toggle('is-active', stageManagerOn);

    if (stageManagerOn) {
      applyStageManagerLayout();
    } else {
      clearStageManagerLayout();
    }
    if (global.MacSounds && MacSounds.play) {
      try {
        MacSounds.play(stageManagerOn ? 'hero' : 'pop');
      } catch (e) {}
    }
  }

  function toggleStageManager() {
    setStageManager(!stageManagerOn);
    notify(
      'Stage Manager',
      stageManagerOn ? 'On' : 'Off',
      stageManagerOn
        ? 'Windows are arranged in a stage strip on the left.'
        : 'Returned to normal window layout.',
      'now'
    );
  }

  function clearStageManagerLayout() {
    $$('.window.is-staged').forEach(function (el) {
      el.classList.remove('is-staged');
    });
    var strip = $('#stage-manager-strip');
    if (strip) strip.innerHTML = '';
  }

  function applyStageManagerLayout() {
    if (!stageManagerOn || !global.WindowManager) return;

    var strip = $('#stage-manager-strip');
    if (!strip) return;

    var wins = WindowManager.getOpenWindows().filter(function (w) {
      return !w.minimized;
    });
    var focused = WindowManager.getFocused && WindowManager.getFocused();
    var focusedId = focused ? focused.id : null;

    // Mark non-focused windows as staged (hidden off-strip; strip shows thumbs)
    wins.forEach(function (w) {
      if (!w.el) return;
      if (w.id === focusedId) {
        w.el.classList.remove('is-staged');
      } else {
        w.el.classList.add('is-staged');
      }
    });

    // Thumbnails for all open (non-minimized) windows; active highlighted
    var ordered = wins.slice().sort(function (a, b) {
      // Non-focused first in strip (active at top if present)
      if (a.id === focusedId) return -1;
      if (b.id === focusedId) return 1;
      return (b.zIndex || 0) - (a.zIndex || 0);
    });

    strip.innerHTML = ordered.map(function (w) {
      var name = w.title || titleFor(w.appId);
      var active = w.id === focusedId ? ' is-active' : '';
      return (
        '<button type="button" class="stage-thumb' + active +
        '" data-window-id="' + escapeHtml(w.id) +
        '" data-app="' + escapeHtml(w.appId) +
        '" title="' + escapeHtml(name) + '" aria-label="' + escapeHtml(name) + '">' +
        '<div class="stage-thumb-frame">' +
        '<div class="stage-thumb-icon">' + iconHtml(w.appId) + '</div>' +
        '</div>' +
        '<div class="stage-thumb-label">' + escapeHtml(name) + '</div>' +
        '</button>'
      );
    }).join('');

    $$('.stage-thumb', strip).forEach(function (thumb) {
      thumb.addEventListener('click', function (e) {
        e.stopPropagation();
        var id = thumb.getAttribute('data-window-id');
        if (global.WindowManager && id) {
          WindowManager.focus(id);
          applyStageManagerLayout();
          if (global.MacSounds && MacSounds.play) MacSounds.play('pop');
        }
      });
      thumb.addEventListener('dblclick', function (e) {
        e.stopPropagation();
        var id = thumb.getAttribute('data-window-id');
        var app = thumb.getAttribute('data-app');
        if (global.WindowManager && id && WindowManager.close) {
          WindowManager.close(id);
        } else if (app && global.WindowManager && WindowManager.closeApp) {
          WindowManager.closeApp(app);
        }
        applyStageManagerLayout();
        if (global.MacSounds && MacSounds.play) MacSounds.play('emptyTrash');
      });
      thumb.title = (thumb.getAttribute('title') || '') + ' · Double-click to close';
    });
    /* Persist stage manager preference */
    try {
      localStorage.setItem('macos-stage-manager', stageManagerOn ? '1' : '0');
    } catch (e) {}

    // Keep focused window in main stage area (nudge if needed)
    if (focused && focused.el && !focused.maximized) {
      var stripW = 104;
      try {
        var css = getComputedStyle(document.documentElement)
          .getPropertyValue('--stage-strip-width').trim();
        var n = parseInt(css, 10);
        if (!isNaN(n)) stripW = n;
      } catch (err) { /* ignore */ }
      if (focused.x < stripW + 8) {
        focused.x = stripW + 24;
        focused.el.style.left = focused.x + 'px';
      }
    }
  }

  /* ── Control Center / Notifications ────────────────── */

  function toggleControlCenter() {
    var cc = $('#control-center');
    var btn = $('#control-center-btn');
    if (isOpen(cc)) {
      hideOverlay(cc);
      if (btn) btn.setAttribute('aria-expanded', 'false');
    } else {
      closeAllOverlays();
      showOverlay(cc);
      if (btn) btn.setAttribute('aria-expanded', 'true');
    }
  }

  function hideControlCenter() {
    hideOverlay($('#control-center'));
    var btn = $('#control-center-btn');
    if (btn) btn.setAttribute('aria-expanded', 'false');
  }

  function toggleNotificationCenter() {
    var nc = $('#notification-center');
    var btn = $('#menubar-clock');
    if (isOpen(nc)) {
      hideOverlay(nc);
      if (btn) btn.setAttribute('aria-expanded', 'false');
    } else {
      closeAllOverlays();
      showOverlay(nc);
      if (btn) btn.setAttribute('aria-expanded', 'true');
    }
  }

  function hideNotificationCenter() {
    hideOverlay($('#notification-center'));
    var btn = $('#menubar-clock');
    if (btn) btn.setAttribute('aria-expanded', 'false');
  }

  /* ── Apple menu / context ──────────────────────────── */

  function showAboutThisMac() {
    if (!global.WindowManager) return;
    var mem = navigator.deviceMemory || 16;
    var cores = navigator.hardwareConcurrency || 8;
    var res = screen.width + ' × ' + screen.height;
    var lang = navigator.language || 'en-US';
    WindowManager.open(
      'about-this-mac',
      'About This Mac',
      '<div class="about-mac">' +
        '<div class="about-apple"></div>' +
        '<h2>macOS 27</h2>' +
        '<p class="muted about-sub">Liquid Glass · Virtual Desktop</p>' +
        '<div class="about-rows">' +
        '<div class="about-row"><span>Chip</span><strong>Apple Silicon (sim)</strong></div>' +
        '<div class="about-row"><span>Memory</span><strong>' +
        mem +
        ' GB</strong></div>' +
        '<div class="about-row"><span>Cores</span><strong>' +
        cores +
        '</strong></div>' +
        '<div class="about-row"><span>Display</span><strong>' +
        res +
        '</strong></div>' +
        '<div class="about-row"><span>Language</span><strong>' +
        escapeHtml(lang) +
        '</strong></div>' +
        '<div class="about-row"><span>Serial</span><strong>VM' +
        String(Date.now()).slice(-8) +
        '</strong></div>' +
        '</div>' +
        '<div class="about-actions">' +
        '<button type="button" class="btn-glass" id="about-support">Support</button>' +
        '<button type="button" class="btn-primary" id="about-specs">More Info…</button>' +
        '</div></div>',
      { width: 440, height: 420, resizable: false }
    );
    setTimeout(function () {
      var support = document.getElementById('about-support');
      var specs = document.getElementById('about-specs');
      if (support) {
        support.addEventListener('click', function () {
          openApp('tips');
        });
      }
      if (specs) {
        specs.addEventListener('click', function () {
          openApp('system-information');
        });
      }
    }, 50);
  }

  var lastScreenshotData = null;

  function captureScreenshot(mode, opts) {
    mode = mode || 'full';
    opts = opts || {};
    var flash = document.createElement('div');
    flash.className = 'screenshot-flash';
    document.body.appendChild(flash);
    requestAnimationFrame(function () {
      flash.classList.add('is-on');
    });
    setTimeout(function () {
      flash.classList.remove('is-on');
      setTimeout(function () {
        if (flash.parentNode) flash.parentNode.removeChild(flash);
      }, 200);
    }, 120);

    var w = window.innerWidth;
    var h = window.innerHeight;
    var canvas = document.createElement('canvas');
    canvas.width = Math.min(w, 1920);
    canvas.height = Math.min(h, 1080);
    var ctx = canvas.getContext('2d');
    var scaleX = canvas.width / w;
    var scaleY = canvas.height / h;

    function finish() {
      // Soft vignette / chrome labels
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(0, canvas.height - 36, canvas.width, 36);
      ctx.fillStyle = '#fff';
      ctx.font = '12px -apple-system, system-ui, sans-serif';
      var stamp =
        'Screenshot ' +
        new Date().toLocaleString() +
        (mode !== 'full' ? ' · ' + mode : '');
      ctx.fillText(stamp, 16, canvas.height - 14);

      var data = canvas.toDataURL('image/png');
      lastScreenshotData = data;
      var a = document.createElement('a');
      var fname =
        'Screenshot ' +
        new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19) +
        '.png';
      a.href = data;
      a.download = fname;
      document.body.appendChild(a);
      a.click();
      a.remove();

      // Thumbnail toast on desktop area
      var thumb = document.createElement('div');
      thumb.className = 'screenshot-thumb-toast';
      thumb.innerHTML = '<img alt="" /><span>Saved</span>';
      var img = thumb.querySelector('img');
      if (img) img.src = data;
      document.body.appendChild(thumb);
      setTimeout(function () {
        thumb.classList.add('is-show');
      }, 10);
      setTimeout(function () {
        thumb.classList.remove('is-show');
        setTimeout(function () {
          if (thumb.parentNode) thumb.parentNode.removeChild(thumb);
        }, 300);
      }, 2800);

      if (global.MacSounds && MacSounds.play) MacSounds.play('tink');
      notify('Screenshot', 'Screenshot saved', fname, 'now');
      if (typeof opts.onComplete === 'function') {
        try {
          opts.onComplete(data, fname);
        } catch (e) {}
      }
      return data;
    }

    // Background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    var wall = $('#wallpaper');
    var bgUrl = '';
    if (wall) {
      var bg = wall.style.backgroundImage || getComputedStyle(wall).backgroundImage || '';
      var m = bg.match(/url\(["']?([^"')]+)["']?\)/);
      if (m) bgUrl = m[1];
    }
    if (!bgUrl) bgUrl = 'assets/wallpaper.jpg';

    var img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function () {
      try {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      } catch (e) {
        /* tainted */
      }
      // Draw simplified window frames
      if (global.WindowManager && WindowManager.getOpenWindows && mode !== 'selection') {
        WindowManager.getOpenWindows()
          .filter(function (win) {
            return !win.minimized && win.el;
          })
          .forEach(function (win) {
            var r = win.el.getBoundingClientRect();
            var x = r.left * scaleX;
            var y = r.top * scaleY;
            var ww = r.width * scaleX;
            var hh = r.height * scaleY;
            if (mode === 'window') {
              var focused = WindowManager.getFocused && WindowManager.getFocused();
              if (!focused || focused.id !== win.id) return;
            }
            ctx.fillStyle = 'rgba(40,40,45,0.88)';
            roundRect(ctx, x, y, ww, hh, 10 * scaleX);
            ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.15)';
            ctx.stroke();
            ctx.fillStyle = 'rgba(255,255,255,0.08)';
            ctx.fillRect(x, y, ww, 22 * scaleY);
            ctx.fillStyle = 'rgba(255,255,255,0.85)';
            ctx.font = 11 * scaleY + 'px -apple-system, system-ui, sans-serif';
            ctx.fillText(win.title || win.appId || 'Window', x + 12 * scaleX, y + 15 * scaleY);
          });
      }
      if (mode === 'selection') {
        // Center selection mock
        var sw = canvas.width * 0.45;
        var sh = canvas.height * 0.35;
        var sx = (canvas.width - sw) / 2;
        var sy = (canvas.height - sh) / 2;
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.clearRect(sx, sy, sw, sh);
        ctx.drawImage(img, sx / scaleX, sy / scaleY, sw / scaleX, sh / scaleY, sx, sy, sw, sh);
        ctx.strokeStyle = '#0a84ff';
        ctx.lineWidth = 2;
        ctx.strokeRect(sx, sy, sw, sh);
      }
      finish();
    };
    img.onerror = function () {
      ctx.fillStyle = '#2c2c2e';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      finish();
    };
    img.src = bgUrl;
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function handleMenuAction(action, appIdOrEl) {
    closeMenubarMenus();
    var appFromMenu =
      typeof appIdOrEl === 'string'
        ? appIdOrEl
        : appIdOrEl && appIdOrEl.getAttribute
          ? appIdOrEl.getAttribute('data-app')
          : null;
    switch (action) {
      case 'about':
        showAboutThisMac();
        break;
      case 'open-app':
        if (appFromMenu) openApp(appFromMenu);
        break;
      case 'system-settings':
      case 'settings':
        openApp('system-settings');
        break;
      case 'app-store':
        openApp('appstore');
        break;
      case 'continuity-iphone':
        openApp('iphone-mirroring');
        break;
      case 'continuity-sidecar':
        openApp('sidecar');
        break;
      case 'sleep':
        flashSleep();
        break;
      case 'restart':
        showPowerDialog('restart');
        break;
      case 'shutdown':
        showPowerDialog('shutdown');
        break;
      case 'lock':
      case 'logout':
        showLockScreen(action === 'logout' ? 'Log Out' : 'Lock Screen');
        break;
      case 'close':
        if (global.WindowManager) WindowManager.closeFocused();
        break;
      case 'close-all':
        if (global.WindowManager && WindowManager.getOpenWindows) {
          WindowManager.getOpenWindows().slice().forEach(function (w) {
            if (WindowManager.close) WindowManager.close(w.id);
          });
          syncRunningFromWindows();
        }
        break;
      case 'minimize':
        if (global.WindowManager) WindowManager.minimizeFocused();
        break;
      case 'zoom':
        if (global.WindowManager) {
          var f = WindowManager.getFocused();
          if (f) WindowManager.maximize(f.id);
        }
        break;
      case 'quit':
        if (global.WindowManager) {
          var focused = WindowManager.getFocused();
          if (focused) WindowManager.closeApp(focused.appId);
          syncRunningFromWindows();
        }
        break;
      case 'new-window':
        openApp('finder');
        break;
      case 'open':
        /* Open selected desktop icon or Finder */
        (function () {
          var sel = document.querySelector('.desktop-icon.is-selected');
          if (sel && typeof openDesktopIcon === 'function') openDesktopIcon(sel);
          else openApp('finder');
        })();
        break;
      case 'new-folder':
        openApp('finder');
        setTimeout(function () {
          document.dispatchEvent(new CustomEvent('finder:new-folder'));
        }, 120);
        break;
      case 'about-app':
        showAboutThisMac();
        break;
      case 'empty-trash':
        try {
          document.dispatchEvent(new CustomEvent('finder:empty-trash'));
        } catch (err) {}
        if (global.MacSounds && MacSounds.play) MacSounds.play('emptyTrash');
        notify('Finder', 'Trash', 'Trash is empty', 'now', { force: true });
        break;
      case 'force-quit':
        showForceQuit();
        break;
      case 'hide':
      case 'hide-app':
        if (global.WindowManager) WindowManager.minimizeFocused && WindowManager.minimizeFocused();
        break;
      case 'show-all':
        openMissionControl();
        break;
      case 'minimize-all':
        if (global.WindowManager && WindowManager.getOpenWindows) {
          WindowManager.getOpenWindows().forEach(function (w) {
            if (WindowManager.minimize) WindowManager.minimize(w.id);
          });
        }
        break;
      case 'wallpaper':
        openApp('wallpaper');
        break;
      /* change-wallpaper handled below → cycleWallpaper */
      case 'copy':
      case 'cut':
      case 'paste':
      case 'select-all':
        try {
          document.execCommand(action === 'select-all' ? 'selectAll' : action);
        } catch (e) {}
        break;
      case 'undo':
        try {
          document.execCommand('undo');
        } catch (e) {}
        if (global.MacSounds && MacSounds.play) MacSounds.play('pop');
        break;
      case 'redo':
        try {
          document.execCommand('redo');
        } catch (e) {}
        if (global.MacSounds && MacSounds.play) MacSounds.play('pop');
        break;
      case 'hide-others':
        if (global.WindowManager && WindowManager.getOpenWindows && WindowManager.getFocused) {
          var focusedHide = WindowManager.getFocused();
          var fid = focusedHide && focusedHide.id;
          WindowManager.getOpenWindows().forEach(function (w) {
            if (w.id !== fid && WindowManager.minimize) WindowManager.minimize(w.id);
          });
        }
        break;
      case 'as-icons':
      case 'as-list':
      case 'as-columns':
      case 'as-gallery':
        finderSetView(
          action === 'as-icons'
            ? 'icons'
            : action === 'as-list'
              ? 'list'
              : action === 'as-columns'
                ? 'columns'
                : 'gallery'
        );
        break;
      case 'show-path-bar':
        finderToggleChrome('.finder-pathbar', 'Path Bar');
        break;
      case 'show-status-bar':
        finderToggleChrome('.finder-statusbar', 'Status Bar');
        break;
      case 'go-back':
      case 'go-forward':
        openApp('finder');
        notify('Finder', action === 'go-back' ? 'Back' : 'Forward', 'History (demo)', 'now');
        break;
      case 'go-home':
        finderGo('home');
        break;
      case 'go-desktop':
        finderGo('desktop');
        break;
      case 'go-downloads':
        finderGo('down');
        break;
      case 'go-documents':
        finderGo('docs');
        break;
      case 'go-applications':
        finderGo('apps');
        break;
      case 'bring-all-front':
        if (global.WindowManager && WindowManager.getOpenWindows) {
          WindowManager.getOpenWindows().forEach(function (w) {
            if (WindowManager.focus) WindowManager.focus(w.id);
          });
        }
        if (global.MacSounds && MacSounds.play) MacSounds.play('pop');
        break;
      case 'help-search':
      case 'help':
        showKeyboardCheatSheet();
        setTimeout(function () {
          openApp('tips');
        }, 100);
        break;
      case 'wifi':
      case 'battery':
        toggleControlCenter();
        break;
      case 'sort-by':
      case 'clean-up':
        /* Snap desktop icons back to default column */
        try {
          localStorage.removeItem('macos-desktop-icons');
        } catch (e) {}
        renderDesktopIcons();
        notify('Desktop', 'Clean Up', 'Icons arranged', 'now');
        if (global.MacSounds && MacSounds.play) MacSounds.play('pop');
        break;
      case 'spotlight':
        toggleSpotlight();
        break;
      case 'control-center':
        toggleControlCenter();
        break;
      case 'notification-center':
        toggleNotificationCenter();
        break;
      case 'mission-control':
        openMissionControl();
        break;
      case 'stage-manager':
        toggleStageManager();
        break;
      case 'clear-notifications':
        var list = $('#notification-list');
        if (list) list.innerHTML = '<p class="muted" style="padding:16px">No Notifications</p>';
        break;
      case 'change-wallpaper':
        cycleWallpaper();
        if (global.MacSounds && MacSounds.play) MacSounds.play('pop');
        notify('Desktop', 'Wallpaper', 'Wallpaper changed', 'now');
        break;
      case 'get-info':
        if (global.WindowManager) {
          var selIcon = document.querySelector('.desktop-icon.is-selected');
          var label = selIcon ? (selIcon.querySelector('.desktop-icon-label') || {}).textContent : 'Desktop';
          var kind = selIcon ? (selIcon.querySelector('.desktop-icon-img') || {}).className : '';
          var kindLabel = /trash/.test(kind) ? 'Trash' : /folder/.test(kind) ? 'Folder' : /drive/.test(kind) ? 'Volume' : /app/.test(kind) ? 'Application' : 'Desktop';
          WindowManager.open(
            'get-info',
            'Info',
            '<div class="get-info-panel">' +
              '<div class="gi-icon">' + (selIcon && selIcon.querySelector('.desktop-icon-img') ? selIcon.querySelector('.desktop-icon-img').outerHTML : '🖥') + '</div>' +
              '<h2>' + escapeHtml(label || 'Desktop') + '</h2>' +
              '<div class="about-rows">' +
              '<div class="about-row"><span>Kind</span><strong>' + kindLabel + '</strong></div>' +
              '<div class="about-row"><span>Where</span><strong>/Users/user/Desktop</strong></div>' +
              '<div class="about-row"><span>Created</span><strong>Today</strong></div>' +
              '<div class="about-row"><span>Modified</span><strong>Today</strong></div>' +
              '<div class="about-row"><span>Size</span><strong>—</strong></div>' +
              '</div></div>',
            { width: 320, height: 340, resizable: false }
          );
        }
        break;
      case 'refresh':
        renderDesktopIcons();
        if (global.MacSounds && MacSounds.play) MacSounds.play('pop');
        notify('Desktop', 'Refreshed', 'Desktop icons updated', 'now');
        break;
      default:
        if (action && global.MacSounds && MacSounds.play) {
          try {
            MacSounds.play('tink');
          } catch (err) {}
        }
        break;
    }
  }

  function finderGo(navId) {
    openApp('finder');
    var attempts = 0;
    function tryNav() {
      attempts++;
      var win =
        global.WindowManager &&
        WindowManager.getWindowByAppId &&
        WindowManager.getWindowByAppId('finder');
      var body = win && win.el && (win.el.querySelector('.window-content') || win.el);
      var item = body && body.querySelector('.finder-sb-item[data-nav="' + navId + '"]');
      if (item) {
        item.click();
        if (global.MacSounds && MacSounds.play) MacSounds.play('pop');
        return;
      }
      if (attempts < 12) setTimeout(tryNav, 50);
    }
    setTimeout(tryNav, 40);
  }

  function finderSetView(view) {
    openApp('finder');
    setTimeout(function () {
      var win =
        global.WindowManager &&
        WindowManager.getWindowByAppId &&
        WindowManager.getWindowByAppId('finder');
      var body = win && win.el && (win.el.querySelector('.window-content') || win.el);
      if (!body) return;
      var btn = body.querySelector('.tb-view-btn[data-view="' + view + '"]');
      if (btn) btn.click();
      else {
        /* dispatch via keyboard simulation on finder root */
        var app = body.querySelector('.finder-app') || body;
        app.setAttribute('data-view', view);
      }
      if (global.MacSounds && MacSounds.play) MacSounds.play('tink');
      notify('Finder', 'View', 'as ' + view.charAt(0).toUpperCase() + view.slice(1), 'now');
    }, 80);
  }

  function finderToggleChrome(sel, label) {
    openApp('finder');
    setTimeout(function () {
      var win =
        global.WindowManager &&
        WindowManager.getWindowByAppId &&
        WindowManager.getWindowByAppId('finder');
      var body = win && win.el && (win.el.querySelector('.window-content') || win.el);
      if (!body) return;
      var el = body.querySelector(sel);
      if (el) {
        var hide = el.style.display === 'none';
        el.style.display = hide ? '' : 'none';
        notify('Finder', label, hide ? 'Shown' : 'Hidden', 'now');
      }
      if (global.MacSounds && MacSounds.play) MacSounds.play('pop');
    }, 80);
  }

  function flashSleep() {
    var ov = document.createElement('div');
    ov.className = 'power-sleep-overlay';
    ov.innerHTML = '<div class="power-sleep-hint">Click or press any key to wake</div>';
    document.body.appendChild(ov);
    requestAnimationFrame(function () {
      ov.classList.add('is-on');
    });
    if (global.MacSounds && MacSounds.play) MacSounds.play('purr');
    function wake() {
      ov.classList.remove('is-on');
      document.removeEventListener('keydown', wake);
      ov.removeEventListener('click', wake);
      setTimeout(function () {
        if (ov.parentNode) ov.parentNode.removeChild(ov);
        notify('macOS', 'Awake', 'Display woke from sleep', 'now');
        if (global.MacSounds && MacSounds.play) MacSounds.play('boot');
      }, 400);
    }
    setTimeout(function () {
      ov.addEventListener('click', wake);
      document.addEventListener('keydown', wake);
    }, 600);
  }

  function showPowerDialog(kind) {
    var existing = document.getElementById('power-dialog');
    if (existing) existing.remove();
    var isRestart = kind === 'restart';
    var ov = document.createElement('div');
    ov.id = 'power-dialog';
    ov.className = 'power-dialog-overlay';
    ov.innerHTML =
      '<div class="power-dialog-panel glass">' +
      '<h2>' +
      (isRestart ? 'Are you sure you want to restart your computer now?' : 'Are you sure you want to shut down your computer now?') +
      '</h2>' +
      '<p class="muted">Any open apps will be quit (demo).</p>' +
      '<div class="power-dialog-actions">' +
      '<button type="button" class="btn-glass" id="power-cancel">Cancel</button>' +
      '<button type="button" class="btn-primary" id="power-ok">' +
      (isRestart ? 'Restart' : 'Shut Down') +
      '</button></div></div>';
    document.body.appendChild(ov);
    ov.querySelector('#power-cancel').addEventListener('click', function () {
      ov.remove();
    });
    ov.querySelector('#power-ok').addEventListener('click', function () {
      if (isRestart) {
        ov.innerHTML = '<div class="power-dialog-panel glass"><p style="text-align:center;margin:24px">Restarting…</p></div>';
        if (global.MacSounds && MacSounds.play) MacSounds.play('boot');
        setTimeout(function () {
          location.reload();
        }, 900);
      } else {
        document.body.innerHTML =
          '<div class="shutdown-end"><div class="shutdown-logo"></div><p>You can now close this tab.</p><button type="button" class="btn-glass" id="shutdown-reload">Start Up</button></div>';
        var btn = document.getElementById('shutdown-reload');
        if (btn) {
          btn.addEventListener('click', function () {
            location.reload();
          });
        }
      }
    });
    ov.addEventListener('click', function (e) {
      if (e.target === ov) ov.remove();
    });
    if (global.MacSounds && MacSounds.play) MacSounds.play('sosumi');
  }

  function showLockScreen(mode) {
    closeAllOverlays();
    var existing = document.getElementById('lock-screen');
    if (existing) existing.remove();
    var ov = document.createElement('div');
    ov.id = 'lock-screen';
    ov.setAttribute('role', 'dialog');
    ov.setAttribute('aria-label', mode || 'Lock Screen');
    var wall = $('#wallpaper');
    var wallBg = '';
    if (wall) {
      wallBg = wall.style.backgroundImage || getComputedStyle(wall).backgroundImage || '';
    }
    ov.innerHTML =
      '<div class="lock-bg" style="' +
      (wallBg && wallBg !== 'none' ? 'background-image:' + wallBg.replace(/"/g, "'") + ';' : '') +
      '"></div>' +
      '<div class="lock-content">' +
      '<div class="lock-time" id="lock-time"></div>' +
      '<div class="lock-date" id="lock-date"></div>' +
      '<div class="lock-user">' +
      '<div class="lock-avatar">👤</div>' +
      '<div class="lock-name">User</div>' +
      '</div>' +
      '<form class="lock-form" id="lock-form">' +
      '<input type="password" class="lock-pass" id="lock-pass" placeholder="Enter Password" autocomplete="off" />' +
      '<p class="lock-hint">Any password · Return to unlock · or swipe up</p>' +
      '</form>' +
      '<div class="lock-swipe" id="lock-swipe" aria-hidden="true">⌃ Swipe up to unlock</div>' +
      '<p class="lock-mode muted">' +
      escapeHtml(mode || 'Lock Screen') +
      '</p>' +
      '</div>';
    document.body.appendChild(ov);
    var tick = function () {
      var now = new Date();
      var t = ov.querySelector('#lock-time');
      var d = ov.querySelector('#lock-date');
      if (t) t.textContent = formatWidgetTime(now);
      if (d) d.textContent = formatDateLong(now);
    };
    tick();
    var iv = setInterval(tick, 1000);
    function unlock(e) {
      if (e) e.preventDefault();
      clearInterval(iv);
      ov.classList.add('is-unlocking');
      if (global.MacSounds && MacSounds.play) MacSounds.play('boot');
      setTimeout(function () {
        if (ov.parentNode) ov.parentNode.removeChild(ov);
        notify('macOS', 'Welcome Back', 'Session unlocked', 'now', { force: true });
      }, 450);
    }
    var form = ov.querySelector('#lock-form');
    if (form) form.addEventListener('submit', unlock);
    var swipe = ov.querySelector('#lock-swipe');
    if (swipe) swipe.addEventListener('click', unlock);
    /* pointer swipe up */
    var startY = null;
    ov.addEventListener('pointerdown', function (e) {
      startY = e.clientY;
    });
    ov.addEventListener('pointerup', function (e) {
      if (startY != null && startY - e.clientY > 80) unlock();
      startY = null;
    });
    ov.addEventListener('click', function (e) {
      if (e.target === ov || e.target.classList.contains('lock-bg') || e.target.classList.contains('lock-content')) {
        var input = ov.querySelector('#lock-pass');
        if (input) input.focus();
      }
    });
    setTimeout(function () {
      var input = ov.querySelector('#lock-pass');
      if (input) input.focus();
    }, 100);
    if (global.MacSounds && MacSounds.play) MacSounds.play('purr');
  }

  function showKeyboardCheatSheet() {
    var existing = document.getElementById('kbd-cheatsheet');
    if (existing) {
      existing.remove();
      return;
    }
    var ov = document.createElement('div');
    ov.id = 'kbd-cheatsheet';
    ov.className = 'kbd-overlay';
    var rows = [
      ['⌘Space', 'Spotlight'],
      ['⌘Tab', 'Switch windows'],
      ['Hot corners', 'TL Mission · TR NC · BL Launchpad · BR Desktop'],
      ['⌘N', 'New Finder window'],
      ['⌘W', 'Close window'],
      ['⌘M', 'Minimize'],
      ['⌘,', 'System Settings'],
      ['⌘H', 'Hide window'],
      ['⌥⌘H', 'Hide others'],
      ['⌘1–4', 'Finder views'],
      ['⌘⇧3 / 4', 'Screenshot'],
      ['⌃⌘Q', 'Lock Screen'],
      ['⌥⌘Esc', 'Force Quit'],
      ['F3', 'Mission Control'],
      ['F4', 'Launchpad'],
      ['Space', 'Quick Look (Finder)'],
      ['⌘/', 'This cheat sheet'],
    ];
    ov.innerHTML =
      '<div class="kbd-panel glass">' +
      '<div class="kbd-head"><strong>Keyboard Shortcuts</strong><button type="button" class="ql-close" id="kbd-close" aria-label="Close">✕</button></div>' +
      '<div class="kbd-grid">' +
      rows
        .map(function (r) {
          return (
            '<div class="kbd-row"><kbd>' +
            r[0] +
            '</kbd><span>' +
            r[1] +
            '</span></div>'
          );
        })
        .join('') +
      '</div></div>';
    document.body.appendChild(ov);
    function close() {
      ov.remove();
    }
    ov.querySelector('#kbd-close').addEventListener('click', close);
    ov.addEventListener('click', function (e) {
      if (e.target === ov) close();
    });
    if (global.MacSounds && MacSounds.play) MacSounds.play('pop');
  }

  function showForceQuit() {
    var existing = document.getElementById('force-quit');
    if (existing) existing.remove();
    var apps = [];
    if (global.WindowManager && WindowManager.getOpenWindows) {
      var seen = {};
      WindowManager.getOpenWindows().forEach(function (w) {
        if (!seen[w.appId]) {
          seen[w.appId] = true;
          apps.push({ id: w.appId, name: w.title || titleFor(w.appId) });
        }
      });
    }
    if (!apps.length) {
      apps = [{ id: 'finder', name: 'Finder' }];
    }
    var ov = document.createElement('div');
    ov.id = 'force-quit';
    ov.className = 'force-quit-overlay';
    ov.innerHTML =
      '<div class="force-quit-panel glass">' +
      '<h2>Force Quit Applications</h2>' +
      '<p class="muted">If an app is not responding, select it and click Force Quit. Double-click to quit.</p>' +
      '<div class="force-quit-list" id="fq-list">' +
      apps
        .map(function (a, i) {
          return (
            '<button type="button" class="fq-row' +
            (i === 0 ? ' is-selected' : '') +
            '" data-app="' +
            escapeHtml(a.id) +
            '">' +
            '<span class="fq-icon">' +
            iconHtml(a.id) +
            '</span><span class="fq-name">' +
            escapeHtml(a.name) +
            '</span></button>'
          );
        })
        .join('') +
      '</div>' +
      '<div class="force-quit-actions">' +
      '<button type="button" class="btn-glass" id="fq-cancel">Cancel</button>' +
      '<button type="button" class="btn-primary" id="fq-quit"' +
      (apps.length ? '' : ' disabled') +
      '>Force Quit</button>' +
      '</div></div>';
    document.body.appendChild(ov);
    var selected = apps[0] ? apps[0].id : null;
    function doQuit() {
      if (selected && global.WindowManager) {
        if (selected === 'finder') {
          notify('Force Quit', 'Finder', 'Finder cannot be force quit (demo)', 'now');
          if (global.MacSounds && MacSounds.play) MacSounds.play('sosumi');
          return;
        }
        WindowManager.closeApp(selected);
        syncRunningFromWindows();
        if (global.MacSounds && MacSounds.play) MacSounds.play('emptyTrash');
        notify('Force Quit', titleFor(selected), 'Application forced to quit', 'now');
      }
      ov.remove();
    }
    $$('.fq-row', ov).forEach(function (row) {
      row.addEventListener('click', function () {
        $$('.fq-row', ov).forEach(function (r) {
          r.classList.remove('is-selected');
        });
        row.classList.add('is-selected');
        selected = row.getAttribute('data-app');
        var btn = ov.querySelector('#fq-quit');
        if (btn) btn.disabled = !selected;
        if (global.MacSounds && MacSounds.play) MacSounds.play('pop');
      });
      row.addEventListener('dblclick', function () {
        selected = row.getAttribute('data-app');
        doQuit();
      });
    });
    var cancel = ov.querySelector('#fq-cancel');
    if (cancel) {
      cancel.addEventListener('click', function () {
        ov.remove();
      });
    }
    var quit = ov.querySelector('#fq-quit');
    if (quit) {
      quit.addEventListener('click', doQuit);
    }
    ov.addEventListener('click', function (e) {
      if (e.target === ov) ov.remove();
    });
    ov.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        doQuit();
      } else if (e.key === 'Escape') {
        ov.remove();
      }
    });
    setTimeout(function () {
      ov.focus();
    }, 30);
    ov.tabIndex = -1;
  }

  /* Visual ⌘Tab app switcher HUD */
  var appSwitcher = { open: false, idx: 0, apps: [], holdTimer: null };

  function getSwitcherApps() {
    var list = [];
    var seen = {};
    if (global.WindowManager && WindowManager.getOpenWindows) {
      WindowManager.getOpenWindows().forEach(function (w) {
        if (w.minimized) return;
        if (!seen[w.appId]) {
          seen[w.appId] = true;
          list.push({ id: w.appId, name: titleFor(w.appId), windowId: w.id });
        }
      });
    }
    if (!list.length) list.push({ id: 'finder', name: 'Finder', windowId: null });
    return list;
  }

  function showAppSwitcher(forward) {
    appSwitcher.apps = getSwitcherApps();
    if (!appSwitcher.open) {
      appSwitcher.open = true;
      appSwitcher.idx = 0;
      if (appSwitcher.apps.length > 1) appSwitcher.idx = forward ? 1 : appSwitcher.apps.length - 1;
    } else {
      var n = appSwitcher.apps.length;
      appSwitcher.idx = (appSwitcher.idx + (forward ? 1 : n - 1)) % n;
    }
    var existing = document.getElementById('app-switcher');
    if (!existing) {
      existing = document.createElement('div');
      existing.id = 'app-switcher';
      existing.className = 'app-switcher-hud';
      document.body.appendChild(existing);
    }
    existing.innerHTML =
      '<div class="app-switcher-panel glass">' +
      appSwitcher.apps
        .map(function (a, i) {
          return (
            '<div class="app-switcher-item' +
            (i === appSwitcher.idx ? ' is-active' : '') +
            '" data-i="' +
            i +
            '">' +
            '<div class="app-switcher-icon">' +
            iconHtml(a.id) +
            '</div>' +
            '<div class="app-switcher-name">' +
            escapeHtml(a.name) +
            '</div></div>'
          );
        })
        .join('') +
      '</div>';
    existing.hidden = false;
    if (global.MacSounds && MacSounds.play) MacSounds.play('tink');
  }

  function commitAppSwitcher() {
    if (!appSwitcher.open) return;
    var a = appSwitcher.apps[appSwitcher.idx];
    var el = document.getElementById('app-switcher');
    if (el) el.remove();
    appSwitcher.open = false;
    if (!a) return;
    if (a.windowId && global.WindowManager && WindowManager.focus) {
      WindowManager.focus(a.windowId);
    } else {
      openApp(a.id);
    }
  }

  function cancelAppSwitcher() {
    var el = document.getElementById('app-switcher');
    if (el) el.remove();
    appSwitcher.open = false;
  }

  function showContextMenu(x, y) {
    openContextMenu(x, y, DESKTOP_CONTEXT_HTML);
  }

  function hideContextMenu() {
    hideOverlay($('#context-menu'));
  }

  /* ── Boot fade ─────────────────────────────────────── */

  function runBoot(cb) {
    /* Prefer static HTML overlay (first paint is black) so boot is never skipped while scripts load */
    var overlay = document.getElementById('boot-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'boot-overlay';
      overlay.className = 'boot-overlay';
      overlay.setAttribute('role', 'progressbar');
      overlay.setAttribute('aria-valuemin', '0');
      overlay.setAttribute('aria-valuemax', '100');
      overlay.setAttribute('aria-valuenow', '0');
      overlay.setAttribute('aria-label', 'Starting macOS');
      overlay.innerHTML =
        '<div class="boot-logo" aria-hidden="true">' +
        '<svg class="boot-apple" viewBox="0 0 17 20" width="72" height="86" fill="#fff">' +
        '<path d="M14.23 10.66c-.03-2.55 2.08-3.78 2.17-3.84-1.18-1.73-3.02-1.97-3.68-2-1.56-.16-3.05.92-3.84.92-.79 0-2.01-.9-3.31-.87-1.7.02-3.28 1-4.15 2.53-1.77 3.07-.45 7.61 1.27 10.1.84 1.22 1.84 2.59 3.15 2.54 1.26-.05 1.74-.82 3.27-.82 1.52 0 1.95.82 3.29.79 1.36-.02 2.22-1.24 3.05-2.47.96-1.4 1.36-2.76 1.38-2.83-.03-.01-2.65-1.02-2.68-4.05zM11.7 2.9c.7-.84 1.17-2.01 1.04-3.18-1.01.04-2.23.67-2.95 1.52-.65.75-1.21 1.95-1.06 3.1 1.12.09 2.26-.57 2.97-1.44z"/>' +
        '</svg></div>' +
        '<div class="boot-progress" id="boot-bar-track">' +
        '<div class="boot-progress-bar" id="boot-bar"></div></div>';
      document.body.insertBefore(overlay, document.body.firstChild);
    }
    overlay.classList.remove('is-done');
    overlay.style.opacity = '1';
    overlay.style.pointerEvents = 'auto';
    overlay.setAttribute('aria-hidden', 'false');

    var bar = document.getElementById('boot-bar') || overlay.querySelector('.boot-progress-bar');
    if (bar) {
      bar.style.width = '0%';
      bar.style.transitionDuration = '0ms';
    }

    /* ~3.2s staged fill (real Mac-like), still skippable after a short grace period */
    var stages = [
      { p: 6, t: 200 },
      { p: 18, t: 360 },
      { p: 34, t: 480 },
      { p: 52, t: 420 },
      { p: 68, t: 500 },
      { p: 84, t: 380 },
      { p: 96, t: 320 },
      { p: 100, t: 260 },
    ];
    var i = 0;
    var finished = false;
    var canSkip = false;
    setTimeout(function () {
      canSkip = true;
    }, 450);

    function finishBoot() {
      if (finished) return;
      finished = true;
      overlay.classList.add('is-done');
      overlay.setAttribute('aria-hidden', 'true');
      overlay.style.pointerEvents = 'none';
      setTimeout(function () {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        bootDone = true;
        if (global.MacSounds && MacSounds.play) {
          try {
            MacSounds.play('boot');
          } catch (e) {}
        }
        if (cb) cb();
      }, 550);
    }

    function trySkip() {
      if (canSkip) finishBoot();
    }
    overlay.addEventListener('click', trySkip);
    document.addEventListener('keydown', function onBootKey(e) {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        trySkip();
        if (finished) document.removeEventListener('keydown', onBootKey);
      }
    });

    function step() {
      if (finished) return;
      if (i >= stages.length) {
        setTimeout(finishBoot, 220);
        return;
      }
      var s = stages[i++];
      if (bar) {
        bar.style.transitionDuration = Math.max(140, s.t - 40) + 'ms';
        bar.style.width = s.p + '%';
      }
      overlay.setAttribute('aria-valuenow', String(s.p));
      setTimeout(step, s.t);
    }

    requestAnimationFrame(function () {
      requestAnimationFrame(step);
    });
  }

  /* ── Event wiring ──────────────────────────────────── */

  function wireEvents() {
    // Menubar item toggles
    $$('#menubar .menubar-item[data-menu]').forEach(function (item) {
      item.addEventListener('click', function (e) {
        // Don't toggle when clicking inside dropdown action
        if (e.target.closest('.menu-dropdown-item')) return;
        e.stopPropagation();
        var wasOpen = item.classList.contains('is-open');
        closeMenubarMenus();
        hideControlCenter();
        hideNotificationCenter();
        /* stopPropagation would skip document dismiss — close context explicitly */
        hideContextMenu();
        if (!wasOpen) {
          item.classList.add('is-open');
          item.setAttribute('aria-expanded', 'true');
          var dd = item.querySelector('.menu-dropdown');
          if (dd) dd.classList.add('is-open');
        }
      });
    });

    // Menu actions (delegation)
    document.addEventListener('click', function (e) {
      var actionEl = e.target.closest('[data-action]');
      if (actionEl) {
        var action = actionEl.getAttribute('data-action');
        // Menubar icon buttons
        if (action === 'spotlight') {
          e.stopPropagation();
          toggleSpotlight();
          return;
        }
        if (action === 'control-center') {
          e.stopPropagation();
          toggleControlCenter();
          return;
        }
        if (action === 'notification-center') {
          e.stopPropagation();
          toggleNotificationCenter();
          return;
        }
        if (action === 'wifi' || action === 'battery') {
          e.stopPropagation();
          toggleControlCenter();
          return;
        }
        if (action === 'open-app') {
          e.stopPropagation();
          handleMenuAction(action, actionEl);
          hideContextMenu();
          return;
        }
        handleMenuAction(action, actionEl);
        hideContextMenu();
        return;
      }

      // Click outside closes menus / panels
      if (!e.target.closest('#control-center') && !e.target.closest('#control-center-btn')) {
        hideControlCenter();
      }
      if (!e.target.closest('#notification-center') && !e.target.closest('#menubar-clock')) {
        // clock opens NC - only close if not clicking clock
        if (!e.target.closest('[data-action="notification-center"]')) {
          hideNotificationCenter();
        }
      }
      if (!e.target.closest('.menubar-item')) {
        closeMenubarMenus();
      }
      if (!e.target.closest('#context-menu')) {
        hideContextMenu();
      }
    });

    // Spotlight input
    var spotInput = $('#spotlight-input');
    if (spotInput) {
      spotInput.addEventListener('input', function () {
        renderSpotlightResults(spotInput.value);
      });
      spotInput.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          moveSpotlight(1);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          moveSpotlight(-1);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          activateSpotlight();
        } else if (e.key === 'Escape') {
          hideSpotlight();
        }
      });
    }
    var spot = $('#spotlight');
    if (spot) {
      spot.addEventListener('click', function (e) {
        if (e.target === spot) hideSpotlight();
      });
    }

    // Launchpad search + keyboard
    var lpSearch = $('#launchpad-search');
    if (lpSearch) {
      lpSearch.addEventListener('input', function () {
        renderLaunchpadGrid(lpSearch.value);
      });
      lpSearch.addEventListener('keydown', function (e) {
        var grid = $('#launchpad-grid');
        if (!grid) return;
        var apps = $$('.launchpad-app', grid);
        if (!apps.length) return;
        var active = grid.querySelector('.launchpad-app.is-focused');
        var idx = active ? apps.indexOf(active) : -1;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault();
          idx = Math.min(apps.length - 1, idx + 1);
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault();
          idx = Math.max(0, idx - 1);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          if (active) active.click();
          else if (apps[0]) apps[0].click();
          return;
        } else if (e.key === 'Escape') {
          hideLaunchpad();
          return;
        } else {
          return;
        }
        apps.forEach(function (a) {
          a.classList.remove('is-focused');
        });
        if (apps[idx]) {
          apps[idx].classList.add('is-focused');
          apps[idx].scrollIntoView({ block: 'nearest' });
        }
      });
    }
    var lp = $('#launchpad');
    if (lp) {
      lp.addEventListener('click', function (e) {
        if (e.target === lp || e.target.classList.contains('launchpad-backdrop')) {
          hideLaunchpad();
        }
      });
    }

    // Control center toggles (macOS 27 liquid glass modules)
    $$('#control-center [data-cc][data-toggle], #control-center [data-cc="screenshot"], #control-center [data-cc="appearance"], #control-center [data-cc="edit"]').forEach(function (tile) {
      if (tile.querySelector('input[type="range"]')) return;
      tile.addEventListener('click', function (e) {
        e.stopPropagation();
        var cc = tile.getAttribute('data-cc');
        if (cc === 'stage-manager') {
          toggleStageManager();
          tile.classList.toggle('is-active', isStageManagerOn());
          return;
        }
        if (cc === 'appearance') {
          cycleAppearance();
          return;
        }
        if (cc === 'screenshot') {
          captureScreenshot('full');
          return;
        }
        if (cc === 'edit') {
          notify('Control Center', 'Edit Controls', 'Customize modules in System Settings', 'now');
          return;
        }
        tile.classList.toggle('is-active');
        if (global.MacSounds && MacSounds.play) {
          try {
            MacSounds.play('pop');
          } catch (err) {}
        }
        if (cc === 'screen-mirroring') {
          var mirOn = tile.classList.contains('is-active');
          notify(
            'Screen Mirroring',
            mirOn ? 'Looking for displays…' : 'Stopped',
            mirOn ? 'Opening Sidecar as second display' : 'Screen Mirroring off',
            'now'
          );
          if (mirOn) {
            setTimeout(function () {
              openApp('sidecar');
            }, 350);
          }
          return;
        }
        var sub = tile.querySelector('.cc-sublabel');
        if (sub && (cc === 'wifi' || cc === 'bluetooth' || cc === 'airdrop' || cc === 'focus')) {
          var on = tile.classList.contains('is-active');
          if (cc === 'focus') {
            var label = tile.querySelector('.cc-label');
            if (label) label.textContent = 'Do Not Disturb';
            sub.textContent = on ? 'On' : 'Off';
            setFocusMode(on);
            notify(
              'Focus',
              on ? 'Do Not Disturb On' : 'Do Not Disturb Off',
              on ? 'Notifications are silenced' : 'Notifications will appear again',
              'now',
              { force: true }
            );
          } else if (cc === 'airdrop') {
            sub.textContent = on ? 'Everyone' : 'Contacts Only';
            notify('AirDrop', on ? 'Everyone' : 'Contacts Only', 'Receiving set', 'now');
          } else if (cc === 'wifi') {
            sub.textContent = on ? 'Home Network' : 'Off';
            var wifiBtn = $('#wifi-btn');
            if (wifiBtn) {
              wifiBtn.classList.toggle('is-offline', !on);
              wifiBtn.title = on ? 'Wi-Fi · Home Network' : 'Wi-Fi · Off';
            }
            document.documentElement.classList.toggle('is-offline', !on);
            notify('Wi‑Fi', on ? 'Connected' : 'Off', on ? 'Home Network' : 'Not connected', 'now');
          } else if (cc === 'bluetooth') {
            sub.textContent = on ? 'On' : 'Off';
            notify('Bluetooth', on ? 'On' : 'Off', on ? 'Devices available' : 'Bluetooth disabled', 'now');
          } else sub.textContent = on ? 'On' : 'Off';
          try {
            localStorage.setItem('macos-cc-' + cc, on ? '1' : '0');
          } catch (err2) {}
        }
      });
    });

    /* Restore CC toggle state */
    $$('#control-center [data-cc]').forEach(function (tile) {
      var cc = tile.getAttribute('data-cc');
      if (!cc || (cc !== 'wifi' && cc !== 'bluetooth' && cc !== 'airdrop' && cc !== 'focus')) return;
      try {
        var saved = localStorage.getItem('macos-cc-' + cc);
        if (saved === null) return;
        var on = saved === '1';
        tile.classList.toggle('is-active', on);
        var sub = tile.querySelector('.cc-sublabel');
        if (!sub) return;
        if (cc === 'focus') {
          sub.textContent = on ? 'On' : 'Off';
          setFocusMode(on);
        } else if (cc === 'airdrop') sub.textContent = on ? 'Everyone' : 'Contacts Only';
        else if (cc === 'wifi') sub.textContent = on ? 'Home Network' : 'Off';
        else sub.textContent = on ? 'On' : 'Off';
      } catch (e) {}
    });

    // Mission Control backdrop click closes
    var mc = $('#mission-control');
    if (mc) {
      mc.addEventListener('click', function (e) {
        if (e.target === mc || e.target.classList.contains('mc-windows') ||
            e.target.classList.contains('mc-empty')) {
          closeMissionControl();
        }
      });
    }

    // Hot corners (dwell ~280ms)
    // TL Mission Control · TR Notification Center · BL Launchpad · BR Desktop (minimize all)
    var lastHotCorner = '';
    document.addEventListener('mousemove', function (e) {
      var w = window.innerWidth;
      var h = window.innerHeight;
      var corner = '';
      if (e.clientX <= 3 && e.clientY <= 3) corner = 'tl';
      else if (e.clientX >= w - 3 && e.clientY <= 3) corner = 'tr';
      else if (e.clientX <= 3 && e.clientY >= h - 3) corner = 'bl';
      else if (e.clientX >= w - 3 && e.clientY >= h - 3) corner = 'br';
      if (!corner) {
        if (hotCornerTimer) {
          clearTimeout(hotCornerTimer);
          hotCornerTimer = null;
        }
        lastHotCorner = '';
        return;
      }
      if (corner === lastHotCorner && hotCornerTimer) return;
      if (hotCornerTimer) clearTimeout(hotCornerTimer);
      lastHotCorner = corner;
      hotCornerTimer = setTimeout(function () {
        hotCornerTimer = null;
        if (corner === 'tl' && !isOpen($('#mission-control')) && !isOpen($('#launchpad'))) {
          openMissionControl();
        } else if (corner === 'tr' && !isOpen($('#notification-center'))) {
          toggleNotificationCenter();
        } else if (corner === 'bl' && !isOpen($('#launchpad'))) {
          openLaunchpad();
        } else if (corner === 'br') {
          /* Show Desktop: minimize all windows */
          if (global.WindowManager && WindowManager.getOpenWindows) {
            WindowManager.getOpenWindows().forEach(function (win) {
              if (!win.minimized && WindowManager.minimize) WindowManager.minimize(win.id);
            });
            if (global.MacSounds && MacSounds.play) MacSounds.play('pop');
            notify('Desktop', 'Show Desktop', 'Windows minimized', 'now');
          }
        }
      }, 280);
    });

    // Brightness (persist)
    var brightness = $('#cc-brightness');
    if (brightness) {
      try {
        var bs = localStorage.getItem('macos-cc-brightness');
        if (bs != null) brightness.value = bs;
      } catch (e) {}
      function applyBrightness() {
        var v = 0.45 + (Number(brightness.value) / 100) * 0.55;
        var wall = $('#wallpaper') || document.documentElement;
        wall.style.filter = 'brightness(' + v + ')';
        try {
          localStorage.setItem('macos-cc-brightness', brightness.value);
        } catch (err) {}
      }
      applyBrightness();
      brightness.addEventListener('input', applyBrightness);
    }

    // Sound volume tick (persist)
    var volume = $('#cc-volume') || document.querySelector('#control-center input[type="range"][data-cc="sound"], #control-center .cc-sound input, #cc-sound');
    if (!volume) {
      volume = document.querySelector('#control-center input[type="range"]:not(#cc-brightness)');
    }
    if (volume) {
      try {
        var vs = localStorage.getItem('macos-cc-volume');
        if (vs != null) volume.value = vs;
      } catch (e) {}
      var lastVolSound = 0;
      volume.addEventListener('input', function () {
        try {
          localStorage.setItem('macos-cc-volume', volume.value);
        } catch (err) {}
        var now = Date.now();
        if (now - lastVolSound > 90 && global.MacSounds && MacSounds.play) {
          lastVolSound = now;
          try {
            MacSounds.play('volume');
          } catch (e2) {}
        }
      });
    }

    /* CC Now Playing mini player */
    var media = document.querySelector('#control-center .cc-media');
    if (media && !media.dataset.wired) {
      media.dataset.wired = '1';
      var playing = false;
      var tracks = [
        { t: 'Liquid Glass', a: 'Ensemble' },
        { t: 'Neon Rain', a: 'City Nights' },
        { t: 'Soft Static', a: 'Lo-Fi Lab' },
        { t: 'Harbor Lights', a: 'Weekend' },
      ];
      var ti = 0;
      var titleEl = media.querySelector('.cc-media-title');
      function setTrack() {
        if (titleEl) {
          titleEl.textContent = playing
            ? tracks[ti].t + ' — ' + tracks[ti].a
            : 'Not Playing';
        }
      }
      $$('.cc-media-btn', media).forEach(function (btn, i) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          if (btn.classList.contains('play') || i === 1) {
            playing = !playing;
            btn.textContent = playing ? '❚❚' : '▶';
            btn.setAttribute('aria-label', playing ? 'Pause' : 'Play');
            setTrack();
            if (global.MacSounds && MacSounds.play) MacSounds.play(playing ? 'funk' : 'pop');
          } else {
            ti = (ti + (i === 0 ? tracks.length - 1 : 1)) % tracks.length;
            setTrack();
            if (global.MacSounds && MacSounds.play) MacSounds.play('tink');
          }
        });
      });
      media.addEventListener('dblclick', function () {
        openApp('music');
        hideOverlay($('#control-center'));
      });
      media.title = 'Double-click for Music';
    }

    /* Keyboard volume / brightness when not typing */
    document.addEventListener('keydown', function (e) {
      var tag = (e.target && e.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target && e.target.isContentEditable)) return;
      var vol = $('#cc-volume');
      var bri = $('#cc-brightness');
      if (e.key === 'AudioVolumeUp' || (e.metaKey && e.altKey && e.key === 'ArrowUp')) {
        if (vol) {
          vol.value = String(Math.min(100, Number(vol.value) + 5));
          vol.dispatchEvent(new Event('input'));
        }
      } else if (e.key === 'AudioVolumeDown' || (e.metaKey && e.altKey && e.key === 'ArrowDown')) {
        if (vol) {
          vol.value = String(Math.max(0, Number(vol.value) - 5));
          vol.dispatchEvent(new Event('input'));
        }
      } else if (e.key === 'AudioVolumeMute') {
        if (vol) {
          if (vol.dataset.prev == null) vol.dataset.prev = vol.value;
          if (Number(vol.value) === 0) {
            vol.value = vol.dataset.prev || '55';
          } else {
            vol.dataset.prev = vol.value;
            vol.value = '0';
          }
          vol.dispatchEvent(new Event('input'));
        }
      } else if (e.key === 'BrightnessUp' || (e.metaKey && e.altKey && e.key === 'ArrowRight')) {
        if (bri) {
          bri.value = String(Math.min(100, Number(bri.value) + 5));
          bri.dispatchEvent(new Event('input'));
        }
      } else if (e.key === 'BrightnessDown' || (e.metaKey && e.altKey && e.key === 'ArrowLeft')) {
        if (bri) {
          bri.value = String(Math.max(0, Number(bri.value) - 5));
          bri.dispatchEvent(new Event('input'));
        }
      }
    });

    // NC clear
    var clearBtn = $('#nc-clear-all');
    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        handleMenuAction('clear-notifications');
      });
    }

    // Desktop / icon / empty-space context menu (capture so windows layer never blocks it)
    document.addEventListener(
      'contextmenu',
      function (e) {
        if (e.defaultPrevented) return;
        /* Native targets that own their own menus or should keep browser menu */
        if (e.target.closest('#context-menu')) return;
        if (e.target.closest('#dock, #dock-container')) return; /* dock handler uses stopPropagation */
        if (e.target.closest('#menubar')) return;
        if (e.target.closest('.window')) return;
        if (e.target.closest('#spotlight, #launchpad, #mission-control, #control-center, #notification-center'))
          return;
        if (e.target.closest('input, textarea, select, [contenteditable="true"]')) return;

        e.preventDefault();
        e.stopPropagation();

        var icon = e.target.closest('.desktop-icon');
        if (icon) {
          showIconContextMenu(e.clientX, e.clientY, icon);
          return;
        }
        showContextMenu(e.clientX, e.clientY);
      },
      true
    );

    // Widget double-click opens related apps; single-click interactions
    var widgets = $('#desktop-widgets');
    if (widgets) {
      widgets.addEventListener('dblclick', function (e) {
        var w = e.target.closest('[data-widget]');
        if (!w) return;
        var kind = w.getAttribute('data-widget');
        if (kind === 'clock') openApp('clock');
        else if (kind === 'weather') openApp('weather');
        else if (kind === 'calendar') openApp('calendar');
        else if (kind === 'music') openApp('music');
        if (global.MacSounds && MacSounds.play) MacSounds.play('pop');
      });
      wireDesktopWidgets(widgets);
    }

    // Battery: click shows status; slow drain simulation
    wireBattery();
    wireNetworkStatus();

    // Notification dismiss on sample cards
    wireNotificationList();

    // Sync wallpaper index from current background if set in CSS
    if (wallpaper) {
      var bg = wallpaper.style.backgroundImage || '';
      if (bg.indexOf('wallpaper-glass') !== -1) wallpaperIndex = 1;
      else wallpaperIndex = 0;
      if (!wallpaper.dataset.wallpaper) {
        applyWallpaper(WALLPAPERS[wallpaperIndex]);
      }
    }

    // Context menu items (delegation — works after dock/icon rebuild HTML)
    var ctxMenu = $('#context-menu');
    if (ctxMenu && !ctxMenu.dataset.wired) {
      ctxMenu.dataset.wired = '1';
      ctxMenu.addEventListener('click', function (e) {
        var item = e.target.closest('[data-action]');
        if (!item || item.classList.contains('is-disabled')) return;
        e.preventDefault();
        e.stopPropagation();
        var action = item.getAttribute('data-action');
        var appId = item.getAttribute('data-app') || item.getAttribute('data-open');
        hideContextMenu();
        if (
          action &&
          (action.indexOf('dock-') === 0 ||
            action === 'icon-open' ||
            action === 'empty-trash')
        ) {
          runDockContextAction(action, appId);
          return;
        }
        handleMenuAction(action, item);
      });
      ctxMenu.addEventListener('contextmenu', function (e) {
        e.preventDefault();
        e.stopPropagation();
      });
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', function (e) {
      var meta = e.metaKey || e.ctrlKey;
      var key = e.key;

      if (meta && (key === ' ' || e.code === 'Space')) {
        e.preventDefault();
        toggleSpotlight();
        return;
      }

      /* ⌘⇧3 full screen, ⌘⇧4 selection */
      if (meta && e.shiftKey && (key === '3' || key === '#')) {
        e.preventDefault();
        captureScreenshot('full');
        return;
      }
      if (meta && e.shiftKey && (key === '4' || key === '$')) {
        e.preventDefault();
        captureScreenshot(e.altKey || e.code === 'Space' ? 'window' : 'selection');
        return;
      }

      // Mission Control: F3 or Control+Up (ArrowUp with ctrl, without meta)
      if (key === 'F3' || e.code === 'F3') {
        e.preventDefault();
        toggleMissionControl();
        return;
      }
      if (e.ctrlKey && !e.metaKey && !e.altKey && (key === 'ArrowUp' || e.code === 'ArrowUp')) {
        e.preventDefault();
        toggleMissionControl();
        return;
      }

      if (key === 'F4') {
        e.preventDefault();
        toggleLaunchpad();
        return;
      }

      if (key === 'Escape') {
        var lock = document.getElementById('lock-screen');
        var fq = document.getElementById('force-quit');
        if (fq) {
          e.preventDefault();
          fq.remove();
          return;
        }
        if (lock) {
          /* stay locked — require password */
          return;
        }
        if (isOpen($('#spotlight')) || isOpen($('#launchpad')) ||
            isOpen($('#mission-control')) ||
            isOpen($('#control-center')) || isOpen($('#notification-center')) ||
            isOpen($('#context-menu')) || $$('.menubar-item.is-open').length) {
          e.preventDefault();
          closeAllOverlays();
          return;
        }
      }

      /* ⌥⌘Esc Force Quit */
      if (meta && e.altKey && (key === 'Escape' || e.code === 'Escape')) {
        e.preventDefault();
        showForceQuit();
        return;
      }

      /* ⌃⌘Q Lock Screen */
      if (meta && e.ctrlKey && (key === 'q' || key === 'Q')) {
        e.preventDefault();
        showLockScreen('Lock Screen');
        return;
      }

      /* ⌘/ or ⌘? keyboard shortcuts help */
      if (meta && (key === '/' || key === '?' || e.code === 'Slash')) {
        if (typing) return;
        e.preventDefault();
        showKeyboardCheatSheet();
        return;
      }

      if (!meta || !global.WindowManager) return;

      // Don't steal from inputs except known shortcuts
      var tag = (e.target && e.target.tagName) || '';
      var typing = tag === 'INPUT' || tag === 'TEXTAREA' || (e.target && e.target.isContentEditable);

      if (key === 'w' || key === 'W') {
        if (typing) return;
        e.preventDefault();
        WindowManager.closeFocused();
        syncRunningFromWindows();
      } else if (key === 'q' || key === 'Q') {
        if (typing) return;
        e.preventDefault();
        var focused = WindowManager.getFocused();
        if (focused) {
          WindowManager.closeApp(focused.appId);
          syncRunningFromWindows();
          setActiveApp('Finder');
        }
      } else if (key === 'm' || key === 'M') {
        if (typing) return;
        e.preventDefault();
        WindowManager.minimizeFocused();
        syncRunningFromWindows();
      } else if (key === 'n' || key === 'N') {
        if (typing) return;
        e.preventDefault();
        openApp('finder');
      } else if (key === ',' || e.code === 'Comma') {
        if (typing) return;
        e.preventDefault();
        openApp('system-settings');
      } else if (key === 'h' || key === 'H') {
        if (typing) return;
        e.preventDefault();
        if (e.altKey) {
          handleMenuAction('hide-others');
        } else {
          handleMenuAction('hide');
        }
      } else if (key === '1' || key === '2' || key === '3' || key === '4') {
        if (typing) return;
        var views = { '1': 'icons', '2': 'list', '3': 'columns', '4': 'gallery' };
        if (views[key]) {
          e.preventDefault();
          finderSetView(views[key]);
        }
      } else if (key === 'Tab') {
        /* ⌘Tab — visual app switcher HUD */
        if (typing) return;
        e.preventDefault();
        showAppSwitcher(!e.shiftKey);
      }
    });

    document.addEventListener('keyup', function (e) {
      if (e.key === 'Meta' || e.key === 'Control' || e.code === 'MetaLeft' || e.code === 'MetaRight') {
        if (appSwitcher.open) commitAppSwitcher();
      }
    });

    document.addEventListener('keydown', function (e) {
      if (isOpen($('#mission-control'))) {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'Enter') {
          if (missionControlKey(e.key)) {
            e.preventDefault();
          }
        }
      }
    });

    // Window lifecycle
    document.addEventListener('window:open', function (e) {
      var d = e.detail || {};
      if (d.appId) setRunning(d.appId, true);
      syncRunningFromWindows();
      // Always resolve name from appId — never accumulate d.title
      if (d.appId) setActiveApp(titleFor(d.appId));
      else if (d.title) setActiveApp(d.title);
      if (stageManagerOn) applyStageManagerLayout();
      if (isOpen($('#mission-control'))) renderMissionControl();
    });
    document.addEventListener('window:close', function () {
      syncRunningFromWindows();
      var f = global.WindowManager && WindowManager.getFocused();
      setActiveApp(f ? titleFor(f.appId) : 'Finder');
      if (stageManagerOn) applyStageManagerLayout();
      if (isOpen($('#mission-control'))) renderMissionControl();
    });
    document.addEventListener('window:focus', function (e) {
      var d = e.detail || {};
      syncRunningFromWindows();
      if (d.appId) setActiveApp(titleFor(d.appId));
      if (stageManagerOn) applyStageManagerLayout();
    });
    document.addEventListener('window:minimize', function () {
      if (stageManagerOn) applyStageManagerLayout();
      if (isOpen($('#mission-control'))) renderMissionControl();
    });
  }

  /* Continuity handoff pill (demo devices nearby) */
  function showContinuityHandoff() {
    if (document.getElementById('continuity-handoff')) return;
    try {
      if (sessionStorage.getItem('macos-handoff-dismissed') === '1') return;
    } catch (e) {}
    var pill = document.createElement('div');
    pill.id = 'continuity-handoff';
    pill.className = 'continuity-handoff glass';
    pill.innerHTML =
      '<button type="button" class="handoff-main" data-hand="iphone">' +
      '<span class="handoff-ico">📱</span>' +
      '<span class="handoff-text"><strong>iPhone</strong><span class="muted">Safari · Continuity</span></span></button>' +
      '<button type="button" class="handoff-main" data-hand="ipad">' +
      '<span class="handoff-ico">📱</span>' +
      '<span class="handoff-text"><strong>iPad</strong><span class="muted">Sidecar</span></span></button>' +
      '<button type="button" class="handoff-x" aria-label="Dismiss">✕</button>';
    document.body.appendChild(pill);
    setTimeout(function () {
      pill.classList.add('is-show');
    }, 80);
    pill.querySelector('[data-hand="iphone"]').addEventListener('click', function () {
      openApp('iphone-mirroring');
      pill.classList.remove('is-show');
      setTimeout(function () {
        if (pill.parentNode) pill.parentNode.removeChild(pill);
      }, 300);
    });
    pill.querySelector('[data-hand="ipad"]').addEventListener('click', function () {
      openApp('sidecar');
      pill.classList.remove('is-show');
      setTimeout(function () {
        if (pill.parentNode) pill.parentNode.removeChild(pill);
      }, 300);
    });
    pill.querySelector('.handoff-x').addEventListener('click', function () {
      try {
        sessionStorage.setItem('macos-handoff-dismissed', '1');
      } catch (e2) {}
      pill.classList.remove('is-show');
      setTimeout(function () {
        if (pill.parentNode) pill.parentNode.removeChild(pill);
      }, 300);
    });
  }

  /* ── Public API ────────────────────────────────────── */

  var MacShell = {
    init: function (options) {
      options = options || {};
      loadAppearancePref();
      applyAppearance(appearancePref, { notify: false });
      wireSystemAppearanceListener();
      loadRecentApps();
      try {
        if (localStorage.getItem('macos-stage-manager') === '1') {
          setStageManager(true);
        }
      } catch (e) {}
      renderDock();
      renderDesktopIcons();
      renderRecentAppsMenu();
      wireEvents();
      wireMenubarClock();
      updateClock();
      if (clockTimer) clearInterval(clockTimer);
      clockTimer = setInterval(updateClock, 1000);
      // Ensure widget clock starts even if #widget-time was added late
      if ($('#widget-time')) updateClock();
      setActiveApp('Finder');
      // Ensure dock shows all registry dock apps after AppRegistry may load
      if (global.AppRegistry) {
        renderDock();
        renderDesktopIcons();
      }

      if (options.skipBoot) {
        bootDone = true;
        /* Re-layout after paint so host.clientWidth is real (drag coords) */
        requestAnimationFrame(function () {
          renderDesktopIcons();
        });
        if (options.onReady) options.onReady();
        showContinuityHandoff();
      } else {
        runBoot(function () {
          requestAnimationFrame(function () {
            renderDesktopIcons();
          });
          if (options.onReady) options.onReady();
          showContinuityHandoff();
        });
        /* Safety: ensure handoff appears even if boot UI was force-dismissed */
        setTimeout(function () {
          if (!bootDone) {
            bootDone = true;
            showContinuityHandoff();
          } else if (!document.getElementById('continuity-handoff')) {
            showContinuityHandoff();
          }
        }, 6000);
      }
      return this;
    },

    openApp: openApp,
    showLockScreen: showLockScreen,
    showForceQuit: showForceQuit,
    showKeyboardCheatSheet: showKeyboardCheatSheet,
    captureScreenshot: captureScreenshot,
    getLastScreenshot: function () {
      return lastScreenshotData;
    },
    openLaunchpad: openLaunchpad,
    closeLaunchpad: hideLaunchpad,
    toggleLaunchpad: toggleLaunchpad,
    openMissionControl: openMissionControl,
    closeMissionControl: closeMissionControl,
    toggleMissionControl: toggleMissionControl,
    toggleStageManager: toggleStageManager,
    setStageManager: setStageManager,
    isStageManagerOn: isStageManagerOn,
    showSpotlight: showSpotlight,
    hideSpotlight: hideSpotlight,
    toggleSpotlight: toggleSpotlight,
    toggleControlCenter: toggleControlCenter,
    toggleNotificationCenter: toggleNotificationCenter,
    closeAllOverlays: closeAllOverlays,
    showAboutThisMac: showAboutThisMac,
    renderDock: renderDock,
    bounceDock: bounceDock,
    setRunning: setRunning,
    setActiveApp: setActiveApp,
    syncRunningFromWindows: syncRunningFromWindows,
    titleFor: titleFor,
    formatClock: formatClock,
    allApps: allApps,
    cycleWallpaper: cycleWallpaper,
    setWallpaperByIndex: setWallpaperByIndex,
    applyWallpaper: applyWallpaper,
    notify: notify,
    updateClock: updateClock,
    setAppearance: setAppearance,
    cycleAppearance: cycleAppearance,
    applyAppearance: applyAppearance,
    setFocusMode: setFocusMode,
    isFocusModeOn: isFocusModeOn,
    getAppearance: function () {
      return appearancePref;
    },
    getTheme: function () {
      return resolveTheme();
    },
    syncAppearanceUI: syncAppearanceUI
  };

  global.MacShell = MacShell;
})(typeof window !== 'undefined' ? window : this);
