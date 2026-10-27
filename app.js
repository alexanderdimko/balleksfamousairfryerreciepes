const pads = Array.from(document.querySelectorAll('.pad'));
const powerToggle = document.getElementById('powerToggle');
const loopToggle = document.getElementById('loopToggle');
const masterVolume = document.getElementById('masterVolume');
const trackVolume = document.getElementById('trackVolume');
const bpmSlider = document.getElementById('bpmSlider');
const masterValue = document.getElementById('masterValue');
const trackValue = document.getElementById('trackValue');
const bpmValue = document.getElementById('bpmValue');
const audioFileInput = document.getElementById('audioFileInput');
const trackName = document.getElementById('trackName');
const trackStatus = document.getElementById('trackStatus');
const visualizer = document.getElementById('visualizer');
const playTrackBtn = document.getElementById('playTrackBtn');
const pauseTrackBtn = document.getElementById('pauseTrackBtn');
const stopTrackBtn = document.getElementById('stopTrackBtn');
const playKitBtn = document.getElementById('playKitBtn');
const muteKitBtn = document.getElementById('muteKitBtn');
const tapTempoBtn = document.getElementById('tapTempoBtn');

let audioContext;
let masterGain;
let kitEnabled = true;
let autoLoop = false;
let loopTimer = null;
let currentTrack = null;
let currentTrackURL = null;
let lastTap = 0;
let tapTimes = [];

function ensureAudio() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioContext.createGain();
    masterGain.gain.value = Number(masterVolume.value) / 100;
    masterGain.connect(audioContext.destination);
  }

  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
}

function animatePadByKey(key) {
  const pad = pads.find((item) => item.dataset.key === key);
  if (!pad) return;

  pad.classList.add('active');
  setTimeout(() => pad.classList.remove('active'), 120);
}

function playTone({
  type,
  start,
  duration,
  frequency,
  endFrequency,
  gainValue,
  endGain,
  pan = 0,
}) {
  ensureAudio();
  const osc = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  const panner = audioContext.createStereoPanner();

  osc.type = type;
  osc.frequency.setValueAtTime(frequency, start);
  if (endFrequency) {
    osc.frequency.exponentialRampToValueAtTime(endFrequency, start + duration);
  }

  gainNode.gain.setValueAtTime(0.0001, start);
  gainNode.gain.exponentialRampToValueAtTime(gainValue, start + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(endGain, start + duration);

  panner.pan.value = pan;

  osc.connect(panner);
  panner.connect(gainNode);
  gainNode.connect(masterGain);

  osc.start(start);
  osc.stop(start + duration);
}

function playNoiseBurst({ start, duration, gainValue, filterFreq = 1800 }) {
  ensureAudio();
  const buffer = audioContext.createBuffer(1, audioContext.sampleRate * duration, audioContext.sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < data.length; i += 1) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  }

  const source = audioContext.createBufferSource();
  source.buffer = buffer;

  const filter = audioContext.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = filterFreq;

  const gainNode = audioContext.createGain();
  gainNode.gain.setValueAtTime(0.0001, start);
  gainNode.gain.exponentialRampToValueAtTime(gainValue, start + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  source.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(masterGain);

  source.start(start);
  source.stop(start + duration);
}

function playSound(kind) {
  if (!kitEnabled) return;

  const now = audioContext ? audioContext.currentTime : 0;

  switch (kind) {
    case 'kick':
      playTone({
        type: 'sine',
        start: now,
        duration: 0.18,
        frequency: 120,
        endFrequency: 40,
        gainValue: 0.9,
        endGain: 0.001,
      });
      break;
    case 'snare':
      playNoiseBurst({ start: now, duration: 0.12, gainValue: 0.75, filterFreq: 2200 });
      playTone({
        type: 'triangle',
        start: now,
        duration: 0.08,
        frequency: 180,
        endFrequency: 100,
        gainValue: 0.5,
        endGain: 0.001,
      });
      break;
    case 'hat':
      playTone({
        type: 'square',
        start: now,
        duration: 0.04,
        frequency: 5000,
        endFrequency: 4500,
        gainValue: 0.2,
        endGain: 0.0001,
      });
      break;
    case 'clap':
      [0, 0.03, 0.06].forEach((offset) => {
        playTone({
          type: 'square',
          start: now + offset,
          duration: 0.08,
          frequency: 180 + offset * 600,
          endFrequency: 140,
          gainValue: 0.18,
          endGain: 0.001,
        });
      });
      break;
    case 'tom':
      playTone({
        type: 'triangle',
        start: now,
        duration: 0.2,
        frequency: 200,
        endFrequency: 90,
        gainValue: 0.42,
        endGain: 0.001,
      });
      break;
    case 'ride':
      playTone({
        type: 'sawtooth',
        start: now,
        duration: 0.07,
        frequency: 2600,
        endFrequency: 2000,
        gainValue: 0.18,
        endGain: 0.0001,
      });
      break;
    case 'perc':
      playTone({
        type: 'square',
        start: now,
        duration: 0.09,
        frequency: 240,
        endFrequency: 120,
        gainValue: 0.3,
        endGain: 0.001,
      });
      break;
    case 'bass':
      playTone({
        type: 'sawtooth',
        start: now,
        duration: 0.34,
        frequency: 55,
        endFrequency: 45,
        gainValue: 0.25,
        endGain: 0.001,
      });
      break;
    case 'fx1':
      playTone({
        type: 'triangle',
        start: now,
        duration: 0.28,
        frequency: 260,
        endFrequency: 440,
        gainValue: 0.18,
        endGain: 0.001,
      });
      break;
    case 'fx2':
      playTone({
        type: 'sine',
        start: now,
        duration: 0.38,
        frequency: 700,
        endFrequency: 260,
        gainValue: 0.15,
        endGain: 0.001,
        pan: 0.8,
      });
      break;
    case 'chord':
      [220, 277, 330].forEach((freq, index) => {
        playTone({
          type: 'triangle',
          start: now + index * 0.02,
          duration: 0.45,
          frequency: freq,
          endFrequency: freq * 0.9,
          gainValue: 0.08,
          endGain: 0.001,
        });
      });
      break;
    case 'lead':
      playTone({
        type: 'sawtooth',
        start: now,
        duration: 0.22,
        frequency: 660,
        endFrequency: 900,
        gainValue: 0.15,
        endGain: 0.001,
      });
      break;
    case 'vox':
      playTone({
        type: 'sine',
        start: now,
        duration: 0.42,
        frequency: 440,
        endFrequency: 620,
        gainValue: 0.12,
        endGain: 0.001,
      });
      break;
    case 'crash':
      playTone({
        type: 'triangle',
        start: now,
        duration: 0.35,
        frequency: 900,
        endFrequency: 700,
        gainValue: 0.2,
        endGain: 0.0001,
      });
      break;
    case 'sub':
      playTone({
        type: 'sine',
        start: now,
        duration: 0.6,
        frequency: 52,
        endFrequency: 46,
        gainValue: 0.4,
        endGain: 0.001,
      });
      break;
    case 'drop':
      [
        { type: 'sawtooth', freq: 90 },
        { type: 'square', freq: 120 },
      ].forEach(({ type, freq }, index) => {
        playTone({
          type,
          start: now + index * 0.08,
          duration: 0.2,
          frequency: freq,
          endFrequency: freq * 0.85,
          gainValue: 0.18,
          endGain: 0.001,
        });
      });
      break;
    default:
      break;
  }
}

function triggerPad(pad) {
  const sound = pad.dataset.sound;
  const key = pad.dataset.key;
  if (!pad) return;
  playSound(sound);
  animatePadByKey(key);
  pad.classList.add('active');
  setTimeout(() => pad.classList.remove('active'), 120);
}

pads.forEach((pad) => {
  pad.addEventListener('click', () => triggerPad(pad));
});

document.addEventListener('keydown', (event) => {
  const key = event.key.toUpperCase();
  const pad = pads.find((item) => item.dataset.key === key);
  if (!pad) return;

  event.preventDefault();
  triggerPad(pad);
});

powerToggle.addEventListener('click', () => {
  kitEnabled = !kitEnabled;
  powerToggle.classList.toggle('active', kitEnabled);
  powerToggle.textContent = kitEnabled ? 'On' : 'Off';
});

loopToggle.addEventListener('click', () => {
  autoLoop = !autoLoop;
  loopToggle.classList.toggle('active', autoLoop);

  if (autoLoop) {
    const stepMs = 60000 / Number(bpmSlider.value) / 2;
    loopTimer = setInterval(() => {
      const randomPad = pads[Math.floor(Math.random() * pads.length)];
      if (randomPad) triggerPad(randomPad);
    }, stepMs);
  } else {
    clearInterval(loopTimer);
  }
});

masterVolume.addEventListener('input', () => {
  masterValue.textContent = masterVolume.value;
  if (masterGain) {
    masterGain.gain.value = Number(masterVolume.value) / 100;
  }
});

trackVolume.addEventListener('input', () => {
  trackValue.textContent = trackVolume.value;
  if (currentTrack) {
    currentTrack.volume = Number(trackVolume.value) / 100;
  }
});

bpmSlider.addEventListener('input', () => {
  bpmValue.textContent = bpmSlider.value;

  if (autoLoop && loopTimer) {
    clearInterval(loopTimer);
    const stepMs = 60000 / Number(bpmSlider.value) / 2;
    loopTimer = setInterval(() => {
      const randomPad = pads[Math.floor(Math.random() * pads.length)];
      if (randomPad) triggerPad(randomPad);
    }, stepMs);
  }
});

function updateVisualizer() {
  const bars = visualizer.querySelectorAll('.bar');
  bars.forEach((bar, index) => {
    const height = 18 + Math.random() * 82;
    bar.style.height = `${height}%`;
    bar.style.animationDelay = `${(index * 0.07).toFixed(2)}s`;
  });
}

setInterval(updateVisualizer, 260);

function loadedTrack(file) {
  if (!file) return;

  if (currentTrackURL) {
    URL.revokeObjectURL(currentTrackURL);
  }

  currentTrackURL = URL.createObjectURL(file);
  currentTrack = new Audio(currentTrackURL);
  currentTrack.loop = true;
  currentTrack.volume = Number(trackVolume.value) / 100;

  trackName.textContent = file.name;
  trackStatus.textContent = 'Ready';

  currentTrack.addEventListener('play', () => {
    trackStatus.textContent = 'Playing';
  });

  currentTrack.addEventListener('pause', () => {
    trackStatus.textContent = 'Paused';
  });

  currentTrack.addEventListener('ended', () => {
    trackStatus.textContent = 'Ended';
  });
}

audioFileInput.addEventListener('change', (event) => {
  const [file] = event.target.files;
  if (file) {
    loadedTrack(file);
  }
});

playTrackBtn.addEventListener('click', () => {
  if (!currentTrack) {
    alert('Import a music file first.');
    return;
  }

  currentTrack.play();
});

pauseTrackBtn.addEventListener('click', () => {
  if (currentTrack) currentTrack.pause();
});

stopTrackBtn.addEventListener('click', () => {
  if (currentTrack) {
    currentTrack.pause();
    currentTrack.currentTime = 0;
    trackStatus.textContent = 'Stopped';
  }
});

playKitBtn.addEventListener('click', () => {
  kitEnabled = true;
  powerToggle.classList.add('active');
  powerToggle.textContent = 'On';
});

muteKitBtn.addEventListener('click', () => {
  kitEnabled = false;
  powerToggle.classList.remove('active');
  powerToggle.textContent = 'Off';
});

tapTempoBtn.addEventListener('click', () => {
  const now = Date.now();
  if (!lastTap) {
    lastTap = now;
    tapTimes = [now];
    return;
  }

  tapTimes.push(now);
  if (tapTimes.length > 4) tapTimes.shift();

  const diffs = [];
  for (let i = 1; i < tapTimes.length; i += 1) {
    diffs.push(tapTimes[i] - tapTimes[i - 1]);
  }

  if (diffs.length > 0) {
    const avg = diffs.reduce((a, b) => a + b, 0) / diffs.length;
    const bpm = Math.round(60000 / avg);
    const clamped = Math.min(180, Math.max(70, bpm));
    bpmSlider.value = clamped;
    bpmValue.textContent = String(clamped);
  }

  lastTap = now;
});

masterValue.textContent = masterVolume.value;
trackValue.textContent = trackVolume.value;
bpmValue.textContent = bpmSlider.value;

function initAudio() {
  ensureAudio();
}

window.addEventListener('pointerdown', initAudio, { once: true });


































































































































































































































































































































































































































































