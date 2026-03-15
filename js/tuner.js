let audioContext, analyser, currentStream, dataArray, rafId, liveGainNode;
const micSelect = document.getElementById('micSelect');
const tunerBtn = document.getElementById('tunerBtn');
const micLevel = document.getElementById('micLevel');
const liveListen = document.getElementById('liveListen');

async function loadMics() {
  try {
    await navigator.mediaDevices.getUserMedia({audio: true});
    const devices = await navigator.mediaDevices.enumerateDevices();
    micSelect.innerHTML = '<option value="">Default Mic</option>';
    devices.filter(d => d.kind === 'audioinput').forEach(d => {
      const opt = document.createElement('option');
      opt.value = d.deviceId;
      opt.textContent = d.label || 'Microphone';
      micSelect.appendChild(opt);
    });
  } catch(e) { alert('Microphone permission needed'); }
}

async function toggleTuner() {
  if (rafId) {
    cancelAnimationFrame(rafId);
    if (currentStream) currentStream.getTracks().forEach(t => t.stop());
    if (audioContext) audioContext.close();
    tunerBtn.textContent = 'START TUNER';
    micLevel.style.width = '0%';
    rafId = null;
    return;
  }

  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  if (audioContext.state === 'suspended') await audioContext.resume();

  const constraints = micSelect.value ? { audio: { deviceId: { exact: micSelect.value } } } : { audio: true };
  currentStream = await navigator.mediaDevices.getUserMedia(constraints);

  const source = audioContext.createMediaStreamSource(currentStream);
  analyser = audioContext.createAnalyser();
  analyser.fftSize = 2048;
  source.connect(analyser);
  dataArray = new Uint8Array(analyser.frequencyBinCount);

  startLevelMeter();
  tunerBtn.textContent = 'STOP TUNER';
}

function startLevelMeter() {
  function loop() {
    if (!analyser) return;
    analyser.getByteTimeDomainData(dataArray);
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) sum += (dataArray[i] - 128) ** 2;
    const rms = Math.sqrt(sum / dataArray.length);
    micLevel.style.width = Math.min(100, rms * 180) + '%';
    rafId = requestAnimationFrame(loop);
  }
  loop();
}

liveListen.addEventListener('change', () => {
  if (!audioContext || !currentStream) return;
  // Live listen logic can be expanded later
});

window.addEventListener('load', loadMics);
