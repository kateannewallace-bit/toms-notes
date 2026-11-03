/* Music theory, drawing (staff and piano as chalk SVG) and sound (a small Web Audio piano). No app state in here. */

/* ---------- pitches ---------- */
// A pitch is a string like 'C4', 'F#4' or 'Bb3'. C4 is Middle C.
const LETTERS = 'CDEFGAB';
const SEMIS = [0, 2, 4, 5, 7, 9, 11];
const parseP = p => { const m = /^([A-G])([#b]?)(\d)$/.exec(p); return { letter: m[1], acc: m[2], oct: +m[3] }; };
const stepOf = p => { const { letter, oct } = parseP(p); return oct * 7 + LETTERS.indexOf(letter); };
const midiOf = p => { const { letter, acc, oct } = parseP(p); return 12 * (oct + 1) + SEMIS[LETTERS.indexOf(letter)] + (acc === '#' ? 1 : acc === 'b' ? -1 : 0); };
const letterOf = step => LETTERS[((step % 7) + 7) % 7];
const pitchOf = step => letterOf(step) + Math.floor(step / 7);
const BLACK_NAME = { 1: 'C♯ or D♭', 3: 'D♯ or E♭', 6: 'F♯ or G♭', 8: 'G♯ or A♭', 10: 'A♯ or B♭' };
const isBlack = midi => !!BLACK_NAME[midi % 12];
const keyName = midi => isBlack(midi) ? BLACK_NAME[midi % 12] : LETTERS[SEMIS.indexOf(midi % 12)];
const whiteMidi = step => 12 * (Math.floor(step / 7) + 1) + SEMIS[((step % 7) + 7) % 7];
const MIDDLE_C = 60;
const withA = l => `${'AEF'.includes(l) ? 'an' : 'a'} ${l}`;
const prettyName = p => { const { letter, acc } = parseP(p); return letter + (acc === '#' ? ' sharp' : acc === 'b' ? ' flat' : ''); };
const prettySym = p => { const { letter, acc } = parseP(p); return letter + (acc === '#' ? '♯' : acc === 'b' ? '♭' : ''); };

/* ---------- where a note sits ---------- */
const CLEF = {
  t: { name: 'treble', bottom: stepOf('E4'), marks: [['E4', 'the bottom line, E'], ['G4', 'the G line, where the clef curls'], ['F5', 'the top line, F']] },
  b: { name: 'bass', bottom: stepOf('G2'), marks: [['G2', 'the bottom line, G'], ['F3', 'the F line, between the clef’s two dots'], ['A3', 'the top line, A']] },
};
const topOf = c => CLEF[c].bottom + 8;
const regionOf = (c, s) => s > topOf(c) ? 'above' : s < CLEF[c].bottom ? 'below' : 'on';
const ledgersFor = (c, s) => s > topOf(c) ? Math.floor((s - topOf(c)) / 2) : s < CLEF[c].bottom ? Math.floor((CLEF[c].bottom - s) / 2) : 0;
const onLine = (c, s) => (s - CLEF[c].bottom) % 2 === 0;
const ORD = ['', 'first', 'second', 'third', 'fourth', 'fifth'];
// A plain sentence ending: "on the second ledger line above the staff".
function describe(c, s) {
  const reg = regionOf(c, s), bottom = CLEF[c].bottom, top = topOf(c);
  if (reg === 'on') {
    const from = s - bottom;
    if (from % 2 === 0) return s === top ? 'on the top line of the staff' : s === bottom ? 'on the bottom line of the staff' : `on line ${from / 2 + 1} of the staff, counting up`;
    return `in space ${(from + 1) / 2} of the staff, counting up`;
  }
  const d = Math.abs(s - (reg === 'above' ? top : bottom)), word = reg === 'above' ? 'above' : 'below';
  if (d % 2 === 0) return `on the ${ORD[d / 2]} ledger line ${word} the staff`;
  if (d === 1) return reg === 'above' ? 'just above the top line, no ledger line needed' : 'just below the bottom line, no ledger line needed';
  return `${reg === 'above' ? 'just above' : 'just under'} the ${ORD[(d - 1) / 2]} ledger line ${word} the staff`;
}
// The nearest landmark, and the walk of letters from it to this note.
function walkTo(c, s) {
  const marks = CLEF[c].marks.map(([p, words]) => ({ s: stepOf(p), words }));
  const mark = marks.reduce((a, b) => Math.abs(b.s - s) < Math.abs(a.s - s) ? b : a);
  const dir = s >= mark.s ? 1 : -1, steps = [];
  for (let x = mark.s; ; x += dir) { steps.push(x); if (x === s) break; }
  return { mark, steps, dir };
}
function walkWords(c, s) {
  const { mark, steps, dir } = walkTo(c, s);
  if (steps.length === 1) return `This is ${mark.words}.`;
  return `Start on ${mark.words}. Go ${dir > 0 ? 'up' : 'down'}: ${steps.slice(1).map(letterOf).join(', ')}.`;
}

// The same walk as a hint: it stops short of naming the note.
function hintWords(c, s) {
  const { mark, steps, dir } = walkTo(c, s);
  if (steps.length === 1) return `Look where it sits: ${describe(c, s)}. Try again.`;
  const between = steps.slice(1, -1).map(letterOf);
  return `Start on ${mark.words}. Go ${dir > 0 ? 'up' : 'down'}: ${[...between, '?'].join(', ')}`;
}

/* ---------- drawing the staff ---------- */
const BEATS = { w: 4, 'h.': 3, h: 2, 'q.': 1.5, q: 1, e: 0.5 };
const glyph = (name, x, yBase, S, cls = '', flip = false) => {
  const k = S / 250;
  return `<path class="gl ${cls}" transform="translate(${x.toFixed(1)} ${yBase.toFixed(1)}) scale(${k.toFixed(4)} ${(flip ? k : -k).toFixed(4)})" d="${GLYPHS[name].d}"/>`;
};
// Draws one note: head, ledger lines, stem, flag, dot, and an accidental in front. Returns the svg and where the stem ends, for beaming.
function drawNote(c, x, s, d, S, Y, o = {}) {
  const y = Y(s), cls = o.cls || '', top = topOf(c), bottom = CLEF[c].bottom, mid = bottom + 4;
  let out = '';
  const lw = S * 1.05;
  for (let a = top + 2; a <= s; a += 2) out += `<line class="st-ledger" x1="${x - lw}" x2="${x + lw}" y1="${Y(a)}" y2="${Y(a)}"/>`;
  for (let a = bottom - 2; a >= s; a -= 2) out += `<line class="st-ledger" x1="${x - lw}" x2="${x + lw}" y1="${Y(a)}" y2="${Y(a)}"/>`;
  const base = (d || 'q').replace('.', '');
  if (base === 'w') out += `<ellipse class="n-open ${cls}" cx="${x}" cy="${y}" rx="${S * .68}" ry="${S * .4}" stroke-width="${S * .2}"/>`;
  else if (base === 'h') out += `<ellipse class="n-open ${cls}" cx="${x}" cy="${y}" rx="${S * .58}" ry="${S * .38}" stroke-width="${S * .16}" transform="rotate(-20 ${x} ${y})"/>`;
  else out += `<ellipse class="n-head ${cls}" cx="${x}" cy="${y}" rx="${S * .66}" ry="${S * .46}" transform="rotate(-20 ${x} ${y})"/>`;
  if (o.acc) out += glyph(o.acc === '#' ? 'sharp' : o.acc === 'b' ? 'flat' : 'natural', x - S * 2, y + S * .53, S, cls);  // the font centers these half a space above its baseline
  let stem = null;
  if (base !== 'w' && !o.noStem) {
    const up = o.up ?? s < mid;
    const sx = up ? x + S * .6 : x - S * .6;
    let end = up ? y - S * 3.4 : y + S * 3.4;
    if (up ? end > Y(mid) : end < Y(mid)) end = Y(mid);  // notes far from the staff keep their stems reaching its middle line
    if (o.stemTo != null) end = o.stemTo;
    out += `<line class="n-stem ${cls}" x1="${sx}" x2="${sx}" y1="${y}" y2="${end}" stroke-width="${S * .13}"/>`;
    stem = { x: sx, end, up };
    if (base === 'e' && !o.beamed) out += glyph('flag', sx - S * .06, up ? end + (1009 / 250) * S : end - (1009 / 250) * S, S, cls, !up);
  }
  if (d && d.endsWith('.')) out += `<circle class="n-head ${cls}" cx="${x + S * 1.05}" cy="${(s - bottom) % 2 === 0 ? y - S / 2 : y}" r="${S * .17}"/>`;
  return { svg: out, stem };
}
function drawRest(d, x, S, Y, c, cls = '') {
  const bottom = CLEF[c].bottom, midY = Y(bottom + 4), line4 = Y(bottom + 6);
  if (d === 'w') return `<rect class="n-head ${cls}" x="${x - S * .6}" y="${line4}" width="${S * 1.2}" height="${S * .5}"/>`;
  if (d === 'h') return `<rect class="n-head ${cls}" x="${x - S * .6}" y="${midY - S * .5}" width="${S * 1.2}" height="${S * .5}"/>`;
  if (d === 'q') return glyph('qrest', x - S * .7, Y(bottom) - S * -0.0, S, cls);
  return glyph('erest', x - S * .7, Y(bottom), S, cls);
}
// staff({ clef, items, S, width, time, lo, hi, live, walk, extra })
// items: { p, d, cls, acc } a note · { r: 'q' } a rest · { bar: 1 } a bar line · { gap: 'q' } a dashed box for a missing note
// Items spread out across the width by length. lo/hi force room for that range of steps.
function staffSvg(o) {
  const c = o.clef || 't', S = o.S || 14, top = topOf(c), bottom = CLEF[c].bottom;
  const notes = (o.items || []).filter(i => i.p);
  const steps = notes.map(i => stepOf(i.p)).concat(o.lo ?? [], o.hi ?? []);
  const maxS = Math.max(top + (c === 't' ? 3 : 0), ...steps), minS = Math.min(bottom - (c === 't' ? 4 : 0), ...steps);
  const yTop = (maxS - top) / 2 * S + S * 2.2, staffH = S * 4, h = yTop + staffH + (bottom - minS) / 2 * S + S * 2.2;
  const Y = s => yTop + (top - s) * S / 2;
  const w = o.width || 300;
  const clefW = o.noClef ? S : S * 3.4;
  const timeW = o.time ? S * 2.4 : 0;
  let out = '';
  for (let i = 0; i < 5; i++) out += `<line class="st-line" x1="4" x2="${w - 4}" y1="${yTop + i * S}" y2="${yTop + i * S}"/>`;
  if (!o.noClef) out += c === 't' ? glyph('treble', 8, Y(bottom), S, 'clef') : glyph('bass', 8, Y(bottom), S, 'clef');
  if (o.time) out += `<text class="timesig" x="${clefW + S}" y="${yTop + S * 1.86}" font-size="${S * 2.3}">${o.time[0]}</text><text class="timesig" x="${clefW + S}" y="${yTop + S * 3.86}" font-size="${S * 2.3}">${o.time[1]}</text>`;
  const items = o.items || [], x0 = clefW + timeW + S * 1.2, room = w - x0 - S * 1.4;
  const weight = i => i.bar ? .35 : Math.max(.85, Math.sqrt(BEATS[i.d || i.r || i.gap || 'q'] || 1));
  const total = items.reduce((t, i) => t + weight(i), 0) || 1;
  let x = x0;
  const placed = items.map(i => { const a = weight(i) / total * room, at = o.noteX && items.length === 1 ? o.noteX : x + (i.bar ? a : Math.min(a / 2, S * 1.6)); x += a; return at; });
  // eighth notes beam in pairs
  const pairs = new Map();
  for (let i = 0; i < items.length - 1; i++) {
    if (items[i].p && items[i].d === 'e' && items[i + 1].p && items[i + 1].d === 'e' && !pairs.has(i)) { pairs.set(i, i + 1); pairs.set(i + 1, -1); i++; }
  }
  items.forEach((it, i) => {
    const at = placed[i];
    if (it.bar) {
      if (it.bar === 'end') out += `<line class="st-bar" x1="${at - 5}" x2="${at - 5}" y1="${yTop}" y2="${yTop + staffH}"/><rect class="n-head" x="${at - 1}" y="${yTop}" width="4" height="${staffH}"/>`;
      else out += `<line class="st-bar" x1="${at}" x2="${at}" y1="${yTop}" y2="${yTop + staffH}"/>`;
    } else if (it.r) out += drawRest(it.r, at, S, Y, c, it.cls);
    else if (it.gap) out += `<rect class="gap-box" x="${at - S * 1.1}" y="${yTop + S * .3}" width="${S * 2.2}" height="${staffH - S * .6}" rx="5"/>`;
    else if (pairs.has(i) && pairs.get(i) > 0) {
      const j = pairs.get(i), si = stepOf(it.p), sj = stepOf(items[j].p), mid = bottom + 4;
      const up = (si + sj) / 2 < mid;
      const end = up ? Math.min(Y(si), Y(sj)) - S * 3.2 : Math.max(Y(si), Y(sj)) + S * 3.2;
      const a = drawNote(c, at, si, 'e', S, Y, { cls: it.cls, up, stemTo: end, beamed: true, acc: it.acc });
      const b = drawNote(c, placed[j], sj, 'e', S, Y, { cls: items[j].cls, up, stemTo: end, beamed: true, acc: items[j].acc });
      out += a.svg + b.svg + `<rect class="n-head" x="${Math.min(a.stem.x, b.stem.x) - S * .07}" y="${up ? end : end - S * .45}" width="${Math.abs(b.stem.x - a.stem.x) + S * .14}" height="${S * .45}"/>`;
    } else if (!pairs.has(i)) out += drawNote(c, at, stepOf(it.p), it.d, S, Y, { cls: it.cls, acc: it.acc, noStem: it.noStem }).svg;
  });
  // the walk: letters climbing from the landmark to the note; hint mode hides the last one
  if (o.walk) {
    const { steps, hide } = o.walk, tx = placed[0], gap = Math.min(S * 1.9, (tx - clefW - S * .6) / Math.max(1, steps.length - 1));
    steps.slice(0, -1).forEach((s, i) => {
      const lx = tx - (steps.length - 1 - i) * gap;
      out += `<text class="walk ${i === 0 ? 'mark' : ''}" x="${lx}" y="${Y(s) + S * .42}" font-size="${S * 1.15}">${letterOf(s)}</text>`;
    });
    if (hide) out += `<text class="walk q" x="${tx + S * 1.5}" y="${Y(steps[steps.length - 1]) + S * .42}" font-size="${S * 1.2}">?</text>`;
    else out += `<text class="walk final" x="${tx + S * 1.5}" y="${Y(steps[steps.length - 1]) + S * .42}" font-size="${S * 1.2}">${letterOf(steps[steps.length - 1])}</text>`;
  }
  if (o.extra) out += o.extra({ Y, S, x: placed, w, yTop, staffH });
  const live = o.live ? ` data-live="1" data-c="${c}" data-lo="${o.lo}" data-hi="${o.hi}" data-ytop="${yTop}" data-s="${S}"` : '';
  return `<svg class="staff ${o.cl || ''}" viewBox="0 0 ${w} ${Math.ceil(h)}"${live} role="img" aria-label="${o.label || 'Music staff'}">${out}${o.live ? `<g id="placed">${o.placed || ''}</g><rect class="live-hit" x="0" y="0" width="${w}" height="${Math.ceil(h)}"/>` : ''}</svg>`;
}
// The note being placed on a live staff (the head only, with its ledger lines).
function placedNote(c, s, x, S, yTop, cls = 'placing') {
  const Y = v => yTop + (topOf(c) - v) * S / 2;
  return drawNote(c, x, s, 'q', S, Y, { cls, noStem: true }).svg;
}
const liveStepAt = (svg, clientY) => {
  const pt = svg.createSVGPoint(); pt.x = 0; pt.y = clientY;
  const y = pt.matrixTransform(svg.getScreenCTM().inverse()).y;
  const c = svg.dataset.c, S = +svg.dataset.s, yTop = +svg.dataset.ytop;
  const s = topOf(c) - Math.round((y - yTop) / (S / 2));
  return Math.max(+svg.dataset.lo, Math.min(+svg.dataset.hi, s));
};

/* ---------- the piano ---------- */
// from: a white-key step; whites: how many white keys show. marks: { midi: class }; star shows Middle C; letters: 'c' labels every C, 'all' labels every white key.
function pianoSvg(o) {
  const whites = o.whites || 11, W = 36, H = 158, BW = 22, BH = 98, marks = o.marks || {};
  let w = '', b = '';
  for (let i = 0; i < whites; i++) {
    const s = o.from + i, m = whiteMidi(s), x = i * W + 1, letter = letterOf(s);
    w += `<rect class="pk-w ${marks[m] || ''}" data-midi="${m}" x="${x}" y="1" width="${W - 2}" height="${H}" rx="4"/>`;
    const label = o.letters === 'all' || (o.letters === 'c' && letter === 'C') || marks[m] === 'ok';
    if (label && !o.noLabels) w += `<text class="pk-l ${letter === 'C' ? 'c' : ''}" x="${x + W / 2 - 1}" y="${H - 10}">${letter}</text>`;
    if (m === MIDDLE_C && o.star !== false) w += `<path class="pk-star" d="${starPath(x + W / 2 - 1, H - 42, 9)}"/>`;
    if (i < whites - 1 && isBlack(m + 1)) b += `<rect class="pk-b ${marks[m + 1] || ''}" data-midi="${m + 1}" x="${x + W - 1 - BW / 2}" y="1" width="${BW}" height="${BH}" rx="3"/>`;
  }
  return `<svg class="piano ${o.cl || ''}" viewBox="0 0 ${whites * W + 2} ${H + 3}" role="group" aria-label="Piano keys">${w}${b}</svg>`;
}
function starPath(cx, cy, r) {
  let d = '';
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r * .42 : r; d += `${i ? 'L' : 'M'}${(cx + q * Math.cos(a)).toFixed(1)} ${(cy + q * Math.sin(a)).toFixed(1)}`; }
  return d + 'Z';
}
// The first white key of a window holding this note. The note sits 5th to 7th of the 11 keys, so its letter shows only once:
// reading the letter is enough to find it, with exactly one right key.
function pianoWindow(step, r = Math.random) { return step - (4 + Math.floor(r() * 3)); }

/* ---------- sound: a small plucked-string piano ---------- */
let actx = null, masterGain = null, liveNodes = [];
function audioReady() {
  if (!actx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    actx = new AC();
    masterGain = actx.createGain(); masterGain.gain.value = 0.7; masterGain.connect(actx.destination);
  }
  if (actx.state === 'suspended') actx.resume();
  return actx;
}
function tone(midi, when = 0, dur = 0.9, vol = 0.6) {
  const a = audioReady();
  if (!a) return;
  const t0 = a.currentTime + when + 0.01, f = 440 * Math.pow(2, (midi - 69) / 12);
  const env = a.createGain(), lp = a.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = Math.min(9000, f * 7 + 500);
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.exponentialRampToValueAtTime(vol, t0 + 0.008);
  env.gain.exponentialRampToValueAtTime(vol * .45, t0 + 0.18);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + Math.max(.2, dur) + 0.25);
  env.connect(lp); lp.connect(masterGain);
  // low notes lean on their upper partials, or small speakers can't sound them
  const low = midi < 48 ? 1.6 : 1;
  [[1, 1 / low], [2, .5 * low], [3, .22 * low], [4, .11 * low], [6, .04]].forEach(([n, g]) => {
    const os = a.createOscillator(), og = a.createGain();
    os.type = 'sine'; os.frequency.value = f * n * (1 + .0003 * n); og.gain.value = g * .5;
    os.connect(og); og.connect(env);
    os.start(t0); os.stop(t0 + Math.max(.2, dur) + 0.3);
    liveNodes.push(os);
  });
  if (liveNodes.length > 200) liveNodes = liveNodes.slice(-100);
}
function hush() { for (const n of liveNodes) { try { n.stop(); } catch (e) {} } liveNodes = []; clearSeqTimers(); }
let seqTimers = [];
const clearSeqTimers = () => { seqTimers.forEach(clearTimeout); seqTimers = []; };
// Plays [{ midi, beats, vol }]; rests have no midi. onNote(i) fires as each one sounds.
function playSeq(list, bpm = 96, onNote) {
  hush();
  const beat = 60 / bpm;
  let t = 0;
  list.forEach((n, i) => {
    if (n.midi != null) tone(n.midi, t, n.len ?? n.beats * beat * .92, n.vol ?? .6);
    if (onNote) seqTimers.push(setTimeout(() => onNote(i), t * 1000));
    t += n.beats * beat;
  });
  if (onNote) seqTimers.push(setTimeout(() => onNote(-1), t * 1000));
  return t;
}
const playP = (p, beats = 1.4) => playSeq([{ midi: midiOf(p), beats, len: beats }]);
