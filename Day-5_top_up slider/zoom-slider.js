// Wrapped in an IIFE: no global variables, and every DOM lookup is
// scoped to #zoom-slider, so it can't conflict with other scripts.
(function () {
  const root = document.getElementById("zoom-slider");
  if (!root) return;
  const track = root.querySelector(".zs-track");

  /* ============ 1. YOUR CONTENT (replace images / text) ============ */
  // Order = 01, 02, 03 … Scroll down moves forward through this list,
  // scroll up moves back. Items travel from bottom-right to top-left.
  const slides = [
    { src: "./assets/card1.jpg", title: "Aurora",    sub: "Light in motion" },
    { src: "./assets/card2.jpg", title: "Flux",      sub: "Shapes that never settle" },
    { src: "./assets/card3.jpg", title: "Nova",      sub: "A burst of colour" },
    { src: "./assets/card4.jpg", title: "Prism",     sub: "Light bends into colour" },
    { src: "./assets/card5.jpg", title: "Flora",     sub: "Nature meets structure" },
    { src: "./assets/card6.jpg", title: "Energy",    sub: "Momentum captured in form" },
    { src: "./assets/card7.jpg", title: "Glitch",    sub: "Breaking visual boundaries" },
    { src: "./assets/card8.jpg", title: "Frame-X",   sub: "Cinematic still frame" },
    
  ];

  /* ============ 2. SETTINGS ============ */
  const cfg = {
    startIndex: 0,     // which slide is active on load
    travelY: 0.42,     // how steeply items climb toward top-left (× active height). 0 = flat
    widthRatio: 0.40,  // active item width  (× slider width)
    heightRatio: 0.63, // active item height (× slider height)
    anchor: 0.38,      // where the active item's left edge sits (× slider width)
    wheelSpeed: 0.0035,// items moved per wheel-delta unit
    ease: 0.09,        // smoothing (higher = snappier)
    bgBlur: 60,        // background blur in px
    bgDim: 0.55,       // background brightness (1 = original, 0 = black)
  };

  /* ============ 3. BUILD THE BACKGROUND + ITEMS ============ */
  const pad = (n) => String(n).padStart(2, "0");

  // blurred background: one layer per slide, crossfaded while scrolling
  root.style.setProperty("--zs-blur", cfg.bgBlur + "px");
  root.style.setProperty("--zs-dim", cfg.bgDim);
  const bg = document.createElement("div");
  bg.className = "zs-bg";
  const bgLayers = slides.map((s) => {
    const layer = document.createElement("div");
    layer.className = "zs-bg-layer";
    layer.style.backgroundImage = "url(" + s.src + ")";
    bg.appendChild(layer);
    return layer;
  });
  root.insertBefore(bg, track);

  const items = slides.map((s, i) => {
    const el = document.createElement("article");
    el.className = "zs-item";
    el.innerHTML =
      '<div class="zs-media"><img alt="" draggable="false"></div>' +
      '<div class="zs-caption">' +
        '<span class="zs-num"></span>' +
        '<span class="zs-name"></span>' +
        '<span class="zs-sub"></span>' +
      "</div>";
    el.querySelector("img").src = s.src;
    el.querySelector("img").alt = s.title;
    el.querySelector(".zs-num").textContent = pad(i + 1);
    el.querySelector(".zs-name").textContent = s.title;
    el.querySelector(".zs-sub").textContent = s.sub;
    el.addEventListener("click", () => setTarget(i)); // click an item to jump to it
    track.appendChild(el);
    return { el, caption: el.querySelector(".zs-caption") };
  });

  /* ============ 4. THE ZOOM MATHS ============
     p = distance of an item from the active one (0 = active,
     -1 = already passed, up-left; +1 = coming next, from bottom-right).

     size(p): items get bigger toward the right (≈ 0.68, 1, 1.27 …)
     left(p): cumulative width, so items sit edge-to-edge with no gaps.
     lift(p): p × travelY × height, so the row runs along a diagonal:
              items further right sit lower, items further left sit higher.
     All smooth, so the whole row "zooms" along the diagonal as you scroll. */
  const size = (p) => 1 + 0.295 * p - 0.025 * p * p;
  const leftOffset = (p) => 0.848333 * p + 0.16 * p * p - 0.008333 * p * p * p;

  /* ============ 5. STATE + RENDER LOOP ============ */
  const last = slides.length - 1;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let current = clamp(cfg.startIndex, 0, last); // what's drawn
  let target = current;                          // where it's heading
  let dir = 0;                                   // last scroll direction
  let snapTimer = null;
  let raf = null;

  function render() {
    const w = root.clientWidth;
    const h = root.clientHeight;
    const W = w * cfg.widthRatio;
    const H = h * cfg.heightRatio;
    const ax = w * cfg.anchor;

    // background follows the card in the middle (smooth crossfade)
    bgLayers.forEach((layer, i) => {
      const o = clamp(1 - Math.abs(i - current), 0, 1);
      layer.style.opacity = String(o);
      layer.style.display = o === 0 ? "none" : "";
    });

    items.forEach((it, i) => {
      const p = i - current;

      if (p < -2.5 || p > 2.2) {           // far away: not drawn
        it.el.style.display = "none";
        return;
      }
      it.el.style.display = "";

      const s = size(p);
      it.el.style.width = W * s + "px";
      it.el.style.height = H * s + "px";
      const x = ax + W * leftOffset(p);
      const y = p * cfg.travelY * H; // + = lower (bottom-right), − = higher (top-left)
      it.el.style.transform = "translate3d(" + x + "px," + y + "px,0)";
      it.el.style.opacity = p < -2 ? String(clamp((p + 2.5) / 0.5, 0, 1)) : "1";

      // caption is only visible near the active item
      it.caption.style.opacity = String(clamp(1 - Math.abs(p) * 2.2, 0, 1));
      it.el.style.zIndex = Math.abs(p) < 0.5 ? 2 : 1;
    });
  }

  function loop() {
    const diff = target - current;
    if (reduceMotion || Math.abs(diff) < 0.0008) {
      current = target;
      render();
      raf = null;
      return;
    }
    current += diff * cfg.ease;
    render();
    raf = requestAnimationFrame(loop);
  }

  function setTarget(v) {
    target = clamp(v, 0, last);
    if (!raf) raf = requestAnimationFrame(loop);
  }

  // after scrolling stops, settle exactly on an item (in the direction you were going)
  function snapSoon() {
    clearTimeout(snapTimer);
    snapTimer = setTimeout(() => {
      setTarget(Math.round(target + dir * 0.3));
    }, 140);
  }

  // scrollDelta > 0 means "scroll down"
  function scrollBy(scrollDelta) {
    if (!scrollDelta) return;
    dir = scrollDelta > 0 ? 1 : -1;           // down → next (bottom-right → top-left)
    setTarget(target + scrollDelta * cfg.wheelSpeed);
    snapSoon();
  }

  /* ============ 6. INPUT (all listeners live on #zoom-slider only) ============ */
  // mouse wheel / trackpad
  root.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      scrollBy(e.deltaY);
    },
    { passive: false }
  );

  // touch swipe
  let lastY = null;
  root.addEventListener("touchstart", (e) => { lastY = e.touches[0].clientY; }, { passive: true });
  root.addEventListener("touchmove", (e) => {
    if (lastY === null) return;
    const y = e.touches[0].clientY;
    scrollBy((lastY - y) * 1.6);              // finger up = scroll down
    lastY = y;
  }, { passive: true });
  root.addEventListener("touchend", () => { lastY = null; }, { passive: true });

  // keyboard (when the slider is focused)
  root.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowRight") { e.preventDefault(); setTarget(Math.round(target) + 1); }
    if (e.key === "ArrowUp"   || e.key === "ArrowLeft")  { e.preventDefault(); setTarget(Math.round(target) - 1); }
  });

  // keep sizes correct when the window changes
  if ("ResizeObserver" in window) new ResizeObserver(render).observe(root);
  else window.addEventListener("resize", render);

  render();
})();
