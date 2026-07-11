/* ============================================================
 * SKYBOUND PROTOCOL — browser slot game
 * Vanilla JS, no frameworks, no network calls, works from file://
 * All assets optional at runtime: canvas/silent fallbacks built in.
 * ============================================================ */
'use strict';

(function () {

  /* ----------------------------------------------------------
   * Asset manifest (inline — never fetched)
   * -------------------------------------------------------- */
  var IMG_PATHS = {
    AER: 'assets/images/symbol_aerion.png',
    VOL: 'assets/images/symbol_voltrix.png',
    NIM: 'assets/images/symbol_nimbus.png',
    RAZ: 'assets/images/symbol_razorwing.png',
    CRY: 'assets/images/symbol_crystal.png',
    GEA: 'assets/images/symbol_gear.png',
    WIN: 'assets/images/symbol_wings.png',
    THR: 'assets/images/symbol_thruster.png',
    WLD: 'assets/images/symbol_wild.png',
    SCT: 'assets/images/symbol_scatter.png'
  };
  var BG_IMAGE_PATH = 'assets/images/background.png';
  var LOGO_PATH = 'assets/images/logo.png';
  var BG_VIDEO_PATH = 'assets/video/bg_loop.mp4';

  var AUDIO_PATHS = {
    click:     'assets/audio/sfx_click.mp3',
    spin:      'assets/audio/sfx_spin.mp3',
    reelstop:  'assets/audio/sfx_reelstop.mp3',
    winSmall:  'assets/audio/sfx_win_small.mp3',
    winBig:    'assets/audio/sfx_win_big.mp3',
    transform: 'assets/audio/sfx_transform.mp3',
    freespins: 'assets/audio/sfx_freespins.mp3',
    music:     'assets/audio/music_loop.mp3',
    voEngage:  'assets/audio/vo_engage.mp3',
    voBigwin:  'assets/audio/vo_bigwin.mp3'
  };

  /* ----------------------------------------------------------
   * Symbols, paytable, paylines, reel strips
   * -------------------------------------------------------- */
  var SYMBOLS = {
    AER: { name: 'AERION',     color: '#38bdf8', color2: '#c0d8e8', pays: [25, 100, 500], robot: true  },
    VOL: { name: 'VOLTRIX',    color: '#ef4444', color2: '#fb923c', pays: [20, 75, 300],  robot: true  },
    NIM: { name: 'NIMBUS',     color: '#fbbf24', color2: '#fdf6e3', pays: [15, 50, 200],  robot: true  },
    RAZ: { name: 'RAZORWING',  color: '#a855f7', color2: '#3b3547', pays: [15, 50, 200],  robot: true  },
    CRY: { name: 'CRYSTAL',    color: '#22d3ee', color2: '#a5f3fc', pays: [10, 30, 100],  robot: false },
    GEA: { name: 'GEAR',       color: '#f59e0b', color2: '#fcd34d', pays: [5, 15, 60],    robot: false },
    WIN: { name: 'WINGS',      color: '#cbd5e1', color2: '#94a3b8', pays: [5, 15, 60],    robot: false },
    THR: { name: 'THRUSTER',   color: '#60a5fa', color2: '#fb923c', pays: [4, 10, 40],    robot: false },
    WLD: { name: 'WILD',       color: '#2dd4bf', color2: '#99f6e4', pays: [50, 200, 1000], robot: true },
    SCT: { name: 'STORM PORTAL', color: '#8b5cf6', color2: '#38bdf8', pays: [0, 0, 0],    robot: false }
  };
  var SYMBOL_IDS = ['AER', 'VOL', 'NIM', 'RAZ', 'CRY', 'GEA', 'WIN', 'THR', 'WLD', 'SCT'];

  /* Scatter pays multiply TOTAL bet for 3/4/5 anywhere */
  var SCATTER_PAYS = [2, 10, 50];

  /* 10 fixed paylines — row index per reel (0 top / 1 mid / 2 bottom) */
  var PAYLINES = [
    [1, 1, 1, 1, 1], [0, 0, 0, 0, 0], [2, 2, 2, 2, 2], [0, 1, 2, 1, 0], [2, 1, 0, 1, 2],
    [0, 0, 1, 2, 2], [2, 2, 1, 0, 0], [1, 0, 0, 0, 1], [1, 2, 2, 2, 1], [0, 1, 1, 1, 0]
  ];
  var LINE_COLORS = ['#fbbf24', '#38bdf8', '#f472b6', '#34d399', '#fb923c',
                     '#a78bfa', '#22d3ee', '#f87171', '#facc15', '#4ade80'];

  /* Weighted reel strips (40 entries each).
   * Low symbols heavier, WLD only on reels 2-4, 1-2 SCT per strip. */
  var REEL_STRIPS = [
    // Reel 1 — no WLD, 1 SCT
    ['THR','GEA','CRY','WIN','RAZ','THR','NIM','GEA','THR','VOL',
     'WIN','CRY','AER','THR','GEA','RAZ','WIN','THR','NIM','CRY',
     'SCT','THR','WIN','GEA','VOL','THR','RAZ','CRY','WIN','NIM',
     'THR','GEA','AER','WIN','RAZ','THR','VOL','GEA','NIM','CRY'],
    // Reel 2 — 2 WLD, 1 SCT
    ['THR','WIN','GEA','CRY','RAZ','THR','NIM','WLD','THR','VOL',
     'WIN','CRY','AER','THR','GEA','RAZ','WIN','THR','NIM','CRY',
     'SCT','THR','WIN','GEA','VOL','THR','RAZ','CRY','WIN','NIM',
     'WLD','GEA','AER','WIN','RAZ','THR','VOL','GEA','NIM','CRY'],
    // Reel 3 — 2 WLD, 2 SCT
    ['THR','WIN','GEA','CRY','RAZ','THR','NIM','WLD','THR','VOL',
     'WIN','CRY','AER','GEA','SCT','RAZ','WIN','THR','NIM','CRY',
     'GEA','THR','WIN','GEA','VOL','THR','RAZ','CRY','WIN','SCT',
     'WLD','GEA','AER','WIN','RAZ','THR','VOL','GEA','NIM','CRY'],
    // Reel 4 — 2 WLD, 1 SCT
    ['THR','WIN','GEA','CRY','RAZ','THR','NIM','WLD','THR','VOL',
     'WIN','CRY','AER','THR','GEA','RAZ','WIN','THR','NIM','CRY',
     'SCT','THR','WIN','GEA','VOL','THR','RAZ','CRY','WIN','NIM',
     'WLD','GEA','AER','WIN','RAZ','THR','VOL','GEA','NIM','CRY'],
    // Reel 5 — no WLD, 2 SCT
    ['THR','WIN','GEA','CRY','RAZ','THR','NIM','GEA','THR','VOL',
     'WIN','CRY','AER','THR','GEA','RAZ','WIN','SCT','NIM','CRY',
     'GEA','THR','WIN','GEA','VOL','THR','RAZ','CRY','WIN','SCT',
     'THR','GEA','AER','WIN','RAZ','THR','VOL','GEA','NIM','CRY']
  ];

  var BETS = [10, 20, 50, 100, 200];
  var REELS = 5, ROWS = 3;
  var FREE_SPINS_AWARD = 8;
  var FREE_SPIN_MULTIPLIER = 2;
  var AUTOPLAY_SPINS = 10;
  var BIGWIN_FACTOR = 10; // win >= 10x total bet

  var LS_BALANCE = 'skybound_balance';
  var LS_MUTED = 'skybound_muted';
  var START_BALANCE = 5000;

  /* ----------------------------------------------------------
   * Small utilities
   * -------------------------------------------------------- */
  function $(id) { return document.getElementById(id); }
  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }
  function randInt(n) { return Math.floor(Math.random() * n); }

  function lsGet(key) {
    try { return window.localStorage.getItem(key); } catch (e) { return null; }
  }
  function lsSet(key, val) {
    try { window.localStorage.setItem(key, String(val)); } catch (e) { /* storage unavailable */ }
  }

  /* ----------------------------------------------------------
   * Canvas fallback tiles (used whenever a symbol PNG is missing)
   * -------------------------------------------------------- */
  function makeFallbackTile(id) {
    var meta = SYMBOLS[id];
    var size = 240;
    try {
      var cv = document.createElement('canvas');
      cv.width = size; cv.height = size;
      var ctx = cv.getContext('2d');
      if (!ctx) { return ''; }

      // Dark plate
      ctx.fillStyle = '#0b1020';
      roundRect(ctx, 6, 6, size - 12, size - 12, 26);
      ctx.fill();

      // Themed radial glow
      var grad = ctx.createRadialGradient(size / 2, size / 2, 12, size / 2, size / 2, size * 0.62);
      grad.addColorStop(0, hexWithAlpha(meta.color, 0.85));
      grad.addColorStop(0.55, hexWithAlpha(meta.color, 0.28));
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      roundRect(ctx, 6, 6, size - 12, size - 12, 26);
      ctx.fill();

      // Metallic border
      ctx.lineWidth = 7;
      var bg = ctx.createLinearGradient(0, 0, size, size);
      bg.addColorStop(0, meta.color2);
      bg.addColorStop(0.5, meta.color);
      bg.addColorStop(1, '#1e293b');
      ctx.strokeStyle = bg;
      roundRect(ctx, 10, 10, size - 20, size - 20, 22);
      ctx.stroke();

      // Corner rivets
      ctx.fillStyle = hexWithAlpha(meta.color2, 0.9);
      [[30, 30], [size - 30, 30], [30, size - 30], [size - 30, size - 30]].forEach(function (p) {
        ctx.beginPath(); ctx.arc(p[0], p[1], 5, 0, Math.PI * 2); ctx.fill();
      });

      // Symbol initials
      ctx.font = '900 74px "Segoe UI", Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = meta.color;
      ctx.shadowBlur = 22;
      ctx.fillStyle = '#f1f5f9';
      ctx.fillText(id, size / 2, size / 2 - 14);
      ctx.shadowBlur = 0;

      // Symbol name
      ctx.font = '700 21px "Segoe UI", Arial, sans-serif';
      ctx.fillStyle = hexWithAlpha(meta.color2, 0.95);
      ctx.fillText(meta.name, size / 2, size / 2 + 52);

      return cv.toDataURL('image/png');
    } catch (e) {
      return '';
    }
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function hexWithAlpha(hex, a) {
    var h = hex.replace('#', '');
    var r = parseInt(h.substring(0, 2), 16);
    var g = parseInt(h.substring(2, 4), 16);
    var b = parseInt(h.substring(4, 6), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
  }

  /* ----------------------------------------------------------
   * Image loading with per-asset fallback
   * -------------------------------------------------------- */
  var symbolSrc = {};   // id -> current usable src (real PNG or fallback data URL)

  function preloadSymbolImages() {
    SYMBOL_IDS.forEach(function (id) {
      symbolSrc[id] = makeFallbackTile(id); // instant fallback, swapped if PNG loads
      var img = new Image();
      img.onload = function () {
        symbolSrc[id] = IMG_PATHS[id];
        refreshSymbolImages(id);
      };
      img.onerror = function () { /* keep fallback tile */ };
      img.src = IMG_PATHS[id];
    });
  }

  /* Swap any currently-displayed instances of a symbol to the real art */
  function refreshSymbolImages(id) {
    var imgs = document.querySelectorAll('img[data-sym="' + id + '"]');
    for (var i = 0; i < imgs.length; i++) { imgs[i].src = symbolSrc[id]; }
  }

  function initBackground() {
    var bgImg = $('bg-image');
    var probe = new Image();
    probe.onload = function () {
      bgImg.src = BG_IMAGE_PATH;
      bgImg.classList.add('visible');
    };
    probe.onerror = function () { /* CSS gradient remains */ };
    probe.src = BG_IMAGE_PATH;

    // Optional looping video layer above the still image.
    // The clip's last frame doesn't match its first, so a native loop shows a
    // hard cut. Two stacked players alternate instead: shortly before one ends,
    // the other restarts from frame 0 and crossfades in over it.
    try {
      var FADE_LEAD = 1.25;   // seconds before clip end to begin the crossfade
                              // (must exceed the .bg-video opacity transition)

      var makeVid = function () {
        var vid = document.createElement('video');
        vid.muted = true;
        vid.preload = 'auto';
        vid.setAttribute('muted', '');
        vid.setAttribute('playsinline', '');
        vid.playsInline = true;
        vid.className = 'bg-video';
        var srcEl = document.createElement('source');
        srcEl.src = BG_VIDEO_PATH;
        srcEl.type = 'video/mp4';
        vid.appendChild(srcEl);
        return vid;
      };

      var vids = [makeVid(), makeVid()];
      var active = 0;
      var switching = false;

      var playSafe = function (vid) {
        var p = vid.play();
        if (p && typeof p.catch === 'function') { p.catch(function () {}); }
      };

      var onTime = function () {
        if (switching) return;
        var cur = vids[active];
        if (!isFinite(cur.duration) || cur.duration <= 0) return;
        if (cur.duration - cur.currentTime > FADE_LEAD) return;
        switching = true;
        var next = vids[1 - active];
        try { next.currentTime = 0; } catch (e2) { /* not seekable yet */ }
        playSafe(next);
        next.classList.add('visible');
        cur.classList.remove('visible');
        setTimeout(function () {
          cur.pause();
          try { cur.currentTime = 0; } catch (e3) { /* ignore */ }
          active = 1 - active;
          switching = false;
        }, FADE_LEAD * 1000 + 100);
      };

      vids[0].autoplay = true;
      vids[0].setAttribute('autoplay', '');
      var started = false;   // canplay re-fires on every seek-to-0 after a
      vids[0].addEventListener('canplay', function () {   // fade-out; start once
        if (started) { return; }
        started = true;
        vids[0].classList.add('visible');
        playSafe(vids[0]);
      });
      vids[0].addEventListener('timeupdate', onTime);
      vids[1].addEventListener('timeupdate', onTime);

      // Browsers/energy savers may pause muted background video via the media
      // API (which would stall the crossfade); keep the on-duty player rolling
      // whenever the page is visible. The faded-out player is never forced.
      setInterval(function () {
        if (document.visibilityState && document.visibilityState !== 'visible') return;
        var onDuty = switching ? vids[1 - active] : vids[active];
        if (onDuty.parentNode && onDuty.paused && onDuty.readyState >= 2 &&
            onDuty.currentTime < onDuty.duration - 0.05) {
          playSafe(onDuty);
        }
      }, 1200);

      // First player broken -> no video layer at all (image/gradient below).
      // Second player broken -> degrade to the old single-player native loop.
      var dropVideoLayer = function () {
        for (var i = 0; i < vids.length; i++) {
          if (vids[i].parentNode) { vids[i].parentNode.removeChild(vids[i]); }
        }
      };
      vids[0].addEventListener('error', dropVideoLayer);
      vids[0].querySelector('source').addEventListener('error', dropVideoLayer);
      var degradeToNativeLoop = function () {
        if (vids[1].parentNode) { vids[1].parentNode.removeChild(vids[1]); }
        vids[0].removeEventListener('timeupdate', onTime);
        vids[0].loop = true;
      };
      vids[1].addEventListener('error', degradeToNativeLoop);
      vids[1].querySelector('source').addEventListener('error', degradeToNativeLoop);

      var layer = $('bg-layer');
      layer.insertBefore(vids[0], $('lightning'));
      layer.insertBefore(vids[1], $('lightning'));
      vids[1].load();
    } catch (e) { /* video unsupported — layers below take over */ }
  }

  function initLogo() {
    var logoImg = $('logo-img');
    var logoText = $('logo-text');
    var probe = new Image();
    probe.onload = function () {
      logoImg.src = LOGO_PATH;
      logoImg.classList.add('visible');
      logoText.classList.add('hidden-by-img');
    };
    probe.onerror = function () { /* styled text stays visible */ };
    probe.src = LOGO_PATH;
  }

  /* ----------------------------------------------------------
   * Audio manager — every sound degrades to a silent no-op
   * -------------------------------------------------------- */
  var sounds = {};
  var audioUnlocked = false;
  var muted = lsGet(LS_MUTED) === '1';

  function preloadAudio() {
    Object.keys(AUDIO_PATHS).forEach(function (name) {
      var entry = { ok: false, el: null };
      try {
        var a = new Audio();
        a.preload = 'auto';
        if (name === 'music') { a.loop = true; a.volume = 0.35; }
        else if (name === 'spin') { a.volume = 0.6; }
        else { a.volume = 0.8; }
        a.addEventListener('canplaythrough', function () {
          entry.ok = true;
          if (name === 'music' && audioUnlocked && !muted) { startMusic(); }
        }, { once: true });
        a.addEventListener('error', function () { entry.ok = false; }, { once: true });
        a.src = AUDIO_PATHS[name];
        entry.el = a;
      } catch (e) { /* Audio unsupported — stay silent */ }
      sounds[name] = entry;
    });
  }

  function playSound(name) {
    if (muted || !audioUnlocked) { return; }
    var s = sounds[name];
    if (!s || !s.ok || !s.el) { return; }
    try {
      s.el.currentTime = 0;
      var p = s.el.play();
      if (p && typeof p.catch === 'function') { p.catch(function () {}); }
    } catch (e) { /* no-op */ }
  }

  function stopSound(name) {
    var s = sounds[name];
    if (!s || !s.el) { return; }
    try { s.el.pause(); s.el.currentTime = 0; } catch (e) { /* no-op */ }
  }

  function startMusic() {
    if (muted || !audioUnlocked) { return; }
    var s = sounds.music;
    if (!s || !s.ok || !s.el) { return; }
    try {
      var p = s.el.play();
      if (p && typeof p.catch === 'function') { p.catch(function () {}); }
    } catch (e) { /* no-op */ }
  }

  function stopMusic() {
    var s = sounds.music;
    if (!s || !s.el) { return; }
    try { s.el.pause(); } catch (e) { /* no-op */ }
  }

  /* First user gesture unlocks audio (browser autoplay policy) */
  function unlockAudio() {
    if (audioUnlocked) { return; }
    audioUnlocked = true;
    startMusic();
  }

  function setMuted(m) {
    muted = m;
    lsSet(LS_MUTED, m ? '1' : '0');
    var btn = $('mute-btn');
    btn.classList.toggle('off', m);
    btn.classList.toggle('active', !m);
    btn.setAttribute('aria-pressed', m ? 'true' : 'false');
    btn.textContent = m ? 'MUTED' : 'SOUND';
    if (m) { stopMusic(); } else { startMusic(); }
  }

  /* ----------------------------------------------------------
   * Game state
   * -------------------------------------------------------- */
  function loadBalance() {
    var raw = lsGet(LS_BALANCE);
    var n = parseInt(raw, 10);
    if (raw === null || isNaN(n) || !isFinite(n) || n < 0 || n > 1e12) { return START_BALANCE; }
    return n;
  }

  var state = {
    balance: loadBalance(),
    betIndex: 0,
    spinning: false,
    grid: [],              // grid[reel][row] = symbol id
    lastWin: 0,
    freeSpins: 0,          // remaining free spins
    inFreeSpins: false,
    autoplay: 0,           // remaining autoplay spins
    forced: null           // 'scatter3' | 'bigwin' | null
  };

  function totalBet() { return BETS[state.betIndex]; }
  function lineBet() { return totalBet() / PAYLINES.length; }

  function setBalance(n) {
    var v = Math.round(n);
    if (isNaN(v) || !isFinite(v) || v < 0) { v = 0; }
    state.balance = v;
    lsSet(LS_BALANCE, v);
    $('balance').textContent = String(v);
  }

  /* ----------------------------------------------------------
   * DOM construction
   * -------------------------------------------------------- */
  var cellEls = [];   // cellEls[reel][row] -> .cell
  var cellImgs = [];  // cellImgs[reel][row] -> img
  var reelEls = [];

  function buildReels() {
    var reels = $('reels');
    var overlay = $('lines-overlay');
    for (var c = 0; c < REELS; c++) {
      var reel = document.createElement('div');
      reel.className = 'reel';
      cellEls[c] = [];
      cellImgs[c] = [];
      for (var r = 0; r < ROWS; r++) {
        var cell = document.createElement('div');
        cell.className = 'cell';
        var img = document.createElement('img');
        img.alt = '';
        img.draggable = false;
        cell.appendChild(img);
        reel.appendChild(cell);
        cellEls[c][r] = cell;
        cellImgs[c][r] = img;
      }
      reels.insertBefore(reel, overlay);
      reelEls[c] = reel;
    }
  }

  function setCell(c, r, id) {
    state.grid[c] = state.grid[c] || [];
    state.grid[c][r] = id;
    var img = cellImgs[c][r];
    img.dataset.sym = id;
    img.src = symbolSrc[id] || '';
  }

  function renderInitialGrid() {
    for (var c = 0; c < REELS; c++) {
      var stop = randInt(REEL_STRIPS[c].length);
      for (var r = 0; r < ROWS; r++) {
        setCell(c, r, REEL_STRIPS[c][(stop + r) % REEL_STRIPS[c].length]);
      }
    }
  }

  function clearCellClasses() {
    for (var c = 0; c < REELS; c++) {
      for (var r = 0; r < ROWS; r++) {
        cellEls[c][r].classList.remove('win', 'scatter-hit', 'transforming');
      }
      reelEls[c].classList.remove('anticipation', 'stopped');
    }
    $('lines-overlay').innerHTML = '';
  }

  function setMessage(text, cls) {
    var m = $('message');
    m.textContent = text;
    m.className = 'message' + (cls ? ' ' + cls : '');
  }

  /* ----------------------------------------------------------
   * Result generation (with debug rigging)
   * -------------------------------------------------------- */
  function generateResult() {
    var grid = [];
    for (var c = 0; c < REELS; c++) {
      var strip = REEL_STRIPS[c];
      var stop = randInt(strip.length);
      grid[c] = [];
      for (var r = 0; r < ROWS; r++) {
        grid[c][r] = strip[(stop + r) % strip.length];
      }
    }
    if (state.forced === 'scatter3') {
      // Deterministic: three scatters on reels 1, 3, 5 (middle-ish rows)
      grid[0][0] = 'SCT'; grid[2][1] = 'SCT'; grid[4][2] = 'SCT';
      state.forced = null;
    } else if (state.forced === 'bigwin') {
      // Deterministic: 5-of-a-kind AERION across the middle line (payline 1)
      for (var i = 0; i < REELS; i++) {
        grid[i][1] = 'AER';
        if (grid[i][0] === 'SCT') { grid[i][0] = 'THR'; }
        if (grid[i][2] === 'SCT') { grid[i][2] = 'THR'; }
      }
      state.forced = null;
    }
    return grid;
  }

  /* ----------------------------------------------------------
   * Win evaluation
   * -------------------------------------------------------- */
  function evaluate(grid, bet) {
    var lb = bet / PAYLINES.length;
    var lineWins = [];
    var total = 0;

    PAYLINES.forEach(function (rows, li) {
      var syms = [];
      for (var c = 0; c < REELS; c++) { syms.push(grid[c][rows[c]]); }

      // Left-to-right run with wild substitution
      var base = null, count = 0;
      for (var i = 0; i < REELS; i++) {
        var s = syms[i];
        if (s === 'SCT') { break; }
        if (s === 'WLD') { count++; continue; }
        if (base === null) { base = s; count++; continue; }
        if (s === base) { count++; continue; }
        break;
      }
      // Pure-wild run from the left
      var wildCount = 0;
      for (var w = 0; w < REELS; w++) {
        if (syms[w] === 'WLD') { wildCount++; } else { break; }
      }

      var best = 0, bestSym = null, bestCount = 0;
      if (base !== null && count >= 3) {
        var p = SYMBOLS[base].pays[count - 3] * lb;
        if (p > best) { best = p; bestSym = base; bestCount = count; }
      }
      if (wildCount >= 3) {
        var pw = SYMBOLS.WLD.pays[wildCount - 3] * lb;
        if (pw > best) { best = pw; bestSym = 'WLD'; bestCount = wildCount; }
      }
      if (best > 0) {
        lineWins.push({ line: li, rows: rows, sym: bestSym, count: bestCount, amount: best });
        total += best;
      }
    });

    // Scatters pay anywhere, x total bet
    var scatterCells = [];
    for (var c2 = 0; c2 < REELS; c2++) {
      for (var r2 = 0; r2 < ROWS; r2++) {
        if (grid[c2][r2] === 'SCT') { scatterCells.push([c2, r2]); }
      }
    }
    var scatterWin = 0;
    if (scatterCells.length >= 3) {
      scatterWin = SCATTER_PAYS[Math.min(scatterCells.length, 5) - 3] * bet;
      total += scatterWin;
    }

    return {
      lineWins: lineWins,
      scatterCells: scatterCells,
      scatterCount: scatterCells.length,
      scatterWin: scatterWin,
      total: total
    };
  }

  /* ----------------------------------------------------------
   * Spin flow
   * -------------------------------------------------------- */
  var spinTimers = [];      // pending timeouts
  var reelIntervals = [];   // symbol-cycling intervals while spinning

  function addTimer(fn, ms) {
    var t = window.setTimeout(fn, ms);
    spinTimers.push(t);
    return t;
  }

  function clearSpinTimers() {
    spinTimers.forEach(function (t) { window.clearTimeout(t); });
    spinTimers = [];
    reelIntervals.forEach(function (t) { window.clearInterval(t); });
    reelIntervals = [];
  }

  function canSpin() {
    if (state.spinning) { return false; }
    if (state.freeSpins > 0) { return true; }
    return state.balance >= totalBet();
  }

  function spin(fromAuto) {
    if (state.spinning) { return; }
    if (fromAuto && state.autoplay <= 0) { return; } // autoplay was stopped while this spin was scheduled

    var isFree = state.freeSpins > 0;
    if (!isFree && state.balance < totalBet()) {
      setMessage('INSUFFICIENT CREDITS', '');
      stopAutoplay();
      return;
    }

    clearSpinTimers();
    state.spinning = true;
    state.lastWin = 0;
    $('win-value').textContent = '0';
    clearCellClasses();
    closeBigWin();

    if (isFree) {
      state.freeSpins--;
      updateFsBanner();
      setMessage('FREE SPIN — ALL WINS ×2', 'fs-msg');
    } else {
      setBalance(state.balance - totalBet());
      setMessage(fromAuto ? 'AUTOPLAY ' + state.autoplay : 'STORM RISING...', '');
    }

    var spinBtn = $('spin-btn');
    spinBtn.classList.add('spinning');
    spinBtn.textContent = '· · ·';
    updateControls();

    playSound('spin');

    var result = generateResult();

    // Start all reels cycling with blur
    for (var c = 0; c < REELS; c++) {
      (function (col) {
        reelEls[col].classList.add('spinning');
        reelEls[col].classList.remove('stopped');
        var iv = window.setInterval(function () {
          for (var r = 0; r < ROWS; r++) {
            var strip = REEL_STRIPS[col];
            setCell(col, r, strip[randInt(strip.length)]);
          }
        }, 70);
        reelIntervals[col] = iv;
      })(c);
    }

    // Anticipation: 2+ scatters visible on reels 1-4 → reel 5 drags out
    var scattersBefore5 = 0;
    for (var cc = 0; cc < 4; cc++) {
      for (var rr = 0; rr < ROWS; rr++) {
        if (result[cc][rr] === 'SCT') { scattersBefore5++; }
      }
    }
    var anticipate = scattersBefore5 >= 2;

    // Staggered stops ~250ms apart
    var baseDelay = 850;
    var gap = 250;
    for (var i = 0; i < REELS; i++) {
      (function (col) {
        var delay = baseDelay + col * gap;
        if (col === 4 && anticipate) { delay += 1500; }
        addTimer(function () {
          stopReel(col, result[col]);
          if (col === 3 && anticipate) {
            reelEls[4].classList.add('anticipation');
            setMessage('STORM PORTAL CHARGING...', 'fs-msg');
          }
          if (col === REELS - 1) {
            addTimer(function () { onSpinComplete(result); }, 240);
          }
        }, delay);
      })(i);
    }
  }

  function stopReel(col, finalColumn) {
    if (reelIntervals[col] !== undefined) {
      window.clearInterval(reelIntervals[col]);
    }
    var reel = reelEls[col];
    reel.classList.remove('spinning', 'anticipation');
    reel.classList.add('stopped');
    for (var r = 0; r < ROWS; r++) {
      setCell(col, r, finalColumn[r]);
      if (finalColumn[r] === 'SCT') {
        cellEls[col][r].classList.add('scatter-hit');
      }
    }
    playSound('reelstop');
  }

  /* ----------------------------------------------------------
   * Post-spin: wins, features, chaining
   * -------------------------------------------------------- */
  function onSpinComplete(grid) {
    state.grid = grid.map(function (col) { return col.slice(); });
    stopSound('spin');

    var res = evaluate(grid, totalBet());
    var mult = state.inFreeSpins ? FREE_SPIN_MULTIPLIER : 1;
    var winAmount = Math.round(res.total * mult);
    state.lastWin = winAmount;

    var triggeredFs = res.scatterCount >= 3;
    var isBigWin = winAmount >= totalBet() * BIGWIN_FACTOR;

    if (winAmount > 0) {
      showWinPresentation(res, winAmount, isBigWin);
      setBalance(state.balance + winAmount);
    } else {
      setMessage(state.inFreeSpins ? 'FREE SPIN — ALL WINS ×2' : 'THE STORM PASSES... SPIN AGAIN', state.inFreeSpins ? 'fs-msg' : '');
    }

    var continueDelay = winAmount > 0 ? (isBigWin ? 4800 : 1900) : 700;

    if (triggeredFs) {
      // Free spins trigger (or retrigger)
      stopAutoplay();
      addTimer(function () { awardFreeSpins(); }, winAmount > 0 ? continueDelay : 900);
      return;
    }

    addTimer(function () { finishSpinCycle(); }, continueDelay);
  }

  function finishSpinCycle() {
    state.spinning = false;
    var spinBtn = $('spin-btn');
    spinBtn.classList.remove('spinning');
    spinBtn.textContent = 'SPIN';
    updateControls();

    // Free spins auto-continue
    if (state.freeSpins > 0) {
      addTimer(function () { spin(false); }, 900);
      return;
    }
    if (state.inFreeSpins && state.freeSpins === 0) {
      endFreeSpins();
      return;
    }
    // Autoplay chain
    if (state.autoplay > 0) {
      state.autoplay--;
      if (state.autoplay === 0) {
        stopAutoplay();
      } else if (state.balance < totalBet()) {
        stopAutoplay();
        setMessage('INSUFFICIENT CREDITS', '');
      } else {
        addTimer(function () { spin(true); }, 650);
      }
    }
  }

  /* ----------------------------------------------------------
   * Win presentation
   * -------------------------------------------------------- */
  function showWinPresentation(res, winAmount, isBigWin) {
    // Highlight winning line cells
    res.lineWins.forEach(function (w) {
      for (var c = 0; c < w.count; c++) {
        cellEls[c][w.rows[c]].classList.add('win');
      }
      drawPayline(w.line);
    });
    // Highlight scatters
    if (res.scatterWin > 0) {
      res.scatterCells.forEach(function (p) {
        cellEls[p[0]][p[1]].classList.add('win');
      });
    }

    setMessage('WIN ' + winAmount + ' CREDITS', 'win-msg');
    countUp($('win-value'), winAmount, isBigWin ? 2200 : 900);

    if (isBigWin) {
      showBigWin(res, winAmount);
    } else {
      playSound('winSmall');
    }
  }

  function drawPayline(lineIndex) {
    var overlay = $('lines-overlay');
    var rows = PAYLINES[lineIndex];
    var pts = [];
    for (var c = 0; c < REELS; c++) {
      var x = c * 100 + 50;
      var y = rows[c] * 100 + 50;
      pts.push(x + ',' + y);
    }
    var pl = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    pl.setAttribute('points', pts.join(' '));
    pl.setAttribute('stroke', LINE_COLORS[lineIndex % LINE_COLORS.length]);
    overlay.appendChild(pl);
  }

  function countUp(el, target, durationMs) {
    if (el._countRaf) { window.cancelAnimationFrame(el._countRaf); el._countRaf = null; }
    var start = null;
    el.classList.add('counting');
    function step(ts) {
      if (start === null) { start = ts; }
      var t = clamp((ts - start) / durationMs, 0, 1);
      var eased = 1 - Math.pow(1 - t, 3);
      el.textContent = String(Math.round(target * eased));
      if (t < 1) {
        el._countRaf = window.requestAnimationFrame(step);
      } else {
        el.textContent = String(target);
        el.classList.remove('counting');
        el._countRaf = null;
      }
    }
    el._countRaf = window.requestAnimationFrame(step);
  }

  /* ----------------------------------------------------------
   * Big win overlay + transform animation
   * -------------------------------------------------------- */
  var bigWinTimer = null;

  function showBigWin(res, winAmount) {
    playSound('transform');
    playSound('winBig');
    addTimer(function () { playSound('voBigwin'); }, 1200);

    // Transform-style animation on the winning robot symbols
    res.lineWins.forEach(function (w) {
      for (var c = 0; c < w.count; c++) {
        var id = state.grid[c][w.rows[c]];
        if (SYMBOLS[id] && SYMBOLS[id].robot) {
          cellEls[c][w.rows[c]].classList.add('transforming');
        }
      }
    });

    var overlay = $('bigwin-overlay');
    overlay.classList.remove('hidden');
    countUp($('bigwin-amount'), winAmount, 2600);

    if (bigWinTimer) { window.clearTimeout(bigWinTimer); }
    bigWinTimer = window.setTimeout(closeBigWin, 4400);
  }

  function closeBigWin() {
    if (bigWinTimer) { window.clearTimeout(bigWinTimer); bigWinTimer = null; }
    $('bigwin-overlay').classList.add('hidden');
  }

  /* ----------------------------------------------------------
   * Free spins
   * -------------------------------------------------------- */
  function awardFreeSpins() {
    var retrigger = state.inFreeSpins;
    state.freeSpins += FREE_SPINS_AWARD;
    state.inFreeSpins = true;
    document.body.classList.add('free-spins');
    updateFsBanner();

    playSound('freespins');
    addTimer(function () { playSound('voEngage'); }, 900);

    var overlay = $('fs-overlay');
    $('fs-awarded').textContent = (retrigger ? '+' : '') + FREE_SPINS_AWARD + ' FREE SPINS';
    overlay.classList.remove('hidden');
    setMessage(retrigger ? 'RETRIGGER! +' + FREE_SPINS_AWARD + ' FREE SPINS' : 'SKYBOUND PROTOCOL... ENGAGED', 'fs-msg');

    addTimer(function () {
      overlay.classList.add('hidden');
      finishSpinCycle();
    }, 2600);
  }

  function endFreeSpins() {
    state.inFreeSpins = false;
    document.body.classList.remove('free-spins');
    updateFsBanner();
    setMessage('FREE SPINS COMPLETE', 'win-msg');
    updateControls();
  }

  function updateFsBanner() {
    var banner = $('fs-banner');
    if (state.inFreeSpins || state.freeSpins > 0) {
      banner.classList.remove('hidden');
      $('fs-count').textContent = String(state.freeSpins);
    } else {
      banner.classList.add('hidden');
    }
  }

  /* ----------------------------------------------------------
   * Autoplay
   * -------------------------------------------------------- */
  function startAutoplay() {
    if (state.autoplay > 0) { stopAutoplay(); return; }
    if (state.spinning || state.inFreeSpins || state.freeSpins > 0) { return; }
    if (!canSpin()) { setMessage('INSUFFICIENT CREDITS', ''); return; }
    state.autoplay = AUTOPLAY_SPINS;
    $('auto-btn').classList.add('active');
    $('auto-btn').setAttribute('aria-pressed', 'true');
    $('auto-btn').textContent = 'AUTO ' + state.autoplay;
    spin(true); // finishSpinCycle decrements after each spin, incl. this one
  }

  function stopAutoplay() {
    state.autoplay = 0;
    var btn = $('auto-btn');
    btn.classList.remove('active');
    btn.setAttribute('aria-pressed', 'false');
    btn.textContent = 'AUTO';
  }

  function updateControls() {
    var spinBtn = $('spin-btn');
    spinBtn.disabled = state.spinning || (!state.spinning && state.freeSpins === 0 && state.balance < totalBet());
    $('bet-minus').disabled = state.spinning || state.inFreeSpins || state.betIndex === 0;
    $('bet-plus').disabled = state.spinning || state.inFreeSpins || state.betIndex === BETS.length - 1;
    if (state.autoplay > 0) {
      $('auto-btn').textContent = 'AUTO ' + state.autoplay;
    }
  }

  /* ----------------------------------------------------------
   * Paytable modal
   * -------------------------------------------------------- */
  function buildPaytable() {
    var body = $('paytable-body');
    var html = '<div class="pay-grid">';
    var order = ['AER', 'VOL', 'NIM', 'RAZ', 'CRY', 'GEA', 'WIN', 'THR', 'WLD', 'SCT'];
    order.forEach(function (id) {
      var m = SYMBOLS[id];
      var vals;
      if (id === 'SCT') {
        vals = '3× = <b>' + SCATTER_PAYS[0] + '×</b> &nbsp;4× = <b>' + SCATTER_PAYS[1] +
               '×</b> &nbsp;5× = <b>' + SCATTER_PAYS[2] + '×</b><br>× TOTAL BET, any positions';
      } else {
        vals = '3× = <b>' + m.pays[0] + '</b> &nbsp;4× = <b>' + m.pays[1] +
               '</b> &nbsp;5× = <b>' + m.pays[2] + '</b><br>× line bet (bet ÷ 10)';
      }
      html += '<div class="pay-item">' +
        '<img data-sym="' + id + '" alt="' + m.name + '">' +
        '<div><div class="pay-name">' + m.name + '</div>' +
        '<div class="pay-vals">' + vals + '</div></div></div>';
    });
    html += '</div>';

    html += '<div class="pay-note">' +
      '<b>WILD</b> substitutes for every symbol except STORM PORTAL, and appears on reels 2–4 only. ' +
      '3+ <b>STORM PORTALS</b> anywhere award <b>' + FREE_SPINS_AWARD + ' free spins</b> with all wins ' +
      '<b>×' + FREE_SPIN_MULTIPLIER + '</b> (retrigger +' + FREE_SPINS_AWARD + '). ' +
      'Wins pay left to right on ' + PAYLINES.length + ' fixed lines; only the highest win per line is paid. ' +
      'Scatter wins are added on top. Big win celebration at ' + BIGWIN_FACTOR + '× total bet or more.' +
      '</div>';

    html += '<div class="pay-lines-title">PAYLINES</div><div class="pay-lines">';
    PAYLINES.forEach(function (rows, li) {
      var pts = rows.map(function (r, c) { return (c * 20 + 10) + ',' + (r * 20 + 10); }).join(' ');
      html += '<div class="pay-line-mini"><svg viewBox="0 0 100 60">';
      for (var c = 0; c < 5; c++) {
        for (var r = 0; r < 3; r++) {
          html += '<rect x="' + (c * 20 + 2) + '" y="' + (r * 20 + 2) +
                  '" width="16" height="16" rx="3" fill="rgba(74,85,120,0.35)"/>';
        }
      }
      html += '<polyline points="' + pts + '" fill="none" stroke="' +
              LINE_COLORS[li % LINE_COLORS.length] + '" stroke-width="3" ' +
              'stroke-linecap="round" stroke-linejoin="round"/>';
      html += '</svg><span>LINE ' + (li + 1) + '</span></div>';
    });
    html += '</div>';

    body.innerHTML = html;
    // Point the paytable symbol images at current art (real or fallback)
    SYMBOL_IDS.forEach(function (id) { refreshSymbolImages(id); });
  }

  function openPaytable() {
    playSound('click');
    buildPaytable(); // rebuild so late-loading art is picked up
    $('paytable-modal').classList.remove('hidden');
  }

  function closePaytable() {
    playSound('click');
    $('paytable-modal').classList.add('hidden');
  }

  /* ----------------------------------------------------------
   * Event wiring
   * -------------------------------------------------------- */
  function wireEvents() {
    // Audio unlock on the very first user gesture
    var unlock = function () {
      unlockAudio();
      document.removeEventListener('pointerdown', unlock);
      document.removeEventListener('keydown', unlock);
    };
    document.addEventListener('pointerdown', unlock);
    document.addEventListener('keydown', unlock);

    $('spin-btn').addEventListener('click', function () {
      playSound('click');
      if (state.autoplay > 0) { stopAutoplay(); return; }
      spin(false);
    });

    $('bet-minus').addEventListener('click', function () {
      if (state.spinning || state.inFreeSpins) { return; }
      playSound('click');
      state.betIndex = clamp(state.betIndex - 1, 0, BETS.length - 1);
      $('bet-value').textContent = String(totalBet());
      updateControls();
    });

    $('bet-plus').addEventListener('click', function () {
      if (state.spinning || state.inFreeSpins) { return; }
      playSound('click');
      state.betIndex = clamp(state.betIndex + 1, 0, BETS.length - 1);
      $('bet-value').textContent = String(totalBet());
      updateControls();
    });

    $('auto-btn').addEventListener('click', function () {
      playSound('click');
      startAutoplay();
    });

    $('mute-btn').addEventListener('click', function () {
      setMuted(!muted);
      playSound('click');
    });

    $('paytable-btn').addEventListener('click', openPaytable);
    $('paytable-close').addEventListener('click', closePaytable);
    $('paytable-modal').addEventListener('click', function (e) {
      if (e.target === $('paytable-modal')) { closePaytable(); }
    });

    $('reset-credits').addEventListener('click', function () {
      playSound('click');
      setBalance(START_BALANCE);
      setMessage('CREDITS RESET', '');
      updateControls();
    });

    $('bigwin-overlay').addEventListener('click', closeBigWin);

    // Space bar = spin
    document.addEventListener('keydown', function (e) {
      if (e.code !== 'Space' && e.key !== ' ') { return; }
      var modalOpen = !$('paytable-modal').classList.contains('hidden');
      e.preventDefault();
      if (e.repeat) { return; }
      if (modalOpen) { closePaytable(); return; }
      if (!$('bigwin-overlay').classList.contains('hidden')) { closeBigWin(); return; }
      if (state.autoplay > 0) { stopAutoplay(); return; }
      spin(false);
    });

    // Escape closes the paytable
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { closePaytable(); }
    });
  }

  /* ----------------------------------------------------------
   * Debug hooks (harmless in production)
   * -------------------------------------------------------- */
  window.SKYBOUND = {
    state: function () {
      return {
        balance: state.balance,
        bet: totalBet(),
        spinning: state.spinning,
        lastWin: state.lastWin,
        freeSpins: state.freeSpins,
        inFreeSpins: state.inFreeSpins,
        autoplay: state.autoplay,
        muted: muted,
        forced: state.forced,
        grid: state.grid.map(function (col) { return col.slice(); })
      };
    },
    spin: function () { spin(false); },
    forceNext: function (kind) {
      if (kind === 'scatter3' || kind === 'bigwin') { state.forced = kind; }
      else { state.forced = null; }
      return state.forced;
    },
    setBalance: function (n) {
      var v = parseInt(n, 10);
      if (isNaN(v) || !isFinite(v)) { return state.balance; }
      setBalance(Math.max(0, v));
      updateControls();
      return state.balance;
    }
  };

  /* ----------------------------------------------------------
   * Init
   * -------------------------------------------------------- */
  function init() {
    preloadSymbolImages();
    preloadAudio();
    initBackground();
    initLogo();
    buildReels();
    renderInitialGrid();
    buildPaytable();
    wireEvents();

    $('bet-value').textContent = String(totalBet());
    setBalance(state.balance);
    setMuted(muted);
    updateControls();
    setMessage('SPIN TO ENGAGE', '');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
