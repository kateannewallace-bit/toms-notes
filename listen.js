/* Listening to a real piano through the microphone. NoteTracker is pure (samples in, notes out); mic wires it to the device. */

/* ---------- pitch: the YIN method, on samples thinned to about 24 kHz ---------- */
const PITCH_MIN = 50, PITCH_MAX = 1500;
function detectPitch(samples, sampleRate) {
  const skip = sampleRate > 30000 ? 2 : 1, rate = sampleRate / skip, n = Math.floor(samples.length / skip);
  const x = new Float32Array(n);
  for (let i = 0; i < n; i++) x[i] = skip === 2 ? (samples[2 * i] + samples[2 * i + 1]) / 2 : samples[i];
  const tauMax = Math.min(Math.floor(rate / PITCH_MIN), Math.floor(n / 2)), tauMin = Math.floor(rate / PITCH_MAX), w = n - tauMax;
  const d = new Float32Array(tauMax + 1);
  for (let tau = 1; tau <= tauMax; tau++) {
    let sum = 0;
    for (let i = 0; i < w; i++) { const v = x[i] - x[i + tau]; sum += v * v; }
    d[tau] = sum;
  }
  // normalize, then take the first clear dip: that's the true period rather than a multiple of it
  let running = 0, found = -1;
  const cm = new Float32Array(tauMax + 1);
  cm[0] = 1;
  for (let tau = 1; tau <= tauMax; tau++) { running += d[tau]; cm[tau] = running ? d[tau] * tau / running : 1; }
  for (let tau = Math.max(2, tauMin); tau < tauMax; tau++) {
    if (cm[tau] < 0.15) {
      while (tau + 1 < tauMax && cm[tau + 1] < cm[tau]) tau++;
      found = tau;
      break;
    }
  }
  if (found < 0) return null;
  const a = cm[found - 1], b = cm[found], c = cm[found + 1], bend = a + c - 2 * b;
  const period = found + (bend ? (a - c) / (2 * bend) : 0), freq = rate / period;
  return freq >= PITCH_MIN && freq <= PITCH_MAX ? { freq, clarity: 1 - b } : null;
}
const midiFromFreq = f => Math.round(69 + 12 * Math.log2(f / 440));

/* ---------- from pitches to notes played ---------- */
// feed() takes one frame and returns a MIDI note number the moment a new note is sure, else null.
// A note must hold steady for a few frames, and a ringing note can't fire twice: it takes a fresh attack or silence.
class NoteTracker {
  constructor() { this.candidate = null; this.count = 0; this.armed = true; this.last = null; this.floor = 0.002; this.smooth = 0; this.current = null; this.level = 0; this.sinceAttack = 99; this.prev = 0; this.peak = 0; }
  feed(samples, sampleRate) {
    let e = 0;
    for (let i = 0; i < samples.length; i++) e += samples[i] * samples[i];
    const rms = Math.sqrt(e / samples.length);
    this.level = rms;
    // the room's background level follows quiet moments quickly and loud ones very slowly
    this.floor = rms < this.floor ? this.floor * 0.8 + rms * 0.2 : this.floor * 1.002;
    this.floor = Math.max(0.0005, this.floor);
    const loud = rms > Math.max(0.002, this.floor * 3);
    // one strike stays loud across several overlapping frames, so it only counts as one attack
    this.sinceAttack++;
    const rising = rms > this.prev * 1.15;
    this.prev = rms;
    const attack = rising && this.sinceAttack >= 4 && rms > this.smooth * 1.3 && rms > Math.max(0.002, this.floor * 3);
    if (attack) this.sinceAttack = 0;
    this.smooth = this.smooth * 0.7 + rms * 0.3;
    if (!loud) { this.candidate = null; this.count = 0; this.armed = true; this.current = null; this.peak = 0; return null; }
    if (attack) this.armed = true;
    const pitch = detectPitch(samples, sampleRate);
    if (!pitch) { this.count = 0; return null; }
    const midi = midiFromFreq(pitch.freq);
    if (midi === this.candidate) this.count++; else { this.candidate = midi; this.count = 1; }
    this.current = midi;
    const newName = this.last == null || midi % 12 !== this.last % 12;
    this.peak = Math.max(this.peak, rms);
    // a ringing piano note swells and fades as it dies away; striking the same key again has to come back near its full strength
    if (!newName && rms < this.peak * .7) { this.armed = false; return null; }
    // a clearly different note counts even without a sharp attack; the same one needs a fresh strike
    if ((this.armed && this.count >= 3) || (newName && this.count >= 5)) {
      this.armed = false; this.last = midi; this.count = 0; this.peak = rms;
      return midi;
    }
    return null;
  }
}

/* ---------- the microphone ---------- */
const FRAME_SIZE = 4096, FRAME_MS = 50;
const mic = { status: 'off', stream: null, source: null, analyser: null, timer: null, tracker: null, onNote: null, onFrame: null, onStatus: null };
function micSetStatus(s) { mic.status = s; mic.onStatus?.(s); }
function micListenTo(node) {
  const a = audioReady();
  mic.source = node;
  mic.analyser = a.createAnalyser();
  mic.analyser.fftSize = FRAME_SIZE;
  node.connect(mic.analyser);
  mic.tracker = new NoteTracker();
  const buf = new Float32Array(FRAME_SIZE);
  clearInterval(mic.timer);
  mic.timer = setInterval(() => {
    mic.analyser.getFloatTimeDomainData(buf);
    // the app's own sounds must not count as the child playing
    if (performance.now() < soundingUntil) { mic.tracker.armed = true; mic.tracker.count = 0; return; }
    const note = mic.tracker.feed(buf, a.sampleRate);
    mic.onFrame?.(mic.tracker);
    if (note != null) mic.onNote?.(note);
  }, FRAME_MS);
}
async function startMic() {
  if (mic.status === 'on' || mic.status === 'asking') return;
  if (!navigator.mediaDevices?.getUserMedia) return micSetStatus('none');
  micSetStatus('asking');
  try {
    // Phone voice processing would treat a piano as noise, so it's all switched off.
    mic.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    micListenTo(audioReady().createMediaStreamSource(mic.stream));
    micSetStatus('on');
  } catch (e) {
    micSetStatus(e.name === 'NotAllowedError' ? 'denied' : 'none');
  }
}
function stopMic() {
  clearInterval(mic.timer);
  mic.timer = null;
  try { mic.source?.disconnect(); } catch (e) {}
  mic.stream?.getTracks().forEach(t => t.stop());
  mic.stream = mic.source = mic.analyser = mic.tracker = null;
  if (mic.status !== 'off') micSetStatus('off');
}
