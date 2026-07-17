# macOS 27 Virtual Desktop — Status

**Result: PASS** (`node scripts/audit-apps.js` — 32 checks)

## App count

**75** official apps registered in `js/apps/registry.js` via `AppRegistry`.

See [APPS.md](./APPS.md) for the full id / name / category table.

## Live demo

https://daniel-farina.github.io/grok-4.5-macos27/

## Loop job note

Functional-fidelity job `019f71def611` (every 2m, ~3h from 2026-07-17T20:55:45Z) used **commit-as-you-go** public updates to demonstrate multi-minute Grok 4.5 loops (see `docs/LOOP_PRACTICE.md`).

## Features (interactive)

### Shell
- Liquid Glass menu bar, dock (fixed tray + hover mag), Launchpad (keyboard nav)
- Mission Control (arrow/Enter), Stage Manager (persist + strip), hot corners (4)
- Spotlight: apps, recents, system commands, calculator, Continuity apps
- Control Center: Wi‑Fi/BT/AirDrop/Focus, media, mirroring→Sidecar, brightness/volume
- Notification Center: dismiss, click-to-open app; Continuity handoff pill
- Boot (skippable), Sleep/wake, Lock (swipe up), Restart/Shut Down dialogs
- Force Quit, ⌘Tab switcher HUD, screenshots (⌘⇧3/4), keyboard cheat sheet (⌘/)

### Core apps
- Finder: 4 views, search, crumbs, history, New Folder, Duplicate, Get Info, Empty Trash
- Safari multi-tab + bookmarks + iframe navigate; Mail search/flag/folders/compose
- Messages search/compose/send; Photos (20 funny images, favorites, albums)
- Calendar events + delete; Notes folders/search/share; Maps drop-pin + directions
- Music shuffle/seek; Podcasts transport; TV progress; Books progress; Stocks
- Terminal deep shell; Calculator memory; TextEdit save/open; Reminders clear done
- Freeform export; Contacts search/groups; Dictionary Continuity terms

### Continuity & devices
- iPhone Mirroring: Phone, Messages, Camera, Photos, Safari, Music, Maps, Mail,
  Settings, Clock, Weather, Notes, FaceTime, CC, Calculator, Calendar, Reminders,
  Sounds, Wallet, Health, App Store, Files
- Sidecar sketch (tools, colors, undo, save PNG, shift = thicker stroke)
- FaceTime timer/mute/camera/link; Photo Booth; Image Capture; Image Playground

### System utilities
- System Settings (sound alerts, Focus, dock mag, wallpaper)
- Activity Monitor Force Quit; Disk Utility First Aid/mount/info; Console export
- Passwords generate; Chess AI/flip; GarageBand piano/metro; Time Machine files
- Print Center; Font Book add/remove; Shortcuts create; and bulk utility apps
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
