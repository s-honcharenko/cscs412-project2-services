(function () {
  'use strict';

  var backLink = document.getElementById('back-to-games');
  var gamesUrl = new URL('/', window.location.href);
  gamesUrl.port = '8080';
  backLink.href = gamesUrl.href;

  var W = 480,
    H = 360,
    GROUND = H - 24;
  var ROWS = 5,
    COLS = 8,
    IW = 24,
    IH = 16,
    GAPX = 14,
    GAPY = 12;
  var ROW_SCORE = [30, 20, 20, 10, 10];
  var STORE = 'xin.arcade.invaders.v1';
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
    keys = {},
    raf = null,
    last = 0;

  function reset() {
    if (raf) cancelAnimationFrame(raf);
    raf = null;
    keys.left = false;
    keys.right = false;
    s = {
      player: { x: W / 2, w: 30, h: 12 },
      bullet: null,
      bombs: [],
      invaders: [],
      dir: 1,
      sweep: 1,
      score: 0,
      lives: 3,
      running: false,
      over: false
    };
    formation();
    render();
    draw();
    overlay('Invaders', 'Press Enter or select Start to begin.', 'Start');
  }

  function formation() {
    s.invaders = [];
    var x0 = (W - (COLS * IW + (COLS - 1) * GAPX)) / 2;
    for (var r = 0; r < ROWS; r++)
      for (var c = 0; c < COLS; c++)
        s.invaders.push({
          x: x0 + c * (IW + GAPX),
          y: 36 + r * (IH + GAPY),
          row: r,
          alive: true
        });
    s.dir = 1;
    s.bombs = [];
  }

  function alive() {
    return s.invaders.filter(function (v) {
      return v.alive;
    });
  }
  function playerTop() {
    return GROUND - s.player.h;
  }

  function fire() {
    if (!s.bullet) s.bullet = { x: s.player.x, y: playerTop() };
  }

  function step(dt) {
    var p = s.player,
      i;
    if (keys.left) p.x = Math.max(p.w / 2, p.x - 220 * dt);
    if (keys.right) p.x = Math.min(W - p.w / 2, p.x + 220 * dt);

    if (s.bullet) {
      s.bullet.y -= 380 * dt;
      if (s.bullet.y < 0) s.bullet = null;
    }

    var live = alive();
    if (!live.length) {
      s.sweep *= 1.15;
      formation();
      return;
    }

    // Speed increases as invaders are cleared and with each new wave.
    var speed = 24 * s.sweep * (1 + 2.5 * (1 - live.length / (ROWS * COLS)));
    var minX = Infinity,
      maxX = -Infinity;
    live.forEach(function (v) {
      v.x += s.dir * speed * dt;
      minX = Math.min(minX, v.x);
      maxX = Math.max(maxX, v.x + IW);
    });
    var shift = minX < 8 ? 8 - minX : maxX > W - 8 ? W - 8 - maxX : 0;
    if (shift) {
      s.dir *= -1;
      live.forEach(function (v) {
        v.x += shift;
        v.y += 12;
      });
    }

    if (Math.random() < 0.7 * dt) {
      var shooter = live[Math.floor(Math.random() * live.length)];
      s.bombs.push({ x: shooter.x + IW / 2, y: shooter.y + IH });
    }
    for (i = s.bombs.length - 1; i >= 0; i--) {
      var b = s.bombs[i];
      b.y += 160 * dt;
      if (b.y > H) {
        s.bombs.splice(i, 1);
        continue;
      }
      if (
        b.y >= playerTop() &&
        b.y <= GROUND &&
        Math.abs(b.x - p.x) < p.w / 2
      ) {
        s.bombs.splice(i, 1);
        hitPlayer();
        if (!s.running) return;
      }
    }

    if (s.bullet) {
      for (i = 0; i < live.length; i++) {
        var v = live[i];
        if (
          s.bullet.x >= v.x &&
          s.bullet.x <= v.x + IW &&
          s.bullet.y >= v.y &&
          s.bullet.y <= v.y + IH
        ) {
          v.alive = false;
          s.bullet = null;
          s.score += ROW_SCORE[v.row];
          if (s.score > best) {
            best = s.score;
            saveBest();
          }
          break;
        }
      }
    }

    if (
      live.some(function (v) {
        return v.y + IH >= playerTop();
      })
    )
      gameOver();
  }

  function hitPlayer() {
    s.lives--;
    s.bombs = [];
    if (s.lives <= 0) gameOver();
  }

  function gameOver() {
    s.over = true;
    s.running = false;
    keys.left = false;
    keys.right = false;
    $('final-score').textContent = s.score;
    $('final-best').textContent = best;
    overlay(
      'Game over',
      s.lives <= 0 ? 'Your ship was destroyed.' : 'The invaders reached your ship.',
      'Play again'
    );
    $('overlay-btn').focus({ preventScroll: true });
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

  var ROW_COLOR = [WARM, SKY, SKY, BLUE, BLUE];

  function draw() {
    ctx.fillStyle = INK;
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = 'rgba(255,255,255,.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, GROUND + 6.5);
    ctx.lineTo(W, GROUND + 6.5);
    ctx.stroke();

    s.invaders.forEach(function (v) {
      if (!v.alive) return;
      ctx.fillStyle = ROW_COLOR[v.row];
      ctx.fillRect(v.x + 3, v.y, IW - 6, IH - 5);
      ctx.fillRect(v.x, v.y + 4, IW, 5);
      ctx.fillRect(v.x + 4, v.y + IH - 4, 4, 4);
      ctx.fillRect(v.x + IW - 8, v.y + IH - 4, 4, 4);
      ctx.fillStyle = INK;
      ctx.fillRect(v.x + 7, v.y + 4, 3, 3);
      ctx.fillRect(v.x + IW - 10, v.y + 4, 3, 3);
    });

    if (!s.over) {
      var p = s.player,
        top = playerTop();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.moveTo(p.x - p.w / 2, GROUND);
      ctx.lineTo(p.x + p.w / 2, GROUND);
      ctx.lineTo(p.x + p.w / 2 - 6, top + 4);
      ctx.lineTo(p.x + 3, top + 4);
      ctx.lineTo(p.x + 3, top);
      ctx.lineTo(p.x - 3, top);
      ctx.lineTo(p.x - 3, top + 4);
      ctx.lineTo(p.x - p.w / 2 + 6, top + 4);
      ctx.closePath();
      ctx.fill();
    }

    ctx.fillStyle = '#FFFFFF';
    if (s.bullet) ctx.fillRect(s.bullet.x - 1, s.bullet.y - 8, 2, 8);
    ctx.fillStyle = WARM;
    s.bombs.forEach(function (b) {
      ctx.fillRect(b.x - 1, b.y - 8, 2, 8);
    });
  }

  var KEYS = {
    ArrowLeft: 'left',
    ArrowRight: 'right',
    h: 'left',
    l: 'right',
    H: 'left',
    L: 'right'
  };
  document.addEventListener('keydown', function (e) {
    if (e.target === backLink) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (KEYS[e.key]) {
      keys[KEYS[e.key]] = true;
      e.preventDefault();
    } else if (e.key === ' ') {
      e.preventDefault();
      if (s.running) {
        if (!e.repeat) fire();
      } else if (!s.over && !e.repeat) start();
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

  window.XinInvaders = {
    state: function () {
      return s;
    },
    step: step,
    fire: fire,
    formation: formation,
    hitPlayer: hitPlayer,
    keys: keys,
    reset: reset,
    start: start
  };
})();
