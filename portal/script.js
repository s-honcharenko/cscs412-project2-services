(function () {
  'use strict';

  // Keep service ports in sync with compose.yml.
  var SERVICES = [
    {
      port: 8091,
      name: 'Snake',
      blurb: 'Eat food, grow, and avoid the walls and your own body.'
    },
    {
      port: 8092,
      name: 'Stack',
      blurb: 'Complete rows and keep the blocks from reaching the top.'
    },
    {
      port: 8093,
      name: 'Rocks',
      blurb: 'Break apart rocks and survive each wave.'
    },
    {
      port: 8094,
      name: 'Invaders',
      blurb: 'Defend your ship against waves of invaders.'
    },
    { port: 8095, name: '2048', blurb: 'Merge matching tiles to reach 2048.' }
  ];

  function serviceUrl(port) {
    return location.protocol + '//' + location.hostname + ':' + port + '/';
  }

  function buildDirectory() {
    var list = document.querySelector('[data-xin-directory]');
    if (!list) return;
    SERVICES.forEach(function (svc) {
      var a = document.createElement('a');
      a.className = 'portal-tile';
      a.href = serviceUrl(svc.port);
      a.innerHTML =
        '<span class="portal-tile-name"></span>' +
        '<span class="portal-tile-blurb"></span>' +
        '<span class="portal-tile-action" aria-hidden="true">Play &rarr;</span>';
      a.querySelector('.portal-tile-name').textContent = svc.name;
      a.querySelector('.portal-tile-blurb').textContent = svc.blurb;
      list.appendChild(a);
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    buildDirectory();
  });
})();
