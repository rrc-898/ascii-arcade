# ASCII ARCADE

Doce juegos clásicos dibujados solo con caracteres ASCII sobre una pantalla de
texto de 64×32, con estética de monitor de fósforo. Sin dependencias ni
compilación: HTML, CSS y JavaScript plano.

```
xdg-open index.html
```

Funciona abriendo el archivo directamente (`file://`) o servido desde cualquier
hosting estático. `index.html#tetris` arranca un juego concreto y
`index.html#menu` salta la pantalla de arranque.

## Juegos

| #  | Juego      | Controles                                                   |
|----|------------|-------------------------------------------------------------|
| 01 | Snake      | flechas                                                     |
| 02 | Tetris     | ←/→ mover, ↑ girar, ↓ bajar, espacio soltar, X giro inverso |
| 03 | Comecocos  | flechas                                                     |
| 04 | Invaders   | ←/→ mover, espacio disparar                                 |
| 05 | Breakout   | ←/→ mover, espacio lanzar                                   |
| 06 | Pong       | ↑/↓ (contra la CPU, a 7 tantos)                             |
| 07 | Rana       | flechas                                                     |
| 08 | Tron       | flechas                                                     |
| 09 | Runner     | espacio saltar, ↓ agacharse                                 |
| 10 | 2048       | flechas                                                     |
| 11 | Buscaminas | flechas cursor, espacio destapar, X bandera                 |
| 12 | Vida       | flechas cursor, espacio célula, X marcha/alto, R azar, N borrar |

WASD equivale a las flechas, Enter al espacio y Z a la X.

## Teclas generales

| Tecla | Acción                                        |
|-------|-----------------------------------------------|
| Enter | jugar / reintentar                            |
| P     | pausa                                         |
| Esc   | volver al menú                                |
| C     | tema: color, verde, ámbar, blanco             |
| M     | sonido                                        |
| L     | líneas de barrido y resplandor                |
| F     | pantalla completa                             |

También admite gamepad (cruceta o stick, A/B, Start, Select) y, en pantallas
táctiles, muestra un mando en pantalla.

Cada juego guarda sus cinco mejores puntuaciones con iniciales en el
`localStorage` del navegador, junto con el tema y las opciones.

## Estructura

```
index.html           página y orden de carga de los scripts
css/arcade.css       monitor CRT y mando táctil
js/engine.js         pantalla de caracteres, entrada, sonido, récords, escenas
js/games/*.js        un archivo por juego
js/main.js           arranque
test/smoke.js        prueba de humo sin navegador
```

## Añadir un juego

Crea `js/games/mijuego.js`, añádelo a `index.html` antes de `main.js` y registra
un objeto:

```js
(function (A) {
  const { C, fp } = A;
  A.register({
    id: 'mijuego', name: 'MI JUEGO', hi: true,      // hi: tiene tabla de récords
    desc: 'Texto del menú.',
    ctl: ['FLECHAS   mover'],                       // hasta 3 líneas en el menú
    help: 'FLECHAS mover   P pausa   ESC menu',     // línea inferior en partida
    init() { /* estado inicial; this.score ya vale 0 */ },
    key(k, rep) { /* k: up down left right a b, o la tecla tal cual */ },
    update(dt) { /* dt en ms; A.held tiene las teclas pulsadas; A.end() termina */ },
    draw() { A.frame(this, 'info'); fp(10, 5, '@@', C.YEL); },
  });
})(Arcade);
```

El campo de juego mide 60×24 caracteres (`A.FW`, `A.FH`) y `fp(x, y, texto,
color)` dibuja dentro de él. Una celda cuadrada son dos caracteres de ancho. Los
colores están en `A.C`; sumando `C.INV` se obtiene vídeo inverso.

## Pruebas

```
node test/smoke.js            # juega todos los cartuchos con teclas al azar
node test/smoke.js rana       # además imprime un fotograma de ese juego
```
