// Basic chord data (expand as needed)
const instruments = {
  guitar: {
    strings: 6,
    openFreqs: [82.41, 110, 146.83, 196, 246.94, 329.63],
    chords: [
      {name: "C", frets: [-1,3,2,0,1,0]},
      {name: "G", frets: [3,2,0,0,0,3]},
      {name: "D", frets: [-1,-1,0,2,3,2]},
      {name: "A", frets: [-1,0,2,2,2,0]},
      {name: "E", frets: [0,2,2,1,0,0]},
      {name: "Am", frets: [-1,0,2,2,1,0]},
      {name: "F", frets: [1,3,3,2,1,1]},
      {name: "Em", frets: [0,2,2,0,0,0]}
    ]
  },
  ukulele: {
    strings: 4,
    openFreqs: [392, 261.63, 329.63, 440],
    chords: [
      {name: "C", frets: [0,0,0,3]},
      {name: "G", frets: [0,2,3,2]},
      {name: "F", frets: [2,0,1,0]},
      {name: "A", frets: [2,1,0,0]},
      {name: "Dm", frets: [2,2,1,0]},
      {name: "Em", frets: [0,4,3,2]},
      {name: "Bb", frets: [1,2,3,1]},
      {name: "Am", frets: [2,0,0,0]}
    ]
  }
};

let currentInstrument = "guitar";
let currentChord = null;
let learned = JSON.parse(localStorage.getItem("learnedChords") || "[]");
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playNote(freq, delay = 0, duration = 0.6) {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = "sawtooth";
  osc.frequency.value = freq;
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  gain.gain.value = 0.25;
  osc.start(audioCtx.currentTime + delay);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + delay + duration);
  osc.stop(audioCtx.currentTime + delay + duration);
}

function strumChord() {
  if (!currentChord) return;
  const instr = instruments[currentInstrument];
  currentChord.frets.forEach((fret, i) => {
    if (fret >= 0) {
      const freq = instr.openFreqs[i] * Math.pow(2, fret / 12);
      playNote(freq, i * 0.03);
    }
  });
}

const canvas = document.getElementById("fretboard");
const ctx = canvas.getContext("2d");

function drawFretboard() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const instr = instruments[currentInstrument];
  const numStrings = instr.strings;
  const numFrets = 5;
  const stringY = Array.from({length: numStrings}, (_, i) => 60 + i * 35);
  const fretX = [60];
  for (let i = 1; i <= numFrets; i++) fretX.push(60 + i * 70);

  // Draw frets and nut
  ctx.strokeStyle = "#ccc";
  ctx.lineWidth = 4;
  fretX.forEach(x => {
    ctx.beginPath();
    ctx.moveTo(x, 40);
    ctx.lineTo(x, stringY[numStrings-1] + 20);
    ctx.stroke();
  });
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(fretX[0], 40);
  ctx.lineTo(fretX[0], stringY[numStrings-1] + 20);
  ctx.stroke();

  // Strings
  ctx.lineWidth = 2;
  stringY.forEach(y => {
    ctx.beginPath();
    ctx.moveTo(fretX[0], y);
    ctx.lineTo(fretX.at(-1) + 30, y);
    ctx.stroke();
  });

  // Chord dots
  if (currentChord) {
    ctx.fillStyle = "#f59e0b";
    currentChord.frets.forEach((fret, strIdx) => {
      if (fret > 0 && fret <= numFrets) {
        const x = fretX[fret];
        const y = stringY[strIdx];
        ctx.beginPath();
        ctx.arc(x, y, 14, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }

  // Labels
  ctx.fillStyle = "#aaa";
  ctx.font = "14px Inter";
  instr.openFreqs.forEach((_, i) => {
    ctx.fillText(["E","A","D","G","B","e"][i] || ["G","C","E","A"][i], 30, stringY[i] + 5);
  });
}

function populateChords() {
  const sel = document.getElementById("chordSelect");
  sel.innerHTML = "";
  instruments[currentInstrument].chords.forEach(ch => {
    const opt = document.createElement("option");
    opt.value = ch.name;
    opt.text = ch.name;
    sel.appendChild(opt);
  });
  currentChord = instruments[currentInstrument].chords[0];
  drawFretboard();
  renderLearned();
}

function renderLearned() {
  const list = document.getElementById("chordList");
  list.innerHTML = "";
  learned.forEach(name => {
    const btn = document.createElement("button");
    btn.textContent = name;
    btn.className = "bg-green-700 px-4 py-2 rounded-xl text-sm";
    list.appendChild(btn);
  });
}

function markLearned() {
  if (!currentChord || learned.includes(currentChord.name)) return;
  learned.push(currentChord.name);
  localStorage.setItem("learnedChords", JSON.stringify(learned));
  renderLearned();
}

// Event listeners
document.getElementById("instrument")?.addEventListener("change", e => {
  currentInstrument = e.target.value;
  populateChords();
});

document.getElementById("chordSelect")?.addEventListener("change", e => {
  currentChord = instruments[currentInstrument].chords.find(c => c.name === e.target.value);
  drawFretboard();
});

document.getElementById("strumBtn")?.addEventListener("click", strumChord);

// Canvas click to pluck individual string
canvas?.addEventListener("click", e => {
  const rect = canvas.getBoundingClientRect();
  const clickY = e.clientY - rect.top;
  const instr = instruments[currentInstrument];
  const stringY = Array.from({length: instr.strings}, (_, i) => 60 + i * 35);
  let closest = 0, minDist = Infinity;
  stringY.forEach((y, i) => {
    const dist = Math.abs(y - clickY);
    if (dist < minDist) { minDist = dist; closest = i; }
  });
  const freq = instr.openFreqs[closest];
  playNote(freq, 0, 0.8);
});

// Init
populateChords();
