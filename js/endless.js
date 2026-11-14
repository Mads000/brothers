/* =========================================================================
   endless.js – Never-Ending Tour (Endlos-Modus)

   Ablauf:
   - Die Tour startet in Manchester. Auf einer Landkarte (Großbritannien und
     Irland) fährt der Bus von Stadt zu Stadt.
   - Nach jeder Stadt wählst du auf der Karte den nächsten Halt aus drei
     Möglichkeiten in der Nähe:
       ON THE ROAD      normaler Gig
       ROWDY NIGHT      Gig mit doppelten Punkten, aber schwerer
       REST STOP        kein Gig: die Brüder erholen sich (viel weniger Wut)
       SERVICE STATION  kein Gig: Power-ups wieder voll, etwas weniger Wut
   - Jeder Gig dauert 20 Sekunden an einem Schauplatz (Vorlage: venue.endless
     in venues.js) und hat eine kleine Mission (Bonusziel aus goals.js).
   - Die Wut bleibt erhalten, sinkt aber auf jeder Busfahrt etwas.
   - Alle 3 Städte: ein neuer Modifikator (stapelt sich) und neue Power-ups.
   - Punkte pro Stadt = Sekunden + ruhige Sekunden + 5 je weggetipptem
     Gegenstand + Mission + Stadtbonus (bei ROWDY alles mal 2)
   ========================================================================= */

// Städte mit Lage auf der Karte (Breitengrad, Längengrad). Einfach erweitern.
const CITY_POS = {
  'MANCHESTER': [53.48, -2.24],
  'LEEDS': [53.80, -1.55], 'SHEFFIELD': [53.38, -1.47], 'BRISTOL': [51.45, -2.59], 'CARDIFF': [51.48, -3.18],
  'NEWCASTLE': [54.97, -1.61], 'LEICESTER': [52.63, -1.13], 'NOTTINGHAM': [52.95, -1.15], 'BRIGHTON': [50.82, -0.14],
  'HULL': [53.74, -0.33], 'YORK': [53.96, -1.08], 'OXFORD': [51.75, -1.26], 'BATH': [51.38, -2.36],
  'DERBY': [52.92, -1.48], 'COVENTRY': [52.41, -1.51], 'ABERDEEN': [57.15, -2.09], 'BELFAST': [54.60, -5.93],
  'SWANSEA': [51.62, -3.94], 'PLYMOUTH': [50.37, -4.14], 'NORWICH': [52.63, 1.30], 'EXETER': [50.72, -3.53],
  'STOKE': [53.00, -2.18], 'WIGAN': [53.55, -2.63], 'BOLTON': [53.58, -2.43], 'DUNDEE': [56.46, -2.97],
  'PRESTON': [53.76, -2.70], 'SUNDERLAND': [54.91, -1.38], 'IPSWICH': [52.06, 1.15], 'CAMBRIDGE': [52.20, 0.12],
  'SOUTHAMPTON': [50.90, -1.40], 'PORTSMOUTH': [50.80, -1.09], 'BLACKPOOL': [53.82, -3.05], 'INVERNESS': [57.48, -4.22],
  'LINCOLN': [53.23, -0.54], 'CARLISLE': [54.89, -2.93], 'DUBLIN': [53.35, -6.26], 'CORK': [51.90, -8.47],
  'SPIKE ISLAND': [53.35, -2.75], 'GLASGOW': [55.86, -4.25], 'EDINBURGH': [55.95, -3.19], 'LONDON': [51.51, -0.13],
  'BIRMINGHAM': [52.48, -1.90], 'LIVERPOOL': [53.41, -2.98], 'GALWAY': [53.27, -9.05],
};
const TOUR_START = 'MANCHESTER';
const CITIES = Object.keys(CITY_POS).filter(c => c !== TOUR_START);

// Arten von Halten auf der Karte. gig = es wird gespielt.
const ROUTES = {
  normal: { name: 'ON THE ROAD', color: '#cfc3a6', mult: 1, gig: true, perks: () => ['A NORMAL GIG'] },
  rowdy: { name: 'ROWDY NIGHT', color: '#ff7a5a', mult: 2, gig: true, perks: () => ['X2 POINTS', 'BUT HARDER'] },
  rest: { name: 'REST STOP', color: '#7cfc6a', gig: false, perks: () => ['NO GIG. THEY CHILL OUT:', '-' + CONFIG.ENDLESS.restRelief + '% ANGER'] },
  service: { name: 'SERVICE STATION', color: '#9fd8ff', gig: false, perks: () => ['NO GIG. POWER-UPS REFILLED', '-' + CONFIG.ENDLESS.serviceRelief + '% ANGER'] },
};

const Endless = {
  active: false,
  pair: 'brothers',
  section: 0,       // gespielte Städte
  score: 0,
  mods: [],         // aktive Modifikatoren
  anger: null,      // Wut, die in die nächste Stadt mitgenommen wird
  slotUsed: [false, false],
  usedCities: [],
  history: [],      // bisherige Halte: { venue, kind, ok, failed }
  pos: TOUR_START,  // wo der Bus gerade steht
  path: [],         // gefahrene Strecke (Städtenamen) für die Karte
  cur: null,        // aktueller Gig: { venue, city, kind, mission }
  routes: [],       // Auswahl auf der Karte (2-3 Halte)
  newMod: null,     // gerade dazugekommener Modifikator
  restocked: false, // Power-ups wurden gerade aufgefüllt
  lastCity: null,   // Punkte-Aufschlüsselung der letzten Stadt
  stopMsg: null,    // Meldung nach einem Halt ohne Gig
  missionsDone: 0,
  last: null,       // Ergebnis am Ende

  start(pairId) {
    this.active = true; this.pair = pairId;
    this.section = 0; this.score = 0; this.mods = []; this.anger = null;
    this.slotUsed = [false, false]; this.usedCities = []; this.history = [];
    this.newMod = null; this.restocked = false; this.lastCity = null; this.missionsDone = 0; this.last = null; this.stopMsg = null;
    this.pos = TOUR_START; this.path = [TOUR_START];
    // erster Gig: eine Stadt in der Nähe von Manchester
    const city = this.nearCities(1)[0];
    this.cur = this.makeStop([], 'normal', city);
    this.pos = city; this.path.push(city);
    this.launch();
  },

  /** Entfernung zweier Städte (grob, reicht für "in der Nähe") */
  cityDist(a, b) {
    const p = CITY_POS[a], q = CITY_POS[b];
    return Math.hypot((p[0] - q[0]) * 1.6, p[1] - q[1]);
  },
  /** n noch nicht besuchte Städte in der Nähe (zufällig aus den nächsten) */
  nearCities(n) {
    let free = CITIES.filter(c => !this.usedCities.includes(c) && c !== this.pos);
    if (free.length < n) { this.usedCities = []; free = CITIES.filter(c => c !== this.pos); }
    free.sort((a, b) => this.cityDist(this.pos, a) - this.cityDist(this.pos, b));
    // aus den nächsten 10 zufällig wählen, aber nicht zu dicht beieinander (für die Karte)
    const pool = free.slice(0, Math.max(n, 10)), out = [];
    for (let tries = 0; out.length < n && pool.length && tries < 60; tries++) {
      const i = (Math.random() * pool.length) | 0, c = pool[i];
      if (tries < 40 && out.some(o => this.cityDist(o, c) < .7)) continue;
      out.push(pool.splice(i, 1)[0]);
    }
    out.forEach(c => this.usedCities.push(c));
    return out;
  },

  /** Ein Halt: Gig an zufälligem Schauplatz mit Mission, oder Rast/Tankstelle */
  makeStop(avoidVenues, kind, city) {
    if (!ROUTES[kind].gig) return { venue: null, city, kind };
    let pool = VENUE_ORDER.filter(v => Save.venueUnlocked(v) && VENUES[v].endless);
    const fresh = pool.filter(v => !avoidVenues.includes(v));
    if (fresh.length) pool = fresh;
    const venue = pickOne(pool);
    return { venue, city, kind, mission: this.pickMission(venue) };
  },

  /** Die Auswahl auf der Karte: immer mindestens ein Gig, nie zwei Pausen hintereinander */
  makeOptions(lastKind) {
    const cities = this.nearCities(3);
    const wasBreak = lastKind && !ROUTES[lastKind].gig;
    const hot = this.anger && Math.max(...this.anger) > 55;
    const third = wasBreak ? 'normal' : pickWeighted({ rest: hot ? 3 : 1.4, service: this.slotUsed.some(x => x) ? 1.6 : .6, normal: 1 });
    const kinds = ['normal', 'rowdy', third].sort(() => Math.random() - .5);
    const avoid = this.cur ? [this.cur.venue] : [];
    const out = cities.map((c, i) => { const s = this.makeStop(avoid, kinds[i], c); if (s.venue) avoid.push(s.venue); return s; });
    return out.sort((a, b) => CITY_POS[a.city][1] - CITY_POS[b.city][1]);   // von West nach Ost
  },

  /** Mission für eine Stadt: allgemeine Aufgaben + die des Schauplatzes */
  pickMission(venueId) {
    const t = VENUES[venueId].endless;
    const pool = [{ type: 'bin', n: 3 + Math.min(3, this.section >> 2) }, { type: 'calms', n: 5 }];
    if (Object.keys(t.items).some(i => ITEMS[i] && ITEMS[i].kind === 'good')) pool.push({ type: 'serve', n: 2 });
    if (!this.anger || Math.max(...this.anger) < 55) pool.push({ type: 'anger', n: 80 });
    pool.push(...(t.missions || []));
    return { ...pickOne(pool) };
  },

  /** Level-Objekt für einen Gig bauen */
  makeLevel(stop) {
    const t = VENUES[stop.venue].endless, rowdy = stop.kind === 'rowdy';
    const extras = this.section >= 4 && Math.random() < .35 ? [pickOne(['tambourine', 'drummer'])] : [];
    const ie = t.itemEvery || [3, 5];
    return {
      id: 'endless', endless: true, venue: stop.venue, name: stop.city, cityNo: this.section + 1,
      time: CONFIG.ENDLESS.sectionTime, ramp: 60,
      items: t.items, itemEvery: rowdy ? [ie[0] * .75, ie[1] * .75] : ie, firstItem: 1.5,
      events: t.events, mech: t.mech, prespawn: t.prespawn, extras,
      bonus: stop.mission,   // die Mission läuft wie ein Bonusziel (Anzeige unten im HUD)
    };
  },

  launch() {
    const E = CONFIG.ENDLESS, lv = this.makeLevel(this.cur);
    Game.start(lv, {
      endless: true, pair: this.pair, keepAnger: this.anger, mods: this.mods,
      diffBase: 1 + this.section * E.rampPerSection + (this.cur.kind === 'rowdy' ? E.rowdyDiff : 0),
      skipIntro: true, slotUsed: this.slotUsed,
    });
    Game.toastMsg('WELCOME TO ' + lv.name + '!', '#ffd84a');
    App.go('play');
  },

  /** Punkte für eine (auch abgebrochene) Stadt, aufgeschlüsselt */
  breakdown(res, done) {
    const E = CONFIG.ENDLESS, mult = ROUTES[this.cur.kind].mult || 1;
    const ok = done && bonusOk(this.cur.mission, res.stats);
    const b = {
      time: Math.floor(res.time), calm: Math.floor(res.stats.calmTime), binned: res.stats.binned * E.binBonus,
      mission: ok ? E.missionBonus : 0, city: done ? E.sectionBonus : 0, mult, ok,
    };
    b.total = (b.time + b.calm + b.binned + b.mission + b.city) * mult;
    return b;
  },
  /** Punkte inklusive der laufenden Stadt (für das HUD) */
  liveScore(game) { return this.score + this.breakdown({ time: game.el, stats: game.stats }, false).total; },

  /** Stadt geschafft -> Punkte, dann Busfahrt auf der Karte */
  sectionDone(res) {
    const E = CONFIG.ENDLESS;
    const b = this.breakdown(res, true);
    this.lastCity = b;
    this.score += b.total;
    if (b.ok) this.missionsDone++;
    this.history.push({ venue: this.cur.venue, kind: this.cur.kind, ok: b.ok });
    this.section++;
    // Busfahrt: ein bisschen Erholung
    this.anger = Game.bros.map(x => Math.max(0, x.anger - E.busRelief));
    this.slotUsed = Game.slotUsed;
    Save.addStats(res); Save.write();
    // Alle 3 Städte: neuer Modifikator, dafür neue Power-ups
    this.newMod = null; this.restocked = false; this.stopMsg = null;
    if (this.section % E.modEvery === 0) {
      const avail = Object.keys(MODIFIERS).filter(m => !this.mods.includes(m));
      if (avail.length) { this.newMod = pickOne(avail); this.mods.push(this.newMod); }
      this.slotUsed = [false, false]; this.restocked = true;
    }
    this.routes = this.makeOptions(this.cur.kind);
    App.go('transition');
  },

  /** Spieler wählt auf der Karte Halt i -> der Bus fährt los (Animation in App) */
  choose(i) {
    const r = this.routes[i];
    if (!r || App.mapMove) return;
    App.mapMove = { from: this.pos, to: r.city, t: 0, stop: r };
  },

  /** Der Bus ist angekommen */
  arrive(r) {
    const E = CONFIG.ENDLESS;
    this.pos = r.city; this.path.push(r.city);
    if (ROUTES[r.kind].gig) { this.cur = r; this.launch(); return; }
    // Halt ohne Gig: Erholung bzw. Power-ups, dann gleich die nächste Auswahl
    const relief = r.kind === 'rest' ? E.restRelief : E.serviceRelief;
    this.anger = (this.anger || [0, 0]).map(a => Math.max(0, a - relief));
    if (r.kind === 'service') this.slotUsed = [false, false];
    this.history.push({ venue: null, kind: r.kind, ok: true });
    this.stopMsg = { text: r.kind === 'rest' ? 'THEY HAD A NAP. -' + relief + '% ANGER' : 'POWER-UPS REFILLED. -' + relief + '% ANGER', t: 3, c: ROUTES[r.kind].color };
    this.routes = this.makeOptions(r.kind);
  },

  /** Run vorbei */
  /** Tour freiwillig beenden (Knopf auf der Karte): Punkte zählen, keine Prügelei */
  quit() {
    if (!this.active) { App.go('menu'); return; }
    this.active = false;
    const picks = Math.floor(this.score / CONFIG.REWARDS.endlessPer);
    Save.addPicks(picks);
    const prevBest = Save.data.endlessBest;
    const rank = Save.addHighscore({ score: this.score, cities: this.section, pair: this.pair, date: new Date().toISOString().slice(0, 10) });
    const awards = Save.checkAchievements({});
    const unlockedPairs = Object.keys(PAIRS).filter(id => PAIRS[id].unlockCities > prevBest && PAIRS[id].unlockCities <= this.section);
    this.last = { score: this.score, cities: this.section, picks, rank, awards, reason: 'YOU ENDED THE TOUR', unlockedPairs, missions: this.missionsDone, newBest: this.section > prevBest };
    App.go('endlessOver');
  },
  fail(res) {
    const b = this.breakdown(res, false);
    this.score += b.total;
    this.history.push({ venue: this.cur.venue, kind: this.cur.kind, failed: true });
    this.active = false;
    Save.addStats(res);
    Save.data.stats.fights++;
    const picks = Math.floor(this.score / CONFIG.REWARDS.endlessPer);
    Save.addPicks(picks);
    const prevBest = Save.data.endlessBest;
    const rank = Save.addHighscore({ score: this.score, cities: this.section, pair: this.pair, date: new Date().toISOString().slice(0, 10) });
    const awards = Save.checkAchievements({});
    const unlockedPairs = Object.keys(PAIRS).filter(id => PAIRS[id].unlockCities > prevBest && PAIRS[id].unlockCities <= this.section);
    this.last = { score: this.score, cities: this.section, picks, rank, awards, reason: res.reason, unlockedPairs, missions: this.missionsDone, newBest: this.section > prevBest };
    App.go('endlessOver');
  },
};
