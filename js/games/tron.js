(function (A) {
  'use strict';
  const { C, fp, rnd, sfx } = A;
  const W = 30, H = 24;
  const DIR = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  const COL = [0, C.CYN, C.RED, C.ORG, C.MAG];
  const STARTS = [[5, 12, DIR.right], [24, 12, DIR.left], [15, 3, DIR.down], [15, 20, DIR.up]];

  A.register({
    id: 'tron', name: 'TRON', hi: true,
    desc: 'Motos de luz: encierra a los rivales con tu estela sin chocar con ninguna.',
    ctl: ['FLECHAS / WASD   girar', 'cada 2 rondas entra otro rival'],
    help: 'FLECHAS girar   P pausa   ESC menu',

    init() { this.lives = 3; this.round = 0; this.startRound(); },
    startRound() {
      this.g = new Uint8Array(W * H);
      const n = 2 + Math.min(2, Math.floor(this.round / 2));
      this.bikes = STARTS.slice(0, n).map(([x, y, d], i) => ({ id: i + 1, x, y, d, nd: d, alive: true }));
      for (const b of this.bikes) this.g[b.y * W + b.x] = b.id;
      this.t = 0; this.wait = 900;
    },
    blocked(x, y) { return x < 0 || y < 0 || x >= W || y >= H || this.g[y * W + x] !== 0; },
    key(k) {
      const m = DIR[k], p = this.bikes[0];
      if (m && !(m[0] === -p.d[0] && m[1] === -p.d[1])) p.nd = m;
    },
    // hueco alcanzable desde una casilla: la IA gira hacia donde queda más sitio
    space(x, y) {
      if (this.blocked(x, y)) return 0;
      const seen = new Set([y * W + x]), q = [[x, y]];
      for (let i = 0; i < q.length && q.length < 220; i++) {
        for (const d of Object.values(DIR)) {
          const nx = q[i][0] + d[0], ny = q[i][1] + d[1], key = ny * W + nx;
          if (!this.blocked(nx, ny) && !seen.has(key)) { seen.add(key); q.push([nx, ny]); }
        }
      }
      return q.length;
    },
    think(b) {
      const opts = [b.d, [b.d[1], -b.d[0]], [-b.d[1], b.d[0]]]
        .map(d => ({ d, s: this.space(b.x + d[0], b.y + d[1]) })).filter(o => o.s > 0);
      if (!opts.length) return;
      const max = Math.max(...opts.map(o => o.s));
      const good = opts.filter(o => o.s >= max * .85);
      b.nd = (good[0].d === b.d && rnd(100) > 3 ? good[0] : good[rnd(good.length)]).d;
    },
    update(dt) {
      if (this.wait > 0) { this.wait -= dt; return; }
      this.t += dt;
      if (this.t < Math.max(45, 85 - this.round * 4)) return;
      this.t = 0;
      const live = this.bikes.filter(b => b.alive);
      for (const b of live) { if (b.id > 1) this.think(b); b.d = b.nd; b.tx = b.x + b.d[0]; b.ty = b.y + b.d[1]; }
      for (const b of live) {
        if (this.blocked(b.tx, b.ty) || live.some(o => o !== b && o.tx === b.tx && o.ty === b.ty)) b.alive = false;
      }
      for (const b of live) {
        if (b.alive) { b.x = b.tx; b.y = b.ty; this.g[b.y * W + b.x] = b.id; }
        else { for (let i = 0; i < this.g.length; i++) if (this.g[i] === b.id) this.g[i] = 0; sfx.boom(); }
      }
      if (!this.bikes[0].alive) {
        this.lives--;
        if (this.lives <= 0) return A.end();
        return this.startRound();
      }
      this.score++;
      if (!this.bikes.some(b => b.id > 1 && b.alive)) {
        this.score += 100 * (this.round + 1); this.round++; sfx.win(); this.startRound();
      }
    },
    draw() {
      A.frame(this, 'VIDAS ' + Math.max(0, this.lives) + '   RONDA ' + (this.round + 1) + '   RIVALES ' + this.bikes.filter(b => b.id > 1 && b.alive).length);
      for (let i = 0; i < this.g.length; i++) if (this.g[i]) fp((i % W) * 2, Math.floor(i / W), '##', COL[this.g[i]]);
      for (const b of this.bikes) if (b.alive) fp(b.x * 2, b.y, b.id === 1 ? '@@' : '<>', C.WHT);
      if (this.wait > 0 && !this.over) fp(24, 8, ' PREPARADO! ', C.YEL | C.INV);
    },
  });
})(Arcade);
