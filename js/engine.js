/* ASCII ARCADE — motor: pantalla de caracteres, entrada, sonido, récords y escenas.
 * Los juegos se registran con Arcade.register({...}) y solo dibujan texto. */
(function () {
  'use strict';

  const COLS = 64, ROWS = 32;                    // pantalla completa, en caracteres
  const FX = 2, FY = 4, FW = 60, FH = 24;        // interior del campo de juego
  const VERSION = '2.0';

  // atributo de celda: color (0-15) y, sumando INV, vídeo inverso
  const C = { FG: 0, DIM: 1, RED: 2, YEL: 3, CYN: 4, MAG: 5, BLU: 6, WHT: 7, ORG: 8, GRN: 9, INV: 16 };
  const THEMES = [
    { id: 'color',  bg: '#03070a', pal: ['#39ff6a', '#1f8a40', '#ff5a5a', '#ffe04d', '#4de1ff', '#ff6bf0', '#6f8dff', '#f4f4f4', '#ff9d3c', '#39ff6a'] },
    { id: 'verde',  bg: '#020602', mono: ['#33ff66', '#1a8035'] },
    { id: 'ambar',  bg: '#070400', mono: ['#ffb000', '#8a5f00'] },
    { id: 'blanco', bg: '#050505', mono: ['#e8e8e8', '#7a7a7a'] },
  ];
  const FONT = '"DejaVu Sans Mono", "Cascadia Mono", Menlo, Consolas, "Liberation Mono", monospace';

  /* ───────────── utilidades ───────────── */
  const rnd = n => Math.floor(Math.random() * n);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const pad = (n, l = 6) => String(Math.floor(n)).padStart(l, '0');

  const store = {
    get(k, def) {
      try { const v = localStorage.getItem('ascii-arcade:' + k); return v === null ? def : JSON.parse(v); }
      catch (e) { return def; }
    },
    set(k, v) { try { localStorage.setItem('ascii-arcade:' + k, JSON.stringify(v)); } catch (e) {} },
  };

  /* ───────────── pantalla ───────────── */
  const ch = new Array(COLS * ROWS).fill(' ');
  const at = new Uint8Array(COLS * ROWS);
  let cv, ctx, glow, gctx, crt, stage;
  let cw = 8, chh = 16, lastSig = '';
  let theme = 0, scan = true;

  function cls() { ch.fill(' '); at.fill(0); }
  function put(x, y, s, c) {
    x = Math.round(x); y = Math.round(y); s = String(s); c = c || 0;
    if (y < 0 || y >= ROWS) return;
    for (let i = 0; i < s.length; i++) {
      const cx = x + i;
      if (cx >= 0 && cx < COLS) { ch[y * COLS + cx] = s[i]; at[y * COLS + cx] = c; }
    }
  }
  function center(y, s, c) { put((COLS - s.length) >> 1, y, s, c); }
  function box(x, y, w, h, c) {
    const bar = '+' + '-'.repeat(w - 2) + '+';
    put(x, y, bar, c); put(x, y + h - 1, bar, c);
    for (let i = 1; i < h - 1; i++) { put(x, y + i, '|', c); put(x + w - 1, y + i, '|', c); }
  }
  // dibuja en coordenadas del campo, recortando contra sus bordes
  function fp(x, y, s, c) {
    x = Math.round(x); y = Math.round(y); s = String(s); c = c || 0;
    if (y < 0 || y >= FH) return;
    for (let i = 0; i < s.length; i++) {
      const cx = x + i;
      if (cx >= 0 && cx < FW) { const o = (FY + y) * COLS + FX + cx; ch[o] = s[i]; at[o] = c; }
    }
  }
  function text() {
    const rows = [];
    for (let y = 0; y < ROWS; y++) rows.push(ch.slice(y * COLS, (y + 1) * COLS).join(''));
    return rows.join('\n');
  }

  function color(i) {
    const t = THEMES[theme];
    return t.pal ? t.pal[i] || t.pal[0] : t.mono[i === C.DIM ? 1 : 0];
  }
  function render() {
    const sig = ch.join('') + String.fromCharCode.apply(null, at) + theme;
    if (sig === lastSig) return;
    lastSig = sig;
    const bg = THEMES[theme].bg;
    ctx.clearRect(0, 0, cv.width, cv.height);
    for (let i = 0; i < at.length; i++) {
      if (!(at[i] & C.INV)) continue;
      ctx.fillStyle = color(at[i] & 15);
      ctx.fillRect((i % COLS) * cw, Math.floor(i / COLS) * chh, cw, chh);
    }
    let cur = null;
    for (let i = 0; i < ch.length; i++) {
      if (ch[i] === ' ') continue;
      const st = at[i] & C.INV ? bg : color(at[i] & 15);
      if (st !== cur) { ctx.fillStyle = st; cur = st; }
      ctx.fillText(ch[i], (i % COLS) * cw + cw / 2, Math.floor(i / COLS) * chh + chh / 2);
    }
    if (scan) { gctx.clearRect(0, 0, glow.width, glow.height); gctx.drawImage(cv, 0, 0); }
  }

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const aw = stage.clientWidth - 64, ah = stage.clientHeight - 56;
    // celda de alto par y ancho justo la mitad: dos caracteres forman un cuadrado
    const unit = Math.max(8, Math.floor(Math.min(ah / ROWS, aw / COLS * 2) * dpr / 2) * 2);
    chh = unit; cw = unit / 2;
    for (const c of [cv, glow]) {
      c.width = COLS * cw; c.height = ROWS * chh;
      c.style.width = c.width / dpr + 'px'; c.style.height = c.height / dpr + 'px';
    }
    ctx.font = Math.round(chh * .84) + 'px ' + FONT;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    lastSig = '';
  }

  function setTheme(i) {
    theme = (i + THEMES.length) % THEMES.length;
    const t = THEMES[theme];
    document.documentElement.style.setProperty('--bg', t.bg);
    document.documentElement.style.setProperty('--key', color(C.FG));
    store.set('theme', theme);
  }
  function setScan(v) { scan = v; crt.classList.toggle('noscan', !v); store.set('scan', v); lastSig = ''; }

  /* ───────────── letras grandes ───────────── */
  const BIG = {
    A: [' ### ', '#   #', '#####', '#   #', '#   #'],
    R: ['#### ', '#   #', '#### ', '#  # ', '#   #'],
    C: [' ####', '#    ', '#    ', '#    ', ' ####'],
    D: ['#### ', '#   #', '#   #', '#   #', '#### '],
    E: ['#####', '#    ', '#### ', '#    ', '#####'],
    0: ['###', '# #', '# #', '# #', '###'], 1: ['  #', '  #', '  #', '  #', '  #'],
    2: ['###', '  #', '###', '#  ', '###'], 3: ['###', '  #', '###', '  #', '###'],
    4: ['# #', '# #', '###', '  #', '  #'], 5: ['###', '#  ', '###', '  #', '###'],
    6: ['###', '#  ', '###', '# #', '###'], 7: ['###', '  #', '  #', '  #', '  #'],
    8: ['###', '# #', '###', '# #', '###'], 9: ['###', '# #', '###', '  #', '###'],
  };
  function big(txt) {
    const rows = ['', '', '', '', ''];
    for (const c of String(txt)) for (let r = 0; r < 5; r++) rows[r] += BIG[c][r] + ' ';
    return rows.map(r => r.slice(0, -1));
  }

  /* ───────────── sonido ───────────── */
  let ac = null, snd = true;
  function actx() {
    if (!ac) {
      const K = window.AudioContext || window.webkitAudioContext;
      if (!K) return null;
      ac = new K();
    }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  }
  function tone(f, d, o) {
    if (!snd) return;
    o = o || {};
    try {
      const a = actx(); if (!a) return;
      const t = a.currentTime + (o.at || 0);
      const os = a.createOscillator(), g = a.createGain();
      os.type = o.type || 'square';
      os.frequency.setValueAtTime(f, t);
      if (o.to) os.frequency.exponentialRampToValueAtTime(o.to, t + d);
      g.gain.setValueAtTime(o.vol || .045, t);
      g.gain.exponentialRampToValueAtTime(.0001, t + d);
      os.connect(g); g.connect(a.destination);
      os.start(t); os.stop(t + d + .02);
    } catch (e) {}
  }
  function seq(notes, step) {
    step = step || .09;
    notes.forEach((f, i) => { if (f) tone(f, step * 1.15, { at: i * step }); });
  }
  function noise(d) {
    if (!snd) return;
    try {
      const a = actx(); if (!a) return;
      const n = Math.floor(a.sampleRate * d), b = a.createBuffer(1, n, a.sampleRate), data = b.getChannelData(0);
      for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
      const s = a.createBufferSource(), g = a.createGain();
      s.buffer = b; g.gain.value = .09;
      s.connect(g); g.connect(a.destination); s.start();
    } catch (e) {}
  }
  const sfx = {
    move: () => tone(520, .02),
    ok: () => tone(660, .08, { to: 990 }),
    pick: () => tone(880, .07, { to: 1400 }),
    hit: () => tone(330, .05),
    bounce: () => tone(240, .03),
    shoot: () => tone(1100, .08, { to: 300 }),
    boom: () => noise(.25),
    bad: () => tone(200, .35, { to: 50 }),
    up: () => seq([523, 659, 784], .07),
    win: () => seq([523, 659, 784, 1047, 0, 1047], .09),
    lose: () => seq([392, 330, 262, 196], .15),
  };

  /* ───────────── récords ───────────── */
  const TOP = 5;
  const scores = id => store.get('hs:' + id, []);
  const best = id => { const s = scores(id); return s.length ? s[0].s : 0; };
  function qualifies(id, s) { const l = scores(id); return s > 0 && (l.length < TOP || s > l[l.length - 1].s); }
  function addScore(id, n, s) {
    const l = scores(id);
    let i = l.findIndex(e => s > e.s);
    if (i < 0) i = l.length;
    l.splice(i, 0, { n, s });
    store.set('hs:' + id, l.slice(0, TOP));
    return i + 1;
  }

  /* ───────────── escenas ───────────── */
  const games = [];
  const held = new Set();
  const TOUCH = !!(window.matchMedia && window.matchMedia('(hover: none) and (pointer: coarse)').matches);
  const OK = TOUCH ? 'A' : 'ENTER';
  let state = 'boot', game = null, paused = false, sel = 0, last = 0, now = 0, bootT = 0, overT = 0, entry = null;

  function register(g) { games.push(g); }
  function start(i) {
    sel = i; game = games[i];
    game.score = 0; game.over = false; game.rank = 0;
    game.init();
    paused = false; state = 'play'; sfx.ok();
  }
  function toMenu() { state = 'menu'; paused = false; store.set('sel', sel); }

  function end(msg, win) {
    const g = game;
    if (g.over) return;
    g.over = true; g.msg = msg || 'GAME OVER'; g.rank = 0; overT = 0;
    if (win) sfx.win(); else sfx.lose();
    if (g.hi && qualifies(g.id, g.score)) { entry = { c: store.get('ini', 'AAA').split(''), pos: 0 }; state = 'name'; }
  }

  function hud(g) {
    put(1, 1, ' ' + g.name + ' ', C.WHT | C.INV);
    if (!g.hi) return;
    put(22, 1, 'PUNTOS ', C.DIM); put(29, 1, pad(g.score), C.WHT);
    put(COLS - 14, 1, 'RECORD ', C.DIM); put(COLS - 7, 1, pad(Math.max(g.score, best(g.id))), C.YEL);
  }
  function frame(g, info) {
    hud(g);
    if (info) put(1, 2, info);
    box(FX - 1, FY - 1, FW + 2, FH + 2, C.DIM);
    center(ROWS - 2, g.help, C.DIM);
  }
  function overlay(lines) {
    lines = lines.map(l => Array.isArray(l) ? l : [l, C.FG]);
    const w = Math.max(...lines.map(l => l[0].length)) + 6, h = lines.length + 4;
    const x = (COLS - w) >> 1, y = (ROWS - h) >> 1;
    for (let i = 0; i < h; i++) put(x, y + i, ' '.repeat(w));
    box(x, y, w, h, C.WHT);
    lines.forEach((l, i) => center(y + 2 + i, l[0], l[1]));
  }
  const table = (id, n) => scores(id).slice(0, n).map((e, i) => [(i + 1) + '. ' + e.n + '  ' + pad(e.s), C.YEL]);

  const BOOT = [
    'ASCII ARCADE BIOS v' + VERSION, '',
    'MEMORIA BASE ......... 640K OK',
    'VIDEO ................ TEXTO 64x32 OK',
    'SONIDO ............... ALTAVOZ PC OK',
    'MANDOS ............... TECLADO / GAMEPAD OK',
    '', '', 'CARGANDO MENU',
  ];
  function drawBoot(dt) {
    bootT += dt;
    const n = Math.floor(bootT / 170);
    BOOT[6] = 'CARTUCHOS ............ ' + games.length + ' DETECTADOS';
    BOOT.slice(0, n).forEach((l, i) => put(3, 3 + i, l, i ? C.FG : C.WHT));
    put(3 + (n > 0 && n <= BOOT.length ? BOOT[n - 1].length + 1 : 0), 3 + clamp(n - 1, 0, BOOT.length - 1), Math.floor(bootT / 250) % 2 ? '_' : ' ');
    if (n > BOOT.length + 4) toMenu();
  }

  function wrap(s, w) {
    const out = []; let line = '';
    for (const word of s.split(' ')) {
      if (line && (line + ' ' + word).length > w) { out.push(line); line = word; }
      else line = line ? line + ' ' + word : word;
    }
    if (line) out.push(line);
    return out;
  }
  const LOGO = big('ARCADE');
  function drawMenu() {
    center(1, '-=[  A  S  C  I  I  ]=-', C.DIM);
    LOGO.forEach((r, i) => center(3 + i, r, [C.RED, C.ORG, C.YEL, C.GRN, C.CYN][i]));
    put(1, 9, '='.repeat(62), C.DIM);
    games.forEach((g, i) => {
      const on = i === sel;
      put(2, 11 + i, (on ? ' > ' : '   ') + String(i + 1).padStart(2, '0') + '  ' + g.name.padEnd(13), on ? C.YEL | C.INV : C.FG);
    });
    const g = games[sel];
    box(25, 10, 38, 15, C.DIM);
    put(27, 11, ' ' + g.name + ' ', C.WHT | C.INV);
    wrap(g.desc, 34).slice(0, 3).forEach((l, i) => put(27, 13 + i, l));
    g.ctl.slice(0, 3).forEach((l, i) => put(27, 17 + i, l, C.CYN));
    if (!g.hi) put(27, 21, 'MODO LIBRE, SIN PUNTUACION', C.DIM);
    else {
      const t = table(g.id, 3);
      if (!t.length) put(27, 21, 'SIN RECORDS TODAVIA', C.DIM);
      t.forEach((l, i) => put(27, 21 + i, l[0], l[1]));
    }
    put(1, 25, '='.repeat(62), C.DIM);
    if (Math.floor(now / 500) % 2) center(27, 'PULSA ' + OK + ' PARA JUGAR', C.WHT);
    const si = v => v ? 'SI' : 'NO';
    center(29, (TOUCH ? 'B' : 'C') + ' color:' + THEMES[theme].id.toUpperCase() + '   M sonido:' + si(snd) + '   L lineas:' + si(scan) + '   F pantalla', C.DIM);
    center(30, 'v' + VERSION + '   FLECHAS elegir   ESC menu   P pausa', C.DIM);
  }

  function drawName() {
    const n = entry;
    const letters = n.c.map((c, i) => i === n.pos && Math.floor(now / 250) % 2 ? '_' : c).join(' ');
    overlay([
      [game.msg, C.WHT], 'PUNTOS ' + pad(game.score), '',
      ['NUEVO RECORD!', C.YEL], '', 'TUS INICIALES', ['[ ' + letters + ' ]', C.WHT], '',
      [TOUCH ? 'FLECHAS elegir   A aceptar' : 'escribe o usa FLECHAS   ENTER aceptar', C.DIM],
    ]);
  }
  function drawOver() {
    const g = game;
    const lines = [[g.msg, C.WHT]];
    if (g.hi) {
      lines.push('PUNTOS ' + pad(g.score));
      if (g.rank) lines.push(['PUESTO ' + g.rank + ' DE LA TABLA', C.CYN]);
      const t = table(g.id, TOP);
      if (t.length) lines.push('', ...t);
    }
    lines.push('', [OK + ' reintentar   ' + (TOUCH ? 'MENU' : 'ESC') + ' menu', C.DIM]);
    overlay(lines);
  }

  /* ───────────── entrada ───────────── */
  const KEYMAP = {
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
    w: 'up', s: 'down', a: 'left', d: 'right',
    ' ': 'a', Enter: 'a', x: 'b', z: 'b',
    p: 'pause', Escape: 'esc',
  };
  const DIRS = new Set(['up', 'down', 'left', 'right']);
  const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const rep = {};

  function dispatch(k, isRep, raw) {
    if (state === 'boot') { if (!isRep) toMenu(); return; }

    if (state === 'name') {
      const n = entry;
      if (raw && raw.length === 1 && LETTERS.includes(raw.toUpperCase())) {
        n.c[n.pos] = raw.toUpperCase(); n.pos = Math.min(2, n.pos + 1); sfx.move();
      } else if (k === 'up' || k === 'down') {
        const i = LETTERS.indexOf(n.c[n.pos]) + (k === 'up' ? 1 : -1);
        n.c[n.pos] = LETTERS[(i + LETTERS.length) % LETTERS.length]; sfx.move();
      } else if (k === 'left') n.pos = Math.max(0, n.pos - 1);
      else if (k === 'right') n.pos = Math.min(2, n.pos + 1);
      else if (k === 'a' && !isRep) {
        const name = n.c.join('');
        store.set('ini', name);
        game.rank = addScore(game.id, name, game.score);
        state = 'play'; overT = 0; sfx.ok();
      } else if (k === 'esc') { state = 'play'; overT = 0; }
      return;
    }

    if (!isRep) {
      if (k === 'm') { snd = !snd; store.set('snd', snd); sfx.ok(); return; }
      if (k === 'c') { setTheme(theme + 1); return; }
      if (k === 'l') { setScan(!scan); return; }
      if (k === 'f') {
        try {
          if (document.fullscreenElement) document.exitFullscreen();
          else document.documentElement.requestFullscreen();
        } catch (e) {}
        return;
      }
    }

    if (state === 'menu') {
      if (k === 'up') { sel = (sel + games.length - 1) % games.length; sfx.move(); }
      else if (k === 'down') { sel = (sel + 1) % games.length; sfx.move(); }
      else if (k === 'a' && !isRep) start(sel);
      else if (k === 'b' && !isRep) setTheme(theme + 1);
      return;
    }

    if (k === 'esc') return toMenu();
    if (game.over) { if ((k === 'a' || k === 'r') && !isRep && overT > 500) start(sel); return; }
    if (k === 'pause') { if (!isRep) paused = !paused; return; }
    if (paused) { if (k === 'a' && !isRep) paused = false; return; }
    game.key(k, isRep, raw);
  }

  function press(k, raw) {
    if (held.has(k)) return;
    held.add(k);
    if (DIRS.has(k)) rep[k] = 190;
    dispatch(k, false, raw);
  }
  function release(k) { held.delete(k); delete rep[k]; }
  function autoRepeat(dt) {
    for (const k in rep) {
      rep[k] -= dt;
      if (rep[k] <= 0) { rep[k] += 55; dispatch(k, true); }
    }
  }

  const padPrev = {};
  function pollPad() {
    if (typeof navigator === 'undefined' || !navigator.getGamepads) return;
    let gp = null;
    for (const g of navigator.getGamepads()) if (g) { gp = g; break; }
    if (!gp) return;
    const b = i => !!(gp.buttons[i] && gp.buttons[i].pressed), ax = gp.axes;
    const st = {
      up: b(12) || ax[1] < -.5, down: b(13) || ax[1] > .5, left: b(14) || ax[0] < -.5, right: b(15) || ax[0] > .5,
      a: b(0), b: b(1) || b(2), pause: b(9), esc: b(8),
    };
    for (const k in st) {
      if (st[k] && !padPrev[k]) press(k);
      else if (!st[k] && padPrev[k]) release(k);
      padPrev[k] = st[k];
    }
  }

  function bindInput() {
    const norm = e => e.key.length === 1 ? e.key.toLowerCase() : e.key;
    addEventListener('keydown', e => {
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      const raw = norm(e), k = KEYMAP[raw] || raw;
      if (KEYMAP[raw]) e.preventDefault();
      if (!e.repeat) press(k, raw);
    });
    addEventListener('keyup', e => { const raw = norm(e); release(KEYMAP[raw] || raw); });
    addEventListener('blur', () => {
      held.clear(); for (const k in rep) delete rep[k];
      if (state === 'play' && game && !game.over) paused = true;
    });
    addEventListener('resize', resize);
    document.addEventListener('contextmenu', e => { if (TOUCH) e.preventDefault(); });

    for (const b of document.querySelectorAll('#pad button')) {
      const k = b.dataset.k;
      const up = () => { b.classList.remove('on'); release(k); };
      b.addEventListener('pointerdown', e => { e.preventDefault(); b.classList.add('on'); press(k); });
      b.addEventListener('pointerup', up);
      b.addEventListener('pointercancel', up);
      b.addEventListener('pointerleave', up);
    }
  }

  /* ───────────── bucle principal ───────────── */
  function loop(ts) {
    const dt = Math.min(33, ts - last || 0);
    last = ts; now = ts;
    pollPad(); autoRepeat(dt);
    cls();
    if (state === 'boot') drawBoot(dt);
    else if (state === 'menu') drawMenu();
    else {
      if (state === 'play' && !paused && !game.over) game.update(dt);
      game.draw();
      if (state === 'name') drawName();
      else if (game.over) { overT += dt; drawOver(); }
      else if (paused) overlay([['PAUSA', C.WHT], '', [(TOUCH ? 'PAUSA' : 'P') + ' continuar   ' + (TOUCH ? 'MENU' : 'ESC') + ' menu', C.DIM]]);
    }
    render();
    requestAnimationFrame(loop);
  }

  function boot() {
    cv = document.getElementById('screen'); ctx = cv.getContext('2d');
    glow = document.getElementById('glow'); gctx = glow.getContext('2d');
    crt = document.getElementById('crt'); stage = document.getElementById('stage');
    snd = store.get('snd', true);
    sel = clamp(store.get('sel', 0), 0, games.length - 1);
    setTheme(store.get('theme', 0));
    setScan(store.get('scan', true));
    bindInput();
    resize();
    // enlace directo: index.html#tetris arranca ese juego, #menu salta el arranque
    const want = (location.hash || '').slice(1).toLowerCase();
    const gi = games.findIndex(g => g.id === want);
    if (gi >= 0) start(gi); else if (want === 'menu') toMenu();
    requestAnimationFrame(loop);
  }

  window.Arcade = {
    COLS, ROWS, FX, FY, FW, FH, C,
    put, center, box, fp, text, frame, hud, big,
    rnd, clamp, pad, held, sfx, tone, seq, noise,
    register, end, boot, games,
  };
})();
