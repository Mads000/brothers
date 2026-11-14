/* =========================================================================
   game.js – Die eigentliche Spiellogik eines Levels

   Game.start(level, optionen) startet ein Level, Game.update(dt) rechnet ein
   Frame, Game.draw() zeichnet das Spielfeld. Menüs und HUD liegen in ui.js,
   Schauplatz-Regeln in mechanics.js.

   Zustände (Game.state):
     'intro'  Startkarte wird angezeigt, Tippen startet
     'play'   läuft
     'fight'  Prügelei-Animation, danach 'over'
     'over'   verloren (Game.reason sagt warum)
     'win'    geschafft
   Am Ende ruft das Spiel Game.onEnd(ergebnis) auf (wird in main.js gesetzt).
   ========================================================================= */

/** Erzeugt einen Bruder aus characters.js, mit dem gewählten Outfit */
function makeBro(charId, anger, start) {
  const ch = CHARACTERS[charId];
  const of = OUTFITS[Save.outfitOf(charId)] || OUTFITS.default;
  return {
    id: charId, ch, name: ch.name,
    color: of.color || ch.color, look: of.look || ch.look, detail: of.detail || null, hair: ch.hair,
    x: start.x, y: start.y, tx: start.x, ty: start.y,  // Position und Schlenderziel
    vx: 0, vy: 0,     // Rutschen (rutschiger Boden)
    anger,            // 0..100
    drag: null,       // pointerId, solange er gezogen wird
    retT: 0,          // Zeit bis zum nächsten Schlenderziel
    cd: 0,            // Abklingzeit fürs Beruhigen
    walk: 0,          // Laufanimation
    goal: null,       // erzwungenes Ziel (z. B. Fan am Fenster)
    hidden: false,    // im Aufzug unterwegs
    asleep: false,    // schläft (Hotel)
    ride: null,       // Aufzugsfahrt
    tripCd: 0,        // Abklingzeit fürs Stolpern über liegende Kabel
    grip: 0,          // wie lange er schon festgehalten wird (reißt sich bei CONFIG.RULES.gripTime los)
    grabCd: 0,        // nach dem Losreißen kurz nicht greifbar
    // Zustände in Sekunden: stolpert, isst, taub, hat Mikro, festgeklebt, telefoniert, bewundert sich
    st: { stun: 0, eat: 0, deaf: 0, mic: 0, stuck: 0, phone: 0, admire: 0 },
  };
}

const Game = {
  level: null, venue: null, state: 'idle', reason: null,
  pair: PAIRS.brothers, mode: 'tour',
  T: 0, el: 0, endT: 0, diff: 1, diffBase: 1,
  bros: [], items: [], bubbles: [], parts: [], comics: [],
  warnings: [], active: [], mods: [], sys: [], tempWalls: [],
  evTimers: [], itemT: 0, shake: 0, trash: [], bumpT: 5, fight: null, toast: null, manager: null,
  football: 0, slowT: 0, nearT: 0, nearCd: 0,
  phase: 'normal', stageT: 0, stageHold: 0,
  tut: null, slots: [], slotUsed: [false, false],
  stats: {},
  ptrs: new Map(),   // gedrückte Finger/Maus: pointerId -> { b | item, sx, sy, moved, t0, vx, vy }
  onEnd: null,

  /* ================= Start ================= */

  /**
   * opts: pair (Paar-ID), keepAnger ([a, b]), mods (Modifikatoren), diffBase,
   *       skipIntro, endless (true), loadout (Power-up-IDs), slotUsed
   */
  start(level, opts = {}) {
    this.level = level;
    this.venue = VENUES[level.venue];
    this.mode = opts.endless ? 'endless' : 'tour';
    this.pair = PAIRS[opts.pair || 'brothers'];
    const ids = level.bros || this.pair.bros;
    this.bros = ids.map((id, i) => makeBro(id, opts.keepAnger ? opts.keepAnger[i] : (level.startAnger ? level.startAnger[i] : 20), this.venue.starts[i]));
    this.items = []; this.bubbles = []; this.parts = []; this.comics = [];
    this.warnings = []; this.active = []; this.tempWalls = []; this.sys = [];
    this.mods = opts.mods ? [...opts.mods] : [];
    this.el = 0; this.endT = 0; this.diffBase = opts.diffBase || 1; this.diff = this.diffBase;
    this.shake = 0; this.fight = null; this.toast = null; this.manager = null; this.reason = null;
    this.trash = []; this.bumpT = 4 + Math.random() * 4;
    this.football = 0; this.slowT = 0; this.nearT = 0; this.nearCd = 0;
    this.phase = 'normal'; this.stageT = 0; this.stageHold = 0;
    this.stats = {
      binned: 0, beer: 0, served: 0, calms: 0, drags: 0, collected: 0, fans: 0, locks: 0, powerups: 0,
      maxAnger: Math.max(...this.bros.map(b => b.anger)), maxVolume: 0, minMood: 100, sleepTime: 0, calmTime: 0,
    };
    this.causes = [];
    this.ptrs.clear();

    // Schauplatz-Regel und Zusatzfiguren
    const mech = this.venue.mechanic;
    if (mech && MECHANICS[mech]) this.addSys(MECHANICS[mech], { ...(this.venue.mechDefaults || {}), ...(level.mech || {}) });
    for (const ex of level.extras || []) if (EXTRAS[ex]) this.addSys(EXTRAS[ex], level.mech || {});

    this.itemT = level.firstItem != null ? level.firstItem : 3;
    this.evTimers = Object.keys(level.events || {}).map(id => ({ id, every: level.events[id], t: rnd(level.events[id][0], level.events[id][1]) }));
    for (const type in level.prespawn || {}) for (let k = 0; k < level.prespawn[type]; k++) this.spawnItem(type);

    this.slots = opts.loadout || Save.data.loadout.slice(0, 2);
    this.slotUsed = opts.slotUsed || [false, false];

    this.tut = level.tutorial ? { i: -1, steps: level.tutorial } : null;
    this.state = opts.skipIntro ? 'play' : 'intro';
    if (this.state === 'play') this.begin();
  },

  /** Startkarte weg, los geht's */
  begin() {
    this.state = 'play';
    if (this.tut && this.tut.i < 0) this.nextTutStep();
  },

  addSys(def, params) { const e = { def, s: {} }; this.sys.push(e); if (def.setup) def.setup(this, e.s, params); },
  getSys(id) { return this.sys.find(e => e.def.id === id) || null; },
  /** Ruft einen Hook bei allen Regeln auf */
  sysCall(hook, ...args) { for (const e of this.sys) if (e.def[hook]) e.def[hook](this, e.s, ...args); },
  /** Erstes Ergebnis eines Hooks, das nicht null ist */
  sysFirst(hook, ...args) {
    for (const e of this.sys) if (e.def[hook]) { const r = e.def[hook](this, e.s, ...args); if (r) return r; }
    return null;
  },

  /* ================= Hilfsfunktionen (auch für Daten-Dateien) ================= */

  other(b) { return b === this.bros[0] ? this.bros[1] : this.bros[0]; },
  dist() { const [a, b] = this.bros; return Math.hypot(a.x - b.x, a.y - b.y); },
  say(b, text, col) { this.bubbles.push({ b, t: text, c: col || '#fff', life: 1.3 }); },
  toastMsg(text, col) { this.toast = { text, c: col || '#fff', life: 1.8 }; },
  /** Großes Comic-Wort (statt Sound) */
  comic(text, x, y, col) { this.comics.push({ text, x, y, c: col || '#ffd84a', life: .9, max: .9 }); },
  /** Produkt eines Werts aus allen aktiven Modifikatoren */
  mult(key) {
    let m = 1;
    for (const id of this.mods) { const v = MODIFIERS[id] && MODIFIERS[id][key]; if (typeof v === 'number') m *= v; }
    return m;
  },
  /** Sonderregel aktiv? (aus Modifikatoren oder laufenden Events) */
  hasFlag(f) {
    for (const id of this.mods) { const m = MODIFIERS[id]; if (m && m.flags && m.flags.includes(f)) return true; }
    for (const a of this.active) if (a.ev.flags && a.ev.flags.includes(f)) return true;
    return false;
  },
  /** Welt-x in Bildschirm-x (beachtet das Spiegeln) */
  sx(x) { return this.hasFlag('mirror') ? VIEW.OX + PLAY_W - x : VIEW.OX + x; },
  /** Wut ändern. Positive Werte werden mit Charakter und Modifikatoren verrechnet. */
  addAnger(b, n) {
    if (n > 0) n *= b.ch.angerRate * this.mult('angerRate') * (this.venue.angerMult || 1);
    b.anger = clamp(b.anger + n, 0, 100);
    if (this.level.safe) b.anger = Math.min(b.anger, 94);   // Sandbox ohne Prügeleien
    if (n >= 7) { this.shake = Math.max(this.shake, Math.min(3, n / 5)); sfx('spike'); if (n >= 10) buzz(30); }   // Wut-Spitze: Ruckeln, Ton, Vibrieren
  },
  calm(b) {
    const R = CONFIG.RULES;
    if (b.hidden) return;
    if (this.hasFlag('notap')) { this.say(b, 'NOPE', '#888'); return; }
    if (b.cd > 0) return;
    let m = R.calmAmount * b.ch.calmPower * this.mult('calmPower');
    for (const e of this.sys) if (e.def.calmBonus) m *= e.def.calmBonus(this, e.s);
    const fat = b.calmFat || 0;                      // ständiges Antippen nervt: wirkt schwächer
    m /= 1 + R.calmFatigue * fat;
    b.calmFat = fat + 1;
    b.anger = Math.max(0, b.anger - m);
    b.cd = R.calmCooldown;
    this.stats.calms++;
    this.burst(b.x, b.y - 18, 5, fat >= 2 ? '#888' : '#9fd8ff', 16);
    sfx('calm');
    if (fat >= 2) this.say(b, 'YEAH YEAH', '#aaa');
    else this.say(b, Math.random() < .03 ? 'THIS IS THE ONE' : 'EASY', '#9fd8ff');
  },
  /** Kleine Staubwölkchen an den Füßen */
  dust(x, y, n) {
    for (let k = 0; k < n; k++) this.parts.push({ x: x + rnd(-5, 5), y: y - 2 + rnd(-1, 1), vx: rnd(-10, 10), vy: rnd(-12, -4), life: rnd(.25, .45), c: 'rgba(200,190,170,.55)' });
  },
  burst(x, y, n, col, spread = 30) {
    for (let k = 0; k < n; k++) this.parts.push({ x, y, vx: rnd(-spread, spread), vy: rnd(-40, -10), life: .4, c: col });
  },
  releaseAll() {
    for (const r of this.ptrs.values()) if (r.item) r.item.held = false;
    this.ptrs.clear();
    for (const b of this.bros) b.drag = null;
  },
  /** Einen Bruder aus dem Finger rutschen lassen */
  dropBro(b) { if (b.drag != null) { this.ptrs.delete(b.drag); b.drag = null; } },
  /** Ist er beschäftigt (läuft nicht selbst)? */
  busy(b) {
    const s = b.st;
    return s.stun > 0 || s.eat > 0 || s.stuck > 0 || s.phone > 0 || s.admire > 0 || b.asleep || b.hidden;
  },

  /* ================= Kollision ================= */

  walls() {
    const w = (this.venue.walls || []).slice();
    for (const e of this.sys) if (e.def.walls) w.push(...e.def.walls(this, e.s));
    return w.concat(this.tempWalls);
  },
  obstacles() {
    const o = [];
    for (const e of this.sys) if (e.def.obstacles) o.push(...e.def.obstacles(this, e.s));
    return o;
  },
  inWall(x, y, pad = 4) { return this.walls().some(r => x > r.x - pad && x < r.x + r.w + pad && y > r.y - pad && y < r.y + r.h + pad); },
  /** Schiebt einen Punkt (Füße) aus Rechtecken heraus */
  pushOutRects(b, rects) {
    const R = CONFIG.RULES.broRadius;
    for (const r of rects) {
      const cx = clamp(b.x, r.x, r.x + r.w), cy = clamp(b.y, r.y, r.y + r.h);
      const dx = b.x - cx, dy = b.y - cy, d = Math.hypot(dx, dy);
      if (d >= R) continue;
      if (d > .001) { b.x += dx / d * (R - d); b.y += dy / d * (R - d); }
      else {   // Mittelpunkt steckt drin: zur nächsten Kante
        const l = b.x - r.x, rr = r.x + r.w - b.x, t = b.y - r.y, bt = r.y + r.h - b.y, m = Math.min(l, rr, t, bt);
        if (m === l) b.x = r.x - R; else if (m === rr) b.x = r.x + r.w + R; else if (m === t) b.y = r.y - R; else b.y = r.y + r.h + R;
      }
    }
  },
  pushOutCircles(b, circles) {
    for (const o of circles) {
      const dx = b.x - o.x, dy = b.y - o.y, d = Math.hypot(dx, dy), min = o.r + CONFIG.RULES.broRadius;
      if (d < min && d > .001) { b.x += dx / d * (min - d); b.y += dy / d * (min - d); }
    }
  },
  clampBounds(b) { const B = this.venue.bounds; b.x = clamp(b.x, B.x0, B.x1); b.y = clamp(b.y, B.y0, B.y1); },
  /** Bewegt in kleinen Schritten, damit niemand durch Wände rutscht */
  moveBroTo(b, nx, ny) {
    const W = this.walls();
    const dx = nx - b.x, dy = ny - b.y, n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 3));
    for (let i = 0; i < n; i++) { b.x += dx / n; b.y += dy / n; this.pushOutRects(b, W); }
    this.clampBounds(b);
  },
  pushBro(b, dx, dy) { this.moveBroTo(b, b.x + dx, b.y + dy); },
  /** Zufälliger freier Punkt im Spielfeld (optional auf derselben Etage wie y) */
  randomFreeSpot(nearY) {
    const B = this.venue.bounds, F = this.venue.floors;
    let y0 = B.y0, y1 = B.y1;
    if (F && nearY != null) { const f = F.find(f => nearY < f.y1 + 15) || F[F.length - 1]; y0 = f.y0; y1 = f.y1; }
    for (let k = 0; k < 20; k++) {
      const p = { x: rnd(B.x0 + 4, B.x1 - 4), y: rnd(y0 + 2, y1 - 2) };
      if (!this.inWall(p.x, p.y, 6)) return p;
    }
    return { x: (B.x0 + B.x1) / 2, y: (y0 + y1) / 2 };
  },

  /* ================= Gegenstände ================= */

  spawnItem(type) {
    const S = this.venue.spawn;
    let x, y, tries = 0;
    do { x = rnd(S.x0, S.x1); y = rnd(S.y0, S.y1); tries++; }
    while (tries < 15 && (this.inWall(x, y, 7) || this.bros.some(b => Math.hypot(b.x - x, b.y - y) < 22)));
    this.items.push({ type, x, y, t: 0 });
  },
  spawnItemAt(type, x, y) {
    const S = this.venue.spawn;
    this.items.push({ type, x: clamp(x, S.x0, S.x1), y: clamp(y, S.y0, S.y1), t: 0 });
  },
  applyItem(b, it) {
    const def = ITEMS[it.type];
    sfx(def.kind === 'bad' ? 'spike' : 'serve');
    if (def.kind === 'bad') this.noteCause(def.name);
    if (def.onPickup) { def.onPickup(this, b, it); return; }
    if (def.anger) this.addAnger(b, def.anger);
    if (def.word) this.say(b, def.word, def.wordColor);
  },
  binItem(i) {
    const it = this.items[i];
    this.items.splice(i, 1);
    this.stats.binned++;
    if (it.type === 'beer' || it.type === 'minibar') this.stats.beer++;
    this.burst(it.x, it.y - 4, 6, '#fff');
    this.trash.push({ x: it.x, y: it.y - 6, life: .8 });     // kleiner Mülleimer zeigt: weggeworfen
    sfx('bin');
  },
  collectItem(i) {
    const it = this.items[i];
    this.items.splice(i, 1);
    this.stats.collected++;
    this.comic('+1', it.x, it.y - 10, '#ffd84a');
    this.burst(it.x, it.y - 4, 8, '#ffd84a');
  },

  /* ================= Events, Modifikatoren, Power-ups ================= */

  queueEvent(id) {
    const ev = EVENTS[id];
    if (!ev) return;
    const ctx = {};
    if (ev.prepare) ev.prepare(this, ctx);
    if (ev.warn > 0) { this.warnings.push({ id, ev, ctx, t: ev.warn }); if (this.state === 'play') sfx('warn'); }
    else this.runEvent(id, ctx);
  },
  runEvent(id, ctx = {}) {
    const ev = EVENTS[id];
    this.noteCause(ev.name);
    ev.run(this, ctx);
    if (ev.duration && !ctx.end) this.active.push({ id, ev, ctx, t: ev.duration });
  },
  addModifier(id) {
    const m = MODIFIERS[id];
    if (!m) return;
    this.mods.push(id);
    if (m.start) m.start(this);
    this.toastMsg(m.name || id, '#ff8a3a');
  },
  usePowerUp(slot) {
    if (this.state !== 'play') return;
    const id = this.slots[slot], def = POWERUPS[id];
    if (!def) { this.toastMsg('EMPTY SLOT', '#888'); return; }
    if (this.slotUsed[slot]) { this.toastMsg('ALREADY USED', '#888'); return; }
    if (!this.level.sandbox) {   // im Soundcheck kosten Power-ups nichts
      if (Save.powerupCount(id) <= 0) { this.toastMsg('NONE LEFT. VISIT THE SHOP', '#888'); return; }
      Save.usePowerup(id);
    }
    this.slotUsed[slot] = true;
    this.stats.powerups++;
    def.use(this);
    this.manager = { t: 2.2, text: def.name };
  },
  /** Trennwand zwischen den Brüdern (Power-up) */
  addDivider(t) {
    const [a, b] = this.bros, B = this.venue.bounds;
    let r;
    if (Math.abs(a.x - b.x) > Math.abs(a.y - b.y)) { const x = (a.x + b.x) / 2; r = { x: x - 2, y: B.y0 - 30, w: 4, h: B.y1 - B.y0 + 40 }; }
    else { const y = (a.y + b.y) / 2; r = { x: B.x0 - 30, y: y - 2, w: B.x1 - B.x0 + 60, h: 4 }; }
    r.t = t;
    this.tempWalls.push(r);
    this.comic('WALL!', (a.x + b.x) / 2, (a.y + b.y) / 2 - 10, '#ffd84a');
  },

  /** Merkt sich, was zuletzt Wut gemacht hat (für die Zeile beim Game Over) */
  noteCause(text) {
    this.causes.push({ text, t: this.el });
    if (this.causes.length > 10) this.causes.shift();
  },
  /** Die letzten zwei verschiedenen Wut-Quellen, z. B. ['BEER', 'INSULT'] */
  recentCauses() {
    const out = [];
    for (let i = this.causes.length - 1; i >= 0 && out.length < 2; i--) {
      const c = this.causes[i];
      if (this.el - c.t > 10) break;
      if (!out.includes(c.text)) out.push(c.text);
    }
    return out.reverse();
  },

  /* ================= Debug ================= */

  forceWin() { if (this.state === 'play') this.finish(true); },
  setAnger(i, v) { if (this.bros[i]) this.bros[i].anger = v; },

  /* ================= Tutorial ================= */

  nextTutStep() {
    const t = this.tut;
    t.i++;
    const st = t.steps[t.i];
    if (!st) { this.toastMsg('NOW GET THEM TO THE GIG!', '#7cfc6a'); return; }
    st.base = { drag: this.stats.drags, calm: this.stats.calms, bin: this.stats.binned, serve: this.stats.served };
    st.left = st.t || 0;
    if (st.spawn) this.spawnItem(st.spawn);
  },
  updateTutorial(dt) {
    const st = this.tut.steps[this.tut.i];
    const key = { drag: 'drags', calm: 'calms', bin: 'binned', serve: 'served' }[st.wait];
    let done;
    if (st.wait === 'time') { st.left -= dt; done = st.left <= 0; }
    else done = this.stats[key] > st.base[st.wait];
    if (!done && st.spawn && !this.items.some(i => i.type === st.spawn)) this.spawnItem(st.spawn);
    if (done) { if (st.wait !== 'time') this.comic('NICE!', 90, 110, '#7cfc6a'); this.nextTutStep(); }
  },
  tutStep() { return this.tut && this.tut.i >= 0 ? this.tut.steps[this.tut.i] || null : null; },

  /* ================= Ablauf ================= */

  startFight() {
    const [a, b] = this.bros;
    this.state = 'fight';
    this.fight = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, t: 0 };
    this.releaseAll();
    buzz(250); sfx('fight');
  },
  finish(win, reason) {
    if (this.state === 'win' || this.state === 'over') return;
    this.state = win ? 'win' : 'over';
    this.reason = reason || null;
    if (win) {   // Konfetti
      const cols = ['#ffd84a', '#ff7aa0', '#7cfc6a', '#9fd8ff', '#ff9a3a'];
      for (let k = 0; k < 60; k++) this.parts.push({ x: rnd(8, 172), y: rnd(26, 70), vx: rnd(-12, 12), vy: rnd(18, 55), life: rnd(1.2, 2.4), c: cols[k % 5] });
    }
    this.endT = 0; this.slowT = 0; this.nearT = 0;
    this.releaseAll();
    if (!win && reason) buzz(150);
    if (!this.level.sandbox || win) sfx(win ? 'win' : 'lose');
    if (this.onEnd) this.onEnd({ win, reason: this.reason, level: this.level, time: Math.min(this.el, this.level.time), stats: { ...this.stats }, causes: this.recentCauses() });
  },

  update(dtReal) {
    const R = CONFIG.RULES, NM = CONFIG.NEAR_MISS;
    this.T += dtReal;

    // Zeitlupe nach Fast-Prügelei (alles) und Slow-Mo-Power-up (nur die Welt, nicht die Uhr)
    const dt = dtReal * (this.nearT > 0 ? NM.slow : 1);
    this.nearT = Math.max(0, this.nearT - dtReal);
    this.nearCd = Math.max(0, this.nearCd - dtReal);
    const sim = dt * (this.slowT > 0 ? .5 : 1);
    this.slowT = Math.max(0, this.slowT - dtReal);

    this.shake = Math.max(0, this.shake - dtReal * 12);
    for (const t of this.trash) { t.life -= dtReal; t.y -= dtReal * 14; }
    this.trash = this.trash.filter(t => t.life > 0);
    // Bus: ab und zu ein Schlagloch - alles ruckelt, Staub fliegt auf
    if (this.venue.id === 'bus' && this.state === 'play' && (this.bumpT -= dtReal) <= 0) {
      this.bumpT = 5 + Math.random() * 5;
      this.shake = Math.max(this.shake, 2.5);
      for (const b of this.bros) if (!b.hidden) this.dust(b.x, b.y, 3);
    }
    for (const p of this.parts) { p.x += p.vx * dtReal; p.y += p.vy * dtReal; p.life -= dtReal; }
    this.parts = this.parts.filter(p => p.life > 0);
    for (const bu of this.bubbles) bu.life -= dtReal;
    this.bubbles = this.bubbles.filter(bu => bu.life > 0);
    for (const c of this.comics) c.life -= dtReal;
    this.comics = this.comics.filter(c => c.life > 0);
    if (this.toast && (this.toast.life -= dtReal) <= 0) this.toast = null;
    if (this.manager && (this.manager.t -= dtReal) <= 0) this.manager = null;

    if (this.state === 'intro') return;
    if (this.state === 'fight') {
      this.fight.t += dtReal; this.shake = 3;
      if (this.fight.t > R.fightTime) this.finish(false);
      return;
    }
    if (this.state !== 'play') { this.endT += dtReal; return; }

    const lv = this.level;
    const tutActive = !!this.tutStep();
    if (tutActive) this.updateTutorial(dt);
    if (!tutActive) this.el += dt;
    this.diff = this.diffBase + this.el / (lv.ramp || 40);

    // ---- Ziele ----
    const goal = lv.goal || { type: 'survive' };
    if (!tutActive) {
      if (goal.type === 'collect') {
        if (this.stats.collected >= goal.n) { this.comic('GOT THEM ALL!', 90, 120, '#7cfc6a'); return this.finish(true); }
        if (this.el >= lv.time) return this.finish(false, 'NO SETLIST, NO GIG!');
      } else if (goal.type === 'stage') {
        if (this.phase === 'normal' && this.el >= lv.time) {
          this.phase = 'stagecall'; this.stageT = R.stageCallTime; this.stageHold = 0;
          this.toastMsg('GET THEM BOTH ON STAGE!', '#ffd84a');
        }
      } else if (this.el >= lv.time) return this.finish(true);
    }
    if (this.phase === 'stagecall') {
      this.stageT -= dt;
      const z = this.venue.stageZone;
      const inZone = this.bros.every(b => !b.hidden && inRect(b, z));
      this.stageHold = inZone ? this.stageHold + dt : 0;
      if (this.stageHold >= .8) { this.comic('SHOWTIME!', 90, 100, '#7cfc6a'); return this.finish(true); }
      if (this.stageT <= 0) return this.finish(false, 'MISSED THE GIG!');
    }

    // ---- Zustände ablaufen lassen ----
    for (const b of this.bros) {
      for (const k in b.st) b.st[k] = Math.max(0, b.st[k] - sim);
      b.cd = Math.max(0, b.cd - sim);
      b.tripCd = Math.max(0, b.tripCd - sim);
      // Festhalten geht nur begrenzt: danach reißt er sich los
      if (b.drag != null) {
        b.grip += sim;
        if (b.grip >= R.gripTime) {
          this.dropBro(b);
          this.stats.drags++;
          b.grabCd = R.regrabTime;
          this.addAnger(b, R.breakFreeAnger);
          this.say(b, 'GET OFF!', '#ff8a3a');
        }
      } else {
        b.grip = Math.max(0, b.grip - sim * R.gripRecover);
        b.grabCd = Math.max(0, b.grabCd - sim);
      }
    }
    this.football = Math.max(0, this.football - sim);
    for (const w of this.tempWalls) w.t -= sim;
    this.tempWalls = this.tempWalls.filter(w => w.t > 0);

    // ---- Regeln der Schauplätze ----
    this.sysCall('update', sim);

    // ---- Brüder ----
    const [a, b] = this.bros;
    const visible = !a.hidden && !b.hidden;
    let d = visible ? this.dist() : 999;
    const inv = this.pair.inverted, angerMul = tutActive ? .25 : 1;
    for (const br of this.bros) {
      if (br.hidden) continue;
      const o = this.other(br);
      let r;
      if (br.calmFat) br.calmFat = Math.max(0, br.calmFat - R.calmFatigueDecay * dt);
      if (br.asleep) r = -3;
      else if (br.st.phone > 0) r = 0;
      else {
        r = R.baseAnger * this.diff;
        if (this.football > 0 && d < 70) r = -8;                     // spielen zusammen Fußball
        else if (inv) { if (d > R.farDist) r += Math.min(1, (d - R.farDist) / 60) * R.closeAnger * this.diff; }
        else if (d < R.closeDist && !o.asleep) {
          r += (R.closeDist - d) / R.closeDist * R.closeAnger * this.diff;
          const last = this.causes[this.causes.length - 1];
          if (d < 35 && !(last && last.text === 'TOO CLOSE' && this.el - last.t < 3)) this.noteCause('TOO CLOSE');
        }
        if (br.drag != null) r += R.dragAnger;
      }
      const m = r > 0 ? br.ch.angerRate * this.mult('angerRate') * angerMul : 1;
      br.anger = clamp(br.anger + r * m * sim, 0, tutActive ? 70 : 100);   // im Tutorial kann nichts schiefgehen

      if (br.drag == null) {
        if (!this.busy(br)) this.moveBro(br, o, sim);
        if (Math.abs(br.vx) + Math.abs(br.vy) > 2) {   // rutscht noch
          this.moveBroTo(br, br.x + br.vx * sim, br.y + br.vy * sim);
          const f = Math.exp(-2 * sim); br.vx *= f; br.vy *= f;
        } else br.vx = br.vy = 0;
        this.pushOutCircles(br, this.obstacles());
        this.pushOutRects(br, this.walls());
        this.clampBounds(br);
        if (!br.hidden && !br.asleep) this.pickupItems(br);
      }
      if (br.anger >= 80 && Math.random() < sim * 9)      // Dampf aus den Ohren
        this.parts.push({ x: br.x + rnd(-4, 4), y: br.y - 26, vx: rnd(-6, 6), vy: -rnd(12, 22), life: .8, c: '#d0d0d0' });
      this.stats.maxAnger = Math.max(this.stats.maxAnger, br.anger);
    }
    if (a.anger < 40 && b.anger < 40) this.stats.calmTime += dt;

    // ---- Prügelei / Trennung / Fast-Prügelei ----
    if (lv.safe) for (const x of this.bros) x.anger = Math.min(x.anger, 94);   // Sandbox: nie verlieren
    if (!a.hidden && !b.hidden) {
      d = this.dist();
      if (inv) {
        if (a.anger >= 100 || b.anger >= 100) return this.finish(false, 'THE BAND SPLIT UP!');
      } else {
        if (d < R.fightDist && (a.anger >= 100 || b.anger >= 100) && !a.asleep && !b.asleep) { this.startFight(); return; }
        if (d < NM.dist && Math.max(a.anger, b.anger) >= NM.anger && this.nearCd <= 0) {
          this.nearT = NM.time; this.nearCd = NM.cooldown; this.shake = Math.max(this.shake, 2);
          this.comic('CLOSE ONE!', (a.x + b.x) / 2, Math.min(a.y, b.y) - 36, '#ff5a4a');
          buzz(40);
        }
        if (d < R.pushDist && d > 0) {
          const p = (R.pushDist - d) / 2, nx = (a.x - b.x) / d, ny = (a.y - b.y) / d;
          if (a.drag == null) { a.x += nx * p; a.y += ny * p; }
          if (b.drag == null) { b.x -= nx * p; b.y -= ny * p; }
        }
      }
    }
    const lost = !this.level.safe && this.sysFirst('lose');
    if (lost) return this.finish(false, lost);

    if (tutActive) return;   // im Tutorial: keine neuen Gegenstände oder Events

    // ---- Neue Gegenstände ----
    if (lv.items) {
      this.itemT -= sim * this.mult('itemRate');
      if (this.itemT <= 0) {
        const e = lv.itemEvery || [3, 5.5];
        this.itemT = rnd(e[0], e[1]) / this.diff;
        // Ganz selten kommt statt des normalen Gegenstands die geheime Zitrone
        this.spawnItem(Math.random() < CONFIG.SECRETS.lemonChance ? 'lemon' : pickWeighted(lv.items));
        if (this.hasFlag('double')) this.spawnItem(pickWeighted(lv.items));
      }
    }
    for (const it of this.items) it.t += dtReal;

    // ---- Events: Countdown, Vorwarnung, laufende Events ----
    for (const et of this.evTimers) {
      et.t -= sim;
      if (et.t <= 0) { et.t = rnd(et.every[0], et.every[1]) / this.diff; this.queueEvent(et.id); }
    }
    for (let i = this.warnings.length - 1; i >= 0; i--) {
      const w = this.warnings[i];
      if ((w.t -= sim) <= 0) { this.warnings.splice(i, 1); this.runEvent(w.id, w.ctx); }
    }
    for (let i = this.active.length - 1; i >= 0; i--) {
      const ac = this.active[i];
      if (ac.ev.update && !ac.ctx.end) ac.ev.update(this, sim, ac.ctx);
      if (ac.ctx.end || (ac.t -= sim) <= 0) { this.active.splice(i, 1); if (ac.ev.end) ac.ev.end(this, ac.ctx); }
    }
  },

  /** Gegenstände, über die ein Bruder läuft */
  pickupItems(br) {
    const R = CONFIG.RULES;
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i], def = ITEMS[it.type];
      if (it.held || def.kind === 'collect') continue;
      if (Math.hypot(it.x - br.x, it.y - br.y) >= R.pickupDist) continue;
      if (def.kind === 'hazard') {
        if (br.tripCd > 0) continue;
        br.st.stun = def.stun || .8; br.tripCd = 2;
        this.addAnger(br, def.anger || 5);
        this.say(br, def.word || 'OUCH', def.wordColor);
        this.noteCause(def.name);
        if (!def.persist) this.items.splice(i, 1);
        continue;
      }
      this.items.splice(i, 1);
      if (def.kind === 'good') this.stats.served++;
      this.applyItem(br, it);
    }
  },

  /** Ruhig: schlendert herum. Wütend: läuft auf den anderen los (Schwestern: weg). */
  moveBro(br, o, dt) {
    const R = CONFIG.RULES;
    let sp, tx, ty;
    if (br.goal) { tx = br.goal.x; ty = br.goal.y; sp = 14; }
    else if (br.anger > R.chaseFrom && !o.hidden) {
      if (this.pair.inverted) {
        const dx = br.x - o.x, dy = br.y - o.y, l = Math.hypot(dx, dy) || 1;
        tx = br.x + dx / l * 40; ty = br.y + dy / l * 40; sp = 6 + (br.anger - R.chaseFrom) * .4;
      } else { tx = o.x; ty = o.y; sp = 6 + (br.anger - R.chaseFrom) * .65; }
    } else {
      br.retT -= dt;
      if (br.retT <= 0) {
        br.retT = rnd(2, 4);
        const w = this.sysFirst('wander', br) || this.randomFreeSpot(br.y);
        br.tx = w.x; br.ty = w.y;
      }
      tx = br.tx; ty = br.ty; sp = R.wanderSpeed;
    }
    const wp = this.sysFirst('route', br, tx, ty);   // Tür, Aufzug ...
    if (br.hidden) return;
    if (wp) { tx = wp.x; ty = wp.y; }
    // Hängt er an einem Hindernis fest (Tisch, Wand)? Dann kurz seitlich ausweichen.
    if (br.detour) {
      br.detour.t -= dt;
      if (br.detour.t <= 0) br.detour = null; else { tx = br.detour.x; ty = br.detour.y; }
    }
    const bx = br.x, by = br.y;
    sp *= (br.ch.speed || 1) * this.mult('speed');
    const dx = tx - br.x, dy = ty - br.y, l = Math.hypot(dx, dy);
    if (l > 2) {
      const step = Math.min(l, sp * dt);
      this.moveBroTo(br, br.x + dx / l * step, br.y + dy / l * step);
      br.walk += dt * sp * .4;
      const moved = Math.hypot(br.x - bx, br.y - by);
      br.stuckT = moved < step * .3 ? (br.stuckT || 0) + dt : 0;
      if (br.stuckT > .5 && !br.detour) {
        const side = Math.random() < .5 ? -1 : 1;   // senkrecht zur Laufrichtung ausweichen
        br.detour = { x: br.x - dy / l * 24 * side, y: br.y + dx / l * 24 * side, t: .8 };
        br.stuckT = 0;
      }
    }
  },

  /* ================= Eingabe (Welt-Koordinaten) ================= */

  pointerDown(p, id) {
    if (this.state === 'intro') { this.begin(); return; }
    if (this.state !== 'play') return;
    const R = CONFIG.RULES;
    // 1. Events (Fan verscheuchen ...) und Schauplatz-Regeln (Verstärker, Tür ...)
    for (const a of this.active) if (a.ev.pointerDown && a.ev.pointerDown(this, p, a.ctx)) return;
    for (const e of this.sys) if (e.def.pointerDown && e.def.pointerDown(this, e.s, p)) return;
    // 2. Gegenstände: schlechte wegtippen, gute greifen, Setlists sammeln
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i], def = ITEMS[it.type];
      if (it.held) continue;
      if (Math.hypot(p.x - it.x, p.y - (it.y - Math.min(def.height / 2, 6))) >= R.itemTapRadius) continue;
      if (def.kind === 'good') { it.held = true; this.ptrs.set(id, { item: it, sx: p.x, sy: p.y, moved: false }); return; }
      if (def.kind === 'collect') this.collectItem(i); else this.binItem(i);
      return;
    }
    // 3. Bruder anfassen (Ziehen oder Tippen entscheidet sich beim Loslassen)
    let hit = null, best = 1e9;
    for (const b of this.bros) {
      if (b.drag != null || b.hidden) continue;
      const dd = Math.hypot(p.x - b.x, p.y - (b.y - (b.asleep ? 6 : 12)));
      if (dd < R.broGrabRadius && dd < best) { best = dd; hit = b; }
    }
    if (hit) {
      // Gerade losgerissen: Tippen (beruhigen) geht, Ziehen nicht
      const noDrag = hit.grabCd > 0;
      if (!noDrag) hit.drag = id;
      this.ptrs.set(id, { b: hit, noDrag, sx: p.x, sy: p.y, moved: false, t0: performance.now(), tl: performance.now(), vx: 0, vy: 0 });
    }
  },

  pointerMove(p, id) {
    const r = this.ptrs.get(id);
    if (!r || this.state !== 'play') return;
    if (!r.moved && Math.hypot(p.x - r.sx, p.y - r.sy) > CONFIG.TAP_MOVE) r.moved = true;
    if (!r.moved) return;
    const B = this.venue.bounds;
    if (r.item) { r.item.x = clamp(p.x, 4, PLAY_W - 4); r.item.y = clamp(p.y - 4, B.y0 - 10, B.y1 + 6); return; }
    const b = r.b;
    if (b.st.stuck > 0 || r.noDrag || b.drag !== id) return;   // festgeklebt, gerade losgerissen oder schon losgelassen
    b.asleep = false;
    const ox = b.x, oy = b.y;
    this.moveBroTo(b, clamp(p.x, B.x0, B.x1), clamp(p.y + 10, B.y0, B.y1));   // +10: Finger verdeckt den Kopf nicht
    const moved = Math.hypot(b.x - ox, b.y - oy);
    b.walk += moved * .05;
    if (moved > 1.5 && Math.random() < .35) this.dust(b.x, b.y, 1);   // Staubwölkchen an den Füßen
    // Tempo merken (für rutschigen Boden)
    const now = performance.now(), dts = Math.max(8, now - r.tl) / 1000;
    r.vx = r.vx * .5 + (b.x - ox) / dts * .5; r.vy = r.vy * .5 + (b.y - oy) / dts * .5; r.tl = now;
  },

  pointerUp(id) {
    const r = this.ptrs.get(id);
    if (!r) return;
    this.ptrs.delete(id);
    const R = CONFIG.RULES;
    if (r.item) {   // guter Gegenstand losgelassen: bei einem Bruder?
      const it = r.item; it.held = false;
      if (this.state !== 'play') return;
      let best = null, bd = R.deliverDist;
      for (const b of this.bros) {
        if (b.hidden) continue;
        const dd = Math.hypot(it.x - b.x, it.y - (b.y - 8));
        if (dd < bd) { bd = dd; best = b; }
      }
      if (best) {
        this.items.splice(this.items.indexOf(it), 1);
        this.stats.served++;
        this.applyItem(best, it);
      }
      return;
    }
    const b = r.b;
    if (b.drag === id) b.drag = null;
    if (this.state !== 'play') return;
    if (!r.moved && performance.now() - r.t0 < CONFIG.TAP_MS) { this.calm(b); return; }
    if (r.moved) {
      this.stats.drags++;
      if (this.hasFlag('slippery')) { b.vx = clamp(r.vx * .8, -150, 150); b.vy = clamp(r.vy * .8, -150, 150); }
      this.sysCall('onRelease', b);
    }
  },

  /* ================= Zeichnen ================= */

  draw() {
    let sx = 0, sy = 0;
    if (this.shake > 0) { sx = Math.round(rnd(-this.shake, this.shake)); sy = Math.round(rnd(-this.shake, this.shake)); }
    if (this.venue.posterSpots) VENUE_ORDER.forEach(v => { if (Save.data.posters[v]) posterImage(v); });   // vor dem Zeichnen vorbereiten
    drawVenue(this.venue, this.T, sx, sy, this.hasFlag('mirror'));   // setzt Welt-Koordinaten
    drawWallPosters(this.venue);

    // Bühnen-Zone ("Bring beide zur Bühne")
    if (this.phase === 'stagecall') {
      const z = this.venue.stageZone, on = (this.T * 4 | 0) % 2;
      X.fillStyle = on ? 'rgba(255,216,74,.35)' : 'rgba(255,216,74,.15)'; X.fillRect(z.x, z.y, z.w, z.h);
      X.fillStyle = '#ffd84a'; X.fillRect(z.x, z.y, z.w, 1); X.fillRect(z.x, z.y + z.h - 1, z.w, 1); X.fillRect(z.x, z.y, 1, z.h); X.fillRect(z.x + z.w - 1, z.y, 1, z.h);
      txt('STAGE', z.x + z.w / 2, z.y + z.h / 2 - 2, '#ffd84a', 1, 'c');
    }
    this.sysCall('drawUnder');
    for (const it of this.items) if (!it.held) drawItem(it);

    // Figuren nach Tiefe sortiert (weiter unten = weiter vorne)
    const ents = [];
    if (this.state !== 'fight') for (const b of this.bros) if (!b.hidden) ents.push({ y: b.y, draw: () => drawBro(b) });
    for (const e of this.sys) if (e.def.entities) ents.push(...e.def.entities(this, e.s));
    ents.sort((p, q) => p.y - q.y).forEach(e => e.draw());
    if (this.state === 'fight') this.drawFight();

    for (const w of this.tempWalls) {   // Trennwand (Power-up)
      for (let k = 0; k < Math.max(w.w, w.h); k += 4) {
        X.fillStyle = (k / 4) % 2 ? '#111' : '#ffd84a';
        if (w.w > w.h) X.fillRect(Math.round(w.x + k), Math.round(w.y), 4, w.h); else X.fillRect(Math.round(w.x), Math.round(w.y + k), w.w, 4);
      }
    }
    this.sysCall('drawOver');
    for (const a of this.active) if (a.ev.draw) a.ev.draw(this, a.ctx);
    for (const it of this.items) if (it.held) drawItem(it);
    if (this.state !== 'fight') for (const bu of this.bubbles) drawBubble(bu);
    for (const p of this.parts) { X.fillStyle = p.c; X.fillRect(Math.round(p.x), Math.round(p.y), 2, 2); }
    for (const t of this.trash) {
      X.globalAlpha = Math.min(1, t.life * 2.5);
      const x = Math.round(t.x), y = Math.round(t.y);
      X.fillStyle = '#000'; X.fillRect(x - 4, y - 5, 9, 10);
      X.fillStyle = '#ccc'; X.fillRect(x - 3, y - 4, 7, 1); X.fillRect(x - 1, y - 5, 3, 1);
      X.fillStyle = '#9a9aa4'; X.fillRect(x - 3, y - 2, 7, 6);
      X.fillStyle = '#5a5a64'; X.fillRect(x - 1, y - 1, 1, 4); X.fillRect(x + 1, y - 1, 1, 4);
      X.globalAlpha = 1;
    }
    if (this.manager) this.drawManager();
    for (const c of this.comics) drawComic(c);

    baseT();                                // zurück zu Bildschirm-Koordinaten
    for (const a of this.active) if (a.ev.drawScreen) a.ev.drawScreen(this, a.ctx);
    this.sysCall('hud');
    if (this.slowT > 0) { X.fillStyle = 'rgba(80,120,255,.12)'; X.fillRect(VIEW.OX, 26, PLAY_W, 278); }
  },

  /** Staubwolke mit Fäusten und Comic-Wörtern */
  drawFight() {
    const f = this.fight;
    for (let i = 0; i < 16; i++) {
      X.fillStyle = Math.random() < .5 ? '#bbb' : '#888';
      const s = rnd(4, 9) | 0;
      X.fillRect(Math.round(f.x + rnd(-16, 16) - s / 2), Math.round(f.y - 12 + rnd(-12, 10) - s / 2), s, s);
    }
    X.fillStyle = '#e2b38f'; X.fillRect(Math.round(f.x + rnd(-18, 18)), Math.round(f.y - 12 + rnd(-14, 10)), 3, 2);
    X.fillStyle = this.bros[1].color; X.fillRect(Math.round(f.x + rnd(-18, 18)), Math.round(f.y - 20 + rnd(-8, 8)), 6, 2);
    const w = ['POW!', '#@%!', 'BIFF', 'BONK'];
    txtS(w[(this.T * 6 | 0) % 4], Math.round(clamp(f.x + rnd(-4, 4), 20, PLAY_W - 20)), Math.round(f.y - 38), '#ffd84a', 2, 'c');
  },

  /** Der Manager (du) läuft bei Power-ups kurz ins Bild */
  drawManager() {
    const m = this.manager, k = Math.min(1, (2.2 - m.t) / .3), x = Math.round(-10 + k * 34), y = 292;
    drawPerson(x, y, '#2a2a30', { hair: '#888', walk: this.T * 3 });
    X.fillStyle = '#111'; X.fillRect(x + 3, y - 19, 2, 4);
    const w = textW(m.text) + 4;
    X.fillStyle = '#000'; X.fillRect(x + 6, y - 32, w + 2, 10);
    X.fillStyle = '#ffd84a'; X.fillRect(x + 7, y - 31, w, 8);
    txt(m.text, x + 9, y - 29, '#000');
  },
};
