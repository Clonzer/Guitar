const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
let notes = [];
let score = 0;
let gameRunning = false;
let speed = 5;

const chords = ["C", "G", "Am", "F", "D", "E", "Em"]; // simple progression pool

document.getElementById("speedSlider")?.addEventListener("input", e => {
  speed = +e.target.value;
  document.getElementById("speedValue").textContent = speed;
});

document.getElementById("startBtn")?.addEventListener("click", () => {
  if (gameRunning) return;
  gameRunning = true;
  score = 0;
  document.getElementById("score").textContent = "Score: 0";
  notes = [];
  spawnNote();
  gameLoop();
});

function spawnNote() {
  if (!gameRunning) return;
  const chord = chords[Math.floor(Math.random() * chords.length)];
  notes.push({ chord, y: -60, x: Math.random() * (canvas.width - 200) + 100 });
  setTimeout(spawnNote, 1200 / speed);
}

function gameLoop() {
  if (!gameRunning) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  notes.forEach((note, i) => {
    note.y += speed * 2;
    ctx.fillStyle = "#f59e0b";
    ctx.fillRect(note.x, note.y, 180, 50);
    ctx.fillStyle = "black";
    ctx.font = "bold 40px Inter";
    ctx.fillText(note.chord, note.x + 50, note.y + 40);

    // Hit detection (simple bottom zone)
    if (note.y > canvas.height - 100 && note.y < canvas.height - 40) {
      // Could add visual feedback here
    }

    if (note.y > canvas.height) {
      notes.splice(i, 1);
      endGame();
    }
  });

  requestAnimationFrame(gameLoop);
}

function endGame() {
  gameRunning = false;
  alert(`Game Over!\nFinal Score: ${score}`);
}

document.addEventListener("keydown", e => {
  if (e.code === "Space" && gameRunning) {
    // Check if any note is in hit zone
    const hit = notes.some(n => n.y > canvas.height - 100 && n.y < canvas.height - 40);
    if (hit) {
      score += 10;
      document.getElementById("score").textContent = `Score: ${score}`;
      // Remove hit note (optional)
    } else {
      endGame();
    }
  }
});

canvas?.addEventListener("click", () => {
  if (gameRunning) {
    const hit = notes.some(n => n.y > canvas.height - 100 && n.y < canvas.height - 40);
    if (hit) {
      score += 10;
      document.getElementById("score").textContent = `Score: ${score}`;
    } else {
      endGame();
    }
  }
});
