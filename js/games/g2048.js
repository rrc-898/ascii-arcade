(function (A) {
  'use strict';
  const { C, fp, rnd, sfx } = A;
  const GX = 9, GY = 3, TW = 9;                     // origen de la rejilla y ancho de ficha
  const COL = [C.WHT, C.YEL, C.ORG, C.RED, C.MAG, C.BLU, C.CYN, C.GRN, C.YEL, C.ORG, C.RED];
  // índices de cada fila o columna, en el orden en que se desliza
  const LINES = {
    left: [0, 1, 2, 3].map(r => [0, 1, 2, 3].map(c => r * 4 + c)),
    right: [0, 1, 2, 3].map(r => [3, 2, 1, 0].map(c => r * 4 + c)),
    up: [0, 1, 2, 3].map(c => [0, 1, 2, 3].map(r => r * 4 + c)),
    down: [0, 1, 2, 3].map(c => [3, 2, 1, 0].map(r => r * 4 + c)),
  };

  A.register({
    id: 'g2048', name: '2048', hi: true,
    desc: 'Desliza las fichas: dos iguales se funden en su doble. Llega a 2048 y sigue si puedes.',
    ctl: ['FLECHAS / WASD   deslizar'],
    help: 'FLECHAS deslizar   P pausa   ESC menu',

    init() { this.g = Array(16).fill(0); this.won = false; this.add(); this.add(); },
    add() {
      const e = [];
      this.g.forEach((v, i) => { if (!v) e.push(i); });
      if (e.length) this.g[e[rnd(e.length)]] = Math.random() < .9 ? 2 : 4;
    },
    canMove() {
      return this.g.some((v, i) => !v || (i % 4 < 3 && v === this.g[i + 1]) || (i < 12 && v === this.g[i + 4]));
    },
    key(k, rep) {
      if (rep || !LINES[k]) return;
      let moved = false, merged = false;
      for (const line of LINES[k]) {
        const vals = line.map(i => this.g[i]).filter(v => v), out = [];
        for (let i = 0; i < vals.length; i++) {
          if (vals[i] === vals[i + 1]) {
            out.push(vals[i] * 2); this.score += vals[i] * 2; merged = true;
            if (vals[i] * 2 === 2048 && !this.won) { this.won = true; sfx.win(); }
            i++;
          } else out.push(vals[i]);
        }
        line.forEach((gi, i) => { const v = out[i] || 0; if (this.g[gi] !== v) moved = true; this.g[gi] = v; });
      }
      if (!moved) return;
      if (merged) sfx.pick(); else sfx.move();
      this.add();
      if (!this.canMove()) A.end('SIN MOVIMIENTOS');
    },
    update() {},
    draw() {
      A.frame(this, 'FICHA MAYOR ' + Math.max(...this.g) + (this.won ? '   2048 CONSEGUIDO!' : ''));
      for (let r = 0; r <= 4; r++) fp(GX, GY + r * 4, ('+' + '-'.repeat(TW)).repeat(4) + '+', C.DIM);
      for (let r = 0; r < 4; r++) for (let y = 1; y < 4; y++) for (let c = 0; c <= 4; c++) fp(GX + c * (TW + 1), GY + r * 4 + y, '|', C.DIM);
      this.g.forEach((v, i) => {
        if (!v) return;
        const x = GX + 1 + (i % 4) * (TW + 1), y = GY + 1 + Math.floor(i / 4) * 4;
        const col = COL[Math.min(COL.length - 1, Math.log2(v) - 1)] | C.INV;
        const s = String(v), l = (TW - s.length) >> 1;
        fp(x, y, ' '.repeat(TW), col);
        fp(x, y + 1, ' '.repeat(l) + s + ' '.repeat(TW - l - s.length), col);
        fp(x, y + 2, ' '.repeat(TW), col);
      });
    },
  });
})(Arcade);
