/* =========================================================================
   render.js – Bildschirm, Pixel-Schrift, Dithering und Figuren-Sprites

   Koordinaten:
   - "Bildschirm" = Canvas-Pixel, 0..VIEW.W x 0..320
   - "Welt"       = Spielfeld, 0..180 x 0..320. Liegt bei VIEW.OX im Canvas
                    (Handy: OX = 0, PC: OX = 30)
   - Auf langen Handys ist die Canvas höher (VIEW.HC). Dann liegt der Bereich
     0..320 um VIEW.OY nach unten verschoben, darüber und darunter ist Platz
     für die Streifen mit Umgebung (art.js: ART.band) und die HUD-Leisten.
     baseT() stellt diese Grundverschiebung ein.
   ========================================================================= */

const C = document.getElementById('c');
const X = C.getContext('2d');
const SCREEN = document.getElementById('screen');
const SCAN = document.getElementById('scan');

const PLAY_W = CONFIG.PLAY_W;   // 180
const H = CONFIG.H;             // 320

// Aktuelles Format. W = Canvas-Breite, OX = Versatz des Spielfelds
const VIEW = { W: PLAY_W, OX: 0, OY: 0, HC: H, pc: false, scale: 1, ready: false };

/** Bildschirm-Koordinaten einstellen (0..320 liegt bei VIEW.OY) */
function baseT() { X.setTransform(1, 0, 0, 1, 0, VIEW.OY); }

// Andere Dateien können sich hier melden, um bei Formatwechsel Caches zu leeren
const viewListeners = [];
function onViewChange(fn) { viewListeners.push(fn); }

/**
 * Sicherer Bereich am Handy (Statusleiste/Notch oben, Home-Leiste unten) in CSS-Pixeln.
 * Das Spiel zeichnet bis an den Rand, legt aber keine Anzeigen unter Uhr oder Notch.
 */
const SAFE_PROBE = document.createElement('div');
SAFE_PROBE.style.cssText = 'position:fixed;left:0;top:0;width:0;visibility:hidden;pointer-events:none;' +
  'padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)';
document.body.appendChild(SAFE_PROBE);
/**
 * Höhe, die wir füllen. Vom Home-Bildschirm gestartet meldet iOS manchmal eine kleinere
 * innerHeight als der Bildschirm wirklich hat. Dann bliebe oben und unten ein leerer Rand.
 * In dem Fall nehmen wir die echte Bildschirmhöhe.
 */
function appHeight() {
  const touch = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);
  const app = navigator.standalone || (window.matchMedia && ['standalone', 'fullscreen', 'minimal-ui'].some(m => matchMedia('(display-mode: ' + m + ')').matches));
  if (!touch || !app || innerWidth > innerHeight) return innerHeight;
  const sh = Math.max(screen.width, screen.height);
  return sh > innerHeight && sh - innerHeight < 160 ? sh : innerHeight;
}
const WRAP = document.getElementById('wrap');
function safeInsets() {
  const cs = getComputedStyle(SAFE_PROBE);
  let top = parseFloat(cs.paddingTop) || 0, bottom = parseFloat(cs.paddingBottom) || 0;
  // Vom Home-Bildschirm gestartet (Statusleiste liegt über dem Spiel): Manche iPhones melden
  // den Abstand zu spät oder gar nicht. Dann lieber einen sicheren Mindestabstand nehmen.
  // Nicht auf "standalone" verlassen (iPhone meldet das bei display: fullscreen nicht).
  // Langes Touch-Handy, das den ganzen Bildschirm füllt: die unscharfe Statusleiste reicht
  // deutlich tiefer als der gemeldete Abstand -> oben großzügig Platz, unten nur knapp über der Home-Leiste.
  const touch = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);
  if (touch && appHeight() / innerWidth > 1.9) { top = Math.max(top, 59) + 36; bottom = Math.min(Math.max(bottom, 21), 34) * .45; }
  else if (top > 0) top += 8;
  return { top, bottom };
}

/** Erkennt das Format (Handy hochkant 180x320 oder PC 240x320) und skaliert. */
function fitView() {
  const IH = appHeight();
  WRAP.style.bottom = 'auto'; WRAP.style.height = IH + 'px';      // Fläche oben am Bildschirm, so hoch wie er ist
  const pc = innerWidth / IH >= CONFIG.PC_ASPECT;
  const W = pc ? CONFIG.PC_W : PLAY_W;
  // Handy (nur echte Touch-Geräte): Bildfläche so hoch wie der Bildschirm, damit oben und
  // unten nichts schwarz bleibt. Am PC (auch im schmalen Fenster) bleibt es bei 320 Pixeln.
  const touch = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);
  const OY = pc || !touch ? 0 : clamp(Math.floor((PLAY_W * IH / innerWidth - H) / 2), 0, CONFIG.MAX_BAND);
  const HC = H + OY * 2;
  const changed = !VIEW.ready || VIEW.W !== W || VIEW.OY !== OY;
  if (C.width !== W || C.height !== HC) { C.width = W; C.height = HC; }
  VIEW.W = W; VIEW.pc = pc; VIEW.OX = (W - PLAY_W) / 2; VIEW.OY = OY; VIEW.HC = HC; VIEW.ready = true;
  X.imageSmoothingEnabled = false;   // geht beim Ändern der Canvas-Größe verloren

  // Skalierung: Handy füllt den Bildschirm
  const dpr = window.devicePixelRatio || 1;
  const pad = pc ? Math.round(Math.max(12, IH * .03)) : 0;   // PC: kleiner Rand oben und unten
  let s = Math.min(innerWidth / W, (IH - pad * 2) / HC);
  // PC: pixelgenau in ganzen Gerätepixeln, aber nur wenn dabei kaum Platz verloren geht.
  // Sonst (z. B. Fenster knapp unter 960 px hoch) füllt das Spiel die Höhe trotzdem aus.
  if (pc) { const ds = Math.floor(s * dpr); if (ds >= 1 && ds / dpr >= s * .9) s = ds / dpr; }
  VIEW.scale = s;
  // Handy: wie viele Spielpixel oben/unten unter Statusleiste bzw. Home-Leiste liegen
  const si = pc ? { top: 0, bottom: 0 } : safeInsets();
  const sT = Math.min(OY + 12, Math.ceil(si.top / s)), sB = Math.min(OY, Math.ceil(si.bottom / s));   // oben darf die Leiste etwas ins Spielfeld ragen
  const insetsChanged = sT !== VIEW.safeT || sB !== VIEW.safeB;
  VIEW.safeT = sT; VIEW.safeB = sB;
  SCREEN.style.width = (W * s) + 'px';
  SCREEN.style.height = (HC * s) + 'px';

  // Scanlines: bei großer Skalierung eine Linie pro Spielpixel, sonst alle 3 CSS-px
  const per = Math.max(3, s), dark = Math.max(1, per / 3);
  SCAN.style.background =
    `repeating-linear-gradient(0deg,rgba(0,0,0,.22) 0 ${dark}px,transparent ${dark}px ${per}px)`;

  document.body.classList.toggle('pc', pc);
  if (changed || insetsChanged) viewListeners.forEach(fn => fn());
}
addEventListener('resize', fitView);
addEventListener('orientationchange', () => setTimeout(fitView, 200));
addEventListener('pageshow', fitView);
fitView();
// iOS kennt die Ränder (Statusleiste, Home-Leiste) oft erst kurz nach dem Start: nachmessen
for (const ms of [100, 400, 1200]) setTimeout(fitView, ms);

/* ---------- Kleine Helfer ---------- */
function rnd(a, b) { return a + Math.random() * (b - a); }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function pickOne(arr) { return arr[(Math.random() * arr.length) | 0]; }
/** Wählt einen Schlüssel aus {a: 7, b: 3} nach Gewicht (a in 70 % der Fälle). */
function pickWeighted(table) {
  let sum = 0;
  for (const k in table) sum += table[k];
  let r = Math.random() * sum;
  for (const k in table) { r -= table[k]; if (r < 0) return k; }
  return Object.keys(table)[0];
}
function inRect(p, r) { return p.x >= r.x && p.x < r.x + r.w && p.y >= r.y && p.y < r.y + r.h; }
/** Sekunden als m:ss */
function fmtTime(s) { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
/** Text in Zeilen mit höchstens max Zeichen umbrechen */
function wrapText(s, max) {
  const out = []; let line = '';
  for (const w of String(s).split(' ')) {
    if (line && (line + ' ' + w).length > max) { out.push(line); line = w; }
    else line = line ? line + ' ' + w : w;
  }
  if (line) out.push(line);
  return out;
}
/** Kurz vibrieren (wenn Gerät und Einstellung es erlauben) */
function buzz(ms) {
  try { if (Save.data.settings.vibrate && navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* egal */ }
  if (ms >= 60 && typeof sfx === 'function') sfx('thud');
}

/* ---------- Farben ---------- */
function hex(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
function lerpCol(a, b, t) { const A = hex(a), B = hex(b); return 'rgb(' + A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',') + ')'; }
/** Farbe der Wut-Leiste: grün, gelb, rot */
function angerColor(a) { return a > 85 ? '#ff3030' : a > 65 ? '#ff8a3a' : '#ffd84a'; }   // gelb -> orange -> rot

/* ---------- 3x5 Pixel-Schrift ----------
   Jedes Zeichen sind 15 Bits, zeilenweise von oben links. Neue Zeichen einfach ergänzen. */
const FONT = {
  A:'010101111101101',B:'110101110101110',C:'011100100100011',D:'110101101101110',E:'111100110100111',
  F:'111100110100100',G:'011100101101011',H:'101101111101101',I:'111010010010111',J:'001001001101010',
  K:'101101110101101',L:'100100100100111',M:'101111111101101',N:'110101101101101',O:'010101101101010',
  P:'110101110100100',Q:'010101101110011',R:'110101110101101',S:'011100010001110',T:'111010010010010',
  U:'101101101101111',V:'101101101101010',W:'101101111111101',X:'101101010101101',Y:'101101010010010',
  Z:'111001010100111','0':'111101101101111','1':'010110010010111','2':'110001010100111','3':'110001010001110',
  '4':'101101111001001','5':'111100110001110','6':'011100111101111','7':'111001010010010','8':'111101111101111',
  '9':'111101111001110',':':'000010000010000','!':'010010010000010','?':'110001010000010','.':'000000000000010',
  '-':'000000111000000',"'":'010010000000000','/':'001001010100100','%':'101001010100101','+':'000010111010000',
  '#':'101111101111101','@':'010101111100011','=':'000111000111000','<':'001010100010001','>':'100010001010100',
  '(':'010100100100010',')':'010001001001010',',':'000000000010100','*':'000101010101000','_':'000000000000111',
  '&':'010101010101011',
};
/** Breite eines Textes in Pixeln */
function textW(s, sc = 1) { return String(s).length * 4 * sc - sc; }
/** Text zeichnen. al: 'l' links, 'c' zentriert, 'r' rechtsbündig */
function txt(s, x, y, c, sc = 1, al = 'l') {
  s = String(s).toUpperCase();
  const w = textW(s, sc);
  if (al === 'c') x -= w >> 1; else if (al === 'r') x -= w;
  X.fillStyle = c;
  for (let i = 0; i < s.length; i++) {
    const g = FONT[s[i]];
    if (!g) continue;
    for (let p = 0; p < 15; p++) if (g[p] === '1')
      X.fillRect(Math.round(x + i * 4 * sc + (p % 3) * sc), Math.round(y + ((p / 3) | 0) * sc), sc, sc);
  }
}
/** Text mit schwarzem Schatten */
function txtS(s, x, y, c, sc = 1, al = 'l') { txt(s, x + sc, y + sc, '#000', sc, al); txt(s, x, y, c, sc, al); }

/* ---------- Kleine Symbole ---------- */
const STAR = ['00100', '01110', '11111', '01110', '01010'];
/** 5x5-Stern (mal sc). on = gelb, sonst grau */
function drawStar(x, y, on, sc = 1) {
  for (const [col, d] of [['#000', sc], [on ? '#ffd84a' : '#3a3a44', 0]]) {
    X.fillStyle = col;
    for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++)
      if (STAR[r][c] === '1') X.fillRect(x + c * sc + d, y + r * sc + d, sc, sc);
  }
}
/** Kleines Schloss (7x8) */
function drawLock(x, y, col = '#888') {
  X.fillStyle = col;
  X.fillRect(x + 1, y, 5, 1); X.fillRect(x + 1, y, 1, 4); X.fillRect(x + 5, y, 1, 4);
  X.fillRect(x, y + 3, 7, 5);
  X.fillStyle = '#000'; X.fillRect(x + 3, y + 5, 1, 2);
}
/** Plektrum (Währung), 5x6 */
function drawPick(x, y) {
  X.fillStyle = '#000'; X.fillRect(x, y + 1, 6, 4); X.fillRect(x + 1, y + 5, 4, 1); X.fillRect(x + 2, y + 6, 2, 1);
  X.fillStyle = '#ff8a3a'; X.fillRect(x, y, 5, 4); X.fillRect(x + 1, y + 4, 3, 1); X.fillRect(x + 2, y + 5, 1, 1);
  X.fillStyle = '#ffc080'; X.fillRect(x + 1, y + 1, 1, 1);
}
/** Kleiner Pfeil nach unten (Tutorial) */
function drawArrowDown(x, y, col = '#ffd84a') {
  X.fillStyle = '#000'; X.fillRect(x - 3, y - 1, 7, 3); X.fillRect(x - 2, y + 2, 5, 2); X.fillRect(x - 1, y + 4, 3, 2);
  X.fillStyle = col; X.fillRect(x - 2, y, 5, 1); X.fillRect(x - 1, y + 1, 3, 2); X.fillRect(x, y + 3, 1, 2);
}

/* ---------- PS1-Dithering ----------
   Dunkelt Pixel nach einem 4x4-Bayer-Muster ab. fn(x, y) liefert die Helligkeit
   0..1 (null = Pixel nicht anfassen). Wird nur beim Vorrendern benutzt. */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
function shadePass(g, w, h, fn) {
  const im = g.getImageData(0, 0, w, h), d = im.data;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const v = fn(x, y);
    if (v === null) continue;
    const i = (y * w + x) * 4;
    // Wände (alles außer Boden, siehe ART.FLOOR): glatt abdunkeln, ohne Punktmuster
    if (ART.floor && !ART.floor(x, y)) {
      const m = 1 - .35 * Math.max(0, Math.min(1, 1.2 - v));
      d[i] *= m; d[i + 1] *= m; d[i + 2] *= m * 1.04; continue;
    }
    // PS1-Dithering (Bayer 4x4), zwei Stufen: weiter innen ein feines helles Raster,
    // zum Dunklen hin das kräftige Muster (v = 1 hell, v = 0 dunkel)
    const b = (BAYER[(y & 3) * 4 + (x & 3)] + .5) / 16;
    // dezent: die Punkte dunkeln nur leicht ab
    if (v < b) { d[i] *= .76; d[i + 1] *= .76; d[i + 2] *= .8; }
    else if (v < b + .32) { d[i] *= .92; d[i + 1] *= .92; d[i + 2] *= .94; }
  }
  g.putImageData(im, 0, 0);
}
/** Standard-Licht für Schauplätze: oben hell, unten und an den Seiten dunkler */
function venueLight(g, top = .35, falloff = 200) {
  shadePass(g, PLAY_W, H, (x, y) => y < 26 || y >= 304 ? null : Math.min(1, top + (y - 26) / falloff));
  shadePass(g, PLAY_W, H, (x, y) => y < 26 || y >= 304 ? null : 1.15 - Math.abs(x - 90) / 110);
}
/** Neues Offscreen-Canvas */
function makeCanvas(w, h) { const o = document.createElement('canvas'); o.width = w; o.height = h; return o; }
/** Pseudozufall mit festem Startwert (damit vorgerenderte Muster immer gleich aussehen) */
function seeded(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

/* ---------- Schauplatz zeichnen ----------
   Setzt die Welt-Transformation (Spielfeld bei VIEW.OX, Wackeln, Screenshake,
   optional gespiegelt) und malt Hintergrund + Animation des Schauplatzes. */
function getVenueBG(ve) {
  if (!ve._bg) {
    if (ve.buildBackground) {
      ART.floor = ART.FLOOR[ve.id] || null;    // Punktmuster nur auf dem Boden
      try { ve._bg = ve.buildBackground(); } finally { ART.floor = null; }
    }
    else {
      ve._bg = makeCanvas(PLAY_W, H);
      const g = ve._bg.getContext('2d');
      g.fillStyle = ve.palette.floor || '#222'; g.fillRect(0, 0, PLAY_W, H);
    }
  }
  return ve._bg;
}
function drawVenue(ve, T, sx = 0, sy = 0, mirror = false) {
  const sway = ve.sway ? Math.round(Math.sin(T * 1.7)) : 0;
  if (mirror) X.setTransform(-1, 0, 0, 1, VIEW.OX + PLAY_W - sway - sx, sy + VIEW.OY);
  else X.setTransform(1, 0, 0, 1, VIEW.OX + sway + sx, sy + VIEW.OY);
  X.drawImage(getVenueBG(ve), 0, 0);
  if (ve.drawAnimated) ve.drawAnimated(T);
}

/* ---------- Brüder ----------
   b: {x, y, color, look, detail, hair, anger, drag, walk, st}. Füße stehen bei (x, y).
   look:   Kopf ('shades', 'buckethat', 'bald', 'cap', 'ponytail', 'comb')
   detail: Kleidung ('stripes', 'shirt', 'fur', 'chicken') */
function drawBro(b) {
  if (b.hidden) return;
  if (b.asleep) { drawSleeper(b); return; }
  const st = b.st || {};
  const x = Math.round(b.x), y = Math.round(b.y), an = b.anger / 100, dr = b.drag != null;
  const jx = b.anger >= 85 ? ((Math.random() * 3) | 0) - 1 : 0;   // Zittern kurz vorm Ausrasten
  X.save(); X.translate(jx, 0);
  X.fillStyle = 'rgba(0,0,0,.45)'; X.fillRect(x - 6, y - 1, 12, 3);           // Schatten
  const l = dr ? -4 : 0, st1 = Math.sin(b.walk * 6) > 0 ? 1 : 0;              // hochgehoben / Schritt
  const chicken = b.detail === 'chicken';
  X.fillStyle = chicken ? '#e0a020' : '#2a3a5a'; X.fillRect(x - 4, y - 6 + l, 3, 6 - st1); X.fillRect(x + 1, y - 6 + l, 3, 5 + st1);   // Beine
  X.fillStyle = '#111'; X.fillRect(x - 4, y - 1 + l - st1, 3, 1); X.fillRect(x + 1, y - 1 + l, 3, 1);           // Schuhe
  X.fillStyle = b.color; X.fillRect(x - 6, y - 15 + l, 12, 10);                                                // Jacke
  X.fillStyle = 'rgba(0,0,0,.3)'; X.fillRect(x - 6, y - 7 + l, 12, 2);
  if (b.detail === 'shirt') { X.fillStyle = '#eee'; X.fillRect(x - 1, y - 15 + l, 3, 5); X.fillStyle = '#b02020'; X.fillRect(x, y - 14 + l, 1, 4); }
  else if (b.detail === 'fur') { X.fillStyle = '#c8b890'; X.fillRect(x - 6, y - 16 + l, 12, 2); X.fillStyle = '#bbb'; X.fillRect(x, y - 14 + l, 1, 8); }
  else if (!chicken) { X.fillStyle = '#bbb'; X.fillRect(x, y - 15 + l, 1, 9); }                              // Reißverschluss
  X.fillStyle = chicken ? '#ddd' : lerpCol(b.color, '#000000', .35);                                         // Arme
  const ay = dr ? y - 24 + l : y - 14 + l, ah = dr ? 9 : 8;
  X.fillRect(x - 8, ay, 2, ah); X.fillRect(x + 6, ay, 2, ah);
  if (b.detail === 'stripes') { X.fillStyle = '#fff'; X.fillRect(x - 8, ay, 1, ah); X.fillRect(x + 7, ay, 1, ah); }
  // Gesicht, wird mit der Wut rot
  X.fillStyle = chicken ? '#eeeeee' : lerpCol('#e2b38f', '#e2463a', Math.max(0, (an - .4) / .6));
  X.fillRect(x - 4, y - 22 + l, 8, 7);
  drawHead(b, x, y + l);
  X.fillStyle = '#000';                  // Augenbrauen + Mund je nach Wut
  if (an > .45) { X.fillRect(x - 3, y - 21 + l, 1, 1); X.fillRect(x - 2, y - 20 + l, 1, 1); X.fillRect(x + 2, y - 21 + l, 1, 1); X.fillRect(x + 1, y - 20 + l, 1, 1); }
  else { X.fillRect(x - 3, y - 20 + l, 2, 1); X.fillRect(x + 1, y - 20 + l, 2, 1); }
  if (chicken) { X.fillStyle = '#f0a020'; X.fillRect(x - 1, y - 18 + l, 3, 2); }                               // Schnabel
  else if (an > .7) X.fillRect(x - 1, y - 17 + l, 3, 2); else X.fillRect(x - 1, y - 17 + l, 2, 1);

  // Zustände sichtbar machen
  if (st.deaf > 0) { X.fillStyle = '#111'; X.fillRect(x - 5, y - 24 + l, 10, 1); X.fillStyle = '#d33'; X.fillRect(x - 6, y - 21 + l, 2, 3); X.fillRect(x + 4, y - 21 + l, 2, 3); }
  if (st.phone > 0) { X.fillStyle = '#111'; X.fillRect(x + 4, y - 22 + l, 2, 5); X.fillStyle = '#4cf'; X.fillRect(x + 4, y - 21 + l, 1, 1); }
  if (st.mic > 0) { X.fillStyle = '#888'; X.fillRect(x + 8, y - 20 + l, 3, 3); X.fillStyle = '#222'; X.fillRect(x + 9, y - 17 + l, 1, 4); }
  if (st.eat > 0) { X.fillStyle = '#ddd'; X.fillRect(x + 6, y - 13 + l, 4, 4); X.fillStyle = '#f0c040'; X.fillRect(x + 6, y - 14 + l, 4, 1); }
  if (st.stuck > 0) { X.fillStyle = '#c8c8b0'; X.fillRect(x - 6, y - 2, 13, 2); X.fillRect(x - 5, y - 4, 2, 5); X.fillRect(x + 3, y - 4, 2, 5); }
  if (st.stun > 0) { for (let k = 0; k < 3; k++) { const a = b.walk * 3 + performance.now() / 150 + k * 2.1; X.fillStyle = '#ffd84a'; X.fillRect(Math.round(x + Math.cos(a) * 7), Math.round(y - 28 + l + Math.sin(a) * 2), 1, 1); } }
  if (st.admire > 0) { X.fillStyle = '#9fd8ff'; X.fillRect(x - 9, y - 30 + l, 1, 1); X.fillRect(x + 9, y - 29 + l, 1, 1); }

  // Griff-Leiste: wie lange kann man ihn noch festhalten?
  const gt = CONFIG.RULES.gripTime;
  if (dr || b.grip > .05) {
    const left = Math.max(0, 1 - (b.grip || 0) / gt);
    X.fillStyle = '#000'; X.fillRect(x - 6, y - 35 + l, 12, 3);
    X.fillStyle = left < .35 && (performance.now() / 80 | 0) % 2 ? '#ff5a4a' : '#9fd8ff';
    X.fillRect(x - 5, y - 34 + l, Math.max(1, Math.round(10 * left)), 1);
  }
  if (b.grabCd > 0) { X.fillStyle = '#ff5a4a'; X.fillRect(x - 3, y - 36 + l, 1, 1); X.fillRect(x + 3, y - 36 + l, 1, 1); X.fillRect(x - 2, y - 35 + l, 5, 1); }
  X.fillStyle = '#000'; X.fillRect(x - 6, y - 31 + l, 12, 3);                                                 // Mini-Wutleiste
  X.fillStyle = angerColor(b.anger); X.fillRect(x - 5, y - 30 + l, Math.max(1, Math.round(10 * an)), 1);
  X.restore();
}

/** Kopf und Haare je nach "look". (x, y) = Fußpunkt */
function drawHead(b, x, y) {
  const hair = b.hair || '#3a2412';
  switch (b.look) {
    case 'buckethat':
      X.fillStyle = '#d9d1b6'; X.fillRect(x - 6, y - 23, 12, 2); X.fillRect(x - 4, y - 26, 8, 3);
      X.fillStyle = '#000'; X.fillRect(x - 2, y - 19, 1, 1); X.fillRect(x + 1, y - 19, 1, 1); break;
    case 'bald':
      X.fillStyle = '#999'; X.fillRect(x - 5, y - 22, 1, 3); X.fillRect(x + 4, y - 22, 1, 3);
      X.fillStyle = '#000'; X.fillRect(x - 3, y - 19, 2, 1); X.fillRect(x + 1, y - 19, 2, 1); X.fillRect(x - 1, y - 19, 2, 1); break;
    case 'cap':
      X.fillStyle = '#c03030'; X.fillRect(x - 5, y - 25, 10, 3); X.fillRect(x - 5, y - 23, 12, 1);
      X.fillStyle = '#000'; X.fillRect(x - 2, y - 19, 1, 1); X.fillRect(x + 1, y - 19, 1, 1); break;
    case 'ponytail':
      X.fillStyle = hair; X.fillRect(x - 5, y - 25, 10, 3); X.fillRect(x - 5, y - 22, 1, 5); X.fillRect(x + 4, y - 22, 1, 5); X.fillRect(x + 5, y - 22, 2, 6);
      X.fillStyle = '#000'; X.fillRect(x - 2, y - 19, 1, 1); X.fillRect(x + 1, y - 19, 1, 1); break;
    case 'comb':   // Hühnerkostüm
      X.fillStyle = '#d02020'; X.fillRect(x - 2, y - 26, 2, 4); X.fillRect(x, y - 25, 2, 3);
      X.fillStyle = '#000'; X.fillRect(x - 2, y - 20, 1, 1); X.fillRect(x + 1, y - 20, 1, 1); break;
    default:       // 'shades': Haare + Sonnenbrille
      X.fillStyle = hair; X.fillRect(x - 5, y - 25, 10, 3); X.fillRect(x - 5, y - 22, 1, 3); X.fillRect(x + 4, y - 22, 1, 3);
      X.fillStyle = '#000'; X.fillRect(x - 3, y - 19, 6, 2);
  }
}

/** Schlafender Bruder (liegt quer, Zzz steigen auf) */
function drawSleeper(b) {
  const x = Math.round(b.x), y = Math.round(b.y);
  X.fillStyle = b.color; X.fillRect(x - 6, y - 8, 12, 6);
  X.fillStyle = '#e2b38f'; X.fillRect(x - 12, y - 9, 6, 7);
  X.fillStyle = b.hair || '#3a2412'; X.fillRect(x - 13, y - 9, 2, 7);
  const t = performance.now() / 600;
  txt('Z', x - 8 + Math.round(Math.sin(t) * 2), y - 16 - Math.round((t * 6) % 8), '#9fd8ff');
}

/** Einfache kleine Figur (Fans, Tamburin-Mann, Manager...). (x, y) = Füße */
function drawPerson(x, y, body, opt = {}) {
  x = Math.round(x); y = Math.round(y);
  const st = opt.walk ? (Math.sin(opt.walk * 6) > 0 ? 1 : 0) : 0;
  X.fillStyle = 'rgba(0,0,0,.4)'; X.fillRect(x - 5, y - 1, 10, 2);
  X.fillStyle = opt.legs || '#222'; X.fillRect(x - 3, y - 5, 2, 5 - st); X.fillRect(x + 1, y - 5, 2, 4 + st);
  X.fillStyle = body; X.fillRect(x - 5, y - 13, 10, 8);
  X.fillStyle = opt.skin || '#e2b38f'; X.fillRect(x - 3, y - 19, 6, 6);
  X.fillStyle = opt.hair || '#3a2412'; X.fillRect(x - 3, y - 20, 6, 2);
  if (opt.scarf) { X.fillStyle = opt.scarf; X.fillRect(x - 5, y - 13, 10, 2); }
  X.fillStyle = '#000'; X.fillRect(x - 2, y - 17, 1, 1); X.fillRect(x + 1, y - 17, 1, 1);
}

/* ---------- Gegenstände ----------
   Das Aussehen steht in ITEMS[typ].draw (data/items.js). */
function drawItem(it) {
  const def = ITEMS[it.type];
  const bob = def.kind === 'hazard' || it.held ? 0 : Math.sin(it.t * 4);
  const x = Math.round(it.x), y = Math.round(it.y + bob);
  if (def.kind !== 'hazard') { X.fillStyle = 'rgba(0,0,0,.4)'; X.fillRect(x - 3, Math.round(it.y), 7, 2); }
  def.draw(x, y, it);
  if (it.t % .8 < .4 && def.kind !== 'hazard') {   // blinkender Punkt: weiß = wegtippen, grün = hinziehen, gelb = sammeln
    X.fillStyle = def.kind === 'bad' ? '#fff' : def.kind === 'good' ? '#7cfc6a' : '#ffd84a';
    X.fillRect(x, y - def.height - 2, 1, 2);
  }
}

/* ---------- Sprechblasen ---------- */
function drawBubble(bu) {
  const b = bu.b, s = bu.t, w = s.length * 4 + 3;
  if (b.hidden) return;
  const x = Math.round(clamp(b.x - w / 2, 1, PLAY_W - w - 1)), y = Math.round(b.y - 44 - (1.3 - bu.life) * 6);
  X.fillStyle = '#000'; X.fillRect(x - 1, y - 1, w + 2, 10);
  X.fillStyle = bu.c; X.fillRect(x, y, w, 8); X.fillRect(Math.round(clamp(b.x, 2, PLAY_W - 2)) - 1, y + 8, 2, 2);
  txt(s, x + 2, y + 2, '#000');
}

/* ---------- Comic-Wörter statt Sound ("SLAM", "BONK") ---------- */
function drawComic(c) {
  const sc = c.life > c.max - .08 ? 3 : 2;   // kurzes "Aufploppen"
  const w = textW(c.text, sc);
  const x = Math.round(clamp(c.x, w / 2 + 2, PLAY_W - w / 2 - 2)), y = Math.round(c.y - (c.max - c.life) * 14);
  txt(c.text, x + 1, y + 1, '#000', sc, 'c'); txt(c.text, x - 1, y, '#000', sc, 'c');
  txt(c.text, x, y, c.c, sc, 'c');
}
