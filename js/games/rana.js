(function (A) {
  'use strict';
  const { C, FW, fp, clamp, sfx } = A;
  const LW = FW, STEP = 4, START = 11, TIME = 30000;
  const SLOTS = [4, 16, 28, 40, 52];
  const FROG = ['(00)', '/||\\'];
  const log = w => { const s = '[' + '='.repeat(w - 2) + ']'; return [s, s]; };
  const CAR_R = ['[##]=>', ' o  o '], CAR_L = ['<=[##]', ' o  o '];
  const TRUCK = ['<[######]', ' oo   oo '], RACER = ['=[>>>', ' o o '];

  // carril: n copias del sprite repartidas en una cinta sin fin de LW caracteres
  function lane(kind, v, spr, n, col) {
    const rows = spr.map(() => Array(LW).fill(' '));
    for (let i = 0; i < n; i++) {
      const x0 = Math.floor(i * LW / n);
      spr.forEach((r, ri) => { for (let j = 0; j < r.length; j++) rows[ri][(x0 + j) % LW] = r[j]; });
    }
    const solid = rows[0].map((c, x) => c !== ' ' || rows[1][x] !== ' ');
    return { kind, v, col, rows, solid, off: 0 };
  }
  const idx = (l, x) => ((x - Math.floor(l.off)) % LW + LW) % LW;

  A.register({
    id: 'rana', name: 'RANA', hi: true,
    desc: 'Cruza la carretera y el rio saltando sobre los troncos hasta llenar las cinco charcas.',
    ctl: ['FLECHAS / WASD   saltar', 'ojo al reloj: 30 s por rana'],
    help: 'FLECHAS saltar   P pausa   ESC menu',

    init() { this.lives = 3; this.lvl = 0; this.build(); },
    build() {
      this.homes = SLOTS.map(() => false);
      this.lanes = [
        null,
        lane('log', -7, log(12), 3, C.ORG), lane('log', 9, log(8), 4, C.ORG), lane('log', -5, log(16), 2, C.ORG),
        lane('log', 11, log(8), 3, C.ORG), lane('log', -8, log(12), 3, C.ORG),
        null,
        lane('car', -13, TRUCK, 2, C.RED), lane('car', 10, CAR_R, 3, C.YEL),
        lane('car', -8, CAR_L, 3, C.WHT), lane('car', 16, RACER, 2, C.MAG),
        null,
      ];
      this.resetFrog();
    },
    resetFrog() { this.fx = 28; this.fl = START; this.best = START; this.time = TIME; this.dead = 0; },
    die() {
      if (this.dead > 0) return;
      this.lives--; this.dead = 900; sfx.bad();
    },
    key(k, rep) {
      if (rep || this.dead > 0) return;
      if (k === 'left') this.fx = clamp(this.fx - STEP, 0, FW - 4);
      else if (k === 'right') this.fx = clamp(this.fx + STEP, 0, FW - 4);
      else if (k === 'down') this.fl = Math.min(START, this.fl + 1);
      else if (k === 'up') this.fl--;
      else return;
      sfx.move();
      if (this.fl < this.best) { this.best = this.fl; this.score += 10; }
      if (this.fl === 0) this.arrive();
    },
    arrive() {
      const i = SLOTS.findIndex((x, n) => Math.abs(this.fx - x) <= 2 && !this.homes[n]);
      if (i < 0) { this.fl = 1; return this.die(); }
      this.homes[i] = true;
      this.score += 50 + Math.floor(this.time / 1000) * 2;
      if (this.homes.every(h => h)) { this.lvl++; this.score += 300; sfx.win(); this.build(); }
      else { sfx.up(); this.resetFrog(); }
    },
    update(dt) {
      const s = dt / 1000, mul = 1 + this.lvl * .15;
      this.lanes.forEach((l, i) => {
        if (!l) return;
        const before = Math.floor(l.off);
        l.off += l.v * mul * s;
        const d = Math.floor(l.off) - before;        // avance entero: la rana viaja con el tronco
        l.off = (l.off % LW + LW) % LW;
        if (!this.dead && i === this.fl && l.kind === 'log') this.fx += d;
      });
      if (this.dead > 0) {
        if ((this.dead -= dt) <= 0) { if (this.lives <= 0) A.end(); else this.resetFrog(); }
        return;
      }
      if ((this.time -= dt) <= 0) return this.die();
      const l = this.lanes[this.fl];
      if (!l) return;
      if (l.kind === 'car') {
        for (let x = this.fx; x < this.fx + 4; x++) if (l.solid[idx(l, x)]) return this.die();
      } else if ((!l.solid[idx(l, this.fx + 1)] && !l.solid[idx(l, this.fx + 2)]) || this.fx < 0 || this.fx > FW - 4) this.die();
    },
    draw() {
      const bar = '#'.repeat(Math.max(0, Math.ceil(this.time / 3000))).padEnd(10, '.');
      A.frame(this, 'VIDAS ' + Math.max(0, this.lives) + '   NIVEL ' + (this.lvl + 1) + '   TIEMPO [' + bar + ']');
      // charcas
      for (let r = 0; r < 2; r++) fp(0, r, '#'.repeat(FW), C.GRN);
      SLOTS.forEach((x, i) => { for (let r = 0; r < 2; r++) fp(x, r, this.homes[i] ? FROG[r] : '    ', C.YEL); });
      // zonas seguras
      for (const y of [12, 13, 22, 23]) fp(y % 2, y, '. '.repeat(FW / 2), C.DIM);
      this.lanes.forEach((l, i) => {
        if (!l) return;
        for (let r = 0; r < 2; r++) {
          const y = i * 2 + r;
          if (l.kind === 'log') for (let x = (y * 3) % 6; x < FW; x += 6) fp(x, y, '~', C.BLU);
          for (let x = 0; x < FW; x++) { const c = l.rows[r][idx(l, x)]; if (c !== ' ') fp(x, y, c, l.col); }
        }
      });
      for (let r = 0; r < 2; r++) fp(this.fx, this.fl * 2 + r, this.dead > 0 ? 'XXXX' : FROG[r], this.dead > 0 ? C.RED : C.GRN);
    },
  });
})(Arcade);
