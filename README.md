# Note Beast

A PWA that teaches reading music in black-on-white engraved notation, built from the Tom's Chalkboard template. Note reading starts at Middle C on both clefs and builds out one letter at a time, with hints that always count from a C. The other topics cover finding notes on the piano, rhythm, bars, sharps and flats, music signs and listening, with songs to play.

- `content.js`: topics, levels, lessons, songs, cheers, away-from-screen ideas. Add content here.
- `music.js`: theory (pitches, where a note sits), staff and piano drawing, Web Audio piano.
- `app.js`: rounds, problems, spaced review (1/3/7/14/30 days), levels, screens, sync.
- `glyphs.js`: clef, rest and accidental outlines and note heads from Noto Music (SIL Open Font License).
- `tools/make_icon.py`: draws the icons.

Bump `VERSION` in `sw.js` on every change. Sync uses the Chalkboard's Supabase functions with the `toms-notes:` prefix.

Piano sound: Salamander Grand Piano V3 by Alexander Holm (https://archive.org/details/SalamanderGrandPianoV3), CC BY 3.0, as the MP3 files published with Tone.js. A synthesized tone is the backup until they load.
