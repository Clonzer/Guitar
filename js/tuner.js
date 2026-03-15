// tuner.js - Advanced Tuner with Mic Controls for FretForge

let audioContext = null;
let analyser = null;
let microphone = null;
let currentStream = null;
let dataArray = null;
let rafId = null;
let liveGainNode = null;

const micSelect = document.getElementById('micSelect');
const tunerBtn = document.getElementById('tunerBtn');
const sensitivitySlider = document.getElementById('sensitivity');
const noiseSlider = document.getElementById('noise');
const liveListenCheckbox = document.getElementById('liveListen');
const micLevelBar = document.getElementById('micLevel');

let sensitivity = 50;     // 10-100 → lower = more sensitive
let noiseThreshold = 30;  // 10-100 → higher = more noise reduction

// Update sliders in real time
sensitivitySlider.addEventListener('input', e => {
  sensitivity = parseInt(e.target.value);
});
noiseSlider.addEventListener('input', e => {
  noiseThreshold = parseInt(e.target.value);
});
liveListenCheckbox.addEventListener('change', toggleLiveListen);

// Load available microphones
async function loadMicrophones() {
  try {
    // Request permission first if not granted
    await navigator.mediaDevices.getUserMedia({ audio: true });
    const devices = await navigator.mediaDevices.enumerateDevices();
    const audioInputs = devices.filter(device => device.kind === 'audioinput');

    micSelect.innerHTML = '<option value="">Select Microphone</option>';
    audioInputs.forEach(device => {
      const option = document.createElement('option');
      option.value = device.deviceId;
      option.text = device.label || `Mic ${micSelect.options.length}`;
      micSelect.appendChild(option);
    });

    // Auto-select first if available
    if (audioInputs.length > 0) {
      micSelect.value = audioInputs[0].deviceId;
    }
  } catch (err) {
    console.error('Error loading mics:', err);
    alert('Microphone access denied or unavailable.');
  }
}

// Start / Stop tuner
async function toggleTuner() {
  if (rafId) {
    // Stop
    cancelAnimationFrame(rafId);
    rafId = null;
    if (currentStream) {
      currentStream.getTracks().forEach(track => track.stop());
      currentStream = null;
    }
    if (audioContext) audioContext.close();
    tunerBtn.textContent = 'START TUNER';
    micLevelBar.style.width = '0%';
    return;
  }

  try {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();

    const constraints = {
      audio: {
        deviceId: micSelect.value ? { exact: micSelect.value } : undefined
      }
    };

    currentStream = await navigator.mediaDevices.getUserMedia(constraints);

    microphone = audioContext.createMediaStreamSource(currentStream);
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    microphone.connect(analyser);
    dataArray = new Uint8Array(analyser.frequencyBinCount);

    // Optional live listening
    if (liveListenCheckbox.checked) {
      toggleLiveListen(true);
    }

    startMicLevel();
    drawTuner();
    tunerBtn.textContent = 'STOP TUNER';
  } catch (err) {
    console.error('Tuner error:', err);
    alert('Could not access microphone. Check permissions.');
  }
}

// Live listening (echo your own sound back)
function toggleLiveListen(enable = null) {
  if (!audioContext || !microphone) return;

  const shouldEnable = enable !== null ? enable : liveListenCheckbox.checked;

  if (shouldEnable) {
    if (!liveGainNode) {
      liveGainNode = audioContext.createGain();
      liveGainNode.gain.value = 0.3; // low volume to avoid feedback
      microphone.connect(liveGainNode);
      liveGainNode.connect(audioContext.destination);
    }
  } else {
    if (liveGainNode) {
      liveGainNode.disconnect();
      liveGainNode = null;
    }
  }
}

// Real-time mic level visualization
function startMicLevel() {
  function updateLevel() {
    if (!analyser) return;
    analyser.getByteTimeDomainData(dataArray);

    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      const val = (dataArray[i] - 128) / 128;
      sum += val * val;
    }
    const rms = Math.sqrt(sum / dataArray.length);
    const levelPercent = Math.min(100, rms * sensitivity * 20); // scale with sensitivity

    micLevelBar.style.width = levelPercent + '%';

    rafId = requestAnimationFrame(updateLevel);
  }
  updateLevel();
}

// Basic pitch detection display (optional enhancement)
function drawTuner() {
  if (!analyser) return;

  analyser.getByteTimeDomainData(dataArray);

  // Simple RMS volume for now (can expand to pitch detection later)
  let sum = 0;
  for (let i = 0; i < dataArray.length; i++) {
    const diff = dataArray[i] - 128;
    sum += diff * diff;
  }
  const volume = Math.sqrt(sum / dataArray.length) * sensitivity / 10;

  // You can add note/cents display here later with autocorrelation

  rafId = requestAnimationFrame(drawTuner);
}

// Change mic on select
micSelect.addEventListener('change', async () => {
  if (rafId) { // restart tuner with new device
    await toggleTuner(); // stop
    await toggleTuner(); // start again
  }
});

// Init on load
window.addEventListener('load', () => {
  loadMicrophones();
});
