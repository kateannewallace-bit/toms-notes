/* Walking Up and Down (Katie's spec, 2026-11-14; a grown-up can also make the notes jump around, state.walkMode = 'jump'): a long line of notes moving up or down by step, over the whole range from
   the C above the treble staff (C6) to the C below the bass staff (C2), on the grand staff. Fifty notes a round; name each one.
   A wrong letter gets two more tries, then the right one is shown. Answered letters stay under the staff for reference.
   Above it, Note Beast rows a boat from Crete to Athens; the sea and the sights go by as the round goes on, Athens comes into
   view for the last five, and at the end the Athenians cheer and offer a celebratory cup (a kylix) of wine. */

const WALK_LO = stepOf('C2'), WALK_HI = stepOf('C6'), WALK_TRIES = 3, WALK_SHOW = 13;
// How many notes a round has: a grown-up setting from 10 to 100 (state.walkCount), 50 to start. Fixed when a round starts.
const walkCount = () => Math.max(10, Math.min(100, Math.round((state.walkCount || 50) / 10) * 10));
let WALK_LEN = 50;
const WORLD_W = 4000, VIEW_W = 1000;
// The range to walk, set on the grown-ups page (state.walkLo / state.walkHi); the whole range from C2 to C6 unless narrowed.
const walkRange = () => {
  const lo = stepOf(state.walkLo || 'C2'), hi = stepOf(state.walkHi || 'C6');
  return lo < hi ? [Math.max(WALK_LO, lo), Math.min(WALK_HI, hi)] : [WALK_LO, WALK_HI];
};
let walk = null;  // { steps, clefs, i, tries, results, wrong, msg, phase }

// A walk that reaches both ends of the range: one way to the top C (or bottom C), the other way all the way across,
// then back toward the middle; a few short turns along the way so it isn't just a scale.
function makeWalk() {
  const [LO, HI] = walkRange(), mid = Math.min(HI, Math.max(LO, stepOf('C4')));
  // a grown-up setting: notes that jump around anywhere in the range instead of stepping (never the same note twice in a row)
  if (state.walkMode === 'jump') {
    const steps = [];
    while (steps.length < WALK_LEN) { let s; do s = LO + Math.floor(Math.random() * (HI - LO + 1)); while (HI > LO && s === steps.at(-1)); steps.push(s); }
    const clefs = steps.map((s, i) => s > stepOf('C4') ? 't' : s < stepOf('C4') ? 'b' : Math.random() < .5 ? 't' : 'b');
    return { steps, clefs };
  }
  const up = Math.random() < .5, targets = up ? [HI, LO, mid] : [LO, HI, mid];
  const steps = [mid];
  let turns = 3;
  for (const t of targets) {
    while (steps.length < WALK_LEN && steps.at(-1) !== t) {
      const dir = Math.sign(t - steps.at(-1)), at = steps.at(-1);
      // a narrow range keeps sweeping back and forth until there are fifty notes
      // now and then step back once, then carry on (never past the ends, never wasting steps the round needs)
      const room = WALK_LEN - steps.length - Math.abs(t - at) - (t === targets[2] ? 0 : Math.abs(targets[2] - t));
      if (turns > 0 && room > 4 && Math.random() < .12 && at - dir >= LO && at - dir <= HI && steps.length > 2) {
        steps.push(at - dir, at); turns--;
      } else steps.push(at + dir);
    }
  }
  while (steps.length < WALK_LEN) { const at = steps.at(-1); steps.push(at + (at >= HI ? -1 : at <= LO ? 1 : Math.random() < .5 ? 1 : -1)); }
  steps.length = WALK_LEN;
  // Middle C goes on whichever staff the line is already on; everything else on its own staff
  const clefs = [];
  steps.forEach((s, i) => clefs.push(s > stepOf('C4') ? 't' : s < stepOf('C4') ? 'b' : i ? clefs[i - 1] : 't'));
  return { steps, clefs };
}

function startWalk() {
  hush();
  WALK_LEN = walkCount();
  walk = { ...makeWalk(), i: 0, tries: 0, results: [], wrong: [], msg: '', phase: 'play' };
  screen = 'walk';
  render();
  window.scrollTo?.({ top: 0 });
}

/* ---------- the staff: a window of the line, the current note in blue, answered letters underneath ---------- */
function walkStaffSvg() {
  const w = walk, start = Math.max(0, Math.min(w.i - 5, WALK_LEN - WALK_SHOW)), idx = Array.from({ length: WALK_SHOW }, (_, k) => start + k);
  const item = (c, n) => w.clefs[n] === c ? { p: pitchOf(w.steps[n]), d: 'w', cls: n === w.i && w.phase === 'play' ? 'now' : n < w.i ? 'walk-done' : '' } : { skip: 1, d: 'w' };
  const col = r => r === 'ok' ? 'w-ok' : r === 'late' ? 'w-late' : 'w-shown';
  return grandSvg({ S: 13, width: 760, even: true, tHi: WALK_HI, bLo: WALK_LO, t: idx.map(n => item('t', n)), b: idx.map(n => item('b', n)), cl: 'walk-staff',
    extraB: ({ x, Y, S }) => idx.map((n, k) => n < w.i || (w.phase !== 'play' && n <= w.i) ? `<text class="w-letter ${col(w.results[n])}" x="${x[k]}" y="${Y(WALK_LO) + S * 2.2}" text-anchor="middle" font-size="${S * 1.5}">${letterOf(w.steps[n])}</text>` : '').join('') });
}

/* ---------- the voyage ---------- */
const SEA_Y = 190;
// Note Beast in profile, facing right, sitting in a Greek boat with an eye painted on the prow, pulling an oar.
function rowerSvg() {
  const ink = BEAST_INK, fur = BEAST_FUR, dark = BEAST_DARK, tan = BEAST_TAN, horn = BEAST_HORN;
  return `<g class="rower" stroke="${ink}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">
    <g class="oar-far"><path d="M300 170 L250 232" stroke="#8a5a2b" stroke-width="6"/><path d="M256 222 L240 244" stroke="#8a5a2b" stroke-width="12"/></g>
    <path d="M282 150 C276 120 300 104 322 112 C340 118 346 140 340 168 Z" fill="${fur}"/>
    <path d="M298 128 C300 148 300 160 296 170" fill="none" stroke="${dark}" stroke-width="3"/>
    <g class="arm"><path d="M318 128 L338 150 L300 170" fill="none" stroke="${ink}" stroke-width="17"/><path d="M318 128 L338 150 L300 170" fill="none" stroke="${fur}" stroke-width="11"/></g>
    <path d="M330 64 C334 46 352 40 364 46 C352 48 344 56 342 70 Z" fill="${horn}"/>
    <path d="M300 92 C292 84 284 90 288 100 Z" fill="${dark}"/>
    <path d="M306 104 C298 80 316 62 336 64 C352 66 360 78 360 92 L378 98 C390 102 392 118 382 124 L360 126 C352 134 334 138 322 132 C312 128 306 118 306 104 Z" fill="${fur}"/>
    <path d="M360 94 C374 96 390 102 388 116 C386 126 372 128 360 126 C354 116 354 104 360 94 Z" fill="${tan}"/>
    <ellipse cx="380" cy="108" rx="3" ry="2.5" fill="${ink}" stroke="none"/>
    <path d="M362 120 Q370 126 380 122" fill="none" stroke-width="2.5"/>
    <circle cx="344" cy="86" r="6" fill="#fff"/><circle cx="346" cy="86" r="3" fill="${ink}" stroke="none"/>
    <path d="M336 76 Q344 72 352 76" fill="none" stroke-width="3"/>
    <path d="M312 70 L318 58 L322 68 L330 56 L332 68 L340 60 L338 72 Z" fill="${dark}"/>
    <path d="M318 98 C308 92 300 98 304 106 Z" fill="${fur}"/>
    <path d="M214 172 L496 172 C492 196 470 214 430 216 L262 216 C236 214 220 198 214 172 Z" fill="#8a5a2b"/>
    <path d="M214 172 C206 160 200 150 204 140 C212 148 214 160 222 172 Z" fill="#8a5a2b"/>
    <path d="M496 172 C506 158 520 150 530 148 C524 160 512 170 504 180 Z" fill="#8a5a2b"/>
    <path d="M222 182 L490 182" stroke="#c9a14a" stroke-width="4"/>
    <ellipse cx="482" cy="190" rx="9" ry="6" fill="#fff"/><circle cx="484" cy="190" r="3.5" fill="${ink}" stroke="none"/>
    <g class="oar-near"><path d="M326 166 L400 238" stroke="#a87b3a" stroke-width="6"/><path d="M392 228 L414 250" stroke="#a87b3a" stroke-width="13"/></g>
    <circle cx="324" cy="164" r="8" fill="${fur}"/>
  </g>`;
}
// The world the boat passes through, Crete on the left and Athens on the right; it slides left as the round goes on.
function worldSvg() {
  const ink = BEAST_INK;
  const cloud = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 30 Q-8 14 10 12 Q16 -4 36 4 Q52 -6 64 10 Q84 8 82 26 Q86 36 72 36 L8 36 Q-4 36 0 30 Z" fill="#fff" stroke="#c9d6e2" stroke-width="2"/></g>`;
  const ship = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})" stroke="${ink}" stroke-width="2.5" stroke-linejoin="round">
    <path d="M0 40 L170 40 C164 56 150 64 130 64 L30 64 C14 62 4 52 0 40 Z" fill="#5b3922"/><path d="M170 40 C180 30 188 22 196 22 C190 34 182 44 172 52 Z" fill="#5b3922"/>
    <path d="M-6 36 C-14 24 -12 14 -6 8 C-4 20 0 28 6 38 Z" fill="#5b3922"/><ellipse cx="158" cy="48" rx="6" ry="4" fill="#fff"/><circle cx="159" cy="48" r="2" fill="${ink}"/>
    <path d="M86 40 L86 -40" stroke-width="4"/><path d="M50 -36 L122 -36 L118 20 L54 20 Z" fill="#f3ecd9"/><path d="M54 -6 L118 -6" stroke="#b8322a" stroke-width="5"/>
    ${Array.from({ length: 7 }, (_, k) => `<path d="M${30 + k * 18} 58 L${22 + k * 18} 78" stroke="#8a5a2b" stroke-width="3"/>`).join('')}</g>`;
  const dolphin = (x, y, s = 1, flip = false) => `<g class="dolphin" transform="translate(${x} ${y}) scale(${flip ? -s : s} ${s})" stroke="${ink}" stroke-width="2.5" stroke-linejoin="round">
    <path d="M0 20 C10 0 40 -8 66 2 C74 4 82 8 88 10 C80 12 74 12 70 12 C66 20 54 26 40 26 C30 26 22 24 16 22 L4 32 L6 20 Z" fill="#7d93a8"/><path d="M34 2 L42 -10 L46 4 Z" fill="#7d93a8"/><circle cx="72" cy="7" r="2" fill="${ink}"/></g>`;
  const island = (x, temple) => `<g stroke="${ink}" stroke-width="2.5"><path d="M${x} ${SEA_Y} C${x + 30} ${SEA_Y - 60} ${x + 150} ${SEA_Y - 70} ${x + 200} ${SEA_Y} Z" fill="#cdb98a"/>
    <path d="M${x + 50} ${SEA_Y - 40} q10 -16 20 0 M${x + 120} ${SEA_Y - 44} q12 -18 24 0" fill="#6b8e3a"/>
    ${temple ? `<g transform="translate(${x + 72} ${SEA_Y - 92})"><path d="M0 22 L28 6 L56 22 Z" fill="#f3ecd9"/><rect x="2" y="22" width="52" height="5" fill="#f3ecd9"/><path d="M8 27 V46 M20 27 V46 M36 27 V46 M48 27 V46" stroke-width="3"/><rect x="0" y="46" width="56" height="5" fill="#f3ecd9"/></g>` : ''}</g>`;
  const mermaid = (x, y) => `<g class="mermaid" transform="translate(${x} ${y})" stroke="${ink}" stroke-width="2.5" stroke-linejoin="round">
    <path d="M10 0 C30 4 46 18 52 30 C60 24 70 24 74 28 C66 30 60 36 58 40 C48 36 34 34 20 30 Z" fill="#3fa38f"/><path d="M8 -26 C18 -26 20 -8 12 0 C6 4 2 -6 2 -14 Z" fill="#e8b98c"/>
    <circle cx="8" cy="-34" r="10" fill="#e8b98c"/><path d="M-2 -38 C0 -52 22 -50 20 -34 C26 -20 24 -6 18 2 C14 -10 12 -24 -2 -38 Z" fill="#d9534f"/><circle cx="12" cy="-35" r="1.8" fill="${ink}"/></g>`;
  const nymph = (x, y) => `<g class="nymph" transform="translate(${x} ${y})" stroke="${ink}" stroke-width="2.5" stroke-linejoin="round">
    <circle cx="0" cy="-46" r="10" fill="#e8b98c"/><path d="M-10 -50 C-8 -62 10 -62 10 -50 L12 -36 L-12 -36 Z" fill="#3b2a1d"/><circle cx="4" cy="-47" r="1.8" fill="${ink}"/>
    <path d="M-12 -36 L12 -36 L18 6 L-18 6 Z" fill="#cfe6f5"/><path d="M12 -30 L28 -44" stroke="#e8b98c" stroke-width="6"/><path d="M28 -44 L30 -60" stroke="#c9a14a" stroke-width="3"/>
    <path d="M-30 6 C-20 -4 20 -4 32 6 C20 14 -20 14 -30 6 Z" fill="#7d93a8"/></g>`;
  const gull = (x, y) => `<path d="M${x} ${y} q8 -8 16 0 q8 -8 16 0" fill="none" stroke="${ink}" stroke-width="2.5"/>`;
  const amphora = (x) => `<g transform="translate(${x} ${SEA_Y - 8}) rotate(-25)" stroke="${ink}" stroke-width="2"><path d="M-6 -20 L6 -20 L6 -14 C16 -8 16 10 0 20 C-16 10 -16 -8 -6 -14 Z" fill="#c8743c"/><path d="M-8 -6 L8 -6" stroke="#3b2a1d" stroke-width="3"/></g>`;
  // Crete: Knossos palace with its red columns, on the island where the labyrinth was
  const crete = `<g stroke="${ink}" stroke-width="2.5"><path d="M-40 ${SEA_Y} C40 ${SEA_Y - 120} 260 ${SEA_Y - 130} 380 ${SEA_Y} Z" fill="#d9c79a"/>
    <g transform="translate(70 ${SEA_Y - 112})"><rect x="0" y="0" width="150" height="10" fill="#e9dfc8"/><rect x="0" y="36" width="150" height="8" fill="#e9dfc8"/>${Array.from({ length: 6 }, (_, k) => `<path d="M${10 + k * 26} 10 L${14 + k * 26} 36 L${22 + k * 26} 36 L${26 + k * 26} 10 Z" fill="#b8322a"/>`).join('')}
    <path d="M0 -8 L10 0 M20 -8 L30 0 M120 -8 L130 0 M140 -8 L150 0" stroke-width="3"/></g>
    <text x="140" y="${SEA_Y - 16}" text-anchor="middle" class="place-name">Crete</text></g>`;
  // Athens: the Acropolis with the Parthenon on its hill, the city below, and the harbor with its dock
  const athens = `<g stroke="${ink}" stroke-width="2.5">
    <path d="M3330 ${SEA_Y} C3380 ${SEA_Y - 50} 3420 ${SEA_Y - 92} 3520 ${SEA_Y - 96} C3620 ${SEA_Y - 96} 3680 ${SEA_Y - 60} 3760 ${SEA_Y} Z" fill="#d9c79a"/>
    <g transform="translate(3460 ${SEA_Y - 162})"><path d="M0 26 L60 4 L120 26 Z" fill="#f3ecd9"/><rect x="2" y="26" width="116" height="7" fill="#f3ecd9"/>${Array.from({ length: 8 }, (_, k) => `<path d="M${8 + k * 15} 33 V62" stroke-width="4"/>`).join('')}<rect x="0" y="62" width="120" height="7" fill="#f3ecd9"/></g>
    ${[3360, 3600, 3660].map((x, k) => `<g transform="translate(${x} ${SEA_Y - 44 + k * 6})"><rect x="0" y="10" width="40" height="30" fill="#efe6d2"/><path d="M-4 12 L20 0 L44 12 Z" fill="#c8743c"/></g>`).join('')}
    <rect x="3640" y="${SEA_Y - 14}" width="360" height="22" fill="#a87b3a"/>${Array.from({ length: 8 }, (_, k) => `<path d="M${3650 + k * 45} ${SEA_Y + 8} V${SEA_Y + 30}" stroke="#5b3922" stroke-width="6"/>`).join('')}
    <text x="3420" y="${SEA_Y - 22}" text-anchor="middle" class="place-name">Athens</text></g>`;
  return `<g id="world" class="world">
    ${[[160, 30, 1], [520, 50, .8], [900, 24, 1.1], [1260, 46, .9], [1640, 28, 1], [2020, 52, .8], [2400, 22, 1.2], [2780, 44, .9], [3160, 30, 1], [3820, 40, .9]].map(([x, y, s]) => cloud(x, y, s)).join('')}
    ${gull(620, 70)}${gull(660, 84)}${gull(1720, 64)}${gull(2950, 80)}${gull(3000, 66)}
    ${crete}
    ${island(1320, true)}${island(2560, false)}${island(2980, true)}
    ${ship(600, SEA_Y - 54, .9)}${ship(1880, SEA_Y - 60, 1)}${ship(3080, SEA_Y - 50, .8)}
    ${athens}
    <rect x="-200" y="${SEA_Y}" width="${WORLD_W + 400}" height="120" fill="#4f8fc4"/>
    ${dolphin(1060, SEA_Y - 30)}${dolphin(1140, SEA_Y - 20, .8)}${dolphin(2280, SEA_Y - 28, 1, true)}${dolphin(3260, SEA_Y - 24, .9)}
    ${mermaid(1500, SEA_Y + 4)}${nymph(2160, SEA_Y + 2)}${mermaid(2720, SEA_Y + 4)}${nymph(3360, SEA_Y + 2)}
    ${amphora(840)}${amphora(2440)}
  </g>`;
}
// The Athenians on the dock: cheering, arms up, one holding out a kylix of wine.
function athensCrowdSvg() {
  const ink = BEAST_INK, robes = ['#f3ecd9', '#cfe6f5', '#e7c3c3', '#f3ecd9', '#d6e5c4', '#efe0b8'];
  const person = (x, i) => `<g class="athenian a${i}" transform="translate(${x} 0)" stroke="${ink}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round">
    <path d="M-16 ${SEA_Y - 14} L-12 ${SEA_Y - 64} L12 ${SEA_Y - 64} L16 ${SEA_Y - 14} Z" fill="${robes[i % robes.length]}"/>
    ${i === 1 ? '' : `<path class="cheer-arm" d="M-10 ${SEA_Y - 60} L-22 ${SEA_Y - 86}" stroke="#e8b98c" stroke-width="6"/><path class="cheer-arm r" d="M10 ${SEA_Y - 60} L22 ${SEA_Y - 86}" stroke="#e8b98c" stroke-width="6"/>`}
    <circle cx="0" cy="${SEA_Y - 76}" r="11" fill="#e8b98c"/><path d="M-11 ${SEA_Y - 78} C-10 ${SEA_Y - 92} 10 ${SEA_Y - 92} 11 ${SEA_Y - 78} C6 ${SEA_Y - 84} -6 ${SEA_Y - 84} -11 ${SEA_Y - 78} Z" fill="#3b2a1d"/>
    <path d="M-4 ${SEA_Y - 72} Q0 ${SEA_Y - 68} 4 ${SEA_Y - 72}" fill="none" stroke-width="2"/></g>`;
  // the one in front holds out a kylix: a wide, shallow two-handled cup, black with an orange band, full of red wine
  const kylix = `<g class="kylix" stroke="${ink}" stroke-width="2.5" stroke-linejoin="round">
    <path d="M-10 ${SEA_Y - 54} L-44 ${SEA_Y - 70}" stroke="#e8b98c" stroke-width="6" stroke-linecap="round"/>
    <path d="M-80 ${SEA_Y - 80} L-30 ${SEA_Y - 80} C-34 ${SEA_Y - 66} -46 ${SEA_Y - 62} -55 ${SEA_Y - 62} C-64 ${SEA_Y - 62} -76 ${SEA_Y - 66} -80 ${SEA_Y - 80} Z" fill="#1d1712"/>
    <path d="M-78 ${SEA_Y - 74} L-32 ${SEA_Y - 74}" stroke="#c8743c" stroke-width="3"/><ellipse cx="-55" cy="${SEA_Y - 80}" rx="25" ry="4" fill="#7a1f2b"/>
    <path d="M-80 ${SEA_Y - 78} C-90 ${SEA_Y - 78} -90 ${SEA_Y - 70} -80 ${SEA_Y - 72} M-30 ${SEA_Y - 78} C-20 ${SEA_Y - 78} -20 ${SEA_Y - 70} -30 ${SEA_Y - 72}" fill="none"/>
    <path d="M-55 ${SEA_Y - 62} L-55 ${SEA_Y - 54} M-63 ${SEA_Y - 52} L-47 ${SEA_Y - 52}" stroke-width="3"/></g>`;
  return `<g class="crowd">${[730, 780, 830, 880, 930, 975].map((x, i) => person(x, i)).join('')}<g transform="translate(780 0)">${kylix}</g></g>`;
}
function sceneSvg() {
  return `<svg class="voyage" viewBox="0 0 ${VIEW_W} 300" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Note Beast rowing a boat from Crete to Athens">
    <defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bfe0f5"/><stop offset="1" stop-color="#eaf5fb"/></linearGradient></defs>
    <rect width="${VIEW_W}" height="${SEA_Y}" fill="url(#sky)"/>
    ${worldSvg()}
    <g class="boat-wrap"><g class="boat">${rowerSvg()}</g></g>
    <path class="waves" d="${Array.from({ length: 30 }, (_, k) => `M${k * 40 - 40} ${SEA_Y + 14} q10 -8 20 0 t20 0`).join(' ')}" fill="none" stroke="#cfe6f5" stroke-width="3"/>
    <g class="arrival">${athensCrowdSvg()}<g class="petals">${Array.from({ length: 24 }, (_, k) => `<circle cx="${700 + (k * 37) % 290}" cy="${20 + (k * 53) % 90}" r="5" fill="${['#f3c94a', '#e0517a', '#fff', '#8fae55'][k % 4]}" style="animation-delay:${(k % 8) * .15}s"/>`).join('')}</g>
      <g class="bubble"><rect x="690" y="16" width="240" height="44" rx="12" fill="#fff" stroke="#2a1a10" stroke-width="2.5"/><text x="810" y="45" text-anchor="middle" class="bubble-text">Welcome to Athens!</text></g></g>
  </svg>`;
}
// Slide the world along: the boat has come i of WALK_LEN legs of the way.
function placeWorld() {
  const g = document.getElementById('world');
  // the first part of the round covers 90% of the sea, so Athens comes into view for the last five notes whatever the round length
  const i = walk.i, near = WALK_LEN - 5, p = i < near ? (i / near) * .9 : .9 + (i - near) / 5 * .1;
  if (g) g.style.transform = `translateX(${-Math.min(1, p) * (WORLD_W - VIEW_W)}px)`;
}
function rowStroke() {
  const b = document.querySelector('.voyage .boat');
  if (!b) return;
  b.classList.remove('rowing'); void b.getBoundingClientRect(); b.classList.add('rowing');
}

/* ---------- screens ---------- */
function renderWalk() {
  const w = walk;
  const head = `<header class="top"><h1>Note Beast On The High Seas</h1><button class="ghost" data-act="home">Home</button></header>`;
  if (w.phase === 'done') {
    const first = w.results.filter(r => r === 'ok').length, best = state.walks?.bestBy?.[WALK_LEN] ?? first;
    return `${head}<div class="walk-done"><div class="scene-wrap">${sceneSvg()}</div>
      <h2>Note Beast made it to Athens!</h2><p class="note">${first} of ${WALK_LEN} notes right on the first try${state.walks?.plays > 1 ? ` · best so far: ${best}` : ''}.</p>
      <div class="next-row"><button class="start" data-act="walk">Row again</button><button class="ghost" data-act="home">Home</button></div></div>`;
  }
  return `${head}<div class="scene-wrap" id="scene">${sceneSvg()}</div>
    <div class="walk-top"><span class="walk-count" id="walk-count"></span><span class="walk-say" id="walk-say"></span></div>
    <div class="staff-wrap walk-wrap" id="walk-staff"></div>
    <div class="choices letters" id="walk-keys"></div>
    <div class="feedback" id="walk-msg"></div>`;
}
// Redraw only the parts that change, so the sea keeps moving smoothly.
function drawWalk() {
  const w = walk, el = id => document.getElementById(id);
  if (!el('walk-staff')) return;
  el('walk-staff').innerHTML = walkStaffSvg();
  el('walk-count').textContent = w.phase === 'play' ? `Note ${w.i + 1} of ${WALK_LEN}` : `All ${WALK_LEN} notes!`;
  el('walk-say').textContent = w.phase === 'play' ? (w.i >= WALK_LEN - 5 ? 'Athens is in sight! ' : '') + (state.walkAnswer === 'keys' ? 'Play the blue note.' : 'Name the blue note.') : '';
  el('walk-keys').classList.toggle('walk-piano', state.walkAnswer === 'keys');
  el('walk-keys').innerHTML = w.phase !== 'play' ? '' : state.walkAnswer === 'keys' ? walkPiano(el('walk-keys')) : ['A', 'B', 'C', 'D', 'E', 'F', 'G'].map(L => `<button class="choice ${w.wrong.includes(L) ? 'no' : ''}" data-act="walk-letter" data-v="${L}" ${w.wrong.includes(L) ? 'disabled' : ''}>${L}</button>`).join('');
  el('walk-msg').innerHTML = w.msg ? `<span class="${w.msgCls || 'how'}">${esc(w.msg)}</span>` : '';
  placeWorld();
  document.getElementById('scene')?.classList.toggle('in-sight', w.i >= WALK_LEN - 5);
}
/* ---------- answering on piano keys (a grown-up setting, state.walkAnswer = 'keys') ---------- */
// The keyboard shows as many keys as fit at a comfortable size (about 46px each). If the whole range fits, it shows all of it
// (padded out to fill the space); if not, a window of keys that holds the note: stepping, it centers on the note before (so
// the window gives nothing away); jumping, the note lands somewhere inside it, never right at the edge.
const WALK_KEY_PX = 46;
function walkWindow(width) {
  const w = walk, [LO, HI] = walkRange(), s = w.steps[w.i];
  const fit = Math.max(8, Math.min(WALK_HI - WALK_LO + 1, Math.floor(width / WALK_KEY_PX)));
  if (HI - LO + 1 <= fit) {
    let from = LO - Math.floor((fit - (HI - LO + 1)) / 2);
    from = Math.max(WALK_LO, Math.min(from, WALK_HI - fit + 1));
    return { from, whites: fit };
  }
  let from;
  if (state.walkMode === 'jump') {
    const a = Math.max(LO, s - fit + 2), b = Math.min(HI - fit + 1, s - 1);
    from = a <= b ? a + Math.floor(Math.random() * (b - a + 1)) : Math.max(LO, Math.min(s - Math.floor(fit / 2), HI - fit + 1));
  } else {
    const ref = w.i ? w.steps[w.i - 1] : s;
    from = Math.max(LO, Math.min(ref - Math.floor(fit / 2), HI - fit + 1));
  }
  return { from, whites: fit };
}
function walkPiano(box) {
  const w = walk;
  // one window per note, so it doesn't shift between tries
  if (w.winAt !== w.i || !w.win) { w.win = walkWindow(box.clientWidth || 720); w.winAt = w.i; }
  const marks = {};
  w.wrong.forEach(m => { if (typeof m === 'number') marks[m] = 'no'; });
  return `<div class="key-wrap live">${pianoSvg({ from: w.win.from, whites: w.win.whites, letters: 'c', marks })}</div>`;
}
function walkKey(midi) {
  const w = walk;
  if (!w || w.phase !== 'play' || state.walkAnswer !== 'keys' || w.wrong.includes(midi)) return;
  const s = w.steps[w.i], want = whiteMidi(s), right = letterOf(s);
  if (midi === want) return walkNext(w.tries === 0 ? 'ok' : 'late', w.tries === 0 ? pick(PRAISE) : `Yes, ${right}.`);
  w.tries++; w.wrong.push(midi);
  if (!hearing()) { tone(midi, 0, .6, .5); grunt('sad', .4); }
  if (w.tries >= WALK_TRIES) return walkNext('shown', `It is the ${right} ${midi > want ? 'lower down' : 'further up'}.`);
  const sameLetter = !isBlack(midi) && keyName(midi) === right;
  w.msg = `${sameLetter ? `That is ${withA(right)}, but too ${midi > want ? 'high: this one is further left' : 'low: this one is further right'}.` : `That’s ${isBlack(midi) ? 'a black key' : keyName(midi)}.`} ${w.tries === 1 ? 'Two more tries.' : 'One more try.'}`;
  w.msgCls = 'how try-line';
  drawWalk();
  document.getElementById('walk-staff')?.classList.add('shake');
}
function walkLetter(L) {
  const w = walk;
  if (!w || w.phase !== 'play' || w.wrong.includes(L)) return;
  const s = w.steps[w.i], right = letterOf(s);
  if (L === right) return walkNext(w.tries === 0 ? 'ok' : 'late', w.tries === 0 ? pick(PRAISE) : `Yes, ${right}.`);
  w.tries++; w.wrong.push(L);
  if (!hearing()) grunt('sad');  // an unhappy sound for a wrong answer
  if (w.tries >= WALK_TRIES) return walkNext('shown', `It is ${right}.`);
  w.msg = `Not ${L}. ${w.tries === 1 ? 'Two more tries.' : 'One more try.'} ${state.walkMode === 'jump' ? hintWords(w.clefs[w.i], s) : w.i ? `The note before was ${letterOf(w.steps[w.i - 1])}; this one is a step ${s > w.steps[w.i - 1] ? 'up' : 'down'}.` : ''}`;
  w.msgCls = 'how try-line';
  drawWalk();
  document.getElementById('walk-staff')?.classList.add('shake');
}
function walkNext(result, msg) {
  const w = walk, s = w.steps[w.i];
  w.results[w.i] = result;
  // the note itself, then the oar dipping into the water as the boat moves on (Katie's ask)
  if (!hearing()) { tone(whiteMidi(s), 0, 1, .7); if (result !== 'shown') splash(.35); }
  w.msg = msg; w.msgCls = result === 'shown' ? 'how try-line' : 'big good';
  w.tries = 0; w.wrong = [];
  if (w.i === WALK_LEN - 1) return walkArrive();
  w.i++;
  rowStroke();
  drawWalk();
}
// The last note: the boat reaches the dock, the Athenians cheer, and one offers a cup of wine.
function walkArrive() {
  const w = walk;
  w.phase = 'arrive'; w.i = WALK_LEN;
  drawWalk();
  rowStroke();
  const scene = document.getElementById('scene');
  setTimeout(() => scene?.classList.add('arrived'), 700);
  if (!hearing()) setTimeout(() => playSeq([{ midi: 60, beats: .3 }, { midi: 64, beats: .3 }, { midi: 67, beats: .3 }, { midi: 72, beats: .6 }, { midi: 67, beats: .3 }, { midi: 72, beats: 1.4 }], 116), 1500);
  grunt('happy', 2.6);
  state.walks = state.walks || { plays: 0 };
  state.walks.plays++;
  // the best score is kept for each round length, so 10-note and 100-note rounds aren't compared
  state.walks.bestBy = state.walks.bestBy || (state.walks.best != null ? { 50: state.walks.best } : {});
  state.walks.bestBy[WALK_LEN] = Math.max(state.walks.bestBy[WALK_LEN] || 0, w.results.filter(r => r === 'ok').length);
  save();
  setTimeout(() => { if (screen === 'walk' && walk === w) { w.phase = 'done'; render(); document.querySelector('.walk-done .scene-wrap')?.classList.add('arrived', 'in-sight'); const g = document.getElementById('world'); if (g) { g.style.transition = 'none'; g.style.transform = `translateX(${-(WORLD_W - VIEW_W)}px)`; } } }, 6500);
}

Object.assign(ACTIONS, {
  walk() { audioReady(); startWalk(); },
  'walk-letter'(d) { walkLetter(d.v); },
});
