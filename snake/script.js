(function () {
  'use strict';

  var backLink = document.getElementById('back-to-games');
  var gamesUrl = new URL('/', window.location.href);
  gamesUrl.port = '8080';
  backLink.href = gamesUrl.href;

  var COLS = 20,
    ROWS = 15,
    CELL = 24,
    W = COLS * CELL,
    H = ROWS * CELL;
  var STORE = 'xin.arcade.snake.v1';
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

  var ctx = setupCanvas($('game'), W, H);
  var best = loadBest(),
    s,
    raf = null,
    last = 0,
    acc = 0;

  function reset() {
    if (raf) cancelAnimationFrame(raf);
    raf = null;
    acc = 0;
    s = {
      snake: [
        { x: 9, y: 7 },
        { x: 8, y: 7 },
        { x: 7, y: 7 }
      ],
      dir: { x: 1, y: 0 },
      queue: [],
      food: null,
      score: 0,
      interval: 0.14,
      running: false,
      over: false
    };
    placeFood();
    render();
    draw();
    overlay(
      'Snake',
      'Press a direction, Enter, or select Start to begin.',
      'Start'
    );
  }

  function occupied(x, y, cells) {
    return cells.some(function (p) {
      return p.x === x && p.y === y;
    });
  }

  function placeFood() {
    var free = [];
    for (var y = 0; y < ROWS; y++)
      for (var x = 0; x < COLS; x++)
        if (!occupied(x, y, s.snake)) free.push({ x: x, y: y });
    s.food = free.length ? free[Math.floor(Math.random() * free.length)] : null;
  }

  // Buffer up to two turns without allowing a reversal.
  function setDir(d) {
    var cur = s.queue.length ? s.queue[s.queue.length - 1] : s.dir;
    if ((d.x === -cur.x && d.y === -cur.y) || (d.x === cur.x && d.y === cur.y))
      return;
    if (s.queue.length < 2) s.queue.push(d);
  }

  function step() {
    if (s.queue.length) s.dir = s.queue.shift();
    var head = s.snake[0],
      next = { x: head.x + s.dir.x, y: head.y + s.dir.y };
    if (next.x < 0 || next.x >= COLS || next.y < 0 || next.y >= ROWS)
      return end('You hit a wall.');
    var eating = !!s.food && next.x === s.food.x && next.y === s.food.y;
    // The tail moves away this tick unless the snake eats.
    if (occupied(next.x, next.y, eating ? s.snake : s.snake.slice(0, -1)))
      return end('You ran into yourself.');
    s.snake.unshift(next);
    if (eating) {
      s.score += 10;
      s.interval = Math.max(0.07, 0.14 - s.snake.length * 0.002);
      if (s.score > best) {
        best = s.score;
        saveBest();
      }
      placeFood();
      if (!s.food) return end('Every square is filled.');
    } else {
      s.snake.pop();
    }
  }

  function end(reason) {
    s.over = true;
    s.running = false;
    s.queue = [];
    $('final-score').textContent = s.score;
    $('final-best').textContent = best;
    overlay(
      s.food ? 'Game over' : 'You filled the board',
      reason,
      'Play again'
    );
    $('overlay-btn').focus({ preventScroll: true });
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
    $('length').textContent = s.snake.length;
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
    if (s.food) cell(s.food.x, s.food.y, WARM, 6);
    for (var i = s.snake.length - 1; i >= 0; i--)
      cell(s.snake[i].x, s.snake[i].y, i ? SKY : '#FFFFFF', 4);
  }

  function cell(x, y, color, inset) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(
      x * CELL + inset / 2,
      y * CELL + inset / 2,
      CELL - inset,
      CELL - inset,
      5
    );
    ctx.fill();
  }

  var DIRS = {
    ArrowUp: { x: 0, y: -1 },
    ArrowDown: { x: 0, y: 1 },
    ArrowLeft: { x: -1, y: 0 },
    ArrowRight: { x: 1, y: 0 }
  };
  DIRS.k = DIRS.K = DIRS.ArrowUp;
  DIRS.j = DIRS.J = DIRS.ArrowDown;
  DIRS.h = DIRS.H = DIRS.ArrowLeft;
  DIRS.l = DIRS.L = DIRS.ArrowRight;

  document.addEventListener('keydown', function (e) {
    if (e.target === backLink) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (DIRS[e.key]) {
      e.preventDefault();
      if (s.over || e.repeat) return;
      setDir(DIRS[e.key]);
      if (!s.running && !s.over) start();
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!s.running && !e.repeat && (e.key === 'Enter' || !s.over)) start();
    }
  });
  $('overlay-btn').addEventListener('click', start);
  $('new').addEventListener('click', function () {
    s.running = false;
    reset();
  });

  reset();

  window.XinSnake = {
    state: function () {
      return s;
    },
    step: step,
    setDir: setDir,
    reset: reset,
    start: start
  };
})();
