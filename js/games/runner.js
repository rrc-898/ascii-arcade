(function (A) {
  'use strict';
  const { C, FW, fp, rnd, sfx, held } = A;
  const GY = 20, DX = 6;                            // fila de los pies y columna del dinosaurio
  const RUN = [[' .-o>', '/##  ', ' |/  '], [' .-o>', '/##  ', ' /|  ']];
  const AIR = [' .-o>', '/##  ', ' ||  '];
  const DUCK = [['/##-o>', ' |/   '], ['/##-o>', ' /|   ']];
  const CACTI = [
    ['\\|/', ' | '],
    [' |_', '_| ', ' | '],
    ['\\|/ \\|/', ' |   | '],
    ['|', '|'],
  ];
  const BIRD = ['\\v/', '/^\\'];
  const GROUND = "__.___,____'___._____,__";
  const CLOUD = [' .--. ', '(    )'];

  A.register({
    id: 'runner', name: 'RUNNER', hi: true,
    desc: 'Carrera sin fin por el desierto: salta los cactus y agachate bajo los pajaros.',
    ctl: ['ESPACIO / ARRIBA   saltar', 'ABAJO   agacharse o caer rapido'],
    help: 'ESPACIO saltar   ABAJO agacharse   P pausa   ESC menu',

    init() {
      this.y = 0; this.vy = 0; this.dist = 0; this.gap = 40; this.obs = [];
      this.clouds = [{ x: 12, y: 3 }, { x: 38, y: 6 }, { x: 55, y: 2 }];
    },
    get speed() { return Math.min(60, 26 + this.dist / 120); },
    key(k, rep) {
      if ((k === 'a' || k === 'up') && !rep && this.y === 0) { this.vy = 30; this.y = .01; sfx.ok(); }
    },
    update(dt) {
      const s = dt / 1000, v = this.speed;
      this.dist += v * s;
      this.score = Math.floor(this.dist / 4);
      if (this.y > 0) {
        this.vy -= (held.has('down') ? 260 : 90) * s;
        this.y += this.vy * s;
        if (this.y <= 0) { this.y = 0; this.vy = 0; }
      }
      const duck = this.y === 0 && held.has('down');

      for (const c of this.clouds) { c.x -= v * .15 * s; if (c.x < -6) { c.x = FW + rnd(10); c.y = 1 + rnd(7); } }
      for (const o of this.obs) o.x -= v * s;
      this.obs = this.obs.filter(o => o.x > -10);
      this.gap -= v * s;
      if (this.gap <= 0) {
        this.gap = v * (.95 + Math.random() * .9);
        if (this.dist > 500 && rnd(4) === 0) this.obs.push({ x: FW + 2, bird: true, w: 3, h: 1, top: rnd(2) ? GY - 2 : GY });
        else { const spr = CACTI[rnd(CACTI.length)]; this.obs.push({ x: FW + 2, spr, w: spr[0].length, h: spr.length, top: GY - spr.length + 1 }); }
      }

      // caja del dinosaurio contra la de cada obstáculo
      const yy = Math.round(this.y);
      const x0 = DX + 1, x1 = DX + (duck ? 4 : 3), top = GY - yy - (duck ? 1 : 2), bot = GY - yy;
      for (const o of this.obs) {
        const ox = Math.round(o.x);
        if (ox <= x1 && ox + o.w - 1 >= x0 && o.top <= bot && o.top + o.h - 1 >= top) { sfx.boom(); return A.end(); }
      }
    },
    draw() {
      A.frame(this, 'VELOCIDAD ' + Math.round(this.speed) + '   DISTANCIA ' + Math.floor(this.dist) + ' m');
      for (const c of this.clouds) CLOUD.forEach((r, i) => fp(c.x, c.y + i, r, C.DIM));
      const off = Math.floor(this.dist);
      let g = '';
      for (let x = 0; x < FW; x++) g += GROUND[(x + off) % GROUND.length];
      fp(0, GY + 1, g, C.ORG);
      const f = Math.floor(this.dist / 4) % 2;
      for (const o of this.obs) {
        if (o.bird) fp(o.x, o.top, BIRD[f], C.RED);
        else o.spr.forEach((r, i) => fp(o.x, o.top + i, r, C.GRN));
      }
      const duck = this.y === 0 && held.has('down') && !this.over;
      const spr = duck ? DUCK[f] : this.y > 0 ? AIR : RUN[f];
      const top = GY - Math.round(this.y) - spr.length + 1;
      spr.forEach((r, i) => fp(DX, top + i, r, this.over ? C.RED : C.WHT));
    },
  });
})(Arcade);
