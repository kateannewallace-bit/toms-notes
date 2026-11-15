/* Songs written as real scores: a key signature, two voices, chords, ties, slurs, fermatas, courtesy accidentals and
   dynamics. Built for Katie's "Easy Beethoven 5" (2026-11-14), entered note for note from her handwritten page.

   A score song has s.score = { key, time, bars, perLine }. Each bar has v1 (and v2 for a second voice), as tokens:
     r8 / r4          an eighth or quarter rest
     G4/8  Eb5/2      a note: pitch / length (8 eighth, 4 quarter, 2 half). Pitches are as they sound (Eb, F#, B).
     C5+G4/2          a chord
     (b)Ab4/8         a courtesy flat in brackets, as on the page (only on the first note of a chord)
     ...^             fermata   ...~ tied to the next note   ...S slur to the end of the bar   ...!d / ...!u stem down / up
   and optional dyn: ['ff', beat] written under the staff.
   Playing it: each moment (the notes that start together) is one step; Tom plays every note of it, in any order. */

const SCORE_LEN = { 8: .5, 4: 1, 2: 2 };
const FERMATA_RING = 3.6, FERMATA_HOLD = 2.5;  // seconds a tapped fermata note rings; beats a fermata adds when the song plays

function parseScore(s) {
  const sc = s.score, flats = new Set(sc.key || []);
  const bars = sc.bars.map((b, bi) => {
    const voices = [b.v1, b.v2].filter(Boolean).map((str, vi) => {
      let beat = 0;
      return str.trim().split(/\s+/).map(tok => {
        const ev = { voice: vi, two: !!b.v2, beat, bar: bi };
        let t = tok;
        if (t.startsWith('r')) { ev.rest = true; ev.len = SCORE_LEN[t.slice(1)]; ev.dur = t.slice(1); beat += ev.len; return ev; }
        if (t.startsWith('(b)')) { ev.courtesy = 'b'; t = t.slice(3); }
        const m = /^([^/]+)\/(\d)([~^S!ud]*)$/.exec(t);
        ev.pitches = m[1].split('+'); ev.dur = m[2]; ev.len = SCORE_LEN[m[2]];
        ev.fermata = m[3].includes('^'); ev.tie = m[3].includes('~'); ev.slur = m[3].includes('S');
        ev.stem = m[3].includes('!d') ? 'd' : m[3].includes('!u') ? 'u' : null;
        beat += ev.len;
        return ev;
      });
    });
    return { voices, dyn: b.dyn || null };
  });
  // ties: the next note in the same voice is a held continuation, not a new key to press
  const all = bars.flatMap(b => b.voices.flat());
  bars.forEach((b, bi) => b.voices.forEach(v => v.forEach(ev => {
    if (!ev.tie) return;
    const next = bars[bi + 1]?.voices[ev.voice]?.find(x => !x.rest);
    if (next) next.tiedFrom = ev;
  })));
  // moments: everything that starts at the same time, in order
  const byTime = new Map();
  all.forEach(ev => {
    if (ev.rest || ev.tiedFrom) return;
    const t = ev.bar * 2 + ev.beat;
    if (!byTime.has(t)) byTime.set(t, []);
    byTime.get(t).push(ev);
  });
  const moments = [...byTime.keys()].sort((a, b) => a - b).map((t, i) => {
    const evs = byTime.get(t);
    evs.forEach(ev => { ev.moment = i; });
    return { t, evs, midis: evs.flatMap(ev => ev.pitches.map(midiOf)) };
  });
  return { bars, flats, moments, all };
}

// A pitch's accidental as written: nothing if the key signature already says it, otherwise ♭ ♯ or ♮.
function writtenAcc(p, flats) {
  const { letter, acc } = parseP(p), key = flats.has(letter) ? 'b' : '';
  return acc === key ? '' : acc === '#' ? 'sharp' : acc === 'b' ? 'flat' : 'natural';
}

function scoreLineSvg(sc, from, to, first, o) {
  const S = 11, W = 560, c = 't', top = topOf(c), bottom = CLEF[c].bottom, mid = bottom + 4;
  // room above and below for this line's stems, ledger notes, fermatas and dynamics
  let above = S * 3, below = S * 4.5;
  for (let bi = from; bi < to; bi++) o.bars[bi].voices.forEach((v, vi) => v.forEach(ev => {
    if (ev.rest) return;
    const steps = ev.pitches.map(stepOf), hiS = Math.max(...steps), loS = Math.min(...steps);
    const up = ev.stem ? ev.stem === 'u' : ev.two ? vi === 0 : steps.reduce((t, x) => t + x, 0) / steps.length < mid;
    above = Math.max(above, (hiS - top) / 2 * S + (up ? S * 3.6 : S * 1.2) + (ev.fermata ? S * 2.6 : 0));
    below = Math.max(below, (bottom - loS) / 2 * S + (up ? S * 1.4 : S * 3.8) + S * .6);
  }));
  if (o.bars.slice(from, to).some(b => b.dyn)) below = Math.max(below, S * 5.2);
  const yTop = above + S * 1.2, staffH = S * 4, H = yTop + staffH + below;
  const Y = s => yTop + (top - s) * S / 2;
  const ink = 'n-head';
  let out = '';
  for (let i = 0; i < 5; i++) out += `<line class="st-line" x1="4" x2="${W - 4}" y1="${yTop + i * S}" y2="${yTop + i * S}"/>`;
  out += glyph('treble', 8, Y(bottom), S, 'clef');
  // key signature: B♭ on the middle line, E♭ in the top space, A♭ in the second space
  const keyPos = { B: stepOf('B4'), E: stepOf('E5'), A: stepOf('A4'), D: stepOf('D5'), G: stepOf('G4'), C: stepOf('C5'), F: stepOf('F4') };
  let x = S * 3.6;
  (sc.key || []).forEach(L => { out += glyph('flat', x, Y(keyPos[L]) + S * .53, S, 'clef'); x += S * 1.05; });
  x += S * .6;
  if (first) {
    out += `<text class="timesig" x="${x + S}" y="${yTop + S * 1.86}" font-size="${S * 2.3}">${sc.time[0]}</text><text class="timesig" x="${x + S}" y="${yTop + S * 3.86}" font-size="${S * 2.3}">${sc.time[1]}</text>`;
    x += S * 2.6;
  }
  out += `<text class="bar-num" x="${S * 3.4}" y="${yTop - S * 1.6}" font-size="${S * 1.15}">${from + 1}</text>`;
  const x0 = x + S * .4, barW = (W - 6 - x0) / (to - from), pad = S * .9, slot = (barW - pad * 2) / 4;
  const heads = [];  // where each note head landed, for ties and slurs
  for (let bi = from; bi < to; bi++) {
    const bar = o.bars[bi], bx = x0 + (bi - from) * barW;
    const xAt = beat => bx + pad + (beat * 2 + .5) * slot;
    // beamed runs of eighths in each voice
    bar.voices.forEach((v, vi) => {
      const runs = []; let run = [];
      v.forEach(ev => { if (!ev.rest && ev.dur === '8') run.push(ev); else { if (run.length) runs.push(run); run = []; } });
      if (run.length) runs.push(run);
      runs.forEach(r => { if (r.length > 1) r.forEach(ev => { ev.beamRun = r; }); });
      v.forEach(ev => {
        const ex = xAt(ev.beat), two = ev.two;
        const cls = ev.moment == null ? (ev.tiedFrom?.moment != null ? o.cls(ev.tiedFrom.moment) : '') : o.cls(ev.moment);
        if (ev.rest) {
          const shift = two ? (vi === 0 ? -S * 1.2 : S * 1.6) : 0;
          out += `<g transform="translate(${two && vi === 1 ? -S * .6 : 0} ${shift})">${drawRest(ev.dur === '8' ? 'e' : 'q', ex, S, Y, c, '')}</g>`;
          return;
        }
        const steps = ev.pitches.map(stepOf), hi = Math.max(...steps), lo = Math.min(...steps);
        const up = ev.stem ? ev.stem === 'u' : two ? vi === 0 : (ev.beamRun ? ev.beamRun.flatMap(e => e.pitches.map(stepOf)) : steps).reduce((t, s) => t + s, 0) / (ev.beamRun ? ev.beamRun.reduce((t, e) => t + e.pitches.length, 0) : steps.length) < mid;
        ev.up = up;
        // ledger lines
        const lw = S * 1.05;
        for (let a = top + 2; a <= hi; a += 2) out += `<line class="st-ledger" x1="${ex - lw}" x2="${ex + lw}" y1="${Y(a)}" y2="${Y(a)}"/>`;
        for (let a = bottom - 2; a >= lo; a -= 2) out += `<line class="st-ledger" x1="${ex - lw}" x2="${ex + lw}" y1="${Y(a)}" y2="${Y(a)}"/>`;
        let g = '';
        ev.pitches.forEach((p, k) => {
          const s = steps[k];
          // the next note to play gets a soft blue glow, so a hollow half note in the lower voice is easy to spot
          if (cls === 'now') out += `<ellipse class="now-glow" cx="${ex}" cy="${Y(s)}" rx="${S * 1.45}" ry="${S * 1.05}"/>`;
          g += headGlyph(ev.dur === '2' ? 'hvoid' : 'hblack', ex, Y(s), S, `n-head ${cls}`);
          const acc = writtenAcc(p, o.flats);
          const show = acc || (k === 0 && ev.courtesy ? 'flat' : '');
          if (show) {
            const ay = Y(s) + S * .53, ax = ex - S * (k === 0 && ev.courtesy ? 2.15 : 2);
            if (k === 0 && ev.courtesy) out += `<text class="cour" x="${ax - S * .55}" y="${Y(s) + S * .45}" font-size="${S * 1.3}" text-anchor="middle">(</text><text class="cour" x="${ax + S * 1.25}" y="${Y(s) + S * .45}" font-size="${S * 1.3}" text-anchor="middle">)</text>`;
            out += glyph(show, ax, ay, S, cls);
          }
          if (o.letters) out += `<text class="song-l" x="${ex + S * 1.25}" y="${Y(s) + S * .4}" font-size="${S * .95}">${letterOf(s)}${parseP(p).acc === 'b' ? '♭' : parseP(p).acc === '#' ? '♯' : ''}</text>`;
          heads.push({ ev, p, x: ex, y: Y(s), up });
        });
        // stem: from the far head, 3.4 spaces long (or to the beam)
        if (ev.dur !== '1') {
          const sx = up ? ex + S * .55 : ex - S * .55, far = up ? Y(lo) : Y(hi), near = up ? Y(hi) : Y(lo);
          let end = up ? near - S * 3.3 : near + S * 3.3;
          if (ev.beamRun) {
            const rs = ev.beamRun.flatMap(e => e.pitches.map(stepOf));
            end = up ? Y(Math.max(...rs)) - S * 3.1 : Y(Math.min(...rs)) + S * 3.1;
          }
          g += `<line class="n-stem ${cls}" x1="${sx}" x2="${sx}" y1="${far}" y2="${end}" stroke-width="${S * .1}"/>`;
          ev.stemX = sx; ev.stemEnd = end;
          if (ev.dur === '8' && !ev.beamRun) g += glyph('flag', sx - S * .06, up ? end + (1009 / 250) * S : end - (1009 / 250) * S, S, cls, !up);
        }
        if (ev.fermata) {
          // the font draws the fermata upward from its baseline, its lowest point 648 units up
          const [fx0, fy0, fx1] = GLYPHS.fermata.b, k = S / 250;
          const bottomY = Math.min(yTop - S * .8, (up ? Y(hi) - S * 3.4 : Y(hi)) - S * .9);
          out += glyph('fermata', ex - (fx0 + fx1) / 2 * k, bottomY + fy0 * k, S, '');
        }
        out += `<g class="tap-note" data-play="${ev.pitches[0]}">${g}</g>`;
      });
      // beams, after the stems are known
      runs.filter(r => r.length > 1).forEach(r => {
        const a = r[0], b = r[r.length - 1], up = a.up, cls = o.cls(a.moment);
        out += `<rect class="n-head ${cls}" x="${Math.min(a.stemX, b.stemX) - S * .07}" y="${up ? a.stemEnd : a.stemEnd - S * .45}" width="${Math.abs(b.stemX - a.stemX) + S * .14}" height="${S * .45}"/>`;
      });
    });
    // slurs: from the note to the end of the bar, curving under it
    bar.voices.flat().filter(ev => ev.slur).forEach(ev => {
      const h = heads.find(q => q.ev === ev), x1 = bx + barW - S * .8, y = Math.max(h.y, Y(bottom)) + S * 1.6;
      out += `<path class="slur" d="M${h.x} ${h.y + S * .9} Q${(h.x + x1) / 2} ${y + S * 2.2} ${x1} ${y}"/>`;
    });
    if (bar.dyn) out += `<text class="dyn" x="${xAt(bar.dyn[1])}" y="${Y(bottom) + S * 4.4}" font-size="${S * 1.9}" text-anchor="middle">${bar.dyn[0]}</text>`;
    if (bi < o.bars.length - 1) out += `<line class="st-bar" x1="${bx + barW}" x2="${bx + barW}" y1="${yTop}" y2="${yTop + staffH}"/>`;
    else out += `<line class="st-bar" x1="${bx + barW - 5}" x2="${bx + barW - 5}" y1="${yTop}" y2="${yTop + staffH}"/><rect class="n-head" x="${bx + barW - 1}" y="${yTop}" width="4" height="${staffH}"/>`;
  }
  // ties: a curve from the note to its continuation (on this line, or off the end of it)
  heads.filter(h => h.ev.tie).forEach(h => {
    const to = heads.find(q => q.ev.tiedFrom === h.ev && q.p === h.p), x2 = to ? to.x : W - 6, dy = h.up ? S * .9 : -S * .9;
    out += `<path class="slur" d="M${h.x + S * .6} ${h.y + dy} Q${(h.x + x2) / 2} ${h.y + dy * 2.6} ${x2 - S * .6} ${h.y + dy}"/>`;
  });
  heads.filter(h => h.ev.tiedFrom && !heads.some(q => q.ev === h.ev.tiedFrom)).forEach(h => {
    const dy = h.up ? S * .9 : -S * .9;
    out += `<path class="slur" d="M${x0 - S} ${h.y + dy} Q${(x0 + h.x) / 2} ${h.y + dy * 2.6} ${h.x - S * .6} ${h.y + dy}"/>`;
  });
  return `<svg class="staff score" viewBox="0 0 ${W} ${H}" role="img" aria-label="Bars ${from + 1} to ${to}">${out}</svg>`;
}

function renderScoreSong() {
  const { s, score, i, letters, playing } = song, finished = i >= score.moments.length;
  const cur = playing >= 0 ? playing : i;
  const cls = m => m === cur && !finished ? 'now' : m < i ? 'played' : '';
  const per = s.score.perLine || 3;
  let lines = '';
  for (let b = 0; b < score.bars.length; b += per) lines += scoreLineSvg(s.score, b, Math.min(b + per, score.bars.length), b === 0, { bars: score.bars, flats: score.flats, cls, letters });
  const m = !finished && playing < 0 ? score.moments[i] : null;
  const marks = {};
  if (playing >= 0) score.moments[playing].midis.forEach(x => { marks[x] = 'ok'; });
  (song.hit || []).forEach(x => { marks[x] = 'ok'; });
  if (m && song.missHere >= 2) m.midis.filter(x => !(song.hit || []).includes(x)).forEach(x => { marks[x] = 'hl'; });
  const left = m ? m.midis.filter(x => !(song.hit || []).includes(x)).length : 0;
  return `<header class="top"><h1 class="song-title">${esc(s.name)}</h1><button class="ghost" data-act="home">Songs</button></header>
  <div class="row-btns song-ctrl"><button class="ghost" data-act="song-hear">${playing >= 0 ? '■ Stop' : '♪ Hear the song'}</button><button class="ghost" data-act="song-letters" aria-pressed="${letters}">${letters ? 'Hide letters' : 'Show letters'}</button><button class="ghost" data-act="song-restart">From the top</button></div>
  <div class="song-lines">${lines}</div>
  ${m && m.midis.length > 1 ? `<p class="note center">Play ${m.midis.length === 2 ? 'both' : `all ${m.midis.length}`} blue notes together${left < m.midis.length ? ` (${left} more)` : ''}.</p>` : ''}
  ${finished ? `<div class="feedback"><span class="big good">You played it!</span><span class="how">${song.misses ? `${song.misses} wrong key${song.misses > 1 ? 's' : ''} along the way. Try it again, or play it on your real piano.` : 'Not one wrong key. Now try it on your real piano.'}</span></div>` : ''}
  ${song.flash ? `<div class="feedback"><span class="try">${esc(song.flash)}</span></div>` : ''}
  ${!finished ? (hearing() ? listenPanel('Listening. Play each note on your piano.') : state.realPiano && !listenMode() ? `<div class="next-row"><button class="start" data-act="song-next">Next note</button></div>` : `<div class="song-keys">${pianoSvg({ from: song.from, whites: song.whites, letters: letters ? 'all' : 'c', marks })}</div>`) : `<div class="row-btns"><button class="start" data-act="song-restart">Play again</button><button class="ghost" data-act="home">Home</button></div>`}`;
}

// A key pressed: it counts if it's one of the notes of this moment; when they've all been played, on to the next.
function scoreTap(midi) {
  const m = song?.score?.moments[song.i];
  // a note under a fermata (or tied into one) rings out (Katie): a long, full sound instead of a short tap
  const rings = m && m.midis.includes(midi) && m.evs.some(ev => ev.fermata || (ev.tie && song.score.all.find(x => x.tiedFrom === ev)?.fermata));  // the whole chord under a fermata rings
  if (!hearing()) tone(midi, 0, rings ? FERMATA_RING : .9, rings ? .7 : .6);
  if (!song || song.playing >= 0 || song.i >= song.score.moments.length) return;
  song.hit = song.hit || [];
  // the right letter in any octave counts (Katie: any G will do), so a beginner is never stuck on the wrong G
  const match = m.midis.includes(midi) && !song.hit.includes(midi) ? midi : m.midis.find(x => x % 12 === midi % 12 && !song.hit.includes(x));
  if (match != null) {
    song.hit.push(match); song.flash = null;
    if (m.midis.every(x => song.hit.includes(x))) { song.hit = []; song.missHere = 0; song.i++; if (song.i >= song.score.moments.length) finishSong(); }
    return render();
  }
  if (song.hit.includes(midi)) return;
  if (m.midis.includes(midi)) return;  // already played that one
  // a wrong key: the song waits on this note so it can be found; after two wrong tries its key lights up
  song.misses++;
  song.missHere = (song.missHere || 0) + 1;
  const want = m.midis.find(x => !song.hit.includes(x));
  song.flash = null;  // nothing is said about a wrong key (Katie): just keep looking
  render(true);
}
// What to say after a wrong key, for any song: the right letter in the wrong place, the white key in a flat key, or just its name.
function songMissLine(midi, want, wantP) {
  const pressed = isBlack(midi) ? 'a black key' : keyName(midi);
  if (isBlack(want) && !isBlack(midi) && midi === want + 1) return `That’s ${pressed}. The key signature makes ${pressed} flat: try the black key just to the left.`;
  return `That’s ${pressed}. Look again!`;
}
function scoreNext() {
  const m = song.score.moments[song.i];
  const ring = m.evs.some(ev => ev.fermata || (ev.tie && song.score.all.find(x => x.tiedFrom === ev)?.fermata));
  m.midis.forEach(x => tone(x, 0, ring ? FERMATA_RING : 1, .55));
  song.i++; song.hit = []; song.missHere = 0;
  if (song.i >= song.score.moments.length) finishSong();
  render();
}
// Hear it: every note, with ties held and fermatas held longer; the blue cursor follows along.
function scoreHear() {
  if (song.playing >= 0) { hush(); clearSeqTimers(); song.playing = -1; render(); return; }
  hush();
  const beat = 60 / 100, sc = song.score;
  const startOf = ev => (ev.bar * 2 + ev.beat);
  // fermatas stretch time: each one adds a beat after it
  const holds = sc.all.filter(ev => ev.fermata).map(ev => ({ at: startOf(ev) + ev.len, add: FERMATA_HOLD }));
  const shift = t => holds.filter(h => h.at <= t + 1e-6).reduce((a, h) => a + h.add, 0);
  sc.all.forEach(ev => {
    if (ev.rest || ev.tiedFrom) return;
    const len = ev.len + (ev.tie ? sc.all.find(x => x.tiedFrom === ev)?.len || 0 : 0) + (ev.fermata || sc.moments[ev.moment]?.evs.some(x => x.fermata) ? FERMATA_HOLD : 0) + (ev.tie && sc.all.find(x => x.tiedFrom === ev)?.fermata ? FERMATA_HOLD : 0);
    const t = (startOf(ev) + shift(startOf(ev) - .001)) * beat;
    ev.pitches.forEach(p => tone(midiOf(p), t, len * beat * .95, .55));
  });
  song.playing = 0; render();
  sc.moments.forEach((m, k) => seqTimers.push(setTimeout(() => { if (screen !== 'song' || song.playing < 0) return; song.playing = k; render(); }, (m.t + shift(m.t - .001)) * beat * 1000)));
  const endT = (sc.bars.length * 2 + holds.length * FERMATA_HOLD) * beat * 1000 + 600;
  seqTimers.push(setTimeout(() => { if (screen === 'song') { song.playing = -1; render(); } }, endT));
}
