/**
 * Full QA for virtual macOS 27
 * Usage: node scripts/audit-apps.js
 *
 * Checks: syntax of all JS, AppRegistry count, open() HTML,
 * MacShell API, CSS files, index.html load order, wallpaper, dock icons.
 * Rewrites APPS.md from live registry.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
let failed = 0;
let passed = 0;

function pass(msg) {
  passed++;
  console.log('PASS', msg);
}
function fail(msg) {
  failed++;
  console.error('FAIL', msg);
  process.exitCode = 1;
}

const JS_FILES = [
  'js/icons.js',
  'js/window-manager.js',
  'js/sounds.js',
  'js/shell.js',
  'js/apps/registry.js',
  'js/macos-runtime.js',
  'js/main.js',
];

const CSS_FILES = [
  'css/liquid-glass.css',
  'css/apps.css',
  'css/tahoe-match.css',
  'css/theme.css',
  'css/finder-27.css', // Finder Liquid Glass shell (optional but present)
];

// Minimum required set from QA checklist
const CSS_REQUIRED = [
  'css/liquid-glass.css',
  'css/apps.css',
  'css/tahoe-match.css',
  'css/theme.css',
];

const DOCK_ORDER = [
  'finder',
  'launchpad',
  'safari',
  'mail',
  'messages',
  'maps',
  'photos',
  'facetime',
  'calendar',
  'notes',
  'reminders',
  'music',
  'tv',
  'appstore',
  'system-settings',
  'trash',
];

const MACSHELL_METHODS = [
  'setAppearance',
  'openMissionControl',
  'cycleWallpaper',
  'openLaunchpad',
  'init',
];

// ─── 1. Syntax-check all JS ───────────────────────────────────────
console.log('\n=== 1. Syntax check ===');
for (const rel of JS_FILES) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) {
    fail('missing file: ' + rel);
    continue;
  }
  const src = fs.readFileSync(full, 'utf8');
  try {
    new Function(src);
    pass('syntax: ' + rel);
  } catch (e) {
    fail('syntax: ' + rel + ' — ' + e.message);
  }
}

// ─── 2–3. Runtime-load registry via vm ────────────────────────────
console.log('\n=== 2–3. Registry runtime (vm) ===');
const sandbox = {
  console,
  window: null,
  globalThis: null,
  document: {
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement: () => ({
      style: {},
      classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
      setAttribute() {},
      appendChild() {},
      addEventListener() {},
      textContent: '',
      innerHTML: '',
    }),
    createTextNode: () => ({}),
    addEventListener() {},
    dispatchEvent() {},
    body: { appendChild() {} },
    documentElement: { setAttribute() {}, getAttribute() { return null; } },
  },
  localStorage: {
    getItem: () => null,
    setItem() {},
    removeItem() {},
  },
  matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }),
  CustomEvent: function CustomEvent() {},
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
sandbox.global = sandbox;

const context = vm.createContext(sandbox);

try {
  vm.runInContext(fs.readFileSync(path.join(root, 'js/icons.js'), 'utf8'), context, {
    filename: 'icons.js',
  });
  pass('vm load icons.js');
} catch (e) {
  fail('vm load icons.js: ' + e.message);
}

try {
  vm.runInContext(fs.readFileSync(path.join(root, 'js/apps/registry.js'), 'utf8'), context, {
    filename: 'registry.js',
  });
  pass('vm load registry.js');
} catch (e) {
  fail('vm load registry.js: ' + e.message);
}

const AppRegistry = sandbox.AppRegistry;
const MacIcons = sandbox.MacIcons;

if (!AppRegistry || typeof AppRegistry.all !== 'function') {
  fail('AppRegistry.all missing after load');
} else {
  const apps = AppRegistry.all();
  if (apps.length === 75) {
    pass('AppRegistry.all().length === 75 (got ' + apps.length + ')');
  } else {
    fail('AppRegistry.all().length expected 75, got ' + apps.length);
  }

  const nullOpen = [];
  const emptyOpen = [];
  const threw = [];
  const noIcon = [];

  for (const app of apps) {
    let content;
    try {
      content = app.open();
    } catch (e) {
      threw.push(app.id + ': ' + e.message);
      continue;
    }
    if (content == null) {
      if (app.id !== 'launchpad') nullOpen.push(app.id);
    } else if (typeof content !== 'string' || !content.trim()) {
      emptyOpen.push(app.id);
    }
    if (!MacIcons || !MacIcons[app.id]) {
      noIcon.push(app.id);
    }
  }

  if (!threw.length) pass('all open() calls completed without throw');
  else fail('open() threw: ' + threw.join('; '));

  if (!nullOpen.length) pass('null open only allowed for launchpad');
  else fail('null open (non-launchpad): ' + nullOpen.join(', '));

  if (!emptyOpen.length) pass('all non-null open() return non-empty HTML strings');
  else fail('empty open: ' + emptyOpen.join(', '));

  // Dock icons required
  const dockMissingIcons = DOCK_ORDER.filter((id) => !MacIcons || !MacIcons[id]);
  if (!dockMissingIcons.length) pass('all dock apps have MacIcons keys');
  else fail('dock apps missing icons: ' + dockMissingIcons.join(', '));

  if (!noIcon.length) pass('all 75 apps have MacIcons keys');
  else fail('missing MacIcons: ' + noIcon.join(', '));

  // ─── Rewrite APPS.md ──────────────────────────────────────────
  const sorted = apps.slice().sort((a, b) => a.id.localeCompare(b.id));
  const lines = [
    '# Official macOS Apps (macOS 27 simulation)',
    '',
    'Source of truth: `js/apps/registry.js` via `AppRegistry`.',
    'Icons: `js/icons.js` (`MacIcons[id]`).',
    '',
    `Total: **${apps.length}** apps`,
    '',
    '| id | name | category |',
    '|----|------|----------|',
    ...sorted.map((a) => `| ${a.id} | ${a.name} | ${a.category || ''} |`),
    '',
    '## Dock order',
    '',
    '`' + DOCK_ORDER.join('`, `') + '`',
    '',
    '## Notes',
    '',
    '- `launchpad.open()` returns `null` on purpose (opens shell Launchpad overlay).',
    '- All other apps return HTML content for `WindowManager`.',
    '- Icon aliases: `app-store` → `appstore`, `apple-games` → `games`, `quicktime-player` → `quicktime`, `colorsync-utility` → `colorsync`, `system-preferences` → `system-settings`.',
    '',
  ];
  fs.writeFileSync(path.join(root, 'APPS.md'), lines.join('\n'));
  pass('wrote APPS.md from live registry');
}

// ─── 4. MacShell API (static parse of shell.js export) ────────────
console.log('\n=== 4. MacShell API ===');
const shellSrc = fs.readFileSync(path.join(root, 'js/shell.js'), 'utf8');
// Load shell in vm with stubs (document already stubbed)
try {
  vm.runInContext(fs.readFileSync(path.join(root, 'js/window-manager.js'), 'utf8'), context, {
    filename: 'window-manager.js',
  });
  vm.runInContext(shellSrc, context, { filename: 'shell.js' });
  pass('vm load shell.js + window-manager.js');
} catch (e) {
  fail('vm load shell: ' + e.message);
}

const MacShell = sandbox.MacShell;
if (!MacShell) {
  fail('MacShell not defined');
} else {
  for (const m of MACSHELL_METHODS) {
    if (typeof MacShell[m] === 'function') pass('MacShell.' + m);
    else fail('MacShell.' + m + ' missing or not a function');
  }
}

// ─── 5. CSS files ─────────────────────────────────────────────────
console.log('\n=== 5. CSS files ===');
for (const rel of CSS_FILES) {
  const full = path.join(root, rel);
  if (fs.existsSync(full) && fs.statSync(full).size > 0) pass('exists: ' + rel);
  else fail('missing/empty: ' + rel);
}

// ─── 6. index.html load order ─────────────────────────────────────
console.log('\n=== 6. index.html ===');
const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const stripQ = (s) => s.replace(/\?v=\d+$/, '');
const cssHrefs = [...indexHtml.matchAll(/href="(css\/[^"]+)"/g)].map((m) => stripQ(m[1]));
const missingRequired = CSS_REQUIRED.filter((c) => !cssHrefs.includes(c));
if (!missingRequired.length) {
  pass('required CSS linked: ' + CSS_REQUIRED.join(', '));
} else {
  fail('missing required CSS links: ' + missingRequired.join(', '));
}
// Required four must appear first in order
const firstFour = cssHrefs.slice(0, 4);
if (JSON.stringify(firstFour) === JSON.stringify(CSS_REQUIRED)) {
  pass('CSS load order (first 4): ' + firstFour.join(' → '));
} else {
  fail('first 4 CSS order got ' + firstFour.join(', ') + ' expected ' + CSS_REQUIRED.join(', '));
}
if (cssHrefs.includes('css/finder-27.css')) {
  pass('finder-27.css also linked');
}

const scriptSrcs = [...indexHtml.matchAll(/src="(js\/[^"]+)"/g)].map((m) => stripQ(m[1]));
const expectedScripts = [
  'js/icons.js',
  'js/window-manager.js',
  'js/sounds.js',
  'js/shell.js',
  'js/apps/registry.js',
  'js/macos-runtime.js',
  'js/main.js',
];
if (JSON.stringify(scriptSrcs) === JSON.stringify(expectedScripts)) {
  pass('script load order: ' + scriptSrcs.join(' → '));
} else {
  fail('script order got ' + scriptSrcs.join(', ') + ' expected ' + expectedScripts.join(', '));
}

// ─── 7. Wallpaper ─────────────────────────────────────────────────
console.log('\n=== 7. Wallpaper asset ===');
const wallpaper = path.join(root, 'assets/wallpaper.jpg');
if (fs.existsSync(wallpaper) && fs.statSync(wallpaper).size > 0) {
  pass('assets/wallpaper.jpg exists (' + fs.statSync(wallpaper).size + ' bytes)');
} else {
  fail('assets/wallpaper.jpg missing or empty');
}

// ─── Summary ──────────────────────────────────────────────────────
console.log('\n=== SUMMARY ===');
console.log('Passed:', passed);
console.log('Failed:', failed);
if (failed === 0) console.log('RESULT: ALL PASS');
else console.log('RESULT: FAIL');
