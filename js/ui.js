/* =========================================================================
   ui.js – Buttons, HUD, Menüs und alle Bildschirme

   Buttons funktionieren "immediate mode": Jeder Bildschirm meldet seine
   Buttons beim Zeichnen mit UI.button(...) an. Input und Tastatur benutzen
   dann die Buttons des letzten Frames.
   Alle Koordinaten hier sind Bildschirm-Koordinaten (0..VIEW.W).
   ========================================================================= */

const UI = {
  buttons: [],
  mouse: null,    // Mausposition für Hover (nur Maus, nicht Touch)
  focus: -1,      // per Tastatur ausgewählter Button (-1 = keiner)

  begin() { this.buttons = []; },

  /**
   * Button anmelden und zeichnen.
   * opt: disabled, sub (zweite Zeile), noDefault (nicht per Enter), bare (kein Rahmen),
   *      draw(b, hl) (eigener Inhalt), color (Textfarbe), active (hervorgehoben)
   */
  button(x, y, w, h, label, action, opt = {}) {
    const b = { x, y, w, h, label, action, ...opt };
    const idx = this.buttons.length;
    this.buttons.push(b);
    const hl = !b.disabled && (idx === this.focus || (this.mouse && inRect(this.mouse, b)));
    drawButton(b, hl);
    return b;
  },

  hit(p) {
    for (let i = this.buttons.length - 1; i >= 0; i--) {
      const b = this.buttons[i];
      if (!b.disabled && inRect(p, b)) return b;
    }
    return null;
  },

  move(dir) {
    const en = [];
    this.buttons.forEach((b, i) => { if (!b.disabled) en.push(i); });
    if (!en.length) return;
    let k = en.indexOf(this.focus);
    k = k < 0 ? (dir > 0 ? 0 : en.length - 1) : (k + dir + en.length) % en.length;
    this.focus = en[k];
  },

  activate() {
    let b = this.buttons[this.focus];
    if (!b || b.disabled) b = this.buttons.find(x => !x.disabled && !x.noDefault);
    if (b) b.action();
  },
};

/** Standard-Knopf: Papier wie die Konzert-Tickets im Hauptmenü */
function drawButton(b, hl) {
  if (!b.bare) {
    const T = TICKET, edge = b.disabled ? '#33302a' : hl ? T.hot : b.active ? '#c8a040' : T.edge;
    X.fillStyle = 'rgba(0,0,0,.55)'; X.fillRect(b.x + 1, b.y + 1, b.w + 1, b.h + 1);          // Schatten
    X.fillStyle = b.disabled ? '#1a1815' : b.active ? '#3a3122' : T.paper; X.fillRect(b.x, b.y, b.w, b.h);
    X.fillStyle = 'rgba(255,240,200,.05)'; X.fillRect(b.x + 1, b.y + 1, b.w - 2, 1);
    X.fillStyle = edge;
    X.fillRect(b.x, b.y, b.w, 1); X.fillRect(b.x, b.y + b.h - 1, b.w, 1); X.fillRect(b.x, b.y, 1, b.h); X.fillRect(b.x + b.w - 1, b.y, 1, b.h);
  }
  if (b.draw) { b.draw(b, hl); return; }
  const col = b.disabled ? '#4a4740' : hl ? '#ffd84a' : b.active ? '#ffd84a' : (b.color || TICKET.ink);
  const cx = b.x + b.w / 2;
  if (b.sub) {
    const y = b.y + Math.floor((b.h - 12) / 2);
    txt(b.label, cx, y, col, 1, 'c');
    txt(b.sub, cx, y + 7, b.disabled ? '#444' : '#888', 1, 'c');
  } else txt(b.label, cx, b.y + Math.floor((b.h - 5) / 2), col, 1, 'c');
}

/** Reiter-Leiste (Shop, Extras) */
function drawTabs(names, current, onPick, y = 30) {
  const OX = VIEW.OX, w = Math.floor((PLAY_W - 8 - (names.length - 1) * 3) / names.length);
  names.forEach((n, i) => UI.button(OX + 4 + i * (w + 3), y, w, 14, n, () => onPick(i), { active: i === current, noDefault: true }));
}
/** Plektren-Anzeige */
function drawPicks(xr, y) {
  const s = Save.picks() === Infinity ? 'INF' : String(Save.data.picks);
  txt(s, xr, y, '#ff8a3a', 1, 'r');
  drawPick(xr - textW(s) - 8, y - 1);
}

/* ---------- PC-Seitenränder ---------- */
const frameCache = {};
onViewChange(() => { for (const k in frameCache) delete frameCache[k]; });

function getFrame(ve) {
  const key = ve.id === 'bus' ? 'bus-' + Save.paintId() : ve.id;   // Bus-Rand hängt an der Lackierung
  if (frameCache[key]) return frameCache[key];
  const W = VIEW.W, OX = VIEW.OX, o = makeCanvas(W, H), g = o.getContext('2d');
  for (const x of [0, W - OX]) {
    g.fillStyle = ve.palette.side; g.fillRect(x, 0, OX, H);
    if (ve.buildSide) ve.buildSide(g, x, OX);
  }
  shadePass(g, W, H, (px) => {
    if (px >= OX && px < W - OX) return null;
    const d = px < OX ? OX - px : px - (W - OX) + 1;
    return 1 - d / OX * .5;
  });
  g.fillStyle = 'rgba(14,12,20,.3)'; g.fillRect(0, 0, OX, H); g.fillRect(W - OX, 0, OX, H);   // gedämpft
  return (frameCache[key] = o);
}

/* ---------- Handy: Streifen über und unter dem Spielfeld ---------- */
const bandCache = {};
onViewChange(() => { for (const k in bandCache) delete bandCache[k]; });

function getBand(ve, top) {
  const h = VIEW.OY, key = ve.id + (top ? '-t-' : '-b-') + (ve.id === 'bus' ? Save.paintId() : '');
  if (bandCache[key]) return bandCache[key];
  const o = makeCanvas(PLAY_W, h), g = o.getContext('2d');
  g.fillStyle = ve.palette.side; g.fillRect(0, 0, PLAY_W, h);
  if (ART.band[ve.id]) ART.band[ve.id](g, bandKit(g, 0, h, top), h, top);
  // nach außen etwas dunkler, wie die Seitenränder am PC
  shadePass(g, PLAY_W, h, (px, py) => 1 - (top ? h - 1 - py : py) / Math.max(h, 40) * .5);
  g.fillStyle = 'rgba(14,12,20,.35)'; g.fillRect(0, 0, PLAY_W, h);   // gedämpft: weniger Ablenkung
  return (bandCache[key] = o);
}
/**
 * Streifen zeichnen. play = im Spiel (direkt am Spielfeld, die HUD-Leisten
 * sitzen ganz außen), sonst (Menüs) außerhalb von 0..320.
 */
function drawBands(ve, T, play) {
  const h = VIEW.OY;
  if (h <= 0) return;
  baseT();
  for (const top of [true, false]) {
    const y0 = top ? (play ? 26 - h : -h) : (play ? 304 : 320);
    X.drawImage(getBand(ve, top), 0, y0);
    if (ART.bandAnim[ve.id]) {
      X.save(); X.beginPath(); X.rect(0, y0, PLAY_W, h); X.clip();
      ART.bandAnim[ve.id](T, bandKit(X, y0, h, top), h, top);
      X.restore();
    }
  }
}

/** Seitenränder (nur PC) mit großen senkrechten Wut-Leisten, am Handy die Streifen oben/unten */
function drawFrame(ve, T, bros) {
  const OX = VIEW.OX, W = VIEW.W;
  drawBands(ve, T, !!bros);
  if (OX <= 0) return;
  baseT();
  X.drawImage(getFrame(ve), 0, 0);
  if (ve.drawSide) for (const x of [0, W - OX]) {
    X.save(); X.beginPath(); X.rect(x, 0, OX, H); X.clip();
    ve.drawSide(T, x, OX);
    X.restore();
  }
  if (!bros) return;
  bros.forEach((b, i) => {
    // Leiste eher außen, damit man innen den Rand der Karte sieht (Bus, Wände ...)
    const cx = i ? W - 9 : 9, mx = Math.round(cx - 5), y0 = 44, h = 248;
    txtS(b.name, cx, 32, '#ddd', 1, 'c');
    X.fillStyle = '#000'; X.fillRect(mx - 1, y0 - 1, 12, h + 2);
    X.fillStyle = '#1a1a1e'; X.fillRect(mx, y0, 10, h);
    const fh = Math.round(h * b.anger / 100);
    const blink = Game.state === 'play' && b.anger >= 90 && (Game.T * 8 | 0) % 2;   // kurz vorm Explodieren
    X.fillStyle = blink ? '#fff' : angerColor(b.anger); X.fillRect(mx, y0 + h - fh, 10, fh);
    X.fillStyle = 'rgba(0,0,0,.35)';
    X.fillRect(mx, y0 + h - h * .5, 10, 1); X.fillRect(mx, y0 + h - h * .8, 10, 1);
    X.fillStyle = b.color; X.fillRect(mx + 2, y0 + h + 4, 6, 6);
    if (b.asleep) txt('Z', cx, y0 + h + 4, '#9fd8ff', 1, 'c');
  });
}

const HUD_BG = '#16131b';   // Farbe der HUD-Leisten (statt reinem Schwarz)
/** Hintergrund für Menüs: Schauplatz abgedunkelt */
function drawBackdrop(ve, T, withBros) {
  drawVenue(ve, T);
  if (withBros) withBros.forEach(drawBro);
  drawFrame(ve, T, null);
  baseT();
  X.fillStyle = HUD_BG; X.fillRect(0, 0, VIEW.W, 26); X.fillRect(0, 304, VIEW.W, 16);
  shade();
  if (VIEW.OY) { X.fillStyle = 'rgba(0,0,0,.62)'; X.fillRect(0, -VIEW.OY, VIEW.W, VIEW.OY); X.fillRect(0, 320, VIEW.W, VIEW.OY); }
}
function shade(a = .5) { X.fillStyle = `rgba(0,0,0,${a})`; X.fillRect(0, 26, VIEW.W, 278); }
/** Kasten mit Rahmen */
function panel(x, y, w, h, border = '#6e6452') {
  X.fillStyle = 'rgba(0,0,0,.55)'; X.fillRect(x + 1, y + 1, w + 1, h + 1);
  X.fillStyle = '#1c1a17'; X.fillRect(x, y, w, h);
  X.fillStyle = border; X.fillRect(x, y, w, 1); X.fillRect(x, y + h - 1, w, 1); X.fillRect(x, y, 1, h); X.fillRect(x + w - 1, y, 1, h);
}

/** Text für das Ziel eines Levels */
function goalText(lv) {
  const g = lv.goal || { type: 'survive' };
  if (lv.sandbox) return lv.time > 5000 ? 'NO LIMIT. JUST HAVE FUN.' : 'PLAY ' + fmtTime(lv.time) + '. NO STRESS.';
  if (g.type === 'collect') return 'COLLECT ' + g.n + ' SETLISTS IN ' + fmtTime(lv.time);
  if (g.type === 'stage') return 'SURVIVE ' + fmtTime(lv.time) + ', THEN BOTH ON STAGE';
  return 'SURVIVE ' + fmtTime(lv.time) + ' TIL THE GIG';
}
/** Bonusziel mit Fortschritt fürs HUD */
function bonusHud(lv, stats) {
  const bo = lv.bonus, def = bo && BONUS[bo.type];
  if (!def) return null;
  const v = def.value(stats), ok = def.ok(v, bo.n);
  let s = def.text(bo.n);
  if (['bin', 'serve', 'fans', 'locks', 'sleep'].includes(bo.type)) s += ' ' + Math.min(v, bo.n) + '/' + bo.n;
  return { s, ok };
}

/* ---------- HUD während des Spiels ---------- */
function drawHUD(game, interactive) {
  const W = VIEW.W, OX = VIEW.OX, cx = W / 2, lv = game.level, g = lv.goal || {};
  const TY = -VIEW.OY, BY = VIEW.OY;   // Handy: Leisten an den Bildschirmrand schieben
  // Handy: die Leisten werden höher, vom Streifen mit Umgebung bleiben nur ~14 px sichtbar
  const TB = 26 + Math.max(0, VIEW.OY - 14), dy = TB - 26, tall = dy > 8 ? 4 : 0;
  const HY = TY + (dy >> 1), RY = TY + dy;          // Kopfzeile / Zeile mit den Wut-Leisten
  const BH = VIEW.OY >= 12 ? Math.max(28, VIEW.OY + 2) : 16, BB = 320 + BY - BH;   // untere Leiste
  drawFrame(game.venue, game.T, game.bros);
  X.fillStyle = HUD_BG; X.fillRect(0, TY, W, TB); X.fillRect(0, BB, W, BH);

  // Oben Mitte: Zeit bzw. Ziel
  const left = Math.max(0, lv.time - game.el);
  let top, col = '#ffd84a';
  if (game.phase === 'stagecall') { top = 'ON STAGE! ' + fmtTime(game.stageT); col = (game.T * 4 | 0) % 2 ? '#ff5a4a' : '#ffd84a'; }
  else if (g.type === 'collect') top = game.stats.collected + '/' + g.n + ' SETLISTS ' + fmtTime(left);
  else if (lv.endless) top = 'NEXT CITY ' + fmtTime(left);
  else if (lv.sandbox) top = lv.time > 5000 ? 'SOUNDCHECK' : 'SOUNDCHECK ' + fmtTime(left);
  else top = 'GIG IN ' + fmtTime(left);
  if (left <= 10 && game.state === 'play' && game.phase !== 'stagecall' && (game.T * 4 | 0) % 2) col = '#ff5a4a';
  txtS(top, cx, 3 + HY, col, 1, 'c');
  txt(levelLabel(lv), OX + 3, 3 + HY, '#666');
  if (lv.endless) {
    txt(String(Endless.liveScore(game)), W - 24, 3 + HY, '#ffd84a', 1, 'r');
    if (Endless.cur && Endless.cur.kind === 'rowdy') txt('X2', OX + 4 + textW(levelLabel(lv)) + 4, 3 + HY, '#ff5a4a');
  }

  // Wut-Leisten oben
  game.bros.forEach((b, i) => {
    const bx = OX + (i ? 94 : 4);
    X.fillStyle = b.color; X.fillRect(bx, 13 + RY, 6, 8 + tall);
    txt(b.name, bx + 8, 15 + RY + (tall >> 1), '#ccc');
    X.fillStyle = '#222'; X.fillRect(bx + 22, 14 + RY, 58, 6 + tall);
    X.fillStyle = angerColor(b.anger); X.fillRect(bx + 23, 15 + RY, Math.round(56 * b.anger / 100), 4 + tall);
    if (b.hidden) txt('LIFT', bx + 51, 15 + RY + (tall >> 1), '#fff', 1, 'c');
  });

  // Angekündigte Events blinken am rechten Rand
  game.warnings.forEach((w, i) => {
    const x = OX + PLAY_W - 15, y = 38 + i * 15, on = (game.T * 6 | 0) % 2;
    const ic = typeof w.ev.icon === 'function' ? w.ev.icon(w.ctx) : (w.ev.icon || '!');
    X.fillStyle = '#000'; X.fillRect(x - 1, y - 1, 14, 14);
    X.fillStyle = on ? '#ffd84a' : '#a0601a'; X.fillRect(x, y, 12, 12);
    txt(ic, x + 6, y + 4, '#000', 1, 'c');
  });

  // Aktive Modifikatoren (Endlos) als kleine Liste links
  const live = game.state === 'play' && App.scene === 'play';
  if (live) game.mods.forEach((m, i) => txt(MODIFIERS[m].name, OX + 3, 38 + i * 7, 'rgba(255,138,58,.8)'));

  if (game.toast && live) txtS(game.toast.text, cx, 44, game.toast.c, 1, 'c');
  if (game.slowT > 0) txtS('SLOW-MO ' + Math.ceil(game.slowT), cx, 52, '#9fd8ff', 1, 'c');

  // Untere Leiste: Power-ups links und rechts, dazwischen Bonusziel oder Score
  for (let s = 0; s < 2; s++) {
    const id = game.slots[s], def = POWERUPS[id];
    const used = game.slotUsed[s] || !def || Save.powerupCount(id) <= 0;
    const bw = BH > 16 ? 52 : 40, x = s ? OX + PLAY_W - bw - 2 : OX + 2;
    UI.button(x, BB + 1, bw, BH - 3, def ? def.short : '-', () => game.usePowerUp(s), {
      disabled: !interactive || used, noDefault: true,
      draw(b, hl) {
        const c = used ? '#444' : hl ? '#ffd84a' : '#ff8a3a';
        txt(def ? def.short : '-', b.x + b.w / 2 + (VIEW.pc ? 3 : 0), b.y + (b.h >> 1) - 2, c, 1, 'c');
        if (VIEW.pc) txt(String(s + 1), b.x + 3, b.y + (b.h >> 1) - 2, '#555');
      },
    });
  }
  // Bonusziel (Tour) bzw. Stadt-Mission (Never-Ending Tour)
  const bh = bonusHud(lv, game.stats);
  if (bh) { drawStar(cx - textW(bh.s) / 2 - 8, BB + (BH >> 1) - 4, bh.ok); txt(bh.s, cx + 1, BB + (BH >> 1) - 3, bh.ok ? '#7cfc6a' : '#999', 1, 'c'); }

  // Pause-Knopf oben rechts (große Trefferfläche für Finger)
  if (interactive) UI.button(W - 26, TY, 26, HY - TY + 14, '',   // Trefferfläche bis zum Bildschirmrand () => App.pause(), {
    bare: true, noDefault: true,
    draw(b, hl) { X.fillStyle = hl ? '#ffd84a' : '#aaa'; X.fillRect(W - 9, HY + 2, 2, 7); X.fillRect(W - 5, HY + 2, 2, 7); },
  });

  if (game.state === 'intro') drawIntro(game);
  else drawTutorial(game);
}

/** Startkarte vor einem Level */
function drawIntro(game) {
  const lv = game.level, OX = VIEW.OX, cx = VIEW.W / 2, rec = Save.level(lv.id);
  shade(.6);
  panel(OX + 8, 50, PLAY_W - 16, 214, lv.headliner ? '#ffd84a' : '#4a4a58');
  txt(levelLabel(lv) + (lv.headliner ? '  HEADLINER' : ''), cx, 58, lv.headliner ? '#ffd84a' : '#888', 1, 'c');
  const sc = textW(lv.name, 2) <= PLAY_W - 24 ? 2 : 1;
  txtS(lv.name, cx, 70, '#fff', sc, 'c');
  txt(goalText(lv), cx, 92, '#9fd8ff', 1, 'c');
  wrapText(lv.hint || '', 38).forEach((l, i) => txt(l, cx, 108 + i * 8, '#ccc', 1, 'c'));

  // Die drei Sterne
  const rows = ['GIG PLAYED', 'ANGER NEVER OVER 90%', bonusText(lv.bonus) || '-'];
  txt('STARS', cx, 166, '#ffd84a', 1, 'c');
  rows.forEach((r, i) => { drawStar(OX + 22, 177 + i * 11, rec && rec.stars > i); txt(r, OX + 32, 178 + i * 11, '#bbb'); });

  if (Save.data.loadout.length) {
    const names = game.slots.map(id => POWERUPS[id] ? POWERUPS[id].short : '-').join(' + ');
    txt('POWER-UPS: ' + names, cx, 220, '#ff8a3a', 1, 'c');
  }
  if ((App.T * 2 | 0) % 2) txtS(VIEW.pc ? 'CLICK OR ENTER TO START' : 'TAP TO START', cx, 244, '#fff', 1, 'c');
}

/** Tutorial-Hinweis mit Pfeil */
function drawTutorial(game) {
  const st = game.tutStep();
  if (!st) return;
  const OX = VIEW.OX, lines = wrapText(st.text, 40);
  panel(OX + 4, 60, PLAY_W - 8, 8 + lines.length * 8, '#ffd84a');
  lines.forEach((l, i) => txt(l, VIEW.W / 2, 64 + i * 8, '#fff', 1, 'c'));
  let tgt = null;
  if (st.point === 'bro0') tgt = game.bros[0];
  else if (st.point === 'bro1') tgt = game.bros[1];
  else if (st.point === 'item') tgt = game.items.find(i => i.type === st.spawn);
  if (tgt) {
    const bounce = Math.round(Math.sin(game.T * 8) * 2);
    drawArrowDown(Math.round(game.sx(tgt.x)), Math.round(tgt.y - (tgt.type ? 22 : 44)) + bounce);
  }
}

/** Fortschrittsbalken beim langen Drücken (Debug-Menü) */
function drawLongPress() {
  const lp = App.lp, z = lp && App.lpZone();
  if (!z || lp.t < .15) return;
  const w = Math.round(z.w * Math.min(1, lp.t / CONFIG.LONG_PRESS));
  X.fillStyle = '#000'; X.fillRect(z.x, z.y + z.h, z.w, 3);
  X.fillStyle = '#ff8a3a'; X.fillRect(z.x, z.y + z.h + 1, w, 1);
}

/* =========================================================================
   Bildschirme
   ========================================================================= */
const Screens = {

  /* ----- Hauptmenü ----- */
  menu() {
    const cx = VIEW.W / 2, T = App.T, OX = VIEW.OX;
    drawBackdrop(VENUES.bus, T);
    shade(.35);

    // Oben: Sterne links, Plektren rechts
    drawStar(OX + 4, 9, true); txt(String(Save.totalStars()), OX + 12, 9, '#ffd84a');
    drawPicks(OX + PLAY_W - 4, 9);

    txtS('BROTHERS', cx, 40, '#ffd84a', 3, 'c');
    txt('TWO BROTHERS. ONE BAND. ONE BUS.', cx, 64, '#ccc', 1, 'c');

    // Hauptknöpfe, jeweils mit kurzem Stand darunter
    const bx = cx - 64, bw = 128;
    const done = LEVELS.filter(l => (Save.level(l.id) || {}).done).length;
    // Die Knöpfe sehen aus wie Konzert-Tickets (siehe ticket() unten)
    UI.button(bx, 82, bw, 28, 'TOUR', () => App.go('select'),
      { sub: done + '/' + LEVELS.length + ' LEVELS', bare: true, draw: ticket('bus') });
    const eu = Save.endlessUnlocked();
    UI.button(bx, 115, bw, 28, 'NEVER-ENDING TOUR', () => App.go('endlessSetup'),
      { disabled: !eu, sub: eu ? 'BEST: ' + Save.data.endlessBest + ' CITIES' : 'BEAT THE REHEARSAL ROOM', bare: true, draw: ticket('road') });
    UI.button(bx, 148, bw, 20, 'SOUNDCHECK', () => App.go('sandbox'), { sub: 'FREE PLAY', bare: true, draw: ticket('mic') });
    UI.button(bx, 173, bw / 2 - 2, 20, 'SHOP', () => App.go('shop'), { noDefault: true, bare: true, draw: ticket('pick') });
    UI.button(cx + 2, 173, bw / 2 - 2, 20, 'EXTRAS', () => App.go('extras'), { noDefault: true, bare: true, draw: ticket('star') });
    UI.button(bx, 198, bw / 2 - 2, 20, 'HOW TO PLAY', () => App.go('howto'), { noDefault: true, bare: true, draw: ticket('help') });
    UI.button(cx + 2, 198, bw / 2 - 2, 20, 'INFO', () => App.go('info'), { noDefault: true, bare: true, draw: ticket('info') });

    // Deko: die zwei Brüder - mal zanken sie, mal lachen sie zusammen
    const k = makeBro('kev', 40, { x: cx - 26, y: 266 }), d = makeBro('del', 40, { x: cx + 26, y: 266 });
    drawBro(k); drawBro(d);
    const ph = (T / 3 | 0) % 3;
    if (ph === 2) txtS('HA HA!', cx, 236, '#7cfc6a', 1, 'c');
    else if ((T * 1.5 | 0) % 2) txtS('#@%!', cx, 236, '#ff8a3a', 1, 'c');

    if (TEST_MODE) txt(VIEW.pc ? 'TEST MODE  -  F2 = DEBUG' : 'TEST MODE  -  HOLD LOGO = DEBUG', cx, 290, '#a06030', 1, 'c');
    txt('V' + CONFIG.VERSION, cx, 309, '#444', 1, 'c');
  },

  /* ----- Spielanleitung ----- */
  howto() {
    const cx = VIEW.W / 2, OX = VIEW.OX, T = App.T;
    drawBackdrop(VENUES.bus, T);
    txtS('HOW TO PLAY', cx, 7, '#ffd84a', 2, 'c');
    const x0 = OX + 6, w = PLAY_W - 12;
    // Jede Zeile: kleines Bild links, Text rechts
    const rows = [
      [b => { const k = makeBro('kev', 30, { x: b + 10, y: 32 }); k.drag = 1; drawBro(k); },
        ['DRAG A BROTHER AWAY.', "ONLY 2 SECONDS, THEN", 'HE BREAKS FREE!']],
      [b => { drawBro(makeBro('del', 30, { x: b + 10, y: 29 })); txt('EASY', b + 1, -2, '#9fd8ff'); },
        ['TAP A BROTHER TO', 'CALM HIM DOWN.']],
      [b => { ITEMS.beer.draw(b + 6, 22); ITEMS.guitar.draw(b + 16, 22); },
        ['TAP BAD STUFF TO BIN IT.', 'BEER, GUITARS, PAPERS...']],
      [b => { ITEMS.tea.draw(b + 6, 22); ITEMS.chips.draw(b + 16, 22); },
        ['DRAG GOOD STUFF TO A', 'BROTHER. TEA, CHIPS...']],
      [b => { drawBro(makeBro('kev', 95, { x: b + 6, y: 29 })); drawBro(makeBro('del', 95, { x: b + 18, y: 29 })); },
        ['CLOSE = ANGRIER.', '100% AND TOUCHING', '= FIGHT. GIG OVER!']],
      [b => { X.fillStyle = (T * 6 | 0) % 2 ? '#ffd84a' : '#a0601a'; X.fillRect(b + 5, 8, 12, 12); txt('!', b + 11, 12, '#000', 1, 'c'); },
        ['A BLINKING SIGN MEANS', 'SOMETHING IS COMING.']],
    ];
    rows.forEach(([pic, lines], i) => {
      const y = 30 + i * 38;
      panel(x0, y, w, 34);
      X.save(); X.translate(0, y + 4); pic(x0 + 4); X.restore();
      lines.forEach((l, k) => txt(l, x0 + 34, y + 6 + k * 8, k === 0 ? '#fff' : '#aaa'));
    });
    if (VIEW.pc) txt('SPACE/P PAUSE  R RESTART  1/2 POWER-UPS', cx, 262, '#777', 1, 'c');
    else txt('POWER-UPS: BUTTONS AT THE BOTTOM', cx, 262, '#777', 1, 'c');
    UI.button(cx - 84, 284, 80, 16, 'BACK', () => App.go('menu'));
    UI.button(cx + 4, 284, 80, 16, 'ALL INFO', () => App.go('info'), { noDefault: true });
  },

  /* ----- Info-Seite: alles zum Nachlesen ----- */
  info() {
    const cx = VIEW.W / 2, OX = VIEW.OX;
    drawBackdrop(VENUES.backstage, App.T);
    txtS('INFO', cx, 7, '#ffd84a', 2, 'c');
    const tabs = ['STUFF', 'EVENTS', 'PLACES', 'PEOPLE', 'POWER', 'TWISTS'];
    drawTabs(tabs, App.infoTab, i => { App.infoTab = i; App.infoPage = 0; });
    const list = infoEntries(App.infoTab), per = 8;
    const pages = Math.max(1, Math.ceil(list.length / per));
    App.infoPage = clamp(App.infoPage, 0, pages - 1);
    const x0 = OX + 4, w = PLAY_W - 8;
    list.slice(App.infoPage * per, App.infoPage * per + per).forEach((e, i) => {
      const y = 50 + i * 27;
      panel(x0, y, w, 25);
      // Bild links (auf seinen Kasten begrenzt)
      X.save(); X.beginPath(); X.rect(x0 + 1, y + 1, 22, 23); X.clip();
      e.icon(x0 + 12, y + 22);
      X.restore();
      txt(e.name, x0 + 27, y + 3, e.color || '#fff');
      wrapText(e.desc || '', 34).slice(0, 2).forEach((l, k) => txt(l, x0 + 27, y + 11 + k * 7, '#999'));
    });
    if (pages > 1) {
      UI.button(OX + 20, 266, 24, 14, '<', () => { App.infoPage = (App.infoPage - 1 + pages) % pages; }, { noDefault: true });
      UI.button(OX + PLAY_W - 44, 266, 24, 14, '>', () => { App.infoPage = (App.infoPage + 1) % pages; }, { noDefault: true });
      txt('PAGE ' + (App.infoPage + 1) + '/' + pages, cx, 270, '#888', 1, 'c');
    }
    UI.button(cx - 40, 286, 80, 16, 'BACK', () => App.go('menu'));
  },

  /* ----- Code eingeben ----- */
  code() {
    const cx = VIEW.W / 2, OX = VIEW.OX;
    drawBackdrop(VENUES.backstage, App.T);
    txtS('ENTER CODE', cx, 7, '#ffd84a', 2, 'c');
    txt(TEST_MODE ? 'TEST MODE IS ON' : 'NORMAL MODE', cx, 34, TEST_MODE ? '#ff8a3a' : '#888', 1, 'c');

    // Eingabefeld mit blinkendem Cursor
    panel(OX + 20, 44, PLAY_W - 40, 20, '#ffd84a');
    const shown = App.codeText + ((App.T * 2 | 0) % 2 ? '_' : ' ');
    txtS(shown, cx, 50, '#fff', 2, 'c');

    // Bildschirm-Tastatur im deutschen QWERTZ-Layout, Reihen versetzt wie auf einer echten Tastatur
    const rows = ['1234567890', 'QWERTZUIOP', 'ASDFGHJKL', 'YXCVBNM'];
    const kw = 15, kh = 18, gap = 2, x0 = OX + (PLAY_W - (10 * kw + 9 * gap)) / 2, y0 = 74;
    const shift = [0, 0, kw / 2, kw];   // Versatz pro Reihe
    rows.forEach((row, r) => row.split('').forEach((ch, i) => {
      UI.button(Math.round(x0 + shift[r] + i * (kw + gap)), y0 + r * (kh + 3), kw, kh, ch, () => App.typeCode(ch), { noDefault: true });
    }));
    // DEL rechts neben YXCVBNM, OK als breite Taste darunter (wie die Leertaste)
    const delX = Math.round(x0 + shift[3] + 7 * (kw + gap));
    UI.button(delX, y0 + 3 * (kh + 3), OX + PLAY_W - (OX + (PLAY_W - (10 * kw + 9 * gap)) / 2) - delX, kh, 'DEL', () => App.backspaceCode(), { noDefault: true, color: '#ff8a8a' });
    UI.button(OX + 40, y0 + 4 * (kh + 3) + 2, PLAY_W - 80, kh, 'OK', () => App.submitCode(), { color: '#7cfc6a' });

    if (App.codeMsg) wrapText(App.codeMsg.text, 40).forEach((l, i) => txtS(l, cx, 202 + i * 9, App.codeMsg.c, 1, 'c'));
    if (VIEW.pc) txt('TYPE ON YOUR KEYBOARD, ENTER = OK', cx, 266, '#666', 1, 'c');
    UI.button(cx - 40, 284, 80, 16, 'BACK', () => App.go('extras'), { noDefault: true });
  },

  /* ----- Level-Auswahl ----- */
  select() {
    const W = VIEW.W, OX = VIEW.OX, cx = W / 2;
    drawBackdrop(VENUES[VENUE_ORDER[App.venueIdx]], App.T);
    txtS('TOUR', cx, 7, '#ffd84a', 2, 'c');
    drawStar(OX + 150, 9, true);
    txt(String(Save.totalStars()), OX + 157, 9, '#ffd84a');

    const vid = VENUE_ORDER[App.venueIdx], ve = VENUES[vid];
    UI.button(OX + 4, 32, 18, 16, '<', () => App.changeVenue(-1), { noDefault: true });
    UI.button(OX + 158, 32, 18, 16, '>', () => App.changeVenue(1), { noDefault: true });
    txtS((App.venueIdx + 1) + '. ' + ve.name, cx, 38, '#fff', 1, 'c');
    wrapText(ve.rule, 40).forEach((l, i) => txt(l, cx, 54 + i * 7, '#9fd8ff', 1, 'c'));

    VENUE_ORDER.forEach((id, i) => {
      X.fillStyle = i === App.venueIdx ? '#ffd84a' : Save.venueUnlocked(id) ? '#666' : '#2a2a30';
      X.fillRect(cx - VENUE_ORDER.length * 4 + i * 8 + 2, 70, 4, 4);
    });

    const levels = levelsOf(vid);
    if (!Save.venueUnlocked(vid)) {
      drawLock(cx - 3, 120, '#aaa');
      txt('NEED ' + ve.starsToUnlock + ' STARS', cx, 134, '#aaa', 1, 'c');
    } else {
      levels.forEach((lv, i) => {
        const open = Save.levelUnlocked(lv), rec = Save.level(lv.id);
        UI.button(OX + 10, 80 + i * 20, 160, 17, '', () => App.startLevel(lv), {
          disabled: !open,
          draw(b, hl) {
            const col = !open ? '#555' : hl ? '#ffd84a' : lv.headliner ? '#ffb040' : '#fff';
            txt(String(i + 1), b.x + 5, b.y + 6, col);
            if (open) txt(lv.name, b.x + 17, b.y + 6, col);
            else drawLock(b.x + 17, b.y + 4, '#555');
            for (let s = 0; s < 3; s++) drawStar(b.x + b.w - 22 + s * 7, b.y + 6, rec && rec.stars > s);
          },
        });
      });
    }
    UI.button(cx - 40, 284, 80, 16, 'BACK', () => App.go('menu'), { noDefault: true });
  },

  /* ----- Pause ----- */
  pause() {
    const cx = VIEW.W / 2, lv = Game.level;
    shade();
    txtS('PAUSED', cx, 66, '#fff', 2, 'c');
    txt(levelLabel(lv) + ': ' + lv.name, cx, 86, '#aaa', 1, 'c');
    UI.button(cx - 50, 104, 100, 20, 'RESUME', () => App.resume());
    if (lv.endless) {
      UI.button(cx - 50, 130, 100, 20, 'END THIS RUN', () => { App.go('play'); Game.finish(false, 'YOU CALLED IT A DAY'); });
      UI.button(cx - 50, 156, 100, 20, 'MAIN MENU', () => { Endless.active = false; App.go('menu'); });
      Game.mods.forEach((m, i) => txt(MODIFIERS[m].name + ': ' + MODIFIERS[m].desc, cx, 196 + i * 8, '#ff8a3a', 1, 'c'));
    } else {
      UI.button(cx - 50, 130, 100, 20, 'RESTART', () => App.restart());
      UI.button(cx - 50, 156, 100, 20, lv.sandbox ? 'SETTINGS' : 'LEVELS', () => App.toSelect());
      UI.button(cx - 50, 182, 100, 20, 'MAIN MENU', () => App.go('menu'));
      txt(goalText(lv), cx, 214, '#9fd8ff', 1, 'c');
      if (lv.bonus) { drawStar(cx - textW(bonusText(lv.bonus)) / 2 - 8, 223, false); txt(bonusText(lv.bonus), cx + 1, 224, '#bbb', 1, 'c'); }
    }
    if (VIEW.pc) txt('SPACE/P/ESC = RESUME  R = RESTART', cx, 250, '#666', 1, 'c');
  },

  /* ----- Ergebnis nach dem Level ----- */
  result() {
    const cx = VIEW.W / 2, OX = VIEW.OX, r = App.result, lv = r.level;
    shade(.78);
    let y;
    if (lv.sandbox) {
      txtS(r.win ? 'NICE ONE!' : 'FIGHT!', cx, 44, r.win ? '#7cfc6a' : '#ff4a3a', 3, 'c');
      txt(r.win ? 'SOUNDCHECK DONE.' : (r.reason || 'THEY HAD A FIGHT.'), cx, 70, '#fff', 1, 'c');
      txt('CALMED ' + r.stats.calms + '   BINNED ' + r.stats.binned + '   SERVED ' + r.stats.served, cx, 86, '#888', 1, 'c');
      y = 110;
    } else if (r.win) {
      txtS('GIG ON!', cx, 44, '#7cfc6a', 3, 'c');
      txt(lv.headliner ? 'LIVE IN ' + lv.city + '!' : 'THE CROWD GOES MAD.', cx, 68, '#fff', 1, 'c');
      for (let s = 0; s < 3; s++) drawStar(cx - 25 + s * 18, 80, r.stars > s, 2);
      const rows = [['GIG PLAYED', true], ['ANGER NEVER OVER 90%', r.starAnger], [bonusText(lv.bonus) || 'NO BONUS', r.starBonus]];
      rows.forEach(([t, ok], i) => { drawStar(OX + 24, 98 + i * 10, ok); txt(t, OX + 34, 99 + i * 10, ok ? '#ddd' : '#666'); });
      txt('BINNED ' + r.stats.binned + '   SERVED ' + r.stats.served + '   MAX ' + Math.round(r.stats.maxAnger) + '%', cx, 134, '#888', 1, 'c');
      y = 146;
    } else {
      const fight = !r.reason;
      txtS(fight ? 'FIGHT!' : 'GIG OVER', cx, 44, '#ff4a3a', fight ? 3 : 2, 'c');
      txt(fight ? 'GIG CANCELLED.' : r.reason, cx, 70, '#fff', 1, 'c');
      txt('LASTED ' + Math.floor(r.time) + ' OF ' + lv.time + 'S', cx, 82, '#aaa', 1, 'c');
      // Ursachen nur bei einer Prügelei; bei anderen Gründen (z. B. Publikum weg) steht der Grund schon oben
      if (fight && r.causes && r.causes.length) { txt('WHAT HAPPENED:', cx, 98, '#888', 1, 'c'); txt(r.causes.join(' + '), cx, 107, '#ff8a3a', 1, 'c'); }
      y = 122;
    }
    if (r.picks > 0) { drawPick(cx - 16, y); txt('+' + r.picks, cx - 7, y + 1, '#ff8a3a'); }
    r.awards.forEach((id, i) => txtS('NEW AWARD: ' + ACHIEVEMENTS[id].name, cx, y + 12 + i * 9, '#ffd84a', 1, 'c'));
    if (r.newPoster) txtS('NEW GIG POSTER!', cx, y + 12 + r.awards.length * 9, '#ffb0d0', 1, 'c');

    if (Game.endT < .6 && App.scene === 'result' && !r.fromGig) return;   // kurz warten, damit hektisches Tippen nichts auslöst
    let by = Math.max(196, y + 16 + (r.awards.length + (r.newPoster ? 1 : 0)) * 9);
    if (r.win && r.next) { UI.button(cx - 50, by, 100, 20, 'NEXT LEVEL', () => App.startLevel(r.next)); by += 26; }
    UI.button(cx - 50, by, 100, 20, 'RETRY', () => App.restart()); by += 26;
    UI.button(cx - 50, by, 100, 20, lv.sandbox ? 'SETTINGS' : 'LEVELS', () => App.toSelect(), { noDefault: true });
    if (!r.win && (App.T * 2 | 0) % 2) txtS('TAP ANYWHERE TO RETRY', cx, 284, '#fff', 1, 'c');
  },

  /* ----- Gig-Szene nach einem Headliner ----- */
  gig() {
    const W = VIEW.W, cx = W / 2, g = App.gig, T = App.T;
    baseT();
    X.fillStyle = '#05040c'; X.fillRect(0, 0, W, H);
    // Lichtkegel
    const cols = ['rgba(255,216,74,.12)', 'rgba(255,90,160,.1)', 'rgba(90,160,255,.12)'];
    for (let k = 0; k < 6; k++) {
      const x = cx + Math.sin(T * 1.3 + k) * 70;
      X.fillStyle = cols[k % 3];
      for (let y = 30; y < 200; y += 4) { const w = 4 + (y - 30) * .25; X.fillRect(Math.round(x + (cx - x) * (y - 30) / 400 - w / 2), y, Math.round(w), 4); }
    }
    // Bühne
    X.fillStyle = '#2a2018'; X.fillRect(0, 150, W, 50);
    X.fillStyle = '#111'; X.fillRect(0, 196, W, 6);
    X.fillStyle = '#222'; X.fillRect(cx - 20, 118, 40, 26);   // Drums
    X.fillStyle = '#c0c0c8'; X.fillRect(cx - 16, 130, 8, 8); X.fillRect(cx + 8, 130, 8, 8);
    txtS('BROTHERS', cx, 122, '#ffd84a', 1, 'c');
    // Die Band
    const jump = (T * 4 | 0) % 2;
    const a = { ...makeBro(Game.bros[0].id, 10, { x: cx - 40, y: 176 - jump }), walk: T * 2 };
    const b = { ...makeBro(Game.bros[1].id, 10, { x: cx + 40, y: 176 - (1 - jump) }) };
    drawBro(a); drawBro(b);
    X.fillStyle = '#c8641e'; X.fillRect(cx - 44, 163 - jump, 8, 6); X.fillStyle = '#5a3a1a'; X.fillRect(cx - 36, 160 - jump, 8, 1);   // Gitarre
    X.fillStyle = '#666'; X.fillRect(cx + 47, 155, 1, 20); X.fillStyle = '#333'; X.fillRect(cx + 45, 153, 3, 3);                        // Mikro
    // Crowd: je mehr Sterne, desto voller
    const n = 40 + g.stars * 45;
    for (let k = 0; k < n; k++) {
      const x = (k * 41 + 7) % (W - 4), y = 208 + (k * 29) % 90, j = ((k + (T * 5 | 0)) % 4 === 0) ? 3 : 0;
      X.fillStyle = ['#e2b38f', '#c08a60', '#8a5a3a', '#f0c8a0'][k % 4]; X.fillRect(x, y - j, 5, 5);
      X.fillStyle = ['#3a2412', '#111', '#d8b040', '#6a2a1a'][k % 4]; X.fillRect(x, y - j, 5, 1);
      if (k % 4 === 0) { X.fillStyle = '#e2b38f'; X.fillRect(x + 5, y - 5 - j, 1, 4); }
    }
    txtS('LIVE IN', cx, 36, '#fff', 1, 'c');
    txtS(g.city + '!', cx, 46, '#ffd84a', 3, 'c');
    for (let s = 0; s < 3; s++) drawStar(cx - 25 + s * 18, 76, g.stars > s, 2);
    const words = ['YEAH!', 'WONDERFUL!', 'ENCORE!', 'LIVE FOREVER!', 'LOVE SPREADS!'];
    if (g.t > .5) txtS(words[(T * 1.2 | 0) % words.length], cx + Math.round(Math.sin(T * 2) * 30), 100, '#ff8aff', 1, 'c');
    if (g.t > 1 && (T * 2 | 0) % 2) txtS('TAP TO CONTINUE', cx, 306, '#fff', 1, 'c');
  },

  /* ----- Shop ----- */
  shop() {
    const OX = VIEW.OX, cx = VIEW.W / 2;
    drawBackdrop(VENUES.bus, App.T);
    txtS('SHOP', cx, 7, '#ffd84a', 2, 'c');
    drawPicks(OX + PLAY_W - 4, 9);
    drawTabs(['POWER-UPS', 'OUTFITS', 'BUS PAINT'], App.shopTab, i => { App.shopTab = i; });
    const x0 = OX + 6, w = PLAY_W - 12;

    if (App.shopTab === 0) {
      Object.keys(POWERUPS).forEach((id, i) => {
        const p = POWERUPS[id], y = 52 + i * 28, cnt = Save.powerupCount(id);
        panel(x0, y, w, 25);
        txt(p.name, x0 + 4, y + 4, '#fff');
        txt(p.desc, x0 + 4, y + 13, '#888');
        if (cnt !== Infinity) txt('X' + cnt, x0 + 100, y + 4, '#ff8a3a');   // im Testmodus unendlich
        UI.button(x0 + w - 40, y + 4, 36, 16, 'BUY', () => App.buy('powerup', id), { sub: String(p.price), noDefault: true });
      });
      txt('TAKE ALONG (2 PER LEVEL):', cx, 198, '#ccc', 1, 'c');
      [0, 1].forEach(s => {
        const id = Save.data.loadout[s];
        UI.button(x0 + s * (w / 2 + 2), 208, w / 2 - 2, 20, 'SLOT ' + (s + 1), () => App.cycleLoadout(s), { sub: POWERUPS[id] ? POWERUPS[id].short : '-' });
      });
      txt('TAP A SLOT TO CHANGE IT', cx, 234, '#666', 1, 'c');
    } else if (App.shopTab === 1) {
      // Vorschau der beiden Brüder
      panel(x0, 50, w, 40);
      const k = makeBro('kev', 10, { x: cx - 30, y: 84 }), d = makeBro('del', 10, { x: cx + 30, y: 84 });
      drawBro(k); drawBro(d);
      Object.keys(OUTFITS).forEach((id, i) => {
        const o = OUTFITS[id], y = 96 + i * 26, owned = Save.owns('outfits', id);
        panel(x0, y, w, 23);
        X.fillStyle = o.color || '#555'; X.fillRect(x0 + 4, y + 4, 6, 15);
        txt(o.name, x0 + 14, y + 5, '#fff');
        if (owned) {
          ['kev', 'del'].forEach((c, j) => UI.button(x0 + w - 70 + j * 34, y + 4, 31, 15, CHARACTERS[c].name, () => App.equipOutfit(c, id), { active: Save.outfitOf(c) === id, noDefault: true }));
        } else {
          txt(o.price + ' PICKS', x0 + 14, y + 13, '#ff8a3a');
          UI.button(x0 + w - 40, y + 4, 36, 15, 'BUY', () => App.buy('outfit', id), { noDefault: true });
        }
      });
    } else {
      Object.keys(PAINTS).filter(id => !PAINTS[id].secret || Save.owns('paints', id)).forEach((id, i) => {
        const p = PAINTS[id], y = 54 + i * 30, owned = Save.owns('paints', id);
        panel(x0, y, w, 26);
        X.fillStyle = p.wall; X.fillRect(x0 + 4, y + 4, 18, 18); X.fillStyle = p.trim; X.fillRect(x0 + 4, y + 11, 18, 3);
        txt(p.name, x0 + 28, y + 6, '#fff');
        if (owned) UI.button(x0 + w - 48, y + 5, 44, 16, Save.paintId() === id ? 'ON' : 'USE', () => App.equipPaint(id), { active: Save.paintId() === id, noDefault: true });
        else { txt(p.price + ' PICKS', x0 + 28, y + 15, '#ff8a3a'); UI.button(x0 + w - 48, y + 5, 44, 16, 'BUY', () => App.buy('paint', id), { noDefault: true }); }
      });
      txt('PAINTS THE INSIDE OF THE TOUR BUS', cx, 264, '#666', 1, 'c');
    }
    if (App.msg) txtS(App.msg.text, cx, 270, App.msg.c, 1, 'c');
    UI.button(cx - 40, 284, 80, 16, 'BACK', () => App.go('menu'), { noDefault: true });
  },

  /* ----- Extras: Erfolge, Plakate, Highscores ----- */
  extras() {
    const OX = VIEW.OX, cx = VIEW.W / 2;
    drawBackdrop(VENUES.backstage, App.T);
    shade(.75);  // Hintergrund deutlich dunkler, damit die Listen gut lesbar sind
    txtS('EXTRAS', cx, 7, '#ffd84a', 2, 'c');
    drawTabs(['AWARDS', 'POSTERS', 'SCORES'], App.extrasTab, i => { App.extrasTab = i; });
    const x0 = OX + 6, w = PLAY_W - 12;

    if (App.extrasTab === 0) {
      const ids = Object.keys(ACHIEVEMENTS), per = 10, pages = Math.ceil(ids.length / per);
      App.awardsPage = clamp(App.awardsPage || 0, 0, pages - 1);
      ids.slice(App.awardsPage * per, App.awardsPage * per + per).forEach((id, i) => {
        const a = ACHIEVEMENTS[id], y = 50 + i * 18, ok = !!Save.data.achievements[id], hidden = a.secret && !ok;
        X.fillStyle = ok ? (a.secret ? '#fff27a' : '#7cfc6a') : '#2a2a30'; X.fillRect(x0, y + 2, 6, 6);
        txt(hidden ? '???' : a.name, x0 + 10, y, ok ? '#fff' : '#777');
        txt(hidden ? 'SECRET' : a.desc, x0 + 10, y + 7, ok ? '#9a9' : '#555');
      });
      if (pages > 1) {
        UI.button(x0, 232, 24, 14, '<', () => { App.awardsPage = (App.awardsPage - 1 + pages) % pages; }, { noDefault: true });
        UI.button(x0 + w - 24, 232, 24, 14, '>', () => { App.awardsPage = (App.awardsPage + 1) % pages; }, { noDefault: true });
        txt('PAGE ' + (App.awardsPage + 1) + '/' + pages, cx, 236, '#888', 1, 'c');
      }
    } else if (App.extrasTab === 1) {
      VENUE_ORDER.forEach((vid, i) => {
        const x = x0 + (i % 3) * 57, y = 54 + ((i / 3) | 0) * 92;
        drawPoster(x, y, 54, 86, vid, !!Save.data.posters[vid]);
      });
      txt('WIN A HEADLINER TO GET ITS POSTER', cx, 244, '#888', 1, 'c');
    } else {
      txt('NEVER-ENDING TOUR', cx, 52, '#ffd84a', 1, 'c');
      txt('BEST: ' + Save.data.endlessBest + ' CITIES', cx, 62, '#ccc', 1, 'c');
      const hs = Save.data.highscores;
      if (!hs.length) txt('NO RUNS YET', cx, 90, '#666', 1, 'c');
      hs.forEach((h, i) => {
        const y = 80 + i * 22;
        panel(x0, y, w, 19);
        txt((i + 1) + '.', x0 + 4, y + 3, '#ffd84a');
        txt(String(h.score), x0 + 18, y + 3, '#fff');
        txt(h.cities + ' CITIES', x0 + w - 4, y + 3, '#9fd8ff', 1, 'r');
        txt((PAIRS[h.pair] || PAIRS.brothers).name + '  ' + (h.date || ''), x0 + 18, y + 11, '#777');
      });
    }
    UI.button(x0, 264, w / 2 - 2, 16, 'VIBRATE: ' + (Save.data.settings.vibrate ? 'ON' : 'OFF'), () => { Save.data.settings.vibrate = !Save.data.settings.vibrate; Save.write(); buzz(40); }, { noDefault: true });
    UI.button(x0 + w / 2 + 2, 264, w / 2 - 2, 16, 'ENTER CODE', () => App.openCode(), { noDefault: true });
    UI.button(cx - 40, 284, 80, 16, 'BACK', () => App.go('menu'), { noDefault: true });
  },

  /* ----- Never-Ending Tour: Paar wählen ----- */
  endlessSetup() {
    const OX = VIEW.OX, cx = VIEW.W / 2;
    drawBackdrop(VENUES.festival, App.T);
    txtS('NEVER-ENDING', cx, 4, '#ffd84a', 1, 'c');
    txtS('TOUR', cx, 12, '#ffd84a', 2, 'c');
    ['DRIVE ACROSS THE MAP FROM CITY TO CITY.', '20 SECONDS PER GIG. ANGER CARRIES OVER.', 'PICK YOUR STOPS: GIGS, ROWDY NIGHTS (X2),', 'REST STOPS AND SERVICE STATIONS.'].forEach((s, i) => txt(s, cx, 30 + i * 8, '#ccc', 1, 'c'));
    txt('CHOOSE YOUR PAIR:', cx, 68, '#9fd8ff', 1, 'c');
    Object.keys(PAIRS).forEach((id, i) => {
      const p = PAIRS[id], open = Save.pairUnlocked(id), y = 78 + i * 40;
      UI.button(OX + 8, y, PLAY_W - 16, 36, '', () => Endless.start(id), {
        disabled: !open,
        draw(b, hl) {
          const a = makeBro(p.bros[0], 10, { x: b.x + 14, y: b.y + 33 }), c = makeBro(p.bros[1], 10, { x: b.x + 30, y: b.y + 33 });
          if (open) { drawBro(a); drawBro(c); } else drawLock(b.x + 18, b.y + 14, '#555');
          txt(p.name, b.x + 44, b.y + 9, !open ? '#555' : hl ? '#ffd84a' : '#fff');
          txt(open ? p.desc : 'REACH ' + p.unlockCities + ' CITIES', b.x + 44, b.y + 19, open ? '#9a9' : '#555');
        },
      });
    });
    txt('BEST: ' + Save.data.endlessBest + ' CITIES', cx, 246, '#888', 1, 'c');
    UI.button(cx - 40, 284, 80, 16, 'BACK', () => App.go('menu'), { noDefault: true });
  },

  /* ----- Übergang zwischen zwei Städten: Punkte + Wahl der nächsten Station ----- */
  transition() {
    const cx = VIEW.W / 2, OX = VIEW.OX, E = Endless, b = E.lastCity;
    shade(.88);
    txtS('CITY ' + E.section + ' DONE!', cx, 30, '#7cfc6a', 2, 'c');
    drawTourMap(OX + 10, 46, E.history, true);

    // Punkte-Aufschlüsselung
    const rows = [['TIME', '+' + b.time], ['CALM SECONDS', '+' + b.calm], ['BINNED', '+' + b.binned],
      ['MISSION', b.ok ? '+' + b.mission : 'MISSED'], ['CITY BONUS', '+' + b.city]];
    if (b.mult > 1) rows.push(['ROWDY NIGHT', 'X' + b.mult]);
    let y = 62;
    rows.forEach(([l, v], k) => {
      txt(l, OX + 34, y, '#999');
      txt(v, OX + 146, y, k === 3 && !b.ok ? '#ff5a4a' : k === 5 ? '#ff5a4a' : '#fff', 1, 'r');
      y += 7;
    });
    txt('CITY', OX + 34, y + 2, '#ffd84a'); txt('+' + b.total, OX + 146, y + 2, '#ffd84a', 1, 'r');
    txtS('SCORE ' + E.score, cx, y + 12, '#ffd84a', 1, 'c');
    y += 24;

    // Neuer Twist / Power-ups aufgefüllt
    if (E.newMod) {
      const m = MODIFIERS[E.newMod];
      panel(OX + 8, y, PLAY_W - 16, 22, '#ff8a3a');
      txt('NEW TWIST: ' + m.name, cx, y + 4, '#ff8a3a', 1, 'c');
      txt(m.desc, cx, y + 13, '#ccc', 1, 'c');
      y += 26;
    }
    if (E.restocked) { txt('MANAGER RESTOCKED YOUR POWER-UPS', cx, y, '#9fd8ff', 1, 'c'); y += 10; }

    // Weiter zur Landkarte
    y = Math.max(y + 6, 190);
    const ang = E.anger || [0, 0];
    txt('NOW: ' + Game.bros.map((x, i) => x.name + ' ' + Math.round(ang[i]) + '%').join('   '), cx, y, '#888', 1, 'c');
    UI.button(cx - 55, y + 12, 110, 22, 'TO THE MAP', () => App.go('tourmap'), { disabled: App.transT < .6 });
  },


  /* ----- Never-Ending Tour: Landkarte, Wahl des nächsten Halts ----- */
  tourmap() {
    const cx = VIEW.W / 2, OX = VIEW.OX, E = Endless, T = App.T, mv = App.mapMove;
    if (!mv) fitMapCam([E.pos, ...E.routes.map(r => r.city)]);
    drawMapBase(OX, T);
    // Gefahrene Strecke
    for (let i = 1; i < E.path.length; i++) mapRoad(E.path[i - 1], E.path[i], '#e8c050', false);
    for (const c of E.path) { const p = mapXY(c); X.fillStyle = '#e8c050'; X.fillRect(p.x - 1, p.y - 1, 3, 3); }
    // Die Halte zur Auswahl (gestrichelte Straßen dorthin)
    const sel = clamp(App.mapSel, 0, E.routes.length - 1);
    E.routes.forEach((r, k) => {
      mapRoad(E.pos, r.city, k === sel ? '#ffffff' : '#8a8a96', true);
      const p = mapXY(r.city), R = ROUTES[r.kind], on = k === sel;
      if (on) { const s = 7 + ((T * 4 | 0) % 2); X.fillStyle = 'rgba(255,255,255,.25)'; X.fillRect(p.x - s, p.y - s, s * 2 + 1, s * 2 + 1); }
      mapNode(p.x, p.y, r, on);
      const lw = textW(r.city), lx = clamp(p.x - lw / 2, OX + 2, OX + PLAY_W - lw - 2), ly = p.y + 8 > 222 ? p.y - 14 : p.y + 8;
      X.fillStyle = 'rgba(0,0,0,.6)'; X.fillRect(lx - 1, ly - 1, lw + 2, 7);
      txt(r.city, lx, ly, on ? '#fff' : R.color);
      UI.button(p.x - 9, p.y - 9, 19, 19, '', () => { if (App.mapSel === k) E.choose(k); else App.mapSel = k; }, { bare: true, noDefault: true, disabled: !!mv, draw() {} });
    });
    // Der Bus (fährt bei einer Wahl los)
    let bp = mapXY(E.pos);
    if (mv) { const a = mapXY(mv.from), b = mapXY(mv.to), t = Math.min(1, mv.t / 1.2), e = t * t * (3 - 2 * t); bp = { x: a.x + (b.x - a.x) * e, y: a.y + (b.y - a.y) * e }; }
    drawMapBus(Math.round(bp.x), Math.round(bp.y), T);

    // Kopfzeile
    X.fillStyle = 'rgba(14,12,20,.85)'; X.fillRect(OX, 0, PLAY_W, 24);
    txtS('NEXT STOP?', OX + 4, 4, '#ffd84a', 1);
    txt('CITY ' + (E.section + 1) + '   SCORE ' + E.score, OX + PLAY_W - 4, 4, '#cfc3a6', 1, 'r');
    const ang = E.anger || [0, 0];
    txt(Game.bros.map((x, i) => x.name + ' ' + Math.round(ang[i]) + '%').join('  '), OX + 4, 14, '#9a9a9a');
    if (E.stopMsg) txtS(E.stopMsg.text, cx, 30, E.stopMsg.c, 1, 'c');

    // Infokasten zum gewählten Halt
    const r = E.routes[sel];
    if (!r) return;
    const R = ROUTES[r.kind], y0 = 230;
    panel(OX + 4, y0, PLAY_W - 8, 74, R.color);
    txt(R.name, OX + 10, y0 + 5, R.color);
    txtS(r.city, OX + PLAY_W - 10, y0 + 5, '#fff', 1, 'r');
    let y = y0 + 15;
    if (r.venue) {
      const ve = VENUES[r.venue];
      X.fillStyle = ve.color; X.fillRect(OX + 10, y, 4, 4);
      txt(ve.name, OX + 17, y, '#9fd8ff'); y += 9;
      txt('MISSION: ' + bonusText(r.mission), OX + 10, y, '#ccc'); y += 9;
    }
    R.perks().forEach(p => { txt(p, OX + 10, y, '#bbb'); y += 8; });
    UI.button(OX + PLAY_W - 64, y0 + 54, 56, 16, R.gig ? "LET'S GO" : 'STOP HERE', () => E.choose(sel), { disabled: !!mv });
    if (VIEW.pc) txt('1-3 OR ARROWS', OX + 10, y0 + 60, '#555');
  },

  /* ----- Sandbox: SOUNDCHECK, alles frei einstellbar ----- */
  sandbox() {
    const cx = VIEW.W / 2, OX = VIEW.OX, sb = App.sb;
    const venues = VENUE_ORDER.filter(v => Save.venueUnlocked(v));
    const pairs = Object.keys(PAIRS).filter(id => Save.pairUnlocked(id));
    if (!venues.includes(sb.venue)) sb.venue = venues[0];
    if (!pairs.includes(sb.pair)) sb.pair = pairs[0];
    drawBackdrop(VENUES[sb.venue], App.T);
    txtS('SOUNDCHECK', cx, 7, '#ffd84a', 2, 'c');
    txt('PLAY HOW YOU LIKE. NO STARS, NO STRESS.', cx, 30, '#cfc3a6', 1, 'c');
    const cyc = (list, v, d) => list[(list.indexOf(v) + d + list.length) % list.length];
    const rows = [
      ['PLACE', VENUES[sb.venue].name, d => { sb.venue = cyc(venues, sb.venue, d); }],
      ['BAND', PAIRS[sb.pair].name, d => { sb.pair = cyc(pairs, sb.pair, d); }],
      ['PACE', SANDBOX.pace[sb.pace].name, d => { sb.pace = (sb.pace + d + SANDBOX.pace.length) % SANDBOX.pace.length; }],
      ['TIME', SANDBOX.time[sb.time].name, d => { sb.time = (sb.time + d + SANDBOX.time.length) % SANDBOX.time.length; }],
      ['FIGHTS', sb.safe ? 'OFF (CAN\'T LOSE)' : 'ON', () => { sb.safe = !sb.safe; }],
      ['ITEMS', sb.items ? 'ON' : 'OFF', () => { sb.items = !sb.items; }],
      ['EVENTS', sb.events ? 'ON' : 'OFF', () => { sb.events = !sb.events; }],
    ];
    rows.forEach(([label, val, fn], i) => {
      const y = 46 + i * 24;
      panel(OX + 6, y, PLAY_W - 12, 20, '#3a3630');
      txt(label, OX + 11, y + 8, '#9a9080');
      UI.button(OX + 48, y + 2, 16, 16, '<', () => fn(-1), { noDefault: true });
      txt(val, OX + 111, y + 8, '#fff', 1, 'c');
      UI.button(OX + PLAY_W - 26, y + 2, 16, 16, '>', () => fn(1), { noDefault: true });
    });
    UI.button(cx - 50, 222, 100, 24, 'START', () => App.startSandbox());
    UI.button(cx - 40, 284, 80, 16, 'BACK', () => App.go('menu'), { noDefault: true });
  },

  /* ----- Ende der Never-Ending Tour ----- */
  endlessOver() {
    const cx = VIEW.W / 2, OX = VIEW.OX, L = Endless.last;
    shade(.88);
    txtS('TOUR OVER', cx, 30, '#ff4a3a', 2, 'c');
    txt(L.reason || 'THEY HAD A FIGHT.', cx, 47, '#ccc', 1, 'c');
    drawTourMap(OX + 10, 58, Endless.history, false);
    txtS(L.cities + (L.cities === 1 ? ' CITY' : ' CITIES'), cx, 74, '#ffd84a', 2, 'c');
    txt('SCORE ' + L.score + '   MISSIONS ' + L.missions, cx, 92, '#fff', 1, 'c');
    let y = 102;
    if (L.rank === 0) { txtS('NEW HIGHSCORE!', cx, y, '#7cfc6a', 1, 'c'); y += 9; }
    else if (L.newBest) { txtS('NEW RECORD: MOST CITIES!', cx, y, '#7cfc6a', 1, 'c'); y += 9; }
    if (L.picks > 0) { drawPick(cx - 16, y); txt('+' + L.picks, cx - 7, y + 1, '#ff8a3a'); y += 10; }
    L.awards.forEach(id => { txtS('NEW AWARD: ' + ACHIEVEMENTS[id].name, cx, y, '#ffd84a', 1, 'c'); y += 9; });
    L.unlockedPairs.forEach(id => { txtS('UNLOCKED: ' + PAIRS[id].name, cx, y, '#9fd8ff', 1, 'c'); y += 9; });
    y = Math.max(y + 4, 140);
    txt('HIGHSCORES', cx, y, '#888', 1, 'c');
    Save.data.highscores.forEach((h, i) => txt((i + 1) + '. ' + h.score + '  ' + h.cities + ' CITIES', cx, y + 10 + i * 8, i === L.rank ? '#ffd84a' : '#aaa', 1, 'c'));
    if (App.T - App.sceneT < .6) return;
    UI.button(cx - 50, 240, 100, 20, 'GO AGAIN', () => Endless.start(Endless.pair));
    UI.button(cx - 50, 266, 100, 20, 'MAIN MENU', () => App.go('menu'), { noDefault: true });
  },

  /* ----- Debug-Menü (nur im Testmodus) ----- */
  debug() {
    const W = VIEW.W, OX = VIEW.OX, cx = W / 2;
    baseT();
    X.fillStyle = 'rgba(10,5,0,.93)'; X.fillRect(0, 0, W, H);
    txtS('DEBUG MENU', cx, 6, '#ff8a3a', 2, 'c');
    const x0 = OX + 10, bw = 160;
    let y = 24;
    const inLevel = (App.scene === 'play' || App.scene === 'pause') && Game.state === 'play';

    if (inLevel) {
      UI.button(x0, y, bw, 13, Game.level.endless ? 'FINISH THIS CITY' : 'WIN LEVEL NOW', () => { App.closeDebug(); if (App.scene === 'pause') App.go('play'); Game.forceWin(); }); y += 17;
      Game.bros.forEach((b, i) => {
        txt(b.name + ' ' + Math.round(b.anger) + '%', x0, y + 4, '#ccc');
        [0, 50, 95].forEach((v, k) => UI.button(x0 + 64 + k * 33, y, 30, 12, String(v), () => Game.setAnger(i, v)));
        y += 15;
      });
      y += 2;
      txt('TRIGGER EVENT', x0, y, '#ff8a3a'); y += 8;
      const evs = Object.keys(EVENTS);
      evs.forEach((id, k) => UI.button(x0 + (k % 2) * 82, y + ((k / 2) | 0) * 14, 78, 12, EVENTS[id].name.slice(0, 18), () => { Game.queueEvent(id); App.closeDebug(); }));
      y += Math.ceil(evs.length / 2) * 14 + 3;
      txt('ADD MODIFIER', x0, y, '#ff8a3a'); y += 8;
      const mods = Object.keys(MODIFIERS);
      mods.forEach((id, k) => UI.button(x0 + (k % 2) * 82, y + ((k / 2) | 0) * 14, 78, 12, MODIFIERS[id].name.slice(0, 18), () => { Game.addModifier(id); App.closeDebug(); }));
      y += Math.ceil(mods.length / 2) * 14 + 4;
    } else {
      txt('START A LEVEL FOR', cx, y + 4, '#888', 1, 'c');
      txt('ANGER/EVENT/WIN OPTIONS', cx, y + 12, '#888', 1, 'c');
      y += 28;
      UI.button(x0, y, bw, 13, 'UNLOCK ENDLESS PAIRS (BEST=9)', () => { Save.data.endlessBest = Math.max(9, Save.data.endlessBest); Save.write(); App.debugMsg = { text: 'DONE', t: 1.5 }; }); y += 17;
      UI.button(x0, y, bw, 13, 'ADD 500 PICKS', () => { Save.addPicks(500); App.debugMsg = { text: '+500 PICKS', t: 1.5 }; }); y += 17;
    }

    const armed = App.resetArmed > 0;
    UI.button(x0, y, bw, 13, armed ? 'REALLY RESET? TAP AGAIN' : 'RESET SAVE', () => {
      if (armed) { Save.reset(); for (const v of Object.values(VENUES)) v._bg = null; App.resetArmed = 0; App.debugMsg = { text: 'SAVE RESET', t: 1.5 }; }
      else App.resetArmed = 2.5;
    }, { color: '#ff8a8a', noDefault: true });

    UI.button(x0, 288, bw, 16, 'CLOSE', () => App.closeDebug());
    if (App.debugMsg) txtS(App.debugMsg.text, cx, 278, '#7cfc6a', 1, 'c');
    txt('STARS ' + Save.totalStars() + '  WINS ' + Save.data.stats.wins + '  BINNED ' + Save.data.stats.binned, cx, 310, '#555', 1, 'c');
  },
};

/* ---------- Einträge der Info-Seite ----------
   Wird direkt aus den Daten-Dateien gebaut: Neue Gegenstände, Events usw.
   tauchen automatisch auf (Feld "desc" = Beschreibung).
   icon(x, y) zeichnet ein Bild, (x, y) = Mitte unten im Kasten. */
function infoEntries(tab) {
  const box = (ch, col) => (x, y) => { X.fillStyle = '#000'; X.fillRect(x - 7, y - 16, 14, 14); X.fillStyle = col; X.fillRect(x - 6, y - 15, 12, 12); txt(ch, x, y - 11, '#000', 1, 'c'); };
  const kinds = { bad: ['TAP AWAY', '#ff8a8a'], good: ['DRAG TO HIM', '#7cfc6a'], collect: ['COLLECT', '#ffd84a'], hazard: ['TRIP HAZARD', '#ffb060'] };
  switch (tab) {
    case 0: return Object.keys(ITEMS).filter(id => id !== 'setlistfight' && !ITEMS[id].secret).map(id => {
      const d = ITEMS[id], k = kinds[d.kind] || ['', '#fff'];
      return { name: d.name + '  ' + k[0], color: k[1], desc: d.desc, icon: (x, y) => d.draw(x, y - 1, { t: 0 }) };
    });
    case 1: return Object.keys(EVENTS).map(id => {
      const e = EVENTS[id], ic = typeof e.icon === 'function' ? '>' : (e.icon || '!');
      return { name: e.name, desc: e.desc, icon: box(ic, '#ffd84a') };
    });
    case 2: return VENUE_ORDER.map((id, i) => {
      const v = VENUES[id];
      return { name: (i + 1) + '. ' + v.name, desc: v.rule + (v.starsToUnlock ? ' (' + v.starsToUnlock + ' STARS)' : ''),
        icon: (x, y) => X.drawImage(getVenueBG(v), 18, 60, 144, 160, x - 11, y - 19, 22, 20) };
    });
    case 3: {
      const out = ['kev', 'del'].map(id => {
        const c = CHARACTERS[id];
        return { name: c.name, desc: c.desc, icon: (x, y) => drawBro(makeBro(id, 20, { x, y: y + 9 })) };
      });
      out.push({ name: 'TAMBOURINE MAN', desc: EXTRAS.tambourine.desc, icon: (x, y) => drawPerson(x, y, '#5a2a7a', { hair: '#d8b040' }) });
      out.push({ name: 'THE DRUMMER', desc: EXTRAS.drummer.desc, icon: (x, y) => { drawPerson(x, y, '#222', { hair: '#111' }); X.fillStyle = '#c0c0c8'; X.fillRect(x - 10, y - 6, 5, 5); X.fillRect(x + 5, y - 6, 5, 5); } });
      out.push({ name: 'THE MANAGER (YOU)', desc: 'SHOWS UP WHEN YOU USE A POWER-UP.', icon: (x, y) => drawPerson(x, y, '#2a2a30', { hair: '#888' }) });
      for (const id in PAIRS) if (id !== 'brothers') {
        const p = PAIRS[id], a = CHARACTERS[p.bros[0]], b = CHARACTERS[p.bros[1]];
        out.push({ name: p.name, desc: 'ENDLESS MODE: ' + p.desc + (p.unlockCities ? ' (' + p.unlockCities + ' CITIES)' : ''),
          icon: (x, y) => { drawPerson(x - 5, y, a.color, { hair: a.hair }); drawPerson(x + 5, y, b.color, { hair: b.hair }); } });
      }
      return out;
    }
    case 4: return Object.keys(POWERUPS).map(id => {
      const p = POWERUPS[id];
      return { name: p.name + '  ' + p.price + ' PICKS', color: '#ff8a3a', desc: p.desc + '. ONCE PER LEVEL.', icon: box(p.short[0], '#ff8a3a') };
    });
    default: {
      const out = Object.keys(MODIFIERS).map(id => ({ name: MODIFIERS[id].name, desc: MODIFIERS[id].desc, icon: box('?', '#ff5a4a') }));
      out.unshift({ name: 'WHAT ARE TWISTS?', desc: 'NEVER-ENDING TOUR: EVERY 3 CITIES ONE IS ADDED. THEY STACK!', icon: box('!', '#888') });
      return out;
    }
  }
}

/** Tourkarte der Never-Ending Tour: ein Punkt pro Stadt in der Farbe des Schauplatzes.
    Gelber Punkt darüber = Mission geschafft, rot umrandet = ROWDY NIGHT, X = hier war Schluss. */
function drawTourMap(x0, y0, history, showNext) {
  const n = history.length + (showNext ? 1 : 0), per = 20;
  for (let i = 0; i < n; i++) {
    const x = x0 + (i % per) * 8, y = y0 + ((i / per) | 0) * 9;
    if (i % per) { X.fillStyle = '#444'; X.fillRect(x - 3, y + 2, 3, 1); }   // Straße zur vorigen Stadt
    const h = history[i];
    if (!h) { if ((App.T * 3 | 0) % 2) txt('?', x + 2, y, '#fff', 1, 'c'); continue; }
    if (!h.venue) { X.fillStyle = ROUTES[h.kind].color; X.fillRect(x + 1, y + 1, 3, 3); continue; }   // Rast / Tankstelle
    if (h.kind === 'rowdy') { X.fillStyle = '#ff5a4a'; X.fillRect(x - 1, y - 1, 7, 7); }
    X.fillStyle = '#000'; X.fillRect(x, y, 5, 5);
    X.fillStyle = VENUES[h.venue].color; X.fillRect(x, y, 5, 5);
    if (h.ok) { X.fillStyle = '#ffd84a'; X.fillRect(x + 2, y - 2, 1, 1); }
    if (h.failed) { X.fillStyle = '#fff'; X.fillRect(x, y, 1, 1); X.fillRect(x + 4, y, 1, 1); X.fillRect(x + 1, y + 1, 3, 3); X.fillStyle = VENUES[h.venue].color; X.fillRect(x + 2, y + 1, 1, 1); X.fillRect(x + 1, y + 2, 1, 1); X.fillRect(x + 3, y + 2, 1, 1); X.fillRect(x + 2, y + 3, 1, 1); }
  }
}


/* ---------- Landkarte für die Never-Ending Tour ----------
   Großbritannien und Irland, grob als Umriss (Längengrad, Breitengrad).
   mapXY rechnet eine Stadt in Bildschirm-Pixel um. */
const MAP_LAND = [
  // Großbritannien
  [[-5.7, 50.05], [-5.2, 49.96], [-4.1, 50.33], [-3.6, 50.22], [-3.0, 50.7], [-2.45, 50.55], [-1.3, 50.75], [-0.1, 50.8], [1.35, 51.1],
   [1.45, 51.38], [0.7, 51.45], [1.1, 51.75], [1.35, 51.95], [1.75, 52.5], [1.3, 52.95], [0.3, 52.85], [0.35, 53.15], [0.12, 53.6],
   [-0.08, 54.12], [-0.6, 54.48], [-1.15, 54.65], [-1.35, 54.9], [-2.0, 55.77], [-2.6, 56.0], [-2.6, 56.28], [-2.8, 56.45], [-2.05, 57.15],
   [-2.0, 57.69], [-3.0, 57.65], [-4.1, 57.5], [-3.8, 57.85], [-3.1, 58.45], [-3.37, 58.67], [-5.0, 58.62], [-5.3, 57.9], [-5.8, 57.3],
   [-5.85, 56.9], [-5.6, 56.4], [-5.7, 55.3], [-4.9, 55.6], [-4.9, 55.0], [-5.15, 54.8], [-4.85, 54.65], [-3.6, 54.95], [-3.6, 54.5],
   [-2.9, 54.1], [-3.05, 53.8], [-3.05, 53.4], [-4.0, 53.3], [-4.6, 53.3], [-4.75, 52.8], [-4.1, 52.55], [-4.6, 52.1], [-5.3, 51.88],
   [-5.0, 51.65], [-3.95, 51.57], [-3.15, 51.45], [-2.7, 51.55], [-3.5, 51.2], [-4.55, 51.0], [-5.05, 50.42]],
  // Irland
  [[-7.3, 55.38], [-6.15, 55.22], [-5.7, 54.65], [-5.5, 54.35], [-6.3, 54.0], [-6.05, 53.35], [-6.0, 52.95], [-6.35, 52.17], [-7.0, 52.13],
   [-8.2, 51.8], [-9.8, 51.45], [-10.3, 51.9], [-10.45, 52.15], [-9.6, 52.6], [-9.3, 53.2], [-10.1, 53.5], [-10.0, 54.2], [-8.6, 54.3],
   [-8.8, 54.75], [-8.3, 55.15]],
];
// Kamera der Karte: Mitte (Breite, Länge) und Zoom. Ganze Karte = { lat: 54.4, lon: -4.35, z: 1 }
let MAPCAM = { lat: 54.4, lon: -4.35, z: 1 };
function mapLL(lat, lon) { return { x: VIEW.OX + Math.round(90 + (lon - MAPCAM.lon) * 13.3 * MAPCAM.z), y: Math.round(126 + (MAPCAM.lat - lat) * 22.2 * MAPCAM.z) }; }
/** Kamera so setzen, dass Standort und alle Ziele gut sichtbar sind (möglichst nah heran) */
function fitMapCam(cities) {
  const ps = cities.map(c => CITY_POS[c] || CITY_POS[TOUR_START]);
  const la = ps.map(p => p[0]), lo = ps.map(p => p[1]);
  const lat0 = Math.min(...la), lat1 = Math.max(...la), lon0 = Math.min(...lo), lon1 = Math.max(...lo);
  const z = clamp(Math.min(140 / Math.max(.01, (lon1 - lon0) * 13.3), 150 / Math.max(.01, (lat1 - lat0) * 22.2)), 1, 2.25);
  MAPCAM = { lat: (lat0 + lat1) / 2, lon: (lon0 + lon1) / 2, z: Math.round(z * 4) / 4 };
}
function mapXY(city) { const p = CITY_POS[city] || CITY_POS[TOUR_START]; return mapLL(p[0], p[1]); }

let mapCache = null, mapCacheKey = '';
onViewChange(() => { mapCache = null; });
/** Land als Pixelbild (neu gemalt, wenn sich die Kamera ändert): Wiese mit Strand am Rand */
function getMapImage() {
  const key = MAPCAM.lat + ',' + MAPCAM.lon + ',' + MAPCAM.z + ',' + VIEW.OX;
  if (mapCache && key === mapCacheKey) return mapCache;
  mapCacheKey = key;
  const o = makeCanvas(PLAY_W, H), g = o.getContext('2d'), OX = VIEW.OX;
  g.fillStyle = '#fff';
  for (const poly of MAP_LAND) {
    g.beginPath();
    poly.forEach(([lon, lat], i) => { const p = mapLL(lat, lon); i ? g.lineTo(p.x - OX, p.y) : g.moveTo(p.x - OX, p.y); });
    g.closePath(); g.fill();
  }
  const im = g.getImageData(0, 0, PLAY_W, H), d = im.data, land = new Uint8Array(PLAY_W * H);
  for (let i = 0; i < land.length; i++) land[i] = d[i * 4 + 3] > 110 ? 1 : 0;
  const grass = hex('#4e7a3c'), grass2 = hex('#5a8a44'), sand = hex('#d8c890');
  for (let y = 0; y < H; y++) for (let x = 0; x < PLAY_W; x++) {
    const i = y * PLAY_W + x, k = i * 4;
    if (!land[i]) { d[k + 3] = 0; continue; }
    const coast = !land[i - 1] || !land[i + 1] || !land[i - PLAY_W] || !land[i + PLAY_W];
    const c = coast ? sand : ((x * 7 + y * 13) % 23 === 0 ? grass2 : grass);
    d[k] = c[0]; d[k + 1] = c[1]; d[k + 2] = c[2]; d[k + 3] = 255;
  }
  g.putImageData(im, 0, 0);
  return (mapCache = o);
}
/** Meer, Land, alle Städte als kleine Punkte */
function drawMapBase(OX, T) {
  baseT();
  X.fillStyle = '#2a5a8a'; X.fillRect(0, 0, VIEW.W, H);
  X.fillStyle = '#336aa0';                                                     // Wellen
  for (let y = 30; y < 228; y += 9) for (let x = ((y / 9) % 2) * 9; x < PLAY_W; x += 18) X.fillRect(OX + x + Math.round(Math.sin(T * .8 + y) * 2), y, 4, 1);
  X.drawImage(getMapImage(), OX, 0);
  for (const c in CITY_POS) { const p = mapXY(c); X.fillStyle = Endless.usedCities.includes(c) ? '#6a6a5a' : '#2a3a20'; X.fillRect(p.x, p.y, 2, 2); }
  X.fillStyle = 'rgba(14,12,20,.85)'; X.fillRect(OX, 226, PLAY_W, H - 226);
}
/** Straße zwischen zwei Städten (gestrichelt = mögliche Fahrt) */
function mapRoad(a, b, col, dashed) {
  const p = mapXY(a), q = mapXY(b), n = Math.max(1, Math.round(Math.hypot(q.x - p.x, q.y - p.y)));
  X.fillStyle = col;
  for (let i = 0; i <= n; i++) {
    if (dashed && ((i >> 1) % 2)) continue;
    X.fillRect(Math.round(p.x + (q.x - p.x) * i / n), Math.round(p.y + (q.y - p.y) * i / n), 1, 1);
  }
}
/** Symbol für einen Halt: Gig (Farbe des Schauplatzes), Rast, Tankstelle */
function mapNode(x, y, r, on) {
  X.fillStyle = '#000'; X.fillRect(x - 5, y - 5, 11, 11);
  X.fillStyle = on ? '#fff' : ROUTES[r.kind].color; X.fillRect(x - 4, y - 4, 9, 9);
  X.fillStyle = '#1a1a1e'; X.fillRect(x - 3, y - 3, 7, 7);
  if (r.kind === 'rest') { X.fillStyle = '#7cfc6a'; X.fillRect(x - 2, y - 1, 4, 3); X.fillRect(x + 2, y, 1, 1); X.fillStyle = '#ddd'; X.fillRect(x - 1, y - 3, 1, 1); X.fillRect(x, y - 2, 1, 1); }   // Tasse
  else if (r.kind === 'service') { X.fillStyle = '#9fd8ff'; X.fillRect(x - 2, y - 2, 3, 5); X.fillRect(x + 1, y - 1, 1, 1); X.fillRect(x + 2, y, 1, 2); }   // Zapfsäule
  else {
    X.fillStyle = VENUES[r.venue].color; X.fillRect(x - 2, y - 2, 5, 5);
    if (r.kind === 'rowdy') { X.fillStyle = '#ff5a3a'; X.fillRect(x - 1, y - 6, 3, 2); X.fillStyle = '#ffd84a'; X.fillRect(x, y - 6, 1, 1); }   // Flamme
  }
}
/** Kleiner Tourbus von oben */
function drawMapBus(x, y, T) {
  const b = Math.round(Math.sin(T * 6));
  X.fillStyle = 'rgba(0,0,0,.4)'; X.fillRect(x - 4, y - 1, 10, 4);
  X.fillStyle = '#8a2430'; X.fillRect(x - 5, y - 4 + b, 10, 5);
  X.fillStyle = '#e0d4b0'; X.fillRect(x - 5, y - 2 + b, 10, 1);
  X.fillStyle = '#9fd8ff'; X.fillRect(x + 3, y - 3 + b, 2, 1);
  X.fillStyle = '#111'; X.fillRect(x - 4, y + 1 + b, 2, 1); X.fillRect(x + 2, y + 1 + b, 2, 1);
}

/* ---------- Sandbox (SOUNDCHECK): Auswahl-Listen ---------- */
const SANDBOX = {
  pace: [{ name: 'CHILL', diff: .7, ramp: 99999 }, { name: 'NORMAL', diff: 1, ramp: 99999 }, { name: 'WILD', diff: 1.3, ramp: 80 }],
  time: [{ name: '2 MINUTES', t: 120 }, { name: '5 MINUTES', t: 300 }, { name: 'NO LIMIT', t: 99999 }],
};

/* ---------- Konzert-Ticket als Knopf (Hauptmenü) ----------
   Dunkles, abgegriffenes Ticket mit Abriss links. icon = Bild auf dem Abriss
   ('bus', 'road', 'pick', 'star', 'help', 'info'). Beim Drüberfahren wird es gelb.
   Gibt eine draw-Funktion für UI.button zurück. */
const TICKET = { paper: '#25221e', stub: '#1b1916', edge: '#6e6452', ink: '#cfc3a6', sub: '#7d735f', hot: '#ffd84a', off: '#4a4740' };
function ticket(icon) {
  return (b, hl) => {
    const T = TICKET, lift = hl ? -1 : 0, x = b.x, y = b.y + lift, w = b.w, h = b.h;
    const edge = b.disabled ? T.off : hl ? T.hot : T.edge;
    const ink = b.disabled ? T.off : hl ? T.hot : T.ink;
    const stub = h >= 26 ? 18 : 14;
    X.fillStyle = 'rgba(0,0,0,.6)'; X.fillRect(x + 2, y + 2 - lift, w, h);    // Schatten
    X.fillStyle = T.paper; X.fillRect(x, y, w, h);
    X.fillStyle = T.stub; X.fillRect(x + 1, y + 1, stub - 1, h - 2);           // Abriss links
    // abgegriffenes Papier: ein paar dunkle Pixel in festem Muster
    X.fillStyle = 'rgba(0,0,0,.25)';
    for (let k = 0; k < w * h / 40; k++) X.fillRect(x + 1 + (k * 37) % (w - 2), y + 1 + (k * 23) % (h - 2), 1, 1);
    X.fillStyle = edge;                                                         // Rand
    X.fillRect(x, y, w, 1); X.fillRect(x, y + h - 1, w, 1); X.fillRect(x, y, 1, h); X.fillRect(x + w - 1, y, 1, h);
    for (let k = 2; k < h - 2; k += 2) X.fillRect(x + stub, y + k, 1, 1);       // Perforation
    X.fillStyle = '#0a0a0e';                                                    // Einkerbungen oben/unten
    X.fillRect(x + stub - 1, y, 3, 1); X.fillRect(x + stub, y + 1, 1, 1);
    X.fillRect(x + stub - 1, y + h - 1, 3, 1); X.fillRect(x + stub, y + h - 2, 1, 1);

    // Bild auf dem Abriss
    const ix = Math.round(x + stub / 2), iy = Math.round(y + h / 2);
    if (b.disabled) drawLock(ix - 3, iy - 4, T.off);
    else ticketIcon(icon, ix, iy, ink);

    // Text
    const tx = x + stub + (w - stub) / 2;
    if (b.sub) {
      txt(b.label, tx, y + Math.floor(h / 2) - 7, ink, 1, 'c');
      txt(b.sub, tx, y + Math.floor(h / 2) + 2, b.disabled ? T.off : T.sub, 1, 'c');
    } else txt(b.label, tx, y + Math.floor((h - 5) / 2), ink, 1, 'c');
  };
}
/** Kleine Bilder für die Tickets, (x, y) = Mitte */
function ticketIcon(icon, x, y, ink) {
  X.fillStyle = ink;
  switch (icon) {
    case 'bus':
      X.fillRect(x - 5, y - 3, 11, 6); X.fillStyle = TICKET.stub; X.fillRect(x - 4, y - 2, 2, 2); X.fillRect(x - 1, y - 2, 2, 2); X.fillRect(x + 2, y - 2, 2, 2);
      X.fillStyle = ink; X.fillRect(x - 3, y + 3, 2, 2); X.fillRect(x + 2, y + 3, 2, 2); break;
    case 'road':   // Unendlich-Zeichen
      X.fillRect(x - 5, y - 2, 3, 1); X.fillRect(x - 6, y - 1, 1, 2); X.fillRect(x - 5, y + 1, 3, 1); X.fillRect(x - 2, y - 1, 1, 1); X.fillRect(x - 1, y, 1, 1); X.fillRect(x, y - 1, 1, 1);
      X.fillRect(x + 1, y - 2, 3, 1); X.fillRect(x + 4, y - 1, 1, 2); X.fillRect(x + 1, y + 1, 3, 1); X.fillRect(x - 2, y + 1, 1, 1); X.fillRect(x, y + 1, 1, 1); break;
    case 'pick': X.fillRect(x - 3, y - 3, 6, 4); X.fillRect(x - 2, y + 1, 4, 1); X.fillRect(x - 1, y + 2, 2, 1); break;
    case 'star': for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) if (STAR[r][c] === '1') X.fillRect(x - 2 + c, y - 3 + r, 1, 1); break;
    case 'help': txt('?', x, y - 2, ink, 1, 'c'); break;
    case 'info': txt('I', x, y - 2, ink, 1, 'c'); X.fillRect(x - 1, y - 4, 3, 1); break;
    case 'mic': X.fillRect(x - 1, y - 4, 3, 4); X.fillRect(x - 2, y - 1, 1, 2); X.fillRect(x + 2, y - 1, 1, 2); X.fillRect(x, y + 1, 1, 2); X.fillRect(x - 2, y + 3, 5, 1); break;
  }
}

/** Gig-Plakat (Extras) */
function drawPoster(x, y, w, h, vid, have) {
  const ve = VENUES[vid], lv = levelsOf(vid).find(l => l.headliner);
  if (!have) {
    panel(x, y, w, h, '#2a2a30');
    txt('?', x + w / 2, y + h / 2 - 8, '#444', 2, 'c');
    txt(ve.short, x + w / 2, y + h - 10, '#444', 1, 'c');
    return;
  }
  const bg = { bus: '#7a2230', rehearsal: '#3a1e22', pub: '#5a3a1c', backstage: '#2a2e36', festival: '#141a3a', hotel: '#3a2440' }[vid] || '#333';
  X.fillStyle = '#000'; X.fillRect(x - 1, y - 1, w + 2, h + 2);
  X.fillStyle = '#e8dcc0'; X.fillRect(x, y, w, h);
  X.fillStyle = bg; X.fillRect(x + 3, y + 3, w - 6, h - 6);
  txt('BROTHERS', x + w / 2, y + 7, '#ffd84a', 1, 'c');
  // zwei Silhouetten
  X.fillStyle = '#111';
  X.fillRect(x + w / 2 - 14, y + 30, 10, 18); X.fillRect(x + w / 2 - 12, y + 22, 6, 7);
  X.fillRect(x + w / 2 + 4, y + 30, 10, 18); X.fillRect(x + w / 2 + 6, y + 22, 6, 7); X.fillRect(x + w / 2 + 4, y + 21, 10, 2);
  X.fillStyle = 'rgba(255,216,74,.4)'; X.fillRect(x + 3, y + 48, w - 6, 2);
  txt('LIVE IN', x + w / 2, y + 56, '#fff', 1, 'c');
  txt(lv ? lv.city : ve.short, x + w / 2, y + 64, '#fff', 1, 'c');
  const rec = lv && Save.level(lv.id);
  for (let s = 0; s < 3; s++) drawStar(x + w / 2 - 10 + s * 7, y + 74, rec && rec.stars > s);
}
