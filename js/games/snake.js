(function (A) {
  'use strict';
  const { C, fp, rnd, sfx } = A;
  const W = 30, H = 24;                           // celdas de dos caracteres
  const DIR = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

  A.register({
    id: 'snake', name: 'SNAKE', hi: true,
    desc: 'Come, crece y no te muerdas la cola. Cada manzana acelera la serpiente.',
    ctl: ['FLECHAS / WASD   mover', '$$ bonus: 50 puntos'],
    help: 'FLECHAS mover   P pausa   ESC menu',

    init() {
      this.s = [{ x: 15, y: 12 }, { x: 14, y: 12 }, { x: 13, y: 12 }];
      this.d = DIR.right; this.q = []; this.t = 0; this.eaten = 0; this.bonus = null;
      this.f = this.free();
    },
    free() {
      let p;
      do p = { x: rnd(W), y: rnd(H) };
      while (this.s.some(c => c.x === p.x && c.y === p.y) || (this.f && this.f.x === p.x && this.f.y === p.y));
      return p;
    },
    key(k, rep) {
      const m = DIR[k];
      if (!m || rep || this.q.length > 2) return;
      const last = this.q.length ? this.q[this.q.length - 1] : this.d;
      if (m[0] === -last[0] && m[1] === -last[1]) return;
      if (m === last) return;
      this.q.push(m);
    },
    update(dt) {
      if (this.bonus && (this.bonus.t -= dt) <= 0) this.bonus = null;
      this.t += dt;
      if (this.t < Math.max(55, 130 - this.eaten * 2.5)) return;
      this.t = 0;
      if (this.q.length) this.d = this.q.shift();
      const h = { x: this.s[0].x + this.d[0], y: this.s[0].y + this.d[1] };
      const grow = h.x === this.f.x && h.y === this.f.y;
      const body = grow ? this.s : this.s.slice(0, -1);
      if (h.x < 0 || h.y < 0 || h.x >= W || h.y >= H || body.some(p => p.x === h.x && p.y === h.y)) return A.end();
      this.s.unshift(h);
      if (this.bonus && h.x === this.bonus.x && h.y === this.bonus.y) { this.score += 50; this.bonus = null; sfx.up(); }
      if (!grow) { this.s.pop(); return; }
      this.score += 10; this.eaten++; sfx.pick();
      if (this.s.length >= W * H - 1) return A.end('SERPIENTE PERFECTA!', true);
      this.f = this.free();
      if (this.eaten % 5 === 0) this.bonus = Object.assign(this.free(), { t: 6000 });
    },
    draw() {
      A.frame(this, 'LARGO ' + this.s.length);
      fp(this.f.x * 2, this.f.y, '<>', C.RED);
      if (this.bonus && (this.bonus.t > 1500 || Math.floor(this.bonus.t / 150) % 2)) fp(this.bonus.x * 2, this.bonus.y, '$$', C.YEL);
      for (let i = this.s.length - 1; i >= 0; i--) fp(this.s[i].x * 2, this.s[i].y, i ? '##' : '@@', i ? C.GRN : C.YEL);
    },
  });
})(Arcade);
