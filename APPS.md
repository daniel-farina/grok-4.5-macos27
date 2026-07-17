# Official macOS Apps (macOS 27 simulation)

Source of truth: `js/apps/registry.js` via `AppRegistry`.
Icons: `js/icons.js` (`MacIcons[id]`).

Total: **75** apps

| id | name | category |
|----|------|----------|
| activity-monitor | Activity Monitor | Utilities |
| airport-utility | AirPort Utility | Utilities |
| appstore | App Store | System |
| audio-midi-setup | Audio MIDI Setup | Utilities |
| automator | Automator | Utilities |
| bluetooth-file-exchange | Bluetooth File Exchange | Utilities |
| books | Books | Entertainment |
| boot-camp | Boot Camp Assistant | Utilities |
| calculator | Calculator | Utilities |
| calendar | Calendar | Productivity |
| chess | Chess | Entertainment |
| clock | Clock | Utilities |
| colorsync | ColorSync Utility | Utilities |
| console | Console | Utilities |
| contacts | Contacts | Productivity |
| dictionary | Dictionary | Utilities |
| digital-color-meter | Digital Color Meter | Utilities |
| directory-utility | Directory Utility | Utilities |
| disk-utility | Disk Utility | Utilities |
| dvd-player | DVD Player | Entertainment |
| facetime | FaceTime | Internet |
| find-my | Find My | System |
| finder | Finder | System |
| font-book | Font Book | Utilities |
| freeform | Freeform | Productivity |
| games | Apple Games | Entertainment |
| garageband | GarageBand | Creativity |
| grapher | Grapher | Utilities |
| home | Home | Productivity |
| image-capture | Image Capture | Utilities |
| image-playground | Image Playground | Creativity |
| imovie | iMovie | Creativity |
| iphone-mirroring | iPhone Mirroring | System |
| journal | Journal | Productivity |
| keychain-access | Keychain Access | Utilities |
| keynote | Keynote | Productivity |
| launchpad | Launchpad | System |
| magnifier | Magnifier | Utilities |
| mail | Mail | Internet |
| maps | Maps | Travel |
| messages | Messages | Internet |
| migration-assistant | Migration Assistant | Utilities |
| music | Music | Entertainment |
| news | News | Entertainment |
| notes | Notes | Productivity |
| numbers | Numbers | Productivity |
| pages | Pages | Productivity |
| passwords | Passwords | System |
| phone | Phone | Internet |
| photo-booth | Photo Booth | Entertainment |
| photos | Photos | Creativity |
| podcasts | Podcasts | Entertainment |
| preview | Preview | Utilities |
| print-center | Print Center | Utilities |
| quicktime | QuickTime Player | Entertainment |
| reminders | Reminders | Productivity |
| safari | Safari | Internet |
| screenshot | Screenshot | Utilities |
| script-editor | Script Editor | Utilities |
| shortcuts | Shortcuts | Utilities |
| siri | Siri | System |
| stickies | Stickies | Productivity |
| stocks | Stocks | Utilities |
| system-information | System Information | Utilities |
| system-settings | System Settings | System |
| terminal | Terminal | Utilities |
| textedit | TextEdit | Utilities |
| time-machine | Time Machine | System |
| tips | Tips | System |
| trash | Trash | System |
| tv | TV | Entertainment |
| voice-memos | Voice Memos | Entertainment |
| voiceover-utility | VoiceOver Utility | Utilities |
| wallpaper | Wallpaper | System |
| weather | Weather | Utilities |

## Dock order

`finder`, `launchpad`, `safari`, `mail`, `messages`, `maps`, `photos`, `facetime`, `calendar`, `notes`, `reminders`, `music`, `tv`, `appstore`, `system-settings`, `trash`

## Notes

- `launchpad.open()` returns `null` on purpose (opens shell Launchpad overlay).
- All other apps return HTML content for `WindowManager`.
- Icon aliases: `app-store` → `appstore`, `apple-games` → `games`, `quicktime-player` → `quicktime`, `colorsync-utility` → `colorsync`, `system-preferences` → `system-settings`.
