(function (A) {
  'use strict';
  const { C, FW, FH, fp, rnd, clamp, sfx, held } = A;
  const ALIEN = [['/o\\', '\\o/'], ['<O>', '>O<'], ['{#}', '(#)'], ['{#}', '(#)']];
  const ACOL = [C.MAG, C.CYN, C.GRN, C.GRN];
  const UFO = '<=O=>';

  A.register({
    id: 'invaders', name: 'INVADERS', hi: true,
    desc: 'Frena la invasion antes de que aterrice. Los escudos aguantan poco y el platillo vale 150.',
    ctl: ['<- ->     mover', 'ESPACIO   disparar (2 a la vez)'],
    help: '<- -> mover   ESPACIO disparar   P pausa   ESC menu',

    init() { this.lives = 3; this.wave = 0; this.px = FW / 2 - 1; this.startWave(); },
    startWave() {
      this.al = [];
      for (let r = 0; r < 4; r++) for (let c = 0; c < 9; c++) this.al.push({ x: 2 + c * 5, y: 2 + r * 2 + Math.min(this.wave, 4), r });
      this.total = this.al.length;
      this.dir = 1; this.t = 0; this.bt = 0; this.anim = 0; this.inv = 0;
      this.shots = []; this.bombs = []; this.ufo = null; this.ut = 9000 + rnd(6000);
      this.sh = new Set();
      for (let i = 0; i < 4; i++) for (let x = 0; x < 6; x++) for (let y = 0; y < 2; y++) this.sh.add((7 + i * 14 + x) + ',' + (19 + y));
    },
    key(k, rep) {
      if (k === 'a' && !rep && this.shots.length < 2) { this.shots.push({ x: Math.round(this.px) + 1, y: FH - 2 }); sfx.shoot(); }
    },
    update(dt) {
      const s = dt / 1000;
      if (held.has('left')) this.px -= 30 * s;
      if (held.has('right')) this.px += 30 * s;
      this.px = clamp(this.px, 0, FW - 3);
      if (this.inv > 0) this.inv -= dt;

      // marcha de la formación: acelera según quedan menos
      this.t += dt;
      if (this.t >= Math.max(35, (400 - this.wave * 40) * this.al.length / this.total)) {
        this.t = 0; this.anim ^= 1;
        const xs = this.al.map(a => a.x);
        if ((this.dir > 0 && Math.max(...xs) + 3 >= FW) || (this.dir < 0 && Math.min(...xs) <= 0)) { this.al.forEach(a => a.y++); this.dir = -this.dir; }
        else this.al.forEach(a => a.x += this.dir);
        for (const a of this.al) {
          for (let i = 0; i < 3; i++) this.sh.delete((a.x + i) + ',' + a.y);
          if (a.y >= FH - 2) return A.end('INVASION COMPLETADA');
        }
      }

      // platillo de bonificación
      if (this.ufo) {
        this.ufo.x += this.ufo.d * 14 * s;
        if (this.ufo.x < -6 || this.ufo.x > FW) this.ufo = null;
      } else if ((this.ut -= dt) <= 0) {
        const d = rnd(2) ? 1 : -1;
        this.ufo = { x: d > 0 ? -5 : FW - 1, d }; this.ut = 12000 + rnd(8000);
      }

      for (const b of this.shots) {
        b.y -= 30 * s;
        const by = Math.round(b.y);
        if (this.sh.delete(b.x + ',' + by)) { b.dead = true; continue; }
        if (this.ufo && by === 0 && b.x >= Math.round(this.ufo.x) && b.x < Math.round(this.ufo.x) + UFO.length) {
          this.score += 150; this.ufo = null; b.dead = true; sfx.up(); continue;
        }
        const i = this.al.findIndex(a => a.y === by && b.x >= a.x && b.x <= a.x + 2);
        if (i >= 0) { this.score += (4 - this.al[i].r) * 10; this.al.splice(i, 1); b.dead = true; sfx.hit(); }
        else if (b.y < 0) b.dead = true;
      }
      this.shots = this.shots.filter(b => !b.dead);
      if (!this.al.length) { this.wave++; this.score += 100; sfx.win(); return this.startWave(); }

      // bombas: las suelta el alien más bajo de una columna al azar
      this.bt += dt;
      if (this.bt >= Math.max(280, 900 - this.wave * 70)) {
        this.bt = 0;
        const a = this.al[rnd(this.al.length)];
        const low = this.al.filter(o => o.x === a.x).reduce((m, o) => o.y > m.y ? o : m);
        this.bombs.push({ x: low.x + 1, y: low.y + 1 });
      }
      const p = Math.round(this.px);
      for (const b of this.bombs) {
        b.y += 12 * s;
        const by = Math.round(b.y);
        if (this.sh.delete(b.x + ',' + by)) b.dead = true;
        else if (by === FH - 1 && b.x >= p && b.x <= p + 2) {
          b.dead = true;
          if (this.inv <= 0) {
            this.lives--; this.inv = 1500; sfx.boom();
            if (this.lives <= 0) return A.end();
          }
        } else if (b.y > FH) b.dead = true;
      }
      this.bombs = this.bombs.filter(b => !b.dead);
    },
    draw() {
      A.frame(this, 'VIDAS ' + '/A\\ '.repeat(Math.max(0, this.lives)).trim().padEnd(12) + 'OLEADA ' + (this.wave + 1));
      for (const k of this.sh) { const [x, y] = k.split(','); fp(+x, +y, '#', C.GRN); }
      if (this.ufo) fp(this.ufo.x, 0, UFO, C.RED);
      for (const a of this.al) fp(a.x, a.y, ALIEN[a.r][this.anim], ACOL[a.r]);
      for (const b of this.shots) fp(b.x, b.y, '|', C.YEL);
      for (const b of this.bombs) fp(b.x, b.y, '!', C.RED);
      if (this.inv <= 0 || Math.floor(this.inv / 120) % 2) fp(this.px, FH - 1, '/A\\', C.WHT);
    },
  });
})(Arcade);
