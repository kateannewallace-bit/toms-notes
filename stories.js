/* Note Stories: the sayings music teachers use to remember the lines and spaces, each taught and then played as a short game.
   Katie: keep them exactly as teachers teach them (Every Good Boy Does Fine, FACE, Good Boys Do Fine Always, All Cows Eat Grass;
   for alto, Fat Alley Cats Eat Garbage and Good Boys Do Fine). Tenor (Katie's picks): Dogs Fight And Cats Escape, and Every Good Boy Does.
   Each story: a lesson (the staff with each note's word under it, and a sing-along), then six questions:
   'tap' asks for the note that goes with a word, 'name' shows one note and asks its letter. */

// Who reads the C clefs, and why, for the alto and tenor stories and the Note Map.
const CLEF_WHO = {
  a: 'Violas read the alto clef. A viola’s notes sit around Middle C: too high for the bass staff and too low for the treble staff. Putting Middle C on the middle line keeps most viola notes right on the staff, without lots of ledger lines.',
  n: 'Cellos, bassoons and trombones read the tenor clef when they play high. On the bass staff those high notes would need lots of ledger lines. Moving Middle C to the fourth line keeps them on the staff, where they are easier to read.',
};
const STORIES = [
  { id: 'tlines', clef: 't', title: 'Treble lines', notes: ['E4', 'G4', 'B4', 'D5', 'F5'], words: ['Every', 'Good', 'Boy', 'Does', 'Fine'],
    intro: 'The five lines of the treble staff, from the bottom up, are E, G, B, D and F. To remember them, say: Every Good Boy Does Fine.' },
  { id: 'tspaces', clef: 't', title: 'Treble spaces', notes: ['F4', 'A4', 'C5', 'E5'], words: ['F', 'A', 'C', 'E'], spells: 'FACE',
    intro: 'The four spaces of the treble staff, from the bottom up, are F, A, C and E. Together they spell a word: FACE.' },
  { id: 'blines', clef: 'b', title: 'Bass lines', notes: ['G2', 'B2', 'D3', 'F3', 'A3'], words: ['Good', 'Boys', 'Do', 'Fine', 'Always'],
    intro: 'The five lines of the bass staff, from the bottom up, are G, B, D, F and A. To remember them, say: Good Boys Do Fine Always.' },
  { id: 'bspaces', clef: 'b', title: 'Bass spaces', notes: ['A2', 'C3', 'E3', 'G3'], words: ['All', 'Cows', 'Eat', 'Grass'],
    intro: 'The four spaces of the bass staff, from the bottom up, are A, C, E and G. To remember them, say: All Cows Eat Grass.' },
  // The C clefs, shown only when a grown-up turns on alto and tenor (state.cClefs).
  { id: 'alines', clef: 'a', cClef: true, title: 'Alto lines', notes: ['F3', 'A3', 'C4', 'E4', 'G4'], words: ['Fat', 'Alley', 'Cats', 'Eat', 'Garbage'],
    intro: 'The five lines of the alto staff, from the bottom up, are F, A, C, E and G. Middle C is the middle line. To remember them, say: Fat Alley Cats Eat Garbage.' },
  { id: 'aspaces', clef: 'a', cClef: true, title: 'Alto spaces', notes: ['G3', 'B3', 'D4', 'F4'], words: ['Good', 'Boys', 'Do', 'Fine'],
    intro: 'The four spaces of the alto staff, from the bottom up, are G, B, D and F. To remember them, say: Good Boys Do Fine.' },
  { id: 'nlines', clef: 'n', cClef: true, title: 'Tenor lines', notes: ['D3', 'F3', 'A3', 'C4', 'E4'], words: ['Dogs', 'Fight', 'And', 'Cats', 'Escape'],
    intro: 'The five lines of the tenor staff, from the bottom up, are D, F, A, C and E. Middle C is the fourth line. To remember them, say: Dogs Fight And Cats Escape.' },
  { id: 'nspaces', clef: 'n', cClef: true, title: 'Tenor spaces', notes: ['E3', 'G3', 'B3', 'D4'], words: ['Every', 'Good', 'Boy', 'Does'],
    intro: 'The four spaces of the tenor staff, from the bottom up, are E, G, B and D. To remember them, say: Every Good Boy Does, the treble saying without its last word.' },
];
const STORY_QUESTIONS = 6;
let story = null;  // { s, phase: 'learn' | 'play' | 'done', lit, qs, i, score }

const storyOf = id => STORIES.find(x => x.id === id);
const sayingOf = s => s.spells || s.words.join(' ');
const wordFor = (s, i) => s.spells ? `${s.words[i]} in ${s.spells}` : `“${s.words[i]}”`;

function openStory(id) {
  hush();
  story = { s: storyOf(id), phase: 'learn', lit: -1 };
  screen = 'story';
  render();
  window.scrollTo?.({ top: 0 });
}
function startStoryGame() {
  const s = story.s, order = [];
  // every note comes up, then more at random, never the same note twice in a row; tap and name take turns
  while (order.length < STORY_QUESTIONS) {
    const round = shuffle(s.notes.map((_, i) => i));
    if (order.length && round[0] === order.at(-1)) round.push(round.shift());
    order.push(...round);
  }
  story.qs = order.slice(0, STORY_QUESTIONS).map((n, k) => ({ n, kind: k % 2 ? 'name' : 'tap', tries: 0, done: false, wrong: [], msg: '' }));
  story.i = 0; story.score = 0; story.phase = 'play';
  hush(); render();
}

// The staff for a story: its notes, each with its word underneath (the first letter in bold).
function storyStaff(o = {}) {
  const s = story.s, show = o.only != null ? [o.only] : s.notes.map((_, i) => i);
  const items = s.notes.map((p, i) => show.includes(i) ? { p, d: 'w', cls: o.cls?.(i) || '' } : { skip: 1, d: 'w' });
  const lo = CLEF[s.clef].bottom - 2, hi = topOf(s.clef) + 2;
  return staffSvg({ clef: s.clef, S: 22, width: 560, even: true, items, lo, hi, cl: 'story-staff',
    extra: !o.words ? null : ({ x, Y, S }) => s.notes.map((p, i) => !show.includes(i) ? '' :
      `<text class="story-w ${i === story.lit ? 'lit' : ''}" x="${x[i]}" y="${Y(lo) + S * 1.4}" text-anchor="middle" font-size="${S * .95}"><tspan class="story-l">${s.words[i][0]}</tspan>${esc(s.words[i].slice(1))}</text>`).join('') });
}
// The saying in big letters, first letters bold; one word can be lit up.
function sayingHtml(lit = -1, blank = -1) {
  const s = story.s;
  const word = (w, i) => `<span class="${i === lit ? 'lit' : ''}">${i === blank ? '___' : `<b>${w[0]}</b>${esc(w.slice(1))}`}</span>`;
  return `<p class="saying">${s.words.map(word).join(s.spells ? '' : ' ')}</p>`;
}

function renderStories() {
  const best = id => state.stories?.[id];
  return `<header class="top"><h1>Note Stories</h1><button class="ghost" data-act="home">Back</button></header>
  <p class="note">The sayings music teachers use to remember the notes on the lines and in the spaces. Learn one, then play its game.</p>
  <div class="story-list">${STORIES.filter(s => !s.cClef || state.cClefs).map(s => `<button class="story-card" data-act="story" data-id="${s.id}">
    <span class="story-name">${esc(s.title)}</span><span class="story-saying">${esc(sayingOf(s))}</span>
    <span class="story-best">${best(s.id) != null ? `Best: ${best(s.id)} of ${STORY_QUESTIONS}` : 'Not played yet'}</span></button>`).join('')}</div>`;
}

function renderStory() {
  const s = story.s, head = `<header class="top"><h1>${esc(s.title)}</h1><button class="ghost" data-act="stories">All stories</button></header>`;
  if (story.phase === 'learn') {
    return `${head}<p class="lesson">${esc(s.intro)}</p>${CLEF_WHO[s.clef] ? `<p class="note"><b>Who uses it, and why:</b> ${esc(CLEF_WHO[s.clef])}</p>` : ''}
    ${sayingHtml(story.lit)}
    <div class="staff-wrap">${storyStaff({ words: true, cls: i => i === story.lit ? 'now' : '' })}</div>
    <p class="note center">Tap a note to hear it. The bottom ${s.notes.length === 5 ? 'line' : 'space'} is the first word.</p>
    <div class="next-row"><button class="ghost" data-act="story-sing">♪ Say it with me</button><button class="start" data-act="story-play">Play the game</button></div>`;
  }
  if (story.phase === 'done') {
    const n = story.score;
    return `${head}<div class="story-done"><div class="stars">${story.qs.map(q => starSvg(q.tries === 0)).join('')}</div>
    <h2>${n} of ${STORY_QUESTIONS} on the first try</h2>${sayingHtml()}
    <div class="next-row"><button class="start" data-act="story-play">Play again</button><button class="ghost" data-act="story-learn">See the story</button><button class="ghost" data-act="stories">All stories</button></div></div>`;
  }
  const q = story.qs[story.i], last = story.i === story.qs.length - 1;
  const ticks = `<div class="ticks">${story.qs.map((x, k) => `<span class="${k < story.i ? 'done' : k === story.i ? 'now' : ''}"></span>`).join('')}</div>`;
  let body, controls = '';
  if (q.kind === 'tap') {
    body = `${promptRow(`Tap the note for ${wordFor(s, q.n).replace(/[“”]/g, '')}.`)}${sayingHtml(q.done ? q.n : -1)}
    <div class="staff-wrap">${storyStaff({ words: q.done, cls: i => q.done && i === q.n ? 'ok' : q.wrong.includes(i) ? 'try' : '' })}</div>`;
  } else {
    body = `${promptRow('What note is this?')}
    <div class="staff-wrap">${storyStaff({ only: q.n, words: q.done, cls: () => q.done ? 'ok' : '' })}</div>
    ${q.tries || q.done ? sayingHtml(q.done ? q.n : -1) : ''}`;
    controls = `<div class="choices letters">${LETTERS_AG.map(L => `<button class="choice ${q.wrong.includes(L) ? 'no' : q.done && L === letterOf(stepOf(s.notes[q.n])) ? 'ok' : ''}" data-act="story-letter" data-v="${L}" ${q.done || q.wrong.includes(L) ? 'disabled' : ''}>${L}</button>`).join('')}</div>`;
  }
  return `${head}${ticks}<div class="problem" id="problem">${body}</div>${controls}
  <div class="feedback">${q.msg ? `<span class="${q.done ? 'big ' + (q.tries ? 'try' : 'good') : 'how try-line'}">${esc(q.msg)}</span>` : ''}</div>
  ${q.done ? `<div class="next-row"><button class="start" data-act="story-next">${last ? 'My stars' : 'Next'}</button></div>` : ''}`;
}
const LETTERS_AG = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

// A hint that walks up the saying from the bottom, the way a teacher would.
function storyHint(i) {
  const s = story.s;
  return s.spells ? `Spell it from the bottom space up: ${s.words.join(', ')}.` : `Say it from the bottom ${s.notes.length === 5 ? 'line' : 'space'} up: ${s.words.join(', ')}.`;
}
function storyRight(q) {
  const s = story.s, L = letterOf(stepOf(s.notes[q.n]));
  q.done = true;
  if (q.tries === 0) story.score++;
  q.msg = q.tries === 0 ? `${pick(PRAISE)} ${s.spells ? `${L}, in ${s.spells}.` : `${s.words[q.n]} is ${L}.`}` : `There it is: ${s.spells ? L : `${s.words[q.n]}, ${L}`}.`;
  playP(s.notes[q.n], 1.2);
  render();
}
function storyWrong(q, msg) {
  q.tries++;
  if (q.tries >= 2) { q.msg = `${msg} ${storyHint(q.n)}`; return storyRight(q); }
  q.msg = `${msg} ${storyHint(q.n)}`;
  render(true);
}
// A note on the staff was tapped: in the lesson it lights up its word; in a 'tap' question it's the answer.
function storyTap(pitch) {
  if (!story) return;
  const s = story.s, i = s.notes.indexOf(pitch);
  if (story.phase === 'learn') { story.lit = i; render(); return; }
  if (story.phase !== 'play') return;
  const q = story.qs[story.i];
  if (q.kind !== 'tap' || q.done || i < 0 || q.wrong.includes(i)) return;
  if (i === q.n) return storyRight(q);
  q.wrong.push(i);
  storyWrong(q, `That one is ${s.spells ? letterOf(stepOf(pitch)) : `${s.words[i]}, ${letterOf(stepOf(pitch))}`}.`);
}
function storyLetter(L) {
  const q = story?.qs?.[story.i];
  if (!q || q.kind !== 'name' || q.done || q.wrong.includes(L)) return;
  if (L === letterOf(stepOf(story.s.notes[q.n]))) return storyRight(q);
  q.wrong.push(L);
  storyWrong(q, `Not ${L}.`);
}
function storyNext() {
  if (story.i < story.qs.length - 1) { story.i++; render(); window.scrollTo?.({ top: 0 }); return; }
  story.phase = 'done';
  state.stories = state.stories || {};
  state.stories[story.s.id] = Math.max(state.stories[story.s.id] ?? 0, story.score);
  save(); render();
}
// The sing-along: each note sounds in turn, from the bottom up, and its word lights.
function storySing() {
  const s = story.s;
  playSeq(s.notes.map(p => ({ midi: midiOf(p), beats: 1 })), 66, i => { if (screen === 'story' && story?.phase === 'learn') { story.lit = i; render(); } });
}

Object.assign(ACTIONS, {
  stories() { hush(); story = null; screen = 'stories'; render(); window.scrollTo?.({ top: 0 }); },
  story(d) { audioReady(); openStory(d.id); },
  'story-play'() { audioReady(); startStoryGame(); window.scrollTo?.({ top: 0 }); },
  'story-learn'() { story.phase = 'learn'; story.lit = -1; render(); },
  'story-sing'() { audioReady(); storySing(); },
  'story-letter'(d) { storyLetter(d.v); },
  'story-next'() { storyNext(); },
});
