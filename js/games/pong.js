(function (A) {
  'use strict';
  const { C, FW, FH, fp, clamp, sfx, held } = A;
  const PH = 4, WIN = 7;

  A.register({
    id: 'pong', name: 'PONG', hi: true,
    desc: 'Tenis de mesa contra la maquina, a 7 tantos. La bola acelera con cada golpe.',
    ctl: ['ARRIBA / ABAJO   mover la pala', '10 por devolucion, 100 por tanto'],
    help: 'ARRIBA/ABAJO mover   P pausa   ESC menu',

    init() {
      this.py = this.cy = FH / 2 - PH / 2;
      this.ps = this.cs = 0;
      this.serve(Math.random() < .5 ? 1 : -1);
    },
    serve(dir) {
      this.bx = FW / 2; this.by = FH / 2;
      this.vx = 30 * dir; this.vy = (Math.random() * 2 - 1) * 9;
      this.wait = 800;
    },
    key() {},
    bounce(top) {
      this.vx = clamp(-this.vx * 1.06, -75, 75);
      this.vy = (this.by - (top + PH / 2)) / (PH / 2) * 15;
      sfx.hit();
    },
    update(dt) {
      const s = dt / 1000;
      if (held.has('up')) this.py -= 26 * s;
      if (held.has('down')) this.py += 26 * s;
      this.py = clamp(this.py, 0, FH - PH);
      // la CPU sigue la bola con velocidad limitada: se la puede batir con ángulo
      const target = this.vx > 0 ? this.by - PH / 2 + .5 : FH / 2 - PH / 2;
      const max = 12.5 * s;
      this.cy = clamp(this.cy + clamp(target - this.cy, -max, max), 0, FH - PH);

      if (this.wait > 0) { this.wait -= dt; return; }
      const ox = this.bx;
      this.bx += this.vx * s; this.by += this.vy * s;
      if (this.by < 0) { this.by = -this.by; this.vy = -this.vy; sfx.bounce(); }
      if (this.by > FH - 1) { this.by = 2 * (FH - 1) - this.by; this.vy = -this.vy; sfx.bounce(); }
      if (this.vx < 0 && ox > 2 && this.bx <= 2 && this.by >= this.py - .6 && this.by <= this.py + PH - .4) {
        this.bx = 2; this.bounce(this.py); this.score += 10;
      } else if (this.vx > 0 && ox < FW - 3 && this.bx >= FW - 3 && this.by >= this.cy - .6 && this.by <= this.cy + PH - .4) {
        this.bx = FW - 3; this.bounce(this.cy);
      }
      if (this.bx < -1) { this.cs++; sfx.bad(); this.point(1); }
      else if (this.bx > FW) { this.ps++; this.score += 100; sfx.up(); this.point(-1); }
    },
    point(dir) {
      if (this.ps >= WIN) return A.end('HAS GANADO!', true);
      if (this.cs >= WIN) return A.end('GANA LA CPU');
      this.serve(dir);
    },
    draw() {
      A.frame(this, 'TU (izquierda)  vs  CPU (derecha)     a ' + WIN + ' tantos');
      for (let y = 0; y < FH; y += 2) fp(FW / 2, y, ':', C.DIM);
      A.big(this.ps).forEach((r, i) => fp(FW / 2 - 7, 1 + i, r, C.DIM));
      A.big(this.cs).forEach((r, i) => fp(FW / 2 + 5, 1 + i, r, C.DIM));
      for (let i = 0; i < PH; i++) {
        fp(1, Math.round(this.py) + i, '#', C.CYN);
        fp(FW - 2, Math.round(this.cy) + i, '#', C.RED);
      }
      fp(this.bx, this.by, 'O', C.WHT);
    },
  });
})(Arcade);
