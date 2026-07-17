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
                'Press ⌘/ for keyboard shortcuts. Right-click the desktop to change wallpaper.',
                'now',
                { force: true }
              );
            }
          }, 1200);
          setTimeout(function () {
            if (typeof MacShell.notify === 'function') {
              MacShell.notify(
                'Tips',
                'Try Continuity',
                'Open iPhone Mirroring or Sidecar from Spotlight (⌘Space).',
                'now',
                { force: true }
              );
            }
          }, 2800);
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
