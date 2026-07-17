# grok-4.5-macos27

A web simulation of **macOS 27** (Liquid Glass) built with vanilla HTML, CSS, and JavaScript. Desktop shell, dock, Finder, Safari, and ~75 demo apps with interactive behavior and generic sample content.

**Live demo:** [https://daniel-farina.github.io/grok-4.5-macos27/](https://daniel-farina.github.io/grok-4.5-macos27/)

## Features

### Shell
- Boot screen with Apple logo and staged progress bar
- Menu bar (full File/Edit/View/Go/Window/Help actions)
- Dock with fixed tray, icon magnification, right-click menu
- Control Center, Notification Center, Spotlight, Launchpad
- Mission Control, Stage Manager, desktop widgets
- Light / Dark / Auto appearance
- Lock screen, Force Quit (⌥⌘Esc), ⌘Tab app switcher
- Screenshots (⌘⇧3 / ⌘⇧4) with PNG download
- System sounds (synthesized macOS-style alerts)

### Finder
- Icons / List / Columns / Gallery views
- Folder navigation, Back/Forward, path bar crumbs, search
- Double-click apps and documents to open them

### Apps (highlights)
- **Safari** – navigate / iframe browsing  
- **Messages / Mail** – send messages and compose mail  
- **Photos** – 20 funny gallery images + lightbox  
- **Calendar, Notes, Maps, Music, TV, Books, News**  
- **iPhone Mirroring, Sidecar, Photo Booth, FaceTime**  
- **Terminal, Calculator, Preview, TextEdit, Activity Monitor**  
- **System Settings, App Store, Home, Siri, and more**

Content is **generic demo data only** (no personal names, paths, or SSIDs).

## Run locally

```bash
python3 -m http.server 8765
# open http://localhost:8765
```

Use a local HTTP server (not `file://`) so modules and media load correctly.

## Stack

- No framework – static SPA
- Liquid Glass via `backdrop-filter`, translucent fills, specular edges
- Icons and wallpapers under `assets/`

## License

Demo / educational UI recreation. Apple, macOS, and related marks are trademarks of Apple Inc. This project is not affiliated with Apple.
