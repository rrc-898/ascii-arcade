(function (A) {
  'use strict';
  const { C, put, rnd, sfx, pad, held } = A;
  const W = 10, H = 20, WX = 20, WY = 5;
  const SHAPES = {
    I: { c: C.CYN, m: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]] },
    O: { c: C.YEL, m: [[1, 1], [1, 1]] },
    T: { c: C.MAG, m: [[0, 1, 0], [1, 1, 1], [0, 0, 0]] },
    S: { c: C.GRN, m: [[0, 1, 1], [1, 1, 0], [0, 0, 0]] },
    Z: { c: C.RED, m: [[1, 1, 0], [0, 1, 1], [0, 0, 0]] },
    J: { c: C.BLU, m: [[1, 0, 0], [1, 1, 1], [0, 0, 0]] },
    L: { c: C.ORG, m: [[0, 0, 1], [1, 1, 1], [0, 0, 0]] },
  };
  const cw = m => m[0].map((_, i) => m.map(r => r[i]).reverse());
  const ccw = m => m[0].map((_, i) => m.map(r => r[r.length - 1 - i]));

  A.register({
    id: 'tetris', name: 'TETRIS', hi: true,
    desc: 'Encaja las piezas y completa lineas. Cuatro de golpe valen un tetris.',
    ctl: ['<- ->  mover     ABAJO  bajar', 'ARRIBA girar    B  giro inverso', 'ESPACIO  soltar de golpe'],
    help: '<- -> mover   ARRIBA girar   ABAJO bajar   ESPACIO soltar',

    init() {
      this.g = Array.from({ length: H }, () => Array(W).fill(0));
      this.bag = []; this.lines = 0; this.t = 0; this.clr = null;
      this.next = this.pick(); this.spawn();
    },
    pick() {
      if (!this.bag.length) {
        this.bag = Object.keys(SHAPES);
        for (let i = this.bag.length - 1; i > 0; i--) { const j = rnd(i + 1); [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]]; }
      }
      return SHAPES[this.bag.pop()];
    },
    spawn() {
      this.m = this.next.m; this.c = this.next.c; this.next = this.pick();
      this.px = this.m.length === 2 ? 4 : 3; this.py = this.m.length === 4 ? -1 : 0;
      if (this.hit(this.m, this.px, this.py)) A.end();
    },
    hit(m, px, py) {
      for (let y = 0; y < m.length; y++) for (let x = 0; x < m.length; x++) {
        if (!m[y][x]) continue;
        const gx = px + x, gy = py + y;
        if (gx < 0 || gx >= W || gy >= H) return true;
        if (gy >= 0 && this.g[gy][gx]) return true;
      }
      return false;
    },
    get level() { return Math.floor(this.lines / 10); },
    lock() {
      const m = this.m;
      for (let y = 0; y < m.length; y++) for (let x = 0; x < m.length; x++)
        if (m[y][x] && this.py + y >= 0) this.g[this.py + y][this.px + x] = this.c;
      const rows = [];
      this.g.forEach((r, y) => { if (r.every(c => c)) rows.push(y); });
      if (rows.length) {
        this.clr = { rows, t: 220 };                 // destello antes de borrar
        if (rows.length === 4) sfx.win(); else sfx.pick();
      } else { sfx.hit(); this.spawn(); }
    },
    collapse() {
      const n = this.clr.rows.length, lvl = this.level;
      this.g = this.g.filter((_, y) => !this.clr.rows.includes(y));
      while (this.g.length < H) this.g.unshift(Array(W).fill(0));
      this.lines += n;
      this.score += [0, 40, 100, 300, 1200][n] * (lvl + 1);
      if (this.level > lvl) sfx.up();
      this.clr = null; this.spawn();
    },
    turn(r) {
      for (const dx of [0, -1, 1, -2, 2]) if (!this.hit(r, this.px + dx, this.py)) { this.m = r; this.px += dx; sfx.move(); return; }
    },
    key(k, rep) {
      if (this.clr) return;
      if (k === 'left') { if (!this.hit(this.m, this.px - 1, this.py)) this.px--; }
      else if (k === 'right') { if (!this.hit(this.m, this.px + 1, this.py)) this.px++; }
      else if (k === 'up' && !rep) this.turn(cw(this.m));
      else if (k === 'b') this.turn(ccw(this.m));
      else if (k === 'a') {
        let n = 0;
        while (!this.hit(this.m, this.px, this.py + 1)) { this.py++; n++; }
        this.score += n * 2; this.t = 0; this.lock();
      }
    },
    update(dt) {
      if (this.clr) { if ((this.clr.t -= dt) <= 0) this.collapse(); return; }
      this.t += dt;
      const soft = held.has('down');
      if (this.t < (soft ? 45 : Math.max(70, 800 - this.level * 75))) return;
      this.t = 0;
      if (!this.hit(this.m, this.px, this.py + 1)) { this.py++; if (soft) this.score++; }
      else this.lock();
    },
    draw() {
      A.hud(this);
      A.center(A.ROWS - 2, this.help, C.DIM);
      // pozo al estilo del Tetris original de la Elektronika 60
      for (let y = 0; y < H; y++) {
        put(WX, WY + y, '<!', C.DIM); put(WX + 22, WY + y, '!>', C.DIM);
        const flash = this.clr && this.clr.rows.includes(y);
        for (let x = 0; x < W; x++) {
          const v = this.g[y][x];
          if (flash) put(WX + 2 + x * 2, WY + y, Math.floor(this.clr.t / 55) % 2 ? '==' : '[]', C.WHT);
          else put(WX + 2 + x * 2, WY + y, v ? '[]' : ' .', v || C.DIM);
        }
      }
      put(WX, WY + H, '<!' + '='.repeat(20) + '!>', C.DIM);
      put(WX + 2, WY + H + 1, '\\/'.repeat(10), C.DIM);

      const piece = (m, px, py, s, c) => {
        for (let y = 0; y < m.length; y++) for (let x = 0; x < m.length; x++)
          if (m[y][x] && py + y >= 0) put(WX + 2 + (px + x) * 2, WY + py + y, s, c);
      };
      if (!this.over && !this.clr) {
        let gy = this.py;
        while (!this.hit(this.m, this.px, gy + 1)) gy++;
        piece(this.m, this.px, gy, '::', C.DIM);
        piece(this.m, this.px, this.py, '[]', this.c);
      }

      put(4, 7, 'LINEAS', C.DIM); put(4, 8, pad(this.lines, 4), C.WHT);
      put(4, 11, 'NIVEL', C.DIM); put(4, 12, pad(this.level + 1, 2), C.WHT);
      put(48, 7, 'SIGUIENTE', C.DIM);
      A.box(47, 8, 12, 6, C.DIM);
      const n = this.next.m, off = n.length === 2 ? 2 : n.length === 4 ? 0 : 1;
      for (let y = 0; y < n.length; y++) for (let x = 0; x < n.length; x++)
        if (n[y][x]) put(49 + off + x * 2, (n.length === 4 ? 9 : 10) + y, '[]', this.next.c);
    },
  });
})(Arcade);
