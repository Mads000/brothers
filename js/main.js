/* =========================================================================
   main.js – Szenen-Steuerung und Game-Loop

   Szenen (App.scene):
     'menu'          Hauptmenü
     'howto'         Spielanleitung
     'info'          Info-Seite: alles zum Nachlesen
     'code'          Code eingeben (z. B. "playtest", "reset")
     'select'        Level-Auswahl
     'play'          Level läuft (inkl. Startkarte und Prügel-Animation)
     'pause'         Pause-Menü
     'result'        Ergebnis nach einem Level
     'gig'           Gig-Szene nach einem Headliner
     'shop'          Shop (Power-ups, Outfits, Lackierungen)
     'extras'        Erfolge, Plakate, Highscores
     'endlessSetup'  Never-Ending Tour: Paar wählen
     'transition'    Never-Ending Tour: Punkte der Stadt
     'tourmap'       Never-Ending Tour: Landkarte, nächster Halt
     'sandbox'       SOUNDCHECK: freies Spiel, alles einstellbar
     'endlessOver'   Never-Ending Tour: Ende
   Das Debug-Menü ist eine Ebene darüber (App.debugOpen) und pausiert alles.
   ========================================================================= */

const App = {
  scene: 'menu',
  T: 0,              // laufende Zeit für Menü-Animationen
  sceneT: 0,         // App.T beim letzten Szenenwechsel
  level: null,       // zuletzt gestartetes Tour-Level
  result: null,      // Ergebnis des letzten Levels
  gig: null,         // Gig-Szene { t, stars, city }
  venueIdx: 0,       // gewählter Schauplatz in der Level-Auswahl
  shopTab: 0, extrasTab: 0, infoTab: 0, infoPage: 0,
  codeText: '', codeMsg: null, codeArmed: null,   // Code-Eingabe
  msg: null,         // kurze Meldung im Shop
  transT: 0,         // Zeit im Übergang (Endlos)
  mapSel: 0,         // gewählter Halt auf der Landkarte
  mapMove: null,     // Bus fährt gerade: { from, to, t, stop }
  sb: { venue: 'bus', pair: 'brothers', pace: 0, time: 0, safe: true, items: true, events: true },   // Soundcheck-Einstellungen
  debugOpen: false, debugMsg: null, resetArmed: 0,
  lp: null,          // laufendes langes Drücken: { id, x, y, t }

  /* ---------- Szenenwechsel ---------- */

  go(scene) { this.scene = scene; this.sceneT = this.T; UI.focus = -1; this.msg = null; if (scene === 'transition') this.transT = 0; if (scene === 'tourmap') { this.mapSel = 0; this.mapMove = null; } },

  startLevel(lv, skipIntro) {
    this.level = lv;
    this.result = null;
    Endless.active = false;
    Game.start(lv, { skipIntro });
    this.go('play');
  },
  /** SOUNDCHECK starten: Level aus den Einstellungen bauen */
  startSandbox() {
    const sb = this.sb, ve = VENUES[sb.venue], t = ve.endless || {}, pace = SANDBOX.pace[sb.pace];
    const lv = {
      id: 'sandbox', sandbox: true, safe: sb.safe, venue: sb.venue, name: 'SOUNDCHECK',
      time: SANDBOX.time[sb.time].t, ramp: pace.ramp, startAnger: [15, 15],
      items: sb.items ? t.items : null, itemEvery: t.itemEvery || [3, 5], firstItem: 2,
      events: sb.events ? t.events : null, mech: t.mech, prespawn: t.prespawn, extras: [],
    };
    this.level = lv; this.result = null; Endless.active = false;
    Game.start(lv, { pair: sb.pair, diffBase: pace.diff, skipIntro: true });
    Game.toastMsg('SOUNDCHECK! HAVE FUN.', '#ffd84a');
    this.go('play');
  },
  /** Neustart: ohne Startkarte, damit es sofort weitergeht */
  restart() {
    if (Game.level && Game.level.endless) { Endless.start(Endless.pair); return; }
    if (Game.level && Game.level.sandbox) { this.startSandbox(); return; }
    if (this.level) this.startLevel(this.level, true);
  },
  pause() {
    if (this.scene === 'play' && Game.state === 'play') { Game.releaseAll(); this.go('pause'); }
  },
  resume() { if (this.scene === 'pause') this.go('play'); },
  toSelect() {
    if (this.level && this.level.sandbox) { this.go('sandbox'); return; }
    if (this.level) this.venueIdx = Math.max(0, VENUE_ORDER.indexOf(this.level.venue));
    this.go('select');
  },
  changeVenue(d) { this.venueIdx = (this.venueIdx + d + VENUE_ORDER.length) % VENUE_ORDER.length; },

  openDebug() {
    if (!TEST_MODE) return;
    Game.releaseAll();
    this.debugOpen = true; this.resetArmed = 0; this.debugMsg = null; this.lp = null;
    UI.focus = -1;
  },
  closeDebug() { this.debugOpen = false; UI.focus = -1; },

  /* ---------- Codes ---------- */

  openCode() { this.codeText = ''; this.codeMsg = null; this.codeArmed = null; this.go('code'); },
  typeCode(ch) {
    if (this.codeText.length < 12) this.codeText += ch;
    this.codeMsg = null;
  },
  backspaceCode() { this.codeText = this.codeText.slice(0, -1); this.codeMsg = null; },
  /** Code prüfen und ausführen (siehe data/codes.js) */
  submitCode() {
    const code = this.codeText.trim().toLowerCase(), def = CODES[code];
    if (!def) { this.codeMsg = { text: 'UNKNOWN CODE', c: '#ff5a4a' }; this.codeArmed = null; this.codeText = ''; return; }
    // Gefährliche Codes brauchen ein zweites OK
    if (def.confirm && this.codeArmed !== code) {
      this.codeArmed = code;
      this.codeMsg = { text: def.confirm, c: '#ff8a3a' };
      return;
    }
    this.codeArmed = null;
    const msg = def.run();
    for (const v of Object.values(VENUES)) v._bg = null;   // Hintergründe neu zeichnen (Bus-Lackierung)
    this.codeText = '';
    this.codeMsg = { text: msg || 'OK!', c: '#7cfc6a' };
  },

  /* ---------- Shop ---------- */

  flash(text, c = '#7cfc6a') { this.msg = { text, c, t: 1.6 }; },
  buy(kind, id) {
    if (TEST_MODE) { this.flash('TEST MODE: ALREADY UNLOCKED', '#ff8a3a'); return; }
    const price = kind === 'powerup' ? POWERUPS[id].price : kind === 'outfit' ? OUTFITS[id].price : PAINTS[id].price;
    if (!Save.spend(price)) { this.flash('NOT ENOUGH PICKS', '#ff5a4a'); return; }
    if (kind === 'powerup') Save.data.powerups[id] = (Save.data.powerups[id] || 0) + 1;
    if (kind === 'outfit' && !Save.data.owned.outfits.includes(id)) Save.data.owned.outfits.push(id);
    if (kind === 'paint' && !Save.data.owned.paints.includes(id)) { Save.data.owned.paints.push(id); this.equipPaint(id); }
    Save.write();
    const aw = Save.checkAchievements({});
    this.flash(aw.length ? 'NEW AWARD: ' + ACHIEVEMENTS[aw[0]].name : 'BOUGHT!');
  },
  equipOutfit(charId, id) { Save.data.outfit[charId] = id; Save.write(); },
  equipPaint(id) { Save.data.paint = id; Save.write(); VENUES.bus._bg = null; },
  cycleLoadout(slot) {
    const ids = Object.keys(POWERUPS), cur = Save.data.loadout[slot];
    let i = ids.indexOf(cur);
    // nicht zweimal dasselbe Power-up
    do { i = (i + 1) % ids.length; } while (ids[i] === Save.data.loadout[1 - slot]);
    Save.data.loadout[slot] = ids[i]; Save.write();
  },

  /* ---------- Ende eines Levels (von Game.finish) ---------- */

  onLevelEnd(res) {
    const lv = res.level, RW = CONFIG.REWARDS;
    if (lv.endless) { if (res.win) Endless.sectionDone(res); else Endless.fail(res); return; }
    if (lv.sandbox) {   // Soundcheck: keine Sterne, keine Belohnung, nichts wird gespeichert
      res.stars = 0; res.picks = 0; res.awards = []; res.newPoster = false; res.next = null;
      this.result = res; this.go('result'); return;
    }

    // Sterne: geschafft / Wut nie über 90 % / Bonusziel
    res.starAnger = res.win && res.stats.maxAnger <= 90;
    res.starBonus = res.win && bonusOk(lv.bonus, res.stats);
    res.stars = res.win ? 1 + (res.starAnger ? 1 : 0) + (res.starBonus ? 1 : 0) : 0;
    const first = Save.recordResult(lv, res);

    // Plektren
    res.picks = res.win
      ? RW.win + res.stars * RW.perStar + Math.min(RW.maxBinned, res.stats.binned) + (first ? RW.firstClear : 0)
      : Math.floor(res.time / 10) * RW.lossPer10s;
    Save.addPicks(res.picks);

    // Headliner: Plakat
    res.newPoster = false;
    if (res.win && lv.headliner && !Save.data.posters[lv.venue]) { Save.data.posters[lv.venue] = true; res.newPoster = true; Save.write(); }

    res.awards = Save.checkAchievements({ result: res });
    const next = res.win ? levelAfter(lv) : null;
    res.next = next && Save.levelUnlocked(next) ? next : null;
    this.result = res;
    if (res.win && lv.headliner) { this.gig = { t: 0, stars: res.stars, city: lv.city }; this.go('gig'); }
    else this.go('result');
  },

  /** Bereich, in dem langes Drücken das Debug-Menü öffnet */
  lpZone() {
    const cx = VIEW.W / 2;
    if (this.scene === 'menu') return { x: cx - 50, y: 36, w: 100, h: 22 };
    if (['select', 'shop', 'extras', 'howto', 'info'].includes(this.scene)) return { x: cx - 30, y: 4, w: 60, h: 16 };
    if (this.scene === 'play' || this.scene === 'pause') return { x: cx - 32, y: 0, w: 64, h: 12 };
    return null;
  },

  /* ---------- Eingabe (Bildschirm-Koordinaten) ---------- */

  /** Bildschirm -> Spielfeld (beachtet Spiegeln) */
  toWorld(p) {
    const x = p.x - VIEW.OX;
    return { x: Game.hasFlag('mirror') ? PLAY_W - x : x, y: p.y };
  },

  pointerDown(p, id) {
    if (this.debugOpen) { const b = UI.hit(p); if (b) b.action(); return; }
    if (TEST_MODE) { const z = this.lpZone(); if (z && inRect(p, z)) this.lp = { id, x: p.x, y: p.y, t: 0 }; }

    const b = UI.hit(p);
    if (b) { b.action(); return; }

    const s = this.scene;
    if (s === 'play') Game.pointerDown(this.toWorld(p), id);
    else if (s === 'result' && this.result && !this.result.win && Game.endT > .8) this.restart();
    else if (s === 'gig' && this.gig.t > 1) this.endGig();
  },

  pointerMove(p, id) {
    if (this.lp && this.lp.id === id && Math.hypot(p.x - this.lp.x, p.y - this.lp.y) > 6) this.lp = null;
    if (this.scene === 'play' && !this.debugOpen) Game.pointerMove(this.toWorld(p), id);
  },

  pointerUp(id) {
    if (this.lp && this.lp.id === id) this.lp = null;
    Game.pointerUp(id);
  },

  endGig() { this.result.fromGig = true; this.go('result'); },

  key(code) {
    const enter = code === 'Enter' || code === 'NumpadEnter';
    const nav = code.startsWith('Arrow');
    if (code === 'F2' || code === 'Backquote') { this.debugOpen ? this.closeDebug() : this.openDebug(); return; }

    if (this.debugOpen) {
      if (code === 'Escape') this.closeDebug();
      else if (nav) UI.move(code === 'ArrowUp' || code === 'ArrowLeft' ? -1 : 1);
      else if (enter) UI.activate();
      return;
    }

    const s = this.scene;
    if (s === 'play') {
      if (Game.state === 'intro') { if (enter || code === 'Space') Game.begin(); else if (code === 'Escape') this.toSelect(); return; }
      if (code === 'Space' || code === 'KeyP' || code === 'Escape') this.pause();
      else if (code === 'KeyR') this.restart();
      else if (code === 'Digit1') Game.usePowerUp(0);
      else if (code === 'Digit2') Game.usePowerUp(1);
      return;
    }
    if (s === 'gig') { if (this.gig.t > 1) this.endGig(); return; }
    if (s === 'transition') {
      if (this.transT < .6) return;
      if (enter || code === 'Space') this.go('tourmap');
      return;
    }
    if (s === 'tourmap') {
      if (this.mapMove) return;
      const n = Endless.routes.length, m = /^Digit([1-3])$/.exec(code);
      if (m && +m[1] <= n) this.mapSel = +m[1] - 1;
      else if (code === 'ArrowLeft' || code === 'ArrowUp') this.mapSel = (this.mapSel - 1 + n) % n;
      else if (code === 'ArrowRight' || code === 'ArrowDown') this.mapSel = (this.mapSel + 1) % n;
      else if (enter || code === 'Space') Endless.choose(this.mapSel);
      return;
    }

    if (s === 'code') {
      if (code.startsWith('Key')) this.typeCode(code.slice(3));
      else if (/^(Digit|Numpad)\d$/.test(code)) this.typeCode(code.slice(-1));
      else if (code === 'Backspace') this.backspaceCode();
      else if (enter) this.submitCode();
      else if (code === 'Escape') this.go('extras');
      return;
    }

    // In allen Menüs: Pfeiltasten wählen, Enter bestätigt
    if (nav) { UI.move(code === 'ArrowUp' || code === 'ArrowLeft' ? -1 : 1); return; }

    if (s === 'pause') {
      if (code === 'Space' || code === 'KeyP' || code === 'Escape') this.resume();
      else if (code === 'KeyR' && !Game.level.endless) this.restart();
      else if (enter) UI.activate();
    } else if (s === 'result') {
      if (Game.endT < .6 && !this.result.fromGig) return;
      if (code === 'KeyR') this.restart();
      else if (code === 'Escape') this.toSelect();
      else if (enter || code === 'Space') UI.activate();
    } else if (s === 'menu') {
      if (enter || code === 'Space') UI.activate();
    } else {
      if (code === 'Escape' || code === 'Backspace') this.go('menu');
      else if (enter || code === 'Space') UI.activate();
    }
  },

  /* ---------- Loop ---------- */

  update(dt) {
    this.T += dt;
    if (this.debugMsg && (this.debugMsg.t -= dt) <= 0) this.debugMsg = null;
    if (this.msg && (this.msg.t -= dt) <= 0) this.msg = null;
    if (this.resetArmed > 0) this.resetArmed = Math.max(0, this.resetArmed - dt);
    if (this.lp && (this.lp.t += dt) >= CONFIG.LONG_PRESS) this.openDebug();
    if (this.debugOpen) return;   // Debug-Menü friert das Spiel ein
    const s = this.scene;
    if (s === 'play' || s === 'result') Game.update(dt);
    if (s === 'gig') { this.gig.t += dt; if (this.gig.t > 7) this.endGig(); }
    if (s === 'transition') this.transT += dt;
    if (s === 'tourmap') {
      if (Endless.stopMsg && (Endless.stopMsg.t -= dt) <= 0) Endless.stopMsg = null;
      const mv = this.mapMove;
      if (mv && (mv.t += dt) >= 1.4) { this.mapMove = null; this.mapSel = 0; Endless.arrive(mv.stop); }
    }
  },

  draw() {
    X.setTransform(1, 0, 0, 1, 0, 0);
    X.fillStyle = '#000'; X.fillRect(0, 0, VIEW.W, VIEW.HC);
    baseT();
    UI.begin();
    switch (this.scene) {
      case 'menu': Screens.menu(); break;
      case 'howto': Screens.howto(); break;
      case 'info': Screens.info(); break;
      case 'code': Screens.code(); break;
      case 'select': Screens.select(); break;
      case 'shop': Screens.shop(); break;
      case 'extras': Screens.extras(); break;
      case 'endlessSetup': Screens.endlessSetup(); break;
      case 'play': Game.draw(); drawHUD(Game, Game.state === 'play'); break;
      case 'pause': Game.draw(); drawHUD(Game, false); Screens.pause(); break;
      case 'result': Game.draw(); drawHUD(Game, false); Screens.result(); break;
      case 'gig': Screens.gig(); break;
      case 'transition': Game.draw(); drawHUD(Game, false); Screens.transition(); break;
      case 'tourmap': Screens.tourmap(); break;
      case 'sandbox': Screens.sandbox(); break;
      case 'endlessOver': Game.draw(); drawHUD(Game, false); Screens.endlessOver(); break;
    }
    drawLongPress();
    if (this.debugOpen) { UI.begin(); Screens.debug(); }   // nur Debug-Buttons sind dann klickbar
  },
};

Game.onEnd = res => App.onLevelEnd(res);
Input.init();

let lastFrame = performance.now();
function loop(now) {
  const dt = Math.min(.05, (now - lastFrame) / 1000);   // max. 50 ms, damit nach Ruckeln nichts springt
  lastFrame = now;
  App.update(dt);
  App.draw();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
