/* Note Flashcards (Katie, 2026-11-14): for easy recall of where each note lives, one letter at a time.
   1. Meet the note: a card that says "This is G" beside a card showing G on the staff.
   2. Every G: the grand staff with every G that needs no ledger lines (F2 to G5, plus Middle C for C), and a
      keyboard of the same range underneath; he finds every G key, and each one lights up with its note on the staff.
   3. Quick review: a few cards mixing the letters done so far.
   The keyboard is 23 white keys, so it wants the iPad sideways; it only asks him to turn it if it's upright. */

const FLASH_ORDER = ['G', 'F', 'C', 'D', 'E', 'A', 'B'];
const FLASH_LO = stepOf('F2'), FLASH_HI = stepOf('G5'), FLASH_REVIEW = 6;
// the note shown on the "This is G" card: the landmark G and F, Middle C, and the others in the treble staff
const FLASH_MEET = { G: ['t', 'G4'], F: ['b', 'F3'], C: ['t', 'C4'], D: ['t', 'D4'], E: ['t', 'E4'], A: ['t', 'A4'], B: ['t', 'B4'] };
let flash = null;  // { L, step: 'meet' | 'every' | 'review' | 'done', found, wrongKey, qs, qi, msg }

// Every note of this letter on the grand staff without ledger lines (Middle C too, for C), low to high, with its staff.
function flashNotes(L) {
  const out = [];
  for (let s = FLASH_LO; s <= FLASH_HI; s++) if (letterOf(s) === L) out.push([s > stepOf('C4') || pitchOf(s) === 'C4' ? 't' : 'b', pitchOf(s)]);
  return out;
}
const flashDone = () => FLASH_ORDER.filter(L => state.flash?.[L]);

function openFlash(L) {
  hush();
  flash = { L, step: 'meet', found: [], msg: '' };
  screen = 'flash';
  render();
  window.scrollTo?.({ top: 0 });
  const [, p] = FLASH_MEET[L];
  setTimeout(() => playP(p, 1.4), 250);
}

function renderFlashMenu() {
  const done = new Set(flashDone());
  return `<header class="top"><h1>Note Flashcards</h1><button class="ghost" data-act="home">Back</button></header>
  <p class="note">One note at a time: meet it, find every one of it on the staff and the keyboard, then a quick review.</p>
  <div class="flash-letters">${FLASH_ORDER.map(L => `<button class="flash-pick ${done.has(L) ? 'done' : ''}" data-act="flash" data-l="${L}"><span class="fl">${L}</span><small>${done.has(L) ? '✓ done' : FLASH_MEET[L][1] === 'C4' ? 'Middle C and more' : L === 'G' ? 'treble G' : L === 'F' ? 'bass F' : ''}</small></button>`).join('')}</div>`;
}

function flashStaff(items, o = {}) {
  // a grand staff with the notes in columns, low on the left to high on the right, like the keyboard
  const t = items.map(([c, p], i) => c === 't' ? { p, d: 'w', cls: o.cls?.(i) || '' } : { skip: 1, d: 'w' });
  const b = items.map(([c, p], i) => c === 'b' ? { p, d: 'w', cls: o.cls?.(i) || '' } : { skip: 1, d: 'w' });
  return grandSvg({ S: o.S || 16, width: o.width || 520, even: true, t, b, cl: 'flash-staff' });
}

function renderFlash() {
  const f = flash, L = f.L, head = `<header class="top"><h1>${f.step === 'review' ? 'Quick review' : f.step === 'every' ? `Every ${L}` : f.step === 'done' ? 'Well done!' : `Meet ${L}`}</h1><button class="ghost" data-act="flash-menu">All notes</button></header>`;
  const rotate = `<div class="flash-rotate"><span>↻</span> Turn the iPad sideways to see the whole keyboard.</div>`;
  if (f.step === 'meet') {
    const [c, p] = FLASH_MEET[L];
    return `${head}<div class="flash-cards">
      <div class="flash-card flash-word"><span class="this-is">This is</span><span class="big-letter">${L}</span>${p === 'C4' ? '<span class="this-is">Middle C</span>' : ''}</div>
      <div class="flash-card">${flashStaff([[c, p]], { S: 18, width: 300, cls: () => 'now' })}<span class="flash-where">${esc(flashWhere(c, p))}</span></div>
    </div>
    <div class="next-row"><button class="ghost" data-act="flash-hear">♪ Hear it</button><button class="start" data-act="flash-every">Find every ${L} →</button></div>`;
  }
  if (f.step === 'every') {
    const notes = flashNotes(L), all = f.found.length === notes.length;
    const marks = {}; f.found.forEach(m => { marks[m] = 'ok'; }); if (f.wrongKey != null) marks[f.wrongKey] = 'no';
    return `${head}${rotate}<p class="flash-prompt">${all ? `You found all ${notes.length} ${L}s!` : `There are ${notes.length} ${L}s on the staff. Find every ${L} on the keyboard.`}</p>
    <div class="staff-wrap flash-every">${flashStaff(notes, { S: 13, width: 600, cls: i => f.found.includes(midiOf(notes[i][1])) ? 'ok' : '' })}</div>
    <div class="key-wrap live flash-keys">${pianoSvg({ from: FLASH_LO, whites: FLASH_HI - FLASH_LO + 1, letters: 'c', marks })}</div>
    <div class="feedback">${f.msg ? `<span class="how ${all ? '' : 'try-line'}">${esc(f.msg)}</span>` : ''}</div>
    ${all ? `<div class="next-row"><button class="start" data-act="flash-review">Quick review →</button></div>` : ''}`;
  }
  if (f.step === 'review') {
    const q = f.qs[f.qi], [c, p] = q.note, right = letterOf(stepOf(p));
    return `${head}<div class="ticks">${f.qs.map((x, k) => `<span class="${k < f.qi ? 'done' : k === f.qi ? 'now' : ''}"></span>`).join('')}</div>
    <div class="flash-cards one"><div class="flash-card">${flashStaff([[c, p]], { S: 18, width: 300, cls: () => q.done ? 'ok' : '' })}</div></div>
    <p class="flash-prompt">What note is this?</p>
    <div class="choices letters">${['A', 'B', 'C', 'D', 'E', 'F', 'G'].map(x => `<button class="choice ${q.wrong.includes(x) ? 'no' : q.done && x === right ? 'ok' : ''}" data-act="flash-letter" data-v="${x}" ${q.done || q.wrong.includes(x) ? 'disabled' : ''}>${x}</button>`).join('')}</div>
    <div class="feedback">${f.msg ? `<span class="${q.done ? 'big good' : 'how try-line'}">${esc(f.msg)}</span>` : ''}</div>
    ${q.done ? `<div class="next-row"><button class="start" data-act="flash-next">${f.qi === f.qs.length - 1 ? 'Done' : 'Next'}</button></div>` : ''}`;
  }
  const next = FLASH_ORDER.find(x => !state.flash?.[x]);
  return `${head}<div class="flash-cards"><div class="flash-card flash-word"><span class="this-is">You know</span><span class="big-letter">${L}</span></div></div>
  <div class="next-row">${next ? `<button class="start" data-act="flash" data-l="${next}">Next: meet ${next} →</button>` : ''}<button class="ghost" data-act="flash-menu">All notes</button></div>`;
}
// A plain sentence about where this note sits.
function flashWhere(c, p) {
  if (p === 'C4') return 'Middle C, on its own little line between the two staffs.';
  if (p === 'G4') return 'On the line the treble clef curls around.';
  if (p === 'F3') return 'On the line between the bass clef’s two dots.';
  return `${describe(c, stepOf(p)).replace(/^on /, 'On ').replace(/^in /, 'In ').replace(/^just /, 'Just ')}${c === 't' ? ' of the treble staff' : ' of the bass staff'}.`.replace('the staff of the', 'the');
}

function flashKey(midi) {
  const f = flash;
  if (!f || f.step !== 'every') return;
  tone(midi, 0, .9, .7);
  const notes = flashNotes(f.L).map(([, p]) => midiOf(p));
  if (notes.includes(midi)) {
    if (!f.found.includes(midi)) f.found.push(midi);
    f.wrongKey = null;
    const left = notes.length - f.found.length;
    f.msg = left ? `Yes, that’s ${withA(f.L)}! ${left} more to find.` : `All ${notes.length}! Every ${f.L} on the staff has its key.`;
    if (!left) grunt('happy', .6);
  } else {
    f.wrongKey = midi;
    f.msg = `That’s ${isBlack(midi) ? 'a black key' : withA(keyName(midi))}. Look for ${f.L}.`;
  }
  render();
}
function startFlashReview() {
  const f = flash, letters = flashDone().includes(f.L) ? flashDone() : [...flashDone(), f.L];
  const pool = letters.flatMap(flashNotes);
  // mostly the new letter, some of the ones before
  const qs = [];
  while (qs.length < FLASH_REVIEW) {
    const from = qs.length % 2 === 0 || letters.length === 1 ? flashNotes(f.L) : pool;
    let n; do n = pick(from); while (qs.length && n[1] === qs.at(-1).note[1] && from.length > 1);
    qs.push({ note: n, tries: 0, wrong: [], done: false });
  }
  f.qs = qs; f.qi = 0; f.step = 'review'; f.msg = '';
  render();
  playP(qs[0].note[1], 1.2);
}
function flashLetter(x) {
  const f = flash, q = f?.qs?.[f.qi];
  if (!q || q.done || q.wrong.includes(x)) return;
  const [c, p] = q.note, right = letterOf(stepOf(p));
  if (x === right || q.tries >= 1) {
    if (x !== right) q.wrong.push(x);
    q.done = true;
    f.msg = x === right ? `${q.tries ? 'There it is' : pick(PRAISE)} ${right}: ${flashWhere(c, p).replace(/\.$/, '').toLowerCase()}.` : `It is ${right}: ${flashWhere(c, p).replace(/\.$/, '').toLowerCase()}.`;
    playP(p, 1.2);
  } else { q.tries++; q.wrong.push(x); f.msg = `Not ${x}. Try again.`; }
  render(!q.done);
}
function flashNext() {
  const f = flash;
  if (f.qi < f.qs.length - 1) { f.qi++; f.msg = ''; render(); playP(f.qs[f.qi].note[1], 1.2); return; }
  state.flash = state.flash || {};
  state.flash[f.L] = true;
  save();
  f.step = 'done';
  render();
}

Object.assign(ACTIONS, {
  'flash-menu'() { hush(); flash = null; screen = 'flashmenu'; render(); window.scrollTo?.({ top: 0 }); },
  flash(d) { audioReady(); openFlash(d.l); },
  'flash-hear'() { audioReady(); playP(FLASH_MEET[flash.L][1], 1.4); },
  'flash-every'() { flash.step = 'every'; flash.found = []; flash.msg = ''; render(); window.scrollTo?.({ top: 0 }); },
  'flash-review'() { startFlashReview(); },
  'flash-letter'(d) { flashLetter(d.v); },
  'flash-next'() { flashNext(); },
});
