/**
 * WindowManager - macOS-style window management
 * Global: window.WindowManager
 *
 * Integrates with liquid-glass.css (.window, traffic lights, resize handles)
 * and AppRegistry (open returns state with .el; focusApp; isOpen).
 */
(function (global) {
  'use strict';

  var nextId = 1;
  var zCounter = 100;
  var windows = Object.create(null);
  var focusedId = null;

  var DEFAULTS = {
    width: 720,
    height: 480,
    minWidth: 320,
    minHeight: 200,
    resizable: true,
    multiWindow: false,
    x: null,
    y: null
  };

  function emit(name, detail) {
    document.dispatchEvent(new CustomEvent(name, { detail: detail, bubbles: true }));
  }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function getContainer() {
    return document.getElementById('desktop') || document.body;
  }

  function menubarHeight() {
    var mb = document.getElementById('menubar');
    return mb ? mb.offsetHeight : 28;
  }

  function stageManagerOffset() {
    var root = document.getElementById('macos') || document.body;
    if (root.classList.contains('stage-manager-on') ||
        document.body.classList.contains('stage-manager-on')) {
      var css = getComputedStyle(document.documentElement)
        .getPropertyValue('--stage-strip-width')
        .trim();
      var n = parseInt(css, 10);
      return isNaN(n) ? 104 : n;
    }
    return 0;
  }

  /**
   * Bounds for window left/top/width/height.
   * Windows live inside #desktop (inset below menubar, above dock), so
   * coordinates are container-relative: top:0 is already under the menubar.
   * Using viewport Y for min top double-counted the menubar and let cascaded
   * windows extend over the dock.
   */
  function desktopBounds() {
    var left = stageManagerOffset();
    var desktop = getContainer();
    if (desktop && desktop.getBoundingClientRect) {
      var r = desktop.getBoundingClientRect();
      var w = Math.max(200, desktop.clientWidth || r.width || window.innerWidth);
      var h = Math.max(200, desktop.clientHeight || r.height || 200);
      /* Extra pad so window chrome clears the floating dock capsule */
      var padBottom = 10;
      var usable = Math.max(180, h - padBottom);
      return {
        left: left,
        top: 0,
        width: Math.max(200, w - left),
        height: h,
        usableHeight: usable,
        viewportLeft: r.left + left,
        viewportTop: r.top,
        viewportRight: r.right,
        viewportBottom: r.bottom - padBottom
      };
    }
    var mb = menubarHeight();
    var dockPad = 96;
    var width = Math.max(200, window.innerWidth - left);
    var usable = Math.max(200, window.innerHeight - mb - dockPad);
    return {
      left: left,
      top: 0,
      width: width,
      height: usable,
      usableHeight: usable,
      viewportLeft: left,
      viewportTop: mb,
      viewportRight: window.innerWidth,
      viewportBottom: window.innerHeight - dockPad
    };
  }

  function cascadeOffset() {
    return (Object.keys(windows).length % 10) * 26;
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function buildWindowEl(state) {
    var el = document.createElement('div');
    el.className = 'window is-opening is-active';
    el.dataset.windowId = state.id;
    el.dataset.app = state.appId;
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', state.title);
    el.style.left = state.x + 'px';
    el.style.top = state.y + 'px';
    el.style.width = state.width + 'px';
    el.style.height = state.height + 'px';
    el.style.zIndex = String(state.zIndex);

    var handles = '';
    if (state.resizable) {
      ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'].forEach(function (d) {
        handles += '<div class="window-resize ' + d + '" data-resize="' + d + '"></div>';
      });
    }

    el.innerHTML =
      '<div class="window-titlebar" data-drag-handle>' +
      '  <div class="traffic-lights">' +
      '    <button type="button" class="traffic-light close" data-window-action="close" aria-label="Close"><span class="traffic-symbol">✕</span></button>' +
      '    <button type="button" class="traffic-light minimize" data-window-action="minimize" aria-label="Minimize"><span class="traffic-symbol">−</span></button>' +
      '    <button type="button" class="traffic-light zoom" data-window-action="zoom" aria-label="Zoom"><span class="traffic-symbol">+</span></button>' +
      '  </div>' +
      '  <div class="window-title">' + escapeHtml(state.title) + '</div>' +
      '</div>' +
      '<div class="window-body">' +
      '  <div class="window-content"></div>' +
      '</div>' +
      handles;

    var content = el.querySelector('.window-content');
    if (typeof state.contentHTML === 'string') {
      content.innerHTML = state.contentHTML;
    } else if (state.contentHTML && state.contentHTML.nodeType) {
      content.appendChild(state.contentHTML);
    }

    return el;
  }

  function applyGeometry(state) {
    if (!state.el || state.maximized) return;
    state.el.style.left = state.x + 'px';
    state.el.style.top = state.y + 'px';
    state.el.style.width = state.width + 'px';
    state.el.style.height = state.height + 'px';
  }

  function wireWindow(state) {
    var el = state.el;
    var titlebar = el.querySelector('[data-drag-handle]') || el.querySelector('.window-titlebar');

    el.querySelectorAll('[data-window-action]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var action = btn.getAttribute('data-window-action');
        if (action === 'close') WindowManager.close(state.id);
        else if (action === 'minimize') WindowManager.minimize(state.id);
        else if (action === 'zoom') WindowManager.maximize(state.id);
      });
    });

    el.addEventListener('mousedown', function () {
      WindowManager.focus(state.id);
    }, true);

    // Drag — delegated so dynamic Finder toolbar re-renders still work
    var dragging = false;
    var sx = 0, sy = 0, ox = 0, oy = 0;

    function isInteractiveDragBlocker(target) {
      if (!target || !target.closest) return false;
      return !!(
        target.closest('.traffic-light') ||
        target.closest('[data-window-action]') ||
        target.closest('button') ||
        target.closest('input') ||
        target.closest('textarea') ||
        target.closest('a') ||
        target.closest('select') ||
        target.closest('[data-resize]') ||
        target.closest('.finder-sb-item') ||
        target.closest('.finder-icon-item') ||
        target.closest('.finder-icon-grid') ||
        target.closest('.app-sidebar-item') ||
        target.closest('.calc-key') ||
        target.closest('#term-input')
      );
    }

    function isDragSurface(target) {
      if (!target || !target.closest) return false;
      // Titlebar (all apps)
      if (target.closest('.window-titlebar') || target.closest('[data-drag-handle]')) return true;
      // Finder / liquid-glass chrome
      if (target.closest('.finder-toolbar') || target.closest('[data-drag-region]')) return true;
      return false;
    }

    function beginDrag(e) {
      if (e.button !== 0) return;
      if (!isDragSurface(e.target)) return;
      if (isInteractiveDragBlocker(e.target)) return;
      if (state.maximized) return;
      dragging = true;
      sx = e.clientX;
      sy = e.clientY;
      ox = state.x;
      oy = state.y;
      el.classList.add('is-dragging');
      e.preventDefault();
    }

    // Capture phase on window root so we always get the event
    el.addEventListener('mousedown', beginDrag, true);

    if (titlebar) {
      titlebar.addEventListener('dblclick', function (e) {
        if (e.target.closest('.traffic-light') || e.target.closest('button')) return;
        WindowManager.maximize(state.id);
      });
    }

    // Double-click Finder toolbar empty area to zoom
    el.addEventListener('dblclick', function (e) {
      if (!e.target.closest('.finder-toolbar')) return;
      if (isInteractiveDragBlocker(e.target)) return;
      WindowManager.maximize(state.id);
    });

    // Resize
    var resizing = false;
    var resizeDir = '';
    var rStart = null;

    el.querySelectorAll('[data-resize]').forEach(function (handle) {
      handle.addEventListener('mousedown', function (e) {
        if (!state.resizable || state.maximized) return;
        resizing = true;
        resizeDir = handle.getAttribute('data-resize');
        rStart = {
          x: e.clientX,
          y: e.clientY,
          left: state.x,
          top: state.y,
          width: state.width,
          height: state.height
        };
        el.classList.add('is-resizing');
        e.preventDefault();
        e.stopPropagation();
      });
    });

    function onMove(e) {
      if (dragging) {
        var bounds = desktopBounds();
        state.x = clamp(ox + (e.clientX - sx), -state.width + 100, bounds.left + bounds.width - 80);
        state.y = clamp(oy + (e.clientY - sy), 0, Math.max(0, bounds.usableHeight - 40));
        applyGeometry(state);
        var edge = 28;
        var vLeft = bounds.viewportLeft != null ? bounds.viewportLeft : bounds.left;
        var vTop = bounds.viewportTop != null ? bounds.viewportTop : 0;
        el.classList.toggle('is-snap-left', e.clientX <= vLeft + edge);
        el.classList.toggle('is-snap-right', e.clientX >= vLeft + bounds.width - edge);
        el.classList.toggle('is-snap-top', e.clientY <= vTop + edge);
      }
      if (resizing && rStart) {
        var dx = e.clientX - rStart.x;
        var dy = e.clientY - rStart.y;
        var left = rStart.left;
        var top = rStart.top;
        var w = rStart.width;
        var h = rStart.height;
        var dir = resizeDir;
        var bounds = desktopBounds();

        if (dir.indexOf('e') !== -1) w = rStart.width + dx;
        if (dir.indexOf('s') !== -1) h = rStart.height + dy;
        if (dir.indexOf('w') !== -1) {
          w = rStart.width - dx;
          left = rStart.left + dx;
        }
        if (dir.indexOf('n') !== -1) {
          h = rStart.height - dy;
          top = rStart.top + dy;
        }

        if (w < state.minWidth) {
          if (dir.indexOf('w') !== -1) left = rStart.left + (rStart.width - state.minWidth);
          w = state.minWidth;
        }
        if (h < state.minHeight) {
          if (dir.indexOf('n') !== -1) top = rStart.top + (rStart.height - state.minHeight);
          h = state.minHeight;
        }
        top = Math.max(0, top);
        if (top + h > bounds.usableHeight) {
          h = Math.max(state.minHeight, bounds.usableHeight - top);
        }

        state.x = left;
        state.y = top;
        state.width = w;
        state.height = h;
        applyGeometry(state);
      }
    }

    function onUp(e) {
      if (dragging) {
        dragging = false;
        el.classList.remove('is-dragging');
        /* Edge snap (half-screen) when released near left/right/bottom edge */
        if (!state.maximized && e) {
          var bounds = desktopBounds();
          var edge = 28;
          var snapped = false;
          var vLeft = bounds.viewportLeft != null ? bounds.viewportLeft : bounds.left;
          var vTop = bounds.viewportTop != null ? bounds.viewportTop : 0;
          if (e.clientX <= vLeft + edge) {
            state.x = bounds.left + 4;
            state.y = 4;
            state.width = Math.floor(bounds.width / 2) - 10;
            state.height = bounds.usableHeight - 8;
            applyGeometry(state);
            snapped = true;
          } else if (e.clientX >= vLeft + bounds.width - edge) {
            state.width = Math.floor(bounds.width / 2) - 10;
            state.x = bounds.left + bounds.width - state.width - 4;
            state.y = 4;
            state.height = bounds.usableHeight - 8;
            applyGeometry(state);
            snapped = true;
          } else if (e.clientY <= vTop + edge) {
            /* top edge → maximize */
            WindowManager.maximize(state.id);
            snapped = true;
          } else if (e.clientY >= window.innerHeight - edge - 20) {
            /* bottom edge → centered full height-ish */
            state.width = Math.min(bounds.width - 48, Math.max(state.width, Math.floor(bounds.width * 0.72)));
            state.height = bounds.usableHeight - 16;
            state.x = bounds.left + Math.floor((bounds.width - state.width) / 2);
            state.y = 8;
            applyGeometry(state);
            snapped = true;
          }
          if (snapped && global.MacSounds && MacSounds.play) {
            try {
              MacSounds.play('tink');
            } catch (err) {}
          }
          el.classList.remove('is-snap-left', 'is-snap-right', 'is-snap-top');
        }
      }
      if (resizing) {
        resizing = false;
        resizeDir = '';
        rStart = null;
        el.classList.remove('is-resizing');
      }
    }

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    state._cleanup = function () {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    // Clear opening animation class
    setTimeout(function () {
      if (state.el) state.el.classList.remove('is-opening');
    }, 280);
  }

  function setFocusStyles() {
    Object.keys(windows).forEach(function (id) {
      var st = windows[id];
      if (!st || !st.el) return;
      if (id === focusedId) {
        st.el.classList.add('is-active');
        st.el.classList.remove('is-inactive');
      } else {
        st.el.classList.remove('is-active');
        st.el.classList.add('is-inactive');
      }
    });
  }

  var WindowManager = {
    /**
     * Open a window. Returns window state { id, el, appId, ... }.
     * If app already open (and not multiWindow), focuses existing and returns it.
     */
    open: function (appId, title, contentHTML, options) {
      options = options || {};
      var multi = options.multiWindow === true;

      if (!multi) {
        var existing = this.getWindowByAppId(appId);
        if (existing) {
          /* Ignore windows mid-close so reopen works immediately */
          if (existing.closing || (existing.el && existing.el.classList.contains('is-closing'))) {
            this.forceRemove(existing.id);
          } else {
            if (existing.minimized) this.restore(existing.id);
            this.focus(existing.id);
            return existing;
          }
        }
      }

      var width = options.width != null ? options.width : DEFAULTS.width;
      var height = options.height != null ? options.height : DEFAULTS.height;
      var minWidth = options.minWidth != null ? options.minWidth : DEFAULTS.minWidth;
      var minHeight = options.minHeight != null ? options.minHeight : DEFAULTS.minHeight;
      var resizable = options.resizable !== false;

      var bounds = desktopBounds();
      /* Keep windows inside usable desktop (above dock) */
      width = Math.min(width, Math.max(minWidth, bounds.width - 24));
      height = Math.min(height, Math.max(minHeight, bounds.usableHeight - 12));
      var offset = cascadeOffset();
      var x = options.x != null
        ? options.x
        : Math.max(bounds.left + 40, Math.floor((bounds.width - width) / 2) + offset);
      var y = options.y != null
        ? options.y
        : Math.max(12, Math.floor((bounds.usableHeight - height) / 3) + offset);
      /* Clamp so bottom edge stays inside #desktop (above dock) */
      if (y + height > bounds.usableHeight) {
        y = Math.max(8, bounds.usableHeight - height);
      }
      if (x + width > bounds.left + bounds.width) {
        x = Math.max(bounds.left + 8, bounds.left + bounds.width - width - 8);
      }

      var id = 'win-' + nextId++;
      var state = {
        id: id,
        appId: appId,
        title: title || appId,
        contentHTML: contentHTML || '',
        width: width,
        height: height,
        minWidth: minWidth,
        minHeight: minHeight,
        resizable: resizable,
        multiWindow: multi,
        x: x,
        y: y,
        zIndex: ++zCounter,
        minimized: false,
        maximized: false,
        restoreBounds: null,
        el: null
      };

      state.el = buildWindowEl(state);
      getContainer().appendChild(state.el);
      windows[id] = state;
      wireWindow(state);
      this.focus(id);

      emit('window:open', { windowId: id, appId: appId, title: state.title, window: state });
      return state;
    },

    /**
     * Immediately drop a window from the registry (and DOM if still present).
     * Used when reopen races the close animation.
     */
    forceRemove: function (windowId) {
      var state = windows[windowId];
      if (!state) return;
      state.closing = true;
      if (state._closeTimer) {
        clearTimeout(state._closeTimer);
        state._closeTimer = null;
      }
      if (state._cleanup) {
        try {
          state._cleanup();
        } catch (e) {}
        state._cleanup = null;
      }
      var el = state.el;
      if (el && el.parentNode) el.parentNode.removeChild(el);
      delete windows[windowId];
      if (focusedId === windowId) {
        focusedId = null;
        var top = this.getTopmostVisible();
        if (top) this.focus(top.id);
        else setFocusStyles();
      }
      emit('window:close', { windowId: windowId, appId: state.appId });
    },

    close: function (windowId) {
      var state = windows[windowId];
      if (!state || state.closing) return;

      state.closing = true;
      var el = state.el;
      var appId = state.appId;
      if (el) {
        el.classList.add('is-closing');
        el.classList.remove('is-opening');
      }

      /* Detach from registry immediately so open(appId) can create a fresh window */
      delete windows[windowId];
      if (focusedId === windowId) {
        focusedId = null;
        var top = this.getTopmostVisible();
        if (top) this.focus(top.id);
        else setFocusStyles();
      }

      var finish = function () {
        if (state._cleanup) {
          try {
            state._cleanup();
          } catch (e) {}
          state._cleanup = null;
        }
        if (el && el.parentNode) el.parentNode.removeChild(el);
        emit('window:close', { windowId: windowId, appId: appId });
      };
      state._closeTimer = setTimeout(finish, 200);
    },

    focus: function (windowId) {
      var state = windows[windowId];
      if (!state) return;
      if (state.minimized) this.restore(windowId);

      state.zIndex = ++zCounter;
      state.el.style.zIndex = String(state.zIndex);
      focusedId = windowId;
      setFocusStyles();
      emit('window:focus', { windowId: windowId, appId: state.appId, window: state });
    },

    /** Focus first window belonging to appId (used by AppRegistry). */
    focusApp: function (appId) {
      var w = this.getWindowByAppId(appId);
      if (w) this.focus(w.id);
      return w;
    },

    minimize: function (windowId) {
      var state = windows[windowId];
      if (!state || state.minimized) return;
      state.minimized = true;
      state.el.classList.add('is-minimized');
      if (focusedId === windowId) {
        focusedId = null;
        var top = this.getTopmostVisible();
        if (top) this.focus(top.id);
        else setFocusStyles();
      }
      emit('window:minimize', { windowId: windowId, appId: state.appId });
    },

    restore: function (windowId) {
      var state = windows[windowId];
      if (!state) return;
      if (state.minimized) {
        state.minimized = false;
        state.el.classList.remove('is-minimized');
      }
    },

    maximize: function (windowId) {
      var state = windows[windowId];
      if (!state) return;
      var bounds = desktopBounds();

      if (state.maximized) {
        state.maximized = false;
        state.el.classList.remove('is-maximized', 'is-fullscreen');
        if (state.restoreBounds) {
          state.x = state.restoreBounds.x;
          state.y = state.restoreBounds.y;
          state.width = state.restoreBounds.width;
          state.height = state.restoreBounds.height;
        }
        // Clear forced inset from CSS
        state.el.style.right = '';
        state.el.style.bottom = '';
        applyGeometry(state);
      } else {
        state.restoreBounds = {
          x: state.x,
          y: state.y,
          width: state.width,
          height: state.height
        };
        state.maximized = true;
        state.el.classList.add('is-maximized');
        state.x = bounds.left;
        state.y = 0;
        state.width = bounds.width;
        state.height = bounds.usableHeight;
        state.el.style.left = state.x + 'px';
        state.el.style.top = state.y + 'px';
        state.el.style.width = state.width + 'px';
        state.el.style.height = state.height + 'px';
      }
      this.focus(windowId);
      emit('window:maximize', {
        windowId: windowId,
        appId: state.appId,
        maximized: state.maximized
      });
    },

    toggleFullscreen: function (windowId) {
      this.maximize(windowId);
    },

    setTitle: function (windowId, title) {
      var state = windows[windowId];
      if (!state) return;
      state.title = title;
      var t = state.el.querySelector('.window-title');
      if (t) t.textContent = title;
    },

    setContent: function (windowId, html) {
      var state = windows[windowId];
      if (!state) return;
      var content = state.el.querySelector('.window-content');
      if (!content) return;
      if (typeof html === 'string') content.innerHTML = html;
      else if (html && html.nodeType) {
        content.innerHTML = '';
        content.appendChild(html);
      }
    },

    getWindows: function () { return this.getOpenWindows(); },
    getOpenWindows: function () {
      return Object.keys(windows).map(function (id) {
        var s = windows[id];
        return {
          id: s.id,
          appId: s.appId,
          title: s.title,
          minimized: s.minimized,
          maximized: s.maximized,
          zIndex: s.zIndex,
          focused: s.id === focusedId,
          el: s.el
        };
      });
    },

    isOpen: function (appId) {
      return !!this.getWindowByAppId(appId);
    },

    getWindowByAppId: function (appId) {
      var ids = Object.keys(windows);
      for (var i = 0; i < ids.length; i++) {
        var s = windows[ids[i]];
        if (!s || s.closing) continue;
        if (s.appId === appId) return s;
      }
      return null;
    },

    get: function (windowId) {
      return windows[windowId] || null;
    },

    getFocused: function () {
      return focusedId ? windows[focusedId] : null;
    },

    getTopmost: function () {
      var top = null;
      Object.keys(windows).forEach(function (id) {
        var s = windows[id];
        if (!top || s.zIndex > top.zIndex) top = s;
      });
      return top;
    },

    getTopmostVisible: function () {
      var top = null;
      Object.keys(windows).forEach(function (id) {
        var s = windows[id];
        if (!s || s.closing || s.minimized) return;
        if (!top || s.zIndex > top.zIndex) top = s;
      });
      return top;
    },

    closeApp: function (appId) {
      Object.keys(windows)
        .slice()
        .forEach(function (id) {
          if (windows[id] && windows[id].appId === appId) WindowManager.close(id);
        });
    },

    closeFocused: function () {
      if (focusedId) this.close(focusedId);
    },

    minimizeFocused: function () {
      if (focusedId) this.minimize(focusedId);
    }
  };

  global.WindowManager = WindowManager;
})(typeof window !== 'undefined' ? window : this);
