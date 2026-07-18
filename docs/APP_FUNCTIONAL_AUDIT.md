# Full app functional audit (macOS 27 web)

Use this list to verify every surface. Status as of the desktop/calendar/dock pass.

## Desktop icons (click / Enter to open)
| Item | Expected | Status |
|------|----------|--------|
| Macintosh HD | Finder → Locations → Macintosh HD | fixed (nav=drive, retry) |
| Applications | Finder → Applications | fixed |
| Documents | Finder → Documents | fixed |
| Downloads | Finder → Downloads | fixed |
| Safari / Photos / Messages / Notes / Calendar / Music | Open app | fixed (single-click open) |
| Trash | Finder → Trash | fixed |

## Dock (pixel-aligned SVG icons, no layout shift on mag)
finder · launchpad · safari · mail · messages · maps · photos · facetime · calendar · notes · reminders · music · tv · appstore · system-settings · trash

## Calendar views
| View | Behavior |
|------|----------|
| Day | Hourly list 8 AM–8 PM, events, dblclick add |
| Week | 7-day × hours grid |
| Month | Classic grid + events |
| Year | 12 mini-months; click → Month |
| Today / ‹ › | Navigates in current view |

## Shell / system
- [x] Menu bar clock, Control Center, Notification Center
- [x] Spotlight, Launchpad, Mission Control, Stage Manager
- [x] Sleep / Lock / Restart / Shut Down
- [x] Hot corners, screenshots, Force Quit, ⌘Tab

## Apps (core interactivity expected)
| App | Key actions |
|-----|-------------|
| Finder | Views, sidebar, New Folder, Get Info, Duplicate, Empty Trash |
| Safari | Tabs, navigate, bookmarks, back/forward |
| Mail | Select, search, flag, archive, trash, compose, mark unread |
| Messages | Send, typing reply, search, compose |
| Maps | Search, drop pin, directions, modes |
| Photos | Gallery, favorites, slideshow, search |
| FaceTime | Call timer, mute, camera, create link |
| Calendar | Day/Week/Month/Year, add/delete events |
| Notes | Folders, search, edit, share, checklist |
| Reminders | Lists, add, clear completed |
| Contacts | Search, groups, add, delete, actions |
| Music | Play, seek, shuffle/repeat |
| Podcasts | Play, seek, search |
| TV | Play progress, My List |
| Books | Open book, page keys, progress |
| Stocks | Select, range, add symbol, live tick |
| Weather | City cycle |
| News | Articles, save/share |
| App Store | GET→OPEN, search, hero |
| System Settings | Panes, sound alerts, dock, wallpaper |
| Calculator | Keys + memory |
| Clock | World/Alarms/Stopwatch/Timer, add alarm |
| Terminal | Shell commands |
| TextEdit | Edit, save/open |
| Freeform | Tools, export |
| Preview | Zoom, markup, export |
| iPhone Mirroring | Full mini-app suite |
| Sidecar | Draw, tools, save sketch |
| … + utilities | First Aid, Console export, Passwords, Chess, GB, etc. |

## Known stretch (demo-depth, not broken)
- Multiplayer/real network services are simulated
- Calendar ICS / real mail servers not connected
- Some bulk utilities use list + primary action pattern

## How to re-check
1. Open http://localhost:8765
2. Click every desktop icon once
3. Open Calendar → Day / Week / Month / Year
4. Hover dock: tray must not resize; icons stay crisp
5. `node scripts/audit-apps.js` → ALL PASS
