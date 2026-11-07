/* The Note Beast: a friendly, hairy minotaur. Faces: 'happy', 'worried', 'scowl', 'aghast', 'sad' and 'dizzy'. */
const BEAST_INK = '#2a1a10', BEAST_FUR = '#8a5a3b', BEAST_DARK = '#5b3922', BEAST_TAN = '#e2bf96', BEAST_HORN = '#f1e6c8';
// His head, in a 200 × 210 box (no shoulders).
function beastHead(mood) {
  const ink = BEAST_INK, fur = BEAST_FUR, dark = BEAST_DARK, tan = BEAST_TAN, horn = BEAST_HORN;
  const brows = {
    happy: '<path d="M66 80 Q79 70 92 79" /><path d="M134 80 Q121 70 108 79" />',
    worried: '<path d="M66 86 L92 76" /><path d="M134 86 L108 76" />',
    scowl: '<path d="M64 76 L93 88" /><path d="M136 76 L107 88" />',
    sad: '<path d="M66 88 L92 80" /><path d="M134 88 L108 80" />',
    aghast: '<path d="M62 78 L93 89" /><path d="M138 78 L107 89" /><path d="M97 80 L97 90 M103 80 L103 90" stroke-width="2.5" />',
    dizzy: '<path d="M66 80 Q79 74 92 80" /><path d="M134 80 Q121 74 108 80" />',
    defeated: '<path d="M66 82 Q79 78 92 84" /><path d="M134 82 Q121 78 108 84" />',
  }[mood];
  const eyes = mood === 'happy'
    ? `<circle cx="80" cy="100" r="12" fill="#fff"/><circle cx="120" cy="100" r="12" fill="#fff"/><circle cx="81" cy="101" r="6" fill="${ink}"/><circle cx="119" cy="101" r="6" fill="${ink}"/><circle cx="83" cy="98" r="2.2" fill="#fff" stroke="none"/><circle cx="121" cy="98" r="2.2" fill="#fff" stroke="none"/>`
    : mood === 'dizzy' || mood === 'defeated'
    ? '<path d="M72 92 L88 108 M88 92 L72 108 M112 92 L128 108 M128 92 L112 108" fill="none" stroke-width="4"/>'
    : mood === 'sad'
    ? `<circle cx="80" cy="102" r="11" fill="#fff"/><circle cx="120" cy="102" r="11" fill="#fff"/><circle cx="80" cy="106" r="5" fill="${ink}"/><circle cx="120" cy="106" r="5" fill="${ink}"/><path d="M69 99 Q80 90 91 99 Z M109 99 Q120 90 131 99 Z" fill="${fur}" stroke-width="2.5"/>`
    : mood === 'aghast'
    ? `<circle cx="80" cy="103" r="13" fill="#fff"/><circle cx="120" cy="103" r="13" fill="#fff"/><circle cx="80" cy="104" r="4" fill="${ink}"/><circle cx="120" cy="104" r="4" fill="${ink}"/>`
    : mood === 'scowl'
    ? `<circle cx="80" cy="102" r="10" fill="#fff"/><circle cx="120" cy="102" r="10" fill="#fff"/><circle cx="81" cy="104" r="5" fill="${ink}"/><circle cx="119" cy="104" r="5" fill="${ink}"/>`
    : `<circle cx="80" cy="101" r="11" fill="#fff"/><circle cx="120" cy="101" r="11" fill="#fff"/><circle cx="82" cy="98" r="5.5" fill="${ink}"/><circle cx="118" cy="98" r="5.5" fill="${ink}"/>`;
  const mouth = {
    happy: '<path d="M82 154 Q100 180 118 154 Z" fill="#7a2c2c"/><path d="M90 163 Q100 172 110 163 Q100 168 90 163 Z" fill="#e88a8a" stroke="none"/>',
    worried: '<path d="M86 167 Q100 156 114 167" fill="none"/>',
    scowl: '<path d="M82 170 Q100 152 118 170" fill="none" stroke-width="4.5"/>',
    sad: '<path d="M86 168 Q100 158 114 168" fill="none"/>',
    aghast: '<path d="M78 172 Q80 152 100 154 Q120 152 122 172 Q100 166 78 172 Z" fill="#7a2c2c"/><path d="M84 158 Q100 154 116 158 L115 163 Q100 160 85 163 Z" fill="#fff" stroke-width="2"/>',
    dizzy: '<path d="M82 164 q9 -9 18 0 q9 9 18 0" fill="none"/>',
    defeated: '<path d="M84 166 Q100 158 116 166" fill="none"/><path d="M104 165 Q106 180 113 178 Q118 174 112 163" fill="#e88a8a"/>',
  }[mood];
  const extra = {
    happy: '<circle cx="61" cy="126" r="8" fill="#f0a49a" opacity=".75" stroke="none"/><circle cx="139" cy="126" r="8" fill="#f0a49a" opacity=".75" stroke="none"/>',
    worried: '<path d="M151 70 Q156 80 151 85 Q146 80 151 70 Z" fill="#9fcbe9" stroke-width="2"/>',
    aghast: '',
    defeated: '',
    sad: '<path d="M134 112 Q139 122 134 127 Q129 122 134 112 Z" fill="#9fcbe9" stroke-width="2"/>',
    scowl: '<circle cx="61" cy="126" r="9" fill="#d9534f" opacity=".45" stroke="none"/><circle cx="139" cy="126" r="9" fill="#d9534f" opacity=".45" stroke="none"/><path d="M34 44 q-9 -9 0 -18 q9 -9 0 -18 M166 44 q9 -9 0 -18 q-9 -9 0 -18" fill="none" stroke="#9aa3a8" stroke-width="4"/>',
    dizzy: '<path d="M60 24 l3 7 7 1 -5 5 1 7 -6 -3 -6 3 1 -7 -5 -5 7 -1 Z M140 18 l3 7 7 1 -5 5 1 7 -6 -3 -6 3 1 -7 -5 -5 7 -1 Z" fill="#f3d77a" stroke-width="2"/>',
  }[mood];
  return `<g stroke="${ink}" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round">
    <path d="M64 66 C40 62 16 46 20 14 C30 32 48 42 72 46 Z" fill="${horn}"/>
    <path d="M136 66 C160 62 184 46 180 14 C170 32 152 42 128 46 Z" fill="${horn}"/>
    <path d="M58 84 C38 76 20 84 14 96 C32 102 48 100 62 94 Z" fill="${fur}"/>
    <path d="M142 84 C162 76 180 84 186 96 C168 102 152 100 138 94 Z" fill="${fur}"/>
    <path d="M60 52 C62 34 138 34 140 52 L148 118 C151 158 128 184 100 184 C72 184 49 158 52 118 Z" fill="${fur}"/>
    <path d="M55 102 L36 108 L50 115 L32 124 L49 130 L38 142 L58 140 Z" fill="${dark}"/>
    <path d="M145 102 L164 108 L150 115 L168 124 L151 130 L162 142 L142 140 Z" fill="${dark}"/>
    <path d="M78 176 L84 194 L92 182 L100 198 L108 182 L116 194 L122 176 Z" fill="${dark}"/>
    <path d="M60 52 C78 36 122 36 140 52 L136 66 L127 57 L121 71 L112 59 L105 73 L98 59 L90 72 L83 58 L76 69 L70 57 L64 66 Z" fill="${dark}"/>
    <ellipse cx="100" cy="150" rx="35" ry="27" fill="${tan}"/>
    <ellipse cx="88" cy="141" rx="5" ry="4" fill="${ink}" stroke="none"/>
    <ellipse cx="112" cy="141" rx="5" ry="4" fill="${ink}" stroke="none"/>
    ${extra}
    ${eyes}
    <g fill="none" stroke-width="4">${brows}</g>
    ${mouth}
  </g>`;
}
// A golden laurel wreath round his brow, like a Greek champion's, for winning the Challenge.
const beastLaurel = () => `<g class="laurel" fill="#f3c94a" stroke="${BEAST_INK}" stroke-width="2"><path d="M58 76 Q60 40 100 40 Q140 40 142 76" fill="none" stroke="#b8902a" stroke-width="3"/><ellipse cx="56.8" cy="68.3" rx="9" ry="4.2" transform="rotate(-102 56.8 68.3) translate(-5 0)"/><ellipse cx="56.8" cy="68.3" rx="9" ry="4.2" transform="rotate(-32 56.8 68.3) translate(5 0)"/><ellipse cx="54.5" cy="76.2" rx="9" ry="4.2" transform="rotate(-115 54.5 76.2) translate(-5 0)"/><ellipse cx="54.5" cy="76.2" rx="9" ry="4.2" transform="rotate(-45 54.5 76.2) translate(5 0)"/><ellipse cx="54.1" cy="79.7" rx="9" ry="4.2" transform="rotate(59 54.1 79.7) translate(-5 0)"/><ellipse cx="54.1" cy="79.7" rx="9" ry="4.2" transform="rotate(129 54.1 79.7) translate(5 0)"/><ellipse cx="55.6" cy="71.6" rx="9" ry="4.2" transform="rotate(72 55.6 71.6) translate(-5 0)"/><ellipse cx="55.6" cy="71.6" rx="9" ry="4.2" transform="rotate(142 55.6 71.6) translate(5 0)"/><ellipse cx="58.9" cy="64.0" rx="9" ry="4.2" transform="rotate(85 58.9 64.0) translate(-5 0)"/><ellipse cx="58.9" cy="64.0" rx="9" ry="4.2" transform="rotate(155 58.9 64.0) translate(5 0)"/><ellipse cx="63.9" cy="57.2" rx="9" ry="4.2" transform="rotate(97 63.9 57.2) translate(-5 0)"/><ellipse cx="63.9" cy="57.2" rx="9" ry="4.2" transform="rotate(167 63.9 57.2) translate(5 0)"/><ellipse cx="70.4" cy="51.4" rx="9" ry="4.2" transform="rotate(109 70.4 51.4) translate(-5 0)"/><ellipse cx="70.4" cy="51.4" rx="9" ry="4.2" transform="rotate(179 70.4 51.4) translate(5 0)"/><ellipse cx="143.2" cy="68.3" rx="9" ry="4.2" transform="rotate(32 143.2 68.3) translate(-5 0)"/><ellipse cx="143.2" cy="68.3" rx="9" ry="4.2" transform="rotate(102 143.2 68.3) translate(5 0)"/><ellipse cx="145.5" cy="76.2" rx="9" ry="4.2" transform="rotate(45 145.5 76.2) translate(-5 0)"/><ellipse cx="145.5" cy="76.2" rx="9" ry="4.2" transform="rotate(115 145.5 76.2) translate(5 0)"/><ellipse cx="145.9" cy="79.7" rx="9" ry="4.2" transform="rotate(-129 145.9 79.7) translate(-5 0)"/><ellipse cx="145.9" cy="79.7" rx="9" ry="4.2" transform="rotate(-59 145.9 79.7) translate(5 0)"/><ellipse cx="144.4" cy="71.6" rx="9" ry="4.2" transform="rotate(-142 144.4 71.6) translate(-5 0)"/><ellipse cx="144.4" cy="71.6" rx="9" ry="4.2" transform="rotate(-72 144.4 71.6) translate(5 0)"/><ellipse cx="141.1" cy="64.0" rx="9" ry="4.2" transform="rotate(-155 141.1 64.0) translate(-5 0)"/><ellipse cx="141.1" cy="64.0" rx="9" ry="4.2" transform="rotate(-85 141.1 64.0) translate(5 0)"/><ellipse cx="136.1" cy="57.2" rx="9" ry="4.2" transform="rotate(-167 136.1 57.2) translate(-5 0)"/><ellipse cx="136.1" cy="57.2" rx="9" ry="4.2" transform="rotate(-97 136.1 57.2) translate(5 0)"/><ellipse cx="129.6" cy="51.4" rx="9" ry="4.2" transform="rotate(-179 129.6 51.4) translate(-5 0)"/><ellipse cx="129.6" cy="51.4" rx="9" ry="4.2" transform="rotate(-109 129.6 51.4) translate(5 0)"/><circle cx="100" cy="40" r="4.5" fill="#d9534f"/></g>`;
// A long, broken old column lying on its side, for him to sit on when he sulks (he lives in a labyrinth, after all).
const beastColumn = () => `<g stroke="${BEAST_INK}" stroke-width="3.5" stroke-linejoin="round"><path d="M-30 336 L246 336 L238 350 L252 362 L240 376 L254 388 L246 400 L-30 400 Z" fill="#ece4d4"/><path d="M-30 349 H244 M-30 362 H248 M-30 375 H246 M-30 388 H250" stroke="#b7ab95" stroke-width="3"/><ellipse cx="-30" cy="368" rx="16" ry="32" fill="#f6f0e4"/><ellipse cx="-30" cy="368" rx="9" ry="20" fill="none" stroke="#b7ab95" stroke-width="2.5"/></g>`;
// Head and shoulders, beside the answers.
function beastSvg(mood, opts = {}) {
  return `<svg class="beast-art" viewBox="0 0 200 210" role="img" aria-label="The Note Beast ${mood === 'happy' ? 'looks delighted' : 'looks concerned'}${opts.laurel ? ', wearing a golden laurel wreath' : ''}">
  <path d="M24 210 L32 184 L42 192 L50 170 L62 184 L74 166 L86 180 L100 164 L114 180 L126 166 L138 184 L150 170 L158 192 L168 184 L176 210 Z" fill="${BEAST_DARK}" stroke="${BEAST_INK}" stroke-width="3.5" stroke-linejoin="round"/>
  ${beastHead(mood)}${opts.laurel ? beastLaurel() : ''}
</svg>`;
}
// The whole Note Beast, for the Challenge: a broad, shaggy minotaur holding the placard in front of his chest.
// pose: 'hold' (both hands on the placard), 'thumbs' (one thumb up), 'cheer' (both arms up), 'sit' (sitting down, sulking).
// opts.laurel puts a golden laurel wreath on his head. Sitting, he sits on a broken column.
// placard: the staff to show on it, as an <svg> string.
function beastFigure(mood, pose, placard = '', opts = {}) {
  const ink = BEAST_INK, fur = BEAST_FUR, dark = BEAST_DARK, tan = BEAST_TAN;
  const arm = (...pts) => { const d = 'M' + pts.join(' L'); return `<path d="${d}" fill="none" stroke="${ink}" stroke-width="27" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${fur}" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/>`; };
  const fist = (x, y) => `<circle cx="${x}" cy="${y}" r="13" fill="${fur}" stroke="${ink}" stroke-width="3.5"/>`;
  const leg = (x, angle) => `<g transform="translate(0 42) rotate(${angle} ${x + 13} 338)"><rect x="${x}" y="334" width="26" height="44" rx="10" fill="${fur}" stroke="${ink}" stroke-width="3.5"/><rect x="${x - 3}" y="372" width="32" height="14" rx="5" fill="${ink}"/></g>`;
  // sitting: a thigh resting on the column, then the shin hanging down to a hoof
  const sitLeg = x => `<rect x="${x}" y="330" width="30" height="40" rx="12" fill="${fur}" stroke="${ink}" stroke-width="3.5"/><rect x="${x + 2}" y="360" width="26" height="58" rx="10" fill="${fur}" stroke="${ink}" stroke-width="3.5"/><rect x="${x - 1}" y="412" width="32" height="14" rx="5" fill="${ink}"/>`;
  // a big sign, much wider than he is, so the note on it is very easy to read
  const sign = placard ? `<rect x="-44" y="190" width="328" height="206" rx="10" fill="#fff" stroke="${ink}" stroke-width="5"/>${placard.replace('<svg ', '<svg x="-36" y="196" width="312" height="194" preserveAspectRatio="xMidYMid meet" ')}` : '';
  let arms, front = '';
  if (pose === 'cheer') arms = arm('52 228', '8 160', '-6 70') + arm('188 228', '232 160', '246 70') + fist(-6, 64) + fist(246, 64);
  else if (pose === 'sit') arms = arm('52 228', '34 288', '74 322') + arm('188 228', '206 288', '166 322') + fist(78, 324) + fist(162, 324);
  else if (pose === 'thumbs') {
    arms = arm('52 228', '-14 250', '-42 290');
    front = sign + fist(-44, 292) + arm('188 228', '250 196', '264 168')
      + `<g transform="translate(42 0) rotate(-10 222 150)"><rect x="211" y="118" width="12" height="26" rx="6" fill="${fur}" stroke="${ink}" stroke-width="3.5"/><rect x="208" y="136" width="32" height="30" rx="10" fill="${fur}" stroke="${ink}" stroke-width="3.5"/><path d="M226 143 h10 M226 151 h10 M226 159 h10" stroke="${ink}" stroke-width="2.5"/></g>`;
  } else {
    arms = arm('52 228', '-14 250', '-42 290') + arm('188 228', '254 250', '282 290');
    front = sign + fist(-44, 292) + fist(284, 292);
  }
  return `<svg class="beast-figure" viewBox="-60 0 360 436" role="img" aria-label="The Note Beast${placard ? ', holding up a note' : ''}">
  ${pose === 'sit'
    ? `${beastColumn()}${sitLeg(82)}${sitLeg(132)}`
    : pose === 'cheer'
    ? `<g transform="translate(0 -24)">${leg(80, -8)}${leg(134, 8)}</g>`
    : `<g class="legs legs-a">${leg(80, -16)}${leg(134, 16)}</g><g class="legs legs-b">${leg(80, 16)}${leg(134, -16)}</g>`}
  <g stroke="${ink}" stroke-width="3.5" stroke-linejoin="round">
    <path d="M40 232 C40 206 80 194 120 194 C160 194 200 206 200 232 L186 300 C182 322 160 336 120 336 C80 336 58 322 54 300 Z" fill="${fur}"/>
    <path d="M86 214 C96 236 144 236 154 214 C150 252 136 270 120 272 C104 270 90 252 86 214 Z" fill="${tan}"/>
    <path d="M60 316 L180 316 L186 352 L172 342 L161 356 L149 342 L137 356 L125 342 L113 356 L101 342 L89 356 L77 342 L66 356 L60 352 Z" fill="${dark}"/>
  </g>
  ${arms}
  <g transform="translate(20 0)">${beastHead(mood)}${opts.laurel ? beastLaurel() : ''}</g>
  ${front}
</svg>`;
}

/* Theseus, the hero from the old story, who comes into the labyrinth when the Challenge is lost (if a grown-up picks that ending).
   Tom asked for this: Theseus slays the Note Beast with a sword. It stays cartoonish: a swing, a clang, X eyes, no blood.
   He faces right, toward the Note Beast. The sword arm swings on CSS (.sword-arm), pivoting at the shoulder. */
function theseusSvg() {
  const ink = BEAST_INK, skin = '#f0c9a0', bronze = '#d4a640', red = '#c0392b';
  return `<svg class="theseus" viewBox="0 0 220 380" role="img" aria-label="Theseus, the hero, with a sword and shield">
  <g stroke="${ink}" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round">
    <g class="t-legs">
      <rect x="78" y="262" width="22" height="92" rx="9" fill="${skin}"/><rect x="118" y="262" width="22" height="92" rx="9" fill="${skin}"/>
      <path d="M78 330 H100 M78 342 H100 M118 330 H140 M118 342 H140" stroke="#7a4a24" stroke-width="4"/>
      <rect x="74" y="350" width="32" height="12" rx="5" fill="#7a4a24"/><rect x="114" y="350" width="32" height="12" rx="5" fill="#7a4a24"/>
    </g>
    <path d="M70 150 L150 150 L162 272 L58 272 Z" fill="#fbf8f0"/>
    <path d="M58 272 L162 272 L160 260 L60 260 Z" fill="${red}"/>
    <rect x="66" y="196" width="88" height="10" fill="#7a4a24"/>
    <path d="M150 150 L176 158" stroke="${skin}" stroke-width="0"/>
    <circle cx="110" cy="104" r="34" fill="${skin}"/>
    <circle cx="122" cy="102" r="4" fill="${ink}" stroke="none"/>
    <path d="M114 92 L130 96" stroke-width="4"/>
    <path d="M114 120 Q124 126 134 118" fill="none"/>
    <path d="M74 104 C70 60 150 56 146 100 L146 110 L132 106 L130 84 L92 84 L90 116 L76 120 Z" fill="${bronze}"/>
    <path d="M78 66 C86 22 138 18 150 60 C138 44 96 42 78 66 Z" fill="${red}"/>
    <path d="M86 52 L92 40 M100 44 L104 30 M116 42 L118 28 M132 46 L138 34" stroke="#8e2219" stroke-width="3"/>
  </g>
  <g class="shield" stroke="${ink}" stroke-width="3.5"><circle cx="78" cy="196" r="46" fill="${bronze}"/><circle cx="78" cy="196" r="34" fill="none" stroke="#a87f22" stroke-width="3"/><path d="M62 216 L78 174 L94 216" fill="none" stroke="${red}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/></g>
  <g class="sword-arm">
    <path d="M146 158 L146 214" stroke="${ink}" stroke-width="25" stroke-linecap="round"/><path d="M146 158 L146 214" stroke="${skin}" stroke-width="18" stroke-linecap="round"/>
    <g stroke="${ink}" stroke-width="3" stroke-linejoin="round"><rect x="132" y="216" width="28" height="9" rx="3" fill="${bronze}"/><path d="M140 225 L152 225 L150 300 L146 312 L142 300 Z" fill="#dfe6ea"/><circle cx="146" cy="214" r="10" fill="${skin}"/></g>
  </g>
</svg>`;
}

/* The Hydra: a friendly, many-headed party guest who comes to celebrate when the Challenge is won.
   Five heads on long necks, each in a party hat, all looking left toward the Note Beast. */
function hydraSvg(o = {}) {
  const ink = BEAST_INK, green = '#5fa35a', light = '#a8d69a', dark = '#3f7a3c';
  const hats = ['#e0517a', '#f3c94a', '#5aa0e0', '#9b6bd1', '#f08a3c'];
  const heads = [[60, 92], [104, 46], [158, 26], [212, 50], [252, 100]];
  const neck = ([x, y]) => { const d = `M160 300 C160 240 ${x + 20} ${y + 90} ${x + 6} ${y + 18}`; return `<path d="${d}" fill="none" stroke="${ink}" stroke-width="31" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${green}" stroke-width="24" stroke-linecap="round"/>`; };
  const head = ([x, y], i) => `<g class="hh hh${i}">
    <path d="M${x + 26} ${y + 6} C${x + 26} ${y - 22} ${x - 10} ${y - 24} ${x - 22} ${y - 4} L${x - 40} ${y + 6} C${x - 46} ${y + 16} ${x - 38} ${y + 26} ${x - 26} ${y + 24} L${x + 4} ${y + 30} C${x + 18} ${y + 30} ${x + 26} ${y + 20} ${x + 26} ${y + 6} Z" fill="${green}" stroke="${ink}" stroke-width="3.5" stroke-linejoin="round"/>
    <path d="M${x - 40} ${y + 14} Q${x - 22} ${y + 26} ${x - 4} ${y + 18}" fill="none" stroke="${ink}" stroke-width="3" stroke-linecap="round"/>
    <circle cx="${x - 36}" cy="${y + 4}" r="2.5" fill="${ink}"/>
    <circle cx="${x - 6}" cy="${y - 6}" r="9" fill="#fff" stroke="${ink}" stroke-width="3"/><circle cx="${x - 9}" cy="${y - 6}" r="4.5" fill="${ink}"/>
    <path d="M${x - 2} ${y - 18} L${x + 22} ${y - 66} L${x + 22} ${y - 10} Z" fill="${hats[i]}" stroke="${ink}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M${x + 6} ${y - 28} L${x + 22} ${y - 34} M${x + 12} ${y - 46} L${x + 22} ${y - 50}" stroke="#fff" stroke-width="4"/>
    <circle cx="${x + 22}" cy="${y - 68}" r="6" fill="#fff" stroke="${ink}" stroke-width="2.5"/>
  </g>`;
  return `<svg class="hydra" viewBox="0 -50 320 430" role="img" aria-label="The Hydra, with five heads in party hats">
  <path d="M250 330 C300 330 316 290 296 262 C288 280 270 296 240 300" fill="${green}" stroke="${ink}" stroke-width="3.5" stroke-linejoin="round"/>
  <rect x="104" y="318" width="30" height="46" rx="10" fill="${green}" stroke="${ink}" stroke-width="3.5"/><rect x="186" y="318" width="30" height="46" rx="10" fill="${green}" stroke="${ink}" stroke-width="3.5"/>
  ${heads.map(neck).join('')}
  <ellipse cx="160" cy="300" rx="96" ry="54" fill="${green}" stroke="${ink}" stroke-width="3.5"/>
  <ellipse cx="160" cy="312" rx="62" ry="32" fill="${light}" stroke="none"/>
  <path d="M90 280 l8 -10 M120 266 l8 -10 M200 266 l8 -10 M230 280 l8 -10" stroke="${dark}" stroke-width="4" stroke-linecap="round"/>
  ${heads.map(head).join('')}
</svg>`;
}
