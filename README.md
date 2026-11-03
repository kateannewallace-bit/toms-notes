# Tom's Note Hunt

A chalkboard PWA that teaches reading music, built from the Tom's Chalkboard template. The current focus is notes on ledger lines; the rest of the path covers the treble and bass staff, finding notes on the piano, rhythm, bars, sharps and flats, music signs and listening, with songs to play.

- `content.js`: topics, levels, chapter stories, songs, cheers, away-from-screen ideas. Add content here.
- `music.js`: theory (pitches, where a note sits), staff and piano drawing, Web Audio piano.
- `app.js`: rounds, problems, spaced review (1/3/7/14/30 days), levels, screens, sync.
- `glyphs.js`: clef, rest and accidental outlines from Noto Music (SIL Open Font License).
- `tools/make_icon.py`: draws the icons.

Bump `VERSION` in `sw.js` on every change. Sync uses the Chalkboard's Supabase functions with the `toms-notes:` prefix.
