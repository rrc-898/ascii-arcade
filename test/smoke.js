// Prueba de humo sin navegador: carga el arcade con un DOM simulado y juega
// cada cartucho con teclas al azar. Uso: node test/smoke.js [id-del-juego]
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const files = [...html.matchAll(/<script src="([^"]+)"/g)].map(m => m[1]);

const L = {}, store = {}, noop = () => {};
let raf = null;
const ctx = new Proxy({}, { get: (t, k) => k in t ? t[k] : noop, set: (t, k, v) => { t[k] = v; return true; } });
const el = () => ({ style: { setProperty: noop }, classList: { toggle: noop, add: noop, remove: noop }, getContext: () => ctx, clientWidth: 1600, clientHeight: 900, dataset: {}, addEventListener: noop });
Object.assign(global, {
  window: global, location: { hash: '' },
  document: { getElementById: el, documentElement: el(), querySelectorAll: () => [], addEventListener: noop },
  localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); } },
  addEventListener: (n, f) => { L[n] = f; },
  requestAnimationFrame: f => { raf = f; },
});
for (const f of files) new Function(fs.readFileSync(path.join(root, f), 'utf8')).call(global);

const A = global.Arcade, only = process.argv[2];
const key = (k, up) => L[up ? 'keyup' : 'keydown']({ key: k, preventDefault: noop });
const tap = k => { key(k); key(k, true); };
let ts = 0;
const step = (n = 1) => { for (let i = 0; i < n; i++) { ts += 16; raf(ts); } };
const check = () => {
  const rows = A.text().split('\n');
  if (rows.length !== A.ROWS || rows.some(r => r.length !== A.COLS)) throw new Error('pantalla descuadrada');
};

// todos los puntos del laberinto deben ser alcanzables
const M = A.games.find(g => g.id === 'comecocos').map, MW = M[0].length;
const seen = new Set(['13,16']), q = [[13, 16]];
while (q.length) {
  const [x, y] = q.pop();
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const nx = (x + dx + MW) % MW, ny = y + dy, k = nx + ',' + ny;
    if (M[ny] && !'#-'.includes(M[ny][nx]) && !seen.has(k)) { seen.add(k); q.push([nx, ny]); }
  }
}
M.forEach((r, y) => [...r].forEach((c, x) => { if ('.o'.includes(c) && !seen.has(x + ',' + y)) throw new Error('punto inalcanzable en ' + x + ',' + y); }));

step(250); check();                                  // arranque y menú
const KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'x'];
A.games.forEach((G, gi) => {
  let overs = 0, max = 0, shot = '';
  tap('Enter'); step(2);
  for (let i = 0; i < 20000; i++) {
    if (Math.random() < .12) { const k = KEYS[Math.floor(Math.random() * KEYS.length)]; key(k); if (Math.random() < .75) key(k, true); }
    step();
    if (i % 250 === 0) check();
    if (i === 700) shot = A.text();
    max = Math.max(max, G.score);
    if (G.over) { overs++; KEYS.forEach(k => key(k, true)); step(40); tap('Enter'); step(40); tap('Enter'); step(2); }
  }
  if (only === G.id) console.log(shot);
  console.log(String(gi + 1).padStart(2), G.id.padEnd(11), 'partidas', String(overs + 1).padStart(4), '  mejor', max);
  KEYS.forEach(k => key(k, true));
  tap('Escape'); step(2); tap('ArrowDown'); step(2);
});
console.log('OK');
