/* Note Beast Challenge: the Note Beast runs across the top holding a placard with a note on a staff.
   Play that note on the keys before he runs off. Ten right wins; three misses and he collapses.
   A wrong key, or letting him run off, costs a pair of horns and sends him round for another lap with the same note. */

const CHALLENGE_GOAL = 10, CHALLENGE_LIVES = 3;
// the stretch of keys shown, and so the notes it can ask: an octave either side of Middle C
const CHALLENGE_FROM = 'C3', CHALLENGE_WHITES = 15;
let game = null;

// Notes Tom has learned, with their clefs: the landmarks always, plus notes met in Out from Middle C, within the keys shown.
function challengePool() {
  const lo = midiOf(CHALLENGE_FROM), hi = whiteMidi(stepOf(CHALLENGE_FROM) + CHALLENGE_WHITES - 1);
  const pool = [['t', 'C4'], ['b', 'C4'], ['t', 'G4'], ['b', 'F3']];
  for (const it of allItems('path')) {
    if (!it.note || !isSeen(it.wid)) continue;
    const m = midiOf(it.p);
    if (m >= lo && m <= hi && !pool.some(([c, p]) => c === it.clef && p === it.p)) pool.push([it.clef, it.p]);
  }
  return pool;
}
function startChallenge() {
  audioReady();
  if (listenMode()) startMic();
  cancelAnimationFrame(game?.raf);
  game = { pool: challengePool(), lives: CHALLENGE_LIVES, caught: 0, target: null, last: null, phase: 'in', t0: 0, x: -.4, missed: false, over: '', mood: 'happy' };
  nextPlacard();
  screen = 'challenge';
  render();
  game.t0 = performance.now();
  game.raf = requestAnimationFrame(challengeFrame);
}
function nextPlacard() {
  let next;
  do next = game.pool[Math.floor(Math.random() * game.pool.length)];
  while (game.pool.length > 1 && game.last && next[0] === game.last[0] && next[1] === game.last[1]);
  game.target = next; game.last = next;
  game.phase = 'in'; game.x = -.4; game.missed = false; game.mood = 'happy'; game.pose = 'hold';
}
// A pass takes about nine seconds at level 1, from when he appears to when he's gone. Each Challenge won makes
// the next level a little quicker: about six seconds by level 7, and never quicker than about four.
const PHASE_MS = { in: 2700, wait: 3600, out: 2700, scowl: 1200, flee: 900, fly: 1000, collapse: 2400 };
const challengeLevel = () => (state.challenge?.wins || 0) + 1;
const lapSpeed = () => Math.max(.45, 1 - (challengeLevel() - 1) * .056);
function challengeFrame(now) {
  if (!game || screen !== 'challenge') return;
  const ms = PHASE_MS[game.phase] * (['in', 'wait', 'out'].includes(game.phase) ? lapSpeed() : 1), t = Math.min(1, (now - game.t0) / ms);
  const ease = v => v * (2 - v);
  if (game.phase === 'in') game.x = -.4 + .9 * ease(t);
  else if (game.phase === 'out' || game.phase === 'flee') game.x = game.from + (1.4 - game.from) * t * t;
  placeBeast(t);
  if (t >= 1) {
    if (game.phase === 'in') setPhase('wait');
    else if (game.phase === 'wait') { game.from = .5; setPhase('out'); }
    else if (game.phase === 'scowl') { game.from = game.x; setPhase('flee'); }
    else if (game.phase === 'out' || game.phase === 'flee') {
      // he left without the right note: a miss if Tom didn't press anything, then another lap with the same note
      if (!game.missed) { loseHorn(); if (game.over) return; }
      game.phase = 'in'; game.x = -.4; game.missed = false; game.mood = 'happy'; game.pose = 'hold';
      game.t0 = now; drawBeast();
    } else if (game.phase === 'fly') {
      if (game.caught >= CHALLENGE_GOAL) return finishChallenge('won');
      nextPlacard(); game.t0 = now; drawBeast();
    } else if (game.phase === 'collapse') return finishChallenge('lost');
  }
  game.raf = requestAnimationFrame(challengeFrame);
}
function setPhase(phase) { game.phase = phase; game.t0 = performance.now(); drawBeast(); }
function placeBeast(t) {
  const el = document.getElementById('runner');
  if (!el) return;
  const lift = game.phase === 'fly' ? -t * 140 : 0;
  el.style.left = `${game.x * 100}%`;
  el.style.transform = `translate(-50%, ${lift}%)${game.phase === 'collapse' ? ` rotate(${Math.min(1, t * 1.6) * 82}deg) translateY(${Math.min(1, t * 1.6) * 18}%)` : ''}`;
  el.classList.toggle('running', ['in', 'out', 'flee'].includes(game.phase));
  el.classList.toggle('stomping', game.phase === 'scowl');
}
function drawBeast() {
  const el = document.getElementById('runner');
  if (!el) return;
  const [clef, p] = game.target;
  const placard = game.pose === 'heap' ? '' : staffSvg({ clef, S: 12, width: 168, tight: true, items: [{ p, d: 'w' }], noteX: 118 });
  el.innerHTML = beastFigure(game.mood, game.pose, placard);
  placeBeast(0);
}
function hornsHtml() {
  return Array.from({ length: CHALLENGE_LIVES }, (_, i) => `<svg class="life ${i < game.lives ? '' : 'lost'}" viewBox="0 0 64 30" aria-hidden="true"><path d="M30 26 C18 25 4 18 6 3 C11 12 19 17 32 18 Z M34 26 C46 25 60 18 58 3 C53 12 45 17 32 18 Z" fill="${BEAST_HORN}" stroke="${BEAST_INK}" stroke-width="2.5" stroke-linejoin="round"/></svg>`).join('');
}
function updateHud() {
  const h = document.getElementById('lives'), c = document.getElementById('caught');
  if (h) { h.innerHTML = hornsHtml(); h.setAttribute('aria-label', `${game.lives} of ${CHALLENGE_LIVES} lives left`); }
  if (c) c.textContent = `${game.caught} of ${CHALLENGE_GOAL}`;
}
function loseHorn() {
  game.lives--;
  updateHud();
  if (game.lives <= 0) {
    game.over = 'lost';
    game.mood = 'dizzy'; game.pose = 'heap'; game.x = .5;
    setPhase('collapse');
    // a sad sound: a slow slide down
    // after the last wrong note and its grunt have finished, so it doesn't cut them off
    setTimeout(() => { if (screen === 'challenge') playSeq([{ midi: 64, beats: .7 }, { midi: 63, beats: .7 }, { midi: 62, beats: .7 }, { midi: 61, beats: 1.6 }], 80); }, 1300);
    game.raf = requestAnimationFrame(challengeFrame);
  }
}
function challengeKey(midi) {
  // the note Tom plays always sounds in full, clearly; the grunt comes after it, never over it
  const playIt = () => { if (!hearing()) tone(midi, 0, 1.1, .85); };
  if (!game || game.over || !['in', 'wait'].includes(game.phase) || game.missed) { playIt(); return; }
  const want = midiOf(game.target[1]);
  const ok = hearing() ? midi % 12 === want % 12 : midi === want;
  playIt();
  if (ok) {
    game.caught++;
    updateHud();
    game.mood = 'happy'; game.pose = 'thumbs';
    setPhase('fly');
    showCaughtName();
    grunt('happy', hearing() ? 0 : .8);
    return;
  }
  // wrong: he stops and scowls, Tom loses a pair of horns, then he runs off to come round again
  game.missed = true;
  game.mood = 'scowl';
  grunt('sad', hearing() ? 0 : .7);
  loseHorn();
  if (game.over) return;
  setPhase('scowl');
}
// The note's name bursts up beside him as he flies away.
function showCaughtName() {
  const el = document.getElementById('caught-name');
  if (!el) return;
  const p = game.target[1];
  el.textContent = p === 'C4' ? 'Middle C!' : `${letterOf(stepOf(p))}!`;
  // just past his sign on the right, or on the left if there's no room
  // measured from the sign itself: his drawing's box is wider than what you see
  const stage = document.getElementById('stage').getBoundingClientRect(), him = (document.querySelector('#runner .beast-figure > rect') || document.getElementById('runner')).getBoundingClientRect();
  el.classList.remove('show', 'left');
  el.style.left = `${him.right - stage.left + 8}px`;
  if (him.right - stage.left + 8 + el.offsetWidth > stage.width) { el.style.left = `${him.left - stage.left - 8}px`; el.classList.add('left'); }
  void el.offsetWidth;  // restart the animation
  el.classList.add('show');
}
function finishChallenge(result) {
  cancelAnimationFrame(game.raf);
  game.over = result;
  game.finished = true;
  state.challenge = state.challenge || { wins: 0, plays: 0 };
  state.challenge.plays++;
  if (result === 'won') state.challenge.wins++;
  save();
  render();
  if (result === 'won') playSeq([{ midi: 60, beats: .3 }, { midi: 64, beats: .3 }, { midi: 67, beats: .3 }, { midi: 72, beats: 1 }], 110);
}
function renderChallenge() {
  const keys = pianoSvg({ from: stepOf(CHALLENGE_FROM), whites: CHALLENGE_WHITES, letters: 'c' });
  const panel = !game.finished ? '' : game.over === 'won'
    ? `<div class="game-over won"><div class="beast won">${beastSvg('happy')}</div><h1>You beat the Note Beast Challenge!</h1><p class="beast-says">${esc(pick(BEAST_SAYS.doneHappy))}</p><div class="row-btns"><button class="start" data-act="challenge">Play again</button><button class="ghost" data-act="home">Home</button></div></div>`
    : `<div class="game-over lost"><div class="beast">${beastSvg('worried')}</div><h1>TRY AGAIN</h1><p class="meta">You caught ${game.caught} of ${CHALLENGE_GOAL}.</p><div class="row-btns"><button class="start" data-act="challenge">Try again</button><button class="ghost" data-act="home">Home</button></div></div>`;
  return `<header class="top game-top"><span class="caught-label">Level ${challengeLevel()} · Caught <strong id="caught">${game.caught} of ${CHALLENGE_GOAL}</strong></span><span id="lives" class="lives" role="img" aria-label="${game.lives} of ${CHALLENGE_LIVES} lives left">${hornsHtml()}</span></header>
  <div class="stage" id="stage"><div class="runner" id="runner"></div><div class="caught-name" id="caught-name" aria-live="polite"></div>${panel}</div>
  <div class="game-keys ${hearing() ? 'listening' : ''}">${hearing() ? listenPanel('Listening. Play the note on your piano.') : keys}</div>
  <button class="link" data-act="home" style="align-self:flex-start">Stop and go home</button>`;
}
