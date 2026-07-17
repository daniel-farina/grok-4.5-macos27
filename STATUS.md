# macOS 27 Virtual Desktop — Status

**Result: PASS** (`node scripts/audit-apps.js` — 32 checks)

## App count

**75** official apps registered in `js/apps/registry.js` via `AppRegistry`.

See [APPS.md](./APPS.md) for the full id / name / category table.

## Live demo

https://daniel-farina.github.io/grok-4.5-macos27/

## Features (interactive)

- Liquid Glass shell: menu bar, dock (fixed tray + magnification), Launchpad, Mission Control, Stage Manager, Spotlight, Control Center, Notification Center
- Boot progress bar, lock screen, Force Quit (⌥⌘Esc), ⌘Tab switcher, screenshots (⌘⇧3/4)
- Finder: 4 views, search, path crumbs, folder history, empty trash
- Safari, Mail, Messages, Photos (20 funny images), Calendar, Notes, Maps, Music mini-player
- iPhone Mirroring, Sidecar, Photo Booth, FaceTime, and remaining utilities
- Desktop icons (draggable), widgets, system sounds, online/offline Wi‑Fi
- Appearance light / dark / auto; wallpaper picker

## How to open

```bash
python3 -m http.server 8765
# http://localhost:8765
```

## QA

```bash
node scripts/audit-apps.js
```

Generic demo content only — no personal data.
