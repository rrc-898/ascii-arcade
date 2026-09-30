(function (A) {
  'use strict';
  const { C, fp, rnd, sfx, tone } = A;
  // mitad izquierda del laberinto; la derecha es su reflejo
  const HALF = [
    '##############',
    '#............#',
    '#.####.#####.#',
    '#o####.#####.#',
    '#.............',
    '#.####.##.####',
    '#......##....#',
    '######.#####.#',
    '######.##.....',
    '######.##.###-',
    '      .   #   ',
    '######.##.####',
    '######.##.....',
    '######.##.####',
    '#............#',
    '#.####.#####.#',
    '#o..##........',
    '###.##.##.####',
    '#......##....#',
    '#.##########.#',
    '#.............',
    '##############',
  ];
  const MAP = HALF.map(r => r + r.split('').reverse().join(''));
  const W = MAP[0].length, H = MAP.length, OX = 2, OY = 1;
  const DIRS = [[0, -1], [-1, 0], [0, 1], [1, 0]];
  const DIR = { up: DIRS[0], left: DIRS[1], down: DIRS[2], right: DIRS[3] };
  const HOME_X = 13, HOME_Y = 10, EXIT_Y = 8;

  A.register({
    id: 'comecocos', name: 'COMECOCOS', hi: true, map: MAP,
    desc: 'Limpia el laberinto de puntos. Las pastillas <> vuelven comestibles a los fantasmas.',
    ctl: ['FLECHAS / WASD   mover', 'el tunel lateral conecta los lados'],
    help: 'FLECHAS mover   P pausa   ESC menu',

    init() { this.lives = 3; this.lvl = 0; this.load(); },
    load() {
      this.g = MAP.map(r => r.split(''));
      this.dots = 0;
      for (const r of this.g) for (const c of r) if (c === '.' || c === 'o') this.dots++;
      this.reset();
    },
    reset() {
      this.p = { x: 13, y: 16, d: DIR.left, nd: DIR.left };
      this.pt = 0; this.mouth = 0; this.fr = 0; this.combo = 0; this.modeT = 0; this.wait = 1200;
      const gh = (x, y, home, rel, c, sc) => ({ x, y, home, rel, c, sc, d: DIR.left, t: 0, safe: false });
      this.gh = [
        gh(13, EXIT_Y, false, 0, C.RED, [26, 0]),
        gh(12, HOME_Y, true, 2500, C.MAG, [1, 0]),
        gh(13, HOME_Y, true, 5000, C.CYN, [26, 21]),
        gh(15, HOME_Y, true, 7500, C.ORG, [1, 21]),
      ];
    },
    wall(x, y) {
      const c = this.g[y] && this.g[y][(x + W) % W];
      return c === undefined || c === '#' || c === '-';
    },
    key(k) { if (DIR[k]) this.p.nd = DIR[k]; },

    update(dt) {
      if (this.wait > 0) { this.wait -= dt; return; }
      if (this.fr > 0) this.fr -= dt;
      this.modeT += dt;
      this.pt += dt;
      if (this.pt >= Math.max(80, 120 - this.lvl * 6)) {
        this.pt = 0;
        if (this.stepPac() || this.touch()) return;
      }
      for (const g of this.gh) {
        if (g.home && g.rel > 0) { g.rel -= dt; continue; }
        g.t += dt;
        const scared = this.fr > 0 && !g.safe;
        if (g.t < (scared ? 210 : Math.max(90, 140 - this.lvl * 7))) continue;
        g.t = 0;
        this.stepGhost(g, scared);
        if (this.touch()) return;
      }
    },
    stepPac() {
      const p = this.p;
      if (!this.wall(p.x + p.nd[0], p.y + p.nd[1])) p.d = p.nd;
      if (this.wall(p.x + p.d[0], p.y + p.d[1])) return false;
      p.x = (p.x + p.d[0] + W) % W; p.y += p.d[1]; this.mouth ^= 1;
      const c = this.g[p.y][p.x];
      if (c !== '.' && c !== 'o') return false;
      this.g[p.y][p.x] = ' '; this.dots--;
      if (c === '.') { this.score += 10; tone(this.mouth ? 500 : 380, .03); }
      else {
        this.score += 50; this.fr = Math.max(2000, 7000 - this.lvl * 700); this.combo = 0;
        for (const g of this.gh) g.safe = false;
        sfx.up();
      }
      if (this.dots) return false;
      this.lvl++; this.score += 500; sfx.win(); this.load();
      return true;
    },
    stepGhost(g, scared) {
      if (g.home) {                                 // sale de la casa por la puerta
        if (g.y === HOME_Y && g.x !== HOME_X) g.x += Math.sign(HOME_X - g.x);
        else if (--g.y === EXIT_Y) { g.home = false; g.d = DIR.left; }
        return;
      }
      let opts = DIRS.filter(d => !(d[0] === -g.d[0] && d[1] === -g.d[1]) && !this.wall(g.x + d[0], g.y + d[1]));
      if (!opts.length) opts = [[-g.d[0], -g.d[1]]];
      let d = opts[rnd(opts.length)];
      if (!scared) {
        const [tx, ty] = this.target(g);
        let bestD = Infinity;
        for (const o of opts) {
          const dist = (g.x + o[0] - tx) ** 2 + (g.y + o[1] - ty) ** 2;
          if (dist < bestD) { bestD = dist; d = o; }
        }
      }
      g.x = (g.x + d[0] + W) % W; g.y += d[1]; g.d = d;
    },
    // cada fantasma persigue a su manera, como en el original
    target(g) {
      const p = this.p, i = this.gh.indexOf(g);
      if (this.modeT % 27000 < 7000) return g.sc;   // fase de dispersión
      if (i === 0) return [p.x, p.y];
      if (i === 1) return [p.x + p.d[0] * 4, p.y + p.d[1] * 4];
      if (i === 2) { const b = this.gh[0]; return [2 * (p.x + p.d[0] * 2) - b.x, 2 * (p.y + p.d[1] * 2) - b.y]; }
      return (g.x - p.x) ** 2 + (g.y - p.y) ** 2 > 64 ? [p.x, p.y] : g.sc;
    },
    touch() {
      for (const g of this.gh) {
        if (g.x !== this.p.x || g.y !== this.p.y) continue;
        if (this.fr > 0 && !g.safe) {
          this.score += 200 << this.combo; this.combo = Math.min(3, this.combo + 1);
          Object.assign(g, { x: HOME_X, y: HOME_Y, home: true, rel: 3000, safe: true, t: 0 });
          sfx.shoot();
          continue;
        }
        this.lives--; sfx.bad();
        if (this.lives <= 0) A.end(); else this.reset();
        return true;
      }
      return false;
    },

    draw() {
      A.frame(this, 'VIDAS ' + '() '.repeat(Math.max(0, this.lives)).trim().padEnd(9) + ' NIVEL ' + (this.lvl + 1));
      const blink = Math.floor(performance.now() / 200) % 2;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const c = this.g[y][x];
        if (c === '#') fp(OX + x * 2, OY + y, '##', C.BLU);
        else if (c === '-') fp(OX + x * 2, OY + y, '--', C.WHT);
        else if (c === '.') fp(OX + x * 2, OY + y, '. ', C.WHT);
        else if (c === 'o' && blink) fp(OX + x * 2, OY + y, '<>', C.YEL);
      }
      for (const g of this.gh) {
        const scared = this.fr > 0 && !g.safe;
        fp(OX + g.x * 2, OY + g.y, scared ? 'ww' : 'MM', scared ? (this.fr < 2000 && blink ? C.WHT : C.BLU) : g.c);
      }
      const p = this.p;
      const open = p.d === DIR.right ? '(<' : p.d === DIR.left ? '>)' : p.d === DIR.up ? '\\/' : '/\\';
      fp(OX + p.x * 2, OY + p.y, this.mouth ? open : '()', C.YEL);
      if (this.wait > 0 && !this.over) fp(24, OY + 12, ' PREPARADO! ', C.YEL | C.INV);
    },
  });
})(Arcade);
