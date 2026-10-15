// Orbit Gallery - 3D ring image carousel
// Wrapped in an IIFE: no global variables, and every DOM lookup is
// scoped to #orbit-gallery, so it can't conflict with other scripts.
(function () {
  const root = document.getElementById("orbit-gallery");
  if (!root) return;
  const stage = root.querySelector(".og-stage");

  /* ============ 1. YOUR IMAGES ============
     Use  src: "./images/photo.jpg"  for real images.
     `bg` is a CSS fallback so the demo works with no files at all.       */
  const slides = [
    { alt: "Dusk",    bg: "radial-gradient(60% 50% at 70% 35%, #ff86c0 0%, transparent 62%), linear-gradient(160deg,#4a4aa6,#b46ea8 68%,#e9a0a0)" },
    { alt: "Clouds",  bg: "radial-gradient(circle at 56% 38%, #73bfff 0 7%, transparent 7.5%), radial-gradient(80% 90% at 40% 30%, #f4f4f4, #8c8c8c 70%, #555)" },
    { alt: "Horizon", bg: "radial-gradient(circle at 50% 118%, #000 0 56%, #1d63ff 64%, #05163f 80%, #000 100%)" },
    { alt: "Shadow",  bg: "linear-gradient(135deg,#17171b,#050506)" },
    { alt: "Ember",   bg: "linear-gradient(180deg,#f3ead8 0 28%, #d9531e 28% 58%, #f2a33a 58% 78%, #4d1608 78%)" },
    { alt: "Lagoon",  bg: "linear-gradient(135deg,#0f766e,#164e63 60%,#0b1d3a)" },
  ];

  /* ============ 2. SETTINGS ============ */
  const cfg = {
    speed: 0.2,            // auto-glide in radians/second. Negative = other way, 0 = off
    minCards: 6,           // repeats your images if you give fewer than this
    gap: 0.012,            // gap between cards (× slider width)
    wheel: "horizontal",   // "horizontal" | "vertical" | "off"  (what the mouse wheel moves)
    // where cards fade, as angles on the ring (0 = centre, flat on to you)
    fadeOut: [1.25, 1.95], // left side  : fully visible → gone
    fadeIn: [-1.95, -1.45],// right side : gone → fully visible
  };

  /* ============ 3. BUILD THE CARDS ============ */
  const count = Math.max(slides.length, cfg.minCards);
  const cards = [];
  for (let i = 0; i < count; i++) {
    const s = slides[i % slides.length];
    const el = document.createElement("div");
    el.className = "og-card";
    el.setAttribute("role", "img");
    if (s.alt) el.setAttribute("aria-label", s.alt);
    if (s.src) el.style.backgroundImage = "url(" + s.src + ")";
    else if (s.bg) el.style.background = s.bg;
    stage.appendChild(el);
    cards.push({ el: el, i: i });
  }

  /* ============ 4. THE 3D RING ============
     The cards stand on a circle of radius R. We look at it from the inside,
     from a camera P away, so cards at the sides lean toward us (and look
     bigger) while the one in the middle faces us flat.
     Each card gets   rotateY(a) translateZ(-R)   where a is its angle.      */
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const smooth = (e0, e1, x) => {
    const t = clamp((x - e0) / (e1 - e0), 0, 1);
    return t * t * (3 - 2 * t);
  };

  let W = 0, H = 0, R = 0, P = 0, step = 0, span = 0, pxPerRad = 1;

  function layout() {
    const cw = Math.max(root.clientWidth, 600);
    W = cw * 0.4075;              // card width on the ring (shrinks with distance)
    H = (W * 9) / 16;
    R = cw * 0.5094;              // ring radius
    P = cw * 0.5486;              // camera distance
    step = (W + cw * cfg.gap) / R;      // angle between neighbouring cards
    span = step * cards.length;         // angle covered by all cards
    pxPerRad = (R * P) / (P + R);       // on-screen px per radian at the centre

    stage.style.perspective = P + "px";
    cards.forEach((c) => {
      c.el.style.width = W + "px";
      c.el.style.height = H + "px";
      c.el.style.marginLeft = -W / 2 + "px";
      c.el.style.marginTop = -H / 2 + "px";
    });
    render();
  }

  /* ============ 5. STATE + RENDER ============ */
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const auto = reduce ? 0 : cfg.speed;

  let pos = 0;          // how far the ring has turned (radians)
  let vel = auto;       // current turning speed
  let dragging = false;
  let visible = true;
  let raf = 0;
  let last = 0;

  function render() {
    const half = span / 2;
    for (let n = 0; n < cards.length; n++) {
      const c = cards[n];
      // this card's angle, wrapped so the ring loops forever
      let a = c.i * step + pos;
      a = ((((a + half) % span) + span) % span) - half;

      // fade in on the right edge, fade away round the left
      const o =
        a > 0
          ? 1 - smooth(cfg.fadeOut[0], cfg.fadeOut[1], a)
          : smooth(cfg.fadeIn[0], cfg.fadeIn[1], a);

      c.el.style.opacity = o.toFixed(3);
      c.el.style.visibility = o < 0.004 ? "hidden" : "visible";
      c.el.style.transform = "rotateY(" + a + "rad) translateZ(" + -R + "px)";
      c.el.style.zIndex = String(Math.round(Math.abs(a) * 100));
    }
  }

  function tick(t) {
    raf = 0;
    if (!visible) return;
    const dt = Math.min((t - last) / 1000, 0.05);
    last = t;

    if (!dragging) {
      // ease back to the gentle auto-glide after a drag or wheel flick
      vel += (auto - vel) * (1 - Math.exp(-dt * 1.2));
      pos += vel * dt;
    }
    render();
    raf = requestAnimationFrame(tick);
  }

  function start() {
    if (raf) return;
    last = performance.now();
    raf = requestAnimationFrame(tick);
  }

  /* ============ 6. INPUT (listeners only on #orbit-gallery) ============ */
  // drag
  let lastX = 0, lastT = 0;

  root.addEventListener("pointerdown", (e) => {
    dragging = true;
    lastX = e.clientX;
    lastT = performance.now();
    vel = 0;
    root.classList.add("is-dragging");
    if (root.setPointerCapture) root.setPointerCapture(e.pointerId);
  });

  root.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const now = performance.now();
    const dtSec = Math.max(now - lastT, 1) / 1000;
    const dp = -(e.clientX - lastX) / pxPerRad;   // drag left → cards move left
    pos += dp;
    vel = clamp(vel * 0.5 + (dp / dtSec) * 0.5, -6, 6);
    lastX = e.clientX;
    lastT = now;
    render();
  });

  function endDrag() {
    if (!dragging) return;
    dragging = false;
    root.classList.remove("is-dragging");
    if (performance.now() - lastT > 100) vel = 0; // held still before release
  }
  root.addEventListener("pointerup", endDrag);
  root.addEventListener("pointercancel", endDrag);

  // wheel / trackpad
  root.addEventListener(
    "wheel",
    (e) => {
      if (cfg.wheel === "off") return;
      const d =
        cfg.wheel === "vertical"
          ? e.deltaY
          : Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : 0;
      if (!d) return;                 // otherwise let the page scroll normally
      e.preventDefault();
      vel = clamp(vel + d * 0.004, -6, 6);
    },
    { passive: false }
  );

  // pause when scrolled out of view
  if ("IntersectionObserver" in window) {
    new IntersectionObserver((entries) => {
      visible = entries.some((en) => en.isIntersecting);
      if (visible) start();
    }).observe(root);
  }

  if ("ResizeObserver" in window) new ResizeObserver(layout).observe(root);
  else window.addEventListener("resize", layout);

  layout();
  start();
})();
