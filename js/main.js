/**
 * macOS 27 - entry point
 * Script order (index.html): icons → window-manager → shell → apps/registry → main
 */
(function () {
  'use strict';

  function start() {
    if (!window.MacShell) {
      console.error('MacShell not loaded');
      return;
    }
    // Re-render dock once AppRegistry is available (loads before main)
    if (window.AppRegistry && typeof MacShell.renderDock === 'function') {
      MacShell.renderDock();
    }
    MacShell.init({
      skipBoot: false,
      onReady: function () {
        if (window.AppRegistry) {
          setTimeout(function () {
            AppRegistry.open('finder');
          }, 600);
          setTimeout(function () {
            if (typeof MacShell.notify === 'function') {
              MacShell.notify(
                'macOS 27',
                'Welcome to Liquid Glass',
                'Desktop widgets are ready. Right-click the desktop to change wallpaper.',
                'now'
              );
            }
          }, 1200);
        }
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
