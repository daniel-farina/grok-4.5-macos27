/**
 * MacIcons - Apple-style app icon SVGs for virtual macOS 27
 * Each icon: 64x64 viewBox, rounded-rect gradient background, simple glyph.
 */
(function (global) {
  'use strict';

  function esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /**
   * Build a 64x64 app icon SVG string.
   * @param {string} id - unique gradient id suffix
   * @param {string[]} colors - gradient color stops (top → bottom)
   * @param {string} glyph - inner SVG markup (white symbol, centered in 64x64)
   * @param {object} [opts]
   * @param {number} [opts.rx=14] - corner radius
   * @param {string} [opts.dir='v'] - 'v' vertical or 'd' diagonal gradient
   */
  function makeIcon(id, colors, glyph, opts) {
    opts = opts || {};
    var rx = opts.rx != null ? opts.rx : 14;
    var gid = 'g-' + id;
    var stops = colors.map(function (c, i) {
      var off = colors.length === 1 ? 0 : (i / (colors.length - 1)) * 100;
      return '<stop offset="' + off + '%" stop-color="' + c + '"/>';
    }).join('');
    var grad;
    if (opts.dir === 'd') {
      grad = '<linearGradient id="' + gid + '" x1="0%" y1="0%" x2="100%" y2="100%">' + stops + '</linearGradient>';
    } else if (opts.dir === 'h') {
      grad = '<linearGradient id="' + gid + '" x1="0%" y1="0%" x2="100%" y2="0%">' + stops + '</linearGradient>';
    } else {
      grad = '<linearGradient id="' + gid + '" x1="0%" y1="0%" x2="0%" y2="100%">' + stops + '</linearGradient>';
    }
    /* Squircle + specular edge like macOS Tahoe Liquid Glass icons */
    return (
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="100%" height="100%" style="display:block">' +
      '<defs>' + grad +
      '<linearGradient id="' + gid + '-shine" x1="0%" y1="0%" x2="0%" y2="100%">' +
      '<stop offset="0%" stop-color="#fff" stop-opacity="0.38"/>' +
      '<stop offset="42%" stop-color="#fff" stop-opacity="0"/>' +
      '<stop offset="100%" stop-color="#000" stop-opacity="0.12"/>' +
      '</linearGradient>' +
      '<clipPath id="' + gid + '-clip"><rect x="0" y="0" width="64" height="64" rx="' + rx + '" ry="' + rx + '"/></clipPath>' +
      '</defs>' +
      '<g clip-path="url(#' + gid + '-clip)">' +
      '<rect x="0" y="0" width="64" height="64" rx="' + rx + '" ry="' + rx + '" fill="url(#' + gid + ')"/>' +
      glyph +
      '<rect x="0" y="0" width="64" height="64" rx="' + rx + '" ry="' + rx + '" fill="url(#' + gid + '-shine)" pointer-events="none"/>' +
      '<rect x="0.5" y="0.5" width="63" height="63" rx="' + (rx - 0.5) + '" ry="' + (rx - 0.5) + '" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="1"/>' +
      '</g>' +
      '</svg>'
    );
  }

  /* Shared glyph helpers (paths/shapes, white by default) */
  var W = 'fill="#fff"';
  var WS = 'stroke="#fff" fill="none"';

  var MacIcons = {
    // ── Core ──────────────────────────────────────────────
    finder: makeIcon('finder', ['#1a8cff', '#0a5fd4'],
      '<path ' + W + ' d="M18 38c0-8 6-14 14-14s14 6 14 14v2c0 1.1-.9 2-2 2H20c-1.1 0-2-.9-2-2v-2z"/>' +
      '<circle ' + W + ' cx="26" cy="28" r="3.5"/><circle ' + W + ' cx="38" cy="28" r="3.5"/>' +
      '<ellipse ' + W + ' cx="32" cy="20" rx="10" ry="8" opacity="0.95"/>' +
      '<path fill="none" stroke="#0a5fd4" stroke-width="1.5" d="M26 20c1.5 2 4 3 6 3s4.5-1 6-3" opacity="0.5"/>'
    ),

    safari: makeIcon('safari', ['#2aa4f4', '#1478d4'],
      '<circle cx="32" cy="32" r="18" fill="none" stroke="#fff" stroke-width="2.5"/>' +
      '<path ' + W + ' d="M32 16l4 14-4 2-4-2 4-14z" opacity="0.95"/>' +
      '<path ' + W + ' d="M32 48l-4-14 4-2 4 2-4 14z" opacity="0.55"/>' +
      '<circle ' + W + ' cx="32" cy="32" r="2.5"/>'
    ),

    mail: makeIcon('mail', ['#3d8bfd', '#1a5fd4'],
      '<rect x="12" y="18" width="40" height="28" rx="3" ' + W + ' opacity="0.95"/>' +
      '<path fill="none" stroke="#1a5fd4" stroke-width="2.2" stroke-linejoin="round" d="M12 20l20 14 20-14"/>'
    ),

    messages: makeIcon('messages', ['#34c759', '#28a745'],
      '<path ' + W + ' d="M14 18c0-2.2 1.8-4 4-4h28c2.2 0 4 1.8 4 4v18c0 2.2-1.8 4-4 4H28l-8 8v-8h-2c-2.2 0-4-1.8-4-4V18z"/>'
    ),

    maps: makeIcon('maps', ['#64d2ff', '#30d158'],
      '<path ' + W + ' d="M14 16l12 4 12-4 12 4v32l-12-4-12 4-12-4V16z" opacity="0.95"/>' +
      '<path fill="none" stroke="#0a84ff" stroke-width="2" d="M26 20v32M38 16v32"/>' +
      '<circle cx="32" cy="30" r="4" fill="#ff3b30"/>'
    , { dir: 'd' }),

    photos: makeIcon('photos', ['#ff2d55', '#af52de', '#5856d6', '#007aff', '#34c759', '#ffcc00'],
      '<g transform="translate(32,32)">' +
      '<ellipse rx="7" ry="16" ' + W + ' opacity="0.9" transform="rotate(0)"/><ellipse rx="7" ry="16" ' + W + ' opacity="0.85" transform="rotate(60)"/>' +
      '<ellipse rx="7" ry="16" ' + W + ' opacity="0.8" transform="rotate(120)"/></g>'
    , { dir: 'd' }),

    facetime: makeIcon('facetime', ['#30d158', '#28a745'],
      '<rect x="12" y="20" width="28" height="24" rx="5" ' + W + '/>' +
      '<path ' + W + ' d="M42 26l10-6v24l-10-6V26z"/>'
    ),

    calendar: makeIcon('calendar', ['#ff3b30', '#ff3b30'],
      '<rect x="12" y="16" width="40" height="36" rx="4" ' + W + '/>' +
      '<rect x="12" y="16" width="40" height="10" rx="4" fill="#ff3b30"/>' +
      '<rect x="12" y="22" width="40" height="4" fill="#ff3b30"/>' +
      '<text x="32" y="46" text-anchor="middle" font-family="-apple-system,system-ui,sans-serif" font-size="20" font-weight="600" fill="#ff3b30">17</text>'
    ),

    contacts: makeIcon('contacts', ['#8e8e93', '#636366'],
      '<rect x="16" y="12" width="32" height="40" rx="3" ' + W + ' opacity="0.95"/>' +
      '<circle cx="32" cy="26" r="7" fill="#8e8e93"/>' +
      '<ellipse cx="32" cy="44" rx="11" ry="7" fill="#8e8e93"/>'
    ),

    reminders: makeIcon('reminders', ['#0a84ff', '#5e5ce6', '#ff9f0a', '#30d158'],
      '<circle cx="18" cy="20" r="4" fill="#fff"/><rect x="28" y="17" width="22" height="6" rx="2" ' + W + ' opacity="0.9"/>' +
      '<circle cx="18" cy="32" r="4" fill="#fff"/><rect x="28" y="29" width="22" height="6" rx="2" ' + W + ' opacity="0.9"/>' +
      '<circle cx="18" cy="44" r="4" fill="#fff"/><rect x="28" y="41" width="22" height="6" rx="2" ' + W + ' opacity="0.9"/>'
    , { dir: 'v' }),

    notes: makeIcon('notes', ['#ffd60a', '#ffcc00'],
      '<rect x="14" y="10" width="36" height="44" rx="3" ' + W + '/>' +
      '<rect x="14" y="10" width="36" height="10" fill="#ff9f0a" opacity="0.9"/>' +
      '<rect x="20" y="28" width="24" height="2.5" rx="1" fill="#c7a000" opacity="0.5"/>' +
      '<rect x="20" y="35" width="20" height="2.5" rx="1" fill="#c7a000" opacity="0.5"/>' +
      '<rect x="20" y="42" width="16" height="2.5" rx="1" fill="#c7a000" opacity="0.5"/>'
    ),

    freeform: makeIcon('freeform', ['#0a84ff', '#5e5ce6'],
      '<path fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" d="M16 40c8-16 16-4 24-16 4-6 8-2 8 4"/>' +
      '<circle cx="20" cy="44" r="3" ' + W + '/><circle cx="44" cy="22" r="3" ' + W + '/>'
    , { dir: 'd' }),

    music: makeIcon('music', ['#ff2d55', '#c2185b'],
      '<circle cx="24" cy="42" r="8" ' + W + '/><circle cx="44" cy="36" r="8" ' + W + '/>' +
      '<path ' + W + ' d="M32 14v28h-4V20l16-4v24h-4V14z"/>'
    ),

    tv: makeIcon('tv', ['#1c1c1e', '#000'],
      '<rect x="10" y="16" width="44" height="28" rx="4" ' + W + ' opacity="0.95"/>' +
      '<path fill="#1c1c1e" d="M28 28l12 6-12 6V28z"/>' +
      '<rect x="24" y="48" width="16" height="3" rx="1" ' + W + ' opacity="0.7"/>'
    ),

    podcasts: makeIcon('podcasts', ['#bf5af2', '#9b3dd1'],
      '<circle cx="32" cy="28" r="6" ' + W + '/>' +
      '<path fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" d="M20 30a12 12 0 0 1 24 0"/>' +
      '<path fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" d="M14 34a18 18 0 0 1 36 0"/>' +
      '<rect x="29" y="34" width="6" height="14" rx="3" ' + W + '/>'
    ),

    news: makeIcon('news', ['#ff3b30', '#d70015'],
      '<rect x="12" y="14" width="40" height="36" rx="3" ' + W + '/>' +
      '<rect x="18" y="20" width="16" height="12" rx="1" fill="#ff3b30"/>' +
      '<rect x="38" y="20" width="8" height="3" rx="1" fill="#ff3b30" opacity="0.6"/>' +
      '<rect x="38" y="26" width="8" height="3" rx="1" fill="#ff3b30" opacity="0.6"/>' +
      '<rect x="18" y="36" width="28" height="3" rx="1" fill="#ff3b30" opacity="0.5"/>' +
      '<rect x="18" y="42" width="20" height="3" rx="1" fill="#ff3b30" opacity="0.4"/>'
    ),

    stocks: makeIcon('stocks', ['#1c1c1e', '#000'],
      '<path fill="none" stroke="#30d158" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" d="M12 44l10-14 8 8 14-22 8 6"/>' +
      '<circle cx="52" cy="22" r="3" fill="#30d158"/>'
    ),

    books: makeIcon('books', ['#ff9f0a', '#ff6b00'],
      '<path ' + W + ' d="M14 14c0-1.1.9-2 2-2h12c4 0 6 2 6 6v32c0-3-2-5-6-5H16c-1.1 0-2-.9-2-2V14z"/>' +
      '<path ' + W + ' d="M50 14c0-1.1-.9-2-2-2H36c-4 0-6 2-6 6v32c0-3 2-5 6-5h12c1.1 0 2-.9 2-2V14z" opacity="0.85"/>'
    ),

    appstore: makeIcon('appstore', ['#0a84ff', '#0071e3'],
      '<path fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" d="M32 14v20M22 24l10 16M42 24L32 40"/>' +
      '<circle cx="32" cy="48" r="3" ' + W + '/>'
    ),

    'system-settings': makeIcon('sysset', ['#8e8e93', '#636366'],
      '<circle cx="32" cy="32" r="10" fill="none" stroke="#fff" stroke-width="4"/>' +
      '<g fill="#fff">' +
      [0, 45, 90, 135, 180, 225, 270, 315].map(function (a) {
        var r = (a * Math.PI) / 180;
        var x = 32 + Math.cos(r) * 18;
        var y = 32 + Math.sin(r) * 18;
        return '<rect x="' + (x - 3) + '" y="' + (y - 5) + '" width="6" height="10" rx="2" transform="rotate(' + a + ' ' + x + ' ' + y + ')"/>';
      }).join('') +
      '</g>'
    ),

    calculator: makeIcon('calc', ['#1c1c1e', '#2c2c2e'],
      '<rect x="18" y="12" width="28" height="10" rx="2" ' + W + ' opacity="0.9"/>' +
      '<circle cx="22" cy="32" r="3.5" ' + W + '/><circle cx="32" cy="32" r="3.5" ' + W + '/><circle cx="42" cy="32" r="3.5" fill="#ff9f0a"/>' +
      '<circle cx="22" cy="44" r="3.5" ' + W + '/><circle cx="32" cy="44" r="3.5" ' + W + '/><circle cx="42" cy="44" r="3.5" fill="#ff9f0a"/>'
    ),

    clock: makeIcon('clock', ['#1c1c1e', '#2c2c2e'],
      '<circle cx="32" cy="32" r="20" fill="#fff" opacity="0.95"/>' +
      '<circle cx="32" cy="32" r="2" fill="#ff3b30"/>' +
      '<line x1="32" y1="32" x2="32" y2="18" stroke="#1c1c1e" stroke-width="2.5" stroke-linecap="round"/>' +
      '<line x1="32" y1="32" x2="42" y2="36" stroke="#1c1c1e" stroke-width="2" stroke-linecap="round"/>'
    ),

    weather: makeIcon('weather', ['#5ac8fa', '#0a84ff'],
      '<circle cx="38" cy="26" r="10" fill="#ffd60a"/>' +
      '<ellipse cx="28" cy="38" rx="16" ry="10" ' + W + ' opacity="0.95"/>' +
      '<ellipse cx="40" cy="36" rx="12" ry="8" ' + W + ' opacity="0.9"/>'
    ),

    home: makeIcon('home', ['#30d158', '#248a3d'],
      '<path ' + W + ' d="M32 14L12 32h6v18h12V38h4v12h12V32h6L32 14z"/>'
    ),

    'voice-memos': makeIcon('voicememos', ['#ff3b30', '#d70015'],
      '<rect x="28" y="14" width="8" height="22" rx="4" ' + W + '/>' +
      '<path fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" d="M20 30a12 12 0 0 0 24 0"/>' +
      '<line x1="32" y1="42" x2="32" y2="50" stroke="#fff" stroke-width="3" stroke-linecap="round"/>' +
      '<line x1="24" y1="50" x2="40" y2="50" stroke="#fff" stroke-width="3" stroke-linecap="round"/>'
    ),

    shortcuts: makeIcon('shortcuts', ['#ff2d55', '#af52de', '#5e5ce6'],
      '<rect x="14" y="14" width="16" height="16" rx="4" ' + W + ' opacity="0.95"/>' +
      '<rect x="34" y="14" width="16" height="16" rx="4" ' + W + ' opacity="0.85"/>' +
      '<rect x="14" y="34" width="16" height="16" rx="4" ' + W + ' opacity="0.75"/>' +
      '<path ' + W + ' d="M38 38l8 4-8 4v-3h-6v-2h6v-3z" opacity="0.95"/>'
    , { dir: 'd' }),

    preview: makeIcon('preview', ['#0a84ff', '#5ac8fa'],
      '<rect x="12" y="14" width="40" height="36" rx="3" ' + W + ' opacity="0.95"/>' +
      '<circle cx="24" cy="28" r="5" fill="#0a84ff" opacity="0.7"/>' +
      '<path fill="#0a84ff" opacity="0.6" d="M12 42l12-10 8 6 10-12 10 8v8H12z"/>'
    ),

    textedit: makeIcon('textedit', ['#ffcc00', '#ff9f0a'],
      '<rect x="14" y="12" width="36" height="40" rx="3" ' + W + '/>' +
      '<path d="M22 22h20M22 30h16M22 38h18" fill="none" stroke="#c77d00" stroke-width="2.5" stroke-linecap="round"/>'
    ),

    terminal: makeIcon('terminal', ['#1c1c1e', '#000'],
      '<path fill="none" stroke="#30d158" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" d="M16 22l12 10-12 10"/>' +
      '<line x1="32" y1="42" x2="48" y2="42" stroke="#30d158" stroke-width="3" stroke-linecap="round"/>'
    ),

    'activity-monitor': makeIcon('actmon', ['#1c1c1e', '#2c2c2e'],
      '<path fill="none" stroke="#30d158" stroke-width="2.5" stroke-linecap="round" d="M10 36h8l4-12 6 24 6-18 4 8h16"/>'
    ),

    'disk-utility': makeIcon('diskutil', ['#8e8e93', '#636366'],
      '<ellipse cx="32" cy="22" rx="18" ry="8" fill="none" stroke="#fff" stroke-width="2.5"/>' +
      '<path fill="none" stroke="#fff" stroke-width="2.5" d="M14 22v20c0 4.4 8 8 18 8s18-3.6 18-8V22"/>' +
      '<ellipse cx="32" cy="42" rx="18" ry="8" fill="none" stroke="#fff" stroke-width="2.5" opacity="0.6"/>'
    ),

    console: makeIcon('console', ['#1c1c1e', '#000'],
      '<text x="14" y="28" font-family="Menlo,monospace" font-size="11" fill="#30d158">&gt;_</text>' +
      '<text x="14" y="42" font-family="Menlo,monospace" font-size="9" fill="#fff" opacity="0.5">log…</text>'
    ),

    'font-book': makeIcon('fontbook', ['#af52de', '#8e44ad'],
      '<text x="32" y="42" text-anchor="middle" font-family="Georgia,serif" font-size="32" font-weight="700" fill="#fff">A</text>'
    ),

    dictionary: makeIcon('dict', ['#0a84ff', '#0055d4'],
      '<rect x="14" y="12" width="36" height="40" rx="3" ' + W + '/>' +
      '<text x="32" y="40" text-anchor="middle" font-family="Georgia,serif" font-size="22" font-weight="700" fill="#0a84ff">Aa</text>'
    ),

    chess: makeIcon('chess', ['#1c1c1e', '#3a3a3c'],
      '<path ' + W + ' d="M28 14h8v4h-2l2 6h-8l2-6h-2v-4z"/>' +
      '<path ' + W + ' d="M24 28h16l-2 8H26l-2-8z"/>' +
      '<rect x="22" y="38" width="20" height="6" rx="1" ' + W + '/>' +
      '<rect x="18" y="46" width="28" height="5" rx="1" ' + W + '/>'
    ),

    'photo-booth': makeIcon('photobooth', ['#ff2d55', '#ff375f'],
      '<rect x="12" y="16" width="40" height="32" rx="4" ' + W + ' opacity="0.95"/>' +
      '<circle cx="24" cy="32" r="5" fill="#ff2d55"/><circle cx="40" cy="32" r="5" fill="#ff2d55"/>' +
      '<path fill="#ff2d55" d="M28 38c2 3 6 3 8 0" opacity="0.8"/>'
    ),

    quicktime: makeIcon('quicktime', ['#0a84ff', '#0071e3'],
      '<circle cx="32" cy="32" r="18" fill="none" stroke="#fff" stroke-width="4"/>' +
      '<path ' + W + ' d="M32 18a14 14 0 0 1 14 14H32V18z"/>'
    ),

    'image-capture': makeIcon('imgcap', ['#8e8e93', '#636366'],
      '<rect x="12" y="20" width="40" height="28" rx="4" ' + W + '/>' +
      '<circle cx="32" cy="34" r="8" fill="none" stroke="#8e8e93" stroke-width="3"/>' +
      '<rect x="26" y="16" width="12" height="6" rx="1" ' + W + '/>'
    ),

    grapher: makeIcon('grapher', ['#1c1c1e', '#2c2c2e'],
      '<path fill="none" stroke="#5e5ce6" stroke-width="2.5" d="M12 40c8-20 12 4 20-12s12 8 20 0"/>' +
      '<line x1="12" y1="48" x2="52" y2="48" stroke="#fff" stroke-width="1.5" opacity="0.4"/>' +
      '<line x1="16" y1="14" x2="16" y2="48" stroke="#fff" stroke-width="1.5" opacity="0.4"/>'
    ),

    automator: makeIcon('automator', ['#ffcc00', '#ff9f0a'],
      '<circle cx="32" cy="32" r="16" fill="none" stroke="#fff" stroke-width="3"/>' +
      '<path ' + W + ' d="M32 20v12l8 5" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/>' +
      '<circle cx="32" cy="32" r="3" ' + W + '/>'
    ),

    'script-editor': makeIcon('scripted', ['#1c1c1e', '#000'],
      '<path fill="none" stroke="#ff9f0a" stroke-width="2.5" stroke-linecap="round" d="M20 22h8l-6 20h8"/>' +
      '<path fill="none" stroke="#5ac8fa" stroke-width="2.5" stroke-linecap="round" d="M36 22h10M36 32h10M36 42h10"/>'
    ),

    'airport-utility': makeIcon('airport', ['#0a84ff', '#0071e3'],
      '<circle cx="32" cy="44" r="3" ' + W + '/>' +
      '<path fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" d="M22 36a14 14 0 0 1 20 0"/>' +
      '<path fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" d="M16 28a24 24 0 0 1 32 0"/>' +
      '<path fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" d="M10 20a32 32 0 0 1 44 0"/>'
    ),

    'audio-midi-setup': makeIcon('audiomidi', ['#ff2d55', '#c2185b'],
      '<rect x="14" y="28" width="6" height="16" rx="1" ' + W + '/>' +
      '<rect x="24" y="20" width="6" height="24" rx="1" ' + W + '/>' +
      '<rect x="34" y="24" width="6" height="20" rx="1" ' + W + '/>' +
      '<rect x="44" y="16" width="6" height="28" rx="1" ' + W + '/>'
    ),

    'bluetooth-file-exchange': makeIcon('btex', ['#0a84ff', '#0055d4'],
      '<path fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" d="M32 12v40M32 12l12 10-12 10 12 10-12 10M20 22l12 10M20 42l12-10"/>'
    ),

    colorsync: makeIcon('colorsync', ['#ff3b30', '#ffcc00', '#30d158', '#0a84ff'],
      '<circle cx="26" cy="28" r="12" fill="#ff3b30" opacity="0.85"/>' +
      '<circle cx="38" cy="28" r="12" fill="#0a84ff" opacity="0.85"/>' +
      '<circle cx="32" cy="40" r="12" fill="#30d158" opacity="0.85"/>'
    , { dir: 'd' }),

    'digital-color-meter': makeIcon('dcm', ['#1c1c1e', '#2c2c2e'],
      '<circle cx="32" cy="30" r="14" fill="none" stroke="#fff" stroke-width="3"/>' +
      '<circle cx="32" cy="30" r="6" fill="#ff2d55"/>' +
      '<rect x="30" y="44" width="4" height="8" ' + W + '/>'
    ),

    'directory-utility': makeIcon('dirutil', ['#8e8e93', '#636366'],
      '<rect x="12" y="18" width="18" height="28" rx="2" ' + W + ' opacity="0.9"/>' +
      '<rect x="34" y="18" width="18" height="28" rx="2" ' + W + ' opacity="0.7"/>' +
      '<circle cx="21" cy="28" r="4" fill="#636366"/><rect x="15" y="36" width="12" height="3" rx="1" fill="#636366"/>'
    ),

    'dvd-player': makeIcon('dvd', ['#1c1c1e', '#000'],
      '<circle cx="32" cy="32" r="18" fill="none" stroke="#fff" stroke-width="2.5"/>' +
      '<circle cx="32" cy="32" r="6" fill="none" stroke="#fff" stroke-width="2"/>' +
      '<circle cx="32" cy="32" r="2" ' + W + '/>'
    ),

    'migration-assistant': makeIcon('migasst', ['#0a84ff', '#0071e3'],
      '<rect x="10" y="22" width="18" height="14" rx="2" ' + W + ' opacity="0.85"/>' +
      '<rect x="36" y="18" width="18" height="22" rx="2" ' + W + '/>' +
      '<path fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" d="M30 29h4M32 26l4 3-4 3"/>'
    ),

    'boot-camp': makeIcon('bootcamp', ['#1c1c1e', '#000'],
      '<path ' + W + ' d="M18 40c0-10 6-18 14-18s14 8 14 18"/>' +
      '<rect x="20" y="40" width="24" height="6" rx="1" ' + W + '/>' +
      '<text x="32" y="30" text-anchor="middle" font-family="system-ui" font-size="10" font-weight="700" fill="#0a84ff">BC</text>'
    ),

    'keychain-access': makeIcon('keychain', ['#8e8e93', '#636366'],
      '<circle cx="26" cy="28" r="10" fill="none" stroke="#fff" stroke-width="3"/>' +
      '<path ' + W + ' d="M32 32l14 14v-6h4v-4h-4l-2-2-4 2-2-4z"/>'
    ),

    screenshot: makeIcon('screenshot', ['#1c1c1e', '#2c2c2e'],
      '<path fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" d="M14 22V16h8M42 16h8v6M50 42v6h-8M22 48h-8v-6"/>' +
      '<rect x="20" y="22" width="24" height="20" rx="2" fill="none" stroke="#fff" stroke-width="2"/>'
    ),

    stickies: makeIcon('stickies', ['#ffd60a', '#ffcc00'],
      '<rect x="14" y="14" width="36" height="36" rx="2" ' + W + '/>' +
      '<path fill="#e6b800" d="M38 14l12 12H38V14z" opacity="0.5"/>' +
      '<rect x="20" y="28" width="20" height="2" rx="1" fill="#c7a000" opacity="0.4"/>' +
      '<rect x="20" y="34" width="16" height="2" rx="1" fill="#c7a000" opacity="0.4"/>'
    ),

    tips: makeIcon('tips', ['#ff9f0a', '#ff6b00'],
      '<path ' + W + ' d="M32 12c-8 0-14 6-14 14 0 5 3 9 7 11v5h14v-5c4-2 7-6 7-11 0-8-6-14-14-14z"/>' +
      '<rect x="26" y="48" width="12" height="4" rx="2" ' + W + ' opacity="0.8"/>'
    ),

    'find-my': makeIcon('findmy', ['#0a84ff', '#30d158'],
      '<circle cx="32" cy="32" r="8" ' + W + '/>' +
      '<circle cx="32" cy="32" r="16" fill="none" stroke="#fff" stroke-width="2.5" opacity="0.7"/>' +
      '<circle cx="32" cy="32" r="22" fill="none" stroke="#fff" stroke-width="2" opacity="0.4"/>'
    , { dir: 'd' }),

    journal: makeIcon('journal', ['#bf5af2', '#9b3dd1'],
      '<rect x="14" y="12" width="36" height="40" rx="3" ' + W + '/>' +
      '<rect x="14" y="12" width="8" height="40" fill="#8e44ad" opacity="0.5"/>' +
      '<rect x="28" y="24" width="16" height="2.5" rx="1" fill="#bf5af2" opacity="0.6"/>' +
      '<rect x="28" y="32" width="14" height="2.5" rx="1" fill="#bf5af2" opacity="0.5"/>'
    ),

    'image-playground': makeIcon('imgplay', ['#ff2d55', '#af52de', '#5e5ce6'],
      '<circle cx="32" cy="32" r="14" ' + W + ' opacity="0.2"/>' +
      '<path ' + W + ' d="M22 36l6-8 5 6 4-5 7 9H22z"/>' +
      '<circle cx="40" cy="24" r="3" ' + W + '/>'
    , { dir: 'd' }),

    games: makeIcon('games', ['#5e5ce6', '#bf5af2'],
      '<rect x="10" y="24" width="44" height="20" rx="10" ' + W + '/>' +
      '<circle cx="22" cy="34" r="3" fill="#5e5ce6"/><circle cx="30" cy="34" r="3" fill="#5e5ce6"/>' +
      '<circle cx="42" cy="30" r="2.5" fill="#ff2d55"/><circle cx="46" cy="34" r="2.5" fill="#ffd60a"/>' +
      '<circle cx="42" cy="38" r="2.5" fill="#30d158"/>'
    , { dir: 'd' }),

    'iphone-mirroring': makeIcon('iphonem', ['#1c1c1e', '#2c2c2e'],
      '<rect x="22" y="10" width="20" height="44" rx="4" fill="none" stroke="#fff" stroke-width="2.5"/>' +
      '<circle cx="32" cy="48" r="2" ' + W + '/>' +
      '<rect x="28" y="14" width="8" height="2" rx="1" ' + W + ' opacity="0.6"/>'
    ),

    magnifier: makeIcon('magnifier', ['#8e8e93', '#636366'],
      '<circle cx="28" cy="28" r="12" fill="none" stroke="#fff" stroke-width="3.5"/>' +
      '<line x1="37" y1="37" x2="50" y2="50" stroke="#fff" stroke-width="4" stroke-linecap="round"/>'
    ),

    garageband: makeIcon('garageband', ['#ff2d55', '#c2185b'],
      '<rect x="14" y="18" width="36" height="28" rx="3" ' + W + ' opacity="0.95"/>' +
      '<rect x="18" y="24" width="4" height="16" rx="1" fill="#ff2d55"/>' +
      '<rect x="26" y="22" width="4" height="18" rx="1" fill="#ff2d55"/>' +
      '<rect x="34" y="26" width="4" height="14" rx="1" fill="#ff2d55"/>' +
      '<rect x="42" y="20" width="4" height="20" rx="1" fill="#ff2d55"/>'
    ),

    imovie: makeIcon('imovie', ['#ff2d55', '#c2185b'],
      '<polygon ' + W + ' points="18,16 18,48 48,32"/>' +
      '<rect x="12" y="14" width="6" height="6" rx="1" ' + W + ' opacity="0.7"/>' +
      '<rect x="12" y="44" width="6" height="6" rx="1" ' + W + ' opacity="0.7"/>'
    ),

    keynote: makeIcon('keynote', ['#ff9f0a', '#ff6b00'],
      '<rect x="12" y="16" width="40" height="28" rx="2" ' + W + '/>' +
      '<path fill="#ff9f0a" d="M20 36l8-10 6 6 8-12 6 4v12H20z" opacity="0.8"/>' +
      '<rect x="26" y="46" width="12" height="3" rx="1" ' + W + ' opacity="0.7"/>'
    ),

    pages: makeIcon('pages', ['#0a84ff', '#0071e3'],
      '<rect x="16" y="10" width="32" height="44" rx="2" ' + W + '/>' +
      '<rect x="22" y="20" width="20" height="2.5" rx="1" fill="#0a84ff" opacity="0.5"/>' +
      '<rect x="22" y="28" width="20" height="2.5" rx="1" fill="#0a84ff" opacity="0.4"/>' +
      '<rect x="22" y="36" width="14" height="2.5" rx="1" fill="#0a84ff" opacity="0.35"/>'
    ),

    numbers: makeIcon('numbers', ['#30d158', '#248a3d'],
      '<rect x="12" y="14" width="40" height="36" rx="2" ' + W + '/>' +
      '<rect x="18" y="36" width="6" height="8" fill="#30d158"/>' +
      '<rect x="28" y="28" width="6" height="16" fill="#30d158"/>' +
      '<rect x="38" y="22" width="6" height="22" fill="#30d158"/>'
    ),

    'time-machine': makeIcon('timemachine', ['#5ac8fa', '#0a84ff'],
      '<circle cx="32" cy="32" r="16" fill="none" stroke="#fff" stroke-width="3"/>' +
      '<circle cx="32" cy="32" r="10" fill="none" stroke="#fff" stroke-width="2" opacity="0.6"/>' +
      '<path ' + W + ' d="M32 20v12l8 4" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/>' +
      '<path fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" d="M44 18l4 2-2 4"/>'
    ),

    'print-center': makeIcon('printctr', ['#8e8e93', '#636366'],
      '<rect x="18" y="12" width="28" height="12" rx="2" ' + W + ' opacity="0.85"/>' +
      '<rect x="12" y="24" width="40" height="18" rx="2" ' + W + '/>' +
      '<rect x="20" y="42" width="24" height="10" rx="1" ' + W + ' opacity="0.9"/>' +
      '<circle cx="44" cy="33" r="2" fill="#30d158"/>'
    ),

    'system-information': makeIcon('sysinfo', ['#0a84ff', '#0071e3'],
      '<circle cx="32" cy="32" r="18" fill="none" stroke="#fff" stroke-width="2.5"/>' +
      '<text x="32" y="40" text-anchor="middle" font-family="system-ui" font-size="24" font-weight="600" fill="#fff">i</text>'
    ),

    'voiceover-utility': makeIcon('voiceover', ['#8e8e93', '#636366'],
      '<circle cx="32" cy="32" r="16" fill="none" stroke="#fff" stroke-width="2.5"/>' +
      '<path ' + W + ' d="M24 28c0-4 3.5-8 8-8s8 4 8 8c0 3-2 5-4 6v4h-8v-4c-2-1-4-3-4-6z"/>' +
      '<rect x="28" y="44" width="8" height="3" rx="1" ' + W + '/>'
    ),

    wallpaper: makeIcon('wallpaper', ['#5e5ce6', '#0a84ff', '#30d158'],
      '<rect x="12" y="16" width="40" height="32" rx="3" ' + W + ' opacity="0.25"/>' +
      '<circle cx="24" cy="28" r="5" ' + W + ' opacity="0.9"/>' +
      '<path ' + W + ' d="M12 40l12-10 8 6 10-8 10 6v6H12z" opacity="0.85"/>'
    , { dir: 'd' }),

    launchpad: makeIcon('launchpad', ['#1c1c1e', '#2c2c2e'],
      [0, 1, 2, 3, 4, 5, 6, 7, 8].map(function (i) {
        var col = i % 3;
        var row = Math.floor(i / 3);
        var x = 16 + col * 14;
        var y = 16 + row * 14;
        var colors = ['#ff453a', '#ff9f0a', '#ffd60a', '#30d158', '#64d2ff', '#0a84ff', '#5e5ce6', '#bf5af2', '#ff2d55'];
        return '<rect x="' + x + '" y="' + y + '" width="10" height="10" rx="2.5" fill="' + colors[i] + '"/>';
      }).join('')
    ),

    trash: makeIcon('trash', ['#8e8e93', '#636366'],
      '<path ' + W + ' d="M22 20h20l-2 28H24L22 20z" opacity="0.95"/>' +
      '<rect x="18" y="16" width="28" height="5" rx="1" ' + W + '/>' +
      '<rect x="26" y="12" width="12" height="5" rx="1" ' + W + ' opacity="0.85"/>' +
      '<line x1="28" y1="26" x2="28" y2="40" stroke="#636366" stroke-width="2"/>' +
      '<line x1="36" y1="26" x2="36" y2="40" stroke="#636366" stroke-width="2"/>'
    ),

    siri: makeIcon('siri', ['#0a84ff', '#bf5af2', '#ff2d55'],
      '<circle cx="32" cy="32" r="18" fill="none" stroke="url(#g-siri)" stroke-width="0"/>' +
      '<circle cx="32" cy="32" r="14" ' + W + ' opacity="0.15"/>' +
      '<path fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" d="M22 34c2-6 6-10 10-10s8 4 10 10"/>' +
      '<path fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity="0.7" d="M18 38c3-10 8-16 14-16s11 6 14 16"/>' +
      '<circle cx="32" cy="28" r="3" ' + W + '/>'
    , { dir: 'd' }),

    spotlight: makeIcon('spotlight', ['#8e8e93', '#636366'],
      '<circle cx="28" cy="28" r="12" fill="none" stroke="#fff" stroke-width="3.5"/>' +
      '<line x1="37" y1="37" x2="50" y2="50" stroke="#fff" stroke-width="4" stroke-linecap="round"/>'
    )
  };

  // Rebuild a few icons that need clean two-color gradients / overrides
  MacIcons['system-settings'] = makeIcon('sysset', ['#8e8e93', '#636366'],
    '<circle cx="32" cy="32" r="9" fill="none" stroke="#fff" stroke-width="4"/>' +
    [0, 45, 90, 135, 180, 225, 270, 315].map(function (a) {
      var r = (a * Math.PI) / 180;
      var x = 32 + Math.cos(r) * 17;
      var y = 32 + Math.sin(r) * 17;
      return '<rect x="' + (x - 2.5) + '" y="' + (y - 4.5) + '" width="5" height="9" rx="1.5" fill="#fff" transform="rotate(' + a + ' ' + x + ' ' + y + ')"/>';
    }).join('')
  );

  MacIcons.preview = makeIcon('preview', ['#5ac8fa', '#0a84ff'],
    '<rect x="12" y="14" width="40" height="36" rx="3" ' + W + ' opacity="0.95"/>' +
    '<circle cx="24" cy="28" r="5" fill="#0a84ff" opacity="0.7"/>' +
    '<path fill="#0a84ff" opacity="0.55" d="M12 42l12-10 8 6 10-12 10 8v8H12z"/>'
  );

  MacIcons['font-book'] = makeIcon('fontbook', ['#af52de', '#8e44ad'],
    '<text x="32" y="42" text-anchor="middle" font-family="Georgia,serif" font-size="32" font-weight="700" fill="#fff">A</text>'
  );

  MacIcons['image-capture'] = makeIcon('imgcap', ['#8e8e93', '#636366'],
    '<rect x="12" y="20" width="40" height="28" rx="4" ' + W + '/>' +
    '<circle cx="32" cy="34" r="8" fill="none" stroke="#636366" stroke-width="3"/>' +
    '<rect x="26" y="16" width="12" height="6" rx="1" ' + W + '/>'
  );

  MacIcons.pages = makeIcon('pages', ['#0a84ff', '#0071e3'],
    '<rect x="16" y="10" width="32" height="44" rx="2" ' + W + '/>' +
    '<rect x="22" y="20" width="20" height="2.5" rx="1" fill="#0a84ff" opacity="0.5"/>' +
    '<rect x="22" y="28" width="20" height="2.5" rx="1" fill="#0a84ff" opacity="0.4"/>' +
    '<rect x="22" y="36" width="14" height="2.5" rx="1" fill="#0a84ff" opacity="0.35"/>'
  );

  // Distinct icons / aliases for alternate app ids
  MacIcons.passwords = makeIcon('passwords', ['#0a84ff', '#5e5ce6'],
    '<rect x="20" y="28" width="24" height="20" rx="3" ' + W + '/>' +
    '<path fill="none" stroke="#fff" stroke-width="3" d="M26 28v-6a6 6 0 0 1 12 0v6"/>' +
    '<circle cx="32" cy="38" r="2.5" fill="#5e5ce6"/>'
  , { dir: 'd' });
  MacIcons.phone = makeIcon('phone', ['#30d158', '#34c759'],
    '<path fill="#fff" d="M22 14c1 0 2 .5 2.5 1.5l2 4c.4.8.2 1.8-.5 2.3l-2 1.5c1.5 3 4 5.5 7 7l1.5-2c.5-.7 1.5-.9 2.3-.5l4 2c1 .5 1.5 1.5 1.5 2.5v3c0 1.5-1.3 2.7-2.8 2.5C25 36 16 27 14.5 14.8 14.3 13.3 15.5 12 17 12h5z"/>'
  );
  // ColorSync Utility alias used by some launchers
  MacIcons['colorsync-utility'] = MacIcons.colorsync;
  MacIcons['quicktime-player'] = MacIcons.quicktime;
  MacIcons['app-store'] = MacIcons.appstore;
  MacIcons['apple-games'] = MacIcons.games;
  MacIcons['system-preferences'] = MacIcons['system-settings'];
  if (!MacIcons.siri) {
    MacIcons.siri = makeIcon('siri', ['#bf5af2', '#5e5ce6'],
      '<circle cx="32" cy="32" r="14" fill="none" stroke="#fff" stroke-width="3"/>' +
      '<circle cx="32" cy="32" r="6" fill="#fff"/>'
    );
  }

  /**
   * Get icon HTML for an app id. Falls back to a generic icon.
   */
  function get(appId) {
    if (MacIcons[appId]) return MacIcons[appId];
    return makeIcon('fallback-' + esc(appId), ['#8e8e93', '#636366'],
      '<text x="32" y="38" text-anchor="middle" font-family="system-ui,sans-serif" font-size="20" font-weight="600" fill="#fff">' +
      esc((appId || '?').charAt(0).toUpperCase()) + '</text>'
    );
  }

  MacIcons.get = get;
  MacIcons.makeIcon = makeIcon;
  MacIcons.ids = Object.keys(MacIcons).filter(function (k) {
    return typeof MacIcons[k] === 'string';
  });

  global.MacIcons = MacIcons;
})(typeof window !== 'undefined' ? window : this);
