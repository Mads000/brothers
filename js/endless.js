/* =========================================================================
   endless.js – Never-Ending Tour (Endlos-Modus)

   Ablauf:
   - Jede Stadt ist ein Abschnitt von 20 Sekunden an einem Schauplatz
     (Vorlage: venue.endless in venues.js)
   - Jede Stadt hat eine kleine Mission (Bonusziel aus goals.js) für Extrapunkte
   - Die Wut bleibt erhalten, sinkt aber auf der Busfahrt etwas
   - Nach jeder Stadt wählst du die nächste Station aus zwei Routen:
       CHILL RIDE   die Brüder beruhigen sich unterwegs (weniger Wut)
       ROWDY NIGHT  doppelte Punkte, aber schwerer
   - Alle 3 Städte: ein neuer Modifikator (stapelt sich) und der Manager
     füllt die Power-ups wieder auf
   - Punkte pro Stadt = Sekunden + ruhige Sekunden + 5 je weggetipptem
     Gegenstand + Mission + Stadtbonus (bei ROWDY alles mal 2)
   ========================================================================= */

// Städte für "Next stop: ..." (einfach erweitern)
const CITIES = ['LEEDS', 'SHEFFIELD', 'BRISTOL', 'CARDIFF', 'NEWCASTLE', 'LEICESTER', 'NOTTINGHAM', 'BRIGHTON',
  'HULL', 'YORK', 'OXFORD', 'BATH', 'DERBY', 'COVENTRY', 'ABERDEEN', 'BELFAST', 'SWANSEA', 'PLYMOUTH',
  'NORWICH', 'EXETER', 'STOKE', 'WIGAN', 'BOLTON', 'DUNDEE', 'PRESTON', 'SUNDERLAND', 'IPSWICH', 'CAMBRIDGE',
  'SOUTHAMPTON', 'PORTSMOUTH', 'BLACKPOOL', 'INVERNESS', 'LINCOLN', 'CARLISLE', 'DUBLIN', 'CORK', 'SPIKE ISLAND'];

// Die zwei Arten von Routen
const ROUTES = {
  normal: { name: 'ON THE ROAD', color: '#ccc', mult: 1 },
  chill: { name: 'CHILL RIDE', color: '#7cfc6a', mult: 1, perks: () => ['-' + CONFIG.ENDLESS.chillRelief + '% ANGER', 'ON THE WAY'] },
  rowdy: { name: 'ROWDY NIGHT', color: '#ff5a4a', mult: 2, perks: () => ['X2 POINTS', 'BUT HARDER'] },
};

const Endless = {
  active: false,
  pair: 'brothers',
  section: 0,       // geschaffte Städte
  score: 0,
  mods: [],         // aktive Modifikatoren
  anger: null,      // Wut, die in die nächste Stadt mitgenommen wird
  slotUsed: [false, false],
  usedCities: [],
  history: [],      // bisherige Städte für die Tourkarte: { venue, kind, ok, failed }
  cur: null,        // aktuelle Station: { venue, city, kind, mission }
  routes: [],       // zwei Stationen zur Auswahl
  newMod: null,     // gerade dazugekommener Modifikator
  restocked: false, // Power-ups wurden gerade aufgefüllt
  lastCity: null,   // Punkte-Aufschlüsselung der letzten Stadt
  missionsDone: 0,
  last: null,       // Ergebnis am Ende

  start(pairId) {
    this.active = true; this.pair = pairId;
    this.section = 0; this.score = 0; this.mods = []; this.anger = null;
    this.slotUsed = [false, false]; this.usedCities = []; this.history = [];
    this.newMod = null; this.restocked = false; this.lastCity = null; this.missionsDone = 0; this.last = null;
    this.cur = this.makeStop([], 'normal');
    this.launch();
  },

  /** Eine mögliche nächste Station: zufälliger Schauplatz und Stadt, dazu eine Mission */
  makeStop(avoidVenues, kind) {
    let pool = VENUE_ORDER.filter(v => Save.venueUnlocked(v) && VENUES[v].endless);
    const fresh = pool.filter(v => !avoidVenues.includes(v));
    if (fresh.length) pool = fresh;
    let free = CITIES.filter(c => !this.usedCities.includes(c));
    if (!free.length) { this.usedCities = []; free = CITIES; }
    const city = pickOne(free);
    this.usedCities.push(city);
    const venue = pickOne(pool);
    return { venue, city, kind, mission: this.pickMission(venue) };
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

  /** Level-Objekt für eine Station bauen */
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
    const E = CONFIG.ENDLESS, mult = ROUTES[this.cur.kind].mult;
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

  /** Stadt geschafft -> Punkte, Busfahrt, Auswahl der nächsten Station */
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
    this.newMod = null; this.restocked = false;
    if (this.section % E.modEvery === 0) {
      const avail = Object.keys(MODIFIERS).filter(m => !this.mods.includes(m));
      if (avail.length) { this.newMod = pickOne(avail); this.mods.push(this.newMod); }
      this.slotUsed = [false, false]; this.restocked = true;
    }
    // Zwei Routen zur Wahl (möglichst verschiedene Schauplätze)
    const a = this.makeStop([this.cur.venue], 'chill');
    const r = this.makeStop([this.cur.venue, a.venue], 'rowdy');
    this.routes = [a, r];
    App.go('transition');
  },

  /** Spieler wählt Route 0 oder 1 */
  choose(i) {
    const r = this.routes[i];
    if (!r) return;
    if (r.kind === 'chill') this.anger = this.anger.map(a => Math.max(0, a - CONFIG.ENDLESS.chillRelief));
    this.cur = r;
    this.launch();
  },

  /** Run vorbei */
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
