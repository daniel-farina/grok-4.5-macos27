/**
 * AppRegistry — all official macOS built-in apps (macOS 27 simulation)
 * Each app: { id, name, category, dock?, width, height, open() => contentHTML }
 */
(function (global) {
  const APPS = {};

  function register(def) {
    APPS[def.id] = def;
  }

  function icon(id) {
    return (global.MacIcons && global.MacIcons[id]) || (global.MacIcons && global.MacIcons.finder) || '';
  }

  function sidebar(items, active) {
    return `<aside class="app-sidebar">${items
      .map(
        (it) =>
          `<div class="app-sidebar-item ${it.id === active ? 'active' : ''}" data-nav="${it.id}">
            <span class="sb-icon">${it.icon || '•'}</span><span>${it.label}</span>
          </div>`
      )
      .join('')}</aside>`;
  }

  function toolbar(html) {
    return `<div class="app-toolbar">${html}</div>`;
  }

  function listRows(rows) {
    return `<div class="app-list">${rows
      .map(
        (r) =>
          `<div class="app-list-row">
            <div class="row-main"><strong>${r.title}</strong>${r.sub ? `<span class="muted">${r.sub}</span>` : ''}</div>
            ${r.meta ? `<span class="row-meta">${r.meta}</span>` : ''}
          </div>`
      )
      .join('')}</div>`;
  }

  function emptyState(title, sub) {
    return `<div class="app-empty"><div class="empty-title">${title}</div><div class="muted">${sub || ''}</div></div>`;
  }

  function pill(text, tone) {
    return `<span class="pill ${tone || ''}">${text}</span>`;
  }

  // ─── Core / Dock apps ───────────────────────────────────────────
  // SF-style icon paths (inline SVG) for Finder sidebar — matches macOS 27
  const SF = {
    apps: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
    desktop: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/></svg>',
    docs: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M7 3h7l5 5v13a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1z"/><path d="M14 3v5h5"/></svg>',
    down: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 4v12M7 12l5 5 5-5"/><path d="M5 20h14"/></svg>',
    folder: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/></svg>',
    cloud: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M7 18h10a4 4 0 000-8 5.5 5.5 0 00-10.5 1.5A3.5 3.5 0 007 18z"/></svg>',
    home: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 11l8-7 8 7v8a1 1 0 01-1 1h-5v-5H10v5H5a1 1 0 01-1-1v-8z"/></svg>',
    drive: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="8" cy="12" r="1.2" fill="currentColor"/><path d="M12 12h6"/></svg>',
    airdrop: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="2"/><path d="M7 7a7 7 0 010 10M17 7a7 7 0 010 10M4.5 4.5a11 11 0 010 15M19.5 4.5a11 11 0 010 15"/></svg>',
    net: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18"/></svg>',
    trash: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 7h16M9 7V5h6v2M8 7l1 12h6l1-12"/></svg>',
  };

  /**
   * Demo filesystem: default macOS locations + a few generic example items only.
   * No personal folder names, usernames, or real machine files.
   */
  const FINDER_LOCATIONS = {
    recents: {
      title: 'Recents',
      crumbs: ['Recents'],
      files: [
        { title: 'Notes', kind: 'doc', hue: 50 },
        { title: 'Pages Document', kind: 'doc', hue: 210 },
        { title: 'Numbers Spreadsheet', kind: 'doc', hue: 140 },
      ],
    },
    apps: {
      title: 'Applications',
      crumbs: ['Macintosh HD', 'Applications'],
      files: [
        { title: 'Safari', kind: 'app', hue: 210 },
        { title: 'Mail', kind: 'app', hue: 220 },
        { title: 'Messages', kind: 'app', hue: 140 },
        { title: 'Maps', kind: 'app', hue: 160 },
        { title: 'Photos', kind: 'app', hue: 280 },
        { title: 'FaceTime', kind: 'app', hue: 200 },
        { title: 'Calendar', kind: 'app', hue: 0 },
        { title: 'Contacts', kind: 'app', hue: 30 },
        { title: 'Reminders', kind: 'app', hue: 40 },
        { title: 'Notes', kind: 'app', hue: 50 },
        { title: 'Music', kind: 'app', hue: 350 },
        { title: 'TV', kind: 'app', hue: 320 },
        { title: 'Podcasts', kind: 'app', hue: 30 },
        { title: 'App Store', kind: 'app', hue: 210 },
        { title: 'System Settings', kind: 'app', hue: 220 },
        { title: 'Terminal', kind: 'app', hue: 200 },
        { title: 'Calculator', kind: 'app', hue: 30 },
        { title: 'Preview', kind: 'app', hue: 210 },
        { title: 'TextEdit', kind: 'app', hue: 200 },
        { title: 'Dictionary', kind: 'app', hue: 210 },
        { title: 'Clock', kind: 'app', hue: 210 },
        { title: 'Weather', kind: 'app', hue: 200 },
        { title: 'Home', kind: 'app', hue: 30 },
        { title: 'Books', kind: 'app', hue: 20 },
        { title: 'News', kind: 'app', hue: 0 },
        { title: 'Stocks', kind: 'app', hue: 140 },
        { title: 'Voice Memos', kind: 'app', hue: 0 },
        { title: 'Freeform', kind: 'app', hue: 210 },
      ],
    },
    desktop: {
      title: 'Desktop',
      crumbs: ['Macintosh HD', 'Users', 'User', 'Desktop'],
      files: [
        { title: 'Documents', kind: 'folder', hue: 210 },
        { title: 'Untitled.rtf', kind: 'doc', hue: 200, selected: true },
        { title: 'Example.pdf', kind: 'pdf', hue: 0 },
        { title: 'Sample Image.png', kind: 'shot', hue: 220 },
        { title: 'Movie.mp4', kind: 'video', hue: 240 },
      ],
    },
    docs: {
      title: 'Documents',
      crumbs: ['Macintosh HD', 'Users', 'User', 'Documents'],
      files: [
        { title: 'Pages', kind: 'folder', hue: 210 },
        { title: 'Numbers', kind: 'folder', hue: 140 },
        { title: 'Keynote', kind: 'folder', hue: 200 },
        { title: 'Example Document.pages', kind: 'doc', hue: 210 },
        { title: 'Read Me.txt', kind: 'doc', hue: 40 },
      ],
    },
    down: {
      title: 'Downloads',
      crumbs: ['Macintosh HD', 'Users', 'User', 'Downloads'],
      files: [
        { title: 'Example.dmg', kind: 'dmg', hue: 210 },
        { title: 'Archive.zip', kind: 'zip', hue: 40 },
        { title: 'Sample.pdf', kind: 'pdf', hue: 0 },
      ],
    },
    movies: {
      title: 'Movies',
      crumbs: ['Macintosh HD', 'Users', 'User', 'Movies'],
      files: [
        { title: 'TV', kind: 'folder', hue: 320 },
        { title: 'Home Videos', kind: 'folder', hue: 240 },
        { title: 'Demo Clip.mp4', kind: 'video', hue: 260 },
        { title: 'Trailer.mov', kind: 'video', hue: 280 },
      ],
    },
    music: {
      title: 'Music',
      crumbs: ['Macintosh HD', 'Users', 'User', 'Music'],
      files: [
        { title: 'Music', kind: 'folder', hue: 350 },
        { title: 'Liquid Glass.m4a', kind: 'doc', hue: 300 },
        { title: 'Focus Flow.mp3', kind: 'doc', hue: 320 },
      ],
    },
    pictures: {
      title: 'Pictures',
      crumbs: ['Macintosh HD', 'Users', 'User', 'Pictures'],
      files: [
        { title: 'Photos Library', kind: 'folder', hue: 280 },
        { title: 'Funny', kind: 'folder', hue: 40 },
        { title: 'Sample Photo.jpg', kind: 'shot', hue: 30 },
        { title: 'funny-01.jpg', kind: 'shot', hue: 50 },
        { title: 'funny-02.jpg', kind: 'shot', hue: 80 },
        { title: 'funny-03.jpg', kind: 'shot', hue: 120 },
        { title: 'Screenshot demo.png', kind: 'shot', hue: 220 },
      ],
    },
    funny: {
      title: 'Funny',
      crumbs: ['Macintosh HD', 'Users', 'User', 'Pictures', 'Funny'],
      files: [
        { title: 'funny-01.jpg', kind: 'shot', hue: 10 },
        { title: 'funny-05.jpg', kind: 'shot', hue: 50 },
        { title: 'funny-10.jpg', kind: 'shot', hue: 90 },
        { title: 'funny-15.jpg', kind: 'shot', hue: 140 },
        { title: 'funny-20.jpg', kind: 'shot', hue: 200 },
      ],
    },
    icloud: {
      title: 'iCloud Drive',
      crumbs: ['iCloud Drive'],
      files: [
        { title: 'Desktop', kind: 'folder', hue: 210 },
        { title: 'Documents', kind: 'folder', hue: 220 },
        { title: 'Pages', kind: 'folder', hue: 200 },
        { title: 'Numbers', kind: 'folder', hue: 140 },
        { title: 'Keynote', kind: 'folder', hue: 210 },
      ],
    },
    home: {
      title: 'User',
      crumbs: ['Macintosh HD', 'Users', 'User'],
      files: [
        { title: 'Desktop', kind: 'folder', hue: 210 },
        { title: 'Documents', kind: 'folder', hue: 220 },
        { title: 'Downloads', kind: 'folder', hue: 200 },
        { title: 'Movies', kind: 'folder', hue: 280 },
        { title: 'Music', kind: 'folder', hue: 350 },
        { title: 'Pictures', kind: 'folder', hue: 40 },
        { title: 'Public', kind: 'folder', hue: 180 },
      ],
    },
    drive: {
      title: 'Macintosh HD',
      crumbs: ['Macintosh HD'],
      files: [
        { title: 'Applications', kind: 'folder', hue: 210 },
        { title: 'Library', kind: 'folder', hue: 220 },
        { title: 'System', kind: 'folder', hue: 200 },
        { title: 'Users', kind: 'folder', hue: 180 },
      ],
    },
    airdrop: {
      title: 'AirDrop',
      crumbs: ['AirDrop'],
      files: [],
      emptyTitle: 'Allow me to be discovered by',
      emptySub: 'Contacts Only · No one nearby (demo)',
    },
    network: {
      title: 'Network',
      crumbs: ['Network'],
      files: [
        { title: 'My Mac (This Computer)', kind: 'folder', hue: 210 },
        { title: 'Shared Server', kind: 'folder', hue: 200 },
      ],
    },
    trash: {
      title: 'Trash',
      crumbs: ['Trash'],
      files: [
        { title: 'Old Notes.txt', kind: 'doc', hue: 40 },
        { title: 'Screenshot past.png', kind: 'shot', hue: 220 },
      ],
    },
    public: {
      title: 'Public',
      crumbs: ['Macintosh HD', 'Users', 'User', 'Public'],
      files: [
        { title: 'Drop Box', kind: 'folder', hue: 210 },
      ],
    },
    library: {
      title: 'Library',
      crumbs: ['Macintosh HD', 'Users', 'User', 'Library'],
      files: [
        { title: 'Application Support', kind: 'folder', hue: 210 },
        { title: 'Preferences', kind: 'folder', hue: 200 },
        { title: 'Caches', kind: 'folder', hue: 40 },
      ],
    },
  };

  function finderMeta(f, i) {
    const kind = f.kind || 'doc';
    const kindLabel =
      kind === 'folder' || kind === 'app'
        ? kind === 'app'
          ? 'Application'
          : 'Folder'
        : kind === 'image'
          ? 'Image'
          : kind === 'pdf'
            ? 'PDF Document'
            : 'Document';
    const size =
      f.size ||
      (kind === 'folder' || kind === 'app' ? '--' : `${12 + ((i * 7) % 80)} KB`);
    const date = f.date || 'Today, 9:41 AM';
    return { kindLabel, size, date, kind };
  }

  function finderThumb(f, i) {
    const selected = f.selected ? ' is-selected' : '';
    const kind = f.kind || 'doc';
    const hue = f.hue != null ? f.hue : (i * 37) % 360;
    return `<div class="finder-icon-item${selected}" data-file="${i}" tabindex="0">
      <div class="finder-thumb kind-${kind}" style="--h:${hue}">
        <div class="finder-thumb-inner"></div>
      </div>
      <span class="finder-label">${f.title}</span>
    </div>`;
  }

  function finderListRow(f, i) {
    const selected = f.selected ? ' is-selected' : '';
    const m = finderMeta(f, i);
    const hue = f.hue != null ? f.hue : (i * 37) % 360;
    return `<div class="finder-list-row${selected}" data-file="${i}" tabindex="0">
      <span class="fl-name">
        <span class="fl-ico kind-${m.kind}" style="--h:${hue}"></span>
        <span class="fl-title">${f.title}</span>
      </span>
      <span class="fl-date">${m.date}</span>
      <span class="fl-size">${m.size}</span>
      <span class="fl-kind">${m.kindLabel}</span>
    </div>`;
  }

  function finderColumnItems(files) {
    return (files || [])
      .map((f, i) => {
        const selected = f.selected || i === 0 ? ' is-selected' : '';
        const m = finderMeta(f, i);
        const hue = f.hue != null ? f.hue : (i * 37) % 360;
        const chevron = m.kind === 'folder' || m.kind === 'app' ? '<span class="fc-chev">›</span>' : '';
        return `<div class="finder-col-item${selected}" data-file="${i}" tabindex="0">
          <span class="fl-ico kind-${m.kind}" style="--h:${hue}"></span>
          <span class="fc-title">${f.title}</span>
          ${chevron}
        </div>`;
      })
      .join('');
  }

  function finderGalleryHTML(files) {
    const list = files || [];
    const active = list.find((f) => f.selected) || list[0] || { title: 'No selection', kind: 'doc', hue: 200 };
    const hue = active.hue != null ? active.hue : 200;
    const m = finderMeta(active, 0);
    const strip = list
      .map((f, i) => {
        const sel = (f.selected || (!list.some((x) => x.selected) && i === 0)) ? ' is-selected' : '';
        const h = f.hue != null ? f.hue : (i * 37) % 360;
        return `<div class="finder-gal-thumb${sel}" data-file="${i}" tabindex="0">
          <div class="finder-thumb kind-${f.kind || 'doc'}" style="--h:${h}"><div class="finder-thumb-inner"></div></div>
          <span class="finder-gal-label">${f.title}</span>
        </div>`;
      })
      .join('');
    return `<div class="finder-gallery" id="finder-list" data-view="gallery">
      <div class="finder-gal-preview">
        <div class="finder-gal-hero kind-${active.kind || 'doc'}" style="--h:${hue}">
          <div class="finder-thumb-inner"></div>
        </div>
        <div class="finder-gal-meta">
          <div class="finder-gal-name">${active.title}</div>
          <div class="finder-gal-sub muted">${m.kindLabel} · ${m.size} · ${m.date}</div>
        </div>
      </div>
      <div class="finder-gal-strip">${strip}</div>
    </div>`;
  }

  function finderContentHTML(files, view, emptyOpts) {
    const list = files || [];
    if (list.length === 0) {
      const t = (emptyOpts && emptyOpts.emptyTitle) || 'Folder is Empty';
      const s = (emptyOpts && emptyOpts.emptySub) || 'No items to show.';
      return `<div class="finder-empty" id="finder-list"><div class="empty-title">${t}</div><div class="muted">${s}</div></div>`;
    }
    if (view === 'list') {
      return `<div class="finder-list-view" id="finder-list" data-view="list">
        <div class="finder-list-head">
          <span class="fl-name">Name</span>
          <span class="fl-date">Date Modified</span>
          <span class="fl-size">Size</span>
          <span class="fl-kind">Kind</span>
        </div>
        <div class="finder-list-body">${list.map(finderListRow).join('')}</div>
      </div>`;
    }
    if (view === 'columns') {
      /* Two columns: current folder + preview of selected */
      const first = list[0] || { title: '', kind: 'doc' };
      const preview =
        first.kind === 'folder'
          ? `<div class="finder-col-item muted"><span class="fc-title">—</span></div>`
          : `<div class="finder-col-preview">
              <div class="finder-thumb kind-${first.kind || 'doc'}" style="--h:${first.hue || 200}"><div class="finder-thumb-inner"></div></div>
              <div class="fc-preview-name">${first.title}</div>
              <div class="fc-preview-sub muted">${finderMeta(first, 0).kindLabel}</div>
            </div>`;
      return `<div class="finder-columns" id="finder-list" data-view="columns">
        <div class="finder-col">
          <div class="finder-col-scroll">${finderColumnItems(list)}</div>
        </div>
        <div class="finder-col finder-col-detail">
          <div class="finder-col-scroll">${preview}</div>
        </div>
        <div class="finder-col finder-col-empty"></div>
      </div>`;
    }
    if (view === 'gallery') return finderGalleryHTML(list);
    /* icons (default) */
    return `<div class="finder-icon-grid" id="finder-list" data-view="icons">${list.map(finderThumb).join('')}</div>`;
  }

  function finderCrumbs(crumbs) {
    const parts = crumbs || [];
    const crumbNav = {
      'Macintosh HD': 'drive',
      Users: 'home',
      User: 'home',
      Desktop: 'desktop',
      Documents: 'docs',
      Downloads: 'down',
      Applications: 'apps',
      Movies: 'movies',
      Music: 'music',
      Pictures: 'pictures',
      'iCloud Drive': 'icloud',
      AirDrop: 'airdrop',
      Network: 'network',
      Trash: 'trash',
      Public: 'public',
      Library: 'library',
    };
    return parts
      .map((c, i) => {
        const last = i === parts.length - 1;
        const nav = crumbNav[c] || '';
        return `<button type="button" class="crumb${last ? ' is-current' : ''}" data-crumb-nav="${nav}" ${last ? 'disabled' : ''}>
          <span class="crumb-folder" aria-hidden="true"></span>${c}
        </button>${last ? '' : '<span class="crumb-sep">›</span>'}`;
      })
      .join('');
  }

  const TB_SVG = {
    icons: '<svg viewBox="0 0 18 18" width="14" height="14" fill="currentColor"><rect x="2" y="2" width="5" height="5" rx="1"/><rect x="11" y="2" width="5" height="5" rx="1"/><rect x="2" y="11" width="5" height="5" rx="1"/><rect x="11" y="11" width="5" height="5" rx="1"/></svg>',
    list: '<svg viewBox="0 0 18 18" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6 4.5h10M6 9h10M6 13.5h10"/><circle cx="3.2" cy="4.5" r="1" fill="currentColor" stroke="none"/><circle cx="3.2" cy="9" r="1" fill="currentColor" stroke="none"/><circle cx="3.2" cy="13.5" r="1" fill="currentColor" stroke="none"/></svg>',
    columns: '<svg viewBox="0 0 18 18" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="2.5" width="4" height="13" rx="0.8"/><rect x="7" y="2.5" width="4" height="13" rx="0.8"/><rect x="12" y="2.5" width="4" height="13" rx="0.8"/></svg>',
    gallery: '<svg viewBox="0 0 18 18" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="2" width="14" height="9" rx="1.2"/><rect x="3.5" y="13" width="2.2" height="2.2" rx="0.4"/><rect x="7.9" y="13" width="2.2" height="2.2" rx="0.4"/><rect x="12.3" y="13" width="2.2" height="2.2" rx="0.4"/></svg>',
    view: '<svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="2" y="2" width="6" height="6" rx="1"/><rect x="12" y="2" width="6" height="6" rx="1"/><rect x="2" y="12" width="6" height="6" rx="1"/><rect x="12" y="12" width="6" height="6" rx="1"/></svg>',
    group: '<svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 5h14M3 10h10M3 15h12"/><path d="M15 8l2 2-2 2"/></svg>',
    share: '<svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M10 12V3M7 6l3-3 3 3"/><path d="M4 11v5a1 1 0 001 1h10a1 1 0 001-1v-5"/></svg>',
    tag: '<svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 10.5V4a1 1 0 011-1h6.5L17 10.5 10.5 17 3 10.5z"/><circle cx="7.5" cy="7.5" r="1.2" fill="currentColor"/></svg>',
    more: '<svg viewBox="0 0 20 20" width="15" height="15" fill="currentColor"><circle cx="5" cy="10" r="1.4"/><circle cx="10" cy="10" r="1.4"/><circle cx="15" cy="10" r="1.4"/></svg>',
    search: '<svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="8.5" cy="8.5" r="5"/><path d="M12.5 12.5L17 17" stroke-linecap="round"/></svg>',
  };

  function finderSidebarHTML(active) {
    /* Favorites = standard macOS items only */
    const fav = [
      { id: 'apps', label: 'Applications', icon: SF.apps },
      { id: 'desktop', label: 'Desktop', icon: SF.desktop },
      { id: 'docs', label: 'Documents', icon: SF.docs },
      { id: 'down', label: 'Downloads', icon: SF.down },
      { id: 'pictures', label: 'Pictures', icon: SF.folder },
      { id: 'music', label: 'Music', icon: SF.folder },
      { id: 'movies', label: 'Movies', icon: SF.folder },
    ];
    const loc = [
      { id: 'icloud', label: 'iCloud Drive', icon: SF.cloud },
      { id: 'home', label: 'User', icon: SF.home },
      { id: 'drive', label: 'Macintosh HD', icon: SF.drive },
      { id: 'airdrop', label: 'AirDrop', icon: SF.airdrop },
      { id: 'network', label: 'Network', icon: SF.net },
      { id: 'trash', label: 'Trash', icon: SF.trash },
    ];
    const row = (it) =>
      `<div class="finder-sb-item ${it.id === active ? 'active' : ''}" data-nav="${it.id}">
        <span class="finder-sb-icon">${it.icon}</span><span class="finder-sb-label">${it.label}</span>
      </div>`;
    return `<aside class="finder-sidebar">
      <div class="finder-sb-traffic-space" aria-hidden="true"></div>
      <div class="finder-sb-heading favorites-head">Favorites</div>
      <div class="finder-sb-section">${fav.map(row).join('')}</div>
      <div class="finder-sb-heading">Locations</div>
      <div class="finder-sb-section">${loc.map(row).join('')}</div>
      <div class="finder-sb-heading">Tags</div>
      <div class="finder-sb-section">
        <div class="finder-sb-item"><span class="tag-dot red"></span><span class="finder-sb-label">Red</span></div>
        <div class="finder-sb-item"><span class="tag-dot orange"></span><span class="finder-sb-label">Orange</span></div>
        <div class="finder-sb-item"><span class="tag-dot yellow"></span><span class="finder-sb-label">Yellow</span></div>
        <div class="finder-sb-item"><span class="tag-dot green"></span><span class="finder-sb-label">Green</span></div>
        <div class="finder-sb-item"><span class="tag-dot blue"></span><span class="finder-sb-label">Blue</span></div>
        <div class="finder-sb-item"><span class="tag-dot purple"></span><span class="finder-sb-label">Purple</span></div>
        <div class="finder-sb-item"><span class="tag-dot gray"></span><span class="finder-sb-label">Gray</span></div>
      </div>
    </aside>`;
  }

  function finderMainHTML(loc, view) {
    const files = loc.files || [];
    const v = view || 'icons';
    const content = finderContentHTML(files, v, loc);
    const viewBtns = [
      { id: 'icons', title: 'as Icons', svg: TB_SVG.icons },
      { id: 'list', title: 'as List', svg: TB_SVG.list },
      { id: 'columns', title: 'as Columns', svg: TB_SVG.columns },
      { id: 'gallery', title: 'as Gallery', svg: TB_SVG.gallery },
    ]
      .map(
        (b) =>
          `<button type="button" class="tb-view-btn${b.id === v ? ' is-active' : ''}" data-view="${b.id}" title="${b.title}" aria-label="${b.title}" aria-pressed="${b.id === v}">${b.svg}</button>`
      )
      .join('');
    return `<div class="finder-main" data-finder-view="${v}">
      <div class="finder-toolbar" data-drag-region data-drag-handle>
        <div class="finder-tb-left">
          <div class="tb-capsule nav" role="group" aria-label="History">
            <button type="button" class="tb-seg" aria-label="Back">
              <svg viewBox="0 0 12 12" width="12" height="12"><path d="M8 2L3 6l5 4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </button>
            <button type="button" class="tb-seg" aria-label="Forward">
              <svg viewBox="0 0 12 12" width="12" height="12"><path d="M4 2l5 4-5 4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </button>
          </div>
          <div class="tb-title-pill" id="finder-title">${loc.title}</div>
        </div>
        <div class="finder-tb-right">
          <div class="tb-view-group" role="group" aria-label="View mode">${viewBtns}</div>
          <button type="button" class="tb-glass-btn" title="Group" aria-label="Group">${TB_SVG.group}</button>
          <button type="button" class="tb-glass-btn" title="Share" aria-label="Share">${TB_SVG.share}</button>
          <button type="button" class="tb-glass-btn" title="Tags" aria-label="Tags">${TB_SVG.tag}</button>
          <button type="button" class="tb-glass-btn" title="More" aria-label="More">${TB_SVG.more}</button>
          <label class="finder-search-wrap">
            <span class="finder-search-ico" aria-hidden="true">${TB_SVG.search}</span>
            <input type="search" class="finder-search" id="finder-search" placeholder="Search" autocomplete="off" />
          </label>
        </div>
      </div>
      <div class="finder-content" id="finder-content">${content}</div>
      <div class="finder-pathbar" id="finder-pathbar">${finderCrumbs(loc.crumbs)}</div>
      <div class="finder-statusbar" id="finder-statusbar"><span class="finder-status-count">${files.length} item${files.length === 1 ? '' : 's'}</span></div>
    </div>`;
  }

  register({
    id: 'finder',
    name: 'Finder',
    category: 'System',
    dock: true,
    width: 980,
    height: 640,
    open() {
      const loc = FINDER_LOCATIONS.desktop;
      return `<div class="finder-app" id="finder-app" data-view="icons">
        ${finderSidebarHTML('desktop')}
        ${finderMainHTML(loc, 'icons')}
      </div>`;
    },
    onMount(el) {
      let currentNav = 'desktop';
      let currentView = 'icons';
      const history = ['desktop'];
      let histIdx = 0;

      const wireSelection = (root) => {
        const sel =
          '.finder-icon-item, .finder-list-row, .finder-col-item, .finder-gal-thumb';
        root.querySelectorAll(sel).forEach((item) => {
          item.addEventListener('click', () => {
            root.querySelectorAll(sel).forEach((x) => x.classList.remove('is-selected'));
            item.classList.add('is-selected');
            /* Gallery: update hero when strip thumb clicked */
            if (item.classList.contains('finder-gal-thumb')) {
              const loc = FINDER_LOCATIONS[currentNav];
              const idx = Number(item.getAttribute('data-file'));
              const f = loc && loc.files && loc.files[idx];
              if (!f) return;
              const hero = root.querySelector('.finder-gal-hero');
              const name = root.querySelector('.finder-gal-name');
              const sub = root.querySelector('.finder-gal-sub');
              if (hero) {
                hero.className = `finder-gal-hero kind-${f.kind || 'doc'}`;
                hero.style.setProperty('--h', String(f.hue != null ? f.hue : idx * 37));
              }
              if (name) name.textContent = f.title;
              if (sub) {
                const m = finderMeta(f, idx);
                sub.textContent = `${m.kindLabel} · ${m.size} · ${m.date}`;
              }
            }
          });
        });
      };

      let searchQuery = '';

      const renderContent = () => {
        const loc = FINDER_LOCATIONS[currentNav];
        if (!loc) return;
        const content = el.querySelector('#finder-content');
        const main = el.querySelector('.finder-main');
        let files = loc.files || [];
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          files = files.filter((f) => (f.title || '').toLowerCase().indexOf(q) !== -1);
        }
        if (content) {
          content.innerHTML = finderContentHTML(files, currentView, loc);
          content.classList.add('is-ready');
          setTimeout(() => content.classList.remove('is-ready'), 160);
        }
        if (main) main.setAttribute('data-finder-view', currentView);
        el.setAttribute('data-view', currentView);
        const status = el.querySelector('#finder-statusbar .finder-status-count');
        if (status) {
          status.textContent =
            `${files.length} item${files.length === 1 ? '' : 's'}` +
            (searchQuery ? ' found' : '');
        }
        el.querySelectorAll('.tb-view-btn').forEach((b) => {
          const on = b.getAttribute('data-view') === currentView;
          b.classList.toggle('is-active', on);
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        wireSelection(el);
      };

      const show = (id, pushHist) => {
        const loc = FINDER_LOCATIONS[id];
        if (!loc) return;
        currentNav = id;
        if (pushHist !== false) {
          history.splice(histIdx + 1);
          if (history[histIdx] !== id) {
            history.push(id);
            histIdx = history.length - 1;
          }
        }
        el.querySelectorAll('.finder-sb-item[data-nav]').forEach((n) => {
          n.classList.toggle('active', n.getAttribute('data-nav') === id);
        });
        const title = el.querySelector('#finder-title');
        if (title) title.textContent = loc.title;
        const pathbar = el.querySelector('#finder-pathbar');
        if (pathbar) {
          pathbar.innerHTML = finderCrumbs(loc.crumbs);
          pathbar.querySelectorAll('[data-crumb-nav]').forEach((crumb) => {
            crumb.addEventListener('click', (e) => {
              e.stopPropagation();
              const nav = crumb.getAttribute('data-crumb-nav');
              if (nav && FINDER_LOCATIONS[nav]) show(nav);
            });
          });
        }
        const status = el.querySelector('#finder-statusbar .finder-status-count');
        if (status) {
          const n = (loc.files || []).length;
          status.textContent = n + ' item' + (n === 1 ? '' : 's');
        }
        renderContent();
      };

      const folderNavMap = {
        Applications: 'apps',
        Desktop: 'desktop',
        Documents: 'docs',
        Downloads: 'down',
        Movies: 'movies',
        Music: 'music',
        Pictures: 'pictures',
        Funny: 'funny',
        'iCloud Drive': 'icloud',
        User: 'home',
        Users: 'home',
        'Macintosh HD': 'drive',
        AirDrop: 'airdrop',
        Network: 'network',
        Trash: 'trash',
        Public: 'public',
        Library: 'library',
        Photos: 'pictures',
        'Photos Library': 'pictures',
        Pages: 'docs',
        Numbers: 'docs',
        Keynote: 'docs',
        TV: 'movies',
        'Home Videos': 'movies',
      };

      const appOpenMap = {
        Safari: 'safari',
        Mail: 'mail',
        Messages: 'messages',
        Photos: 'photos',
        Music: 'music',
        Calendar: 'calendar',
        Notes: 'notes',
        Terminal: 'terminal',
        Maps: 'maps',
        'System Settings': 'system-settings',
        Settings: 'system-settings',
        Calculator: 'calculator',
        Preview: 'preview',
        TextEdit: 'textedit',
        Dictionary: 'dictionary',
        Clock: 'clock',
        Weather: 'weather',
        Home: 'home',
        Books: 'books',
        News: 'news',
        Stocks: 'stocks',
        'Voice Memos': 'voice-memos',
        Freeform: 'freeform',
        Finder: 'finder',
        TV: 'tv',
        Podcasts: 'podcasts',
        AppStore: 'appstore',
        'App Store': 'appstore',
        FaceTime: 'facetime',
        Contacts: 'contacts',
        Reminders: 'reminders',
        Keynote: 'keynote',
        Pages: 'pages',
        Numbers: 'numbers',
        Chess: 'chess',
        Siri: 'siri',
      };

      el.querySelectorAll('.finder-sb-item[data-nav]').forEach((item) => {
        item.addEventListener('click', () => show(item.getAttribute('data-nav')));
      });
      el.querySelectorAll('.tb-view-btn').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          currentView = btn.getAttribute('data-view') || 'icons';
          renderContent();
        });
      });
      /* Back / Forward toolbar */
      const backBtn = el.querySelector('.tb-seg[aria-label="Back"]');
      const fwdBtn = el.querySelector('.tb-seg[aria-label="Forward"]');
      if (backBtn) {
        backBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (histIdx > 0) {
            histIdx--;
            show(history[histIdx], false);
          }
        });
      }
      if (fwdBtn) {
        fwdBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (histIdx < history.length - 1) {
            histIdx++;
            show(history[histIdx], false);
          }
        });
      }
      /* Double-click folders / apps */
      el.addEventListener('dblclick', (e) => {
        const item = e.target.closest(
          '.finder-icon-item, .finder-list-row, .finder-col-item, .finder-gal-thumb'
        );
        if (!item) return;
        const label =
          item.querySelector('.finder-label, .fl-title, .fc-title, .finder-gal-label') ||
          item;
        const name = (label.textContent || '').trim();
        if (folderNavMap[name] && FINDER_LOCATIONS[folderNavMap[name]]) {
          show(folderNavMap[name]);
          if (global.MacSounds && MacSounds.play) MacSounds.play('pop');
          return;
        }
        const base = name.replace(/\.app$/i, '');
        if (appOpenMap[base] && global.MacShell && MacShell.openApp) {
          MacShell.openApp(appOpenMap[base]);
          if (global.MacSounds && MacSounds.play) MacSounds.play('pop');
          return;
        }
        if (/\.pdf$/i.test(name) && global.MacShell) {
          MacShell.openApp('preview');
        } else if (/\.(png|jpe?g|gif)$/i.test(name) && global.MacShell) {
          MacShell.openApp('photos');
        } else if (/\.(mp4|mov)$/i.test(name) && global.MacShell) {
          MacShell.openApp('quicktime');
        } else if (/\.(txt|rtf|md)$/i.test(name) && global.MacShell) {
          MacShell.openApp('textedit');
        } else if (/\.dmg$/i.test(name) && global.MacShell && MacShell.notify) {
          MacShell.notify('Finder', 'Disk Image', name + ' (demo mount)', 'now');
        }
      });
      /* Keyboard shortcuts ⌘1–4 style (without meta for demo) */
      el.addEventListener('keydown', (e) => {
        if (!(e.metaKey || e.ctrlKey)) return;
        const map = { '1': 'icons', '2': 'list', '3': 'columns', '4': 'gallery' };
        if (map[e.key]) {
          e.preventDefault();
          currentView = map[e.key];
          renderContent();
        }
      });
      /* Expose show for shell menu Go commands */
      el._finderShow = show;
      document.addEventListener('finder:empty-trash', () => {
        if (FINDER_LOCATIONS.trash) FINDER_LOCATIONS.trash.files = [];
        if (currentNav === 'trash') show('trash', false);
      });
      const searchInput = el.querySelector('#finder-search');
      if (searchInput) {
        searchInput.addEventListener('input', () => {
          searchQuery = searchInput.value.trim();
          renderContent();
        });
        searchInput.addEventListener('keydown', (e) => {
          e.stopPropagation();
        });
      }
      wireSelection(el);
    },
  });

  register({
    id: 'safari',
    name: 'Safari',
    category: 'Internet',
    dock: true,
    width: 1020,
    height: 700,
    open() {
      /* Generic public favorites only — design match, not personal history */
      const favorites = [
        { name: 'Apple', bg: 'linear-gradient(160deg,#fbfbfd 0%,#d2d2d7 100%)', fg: '#1d1d1f', glyph: '' },
        { name: 'iCloud', bg: 'linear-gradient(160deg,#64d2ff,#0a84ff)', fg: '#fff', glyph: '☁' },
        { name: 'Wikipedia', bg: 'linear-gradient(160deg,#ffffff,#e8e8ed)', fg: '#000', glyph: 'W' },
        { name: 'GitHub', bg: 'linear-gradient(160deg,#24292f,#0d1117)', fg: '#fff', glyph: 'GH' },
        { name: 'Weather', bg: 'linear-gradient(160deg,#5ac8fa 0%,#007aff 55%,#5856d6 100%)', fg: '#fff', glyph: '☀' },
        { name: 'News', bg: 'linear-gradient(160deg,#ff453a,#c41e16)', fg: '#fff', glyph: 'N' },
        { name: 'Google', bg: 'linear-gradient(160deg,#ffffff,#e8eaed)', fg: '#4285f4', glyph: 'G' },
        { name: 'YouTube', bg: 'linear-gradient(160deg,#ff2d55,#c4001d)', fg: '#fff', glyph: '▶' },
        { name: 'Maps', bg: 'linear-gradient(160deg,#30d158,#248a3d)', fg: '#fff', glyph: '⌖' },
        { name: 'Bing', bg: 'linear-gradient(160deg,#3aa0ff,#0066cc)', fg: '#fff', glyph: 'B' },
        { name: 'X', bg: 'linear-gradient(160deg,#1d9bf0,#0c7abf)', fg: '#fff', glyph: '𝕏' },
        { name: 'LinkedIn', bg: 'linear-gradient(160deg,#0a66c2,#004182)', fg: '#fff', glyph: 'in' },
        { name: 'Reddit', bg: 'linear-gradient(160deg,#ff4500,#c23700)', fg: '#fff', glyph: '◉' },
        { name: 'NYT', bg: 'linear-gradient(160deg,#121212,#2a2a2a)', fg: '#fff', glyph: 'T' },
        { name: 'BBC', bg: 'linear-gradient(160deg,#bb1919,#8b0000)', fg: '#fff', glyph: 'b' },
        { name: 'App Store', bg: 'linear-gradient(160deg,#0a84ff,#5e5ce6)', fg: '#fff', glyph: 'A' },
      ];
      const favHTML = favorites
        .map(
          (f) =>
            `<button type="button" class="safari-fav" title="${f.name}">
              <span class="safari-fav-icon" style="background:${f.bg};color:${f.fg}"><span class="safari-fav-glyph">${f.glyph}</span></span>
              <span class="safari-fav-name">${f.name}</span>
            </button>`
        )
        .join('');

      const readingList = [
        { title: 'Introducing Liquid Glass', site: 'apple.com', tint: '#0a84ff' },
        { title: 'How privacy works in Safari', site: 'support.apple.com', tint: '#30d158' },
        { title: 'WebKit Features in Safari 18', site: 'webkit.org', tint: '#5856d6' },
      ];
      const readingHTML = readingList
        .map(
          (r) =>
            `<button type="button" class="safari-read-item">
              <span class="safari-read-thumb" style="background:${r.tint}"></span>
              <span class="safari-read-meta">
                <span class="safari-read-title">${r.title}</span>
                <span class="safari-read-site">${r.site}</span>
              </span>
            </button>`
        )
        .join('');

      const recentlyClosed = [
        { name: 'developer.apple.com', glyph: '', bg: '#1d1d1f' },
        { name: 'wikipedia.org', glyph: 'W', bg: '#444' },
        { name: 'github.com', glyph: 'GH', bg: '#24292f' },
        { name: 'weather.gov', glyph: '☀', bg: '#007aff' },
      ];
      const closedHTML = recentlyClosed
        .map(
          (c) =>
            `<button type="button" class="safari-closed-item">
              <span class="safari-closed-icon" style="background:${c.bg}">${c.glyph}</span>
              <span class="safari-closed-name">${c.name}</span>
            </button>`
        )
        .join('');

      return `<div class="safari-app" id="safari-app">
        <div class="safari-chrome">
          <div class="safari-toolbar" data-drag-region data-drag-handle>
            <div class="safari-tb-left">
              <button type="button" class="safari-tb-btn" title="Show Sidebar" aria-label="Sidebar">
                <svg viewBox="0 0 18 14" width="15" height="12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="1.25" y="1.25" width="15.5" height="11.5" rx="2"/><path d="M6.25 1.25v11.5"/></svg>
              </button>
              <div class="safari-nav-capsule" role="group" aria-label="History">
                <button type="button" class="safari-nav-seg is-disabled" aria-label="Back" disabled>
                  <svg viewBox="0 0 12 12" width="11" height="11"><path d="M8 2L3 6l5 4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </button>
                <button type="button" class="safari-nav-seg is-disabled" aria-label="Forward" disabled>
                  <svg viewBox="0 0 12 12" width="11" height="11"><path d="M4 2l5 4-5 4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </button>
              </div>
            </div>
            <div class="safari-urlbar" role="search">
              <span class="safari-url-lock" aria-hidden="true">
                <svg viewBox="0 0 12 14" width="11" height="12" fill="none"><rect x="2" y="6" width="8" height="6.5" rx="1.4" stroke="currentColor" stroke-width="1.3"/><path d="M4 6V4.2a2 2 0 014 0V6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
              </span>
              <input type="text" class="safari-url-input" placeholder="Search or enter website name" spellcheck="false" autocomplete="off" />
              <button type="button" class="safari-url-refresh" title="Reload" aria-label="Reload">
                <svg viewBox="0 0 14 14" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M12 7A5 5 0 1 1 9.5 2.5"/><path d="M9.5 1v2.2H11.8"/></svg>
              </button>
            </div>
            <div class="safari-tb-right">
              <button type="button" class="safari-tb-btn" title="Share" aria-label="Share">
                <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round"><path d="M8 10V2.5M5.2 4.8L8 2l2.8 2.8"/><path d="M3 9.2v3.3a1.2 1.2 0 001.2 1.2h7.6A1.2 1.2 0 0013 12.5V9.2"/></svg>
              </button>
              <button type="button" class="safari-tb-btn" title="New Tab" aria-label="New Tab">
                <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M8 3.2v9.6M3.2 8h9.6"/></svg>
              </button>
              <button type="button" class="safari-tb-btn" title="Show all tabs" aria-label="Show all tabs">
                <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.35"><rect x="1.8" y="2.8" width="8.2" height="7" rx="1.2"/><rect x="5.8" y="5.8" width="8.2" height="7" rx="1.2"/></svg>
              </button>
            </div>
          </div>
          <div class="safari-tabstrip" aria-label="Tabs">
            <div class="safari-tab is-active">
              <span class="safari-tab-favicon" aria-hidden="true">🧭</span>
              <span class="safari-tab-title">Start Page</span>
              <button type="button" class="safari-tab-close" aria-label="Close tab">
                <svg viewBox="0 0 10 10" width="8" height="8"><path d="M2 2l6 6M8 2L2 8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
              </button>
            </div>
            <button type="button" class="safari-tab-add" title="New Tab" aria-label="New Tab">
              <svg viewBox="0 0 12 12" width="10" height="10"><path d="M6 2v8M2 6h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
            </button>
          </div>
        </div>
        <div class="safari-startpage">
          <div class="safari-start-inner">
            <div class="safari-banner">
              <button type="button" class="safari-banner-close" aria-label="Dismiss">
                <svg viewBox="0 0 10 10" width="9" height="9"><path d="M2 2l6 6M8 2L2 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
              </button>
              <div class="safari-banner-art" aria-hidden="true">
                <div class="safari-banner-card c1"></div>
                <div class="safari-banner-card c2"></div>
              </div>
              <div class="safari-banner-copy">
                <h2>Start Page</h2>
                <p>Customize your wallpaper and sections that appear when creating new tabs.</p>
                <button type="button" class="safari-banner-cta">Customize Start Page</button>
              </div>
            </div>

            <section class="safari-section">
              <h3 class="safari-section-title">Favorites</h3>
              <div class="safari-fav-grid">${favHTML}</div>
            </section>

            <section class="safari-section">
              <div class="safari-section-head">
                <h3 class="safari-section-title">Privacy Report</h3>
                <span class="safari-section-period">Last 30 days</span>
              </div>
              <div class="safari-privacy">
                <div class="safari-privacy-left">
                  <div class="safari-shield" aria-hidden="true">
                    <svg viewBox="0 0 48 56" width="44" height="52">
                      <defs>
                        <linearGradient id="safari-shield-g" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stop-color="#34c759"/>
                          <stop offset="100%" stop-color="#30d158"/>
                        </linearGradient>
                      </defs>
                      <path fill="url(#safari-shield-g)" d="M24 2L4 12v16c0 14 8.5 24 20 26 11.5-2 20-12 20-26V12L24 2z"/>
                      <path fill="#fff" opacity=".18" d="M24 14l-10 5v8c0 7 4.2 12 10 13 5.8-1 10-6 10-13v-8l-10-5z"/>
                      <path fill="none" stroke="#fff" stroke-width="2.2" opacity=".95" d="M24 4.5L6 13.5v14c0 12.5 7.5 21.5 18 23.5 10.5-2 18-11 18-23.5v-14L24 4.5z"/>
                      <path fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" d="M16.5 28l5 5 10-11"/>
                    </svg>
                  </div>
                  <p class="safari-privacy-blurb">Safari prevents trackers from profiling you.</p>
                </div>
                <div class="safari-privacy-stats">
                  <div class="safari-stat-row">
                    <div class="safari-stat-card">
                      <div class="safari-stat-label">Trackers prevented from profiling you</div>
                      <div class="safari-stat-value">42</div>
                    </div>
                    <div class="safari-stat-card">
                      <div class="safari-stat-label">Websites that contacted trackers</div>
                      <div class="safari-stat-value">18%</div>
                    </div>
                  </div>
                  <div class="safari-stat-card wide">
                    <div class="safari-stat-label">Most contacted tracker</div>
                    <div class="safari-stat-detail">example-tracker.com was prevented from profiling you on 6 websites</div>
                  </div>
                </div>
                <button type="button" class="safari-privacy-edit">Edit</button>
              </div>
            </section>

            <div class="safari-bottom-row">
              <section class="safari-section safari-section-half">
                <h3 class="safari-section-title">Reading List</h3>
                <div class="safari-reading-list">${readingHTML}</div>
              </section>
              <section class="safari-section safari-section-half">
                <h3 class="safari-section-title">Recently Closed</h3>
                <div class="safari-closed-list">${closedHTML}</div>
              </section>
            </div>
          </div>
        </div>
      </div>`;
    },
    onMount(el) {
      const close = el.querySelector('.safari-banner-close');
      if (close) {
        close.addEventListener('click', () => {
          const b = el.querySelector('.safari-banner');
          if (b) b.remove();
        });
      }
      const remount = () => {
        if (global.AppRegistry) {
          const app = AppRegistry.get('safari');
          if (app && global.WindowManager) {
            const win = WindowManager.getWindowByAppId && WindowManager.getWindowByAppId('safari');
            if (win && win.el) {
              const body = win.el.querySelector('.window-content');
              if (body) {
                body.innerHTML = app.open();
                if (app.onMount) app.onMount(body);
              }
            }
          }
        }
      };
      const input = el.querySelector('.safari-url-input');
      if (input) {
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' && input.value.trim()) {
            input.blur();
            const page = el.querySelector('.safari-startpage');
            const tabTitle = el.querySelector('.safari-tab-title');
            const safe = input.value.replace(/</g, '').trim();
            if (tabTitle) tabTitle.textContent = safe.length > 28 ? safe.slice(0, 28) + '…' : safe;
            if (page) {
              page.innerHTML = `<div class="safari-nav-sim">
                <div class="safari-nav-sim-icon" aria-hidden="true">🔍</div>
                <div class="safari-nav-sim-title">Searching</div>
                <p class="safari-nav-sim-query">“${safe}”</p>
                <p class="safari-nav-sim-note">This is a simulated Safari start page. Web navigation is not live.</p>
                <button type="button" class="safari-banner-cta" id="safari-back-start">Back to Start Page</button>
              </div>`;
              const back = page.querySelector('#safari-back-start');
              if (back) back.addEventListener('click', remount);
            }
          }
        });
      }
      el.querySelectorAll('.safari-tab-add, .safari-tb-btn[title="New Tab"]').forEach((btn) => {
        btn.addEventListener('click', remount);
      });
    },
  });

  register({
    id: 'mail',
    name: 'Mail',
    category: 'Internet',
    dock: true,
    width: 980,
    height: 640,
    open() {
      /* Generic sample mail only - no personal data */
      const folders = [
        { name: 'Inbox', count: 3, icon: 'tray' },
        { name: 'VIP', count: 0, icon: 'star' },
        { name: 'Flagged', count: 1, icon: 'flag' },
        { name: 'Sent', count: 0, icon: 'sent' },
        { name: 'Drafts', count: 1, icon: 'draft' },
        { name: 'Junk', count: 2, icon: 'junk' },
        { name: 'Trash', count: 0, icon: 'trash' },
        { name: 'Archive', count: 0, icon: 'archive' },
      ];
      const msgs = [
        {
          from: 'App Store',
          email: 'noreply@email.apple.com',
          subject: 'Your receipt from the App Store',
          preview: 'Order ID: W123456789 · Thanks for your purchase.',
          date: '9:41 AM',
          unread: true,
          selected: true,
        },
        {
          from: 'News Digest',
          email: 'digest@example.com',
          subject: 'Your morning briefing',
          preview: 'Top stories today: weather, tech, and weekend plans.',
          date: '8:15 AM',
          unread: true,
        },
        {
          from: 'Calendar',
          email: 'calendar-noreply@example.com',
          subject: 'Invitation: Project sync',
          preview: 'Tomorrow at 10:00 AM · Conference Room A',
          date: 'Yesterday',
          unread: true,
        },
        {
          from: 'Cloud Storage',
          email: 'notify@example.com',
          subject: 'Your backup completed',
          preview: 'All files are up to date. Next backup in 24 hours.',
          date: 'Yesterday',
          unread: false,
        },
        {
          from: 'Photos',
          email: 'photos@example.com',
          subject: 'New shared album invitation',
          preview: 'You have been invited to "Summer Trip 2026".',
          date: 'Mon',
          unread: false,
        },
        {
          from: 'Support',
          email: 'help@example.com',
          subject: 'Your ticket has been updated',
          preview: 'Case #45821 is now marked as Resolved.',
          date: 'Sun',
          unread: false,
        },
        {
          from: 'Newsletter',
          email: 'weekly@example.com',
          subject: 'This week in design',
          preview: 'Glass materials, spatial UI, and more.',
          date: 'Jul 12',
          unread: false,
        },
        {
          from: 'Shipping',
          email: 'ship@example.com',
          subject: 'Package delivered',
          preview: 'Your order was left at the front door.',
          date: 'Jul 10',
          unread: false,
        },
      ];
      const selected = msgs.find((m) => m.selected) || msgs[0];
      return `<div class="mail27-app">
        <div class="mail27-toolbar" data-drag-region data-drag-handle>
          <div class="mail27-tb-left">
            <button type="button" class="mail27-tb" title="Get Mail">
              <span class="mail27-tb-ico" aria-hidden="true">↓</span> Get Mail
            </button>
            <button type="button" class="mail27-tb primary" title="New Message">
              <span class="mail27-tb-ico" aria-hidden="true">✎</span> New Message
            </button>
            <span class="mail27-tb-sep" aria-hidden="true"></span>
            <button type="button" class="mail27-tb icon" title="Archive" aria-label="Archive">▢</button>
            <button type="button" class="mail27-tb icon" title="Trash" aria-label="Trash">⌫</button>
            <button type="button" class="mail27-tb icon" title="Reply" aria-label="Reply">↩</button>
            <button type="button" class="mail27-tb icon" title="Flag" aria-label="Flag">⚑</button>
          </div>
          <span class="mail27-tb-spacer"></span>
          <div class="mail27-search-wrap">
            <span class="mail27-search-ico" aria-hidden="true">⌕</span>
            <input class="mail27-search" type="search" placeholder="Search" />
          </div>
        </div>
        <div class="mail27-body">
          <aside class="mail27-side">
            <div class="mail27-side-label">Favorites</div>
            ${folders
              .map(
                (f, i) =>
                  `<div class="mail27-side-item${i === 0 ? ' active' : ''}" data-folder="${f.name}">
                    <span class="mail27-side-ico mail27-ico-${f.icon}" aria-hidden="true"></span>
                    <span class="mail27-side-name">${f.name}</span>
                    ${f.count ? `<span class="mail27-side-count">${f.count}</span>` : ''}
                  </div>`
              )
              .join('')}
          </aside>
          <div class="mail27-list">
            <div class="mail27-list-head">
              <span class="mail27-list-title">Inbox</span>
              <span class="mail27-list-meta">${msgs.filter((m) => m.unread).length} Unread</span>
            </div>
            ${msgs
              .map(
                (m) =>
                  `<div class="mail27-row${m.selected ? ' selected' : ''}${m.unread ? ' unread' : ''}" data-folder="Inbox">
                    <span class="mail27-dot" aria-hidden="true"></span>
                    <div class="mail27-row-main">
                      <div class="mail27-row-top">
                        <span class="mail27-from">${m.from}</span>
                        <span class="mail27-date">${m.date}</span>
                      </div>
                      <div class="mail27-subject">${m.subject}</div>
                      <div class="mail27-preview">${m.preview}</div>
                    </div>
                  </div>`
              )
              .join('')}
          </div>
          <div class="mail27-read">
            <div class="mail27-read-head">
              <h2 class="mail27-read-subject">${selected.subject}</h2>
              <div class="mail27-read-meta">
                <div class="mail27-read-from">
                  <span class="mail27-read-avatar">${selected.from[0]}</span>
                  <div>
                    <div class="mail27-read-name">${selected.from}</div>
                    <div class="mail27-read-email">&lt;${selected.email}&gt;</div>
                  </div>
                </div>
                <div class="mail27-read-date">Today ${selected.date}</div>
              </div>
              <div class="mail27-read-to">To: Me</div>
            </div>
            <div class="mail27-content">
              <p>Hello,</p>
              <p>Thanks for your purchase. This is a sample receipt for a free app download from the App Store.</p>
              <p><strong>Order ID:</strong> W123456789<br/>
              <strong>Item:</strong> Sample App<br/>
              <strong>Price:</strong> Free</p>
              <p>You can view purchase history anytime in Settings.</p>
              <p class="mail27-signoff">- App Store</p>
            </div>
          </div>
        </div>
      </div>`;
    },
  });

  register({
    id: 'messages',
    name: 'Messages',
    category: 'Internet',
    dock: true,
    width: 860,
    height: 600,
    open() {
      /* Generic sample conversations only - no personal names */
      const convos = [
        { name: 'Family', preview: 'See you tonight!', time: '9:41 AM', unread: 0, active: true, hue: 210 },
        { name: 'Work Group', preview: 'Sounds good - sending the deck.', time: 'Yesterday', unread: 2, active: false, hue: 280 },
        { name: 'Project Team', preview: 'Standup moved to 10:30.', time: 'Yesterday', unread: 0, active: false, hue: 160 },
        { name: 'Delivery Updates', preview: 'Your package is out for delivery.', time: 'Mon', unread: 1, active: false, hue: 30 },
        { name: 'Book Club', preview: 'Chapter 4 this week?', time: 'Sun', unread: 0, active: false, hue: 340 },
        { name: 'Support', preview: 'Your request is closed.', time: 'Jul 12', unread: 0, active: false, hue: 190 },
      ];
      const thread = [
        { who: 'them', text: 'Are you free for dinner this week?', time: 'Yesterday 6:12 PM' },
        { who: 'me', text: 'Yes - Thursday works best.', time: 'Yesterday 6:14 PM' },
        { who: 'them', text: 'Perfect. How about 7 at the usual place?', time: 'Yesterday 6:15 PM' },
        { who: 'me', text: 'Works for me.', time: 'Yesterday 6:18 PM' },
        { who: 'them', text: 'See you tonight!', time: '9:41 AM' },
      ];
      return `<div class="msg27-app">
        <div class="msg27-body">
          <aside class="msg27-sidebar">
            <div class="msg27-side-toolbar" data-drag-region data-drag-handle>
              <div class="msg27-search-wrap">
                <span class="msg27-search-ico" aria-hidden="true">⌕</span>
                <input class="msg27-search" type="search" placeholder="Search" />
              </div>
              <button type="button" class="msg27-compose" title="Compose" aria-label="Compose">
                <span aria-hidden="true">✎</span>
              </button>
            </div>
            <div class="msg27-list" role="list">
              ${convos
                .map(
                  (c) =>
                    `<div class="msg27-convo${c.active ? ' active' : ''}${c.unread ? ' unread' : ''}">
                      <div class="msg27-avatar" style="--msg-hue:${c.hue}">${c.name[0]}</div>
                      <div class="msg27-convo-main">
                        <div class="msg27-convo-top">
                          <span class="msg27-name">${c.name}</span>
                          <span class="msg27-time">${c.time}</span>
                        </div>
                        <div class="msg27-convo-bottom">
                          <span class="msg27-prev">${c.preview}</span>
                          ${c.unread ? `<span class="msg27-badge">${c.unread}</span>` : ''}
                        </div>
                      </div>
                    </div>`
                )
                .join('')}
            </div>
          </aside>
          <div class="msg27-thread">
            <div class="msg27-header" data-drag-region data-drag-handle>
              <div class="msg27-header-avatar" style="--msg-hue:210">F</div>
              <div class="msg27-header-info">
                <div class="msg27-header-name">Family</div>
                <div class="msg27-header-sub">iMessage · Details</div>
              </div>
            </div>
            <div class="msg27-bubbles">
              <div class="msg27-day">Yesterday</div>
              ${thread
                .map((b, i) => {
                  const dayBreak = i === 4 ? `<div class="msg27-day">Today</div>` : '';
                  return `${dayBreak}<div class="msg27-bubble-row ${b.who}">
                    <div class="bubble ${b.who}">${b.text}</div>
                  </div>`;
                })
                .join('')}
            </div>
            <div class="msg27-compose-row">
              <button type="button" class="msg27-plus" title="Apps" aria-label="Apps">+</button>
              <input class="msg27-input" type="text" placeholder="iMessage" />
              <button type="button" class="msg27-send" title="Send" aria-label="Send">
                <span aria-hidden="true">↑</span>
              </button>
            </div>
          </div>
        </div>
      </div>`;
    },
  });

  register({
    id: 'maps',
    name: 'Maps',
    category: 'Travel',
    dock: true,
    width: 920,
    height: 620,
    open() {
      return `<div class="maps27-app">
        <div class="maps27-toolbar">
          <div class="maps27-search-wrap">
            <span class="maps27-search-ico" aria-hidden="true">⌕</span>
            <input class="maps27-search" type="search" placeholder="Search OpenStreetMap…" value="Apple Park" />
            <button type="button" class="maps27-search-clear" aria-label="Clear">✕</button>
          </div>
          <div class="maps27-layers" role="group" aria-label="Map style">
            <button type="button" class="maps27-layer active" data-layer="map" title="OpenStreetMap">Map</button>
            <button type="button" class="maps27-layer" data-layer="satellite" title="Satellite imagery">Satellite</button>
            <button type="button" class="maps27-layer" data-layer="hybrid" title="Satellite + labels">Hybrid</button>
            <button type="button" class="maps27-layer" data-layer="topo" title="OpenTopoMap">Topo</button>
          </div>
          <div class="maps27-modes">
            <button type="button" class="maps27-mode active" title="Drive" data-travel="drive">🚗</button>
            <button type="button" class="maps27-mode" title="Walk" data-travel="walk">🚶</button>
            <button type="button" class="maps27-mode" title="Transit" data-travel="transit">🚇</button>
            <button type="button" class="maps27-mode" title="Ride" data-travel="ride">🚕</button>
          </div>
          <button type="button" class="maps27-btn primary">Directions</button>
        </div>
        <div class="maps27-body">
          <div class="maps27-canvas maps-live" data-layer="map">
            <div id="maps-leaflet" class="maps-leaflet-host" role="application" aria-label="Open map"></div>
            <div class="maps27-controls">
              <button type="button" class="maps27-ctrl" title="Current Location">◎</button>
              <div class="maps27-zoom">
                <button type="button" class="maps27-ctrl" title="Zoom In">+</button>
                <button type="button" class="maps27-ctrl" title="Zoom Out">−</button>
              </div>
            </div>
            <div class="maps27-card">
              <div class="maps27-card-top">
                <div class="maps27-card-thumb" aria-hidden="true"></div>
                <div class="maps27-card-info">
                  <strong>Apple Park</strong>
                  <span class="maps27-card-rating">OpenStreetMap · Leaflet</span>
                  <span class="muted">1 Apple Park Way, Cupertino, CA</span>
                </div>
              </div>
              <div class="maps27-card-actions">
                <button type="button" class="maps27-chip primary">Directions</button>
                <button type="button" class="maps27-chip maps-sat-chip" data-layer="satellite">Satellite</button>
                <button type="button" class="maps27-chip maps-map-chip" data-layer="map">Map</button>
                <a class="maps27-chip maps-osm-link" href="https://www.openstreetmap.org/#map=16/37.3349/-122.0090" target="_blank" rel="noopener">Open OSM</a>
              </div>
              <div class="maps27-card-eta">
                <span class="maps27-eta-dot"></span>
                <span class="maps27-coords">37.3349° N, 122.0090° W · © OpenStreetMap</span>
              </div>
            </div>
          </div>
        </div>
      </div>`;
    },
  });

  register({
    id: 'photos',
    name: 'Photos',
    category: 'Creativity',
    dock: true,
    width: 960,
    height: 640,
    open() {
      /* Generic gradient tiles only - no personal photos */
      const palette = [
        ['#7eb8ff', '#5ac8fa'],
        ['#ff9f7a', '#ff6b6b'],
        ['#a8e6cf', '#56c596'],
        ['#ffd3b6', '#ffb347'],
        ['#c9b1ff', '#9b7ede'],
        ['#f8b4d9', '#ff85a1'],
        ['#bde0fe', '#48cae4'],
        ['#caffbf', '#80ed99'],
        ['#fdffb6', '#fee440'],
        ['#ffc6ff', '#e0aaff'],
        ['#9bf6ff', '#00bbf9'],
        ['#bdb2ff', '#7b2cbf'],
        ['#ffc8dd', '#ffafcc'],
        ['#a0c4ff', '#4cc9f0'],
        ['#b8f2e6', '#2ec4b6'],
        ['#fde2e4', '#f4a261'],
        ['#d0f4de', '#06d6a0'],
        ['#e2ece9', '#83c5be'],
        ['#f7d6e0', '#c77dff'],
        ['#cdb4db', '#ffc8dd'],
        ['#ffd6a5', '#fdffb6'],
        ['#caffbf', '#9bf6ff'],
        ['#a0c4ff', '#bdb2ff'],
        ['#ffadad', '#ffd6a5'],
      ];
      const tiles = palette
        .map(
          ([a, b], i) =>
            `<div class="photo-tile" style="background:linear-gradient(${120 + (i % 5) * 18}deg,${a},${b})" title="Photo ${i + 1}"></div>`
        )
        .join('');
      return `<div class="app-layout photos-app">
        <aside class="app-sidebar photos-sidebar">
          <div class="sb-section-label">Library</div>
          ${[
            { id: 'lib', label: 'Library', icon: '📷' },
            { id: 'days', label: 'Days', icon: '📅' },
            { id: 'people', label: 'People', icon: '👤' },
            { id: 'places', label: 'Places', icon: '📍' },
            { id: 'albums', label: 'Albums', icon: '🗂' },
          ]
            .map(
              (it) =>
                `<div class="app-sidebar-item ${it.id === 'lib' ? 'active' : ''}" data-nav="${it.id}">
                  <span class="sb-icon">${it.icon}</span><span>${it.label}</span>
                </div>`
            )
            .join('')}
          <div class="sb-section-label">Media Types</div>
          ${[
            { id: 'videos', label: 'Videos', icon: '🎬' },
            { id: 'selfies', label: 'Selfies', icon: '🤳' },
            { id: 'screenshots', label: 'Screenshots', icon: '🖥' },
          ]
            .map(
              (it) =>
                `<div class="app-sidebar-item" data-nav="${it.id}">
                  <span class="sb-icon">${it.icon}</span><span>${it.label}</span>
                </div>`
            )
            .join('')}
          <div class="sb-section-label">My Albums</div>
          ${[
            { id: 'favorites', label: 'Favorites', icon: '★' },
            { id: 'recents', label: 'Recents', icon: '🕐' },
            { id: 'imports', label: 'Imports', icon: '⬇' },
          ]
            .map(
              (it) =>
                `<div class="app-sidebar-item" data-nav="${it.id}">
                  <span class="sb-icon">${it.icon}</span><span>${it.label}</span>
                </div>`
            )
            .join('')}
        </aside>
        <div class="app-main photos-main">
          ${toolbar(`
            <div class="photos-tb-left">
              <strong>Library</strong>
              <span class="muted">1,284 items</span>
            </div>
            <div class="photos-tb-right">
              <div class="tb-capsule photos-view" role="group" aria-label="View">
                <button type="button" class="tb-seg active" title="Years">Years</button>
                <button type="button" class="tb-seg" title="Months">Months</button>
                <button type="button" class="tb-seg" title="Days">Days</button>
                <button type="button" class="tb-seg" title="All Photos">All</button>
              </div>
              <input class="search-field photos-search" placeholder="Search" />
            </div>
          `)}
          <div class="photos-scroll">
            <div class="photos-section-head">
              <h2>July 2026</h2>
              <span class="muted">24 Photos</span>
            </div>
            <div class="photo-grid">${tiles}</div>
            <div class="photos-section-head">
              <h2>June 2026</h2>
              <span class="muted">18 Photos</span>
            </div>
            <div class="photo-grid photo-grid-sm">
              ${palette
                .slice(0, 12)
                .map(
                  ([a, b], i) =>
                    `<div class="photo-tile" style="background:linear-gradient(${90 + i * 15}deg,${b},${a})"></div>`
                )
                .join('')}
            </div>
          </div>
        </div>
      </div>`;
    },
  });

  register({
    id: 'facetime',
    name: 'FaceTime',
    category: 'Internet',
    dock: true,
    width: 420,
    height: 560,
    open() {
      return `<div class="app-layout col facetime-app">
        <div class="ft-hero">
          <div class="ft-avatar">🙂</div>
          <h2>FaceTime</h2>
          <p class="muted">Video and audio calls with friends and family</p>
        </div>
        <div class="ft-actions">
          <button class="btn-primary wide">New FaceTime</button>
          <button class="btn-glass wide">Create Link</button>
        </div>
        <div class="app-list">
          ${['Alex Chen', 'Jordan Lee', 'Sam Rivera', 'Design Team']
            .map((n) => `<div class="app-list-row"><div class="row-main"><strong>${n}</strong></div><span class="row-meta">Info</span></div>`)
            .join('')}
        </div>
      </div>`;
    },
  });

  register({
    id: 'calendar',
    name: 'Calendar',
    category: 'Productivity',
    dock: true,
    width: 1080,
    height: 720,
    open() {
      /**
       * Month layout matched to real macOS Calendar April 2026 screenshot
       * (toolbar, title, multi-day bars, timed chips, density). Style only —
       * sample events are generic placeholders, never personal data.
       */
      const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      // April 2026 starts Wednesday
      const startPad = 3;
      const daysInMonth = 30;
      const prevMonthDays = 31;

      // Generic dense sample mirroring real month density/structure
      // bar-* = all-day / multi-day pill; timed = left color bar + title + time
      // span: start|mid|end for continuous multi-day bars across cells
      const sample = {
        1: [
          { t: 'Workshop', c: 'bar-cyan', span: 'start' },
          { t: 'April Fools’ Day', c: 'bar-blue', star: true },
          { t: 'Focus block', c: 'blue', time: '2:30 AM' },
          { t: 'more', more: 2 },
        ],
        2: [
          { t: 'Workshop', c: 'bar-cyan', span: 'mid' },
          { t: 'Focus block', c: 'blue', time: '2:30 AM' },
          { t: 'Team sync', c: 'purple', time: '8 PM' },
          { t: 'Standup', c: 'purple', time: '11 PM' },
        ],
        3: [
          { t: 'Workshop', c: 'bar-cyan', span: 'end' },
          { t: 'Good Friday', c: 'bar-blue', star: true },
          { t: 'Focus block', c: 'blue', time: '2:30 AM' },
          { t: 'Planning', c: 'green', time: '4 AM' },
        ],
        4: [
          { t: 'Retreat', c: 'bar-blue', span: 'start' },
          { t: 'Focus block', c: 'blue', time: '2:30 AM' },
          { t: 'Deep work', c: 'purple', time: '8 PM' },
        ],
        5: [
          { t: 'Retreat', c: 'bar-blue', span: 'end' },
          { t: 'Easter', c: 'bar-blue', star: true },
          { t: 'Planning', c: 'green', time: '4 AM' },
          { t: 'Team sync', c: 'purple', time: '8 PM' },
        ],
        6: [
          { t: 'Easter Monday', c: 'bar-blue', star: true },
          { t: 'Focus block', c: 'blue', time: '2:30 AM' },
          { t: 'Planning', c: 'green', time: '4 AM' },
          { t: 'Class', c: 'blue', time: '6 AM' },
        ],
        7: [
          { t: 'Focus block', c: 'blue', time: '2:30 AM' },
          { t: 'Planning', c: 'green', time: '4 AM' },
          { t: 'Class', c: 'blue', time: '6 AM' },
          { t: 'Deep work', c: 'purple', time: '8 PM' },
        ],
        8: [
          { t: 'Conference', c: 'bar-cyan', span: 'start' },
          { t: 'Focus block', c: 'blue', time: '2:30 AM' },
          { t: 'Deep work', c: 'purple', time: '8 PM' },
          { t: 'Standup', c: 'purple', time: '11 PM' },
        ],
        9: [
          { t: 'Conference', c: 'bar-cyan', span: 'mid' },
          { t: 'Focus block', c: 'blue', time: '2:30 AM' },
          { t: 'Deep work', c: 'purple', time: '8 PM' },
          { t: 'Discussion', c: 'purple', time: '10 PM' },
        ],
        10: [
          { t: 'Conference', c: 'bar-cyan', span: 'end' },
          { t: 'Focus block', c: 'blue', time: '2:30 AM' },
          { t: 'Planning', c: 'green', time: '4 AM' },
          { t: 'Reminder', c: 'orange', time: '9:30 PM', dot: true },
        ],
        11: [
          { t: 'Focus block', c: 'blue', time: '2:30 AM' },
          { t: 'Deep work', c: 'purple', time: '8 PM' },
        ],
        12: [
          { t: 'Holiday', c: 'bar-blue', star: true },
          { t: 'Planning', c: 'green', time: '4 AM' },
          { t: 'Deep work', c: 'purple', time: '8 PM' },
        ],
        13: [
          { t: 'Focus block', c: 'blue', time: '2:30 AM' },
          { t: 'Planning', c: 'green', time: '4 AM' },
          { t: 'Deep work', c: 'purple', time: '8 PM' },
          { t: 'Standup', c: 'purple', time: '10 PM' },
        ],
        14: [
          { t: 'Focus block', c: 'blue', time: '2:30 AM' },
          { t: 'Planning', c: 'green', time: '4 AM' },
          { t: 'Deep work', c: 'purple', time: '8 PM' },
          { t: 'Standup', c: 'purple', time: '11 PM' },
        ],
        15: [
          { t: 'Tax Day', c: 'bar-blue', star: true },
          { t: 'Focus block', c: 'blue', time: '2:30 AM' },
          { t: 'Deep work', c: 'purple', time: '8 PM' },
          { t: 'Standup', c: 'purple', time: '11 PM' },
        ],
        16: [
          { t: 'Focus block', c: 'blue', time: '2:30 AM' },
          { t: 'Deep work', c: 'purple', time: '8 PM' },
          { t: 'Feature review', c: 'purple', time: '10 PM' },
        ],
        17: [
          { t: 'Focus block', c: 'blue', time: '2:30 AM' },
          { t: 'Planning', c: 'green', time: '4 AM' },
          { t: 'Deep work', c: 'purple', time: '8 PM' },
        ],
        18: [
          { t: 'Focus block', c: 'blue', time: '2:30 AM' },
          { t: 'Deep work', c: 'purple', time: '8 PM' },
        ],
        19: [
          { t: 'Reminder A', c: 'orange', time: '8 PM', dot: true },
          { t: 'Reminder B', c: 'orange', time: '8 PM', dot: true },
          { t: 'Review', c: 'blue', time: '9 PM' },
          { t: 'more', more: 2 },
        ],
        20: [
          { t: 'Prep', c: 'orange', time: '12:30 AM', dot: true },
          { t: 'Review', c: 'orange', time: '2 AM', dot: true },
          { t: 'Planning', c: 'green', time: '4 AM' },
          { t: 'Deep work', c: 'purple', time: '8 PM' },
          { t: 'more', more: 2 },
        ],
        21: [
          { t: 'Focus block', c: 'blue', time: '2:30 AM' },
          { t: 'Planning', c: 'green', time: '4 AM' },
          { t: 'Deep work', c: 'purple', time: '8 PM' },
        ],
        22: [
          { t: 'Earth Day', c: 'bar-cyan', star: true },
          { t: 'Travel', c: 'blue', time: '2:10 AM' },
          { t: 'Focus block', c: 'blue', time: '2:30 AM' },
          { t: 'more', more: 2 },
        ],
        23: [
          { t: 'Focus block', c: 'blue', time: '2:30 AM' },
          { t: 'Deep work', c: 'purple', time: '8 PM' },
        ],
        24: [
          { t: 'Focus block', c: 'blue', time: '2:30 AM' },
          { t: 'Planning', c: 'green', time: '4 AM' },
          { t: 'Deep work', c: 'purple', time: '8 PM' },
          { t: 'Standup', c: 'purple', time: '11:30 PM' },
        ],
        25: [
          { t: 'Focus block', c: 'blue', time: '2:30 AM' },
          { t: 'Deep work', c: 'purple', time: '8 PM' },
        ],
        26: [
          { t: 'Weekend project', c: 'bar-cyan', span: 'start' },
          { t: 'Focus block', c: 'blue', time: '2:30 AM' },
        ],
        27: [
          { t: 'Weekend project', c: 'bar-cyan', span: 'end' },
          { t: 'Planning', c: 'green', time: '4 AM' },
          { t: 'Deep work', c: 'purple', time: '8 PM' },
          { t: 'Standup', c: 'purple', time: '10 PM' },
        ],
        28: [
          { t: 'Focus block', c: 'blue', time: '2:30 AM' },
          { t: 'Planning', c: 'green', time: '4 AM' },
          { t: 'Interview', c: 'blue', time: '8 PM' },
          { t: 'more', more: 2 },
        ],
        29: [
          { t: 'Focus block', c: 'blue', time: '2:30 AM' },
          { t: 'Deep work', c: 'purple', time: '8 PM' },
        ],
        30: [
          { t: 'Focus block', c: 'blue', time: '2:30 AM' },
          { t: 'Deep work', c: 'purple', time: '8 PM' },
        ],
      };

      // Leading March days — light carry-over events for realism
      const prevSample = {
        0: [
          { t: 'Trip', c: 'bar-cyan', span: 'mid' },
          { t: 'Stay', c: 'bar-blue', span: 'mid' },
          { t: 'Holiday', c: 'bar-blue', star: true },
        ],
        1: [
          { t: 'Trip', c: 'bar-cyan', span: 'end' },
          { t: 'Stay', c: 'bar-blue', span: 'end' },
          { t: 'Planning', c: 'green', time: '4 AM' },
          { t: 'more', more: 2 },
        ],
        2: [
          { t: 'Focus block', c: 'blue', time: '2:30 AM' },
          { t: 'Planning', c: 'green', time: '4 AM' },
          { t: 'Class', c: 'blue', time: '6 AM' },
          { t: 'Deep work', c: 'purple', time: '8 PM' },
        ],
      };

      const grid = [];
      for (let i = 0; i < startPad; i++) {
        grid.push({
          n: prevMonthDays - startPad + i + 1,
          muted: true,
          events: prevSample[i] || [],
        });
      }
      for (let d = 1; d <= daysInMonth; d++) {
        grid.push({ n: d, today: d === 17, events: sample[d] || [] });
      }
      let next = 1;
      while (grid.length % 7 !== 0) {
        grid.push({ n: next++, muted: true, events: [], nextMonth: true });
      }

      const renderEv = (e) => {
        if (e.more) return `<div class="cal27-ev more">+${e.more} more</div>`;
        if (e.c && e.c.indexOf('bar-') === 0) {
          const spanCls = e.span ? ` span span-${e.span}` : '';
          const starCls = e.star ? ' star' : '';
          const hideTitle = e.span === 'mid' || e.span === 'end';
          const label = hideTitle ? '' : `${e.star ? '★ ' : ''}${e.t}`;
          return `<div class="cal27-ev ${e.c}${spanCls}${starCls}"${hideTitle ? ' aria-hidden="true"' : ''}>${label}</div>`;
        }
        return `<div class="cal27-ev timed ${e.c}${e.dot ? ' dot' : ''}">
          <span class="cal27-ev-bar"></span>
          <span class="cal27-ev-t">${e.t}</span>
          ${e.time ? `<span class="cal27-ev-time">${e.time}</span>` : ''}
        </div>`;
      };

      const cellHTML = grid
        .map((c) => {
          const list = c.events || [];
          const maxShow = 4;
          const real = list.filter((e) => !e.more);
          const moreMarker = list.find((e) => e.more);
          let shown = real.slice(0, maxShow);
          let overflow = moreMarker ? moreMarker.more : Math.max(0, real.length - maxShow);
          if (real.length > maxShow) {
            shown = real.slice(0, maxShow);
            overflow = moreMarker ? moreMarker.more : real.length - maxShow;
          }
          let evHtml = shown.map(renderEv).join('');
          if (overflow > 0) {
            evHtml += `<div class="cal27-ev more">+${overflow} more</div>`;
          }
          return `<div class="cal27-cell${c.muted ? ' muted' : ''}${c.today ? ' today' : ''}${c.nextMonth ? ' next-m' : ''}">
            <div class="cal27-num">${c.nextMonth ? `<span class="cal27-month-tag">May</span> ${c.n}` : c.n}</div>
            <div class="cal27-evs">${evHtml}</div>
          </div>`;
        })
        .join('');

      return `<div class="cal27-app">
        <div class="cal27-toolbar" data-drag-region data-drag-handle>
          <div class="cal27-tb-left">
            <button type="button" class="cal27-icon-btn" title="Calendars" aria-label="Calendars">
              <svg viewBox="0 0 18 16" width="15" height="13" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="1.5" y="2.5" width="15" height="12" rx="2"/><path d="M1.5 6.5h15M5.5 1v3M12.5 1v3"/></svg>
            </button>
            <button type="button" class="cal27-icon-btn badge" title="Inbox" aria-label="Inbox">
              <svg viewBox="0 0 18 14" width="15" height="12" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M1 3.5l8 5 8-5M1 3h16v9.5a1 1 0 01-1 1H2a1 1 0 01-1-1V3z"/></svg>
              <span class="cal27-badge">2</span>
            </button>
            <button type="button" class="cal27-icon-btn plus" title="Add" aria-label="Add">+</button>
          </div>
          <div class="cal27-seg" role="tablist">
            <button type="button" class="cal27-seg-btn">Day</button>
            <button type="button" class="cal27-seg-btn">Week</button>
            <button type="button" class="cal27-seg-btn is-active">Month</button>
            <button type="button" class="cal27-seg-btn">Year</button>
          </div>
          <div class="cal27-tb-right">
            <button type="button" class="cal27-icon-btn search" title="Search" aria-label="Search">
              <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5L14 14" stroke-linecap="round"/></svg>
            </button>
          </div>
        </div>
        <div class="cal27-title-row">
          <h1 class="cal27-month-title">${['January','February','March','April','May','June','July','August','September','October','November','December'][new Date().getMonth()]} ${new Date().getFullYear()}</h1>
          <div class="cal27-title-nav">
            <button type="button" class="cal27-nav" aria-label="Previous">‹</button>
            <button type="button" class="cal27-today">Today</button>
            <button type="button" class="cal27-nav" aria-label="Next">›</button>
          </div>
        </div>
        <div class="cal27-grid-wrap">
          <div class="cal27-weekdays">
            ${weekdays.map((d) => `<div class="cal27-wd">${d}</div>`).join('')}
          </div>
          <div class="cal27-grid">${cellHTML}</div>
        </div>
      </div>`;
    },
  });

  register({
    id: 'notes',
    name: 'Notes',
    category: 'Productivity',
    dock: true,
    width: 920,
    height: 600,
    open() {
      /* Generic sample notes — not personal content */
      const folders = [
        { id: 'icloud', label: 'iCloud', count: 12 },
        { id: 'notes', label: 'Notes', count: 8, active: true },
        { id: 'quick', label: 'Quick Notes', count: 2 },
        { id: 'shared', label: 'Shared', count: 1 },
        { id: 'recently', label: 'Recently Deleted', count: 0 },
      ];
      const list = [
        { title: 'Welcome to Notes', preview: 'Capture ideas, lists, and sketches…', date: 'Today', selected: true, folder: 'notes' },
        { title: 'Shopping List', preview: 'Milk, eggs, bread, coffee…', date: 'Yesterday', folder: 'notes' },
        { title: 'Meeting Agenda', preview: '1. Status 2. Goals 3. Next steps', date: 'Jul 15', folder: 'notes' },
        { title: 'Travel Checklist', preview: 'Passport, charger, tickets…', date: 'Jul 12', folder: 'quick' },
        { title: 'Book Ideas', preview: 'Chapter outlines and themes…', date: 'Jul 8', folder: 'shared' },
        { title: 'Recipes', preview: 'Pasta, salad, dessert…', date: 'Jul 1', folder: 'notes' },
      ];
      return `<div class="notes27-app">
        <div class="notes27-toolbar" data-drag-region data-drag-handle>
          <div class="notes27-tb-left">
            <button type="button" class="notes27-tb-btn" title="Folders">☰</button>
            <button type="button" class="notes27-tb-btn" title="New Note">✎</button>
            <button type="button" class="notes27-tb-btn" title="Delete">⌫</button>
          </div>
          <div class="notes27-tb-center">
            <button type="button" class="notes27-fmt">B</button>
            <button type="button" class="notes27-fmt">I</button>
            <button type="button" class="notes27-fmt">U</button>
            <button type="button" class="notes27-fmt">≡</button>
            <button type="button" class="notes27-fmt">☑</button>
            <button type="button" class="notes27-fmt">🖼</button>
          </div>
          <div class="notes27-tb-right">
            <button type="button" class="notes27-tb-btn" title="Share">↗</button>
            <input class="notes27-search" placeholder="Search" />
          </div>
        </div>
        <div class="notes27-body">
          <aside class="notes27-folders">
            <div class="notes27-folder-head">iCloud</div>
            ${folders
              .map(
                (f) =>
                  `<div class="notes27-folder${f.active ? ' active' : ''}" data-folder="${f.id}">
                    <span class="notes27-folder-icon">📝</span>
                    <span class="notes27-folder-name">${f.label}</span>
                    <span class="notes27-folder-count">${f.count}</span>
                  </div>`
              )
              .join('')}
            <div class="notes27-folder-head">On My Mac</div>
            <div class="notes27-folder"><span class="notes27-folder-icon">📁</span><span class="notes27-folder-name">Notes</span><span class="notes27-folder-count">3</span></div>
          </aside>
          <div class="notes27-list">
            ${list
              .map(
                (n) =>
                  `<div class="notes27-item${n.selected ? ' selected' : ''}" data-folder="${n.folder || 'notes'}">
                    <div class="notes27-item-title">${n.title}</div>
                    <div class="notes27-item-meta"><span>${n.date}</span> ${n.preview}</div>
                  </div>`
              )
              .join('')}
          </div>
          <div class="notes27-editor">
            <div class="notes27-date">Today at 9:41 AM</div>
            <h1 class="notes27-title" contenteditable="true">Welcome to Notes</h1>
            <div class="notes27-body-text" contenteditable="true">
              <p>Capture ideas, lists, and sketches in one place.</p>
              <p></p>
              <ul>
                <li>Write quickly with a clean editor</li>
                <li>Organize with folders and tags</li>
                <li>Sync across devices with iCloud</li>
              </ul>
              <p></p>
              <p>Start typing to add more…</p>
            </div>
          </div>
        </div>
      </div>`;
    },
  });

  register({
    id: 'music',
    name: 'Music',
    category: 'Entertainment',
    dock: true,
    width: 960,
    height: 620,
    open() {
      /* Generic sample catalog - not personal playlists */
      const albums = [
        { t: 'Midnight Drive', a: 'Neon Coast', h: 210 },
        { t: 'Glass Waves', a: 'Crystal Band', h: 280 },
        { t: 'Golden Hour', a: 'Sunset Parade', h: 35 },
        { t: 'Neon Rain', a: 'City Lights', h: 320 },
        { t: 'Soft Static', a: 'Ambient Room', h: 180 },
        { t: 'Blue Horizon', a: 'Skyline Trio', h: 200 },
      ];
      const recent = [
        { t: 'Morning Circuit', a: 'Focus Beats', h: 160 },
        { t: 'Paper Planes', a: 'Indie North', h: 12 },
        { t: 'Quiet Loft', a: 'Jazz Corner', h: 45 },
        { t: 'Pulse', a: 'Electro Yard', h: 300 },
        { t: 'Harbor Lights', a: 'Coastal FM', h: 190 },
        { t: 'Afterglow', a: 'Velvet Room', h: 330 },
      ];
      const playlists = [
        { id: 'pl1', label: 'Chill Mix', icon: '♪' },
        { id: 'pl2', label: 'Focus Flow', icon: '♪' },
        { id: 'pl3', label: 'Weekend', icon: '♪' },
      ];
      const card = (item, extra = '') =>
        `<div class="album-card${extra}">
          <div class="album-art" style="--h:${item.h}">
            <span class="album-art-sheen"></span>
          </div>
          <strong>${item.t}</strong>
          <span class="muted">${item.a}</span>
        </div>`;
      return `<div class="app-layout music-app">
        <aside class="app-sidebar music-sidebar">
          <div class="sb-section-label">Listen</div>
          ${[
            { id: 'home', label: 'Home', icon: '⌂' },
            { id: 'browse', label: 'Browse', icon: '◎' },
            { id: 'radio', label: 'Radio', icon: '📻' },
          ]
            .map(
              (it) =>
                `<div class="app-sidebar-item ${it.id === 'home' ? 'active' : ''}" data-nav="${it.id}">
                  <span class="sb-icon">${it.icon}</span><span>${it.label}</span>
                </div>`
            )
            .join('')}
          <div class="sb-section-label">Library</div>
          ${[
            { id: 'lib', label: 'Library', icon: '♫' },
            { id: 'songs', label: 'Songs', icon: '🎵' },
            { id: 'albums', label: 'Albums', icon: '💿' },
            { id: 'artists', label: 'Artists', icon: '🎤' },
          ]
            .map(
              (it) =>
                `<div class="app-sidebar-item" data-nav="${it.id}">
                  <span class="sb-icon">${it.icon}</span><span>${it.label}</span>
                </div>`
            )
            .join('')}
          <div class="sb-section-label">Playlists</div>
          ${playlists
            .map(
              (it) =>
                `<div class="app-sidebar-item" data-nav="${it.id}">
                  <span class="sb-icon">${it.icon}</span><span>${it.label}</span>
                </div>`
            )
            .join('')}
        </aside>
        <div class="app-main music-main">
          ${toolbar(`
            <strong>Home</strong>
            <span class="muted grow">Listen Now</span>
            <input class="search-field" placeholder="Search" />
          `)}
          <div class="music-scroll">
            <div class="music-section">
              <div class="music-section-head">
                <h3>Recently Played</h3>
                <span class="linkish muted">See All</span>
              </div>
              <div class="album-row">
                ${recent.map((a) => card(a)).join('')}
              </div>
            </div>
            <div class="music-section">
              <div class="music-section-head">
                <h3>Featured Albums</h3>
                <span class="linkish muted">See All</span>
              </div>
              <div class="album-row">
                ${albums.map((a) => card(a)).join('')}
              </div>
            </div>
            <div class="music-section">
              <div class="music-section-head">
                <h3>Made for You</h3>
              </div>
              <div class="album-row">
                ${[
                  { t: 'Daily Mix 1', a: 'Updated today', h: 250 },
                  { t: 'Daily Mix 2', a: 'Updated today', h: 140 },
                  { t: 'New Music Mix', a: 'Fresh finds', h: 20 },
                  { t: 'Chill Mix', a: 'Easy listening', h: 200 },
                ]
                  .map((a) => card(a, ' mix-card'))
                  .join('')}
              </div>
            </div>
          </div>
          <div class="mini-player glass">
            <div class="np-art"></div>
            <div class="np-meta">
              <strong>Liquid Glass</strong>
              <div class="muted">macOS Ensemble</div>
            </div>
            <div class="np-center">
              <div class="np-controls">
                <button type="button" class="np-btn" aria-label="Previous">⏮</button>
                <button type="button" class="np-btn np-play" aria-label="Play">▶</button>
                <button type="button" class="np-btn" aria-label="Next">⏭</button>
              </div>
              <div class="np-progress">
                <span class="np-time">1:24</span>
                <div class="np-bar"><div class="np-bar-fill" style="width:38%"></div></div>
                <span class="np-time">3:42</span>
              </div>
            </div>
            <div class="np-volume">
              <span class="muted">🔈</span>
              <div class="np-vol-bar"><div class="np-bar-fill" style="width:60%"></div></div>
            </div>
          </div>
        </div>
      </div>`;
    },
  });

  register({
    id: 'appstore',
    name: 'App Store',
    category: 'System',
    dock: true,
    width: 900,
    height: 600,
    open() {
      return `<div class="app-layout">
        ${sidebar(
          [
            { id: 'today', label: 'Today', icon: '✦' },
            { id: 'games', label: 'Games', icon: '🎮' },
            { id: 'apps', label: 'Apps', icon: '▦' },
            { id: 'arcade', label: 'Arcade', icon: '🅰' },
            { id: 'updates', label: 'Updates', icon: '↻' },
          ],
          'today'
        )}
        <div class="app-main">
          <div class="store-hero glass">
            <div class="store-badge">APP OF THE DAY</div>
            <h1>Discover macOS 27</h1>
            <p class="muted">A celebration of Liquid Glass design across every app.</p>
          </div>
          <h3 class="section-title">Must-Have Apps</h3>
          <div class="store-list">
            ${[
              { n: 'Chess', c: 'Games · Play vs computer' },
              { n: 'Maps', c: 'Travel · Satellite included' },
              { n: 'Mail', c: 'Productivity' },
              { n: 'Final Cut Pro', c: 'Creativity' },
              { n: 'Logic Pro', c: 'Creativity' },
              { n: 'Xcode', c: 'Developer Tools' },
            ]
              .map(
                (a) =>
                  `<div class="store-row"><div class="store-icon"></div><div><strong>${a.n}</strong><div class="muted">${a.c}</div></div><button class="btn-get">GET</button></div>`
              )
              .join('')}
          </div>
        </div>
      </div>`;
    },
  });

  register({
    id: 'system-settings',
    name: 'System Settings',
    category: 'System',
    dock: true,
    width: 800,
    height: 580,
    open() {
      const shell = global.MacShell || global.MacOSShell;
      const pref =
        (shell && typeof shell.getAppearance === 'function' && shell.getAppearance()) ||
        (typeof localStorage !== 'undefined' && localStorage.getItem('macos-appearance')) ||
        'auto';
      const theme =
        (shell && typeof shell.getTheme === 'function' && shell.getTheme()) ||
        document.documentElement.getAttribute('data-theme') ||
        'light';
      const items = [
        { id: 'wifi', label: 'Wi-Fi', icon: 'wifi', glyph: '􀙇' },
        { id: 'bluetooth', label: 'Bluetooth', icon: 'bluetooth', glyph: '􀂯' },
        { id: 'network', label: 'Network', icon: 'network', glyph: '􀤆' },
        { id: 'notifications', label: 'Notifications', icon: 'notifications', glyph: '􀝖' },
        { id: 'sound', label: 'Sound', icon: 'sound', glyph: '􀊩' },
        { id: 'focus', label: 'Focus', icon: 'focus', glyph: '􀆺' },
        { id: 'appearance', label: 'Appearance', icon: 'appearance', glyph: '􀎑' },
        { id: 'desktop', label: 'Desktop & Dock', icon: 'desktop', glyph: '􀢌' },
        { id: 'displays', label: 'Displays', icon: 'displays', glyph: '􀢹' },
        { id: 'wallpaper', label: 'Wallpaper', icon: 'wallpaper', glyph: '􀣵' },
        { id: 'intelligence', label: 'Apple Intelligence & Siri', icon: 'intelligence', glyph: '􀄩' },
        { id: 'privacy', label: 'Privacy & Security', icon: 'privacy', glyph: '􀎡' },
        { id: 'users', label: 'Users & Groups', icon: 'users', glyph: '􀉫' },
        { id: 'general', label: 'General', icon: 'general', glyph: '􀍟' },
      ];
      const iconGlyph = {
        wifi: '📡',
        bluetooth: 'B',
        network: '↗',
        notifications: '🔔',
        sound: '🔊',
        focus: '☾',
        appearance: '◐',
        desktop: '▣',
        displays: '🖥',
        wallpaper: '🖼',
        intelligence: '✦',
        privacy: '🔒',
        users: '👤',
        general: '⚙',
      };
      const statusText =
        pref === 'auto'
          ? 'Automatic · currently ' + (theme === 'dark' ? 'Dark' : 'Light') + ' (follows system)'
          : (pref === 'dark' ? 'Dark' : 'Light') + ' mode';
      const appearancePane = `<h2>Appearance</h2>
        <p class="muted" style="margin:0 0 14px" id="appearance-status">${statusText}</p>
        <div class="settings-card" style="padding:16px">
          <div class="appearance-seg" role="radiogroup" aria-label="Appearance">
            <button type="button" data-appearance="light" class="${pref === 'light' ? 'is-selected' : ''}">
              <span class="ap-preview light" aria-hidden="true"></span>
              <span>Light</span>
            </button>
            <button type="button" data-appearance="dark" class="${pref === 'dark' ? 'is-selected' : ''}">
              <span class="ap-preview dark" aria-hidden="true"></span>
              <span>Dark</span>
            </button>
            <button type="button" data-appearance="auto" class="${pref === 'auto' ? 'is-selected' : ''}">
              <span class="ap-preview auto" aria-hidden="true"></span>
              <span>Auto</span>
            </button>
          </div>
        </div>
        <div class="settings-card" style="margin-top:12px">
          <div class="settings-row"><span>Liquid Glass</span><span class="muted">On</span></div>
          <div class="settings-row"><span>Accent color</span><span class="muted">Multicolor</span></div>
          <div class="settings-row"><span>Highlight color</span><span class="muted">Accent color</span></div>
          <div class="settings-row"><span>Sidebar icon size</span><span class="muted">Medium</span></div>
          <div class="settings-row"><span>Follow system appearance</span><span class="muted">${pref === 'auto' ? 'Yes' : 'No'}</span></div>
        </div>
        <p class="muted" style="margin:12px 4px 0;font-size:12px">Auto uses your Mac's Light/Dark setting and updates when it changes.</p>`;
      return `<div class="app-layout" id="system-settings-app">
        <aside class="app-sidebar settings-sb">
          <input class="search-field settings-search" type="search" placeholder="Search" aria-label="Search settings" />
          ${items
            .map(
              (it) =>
                `<div class="app-sidebar-item ${it.id === 'appearance' ? 'active' : ''}" data-settings-pane="${it.id}" data-label="${it.label.toLowerCase()}">
                  <span class="settings-icon ${it.icon}" aria-hidden="true">${iconGlyph[it.icon] || '•'}</span>
                  <span>${it.label}</span>
                </div>`
            )
            .join('')}
        </aside>
        <div class="app-main settings-main" id="settings-pane">${appearancePane}</div>
      </div>`;
    },
    onMount(el) {
      const pane = el.querySelector('#settings-pane');
      const items = el.querySelectorAll('.app-sidebar-item[data-settings-pane]');
      const search = el.querySelector('.settings-search');
      const titles = {
        wifi: 'Wi-Fi',
        bluetooth: 'Bluetooth',
        network: 'Network',
        notifications: 'Notifications',
        sound: 'Sound',
        focus: 'Focus',
        appearance: 'Appearance',
        desktop: 'Desktop & Dock',
        displays: 'Displays',
        wallpaper: 'Wallpaper',
        intelligence: 'Apple Intelligence & Siri',
        privacy: 'Privacy & Security',
        users: 'Users & Groups',
        general: 'General',
      };

      const getShell = () => global.MacShell || global.MacOSShell;

      const renderPane = (id) => {
        if (!pane) return;
        if (id === 'appearance') {
          const shell = getShell();
          const pref = (shell && shell.getAppearance && shell.getAppearance()) || 'auto';
          const theme = (shell && shell.getTheme && shell.getTheme()) || 'light';
          pane.innerHTML = `<h2>Appearance</h2>
            <p class="muted" style="margin:0 0 14px" id="appearance-status">${
              pref === 'auto'
                ? 'Automatic · currently ' + (theme === 'dark' ? 'Dark' : 'Light') + ' (follows system)'
                : (pref === 'dark' ? 'Dark' : 'Light') + ' mode'
            }</p>
            <div class="settings-card" style="padding:16px">
              <div class="appearance-seg" role="radiogroup" aria-label="Appearance">
                <button type="button" data-appearance="light" class="${pref === 'light' ? 'is-selected' : ''}">
                  <span class="ap-preview light" aria-hidden="true"></span><span>Light</span>
                </button>
                <button type="button" data-appearance="dark" class="${pref === 'dark' ? 'is-selected' : ''}">
                  <span class="ap-preview dark" aria-hidden="true"></span><span>Dark</span>
                </button>
                <button type="button" data-appearance="auto" class="${pref === 'auto' ? 'is-selected' : ''}">
                  <span class="ap-preview auto" aria-hidden="true"></span><span>Auto</span>
                </button>
              </div>
            </div>
            <div class="settings-card" style="margin-top:12px">
              <div class="settings-row"><span>Liquid Glass</span><span class="muted">On</span></div>
              <div class="settings-row"><span>Accent color</span><span class="muted">Multicolor</span></div>
              <div class="settings-row"><span>Highlight color</span><span class="muted">Accent color</span></div>
              <div class="settings-row"><span>Sidebar icon size</span><span class="muted">Medium</span></div>
              <div class="settings-row"><span>Follow system appearance</span><span class="muted">${pref === 'auto' ? 'Yes' : 'No'}</span></div>
            </div>
            <p class="muted" style="margin:12px 4px 0;font-size:12px">Auto uses your Mac's Light/Dark setting and updates when it changes.</p>`;
          wireAppearanceButtons(pane);
          return;
        }
        if (id === 'wifi') {
          pane.innerHTML = `<h2>Wi-Fi</h2>
            <div class="settings-card">
              <div class="settings-row"><span>Wi-Fi</span><label class="toggle on"><span></span></label></div>
              <div class="settings-row"><span>Network</span><strong>Home</strong></div>
              <div class="settings-row"><span>IP Address</span><span class="muted">192.168.1.42</span></div>
              <div class="settings-row"><span>Status</span><span class="muted">Connected</span></div>
            </div>
            <div class="settings-card">
              <div class="settings-row"><span>Ask to join networks</span><label class="toggle"><span></span></label></div>
              <div class="settings-row"><span>Ask to join hotspots</span><label class="toggle on"><span></span></label></div>
            </div>`;
          return;
        }
        if (id === 'bluetooth') {
          pane.innerHTML = `<h2>Bluetooth</h2>
            <div class="settings-card">
              <div class="settings-row"><span>Bluetooth</span><label class="toggle on"><span></span></label></div>
              <div class="settings-row"><span>AirPods Pro</span><span class="muted">Connected</span></div>
              <div class="settings-row"><span>Magic Keyboard</span><span class="muted">Connected</span></div>
              <div class="settings-row"><span>Magic Mouse</span><span class="muted">Not Connected</span></div>
            </div>`;
          return;
        }
        if (id === 'desktop') {
          let magOn = true;
          try {
            magOn = localStorage.getItem('macos-dock-mag') !== '0';
          } catch (e) { /* ignore */ }
          pane.innerHTML = `<h2>Desktop &amp; Dock</h2>
            <div class="settings-card">
              <div class="settings-row"><span>Dock magnification</span><label class="toggle ${magOn ? 'on' : ''}" data-setting="dock-mag"><span></span></label></div>
              <div class="settings-row"><span>Show recent apps in Dock</span><label class="toggle" data-setting="dock-recents"><span></span></label></div>
              <div class="settings-row"><span>Automatically hide and show the Dock</span><label class="toggle" data-setting="dock-autohide"><span></span></label></div>
              <div class="settings-row"><span>Stage Manager</span><span class="muted">Control Center</span></div>
            </div>
            <p class="muted" style="margin:12px 4px 0;font-size:12px">Magnification scales icons on hover; the dock tray width stays fixed.</p>`;
          wireDesktopToggles(pane);
          return;
        }
        if (id === 'wallpaper') {
          pane.innerHTML = `<h2>Wallpaper</h2>
            <div class="settings-card" style="padding:16px">
              <p class="muted" style="margin:0 0 12px">Choose a desktop picture</p>
              <div class="wallpaper-pick-grid">
                <button type="button" class="wallpaper-pick" data-wall="0" title="macOS 27 Default"><span class="wp-thumb wp-a"></span><span>Default</span></button>
                <button type="button" class="wallpaper-pick" data-wall="1" title="Liquid Glass"><span class="wp-thumb wp-b"></span><span>Glass</span></button>
                <button type="button" class="wallpaper-pick" data-wall="2" title="Crystal Mist"><span class="wp-thumb wp-c"></span><span>Crystal</span></button>
              </div>
            </div>
            <div class="settings-card">
              <div class="settings-row"><span>Tip</span><span class="muted">Right-click desktop → Change Wallpaper</span></div>
              <div class="settings-row"><button type="button" class="btn-glass" data-action-wall-cycle>Cycle wallpaper</button><span></span></div>
            </div>`;
          wireWallpaperPane(pane);
          return;
        }
        if (id === 'notifications') {
          pane.innerHTML = `<h2>Notifications</h2>
            <div class="settings-card">
              <div class="settings-row"><span>Show previews</span><span class="muted">When Unlocked</span></div>
              <div class="settings-row"><span>Allow notifications</span><label class="toggle on" data-setting="allow-notifs"><span></span></label></div>
              <div class="settings-row"><span>Notification Center</span><span class="muted">On</span></div>
            </div>`;
          wireGenericToggles(pane);
          return;
        }
        if (id === 'sound') {
          let vol = 65;
          try {
            const v = localStorage.getItem('macos-cc-volume');
            if (v != null) vol = Math.round(parseFloat(v) * 100) || 65;
          } catch (e) { /* ignore */ }
          const alerts = [
            { id: 'blow', label: 'Blow' },
            { id: 'glass', label: 'Glass' },
            { id: 'hero', label: 'Hero' },
            { id: 'sosumi', label: 'Sosumi' },
            { id: 'funk', label: 'Funk' },
            { id: 'purr', label: 'Purr' },
            { id: 'submarine', label: 'Submarine' },
            { id: 'tink', label: 'Tink' },
          ];
          let alertId = 'sosumi';
          try {
            alertId = localStorage.getItem('macos-alert-sound') || 'sosumi';
          } catch (e) { /* ignore */ }
          pane.innerHTML = `<h2>Sound</h2>
            <div class="settings-card">
              <div class="settings-row"><span>Output volume</span><span class="muted" id="ss-vol-label">${vol}%</span></div>
              <div class="settings-row" style="display:block;padding:8px 14px 14px">
                <input type="range" min="0" max="100" value="${vol}" id="ss-vol" aria-label="Output volume" style="width:100%" />
              </div>
              <div class="settings-row"><span>Play feedback when volume changes</span><label class="toggle on" data-setting="vol-feedback"><span></span></label></div>
              <div class="settings-row"><span>Play sound on startup</span><label class="toggle on" data-setting="boot-sound"><span></span></label></div>
            </div>
            <div class="settings-card" style="margin-top:12px;padding:14px">
              <p style="margin:0 0 10px;font-weight:600">Alert sound</p>
              <p class="muted" style="margin:0 0 12px;font-size:12px">Synthesized classic Mac-style alerts (click to preview)</p>
              <div class="sound-alert-grid">
                ${alerts
                  .map(
                    (a) =>
                      `<button type="button" class="sound-alert-btn ${a.id === alertId ? 'is-selected' : ''}" data-sound="${a.id}" data-alert="${a.id}">${a.label}</button>`
                  )
                  .join('')}
              </div>
              <div class="settings-row" style="margin-top:12px;border:0;padding:0">
                <span class="muted">Selected</span><strong id="ss-alert-name">${(alerts.find((a) => a.id === alertId) || alerts[0]).label}</strong>
              </div>
            </div>`;
          wireSoundPane(pane);
          return;
        }
        if (id === 'focus') {
          const shell = getShell();
          const dnd =
            (shell && typeof shell.isFocusModeOn === 'function' && shell.isFocusModeOn()) || false;
          pane.innerHTML = `<h2>Focus</h2>
            <div class="settings-card">
              <div class="settings-row"><span>Do Not Disturb</span><label class="toggle ${dnd ? 'on' : ''}" data-setting="dnd"><span></span></label></div>
              <div class="settings-row"><span>Work</span><label class="toggle" data-setting="focus-work"><span></span></label></div>
              <div class="settings-row"><span>Personal</span><label class="toggle" data-setting="focus-personal"><span></span></label></div>
              <div class="settings-row"><span>Share across devices</span><label class="toggle on" data-setting="focus-share"><span></span></label></div>
            </div>
            <p class="muted" style="margin:12px 4px 0;font-size:12px">Do Not Disturb silences Notification Center banners (matches Control Center).</p>`;
          wireFocusPane(pane);
          return;
        }
        if (id === 'displays') {
          pane.innerHTML = `<h2>Displays</h2>
            <div class="settings-card">
              <div class="settings-row"><span>Resolution</span><span class="muted">Default for display</span></div>
              <div class="settings-row"><span>Brightness</span><span class="muted">Auto</span></div>
              <div class="settings-row"><span>True Tone</span><label class="toggle on"><span></span></label></div>
              <div class="settings-row"><span>Night Shift</span><span class="muted">Sunset to Sunrise</span></div>
            </div>`;
          return;
        }
        if (id === 'privacy') {
          pane.innerHTML = `<h2>Privacy &amp; Security</h2>
            <div class="settings-card">
              <div class="settings-row"><span>Location Services</span><label class="toggle on"><span></span></label></div>
              <div class="settings-row"><span>Analytics &amp; Improvements</span><label class="toggle"><span></span></label></div>
              <div class="settings-row"><span>FileVault</span><span class="muted">On</span></div>
              <div class="settings-row"><span>Firewall</span><span class="muted">On</span></div>
            </div>`;
          return;
        }
        if (id === 'general') {
          pane.innerHTML = `<h2>General</h2>
            <div class="settings-card">
              <div class="settings-row"><span>About</span><span class="muted">macOS 27</span></div>
              <div class="settings-row"><span>Software Update</span><span class="muted">Up to date</span></div>
              <div class="settings-row"><span>Storage</span><span class="muted">494 GB available</span></div>
              <div class="settings-row"><span>Date &amp; Time</span><span class="muted">Automatic</span></div>
              <div class="settings-row"><span>Language &amp; Region</span><span class="muted">English (US)</span></div>
            </div>`;
          return;
        }
        const title = titles[id] || id;
        pane.innerHTML = `<h2>${title}</h2>
          <div class="settings-card">
            <div class="settings-row"><span>${title}</span><span class="muted">Configured</span></div>
            <div class="settings-row"><span>Status</span><span class="muted">Ready</span></div>
          </div>`;
      };

      const wireAppearanceButtons = (root) => {
        root.querySelectorAll('.appearance-seg button[data-appearance]').forEach((btn) => {
          btn.addEventListener('click', () => {
            const mode = btn.getAttribute('data-appearance');
            const shell = getShell();
            if (shell && typeof shell.setAppearance === 'function') {
              shell.setAppearance(mode, { notify: true });
            } else {
              document.documentElement.setAttribute('data-appearance', mode);
              const dark =
                mode === 'dark' ||
                (mode === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
              document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
              try {
                localStorage.setItem('macos-appearance', mode);
              } catch (e) { /* ignore */ }
            }
            renderPane('appearance');
          });
        });
      };

      const wireGenericToggles = (root) => {
        root.querySelectorAll('.toggle[data-setting]').forEach((tog) => {
          if (tog.dataset.wired) return;
          tog.dataset.wired = '1';
          tog.style.cursor = 'pointer';
          tog.addEventListener('click', () => {
            tog.classList.toggle('on');
            if (global.MacSounds && MacSounds.play) MacSounds.play('pop');
          });
        });
      };

      const wireSoundPane = (root) => {
        wireGenericToggles(root);
        const slider = root.querySelector('#ss-vol');
        const label = root.querySelector('#ss-vol-label');
        if (slider) {
          slider.addEventListener('input', () => {
            const v = parseInt(slider.value, 10) || 0;
            if (label) label.textContent = v + '%';
            try {
              localStorage.setItem('macos-cc-volume', String(v / 100));
            } catch (e) { /* ignore */ }
            const ccVol = document.querySelector('#control-center [data-cc-slider="volume"] input, #cc-volume, .cc-slider[data-kind="volume"] input');
            if (ccVol) ccVol.value = String(v);
            if (global.MacSounds && MacSounds.play) MacSounds.play('volume');
          });
        }
        root.querySelectorAll('.sound-alert-btn[data-sound]').forEach((btn) => {
          btn.addEventListener('click', () => {
            root.querySelectorAll('.sound-alert-btn').forEach((b) => b.classList.remove('is-selected'));
            btn.classList.add('is-selected');
            const id = btn.getAttribute('data-sound');
            try {
              localStorage.setItem('macos-alert-sound', id);
            } catch (e) { /* ignore */ }
            const name = root.querySelector('#ss-alert-name');
            if (name) name.textContent = btn.textContent;
            if (global.MacSounds && MacSounds.play) MacSounds.play(id);
          });
        });
      };

      const wireFocusPane = (root) => {
        root.querySelectorAll('.toggle[data-setting]').forEach((tog) => {
          if (tog.dataset.wired) return;
          tog.dataset.wired = '1';
          tog.style.cursor = 'pointer';
          tog.addEventListener('click', () => {
            const key = tog.getAttribute('data-setting');
            if (key === 'dnd') {
              const on = !tog.classList.contains('on');
              tog.classList.toggle('on', on);
              const shell = getShell();
              if (shell && typeof shell.setFocusMode === 'function') shell.setFocusMode(on);
              if (shell && typeof shell.notify === 'function') {
                shell.notify(
                  'Focus',
                  on ? 'Do Not Disturb On' : 'Do Not Disturb Off',
                  on ? 'Notifications are silenced' : 'Notifications will appear again',
                  'now',
                  { force: true }
                );
              }
            } else {
              tog.classList.toggle('on');
            }
            if (global.MacSounds && MacSounds.play) MacSounds.play('pop');
          });
        });
      };

      const wireDesktopToggles = (root) => {
        root.querySelectorAll('.toggle[data-setting]').forEach((tog) => {
          if (tog.dataset.wired) return;
          tog.dataset.wired = '1';
          tog.style.cursor = 'pointer';
          tog.addEventListener('click', () => {
            tog.classList.toggle('on');
            const key = tog.getAttribute('data-setting');
            const on = tog.classList.contains('on');
            if (key === 'dock-mag') {
              try {
                localStorage.setItem('macos-dock-mag', on ? '1' : '0');
              } catch (e) { /* ignore */ }
              document.documentElement.classList.toggle('dock-mag-off', !on);
              const dock = document.getElementById('dock');
              if (dock) dock.classList.toggle('no-magnify', !on);
            }
            if (key === 'dock-autohide') {
              document.documentElement.classList.toggle('dock-autohide', on);
            }
            if (global.MacSounds && MacSounds.play) MacSounds.play('pop');
          });
        });
      };

      const wireWallpaperPane = (root) => {
        root.querySelectorAll('.wallpaper-pick[data-wall]').forEach((btn) => {
          btn.addEventListener('click', () => {
            const i = parseInt(btn.getAttribute('data-wall'), 10) || 0;
            const shell = getShell();
            if (shell && typeof shell.setWallpaperByIndex === 'function') {
              shell.setWallpaperByIndex(i);
              if (shell.notify) shell.notify('Desktop', 'Wallpaper', btn.getAttribute('title') || 'Changed', 'now');
            }
            root.querySelectorAll('.wallpaper-pick').forEach((b) => b.classList.remove('is-selected'));
            btn.classList.add('is-selected');
            if (global.MacSounds && MacSounds.play) MacSounds.play('hero');
          });
        });
        const cycle = root.querySelector('[data-action-wall-cycle]');
        if (cycle) {
          cycle.addEventListener('click', () => {
            const shell = getShell();
            if (shell && shell.cycleWallpaper) shell.cycleWallpaper();
            if (global.MacSounds && MacSounds.play) MacSounds.play('pop');
          });
        }
      };

      items.forEach((item) => {
        item.addEventListener('click', () => {
          items.forEach((i) => i.classList.remove('active'));
          item.classList.add('active');
          renderPane(item.getAttribute('data-settings-pane'));
        });
      });

      if (search) {
        search.addEventListener('input', () => {
          const q = search.value.trim().toLowerCase();
          items.forEach((item) => {
            const label = item.getAttribute('data-label') || '';
            item.classList.toggle('is-hidden', q && !label.includes(q));
          });
        });
      }

      wireAppearanceButtons(el);
    },
  });

  // ─── Productivity ───────────────────────────────────────────────
  const simpleListApp = (id, name, category, rows, width = 720, height = 500, navItems) =>
    register({
      id,
      name,
      category,
      width,
      height,
      open() {
        const nav = navItems || [{ id: 'main', label: name, icon: '•' }];
        const active = nav[0].id;
        const first = rows[0];
        const rowsHtml = (rows || [])
          .map(
            (r, i) =>
              `<button type="button" class="app-list-row simple-row ${i === 0 ? 'is-selected' : ''}" data-title="${(r.title || '').replace(/"/g, '&quot;')}" data-sub="${(r.sub || '').replace(/"/g, '&quot;')}" data-meta="${(r.meta || '').replace(/"/g, '&quot;')}">
                <div class="row-main"><strong>${r.title || ''}</strong><span class="muted">${r.sub || ''}</span></div>
                <span class="row-meta">${r.meta || ''}</span>
              </button>`
          )
          .join('');
        return `<div class="app-layout simple-app" data-simple-app="${id}">
          ${sidebar(nav, active)}
          <div class="app-main">
            ${toolbar(`<strong>${name}</strong><input class="search-field simple-search" placeholder="Search" />
              <button type="button" class="btn-glass simple-action" data-action="refresh">Refresh</button>
              <button type="button" class="btn-primary simple-action" data-action="primary">Open</button>`)}
            <div class="app-list simple-list">${rowsHtml || ''}</div>
            <div class="settings-card glass simple-detail" style="margin:12px 16px;padding:14px 16px">
              <strong class="simple-detail-title">${first ? first.title : name}</strong>
              <p class="muted simple-detail-sub" style="margin:6px 0 0">${first ? first.sub || 'Select an item' : 'No items'}</p>
              <p class="muted simple-detail-meta" style="margin:8px 0 0;font-size:12px">${first && first.meta ? first.meta : ''}</p>
            </div>
          </div>
        </div>`;
      },
    });

  register({
    id: 'contacts',
    name: 'Contacts',
    category: 'Productivity',
    width: 860,
    height: 580,
    open() {
      const people = [
        { name: 'Alex Chen', initials: 'AC', hue: 12, title: 'Product Design', company: 'Northwind Labs', phone: '(408) 555-0142', email: 'alex@example.com', letter: 'A' },
        { name: 'Blake Morgan', initials: 'BM', hue: 200, title: 'Engineering', company: 'Contoso', phone: '(415) 555-0198', email: 'blake@example.com', letter: 'B' },
        { name: 'Casey Quinn', initials: 'CQ', hue: 280, title: 'Marketing', company: 'Fabrikam', phone: '(650) 555-0110', email: 'casey@example.com', letter: 'C' },
        { name: 'Jordan Lee', initials: 'JL', hue: 160, title: 'Research', company: 'Adventure Works', phone: '(408) 555-0166', email: 'jordan@example.com', letter: 'J' },
        { name: 'Morgan Blake', initials: 'MB', hue: 40, title: 'Support', company: 'Wide World', phone: '(510) 555-0133', email: 'morgan@example.com', letter: 'M' },
        { name: 'Sam Rivera', initials: 'SR', hue: 320, title: 'Operations', company: 'Tailspin Toys', phone: '(925) 555-0177', email: 'sam@example.com', letter: 'S' },
        { name: 'Taylor Brooks', initials: 'TB', hue: 220, title: 'Sales', company: 'Litware', phone: '(408) 555-0121', email: 'taylor@example.com', letter: 'T' },
      ];
      const selected = people[0];
      let lastLetter = '';
      const listHtml = people
        .map((p, i) => {
          let letter = '';
          if (p.letter !== lastLetter) {
            lastLetter = p.letter;
            letter = `<div class="ct27-letter">${p.letter}</div>`;
          }
          return `${letter}<div class="ct27-row${i === 0 ? ' active' : ''}" data-phone="${p.phone}" data-email="${p.email}" data-title="${p.title}" data-company="${p.company}" data-group="${i < 2 ? 'favorites' : i % 3 === 0 ? 'work' : 'personal'}">
            <span class="ct27-row-av" style="--h:${p.hue}">${p.initials}</span>
            <span class="ct27-row-name">${p.name}</span>
          </div>`;
        })
        .join('');
      return `<div class="ct27-app">
        <div class="ct27-toolbar">
          <div class="ct27-tb-left">
            <button type="button" class="ct27-icon-btn" title="Add">+</button>
            <button type="button" class="ct27-icon-btn" title="Share">↗</button>
          </div>
          <div class="ct27-search-wrap">
            <span aria-hidden="true">⌕</span>
            <input type="search" class="ct27-search" placeholder="Search" />
          </div>
        </div>
        <div class="ct27-body">
          <aside class="ct27-groups">
            <div class="ct27-group-label">Groups</div>
            <div class="ct27-group active"><span class="ct27-g-ico">👤</span> All Contacts</div>
            <div class="ct27-group"><span class="ct27-g-ico">★</span> Favorites</div>
            <div class="ct27-group"><span class="ct27-g-ico">💼</span> Work</div>
            <div class="ct27-group"><span class="ct27-g-ico">🏠</span> Personal</div>
            <div class="ct27-group-label">Directories</div>
            <div class="ct27-group"><span class="ct27-g-ico">☁</span> iCloud</div>
          </aside>
          <div class="ct27-list">
            ${listHtml}
          </div>
          <div class="ct27-detail">
            <div class="ct27-avatar" style="--h:${selected.hue}">${selected.initials}</div>
            <h2 class="ct27-name">${selected.name}</h2>
            <p class="ct27-sub">${selected.title} · ${selected.company}</p>
            <div class="ct27-actions">
              <button type="button" class="ct27-act"><span>💬</span>message</button>
              <button type="button" class="ct27-act"><span>📞</span>call</button>
              <button type="button" class="ct27-act"><span>📹</span>video</button>
              <button type="button" class="ct27-act"><span>✉️</span>mail</button>
            </div>
            <div class="ct27-card">
              <div class="ct27-field">
                <span class="ct27-field-label">mobile</span>
                <span class="ct27-field-value link">${selected.phone}</span>
              </div>
              <div class="ct27-field">
                <span class="ct27-field-label">work</span>
                <span class="ct27-field-value link">${selected.email}</span>
              </div>
              <div class="ct27-field">
                <span class="ct27-field-label">home</span>
                <span class="ct27-field-value">1 Infinite Loop<br/>Cupertino, CA 95014</span>
              </div>
              <div class="ct27-field">
                <span class="ct27-field-label">birthday</span>
                <span class="ct27-field-value">March 14</span>
              </div>
              <div class="ct27-field last">
                <span class="ct27-field-label">note</span>
                <span class="ct27-field-value muted">Met at WWDC sample meetup.</span>
              </div>
            </div>
          </div>
        </div>
      </div>`;
    },
  });

  register({
    id: 'reminders',
    name: 'Reminders',
    category: 'Productivity',
    width: 760,
    height: 520,
    open() {
      const smart = [
        { id: 'today', label: 'Today', icon: 'today', glyph: '📅', count: 3, color: 'blue' },
        { id: 'scheduled', label: 'Scheduled', icon: 'scheduled', glyph: '📅', count: 2, color: 'orange' },
        { id: 'all', label: 'All', icon: 'all', glyph: '☰', count: 8, color: 'gray' },
        { id: 'flagged', label: 'Flagged', icon: 'flagged', glyph: '⚑', count: 1, color: 'red' },
      ];
      const lists = [
        { id: 'work', label: 'Work', color: '#0a84ff', count: 4 },
        { id: 'personal', label: 'Personal', color: '#30d158', count: 2 },
        { id: 'shopping', label: 'Shopping', color: '#ff9f0a', count: 2 },
        { id: 'ideas', label: 'Ideas', color: '#bf5af2', count: 1 },
      ];
      const itemsByList = {
        today: [
          { t: 'Finish Liquid Glass polish', done: true, note: '' },
          { t: 'Review Launchpad icons', done: false, note: 'Due today' },
          { t: 'Call design team', done: false, note: '3:00 PM' },
          { t: 'Ship wallpaper pack', done: false, note: '' },
        ],
        scheduled: [
          { t: 'Weekly team sync', done: false, note: 'Tomorrow 10:00 AM' },
          { t: 'Submit expense report', done: false, note: 'Friday' },
        ],
        all: [
          { t: 'Finish Liquid Glass polish', done: true, note: '' },
          { t: 'Review Launchpad icons', done: false, note: '' },
          { t: 'Buy groceries', done: false, note: 'Personal' },
          { t: 'Call design team', done: false, note: '' },
          { t: 'Ship wallpaper pack', done: true, note: '' },
          { t: 'Read design brief', done: false, note: 'Work' },
          { t: 'Pick up dry cleaning', done: false, note: '' },
          { t: 'Sketch new widget ideas', done: false, note: 'Ideas' },
        ],
        flagged: [{ t: 'Ship wallpaper pack', done: false, note: 'Priority' }],
        work: [
          { t: 'Finish Liquid Glass polish', done: true, note: '' },
          { t: 'Review Launchpad icons', done: false, note: '' },
          { t: 'Call design team', done: false, note: '3:00 PM' },
          { t: 'Read design brief', done: false, note: '' },
        ],
        personal: [
          { t: 'Pick up dry cleaning', done: false, note: '' },
          { t: 'Book dentist', done: false, note: '' },
        ],
        shopping: [
          { t: 'Buy groceries', done: false, note: 'Milk, eggs, bread' },
          { t: 'Order cables', done: false, note: '' },
        ],
        ideas: [{ t: 'Sketch new widget ideas', done: false, note: '' }],
      };
      const titles = {
        today: { name: 'Today', cls: 'blue' },
        scheduled: { name: 'Scheduled', cls: 'orange' },
        all: { name: 'All', cls: 'gray' },
        flagged: { name: 'Flagged', cls: 'red' },
        work: { name: 'Work', cls: 'blue' },
        personal: { name: 'Personal', cls: 'green' },
        shopping: { name: 'Shopping', cls: 'orange' },
        ideas: { name: 'Ideas', cls: 'purple' },
      };

      const renderItems = (listId) => {
        const rows = itemsByList[listId] || [];
        return rows
          .map(
            (r, i) =>
              `<label class="reminder-item ${r.done ? 'is-done' : ''}" data-idx="${i}">
                <input type="checkbox" ${r.done ? 'checked' : ''} />
                <span class="rem-circle" aria-hidden="true"></span>
                <span class="rem-text ${r.done ? 'done' : ''}">${r.t}${
                  r.note ? `<span class="rem-note">${r.note}</span>` : ''
                }</span>
              </label>`
          )
          .join('');
      };

      return `<div class="reminders-app" id="reminders-app">
        <aside class="reminders-sb">
          ${smart
            .map(
              (s) =>
                `<div class="rem-list-item ${s.id === 'today' ? 'active' : ''}" data-rem-list="${s.id}">
                  <span class="rem-smart-icon ${s.icon}" aria-hidden="true">${s.glyph}</span>
                  <span>${s.label}</span>
                  <span class="rem-count">${s.count}</span>
                </div>`
            )
            .join('')}
          <div class="rem-section-label">My Lists</div>
          ${lists
            .map(
              (l) =>
                `<div class="rem-list-item" data-rem-list="${l.id}">
                  <span class="rem-dot" style="background:${l.color}"></span>
                  <span>${l.label}</span>
                  <span class="rem-count">${l.count}</span>
                </div>`
            )
            .join('')}
        </aside>
        <div class="reminders-main">
          <div class="rem-header"><h2 class="blue" id="rem-title">Today</h2></div>
          <div class="reminder-list" id="rem-items">${renderItems('today')}</div>
          <div class="rem-add"><span class="rem-add-plus">+</span> New Reminder</div>
        </div>
      </div>`;
    },
    onMount(el) {
      const listEl = el.querySelector('#rem-items');
      const titleEl = el.querySelector('#rem-title');
      const nav = el.querySelectorAll('.rem-list-item[data-rem-list]');
      const itemsByList = {
        today: [
          { t: 'Finish Liquid Glass polish', done: true, note: '' },
          { t: 'Review Launchpad icons', done: false, note: 'Due today' },
          { t: 'Call design team', done: false, note: '3:00 PM' },
          { t: 'Ship wallpaper pack', done: false, note: '' },
        ],
        scheduled: [
          { t: 'Weekly team sync', done: false, note: 'Tomorrow 10:00 AM' },
          { t: 'Submit expense report', done: false, note: 'Friday' },
        ],
        all: [
          { t: 'Finish Liquid Glass polish', done: true, note: '' },
          { t: 'Review Launchpad icons', done: false, note: '' },
          { t: 'Buy groceries', done: false, note: 'Personal' },
          { t: 'Call design team', done: false, note: '' },
          { t: 'Ship wallpaper pack', done: true, note: '' },
          { t: 'Read design brief', done: false, note: 'Work' },
          { t: 'Pick up dry cleaning', done: false, note: '' },
          { t: 'Sketch new widget ideas', done: false, note: 'Ideas' },
        ],
        flagged: [{ t: 'Ship wallpaper pack', done: false, note: 'Priority' }],
        work: [
          { t: 'Finish Liquid Glass polish', done: true, note: '' },
          { t: 'Review Launchpad icons', done: false, note: '' },
          { t: 'Call design team', done: false, note: '3:00 PM' },
          { t: 'Read design brief', done: false, note: '' },
        ],
        personal: [
          { t: 'Pick up dry cleaning', done: false, note: '' },
          { t: 'Book dentist', done: false, note: '' },
        ],
        shopping: [
          { t: 'Buy groceries', done: false, note: 'Milk, eggs, bread' },
          { t: 'Order cables', done: false, note: '' },
        ],
        ideas: [{ t: 'Sketch new widget ideas', done: false, note: '' }],
      };
      const titles = {
        today: { name: 'Today', cls: 'blue' },
        scheduled: { name: 'Scheduled', cls: 'orange' },
        all: { name: 'All', cls: 'gray' },
        flagged: { name: 'Flagged', cls: 'red' },
        work: { name: 'Work', cls: 'blue' },
        personal: { name: 'Personal', cls: 'green' },
        shopping: { name: 'Shopping', cls: 'orange' },
        ideas: { name: 'Ideas', cls: 'purple' },
      };

      const renderItems = (listId) => {
        const rows = itemsByList[listId] || [];
        return rows
          .map(
            (r, i) =>
              `<label class="reminder-item ${r.done ? 'is-done' : ''}" data-list="${listId}" data-idx="${i}">
                <input type="checkbox" ${r.done ? 'checked' : ''} />
                <span class="rem-circle" aria-hidden="true"></span>
                <span class="rem-text ${r.done ? 'done' : ''}">${r.t}${
                  r.note ? `<span class="rem-note">${r.note}</span>` : ''
                }</span>
              </label>`
          )
          .join('');
      };

      const wireChecks = () => {
        listEl.querySelectorAll('.reminder-item').forEach((row) => {
          const cb = row.querySelector('input[type="checkbox"]');
          if (!cb || cb.dataset.chk) return;
          cb.dataset.chk = '1';
          const text = row.querySelector('.rem-text');
          const listId = row.getAttribute('data-list');
          const idx = parseInt(row.getAttribute('data-idx'), 10);
          cb.addEventListener('change', () => {
            row.classList.toggle('is-done', cb.checked);
            if (text) text.classList.toggle('done', cb.checked);
            if (itemsByList[listId] && itemsByList[listId][idx]) {
              itemsByList[listId][idx].done = cb.checked;
            }
            const cEl = el.querySelector(`.rem-list-item[data-rem-list="${listId}"] .rem-count`);
            if (cEl && itemsByList[listId]) {
              cEl.textContent = String(itemsByList[listId].filter((r) => !r.done).length);
            }
          });
        });
      };

      let active = 'today';
      nav.forEach((item) => {
        item.addEventListener('click', () => {
          nav.forEach((n) => n.classList.remove('active'));
          item.classList.add('active');
          active = item.getAttribute('data-rem-list');
          const meta = titles[active] || { name: active, cls: 'blue' };
          titleEl.textContent = meta.name;
          titleEl.className = meta.cls;
          listEl.innerHTML = renderItems(active);
          wireChecks();
        });
      });
      wireChecks();

      const updateCount = (listId) => {
        const cEl = el.querySelector(`.rem-list-item[data-rem-list="${listId}"] .rem-count`);
        if (!cEl || !itemsByList[listId]) return;
        cEl.textContent = String(itemsByList[listId].filter((r) => !r.done).length);
      };

      const addBtn = el.querySelector('.rem-add');
      if (addBtn && !addBtn.dataset.regWired) {
        addBtn.dataset.regWired = '1';
        addBtn.dataset.wired = '1';
        addBtn.style.cursor = 'pointer';
        addBtn.addEventListener('click', () => {
          if (listEl.querySelector('.reminder-item.is-editing')) return;
          const row = document.createElement('label');
          row.className = 'reminder-item is-editing';
          row.innerHTML =
            '<input type="checkbox" disabled /><span class="rem-circle" aria-hidden="true"></span>' +
            '<span class="rem-text"><input type="text" class="rem-inline-input" placeholder="New Reminder" maxlength="120" /></span>';
          listEl.appendChild(row);
          const input = row.querySelector('.rem-inline-input');
          if (!input) return;
          input.focus();
          let done = false;
          const commit = () => {
            if (done) return;
            done = true;
            const t = (input.value || '').trim();
            if (!t) {
              row.remove();
              return;
            }
            if (!itemsByList[active]) itemsByList[active] = [];
            itemsByList[active].push({ t, done: false, note: '' });
            const idx = itemsByList[active].length - 1;
            row.classList.remove('is-editing');
            row.setAttribute('data-list', active);
            row.setAttribute('data-idx', String(idx));
            row.innerHTML =
              '<input type="checkbox" /><span class="rem-circle" aria-hidden="true"></span>' +
              '<span class="rem-text"></span>';
            row.querySelector('.rem-text').textContent = t;
            wireChecks();
            updateCount(active);
            if (window.MacSounds && MacSounds.play) MacSounds.play('hero');
            if (window.MacShell && MacShell.notify) {
              MacShell.notify('Reminders', 'Added', t, 'now');
            }
          };
          input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commit();
            } else if (e.key === 'Escape') {
              done = true;
              row.remove();
            }
          });
          input.addEventListener('blur', () => setTimeout(commit, 80));
        });
      }
    },
  });

  register({
    id: 'freeform',
    name: 'Freeform',
    category: 'Productivity',
    width: 960,
    height: 640,
    open() {
      return `<div class="ff27-app">
        <div class="ff27-toolbar">
          <div class="ff27-tb-left">
            <strong class="ff27-title">Board</strong>
            <span class="muted">Project Brainstorm</span>
          </div>
          <div class="ff27-tools">
            <button type="button" class="ff27-tool active" title="Select">↖</button>
            <button type="button" class="ff27-tool" title="Sticky Note">🗒</button>
            <button type="button" class="ff27-tool" title="Shapes">▢</button>
            <button type="button" class="ff27-tool" title="Text">T</button>
            <button type="button" class="ff27-tool" title="Pen">✎</button>
            <button type="button" class="ff27-tool" title="Sticky Arrow">➔</button>
            <span class="ff27-sep"></span>
            <button type="button" class="ff27-swatch y" title="Yellow"></button>
            <button type="button" class="ff27-swatch p" title="Pink"></button>
            <button type="button" class="ff27-swatch b" title="Blue"></button>
            <button type="button" class="ff27-swatch g" title="Green"></button>
          </div>
          <div class="ff27-tb-right">
            <button type="button" class="ff27-btn">Share</button>
          </div>
        </div>
        <div class="ff27-canvas">
          <div class="ff27-grid"></div>
          <svg class="ff27-connectors" viewBox="0 0 960 560" preserveAspectRatio="none" aria-hidden="true">
            <path d="M220 160 C280 160, 300 240, 360 260" fill="none" stroke="rgba(10,132,255,0.55)" stroke-width="2" stroke-dasharray="6 4"/>
            <path d="M500 200 C560 220, 580 300, 640 320" fill="none" stroke="rgba(191,90,242,0.5)" stroke-width="2"/>
          </svg>
          <div class="ff27-sticky y" style="left:12%;top:14%">
            <div class="ff27-sticky-bar"></div>
            <p>Liquid Glass goals</p>
            <span class="ff27-sticky-meta">clarity · depth · motion</span>
          </div>
          <div class="ff27-sticky p" style="left:36%;top:22%">
            <div class="ff27-sticky-bar"></div>
            <p>Dock magnification</p>
            <span class="ff27-sticky-meta">hover physics</span>
          </div>
          <div class="ff27-sticky b" style="left:58%;top:12%">
            <div class="ff27-sticky-bar"></div>
            <p>App parity checklist</p>
            <span class="ff27-sticky-meta">Maps · Contacts · iWork</span>
          </div>
          <div class="ff27-sticky g" style="left:22%;top:52%">
            <div class="ff27-sticky-bar"></div>
            <p>Accessibility pass</p>
            <span class="ff27-sticky-meta">contrast · labels</span>
          </div>
          <div class="ff27-shape rect" style="left:48%;top:48%"></div>
          <div class="ff27-shape circle" style="left:68%;top:52%"></div>
          <div class="ff27-shape diamond" style="left:78%;top:28%"></div>
          <div class="ff27-text-box" style="left:8%;top:78%">
            <strong>Connect ideas</strong>
            <p class="muted">Infinite canvas · shapes · stickies · ink</p>
          </div>
          <div class="ff27-note">
            Double-click anywhere to add a sticky note.
          </div>
        </div>
      </div>`;
    },
  });

  register({
    id: 'pages',
    name: 'Pages',
    category: 'Productivity',
    width: 900,
    height: 640,
    open() {
      return `<div class="iwork27-app pages27">
        <div class="iwork27-toolbar">
          <div class="iwork27-tb-left">
            <button type="button" class="iwork27-tb-btn" title="View">View</button>
            <span class="iwork27-sep"></span>
            <button type="button" class="iwork27-icon-btn" title="Undo">↶</button>
            <button type="button" class="iwork27-icon-btn" title="Redo">↷</button>
            <span class="iwork27-sep"></span>
            <button type="button" class="iwork27-icon-btn active" title="Bold"><b>B</b></button>
            <button type="button" class="iwork27-icon-btn" title="Italic"><i>I</i></button>
            <button type="button" class="iwork27-icon-btn" title="Underline"><u>U</u></button>
            <span class="iwork27-sep"></span>
            <button type="button" class="iwork27-tb-btn">Insert</button>
            <button type="button" class="iwork27-tb-btn">Format</button>
          </div>
          <div class="iwork27-tb-center">
            <strong>Design Brief</strong>
            <span class="muted">Pages</span>
          </div>
          <div class="iwork27-tb-right">
            <button type="button" class="iwork27-tb-btn primary">Share</button>
          </div>
        </div>
        <div class="iwork27-body">
          <div class="pages27-canvas">
            <div class="pages27-page" contenteditable="true" spellcheck="false">
              <p class="pages27-kicker">PRODUCT DESIGN</p>
              <h1>macOS 27 Design Brief</h1>
              <p class="pages27-lead">This document outlines the Liquid Glass interface language for the next generation of Mac software. Clarity, depth, and motion work together to create a living desktop.</p>
              <h2>Principles</h2>
              <p>Surfaces remain translucent yet legible. Specular edges catch light as windows move. Controls stay familiar while materials evolve.</p>
              <ul>
                <li>Prefer system materials over flat fills</li>
                <li>Keep sample content generic and private</li>
                <li>Match real app chrome density</li>
              </ul>
              <p class="pages27-placeholder">Start typing to continue this story…</p>
            </div>
          </div>
          <aside class="iwork27-inspector">
            <div class="iwork27-insp-tabs">
              <span class="active">Format</span>
              <span>Document</span>
            </div>
            <div class="iwork27-insp-section">
              <div class="iwork27-insp-label">Style</div>
              <div class="iwork27-style-list">
                <div class="iwork27-style active">Title</div>
                <div class="iwork27-style">Heading</div>
                <div class="iwork27-style">Body</div>
                <div class="iwork27-style">Caption</div>
              </div>
            </div>
            <div class="iwork27-insp-section">
              <div class="iwork27-insp-label">Font</div>
              <div class="iwork27-field">SF Pro Display</div>
              <div class="iwork27-field-row">
                <span class="iwork27-field sm">28</span>
                <span class="iwork27-field sm">Regular</span>
              </div>
            </div>
            <div class="iwork27-insp-section">
              <div class="iwork27-insp-label">Spacing</div>
              <div class="iwork27-slider"><div class="iwork27-slider-fill" style="width:42%"></div></div>
            </div>
          </aside>
        </div>
      </div>`;
    },
  });

  register({
    id: 'numbers',
    name: 'Numbers',
    category: 'Productivity',
    width: 960,
    height: 620,
    open() {
      const headers = ['A', 'B', 'C', 'D', 'E', 'F'];
      const data = [
        ['Month', 'Revenue', 'Cost', 'Profit', 'Growth', 'Notes'],
        ['Jan', '42,000', '28,000', '14,000', '4%', 'Launch'],
        ['Feb', '45,200', '29,100', '16,100', '7%', ''],
        ['Mar', '48,900', '30,400', '18,500', '8%', 'Promo'],
        ['Apr', '51,300', '31,200', '20,100', '5%', ''],
        ['May', '55,000', '32,800', '22,200', '7%', 'Event'],
        ['Jun', '58,400', '33,500', '24,900', '6%', ''],
        ['Jul', '61,200', '34,100', '27,100', '5%', 'Mid-year'],
        ['Aug', '63,800', '35,000', '28,800', '4%', ''],
        ['Sep', '', '', '', '', ''],
      ];
      let table = '<table class="num27-sheet"><thead><tr><th class="corner"></th>' +
        headers.map((h) => `<th>${h}</th>`).join('') +
        '</tr></thead><tbody>';
      for (let r = 0; r < data.length; r++) {
        table += `<tr><th>${r + 1}</th>`;
        for (let c = 0; c < headers.length; c++) {
          const val = data[r][c] || '';
          const isHeader = r === 0;
          const isActive = r === 2 && c === 1;
          table += `<td class="${isHeader ? 'hdr' : ''}${isActive ? ' active' : ''}" contenteditable="true">${val}</td>`;
        }
        table += '</tr>';
      }
      table += '</tbody></table>';
      return `<div class="iwork27-app numbers27">
        <div class="iwork27-toolbar">
          <div class="iwork27-tb-left">
            <button type="button" class="iwork27-tb-btn">Table</button>
            <button type="button" class="iwork27-tb-btn">Chart</button>
            <button type="button" class="iwork27-tb-btn">Text</button>
            <button type="button" class="iwork27-tb-btn">Shape</button>
            <span class="iwork27-sep"></span>
            <button type="button" class="iwork27-icon-btn" title="Sort">⇅</button>
            <button type="button" class="iwork27-icon-btn" title="Filter">☰</button>
            <button type="button" class="iwork27-icon-btn" title="Format">ƒ</button>
          </div>
          <div class="iwork27-tb-center">
            <strong>Budget 2026</strong>
            <span class="muted">Numbers</span>
          </div>
          <div class="iwork27-tb-right">
            <button type="button" class="iwork27-tb-btn primary">Share</button>
          </div>
        </div>
        <div class="num27-formula-bar">
          <span class="num27-cell-ref">B3</span>
          <span class="num27-fx">ƒx</span>
          <input class="num27-formula" value="45200" readonly />
        </div>
        <div class="iwork27-body num27-body">
          <div class="num27-canvas">
            <div class="num27-sheet-wrap">${table}</div>
            <div class="num27-chart-card">
              <div class="num27-chart-title">Revenue vs Cost</div>
              <div class="num27-bars">
                ${[42, 45, 49, 51, 55, 58, 61, 64]
                  .map(
                    (v, i) =>
                      `<div class="num27-bar-col"><div class="num27-bar rev" style="height:${v}%"></div><div class="num27-bar cost" style="height:${28 + i * 1.1}%"></div></div>`
                  )
                  .join('')}
              </div>
              <div class="num27-chart-legend"><span class="rev">Revenue</span><span class="cost">Cost</span></div>
            </div>
          </div>
        </div>
        <div class="num27-tabs">
          <button type="button" class="num27-tab active">Summary</button>
          <button type="button" class="num27-tab">Q1 Detail</button>
          <button type="button" class="num27-tab">+ Sheet</button>
        </div>
      </div>`;
    },
  });

  register({
    id: 'keynote',
    name: 'Keynote',
    category: 'Productivity',
    width: 960,
    height: 640,
    open() {
      const thumbs = [
        { n: 1, label: 'Title', grad: 'linear-gradient(145deg,#0a84ff,#bf5af2)' },
        { n: 2, label: 'Agenda', grad: 'linear-gradient(145deg,#1c1c1e,#3a3a3c)' },
        { n: 3, label: 'Glass', grad: 'linear-gradient(145deg,#30d158,#64d2ff)' },
        { n: 4, label: 'Apps', grad: 'linear-gradient(145deg,#ff9f0a,#ff375f)' },
        { n: 5, label: 'Thanks', grad: 'linear-gradient(145deg,#5e5ce6,#bf5af2)' },
      ];
      return `<div class="iwork27-app keynote27">
        <div class="iwork27-toolbar">
          <div class="iwork27-tb-left">
            <button type="button" class="iwork27-tb-btn primary play">▶ Play</button>
            <span class="iwork27-sep"></span>
            <button type="button" class="iwork27-tb-btn">Add Slide</button>
            <button type="button" class="iwork27-icon-btn" title="Undo">↶</button>
            <button type="button" class="iwork27-icon-btn" title="Redo">↷</button>
            <span class="iwork27-sep"></span>
            <button type="button" class="iwork27-tb-btn">Animate</button>
            <button type="button" class="iwork27-tb-btn">Format</button>
          </div>
          <div class="iwork27-tb-center">
            <strong>macOS 27 Keynote</strong>
            <span class="muted">Keynote</span>
          </div>
          <div class="iwork27-tb-right">
            <button type="button" class="iwork27-tb-btn">Share</button>
          </div>
        </div>
        <div class="iwork27-body kn27-body">
          <aside class="kn27-navigator">
            ${thumbs
              .map(
                (t) => `<div class="kn27-thumb${t.n === 1 ? ' active' : ''}">
                  <span class="kn27-num">${t.n}</span>
                  <div class="kn27-thumb-preview" style="background:${t.grad}">
                    <span>${t.label}</span>
                  </div>
                </div>`
              )
              .join('')}
          </aside>
          <div class="kn27-stage">
            <div class="kn27-slide">
              <div class="kn27-slide-glow"></div>
              <p class="kn27-eyebrow">APPLE DESIGN · SAMPLE</p>
              <h1>macOS 27</h1>
              <p class="kn27-tagline">Liquid Glass. Everywhere.</p>
              <div class="kn27-slide-footer">
                <span>1 of 5</span>
                <span>Confidential sample deck</span>
              </div>
            </div>
          </div>
          <aside class="iwork27-inspector kn27-inspector">
            <div class="iwork27-insp-tabs">
              <span class="active">Format</span>
              <span>Animate</span>
            </div>
            <div class="iwork27-insp-section">
              <div class="iwork27-insp-label">Slide Layout</div>
              <div class="iwork27-style-list">
                <div class="iwork27-style active">Title</div>
                <div class="iwork27-style">Title & Bullets</div>
                <div class="iwork27-style">Blank</div>
              </div>
            </div>
            <div class="iwork27-insp-section">
              <div class="iwork27-insp-label">Background</div>
              <div class="kn27-bg-swatches">
                <span style="background:linear-gradient(145deg,#0a84ff,#bf5af2)"></span>
                <span style="background:#1c1c1e"></span>
                <span style="background:linear-gradient(145deg,#30d158,#64d2ff)"></span>
                <span style="background:#fff;border:1px solid rgba(0,0,0,.12)"></span>
              </div>
            </div>
            <div class="iwork27-insp-section">
              <div class="iwork27-insp-label">Transition</div>
              <div class="iwork27-field">Magic Move</div>
            </div>
          </aside>
        </div>
      </div>`;
    },
  });

  register({
    id: 'preview',
    name: 'Preview',
    category: 'Utilities',
    width: 780,
    height: 600,
    open() {
      const tools = [
        { id: 'select', label: '↖', title: 'Select' },
        { id: 'rect', label: '▭', title: 'Rectangular Selection' },
        { id: 'lasso', label: '◇', title: 'Lasso' },
        { id: 'instant', label: '◎', title: 'Instant Alpha' },
        { id: 'sketch', label: '✎', title: 'Sketch' },
        { id: 'shapes', label: '⬡', title: 'Shapes' },
        { id: 'text', label: 'T', title: 'Text' },
        { id: 'sign', label: '✍', title: 'Sign' },
        { id: 'adjust', label: '◐', title: 'Adjust Color' },
        { id: 'adjust-size', label: '⤢', title: 'Adjust Size' },
      ];
      return `<div class="preview27-app">
        <div class="preview27-toolbar" data-drag-region data-drag-handle>
          <div class="preview27-tb-group">
            <button type="button" class="preview27-tb-btn" title="Sidebar">☰</button>
            <button type="button" class="preview27-tb-btn" title="Share">↗</button>
          </div>
          <div class="preview27-tb-group preview27-markup">
            ${tools
              .map(
                (t, i) =>
                  `<button type="button" class="preview27-tool${i === 0 ? ' is-active' : ''}" title="${t.title}" data-tool="${t.id}">${t.label}</button>`
              )
              .join('')}
          </div>
          <div class="preview27-tb-group preview27-tb-right">
            <button type="button" class="preview27-tb-btn" title="Zoom out">−</button>
            <span class="preview27-zoom">100%</span>
            <button type="button" class="preview27-tb-btn" title="Zoom in">+</button>
            <span class="preview27-fname">Example.pdf</span>
          </div>
        </div>
        <div class="preview27-canvas">
          <div class="preview27-page" aria-label="Document page">
            <div class="preview27-page-header">
              <div class="preview27-doc-title">Example Document</div>
              <div class="preview27-doc-sub">macOS 27 · Sample PDF</div>
            </div>
            <div class="preview27-page-rule"></div>
            <div class="preview27-page-body">
              <p>This is a sample document opened in Preview. Use the markup toolbar to annotate pages, add text, shapes, and signatures.</p>
              <p class="preview27-para-muted">Page 1 of 1 · Letter · 612 × 792</p>
              <div class="preview27-lines">
                <span></span><span></span><span></span><span></span><span class="short"></span>
              </div>
            </div>
            <div class="preview27-page-footer">1</div>
          </div>
        </div>
      </div>`;
    },
  });

  register({
    id: 'textedit',
    name: 'TextEdit',
    category: 'Utilities',
    width: 700,
    height: 520,
    open() {
      return `<div class="te27-app">
        <div class="te27-toolbar" data-drag-region data-drag-handle>
          <div class="te27-tb-group">
            <select class="te27-select" aria-label="Font" tabindex="-1">
              <option>Helvetica</option>
              <option selected>SF Pro Text</option>
              <option>Times New Roman</option>
              <option>Menlo</option>
            </select>
            <select class="te27-select te27-size" aria-label="Size" tabindex="-1">
              <option>12</option>
              <option selected>14</option>
              <option>16</option>
              <option>18</option>
              <option>24</option>
            </select>
          </div>
          <div class="te27-tb-group te27-fmt">
            <button type="button" class="te27-btn" title="Bold"><strong>B</strong></button>
            <button type="button" class="te27-btn" title="Italic"><em>I</em></button>
            <button type="button" class="te27-btn" title="Underline"><u>U</u></button>
            <span class="te27-sep"></span>
            <button type="button" class="te27-btn" title="Align Left">☰</button>
            <button type="button" class="te27-btn is-active" title="Align Center">≡</button>
            <button type="button" class="te27-btn" title="Align Right">☰</button>
            <span class="te27-sep"></span>
            <button type="button" class="te27-btn" title="Lists">•≡</button>
            <button type="button" class="te27-btn" title="Text Color">A</button>
          </div>
          <div class="te27-tb-group te27-tb-right">
            <button type="button" class="te27-btn is-active" title="Show Ruler" data-te-ruler>Ruler</button>
            <span class="te27-docname">Untitled</span>
          </div>
        </div>
        <div class="te27-ruler" aria-hidden="true">
          <div class="te27-ruler-track">
            ${Array.from({ length: 17 }, (_, i) => `<span class="te27-tick${i % 2 === 0 ? ' major' : ''}" style="left:${(i / 16) * 100}%">${i % 2 === 0 ? i / 2 : ''}</span>`).join('')}
            <div class="te27-margin te27-margin-l" style="left:12.5%"></div>
            <div class="te27-margin te27-margin-r" style="left:87.5%"></div>
          </div>
        </div>
        <div class="te27-stage">
          <div class="te27-page" contenteditable="true" spellcheck="true" data-placeholder=" ">Liquid Glass design notes

Type here. Use the toolbar for Bold, lists, and colors.
Save stores a demo document name from the first line.</div>
        </div>
      </div>`;
    },
  });

  register({
    id: 'calculator',
    name: 'Calculator',
    category: 'Utilities',
    width: 280,
    height: 480,
    resizable: false,
    open() {
      // macOS Calculator: C/±/% (gray), operators (orange), digits (dark), 0 wide
      const keys = [
        { k: 'AC', cls: 'fn' },
        { k: '±', cls: 'fn' },
        { k: '%', cls: 'fn' },
        { k: '÷', cls: 'op' },
        { k: '7', cls: '' },
        { k: '8', cls: '' },
        { k: '9', cls: '' },
        { k: '×', cls: 'op' },
        { k: '4', cls: '' },
        { k: '5', cls: '' },
        { k: '6', cls: '' },
        { k: '−', cls: 'op' },
        { k: '1', cls: '' },
        { k: '2', cls: '' },
        { k: '3', cls: '' },
        { k: '+', cls: 'op' },
        { k: '0', cls: 'wide' },
        { k: '.', cls: '' },
        { k: '=', cls: 'op' },
      ];
      return `<div class="calc" id="calc-app">
        <div class="calc-display" id="calc-display">0</div>
        <div class="calc-keys">
          ${keys
            .map(
              (row) =>
                `<button type="button" class="calc-key${row.cls ? ' ' + row.cls : ''}" data-key="${row.k}">${row.k}</button>`
            )
            .join('')}
        </div>
      </div>`;
    },
    onMount(el) {
      const display = el.querySelector('#calc-display');
      let cur = '0';
      let prev = null;
      let op = null;
      let reset = false;
      const format = (n) => {
        if (n === 'Error' || n === 'Infinity' || n === '-Infinity' || n === 'NaN') return 'Error';
        const num = typeof n === 'number' ? n : parseFloat(n);
        if (!isFinite(num)) return 'Error';
        const s = String(num);
        if (s.length > 12) {
          return num.toPrecision(10).replace(/\.?0+e/, 'e');
        }
        return s;
      };
      const setOpActive = (key) => {
        el.querySelectorAll('.calc-key.op').forEach((b) => b.classList.remove('is-active'));
        if (key) {
          const btn = el.querySelector(`.calc-key.op[data-key="${key}"]`);
          if (btn) btn.classList.add('is-active');
        }
      };
      const clearBtn = el.querySelector('.calc-key[data-key="AC"]');
      el.querySelectorAll('.calc-key').forEach((btn) => {
        btn.addEventListener('click', () => {
          const k = btn.dataset.key;
          if ((k >= '0' && k <= '9') || k === '.') {
            if (reset) {
              cur = '0';
              reset = false;
            }
            setOpActive(null);
            if (k === '.' && cur.includes('.')) return;
            cur = cur === '0' && k !== '.' ? k : cur + k;
            display.textContent = cur;
            if (clearBtn) clearBtn.textContent = 'C';
          } else if (k === 'AC' || k === 'C') {
            if (clearBtn && clearBtn.textContent === 'C' && cur !== '0') {
              cur = '0';
              display.textContent = cur;
              clearBtn.textContent = 'AC';
              return;
            }
            cur = '0';
            prev = null;
            op = null;
            reset = false;
            display.textContent = cur;
            setOpActive(null);
            if (clearBtn) clearBtn.textContent = 'AC';
          } else if (k === '±') {
            cur = format(parseFloat(cur) * -1);
            display.textContent = cur;
          } else if (k === '%') {
            cur = format(parseFloat(cur) / 100);
            display.textContent = cur;
          } else if (['÷', '×', '−', '+'].includes(k)) {
            if (op != null && prev != null && !reset) {
              const b = parseFloat(cur);
              let r = b;
              if (op === '+') r = prev + b;
              if (op === '−') r = prev - b;
              if (op === '×') r = prev * b;
              if (op === '÷') r = b === 0 ? 'Error' : prev / b;
              cur = format(r);
              display.textContent = cur;
            }
            prev = parseFloat(cur);
            op = k;
            reset = true;
            setOpActive(k);
          } else if (k === '=') {
            if (op == null || prev == null) return;
            const b = parseFloat(cur);
            let r = b;
            if (op === '+') r = prev + b;
            if (op === '−') r = prev - b;
            if (op === '×') r = prev * b;
            if (op === '÷') r = b === 0 ? 'Error' : prev / b;
            cur = format(r);
            display.textContent = cur;
            op = null;
            prev = null;
            reset = true;
            setOpActive(null);
          }
        });
      });
    },
  });

  register({
    id: 'clock',
    name: 'Clock',
    category: 'Utilities',
    width: 400,
    height: 520,
    open() {
      const cities = [
        { city: 'Cupertino', tz: 'America/Los_Angeles', label: 'Today, Local' },
        { city: 'New York', tz: 'America/New_York', label: 'Today' },
        { city: 'London', tz: 'Europe/London', label: 'Today' },
        { city: 'Tokyo', tz: 'Asia/Tokyo', label: 'Tomorrow' },
        { city: 'Sydney', tz: 'Australia/Sydney', label: 'Tomorrow' },
      ];
      const alarms = [
        { time: '6:30', ampm: 'AM', label: 'Weekdays', on: true },
        { time: '7:00', ampm: 'AM', label: 'Weekends', on: false },
        { time: '9:00', ampm: 'PM', label: 'Reminder', on: true },
      ];
      return `<div class="clock-app" id="clock-app">
        <div class="clock-tabs" role="tablist">
          <button type="button" class="active" data-clock-tab="world" role="tab">World</button>
          <button type="button" data-clock-tab="alarms" role="tab">Alarms</button>
          <button type="button" data-clock-tab="stopwatch" role="tab">Stopwatch</button>
          <button type="button" data-clock-tab="timers" role="tab">Timers</button>
        </div>
        <div class="clock-panel" data-panel="world" role="tabpanel">
          <div class="world-clocks">
            ${cities
              .map(
                (c) =>
                  `<div class="wc-row">
                    <div>
                      <strong>${c.city}</strong>
                      <div class="wc-meta" data-wc-label="${c.tz}">${c.label}</div>
                    </div>
                    <div class="wc-right">
                      <div class="wc-analog" data-tz="${c.tz}" aria-hidden="true">
                        <span class="hand hour"></span>
                        <span class="hand minute"></span>
                        <span class="hand second"></span>
                        <span class="dot"></span>
                      </div>
                      <div>
                        <div class="wc-time" data-tz="${c.tz}">--:--</div>
                      </div>
                    </div>
                  </div>`
              )
              .join('')}
          </div>
        </div>
        <div class="clock-panel" data-panel="alarms" role="tabpanel" hidden>
          ${alarms
            .map(
              (a) =>
                `<div class="alarm-row">
                  <div>
                    <div class="alarm-time">${a.time}<span class="wc-ampm"> ${a.ampm}</span></div>
                    <div class="alarm-label">${a.label}</div>
                  </div>
                  <label class="toggle ${a.on ? 'on' : ''}"><span></span></label>
                </div>`
            )
            .join('')}
        </div>
        <div class="clock-panel" data-panel="stopwatch" role="tabpanel" hidden>
          <div class="stopwatch-view">
            <div class="sw-time" id="sw-display">00:00.00</div>
            <div class="sw-controls">
              <button type="button" class="sw-btn" id="sw-lap" disabled>Lap</button>
              <button type="button" class="sw-btn primary" id="sw-toggle">Start</button>
            </div>
            <div class="sw-laps" id="sw-laps"></div>
          </div>
        </div>
        <div class="clock-panel" data-panel="timers" role="tabpanel" hidden>
          <div class="timers-view">
            <div class="timer-display" id="timer-display">05:00</div>
            <div class="timer-presets">
              <button type="button" class="timer-preset" data-secs="60">1 min</button>
              <button type="button" class="timer-preset is-selected" data-secs="300">5 min</button>
              <button type="button" class="timer-preset" data-secs="600">10 min</button>
              <button type="button" class="timer-preset" data-secs="900">15 min</button>
              <button type="button" class="timer-preset" data-secs="1800">30 min</button>
              <button type="button" class="timer-preset" data-secs="3600">1 hour</button>
            </div>
            <div class="timer-actions">
              <button type="button" class="sw-btn" id="timer-reset">Reset</button>
              <button type="button" class="sw-btn primary" id="timer-toggle">Start</button>
            </div>
          </div>
        </div>
      </div>`;
    },
    onMount(el) {
      const tabs = el.querySelectorAll('[data-clock-tab]');
      const panels = el.querySelectorAll('.clock-panel');
      tabs.forEach((tab) => {
        tab.addEventListener('click', () => {
          const id = tab.getAttribute('data-clock-tab');
          tabs.forEach((t) => t.classList.remove('active'));
          tab.classList.add('active');
          panels.forEach((p) => {
            p.hidden = p.getAttribute('data-panel') !== id;
          });
        });
      });

      // World clocks
      const tickWorld = () => {
        el.querySelectorAll('.wc-time[data-tz]').forEach((node) => {
          const tz = node.getAttribute('data-tz');
          try {
            const parts = new Intl.DateTimeFormat('en-US', {
              timeZone: tz,
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
            }).formatToParts(new Date());
            const hour = parts.find((p) => p.type === 'hour')?.value || '';
            const minute = parts.find((p) => p.type === 'minute')?.value || '';
            const dayPeriod = parts.find((p) => p.type === 'dayPeriod')?.value || '';
            node.innerHTML = `${hour}:${minute}<span class="wc-ampm"> ${dayPeriod}</span>`;
          } catch (e) {
            node.textContent = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
          }
        });
        el.querySelectorAll('.wc-analog[data-tz]').forEach((face) => {
          const tz = face.getAttribute('data-tz');
          let h = 0;
          let m = 0;
          let s = 0;
          try {
            const parts = new Intl.DateTimeFormat('en-US', {
              timeZone: tz,
              hour: 'numeric',
              minute: 'numeric',
              second: 'numeric',
              hour12: false,
            }).formatToParts(new Date());
            h = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10) % 12;
            m = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);
            s = parseInt(parts.find((p) => p.type === 'second')?.value || '0', 10);
          } catch (e) {
            const d = new Date();
            h = d.getHours() % 12;
            m = d.getMinutes();
            s = d.getSeconds();
          }
          const hourEl = face.querySelector('.hand.hour');
          const minEl = face.querySelector('.hand.minute');
          const secEl = face.querySelector('.hand.second');
          if (hourEl) hourEl.style.transform = `rotate(${h * 30 + m * 0.5}deg)`;
          if (minEl) minEl.style.transform = `rotate(${m * 6}deg)`;
          if (secEl) secEl.style.transform = `rotate(${s * 6}deg)`;
        });
      };
      tickWorld();
      const worldId = setInterval(tickWorld, 1000);

      // Stopwatch
      const swDisplay = el.querySelector('#sw-display');
      const swToggle = el.querySelector('#sw-toggle');
      const swLap = el.querySelector('#sw-lap');
      const swLaps = el.querySelector('#sw-laps');
      let swRunning = false;
      let swStart = 0;
      let swElapsed = 0;
      let swRaf = null;
      let lapCount = 0;
      const fmtSw = (ms) => {
        const total = Math.floor(ms);
        const cs = Math.floor((total % 1000) / 10);
        const sec = Math.floor(total / 1000) % 60;
        const min = Math.floor(total / 60000);
        return `${(min<10?'0':'')+min}:${(sec<10?'0':'')+sec}.${(cs<10?'0':'')+cs}`;
      };
      const swFrame = () => {
        const now = performance.now();
        const t = swElapsed + (now - swStart);
        swDisplay.textContent = fmtSw(t);
        swRaf = requestAnimationFrame(swFrame);
      };
      swToggle.addEventListener('click', () => {
        if (!swRunning) {
          swRunning = true;
          swStart = performance.now();
          swToggle.textContent = 'Stop';
          swToggle.classList.add('stop');
          swToggle.classList.remove('primary');
          swLap.disabled = false;
          swLap.textContent = 'Lap';
          swRaf = requestAnimationFrame(swFrame);
        } else {
          swRunning = false;
          swElapsed += performance.now() - swStart;
          cancelAnimationFrame(swRaf);
          swToggle.textContent = 'Start';
          swToggle.classList.remove('stop');
          swToggle.classList.add('primary');
          swLap.textContent = 'Reset';
        }
      });
      swLap.addEventListener('click', () => {
        if (swRunning) {
          lapCount += 1;
          const t = swElapsed + (performance.now() - swStart);
          const row = document.createElement('div');
          row.className = 'sw-lap';
          row.innerHTML = `<span>Lap ${lapCount}</span><span>${fmtSw(t)}</span>`;
          swLaps.prepend(row);
        } else {
          swElapsed = 0;
          lapCount = 0;
          swDisplay.textContent = '00:00.00';
          swLaps.innerHTML = '';
          swLap.disabled = true;
          swLap.textContent = 'Lap';
        }
      });

      // Timer
      const timerDisplay = el.querySelector('#timer-display');
      const timerToggle = el.querySelector('#timer-toggle');
      const timerReset = el.querySelector('#timer-reset');
      let timerTotal = 300;
      let timerLeft = 300;
      let timerRunning = false;
      let timerEnd = 0;
      let timerIv = null;
      const fmtTimer = (secs) => {
        const s = Math.max(0, Math.ceil(secs));
        const m = Math.floor(s / 60);
        const r = s % 60;
        return `${(m<10?'0':'')+m}:${(r<10?'0':'')+r}`;
      };
      const stopTimer = () => {
        timerRunning = false;
        if (timerIv) clearInterval(timerIv);
        timerIv = null;
        timerToggle.textContent = 'Start';
        timerToggle.classList.add('primary');
        timerToggle.classList.remove('stop');
      };
      el.querySelectorAll('.timer-preset').forEach((btn) => {
        btn.addEventListener('click', () => {
          el.querySelectorAll('.timer-preset').forEach((b) => b.classList.remove('is-selected'));
          btn.classList.add('is-selected');
          timerTotal = parseInt(btn.getAttribute('data-secs'), 10);
          timerLeft = timerTotal;
          stopTimer();
          timerDisplay.textContent = fmtTimer(timerLeft);
        });
      });
      timerToggle.addEventListener('click', () => {
        if (!timerRunning) {
          if (timerLeft <= 0) timerLeft = timerTotal;
          timerRunning = true;
          timerEnd = Date.now() + timerLeft * 1000;
          timerToggle.textContent = 'Pause';
          timerToggle.classList.add('stop');
          timerToggle.classList.remove('primary');
          timerIv = setInterval(() => {
            timerLeft = (timerEnd - Date.now()) / 1000;
            if (timerLeft <= 0) {
              timerLeft = 0;
              timerDisplay.textContent = '00:00';
              stopTimer();
              if (window.MacSounds && MacSounds.play) MacSounds.play('sosumi');
              if (window.MacShell && MacShell.notify) {
                MacShell.notify('Clock', 'Timer', 'Time is up', 'now', { force: true });
              }
              return;
            }
            timerDisplay.textContent = fmtTimer(timerLeft);
          }, 200);
        } else {
          timerLeft = (timerEnd - Date.now()) / 1000;
          stopTimer();
        }
      });
      timerReset.addEventListener('click', () => {
        stopTimer();
        timerLeft = timerTotal;
        timerDisplay.textContent = fmtTimer(timerLeft);
      });

      // Alarm toggles
      el.querySelectorAll('.alarm-row .toggle').forEach((tog) => {
        tog.addEventListener('click', (e) => {
          e.preventDefault();
          tog.classList.toggle('on');
        });
      });

      el._cleanup = () => {
        clearInterval(worldId);
        cancelAnimationFrame(swRaf);
        if (timerIv) clearInterval(timerIv);
      };
    },
  });

  register({
    id: 'terminal',
    name: 'Terminal',
    category: 'Utilities',
    width: 720,
    height: 460,
    open() {
      /* Generic prompt — no personal username/paths */
      return `<div class="term27-app" id="term-app">
        <div class="term27-tabbar" data-drag-region data-drag-handle>
          <div class="term27-tab is-active">
            <span class="term27-tab-title">zsh — 80×24</span>
            <button type="button" class="term27-tab-close" aria-label="Close tab">×</button>
          </div>
          <button type="button" class="term27-tab-add" aria-label="New tab">+</button>
        </div>
        <div class="term27-body">
          <div class="term-lines" id="term-lines">
            <div>Last login: Fri Jul 17 09:41:00 on ttys000</div>
            <div><span class="term-prompt">user@macos-27 ~ %</span> <span class="term-hint">type help</span></div>
          </div>
          <div class="term-input-row">
            <span class="term-prompt">user@macos-27 ~ %</span>
            <input id="term-input" autocomplete="off" spellcheck="false" aria-label="Terminal input" />
          </div>
        </div>
      </div>`;
    },
    onMount(el) {
      const lines = el.querySelector('#term-lines');
      const input = el.querySelector('#term-input');
      const prompt = 'user@macos-27 ~ %';
      let cwd = '~';
      const history = [];
      let histPos = -1;
      const print = (t, cls) => {
        const d = document.createElement('div');
        if (cls) d.className = cls;
        d.textContent = t;
        lines.appendChild(d);
        lines.scrollTop = lines.scrollHeight;
      };
      const printHTML = (html) => {
        const d = document.createElement('div');
        d.innerHTML = html;
        lines.appendChild(d);
        lines.scrollTop = lines.scrollHeight;
      };
      const promptStr = () => `user@macos-27 ${cwd} %`;
      const run = (raw) => {
        const cmd = (raw || '').trim();
        print(`${promptStr()} ${cmd}`);
        if (!cmd) return;
        history.unshift(cmd);
        if (history.length > 50) history.pop();
        histPos = -1;
        const parts = cmd.split(/\s+/);
        const base = parts[0];
        const arg = parts.slice(1).join(' ');
        if (base === 'help') {
          print(
            'Built-in: help date whoami clear uname ls pwd cd echo cat open neofetch history fortune cowsay ping curl env hostname uptime cal say afplay touch mkdir which python3 node top ps df free man tree pbcopy pbpaste git brew diskutil id groups sw_vers'
          );
        } else if (base === 'say') {
          print('say: “' + (arg || 'hello') + '”');
          if (window.speechSynthesis) {
            window.speechSynthesis.speak(new SpeechSynthesisUtterance(arg || 'hello'));
          } else if (global.MacSounds && MacSounds.play) {
            MacSounds.play('submarine');
          }
        } else if (base === 'afplay') {
          const snd = arg || 'sosumi';
          print('Playing ' + snd + ' (synthesized)');
          if (global.MacSounds && MacSounds.play) MacSounds.play(snd.replace(/\.\w+$/, '') || 'sosumi');
        } else if (base === 'touch') print('');
        else if (base === 'mkdir') print('');
        else if (base === 'which') print(arg ? '/usr/bin/' + arg.split(/\s+/)[0] : '');
        else if (base === 'python3' || base === 'node') {
          print((base === 'python3' ? 'Python 3.12.0' : 'v20.11.0') + ' · demo only, not a real REPL');
        } else if (base === 'date') print(new Date().toString());
        else if (base === 'whoami') print('user');
        else if (base === 'hostname') print('macos-27.local');
        else if (base === 'id') print('uid=501(user) gid=20(staff) groups=20(staff),12(everyone),61(localaccounts)');
        else if (base === 'groups') print('staff everyone localaccounts');
        else if (base === 'sw_vers') {
          print('ProductName:\tmacOS');
          print('ProductVersion:\t27.0');
          print('BuildVersion:\t27A100 (virtual)');
        } else if (base === 'pwd') print(cwd === '~' ? '/Users/user' : cwd.replace(/^~/, '/Users/user'));
        else if (base === 'uname') {
          if (parts[1] === '-a') print('Darwin macos-27 27.0.0 Darwin Kernel Version 27.0.0 root:xnu-10000/RELEASE_ARM64_T6000 arm64');
          else print('Darwin');
        } else if (base === 'ls') {
          if (arg === '-la' || arg === '-l') {
            print('drwxr-xr-x  user  staff  Applications');
            print('drwxr-xr-x  user  staff  Desktop');
            print('drwxr-xr-x  user  staff  Documents');
            print('drwxr-xr-x  user  staff  Downloads');
            print('drwxr-xr-x  user  staff  Library');
            print('drwxr-xr-x  user  staff  Movies');
            print('drwxr-xr-x  user  staff  Music');
            print('drwxr-xr-x  user  staff  Pictures');
          } else print('Applications  Desktop  Documents  Downloads  Library  Movies  Music  Pictures');
        } else if (base === 'tree') {
          print('.');
          print('├── Applications');
          print('├── Desktop');
          print('│   └── wallpaper.jpg');
          print('├── Documents');
          print('│   └── README.md');
          print('└── Pictures');
          print('    └── funny/');
        } else if (base === 'cd') {
          if (!arg || arg === '~' || arg === '/') cwd = '~';
          else if (arg === '..') cwd = '~';
          else if (arg.startsWith('/')) cwd = arg;
          else cwd = (cwd === '~' ? '~' : cwd) + '/' + arg.replace(/^\.\//, '');
          print('');
        } else if (base === 'echo') print(arg.replace(/^["']|["']$/g, ''));
        else if (base === 'cat') {
          if (arg === 'README' || arg === 'readme.md') print('# macOS 27 virtual desktop\nLiquid Glass demo. Type help for commands.');
          else print(`cat: ${arg || 'file'}: No such file or directory`);
        } else if (base === 'open') {
          const map = {
            safari: 'safari',
            finder: 'finder',
            '.': 'finder',
            calculator: 'calculator',
            terminal: 'terminal',
            settings: 'system-settings',
            'system-settings': 'system-settings',
            photos: 'photos',
            music: 'music',
            mail: 'mail',
            messages: 'messages',
            notes: 'notes',
            calendar: 'calendar',
            maps: 'maps',
            weather: 'weather',
            stocks: 'stocks',
            podcasts: 'podcasts',
            books: 'books',
            chess: 'chess',
            siri: 'siri',
            preview: 'preview',
            textedit: 'textedit',
            facetime: 'facetime',
            iphone: 'iphone-mirroring',
            sidecar: 'sidecar',
          };
          const key = (arg || 'finder').toLowerCase().replace(/\.app$/, '');
          const id = map[key] || key.replace(/\s+/g, '-');
          if (global.MacShell && MacShell.openApp) {
            MacShell.openApp(id);
            print(`Opening ${id}…`);
          } else print(`open: can't open ${arg}`);
        } else if (base === 'clear') lines.innerHTML = '';
        else if (base === 'history') history.slice().reverse().forEach((h, i) => { const n = String(i + 1); print(' ' + ' '.repeat(Math.max(0, 4 - n.length)) + n + '  ' + h); });
        else if (base === 'env') {
          print('TERM=xterm-256color');
          print('SHELL=/bin/zsh');
          print('USER=user');
          print('HOME=/Users/user');
          print('LANG=en_US.UTF-8');
          print('PATH=/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin');
        } else if (base === 'uptime') print('12:00  up 1 day,  4:12,  1 user,  load averages: 1.20 1.10 1.05');
        else if (base === 'top' || base === 'ps') {
          print('PID   COMMAND      %CPU  MEM');
          print('1     launchd     0.1   12M');
          print('88    WindowServer 4.2  180M');
          print('312   Finder      0.8   95M');
          print('401   Safari      2.1  240M');
          print('512   Terminal    0.3   48M');
        } else if (base === 'df' || base === 'diskutil') {
          print('Filesystem      Size   Used  Avail Capacity  Mounted on');
          print('/dev/disk3s1s1  500G   220G   260G    46%    /');
          print('/dev/disk3s5    500G    12G   260G     5%    /System/Volumes/Data');
        } else if (base === 'free') {
          print('              total        used        free');
          print('Mem:          24Gi        9.2Gi       14Gi');
        } else if (base === 'man') {
          print('MAN(1)                    User Commands');
          print('NAME');
          print('       ' + (arg || 'help') + ' — demo manual page');
          print('SEE ALSO');
          print('       help(1), open(1)');
        } else if (base === 'pbcopy') {
          const t = arg || 'clipboard demo';
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(t).catch(function () {});
          }
          print('Copied ' + t.length + ' bytes');
        } else if (base === 'pbpaste') {
          print('(clipboard demo text)');
        } else if (base === 'git') {
          if (parts[1] === 'status') {
            print('On branch main');
            print('Your branch is up to date with \'origin/main\'.');
            print('nothing to commit, working tree clean');
          } else if (parts[1] === 'log') {
            print('commit fa73d4a (HEAD -> main)');
            print('Author: Demo <demo@example.com>');
            print('    iPhone Calculator/Calendar/Reminders/Sounds');
          } else print('usage: git <command> [status|log|help]');
        } else if (base === 'brew') {
          print('Homebrew 4.x (demo) — not installed; simulated only');
        } else if (base === 'cal' || base === 'calendar') {
          print('     July 2026');
          print('Su Mo Tu We Th Fr Sa');
          print('          1  2  3  4');
          print(' 5  6  7  8  9 10 11');
          print('12 13 14 15 16 17 18');
          print('19 20 21 22 23 24 25');
          print('26 27 28 29 30 31');
        } else if (base === 'ping') {
          const host = arg || 'example.com';
          print(`PING ${host} (93.184.216.34): 56 data bytes`);
          print(`64 bytes from 93.184.216.34: icmp_seq=0 ttl=54 time=12.3 ms`);
          print(`64 bytes from 93.184.216.34: icmp_seq=1 ttl=54 time=11.8 ms`);
          print(`--- ${host} ping statistics ---`);
          print('2 packets transmitted, 2 packets received, 0.0% packet loss');
        } else if (base === 'curl') {
          print(`curl: (demo) fetched ${(arg || 'https://example.com').slice(0, 48)}`);
          print('<!doctype html><title>Example</title>…');
        } else if (base === 'fortune') {
          const fortunes = [
            'Your virtual Mac has excellent uptime.',
            'Liquid Glass: more blur, same soul.',
            'The cake is a file on the Desktop.',
            'sudo make me a sandwich — permission denied (demo).',
          ];
          print(fortunes[Math.floor(Math.random() * fortunes.length)]);
        } else if (base === 'cowsay') {
          const msg = arg || 'moo';
          print(' ' + '_'.repeat(msg.length + 2));
          print('< ' + msg + ' >');
          print(' ' + '-'.repeat(msg.length + 2));
          print('        \\   ^__^');
          print('         \\  (oo)\\_______');
          print('            (__)\\       )\\/\\');
          print('                ||----w |');
          print('                ||     ||');
        } else if (base === 'neofetch') {
          print('user@macos-27');
          print('------------');
          print('OS: macOS 27 (Liquid Glass)');
          print('Host: Virtual Mac');
          print('Kernel: Darwin 27.0.0');
          print('Shell: zsh');
          print('DE: Aqua / Liquid Glass');
          print('CPU: Apple silicon (sim)');
          print('Memory: 24 GB');
          print('Resolution: ' + (typeof screen !== 'undefined' ? screen.width + 'x' + screen.height : '1920x1080'));
        } else {
          print(`zsh: command not found: ${base}`);
          if (global.MacSounds && MacSounds.play) MacSounds.play('sosumi');
        }
      };
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          run(input.value);
          input.value = '';
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          if (histPos < history.length - 1) {
            histPos++;
            input.value = history[histPos] || '';
          }
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          if (histPos > 0) {
            histPos--;
            input.value = history[histPos] || '';
          } else {
            histPos = -1;
            input.value = '';
          }
        }
      });
      const addTab = el.querySelector('.term27-tab-add');
      if (addTab) {
        addTab.addEventListener('click', () => {
          print('— new tab (demo) —');
          if (global.MacSounds && MacSounds.play) MacSounds.play('pop');
        });
      }
      setTimeout(() => input.focus(), 100);
    },
  });

  // ─── Entertainment & media ──────────────────────────────────────
  register({
    id: 'tv',
    name: 'TV',
    category: 'Entertainment',
    width: 980,
    height: 620,
    open() {
      /* Generic public show titles for layout demo only */
      const topShows = [
        { t: 'Severance', g: 'Thriller', h: 220 },
        { t: 'Foundation', g: 'Sci-Fi', h: 260 },
        { t: 'Slow Horses', g: 'Drama', h: 20 },
        { t: 'The Studio', g: 'Comedy', h: 320 },
        { t: 'Silo', g: 'Sci-Fi', h: 180 },
        { t: 'For All Mankind', g: 'Drama', h: 200 },
      ];
      const newShows = [
        { t: 'Presumed Innocent', g: 'Crime', h: 10 },
        { t: 'Dark Matter', g: 'Sci-Fi', h: 280 },
        { t: 'Palm Royale', g: 'Comedy', h: 340 },
        { t: 'Sugar', g: 'Mystery', h: 40 },
        { t: 'The Morning Show', g: 'Drama', h: 300 },
        { t: 'Ted Lasso', g: 'Comedy', h: 140 },
      ];
      const sports = [
        { t: 'Friday Night Baseball', g: 'Live Sports', h: 130 },
        { t: 'MLS Season Pass', g: 'Soccer', h: 150 },
        { t: 'Friday Night Baseball', g: 'Highlights', h: 100 },
        { t: 'F1: Drive to Survive', g: 'Documentary', h: 0 },
      ];
      const showCard = (s) =>
        `<div class="tv-card">
          <div class="tv-poster" style="--h:${s.h}">
            <span class="tv-poster-sheen"></span>
            <span class="tv-poster-badge">TV+</span>
          </div>
          <strong>${s.t}</strong>
          <span class="muted">${s.g}</span>
        </div>`;
      const shelf = (title, items) =>
        `<div class="tv-shelf">
          <div class="tv-shelf-head">
            <h3>${title}</h3>
            <span class="linkish muted">See All</span>
          </div>
          <div class="tv-shelf-row">${items.map(showCard).join('')}</div>
        </div>`;
      return `<div class="app-layout col tv-app">
        ${toolbar(`
          <div class="tv-tabs">
            <button type="button" class="tv-tab active">Watch Now</button>
            <button type="button" class="tv-tab">Movies</button>
            <button type="button" class="tv-tab">TV Shows</button>
            <button type="button" class="tv-tab">Sports</button>
            <button type="button" class="tv-tab">Library</button>
            <button type="button" class="tv-tab">Search</button>
          </div>
        `)}
        <div class="tv-scroll">
          <div class="tv-hero glass">
            <div class="tv-hero-badge">FEATURED</div>
            <h1>Watch Now</h1>
            <p class="muted">Original stories. Cinematic sound. Streaming on Apple TV+.</p>
            <div class="tv-hero-actions">
              <button type="button" class="btn-primary">Play</button>
              <button type="button" class="btn-glass">+ My List</button>
            </div>
          </div>
          ${shelf('Top Shows', topShows)}
          ${shelf('New & Noteworthy', newShows)}
          ${shelf('Sports & More', sports)}
        </div>
      </div>`;
    },
  });

  register({
    id: 'podcasts',
    name: 'Podcasts',
    category: 'Entertainment',
    width: 820,
    height: 560,
    open() {
      const eps = [
        { title: 'Waveform', sub: 'Relay FM', meta: 'New · 58 min' },
        { title: 'Accidental Tech Podcast', sub: 'ATP', meta: 'Yesterday · 2h' },
        { title: 'Connected', sub: 'Relay FM', meta: 'Jul 14 · 1h 12m' },
        { title: 'The Talk Show', sub: 'Daring Fireball', meta: 'Jul 10 · 2h 40m' },
        { title: 'Upgrade', sub: 'Relay FM', meta: 'Jul 8 · 1h 30m' },
        { title: 'Cortex', sub: 'Relay FM', meta: 'Jul 5 · 2h' },
      ];
      return `<div class="app-layout col podcasts-app">
        ${toolbar(`<strong>Podcasts</strong><span class="muted">Listen Now</span><input class="search-field" type="search" placeholder="Search shows" />`)}
        <div class="pod-body">
          <div class="pod-list">
            ${eps
              .map(
                (e, i) =>
                  `<div class="app-list-row pod-episode ${i === 0 ? 'is-selected' : ''}">
                    <div class="pod-art" style="--h:${i * 40}">🎙</div>
                    <div class="pod-info"><strong>${e.title}</strong><span class="muted">${e.sub}</span></div>
                    <span class="muted pod-meta">${e.meta}</span>
                  </div>`
              )
              .join('')}
          </div>
          <div class="pod-now">
            <div class="pod-now-art">🎙</div>
            <div class="pod-now-meta"><strong>Waveform</strong><span class="muted">Relay FM · Ready</span></div>
            <button type="button" class="btn-primary pod-play-btn">Play</button>
          </div>
        </div>
      </div>`;
    },
  });

  register({
    id: 'news',
    name: 'News',
    category: 'Entertainment',
    width: 860,
    height: 580,
    open() {
      return `<div class="app-layout col">
        ${toolbar(`<strong>Apple News</strong><span class="muted">Today</span>`)}
        <div class="news-hero glass"><div class="store-badge">TOP STORIES</div><h2>macOS 27 redefines the desktop with Liquid Glass</h2><p class="muted">Apple · 2h ago</p></div>
        ${listRows([
          { title: 'How Liquid Glass changes app design', sub: 'Design · 4h', meta: '' },
          { title: 'Apple Intelligence expands on Mac', sub: 'Tech · 6h', meta: '' },
          { title: 'Best wallpapers for the new look', sub: 'Lifestyle · 8h', meta: '' },
        ])}
      </div>`;
    },
  });

  register({
    id: 'stocks',
    name: 'Stocks',
    category: 'Utilities',
    width: 380,
    height: 560,
    open() {
      const stocks = [
        { sym: 'AAPL', name: 'Apple Inc.', price: '214.52', change: '+1.24%', up: true },
        { sym: 'MSFT', name: 'Microsoft', price: '448.10', change: '+0.62%', up: true },
        { sym: 'GOOGL', name: 'Alphabet', price: '178.33', change: '−0.41%', up: false },
        { sym: 'AMZN', name: 'Amazon', price: '192.08', change: '+0.88%', up: true },
        { sym: 'TSLA', name: 'Tesla', price: '248.60', change: '−1.12%', up: false },
        { sym: 'META', name: 'Meta Platforms', price: '512.44', change: '+0.35%', up: true },
        { sym: 'NVDA', name: 'NVIDIA', price: '131.28', change: '+2.15%', up: true },
      ];
      // Placeholder chart paths (generic, not real market data)
      const upPath = 'M0,80 C40,70 60,90 100,55 C140,20 180,40 220,30 C260,20 300,45 340,25 C360,18 380,22 400,15';
      const downPath = 'M0,20 C40,30 60,15 100,45 C140,75 180,55 220,70 C260,85 300,60 340,78 C360,85 380,80 400,90';
      const first = stocks[0];
      return `<div class="stocks-app" id="stocks-app">
        <div class="stocks-toolbar"><span>Watchlist</span><span class="muted">Indices</span></div>
        <div class="stocks-body">
          <div class="stocks-list">
            ${stocks
              .map(
                (s, i) =>
                  `<div class="stock-row ${i === 0 ? 'is-selected' : ''}" data-sym="${s.sym}" data-up="${s.up ? '1' : '0'}" data-price="${s.price}" data-change="${s.change}" data-name="${s.name}">
                    <div>
                      <div class="stock-sym">${s.sym}</div>
                      <div class="stock-name">${s.name}</div>
                    </div>
                    <div class="stock-price">${s.price}</div>
                    <div class="stock-change ${s.up ? 'up' : 'down'}">${s.change}</div>
                  </div>`
              )
              .join('')}
          </div>
          <div class="stock-chart">
            <div class="stock-chart-header">
              <div>
                <strong id="stock-chart-sym">${first.sym}</strong>
                <span class="muted" id="stock-chart-name"> ${first.name}</span>
              </div>
              <div>
                <span id="stock-chart-price">${first.price}</span>
                <span class="stock-change up" id="stock-chart-chg" style="margin-left:6px;font-size:11px">${first.change}</span>
              </div>
            </div>
            <svg class="stock-chart-svg" viewBox="0 0 400 100" preserveAspectRatio="none" aria-hidden="true">
              <defs>
                <linearGradient id="stockFillUp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#30d158" stop-opacity="0.45"/>
                  <stop offset="100%" stop-color="#30d158" stop-opacity="0"/>
                </linearGradient>
                <linearGradient id="stockFillDown" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#ff453a" stop-opacity="0.4"/>
                  <stop offset="100%" stop-color="#ff453a" stop-opacity="0"/>
                </linearGradient>
              </defs>
              <path class="area" id="stock-area" d="${upPath} L400,100 L0,100 Z"></path>
              <path class="line" id="stock-line" d="${upPath}"></path>
            </svg>
            <div class="stock-range">
              <span class="active">1D</span><span>1W</span><span>1M</span><span>3M</span><span>1Y</span><span>All</span>
            </div>
          </div>
        </div>
      </div>`;
    },
    onMount(el) {
      const upPath = 'M0,80 C40,70 60,90 100,55 C140,20 180,40 220,30 C260,20 300,45 340,25 C360,18 380,22 400,15';
      const downPath = 'M0,20 C40,30 60,15 100,45 C140,75 180,55 220,70 C260,85 300,60 340,78 C360,85 380,80 400,90';
      const line = el.querySelector('#stock-line');
      const area = el.querySelector('#stock-area');
      const symEl = el.querySelector('#stock-chart-sym');
      const nameEl = el.querySelector('#stock-chart-name');
      const priceEl = el.querySelector('#stock-chart-price');
      const chgEl = el.querySelector('#stock-chart-chg');
      el.querySelectorAll('.stock-row').forEach((row) => {
        row.addEventListener('click', () => {
          el.querySelectorAll('.stock-row').forEach((r) => r.classList.remove('is-selected'));
          row.classList.add('is-selected');
          const up = row.getAttribute('data-up') === '1';
          const path = up ? upPath : downPath;
          if (line) {
            line.setAttribute('d', path);
            line.classList.toggle('down', !up);
          }
          if (area) {
            area.setAttribute('d', path + ' L400,100 L0,100 Z');
            area.classList.toggle('down', !up);
          }
          if (symEl) symEl.textContent = row.getAttribute('data-sym');
          if (nameEl) nameEl.textContent = ' ' + row.getAttribute('data-name');
          if (priceEl) priceEl.textContent = row.getAttribute('data-price');
          if (chgEl) {
            chgEl.textContent = row.getAttribute('data-change');
            chgEl.className = 'stock-change ' + (up ? 'up' : 'down');
            chgEl.style.marginLeft = '6px';
            chgEl.style.fontSize = '11px';
          }
        });
      });
      el.querySelectorAll('.stock-range span').forEach((span) => {
        span.addEventListener('click', () => {
          el.querySelectorAll('.stock-range span').forEach((s) => s.classList.remove('active'));
          span.classList.add('active');
        });
      });
    },
  });

  register({
    id: 'books',
    name: 'Books',
    category: 'Entertainment',
    width: 820,
    height: 560,
    open() {
      return `<div class="app-layout col">
        ${toolbar(`<strong>Books</strong>`)}
        <div class="album-row">
          ${['The Design of Everyday Things', 'Creative Selection', 'Insanely Simple', 'Make Something Wonderful']
            .map((t, i) => `<div class="album-card book"><div class="album-art book" style="--h:${i * 55}"></div><strong>${t}</strong></div>`)
            .join('')}
        </div>
      </div>`;
    },
  });

  register({
    id: 'weather',
    name: 'Weather',
    category: 'Utilities',
    width: 380,
    height: 620,
    open() {
      const hourly = [
        { t: 'Now', icon: '⛅', temp: 72 },
        { t: '10AM', icon: '⛅', temp: 73 },
        { t: '11AM', icon: '☀️', temp: 75 },
        { t: '12PM', icon: '☀️', temp: 77 },
        { t: '1PM', icon: '☀️', temp: 78 },
        { t: '2PM', icon: '⛅', temp: 77 },
        { t: '3PM', icon: '⛅', temp: 76 },
        { t: '4PM', icon: '🌤', temp: 74 },
        { t: '5PM', icon: '🌤', temp: 72 },
        { t: '6PM', icon: '🌥', temp: 69 },
        { t: '7PM', icon: '🌙', temp: 65 },
        { t: '8PM', icon: '🌙', temp: 62 },
      ];
      const days = [
        { d: 'Today', icon: '⛅', hi: 78, lo: 58 },
        { d: 'Sat', icon: '☀️', hi: 80, lo: 59 },
        { d: 'Sun', icon: '🌤', hi: 77, lo: 57 },
        { d: 'Mon', icon: '🌧', hi: 68, lo: 54 },
        { d: 'Tue', icon: '🌦', hi: 70, lo: 55 },
        { d: 'Wed', icon: '⛅', hi: 74, lo: 56 },
        { d: 'Thu', icon: '☀️', hi: 79, lo: 58 },
        { d: 'Fri', icon: '☀️', hi: 81, lo: 60 },
        { d: 'Sat', icon: '🌤', hi: 76, lo: 57 },
        { d: 'Sun', icon: '⛅', hi: 73, lo: 55 },
      ];
      return `<div class="weather-app">
        <div class="wx-hero">
          <div class="wx-city">City</div>
          <div class="wx-temp">72°</div>
          <div class="wx-cond">Partly Cloudy</div>
          <div class="wx-hl">H:78°  L:58°</div>
        </div>
        <div class="wx-hourly">
          <div class="wx-section-label">Hourly Forecast</div>
          <div class="wx-hourly-strip">
            ${hourly
              .map(
                (h, i) =>
                  `<div class="wx-h ${i === 0 ? 'is-now' : ''}">
                    <span>${h.t}</span>
                    <span class="wx-h-icon">${h.icon}</span>
                    <span class="wx-h-temp">${h.temp}°</span>
                  </div>`
              )
              .join('')}
          </div>
        </div>
        <div class="wx-days">
          <div class="wx-section-label">10-Day Forecast</div>
          ${days
            .map(
              (d) =>
                `<div class="wx-d">
                  <span class="wx-d-day">${d.d}</span>
                  <span class="wx-d-icon">${d.icon}</span>
                  <span class="wx-d-bar" aria-hidden="true"></span>
                  <span class="wx-d-temps"><span class="lo">${d.lo}°</span><span class="hi">${d.hi}°</span></span>
                </div>`
            )
            .join('')}
        </div>
      </div>`;
    },
  });

  register({
    id: 'activity-monitor',
    name: 'Activity Monitor',
    category: 'Utilities',
    width: 860,
    height: 560,
    open() {
      const procs = [
        { name: 'kernel_task', cpu: '12.4', mem: '1.2 GB', threads: '186', pid: '0', user: 'root' },
        { name: 'WindowServer', cpu: '8.6', mem: '412 MB', threads: '24', pid: '145', user: '_windowserver' },
        { name: 'Finder', cpu: '3.1', mem: '268 MB', threads: '12', pid: '512', user: 'user' },
        { name: 'Safari', cpu: '2.8', mem: '640 MB', threads: '38', pid: '901', user: 'user' },
        { name: 'dock', cpu: '1.4', mem: '98 MB', threads: '8', pid: '498', user: 'user' },
        { name: 'SystemUIServer', cpu: '0.9', mem: '72 MB', threads: '6', pid: '501', user: 'user' },
        { name: 'mds', cpu: '0.7', mem: '54 MB', threads: '10', pid: '88', user: 'root' },
        { name: 'coreaudiod', cpu: '0.5', mem: '36 MB', threads: '14', pid: '162', user: '_coreaudiod' },
        { name: 'loginwindow', cpu: '0.3', mem: '48 MB', threads: '4', pid: '96', user: 'user' },
        { name: 'launchd', cpu: '0.2', mem: '22 MB', threads: '3', pid: '1', user: 'root' },
        { name: 'syslogd', cpu: '0.1', mem: '8 MB', threads: '2', pid: '42', user: 'root' },
        { name: 'bluetoothd', cpu: '0.1', mem: '18 MB', threads: '5', pid: '210', user: 'root' },
      ];
      const tabs = ['CPU', 'Memory', 'Energy', 'Disk', 'Network'];
      return `<div class="am27-app">
        <div class="am27-toolbar" data-drag-region data-drag-handle>
          <div class="am27-tabs">
            ${tabs
              .map(
                (t, i) =>
                  `<button type="button" class="am27-tab${i === 0 ? ' is-active' : ''}" data-am-tab="${t.toLowerCase()}">${t}</button>`
              )
              .join('')}
          </div>
          <div class="am27-tb-right">
            <input class="am27-search" type="search" placeholder="Search" />
          </div>
        </div>
        <div class="am27-cpu-bar">
          <div class="am27-cpu-meters">
            <div class="am27-meter">
              <span class="am27-meter-label">System</span>
              <div class="am27-meter-track"><div class="am27-meter-fill am27-sys" style="width:18%"></div></div>
              <span class="am27-meter-val">18%</span>
            </div>
            <div class="am27-meter">
              <span class="am27-meter-label">User</span>
              <div class="am27-meter-track"><div class="am27-meter-fill am27-user" style="width:12%"></div></div>
              <span class="am27-meter-val">12%</span>
            </div>
            <div class="am27-meter">
              <span class="am27-meter-label">Idle</span>
              <div class="am27-meter-track"><div class="am27-meter-fill am27-idle" style="width:70%"></div></div>
              <span class="am27-meter-val">70%</span>
            </div>
          </div>
          <div class="am27-cpu-summary">CPU Load: <strong>30%</strong> · 12 processes</div>
        </div>
        <div class="am27-table-wrap">
          <table class="am27-table">
            <thead>
              <tr>
                <th class="am27-col-name">Process Name</th>
                <th class="am27-num">% CPU</th>
                <th class="am27-num">Memory</th>
                <th class="am27-num">Threads</th>
                <th class="am27-num">PID</th>
                <th>User</th>
              </tr>
            </thead>
            <tbody>
              ${procs
                .map(
                  (p, i) =>
                    `<tr class="${i === 0 ? 'is-selected' : ''}">
                      <td class="am27-col-name"><span class="am27-proc-dot"></span>${p.name}</td>
                      <td class="am27-num">${p.cpu}</td>
                      <td class="am27-num">${p.mem}</td>
                      <td class="am27-num">${p.threads}</td>
                      <td class="am27-num">${p.pid}</td>
                      <td class="am27-user">${p.user}</td>
                    </tr>`
                )
                .join('')}
            </tbody>
          </table>
        </div>
        <div class="am27-footer">
          <span>CPU</span>
          <span class="muted">Sorted by % CPU</span>
        </div>
      </div>`;
    },
  });

  register({
    id: 'disk-utility',
    name: 'Disk Utility',
    category: 'Utilities',
    width: 820,
    height: 540,
    open() {
      const volumes = [
        { id: 'container', label: 'Container disk1', kind: 'group', sub: 'APFS Container Schema', active: false },
        { id: 'hd', label: 'Macintosh HD', kind: 'volume', sub: 'APFS Volume · Mounted', active: true },
        { id: 'data', label: 'Macintosh HD - Data', kind: 'volume', sub: 'APFS Volume · Mounted', active: false },
      ];
      return `<div class="du27-app">
        <div class="du27-toolbar" data-drag-region data-drag-handle>
          <div class="du27-tb-group">
            <button type="button" class="du27-tb-btn" title="First Aid">First Aid</button>
            <button type="button" class="du27-tb-btn" title="Partition">Partition</button>
            <button type="button" class="du27-tb-btn" title="Erase">Erase</button>
            <button type="button" class="du27-tb-btn" title="Mount">Mount</button>
            <button type="button" class="du27-tb-btn" title="Info">Info</button>
          </div>
          <div class="du27-tb-right">
            <input class="du27-search" type="search" placeholder="Search" />
          </div>
        </div>
        <div class="du27-body">
          <aside class="du27-sidebar">
            <div class="du27-side-head">Internal</div>
            <div class="du27-vol du27-disk">
              <span class="du27-vol-icon">💿</span>
              <div>
                <div class="du27-vol-name">APPLE SSD</div>
                <div class="du27-vol-sub">1 TB · Internal</div>
              </div>
            </div>
            ${volumes
              .map(
                (v) =>
                  `<div class="du27-vol${v.active ? ' is-active' : ''}${v.kind === 'group' ? ' is-group' : ' is-child'}" data-vol="${v.id}">
                    <span class="du27-vol-icon">${v.kind === 'group' ? '▣' : '💾'}</span>
                    <div>
                      <div class="du27-vol-name">${v.label}</div>
                      <div class="du27-vol-sub">${v.sub}</div>
                    </div>
                  </div>`
              )
              .join('')}
            <div class="du27-side-head">External</div>
            <div class="du27-vol muted-row">
              <span class="du27-vol-icon">⏏</span>
              <div>
                <div class="du27-vol-name">No external disks</div>
                <div class="du27-vol-sub">Connect a drive to view</div>
              </div>
            </div>
          </aside>
          <div class="du27-main">
            <div class="du27-title-block">
              <div class="du27-drive-glyph" aria-hidden="true">💾</div>
              <div>
                <h2 class="du27-title">Macintosh HD</h2>
                <p class="du27-subtitle">APFS Volume · Mounted · GUID Partition Map</p>
              </div>
            </div>
            <div class="du27-capacity">
              <div class="du27-pie" role="img" aria-label="Storage capacity chart">
                <svg viewBox="0 0 120 120" class="du27-pie-svg">
                  <circle class="du27-pie-track" cx="60" cy="60" r="46" />
                  <circle class="du27-pie-used" cx="60" cy="60" r="46" stroke-dasharray="145 289" stroke-dashoffset="0" />
                  <circle class="du27-pie-system" cx="60" cy="60" r="46" stroke-dasharray="40 289" stroke-dashoffset="-145" />
                </svg>
                <div class="du27-pie-center">
                  <div class="du27-pie-free">494 GB</div>
                  <div class="du27-pie-free-label">available</div>
                </div>
              </div>
              <div class="du27-legend">
                <div class="du27-leg"><span class="du27-swatch used"></span> App Storage <strong>320 GB</strong></div>
                <div class="du27-leg"><span class="du27-swatch system"></span> System <strong>86 GB</strong></div>
                <div class="du27-leg"><span class="du27-swatch other"></span> Other <strong>100 GB</strong></div>
                <div class="du27-leg"><span class="du27-swatch free"></span> Free <strong>494 GB</strong></div>
                <div class="du27-cap-total">1 TB capacity</div>
              </div>
            </div>
            <div class="du27-details">
              <div class="du27-detail"><span class="muted">Type</span><span>APFS Volume</span></div>
              <div class="du27-detail"><span class="muted">Device</span><span>disk1s1</span></div>
              <div class="du27-detail"><span class="muted">Connection</span><span>PCI-Express</span></div>
              <div class="du27-detail"><span class="muted">Used</span><span>506 GB of 1 TB</span></div>
            </div>
          </div>
        </div>
      </div>`;
    },
  });

  // ─── Bulk official apps: [id, name, category, rows, nav?] ───────
  const bulkApps = [
    ['console', 'Console', 'Utilities', [
      { title: 'kernel', sub: 'IOKit: USB device attached', meta: '09:41' },
      { title: 'WindowServer', sub: 'Display connected', meta: '09:41' },
      { title: 'Safari', sub: 'Privacy Report updated', meta: '09:42' },
    ], [
      { id: 'all', label: 'All Messages', icon: '☰' },
      { id: 'errors', label: 'Errors', icon: '!' },
      { id: 'faults', label: 'Faults', icon: '⚠' },
    ]],
    ['font-book', 'Font Book', 'Utilities', [
      { title: 'SF Pro', sub: 'System · 12 styles', meta: '' },
      { title: 'New York', sub: 'System · 8 styles', meta: '' },
      { title: 'Helvetica Neue', sub: 'System', meta: '' },
      { title: 'Avenir Next', sub: 'System', meta: '' },
    ], [
      { id: 'all', label: 'All Fonts', icon: 'A' },
      { id: 'eng', label: 'English', icon: '文' },
      { id: 'user', label: 'User', icon: '👤' },
    ]],
    ['dictionary', 'Dictionary', 'Utilities', [
      { title: 'liquid', sub: 'adj. flowing freely like water', meta: '' },
      { title: 'glass', sub: 'n. hard, brittle substance', meta: '' },
      { title: 'interface', sub: 'n. point of interaction', meta: '' },
    ], [
      { id: 'oxford', label: 'Oxford American', icon: '📖' },
      { id: 'wiki', label: 'Wikipedia', icon: 'W' },
      { id: 'apple', label: 'Apple Dictionary', icon: '' },
    ]],
    ['home', 'Home', 'Productivity', [
      { title: 'Living Room Lights', sub: 'On · 72%', meta: 'Light' },
      { title: 'Thermostat', sub: '72°', meta: 'Climate' },
      { title: 'Front Door', sub: 'Locked', meta: 'Lock' },
      { title: 'Garage', sub: 'Closed', meta: 'Opener' },
    ], [
      { id: 'home', label: 'My Home', icon: '⌂' },
      { id: 'auto', label: 'Automation', icon: '⚡' },
      { id: 'disc', label: 'Discover', icon: '◎' },
    ]],
    ['voice-memos', 'Voice Memos', 'Entertainment', [
      { title: 'Meeting Ideas', sub: '0:42', meta: 'Today' },
      { title: 'Song Hook', sub: '1:18', meta: 'Jul 14' },
    ], [
      { id: 'all', label: 'All Recordings', icon: '🎙' },
      { id: 'recent', label: 'Recently Deleted', icon: '🗑' },
    ]],
    ['shortcuts', 'Shortcuts', 'Utilities', [
      { title: 'Morning Routine', sub: 'Automation', meta: '▶' },
      { title: 'Shazam Music', sub: 'Music', meta: '▶' },
      { title: 'Take Screenshot', sub: 'Scripting', meta: '▶' },
    ], [
      { id: 'all', label: 'All Shortcuts', icon: '✦' },
      { id: 'share', label: 'Share Sheet', icon: '↗' },
      { id: 'auto', label: 'Automation', icon: '⚡' },
    ]],
    ['find-my', 'Find My', 'System', [
      { title: 'MacBook Pro', sub: 'Cupertino · Now', meta: '●' },
      { title: 'iPhone', sub: 'Cupertino · 2m ago', meta: '●' },
      { title: 'AirPods Pro', sub: 'Last seen Home', meta: '○' },
    ], [
      { id: 'people', label: 'People', icon: '👥' },
      { id: 'devices', label: 'Devices', icon: '💻' },
      { id: 'items', label: 'Items', icon: '📍' },
    ]],
    ['journal', 'Journal', 'Productivity', [
      { title: 'July 17, 2026', sub: 'Built a virtual Mac today…', meta: '' },
      { title: 'July 14, 2026', sub: 'Beautiful golden hour walk', meta: '' },
    ], [
      { id: 'entries', label: 'Entries', icon: '✎' },
      { id: 'sugg', label: 'Suggestions', icon: '✦' },
    ]],
    ['passwords', 'Passwords', 'System', [
      { title: 'apple.com', sub: 'you@icloud.com', meta: '★★★★' },
      { title: 'icloud.com', sub: 'you@icloud.com', meta: '★★★★' },
      { title: 'github.com', sub: 'you', meta: '★★★☆' },
    ], [
      { id: 'all', label: 'All', icon: '🔑' },
      { id: 'passkeys', label: 'Passkeys', icon: '◎' },
      { id: 'codes', label: 'Codes', icon: '#' },
      { id: 'security', label: 'Security', icon: '🛡' },
    ]],
    ['stickies', 'Stickies', 'Productivity', [
      { title: 'Yellow sticky', sub: 'Remember milk', meta: '' },
      { title: 'Pink sticky', sub: 'Ship macOS 27 demo', meta: '' },
    ]],
    ['tips', 'Tips', 'System', [
      { title: 'Use Spotlight for everything', sub: '⌘Space', meta: '' },
      { title: 'Customize Control Center', sub: 'System Settings', meta: '' },
      { title: 'Liquid Glass tints', sub: 'Desktop & Dock', meta: '' },
    ], [
      { id: 'discover', label: 'Discover', icon: '✦' },
      { id: 'collection', label: 'Collections', icon: '☰' },
    ]],
    ['screenshot', 'Screenshot', 'Utilities', [
      { title: 'Capture Entire Screen', sub: '⌘⇧3', meta: '' },
      { title: 'Capture Selected Portion', sub: '⌘⇧4', meta: '' },
      { title: 'Capture Window', sub: '⌘⇧4 Space', meta: '' },
    ]],
    ['time-machine', 'Time Machine', 'System', [
      { title: 'Latest Backup', sub: 'Today, 9:00 AM', meta: 'OK' },
      { title: 'Backup Disk', sub: 'Time Machine · 2 TB', meta: 'Connected' },
    ], [
      { id: 'backups', label: 'Backups', icon: '⏱' },
      { id: 'options', label: 'Options', icon: '⚙' },
    ]],
    ['system-information', 'System Information', 'Utilities', [
      { title: 'macOS', sub: 'Version 27.0 (25A000)', meta: '' },
      { title: 'Chip', sub: 'Apple M4 Pro (sim)', meta: '' },
      { title: 'Memory', sub: '24 GB', meta: '' },
      { title: 'Startup Disk', sub: 'Macintosh HD', meta: '' },
    ], [
      { id: 'hw', label: 'Hardware', icon: '💻' },
      { id: 'net', label: 'Network', icon: '↗' },
      { id: 'sw', label: 'Software', icon: '▦' },
    ]],
    ['print-center', 'Print Center', 'Utilities', [
      { title: 'Studio Display', sub: 'Idle', meta: '' },
      { title: 'AirPrint Office', sub: 'Offline', meta: '' },
    ], [
      { id: 'printers', label: 'Printers', icon: '🖨' },
      { id: 'jobs', label: 'Jobs', icon: '☰' },
    ]],
    ['quicktime', 'QuickTime Player', 'Entertainment', [
      { title: 'Open File…', sub: 'Play movies and audio', meta: '' },
      { title: 'New Movie Recording', sub: 'Camera', meta: '' },
      { title: 'New Screen Recording', sub: 'Capture', meta: '' },
    ]],
    ['photo-booth', 'Photo Booth', 'Entertainment', [
      { title: 'Normal', sub: 'Effect', meta: '' },
      { title: 'Sepia', sub: 'Effect', meta: '' },
      { title: 'Comic Book', sub: 'Effect', meta: '' },
    ]],
    ['image-capture', 'Image Capture', 'Utilities', [
      { title: 'No devices connected', sub: 'Connect a camera or scanner', meta: '' },
    ], [
      { id: 'devices', label: 'Devices', icon: '📷' },
      { id: 'shared', label: 'Shared', icon: '↗' },
    ]],
    ['image-playground', 'Image Playground', 'Creativity', [
      { title: 'Animation', sub: 'Style', meta: '' },
      { title: 'Illustration', sub: 'Style', meta: '' },
      { title: 'Sketch', sub: 'Style', meta: '' },
    ]],
    ['games', 'Apple Games', 'Entertainment', [
      { title: 'Hello Kitty Island Adventure', sub: 'Arcade', meta: '' },
      { title: 'Sonic Dream Team', sub: 'Arcade', meta: '' },
      { title: 'NBA 2K', sub: 'Installed', meta: '' },
    ], [
      { id: 'home', label: 'Home', icon: '⌂' },
      { id: 'library', label: 'Library', icon: '▦' },
      { id: 'arcade', label: 'Arcade', icon: '🅰' },
    ]],
    ['iphone-mirroring', 'iPhone Mirroring', 'System', [
      { title: 'iPhone', sub: 'Locked · Ready to connect', meta: '' },
    ]],
    ['magnifier', 'Magnifier', 'Utilities', [
      { title: 'Zoom Level', sub: '2×', meta: '' },
      { title: 'Brightness', sub: 'Auto', meta: '' },
      { title: 'Filters', sub: 'None', meta: '' },
    ]],
    ['phone', 'Phone', 'Internet', [
      { title: 'Alex Chen', sub: 'Mobile · 2m', meta: '↗' },
      { title: 'Unknown', sub: '408-555-0199', meta: '↙' },
    ], [
      { id: 'recents', label: 'Recents', icon: '⏱' },
      { id: 'contacts', label: 'Contacts', icon: '👤' },
      { id: 'keypad', label: 'Keypad', icon: '#' },
    ]],
    ['chess', 'Chess', 'Entertainment', [
      { title: 'New Game', sub: 'Play against Mac', meta: '' },
      { title: 'Human vs Human', sub: 'Local', meta: '' },
    ]],
    ['garageband', 'GarageBand', 'Creativity', [
      { title: 'Empty Project', sub: 'Tracks', meta: '' },
      { title: 'Hip Hop', sub: 'Template', meta: '' },
      { title: 'Electronic', sub: 'Template', meta: '' },
    ], [
      { id: 'recent', label: 'Recent', icon: '⏱' },
      { id: 'templates', label: 'Templates', icon: '♫' },
    ]],
    ['imovie', 'iMovie', 'Creativity', [
      { title: 'New Movie', sub: 'Create', meta: '' },
      { title: 'New Trailer', sub: 'Create', meta: '' },
      { title: 'Theater', sub: 'Shared projects', meta: '' },
    ], [
      { id: 'projects', label: 'Projects', icon: '🎞' },
      { id: 'media', label: 'Media', icon: '📷' },
      { id: 'theater', label: 'Theater', icon: '▶' },
    ]],
    ['automator', 'Automator', 'Utilities', [
      { title: 'Workflow', sub: 'New Document', meta: '' },
      { title: 'Application', sub: 'New Document', meta: '' },
      { title: 'Quick Action', sub: 'New Document', meta: '' },
    ], [
      { id: 'library', label: 'Library', icon: '☰' },
      { id: 'vars', label: 'Variables', icon: 'x' },
    ]],
    ['script-editor', 'Script Editor', 'Utilities', [
      { title: 'Untitled.scpt', sub: 'display dialog "Hello macOS 27"', meta: '' },
    ], [
      { id: 'editor', label: 'Editor', icon: '✎' },
      { id: 'log', label: 'Log', icon: '☰' },
      { id: 'result', label: 'Result', icon: '✓' },
    ]],
    ['grapher', 'Grapher', 'Utilities', [
      { title: 'y = sin(x)', sub: '2D Graph', meta: '' },
      { title: 'z = x² + y²', sub: '3D Graph', meta: '' },
    ], [
      { id: '2d', label: '2D Graph', icon: '📈' },
      { id: '3d', label: '3D Graph', icon: '◉' },
    ]],
    ['keychain-access', 'Keychain Access', 'Utilities', [
      { title: 'com.apple.safari', sub: 'Internet Password', meta: '' },
      { title: 'iCloud', sub: 'Application Password', meta: '' },
    ], [
      { id: 'login', label: 'login', icon: '🔑' },
      { id: 'system', label: 'System', icon: '⚙' },
      { id: 'icloud', label: 'iCloud', icon: '☁' },
    ]],
    ['airport-utility', 'AirPort Utility', 'Utilities', [
      { title: 'No AirPort base stations found', sub: 'Scan network', meta: '' },
    ]],
    ['audio-midi-setup', 'Audio MIDI Setup', 'Utilities', [
      { title: 'MacBook Speakers', sub: 'Output · 2 ch', meta: 'Default' },
      { title: 'MacBook Microphone', sub: 'Input · 1 ch', meta: 'Default' },
    ], [
      { id: 'audio', label: 'Audio Devices', icon: '🔊' },
      { id: 'midi', label: 'MIDI Studio', icon: '🎹' },
    ]],
    ['bluetooth-file-exchange', 'Bluetooth File Exchange', 'Utilities', [
      { title: 'Send File…', sub: 'Choose a device', meta: '' },
    ]],
    ['colorsync', 'ColorSync Utility', 'Utilities', [
      { title: 'Display', sub: 'Color LCD', meta: '' },
      { title: 'Generic RGB', sub: 'Profile', meta: '' },
    ], [
      { id: 'profile', label: 'Profile First Aid', icon: '✚' },
      { id: 'devices', label: 'Devices', icon: '🖥' },
      { id: 'filters', label: 'Filters', icon: '◎' },
    ]],
    ['digital-color-meter', 'Digital Color Meter', 'Utilities', [
      { title: 'RGB', sub: 'R 124  G 168  B 255', meta: '' },
      { title: 'Hex', sub: '#7CA8FF', meta: '' },
    ]],
    ['directory-utility', 'Directory Utility', 'Utilities', [
      { title: 'Active Directory', sub: 'Off', meta: '' },
      { title: 'LDAP', sub: 'Off', meta: '' },
    ], [
      { id: 'services', label: 'Services', icon: '☰' },
      { id: 'search', label: 'Search Policy', icon: '🔍' },
    ]],
    ['dvd-player', 'DVD Player', 'Entertainment', [
      { title: 'No disc', sub: 'Insert a DVD to begin', meta: '' },
    ]],
    ['migration-assistant', 'Migration Assistant', 'Utilities', [
      { title: 'From a Mac, Time Machine, or Startup Disk', sub: 'Recommended', meta: '' },
      { title: 'From a Windows PC', sub: 'PC', meta: '' },
    ]],
    ['boot-camp', 'Boot Camp Assistant', 'Utilities', [
      { title: 'Not available', sub: 'Boot Camp requires Intel-based Mac', meta: '' },
    ]],
    ['voiceover-utility', 'VoiceOver Utility', 'Utilities', [
      { title: 'General', sub: 'Greeting, Portable preferences', meta: '' },
      { title: 'Verbosity', sub: 'Speech, Braille', meta: '' },
      { title: 'Navigation', sub: 'Grouping, Cursor', meta: '' },
    ], [
      { id: 'general', label: 'General', icon: '⚙' },
      { id: 'verbosity', label: 'Verbosity', icon: '💬' },
      { id: 'speech', label: 'Speech', icon: '🗣' },
      { id: 'nav', label: 'Navigation', icon: '↕' },
    ]],
    ['siri', 'Siri', 'System', [
      { title: 'Ask Siri', sub: 'What can I help you with?', meta: '' },
    ]],
  ];

  bulkApps.forEach(([id, name, category, rows, nav]) => {
    simpleListApp(id, name, category, rows, 700, 480, nav);
  });

  // Wallpaper picker - cycles real assets
  register({
    id: 'wallpaper',
    name: 'Wallpaper',
    category: 'System',
    width: 720,
    height: 480,
    open() {
      const papers = [
        { id: 0, title: 'macOS 27 Default', sub: 'Dynamic · assets/wallpaper.jpg', src: 'assets/wallpaper.jpg' },
        { id: 1, title: 'Liquid Glass', sub: 'Still · assets/wallpaper-glass.jpg', src: 'assets/wallpaper-glass.jpg' },
        { id: 2, title: 'Crystal Mist', sub: 'Still · assets/wallpaper-crystal.jpg', src: 'assets/wallpaper-crystal.jpg' },
      ];
      return `<div class="app-layout col" id="wallpaper-app">
        ${toolbar(`<strong>Wallpaper</strong><span class="muted">Desktop &amp; Screen Saver</span>`)}
        <div class="wallpaper-picker" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;padding:20px">
          ${papers
            .map(
              (p) =>
                `<button type="button" class="wallpaper-option glass" data-wallpaper-index="${p.id}" style="border:none;cursor:pointer;padding:0;border-radius:14px;overflow:hidden;text-align:left;color:inherit">
                  <div style="height:140px;background-image:url('${p.src}');background-size:cover;background-position:center"></div>
                  <div style="padding:12px"><strong>${p.title}</strong><div class="muted">${p.sub}</div></div>
                </button>`
            )
            .join('')}
        </div>
        <p class="muted center" style="padding:0 20px 16px">Tip: right-click the desktop and choose Change Wallpaper to cycle quickly.</p>
      </div>`;
    },
    onMount(el) {
      const names = ['macOS 27 Default', 'Liquid Glass', 'Crystal Mist'];
      el.querySelectorAll('[data-wallpaper-index]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const i = Number(btn.getAttribute('data-wallpaper-index'));
          if (global.MacShell && typeof MacShell.setWallpaperByIndex === 'function') {
            MacShell.setWallpaperByIndex(i);
          } else {
            const wall = document.getElementById('wallpaper');
            const srcs = ['assets/wallpaper.jpg', 'assets/wallpaper-glass.jpg', 'assets/wallpaper-crystal.jpg'];
            const src = srcs[i] || srcs[0];
            if (wall) wall.style.backgroundImage = 'url("' + src + '")';
          }
          el.querySelectorAll('.wallpaper-option').forEach((b) => {
            b.style.outline = '';
            b.classList.remove('is-selected');
          });
          btn.style.outline = '2px solid #0a84ff';
          btn.style.outlineOffset = '2px';
          btn.classList.add('is-selected');
          if (global.MacSounds && MacSounds.play) MacSounds.play('hero');
          if (global.MacShell && MacShell.notify) {
            MacShell.notify('Wallpaper', 'Desktop Picture', names[i] || 'Changed', 'now');
          }
        });
      });
      const cycle = document.createElement('button');
      cycle.type = 'button';
      cycle.className = 'btn-primary';
      cycle.textContent = 'Cycle Wallpaper';
      cycle.style.cssText = 'margin:0 auto 16px;display:block';
      el.appendChild(cycle);
      cycle.addEventListener('click', () => {
        if (global.MacShell && MacShell.cycleWallpaper) MacShell.cycleWallpaper();
        if (global.MacSounds && MacSounds.play) MacSounds.play('pop');
      });
    },
  });

  // Dictionary - richer lookup UI
  if (APPS.dictionary) {
    APPS.dictionary.open = function () {
      return `<div class="app-layout">
        ${sidebar(
          [
            { id: 'oxford', label: 'Oxford American', icon: '📖' },
            { id: 'wiki', label: 'Wikipedia', icon: 'W' },
            { id: 'apple', label: 'Apple Dictionary', icon: '' },
            { id: 'thesaurus', label: 'Thesaurus', icon: '≡' },
          ],
          'oxford'
        )}
        <div class="app-main">
          ${toolbar(`<input class="search-field grow" placeholder="Look up a word" value="liquid" style="max-width:none;flex:1" />`)}
          <div style="padding:20px 24px">
            <h2 style="margin:0 0 4px">liquid</h2>
            <p class="muted" style="margin:0 0 16px">/ˈlɪkwɪd/ · adjective &amp; noun</p>
            <div class="settings-card glass" style="padding:14px 16px;margin-bottom:12px">
              <strong>1. adjective</strong>
              <p class="muted" style="margin:6px 0 0">Having a consistency like that of water or oil; flowing freely but of constant volume.</p>
            </div>
            <div class="settings-card glass" style="padding:14px 16px;margin-bottom:12px">
              <strong>2. noun</strong>
              <p class="muted" style="margin:6px 0 0">A substance that flows freely but is of constant volume, having a consistency like that of water or oil.</p>
            </div>
            <div class="settings-card glass" style="padding:14px 16px">
              <strong>Related</strong>
              <p class="muted" style="margin:6px 0 0">fluid · aqueous · molten · liquefied</p>
            </div>
          </div>
        </div>
      </div>`;
    };
  }

  // Digital Color Meter - live picker style UI
  if (APPS['digital-color-meter']) {
    APPS['digital-color-meter'].width = 360;
    APPS['digital-color-meter'].height = 280;
    APPS['digital-color-meter'].open = function () {
      return `<div class="app-layout col">
        ${toolbar(`<strong>Digital Color Meter</strong>`)}
        <div style="padding:20px;display:flex;gap:16px;align-items:center">
          <div style="width:96px;height:96px;border-radius:12px;background:#7CA8FF;border:1px solid rgba(255,255,255,0.25);box-shadow:inset 0 0 0 1px rgba(0,0,0,0.08)"></div>
          <div style="flex:1;display:grid;gap:8px">
            <div class="settings-row"><span>Display</span><strong>sRGB</strong></div>
            <div class="settings-row"><span>Red</span><span class="muted">124</span></div>
            <div class="settings-row"><span>Green</span><span class="muted">168</span></div>
            <div class="settings-row"><span>Blue</span><span class="muted">255</span></div>
            <div class="settings-row"><span>Hex</span><strong>#7CA8FF</strong></div>
          </div>
        </div>
        <p class="muted center" style="padding:0 16px 16px">Aperture 1× · Show mouse location as percentage</p>
      </div>`;
    };
  }

  // Siri conversational panel
  if (APPS.siri) {
    APPS.siri.width = 420;
    APPS.siri.height = 480;
    APPS.siri.open = function () {
      return `<div class="app-layout col" id="siri-app">
        ${toolbar(`<strong>Siri</strong><span class="muted">Apple Intelligence</span>`)}
        <div style="flex:1;padding:20px;display:flex;flex-direction:column;gap:12px;justify-content:flex-end">
          <div class="settings-card glass" style="padding:12px 14px;align-self:flex-start;max-width:85%">
            <span class="muted">You</span>
            <p style="margin:4px 0 0">What's on my calendar today?</p>
          </div>
          <div class="settings-card glass" style="padding:12px 14px;align-self:flex-end;max-width:85%">
            <span class="muted">Siri</span>
            <p style="margin:4px 0 0">You have Design Review at 10:00 AM and Team Sync at 2:00 PM.</p>
          </div>
        </div>
        <div style="padding:12px 16px 16px;display:flex;gap:8px">
          <input class="search-field grow" placeholder="Ask Siri…" style="flex:1;max-width:none" />
          <button type="button" class="btn-primary">Ask</button>
        </div>
      </div>`;
    };
  }

  // Chess gets a real playable board
  if (APPS.chess) {
    APPS.chess.width = 560;
    APPS.chess.height = 680;
    APPS.chess.open = function () {
      return `<div class="app-layout col chess-app">
        <div class="chess-wrap">
          <div class="chess-toolbar">
            <h3 style="margin:0;flex:1">Chess</h3>
            <button type="button" class="btn-glass" id="chess-flip">Flip</button>
            <button type="button" class="btn-glass" id="chess-undo">Undo</button>
            <button type="button" class="btn-primary" id="chess-new">New Game</button>
          </div>
          <p class="muted" id="chess-status">White to move · click a piece, then a highlighted square</p>
          <div class="chess-board" id="chess-board"></div>
          <p class="muted chess-hint">You are White · computer plays Black · legal moves only</p>
        </div>
      </div>`;
    };
  }

  if (APPS.stickies) {
    APPS.stickies.open = function () {
      return `<div class="stickies-board">
      <div class="sticky y" contenteditable="true">Remember: ⌘Space for Spotlight</div>
      <div class="sticky p" contenteditable="true">Ship macOS 27 demo ✨</div>
      <div class="sticky b" contenteditable="true">Liquid Glass = blur + saturate + light borders</div>
    </div>`;
    };
  }

  if (APPS['photo-booth']) {
    APPS['photo-booth'].open = function () {
      return `<div class="photo-booth" id="photo-booth-app">
      <div class="pb-viewfinder">
        <video class="pb-video" autoplay playsinline muted></video>
        <canvas class="pb-canvas" hidden></canvas>
        <div class="pb-face pb-fallback">😊</div>
        <div class="pb-flash" hidden></div>
      </div>
      <div class="pb-effects">
        ${['Normal', 'Sepia', 'Noir', 'Comic', 'Glow', 'Mirror']
          .map((e, i) => `<button type="button" class="pb-fx ${i === 0 ? 'active' : ''}" data-fx="${e.toLowerCase()}">${e}</button>`)
          .join('')}
      </div>
      <div class="pb-strip" id="pb-strip" aria-label="Captured photos"></div>
      <button type="button" class="btn-primary pb-shutter" title="Take Photo">●</button>
      <p class="muted center pb-hint">Allow camera for live view · Effects are simulated</p>
    </div>`;
    };
    APPS['photo-booth'].width = 640;
    APPS['photo-booth'].height = 560;
  }

  if (APPS.facetime) {
    APPS.facetime.open = function () {
      return `<div class="app-layout col facetime-app" id="facetime-app">
        <div class="ft-stage">
          <div class="ft-remote">
            <div class="ft-remote-avatar">🙂</div>
            <div class="ft-remote-name">Friend</div>
            <div class="ft-remote-status muted">Ready to call</div>
          </div>
          <div class="ft-self">
            <video class="ft-self-video" autoplay playsinline muted></video>
            <div class="ft-self-fallback">You</div>
          </div>
        </div>
        <div class="ft-controls">
          <button type="button" class="ft-ctrl" data-ft="mute" title="Mute">🔇</button>
          <button type="button" class="ft-ctrl danger" data-ft="end" title="End">📵</button>
          <button type="button" class="ft-ctrl primary" data-ft="call" title="Call">📹</button>
          <button type="button" class="ft-ctrl" data-ft="flip" title="Flip">🔄</button>
        </div>
        <div class="app-list ft-recents">
          ${['Alex Chen', 'Jordan Lee', 'Sam Rivera', 'Design Team']
            .map(
              (n) =>
                `<button type="button" class="app-list-row ft-contact"><div class="row-main"><strong>${n}</strong><span class="muted">FaceTime Video</span></div><span class="row-meta">Call</span></button>`
            )
            .join('')}
        </div>
      </div>`;
    };
    APPS.facetime.width = 480;
    APPS.facetime.height = 640;
  }

  if (APPS['image-playground']) {
    APPS['image-playground'].open = function () {
      return `<div class="app-layout col" id="image-playground-app">
      ${toolbar(`<strong>Image Playground</strong>`)}
      <div class="ip-create">
        <div class="ip-preview glass" id="ip-preview">✨</div>
        <input class="search-field grow" id="ip-prompt" placeholder="Describe an image…" value="A glass orb floating over mountains at sunset" />
        <div class="ip-styles">
          ${['Animation', 'Illustration', 'Sketch'].map((s, i) => `<button type="button" class="btn-glass ip-style ${i === 0 ? 'active' : ''}" data-style="${s}">${s}</button>`).join('')}
        </div>
        <button type="button" class="btn-primary" id="ip-create">Create</button>
      </div>
    </div>`;
    };
  }

  if (APPS.grapher) {
    APPS.grapher.width = 720;
    APPS.grapher.height = 520;
    APPS.grapher.open = function () {
      return `<div class="app-layout col grapher-app" id="grapher-app">
        ${toolbar(`<strong>Grapher</strong>
          <select id="grapher-eq" class="te27-select">
            <option value="sin">y = sin(x)</option>
            <option value="cos">y = cos(x)</option>
            <option value="x2">y = x²</option>
            <option value="wave">y = sin(x)+0.5sin(3x)</option>
          </select>
          <button type="button" class="btn-primary" id="grapher-plot">Plot</button>`)}
        <canvas id="grapher-canvas" width="680" height="400" style="margin:12px auto;display:block;background:#0b1220;border-radius:10px;max-width:calc(100% - 24px)"></canvas>
        <p class="muted center" style="padding-bottom:12px">2D Graph · Sample equation plotter</p>
      </div>`;
    };
  }

  if (APPS['script-editor']) {
    APPS['script-editor'].width = 640;
    APPS['script-editor'].height = 480;
    APPS['script-editor'].open = function () {
      return `<div class="app-layout col script-editor-app" id="script-editor-app">
        ${toolbar(`<strong>Script Editor</strong>
          <button type="button" class="btn-primary" id="se-run">Run ▶</button>
          <button type="button" class="btn-glass" id="se-compile">Compile</button>`)}
        <textarea id="se-code" class="se-code" spellcheck="false">display dialog "Hello macOS 27"

-- Sample AppleScript-style demo
set theGreeting to "Liquid Glass"
return theGreeting</textarea>
        <div class="se-log" id="se-log"><span class="muted">Result will appear here…</span></div>
      </div>`;
    };
  }

  if (APPS.home) {
    APPS.home.open = function () {
      const devices = [
        { name: 'Living Room Lights', state: 'On · 72%', kind: 'light', on: true },
        { name: 'Thermostat', state: '72°', kind: 'climate', on: true },
        { name: 'Front Door', state: 'Locked', kind: 'lock', on: true },
        { name: 'Garage', state: 'Closed', kind: 'opener', on: false },
        { name: 'Patio Lights', state: 'Off', kind: 'light', on: false },
        { name: 'Office Fan', state: 'Off', kind: 'fan', on: false },
      ];
      return `<div class="app-layout col home-app" id="home-app">
        ${toolbar(`<strong>Home</strong><span class="muted">My Home</span>
          <button type="button" class="btn-glass" data-home-scene="morning">Good Morning</button>
          <button type="button" class="btn-glass" data-home-scene="night">Good Night</button>
          <button type="button" class="btn-glass" data-home-scene="away">I'm Away</button>`)}
        <div class="home-scenes">
          <button type="button" class="home-scene-chip" data-home-scene="all-on">All On</button>
          <button type="button" class="home-scene-chip" data-home-scene="all-off">All Off</button>
        </div>
        <div class="home-grid">
          ${devices
            .map(
              (d, i) =>
                `<button type="button" class="home-tile ${d.on ? 'is-on' : ''}" data-home-idx="${i}" data-kind="${d.kind}">
                  <span class="home-tile-icon">${d.kind === 'light' ? '💡' : d.kind === 'lock' ? '🔒' : d.kind === 'climate' ? '🌡' : d.kind === 'fan' ? '🌀' : '🚪'}</span>
                  <strong>${d.name}</strong>
                  <span class="home-tile-state muted">${d.state}</span>
                </button>`
            )
            .join('')}
        </div>
      </div>`;
    };
    APPS.home.width = 720;
    APPS.home.height = 480;
  }

  if (APPS.shortcuts) {
    APPS.shortcuts.open = function () {
      const items = [
        { t: 'Morning Routine', s: 'Automation' },
        { t: 'Shazam Music', s: 'Music' },
        { t: 'Take Screenshot', s: 'Scripting' },
        { t: 'Focus Work', s: 'Focus' },
        { t: 'Send ETA', s: 'Location' },
      ];
      return `<div class="app-layout col" id="shortcuts-app">
        ${toolbar(`<strong>Shortcuts</strong>`)}
        <div class="shortcuts-list">
          ${items
            .map(
              (it) =>
                `<div class="shortcut-row">
                  <div><strong>${it.t}</strong><div class="muted">${it.s}</div></div>
                  <button type="button" class="btn-primary sc-run" data-sc="${it.t}">Run</button>
                </div>`
            )
            .join('')}
        </div>
      </div>`;
    };
  }

  if (APPS['voice-memos']) {
    APPS['voice-memos'].open = function () {
      return `<div class="app-layout col" id="voice-memos-app">
        ${toolbar(`<strong>Voice Memos</strong><span class="muted">TTS playback · click Play</span>`)}
        <div class="vm-list">
          <div class="vm-row is-selected" data-tts="Remember to demo the Liquid Glass desktop, calendar day week year views, and the new right-click context menu.">
            <strong>Meeting Ideas</strong><span class="muted">TTS · 0:12</span>
          </div>
          <div class="vm-row" data-tts="Liquid glass, soft and bright. Desktop glow in morning light. macOS twenty seven takes flight.">
            <strong>Song Hook</strong><span class="muted">TTS · 0:08</span>
          </div>
          <div class="vm-row" data-tts="You have three new messages. Mail, Maps satellite view, and Chess are ready to try.">
            <strong>Voicemail Sample</strong><span class="muted">TTS · 0:07</span>
          </div>
          <div class="vm-row" data-tts="Hi, this is a demo greeting. Press one for sales, two for support, or stay on the line for an operator.">
            <strong>Greeting Script</strong><span class="muted">TTS · 0:09</span>
          </div>
          <div class="vm-row" data-tts="Don't forget the App Store install of Chess, then play a full game against the computer.">
            <strong>Todo Dictation</strong><span class="muted">TTS · 0:06</span>
          </div>
        </div>
        <div class="vm-record-bar">
          <button type="button" class="btn-primary" id="vm-play">▶ Play</button>
          <button type="button" class="btn-glass" id="vm-stop">Stop</button>
          <button type="button" class="btn-glass" id="vm-record">● Record</button>
          <span class="muted" id="vm-status">Ready · select a memo and press Play for TTS</span>
        </div>
      </div>`;
    };
  }

  if (APPS.quicktime) {
    APPS.quicktime.width = 720;
    APPS.quicktime.height = 480;
    APPS.quicktime.open = function () {
      return `<div class="app-layout col qt-app" id="quicktime-app">
        ${toolbar(`<strong>QuickTime Player</strong>
          <button type="button" class="btn-glass" id="qt-open">Open Sample</button>
          <button type="button" class="btn-glass" id="qt-record">New Recording</button>`)}
        <div class="qt-stage">
          <div class="qt-screen" id="qt-screen">
            <div class="qt-placeholder">
              <div class="qt-big-play" id="qt-play">▶</div>
              <p class="muted">Sample Movie · Not Playing</p>
            </div>
            <div class="qt-progress"><div class="qt-progress-fill" id="qt-fill"></div></div>
          </div>
          <div class="qt-controls">
            <button type="button" class="btn-glass" id="qt-rw">⏪</button>
            <button type="button" class="btn-primary" id="qt-toggle">Play</button>
            <button type="button" class="btn-glass" id="qt-ff">⏩</button>
            <span class="muted" id="qt-time">0:00 / 1:30</span>
          </div>
        </div>
      </div>`;
    };
  }

  if (APPS.news) {
    APPS.news.open = function () {
      return `<div class="app-layout col news-app" id="news-app">
        ${toolbar(`<strong>Apple News</strong><span class="muted">Today</span>`)}
        <div class="news-body">
          <div class="news-list-pane">
            <div class="news-hero glass news-item is-active" data-news="0">
              <div class="store-badge">TOP STORIES</div>
              <h2>macOS 27 redefines the desktop with Liquid Glass</h2>
              <p class="muted">Apple · 2h ago</p>
            </div>
            ${[
              ['How Liquid Glass changes app design', 'Design · 4h'],
              ['Apple Intelligence expands on Mac', 'Tech · 6h'],
              ['Best wallpapers for the new look', 'Lifestyle · 8h'],
            ]
              .map(
                (a, i) =>
                  `<button type="button" class="news-item" data-news="${i + 1}"><strong>${a[0]}</strong><span class="muted">${a[1]}</span></button>`
              )
              .join('')}
          </div>
          <article class="news-reader" id="news-reader">
            <h1 id="news-title">macOS 27 redefines the desktop with Liquid Glass</h1>
            <p class="muted" id="news-byline">Apple · 2h ago</p>
            <p id="news-body">Apple’s next desktop design language uses translucent materials, specular edges, and adaptive light to make windows feel part of the wallpaper. This is a sample article for the virtual desktop demo.</p>
            <p>Controls stay familiar while materials evolve. Developers can match system materials for a cohesive look across Finder, Safari, and built-in apps.</p>
          </article>
        </div>
      </div>`;
    };
    APPS.news.width = 920;
    APPS.news.height = 600;
  }

  if (APPS.books) {
    APPS.books.open = function () {
      return `<div class="app-layout books-app" id="books-app">
        <aside class="app-sidebar">
          <div class="app-sidebar-item active" data-books-nav="library">Library</div>
          <div class="app-sidebar-item" data-books-nav="store">Book Store</div>
          <div class="app-sidebar-item" data-books-nav="pdf">PDFs</div>
        </aside>
        <div class="app-main">
          ${toolbar(`<strong>Books</strong>`)}
          <div class="books-grid" id="books-grid">
            ${['The Glass Desk', 'Design Systems', 'Swift Craft', 'Quiet Code', 'Focus Hours', 'Pixel & Type']
              .map(
                (t, i) =>
                  `<button type="button" class="book-cover" data-book="${t}" style="--h:${i * 40}"><span>${t}</span></button>`
              )
              .join('')}
          </div>
          <div class="book-reader" id="book-reader" hidden>
            <div class="book-reader-bar">
              <button type="button" class="btn-glass" id="book-back">‹ Library</button>
              <strong id="book-title">Book</strong>
              <span class="muted" id="book-page">1 / 12</span>
            </div>
            <div class="book-pages">
              <button type="button" class="book-nav" id="book-prev">‹</button>
              <div class="book-page-card" id="book-text"></div>
              <button type="button" class="book-nav" id="book-next">›</button>
            </div>
          </div>
        </div>
      </div>`;
    };
    APPS.books.width = 900;
    APPS.books.height = 600;
  }

  if (APPS['find-my']) {
    APPS['find-my'].width = 800;
    APPS['find-my'].height = 560;
    APPS['find-my'].open = function () {
      return `<div class="app-layout col findmy-app" id="find-my-app">
        ${toolbar(`<strong>Find My</strong>
          <div class="fm-tabs">
            <button type="button" class="fm-tab active" data-fm="devices">Devices</button>
            <button type="button" class="fm-tab" data-fm="people">People</button>
            <button type="button" class="fm-tab" data-fm="items">Items</button>
          </div>`)}
        <div class="fm-body">
          <div class="fm-map" id="fm-map">
            <div class="fm-pin is-selected" data-dev="MacBook Pro" style="left:42%;top:38%">💻</div>
            <div class="fm-pin" data-dev="iPhone" style="left:48%;top:44%">📱</div>
            <div class="fm-pin" data-dev="AirPods Pro" style="left:55%;top:52%">🎧</div>
          </div>
          <aside class="fm-list">
            <button type="button" class="fm-row is-selected" data-dev="MacBook Pro"><strong>MacBook Pro</strong><span class="muted">Cupertino · Now</span></button>
            <button type="button" class="fm-row" data-dev="iPhone"><strong>iPhone</strong><span class="muted">Cupertino · 2m ago</span></button>
            <button type="button" class="fm-row" data-dev="AirPods Pro"><strong>AirPods Pro</strong><span class="muted">Last seen Home</span></button>
            <div class="fm-actions">
              <button type="button" class="btn-primary" id="fm-play">Play Sound</button>
              <button type="button" class="btn-glass" id="fm-directions">Directions</button>
            </div>
          </aside>
        </div>
      </div>`;
    };
  }

  if (APPS['time-machine']) {
    APPS['time-machine'].width = 720;
    APPS['time-machine'].height = 480;
    APPS['time-machine'].open = function () {
      return `<div class="app-layout col tm-app" id="time-machine-app">
        ${toolbar(`<strong>Time Machine</strong>`)}
        <div class="tm-stage">
          <div class="tm-stack" id="tm-stack">
            ${[0, 1, 2, 3]
              .map((i) => `<div class="tm-window" style="--i:${i}"><div class="tm-win-bar"></div><div class="tm-win-body">Backup ${i === 0 ? 'Today 9:00 AM' : i + ' day' + (i > 1 ? 's' : '') + ' ago'}</div></div>`)
              .join('')}
          </div>
          <div class="tm-timeline">
            <button type="button" class="btn-glass" id="tm-back">‹ Older</button>
            <span id="tm-label">Today, 9:00 AM</span>
            <button type="button" class="btn-glass" id="tm-fwd">Newer ›</button>
          </div>
          <button type="button" class="btn-primary" id="tm-restore">Restore Files…</button>
        </div>
      </div>`;
    };
  }

  if (APPS.passwords) {
    APPS.passwords.open = function () {
      const rows = [
        { site: 'apple.com', user: 'you@icloud.com', pass: '••••••••••••' },
        { site: 'icloud.com', user: 'you@icloud.com', pass: '••••••••••••' },
        { site: 'github.com', user: 'you', pass: '••••••••' },
      ];
      return `<div class="app-layout col" id="passwords-app">
        ${toolbar(`<strong>Passwords</strong><input class="search-field" id="pw-search" placeholder="Search" />`)}
        <div class="pw-list">
          ${rows
            .map(
              (r) =>
                `<div class="pw-row" data-site="${r.site}">
                  <div><strong>${r.site}</strong><div class="muted">${r.user}</div></div>
                  <div class="pw-actions">
                    <span class="pw-pass muted">${r.pass}</span>
                    <button type="button" class="btn-glass pw-copy" data-site="${r.site}">Copy</button>
                  </div>
                </div>`
            )
            .join('')}
        </div>
        <p class="muted center" style="padding:8px 16px 16px">Sample credentials only · not real passwords</p>
      </div>`;
    };
  }

  if (APPS.console) {
    APPS.console.width = 800;
    APPS.console.height = 480;
    APPS.console.open = function () {
      return `<div class="app-layout col console-app" id="console-app">
        ${toolbar(`<strong>Console</strong>
          <button type="button" class="btn-glass" id="console-clear">Clear</button>
          <button type="button" class="btn-glass" id="console-pause">Pause</button>`)}
        <div class="console-log" id="console-log">
          <div><span class="c-time">09:41:02</span> <span class="c-src">kernel</span> IOKit: USB device attached</div>
          <div><span class="c-time">09:41:05</span> <span class="c-src">WindowServer</span> Display connected</div>
          <div><span class="c-time">09:42:11</span> <span class="c-src">Safari</span> Privacy Report updated</div>
        </div>
      </div>`;
    };
  }

  if (APPS.magnifier) {
    APPS.magnifier.width = 480;
    APPS.magnifier.height = 400;
    APPS.magnifier.open = function () {
      return `<div class="app-layout col magnifier-app" id="magnifier-app">
        ${toolbar(`<strong>Magnifier</strong>`)}
        <div class="mag-view" id="mag-view">
          <div class="mag-content" id="mag-content">Aa</div>
        </div>
        <div class="mag-controls">
          <label>Zoom <input type="range" id="mag-zoom" min="1" max="8" step="0.5" value="2" /></label>
          <label>Brightness <input type="range" id="mag-bright" min="50" max="150" value="100" /></label>
          <select id="mag-filter" class="te27-select">
            <option value="none">No Filter</option>
            <option value="invert">Inverted</option>
            <option value="gray">Grayscale</option>
            <option value="contrast">High Contrast</option>
          </select>
        </div>
      </div>`;
    };
  }

  if (APPS.garageband) {
    APPS.garageband.width = 900;
    APPS.garageband.height = 560;
    APPS.garageband.open = function () {
      const tracks = ['Drums', 'Bass', 'Piano', 'Synth', 'Guitar'];
      return `<div class="app-layout col gb-app" id="garageband-app">
        ${toolbar(`<strong>GarageBand</strong>
          <button type="button" class="btn-primary" id="gb-play">▶ Play</button>
          <button type="button" class="btn-glass" id="gb-stop">■</button>
          <span class="muted" id="gb-time">1.1.1</span>`)}
        <div class="gb-tracks">
          ${tracks
            .map(
              (t, i) =>
                `<div class="gb-track" data-track="${t}">
                  <div class="gb-track-head">
                    <button type="button" class="gb-mute" title="Mute">M</button>
                    <button type="button" class="gb-solo" title="Solo">S</button>
                    <strong>${t}</strong>
                  </div>
                  <div class="gb-lane"><div class="gb-region" style="left:${10 + i * 8}%;width:${28 + i * 6}%"></div></div>
                </div>`
            )
            .join('')}
        </div>
        <div class="gb-keys" id="gb-keys">
          ${['C', 'D', 'E', 'F', 'G', 'A', 'B', 'C']
            .map((n, i) => `<button type="button" class="gb-key" data-note="${i}">${n}</button>`)
            .join('')}
        </div>
      </div>`;
    };
  }

  if (APPS.imovie) {
    APPS.imovie.width = 960;
    APPS.imovie.height = 600;
    APPS.imovie.open = function () {
      return `<div class="app-layout col imovie-app" id="imovie-app">
        ${toolbar(`<strong>iMovie</strong>
          <button type="button" class="btn-primary" id="im-play">▶ Play</button>
          <button type="button" class="btn-glass" id="im-export">Share</button>`)}
        <div class="im-preview" id="im-preview">
          <div class="im-frame">Preview · Timeline clip</div>
        </div>
        <div class="im-library">
          ${[1, 2, 3, 4, 5, 6]
            .map(
              (i) =>
                `<button type="button" class="im-clip" data-clip="${i}" style="--h:${i * 45}">
                  <img src="assets/photos/funny/funny-0${i}.jpg" alt="" />
                  <span>Clip ${i}</span>
                </button>`
            )
            .join('')}
        </div>
        <div class="im-timeline" id="im-timeline">
          <div class="im-playhead" id="im-playhead"></div>
          <div class="im-tl-track" id="im-tl-track"></div>
        </div>
      </div>`;
    };
  }

  if (APPS['font-book']) {
    APPS['font-book'].width = 800;
    APPS['font-book'].height = 520;
    APPS['font-book'].open = function () {
      const fonts = [
        { n: 'SF Pro', s: 'System · 12 styles', sample: 'The quick brown fox' },
        { n: 'New York', s: 'System · 8 styles', sample: 'Editorial elegance' },
        { n: 'Helvetica Neue', s: 'System', sample: 'Clean sans-serif' },
        { n: 'Avenir Next', s: 'System', sample: 'Geometric clarity' },
        { n: 'Menlo', s: 'Monospace', sample: 'code { font-family }' },
        { n: 'Georgia', s: 'Serif', sample: 'Long-form reading' },
      ];
      return `<div class="app-layout fontbook-app" id="font-book-app">
        <aside class="app-sidebar">
          ${fonts
            .map(
              (f, i) =>
                `<button type="button" class="app-sidebar-item fb-font ${i === 0 ? 'active' : ''}" data-font="${f.n}" data-sample="${f.sample}">${f.n}<span class="muted" style="display:block;font-size:11px">${f.s}</span></button>`
            )
            .join('')}
        </aside>
        <div class="app-main">
          ${toolbar(`<strong id="fb-name">SF Pro</strong>`)}
          <div class="fb-preview" id="fb-preview" contenteditable="true">The quick brown fox jumps over the lazy dog</div>
          <div class="fb-sizes">
            ${[12, 18, 24, 36, 48, 64]
              .map((s) => `<button type="button" class="btn-glass fb-size" data-size="${s}">${s}</button>`)
              .join('')}
          </div>
        </div>
      </div>`;
    };
  }

  if (APPS.journal) {
    APPS.journal.width = 720;
    APPS.journal.height = 560;
    APPS.journal.open = function () {
      return `<div class="app-layout col journal-app" id="journal-app">
        ${toolbar(`<strong>Journal</strong>
          <button type="button" class="btn-primary" id="journal-new">New Entry</button>`)}
        <div class="journal-body">
          <div class="journal-list" id="journal-list">
            <button type="button" class="journal-item is-active" data-j="0"><strong>July 17, 2026</strong><span class="muted">Built a virtual Mac today…</span></button>
            <button type="button" class="journal-item" data-j="1"><strong>July 14, 2026</strong><span class="muted">Beautiful golden hour walk</span></button>
          </div>
          <div class="journal-editor">
            <input class="journal-title" id="journal-title" value="July 17, 2026" />
            <textarea class="journal-text" id="journal-text">Built a virtual Mac today with Liquid Glass chrome and interactive apps. Feeling productive.</textarea>
          </div>
        </div>
      </div>`;
    };
  }

  if (APPS.games) {
    APPS.games.width = 880;
    APPS.games.height = 560;
    APPS.games.open = function () {
      const games = [
        { t: 'Hello Kitty Island Adventure', m: 'Arcade' },
        { t: 'Sonic Dream Team', m: 'Arcade' },
        { t: 'NBA 2K', m: 'Installed' },
        { t: 'Chess', m: 'Apple' },
        { t: 'Retro Racer', m: 'Arcade' },
        { t: 'Puzzle Garden', m: 'Casual' },
      ];
      return `<div class="app-layout col games-app" id="games-app">
        ${toolbar(`<strong>Games</strong>`)}
        <div class="games-grid">
          ${games
            .map(
              (g, i) =>
                `<button type="button" class="game-card" data-game="${g.t}" style="--h:${i * 50}">
                  <div class="game-art"></div>
                  <strong>${g.t}</strong>
                  <span class="muted">${g.m}</span>
                  <span class="btn-get game-play">Play</span>
                </button>`
            )
            .join('')}
        </div>
      </div>`;
    };
  }

  if (APPS['system-information']) {
    APPS['system-information'].width = 720;
    APPS['system-information'].height = 520;
    APPS['system-information'].open = function () {
      const nav = typeof navigator !== 'undefined' ? navigator : {};
      const scr = typeof screen !== 'undefined' ? screen : { width: 1920, height: 1080 };
      const panes = {
        overview: [
          ['Model Name', 'Virtual Mac'],
          ['Chip', 'Apple Silicon (sim)'],
          ['Memory', (nav.deviceMemory || 16) + ' GB'],
          ['macOS', '27.0 (Liquid Glass)'],
        ],
        display: [
          ['Resolution', (scr.width || 1920) + ' × ' + (scr.height || 1080)],
          ['Color Profile', 'sRGB'],
          ['Refresh', '60 Hz (sim)'],
        ],
        storage: [
          ['Macintosh HD', '1 TB APFS'],
          ['Available', '494 GB'],
          ['Used', '530 GB'],
        ],
        network: [
          ['Wi‑Fi', 'Home Network'],
          ['IP Address', '192.168.1.42 (sim)'],
          ['MAC', '00:1C:B3:xx:xx:xx'],
        ],
      };
      return `<div class="app-layout sysinfo-app" id="system-information-app">
        <aside class="app-sidebar">
          ${['overview', 'display', 'storage', 'network']
            .map(
              (p, i) =>
                `<button type="button" class="app-sidebar-item si-nav ${i === 0 ? 'active' : ''}" data-si="${p}">${p[0].toUpperCase() + p.slice(1)}</button>`
            )
            .join('')}
        </aside>
        <div class="app-main">
          ${toolbar(`<strong id="si-title">Overview</strong>`)}
          <div class="si-rows" id="si-rows">
            ${panes.overview
              .map(
                ([k, v]) =>
                  `<div class="settings-row"><span>${k}</span><strong>${v}</strong></div>`
              )
              .join('')}
          </div>
        </div>
      </div>`;
    };
    // stash panes on open via data attribute for runtime
    APPS['system-information']._panes = true;
  }

  if (APPS['print-center']) {
    APPS['print-center'].open = function () {
      return `<div class="app-layout col" id="print-center-app">
        ${toolbar(`<strong>Print Center</strong>
          <button type="button" class="btn-glass" id="pc-resume">Resume</button>
          <button type="button" class="btn-glass" id="pc-delete">Delete Job</button>`)}
        <div class="pc-list">
          <button type="button" class="pc-printer is-selected" data-printer="Studio Display"><strong>Studio Display</strong><span class="muted">Idle</span></button>
          <button type="button" class="pc-printer" data-printer="AirPrint Office"><strong>AirPrint Office</strong><span class="muted">Offline</span></button>
        </div>
        <div class="pc-jobs" id="pc-jobs">
          <div class="muted center" style="padding:24px">No print jobs</div>
        </div>
        <div style="padding:12px;text-align:center">
          <button type="button" class="btn-primary" id="pc-add">+ Add Sample Job</button>
        </div>
      </div>`;
    };
  }

  if (APPS['image-capture']) {
    APPS['image-capture'].width = 720;
    APPS['image-capture'].height = 520;
    APPS['image-capture'].open = function () {
      return `<div class="app-layout col" id="image-capture-app">
        ${toolbar(`<strong>Image Capture</strong>
          <button type="button" class="btn-primary" id="ic-import">Import</button>
          <button type="button" class="btn-glass" id="ic-delete">Delete</button>`)}
        <div class="ic-body">
          <aside class="ic-devices">
            <div class="muted" style="padding:8px 10px;font-size:11px">DEVICES</div>
            <button type="button" class="ic-dev is-selected">Virtual Camera</button>
            <button type="button" class="ic-dev">No scanner</button>
          </aside>
          <div class="ic-grid" id="ic-grid">
            ${[1, 2, 3, 4, 5, 6]
              .map(
                (i) =>
                  `<button type="button" class="ic-thumb" data-i="${i}"><img src="assets/photos/funny/funny-0${i}.jpg" alt="" /></button>`
              )
              .join('')}
          </div>
        </div>
      </div>`;
    };
  }

  if (APPS.automator) {
    APPS.automator.width = 800;
    APPS.automator.height = 520;
    APPS.automator.open = function () {
      const actions = ['Ask for Finder Items', 'Copy Finder Items', 'Rename Finder Items', 'Run Shell Script', 'Display Notification'];
      return `<div class="app-layout automator-app" id="automator-app">
        <aside class="app-sidebar">
          <div class="muted" style="padding:8px;font-size:11px">LIBRARY</div>
          ${actions
            .map(
              (a, i) =>
                `<button type="button" class="app-sidebar-item am-action ${i === 0 ? 'active' : ''}" data-action="${a}">${a}</button>`
            )
            .join('')}
        </aside>
        <div class="app-main">
          ${toolbar(`<strong>Automator</strong>
            <button type="button" class="btn-primary" id="am-run">Run</button>
            <button type="button" class="btn-glass" id="am-add">Add Action</button>`)}
          <div class="am-workflow" id="am-workflow">
            <div class="am-step">1. Ask for Finder Items</div>
          </div>
          <div class="am-log muted" id="am-log">Ready · Workflow has 1 action</div>
        </div>
      </div>`;
    };
  }

  if (APPS['keychain-access']) {
    APPS['keychain-access'].open = function () {
      const items = [
        { n: 'com.apple.safari', k: 'Internet Password' },
        { n: 'iCloud', k: 'Application Password' },
        { n: 'login.keychain', k: 'Keychain' },
      ];
      return `<div class="app-layout col" id="keychain-app">
        ${toolbar(`<strong>Keychain Access</strong>
          <button type="button" class="btn-glass" id="kc-show">Show Password</button>
          <button type="button" class="btn-primary" id="kc-copy">Copy</button>`)}
        <div class="kc-list">
          ${items
            .map(
              (it, i) =>
                `<button type="button" class="kc-row ${i === 0 ? 'is-selected' : ''}" data-name="${it.n}"><strong>${it.n}</strong><span class="muted">${it.k}</span></button>`
            )
            .join('')}
        </div>
        <div class="settings-card glass" style="margin:12px 16px;padding:14px">
          <div class="settings-row"><span>Name</span><strong id="kc-name">com.apple.safari</strong></div>
          <div class="settings-row"><span>Kind</span><span class="muted" id="kc-kind">Internet Password</span></div>
          <div class="settings-row"><span>Password</span><span class="muted" id="kc-pass">••••••••••••</span></div>
        </div>
      </div>`;
    };
  }

  if (APPS['audio-midi-setup']) {
    APPS['audio-midi-setup'].open = function () {
      return `<div class="app-layout col" id="audio-midi-app">
        ${toolbar(`<strong>Audio MIDI Setup</strong>`)}
        <div class="ams-list">
          <button type="button" class="ams-row is-selected" data-dev="MacBook Speakers" data-ch="2" data-rate="48000">
            <strong>MacBook Speakers</strong><span class="muted">Output · Default</span>
          </button>
          <button type="button" class="ams-row" data-dev="MacBook Microphone" data-ch="1" data-rate="48000">
            <strong>MacBook Microphone</strong><span class="muted">Input · Default</span>
          </button>
          <button type="button" class="ams-row" data-dev="Virtual Aggregate" data-ch="4" data-rate="96000">
            <strong>Virtual Aggregate</strong><span class="muted">Aggregate Device</span>
          </button>
        </div>
        <div class="settings-card glass" style="margin:12px 16px;padding:14px">
          <div class="settings-row"><span>Device</span><strong id="ams-name">MacBook Speakers</strong></div>
          <div class="settings-row"><span>Channels</span><span id="ams-ch">2</span></div>
          <label class="settings-row">Sample Rate
            <select id="ams-rate" class="te27-select"><option>44100</option><option selected>48000</option><option>96000</option></select>
          </label>
          <label class="settings-row">Output Volume <input type="range" id="ams-vol" min="0" max="100" value="75" /></label>
        </div>
      </div>`;
    };
  }

  if (APPS['dvd-player']) {
    APPS['dvd-player'].width = 640;
    APPS['dvd-player'].height = 420;
    APPS['dvd-player'].open = function () {
      return `<div class="app-layout col dvd-app" id="dvd-player-app">
        ${toolbar(`<strong>DVD Player</strong>`)}
        <div class="dvd-screen" id="dvd-screen">
          <div class="dvd-disc" id="dvd-disc">💿</div>
          <p class="muted" id="dvd-status">No disc · Insert a DVD to begin</p>
        </div>
        <div class="dvd-controls">
          <button type="button" class="btn-glass" id="dvd-eject">⏏</button>
          <button type="button" class="btn-glass" id="dvd-prev">⏮</button>
          <button type="button" class="btn-primary" id="dvd-play">▶</button>
          <button type="button" class="btn-glass" id="dvd-next">⏭</button>
          <button type="button" class="btn-glass" id="dvd-menu">Menu</button>
        </div>
      </div>`;
    };
  }

  if (APPS['migration-assistant']) {
    APPS['migration-assistant'].width = 560;
    APPS['migration-assistant'].height = 420;
    APPS['migration-assistant'].open = function () {
      return `<div class="app-layout col" id="migration-app">
        ${toolbar(`<strong>Migration Assistant</strong>`)}
        <div class="mig-steps" id="mig-steps">
          <p style="padding:8px 20px" class="muted">Transfer information to this Mac</p>
          <label class="mig-opt is-selected"><input type="radio" name="mig" value="mac" checked /> From a Mac, Time Machine backup, or Startup Disk</label>
          <label class="mig-opt"><input type="radio" name="mig" value="pc" /> From a Windows PC</label>
          <label class="mig-opt"><input type="radio" name="mig" value="none" /> Not now</label>
        </div>
        <div style="padding:16px;display:flex;justify-content:flex-end;gap:8px">
          <button type="button" class="btn-glass" id="mig-back">Back</button>
          <button type="button" class="btn-primary" id="mig-continue">Continue</button>
        </div>
        <p class="muted center" id="mig-status" style="padding-bottom:12px">Step 1 of 3</p>
      </div>`;
    };
  }

  if (APPS['voiceover-utility']) {
    APPS['voiceover-utility'].open = function () {
      return `<div class="app-layout" id="voiceover-app">
        <aside class="app-sidebar">
          ${['General', 'Verbosity', 'Speech', 'Navigation', 'Visuals']
            .map(
              (p, i) =>
                `<button type="button" class="app-sidebar-item vo-nav ${i === 0 ? 'active' : ''}" data-vo="${p}">${p}</button>`
            )
            .join('')}
        </aside>
        <div class="app-main">
          ${toolbar(`<strong id="vo-title">General</strong>
            <label class="vo-toggle"><input type="checkbox" id="vo-enable" /> Enable VoiceOver</label>`)}
          <div class="si-rows" id="vo-rows">
            <div class="settings-row"><span>Greeting</span><strong>On</strong></div>
            <div class="settings-row"><span>Portable preferences</span><strong>Off</strong></div>
            <label class="settings-row">Speech rate <input type="range" id="vo-rate" min="1" max="100" value="50" /></label>
            <button type="button" class="btn-primary" id="vo-test" style="margin:12px 0">Speak Sample</button>
          </div>
        </div>
      </div>`;
    };
  }

  if (APPS['bluetooth-file-exchange']) {
    APPS['bluetooth-file-exchange'].open = function () {
      return `<div class="app-layout col" id="bt-file-app">
        ${toolbar(`<strong>Bluetooth File Exchange</strong>`)}
        <div style="padding:24px;text-align:center;display:flex;flex-direction:column;gap:12px;align-items:center">
          <p class="muted">Send files to a nearby Bluetooth device</p>
          <button type="button" class="btn-primary" id="bt-send">Send File…</button>
          <button type="button" class="btn-glass" id="bt-browse">Browse Device…</button>
          <div class="bt-devices" id="bt-devices"></div>
          <p class="muted" id="bt-status">No devices yet · Click Browse</p>
        </div>
      </div>`;
    };
  }

  if (APPS['boot-camp']) {
    APPS['boot-camp'].open = function () {
      return `<div class="app-layout col" id="bootcamp-app">
        ${toolbar(`<strong>Boot Camp Assistant</strong>`)}
        <div style="padding:32px;text-align:center">
          <div style="font-size:48px;margin-bottom:12px">💻</div>
          <h2>Boot Camp is not available</h2>
          <p class="muted">This virtual Mac uses Apple silicon. Boot Camp requires an Intel-based Mac.</p>
          <button type="button" class="btn-primary" id="bc-ok" style="margin-top:16px">OK</button>
        </div>
      </div>`;
    };
  }

  if (APPS['airport-utility']) {
    APPS['airport-utility'].open = function () {
      return `<div class="app-layout col" id="airport-app">
        ${toolbar(`<strong>AirPort Utility</strong>
          <button type="button" class="btn-primary" id="ap-scan">Scan</button>`)}
        <div id="ap-list" style="padding:20px;text-align:center">
          <p class="muted">No AirPort base stations found</p>
        </div>
      </div>`;
    };
  }

  if (APPS.colorsync) {
    APPS.colorsync.open = function () {
      return `<div class="app-layout col" id="colorsync-app">
        ${toolbar(`<strong>ColorSync Utility</strong>
          <button type="button" class="btn-primary" id="cs-firstaid">Profile First Aid</button>`)}
        <div class="cs-list">
          <button type="button" class="cs-row is-selected" data-profile="Display"><strong>Display</strong><span class="muted">Color LCD</span></button>
          <button type="button" class="cs-row" data-profile="Generic RGB"><strong>Generic RGB</strong><span class="muted">Profile</span></button>
          <button type="button" class="cs-row" data-profile="sRGB IEC61966"><strong>sRGB IEC61966</strong><span class="muted">Profile</span></button>
        </div>
        <div class="settings-card glass" style="margin:12px 16px;padding:14px">
          <div class="settings-row"><span>Profile</span><strong id="cs-name">Display</strong></div>
          <div class="settings-row"><span>Status</span><span class="muted" id="cs-status">OK</span></div>
        </div>
      </div>`;
    };
  }

  if (APPS['directory-utility']) {
    APPS['directory-utility'].open = function () {
      return `<div class="app-layout col" id="directory-utility-app">
        ${toolbar(`<strong>Directory Utility</strong>
          <button type="button" class="btn-glass" id="du-lock">🔒 Click the lock to make changes</button>`)}
        <div class="si-rows" style="padding:16px">
          <div class="settings-row"><span>Active Directory</span>
            <label><input type="checkbox" id="du-ad" /> Off</label></div>
          <div class="settings-row"><span>LDAP</span>
            <label><input type="checkbox" id="du-ldap" /> Off</label></div>
          <div class="settings-row"><span>NIS</span>
            <label><input type="checkbox" id="du-nis" /> Off</label></div>
        </div>
        <p class="muted center" id="du-status" style="padding:12px">Locked · Services cannot be changed</p>
      </div>`;
    };
  }

  if (APPS['digital-color-meter']) {
    APPS['digital-color-meter'].open = function () {
      return `<div class="app-layout col" id="dcm-app">
        ${toolbar(`<strong>Digital Color Meter</strong>`)}
        <div style="padding:20px;display:flex;gap:16px;align-items:center">
          <div id="dcm-swatch" style="width:96px;height:96px;border-radius:12px;background:#7CA8FF;border:1px solid rgba(255,255,255,0.25)"></div>
          <div style="flex:1;display:grid;gap:8px">
            <div class="settings-row"><span>Red</span><span class="muted" id="dcm-r">124</span></div>
            <div class="settings-row"><span>Green</span><span class="muted" id="dcm-g">168</span></div>
            <div class="settings-row"><span>Blue</span><span class="muted" id="dcm-b">255</span></div>
            <div class="settings-row"><span>Hex</span><strong id="dcm-hex">#7CA8FF</strong></div>
          </div>
        </div>
        <p class="muted center" style="padding:0 16px 16px">Move mouse over desktop to sample colors</p>
      </div>`;
    };
  }

  /* iPhone Mirroring full UI is provided by js/macos-runtime.js (do not override here) */

  // Richer Tips app
  if (APPS.tips) {
    APPS.tips.open = function () {
      const tips = [
        { t: 'Spotlight', d: 'Press ⌘Space to search apps, files, and the web.' },
        { t: 'Launchpad', d: 'Open Launchpad from the Dock or press F4 to see every app.' },
        { t: 'Change Wallpaper', d: 'Right-click the desktop → Change Wallpaper to cycle looks.' },
        { t: 'Desktop Widgets', d: 'Clock, Weather, Calendar, and Music live on the desktop. Double-click to open the full app.' },
        { t: 'Control Center', d: 'Click the Control Center icon in the menu bar for Wi‑Fi, Focus, and brightness.' },
        { t: 'Liquid Glass', d: 'Windows and panels use translucent materials that tint with your wallpaper.' },
        { t: 'Lock Screen', d: ' menu → Lock Screen. Type any password and press Return to unlock.' },
        { t: 'Force Quit', d: 'Press ⌥⌘Esc or use  menu → Force Quit to close a stuck app.' },
        { t: 'App Switcher', d: '⌘Tab cycles open windows. ⌘1–4 change Finder views.' },
        { t: 'Stage Manager', d: 'Toggle in Control Center to park windows in a left strip.' },
        { t: 'Widgets', d: 'Click Weather to cycle cities; use Music transport; double-click to open apps.' },
        { t: 'Sounds', d: 'System Settings → Sound lists synthesized macOS-style alert sounds.' },
      ];
      return `<div class="app-layout col">
        ${toolbar(`<strong>Tips</strong><span class="muted">Discover macOS 27</span>`)}
        <div style="padding:16px;display:grid;gap:10px">
          ${tips
            .map(
              (tip) =>
                `<div class="settings-card glass" style="padding:14px 16px">
                  <strong>${tip.t}</strong>
                  <p class="muted" style="margin:6px 0 0">${tip.d}</p>
                </div>`
            )
            .join('')}
        </div>
      </div>`;
    };
  }

  // Screenshot utility with actions
  if (APPS.screenshot) {
    APPS.screenshot.open = function () {
      return `<div class="app-layout col" id="screenshot-app">
        ${toolbar(`<strong>Screenshot</strong>`)}
        <div style="padding:24px;display:flex;flex-direction:column;gap:12px;align-items:stretch">
          <p class="muted" style="margin:0 0 8px">Capture the virtual desktop. Files download as PNG.</p>
          <button type="button" class="btn-primary" data-shot="full">Capture Entire Screen  ⌘⇧3</button>
          <button type="button" class="btn-glass" data-shot="selection">Capture Selected Portion  ⌘⇧4</button>
          <button type="button" class="btn-glass" data-shot="window">Capture Window  ⌘⇧4 Space</button>
          <div id="shot-preview" class="shot-preview" hidden></div>
          <div id="shot-status" class="muted" style="margin-top:8px"></div>
        </div>
      </div>`;
    };
    APPS.screenshot.onMount = function (el) {
      el.querySelectorAll('[data-shot]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const mode = btn.getAttribute('data-shot') || 'full';
          const status = el.querySelector('#shot-status');
          const preview = el.querySelector('#shot-preview');
          if (global.MacShell && typeof MacShell.captureScreenshot === 'function') {
            if (status) status.textContent = 'Capturing…';
            MacShell.captureScreenshot(mode, {
              onComplete: (data) => {
                if (status) {
                  status.textContent =
                    'Saved · ' + new Date().toLocaleTimeString() + ' · ' + mode;
                }
                if (preview) {
                  preview.hidden = false;
                  preview.innerHTML = '';
                  if (typeof data === 'string' && data.indexOf('data:image') === 0) {
                    const img = document.createElement('img');
                    img.src = data;
                    img.alt = 'Screenshot preview';
                    img.style.cssText = 'max-width:100%;border-radius:10px;display:block;margin-top:8px';
                    preview.appendChild(img);
                  } else {
                    preview.textContent = 'Capture saved (' + mode + ')';
                  }
                }
              },
            });
          } else if (status) {
            status.textContent = 'Screenshot service unavailable';
          }
        });
      });
    };
  }

  // Launchpad is shell-handled; still register for completeness
  register({
    id: 'launchpad',
    name: 'Launchpad',
    category: 'System',
    dock: true,
    width: 400,
    height: 300,
    open() {
      if (global.MacShell) global.MacShell.openLaunchpad();
      return null;
    },
  });

  register({
    id: 'trash',
    name: 'Trash',
    category: 'System',
    dock: true,
    width: 560,
    height: 400,
    open() {
      return `<div class="app-layout col">
        ${toolbar(`<strong>Trash</strong>`)}
        ${emptyState('Trash is Empty', 'Items you delete will appear here.')}
      </div>`;
    },
  });

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

  const AppRegistry = {
    all() {
      return Object.values(APPS);
    },
    get(id) {
      return APPS[id];
    },
    register(app) {
      if (!app || !app.id) return;
      APPS[app.id] = Object.assign({ category: 'Utilities', open: () => '<div class="app-empty">Empty</div>' }, APPS[app.id] || {}, app);
      return APPS[app.id];
    },
    dockApps() {
      return DOCK_ORDER.map((id) => APPS[id]).filter(Boolean);
    },
    search(q) {
      q = (q || '').toLowerCase().trim();
      if (!q) return this.all();
      return this.all().filter((a) => a.name.toLowerCase().includes(q) || a.id.includes(q) || (a.category || '').toLowerCase().includes(q));
    },
    open(appId) {
      const app = APPS[appId];
      if (!app) {
        console.warn('Unknown app', appId);
        return;
      }
      if (appId === 'launchpad') {
        if (global.MacShell) global.MacShell.openLaunchpad();
        return;
      }
      if (!global.WindowManager) {
        console.error('WindowManager missing');
        return;
      }
      if (global.WindowManager.isOpen && global.WindowManager.isOpen(appId)) {
        global.WindowManager.focusApp(appId);
        if (global.MacShell) global.MacShell.setRunning(appId, true);
        return;
      }
      const content = app.open();
      if (content == null) return;
      const win = global.WindowManager.open(appId, app.name, content, {
        width: app.width || 720,
        height: app.height || 500,
        resizable: app.resizable !== false,
      });
      if (app.onMount && win && win.el) {
        const body = win.el.querySelector('.window-content') || win.el.querySelector('.window-body') || win.el;
        app.onMount(body);
      }
      if (global.MacShell) {
        global.MacShell.setRunning(appId, true);
        global.MacShell.bounceDock(appId);
        global.MacShell.setActiveApp(app.name);
      }
      return win;
    },
  };

  global.AppRegistry = AppRegistry;
})(typeof window !== 'undefined' ? window : globalThis);
