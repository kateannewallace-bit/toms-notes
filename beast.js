/* The Note Beast: a friendly, hairy minotaur who reacts to answers. 'happy' for a right answer, 'worried' for a wrong one. */
function beastSvg(mood) {
  const happy = mood === 'happy';
  const ink = '#2a1a10', fur = '#8a5a3b', dark = '#5b3922', tan = '#e2bf96', horn = '#f1e6c8';
  const brows = happy
    ? `<path d="M66 80 Q79 70 92 79" /><path d="M134 80 Q121 70 108 79" />`
    : `<path d="M66 86 L92 76" /><path d="M134 86 L108 76" />`;
  const eyes = happy
    ? `<circle cx="80" cy="100" r="12" fill="#fff"/><circle cx="120" cy="100" r="12" fill="#fff"/><circle cx="81" cy="101" r="6" fill="${ink}"/><circle cx="119" cy="101" r="6" fill="${ink}"/><circle cx="83" cy="98" r="2.2" fill="#fff" stroke="none"/><circle cx="121" cy="98" r="2.2" fill="#fff" stroke="none"/>`
    : `<circle cx="80" cy="101" r="11" fill="#fff"/><circle cx="120" cy="101" r="11" fill="#fff"/><circle cx="82" cy="98" r="5.5" fill="${ink}"/><circle cx="118" cy="98" r="5.5" fill="${ink}"/>`;
  const mouth = happy
    ? `<path d="M82 154 Q100 180 118 154 Z" fill="#7a2c2c"/><path d="M90 163 Q100 172 110 163 Q100 168 90 163 Z" fill="#e88a8a" stroke="none"/>`
    : `<path d="M86 167 Q100 156 114 167" fill="none"/>`;
  const extra = happy
    ? `<circle cx="61" cy="126" r="8" fill="#f0a49a" opacity=".75" stroke="none"/><circle cx="139" cy="126" r="8" fill="#f0a49a" opacity=".75" stroke="none"/>`
    : `<path d="M151 70 Q156 80 151 85 Q146 80 151 70 Z" fill="#9fcbe9" stroke-width="2"/>`;
  return `<svg class="beast-art" viewBox="0 0 200 210" role="img" aria-label="The Note Beast ${happy ? 'looks delighted' : 'looks concerned'}">
  <g stroke="${ink}" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round">
    <path d="M24 210 L32 184 L42 192 L50 170 L62 184 L74 166 L86 180 L100 164 L114 180 L126 166 L138 184 L150 170 L158 192 L168 184 L176 210 Z" fill="${dark}"/>
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
  </g>
</svg>`;
}
