(function () {
  'use strict';

  var backLink = document.getElementById('back-to-games');
  var gamesUrl = new URL('/', window.location.href);
  gamesUrl.port = '8080';
  backLink.href = gamesUrl.href;

  var COLS = 10,
    ROWS = 20,
    CELL = 24,
    W = COLS * CELL,
    H = ROWS * CELL;
  var STORE = 'xin.arcade.stack.v1';
  var $ = function (id) {
    return document.getElementById(id);
  };
  var css = getComputedStyle(document.documentElement);
  var INK = css.getPropertyValue('--xin-ink').trim();
  var SKY = css.getPropertyValue('--xin-sky').trim();
  var BLUE = css.getPropertyValue('--xin-blue').trim();
  var WARM = '#E9A26B';

  // Scale for high-density displays while keeping game coordinates unchanged.
  function setupCanvas(c, w, h) {
    var dpr = window.devicePixelRatio || 1;
    c.width = w * dpr;
    c.height = h * dpr;
    var x = c.getContext('2d');
    x.scale(dpr, dpr);
    if (!x.roundRect)
      x.roundRect = function (px, py, pw, ph) {
        this.rect(px, py, pw, ph);
      };
    return x;
  }
  function loadBest() {
    try {
      return Number(localStorage.getItem(STORE)) || 0;
    } catch (e) {
      return 0;
    }
  }
  function saveBest() {
    try {
      localStorage.setItem(STORE, String(best));
    } catch (e) {
      // Storage may be unavailable; keep the best score in memory.
    }
  }
  function overlay(title, text, button) {
    $('overlay-title').textContent = title;
    $('overlay-text').textContent = text;
    $('overlay-btn').textContent = button;
    $('overlay').classList.toggle('is-game-over', s.over);
    $('game-over-scores').hidden = !s.over;
    $('game-over-hint').hidden = !s.over;
    $('overlay').hidden = false;
  }

  var SHAPES = {
    I: [[1, 1, 1, 1]],
    O: [
      [1, 1],
      [1, 1]
    ],
    T: [
      [0, 1, 0],
      [1, 1, 1]
    ],
    S: [
      [0, 1, 1],
      [1, 1, 0]
    ],
    Z: [
      [1, 1, 0],
      [0, 1, 1]
    ],
    J: [
      [1, 0, 0],
      [1, 1, 1]
    ],
    L: [
      [0, 0, 1],
      [1, 1, 1]
    ]
  };
  var COLORS = {
    I: SKY,
    O: '#E9C46A',
    T: '#B48EE0',
    S: '#7FD1A8',
    Z: '#EF8A7A',
    J: BLUE,
    L: WARM
  };
  var LINE_SCORE = [0, 100, 300, 500, 800];
  var KINDS = Object.keys(SHAPES);

  var ctx = setupCanvas($('game'), W, H);
  var best = loadBest(),
    s,
    raf = null,
    last = 0,
    acc = 0;

  function emptyRow() {
    return new Array(COLS).fill(0);
  }

  function reset() {
    if (raf) cancelAnimationFrame(raf);
    raf = null;
    acc = 0;
    s = {
      grid: [],
      piece: null,
      score: 0,
      lines: 0,
      interval: 0.8,
      running: false,
      over: false
    };
    for (var r = 0; r < ROWS; r++) s.grid.push(emptyRow());
    spawn();
    render();
    draw();
    overlay('Stack', 'Press Enter or select Start to begin.', 'Start');
  }

  function level() {
    return Math.floor(s.lines / 10);
  }

  function setPiece(kind, x, y) {
    var m = SHAPES[kind].map(function (row) {
      return row.slice();
    });
    s.piece = {
      m: m,
      kind: kind,
      color: COLORS[kind],
      x: x === undefined ? Math.floor((COLS - m[0].length) / 2) : x,
      y: y || 0
    };
  }

  function spawn() {
    setPiece(KINDS[Math.floor(Math.random() * KINDS.length)]);
    if (collides(s.piece.m, s.piece.x, s.piece.y)) {
      s.over = true;
      s.running = false;
      $('final-score').textContent = s.score;
      $('final-best').textContent = best;
      overlay('Game over', 'The stack reached the top.', 'Play again');
      $('overlay-btn').focus({ preventScroll: true });
    }
  }

  function collides(m, x, y) {
    for (var r = 0; r < m.length; r++)
      for (var c = 0; c < m[r].length; c++) {
        if (!m[r][c]) continue;
        var gx = x + c,
          gy = y + r;
        if (gx < 0 || gx >= COLS || gy >= ROWS) return true;
        if (gy >= 0 && s.grid[gy][gx]) return true;
      }
    return false;
  }

  function rotated(m) {
    return m[0].map(function (_, i) {
      return m
        .map(function (row) {
          return row[i];
        })
        .reverse();
    });
  }

  function move(dx) {
    if (!collides(s.piece.m, s.piece.x + dx, s.piece.y)) s.piece.x += dx;
  }

  // Try sideways offsets when a rotation is blocked.
  function rotate() {
    var r = rotated(s.piece.m),
      kicks = [0, -1, 1, -2, 2, -3, 3]; // The I piece may need a three-cell offset near a wall.

    for (var i = 0; i < kicks.length; i++) {
      if (!collides(r, s.piece.x + kicks[i], s.piece.y)) {
        s.piece.m = r;
        s.piece.x += kicks[i];
        return;
      }
    }
  }

  function step() {
    if (!collides(s.piece.m, s.piece.x, s.piece.y + 1)) s.piece.y++;
    else lock();
  }

  function hardDrop() {
    while (!collides(s.piece.m, s.piece.x, s.piece.y + 1)) s.piece.y++;
    lock();
  }

  function lock() {
    var p = s.piece;
    p.m.forEach(function (row, r) {
      row.forEach(function (v, c) {
        if (v && p.y + r >= 0) s.grid[p.y + r][p.x + c] = p.color;
      });
    });
    var kept = s.grid.filter(function (row) {
      return row.some(function (v) {
        return !v;
      });
    });
    var cleared = ROWS - kept.length;
    while (kept.length < ROWS) kept.unshift(emptyRow());
    s.grid = kept;
    if (cleared) {
      s.score += LINE_SCORE[Math.min(cleared, 4)] * (level() + 1);
      s.lines += cleared;
      s.interval = Math.max(0.1, 0.8 - 0.07 * level());
      if (s.score > best) {
        best = s.score;
        saveBest();
      }
    }
    spawn();
  }

  function frame(t) {
    var dt = Math.min(0.1, (t - last) / 1000 || 0);
    last = t;
    acc += dt;
    while (acc >= s.interval && s.running) {
      acc -= s.interval;
      step();
    }
    render();
    draw();
    raf = s.running ? requestAnimationFrame(frame) : null;
  }

  function start() {
    if (s.over) reset();
    $('overlay').hidden = true;
    $('game').focus({ preventScroll: true });
    s.running = true;
    last = performance.now();
    acc = 0;
    if (!raf) raf = requestAnimationFrame(frame);
  }

  function render() {
    $('score').textContent = s.score;
    $('best').textContent = best;
    $('lines').textContent = s.lines;
  }

  function draw() {
    ctx.fillStyle = INK;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(255,255,255,.05)';
    ctx.lineWidth = 1;
    for (var x = 1; x < COLS; x++) {
      ctx.beginPath();
      ctx.moveTo(x * CELL, 0);
      ctx.lineTo(x * CELL, H);
      ctx.stroke();
    }
    for (var y = 1; y < ROWS; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * CELL);
      ctx.lineTo(W, y * CELL);
      ctx.stroke();
    }
    s.grid.forEach(function (row, r) {
      row.forEach(function (v, c) {
        if (v) cell(c, r, v);
      });
    });
    var p = s.piece;
    if (p && !s.over)
      p.m.forEach(function (row, r) {
        row.forEach(function (v, c) {
          if (v && p.y + r >= 0) cell(p.x + c, p.y + r, p.color);
        });
      });
  }

  function cell(x, y, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x * CELL + 1.5, y * CELL + 1.5, CELL - 3, CELL - 3, 4);
    ctx.fill();
  }

  document.addEventListener('keydown', function (e) {
    if (e.target === backLink) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!s.running && !e.repeat) start();
      return;
    }
    if (!s.running) {
      if (e.key === ' ') e.preventDefault();
      return;
    }
    switch (e.key) {
      case 'ArrowLeft':
      case 'h':
      case 'H':
        move(-1);
        break;
      case 'ArrowRight':
      case 'l':
      case 'L':
        move(1);
        break;
      case 'ArrowUp':
      case 'k':
      case 'K':
      case 'x':
      case 'X':
        rotate();
        break;
      case 'ArrowDown':
      case 'j':
      case 'J':
        step();
        break;
      case ' ':
        if (!e.repeat) hardDrop();
        break;
      default:
        return;
    }
    e.preventDefault();
    render();
    draw();
  });
  $('overlay-btn').addEventListener('click', start);
  $('new').addEventListener('click', function () {
    s.running = false;
    reset();
  });

  reset();

  window.XinStack = {
    state: function () {
      return s;
    },
    step: step,
    move: move,
    rotate: rotate,
    hardDrop: hardDrop,
    lock: lock,
    setPiece: setPiece,
    reset: reset,
    start: start
  };
})();
