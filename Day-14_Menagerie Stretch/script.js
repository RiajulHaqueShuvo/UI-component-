const stretch = document.getElementById("stretch");
const cards = [...document.querySelectorAll(".card")];

let current = 0;      // index of the open card
let autoTimer;        // runs the automatic cycling
let resumeTimer;      // waits before auto-play restarts

// Open one card, close the others
function show(index) {
  current = index;
  cards.forEach((card, i) => {
    card.classList.toggle("active", i === index);
  });
}

// Move to the next card every 1.7 seconds
function startAuto() {
  clearInterval(autoTimer);
  autoTimer = setInterval(() => {
    show((current + 1) % cards.length);
  }, 1700);
}

// Stop auto-play, then restart it after 4 seconds of no interaction
function pauseAuto() {
  clearInterval(autoTimer);
  clearTimeout(resumeTimer);
  resumeTimer = setTimeout(startAuto, 4000);
}

// Hover, click, or keyboard focus opens a card
cards.forEach((card, i) => {
  ["mouseenter", "focus", "click"].forEach(eventName => {
    card.addEventListener(eventName, () => {
      pauseAuto();
      show(i);
    });
  });
});

stretch.addEventListener("mouseleave", pauseAuto);

startAuto();