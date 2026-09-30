(function (A) {
  'use strict';
  const { C, fp, sfx } = A;
  const W = 30, H = 24;
  const MOVE = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

  A.register({
    id: 'vida', name: 'VIDA', hi: false,
    desc: 'El Juego de la Vida de Conway: dibuja celulas y mira como evolucionan solas.',
    ctl: ['FLECHAS cursor    ESPACIO celula', 'B (X/Z) marcha / alto', 'R azar   N borrar'],
    help: 'ESPACIO celula  X marcha/alto  R azar  N borrar  ESC menu',

    init() { this.cx = W >> 1; this.cy = H >> 1; this.t = 0; this.random(); },
    random() {
      this.g = new Uint8Array(W * H).map(() => Math.random() < .28 ? 1 : 0);
      this.gen = 0; this.run = true;
    },
    step() {
      const n = new Uint8Array(W * H);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        let c = 0;                                  // mundo toroidal: los bordes se tocan
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++)
          if (dx || dy) c += this.g[((y + dy + H) % H) * W + (x + dx + W) % W];
        n[y * W + x] = c === 3 || (c === 2 && this.g[y * W + x]) ? 1 : 0;
      }
      this.g = n; this.gen++;
    },
    key(k, rep) {
      const m = MOVE[k];
      if (m) { this.cx = (this.cx + m[0] + W) % W; this.cy = (this.cy + m[1] + H) % H; return; }
      if (rep) return;
      if (k === 'a') { this.g[this.cy * W + this.cx] ^= 1; sfx.move(); }
      else if (k === 'b') { this.run = !this.run; sfx.ok(); }
      else if (k === 'r') this.random();
      else if (k === 'n') { this.g.fill(0); this.gen = 0; this.run = false; }
    },
    update(dt) {
      if (!this.run) return;
      this.t += dt;
      if (this.t >= 110) { this.t = 0; this.step(); }
    },
    draw() {
      const pop = this.g.reduce((a, b) => a + b, 0);
      A.frame(this, 'GENERACION ' + A.pad(this.gen, 5) + '   POBLACION ' + A.pad(pop, 3) + '   ' + (this.run ? 'EN MARCHA' : 'DETENIDO'));
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const on = this.g[y * W + x], cur = x === this.cx && y === this.cy;
        if (on || cur) fp(x * 2, y, on ? '()' : '  ', (on ? C.GRN : C.WHT) | (cur ? C.INV : 0));
      }
    },
  });
})(Arcade);
