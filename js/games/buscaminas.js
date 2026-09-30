(function (A) {
  'use strict';
  const { C, FX, FY, fp, rnd, clamp, sfx, pad } = A;
  const W = 24, H = 18, MINES = 60, OX = 6, OY = 3;
  const NCOL = [0, C.CYN, C.GRN, C.RED, C.MAG, C.ORG, C.YEL, C.WHT, C.WHT];
  const MOVE = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

  A.register({
    id: 'buscaminas', name: 'BUSCAMINAS', hi: true,
    desc: 'Despeja el campo sin pisar ninguna de las 60 minas. Cuanto antes acabes, mas puntos.',
    ctl: ['FLECHAS   mover el cursor', 'ESPACIO   destapar', 'B (X/Z)   marcar con bandera'],
    help: 'FLECHAS cursor   ESPACIO destapar   X bandera   ESC menu',

    init() {
      this.mine = new Uint8Array(W * H); this.open = new Uint8Array(W * H);
      this.flag = new Uint8Array(W * H); this.n = new Uint8Array(W * H);
      this.cx = W >> 1; this.cy = H >> 1; this.placed = false; this.t = 0;
      this.left = W * H - MINES; this.flags = 0;
    },
    around(x, y, fn) {
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if ((dx || dy) && nx >= 0 && ny >= 0 && nx < W && ny < H) fn(nx, ny, ny * W + nx);
      }
    },
    // las minas se colocan tras el primer clic, que siempre cae en zona despejada
    place(sx, sy) {
      let left = MINES;
      while (left) {
        const x = rnd(W), y = rnd(H), i = y * W + x;
        if (this.mine[i] || (Math.abs(x - sx) <= 1 && Math.abs(y - sy) <= 1)) continue;
        this.mine[i] = 1; left--;
        this.around(x, y, (nx, ny, ni) => this.n[ni]++);
      }
      this.placed = true;
    },
    reveal(x, y) {
      const stack = [[x, y]];
      while (stack.length) {
        const [px, py] = stack.pop(), i = py * W + px;
        if (this.open[i] || this.flag[i]) continue;
        this.open[i] = 1;
        if (this.mine[i]) { sfx.boom(); this.score = 0; return A.end('BOOM!'); }
        this.left--;
        if (!this.n[i]) this.around(px, py, (nx, ny) => stack.push([nx, ny]));
      }
      if (!this.left) {
        this.score = Math.max(100, 3000 - Math.floor(this.t / 1000) * 10);
        A.end('CAMPO DESPEJADO!', true);
      }
    },
    key(k, rep) {
      const m = MOVE[k], i = this.cy * W + this.cx;
      if (m) { this.cx = clamp(this.cx + m[0], 0, W - 1); this.cy = clamp(this.cy + m[1], 0, H - 1); return; }
      if (rep) return;
      if (k === 'b') {
        if (!this.open[i]) { this.flag[i] ^= 1; this.flags += this.flag[i] ? 1 : -1; sfx.move(); }
      } else if (k === 'a') {
        if (!this.placed) this.place(this.cx, this.cy);
        if (!this.open[i]) { if (!this.flag[i]) { sfx.hit(); this.reveal(this.cx, this.cy); } return; }
        // sobre un número ya resuelto con banderas: destapa sus vecinas
        let f = 0;
        this.around(this.cx, this.cy, (nx, ny, ni) => { f += this.flag[ni]; });
        if (this.n[i] && f === this.n[i]) this.around(this.cx, this.cy, (nx, ny) => { if (!this.over) this.reveal(nx, ny); });
      }
    },
    update(dt) { if (this.placed) this.t += dt; },
    draw() {
      A.frame(this, 'MINAS ' + pad(Math.max(0, MINES - this.flags), 3) + '   TIEMPO ' + pad(this.t / 1000, 3) + ' s');
      A.box(FX + OX - 1, FY + OY - 1, W * 2 + 2, H + 2, C.DIM);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const i = y * W + x;
        let s = '::', c = C.DIM;
        if (this.over && this.mine[i] && !this.flag[i]) { s = '**'; c = C.RED; }
        else if (this.flag[i]) { s = '|>'; c = this.over && !this.mine[i] ? C.DIM : C.RED; }
        else if (this.open[i]) { s = this.n[i] ? ' ' + this.n[i] : '  '; c = NCOL[this.n[i]]; }
        if (x === this.cx && y === this.cy && !this.over) c = (c === C.DIM ? C.WHT : c) | C.INV;
        fp(OX + x * 2, OY + y, s, c);
      }
    },
  });
})(Arcade);
