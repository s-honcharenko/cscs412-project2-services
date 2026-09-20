(function () {
  'use strict';

  var W = 640,
    H = 480;
  var STORE = 'xin.arcade.rocks.v1';
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

  var ROCK_SCORE = { 3: 20, 2: 50, 1: 100 };
  var ctx = setupCanvas($('game'), W, H);
  var best = loadBest(),
    s,
    keys = {},
    raf = null,
    last = 0;

  function reset() {
    if (raf) cancelAnimationFrame(raf);
    raf = null;
    keys.left = false;
    keys.right = false;
    keys.up = false;
    s = {
      ship: newShip(),
      bullets: [],
      rocks: [],
      score: 0,
      lives: 3,
      wave: 0,
      invuln: 0,
      running: false,
      over: false
    };
    spawnRocks();
    render();
    draw();
    overlay('Rocks', 'Press Enter or select Start to begin.', 'Start');
  }

  function newShip() {
    return { x: W / 2, y: H / 2, vx: 0, vy: 0, a: -Math.PI / 2, r: 12 };
  }

  function spawnRocks() {
    s.wave++;
    for (var i = 0; i < 3 + s.wave; i++) s.rocks.push(newRock(3));
  }

  function newRock(size, x, y) {
    if (x === undefined) {
      do {
        x = Math.random() * W;
        y = Math.random() * H;
      } while (dist(x, y, s.ship.x, s.ship.y) < 140);
    }
    var speed = (20 + Math.random() * 30) * (4 - size),
      ang = Math.random() * Math.PI * 2;
    var verts = [],
      n = 9 + Math.floor(Math.random() * 4);
    for (var i = 0; i < n; i++) verts.push(0.72 + Math.random() * 0.4);
    return {
      x: x,
      y: y,
      vx: Math.cos(ang) * speed,
      vy: Math.sin(ang) * speed,
      r: size * 14,
      size: size,
      rot: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 1.2,
      verts: verts
    };
  }

  function dist(ax, ay, bx, by) {
    var dx = ax - bx,
      dy = ay - by;
    return Math.sqrt(dx * dx + dy * dy);
  }
  // Crossing an edge places the object at the opposite side of the field.
  function wrap(v, max) {
    return v < 0 ? v + max : v >= max ? v - max : v;
  }

  function fire() {
    if (s.bullets.length >= 5) return;
    var sh = s.ship;
    s.bullets.push({
      x: sh.x + Math.cos(sh.a) * sh.r,
      y: sh.y + Math.sin(sh.a) * sh.r,
      vx: Math.cos(sh.a) * 420 + sh.vx,
      vy: Math.sin(sh.a) * 420 + sh.vy,
      life: 1.1
    });
  }

  function step(dt) {
    var sh = s.ship,
      i,
      j;
    if (keys.left) sh.a -= 3.8 * dt;
    if (keys.right) sh.a += 3.8 * dt;
    if (keys.up) {
      sh.vx += Math.cos(sh.a) * 260 * dt;
      sh.vy += Math.sin(sh.a) * 260 * dt;
    }
    var damp = Math.pow(0.35, dt);
    sh.vx *= damp;
    sh.vy *= damp;
    sh.x = wrap(sh.x + sh.vx * dt, W);
    sh.y = wrap(sh.y + sh.vy * dt, H);
    if (s.invuln > 0) s.invuln -= dt;

    for (i = s.bullets.length - 1; i >= 0; i--) {
      var b = s.bullets[i];
      b.x = wrap(b.x + b.vx * dt, W);
      b.y = wrap(b.y + b.vy * dt, H);
      b.life -= dt;
      if (b.life <= 0) s.bullets.splice(i, 1);
    }
    s.rocks.forEach(function (k) {
      k.x = wrap(k.x + k.vx * dt, W);
      k.y = wrap(k.y + k.vy * dt, H);
      k.rot += k.spin * dt;
    });

    for (i = s.rocks.length - 1; i >= 0; i--) {
      for (j = s.bullets.length - 1; j >= 0; j--) {
        if (
          dist(s.rocks[i].x, s.rocks[i].y, s.bullets[j].x, s.bullets[j].y) <
          s.rocks[i].r
        ) {
          s.bullets.splice(j, 1);
          breakRock(i);
          break;
        }
      }
    }
    if (s.invuln <= 0) {
      for (i = 0; i < s.rocks.length; i++) {
        if (
          dist(s.rocks[i].x, s.rocks[i].y, sh.x, sh.y) <
          s.rocks[i].r + sh.r * 0.7
        ) {
          hitShip();
          break;
        }
      }
    }
    if (!s.rocks.length && s.running) spawnRocks();
  }

  function breakRock(i) {
    var k = s.rocks[i];
    s.score += ROCK_SCORE[k.size];
    if (s.score > best) {
      best = s.score;
      saveBest();
    }
    s.rocks.splice(i, 1);
    if (k.size > 1) {
      s.rocks.push(newRock(k.size - 1, k.x, k.y));
      s.rocks.push(newRock(k.size - 1, k.x, k.y));
    }
  }

  function hitShip() {
    s.lives--;
    if (s.lives <= 0) {
      s.over = true;
      s.running = false;
      keys.left = false;
      keys.right = false;
      keys.up = false;
      $('final-score').textContent = s.score;
      $('final-best').textContent = best;
      overlay('Game over', 'Your ship was destroyed.', 'Play again');
      $('overlay-btn').focus({ preventScroll: true });
      return;
    }
    s.ship = newShip();
    s.invuln = 2.5;
    s.bullets = [];
  }

  function frame(t) {
    var dt = Math.min(0.05, (t - last) / 1000 || 0);
    last = t;
    if (s.running) step(dt);
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
    if (!raf) raf = requestAnimationFrame(frame);
  }

  function render() {
    $('score').textContent = s.score;
    $('best').textContent = best;
    $('lives').textContent = s.lives;
  }

  function draw() {
    ctx.fillStyle = INK;
    ctx.fillRect(0, 0, W, H);
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';

    ctx.strokeStyle = SKY;
    s.rocks.forEach(function (k) {
      ctx.beginPath();
      k.verts.forEach(function (f, i) {
        var a = k.rot + (i * Math.PI * 2) / k.verts.length;
        ctx.lineTo(k.x + Math.cos(a) * k.r * f, k.y + Math.sin(a) * k.r * f);
      });
      ctx.closePath();
      ctx.stroke();
    });

    ctx.fillStyle = '#FFFFFF';
    s.bullets.forEach(function (b) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, 2, 0, Math.PI * 2);
      ctx.fill();
    });

    var sh = s.ship;
    if (s.over || (s.invuln > 0 && Math.floor(s.invuln * 10) % 2)) return; // Blink during respawn invulnerability.

    ctx.strokeStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(sh.x + Math.cos(sh.a) * sh.r, sh.y + Math.sin(sh.a) * sh.r);
    ctx.lineTo(
      sh.x + Math.cos(sh.a + 2.5) * sh.r,
      sh.y + Math.sin(sh.a + 2.5) * sh.r
    );
    ctx.lineTo(
      sh.x + Math.cos(sh.a - 2.5) * sh.r,
      sh.y + Math.sin(sh.a - 2.5) * sh.r
    );
    ctx.closePath();
    ctx.stroke();
    if (keys.up && s.running) {
      ctx.strokeStyle = WARM;
      ctx.beginPath();
      ctx.moveTo(
        sh.x + Math.cos(sh.a + 2.8) * sh.r * 0.7,
        sh.y + Math.sin(sh.a + 2.8) * sh.r * 0.7
      );
      ctx.lineTo(
        sh.x - Math.cos(sh.a) * sh.r * 1.4,
        sh.y - Math.sin(sh.a) * sh.r * 1.4
      );
      ctx.lineTo(
        sh.x + Math.cos(sh.a - 2.8) * sh.r * 0.7,
        sh.y + Math.sin(sh.a - 2.8) * sh.r * 0.7
      );
      ctx.stroke();
    }
  }

  var KEYS = {
    ArrowLeft: 'left',
    ArrowRight: 'right',
    ArrowUp: 'up',
    h: 'left',
    l: 'right',
    k: 'up',
    H: 'left',
    L: 'right',
    K: 'up'
  };
  document.addEventListener('keydown', function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (KEYS[e.key]) {
      keys[KEYS[e.key]] = true;
      e.preventDefault();
    } else if (e.key === ' ') {
      e.preventDefault();
      if (s.running && !e.repeat) fire();
      else if (!s.running && !s.over && !e.repeat) start();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (!s.running && !e.repeat) start();
    }
  });
  document.addEventListener('keyup', function (e) {
    if (KEYS[e.key]) keys[KEYS[e.key]] = false;
  });
  $('overlay-btn').addEventListener('click', start);
  $('new').addEventListener('click', function () {
    s.running = false;
    reset();
  });

  reset();

  window.XinRocks = {
    state: function () {
      return s;
    },
    step: step,
    fire: fire,
    breakRock: breakRock,
    hitShip: hitShip,
    newRock: newRock,
    keys: keys,
    reset: reset,
    start: start
  };
})();
