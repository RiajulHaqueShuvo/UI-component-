const scrollArea = document.getElementById("scrollArea");
const cards = [...document.querySelectorAll(".card")];

const FALLEN_ANGLE = 75;   // degrees: how flat the cards lie at the start
const OVERLAP = 0.45;      // how much each card's rise overlaps the next one

// Keep a number between 0 and 1
const clamp = (v) => Math.min(1, Math.max(0, v));

// Smooth start and end
const ease = (t) => t * t * (3 - 2 * t);

function update() {
  // 1. How far through the scroll area are we? (0 = top, 1 = bottom)
  const maxScroll = scrollArea.offsetHeight - window.innerHeight;
  const progress = clamp(window.scrollY / maxScroll);

  // 2. Give each card its own slice of that progress
  const n = cards.length;
  const slice = 1 / (n - (n - 1) * OVERLAP);   // length of one card's window
  const step  = slice * (1 - OVERLAP);          // gap between window starts

  cards.forEach((card, i) => {
    const local = clamp((progress - i * step) / slice);  // 0..1 for this card
    const e = ease(local);

    // 3. Build the transform
    const tilt   = (1 - e) * FALLEN_ANGLE;          // lying flat -> upright
    const skew   = (1 - e) * -18;                   // slanted while lying down
    const wobble = Math.sin(e * Math.PI) * 5;       // small sideways lean mid-rise

    card.style.transform =
      `rotateX(${tilt}deg) skewX(${skew}deg) rotateZ(${wobble}deg)`;

    // 4. Show the caption when the card is fully up
    card.classList.toggle("standing", e > 0.95);
  });
}

window.addEventListener("scroll", update, { passive: true });
window.addEventListener("resize", update);
update();