// Wrapped in an IIFE: no global variables, and every DOM lookup and
// listener is scoped to #motion-strip, so it can't conflict with other scripts.
(function () {
  const root = document.getElementById("motion-strip");
  if (!root) return;

  const $ = (sel) => root.querySelector(sel);
  const bgsEl   = $(".ms-bgs");
  const stripEl = $(".ms-strip");
  const titleEl = $(".ms-title");
  const curEl   = $(".ms-cur");
  const totalEl = $(".ms-total");
  const barFill = $(".ms-bar i");

  /* ============ 1. YOUR CONTENT ============
     Use  src: "./images/one.jpg"  for real images (used for the big
     background AND the thumbnail). `bg` is a CSS fallback so the demo
     works with no files at all.                                          */
  const slides = [
    { title: "Prismatic Rift",  by: "By Aurelia Studio", date: "Sat Nov 15", time: "5-10 PM", city: "Miami",
      bg: "radial-gradient(40% 55% at 58% 35%, rgba(255,255,255,.35), transparent 70%), radial-gradient(45% 40% at 12% 85%, #000 0 55%, transparent 56%), radial-gradient(35% 30% at 95% 20%, #05000f 0 60%, transparent 61%), linear-gradient(150deg,#4a2bd8,#7a5cff 55%,#2a1394)" },
    { title: "Ember Clouds",    by: "By Nova Atelier",   date: "Sun Nov 16", time: "7-11 PM", city: "Berlin",
      bg: "radial-gradient(55% 60% at 70% 30%, #ff7a3a, transparent 65%), radial-gradient(50% 60% at 20% 80%, #5a0b1a, transparent 70%), linear-gradient(160deg,#a01a1a,#3a0710)" },
    { title: "Neon Portal",     by: "By Studio Kori",    date: "Thu Nov 20", time: "8-12 PM", city: "Tokyo",
      bg: "radial-gradient(50% 60% at 60% 60%, #27e1ff, transparent 70%), radial-gradient(40% 70% at 5% 30%, #001a22 0 60%, transparent 61%), linear-gradient(160deg,#04303c,#00131a)" },
    { title: "Red Ribbon",      by: "By Casa Solara.",   date: "Fri Nov 21", time: "6-9 PM", city: "Lisbon",
      bg: "repeating-linear-gradient(115deg,#a30010 0 60px,#6e000b 60px 130px,#c10a1c 130px 190px)" },
    { title: "Celestial Light", by: "By Orbit & Co.",    date: "Sat Nov 22", time: "9-1 AM", city: "Reykjavik",
      bg: "radial-gradient(1.5px 1.5px at 20% 30%, #fff 50%, transparent 51%), radial-gradient(1.5px 1.5px at 70% 60%, #fff 50%, transparent 51%), radial-gradient(1px 1px at 40% 80%, #fff 50%, transparent 51%), radial-gradient(60% 70% at 55% 55%, #2a63ff, transparent 70%), linear-gradient(#030a2a,#02061a)" },
    { title: "Solar Bloom",     by: "By Halo Works",     date: "Sun Nov 23", time: "4-8 PM", city: "Marseille",
      bg: "radial-gradient(60% 80% at 50% 110%, #ffd35a, transparent 60%), linear-gradient(180deg,#5b2cff,#ff4fa3 55%,#ff9a3c)" },
    { title: "Indigo Marble",   by: "By Atlas Form",     date: "Fri Nov 28", time: "7-10 PM", city: "Oslo",
      bg: "repeating-radial-gradient(circle at 30% 40%, #1b1fa8 0 14px, #0b0e5a 14px 30px, #2c34d6 30px 40px)" },
    { title: "Midnight Drift",  by: "By Lumen Lab",      date: "Sat Nov 29", time: "10-2 AM", city: "Seoul",
      bg: "radial-gradient(60% 50% at 30% 20%, rgba(59,91,255,.35), transparent 70%), linear-gradient(180deg,#0a1030,#02030c)" },
    { title: "Cosmic Ring",     by: "By Aurelia Studio", date: "Sun Nov 30", time: "3-7 PM", city: "Cairo",
      bg: "radial-gradient(circle at 70% 50%, transparent 0 18%, #ffd0e0 19% 21%, transparent 22%), linear-gradient(135deg,#8a1a4a,#d6336c 60%,#40081f)" },
  ];

  /* ============ 2. SETTINGS ============ */
  const cfg = {
    anchor: 0.469,     // where the active thumbnail sits (× slider width)
    lock: 750,         // ms between steps, so one scroll = one slide
    wheelStep: 30,     // how much wheel movement counts as a "scroll"
    swipeMin: 50,      // px a drag/swipe must travel
  };

  /* ============ 3. BUILD ============ */
  const last = slides.length - 1;
  const pad = (n) => String(n).padStart(2, "0");
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function paint(el, s) {
    if (s.src) {
      el.style.backgroundImage = "url(" + s.src + ")";
      el.style.backgroundSize = "cover";
      el.style.backgroundPosition = "center";
    } else if (s.bg) {
      el.style.background = s.bg;
    }
  }

  let suppressClick = false;

  const layers = slides.map((s) => {
    const el = document.createElement("div");
    el.className = "ms-bg";
    paint(el, s);
    bgsEl.appendChild(el);
    return el;
  });

  const thumbs = slides.map((s, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "ms-thumb";
    b.setAttribute("aria-label", s.title);
    paint(b, s);
    b.addEventListener("click", () => { if (!suppressClick) goTo(i); });
    stripEl.appendChild(b);
    return b;
  });

  totalEl.textContent = pad(slides.length);
  barFill.style.width = 100 / slides.length + "%";

  /* ============ 4. TEXT EFFECTS ============ */
  // the small mono lines resolve out of random characters
  const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&@*+/";
  function scrambler(el) {
    let raf = 0;
    return function (text, delay) {
      cancelAnimationFrame(raf);
      text = text.toUpperCase();
      if (reduce) { el.textContent = text; return; }
      const t0 = performance.now() + (delay || 0);
      const dur = 650;
      (function run(now) {
        if (now < t0) { raf = requestAnimationFrame(run); return; }
        const p = clamp((now - t0) / dur, 0, 1);
        const n = Math.floor(p * text.length);
        let out = "";
        for (let i = 0; i < text.length; i++) {
          const c = text[i];
          out += i < n || c === " " ? c : GLYPHS[(Math.random() * GLYPHS.length) | 0];
        }
        el.textContent = out;
        if (p < 1) raf = requestAnimationFrame(run);
      })(performance.now());
    };
  }
  const setBy   = scrambler($(".ms-by"));
  const setDate = scrambler($(".ms-date"));
  const setTime = scrambler($(".ms-time"));
  const setCity = scrambler($(".ms-city"));

  let titleTimer = 0;
  function setTitle(text, instant) {
    clearTimeout(titleTimer);
    if (instant) { titleEl.textContent = text; return; }
    titleEl.classList.add("is-out");                 // slide up + fade out
    titleTimer = setTimeout(() => {
      titleEl.textContent = text;
      titleEl.classList.add("is-pre");               // park below, invisible
      titleEl.classList.remove("is-out");
      void titleEl.offsetWidth;
      titleEl.classList.remove("is-pre");            // rise into place
    }, 230);
  }

  /* ============ 5. STATE ============ */
  let index = -1;
  let bgTimer = 0;

  function placeStrip() {
    // slide the strip so the active thumbnail sits at the anchor point
    const x = root.clientWidth * cfg.anchor - thumbs[index].offsetLeft;
    stripEl.style.transform = "translate3d(" + x + "px,0,0)";
  }

  function goTo(n) {
    n = clamp(n, 0, last);
    if (n === index) return false;
    const first = index === -1;
    const old = index;
    index = n;
    const s = slides[n];

    // background crossfade (old stays solid underneath until the new one is in)
    layers.forEach((l) => l.classList.remove("is-prev"));
    if (!first) {
      layers[old].classList.remove("is-on");
      layers[old].classList.add("is-prev");
    }
    layers[n].classList.add("is-on");
    clearTimeout(bgTimer);
    bgTimer = setTimeout(() => layers.forEach((l) => l.classList.remove("is-prev")), 1000);

    // thumbnails + strip
    thumbs.forEach((t, i) => t.classList.toggle("is-active", i === n));
    placeStrip();

    // counter + progress
    curEl.textContent = pad(n + 1);
    barFill.style.left = (n / slides.length) * 100 + "%";

    // text
    setTitle(s.title, first);
    setBy(s.by, 60);
    setDate(s.date, 120);
    setTime(s.time, 180);
    setCity(s.city, 240);
    return true;
  }

  // one step forward (+1) or back (-1), at most once per `lock` ms
  let lockUntil = 0;
  function step(dir) {
    const now = performance.now();
    if (now < lockUntil) return false;
    if (goTo(index + dir)) { lockUntil = now + cfg.lock; return true; }
    return false;
  }

  /* ============ 6. INPUT (all listeners on #motion-strip) ============ */
  // --- wheel / trackpad ---
  //   scroll down  or  scroll right  → next  (strip slides right → left)
  //   scroll up    or  scroll left   → back  (strip slides left → right)
  let acc = 0, armed = true, lastWheel = 0;
  root.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      const now = performance.now();
      const fresh = now - lastWheel > 120;      // a gap = a brand-new gesture
      lastWheel = now;

      let d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (e.deltaMode === 1) d *= 16;           // lines → px
      if (!d) return;

      if (now < lockUntil) { acc = 0; return; } // mid-transition: ignore
      const notch = Math.abs(d) >= 80;          // a mouse-wheel click
      if (fresh) acc = 0;
      if (fresh || notch) armed = true;         // trackpad momentum can't re-fire
      if (!armed) return;

      acc += d;
      if (Math.abs(acc) >= cfg.wheelStep) {
        if (step(acc > 0 ? 1 : -1)) armed = false;
        acc = 0;
      }
    },
    { passive: false }
  );

  // --- drag / swipe (mouse or touch, any direction) ---
  //   drag/swipe left or up → next ;  right or down → back
  let sx = 0, sy = 0, moved = false;
  function onMove(e) {
    if (Math.hypot(e.clientX - sx, e.clientY - sy) > 8) moved = true;
  }
  function onUp(e) {
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", onUp);
    if (!moved) return;
    suppressClick = true;                       // a drag shouldn't count as a thumb click
    setTimeout(() => { suppressClick = false; }, 0);
    const dx = e.clientX - sx;
    const dy = e.clientY - sy;
    const d = Math.abs(dx) >= Math.abs(dy) ? dx : dy;
    if (Math.abs(d) >= cfg.swipeMin) step(d < 0 ? 1 : -1);
  }
  root.addEventListener("pointerdown", (e) => {
    if (e.target.closest("a")) return;
    sx = e.clientX; sy = e.clientY; moved = false;
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  });

  // --- keyboard (when the slider has focus) ---
  root.addEventListener("keydown", (e) => {
    const k = e.key;
    if (k === "ArrowRight" || k === "ArrowDown" || k === "PageDown") { e.preventDefault(); step(1); }
    else if (k === "ArrowLeft" || k === "ArrowUp" || k === "PageUp") { e.preventDefault(); step(-1); }
    else if (k === "Home") { e.preventDefault(); goTo(0); }
    else if (k === "End")  { e.preventDefault(); goTo(last); }
  });

  // keep the strip aligned when the window changes size
  if ("ResizeObserver" in window) new ResizeObserver(() => { if (index >= 0) placeStrip(); }).observe(root);
  else window.addEventListener("resize", () => { if (index >= 0) placeStrip(); });

  /* ============ 7. START ============ */
  stripEl.classList.add("is-init");             // place without animating
  goTo(0);
  void stripEl.offsetWidth;
  stripEl.classList.remove("is-init");
  root.focus({ preventScroll: true });          // so the arrow keys work straight away
})();
