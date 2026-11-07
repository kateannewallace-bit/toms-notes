/* Note Beast Challenge: the Note Beast runs across the top holding a placard with a note on a staff.
   Play that note on the keys before he runs off. Ten right and he cheers and a golden laurel wreath lands on his head; three misses and he sits
   down on a broken column to sulk under a little rain cloud ("Harrumph!" and a big sigh), then says to try again. He never falls over or seems hurt: Tom didn't like that.
   A wrong key, or letting him run off, costs a pair of horns and sends him round for another lap with the same note. */

const CHALLENGE_GOAL = 10, CHALLENGE_LIVES = 3;
// the stretch of keys shown, and so the notes it can ask: an octave either side of Middle C
const CHALLENGE_FROM = 'C3', CHALLENGE_WHITES = 15;
let game = null;

// Notes Tom has learned, with their clefs: the landmarks always, plus notes met in Out from Middle C, within the keys shown.
// Levels 1 and 2 ask only the landmarks. From level 3, each level adds two more learned notes, the ones closest to Middle C first.
// A grown-up can instead pick the exact notes (state.challengeNotes), and limit it to one clef (state.challengeClefs).
// The notes a grown-up can pick from: everything on the keys shown that reads easily on each clef.
const CHALLENGE_CHOICES = {
  t: ['A3', 'B3', 'C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'], b: ['C3', 'D3', 'E3', 'F3', 'G3', 'A3', 'B3', 'C4', 'D4', 'E4'],
  a: ['E3', 'F3', 'G3', 'A3', 'B3', 'C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4'], n: ['C3', 'D3', 'E3', 'F3', 'G3', 'A3', 'B3', 'C4', 'D4', 'E4', 'F4', 'G4'],
};
// Which clefs the Challenge uses: treble and bass unless a grown-up changes it. Alto ('a') and tenor ('n') are there to switch on.
const challengeClefs = () => Array.isArray(state.challengeClefs) && state.challengeClefs.length ? state.challengeClefs : ['t', 'b'];
const challengeClefOk = c => challengeClefs().includes(c);
const LANDMARKS = [['t', 'C4'], ['b', 'C4'], ['t', 'G4'], ['b', 'F3'], ['a', 'C4'], ['n', 'C4']];
function challengePool() {
  const fallback = LANDMARKS.filter(([c]) => challengeClefOk(c));
  if (state.challengeNotes) {
    const picked = state.challengeNotes.map(x => x.split(':')).filter(([c]) => challengeClefOk(c));
    return picked.length ? picked : fallback;
  }
  return autoChallengePool().filter(([c]) => challengeClefOk(c));
}
// The C clefs aren't in the lessons, so on Automatic they start at Middle C and add the notes either side, one step out per level from level 3.
function cClefNotes(c) {
  const out = [[c, 'C4']];
  for (let i = 1; i <= Math.max(0, challengeLevel() - 2); i++) out.push([c, pitchOf(stepOf('C4') + i)], [c, pitchOf(stepOf('C4') - i)]);
  return out.filter(([, p]) => CHALLENGE_CHOICES[c].includes(p));
}
function autoChallengePool() {
  const lo = midiOf(CHALLENGE_FROM), hi = whiteMidi(stepOf(CHALLENGE_FROM) + CHALLENGE_WHITES - 1);
  const pool = [['t', 'C4'], ['b', 'C4'], ['t', 'G4'], ['b', 'F3']];
  const learned = allItems('path').filter(it => it.note && isSeen(it.wid) && midiOf(it.p) >= lo && midiOf(it.p) <= hi && !pool.some(([c, p]) => c === it.clef && p === it.p))
    .sort((a, b) => Math.abs(stepOf(a.p) - stepOf('C4')) - Math.abs(stepOf(b.p) - stepOf('C4')));
  for (const it of learned.slice(0, Math.max(0, challengeLevel() - 2) * 2)) pool.push([it.clef, it.p]);
  return pool.concat(cClefNotes('a'), cClefNotes('n'));
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
const PHASE_MS = { in: 2700, wait: 3600, out: 2700, scowl: 1200, flee: 900, fly: 1000, aghast: 1300, slump: 4800, celebrate: 3600 };
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
    else if (game.phase === 'wait') { game.from = game.x; setPhase('out'); }
    // after shaking the sign, he stays put and gives another try at the same note
    else if (game.phase === 'scowl') { game.missed = false; game.mood = 'happy'; setPhase('wait'); }
    else if (game.phase === 'out' || game.phase === 'flee') {
      // he left without the right note: a miss if Tom didn't press anything, then another lap with the same note
      if (!game.missed) { loseHorn(); if (game.over) return; }
      game.phase = 'in'; game.x = -.4; game.missed = false; game.mood = 'happy'; game.pose = 'hold';
      game.t0 = now; drawBeast();
    } else if (game.phase === 'fly') {
      nextPlacard(); game.t0 = now; drawBeast();
    } else if (game.phase === 'aghast') {
      // the shock passes: he drops the sign, sits down to sulk, and a little cloud rains on him
      game.mood = 'sad'; game.pose = 'sit';
      setPhase('slump');
      document.getElementById('cloud')?.classList.add('show');
      document.getElementById('ruins')?.classList.add('show');
      beastSays('Harrumph!');  // then a big sulky sigh
      if (!hearing()) sigh(1.1);
      setTimeout(() => { if (game?.phase === 'slump') beastSays('Try again!'); }, 3300);
      setTimeout(() => { if (game?.phase === 'slump' && !hearing()) playSeq([{ midi: 67, beats: .45, vol: .35 }, { midi: 66, beats: .45, vol: .35 }, { midi: 65, beats: .45, vol: .35 }, { midi: 64, beats: 1.4, vol: .35 }], 90); }, 300);
    } else if (game.phase === 'slump') return finishChallenge('lost');
    else if (game.phase === 'celebrate') return finishChallenge('won');
  }
  game.raf = requestAnimationFrame(challengeFrame);
}
function setPhase(phase) { game.phase = phase; game.t0 = performance.now(); drawBeast(); }
function placeBeast(t) {
  const el = document.getElementById('runner');
  if (!el) return;
  const lift = game.phase === 'fly' ? -t * 140 : 0;
  el.style.left = `${game.x * 100}%`;
  el.style.transform = `translate(-50%, ${lift}%)`;
  el.classList.toggle('running', ['in', 'out', 'flee'].includes(game.phase));
  el.classList.toggle('stomping', game.phase === 'scowl');
  el.classList.toggle('aghast', game.phase === 'aghast');
  el.classList.toggle('saying', ['aghast', 'slump', 'celebrate'].includes(game.phase));
  el.classList.toggle('sitting', game.phase === 'slump');
  el.classList.toggle('cheering', game.phase === 'celebrate');
}
function drawBeast() {
  const el = document.getElementById('runner');
  if (!el) return;
  const [clef, p] = game.target;
  const placard = ['sit', 'cheer'].includes(game.pose) ? '' : staffSvg({ clef, S: 12, width: 168, tight: true, items: [{ p, d: 'w' }], noteX: 118 });
  el.innerHTML = beastFigure(game.mood, game.pose, placard, { laurel: game.laurel });
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
    // he stays standing, shocked and disgusted, and tells Tom to try again: no falling over
    game.mood = 'aghast'; game.pose = 'hold'; game.x = .5;  // in the middle, so his face is always seen
    setPhase('aghast');
    beastSays('Oh no!');
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
    showCaughtName();
    if (game.caught >= CHALLENGE_GOAL) {
      // the last one: he stays in the middle, cheers, and a champion's laurel wreath lands on his head
      game.over = 'won'; game.mood = 'happy'; game.pose = 'cheer'; game.laurel = true; game.x = .5;
      setPhase('celebrate');
      confetti();
      beastSays('Hooray! You did it!');
      if (!hearing()) setTimeout(() => playSeq([{ midi: 60, beats: .3 }, { midi: 64, beats: .3 }, { midi: 67, beats: .3 }, { midi: 72, beats: 1.2 }], 110), 900);
      grunt('happy', hearing() ? 0 : 2.3);
      return;
    }
    game.mood = 'happy'; game.pose = 'thumbs';
    setPhase('fly');
    grunt('happy', hearing() ? 0 : .8);
    return;
  }
  // wrong: he stops, scowls and shakes the sign, Tom loses a pair of horns, then he waits for another try at the same note
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
  el.textContent = `${letterOf(stepOf(p))}!`;  // just the letter: 'Middle C!' was too long for the stage
  // just past his sign on the right, or on the left if there's no room
  // measured from the sign itself: his drawing's box is wider than what you see
  const stage = document.getElementById('stage').getBoundingClientRect(), him = (document.querySelector('#runner .beast-figure > rect') || document.getElementById('runner')).getBoundingClientRect();
  el.classList.remove('show', 'left');
  el.style.left = `${him.right - stage.left + 8}px`;
  if (him.right - stage.left + 8 + el.offsetWidth > stage.width) { el.style.left = `${him.left - stage.left - 8}px`; el.classList.add('left'); }
  void el.offsetWidth;  // restart the animation
  el.classList.add('show');
}
// What he says, in his speech bubble. Not read aloud: Katie wants no voiceover in the Challenge.
// The old stone labyrinth he lives in, crumbling here and there: behind him while he sulks. (Drawn once, by a script.)
const MAZE_RUINS = `<svg viewBox="-40 0 1228 238" preserveAspectRatio="xMidYMax meet"><g stroke="#8c7f68" stroke-width="2" stroke-linejoin="round"><path d="M74 32 L1194 32 L1050 221 L-70 221 Z" fill="#f4efe4"/><path d="M101 42 L191 42 L191 16 L101 16 Z" fill="#d9ceb8"/><path d="M105 38 L101 42 L101 16 L105 12 Z" fill="#c2b59a"/><path d="M105 12 L195 12 L191 16 L101 16 Z" fill="#eee6d6"/><path d="M101 16 L146 7 L191 16 Z" fill="#d9ceb8"/><path d="M181 42 L271 42 L271 -16 L181 -16 Z" fill="#d9ceb8"/><path d="M185 38 L181 42 L181 -16 L185 -20 Z" fill="#c2b59a"/><path d="M185 -20 L275 -20 L271 -16 L181 -16 Z" fill="#eee6d6"/><path d="M181 13 H271" stroke="#b9ab90" stroke-width="2" fill="none"/><path d="M341 42 L431 42 L431 -16 L341 -16 Z" fill="#d9ceb8"/><path d="M345 38 L341 42 L341 -16 L345 -20 Z" fill="#c2b59a"/><path d="M345 -20 L435 -20 L431 -16 L341 -16 Z" fill="#eee6d6"/><path d="M341 13 H431" stroke="#b9ab90" stroke-width="2" fill="none"/><path d="M421 42 L511 42 L511 -16 L421 -16 Z" fill="#d9ceb8"/><path d="M425 38 L421 42 L421 -16 L425 -20 Z" fill="#c2b59a"/><path d="M425 -20 L515 -20 L511 -16 L421 -16 Z" fill="#eee6d6"/><path d="M421 13 H511" stroke="#b9ab90" stroke-width="2" fill="none"/><path d="M501 42 L591 42 L591 -16 L501 -16 Z" fill="#d9ceb8"/><path d="M505 38 L501 42 L501 -16 L505 -20 Z" fill="#c2b59a"/><path d="M505 -20 L595 -20 L591 -16 L501 -16 Z" fill="#eee6d6"/><path d="M501 13 H591" stroke="#b9ab90" stroke-width="2" fill="none"/><path d="M581 42 L671 42 L671 -16 L581 -16 Z" fill="#d9ceb8"/><path d="M585 38 L581 42 L581 -16 L585 -20 Z" fill="#c2b59a"/><path d="M585 -20 L675 -20 L671 -16 L581 -16 Z" fill="#eee6d6"/><path d="M581 13 H671" stroke="#b9ab90" stroke-width="2" fill="none"/><path d="M661 42 L751 42 L751 -16 L661 -16 Z" fill="#d9ceb8"/><path d="M665 38 L661 42 L661 -16 L665 -20 Z" fill="#c2b59a"/><path d="M665 -20 L755 -20 L751 -16 L661 -16 Z" fill="#eee6d6"/><path d="M661 13 H751" stroke="#b9ab90" stroke-width="2" fill="none"/><path d="M741 42 L831 42 L831 -16 L741 -16 Z" fill="#d9ceb8"/><path d="M745 38 L741 42 L741 -16 L745 -20 Z" fill="#c2b59a"/><path d="M745 -20 L835 -20 L831 -16 L741 -16 Z" fill="#eee6d6"/><path d="M741 13 H831" stroke="#b9ab90" stroke-width="2" fill="none"/><path d="M821 42 L911 42 L911 -16 L821 -16 Z" fill="#d9ceb8"/><path d="M825 38 L821 42 L821 -16 L825 -20 Z" fill="#c2b59a"/><path d="M825 -20 L915 -20 L911 -16 L821 -16 Z" fill="#eee6d6"/><path d="M821 13 H911" stroke="#b9ab90" stroke-width="2" fill="none"/><path d="M901 42 L991 42 L991 -16 L901 -16 Z" fill="#d9ceb8"/><path d="M905 38 L901 42 L901 -16 L905 -20 Z" fill="#c2b59a"/><path d="M905 -20 L995 -20 L991 -16 L901 -16 Z" fill="#eee6d6"/><path d="M901 13 H991" stroke="#b9ab90" stroke-width="2" fill="none"/><path d="M981 42 L1071 42 L1071 -16 L981 -16 Z" fill="#d9ceb8"/><path d="M985 38 L981 42 L981 -16 L985 -20 Z" fill="#c2b59a"/><path d="M985 -20 L1075 -20 L1071 -16 L981 -16 Z" fill="#eee6d6"/><path d="M981 13 H1071" stroke="#b9ab90" stroke-width="2" fill="none"/><path d="M1061 42 L1151 42 L1151 -16 L1061 -16 Z" fill="#d9ceb8"/><path d="M1065 38 L1061 42 L1061 -16 L1065 -20 Z" fill="#c2b59a"/><path d="M1065 -20 L1155 -20 L1151 -16 L1061 -16 Z" fill="#eee6d6"/><path d="M1061 13 H1151" stroke="#b9ab90" stroke-width="2" fill="none"/><path d="M76 76 L86 76 L86 18 L76 18 Z" fill="#d9ceb8"/><path d="M105 38 L76 76 L76 18 L105 -20 Z" fill="#c2b59a"/><path d="M105 -20 L115 -20 L86 18 L76 18 Z" fill="#eee6d6"/><path d="M76 47 H86" stroke="#b9ab90" stroke-width="2" fill="none"/><path d="M156 76 L166 76 L166 18 L156 18 Z" fill="#d9ceb8"/><path d="M185 38 L156 76 L156 18 L185 -20 Z" fill="#c2b59a"/><path d="M185 -20 L195 -20 L166 18 L156 18 Z" fill="#eee6d6"/><path d="M156 47 H166" stroke="#b9ab90" stroke-width="2" fill="none"/><path d="M156 76 L246 76 L246 18 L156 18 Z" fill="#d9ceb8"/><path d="M159 72 L156 76 L156 18 L159 14 Z" fill="#c2b59a"/><path d="M159 14 L249 14 L246 18 L156 18 Z" fill="#eee6d6"/><path d="M156 47 H246" stroke="#b9ab90" stroke-width="2" fill="none"/><path d="M316 76 L406 76 L406 18 L316 18 Z" fill="#d9ceb8"/><path d="M319 72 L316 76 L316 18 L319 14 Z" fill="#c2b59a"/><path d="M319 14 L409 14 L406 18 L316 18 Z" fill="#eee6d6"/><path d="M316 47 H406" stroke="#b9ab90" stroke-width="2" fill="none"/><path d="M396 76 L486 76 L486 36 L396 36 Z" fill="#d9ceb8"/><path d="M399 72 L396 76 L396 36 L399 32 Z" fill="#c2b59a"/><path d="M399 32 L489 32 L486 36 L396 36 Z" fill="#eee6d6"/><path d="M396 36 L441 27 L486 36 Z" fill="#d9ceb8"/><path d="M476 76 L486 76 L486 18 L476 18 Z" fill="#d9ceb8"/><path d="M505 38 L476 76 L476 18 L505 -20 Z" fill="#c2b59a"/><path d="M505 -20 L515 -20 L486 18 L476 18 Z" fill="#eee6d6"/><path d="M476 47 H486" stroke="#b9ab90" stroke-width="2" fill="none"/><path d="M636 76 L726 76 L726 18 L636 18 Z" fill="#d9ceb8"/><path d="M639 72 L636 76 L636 18 L639 14 Z" fill="#c2b59a"/><path d="M639 14 L729 14 L726 18 L636 18 Z" fill="#eee6d6"/><path d="M636 47 H726" stroke="#b9ab90" stroke-width="2" fill="none"/><path d="M716 76 L806 76 L806 18 L716 18 Z" fill="#d9ceb8"/><path d="M719 72 L716 76 L716 18 L719 14 Z" fill="#c2b59a"/><path d="M719 14 L809 14 L806 18 L716 18 Z" fill="#eee6d6"/><path d="M716 47 H806" stroke="#b9ab90" stroke-width="2" fill="none"/><path d="M796 76 L886 76 L886 18 L796 18 Z" fill="#d9ceb8"/><path d="M799 72 L796 76 L796 18 L799 14 Z" fill="#c2b59a"/><path d="M799 14 L889 14 L886 18 L796 18 Z" fill="#eee6d6"/><path d="M796 47 H886" stroke="#b9ab90" stroke-width="2" fill="none"/><path d="M876 76 L966 76 L966 18 L876 18 Z" fill="#d9ceb8"/><path d="M879 72 L876 76 L876 18 L879 14 Z" fill="#c2b59a"/><path d="M879 14 L969 14 L966 18 L876 18 Z" fill="#eee6d6"/><path d="M876 47 H966" stroke="#b9ab90" stroke-width="2" fill="none"/><path d="M956 76 L1046 76 L1046 18 L956 18 Z" fill="#d9ceb8"/><path d="M959 72 L956 76 L956 18 L959 14 Z" fill="#c2b59a"/><path d="M959 14 L1049 14 L1046 18 L956 18 Z" fill="#eee6d6"/><path d="M956 47 H1046" stroke="#b9ab90" stroke-width="2" fill="none"/><path d="M1116 76 L1126 76 L1126 18 L1116 18 Z" fill="#d9ceb8"/><path d="M1145 38 L1116 76 L1116 18 L1145 -20 Z" fill="#c2b59a"/><path d="M1145 -20 L1155 -20 L1126 18 L1116 18 Z" fill="#eee6d6"/><path d="M1116 47 H1126" stroke="#b9ab90" stroke-width="2" fill="none"/><path d="M50 109 L60 109 L60 51 L50 51 Z" fill="#d9ceb8"/><path d="M79 72 L50 109 L50 51 L79 14 Z" fill="#c2b59a"/><path d="M79 14 L89 14 L60 51 L50 51 Z" fill="#eee6d6"/><path d="M50 80 H60" stroke="#b9ab90" stroke-width="2" fill="none"/><path d="M50 109 L140 109 L140 51 L50 51 Z" fill="#d9ceb8"/><path d="M53 105 L50 109 L50 51 L53 47 Z" fill="#c2b59a"/><path d="M53 47 L143 47 L140 51 L50 51 Z" fill="#eee6d6"/><path d="M50 80 H140" stroke="#b9ab90" stroke-width="2" fill="none"/><path d="M210 109 L220 109 L220 51 L210 51 Z" fill="#d9ceb8"/><path d="M239 72 L210 109 L210 51 L239 14 Z" fill="#c2b59a"/><path d="M239 14 L249 14 L220 51 L210 51 Z" fill="#eee6d6"/><path d="M210 80 H220" stroke="#b9ab90" stroke-width="2" fill="none"/><path d="M290 109 L380 109 L380 51 L290 51 Z" fill="#d9ceb8"/><path d="M293 105 L290 109 L290 51 L293 47 Z" fill="#c2b59a"/><path d="M293 47 L383 47 L380 51 L290 51 Z" fill="#eee6d6"/><path d="M290 80 H380" stroke="#b9ab90" stroke-width="2" fill="none"/><path d="M370 109 L460 109 L460 51 L370 51 Z" fill="#d9ceb8"/><path d="M373 105 L370 109 L370 51 L373 47 Z" fill="#c2b59a"/><path d="M373 47 L463 47 L460 51 L370 51 Z" fill="#eee6d6"/><path d="M370 80 H460" stroke="#b9ab90" stroke-width="2" fill="none"/><path d="M450 109 L540 109 L540 51 L450 51 Z" fill="#d9ceb8"/><path d="M453 105 L450 109 L450 51 L453 47 Z" fill="#c2b59a"/><path d="M453 47 L543 47 L540 51 L450 51 Z" fill="#eee6d6"/><path d="M450 80 H540" stroke="#b9ab90" stroke-width="2" fill="none"/><path d="M530 109 L540 109 L540 51 L530 51 Z" fill="#d9ceb8"/><path d="M559 72 L530 109 L530 51 L559 14 Z" fill="#c2b59a"/><path d="M559 14 L569 14 L540 51 L530 51 Z" fill="#eee6d6"/><path d="M530 80 H540" stroke="#b9ab90" stroke-width="2" fill="none"/><path d="M530 109 L620 109 L620 51 L530 51 Z" fill="#d9ceb8"/><path d="M533 105 L530 109 L530 51 L533 47 Z" fill="#c2b59a"/><path d="M533 47 L623 47 L620 51 L530 51 Z" fill="#eee6d6"/><path d="M530 80 H620" stroke="#b9ab90" stroke-width="2" fill="none"/><path d="M610 109 L700 109 L700 51 L610 51 Z" fill="#d9ceb8"/><path d="M613 105 L610 109 L610 51 L613 47 Z" fill="#c2b59a"/><path d="M613 47 L703 47 L700 51 L610 51 Z" fill="#eee6d6"/><path d="M610 80 H700" stroke="#b9ab90" stroke-width="2" fill="none"/><path d="M690 109 L780 109 L780 51 L690 51 Z" fill="#d9ceb8"/><path d="M693 105 L690 109 L690 51 L693 47 Z" fill="#c2b59a"/><path d="M693 47 L783 47 L780 51 L690 51 Z" fill="#eee6d6"/><path d="M690 80 H780" stroke="#b9ab90" stroke-width="2" fill="none"/><path d="M850 109 L860 109 L860 51 L850 51 Z" fill="#d9ceb8"/><path d="M879 72 L850 109 L850 51 L879 14 Z" fill="#c2b59a"/><path d="M879 14 L889 14 L860 51 L850 51 Z" fill="#eee6d6"/><path d="M850 80 H860" stroke="#b9ab90" stroke-width="2" fill="none"/><path d="M930 109 L940 109 L940 51 L930 51 Z" fill="#d9ceb8"/><path d="M959 72 L930 109 L930 51 L959 14 Z" fill="#c2b59a"/><path d="M959 14 L969 14 L940 51 L930 51 Z" fill="#eee6d6"/><path d="M930 80 H940" stroke="#b9ab90" stroke-width="2" fill="none"/><path d="M1010 109 L1100 109 L1100 51 L1010 51 Z" fill="#d9ceb8"/><path d="M1013 105 L1010 109 L1010 51 L1013 47 Z" fill="#c2b59a"/><path d="M1013 47 L1103 47 L1100 51 L1010 51 Z" fill="#eee6d6"/><path d="M1010 80 H1100" stroke="#b9ab90" stroke-width="2" fill="none"/><path d="M1090 109 L1100 109 L1100 51 L1090 51 Z" fill="#d9ceb8"/><path d="M1119 72 L1090 109 L1090 51 L1119 14 Z" fill="#c2b59a"/><path d="M1119 14 L1129 14 L1100 51 L1090 51 Z" fill="#eee6d6"/><path d="M1090 80 H1100" stroke="#b9ab90" stroke-width="2" fill="none"/><path d="M25 143 L35 143 L35 103 L25 103 Z" fill="#d9ceb8"/><path d="M53 105 L25 143 L25 103 L53 65 Z" fill="#c2b59a"/><path d="M53 65 L63 65 L35 103 L25 103 Z" fill="#eee6d6"/><path d="M25 103 L30 94 L35 103 Z" fill="#d9ceb8"/><path d="M105 143 L115 143 L115 85 L105 85 Z" fill="#d9ceb8"/><path d="M133 105 L105 143 L105 85 L133 47 Z" fill="#c2b59a"/><path d="M133 47 L143 47 L115 85 L105 85 Z" fill="#eee6d6"/><path d="M105 114 H115" stroke="#b9ab90" stroke-width="2" fill="none"/><path d="M185 143 L195 143 L195 85 L185 85 Z" fill="#d9ceb8"/><path d="M213 105 L185 143 L185 85 L213 47 Z" fill="#c2b59a"/><path d="M213 47 L223 47 L195 85 L185 85 Z" fill="#eee6d6"/><path d="M185 114 H195" stroke="#b9ab90" stroke-width="2" fill="none"/><path d="M185 143 L275 143 L275 85 L185 85 Z" fill="#d9ceb8"/><path d="M188 139 L185 143 L185 85 L188 81 Z" fill="#c2b59a"/><path d="M188 81 L278 81 L275 85 L185 85 Z" fill="#eee6d6"/><path d="M185 114 H275" stroke="#b9ab90" stroke-width="2" fill="none"/><path d="M265 143 L275 143 L275 85 L265 85 Z" fill="#d9ceb8"/><path d="M293 105 L265 143 L265 85 L293 47 Z" fill="#c2b59a"/><path d="M293 47 L303 47 L275 85 L265 85 Z" fill="#eee6d6"/><path d="M265 114 H275" stroke="#b9ab90" stroke-width="2" fill="none"/><path d="M425 143 L435 143 L435 85 L425 85 Z" fill="#d9ceb8"/><path d="M453 105 L425 143 L425 85 L453 47 Z" fill="#c2b59a"/><path d="M453 47 L463 47 L435 85 L425 85 Z" fill="#eee6d6"/><path d="M425 114 H435" stroke="#b9ab90" stroke-width="2" fill="none"/><path d="M505 143 L595 143 L595 85 L505 85 Z" fill="#d9ceb8"/><path d="M508 139 L505 143 L505 85 L508 81 Z" fill="#c2b59a"/><path d="M508 81 L598 81 L595 85 L505 85 Z" fill="#eee6d6"/><path d="M505 114 H595" stroke="#b9ab90" stroke-width="2" fill="none"/><path d="M585 143 L675 143 L675 117 L585 117 Z" fill="#d9ceb8"/><path d="M588 139 L585 143 L585 117 L588 113 Z" fill="#c2b59a"/><path d="M588 113 L678 113 L675 117 L585 117 Z" fill="#eee6d6"/><path d="M585 117 L630 108 L675 117 Z" fill="#d9ceb8"/><path d="M745 143 L755 143 L755 103 L745 103 Z" fill="#d9ceb8"/><path d="M773 105 L745 143 L745 103 L773 65 Z" fill="#c2b59a"/><path d="M773 65 L783 65 L755 103 L745 103 Z" fill="#eee6d6"/><path d="M745 103 L750 94 L755 103 Z" fill="#d9ceb8"/><path d="M825 143 L835 143 L835 85 L825 85 Z" fill="#d9ceb8"/><path d="M853 105 L825 143 L825 85 L853 47 Z" fill="#c2b59a"/><path d="M853 47 L863 47 L835 85 L825 85 Z" fill="#eee6d6"/><path d="M825 114 H835" stroke="#b9ab90" stroke-width="2" fill="none"/><path d="M825 143 L915 143 L915 117 L825 117 Z" fill="#d9ceb8"/><path d="M828 139 L825 143 L825 117 L828 113 Z" fill="#c2b59a"/><path d="M828 113 L918 113 L915 117 L825 117 Z" fill="#eee6d6"/><path d="M825 117 L870 108 L915 117 Z" fill="#d9ceb8"/><path d="M905 143 L995 143 L995 85 L905 85 Z" fill="#d9ceb8"/><path d="M908 139 L905 143 L905 85 L908 81 Z" fill="#c2b59a"/><path d="M908 81 L998 81 L995 85 L905 85 Z" fill="#eee6d6"/><path d="M905 114 H995" stroke="#b9ab90" stroke-width="2" fill="none"/><path d="M985 143 L1075 143 L1075 85 L985 85 Z" fill="#d9ceb8"/><path d="M988 139 L985 143 L985 85 L988 81 Z" fill="#c2b59a"/><path d="M988 81 L1078 81 L1075 85 L985 85 Z" fill="#eee6d6"/><path d="M985 114 H1075" stroke="#b9ab90" stroke-width="2" fill="none"/><path d="M1065 143 L1075 143 L1075 85 L1065 85 Z" fill="#d9ceb8"/><path d="M1093 105 L1065 143 L1065 85 L1093 47 Z" fill="#c2b59a"/><path d="M1093 47 L1103 47 L1075 85 L1065 85 Z" fill="#eee6d6"/><path d="M1065 114 H1075" stroke="#b9ab90" stroke-width="2" fill="none"/><path d="M-1 176 L9 176 L9 118 L-1 118 Z" fill="#d9ceb8"/><path d="M28 139 L-1 176 L-1 118 L28 81 Z" fill="#c2b59a"/><path d="M28 81 L38 81 L9 118 L-1 118 Z" fill="#eee6d6"/><path d="M-1 148 H9" stroke="#b9ab90" stroke-width="2" fill="none"/><path d="M79 176 L89 176 L89 118 L79 118 Z" fill="#d9ceb8"/><path d="M108 139 L79 176 L79 118 L108 81 Z" fill="#c2b59a"/><path d="M108 81 L118 81 L89 118 L79 118 Z" fill="#eee6d6"/><path d="M79 148 H89" stroke="#b9ab90" stroke-width="2" fill="none"/><path d="M79 176 L169 176 L169 118 L79 118 Z" fill="#d9ceb8"/><path d="M82 172 L79 176 L79 118 L82 114 Z" fill="#c2b59a"/><path d="M82 114 L172 114 L169 118 L79 118 Z" fill="#eee6d6"/><path d="M79 148 H169" stroke="#b9ab90" stroke-width="2" fill="none"/><path d="M159 176 L249 176 L249 118 L159 118 Z" fill="#d9ceb8"/><path d="M162 172 L159 176 L159 118 L162 114 Z" fill="#c2b59a"/><path d="M162 114 L252 114 L249 118 L159 118 Z" fill="#eee6d6"/><path d="M159 148 H249" stroke="#b9ab90" stroke-width="2" fill="none"/><path d="M239 176 L329 176 L329 118 L239 118 Z" fill="#d9ceb8"/><path d="M242 172 L239 176 L239 118 L242 114 Z" fill="#c2b59a"/><path d="M242 114 L332 114 L329 118 L239 118 Z" fill="#eee6d6"/><path d="M239 148 H329" stroke="#b9ab90" stroke-width="2" fill="none"/><path d="M319 176 L329 176 L329 118 L319 118 Z" fill="#d9ceb8"/><path d="M348 139 L319 176 L319 118 L348 81 Z" fill="#c2b59a"/><path d="M348 81 L358 81 L329 118 L319 118 Z" fill="#eee6d6"/><path d="M319 148 H329" stroke="#b9ab90" stroke-width="2" fill="none"/><path d="M319 176 L409 176 L409 118 L319 118 Z" fill="#d9ceb8"/><path d="M322 172 L319 176 L319 118 L322 114 Z" fill="#c2b59a"/><path d="M322 114 L412 114 L409 118 L319 118 Z" fill="#eee6d6"/><path d="M319 148 H409" stroke="#b9ab90" stroke-width="2" fill="none"/><path d="M399 176 L489 176 L489 118 L399 118 Z" fill="#d9ceb8"/><path d="M402 172 L399 176 L399 118 L402 114 Z" fill="#c2b59a"/><path d="M402 114 L492 114 L489 118 L399 118 Z" fill="#eee6d6"/><path d="M399 148 H489" stroke="#b9ab90" stroke-width="2" fill="none"/><path d="M479 176 L489 176 L489 136 L479 136 Z" fill="#d9ceb8"/><path d="M508 139 L479 176 L479 136 L508 99 Z" fill="#c2b59a"/><path d="M508 99 L518 99 L489 136 L479 136 Z" fill="#eee6d6"/><path d="M479 136 L484 128 L489 136 Z" fill="#d9ceb8"/><path d="M559 176 L649 176 L649 118 L559 118 Z" fill="#d9ceb8"/><path d="M562 172 L559 176 L559 118 L562 114 Z" fill="#c2b59a"/><path d="M562 114 L652 114 L649 118 L559 118 Z" fill="#eee6d6"/><path d="M559 148 H649" stroke="#b9ab90" stroke-width="2" fill="none"/><path d="M639 176 L729 176 L729 118 L639 118 Z" fill="#d9ceb8"/><path d="M642 172 L639 176 L639 118 L642 114 Z" fill="#c2b59a"/><path d="M642 114 L732 114 L729 118 L639 118 Z" fill="#eee6d6"/><path d="M639 148 H729" stroke="#b9ab90" stroke-width="2" fill="none"/><path d="M719 176 L729 176 L729 118 L719 118 Z" fill="#d9ceb8"/><path d="M748 139 L719 176 L719 118 L748 81 Z" fill="#c2b59a"/><path d="M748 81 L758 81 L729 118 L719 118 Z" fill="#eee6d6"/><path d="M719 148 H729" stroke="#b9ab90" stroke-width="2" fill="none"/><path d="M719 176 L809 176 L809 118 L719 118 Z" fill="#d9ceb8"/><path d="M722 172 L719 176 L719 118 L722 114 Z" fill="#c2b59a"/><path d="M722 114 L812 114 L809 118 L719 118 Z" fill="#eee6d6"/><path d="M719 148 H809" stroke="#b9ab90" stroke-width="2" fill="none"/><path d="M799 176 L889 176 L889 118 L799 118 Z" fill="#d9ceb8"/><path d="M802 172 L799 176 L799 118 L802 114 Z" fill="#c2b59a"/><path d="M802 114 L892 114 L889 118 L799 118 Z" fill="#eee6d6"/><path d="M799 148 H889" stroke="#b9ab90" stroke-width="2" fill="none"/><path d="M879 176 L969 176 L969 118 L879 118 Z" fill="#d9ceb8"/><path d="M882 172 L879 176 L879 118 L882 114 Z" fill="#c2b59a"/><path d="M882 114 L972 114 L969 118 L879 118 Z" fill="#eee6d6"/><path d="M879 148 H969" stroke="#b9ab90" stroke-width="2" fill="none"/><path d="M1039 176 L1049 176 L1049 118 L1039 118 Z" fill="#d9ceb8"/><path d="M1068 139 L1039 176 L1039 118 L1068 81 Z" fill="#c2b59a"/><path d="M1068 81 L1078 81 L1049 118 L1039 118 Z" fill="#eee6d6"/><path d="M1039 148 H1049" stroke="#b9ab90" stroke-width="2" fill="none"/><path d="M-27 210 L-17 210 L-17 152 L-27 152 Z" fill="#d9ceb8"/><path d="M2 172 L-27 210 L-27 152 L2 114 Z" fill="#c2b59a"/><path d="M2 114 L12 114 L-17 152 L-27 152 Z" fill="#eee6d6"/><path d="M-27 181 H-17" stroke="#b9ab90" stroke-width="2" fill="none"/><path d="M-27 210 L63 210 L63 152 L-27 152 Z" fill="#d9ceb8"/><path d="M-23 206 L-27 210 L-27 152 L-23 148 Z" fill="#c2b59a"/><path d="M-23 148 L67 148 L63 152 L-27 152 Z" fill="#eee6d6"/><path d="M-27 181 H63" stroke="#b9ab90" stroke-width="2" fill="none"/><path d="M53 210 L143 210 L143 152 L53 152 Z" fill="#d9ceb8"/><path d="M57 206 L53 210 L53 152 L57 148 Z" fill="#c2b59a"/><path d="M57 148 L147 148 L143 152 L53 152 Z" fill="#eee6d6"/><path d="M53 181 H143" stroke="#b9ab90" stroke-width="2" fill="none"/><path d="M133 210 L223 210 L223 152 L133 152 Z" fill="#d9ceb8"/><path d="M137 206 L133 210 L133 152 L137 148 Z" fill="#c2b59a"/><path d="M137 148 L227 148 L223 152 L133 152 Z" fill="#eee6d6"/><path d="M133 181 H223" stroke="#b9ab90" stroke-width="2" fill="none"/><path d="M213 210 L303 210 L303 152 L213 152 Z" fill="#d9ceb8"/><path d="M217 206 L213 210 L213 152 L217 148 Z" fill="#c2b59a"/><path d="M217 148 L307 148 L303 152 L213 152 Z" fill="#eee6d6"/><path d="M213 181 H303" stroke="#b9ab90" stroke-width="2" fill="none"/><path d="M293 210 L383 210 L383 152 L293 152 Z" fill="#d9ceb8"/><path d="M297 206 L293 210 L293 152 L297 148 Z" fill="#c2b59a"/><path d="M297 148 L387 148 L383 152 L293 152 Z" fill="#eee6d6"/><path d="M293 181 H383" stroke="#b9ab90" stroke-width="2" fill="none"/><path d="M613 210 L703 210 L703 152 L613 152 Z" fill="#d9ceb8"/><path d="M617 206 L613 210 L613 152 L617 148 Z" fill="#c2b59a"/><path d="M617 148 L707 148 L703 152 L613 152 Z" fill="#eee6d6"/><path d="M613 181 H703" stroke="#b9ab90" stroke-width="2" fill="none"/><path d="M693 210 L783 210 L783 152 L693 152 Z" fill="#d9ceb8"/><path d="M697 206 L693 210 L693 152 L697 148 Z" fill="#c2b59a"/><path d="M697 148 L787 148 L783 152 L693 152 Z" fill="#eee6d6"/><path d="M693 181 H783" stroke="#b9ab90" stroke-width="2" fill="none"/><path d="M773 210 L863 210 L863 184 L773 184 Z" fill="#d9ceb8"/><path d="M777 206 L773 210 L773 184 L777 180 Z" fill="#c2b59a"/><path d="M777 180 L867 180 L863 184 L773 184 Z" fill="#eee6d6"/><path d="M773 184 L818 175 L863 184 Z" fill="#d9ceb8"/><path d="M853 210 L943 210 L943 152 L853 152 Z" fill="#d9ceb8"/><path d="M857 206 L853 210 L853 152 L857 148 Z" fill="#c2b59a"/><path d="M857 148 L947 148 L943 152 L853 152 Z" fill="#eee6d6"/><path d="M853 181 H943" stroke="#b9ab90" stroke-width="2" fill="none"/><path d="M933 210 L1023 210 L1023 152 L933 152 Z" fill="#d9ceb8"/><path d="M937 206 L933 210 L933 152 L937 148 Z" fill="#c2b59a"/><path d="M937 148 L1027 148 L1023 152 L933 152 Z" fill="#eee6d6"/><path d="M933 181 H1023" stroke="#b9ab90" stroke-width="2" fill="none"/><path d="M1013 210 L1023 210 L1023 152 L1013 152 Z" fill="#d9ceb8"/><path d="M1042 172 L1013 210 L1013 152 L1042 114 Z" fill="#c2b59a"/><path d="M1042 114 L1052 114 L1023 152 L1013 152 Z" fill="#eee6d6"/><path d="M1013 181 H1023" stroke="#b9ab90" stroke-width="2" fill="none"/><path d="M613 80 L629 80 L629 68 L613 68 Z" fill="#d9ceb8"/><path d="M618 61 L634 61 L629 68 L613 68 Z" fill="#eee6d6"/><path d="M404 156 L420 156 L420 143 L404 143 Z" fill="#d9ceb8"/><path d="M409 137 L425 137 L420 143 L404 143 Z" fill="#eee6d6"/><path d="M839 95 L853 95 L853 84 L839 84 Z" fill="#d9ceb8"/><path d="M844 78 L858 78 L853 84 L839 84 Z" fill="#eee6d6"/><path d="M121 180 L134 180 L134 169 L121 169 Z" fill="#d9ceb8"/><path d="M125 164 L138 164 L134 169 L121 169 Z" fill="#eee6d6"/><path d="M980 104 L991 104 L991 95 L980 95 Z" fill="#d9ceb8"/><path d="M983 90 L995 90 L991 95 L980 95 Z" fill="#eee6d6"/><path d="M603 127 L617 127 L617 115 L603 115 Z" fill="#d9ceb8"/><path d="M607 110 L621 110 L617 115 L603 115 Z" fill="#eee6d6"/><path d="M639 171 L654 171 L654 159 L639 159 Z" fill="#d9ceb8"/><path d="M644 153 L658 153 L654 159 L639 159 Z" fill="#eee6d6"/><path d="M294 86 L307 86 L307 76 L294 76 Z" fill="#d9ceb8"/><path d="M298 70 L311 70 L307 76 L294 76 Z" fill="#eee6d6"/><path d="M895 79 L908 79 L908 69 L895 69 Z" fill="#d9ceb8"/><path d="M899 64 L912 64 L908 69 L895 69 Z" fill="#eee6d6"/></g></svg>`;
function beastSays(text) { const el = document.getElementById('beast-says'); if (el) el.textContent = text; }
// Gold and green laurel leaves (and a few bits of colored confetti) falling across the stage.
function confetti() {
  const box = document.getElementById('confetti');
  if (!box) return;
  const colors = ['#f3c94a', '#6b8e3a', '#f3c94a', '#8fae55', '#17519c', '#b3261e'];
  box.innerHTML = Array.from({ length: 48 }, (_, i) => `<i class="${i % 6 < 4 ? 'leaf' : ''}" style="left:${Math.random() * 100}%;background:${colors[i % colors.length]};animation-delay:${(Math.random() * .8).toFixed(2)}s;--spin:${Math.round(Math.random() * 720 - 360)}deg;--drift:${Math.round(Math.random() * 80 - 40)}px"></i>`).join('');
  box.classList.add('show');
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
}
function renderChallenge() {
  const keys = pianoSvg({ from: stepOf(CHALLENGE_FROM), whites: CHALLENGE_WHITES, letters: 'c' });
  const panel = !game.finished ? '' : game.over === 'won'
    ? `<div class="game-over won"><div class="beast won">${beastSvg('happy', { laurel: true })}</div><h1>You beat the Note Beast Challenge!</h1><p class="beast-says">${esc(pick(BEAST_SAYS.doneHappy))}</p><div class="row-btns"><button class="start" data-act="challenge">Play again</button><button class="ghost" data-act="home">Home</button></div></div>`
    : `<div class="game-over lost"><div class="beast">${beastSvg('sad')}</div><h1>TRY AGAIN</h1><p class="meta">You caught ${game.caught} of ${CHALLENGE_GOAL}.</p><div class="row-btns"><button class="start" data-act="challenge">Try again</button><button class="ghost" data-act="home">Home</button></div></div>`;
  return `<header class="top game-top"><span class="caught-label">Level ${challengeLevel()} · Caught <strong id="caught">${game.caught} of ${CHALLENGE_GOAL}</strong></span><span id="lives" class="lives" role="img" aria-label="${game.lives} of ${CHALLENGE_LIVES} lives left">${hornsHtml()}</span></header>
  <div class="stage" id="stage"><div class="runner" id="runner"></div><div class="caught-name" id="caught-name" aria-live="polite"></div><p class="beast-says game-says" id="beast-says"></p><div class="ruins" id="ruins" aria-hidden="true">${MAZE_RUINS}</div><div class="rain-cloud" id="cloud" aria-hidden="true"><svg viewBox="0 0 120 70"><path d="M24 50 Q8 50 10 36 Q12 24 26 26 Q30 10 48 12 Q62 2 76 14 Q94 10 98 28 Q114 30 110 44 Q108 52 96 50 Z" fill="#c9ced4" stroke="#7d8790" stroke-width="3"/></svg><span></span><span></span><span></span><span></span><span></span></div><div class="confetti" id="confetti" aria-hidden="true"></div>${panel}</div>
  <div class="game-keys ${hearing() ? 'listening' : ''}">${hearing() ? listenPanel('Listening. Play the note on your piano.') : keys}</div>
  <button class="link" data-act="home" style="align-self:flex-start">Stop and go home</button>`;
}
