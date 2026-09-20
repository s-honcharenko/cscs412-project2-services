(function () {
  'use strict';

  var SIZE = 4;
  var TARGET = 2048;
  var STORE = 'xin.arcade.2048.v1';

  var boardEl = document.getElementById('board');
  var scoreEl = document.getElementById('score');
  var bestEl = document.getElementById('best');
  var undoEl = document.getElementById('undo');
  var newEl = document.getElementById('new');
  var overlayEl = document.getElementById('overlay');

  var cells = [];
  var grid, score, best, previous, won, over, spawned, merged;

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

  // Indices are ordered from the edge the tiles slide toward.
  function line(dir, i) {
    var out = [];
    for (var j = 0; j < SIZE; j++) {
      if (dir === 'left') out.push(i * SIZE + j);
      else if (dir === 'right') out.push(i * SIZE + (SIZE - 1 - j));
      else if (dir === 'up') out.push(j * SIZE + i);
      else out.push((SIZE - 1 - j) * SIZE + i);
    }
    return out;
  }

  function collapse(values) {
    var packed = values.filter(function (v) {
      return v !== 0;
    });
    var out = [];
    var gained = 0;
    var mergedAt = [];

    for (var i = 0; i < packed.length; i++) {
      if (packed[i] === packed[i + 1]) {
        var sum = packed[i] * 2;
        mergedAt.push(out.length);
        out.push(sum);
        gained += sum;
        i++;
      } else {
        out.push(packed[i]);
      }
    }
    while (out.length < SIZE) out.push(0);
    return { values: out, gained: gained, mergedAt: mergedAt };
  }

  function move(dir) {
    if (over) return false;

    var before = grid.slice();
    var gained = 0;
    var mergedCells = [];

    for (var i = 0; i < SIZE; i++) {
      var idx = line(dir, i);
      var result = collapse(
        idx.map(function (n) {
          return grid[n];
        })
      );
      result.values.forEach(function (v, j) {
        grid[idx[j]] = v;
      });
      result.mergedAt.forEach(function (j) {
        mergedCells.push(idx[j]);
      });
      gained += result.gained;
    }

    var changed = grid.some(function (v, i) {
      return v !== before[i];
    });
    if (!changed) {
      grid = before;
      return false;
    }

    previous = { grid: before, score: score, won: won };
    score += gained;
    if (score > best) {
      best = score;
      saveBest();
    }
    merged = mergedCells;
    spawned = addTile();

    if (!won && grid.indexOf(TARGET) !== -1) {
      won = true;
      showOverlay(
        'You reached 2048',
        'Keep going for a higher score, or start again.',
        true
      );
    } else if (!movesLeft()) {
      over = true;
      showOverlay('No moves left', 'Final score ' + score + '.', false);
    }

    render();
    return true;
  }

  function emptyCells() {
    var out = [];
    grid.forEach(function (v, i) {
      if (v === 0) out.push(i);
    });
    return out;
  }

  function addTile() {
    var free = emptyCells();
    if (!free.length) return -1;
    var at = free[Math.floor(Math.random() * free.length)];
    grid[at] = Math.random() < 0.9 ? 2 : 4;
    return at;
  }

  function movesLeft() {
    if (emptyCells().length) return true;
    for (var r = 0; r < SIZE; r++) {
      for (var c = 0; c < SIZE; c++) {
        var v = grid[r * SIZE + c];
        if (c < SIZE - 1 && v === grid[r * SIZE + c + 1]) return true;
        if (r < SIZE - 1 && v === grid[(r + 1) * SIZE + c]) return true;
      }
    }
    return false;
  }

  function buildCells() {
    boardEl.innerHTML = '';
    cells = [];
    for (var i = 0; i < SIZE * SIZE; i++) {
      var cell = document.createElement('div');
      cell.className = 'ark-cell';
      boardEl.appendChild(cell);
      cells.push(cell);
    }
  }

  function render() {
    grid.forEach(function (v, i) {
      var cell = cells[i];
      cell.textContent = v ? String(v) : '';
      if (v) cell.dataset.v = String(v);
      else delete cell.dataset.v;
      cell.classList.toggle('is-big', v >= 4096);
      cell.classList.remove('is-new', 'is-merged');
      if (i === spawned) cell.classList.add('is-new');
      else if (merged.indexOf(i) !== -1) cell.classList.add('is-merged');
    });

    scoreEl.textContent = String(score);
    bestEl.textContent = String(best);
    undoEl.disabled = !previous;
  }

  function showOverlay(title, text, continuable) {
    document.getElementById('overlay-title').textContent = title;
    document.getElementById('overlay-text').textContent = text;

    var buttons = document.getElementById('overlay-buttons');
    buttons.innerHTML = '';

    if (continuable) {
      var keep = document.createElement('button');
      keep.className = 'xin-btn';
      keep.textContent = 'Keep playing';
      keep.addEventListener('click', hideOverlay);
      buttons.appendChild(keep);
    }

    var again = document.createElement('button');
    again.className = 'xin-btn xin-btn-primary';
    again.textContent = 'New game';
    again.addEventListener('click', reset);
    buttons.appendChild(again);

    overlayEl.hidden = false;
  }

  function hideOverlay() {
    overlayEl.hidden = true;
    boardEl.focus();
  }

  function reset() {
    hideOverlay();
    grid = new Array(SIZE * SIZE).fill(0);
    score = 0;
    previous = null;
    won = false;
    over = false;
    merged = [];
    addTile();
    spawned = addTile();
    render();
  }

  function undo() {
    if (!previous) return;
    grid = previous.grid;
    score = previous.score;
    won = previous.won;
    over = false;
    previous = null;
    spawned = -1;
    merged = [];
    hideOverlay();
    render();
  }

  var KEYS = {
    ArrowLeft: 'left',
    ArrowRight: 'right',
    ArrowUp: 'up',
    ArrowDown: 'down',
    h: 'left',
    j: 'down',
    k: 'up',
    l: 'right',
    H: 'left',
    J: 'down',
    K: 'up',
    L: 'right'
  };

  document.addEventListener('keydown', function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var dir = KEYS[e.key];
    if (!dir || !overlayEl.hidden) return;
    e.preventDefault();
    move(dir);
  });

  newEl.addEventListener('click', reset);
  undoEl.addEventListener('click', undo);

  buildCells();
  best = loadBest();
  reset();
  boardEl.focus();

  window.XinArcade = {
    move: move,
    reset: reset,
    undo: undo,
    collapse: collapse,
    line: line,
    state: function () {
      return {
        grid: grid.slice(),
        score: score,
        best: best,
        over: over,
        won: won
      };
    },
    setGrid: function (g) {
      hideOverlay();
      grid = g.slice();
      over = false;
      won = false;
      previous = null;
      merged = [];
      spawned = -1;
      render();
    }
  };
})();
