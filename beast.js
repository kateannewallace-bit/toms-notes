/* The Note Beast: a friendly, hairy minotaur. Faces: 'happy', 'worried', 'scowl' and 'dizzy'. */
const BEAST_INK = '#2a1a10', BEAST_FUR = '#8a5a3b', BEAST_DARK = '#5b3922', BEAST_TAN = '#e2bf96', BEAST_HORN = '#f1e6c8';
// His head, in a 200 × 210 box (no shoulders).
function beastHead(mood) {
  const ink = BEAST_INK, fur = BEAST_FUR, dark = BEAST_DARK, tan = BEAST_TAN, horn = BEAST_HORN;
  const brows = {
    happy: '<path d="M66 80 Q79 70 92 79" /><path d="M134 80 Q121 70 108 79" />',
    worried: '<path d="M66 86 L92 76" /><path d="M134 86 L108 76" />',
    scowl: '<path d="M64 76 L93 88" /><path d="M136 76 L107 88" />',
    dizzy: '<path d="M66 80 Q79 74 92 80" /><path d="M134 80 Q121 74 108 80" />',
  }[mood];
  const eyes = mood === 'happy'
    ? `<circle cx="80" cy="100" r="12" fill="#fff"/><circle cx="120" cy="100" r="12" fill="#fff"/><circle cx="81" cy="101" r="6" fill="${ink}"/><circle cx="119" cy="101" r="6" fill="${ink}"/><circle cx="83" cy="98" r="2.2" fill="#fff" stroke="none"/><circle cx="121" cy="98" r="2.2" fill="#fff" stroke="none"/>`
    : mood === 'dizzy'
    ? '<path d="M72 92 L88 108 M88 92 L72 108 M112 92 L128 108 M128 92 L112 108" fill="none" stroke-width="4"/>'
    : mood === 'scowl'
    ? `<circle cx="80" cy="102" r="10" fill="#fff"/><circle cx="120" cy="102" r="10" fill="#fff"/><circle cx="81" cy="104" r="5" fill="${ink}"/><circle cx="119" cy="104" r="5" fill="${ink}"/>`
    : `<circle cx="80" cy="101" r="11" fill="#fff"/><circle cx="120" cy="101" r="11" fill="#fff"/><circle cx="82" cy="98" r="5.5" fill="${ink}"/><circle cx="118" cy="98" r="5.5" fill="${ink}"/>`;
  const mouth = {
    happy: '<path d="M82 154 Q100 180 118 154 Z" fill="#7a2c2c"/><path d="M90 163 Q100 172 110 163 Q100 168 90 163 Z" fill="#e88a8a" stroke="none"/>',
    worried: '<path d="M86 167 Q100 156 114 167" fill="none"/>',
    scowl: '<path d="M82 170 Q100 152 118 170" fill="none" stroke-width="4.5"/>',
    dizzy: '<path d="M82 164 q9 -9 18 0 q9 9 18 0" fill="none"/>',
  }[mood];
  const extra = {
    happy: '<circle cx="61" cy="126" r="8" fill="#f0a49a" opacity=".75" stroke="none"/><circle cx="139" cy="126" r="8" fill="#f0a49a" opacity=".75" stroke="none"/>',
    worried: '<path d="M151 70 Q156 80 151 85 Q146 80 151 70 Z" fill="#9fcbe9" stroke-width="2"/>',
    scowl: '<path d="M30 40 q-8 -8 0 -16 q8 -8 0 -16 M170 40 q8 -8 0 -16 q-8 -8 0 -16" fill="none" stroke="#9aa3a8" stroke-width="3"/>',
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
// Head and shoulders, beside the answers.
function beastSvg(mood) {
  return `<svg class="beast-art" viewBox="0 0 200 210" role="img" aria-label="The Note Beast ${mood === 'happy' ? 'looks delighted' : 'looks concerned'}">
  <path d="M24 210 L32 184 L42 192 L50 170 L62 184 L74 166 L86 180 L100 164 L114 180 L126 166 L138 184 L150 170 L158 192 L168 184 L176 210 Z" fill="${BEAST_DARK}" stroke="${BEAST_INK}" stroke-width="3.5" stroke-linejoin="round"/>
  ${beastHead(mood)}
</svg>`;
}
// The whole Note Beast, for the Challenge: a broad, shaggy minotaur holding the placard in front of his chest.
// pose: 'hold' (both hands on the placard), 'thumbs' (one thumb up), 'heap' (collapsed, placard dropped).
// placard: the staff to show on it, as an <svg> string.
function beastFigure(mood, pose, placard = '') {
  const ink = BEAST_INK, fur = BEAST_FUR, dark = BEAST_DARK, tan = BEAST_TAN;
  const arm = (...pts) => { const d = 'M' + pts.join(' L'); return `<path d="${d}" fill="none" stroke="${ink}" stroke-width="27" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${fur}" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/>`; };
  const fist = (x, y) => `<circle cx="${x}" cy="${y}" r="13" fill="${fur}" stroke="${ink}" stroke-width="3.5"/>`;
  const leg = (x, angle) => `<g transform="translate(0 42) rotate(${angle} ${x + 13} 338)"><rect x="${x}" y="334" width="26" height="44" rx="10" fill="${fur}" stroke="${ink}" stroke-width="3.5"/><rect x="${x - 3}" y="372" width="32" height="14" rx="5" fill="${ink}"/></g>`;
  // a big sign, much wider than he is, so the note on it is very easy to read
  const sign = placard ? `<rect x="-44" y="190" width="328" height="206" rx="10" fill="#fff" stroke="${ink}" stroke-width="5"/>${placard.replace('<svg ', '<svg x="-36" y="196" width="312" height="194" preserveAspectRatio="xMidYMid meet" ')}` : '';
  let arms, front = '';
  if (pose === 'heap') arms = arm('52 228', '26 296', '22 326') + arm('188 228', '214 296', '218 326') + fist(22, 330) + fist(218, 330);
  else if (pose === 'thumbs') {
    arms = arm('52 228', '-14 250', '-42 290');
    front = sign + fist(-44, 292) + arm('188 228', '250 196', '264 168')
      + `<g transform="translate(42 0) rotate(-10 222 150)"><rect x="211" y="118" width="12" height="26" rx="6" fill="${fur}" stroke="${ink}" stroke-width="3.5"/><rect x="208" y="136" width="32" height="30" rx="10" fill="${fur}" stroke="${ink}" stroke-width="3.5"/><path d="M226 143 h10 M226 151 h10 M226 159 h10" stroke="${ink}" stroke-width="2.5"/></g>`;
  } else {
    arms = arm('52 228', '-14 250', '-42 290') + arm('188 228', '254 250', '282 290');
    front = sign + fist(-44, 292) + fist(284, 292);
  }
  return `<svg class="beast-figure" viewBox="-60 0 360 436" role="img" aria-label="The Note Beast${placard ? ', holding up a note' : ''}">
  <g class="legs legs-a">${leg(80, -16)}${leg(134, 16)}</g>
  <g class="legs legs-b">${leg(80, 16)}${leg(134, -16)}</g>
  <g stroke="${ink}" stroke-width="3.5" stroke-linejoin="round">
    <path d="M40 232 C40 206 80 194 120 194 C160 194 200 206 200 232 L186 300 C182 322 160 336 120 336 C80 336 58 322 54 300 Z" fill="${fur}"/>
    <path d="M86 214 C96 236 144 236 154 214 C150 252 136 270 120 272 C104 270 90 252 86 214 Z" fill="${tan}"/>
    <path d="M60 316 L180 316 L186 352 L172 342 L161 356 L149 342 L137 356 L125 342 L113 356 L101 342 L89 356 L77 342 L66 356 L60 352 Z" fill="${dark}"/>
  </g>
  ${arms}
  <g transform="translate(20 0)">${beastHead(mood)}</g>
  ${front}
</svg>`;
}
