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

  function openApp(appId) {
    if (appId === 'launchpad') {
      MacShell.openLaunchpad();
      return;
    }
    if (appId === 'settings') appId = 'system-settings';
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

  function notify(app, title, message, time) {
    var list = $('#notification-list');
    if (!list) return;
    // Remove empty state
    var empty = list.querySelector('.muted');
    if (empty && list.children.length === 1) list.innerHTML = '';
    var card = document.createElement('div');
    card.className = 'notification-card';
    card.innerHTML =
      '<div class="notification-icon">💻</div>' +
      '<div class="notification-body">' +
      '<div class="notification-app">' + escapeHtml(app || 'macOS') + '</div>' +
      '<div class="notification-title">' + escapeHtml(title || '') + '</div>' +
      '<div class="notification-message">' + escapeHtml(message || '') + '</div>' +
      '<div class="notification-time">' + escapeHtml(time || 'now') + '</div>' +
      '</div>';
    list.insertBefore(card, list.firstChild);
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

  function wireDockInteractions(dock) {
    var items = $$('.dock-item', dock);

    // Magnification via --scale + data-magnify
    dock.addEventListener('mousemove', function (e) {
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

    items.forEach(function (item) {
      function activate() {
        openApp(item.getAttribute('data-app'));
      }
      item.addEventListener('click', activate);
      item.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          activate();
        }
      });
    });
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

  function renderSpotlightResults(query) {
    var list = $('#spotlight-results');
    if (!list) return;
    var results = filterApps(query, 16);
    spotlightIndex = 0;
    if (!results.length) {
      list.innerHTML = '<div class="spotlight-empty">No Results</div>';
      return;
    }
    list.innerHTML = results.map(function (a, i) {
      return (
        '<div class="spotlight-result' + (i === 0 ? ' is-selected' : '') +
        '" role="option" data-app="' + escapeHtml(a.id) + '" tabindex="-1">' +
        '<div class="spotlight-result-icon">' + iconHtml(a.id) + '</div>' +
        '<div class="spotlight-result-text">' +
        '<div class="spotlight-result-title">' + escapeHtml(a.name) + '</div>' +
        '<div class="spotlight-result-sub">Application</div>' +
        '</div></div>'
      );
    }).join('');

    $$('.spotlight-result', list).forEach(function (row, idx) {
      row.addEventListener('click', function () {
        hideSpotlight();
        openApp(row.getAttribute('data-app'));
      });
      row.addEventListener('mouseenter', function () {
        $$('.spotlight-result', list).forEach(function (r) { r.classList.remove('is-selected'); });
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
    var sel = $('.spotlight-result.is-selected');
    if (sel) {
      hideSpotlight();
      openApp(sel.getAttribute('data-app'));
    }
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
      });
    });
  }

  /* ── Mission Control ───────────────────────────────── */

  function openMissionControl() {
    closeAllOverlays();
    renderMissionControl();
    showOverlay($('#mission-control'));
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

    grid.innerHTML = wins.map(function (w) {
      var name = w.title || titleFor(w.appId);
      return (
        '<button type="button" class="mc-thumb' + (w.focused ? ' is-focused' : '') +
        '" role="listitem" data-window-id="' + escapeHtml(w.id) +
        '" data-app="' + escapeHtml(w.appId) + '" aria-label="' + escapeHtml(name) + '">' +
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

    $$('.mc-thumb', grid).forEach(function (thumb) {
      thumb.addEventListener('click', function () {
        var id = thumb.getAttribute('data-window-id');
        closeMissionControl();
        if (global.WindowManager && id) {
          WindowManager.focus(id);
          if (stageManagerOn) applyStageManagerLayout();
        }
      });
    });
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
        }
      });
    });

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
    WindowManager.open(
      'about-this-mac',
      'About This Mac',
      '<div class="about-mac" style="padding:32px;text-align:center">' +
        '<div style="font-size:48px;margin-bottom:12px"></div>' +
        '<h2 style="margin:0 0 4px">macOS 27</h2>' +
        '<p class="muted" style="margin:0 0 16px">Liquid Glass · Virtual Desktop</p>' +
        '<p style="margin:4px 0">Chip: Apple Silicon (simulated)</p>' +
        '<p style="margin:4px 0">Memory: ' + (navigator.deviceMemory || 16) + ' GB</p>' +
        '</div>',
      { width: 420, height: 340, resizable: false }
    );
  }

  function handleMenuAction(action) {
    closeMenubarMenus();
    switch (action) {
      case 'about':
        showAboutThisMac();
        break;
      case 'system-settings':
      case 'settings':
        openApp('system-settings');
        break;
      case 'app-store':
        openApp('appstore');
        break;
      case 'sleep':
        flashSleep();
        break;
      case 'restart':
        if (confirm('Are you sure you want to restart your computer?')) location.reload();
        break;
      case 'shutdown':
        if (confirm('Are you sure you want to shut down your computer?')) {
          document.body.innerHTML =
            '<div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#000;color:#fff;font:15px/1.4 -apple-system,system-ui,sans-serif">You can now close this tab.</div>';
        }
        break;
      case 'lock':
      case 'logout':
        flashSleep();
        break;
      case 'close':
        if (global.WindowManager) WindowManager.closeFocused();
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
      case 'new-folder':
        openApp('finder');
        break;
      case 'about-app':
        showAboutThisMac();
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
        break;
      case 'get-info':
        if (global.WindowManager) {
          WindowManager.open('get-info', 'Desktop Info',
            '<div style="padding:24px"><h2>Desktop</h2><p class="muted">Virtual macOS 27 desktop.</p></div>',
            { width: 360, height: 240, resizable: false });
        }
        break;
      case 'refresh':
        break;
      default:
        break;
    }
  }

  function flashSleep() {
    var ov = document.createElement('div');
    ov.style.cssText =
      'position:fixed;inset:0;background:#000;z-index:99999;opacity:0;transition:opacity .5s ease';
    document.body.appendChild(ov);
    requestAnimationFrame(function () {
      ov.style.opacity = '1';
    });
    setTimeout(function () {
      ov.style.opacity = '0';
      setTimeout(function () {
        if (ov.parentNode) ov.parentNode.removeChild(ov);
      }, 500);
    }, 1400);
  }

  function showContextMenu(x, y) {
    var menu = $('#context-menu');
    if (!menu) return;
    closeAllOverlays();
    showOverlay(menu);
    var pad = 8;
    var mw = menu.offsetWidth || 220;
    var mh = menu.offsetHeight || 200;
    menu.style.left = Math.max(pad, Math.min(x, window.innerWidth - mw - pad)) + 'px';
    menu.style.top = Math.max(pad, Math.min(y, window.innerHeight - mh - pad)) + 'px';
  }

  function hideContextMenu() {
    hideOverlay($('#context-menu'));
  }

  /* ── Boot fade ─────────────────────────────────────── */

  function runBoot(cb) {
    var root = $('#macos');
    if (!root) {
      bootDone = true;
      if (cb) cb();
      return;
    }
    var overlay = document.createElement('div');
    overlay.id = 'boot-overlay';
    overlay.className = 'boot-overlay';
    overlay.setAttribute('role', 'progressbar');
    overlay.setAttribute('aria-valuemin', '0');
    overlay.setAttribute('aria-valuemax', '100');
    overlay.setAttribute('aria-valuenow', '0');
    overlay.setAttribute('aria-label', 'Starting macOS');
    /* Real Mac boot: pure black, Apple logo, thin white progress bar under logo */
    overlay.innerHTML =
      '<div class="boot-logo" aria-hidden="true">' +
      '<svg class="boot-apple" viewBox="0 0 17 20" width="72" height="86" fill="#fff">' +
      '<path d="M14.23 10.66c-.03-2.55 2.08-3.78 2.17-3.84-1.18-1.73-3.02-1.97-3.68-2-1.56-.16-3.05.92-3.84.92-.79 0-2.01-.9-3.31-.87-1.7.02-3.28 1-4.15 2.53-1.77 3.07-.45 7.61 1.27 10.1.84 1.22 1.84 2.59 3.15 2.54 1.26-.05 1.74-.82 3.27-.82 1.52 0 1.95.82 3.29.79 1.36-.02 2.22-1.24 3.05-2.47.96-1.4 1.36-2.76 1.38-2.83-.03-.01-2.65-1.02-2.68-4.05zM11.7 2.9c.7-.84 1.17-2.01 1.04-3.18-1.01.04-2.23.67-2.95 1.52-.65.75-1.21 1.95-1.06 3.1 1.12.09 2.26-.57 2.97-1.44z"/>' +
      '</svg></div>' +
      '<div class="boot-progress" id="boot-bar-track">' +
      '<div class="boot-progress-bar" id="boot-bar"></div></div>';
    document.body.appendChild(overlay);

    var bar = document.getElementById('boot-bar');
    var stages = [
      { p: 8, t: 120 },
      { p: 22, t: 280 },
      { p: 38, t: 420 },
      { p: 55, t: 380 },
      { p: 72, t: 450 },
      { p: 88, t: 320 },
      { p: 100, t: 280 },
    ];
    var i = 0;
    var totalMs = 0;
    stages.forEach(function (s) {
      totalMs += s.t;
    });

    function step() {
      if (i >= stages.length) {
        setTimeout(function () {
          overlay.classList.add('is-done');
          setTimeout(function () {
            if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
            bootDone = true;
            if (cb) cb();
          }, 650);
        }, 180);
        return;
      }
      var s = stages[i++];
      if (bar) {
        bar.style.transitionDuration = Math.max(120, s.t - 40) + 'ms';
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
        handleMenuAction(action);
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

    // Launchpad search
    var lpSearch = $('#launchpad-search');
    if (lpSearch) {
      lpSearch.addEventListener('input', function () {
        renderLaunchpadGrid(lpSearch.value);
      });
    }
    var lp = $('#launchpad');
    if (lp) {
      lp.addEventListener('click', function (e) {
        // optional: don't close on empty click (macOS stays open)
        if (e.target === lp) {
          // keep open
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
          notify('Screenshot', 'Capture', 'Saved to Desktop', 'now');
          return;
        }
        if (cc === 'edit') {
          notify('Control Center', 'Edit Controls', 'Customize modules in System Settings', 'now');
          return;
        }
        tile.classList.toggle('is-active');
        var sub = tile.querySelector('.cc-sublabel');
        if (sub && (cc === 'wifi' || cc === 'bluetooth' || cc === 'airdrop' || cc === 'focus')) {
          var on = tile.classList.contains('is-active');
          if (cc === 'focus') {
            var label = tile.querySelector('.cc-label');
            if (label) label.textContent = 'Do Not Disturb';
            sub.textContent = on ? 'On' : 'Off';
          } else if (cc === 'airdrop') sub.textContent = on ? 'Everyone' : 'Contacts Only';
          else if (cc === 'wifi') sub.textContent = on ? 'Home Network' : 'Off';
          else sub.textContent = on ? 'On' : 'Off';
        }
      });
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

    // Hot corner: top-left opens Mission Control (brief dwell)
    document.addEventListener('mousemove', function (e) {
      if (e.clientX <= 2 && e.clientY <= 2) {
        if (hotCornerTimer) return;
        hotCornerTimer = setTimeout(function () {
          hotCornerTimer = null;
          if (!isOpen($('#mission-control')) && !isOpen($('#launchpad'))) {
            openMissionControl();
          }
        }, 280);
      } else if (hotCornerTimer) {
        clearTimeout(hotCornerTimer);
        hotCornerTimer = null;
      }
    });

    // Brightness
    var brightness = $('#cc-brightness');
    if (brightness) {
      brightness.addEventListener('input', function () {
        var v = 0.45 + (Number(brightness.value) / 100) * 0.55;
        var wall = $('#wallpaper') || document.documentElement;
        wall.style.filter = 'brightness(' + v + ')';
      });
    }

    // NC clear
    var clearBtn = $('#nc-clear-all');
    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        handleMenuAction('clear-notifications');
      });
    }

    // Desktop context menu
    var desktop = $('#desktop-icons') || $('#desktop') || $('#macos');
    var wallpaper = $('#wallpaper');
    var widgets = $('#desktop-widgets');
    function onContext(e) {
      // Only when not on a window
      if (e.target.closest('.window')) return;
      e.preventDefault();
      showContextMenu(e.clientX, e.clientY);
    }
    if (wallpaper) wallpaper.addEventListener('contextmenu', onContext);
    if (desktop) desktop.addEventListener('contextmenu', onContext);
    if (widgets) widgets.addEventListener('contextmenu', onContext);

    // Widget double-click opens related apps
    if (widgets) {
      widgets.addEventListener('dblclick', function (e) {
        var w = e.target.closest('[data-widget]');
        if (!w) return;
        var kind = w.getAttribute('data-widget');
        if (kind === 'clock') openApp('clock');
        else if (kind === 'weather') openApp('weather');
        else if (kind === 'calendar') openApp('calendar');
        else if (kind === 'music') openApp('music');
      });
    }

    // Sync wallpaper index from current background if set in CSS
    if (wallpaper) {
      var bg = wallpaper.style.backgroundImage || '';
      if (bg.indexOf('wallpaper-glass') !== -1) wallpaperIndex = 1;
      else wallpaperIndex = 0;
      if (!wallpaper.dataset.wallpaper) {
        applyWallpaper(WALLPAPERS[wallpaperIndex]);
      }
    }

    // Context menu items
    $$('#context-menu [data-action]').forEach(function (item) {
      item.addEventListener('click', function (e) {
        e.stopPropagation();
        handleMenuAction(item.getAttribute('data-action'));
        hideContextMenu();
      });
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', function (e) {
      var meta = e.metaKey || e.ctrlKey;
      var key = e.key;

      if (meta && (key === ' ' || e.code === 'Space')) {
        e.preventDefault();
        toggleSpotlight();
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
        if (isOpen($('#spotlight')) || isOpen($('#launchpad')) ||
            isOpen($('#mission-control')) ||
            isOpen($('#control-center')) || isOpen($('#notification-center')) ||
            isOpen($('#context-menu')) || $$('.menubar-item.is-open').length) {
          e.preventDefault();
          closeAllOverlays();
          return;
        }
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

  /* ── Public API ────────────────────────────────────── */

  var MacShell = {
    init: function (options) {
      options = options || {};
      loadAppearancePref();
      applyAppearance(appearancePref, { notify: false });
      wireSystemAppearanceListener();
      renderDock();
      wireEvents();
      updateClock();
      if (clockTimer) clearInterval(clockTimer);
      clockTimer = setInterval(updateClock, 1000);
      // Ensure widget clock starts even if #widget-time was added late
      if ($('#widget-time')) updateClock();
      setActiveApp('Finder');
      // Ensure dock shows all registry dock apps after AppRegistry may load
      if (global.AppRegistry) renderDock();

      if (options.skipBoot) {
        bootDone = true;
        if (options.onReady) options.onReady();
      } else {
        runBoot(options.onReady);
      }
      return this;
    },

    openApp: openApp,
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
