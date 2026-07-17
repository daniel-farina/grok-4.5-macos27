# grok-4.5-macos27

A web simulation of **macOS 27** (Liquid Glass) built with vanilla HTML, CSS, and JavaScript. Desktop shell, dock, Finder, Safari, Calendar, and many more built-in apps - style and layout only, with generic demo content.

**Live demo:** [https://daniel-farina.github.io/grok-4.5-macos27/](https://daniel-farina.github.io/grok-4.5-macos27/)

## Features

- Boot screen with Apple logo and progress bar
- Menu bar, Dock (fixed tray; icons magnify smoothly), Control Center, Launchpad
- Light / Dark / Auto appearance
- Draggable windows with traffic lights
- **Finder** with Icons, List, Columns, and Gallery views
- Demo apps: Safari, Mail, Messages, Calendar, Notes, Terminal, Photos, Music, TV, System Settings, Calculator, and more (~75 app entries)

## Run locally

```bash
# any static server, e.g.
python3 -m http.server 8765
# open http://localhost:8765
```

Or open `index.html` via a local server (some features need http, not `file://`).

## Stack

- No framework - static SPA
- Liquid Glass via `backdrop-filter`, translucent fills, specular edges
- Icons and wallpapers under `assets/`

## License

Demo / educational UI recreation. Apple, macOS, and related marks are trademarks of Apple Inc. This project is not affiliated with Apple.
EOF