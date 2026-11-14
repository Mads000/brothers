/* =========================================================================
   audio.js – 8-Bit-Sound und Musik, komplett im Browser erzeugt (keine Dateien)

   sfx('calm')        kurzer Effekt (Namen siehe SFX unten)
   Music.set('bus')   Musik-Schleife für einen Schauplatz ('menu' = Titelmusik, null = Stille)

   Ein- und ausschalten in EXTRAS (Save.data.settings.sound / .music).
   Browser erlauben Ton erst nach dem ersten Tippen: audioUnlock() wird von input.js
   bei jeder Berührung aufgerufen.
   ========================================================================= */

let AC = null, MASTER = null, SFXBUS = null, MUSBUS = null;

function audioInit() {
  if (AC) return AC;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  try {
    AC = new Ctx();
    MASTER = AC.createGain(); MASTER.gain.value = .5; MASTER.connect(AC.destination);
    SFXBUS = AC.createGain(); SFXBUS.gain.value = .55; SFXBUS.connect(MASTER);
    MUSBUS = AC.createGain(); MUSBUS.gain.value = .22; MUSBUS.connect(MASTER);
  } catch (e) { AC = null; }
  return AC;
}
function audioUnlock() {
  if (!audioInit()) return;
  if (AC.state === 'suspended') AC.resume().catch(() => {});
}
function soundOn() { return typeof Save === 'undefined' || !Save.data || !Save.data.settings || Save.data.settings.sound !== false; }
function musicOn() { return typeof Save === 'undefined' || !Save.data || !Save.data.settings || Save.data.settings.music !== false; }

/** Ein Ton: Wellenform, Frequenz (Start -> Ende), Dauer, Lautstärke, Startzeit */
function tone(type, f0, f1, dur, vol, at, bus) {
  const t = at || AC.currentTime, o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t);
  if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  o.connect(g); g.connect(bus || SFXBUS); o.start(t); o.stop(t + dur + .02);
}
/** Rauschen (für Wegwerfen, Prügelei, Schlagzeug) */
let NOISE = null;
function noise(dur, vol, at, hp, bus) {
  if (!NOISE) {
    NOISE = AC.createBuffer(1, AC.sampleRate * .5, AC.sampleRate);
    const d = NOISE.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const t = at || AC.currentTime, s = AC.createBufferSource(), g = AC.createGain(), f = AC.createBiquadFilter();
  s.buffer = NOISE; f.type = 'highpass'; f.frequency.value = hp || 800;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(bus || SFXBUS); s.start(t); s.stop(t + dur + .02);
}

const SFX = {
  click() { tone('square', 660, 660, .04, .12); },
  calm() { tone('triangle', 520, 880, .12, .25); },
  bin() { noise(.12, .22, 0, 1500); tone('square', 300, 120, .1, .08); },
  serve() { const t = AC.currentTime; tone('square', 660, 660, .07, .12, t); tone('square', 990, 990, .1, .12, t + .07); },
  spike() { tone('sawtooth', 140, 90, .18, .14); },
  warn() { const t = AC.currentTime; tone('square', 880, 880, .05, .1, t); tone('square', 880, 880, .05, .1, t + .1); },
  fight() { noise(.5, .3, 0, 400); tone('sawtooth', 200, 60, .45, .15); },
  thud() { tone('sine', 120, 50, .2, .4); noise(.08, .15, 0, 300); },
  win() { const t = AC.currentTime; [523, 659, 784, 1047].forEach((f, i) => tone('square', f, f, .14, .14, t + i * .1)); },
  lose() { const t = AC.currentTime; [392, 330, 262, 196].forEach((f, i) => tone('triangle', f, f * .97, .2, .2, t + i * .14)); },
  star() { tone('triangle', 1320, 1760, .15, .2); },
  splash() { noise(.3, .25, 0, 600); tone('sine', 400, 150, .2, .12); },
  baa() { tone('sawtooth', 320, 300, .25, .08); tone('sawtooth', 324, 280, .25, .06); },
  croak() { tone('square', 110, 90, .12, .14); },
  bell() { const t = AC.currentTime; tone('triangle', 1200, 1180, .5, .2, t); tone('triangle', 1200, 1180, .4, .15, t + .25); },
  boom() { noise(.4, .3, 0, 200); tone('sine', 90, 40, .4, .35); },
  camera() { noise(.06, .2, 0, 2000); },
};
let _sfxLast = {};
function sfx(name) {
  if (!AC || AC.state !== 'running' || !soundOn() || !SFX[name]) return;
  const now = AC.currentTime;
  if (_sfxLast[name] && now - _sfxLast[name] < .05) return;   // nicht 20x im selben Moment
  _sfxLast[name] = now;
  try { SFX[name](); } catch (e) { /* egal */ }
}

/* ---------- Musik: kleine Schleifen pro Schauplatz (Bass, Melodie, Schlagzeug) ----------
   Noten als Halbtöne über der Grundnote, '.' = Pause. 16 Schritte pro Takt. */
const TUNES = {   // ein Zeichen = ein 16tel: 0-9, a=10, b=11, c=12 ... (Halbtöne über der Grundnote), '.' = Pause
  menu:      { bpm: 104, root: 45, bass: '0.0.7.0.5.5.3.5.', lead: 'c..f..h.f.c..a.c...............', drum: 'k.h.s.h.k.h.s.hh' },
  bus:       { bpm: 118, root: 43, bass: '0.0.0.0.5.5.7.7.', lead: 'c.c.e.f...e.c.a.c...............', drum: 'k.hhs.h.k.hhs.hh' },
  rehearsal: { bpm: 96,  root: 40, bass: '0...7...5...3...', lead: '7..a..c.....a.7..5.7............', drum: 'k...s...k.k.s...' },
  pub:       { bpm: 126, root: 45, bass: '0.7.0.7.5.0.5.0.', lead: 'c.e.f.e.c.a.c.....a.c...........', drum: 'k.h.s.hkk.h.s.h.' },
  backstage: { bpm: 112, root: 42, bass: '0.0.3.0.0.5.3.0.', lead: 'f...e...c.a.c...................', drum: 'k.hhs.hhk.hhs.hh' },
  festival:  { bpm: 132, root: 40, bass: '0.0.0.0.3.3.5.5.', lead: 'c.f.h.j.h.f.c.f.h...............', drum: 'k.h.s.h.k.k.s.hh' },
  hotel:     { bpm: 88,  root: 44, bass: '0...5...3...7...', lead: 'c.....a.....7.....8..7..........', drum: 'k...h...s...h...' },
  flat:      { bpm: 92,  root: 47, bass: '0...4...5...7...', lead: '7.9.b.c...b.9.7.....4.7.........', drum: 'k...h.h.s...h.h.' },
};
const Music = {
  cur: null, step: 0, next: 0, timer: null,
  set(id) {
    if (!musicOn()) id = null;
    if (id === this.cur) return;
    this.cur = id; this.step = 0;
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    if (!id || !TUNES[id] || !AC) return;
    this.next = AC.currentTime + .1;
    this.timer = setInterval(() => this.tick(), 50);
  },
  tick() {
    if (!AC || AC.state !== 'running') return;
    const T = TUNES[this.cur]; if (!T) return;
    const sp = 60 / T.bpm / 4;                       // Dauer eines 16tels
    if (this.next < AC.currentTime - .1) this.next = AC.currentTime + .05;   // nach Pause nicht alles nachholen
    while (this.next < AC.currentTime + .2) {
      const i = this.step, t = this.next, f = n => 440 * Math.pow(2, (T.root + n - 57) / 12);
      const b = T.bass[i % T.bass.length], l = T.lead[i % T.lead.length], d = T.drum[i % T.drum.length];
      if (b !== '.') tone('triangle', f(parseInt(b, 36) - 12), 0, sp * 1.8, .35, t, MUSBUS);
      if (l !== '.') tone('square', f(parseInt(l, 36)), 0, sp * 1.5, .1, t, MUSBUS);
      if (d === 'k') tone('sine', 110, 45, .12, .5, t, MUSBUS);
      else if (d === 's') noise(.1, .18, t, 1200, MUSBUS);
      else if (d === 'h') noise(.03, .06, t, 6000, MUSBUS);
      this.next += sp; this.step++;
    }
  },
};
