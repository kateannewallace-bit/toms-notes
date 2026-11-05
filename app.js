// All problem randomness goes through rng(), which makeProblem seeds so a missed problem can come back exactly.
let rng = Math.random;
function seeded(seed) { let t = seed >>> 0; return () => { t += 0x6D2B79F5; let r = Math.imul(t ^ (t >>> 15), 1 | t); r ^= r + Math.imul(r ^ (r >>> 7), 61 | r); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; }; }
const newSeed = () => Math.floor(Math.random() * 2 ** 31);
const pick = a => a[Math.floor(rng() * a.length)];
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const childName = () => (state.childName || '').trim();
const N = () => childName() || 'your child';
const greet = s => childName() ? `${s}, ${childName()}!` : `${s}!`;

/* ---------- topics and items ---------- */
const TOPIC = Object.fromEntries(TOPICS.map(t => [t.id, t]));
const ORDER = TOPICS.map(t => t.id);
const UNLOCK_ORDER = ['reading', 'keys', 'rhythm', 'measure', 'accidentals', 'marks', 'ears'];
const maxLevel = k => LEVELS[k].length;
const widOf = it => it.wid || (it.twin ? 'twin:' + it.p : `${it.keyOnly ? 'k:' : ''}${it.clef}:${it.p}`);
for (const k of ORDER) for (const lv of LEVELS[k]) for (const it of lv.items) { it.wid = widOf(it); it.topic = k; }
const allItems = k => LEVELS[k].flatMap(l => l.items);
const findItem = (k, wid) => allItems(k).find(i => i.wid === wid);
const anyItem = wid => { for (const k of ORDER) { const i = findItem(k, wid); if (i) return i; } return null; };
const midCName = p => p === 'C4' ? 'Middle C' : prettyName(p);
const DUR_NAME = { w: 'Whole note', h: 'Half note', q: 'Quarter note', e: 'Eighth note', s: 'Sixteenth note', 'h.': 'Dotted half note', 'q.': 'Dotted quarter note' };
const REST_NAME = { w: 'Whole rest', h: 'Half rest', q: 'Quarter rest', e: 'Eighth rest' };
const durPhrase = d => `${/^[e]/i.test(DUR_NAME[d]) ? 'an' : 'a'} ${DUR_NAME[d].toLowerCase()}`;
const beatWord = b => b === 0.25 ? 'a quarter of a beat' : b === 0.5 ? 'half a beat' : b === 1.5 ? 'one and a half beats' : b === 1 ? '1 beat' : `${b} beats`;
const beatNum = b => b === 0.25 ? '¼' : b === 0.5 ? '½' : b === 1.5 ? '1½' : String(b);
const itemLabel = i => i.note ? `${prettySym(i.p)} (${CLEF[i.clef].name}${i.keyOnly ? ', on the keys' : ''})` : i.twin ? `Twin ${prettySym(i.p)}` : i.dur ? DUR_NAME[i.dur] : i.rest ? REST_NAME[i.rest] : i.mark ? MARKS[i.mark].word : i.whiteKey ? `Key ${i.whiteKey}` : i.group ? `Group of ${i.group} black keys` : i.findKey ? prettySym(i.findKey + '4') : i.wid;

/* ---------- state ---------- */
const REVIEW_DAYS = [1, 3, 7, 14, 30], DAY = 86400000;
const startOfDay = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); };
function defaultState() {
  return {
    childName: 'Tom', levels: Object.fromEntries(ORDER.map(k => [k, 1])),
    on: { path: true, reading: true },
    rec: {}, mastered: {}, words: {}, cards: [], cleared: 0, chapters: {}, songs: {},
    sessions: [], log: [], done: {}, total: 0, perSession: 10, autoSpeak: false, realPiano: false, answerWith: 'letters',  speed: 'normal', updatedAt: 0,
  };
}
function normalize(s) {
  s = Object.assign(defaultState(), s || {});
  s.levels = Object.assign(defaultState().levels, s.levels);
  s.on = Object.assign({}, s.on);
  s.mastered = Object.assign({}, s.mastered);
  for (const k of Object.keys(s.mastered)) if (LEVELS[k] && (s.levels[k] || 1) < LEVELS[k].length) { delete s.mastered[k]; s.levels[k]++; }
  // The note topics were once ledger, treble and bass. They are one path now: known notes keep counting, and review cards carry over.
  if (s.on.ledger || s.on.treble || s.on.bass || s.levels.ledger) {
    delete s.on.ledger; delete s.on.treble; delete s.on.bass;
    s.on.path = true;
    for (const k of ['ledger', 'treble', 'bass']) delete s.levels[k];
    const levelOf = wid => LEVELS.path.findIndex(l => l.items.some(i => i.wid === wid)) + 1;
    const oldTopic = c => ['ledger', 'treble', 'bass'].includes(c.topic);
    s.cards = s.cards.filter(c => !oldTopic(c) || levelOf(c.wid) > 0).map(c => oldTopic(c) ? { ...c, topic: 'path', level: levelOf(c.wid) } : c);
    const open = LEVELS.path.findIndex(l => !l.items.every(i => { const w = s.words[i.wid]; return w && (w.k || (w.r || 0) - (w.m || 0) >= 2); }));
    s.levels.path = open < 0 ? LEVELS.path.length : open + 1;
  }
  return s;
}

/* ---------- storage: this device first, Supabase sync when a sync code is set ---------- */
const LS_KEY = 'toms-notes-v1';
const CODE_KEY = 'toms-notes-sync-code';
const CFG = window.NOTES_CONFIG || {};
const syncAvailable = !!(CFG.supabaseUrl && CFG.supabaseKey && window.crypto?.subtle);
function loadLocal() { try { const t = localStorage.getItem(LS_KEY); return t ? JSON.parse(t) : null; } catch (e) { return null; } }
function saveLocal() { try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch (e) {} }
let state = normalize(loadLocal());
let micTest = false, micLog = [];
let screen = 'home', sess = null, lastChanges = [], song = null, confirmWipe = false, confirmTopic = null;
const sync = { code: '', key: '', status: 'off', lastAt: 0, saving: false, dirty: false, error: '' };
try { sync.code = localStorage.getItem(CODE_KEY) || ''; } catch (e) {}

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function newCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  const raw = [...bytes].map(b => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
  return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8)}`;
}
function cleanCode(c) {
  const raw = String(c).toUpperCase().replace(/[^A-Z0-9]/g, '');
  return raw.length === 12 ? `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8)}` : '';
}
// Shares the Chalkboard's Supabase table; the different prefix keeps this app's progress in its own row.
async function keyFor(code) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('toms-notes:' + code));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}
async function rpc(fn, body) {
  const res = await fetch(`${CFG.supabaseUrl}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: Object.assign({ apikey: CFG.supabaseKey, 'Content-Type': 'application/json' }, CFG.supabaseKey.startsWith('sb_') ? {} : { Authorization: `Bearer ${CFG.supabaseKey}` }),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${fn} failed (${res.status})`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}
async function pushRemote() {
  if (!sync.key) return;
  if (sync.saving) { sync.dirty = true; return; }
  sync.saving = true;
  try { await rpc('chalkboard_save', { p_key: sync.key, p_data: state }); sync.status = 'ok'; sync.lastAt = Date.now(); sync.error = ''; }
  catch (e) { sync.status = 'error'; sync.error = navigator.onLine === false ? 'offline' : String(e.message || e); }
  sync.saving = false;
  if (screen === 'parent') render();
  if (sync.dirty) { sync.dirty = false; pushRemote(); }
}
// The newer copy wins: progress is saved after every answer, so the newest device has everything.
async function pullRemote() {
  if (!sync.key) return;
  try {
    const remote = await rpc('chalkboard_get', { p_key: sync.key });
    sync.status = 'ok'; sync.lastAt = Date.now(); sync.error = '';
    if (remote && (remote.updatedAt || 0) > (state.updatedAt || 0)) { state = normalize(remote); saveLocal(); }
    else if (!remote || (remote.updatedAt || 0) < (state.updatedAt || 0)) pushRemote();
  } catch (e) { sync.status = 'error'; sync.error = navigator.onLine === false ? 'offline' : String(e.message || e); }
  if (screen === 'home' || screen === 'parent') render();
}
async function startSync(code) {
  sync.code = code;
  try { localStorage.setItem(CODE_KEY, code); } catch (e) {}
  sync.key = await keyFor(code);
  sync.status = 'syncing';
  await pullRemote();
}
function stopSync() {
  sync.code = ''; sync.key = ''; sync.status = 'off';
  try { localStorage.removeItem(CODE_KEY); } catch (e) {}
}
function save() { state.updatedAt = Date.now(); saveLocal(); pushRemote(); }
function initSync() {
  if (!syncAvailable) return;
  if (sync.code) startSync(sync.code);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') pullRemote(); });
  window.addEventListener('online', () => pullRemote());
}

/* ---------- speech ---------- */
const canSpeak = 'speechSynthesis' in window;
const VOICE_PREF = ['Samantha', 'Ava', 'Allison', 'Google US English', 'Microsoft Aria', 'Karen', 'Daniel'];
function chosenVoice() {
  let voices = [];
  try { voices = speechSynthesis.getVoices().filter(v => /^en/i.test(v.lang)); } catch (e) {}
  for (const name of VOICE_PREF) { const hit = voices.find(v => v.name.startsWith(name)); if (hit) return hit; }
  return voices[0] || null;
}
function say(text) {
  if (!canSpeak || !text) return;
  try {
    speechSynthesis.cancel();
    const v = chosenVoice(), u = new SpeechSynthesisUtterance(text.replaceAll('♯', ' sharp').replaceAll('♭', ' flat'));
    u.lang = v ? v.lang : 'en-US';
    if (v) u.voice = v;
    u.rate = state.speed === 'slow' ? 0.8 : 0.95;
    speechSynthesis.speak(u);
  } catch (e) {}
}

/* ---------- what's known ---------- */
const rec = wid => state.words[wid];
const isKnown = wid => { const w = rec(wid); return !!w && (!!w.k || (w.r || 0) - (w.m || 0) >= 2); };
const isSeen = wid => !!rec(wid);
// Rhythm questions play against a metronome: a slow beat, a bar counted in first, and a bar after the music.
const BEAT_BPM = 72;
const playHear = (list, onBeat) => playSeq(list, onBeat ? BEAT_BPM : undefined, null, onBeat ? { tail: true } : null);
const knownNotes = () => new Set(ORDER.flatMap(k => allItems(k)).filter(i => i.note && !i.keyOnly && isKnown(i.wid)).map(i => `${i.clef}:${i.p}`));

/* ---------- listening to the real piano ---------- */
const listenMode = () => state.answerWith === 'listen';
const hearing = () => listenMode() && mic.status === 'on';
// The microphone reports a note. It only names the letter for sure: pianos fool pitch detection about the octave, so any octave counts.
function micNote(midi) {
  if (micTest && screen === 'parent') {
    micLog = [`${keyName(midi)}, MIDI ${midi}`, ...micLog].slice(0, 8);
    const ul = document.getElementById('mic-log');
    if (ul) ul.innerHTML = micLog.map(x => `<li><span>${esc(x)}</span></li>`).join('');
    return;
  }
  if (screen === 'song' && song) return songTap(midi);
  if (screen !== 'play' || !sess) return;
  const p = sess.probs[sess.i];
  if (p.mode === 'row') rowPress(keyName(midi));
  else if (p.mode === 'key' && !p.onScreen) tapKey(midi);
}
// An iPad can play sound very quietly while its microphone is on, so "hear it" buttons switch it off first. The next slide turns it back on.
function freeSpeaker() { if (mic.status === 'on') stopMic(); }
mic.onNote = midi => micNote(midi);
mic.onStatus = () => { if (screen === 'play' || screen === 'song' || screen === 'parent') render(); };
mic.onFrame = t => {
  const bar = document.getElementById('mic-level');
  if (bar) bar.style.width = `${Math.min(100, Math.round(Math.sqrt(t.level) * 220))}%`;
  const heard = document.getElementById('heard');
  if (heard) heard.textContent = t.current != null ? `Hearing ${keyName(t.current)}` : '';
  const exact = document.getElementById('heard-exact');
  if (exact && t.current != null) exact.textContent = `${keyName(t.current)}, ${t.current === MIDDLE_C ? 'Middle C' : `${t.current > MIDDLE_C ? 'above' : 'below'} Middle C`} (MIDI ${t.current})`;
};
const listenPanel = text => `<div class="listen-panel"><span class="listen-dot"></span><span class="listen-text">${esc(text)}</span><strong id="heard" class="heard"></strong><span class="mic-bar"><i id="mic-level"></i></span></div>`;
const micProblem = () => !listenMode() || mic.status === 'on' ? '' : `<p class="note center">${mic.status === 'asking' ? 'Asking to use the microphone…' : mic.status === 'denied' ? 'The microphone is blocked, so use the buttons for now. A grown-up can allow it in Settings.' : 'This device can’t listen right now, so use the buttons for now.'}</p>`;

/* ---------- making problems ---------- */
// Every problem: { mode, prompt, choices[{ t | vis, ok }], layout, ... }. There is always exactly one defensible answer.
const LETTER_CHOICES = () => 'ABCDEFG'.split('');
const smallRhythm = (list, o = {}) => staffSvg({ clef: 't', S: o.S || 11, width: o.width || 240, time: o.time, items: list.map(x => x === '|' ? { bar: 1 } : x[0] === 'r' ? { r: x.slice(1) } : x === 'gap' ? { gap: 'q' } : { p: 'G4', d: x }), noClef: !o.clef, lo: stepOf('E4'), hi: stepOf('F5'), cl: 'rh' });
const RHYTHM_AT = lv => lv >= 10 ? ['q', 'h', 'w', 'e', 's', 'h.', 'q.'] : lv >= 4 ? ['q', 'h', 'w', 'e', 'h.', 'q.'] : lv >= 2 ? ['q', 'h', 'w', 'e'] : ['q', 'h', 'w'];
const beatsOf = d => BEATS[d[0] === 'r' ? d.slice(1) : d];
const barBeats = bar => bar.reduce((t, d) => t + beatsOf(d), 0);
const seqOf = (list, midi = 67) => list.map(d => d[0] === 'r' ? { beats: beatsOf(d) } : { midi, beats: BEATS[d] });

// Notes already asked this round, so a new note's second question can be a different kind.
const roundSeen = new Set();
function makeProblem(k, level, seed, kind = 'current', wid) {
  rng = seeded(seed);
  const pool = LEVELS[k][Math.min(level, maxLevel(k)) - 1].items;
  const item = (wid && findItem(k, wid)) || pick(pool);
  const p = { topic: k, level, seed, kind, wid: item.wid, item, tries: 0, wrong: [], done: false, choices: [] };
  if (item.note) noteProblem(p, item, k);
  else if (item.twin) twinProblem(p, item);
  else if (item.group || item.whiteKey || item.middle || item.findKey || item.nameBlack) keyProblem(p, item);
  else if (item.keyTask) keyTaskProblem(p, item);
  else if (item.dur || item.rest || item.sum || item.hearRhythm || item.tie) rhythmProblem(p, item);
  else if (item.fact || item.fill || item.wrongBar || item.beatQ || item.timeSym) measureProblem(p, item);
  else if (item.accSym || item.enh || item.cancel || item.ks || item.ksPlay) accidentalProblem(p, item);
  else if (item.mark || item.markBack) markProblem(p, item);
  else if (item.ear || item.see) earProblem(p, item);
  rng = Math.random;
  return p;
}

function noteProblem(p, it, k) {
  const c = it.clef, s = stepOf(it.p);
  p.clef = c; p.p = it.p; p.step = s; p.letter = letterOf(s);
  p.acc = parseP(it.p).acc;
  // only the place-the-note question needs room held for notes that aren't there yet
  p.lo = CLEF[c].bottom - 7;
  p.hi = topOf(c) + 7;
  p.hearP = it.p;
  p.answerText = () => `${midCName(it.p)}, ${describe(c, s)}.`;
  const roll = rng();
  let mode = 'letters';
  if (it.keyOnly) mode = 'key';
  else if (p.kind === 'check' || (!isSeen(it.wid) && !roundSeen.has(it.wid))) mode = 'letters';
  else if (roll < .6) mode = 'row';
  else if (roll < .75) mode = 'place';
  else if (roll < .9) mode = 'key';
  else mode = 'row';
  if (mode === 'row' && buildRow(p, it, k)) return;
  if (mode === 'row') mode = LEVELS[k].slice(0, p.level).some(l => l.items.some(i => i.note && parseP(i.p).letter !== p.letter)) ? 'letters' : pick(['place', 'key']);
  // the grown-ups' setting: answer with piano keys instead of letter buttons
  if (mode === 'letters' && p.kind !== 'check' && (state.answerWith === 'mix' ? rng() < .5 : state.answerWith !== 'letters')) mode = 'key';
  if (mode === 'key') {
    p.mode = state.realPiano && !listenMode() ? 'real' : 'key';
    delete p.lo; delete p.hi;
    p.prompt = p.mode === 'real' ? 'Find this note on your piano and play it.' : 'Find this note on the piano.';
    p.targetMidi = midiOf(it.p);
    p.whites = 11;
    p.from = pianoWindow(s, rng);
    p.pianoOpts = { letters: 'c' };
    return;
  }
  if (mode === 'place') {
    p.mode = 'place';
    const reg = regionOf(c, s), where = reg === 'on' ? 'on the staff' : `${reg} the staff`;
    p.prompt = `Put ${midCName(it.p)} ${where}.`;
    p.sel = null;
    return;
  }
  p.mode = 'choice';
  delete p.lo; delete p.hi;
  p.prompt = 'What note is this?';
  p.layout = 'letters';
  p.choices = LETTER_CHOICES().map(l => ({ t: l, ok: l === p.letter }));
}
// A row of notes on one staff, read left to right, one button press per note. The row is a short pattern that repeats: C D C D C D.
// The pattern holds this note plus others already met on the same clef, close enough to fit one stretch of keys.
function buildRow(p, it, k) {
  const c = it.clef, s = stepOf(it.p);
  const met = LEVELS[k].slice(0, p.level).flatMap(l => l.items).filter(i => i.note && i.clef === c && Math.abs(stepOf(i.p) - s) <= 9 && (i === it || isSeen(i.wid) || roundSeen.has(i.wid)));
  const others = shuffle(met.filter(i => i.p !== it.p));
  if (!others.length) return false;
  // longer patterns come once there are more notes to choose from
  const longest = others.length >= 5 ? 4 : others.length >= 2 ? 3 : 2;
  const size = 2 + Math.floor(rng() * (longest - 1));
  const pattern = shuffle([it, ...others.slice(0, size - 1)]);
  const row = Array.from({ length: size === 4 ? 8 : 6 }, (_, i) => pattern[i % size]);
  p.mode = 'row';
  p.prompt = 'Read the notes from left to right.';
  p.notes = row.map(i => ({ wid: i.wid, p: i.p, step: stepOf(i.p), tries: 0, state: '' }));
  p.at = 0; p.misses = 0;
  // in a mix, each row is all letters or all keys, so the buttons never change partway through
  if ((state.answerWith === 'piano' || (state.answerWith === 'mix' && rng() < .5)) && !state.realPiano) {
    const steps = p.notes.map(x => x.step), lo = Math.min(...steps), hi = Math.max(...steps);
    p.from = lo - 1; p.whites = Math.max(8, hi - lo + 3); p.rowKeys = true;
  }
  return true;
}
function twinProblem(p, it) {
  const from = pick(['t', 'b']), to = from === 't' ? 'b' : 't', s = stepOf(it.p);
  const others = shuffle([-3, -2, -1, 1, 2, 3]).slice(0, 2).map(d => s + d);
  p.mode = 'choice'; p.layout = 'vis'; p.clef = from; p.p = it.p; p.step = s; p.hearP = it.p;
  p.lo = Math.min(s - 3, CLEF.t.bottom); p.hi = Math.max(s + 3, topOf('b'));
  p.prompt = `Which ${CLEF[to].name} note is the same piano key?`;
  p.choices = shuffle([s, ...others]).map(x => ({ ok: x === s, label: pitchOf(x), vis: staffSvg({ clef: to, S: 9, width: 130, lo: s - 3, hi: s + 3, items: [{ p: pitchOf(x) }], cl: 'mini' }) }));
  p.answerText = () => `Both are ${midCName(it.p)}: the same key, written two ways.`;
}
function keyProblem(p, it) {
  p.mode = 'key'; p.whites = 11;
  p.pianoOpts = { letters: false, star: false };
  const r = rng();
  if (it.group) {
    const pcs = it.group === 2 ? [1, 3] : [6, 8, 10];
    p.prompt = `Tap a black key in a group of ${it.group === 2 ? 'TWO' : 'THREE'}.`;
    p.okMidi = m => pcs.includes(m % 12);
    p.from = stepOf('C3') + Math.floor(r * 7);
    p.answerText = () => `Groups of ${it.group} black keys come back again and again along the piano.`;
  } else if (it.whiteKey) {
    const l = it.whiteKey, pc = SEMIS[LETTERS.indexOf(l)];
    p.from = stepOf('C3') + Math.floor(rng() * 7);
    if (r < .35 && isSeen(it.wid)) {
      // name a lit key
      const steps = Array.from({ length: 11 }, (_, i) => p.from + i).filter(s => letterOf(s) === l && s > p.from);
      const s = pick(steps);
      p.mode = 'choice'; p.layout = 'letters'; p.prompt = 'What key is this?';
      p.hl = whiteMidi(s);
      p.choices = LETTER_CHOICES().map(x => ({ t: x, ok: x === l }));
      p.hearMidi = p.hl;
      p.answerText = () => `That key is ${l}.`;
    } else {
      p.prompt = `Tap any ${l}.`;
      p.okMidi = m => m % 12 === pc;
      p.answerText = () => `${l}: ${{ C: 'just left of the two black keys', D: 'between the two black keys', E: 'just right of the two black keys', F: 'just left of the three black keys', G: 'between the first two of the three black keys', A: 'between the last two of the three black keys', B: 'just right of the three black keys' }[l]}.`;
    }
  } else if (it.nameBlack) {
    const blacks = [61, 63, 66, 68, 70], m = pick(blacks);
    p.mode = 'choice'; p.from = stepOf('C4'); p.whites = 8;
    p.keyStrip = { from: stepOf('C4'), whites: 8, marks: { [m]: 'hl' }, letters: false, star: false };
    p.prompt = 'What is this black key called?';
    p.choices = shuffle([m, ...shuffle(blacks.filter(x => x !== m)).slice(0, 2)]).map(x => ({ t: keyName(x), ok: x === m }));
    p.hearMidi = m;
    p.answerText = () => `That black key is ${keyName(m)}.`;
  } else if (it.middle) {
    p.whites = 15; p.from = stepOf('C3');
    p.prompt = 'Tap Middle C.';
    p.targetMidi = MIDDLE_C;
    p.answerText = () => 'Middle C is the C in the middle.';
  } else if (it.findKey) {
    const pc = midiOf(it.findKey + '4') % 12;
    p.prompt = `Tap any ${prettyName(it.findKey + '4')}.`;
    p.pianoOpts = { letters: 'c', star: false };
    p.from = stepOf('C3') + Math.floor(r * 7);
    p.okMidi = m => m % 12 === pc;
    p.answerText = () => `${prettySym(it.findKey + '4')} is this black key.`;
  }
}
// Questions about where one key is from another. These need the exact key, and a microphone can't always tell octaves apart,
// so they stay on the on-screen keys even in Real piano mode.
function keyTaskProblem(p, it) {
  const task = it.keyTask, up = /Up|above/.test(task);
  p.mode = 'key'; p.onScreen = true; p.whites = 15; p.from = stepOf('C3');
  const dir = up ? 'up' : 'down';
  if (task === 'above' || task === 'below') {
    const s = stepOf('C4') + (up ? 1 : -1) * (1 + Math.floor(rng() * 7)), l = letterOf(s);
    p.pianoOpts = { letters: false, star: true };
    p.targetMidi = whiteMidi(s);
    p.prompt = `Tap the ${l} ${task} Middle C.`;
    p.answerText = () => `This is the ${l} ${task} Middle C.`;
    return;
  }
  p.pianoOpts = { letters: 'c', star: false };
  if (task.startsWith('octave')) {
    const s = stepOf('C4') - 3 + Math.floor(rng() * 7);
    p.from = up ? s - 3 : s - 11;
    p.litMidi = whiteMidi(s); p.targetMidi = whiteMidi(s + (up ? 7 : -7));
    p.prompt = `This key is ${letterOf(s)}. Tap the ${letterOf(s)} one octave ${up ? 'higher' : 'lower'}.`;
    p.answerText = () => `An octave ${up ? 'up' : 'down'} from ${letterOf(s)} is the next ${letterOf(s)} ${up ? 'to the right' : 'to the left'}.`;
    return;
  }
  if (task.startsWith('int')) {
    const size = +task[3], word = { 4: 'fourth', 5: 'fifth', 6: 'sixth', 7: 'seventh' }[size];
    const s = stepOf('C4') + Math.floor(rng() * 7), to = s + (up ? 1 : -1) * (size - 1), walk = [];
    for (let x = s; ; x += up ? 1 : -1) { walk.push(letterOf(x)); if (x === to) break; }
    p.from = up ? s - 3 : s - 11;
    p.litMidi = whiteMidi(s); p.targetMidi = whiteMidi(to);
    p.prompt = `This key is ${letterOf(s)}. Tap a ${word} ${dir}.`;
    p.answerText = () => `Count ${size} letters ${dir}: ${walk.join(', ')}.`;
    return;
  }
  p.whites = 11;
  if (task.startsWith('step') || task.startsWith('skip')) {
    const skip = task.startsWith('skip'), s = stepOf('C4') + Math.floor(rng() * 7), to = s + (up ? 1 : -1) * (skip ? 2 : 1);
    p.from = s - 5;
    p.litMidi = whiteMidi(s); p.targetMidi = whiteMidi(to);
    p.prompt = `This key is ${letterOf(s)}. Tap a ${skip ? 'skip' : 'step'} ${dir}.`;
    p.answerText = () => `A ${skip ? 'skip' : 'step'} ${dir} from ${letterOf(s)} is ${letterOf(to)}.`;
    return;
  }
  // half and whole steps can start on any key, black or white, and can land on either
  const whole = task.startsWith('whole'), start = 60 + Math.floor(rng() * 12), to = start + (up ? 1 : -1) * (whole ? 2 : 1);
  p.from = stepOf('C4') - 5 + (start >= 66 ? 3 : 0);
  p.litMidi = start; p.targetMidi = to;
  p.prompt = `Tap a ${whole ? 'whole' : 'half'} step ${dir} from the lit key.`;
  p.answerText = () => whole ? `A whole step ${dir} leaves one key in between: ${keyName(to)}.` : `A half step ${dir} is the very next key: ${keyName(to)}.`;
}
function tiedNotes(a, b) {
  return staffSvg({ clef: 't', S: 15, width: 260, noClef: true, even: true, lo: stepOf('E4'), hi: stepOf('F5'), items: [{ p: 'G4', d: a }, { p: 'G4', d: b }],
    extra: ({ x, Y, S }) => `<path class="tie" d="M${x[0] + S * .4} ${Y(stepOf('G4')) + S * .7}Q${(x[0] + x[1]) / 2} ${Y(stepOf('G4')) + S * 2} ${x[1] - S * .4} ${Y(stepOf('G4')) + S * .7}"/>` });
}
function rhythmProblem(p, it) {
  p.mode = 'choice';
  p.onBeat = true;
  if (it.sum) {
    const groups = { 1: [['q'], ['h'], ['e', 'e']], 2: [['q'], ['h'], ['h.'], ['q.', 'e']], 3: [['q'], ['h'], ['rq'], ['rh'], ['e', 'e'], ['re', 'e']], 4: [['s', 's', 's', 's'], ['e', 'e'], ['q'], ['q.', 'e'], ['h']] }[it.sum];
    let list;
    do { list = Array.from({ length: 2 + Math.floor(rng() * 2) }, () => pick(groups)).flat(); } while (barBeats(list) > 8);
    const ans = barBeats(list);
    p.vis = smallRhythm(list, { width: 280, S: 13 });
    p.prompt = 'How many beats altogether?';
    p.layout = 'nums';
    p.choices = shuffle([ans, ans + 1, ans + 2, Math.max(1, ans - 1) === ans ? ans + 3 : Math.max(1, ans - 1)]).map(x => ({ t: String(x), ok: x === ans }));
    p.answerText = () => `${list.map(d => beatNum(beatsOf(d))).join(' + ')} = ${ans}`;
    p.hear = seqOf(list);
  } else if (it.hearRhythm) {
    const bank = { 1: [['q', 'q', 'q', 'q'], ['h', 'h'], ['q', 'q', 'h'], ['h', 'q', 'q'], ['q', 'h', 'q'], ['w'], ['h.', 'q']],
      2: [['e', 'e', 'q', 'q', 'q'], ['q', 'q', 'e', 'e', 'q'], ['q', 'e', 'e', 'q', 'q'], ['e', 'e', 'e', 'e', 'h'], ['h', 'e', 'e', 'e', 'e'], ['q', 'e', 'e', 'h']],
      3: [['q.', 'e', 'h'], ['h', 'q.', 'e'], ['q.', 'e', 'q.', 'e'], ['q', 'q.', 'e', 'q'], ['h.', 'e', 'e']] }[it.hearRhythm === 1 ? 1 : it.hearRhythm];
    const opts = shuffle(bank).slice(0, 3), right = pick(opts);
    p.prompt = 'Listen. Which rhythm did you hear?';
    p.layout = 'vis';
    p.hear = seqOf(right); p.autoHear = true;
    p.choices = opts.map(o => ({ ok: o === right, vis: smallRhythm(o, { width: 220, S: 10, time: [4, 4] }) }));
    p.answerText = () => 'Listen again and tap along with it.';
  } else if (it.tie) {
    const [a, b] = pick([['h', 'q'], ['q', 'q'], ['h', 'h'], ['q', 'e'], ['w', 'q'], ['h.', 'q']]), ans = BEATS[a] + BEATS[b];
    p.vis = tiedNotes(a, b);
    p.prompt = 'How many beats do you hold this?';
    p.layout = 'nums';
    p.choices = [1.5, 2, 3, 4, 5].map(x => ({ t: beatNum(x), ok: x === ans }));
    p.hear = [{ midi: 67, beats: ans }];
    p.answerText = () => `${beatNum(BEATS[a])} + ${beatNum(BEATS[b])} = ${beatNum(ans)} beats, played as one note.`;
  } else if (it.rest) {
    const known = p.level >= 6 ? ['q', 'h', 'w', 'e'] : ['q', 'h', 'w'];
    p.vis = smallRhythm(['r' + it.rest], { width: 180, S: 15 });
    if (rng() < .55 || p.kind === 'check') {
      p.prompt = 'What is this rest?';
      p.choices = known.map(d => ({ t: REST_NAME[d], ok: d === it.rest }));
    } else {
      p.prompt = 'How many beats of silence, in 4/4 time?';
      p.layout = 'nums';
      p.choices = (p.level >= 6 ? [.5, 1, 2, 4] : [1, 2, 4]).map(x => ({ t: beatNum(x), ok: x === BEATS[it.rest] }));
    }
    p.hear = [{ beats: BEATS[it.rest] }, { midi: 67, beats: 1 }];
    p.answerText = () => `${REST_NAME[it.rest]}: ${beatWord(BEATS[it.rest])} of silence.`;
  } else {
    const known = RHYTHM_AT(p.level);
    p.vis = smallRhythm(it.dur === 'e' ? ['e'] : [it.dur], { width: 180, S: 15 });
    if (rng() < .5) {
      p.prompt = 'What kind of note is this?';
      p.choices = known.map(d => ({ t: DUR_NAME[d], ok: d === it.dur }));
    } else {
      p.prompt = 'How many beats is this note?';
      p.layout = 'nums';
      const beats = [...new Set(known.map(d => BEATS[d]))].sort((a, b) => a - b);
      p.choices = beats.map(b => ({ t: beatNum(b), ok: b === BEATS[it.dur] }));
    }
    p.hear = [{ midi: 67, beats: BEATS[it.dur] }];
    p.answerText = () => `${DUR_NAME[it.dur]}: ${beatWord(BEATS[it.dur])}.`;
  }
}
function measureProblem(p, it) {
  p.mode = 'choice';
  if (it.fact === 'bar') {
    const bars = 2 + Math.floor(rng() * 3), bank = [['q', 'q', 'h'], ['h', 'h'], ['q', 'q', 'q', 'q'], ['w'], ['h', 'q', 'q']];
    const list = [];
    for (let i = 0; i < bars; i++) { list.push(...pick(bank)); list.push('|'); }
    p.vis = smallRhythm(list, { width: 340, S: 10, time: [4, 4] });
    p.prompt = 'How many bars are here? Bar lines separate them.';
    p.layout = 'nums';
    p.choices = [2, 3, 4, 5].map(x => ({ t: String(x), ok: x === bars }));
    p.answerText = () => `${bars} bars.`;
  } else if (it.fact === 'top') {
    const top = pick([2, 3, 4]);
    p.vis = smallRhythm(top === 2 ? ['q', 'q', '|', 'h', '|'] : top === 3 ? ['q', 'q', 'q', '|', 'h', 'q', '|'] : ['q', 'q', 'h', '|', 'w', '|'], { width: 300, S: 12, time: [top, 4] });
    p.prompt = 'How many beats fit in each bar?';
    p.layout = 'nums';
    p.choices = [2, 3, 4, 6].map(x => ({ t: String(x), ok: x === top }));
    p.answerText = () => `The top number says ${top} beats in each bar.`;
  } else if (it.fill) {
    const set = {
      4: { time: [4, 4], opts: [[['h', 'q'], 'q'], [['q', 'q', 'q'], 'q'], [['h'], 'h'], [['q', 'q'], 'h'], [['q'], 'h.']], list: ['q', 'h', 'h.', 'w'] },
      3: { time: [3, 4], opts: [[['q', 'q'], 'q'], [['h'], 'q'], [['q'], 'h']], list: ['q', 'h', 'h.'] },
      2: { time: [2, 4], opts: [[['q'], 'q'], [['e', 'e'], 'q']], list: ['e', 'q', 'h'] },
      '4e': { time: [4, 4], opts: [[['q', 'q', 'q', 'e'], 'e'], [['h', 'q', 'e'], 'e'], [['h', 'e', 'e'], 'q'], [['q.', 'e', 'q'], 'q']], list: ['e', 'q', 'h', 'h.'] },
      6: { time: [6, 8], opts: [[['q.', 'e', 'e'], 'e'], [['q.'], 'q.'], [['q', 'e', 'q'], 'e'], [['e', 'e', 'e'], 'q.']], list: ['e', 'q', 'q.', 'h'] },
    }[it.fill];
    const [have, miss] = pick(set.opts), label = set.time.join('/');
    p.vis = smallRhythm([...have, 'gap', '|'], { width: 300, S: 12, time: set.time });
    p.prompt = `Which note fills this ${label} bar?`;
    p.layout = 'vis';
    p.choices = set.list.map(d => ({ ok: d === miss, label: DUR_NAME[d], vis: smallRhythm([d], { width: 90, S: 10 }) }));
    p.answerText = () => set.time[1] === 8 ? `A 6/8 bar holds six eighth notes. The missing note is ${durPhrase(miss)}.` : `${beatNum(barBeats(have))} beats are there, and the bar needs ${set.time[0]}. The missing note is ${durPhrase(miss)}: ${beatWord(BEATS[miss])}.`;
  } else if (it.wrongBar) {
    const top = it.wrongBar === 1 ? 4 : it.wrongBar;
    const { goods, bads } = {
      4: { goods: [['q', 'q', 'h'], ['h', 'h'], ['q', 'q', 'q', 'q'], ['h.', 'q'], ['w'], ['q', 'h', 'q']], bads: [['q', 'q', 'q'], ['h', 'q', 'q', 'q'], ['w', 'q'], ['h', 'h', 'q'], ['q', 'q']] },
      3: { goods: [['q', 'q', 'q'], ['h', 'q'], ['q', 'h'], ['h.'], ['e', 'e', 'q', 'q']], bads: [['q', 'q'], ['h', 'h'], ['q', 'q', 'q', 'q'], ['h.', 'q'], ['w']] },
      2: { goods: [['q', 'q'], ['h'], ['e', 'e', 'q'], ['q', 'e', 'e']], bads: [['q'], ['h', 'q'], ['q', 'q', 'q'], ['w']] },
    }[top];
    const bad = pick(bads), g = shuffle(goods).slice(0, 2);
    p.prompt = `Which bar does NOT have ${top} beats?`;
    p.layout = 'vis';
    p.choices = shuffle([bad, ...g]).map(b => ({ ok: b === bad, vis: smallRhythm([...b, '|'], { width: 200, S: 10, time: [top, 4] }) }));
    p.answerText = () => `That bar adds up to ${barBeats(bad)} beats, not ${top}.`;
  } else if (it.beatQ) {
    const bars = it.beatQ === 1 ? [['q', 'q', 'q', 'q']] : [['h', 'q', 'q'], ['q', 'h', 'q'], ['q', 'q', 'h'], ['h.', 'q'], ['q', 'h.']];
    const bar = pick(bars), at = it.beatQ === 1 ? Math.floor(rng() * 4) : 1 + Math.floor(rng() * (bar.length - 1));
    const beat = 1 + bar.slice(0, at).reduce((t, d) => t + BEATS[d], 0);
    p.vis = staffSvg({ clef: 't', S: 14, width: 320, time: [4, 4], lo: stepOf('E4'), hi: stepOf('F5'), even: true, items: [...bar.map((d, i) => ({ p: 'G4', d, cls: i === at ? 'now' : '' })), { bar: 1 }] });
    p.prompt = 'Which beat does the blue note start on?';
    p.layout = 'nums';
    p.choices = [1, 2, 3, 4].map(x => ({ t: String(x), ok: x === beat }));
    p.answerText = () => `Counting from the start of the bar, the blue note starts on beat ${beat}.`;
  } else {
    const cut = rng() < .5, ans = cut ? 2 : 4;
    p.vis = staffSvg({ clef: 't', S: 14, width: 300, lo: stepOf('E4'), hi: stepOf('F5'), items: cut ? [{ p: 'G4', d: 'h' }, { p: 'A4', d: 'h' }, { bar: 1 }] : [{ p: 'G4', d: 'q' }, { p: 'A4', d: 'q' }, { p: 'G4', d: 'h' }, { bar: 1 }],
      extra: ({ S, yTop }) => `<text class="timesig" x="${S * 3.9}" y="${yTop + S * 2.9}" font-size="${S * 3.2}">C</text>${cut ? `<line class="st-bar" x1="${S * 3.9}" x2="${S * 3.9}" y1="${yTop - S * .5}" y2="${yTop + S * 4.5}"/>` : ''}` });
    p.prompt = 'How many big beats are in each bar?';
    p.layout = 'nums';
    p.choices = [2, 3, 4, 6].map(x => ({ t: String(x), ok: x === ans }));
    p.answerText = () => cut ? 'A C with a line through it is cut time: 2 big beats in each bar.' : 'A big C is common time, the same as 4/4: 4 beats in each bar.';
  }
}
const KEY_SIGS = { G: ['F#'], F: ['Bb'], D: ['F#', 'C#'], Bb: ['Bb', 'Eb'], A: ['F#', 'C#', 'G#'], Eb: ['Bb', 'Eb', 'Ab'] };
const SIG_SPOT = { 'F#': 'F5', 'C#': 'C5', 'G#': 'G5', Bb: 'B4', Eb: 'E5', Ab: 'A4' };
const keyWord = k => k.length > 1 ? `${k[0]} flat` : k;
const sigGlyphs = (k, S, yTop, x0) => KEY_SIGS[k].map((a, i) => glyph(a[1] === '#' ? 'sharp' : 'flat', x0 + i * S * 1, yTop + (topOf('t') - stepOf(SIG_SPOT[a])) * S / 2 + S * .53, S)).join('');
const sigStaff = (k, items = []) => staffSvg({ clef: 't', S: 15, width: 300, items, noteX: 230, lo: stepOf('C4'), hi: stepOf('G5'), extra: ({ S, yTop }) => sigGlyphs(k, S, yTop, S * 3.3) });
function accidentalProblem(p, it) {
  if (it.ksPlay) {
    const k = it.ksPlay, changed = KEY_SIGS[k][0], letter = changed[0], s = stepOf(letter + '4');
    p.mode = 'key'; p.whites = 11; p.from = s - 5;
    p.pianoOpts = { letters: 'c', star: true };
    p.vis = sigStaff(k, [{ p: letter + '4', d: 'q', sound: changed + '4' }]);
    p.targetMidi = midiOf(changed + '4');
    p.prompt = `In the key of ${keyWord(k)}, find this note.`;
    p.answerText = () => `In the key of ${keyWord(k)}, every ${letter} is played as ${prettySym(changed + '4')}.`;
    return;
  }
  if (it.cancel) {
    const [acc, letter] = pick([['#', 'F'], ['#', 'C'], ['#', 'G'], ['b', 'B'], ['b', 'E'], ['b', 'A']]), plain = letter + '4';
    p.mode = 'key'; p.whites = 11; p.from = stepOf(plain) - 5;
    p.pianoOpts = { letters: 'c', star: true };
    p.vis = staffSvg({ clef: 't', S: 15, width: 300, even: true, items: [{ p: letter + acc + '4', d: 'q', acc }, { p: plain, d: 'q', acc: 'n', cls: 'now' }, { bar: 1 }] });
    p.targetMidi = midiOf(plain);
    p.prompt = 'Find the blue note.';
    p.answerText = () => `The natural sign cancels the ${acc === '#' ? 'sharp' : 'flat'}, so the blue note is plain ${letter}.`;
    return;
  }
  p.mode = 'choice';
  if (it.ks) {
    const k = it.ks, keys = Object.keys(KEY_SIGS).slice(0, p.level <= 9 ? 2 : p.level === 10 ? 4 : 6), notes = KEY_SIGS[k].map(a => prettySym(a + '4')).join(', ');
    p.vis = sigStaff(k);
    if (rng() < .5) {
      p.prompt = 'What major key has this key signature?';
      p.choices = keys.map(x => ({ t: keyWord(x), ok: x === k }));
    } else {
      p.prompt = 'Which notes does this key signature change?';
      p.choices = keys.map(x => ({ t: KEY_SIGS[x].map(a => prettySym(a + '4')).join(', '), ok: x === k }));
    }
    p.answerText = () => `The key of ${keyWord(k)} has ${notes}.`;
    return;
  }
  if (it.accSym) {
    const note = { sharp: 'G#4', flat: 'Bb4', natural: 'A4' }[it.accSym], acc = { sharp: '#', flat: 'b', natural: 'n' }[it.accSym];
    p.vis = staffSvg({ clef: 't', S: 16, width: 240, items: [{ p: note, acc }] });
    p.prompt = 'What does this sign do to the note?';
    p.choices = [['sharp', 'Moves it one key higher'], ['flat', 'Moves it one key lower'], ['natural', 'Cancels a sharp or flat']].map(([k, t]) => ({ t, ok: k === it.accSym }));
    p.answerText = () => ({ sharp: 'A sharp moves a note one key higher.', flat: 'A flat moves a note one key lower.', natural: 'A natural cancels a sharp or flat.' }[it.accSym]);
    return;
  }
  const [a, b] = it.enh, flats = (it.white ? ['C', 'E', 'F', 'B', 'D', 'G'] : ['Db', 'Eb', 'Gb', 'Ab', 'Bb']).filter(x => x !== b);
  let midi = midiOf(a + '4');
  if (midi < 60) midi += 12;  // C flat, on this stretch of keys
  p.prompt = `${prettySym(a + '4')} is the same key as…`;
  p.keyStrip = { from: stepOf('C4'), whites: 8, marks: { [midi]: 'hl' }, letters: 'all', star: false };
  p.choices = shuffle([b, ...shuffle(flats).slice(0, 2)]).map(x => ({ t: prettySym(x + '4'), ok: x === b }));
  p.hearMidi = midi;
  p.answerText = () => `${prettySym(a + '4')} and ${prettySym(b + '4')} are the same key.`;
}
function markSvg(s, big) {
  const m = MARKS[s], h = big ? 96 : 76, w = big ? 240 : 180;
  if (m.label) return `<svg class="markvis" viewBox="0 0 ${w} ${h}"><text class="dyn" x="${w / 2}" y="${h * .72}" font-size="${h * .7}">${m.label}</text></svg>`;
  if (m.text) return `<svg class="markvis" viewBox="0 0 ${w} ${h}"><text class="tempo" x="${w / 2}" y="${h * .64}" font-size="${h * .4}">${m.text}</text></svg>`;
  if (m.hair) { const u = m.hair === 'up', a = 20, b = w - 20, mid = h / 2, o = h * .24; return `<svg class="markvis" viewBox="0 0 ${w} ${h}"><path class="hair" d="M${u ? b : a} ${mid - o}L${u ? a : b} ${mid}L${u ? b : a} ${mid + o}"/></svg>`; }
  const extra = ({ Y, S, x, yTop, staffH }) => {
    if (m.touch === 'stacc') return x.map(at => `<circle class="n-head" cx="${at}" cy="${Y(stepOf('E4')) + S * 1.1}" r="${S * .2}"/>`).join('');
    if (m.touch === 'accent') return `<path class="hair thin" d="M${x[1] - S * .8} ${yTop - S * .9}L${x[1] + S * .8} ${yTop - S * .5}L${x[1] - S * .8} ${yTop - S * .1}"/>`;
    if (m.touch === 'slur') return `<path class="hair thin" d="M${x[0]} ${Y(stepOf('E4')) + S * 1}Q${(x[0] + x[2]) / 2} ${Y(stepOf('E4')) + S * 3} ${x[2]} ${Y(stepOf('E4')) + S * 1}"/>`;
    if (m.touch === 'fermata') return glyph('fermata', x[1] - S * 1.3, yTop - S * .3 + (648 / 250) * S - S * 2.6 + S * 2.2 - S, S * .9);
    if (m.touch === 'tenuto') return `<line class="hair thin" x1="${x[1] - S * .7}" x2="${x[1] + S * .7}" y1="${yTop - S * .3}" y2="${yTop - S * .3}"/>`;
    if (m.touch === 'tie') return `<path class="tie" d="M${x[0] + S * .3} ${Y(stepOf('A4')) + S * 1}Q${(x[0] + x[1]) / 2} ${Y(stepOf('A4')) + S * 2.4} ${x[1] - S * .3} ${Y(stepOf('A4')) + S * 1}"/>`;
    if (m.touch === 'repeat') { const end = x[x.length - 1]; return `<circle class="n-head" cx="${end - S * 1.0}" cy="${yTop + S * 1.5}" r="${S * .2}"/><circle class="n-head" cx="${end - S * 1.0}" cy="${yTop + S * 2.5}" r="${S * .2}"/>`; }
    return '';
  };
  const items = m.touch === 'tie' ? [{ p: 'A4', d: 'h', noStem: true }, { p: 'A4', d: 'h', noStem: true }] : m.touch === 'repeat' ? [{ p: 'G4', d: 'q', noStem: false }, { p: 'A4', d: 'q' }, { p: 'B4', d: 'q' }, { bar: 'end' }] : [{ p: 'G4', d: 'q', noStem: true }, { p: 'A4', d: 'q', noStem: true }, { p: 'B4', d: 'q', noStem: true }];
  return staffSvg({ clef: 't', S: 11, width: big ? 280 : 220, items, extra, lo: stepOf('C4') - 2, hi: stepOf('F5') + 3, noClef: false, cl: 'markstaff' });
}
function markDemo(s) {
  const up = [60, 62, 64, 65, 67];
  const line = (vol, beats = .5, len) => up.map(m => ({ midi: m, beats, vol, len }));
  return {
    f: line(.95), p: line(.14), mf: line(.6), mp: line(.3),
    cresc: up.map((m, i) => ({ midi: m, beats: .5, vol: .1 + i * .2 })), dim: up.map((m, i) => ({ midi: m, beats: .5, vol: .9 - i * .2 })),
    stacc: line(.6, .5, .08), slur: line(.5, .5, .75), accent: [{ midi: 60, beats: .5, vol: .4 }, { midi: 62, beats: .5, vol: 1 }, { midi: 64, beats: .5, vol: .4 }],
    fermata: [{ midi: 60, beats: .5 }, { midi: 62, beats: 3.5 }, { midi: 64, beats: .5 }],
    repeat: [...line(.5), ...line(.5)],
    allegro: line(.5, .22), andante: line(.5, .5), adagio: line(.5, 1.2),
    rit: up.map((m, i) => ({ midi: m, beats: .35 + i * .3 })),
    ff: line(1), pp: line(.08), presto: line(.5, .16), moderato: line(.5, .4), largo: line(.5, 1.6),
    accel: up.map((m, i) => ({ midi: m, beats: 1.5 - i * .3 })), sfz: [{ midi: 60, beats: .6, vol: .3 }, { midi: 64, beats: .6, vol: 1 }, { midi: 62, beats: .6, vol: .3 }],
    legato: line(.5, .5, .75), tie: [{ midi: 69, beats: 3 }], tenuto: [{ midi: 60, beats: 1 }, { midi: 62, beats: 1, len: 1 }, { midi: 64, beats: 1 }],
  }[s];
}
function markProblem(p, it) {
  p.mode = 'choice';
  if (it.markBack) {
    const pool = LEVELS.marks.slice(0, 4).flatMap(l => l.items).map(x => x.mark);
    const others = shuffle(pool.filter(x => x !== it.markBack)).slice(0, 3);
    p.prompt = `Which sign means: ${MARKS[it.markBack].means.toLowerCase()}?`;
    p.layout = 'vis';
    p.choices = shuffle([it.markBack, ...others]).map(x => ({ ok: x === it.markBack, label: MARKS[x].word, vis: markSvg(x) }));
    p.answerText = () => `That sign is ${MARKS[it.markBack].word}.`;
    return;
  }
  const pool = LEVELS.marks.slice(0, p.level).flatMap(l => l.items).map(x => x.mark);
  const others = shuffle(pool.filter(s => s !== it.mark && MARKS[s].means !== MARKS[it.mark].means)).slice(0, 3);
  p.vis = markSvg(it.mark, true);
  p.prompt = 'What does this sign tell you?';
  p.choices = shuffle([it.mark, ...others]).map(s => ({ t: MARKS[s].means, ok: s === it.mark }));
  p.hear = markDemo(it.mark);
  p.answerText = () => `${MARKS[it.mark].word}: ${MARKS[it.mark].means.toLowerCase()}.`;
}
const CMAJ = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'D5', 'E5'];
function earProblem(p, it) {
  p.mode = 'choice';
  p.autoHear = true;
  if (it.see === 'step') {
    p.autoHear = false;
    const first = stepOf('E4') + Math.floor(rng() * 7), step = rng() < .5, up = rng() < .5, next = first + (up ? 1 : -1) * (step ? 1 : 2);
    p.vis = staffSvg({ clef: 't', S: 14, width: 260, items: [{ p: pitchOf(first), d: 'q' }, { p: pitchOf(next), d: 'q' }] });
    p.prompt = 'Is this a step or a skip?';
    p.layout = 'nums';
    p.choices = [{ t: 'Step', ok: step }, { t: 'Skip', ok: !step }];
    p.hear = [{ midi: whiteMidi(first), beats: 1 }, { midi: whiteMidi(next), beats: 1 }];
    p.answerText = () => step ? 'Next-door letters: a step.' : 'It jumps over one letter: a skip.';
  } else if (it.ear === 'same') {
    const a = pick([['C4', 'E4', 'G4', 'E4'], ['G4', 'F4', 'E4', 'D4'], ['C4', 'D4', 'E4', 'C4'], ['E4', 'G4', 'A4', 'G4']]), same = rng() < .5;
    const b = a.slice();
    if (!same) { const i = 1 + Math.floor(rng() * 3); b[i] = pitchOf(stepOf(b[i]) + (rng() < .5 ? 2 : -2)); }
    p.prompt = 'Were the two tunes the same?';
    p.layout = 'nums';
    p.choices = [{ t: 'Same', ok: same }, { t: 'Different', ok: !same }];
    p.hear = [...a.map(x => ({ midi: midiOf(x), beats: .6 })), { beats: 1.2 }, ...b.map(x => ({ midi: midiOf(x), beats: .6 }))];
    p.answerText = () => same ? 'They matched, note for note.' : 'One note was different.';
  } else if (it.ear === 'shape') {
    const shapes = { 'It climbed': [0, 1, 2, 3, 4], 'It fell': [4, 3, 2, 1, 0], 'Up, then back down': [0, 2, 4, 2, 0], 'Down, then back up': [4, 2, 0, 2, 4] };
    const right = pick(Object.keys(shapes));
    p.prompt = 'What shape was the tune?';
    p.choices = Object.keys(shapes).map(t => ({ t, ok: t === right }));
    p.hear = shapes[right].map(i => ({ midi: midiOf(CMAJ[i]), beats: .6 }));
    p.answerText = () => `${right}.`;
  } else if (it.ear === 'highest') {
    const at = Math.floor(rng() * 3), low = shuffle(['C4', 'D4', 'E4', 'F4']).slice(0, 2), top = pick(['C5', 'B4', 'A4']), seq = low.slice();
    seq.splice(at, 0, top);
    p.prompt = 'Which note was the highest?';
    p.layout = 'nums';
    p.choices = ['First', 'Second', 'Third'].map((t, i) => ({ t, ok: i === at }));
    p.hear = seq.map(x => ({ midi: midiOf(x), beats: 1 }));
    p.answerText = () => `The ${['first', 'second', 'third'][at]} note was the highest.`;
  } else if (it.ear === 'chord') {
    const major = rng() < .5, root = 57 + Math.floor(rng() * 8), notes = [root, root + (major ? 4 : 3), root + 7];
    p.prompt = 'Was that chord major or minor?';
    p.layout = 'nums';
    p.choices = [{ t: 'Major, bright', ok: major }, { t: 'Minor, dark', ok: !major }];
    p.hear = notes.map((m, i) => ({ midi: m, beats: i === 2 ? 2 : 0, len: 2 }));  // no beats between them: they sound together
    p.answerText = () => major ? 'That was a major chord.' : 'That was a minor chord.';
  } else if (it.ear === 'leap') {
    const kind = pick(['Step', 'Skip', 'Leap']), gap = kind === 'Step' ? 1 : kind === 'Skip' ? 2 : 3 + Math.floor(rng() * 2), i = 2 + Math.floor(rng() * 3);
    p.prompt = 'Was that a step, a skip or a leap?';
    p.layout = 'nums';
    p.choices = ['Step', 'Skip', 'Leap'].map(t => ({ t, ok: t === kind }));
    p.hear = [{ midi: midiOf(CMAJ[i]), beats: 1 }, { midi: midiOf(CMAJ[i + gap]), beats: 1 }];
    p.answerText = () => `That was a ${kind.toLowerCase()}.`;
  } else if (it.ear === 'name') {
    const l = pick(['D4', 'E4', 'F4', 'G4']);
    p.prompt = 'You hear Middle C, then which note?';
    p.layout = 'nums';
    p.choices = ['D', 'E', 'F', 'G'].map(t => ({ t, ok: t === l[0] }));
    p.hear = [{ midi: 60, beats: 1.2 }, { midi: midiOf(l), beats: 1.4 }];
    p.answerText = () => `Up from C to ${l[0]}.`;
  } else if (it.ear === 'high') {
    const a = 55 + Math.floor(rng() * 12), gap = 7 + Math.floor(rng() * 8), first = rng() < .5;
    const [x, y] = first ? [a + gap, a] : [a, a + gap];
    p.prompt = 'Which sound was higher?';
    p.layout = 'nums';
    p.choices = [{ t: 'First', ok: first }, { t: 'Second', ok: !first }];
    p.hear = [{ midi: x, beats: 1.2 }, { midi: y, beats: 1.2 }];
    p.answerText = () => `The ${first ? 'first' : 'second'} sound was higher.`;
  } else if (it.ear === 'dir') {
    const dir = pick(['up', 'down', 'same']), start = 3 + Math.floor(rng() * 3);
    const walk = [0, 1, 2].map(i => CMAJ[start + (dir === 'up' ? i : dir === 'down' ? -i : 0)]);
    p.prompt = 'Which way did the notes go?';
    p.choices = [['up', 'Up'], ['down', 'Down'], ['same', 'Stayed the same']].map(([v, t]) => ({ t, ok: v === dir }));
    p.layout = 'nums';
    p.hear = walk.map(x => ({ midi: midiOf(x), beats: .8 }));
    p.answerText = () => dir === 'same' ? 'They stayed on one note.' : `They went ${dir}.`;
  } else if (it.ear === 'step') {
    const i = 2 + Math.floor(rng() * 5), step = rng() < .5, up = rng() < .5, x = CMAJ[i], y = CMAJ[i + (up ? 1 : -1) * (step ? 1 : 2)];
    p.prompt = 'Was that a step or a skip?';
    p.layout = 'nums';
    p.choices = [{ t: 'Step', ok: step }, { t: 'Skip', ok: !step }];
    p.hear = [{ midi: midiOf(x), beats: 1 }, { midi: midiOf(y), beats: 1 }];
    p.answerText = () => step ? 'Next-door notes: a step.' : 'It jumped over a note: a skip.';
  } else if (it.ear === 'match6' || it.ear === 'matchb') {
    const bass = it.ear === 'matchb';
    const bank = bass ? [['C4', 'B3', 'A3', 'G3'], ['G3', 'A3', 'B3', 'C4'], ['C4', 'A3', 'C4', 'A3'], ['A3', 'G3', 'F3', 'G3'], ['C4', 'G3', 'A3', 'F3']]
      : [['C4', 'D4', 'E4', 'F4', 'E4', 'D4'], ['G4', 'E4', 'C4', 'E4', 'G4', 'E4'], ['C4', 'E4', 'D4', 'F4', 'E4', 'G4'], ['G4', 'F4', 'E4', 'D4', 'C4', 'D4'], ['E4', 'E4', 'F4', 'G4', 'G4', 'F4']];
    const opts = shuffle(bank).slice(0, 3), right = pick(opts);
    p.prompt = 'Listen. Which notes did you hear?';
    p.layout = 'vis';
    p.hear = right.map(x => ({ midi: midiOf(x), beats: .7 }));
    p.choices = opts.map(o => ({ ok: o === right, vis: staffSvg({ clef: bass ? 'b' : 't', S: 9, width: 260, lo: stepOf('F3'), hi: stepOf('G4'), items: o.map(x => ({ p: x, d: 'q' })) }) }));
    p.answerText = () => 'Follow the notes with your finger and listen again.';
  } else {
    const bank = [['C4', 'D4', 'E4', 'G4'], ['G4', 'E4', 'D4', 'C4'], ['C4', 'E4', 'C4', 'E4'], ['E4', 'D4', 'C4', 'D4'], ['C4', 'C4', 'G4', 'G4'], ['G4', 'F4', 'E4', 'D4'], ['C4', 'G4', 'E4', 'C4']];
    const opts = shuffle(bank).slice(0, 3), right = pick(opts);
    p.prompt = 'Listen. Which notes did you hear?';
    p.layout = 'vis';
    p.hear = right.map(x => ({ midi: midiOf(x), beats: .8 }));
    p.choices = opts.map(o => ({ ok: o === right, vis: staffSvg({ clef: 't', S: 9, width: 220, lo: stepOf('C4'), hi: stepOf('G4'), items: o.map(x => ({ p: x, d: 'q' })) }) }));
    p.answerText = () => 'Follow the notes with your finger and listen again.';
  }
}

/* ---------- building a round ---------- */
const MAX_NEW = 4, MAX_CHAPTERS = 2;
function dueCards() {
  const now = Date.now();
  return state.cards.filter(c => c.due <= now && TOPIC[c.topic] && findItem(c.topic, c.wid)).sort((a, b) => a.due - b.due);
}
const chapterKey = (k, L) => `${k}:${L}`;
const levelNow = k => Math.min(state.levels[k], maxLevel(k));
// A new thing gets a card of its own before it's asked: the note, where it sits and how to count to it.
function introFor(it) {
  if (it.note && !it.keyOnly) return { title: midCName(it.p), words: `${describe(it.clef, stepOf(it.p))[0].toUpperCase()}${describe(it.clef, stepOf(it.p)).slice(1)}. ${walkWords(it.clef, stepOf(it.p))}`, kind: 'note' };
  if (it.dur) return { title: DUR_NAME[it.dur], words: `It lasts ${beatWord(BEATS[it.dur])}.`, vis: smallRhythm([it.dur], { width: 180, S: 15 }), hear: [{ midi: 67, beats: BEATS[it.dur] }], onBeat: true };
  if (it.rest) return { title: REST_NAME[it.rest], words: `Be silent for ${beatWord(BEATS[it.rest])}.`, vis: smallRhythm(['r' + it.rest], { width: 180, S: 15 }), hear: [{ beats: BEATS[it.rest] }, { midi: 67, beats: 1 }], onBeat: true };
  if (it.markBack) return null;
  if (it.mark) return { title: MARKS[it.mark].word, words: `${MARKS[it.mark].means}.`, vis: markSvg(it.mark, true), hear: markDemo(it.mark) };
  return null;
}
function buildSession() {
  let on = ORDER.filter(k => state.on[k]);
  if (!on.length) on = ['path'];
  // At most two new chapters a round; a topic with a third waits for the next round.
  const unread = on.filter(k => !state.chapters[chapterKey(k, levelNow(k))]);
  const held = new Set(unread.slice(MAX_CHAPTERS));
  on = on.filter(k => !held.has(k));
  const n = state.perSession, used = new Map();
  roundSeen.clear();
  const slides = [];
  for (const k of unread.slice(0, MAX_CHAPTERS)) slides.push({ mode: 'chapter', topic: k, level: levelNow(k), done: true, chapter: LEVELS[k][levelNow(k) - 1] });
  let newCount = 0;
  const qs = [];
  const seenThisRound = it => isSeen(it.wid) || used.has(it.wid);
  const take = (k, L, kind, it, seed, card) => {
    const wasNew = !seenThisRound(it);
    if (wasNew) newCount++;
    used.set(it.wid, (used.get(it.wid) || 0) + 1);
    const q = makeProblem(k, L, seed ?? newSeed(), kind, it.wid);
    roundSeen.add(it.wid);
    if (card) q.card = card;
    qs.push(q);
  };
  for (const c of dueCards().filter(c => !held.has(c.topic)).slice(0, Math.ceil(n * .3))) take(c.topic, c.level, 'again', findItem(c.topic, c.wid), c.box === 0 ? c.seed : newSeed(), c.id);
  // The path from Middle C is the point right now, so it gets a double turn in the rotation when on.
  const rotation = shuffle(on.flatMap(k => k === 'path' && on.length > 1 ? [k, k] : [k]));
  for (let i = 0; qs.length < n && i < n * 8; i++) {
    const k = rotation[i % rotation.length], L = levelNow(k);
    const cur = LEVELS[k][L - 1].items, earlier = LEVELS[k].slice(0, L - 1).flatMap(l => l.items);
    const review = earlier.length && Math.random() < .3;
    let pool = review ? earlier : cur;
    // A note comes up at most twice a round, so a level with few notes makes a short round rather than a repetitive one.
    // Other exercises make a fresh question each time, so they can repeat more to fill the round.
    const limit = it => it.note || it.twin ? 2 : Math.max(2, Math.ceil(n / (cur.length + earlier.length)));
    pool = pool.filter(it => (used.get(it.wid) || 0) < limit(it) && (seenThisRound(it) || newCount < MAX_NEW));
    if (!pool.length) continue;
    // new things first, then the shakiest
    const weigh = it => (!isSeen(it.wid) ? 6 : isKnown(it.wid) ? 1 : 4) / (1 + (used.get(it.wid) || 0));
    let r = Math.random() * pool.reduce((t, it) => t + weigh(it), 0), it = pool[0];
    for (const x of pool) { r -= weigh(x); if (r <= 0) { it = x; break; } }
    take(k, L, review ? 'easier' : 'current', it);
  }
  // Shuffle, but never the same thing twice in a row, and a new thing's card comes two slides before its question.
  const order = [];
  const rest = shuffle(qs);
  while (rest.length) {
    const i = rest.findIndex(q => !order.length || order[order.length - 1].wid !== q.wid);
    order.push(rest.splice(i < 0 ? 0 : i, 1)[0]);
  }
  const out = [];
  const introduced = new Set();
  order.forEach(q => {
    if (!isSeen(q.wid) && !introduced.has(q.wid)) {
      introduced.add(q.wid);
      const c = introFor(q.item);
      if (c) out.splice(Math.max(0, out.length - 1), 0, { mode: 'intro', topic: q.topic, level: q.level, done: true, wid: q.wid, item: q.item, intro: c });
    }
    out.push(q);
  });
  return { probs: [...slides, ...out], i: 0, results: [], cleared: 0, learned: [] };
}
function startSession() { audioReady(); if (listenMode()) startMic(); sess = buildSession(); screen = 'play'; render(); enterSlide(); }

/* Quick check: placement. Two notes from each early level, one try each. A level with no misses is marked known, up to the first miss. */
const CHECK_LEVELS = { path: [0, 1, 2, 3, 4, 5, 6, 7, 8] };
function buildCheck() {
  const probs = [];
  for (const [k, lvs] of Object.entries(CHECK_LEVELS)) for (const li of lvs) {
    rng = Math.random;
    for (const it of shuffle(LEVELS[k][li].items).slice(0, 2)) { const q = makeProblem(k, li + 1, newSeed(), 'check', it.wid); q.checkLevel = li; probs.push(q); }
  }
  return { probs, i: 0, results: [], cleared: 0, learned: [], check: true };
}
function finishCheck() {
  for (const k of Object.keys(CHECK_LEVELS)) {
    let lv = 0;
    for (const li of CHECK_LEVELS[k]) {
      const asked = sess.probs.filter(q => q.topic === k && q.checkLevel === li);
      if (!asked.every(q => q.result === true)) break;
      for (const it of LEVELS[k][li].items) { const w = state.words[it.wid] = state.words[it.wid] || { r: 0, m: 0 }; w.k = 1; }
      state.chapters[chapterKey(k, li + 1)] = 1;
      lv = li + 1;
    }
    state.levels[k] = Math.min(lv + 1, maxLevel(k));
  }
}
function startCheck() { audioReady(); if (listenMode()) startMic(); sess = buildCheck(); screen = 'play'; render(); enterSlide(); }

/* ---------- answering ---------- */
function enterSlide() {
  hush();
  if (listenMode() && mic.status === 'off') startMic();
  const p = sess.probs[sess.i];
  if (p.autoHear && p.hear && !p.done) setTimeout(() => playHear(p.hear, p.onBeat), 250);
  if (state.autoSpeak) say(slideWords(p));
}
function slideWords(p) {
  if (p.mode === 'chapter') return `${p.chapter.name}. ${p.chapter.lesson}`;
  if (p.mode === 'intro') return `${p.intro.title}. ${p.intro.words}`;
  return p.line || p.prompt;
}
function tell(p, text) { p.line = text; if (state.autoSpeak) say(text); }
function gotIt(p) {
  p.done = true;
  p.praise = p.tries === 0 ? pick(PRAISE) : 'There it is.';
  tell(p, `${p.praise} ${p.answerText ? p.answerText() : ''}`);
  record(p, p.tries === 0);
  if (hearing()) return;
  if (p.hear) playHear(p.hear, p.onBeat); else if (p.hearP) playP(p.hearP); else if (p.hearMidi) tone(p.hearMidi);
}
function missed(p, wrongLine) {
  p.tries++;
  p.lastWrong = wrongLine;
  const over = p.tries >= (p.kind === 'check' ? 1 : 2);
  if (over) {
    p.done = true; p.revealed = true;
    tell(p, `${wrongLine} ${p.answerText ? p.answerText() : ''}`);
    record(p, false);
    if (hearing()) return;
    if (p.hear) playHear(p.hear, p.onBeat); else if (p.hearP) setTimeout(() => playP(p.hearP), 350); else if (p.hearMidi) tone(p.hearMidi);
  } else if (state.autoSpeak) say(`${wrongLine} Try again.`);
}
function answer(idx) {
  const p = sess.probs[sess.i];
  if (p.done || p.wrong.includes(idx) || !p.choices[idx]) return;
  const c = p.choices[idx];
  if (c.ok) { gotIt(p); render(); return; }
  p.wrong.push(idx);
  const ref = p.hearMidi ?? (p.hearP ? midiOf(p.hearP) : null);
  if (p.layout === 'letters' && ref != null && !hearing()) tone(nearestLetter(c.t, ref));
  missed(p, p.layout === 'letters' ? `Not ${c.t}.` : 'Not that one.');
  render(!p.done);
}
function tapKey(midi) {
  const p = sess?.probs[sess.i];
  if (p?.mode === 'row') return rowPress(midi);
  const listening = hearing() && !p?.onScreen;
  if (!listening) tone(midi);
  if (!p || p.done || p.mode !== 'key') return;
  const ok = p.okMidi ? p.okMidi(midi) : listening ? midi % 12 === p.targetMidi % 12 : midi === p.targetMidi;
  if (ok) { p.chosen = listening ? null : midi; gotIt(p); render(); return; }
  if (p.wrongKeys?.includes(midi)) return;
  (p.wrongKeys = p.wrongKeys || []).push(midi);
  let line = `That’s ${isBlack(midi) ? 'a black key: ' + keyName(midi) : keyName(midi)}.`;
  if (p.targetMidi && !isBlack(midi) && keyName(midi) === keyName(p.targetMidi)) line = `That is ${withA(keyName(midi))}, but too ${midi > p.targetMidi ? 'high' : 'low'}. This one is ${midi > p.targetMidi ? 'further left' : 'further right'}.`;
  missed(p, line);
  render(!p.done);
}
function checkPlaced() {
  const p = sess.probs[sess.i];
  if (p.done || p.sel == null) return;
  if (letterOf(p.sel) === p.letter && regionOf(p.clef, p.sel) === regionOf(p.clef, p.step)) { p.step = p.sel; p.p = pitchOf(p.sel); p.hearP = p.p; gotIt(p); render(); return; }
  missed(p, letterOf(p.sel) === p.letter ? `That is ${withA(p.letter)}, but ${regionOf(p.clef, p.step) === 'on' ? 'this one is on the staff' : `this one goes ${regionOf(p.clef, p.step)} the staff`}.` : `That’s ${letterOf(p.sel)}.`);
  render(!p.done);
}
function selfCheck(ok) {
  const p = sess.probs[sess.i];
  if (p.done) return;
  if (ok) { gotIt(p); } else { p.tries = 1; p.done = true; p.revealed = true; tell(p, p.answerText()); record(p, false); }
  render();
}
// One press in a row of notes: a letter, or a piano key's number.
function rowPress(v) {
  const p = sess.probs[sess.i];
  if (p.done || p.mode !== 'row') return;
  const n = p.notes[p.at], ok = p.rowKeys ? v === whiteMidi(n.step) : v === letterOf(n.step);
  if (p.rowKeys) tone(v);
  if (ok) {
    if (!p.rowKeys && !hearing()) tone(whiteMidi(n.step));
    n.state = n.tries ? 'late' : 'ok';
    p.lastWrong = null;
    noteDone(p, n, n.tries === 0);
    return render();
  }
  n.tries++;
  p.misses++;
  if (!p.rowKeys && !hearing() && n.tries < 2 && LETTERS.includes(v)) tone(nearestLetter(v, whiteMidi(n.step)));
  const named = p.rowKeys ? keyName(v) : v;
  if (n.tries >= 2) {
    if (!hearing()) tone(whiteMidi(n.step));
    n.state = 'shown';
    p.lastWrong = `Not ${named}. That one is ${letterOf(n.step)}. ${walkWords(p.clef, n.step)}`;
    noteDone(p, n, false);
  } else p.lastWrong = `Not ${named}. ${hintWords(p.clef, n.step)}`;
  if (state.autoSpeak) say(p.lastWrong);
  render(n.tries < 2);
}
function noteDone(p, n, first) {
  const w = state.words[n.wid] = state.words[n.wid] || { r: 0, m: 0 };
  const before = isKnown(n.wid);
  // A note repeats in a pattern, but one row is only one piece of evidence: count a right answer once per row, and a miss once.
  p.counted = p.counted || {};
  const was = p.counted[n.wid];
  if (first && !was) w.r = Math.min(20, (w.r || 0) + 1);
  if (!first && was !== 'miss') { w.m = Math.min(20, (w.m || 0) + 1); w.k = 0; }
  p.counted[n.wid] = first && was !== 'miss' ? 'right' : 'miss';
  w.t = Date.now();
  if (!before && isKnown(n.wid) && !sess.learned.includes(n.wid)) sess.learned.push(n.wid);
  if (!first && was !== 'miss' && !(p.kind === 'again' && n.wid === p.wid)) addCard({ topic: p.topic, level: LEVELS[p.topic].findIndex(l => l.items.some(i => i.wid === n.wid)) + 1, wid: n.wid, seed: newSeed() });
  p.at++;
  if (p.at >= p.notes.length) {
    p.done = true;
    const clean = p.misses === 0;
    p.praise = clean ? pick(PRAISE) : `${p.notes.filter(x => x.state === 'ok').length} of ${p.notes.length} right the first time.`;
    p.result = clean;
    sess.results.push(clean);
    state.total++;
    state.done[p.topic] = (state.done[p.topic] || 0) + 1;
    // a row with one slip still counts toward moving up
    if (p.kind === 'current') state.rec[p.topic] = [...(state.rec[p.topic] || []), p.misses <= 1].slice(-10);
    if (p.kind === 'again') reviewCard(p.card, clean);
    if (state.autoSpeak) say(p.praise);
  }
  save();
}
// Each note lights up as it sounds, so the row can be followed by eye.
function playRow(p) {
  playSeq(p.notes.map(n => ({ midi: whiteMidi(n.step), beats: 1 })), 100, i => {
    if (sess?.probs[sess.i] !== p) return;
    p.playAt = i;
    render();
  });
}
function record(p, first) {
  sess.results.push(first);
  p.result = first;
  const w = state.words[p.wid] = state.words[p.wid] || { r: 0, m: 0 };
  if (p.kind === 'check') { save(); return; }
  state.total++;
  state.done[p.topic] = (state.done[p.topic] || 0) + 1;
  const before = isKnown(p.wid);
  if (first) w.r = Math.min(20, (w.r || 0) + 1); else { w.m = Math.min(20, (w.m || 0) + 1); w.k = 0; }
  w.t = Date.now();
  if (!before && isKnown(p.wid) && !sess.learned.includes(p.wid)) sess.learned.push(p.wid);
  if (p.kind === 'current') state.rec[p.topic] = [...(state.rec[p.topic] || []), first].slice(-10);
  if (p.kind === 'again') reviewCard(p.card, first);
  else if (!first) addCard(p);
  save();
}
// A missed note comes back tomorrow, then after 3, 7, 14 and 30 days while it keeps being right.
function addCard(p) {
  const due = startOfDay() + DAY * REVIEW_DAYS[0];
  const same = state.cards.find(c => c.topic === p.topic && c.wid === p.wid);
  if (same) { Object.assign(same, { box: 0, seed: p.seed, due, misses: same.misses + 1 }); return; }
  state.cards.push({ id: newSeed().toString(36), topic: p.topic, level: p.level, wid: p.wid, seed: p.seed, box: 0, due, misses: 1, added: Date.now() });
  if (state.cards.length > 80) state.cards.sort((a, b) => a.added - b.added).shift();
}
function reviewCard(id, first) {
  const c = state.cards.find(x => x.id === id);
  if (!c) return;
  if (!first) { Object.assign(c, { box: 0, due: startOfDay() + DAY, misses: c.misses + 1 }); return; }
  c.box++;
  if (c.box >= REVIEW_DAYS.length) { state.cards = state.cards.filter(x => x !== c); state.cleared = (state.cleared || 0) + 1; sess.cleared++; return; }
  c.due = startOfDay() + DAY * REVIEW_DAYS[c.box];
}
function next() {
  const cur = sess.probs[sess.i];
  if (cur.mode === 'chapter') { state.chapters[chapterKey(cur.topic, cur.level)] = 1; save(); }
  if (cur.mode === 'intro') { state.words[cur.wid] = state.words[cur.wid] || { r: 0, m: 0 }; save(); }
  if (sess.i < sess.probs.length - 1) { sess.i++; render(); enterSlide(); window.scrollTo?.({ top: 0 }); return; }
  hush();
  stopMic();
  if (sess.check) { finishCheck(); lastChanges = []; save(); screen = 'done'; render(); return; }
  const used = [...new Set(sess.probs.filter(p => p.mode !== 'chapter' && p.mode !== 'intro').map(p => p.topic))];
  lastChanges = adjustLevels(used);
  const asked = sess.results.length;
  state.sessions.unshift({ d: new Date().toISOString(), score: sess.results.filter(Boolean).length, n: asked, skills: used, learned: sess.learned.length });
  state.sessions = state.sessions.slice(0, 40);
  save();
  screen = 'done'; render();
}
// Up: 5 in a row or 7 of the last 8 on the first try, or every note in the set known. Down: 4 misses in the last 6.
// Finishing the top level masters the topic and turns on the next one.
function adjustLevels(used) {
  const changes = [];
  for (const k of used) {
    const r = state.rec[k] || [], max = maxLevel(k), L = state.levels[k];
    const last8 = r.slice(-8), last6 = r.slice(-6), last5 = r.slice(-5);
    const setKnown = r.length >= 3 && LEVELS[k][L - 1].items.every(i => isKnown(i.wid));
    const up = setKnown || (last8.length >= 8 && last8.filter(Boolean).length >= 7) || (last5.length === 5 && last5.every(Boolean));
    if (up && L < max) { state.levels[k]++; state.rec[k] = []; changes.push([k, 'up']); }
    else if (up && !state.mastered[k]) {
      state.mastered[k] = Date.now(); changes.push([k, 'mastered']);
      const nk = UNLOCK_ORDER.find(x => !state.on[x] && !state.mastered[x]);
      if (nk) { state.on[nk] = true; changes.push([nk, 'unlocked']); }
    } else if (last6.length >= 6 && last6.filter(Boolean).length <= 2 && L > 1) { state.levels[k]--; state.rec[k] = []; changes.push([k, 'down']); }
  }
  for (const [k, dir] of changes) state.log.unshift({ d: new Date().toISOString(), k, dir, to: state.levels[k] });
  state.log = state.log.slice(0, 30);
  return changes;
}

/* ---------- songs ---------- */
function parseSong(s) {
  const bars = s.notes.split('|').map(b => b.trim().split(/\s+/).map(tok => { const [p, d] = tok.split(':'); return { p, d }; }));
  return { bars, flat: bars.flat() };
}
function openSong(id) {
  audioReady();
  const s = SONGS.find(x => x.id === id), { bars, flat } = parseSong(s);
  const steps = flat.map(x => stepOf(x.p));
  const lo = Math.min(...steps), hi = Math.max(...steps);
  if (listenMode()) startMic();
  song = { s, bars, flat, i: 0, misses: 0, letters: false, from: lo - 1, whites: Math.max(8, hi - lo + 3), flash: null, playing: -1 };
  screen = 'song'; render();
}
function songTap(midi) {
  if (!hearing()) tone(midi);
  if (!song || song.playing >= 0 || song.i >= song.flat.length) return;
  const want = midiOf(song.flat[song.i].p);
  if (hearing() ? midi % 12 === want % 12 : midi === want) { song.flash = null; song.i++; if (song.i >= song.flat.length) finishSong(); }
  else { song.misses++; song.flash = `That’s ${keyName(midi)}.`; }
  render(midi !== want);
}
function finishSong() {
  const r = state.songs[song.s.id] = state.songs[song.s.id] || { plays: 0, best: null };
  r.plays++;
  r.best = r.best == null ? song.misses : Math.min(r.best, song.misses);
  save();
}
function hearSong() {
  if (song.playing >= 0) { hush(); song.playing = -1; render(); return; }
  const list = song.flat.map(x => ({ midi: midiOf(x.p), beats: BEATS[x.d] }));
  song.playing = 0;
  render();
  playSeq(list, 90, i => { if (screen !== 'song') return; song.playing = i; render(); }, { perBar: song.s.time[0] });
}

/* ---------- rendering ---------- */
const app = document.getElementById('app');
const speakerIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7"/><path d="M19.5 5.5a9 9 0 0 1 0 13"/></svg>';
const starSvg = on => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 16.8l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" fill="${on ? 'var(--yellow)' : 'none'}" stroke="${on ? 'var(--yellow)' : 'var(--chalk-dim)'}" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
function fmtDate(iso) { try { return new Date(iso).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }); } catch (e) { return ''; } }
function levelBar(k) {
  const max = maxLevel(k), L = levelNow(k), r = state.rec[k] || [];
  let streak = 0;
  for (let i = r.length - 1; i >= 0 && r[i]; i--) streak++;
  const pct = Math.min(.95, Math.max(streak / 5, r.slice(-8).filter(Boolean).length / 7));
  const segs = Array.from({ length: max }, (_, i) => `<span class="seg-bar"><i style="width:${Math.round((state.mastered[k] || i < L - 1 ? 1 : i === L - 1 ? pct : 0) * 100)}%"></i></span>`).join('');
  return `<span class="lvlbar ${state.mastered[k] ? 'done' : ''}" role="img" aria-label="Level ${L} of ${max}">${segs}</span>`;
}
// Every note the app teaches, low to high on each staff. Learned ones glow.
function hunterMap() {
  const known = knownNotes();
  const row = (c, lo, hi) => {  // always written low to high
    const items = [];
    for (let s = stepOf(lo); s <= stepOf(hi); s++) items.push({ p: pitchOf(s), noStem: true, cls: known.has(`${c}:${pitchOf(s)}`) ? 'caught' : 'wild' });
    return staffSvg({ clef: c, S: 9, width: 520, items, cl: 'map' });
  };
  return `<div class="hunter-map">${row('t', 'F3', 'E6')}${row('b', 'A1', 'G4')}</div>`;
}
function renderHome() {
  const caught = knownNotes().size, total = ORDER.flatMap(k => allItems(k)).filter(i => i.note && !i.keyOnly).length;
  const today = new Date().toDateString();
  const todayCount = state.sessions.filter(s => new Date(s.d).toDateString() === today).reduce((t, s) => t + s.n, 0);
  const chip = k => `<button class="chip ${TOPIC[k].star ? 'star-chip' : ''}" data-act="chip" data-k="${k}" aria-pressed="${!!state.on[k]}"><strong>${esc(TOPIC[k].name)}</strong><small>${esc(TOPIC[k].note)} · level ${levelNow(k)}</small>${levelBar(k)}</button>`;
  return `
  <header class="top"><h1>${esc(greet('Hello'))}</h1><button class="link" data-act="parent">For grown-ups</button></header>
  <section>
    <div class="goal-head"><h2>Notes learned</h2><span class="count">${caught} of ${total}</span></div>
    ${hunterMap()}
  </section>
  <section>
    <h2>What are we practicing?</h2>
    <div class="chips">${ORDER.map(chip).join('')}</div>
  </section>
  <button class="start" data-act="start">Start <small>${state.perSession} questions</small></button>
  <section>
    <h2>Songs to play</h2>
    <div class="songs">${SONGS.map(s => { const r = state.songs[s.id]; return `<button class="song-btn" data-act="song" data-id="${s.id}">${r ? starSvg(r.best === 0) : starSvg(false)}<span><strong>${esc(s.name)}</strong><small>${esc(s.tag)}</small></span></button>`; }).join('')}</div>
  </section>
  <p class="meta">${todayCount ? `${todayCount} questions so far today. ` : ''}${state.total} answered since the start.</p>`;
}
function promptRow(text) {
  return `<div class="prompt-row"><span class="prompt">${esc(text)}</span>${canSpeak ? `<button class="say" data-act="say" aria-label="Read it aloud">${speakerIcon}</button>` : ''}</div>`;
}
// The staff for a note problem. Misses bring in the walk from the nearest landmark: first as a hint, then all the way.
function noteStaff(p, S = 16) {
  const walk = (p.tries > 0 || p.revealed) && !(p.done && !p.revealed) ? walkTo(p.clef, stepOf(p.p)) : null;
  const items = [{ p: p.p, d: 'q', acc: p.acc || undefined, cls: p.done ? (p.revealed ? 'try' : 'ok') : '' }];
  return staffSvg({ clef: p.clef, S, width: S * 17, lo: p.lo, hi: p.hi, items, noteX: S * 13.5, walk: walk && walk.steps.length > 1 ? { steps: walk.steps, hide: !p.done } : null });
}
function placeStaff(p) {
  const S = 20, width = 340, x = 240;
  const items = p.done ? [{ p: p.p, noStem: true, cls: p.revealed ? 'try' : 'ok' }] : [];
  const yT = (Math.max(topOf(p.clef) + (p.clef === 't' ? 3 : 0), p.hi, p.lo) - topOf(p.clef)) / 2 * S + S * 2.2;
  const placed = !p.done && p.sel != null ? placedNote(p.clef, p.sel, x, S, yT) : '';
  const walk = p.revealed ? walkTo(p.clef, p.step) : null;
  return staffSvg({ clef: p.clef, S, width, lo: p.lo, hi: p.hi, items, noteX: x, live: !p.done, placed, walk: walk && walk.steps.length > 1 ? { steps: walk.steps, hide: false } : null, cl: 'tall' });
}
function rowStaff(p) {
  const size = p.notes.length, S = 24, width = size === 8 ? 620 : 520;
  const cls = (n, i) => p.playAt === i ? 'now' : n.state === 'ok' ? 'ok' : n.state === 'late' ? 'late' : n.state === 'shown' ? 'try' : i === p.at && !p.done ? 'now' : '';
  const low = Math.min(CLEF[p.clef].bottom, ...p.notes.map(n => n.step));
  const extra = ({ x, Y }) => {
    const labels = p.notes.map((n, i) => n.state ? `<text class="row-l ${cls(n, i)}" x="${x[i]}" y="${Y(low) + S * 2}" font-size="${S * .95}">${letterOf(n.step)}</text>` : '');
    const arrow = p.done ? '' : `<path class="row-arrow" d="M${x[p.at]} ${Y(low) + S * .95}l${-S * .4} ${S * .6}h${S * .8}z"/>`;
    return labels.join('') + arrow;
  };
  return staffSvg({ clef: p.clef, S, width, even: true, items: [...p.notes.map((n, i) => ({ p: n.p, d: 'q', cls: cls(n, i) })), { bar: 1 }], extra, cl: 'row', label: `${size} notes on the ${CLEF[p.clef].name} staff` });
}
function rowButtons(p) {
  if (p.done) return '';
  if (hearing()) return listenPanel('Listening. Play each note on your piano.');
  if (p.rowKeys) {
    return `<div class="key-wrap live">${pianoSvg({ from: p.from, whites: p.whites, letters: 'c' })}${pianoHint(p)}</div>`;
  }
  return `${micProblem()}<div class="choices letters">${'ABCDEFG'.split('').map(l => `<button class="choice" data-act="row-letter" data-l="${l}">${l}</button>`).join('')}</div>`;
}
function pianoFor(p) {
  const marks = {};
  if (p.litMidi != null) marks[p.litMidi] = 'hl';
  for (const m of p.wrongKeys || []) marks[m] = 'no';
  if (p.done) {
    if (p.chosen != null) marks[p.chosen] = 'ok';
    else if (p.targetMidi) marks[p.targetMidi] = 'ok';
    else if (p.okMidi) for (let i = 0; i < p.whites; i++) { const m = whiteMidi(p.from + i); for (const x of [m, m + 1]) if (p.okMidi(x) && (x === m || isBlack(x))) marks[x] = 'ok'; }
  }
  return `<div class="key-wrap ${p.done ? '' : 'live'}">${pianoSvg({ from: p.from, whites: p.whites, marks, ...(p.pianoOpts || {}) })}${pianoHint(p)}</div>`;
}
// When Middle C is off this stretch of keys, say which way it is.
function pianoHint(p) {
  if (p.pianoOpts?.star === false || !p.clef) return '';
  const lo = whiteMidi(p.from), hi = whiteMidi(p.from + p.whites - 1);
  if (MIDDLE_C < lo) return '<p class="note center">← Middle C is off to the left</p>';
  if (MIDDLE_C > hi) return '<p class="note center">Middle C is off to the right →</p>';
  return '';
}
function choicesHtml(p) {
  const okIdx = p.choices.findIndex(c => c.ok);
  const cls = p.layout === 'letters' ? 'letters' : p.layout === 'vis' ? 'vis' : p.layout === 'nums' ? 'nums' : 'words';
  return `<div class="choices ${cls}">${p.choices.map((c, j) => {
    const st = p.wrong.includes(j) ? 'no' : (p.done && j === okIdx ? 'ok' : '');
    return `<button class="choice ${st}" data-act="pick" data-i="${j}" ${p.done || p.wrong.includes(j) ? 'disabled' : ''} aria-label="${esc(c.label || c.t || `Choice ${j + 1}`)}">${c.vis || esc(c.t)}</button>`;
  }).join('')}</div>`;
}
function feedbackHtml(p) {
  if (p.done && !p.revealed) return `<span class="big good">${esc(p.praise)}</span>${p.answerText ? `<span class="how">${esc(p.answerText())}</span>` : ''}`;
  if (p.revealed) return `<span class="big try">${esc(p.lastWrong || 'Here it is.')}</span><span class="how">${esc(p.answerText ? p.answerText() : '')}</span>${p.clef && p.step != null && p.mode !== 'key' && !p.item.twin ? `<span class="how">${esc(walkWords(p.clef, stepOf(p.p)))}</span>` : ''}`;
  if (p.tries) return `<span class="big try">${esc(p.lastWrong)}</span><span class="how">${p.clef && p.item.note ? esc(hintWords(p.clef, stepOf(p.p))) : 'Try again.'}</span>`;
  return '';
}
function chapterShow(c) {
  const s = c.show || {};
  const labelled = (clef, ps) => staffSvg({ clef, S: 13, width: 340, items: ps.map(x => ({ p: x, d: 'w', acc: parseP(x).acc || undefined })), extra: ({ x, Y, S }) => ps.map((pp, i) => `<text class="walk final" x="${x[i]}" y="${stepOf(pp) >= CLEF[clef].bottom + 4 ? Y(stepOf(pp)) - S * 1.1 - (ledgersFor(clef, stepOf(pp)) ? 0 : 0) : Y(stepOf(pp)) + S * 1.9}" text-anchor="middle" font-size="${S * 1.15}">${prettySym(pp)}</text>`).join('') });
  if (s.pair) {
    const pairLo = Math.min(stepOf(s.pair[0]), CLEF.t.bottom) - 1, pairHi = Math.max(stepOf(s.pair[1]), topOf('b')) + 1;
    return `<div class="pair">${staffSvg({ clef: 't', S: 12, width: 170, lo: pairLo, items: [{ p: s.pair[0], d: 'w' }] })}${staffSvg({ clef: 'b', S: 12, width: 170, hi: pairHi, items: [{ p: s.pair[1], d: 'w' }] })}</div>`;
  }
  if (s.clef) return labelled(s.clef, s.p);
  if (s.sig) return sigStaff(s.sig);
  if (s.tied) return tiedNotes(s.rhythm[0], s.rhythm[1]);
  if (s.rhythm) return smallRhythm(s.rhythm, { width: 320, S: 14 });
  if (s.bar) return smallRhythm([...s.bar, '|'], { width: 340, S: 13, time: s.time });
  if (s.accs) return `<div class="pair">${['G#4', 'Bb4'].map(x => staffSvg({ clef: 't', S: 12, width: 170, items: [{ p: x, acc: parseP(x).acc }] })).join('')}</div>`;
  if (s.marks) return `<div class="mark-row">${s.marks.map(m => `<div class="mark-cell">${markSvg(m)}<small>${esc(MARKS[m].word)}</small></div>`).join('')}</div>`;
  if (s.demo) return pianoSvg({ ...s.demo, from: stepOf(s.demo.from), letters: s.demo.letters === 'lit' ? 'c' : s.demo.letters });
  if (s.keys) {
    const from = stepOf('C4'), hl = s.keys === 'CDE' ? ['C', 'D', 'E'] : s.keys === 'FGAB' ? ['F', 'G', 'A', 'B'] : [];
    const marks = {};
    for (let i = 0; i < 8; i++) if (hl.includes(letterOf(from + i))) marks[whiteMidi(from + i)] = 'ok';
    if (s.keys === 'mid') return pianoSvg({ from: stepOf('C3'), whites: 15, marks: { 60: 'ok' }, noLabels: true, star: true });
    if (s.keys === 'sharp') return pianoSvg({ from, whites: 8, letters: 'all', star: false, marks: { 61: 'hl', 66: 'hl' } });
    if (s.keys === 'flat') return pianoSvg({ from, whites: 8, letters: 'all', star: false, marks: { 63: 'hl', 70: 'hl' } });
    return pianoSvg({ from, whites: 8, letters: hl.length ? 'all' : false, star: false, marks: hl.length ? marks : { 61: 'hl', 63: 'hl', 66: 'hl2', 68: 'hl2', 70: 'hl2' } });
  }
  return '';
}
function renderPlay() {
  const p = sess.probs[sess.i], total = sess.probs.length, last = sess.i === total - 1;
  const ticks = sess.probs.map((q, j) => `<span class="${q.mode === 'chapter' || q.mode === 'intro' ? (j <= sess.i ? 'intro' : 'intro-later') : q.result === true ? 'done' : q.result === false ? 'miss' : j === sess.i ? 'now' : ''}"></span>`).join('');
  const topName = TOPIC[p.topic]?.name || '';
  const tag = { again: ' · Back again', easier: ' · Review', check: ' · Quick check' }[p.kind] || '';
  const head = `<div class="play-top"><div class="ticks" aria-label="${sess.i + 1} of ${total}">${ticks}</div><span class="skill-label">${esc(topName)}${p.level ? ` · level ${p.level}` : ''}${tag}</span></div>`;
  const foot = `<button class="link" data-act="home" style="align-self:flex-start">Stop and go home</button>`;
  if (p.mode === 'chapter') {
    const c = p.chapter;
    return `${head}<div class="chapter"><span class="tag">New</span><h1>${esc(c.name)}</h1><div class="chapter-vis">${chapterShow(c)}</div><p class="lesson">${esc(c.lesson)}</p></div>
    <div class="next-row"><button class="ghost" data-act="say">${speakerIcon.replace('<svg', '<svg class="ic"')} Read it</button><button class="start" data-act="next" id="next">Start</button></div>${foot}`;
  }
  if (p.mode === 'intro') {
    const c = p.intro, it = p.item;
    const vis = c.kind === 'note' ? staffSvg({ clef: it.clef, S: 24, width: 408, items: [{ p: it.p, d: 'q' }], noteX: 324, walk: walkTo(it.clef, stepOf(it.p)).steps.length > 1 ? { steps: walkTo(it.clef, stepOf(it.p)).steps, hide: false } : null }) : c.vis;
    return `${head}<div class="problem"><span class="tag">New</span><button class="vis-btn" data-act="hear-intro" aria-label="Hear it">${vis}</button><div class="word">${esc(c.title)}</div><p class="how center">${esc(c.words)}</p></div>
    <div class="next-row"><button class="ghost" data-act="hear-intro">♪ Hear it</button><button class="ghost" data-act="say">${speakerIcon.replace('<svg', '<svg class="ic"')} Read it</button><button class="start" data-act="next" id="next">Got it</button></div>${foot}`;
  }
  let body = '', controls = '';
  const isNoteStaff = p.item.note && (p.mode === 'choice' || p.mode === 'key' || p.mode === 'real');
  if (p.mode === 'row') {
    return `${head}<div class="problem" id="problem">${promptRow(p.prompt)}<div class="staff-wrap row-wrap">${rowStaff(p)}</div></div>${rowButtons(p)}
    <div class="feedback">${p.done ? `<span class="big ${p.misses ? 'try' : 'good'}">${esc(p.praise)}</span>${p.lastWrong ? `<span class="how">${esc(p.lastWrong)}</span>` : ''}` : p.lastWrong ? `<span class="how try-line">${esc(p.lastWrong)}</span>` : ''}</div>
    ${p.done ? `<div class="next-row"><button class="ghost" data-act="row-hear">${p.playAt >= 0 ? '♪ Playing…' : '♪ Hear the row'}</button><button class="start" data-act="next" id="next">${last ? 'My stars' : 'Next'}</button></div>` : ''}${foot}`;
  }
  if (p.mode === 'place') {
    body = promptRow(p.prompt) + `<div class="staff-wrap">${placeStaff(p)}</div>`;
    controls = p.done ? '' : `<div class="next-row"><button class="start" data-act="check-place" ${p.sel == null ? 'disabled' : ''}>That’s it</button></div><p class="note center">Tap or drag on the staff to move the note.</p>`;
  } else if (p.mode === 'key') {
    const staff = p.item.note ? `<div class="staff-wrap small">${noteStaff(p, 20)}</div>` : p.vis ? `<div class="staff-wrap small">${p.vis}</div>` : '';
    // when listening, the real piano replaces the one on screen
    body = hearing() && !p.done && !p.onScreen
      ? promptRow(p.prompt.replace(/^(Tap|Find this note on the piano\.)/, m => m === 'Tap' ? 'Play' : 'Play this note on your piano.')) + staff + listenPanel('Listening.')
      : promptRow(p.prompt) + staff + micProblem() + pianoFor(p);
  } else if (p.mode === 'real') {
    body = promptRow(p.prompt) + `<div class="staff-wrap">${noteStaff(p)}</div>`;
    controls = p.done ? '' : !p.heard
      ? `<div class="next-row"><button class="start" data-act="real-hear">♪ I played it. Check me.</button></div>`
      : `<div class="next-row"><button class="start" data-act="said-yes">✓ It matched</button><button class="ghost" data-act="said-no">It didn’t</button></div><div class="feedback"><span class="how">${esc(p.answerText())}</span></div>`;
  } else {
    let vis = '';
    if (isNoteStaff || p.item.twin) vis = `<div class="staff-wrap">${noteStaff(p, p.item.twin ? 18 : 24)}</div>`;
    else if (p.vis) vis = `<div class="staff-wrap">${p.vis}</div>`;
    else if (p.hl != null) vis = pianoSvg({ from: p.from, whites: p.whites, marks: { [p.hl]: 'hl' }, letters: false, star: false });
    else if (p.keyStrip) vis = pianoSvg(p.keyStrip);
    const hearBtn = p.autoHear ? `<div class="next-row"><button class="ghost" data-act="replay">♪ Play it again</button></div>` : '';
    body = promptRow(p.prompt) + vis + hearBtn;
    controls = choicesHtml(p);
  }
  const hearAfter = p.done && (p.hearP || p.hear || p.hearMidi) && !p.autoHear ? `<button class="ghost" data-act="replay">♪ Hear it</button>` : '';
  return `${head}<div class="problem" id="problem">${body}</div>${controls}
  <div class="feedback">${feedbackHtml(p)}</div>
  ${p.done ? `<div class="next-row">${hearAfter}<button class="start" data-act="next" id="next">${last ? 'My stars' : 'Next'}</button></div>` : ''}${foot}`;
}
function renderDone() {
  if (sess.check) {
    const parts = Object.keys(CHECK_LEVELS).map(k => `<li>${esc(TOPIC[k].name)}: starts at level ${levelNow(k)}, ${esc(LEVELS[k][levelNow(k) - 1].name)}</li>`).join('');
    return `<h1>Quick check done</h1><ul class="ups">${parts}</ul><p class="note">Levels can be moved up or down on the grown-ups page at any time.</p><div class="row-btns"><button class="start" data-act="home">Home</button></div>`;
  }
  const score = sess.results.filter(Boolean).length, n = sess.results.length;
  const pct = n ? score / n : 0, tier = pct >= .9 ? 0 : pct >= .7 ? 1 : pct >= .4 ? 2 : 3;
  if (!sess.cheer) sess.cheer = pick(CHEERS[tier]);
  const ups = lastChanges.filter(c => c[1] === 'up');
  return `<h1>${esc(greet(sess.cheer.head))}</h1>
  <p class="story left">${esc(sess.cheer.line)}</p>
  <p class="meta">${score} of ${n} all right on the first try.${sess.learned.length ? ` ${sess.learned.length} newly learned.` : ''}</p>
  <div class="stars">${sess.results.map(starSvg).join('')}</div>
  ${ups.length ? `<section><h2>Next level</h2><ul class="ups">${ups.map(([k]) => `<li>${esc(TOPIC[k].name)}: ${esc(LEVELS[k][state.levels[k] - 1].name)}</li>`).join('')}</ul></section>` : ''}
  <div class="row-btns"><button class="start" data-act="start">Again!</button><button class="ghost" data-act="home">Home</button></div>`;
}
function renderSong() {
  const { s, bars, flat, i, letters, playing } = song, finished = i >= flat.length;
  const cursor = playing >= 0 ? playing : i;
  let idx = 0, linesHtml = '';
  for (let b = 0; b < bars.length; b += 2) {
    const items = [];
    const lineBars = bars.slice(b, b + 2);
    const noteIdx = [];
    lineBars.forEach((bar, bi) => {
      bar.forEach(x => { noteIdx.push(idx); items.push({ p: x.p, d: x.d, cls: idx === cursor && !finished ? 'now' : idx < i ? 'played' : '' }); idx++; });
      items.push({ bar: b + bi === bars.length - 1 ? 'end' : 1 });
    });
    const notesOnly = items.filter(x => x.p);
    const extra = letters ? ({ x, Y, S }) => { let k = 0; return items.map((it, q) => it.p ? `<text class="song-l" x="${x[q]}" y="${Y(Math.min(CLEF[s.clef].bottom, stepOf(it.p))) + S * 2.5}" text-anchor="middle" font-size="${S}">${letterOf(stepOf(it.p))}</text>` : '').join(''); } : null;
    linesHtml += staffSvg({ clef: s.clef, S: 11, width: 400, time: b === 0 ? s.time : null, items, extra, lo: s.clef === 't' ? stepOf('G3') : stepOf(flatLow(flat)), hi: s.clef === 'b' ? Math.max(topOf('b'), ...notesOnly.map(x => stepOf(x.p))) : Math.max(topOf('t'), ...flat.map(x => stepOf(x.p))), cl: 'song-line' });
  }
  const wantMidi = !finished && playing < 0 ? midiOf(flat[i].p) : null;
  const pm = {};
  if (playing >= 0) pm[midiOf(flat[playing].p)] = 'ok';
  return `<header class="top"><h1 class="song-title">${esc(s.name)}</h1><button class="ghost" data-act="home">Songs</button></header>
  <p class="note">${esc(s.tag)} ${hearing() || state.realPiano ? 'Play along on your piano.' : 'Read each note and tap its key.'}</p>
  <div class="row-btns song-ctrl"><button class="ghost" data-act="song-hear">${playing >= 0 ? '■ Stop' : '♪ Hear the song'}</button><button class="ghost" data-act="song-letters" aria-pressed="${letters}">${letters ? 'Hide letters' : 'Show letters'}</button><button class="ghost" data-act="song-restart">From the top</button></div>
  <div class="song-lines">${linesHtml}</div>
  ${finished ? `<div class="feedback"><span class="big good">You played it!</span><span class="how">${song.misses ? `${song.misses} wrong key${song.misses > 1 ? 's' : ''} along the way. Try it again, or play it on your real piano.` : 'Not one wrong key. Now try it on your real piano.'}</span></div>` : ''}
  ${song.flash ? `<div class="feedback"><span class="try">${esc(song.flash)}</span></div>` : ''}
  ${!finished ? (hearing() ? listenPanel('Listening. Play each note on your piano.') : state.realPiano && !listenMode() ? `<div class="next-row"><button class="start" data-act="song-next">Next note</button></div>` : `<div class="song-keys">${pianoSvg({ from: song.from, whites: song.whites, letters: letters ? 'all' : 'c', marks: pm })}</div>`) : `<div class="row-btns"><button class="start" data-act="song-restart">Play again</button><button class="ghost" data-act="home">Home</button></div>`}`;
}
const flatLow = flat => pitchOf(Math.min(...flat.map(x => stepOf(x.p))));
function renderParent() {
  const lv = ORDER.map(k => {
    const max = maxLevel(k), L = levelNow(k), r = state.rec[k] || [];
    return `<div class="lvl"><div><strong>${esc(TOPIC[k].name)}</strong><small>${state.mastered[k] ? 'Mastered · ' : ''}${esc(LEVELS[k][L - 1].name)}${r.length ? ` · ${r.filter(Boolean).length} of last ${r.length} right first try` : ''}</small>
      ${confirmTopic === k ? `<span class="row-btns"><button class="link danger-text" data-act="topic-reset-yes" data-k="${k}">Yes, reset ${esc(TOPIC[k].name)}</button><button class="link" data-act="topic-reset-no">Cancel</button></span>` : `<button class="link small-link" data-act="topic-reset" data-k="${k}">Reset</button>`}</div>
      <div class="stepper"><button data-act="lvl" data-k="${k}" data-d="-1" aria-label="Lower ${esc(TOPIC[k].name)} level" ${L <= 1 ? 'disabled' : ''}>−</button><span>${L}/${max}</span><button data-act="lvl" data-k="${k}" data-d="1" aria-label="Raise ${esc(TOPIC[k].name)} level" ${L >= max ? 'disabled' : ''}>+</button></div></div>`;
  }).join('');
  const seg = (act, cur, opts) => `<div class="seg">${opts.map(([v, t]) => `<button data-act="${act}" data-v="${v}" aria-pressed="${String(cur) === String(v)}">${t}</button>`).join('')}</div>`;
  const tricky = Object.entries(state.words).filter(([wid, w]) => (w.m || 0) > 0 && anyItem(wid)).sort((a, b) => (b[1].m - b[1].r) - (a[1].m - a[1].r)).slice(0, 10);
  const cards = state.cards.slice().sort((a, b) => a.due - b.due);
  const when = d => { const days = Math.round((d - startOfDay()) / DAY); return days <= 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`; };
  return `
  <header class="top"><h1>For grown-ups</h1><button class="ghost" data-act="home">${childName() ? `Back to ${esc(childName())}` : 'Back'}</button></header>
  <section>
    <h2>Where to start</h2>
    <p class="note">A quick check asks 18 notes, one try each. It skips ${esc(N())} past whatever is already solid, and stops counting each topic at the first miss.</p>
    <div class="row-btns"><button class="ghost" data-act="check">Start a quick check</button></div>
  </section>
  <section>
    <h2>Levels</h2>
    <p class="note">A topic moves up when every note in the level is known, or after 5 in a row or 7 of the last 8 right on the first try. It moves down after 4 misses in 6. Earlier levels keep coming back for review. Finishing a topic turns on the next one.</p>
    <div class="levels">${lv}</div>
  </section>
  <section>
    <h2>Settings</h2>
    <form class="name-form" id="name-form"><label for="child-name">Child's name</label><div class="row-btns"><input id="child-name" class="pick" maxlength="24" autocomplete="off" value="${esc(childName())}"><button class="ghost" type="submit">Save</button></div></form>
    <div class="row-btns"><span>Questions per round</span><div class="seg">${[5, 10, 15, 20].map(x => `<button data-act="per" data-n="${x}" aria-pressed="${state.perSession === x}">${x}</button>`).join('')}</div></div>
    <div class="row-btns"><span>Read aloud automatically</span>${seg('autospeak', state.autoSpeak ? 1 : 0, [[1, 'On'], [0, 'Off']])}</div>
    <p class="note">Off: nothing is spoken until you tap the speaker button. Music sounds always play.</p>
    <div class="row-btns"><span>Answer note questions with</span>${seg('answerwith', state.answerWith, [['letters', 'Letter buttons'], ['piano', 'Keys on screen'], ['mix', 'Mix of both'], ['listen', 'Real piano']])}</div>
    <p class="note">Letter buttons: any C is answered with the C button. Keys on screen: each note must be tapped on its exact key. Mix of both: some questions use letters and some use keys, about half and half. Real piano: the microphone listens to ${esc(N())} play. It checks the letter, not the octave, because a microphone can mistake a piano’s octave. Nothing is recorded or sent anywhere.</p>
    <div class="row-btns"><button class="ghost" data-act="mic-test">${micTest ? 'Stop the test' : 'Test the microphone'}</button></div>
    ${micTest ? `${mic.status === 'on' ? `<div class="listen-panel"><span class="listen-dot"></span><span class="listen-text">Play single notes, low and high.</span><strong id="heard-exact" class="heard"></strong><span class="mic-bar"><i id="mic-level"></i></span></div><ul class="list" id="mic-log">${micLog.map(x => `<li><span>${esc(x)}</span></li>`).join('')}</ul>` : `<p class="note">${mic.status === 'asking' ? 'Asking to use the microphone…' : mic.status === 'denied' ? 'The microphone is blocked. Allow it for this site in Settings, then try again.' : 'This device can’t use the microphone here.'}</p>`}` : ''}
    <div class="row-btns"><span>Real piano nearby</span>${seg('realpiano', state.realPiano ? 1 : 0, [[1, 'On'], [0, 'Off']])}</div>
    <p class="note">On: "find this key" questions and songs are played on your own piano. The app plays the right note so ${esc(N())} can check by ear. Off: tap the keys on screen.</p>
    <div class="row-btns"><span>Speaking speed</span>${seg('speed', state.speed, [['normal', 'Normal'], ['slow', 'Slower']])}</div>
  </section>
  <section>
    <h2>Coming back for review</h2>
    <p class="note">A missed note comes back tomorrow, then after 3, 7, 14 and 30 days while it keeps being right. ${state.cleared ? `${state.cleared} learned for good so far.` : ''}</p>
    ${cards.length ? `<ul class="list">${cards.slice(0, 12).map(c => `<li><span>${esc(anyItem(c.wid) ? itemLabel(anyItem(c.wid)) : c.wid)}</span><span>${when(c.due)} · step ${c.box + 1} of ${REVIEW_DAYS.length}</span></li>`).join('')}</ul>` : '<p class="note">Nothing to review yet.</p>'}
  </section>
  <section>
    <h2>Tricky notes</h2>
    ${tricky.length ? `<ul class="list">${tricky.map(([wid, w]) => `<li><span>${esc(itemLabel(anyItem(wid)))}</span><span>missed ${w.m}×</span></li>`).join('')}</ul>` : '<p class="note">Notes that get missed show up here, so you can look for them together at the piano.</p>'}
  </section>
  <section>
    <h2>Recent rounds</h2>
    ${state.sessions.length ? `<ul class="list">${state.sessions.slice(0, 8).map(s => `<li><span>${fmtDate(s.d)} · ${s.skills.map(k => TOPIC[k] ? TOPIC[k].name : k).join(', ')}</span><span>${s.score}/${s.n}</span></li>`).join('')}</ul>` : '<p class="note">No rounds yet.</p>'}
  </section>
  <section>
    <h2>Start over</h2>
    <p class="note">Clears levels, learned notes, review and rounds. Keeps the name, settings and sync.</p>
    <div class="row-btns">${confirmWipe ? `<button class="ghost danger" data-act="wipe-yes">Yes, erase all progress</button><button class="link" data-act="wipe-no">Cancel</button>` : `<button class="ghost danger" data-act="wipe">Reset all progress</button>`}</div>
  </section>
  ${renderSync()}
  <p class="note">Piano sound: <a href="https://archive.org/details/SalamanderGrandPianoV3" target="_blank" rel="noopener">Salamander Grand Piano V3</a> by Alexander Holm, used under <a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noopener">CC BY 3.0</a>, converted to shorter MP3 files. Clefs and rests are drawn from the Noto Music font (SIL Open Font License). All songs are traditional or public domain.</p>`;
}
function renderSync() {
  if (!syncAvailable) return '<p class="note">Progress is saved on this device.</p>';
  if (!sync.code) return `<section><h2>Sync between devices</h2>
    <p class="note">Progress is saved on this device. Turn on sync to share it with another iPad, phone or laptop, using a private code. (This is separate from the Chalkboard's code.)</p>
    <div class="row-btns"><button class="ghost" data-act="sync-new">Turn on sync</button></div>
    <div class="row-btns"><label for="join-code">Already have a code?</label><input id="join-code" class="pick code-input" placeholder="ABCD-EFGH-JKMN" autocomplete="off" autocapitalize="characters" spellcheck="false"><button class="ghost" data-act="sync-join">Join</button></div>
    ${sync.error === 'bad-code' ? '<p class="note danger-text">That code should be 12 letters and numbers, like ABCD-EFGH-JKMN.</p>' : ''}</section>`;
  const at = sync.lastAt ? new Date(sync.lastAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : '';
  const status = sync.status === 'ok' ? `Synced${at ? ' at ' + at : ''}.` : sync.status === 'syncing' ? 'Syncing…' : sync.error === 'offline' ? 'Offline. Progress is safe on this device and will sync when you are back online.' : `Could not sync (${esc(sync.error)}). Progress is safe on this device.`;
  return `<section><h2>Sync between devices</h2>
    <p class="note">Type this code into the grown-ups page on another device to share progress. Keep it private.</p>
    <div class="row-btns"><strong class="sync-code">${esc(sync.code)}</strong></div><p class="note">${status}</p>
    <div class="row-btns"><button class="ghost" data-act="sync-now">Sync now</button><button class="link" data-act="sync-off">Stop syncing on this device</button></div></section>`;
}
function render(shake) {
  app.innerHTML = screen === 'play' ? renderPlay() : screen === 'done' ? renderDone() : screen === 'parent' ? renderParent() : screen === 'song' ? renderSong() : renderHome();
  if (shake) { const el = document.querySelector('.choices, .key-wrap, .staff-wrap, .song-keys'); el && el.classList.add('shake'); }
  // keep the note being played in sight above the keys
  if (screen === 'song') document.querySelector('.song-lines .n-head.now, .song-lines .n-open.now')?.closest('svg')?.scrollIntoView?.({ block: 'center' });
}

/* ---------- events ---------- */
function resetTopic(k) {
  state.levels[k] = 1;
  delete state.rec[k]; delete state.mastered[k];
  state.done[k] = 0;
  state.cards = state.cards.filter(c => c.topic !== k);
  for (const it of allItems(k)) delete state.words[it.wid];
  for (let i = 1; i <= maxLevel(k); i++) delete state.chapters[chapterKey(k, i)];
}
const ACTIONS = {
  parent() { screen = 'parent'; confirmWipe = false; confirmTopic = null; render(); },
  home() { hush(); stopMic(); micTest = false; screen = 'home'; song = null; render(); window.scrollTo?.({ top: 0 }); },
  chip(d) { state.on[d.k] = !state.on[d.k]; save(); render(); },
  start() { startSession(); window.scrollTo?.({ top: 0 }); },
  check() { startCheck(); window.scrollTo?.({ top: 0 }); },
  next() { next(); },
  'row-letter'(d) { rowPress(d.l); },
  'row-hear'() { freeSpeaker(); playRow(sess.probs[sess.i]); },
  pick(d) { answer(+d.i); },
  say() { const p = sess?.probs[sess.i]; if (p) say(slideWords(p)); },
  replay() { const p = sess.probs[sess.i]; if (p.done) freeSpeaker(); if (p.hear) playHear(p.hear, p.onBeat); else if (p.hearP) playP(p.hearP); else if (p.hearMidi) tone(p.hearMidi); },
  'hear-intro'() { const p = sess.probs[sess.i]; if (p.intro.hear) playHear(p.intro.hear, p.intro.onBeat); else if (p.item.note) playP(p.item.p); },
  'check-place'() { checkPlaced(); },
  'real-hear'() { const p = sess.probs[sess.i]; p.heard = true; playP(p.p); render(); },
  'said-yes'() { selfCheck(true); },
  'said-no'() { selfCheck(false); },
  song(d) { openSong(d.id); window.scrollTo?.({ top: 0 }); },
  'song-hear'() { hearSong(); },
  'song-letters'() { song.letters = !song.letters; render(); },
  'song-restart'() { hush(); song.i = 0; song.misses = 0; song.flash = null; song.playing = -1; render(); },
  'song-next'() { const x = song.flat[song.i]; playP(x.p, Math.max(.6, BEATS[x.d])); song.i++; if (song.i >= song.flat.length) finishSong(); render(); },
  lvl(d) { const v = Math.max(1, Math.min(maxLevel(d.k), levelNow(d.k) + +d.d)); state.levels[d.k] = v; state.rec[d.k] = []; save(); render(); },
  per(d) { state.perSession = +d.n; save(); render(); },
  autospeak(d) { state.autoSpeak = d.v === '1'; save(); render(); },
  answerwith(d) { state.answerWith = d.v; save(); render(); },
  async 'mic-test'() {
    micTest = !micTest; micLog = [];
    if (micTest) await startMic(); else stopMic();
    render();
  },
  realpiano(d) { state.realPiano = d.v === '1'; save(); render(); },
  speed(d) { state.speed = d.v; save(); render(); },
  'topic-reset'(d) { confirmTopic = d.k; render(); },
  'topic-reset-no'() { confirmTopic = null; render(); },
  'topic-reset-yes'(d) { resetTopic(d.k); confirmTopic = null; save(); render(); },
  wipe() { confirmWipe = true; render(); },
  'wipe-no'() { confirmWipe = false; render(); },
  'wipe-yes'() { const keep = { childName: state.childName, perSession: state.perSession, answerWith: state.answerWith, autoSpeak: state.autoSpeak, realPiano: state.realPiano, speed: state.speed }; state = Object.assign(defaultState(), keep); confirmWipe = false; save(); render(); },
  async 'sync-new'() { await startSync(newCode()); pushRemote(); render(); },
  async 'sync-join'() { const c = cleanCode(document.getElementById('join-code')?.value || ''); if (!c) { sync.error = 'bad-code'; render(); return; } sync.error = ''; await startSync(c); render(); },
  async 'sync-now'() { sync.status = 'syncing'; render(); await pullRemote(); render(); },
  'sync-off'() { stopSync(); render(); },
};
app.addEventListener('click', e => {
  const key = e.target.closest?.('[data-midi]');
  if (key) {
    audioReady();
    if (screen === 'song') { if (!state.realPiano) songTap(+key.dataset.midi); return; }
    if (screen === 'play' && key.closest('.key-wrap.live')) tapKey(+key.dataset.midi);
    return;
  }
  const b = e.target.closest?.('[data-act]');
  // a note on a staff plays when tapped, unless the whole staff is itself an answer button
  const note = !b && e.target.closest?.('[data-play]');
  if (note) { audioReady(); playP(note.dataset.play, 1.2); return; }
  if (!b || b.disabled) return;
  audioReady();
  ACTIONS[b.dataset.act]?.(b.dataset);
});
// Placing a note: tap or drag on the staff; the note follows and sounds at each new line or space.
function placeAt(e) {
  const svg = e.target.closest?.('svg[data-live]');
  if (!svg) return;
  const p = sess?.probs[sess.i];
  if (!p || p.done) return;
  const s = liveStepAt(svg, e.clientY);
  if (s === p.sel) return;
  p.sel = s;
  const x = 240, S = +svg.dataset.s, yTop = +svg.dataset.ytop;
  svg.querySelector('#placed').innerHTML = placedNote(p.clef, s, x, S, yTop);
  tone(whiteMidi(s), 0, .4, .45);
  const btn = document.querySelector('[data-act="check-place"]');
  if (btn) btn.disabled = false;
}
let dragging = false;
app.addEventListener('pointerdown', e => { if (e.target.closest?.('svg[data-live]')) { audioReady(); dragging = true; e.preventDefault(); placeAt(e); } });
app.addEventListener('pointermove', e => { if (dragging) placeAt(e); });
window.addEventListener('pointerup', () => { dragging = false; });
app.addEventListener('submit', e => {
  e.preventDefault();
  if (e.target.id !== 'name-form') return;
  state.childName = (document.getElementById('child-name')?.value || '').trim().slice(0, 24);
  save(); render();
});
document.addEventListener('keydown', e => {
  if (screen === 'play' && e.key === 'Enter' && sess.probs[sess.i].done && !e.target.closest?.('button')) next();
});
render();
initSync();
