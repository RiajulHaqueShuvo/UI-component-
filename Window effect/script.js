// ⬇️ Replace with your own images + labels
const slides = [
  { src: "../assets/banner1.jpg", label: "Room 14B" },
  { src: "../assets/banner2.jpg", label: "Dossier 09" },
  { src: "../assets/HeroSaree.jpg", label: "Stairwell C7" },
];

// ⬇️ Tweak the feel here
const config = {
  strips: 24,     // number of horizontal blinds
  stagger: 32,    // ms delay between neighbouring strips
  duration: 650,  // ms each strip takes to open
  interval: 3200, // ms each slide stays on screen
  autoPlay: true,
};

const root     = document.getElementById("blinds");
const base     = document.getElementById("base");
const stripsEl = document.getElementById("strips");
const labelEl  = document.getElementById("label");
const prevBtn  = document.getElementById("prev");
const nextBtn  = document.getElementById("next");

let current = 0;
let busy = false;
let paused = false;
let autoTimer = null;
let lockUntil = 0; // blocks trackpad "inertia" scrolls right after a transition

root.style.setProperty("--dur", config.duration + "ms");

// preload all images so the wipe never flashes
slides.forEach((s) => { new Image().src = s.src; });

function setBase(i) {
  base.style.backgroundImage = `url(${slides[i].src})`;
}

function setLabel(i) {
  labelEl.textContent = slides[i].label;
  // restart the fade-in animation
  labelEl.classList.remove("is-changing");
  void labelEl.offsetWidth;
  labelEl.classList.add("is-changing");
}

// build the strips for the incoming image
function buildStrips(target) {
  const { strips, stagger } = config;
  stripsEl.innerHTML = "";

  for (let i = 0; i < strips; i++) {
    const strip = document.createElement("div");
    strip.className = "blinds__strip";
    strip.style.top = (i * 100) / strips + "%";
    strip.style.height = 100 / strips + "%";
    // bottom strip opens first, top strip last
    strip.style.transitionDelay = (strips - 1 - i) * stagger + "ms";

    const img = document.createElement("div");
    img.className = "blinds__strip-img";
    img.style.backgroundImage = `url(${slides[target].src})`;
    img.style.height = strips * 100 + "%";
    img.style.top = -i * 100 + "%";

    strip.appendChild(img);
    stripsEl.appendChild(strip);
  }
}

function goTo(target) {
  if (busy || target === current) return;
  busy = true;
  clearTimeout(autoTimer);

  // respect reduced-motion settings
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    current = target;
    setBase(current);
    setLabel(current);
    busy = false;
    scheduleAuto();
    return;
  }

  // 1) create strips in their closed state
  buildStrips(target);
  void root.offsetWidth; // force reflow so the closed state is painted

  // 2) open them (CSS transition does the animation)
  root.classList.add("is-running");

  const total = config.duration + config.stagger * (config.strips - 1);

  // swap centre label around the middle of the wipe
  setTimeout(() => setLabel(target), total * 0.45);

  // 3) finished: new image becomes base layer, strips are removed
  setTimeout(() => {
    current = target;
    setBase(current);
    stripsEl.innerHTML = "";
    root.classList.remove("is-running");
    busy = false;
    lockUntil = performance.now() + 500; // ignore leftover trackpad momentum
    scheduleAuto();
  }, total + 60);
}

const next = () => goTo((current + 1) % slides.length);
const prev = () => goTo((current - 1 + slides.length) % slides.length);

function scheduleAuto() {
  clearTimeout(autoTimer);
  if (!config.autoPlay || paused) return;
  autoTimer = setTimeout(next, config.interval);
}

// events
nextBtn.addEventListener("click", next);
prevBtn.addEventListener("click", prev);
root.addEventListener("mouseenter", () => { paused = true; clearTimeout(autoTimer); });
root.addEventListener("mouseleave", () => { paused = false; if (!busy) scheduleAuto(); });

// ---------- scroll / swipe / keyboard ----------

// mouse wheel or trackpad: scroll down = next, scroll up = previous
window.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault(); // stop the page itself from scrolling
    if (busy || performance.now() < lockUntil) return;
    if (Math.abs(e.deltaY) < 10) return; // ignore tiny movements
    e.deltaY > 0 ? next() : prev();
  },
  { passive: false }
);

// touch: swipe up = next, swipe down = previous
let touchStartY = null;
window.addEventListener("touchstart", (e) => {
  touchStartY = e.touches[0].clientY;
}, { passive: true });

window.addEventListener("touchend", (e) => {
  if (touchStartY === null) return;
  const diff = touchStartY - e.changedTouches[0].clientY;
  touchStartY = null;
  if (Math.abs(diff) < 50) return; // too short to count as a swipe
  diff > 0 ? next() : prev();
}, { passive: true });

// keyboard: arrows / page keys
window.addEventListener("keydown", (e) => {
  if (e.key === "ArrowDown" || e.key === "PageDown") next();
  if (e.key === "ArrowUp" || e.key === "PageUp") prev();
});

// stop mobile browsers from pull-to-refresh / page scroll while swiping
document.body.style.overscrollBehavior = "none";
document.body.style.touchAction = "none";

// init
setBase(0);
setLabel(0);
scheduleAuto();
