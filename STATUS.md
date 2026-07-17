# macOS 27 Virtual Desktop — Status

**Result: PASS** (`node scripts/audit-apps.js` — 32 checks)

## App count

**75** official apps registered in `js/apps/registry.js` via `AppRegistry`.

See [APPS.md](./APPS.md) for the full id / name / category table.

## Live demo

https://daniel-farina.github.io/grok-4.5-macos27/

## Features (interactive)

### Shell
- Liquid Glass menu bar, dock (fixed tray + hover mag), Launchpad (keyboard nav)
- Mission Control (arrow/Enter), Stage Manager (persist + strip), hot corners (4)
- Spotlight: apps, recents, system commands, calculator
- Control Center: Wi‑Fi/BT/AirDrop/Focus, media, mirroring→Sidecar, brightness/volume
- Notification Center: dismiss, click-to-open app
- Boot (skippable), Sleep/wake, Lock (swipe up), Restart/Shut Down dialogs
- Force Quit, ⌘Tab switcher HUD, screenshots (⌘⇧3/4), keyboard cheat sheet (⌘/)

### Core apps
- Finder: 4 views, search, crumbs, history, New Folder, Empty Trash, Funny folder
- Safari multi-tab + iframe navigate; Mail compose; Messages send/reply
- Photos (20 funny images, favorites, search); Calendar events; Notes; Maps
- Music play; Podcasts; TV; Books; Stocks tick; Weather cities
- Terminal (say/afplay…); Calculator keyboard; TextEdit save/word count
- Reminders add; Freeform tools; Contacts inline add; Dictionary chips

### Continuity & devices
- iPhone Mirroring full app suite; Sidecar sketch (pen/colors/undo)
- FaceTime, Photo Booth, Image Capture, Image Playground

### System utilities
- System Settings (sound alerts, Focus, dock mag, wallpaper)
- Activity Monitor Force Quit; Disk Utility First Aid; Console filter
- Wallpaper app; Time Machine; Find My; Passwords; Keychain; and bulk list apps

### Desktop
- Draggable icons, widgets (weather/music/calendar/clock), edge-snap windows
- Dock minimize/restore; system sound aliases (Blow, Glass, Sosumi…)

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

See `docs/LOOP_PRACTICE.md` for multi-minute Grok 4.5 loop practice.
