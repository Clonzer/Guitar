let audioContext, analyser, currentStream, dataArray, rafId;
const micSelect = document.getElementById('micSelect');
const tunerBtn = document.getElementById('tunerBtn');
const tuningBar = document.getElementById('tuningBar');
const stringFeedback = document.getElementById('stringFeedback');
const canvas = document.getElementById('instrumentCanvas');
const ctx = canvas.getContext('2d');

const strings = {
  guitar: { names: ["E","A","D","G","B","e"], freqs: [82.41,110,146.83,196,246.94,329.63] },
  ukulele: { names: ["G","C","E","A"], freqs: [392,261.63,329.63,440] }
};

let currentInstrument = "guitar";
let highlightedString = -1;

async function loadMics() {
  await navigator.mediaDevices.getUserMedia({audio:true});
  const devices = await navigator.mediaDevices.enumerateDevices();
  micSelect.innerHTML = '<option value="">Default Mic</option>';
  devices.filter(d => d.kind === "audioinput").forEach(d => {
    const opt = document.createElement("option");
    opt.value = d.deviceId;
    opt.textContent = d.label || "Microphone";
    micSelect.appendChild(opt);
  });
}

async function toggleTuner() {
  if (rafId) {
    cancelAnimationFrame(rafId);
    currentStream?.getTracks().forEach(t => t.stop());
    tunerBtn.textContent = "START TUNER";
    rafId = null;
    return;
  }

  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  if (audioContext.state === "suspended") await audioContext.resume();

  const constraints = micSelect.value ? {audio: {deviceId: {exact: micSelect.value}}} : {audio: true};
  currentStream = await navigator.mediaDevices.getUserMedia(constraints);

  const source = audioContext.createMediaStreamSource(currentStream);
  analyser = audioContext.createAnalyser();
  analyser.fftSize = 4096;
  source.connect(analyser);
  dataArray = new Uint8Array(analyser.frequencyBinCount);

  tunerBtn.textContent = "STOP TUNER";
  drawInstrument();
  detectPitchLoop();
}

function autoCorrelate(buffer, sampleRate) {
  // (same reliable autocorrelation as before - kept short for space)
  let SIZE = buffer.length;
  let rms = 0; for (let i=0;i<SIZE;i++) rms += buffer[i]*buffer[i];
  rms = Math.sqrt(rms/SIZE); if (rms < 0.01) return -1;

  let r1=0, r2=SIZE-1;
  for (let i=0; i<SIZE/2; i++) if (Math.abs(buffer[i])>0.2) {r1=i; break;}
  for (let i=SIZE-1; i>SIZE/2; i--) if (Math.abs(buffer[i])>0.2) {r2=i; break;}

  buffer = buffer.slice(r1,r2);
  SIZE = buffer.length;
  let c = new Array(SIZE).fill(0);
  for (let i=0;i<SIZE;i++) for (let j=0;j<SIZE-i;j++) c[i] += buffer[j]*buffer[j+i];

  let d=0; while (c[d]>c[d+1]) d++;
  let maxval=-1, maxpos=-1;
  for (let i=d;i<SIZE;i++) if (c[i]>maxval) {maxval=c[i]; maxpos=i;}
  let T0 = maxpos;
  let x1=c[T0-1], x2=c[T0], x3=c[T0+1];
  let dt = (x1 - x3) / (2 * (x1 + x3 - 2*x2));
  return sampleRate / (T0 + dt);
}

async function detectPitchLoop() {
  if (!analyser) return;
  analyser.getFloatTimeDomainData(dataArray);
  const pitch = autoCorrelate(dataArray, audioContext.sampleRate);

  if (pitch > 60 && pitch < 1000) {
    const instr = strings[currentInstrument];
    let closestIdx = 0;
    let minDiff = Infinity;
    let cents = 0;

    instr.freqs.forEach((openFreq, i) => {
      const diff = Math.abs(pitch - openFreq);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = i;
        cents = Math.round(1200 * Math.log2(pitch / openFreq));
      }
    });

    highlightedString = closestIdx;
    drawInstrument();

    // Tighten / Loosen bar
    let direction = cents > 0 ? "Tighten" : "Loosen";
    tuningBar.innerHTML = `<span class="text-amber-400">${direction} ${Math.abs(cents)} cents</span>`;

    // Strum feedback
    stringFeedback.textContent = `String ${instr.names[closestIdx]} — ${cents === 0 ? "Perfect!" : cents > 0 ? "Slightly sharp" : "Slightly flat"}`;
  }

  rafId = requestAnimationFrame(detectPitchLoop);
}

function drawInstrument() {
  ctx.clearRect(0,0,canvas.width,canvas.height);
  const instr = strings[currentInstrument];
  const yStep = 380 / (instr.names.length + 1);

  // Draw strings
  for (let i = 0; i < instr.names.length; i++) {
    const y = yStep * (i + 1);
    ctx.strokeStyle = (i === highlightedString) ? "#f59e0b" : "#666";
    ctx.lineWidth = (i === highlightedString) ? 8 : 3;
    ctx.beginPath();
    ctx.moveTo(50, y);
    ctx.lineTo(650, y);
    ctx.stroke();

    // Label
    ctx.fillStyle = "#aaa";
    ctx.font = "bold 24px Inter";
    ctx.fillText(instr.names[i], 20, y + 8);
  }
}

// Init
window.addEventListener('load', loadMics);
