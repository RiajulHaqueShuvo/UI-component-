(function () {
  'use strict';

  var root = document.getElementById('arcflow-k7q2');
  if (!root || root.getAttribute('data-af-ready')) return;
  root.setAttribute('data-af-ready', '1');

  /* ====================================================================
     YOUR PRODUCTS
     ASSET_DIR : folder that holds your images (relative to the HTML file)
     file      : image name WITHOUT the extension (.jpg / .png / .webp are
                 detected automatically)
     title     : text shown on the card
     ==================================================================== */
  var ASSET_DIR = 'assets/';
  var EXTENSIONS = ['jpg', 'png', 'jpeg', 'webp'];

  var ITEMS = [
    { file: 'new_saree collection 1', title: 'Saree Collection 1' },
    { file: 'new_saree collection 2', title: 'Saree Collection 2' },
    { file: 'new_saree collection 3', title: 'Saree Collection 3' },
    { file: 'new_saree collection 4', title: 'Saree Collection 4' },
    { file: 'new_saree collection 5', title: 'Saree Collection 5' },
    { file: 'new_saree collection 6', title: 'Saree Collection 6' },
    { file: 'new_saree collection 7', title: 'Saree Collection 7' },
    { file: 'new_saree collection 8', title: 'Saree Collection 8' },
    { file: 'Party dress 1', title: 'Party Dress 1' },
    { file: 'Party dress 2', title: 'Party Dress 2' },
    { file: 'Party dress 3', title: 'Party Dress 3' },
    { file: 'Party dress 4', title: 'Party Dress 4' },
    { file: 'Party dress 5', title: 'Party Dress 5' },
    { file: 'Party dress 6', title: 'Party Dress 6' },
    { file: 'Party dress 8', title: 'Party Dress 8' },
    { file: 'Party dress 9', title: 'Party Dress 9' }
    /* Party dress 7 is not in your folder screenshot, so it is skipped.
       HeroSaree and Palki are wide images, so they are not used as cards. */
  ];

  /* ---- build the cards ---- */
  var track = root.querySelector('.af-track');
  var bgLayers = root.querySelectorAll('.af-bg-layer');

  ITEMS.forEach(function (item) {
    var card = document.createElement('article');
    card.className = 'af-card';
    card.tabIndex = 0;

    var face = document.createElement('div');
    face.className = 'af-face';

    var img = document.createElement('img');
    img.alt = item.title;
    img.draggable = false;

    // try .jpg, then .png, then .jpeg, then .webp
    var tryIndex = 0;
    img.onerror = function () {
      tryIndex++;
      if (tryIndex < EXTENSIONS.length) {
        img.src = encodeURI(ASSET_DIR + item.file + '.' + EXTENSIONS[tryIndex]);
      } else {
        img.onerror = null;
        img.style.display = 'none';      // no file found: card shows plain dark colour
      }
    };
    img.src = encodeURI(ASSET_DIR + item.file + '.' + EXTENSIONS[0]);

    var cap = document.createElement('span');
    cap.className = 'af-cap';
    cap.textContent = item.title;

    face.appendChild(img);
    face.appendChild(cap);
    card.appendChild(face);
    track.appendChild(card);
  });

  var cards = Array.prototype.slice.call(root.querySelectorAll('.af-card'));
  var N = cards.length;
  if (!N) return;

  var reduceMotion = window.matchMedia &&
                     window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- settings ---- */
  var CFG = {
    autoSpeed:  parseFloat(root.getAttribute('data-auto-speed')) || 0.35,
    pauseMs:    parseFloat(root.getAttribute('data-pause-ms'))   || 3000,
    scrollGain: 0.012,
    maxBoost:   8,
    boostDecay: 2.6,
    gap:        0.86,
    angle:      9,
    drop:       0.06,
    rollGain:   10,      // roll (deg) per card/second of speed
    rollMax:    16,      // maximum roll in degrees
    rollEase:   6,       // how quickly the roll follows the speed (higher = snappier)
    dragGain:   1,       // how far the cards travel per pixel of drag / swipe
    invertDrag: true     // true : drag/swipe RIGHT -> cards go LEFT, drag LEFT -> cards go RIGHT
                         // false: cards follow your finger/mouse (normal behaviour)
  };
  if (reduceMotion) CFG.autoSpeed = 0;

  var pos = 0;
  var boost = 0;
  var run = 1;
  var paused = false;
  var pauseTimer = null;
  var activeCard = null;
  var visible = true;
  var last = performance.now();
  var roll = 0;           // current roll in degrees (negative = left, positive = right)

  /* ---- blurred background: cross-fade to the centre card's image ---- */
  var centerIndex = -1;
  var bgFront = 0;                       // which of the two layers is showing

  function setBackground(index) {
    var img = cards[index].querySelector('img');
    var src = img && (img.currentSrc || img.src);
    if (!src || img.style.display === 'none') return;

    var next = 1 - bgFront;
    bgLayers[next].style.backgroundImage = 'url("' + src + '")';
    bgLayers[next].classList.add('is-on');
    bgLayers[bgFront].classList.remove('is-on');
    bgFront = next;
  }

  /* ---- scroll: down = right to left, up = left to right ---- */
  var lastY = window.pageYOffset || 0;
  var lastWheel = 0;

  function push(delta) {
    if (paused || reduceMotion) return;
    boost += delta * CFG.scrollGain;
    if (boost >  CFG.maxBoost) boost =  CFG.maxBoost;
    if (boost < -CFG.maxBoost) boost = -CFG.maxBoost;
  }

  window.addEventListener('wheel', function (e) {
    lastWheel = performance.now();
    var d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;  // sideways scroll counts too
    push(e.deltaMode === 1 ? d * 16 : d);
  }, { passive: true });

  window.addEventListener('scroll', function () {
    var y = window.pageYOffset || 0;
    var d = y - lastY;
    lastY = y;
    if (performance.now() - lastWheel > 150) push(d);
  }, { passive: true });

  /* ---- drag / swipe left and right ---- */
  var dragging = false, dragMoved = false;
  var dragX = 0, dragVel = 0, dragT = 0;

  root.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    dragging = true;
    dragMoved = false;
    dragX = e.clientX;
    dragT = performance.now();
    dragVel = 0;
  });

  window.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    var dx = e.clientX - dragX;
    if (Math.abs(dx) < 1) return;
    if (Math.abs(dx) > 4) dragMoved = true;

    var W = cards[0].offsetWidth * CFG.gap;
    var dir = CFG.invertDrag ? 1 : -1;          // +1: right drag -> cards go left
    var move = dir * dx / W * CFG.dragGain;     // in "cards"
    pos = ((pos + move) % N + N) % N;

    var now = performance.now();
    dragVel = move / Math.max(0.016, (now - dragT) / 1000);   // cards per second
    dragX = e.clientX;
    dragT = now;
  });

  function endDrag() {
    if (!dragging) return;
    dragging = false;
    if (dragMoved && !paused) {                 // keep gliding a little after release
      boost = Math.max(-CFG.maxBoost, Math.min(CFG.maxBoost, dragVel * 0.5));
    }
    setTimeout(function () { dragMoved = false; }, 0);
  }
  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', endDrag);

  /* ---- click: stop for 3s, then run again ---- */
  function holdOn(card) {
    paused = true;
    boost = 0;
    if (activeCard) activeCard.classList.remove('is-active');
    activeCard = card;
    card.classList.add('is-active');
    clearTimeout(pauseTimer);
    pauseTimer = setTimeout(function () {
      paused = false;
      if (activeCard) activeCard.classList.remove('is-active');
      activeCard = null;
    }, CFG.pauseMs);
  }

  cards.forEach(function (card) {
    card.addEventListener('click', function () {
      if (dragMoved) return;               // it was a drag, not a click
      holdOn(card);
    });
    card.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); holdOn(card); }
    });
  });

  /* ---- arc layout ---- */
  function layout() {
    var W = cards[0].offsetWidth;
    var step = W * CFG.gap;
    var half = N / 2;
    var bestIndex = 0, bestAbs = Infinity;

    for (var i = 0; i < N; i++) {
      var o = i - pos;
      o = ((o + half) % N + N) % N - half;
      var a = Math.abs(o);

      if (a < bestAbs) { bestAbs = a; bestIndex = i; }   // closest to the middle

      var x = o * step;
      var y = o * o * W * CFG.drop;
      var r = o * CFG.angle + roll;                   // arc tilt + roll in the moving direction
      var fade = Math.max(0, Math.min(1, (half - a) / 1.2));

      var c = cards[i];
      c.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0) rotate(' + r.toFixed(2) + 'deg)';
      c.style.opacity = fade.toFixed(2);
      c.style.zIndex = String(100 - Math.round(a * 10));
    }

    if (bestIndex !== centerIndex) {       // centre card changed -> change background
      centerIndex = bestIndex;
      setBackground(centerIndex);
    }
  }

  /* ---- animation loop ---- */
  function frame(now) {
    var dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    run += (((paused || dragging) ? 0 : 1) - run) * Math.min(1, dt * 7);
    boost *= Math.exp(-CFG.boostDecay * dt);

    var speed = (CFG.autoSpeed + boost) * run;        // + = cards move left, - = cards move right

    // roll: cards turn the way they travel (left -> counter-clockwise, right -> clockwise)
    var rollTarget = -speed * CFG.rollGain;
    if (rollTarget >  CFG.rollMax) rollTarget =  CFG.rollMax;
    if (rollTarget < -CFG.rollMax) rollTarget = -CFG.rollMax;
    if (reduceMotion) rollTarget = 0;
    roll += (rollTarget - roll) * Math.min(1, dt * CFG.rollEase);

    pos += speed * dt;
    pos = ((pos % N) + N) % N;

    if (visible) layout();
    requestAnimationFrame(frame);
  }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }, { threshold: 0 }).observe(root);
  }
  window.addEventListener('resize', layout);

  // first background: wait a moment so the first image has loaded
  window.addEventListener('load', function () { centerIndex = -1; layout(); });

  layout();
  requestAnimationFrame(frame);
})();
