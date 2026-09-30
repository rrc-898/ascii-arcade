(function (A) {
  'use strict';
  const { C, FW, FH, fp, rnd, clamp, sfx, tone, held } = A;
  const PW = 9, BR = 6, BC = 10, BY = 2, BWID = 6;
  const BRICK = ['[####]', '[####]', '[====]', '[====]', '[::::]', '[::::]'];
  const BCOL = [C.RED, C.ORG, C.YEL, C.GRN, C.CYN, C.BLU];

  A.register({
    id: 'breakout', name: 'BREAKOUT', hi: true,
    desc: 'Derriba el muro a pelotazos. El angulo del rebote depende de donde golpees la pala.',
    ctl: ['<- ->     mover la pala', 'ESPACIO   lanzar la bola'],
    help: '<- -> mover   ESPACIO lanzar   P pausa   ESC menu',

    init() { this.lives = 3; this.lvl = 0; this.px = FW / 2 - PW / 2; this.build(); },
    build() {
      this.b = Array.from({ length: BR }, () => Array(BC).fill(1));
      this.left = BR * BC; this.stuck = true; this.x = 0; this.y = 0;
    },
    key(k, rep) {
      if (k !== 'a' || rep || !this.stuck) return;
      this.stuck = false;
      this.vx = (rnd(2) ? -1 : 1) * (8 + rnd(8));
      this.vy = -(13 + Math.min(this.lvl, 6) * 2);
      sfx.ok();
    },
    brick(cx, cy) {
      const r = cy - BY, c = Math.floor(cx / BWID);
      if (r < 0 || r >= BR || c < 0 || c >= BC || !this.b[r][c]) return false;
      this.b[r][c] = 0; this.left--; this.score += (BR - r) * 10; tone(560 + (BR - r) * 70, .035);
      return true;
    },
    update(dt) {
      const s = dt / 1000;
      if (held.has('left')) this.px -= 44 * s;
      if (held.has('right')) this.px += 44 * s;
      this.px = clamp(this.px, 0, FW - PW);
      if (this.stuck) { this.x = this.px + (PW - 1) / 2; this.y = FH - 3; return; }

      // subpasos de como mucho una celda para no atravesar ladrillos
      const n = Math.max(1, Math.ceil(Math.max(Math.abs(this.vx), Math.abs(this.vy)) * s));
      const h = s / n;
      for (let i = 0; i < n; i++) {
        let nx = this.x + this.vx * h;
        if (nx < 0 || nx > FW - 1) { this.vx = -this.vx; nx = clamp(nx, 0, FW - 1); sfx.bounce(); }
        else if (this.brick(Math.round(nx), Math.round(this.y))) { this.vx = -this.vx; nx = this.x; }
        this.x = nx;
        let ny = this.y + this.vy * h;
        if (ny < 0) { this.vy = -this.vy; ny = 0; sfx.bounce(); }
        else if (this.brick(Math.round(this.x), Math.round(ny))) { this.vy = -this.vy; ny = this.y; }
        else if (this.vy > 0 && Math.round(ny) === FH - 2 && this.x >= this.px - .6 && this.x <= this.px + PW - .4) {
          this.vy = -Math.abs(this.vy);
          this.vx = (this.x - (this.px + (PW - 1) / 2)) / (PW / 2) * 26;
          ny = FH - 3; sfx.hit();
        }
        this.y = ny;
        if (!this.left) { this.lvl++; this.score += 200; sfx.win(); return this.build(); }
        if (this.y > FH) {
          this.lives--; sfx.bad();
          if (this.lives <= 0) return A.end();
          this.stuck = true; return;
        }
      }
    },
    draw() {
      A.frame(this, 'VIDAS ' + 'o '.repeat(Math.max(0, this.lives)).trim().padEnd(8) + 'NIVEL ' + (this.lvl + 1));
      for (let r = 0; r < BR; r++) for (let c = 0; c < BC; c++) if (this.b[r][c]) fp(c * BWID, BY + r, BRICK[r], BCOL[r]);
      fp(this.px, FH - 2, '='.repeat(PW), C.WHT);
      fp(this.x, this.y, 'o', C.YEL);
      if (this.stuck && !this.over) fp(FW / 2 - 12, 14, 'PULSA ESPACIO PARA LANZAR', C.DIM);
    },
  });
})(Arcade);
