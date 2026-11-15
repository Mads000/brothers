/* =========================================================================
   save.js – Spielstand in localStorage

   Aufbau des Spielstands (Save.data):
     levels        { 'bus-1': { done, stars, best, plays }, ... }
     picks         Plektren (Währung)
     stats         Zähler für Erfolge (binned, beer, served, wins, fights, mum)
     powerups      Vorrat { tape: 2, ... },  loadout: die 2 mitgenommenen Power-ups
     owned         gekaufte Outfits/Lackierungen,  outfit: { kev: 'parka', ... },  paint
     posters       gesammelte Gig-Plakate { bus: true, ... }
     achievements  freigeschaltete Erfolge { firstgig: true, ... }
     highscores    Never-Ending Tour [{ score, cities, pair, date }]
     endlessBest   meiste Städte in einem Run
     settings      { vibrate, sound, music }

   Wenn localStorage nicht geht (privates Fenster o. Ä.), läuft das Spiel
   trotzdem, nur ohne Speichern.
   ========================================================================= */

const Save = {
  data: null,

  defaults() {
    return {
      v: 2, levels: {}, picks: 0,
      stats: { binned: 0, beer: 0, served: 0, wins: 0, fights: 0, mum: 0, lemons: 0, inTime: 0 },
      secrets: {},   // gefundene Easter-Egg-Codes
      powerups: { ...CONFIG.START_POWERUPS }, loadout: ['tape', 'mum'],
      owned: { outfits: ['default'], paints: ['default'] },
      outfit: {}, paint: 'default',
      posters: {}, rivals: {}, legends: {}, achievements: {}, highscores: [], endlessBest: 0,
      settings: { vibrate: true, sound: true, music: true },
    };
  },

  load() {
    let d = null;
    try { d = JSON.parse(localStorage.getItem(CONFIG.SAVE_KEY)); } catch (e) { d = null; }
    const def = this.defaults();
    if (!d || typeof d !== 'object') { this.data = def; return; }
    // Alte Spielstände mit neuen Feldern auffüllen
    for (const k in def) {
      if (d[k] === undefined) d[k] = def[k];
      else if (def[k] && typeof def[k] === 'object' && !Array.isArray(def[k]) && k !== 'levels' && k !== 'posters' && k !== 'achievements' && k !== 'outfit')
        d[k] = { ...def[k], ...d[k] };
    }
    this.data = d;
  },

  write() {
    try { localStorage.setItem(CONFIG.SAVE_KEY, JSON.stringify(this.data)); } catch (e) { /* egal */ }
  },

  reset() { this.data = this.defaults(); this.write(); },

  /* ---------- Levels ---------- */

  level(id) { return this.data.levels[id] || null; },

  /** Ergebnis eintragen. Gibt zurück, ob das Level zum ersten Mal geschafft wurde. */
  recordResult(lv, res) {
    const rec = this.data.levels[lv.id] || { done: false, stars: 0, best: 0, plays: 0 };
    const first = res.win && !rec.done;
    rec.plays++;
    if (res.win) { rec.done = true; rec.stars = Math.max(rec.stars, res.stars); }
    rec.best = Math.max(rec.best, Math.floor(res.time));
    this.data.levels[lv.id] = rec;
    this.addStats(res);
    if (res.win) this.data.stats.wins++; else this.data.stats.fights++;
    this.write();
    return first;
  },

  /** Zähler aus einem Level übernehmen */
  addStats(res) {
    this.data.stats.binned += res.stats.binned;
    this.data.stats.beer += res.stats.beer;
    this.data.stats.served += res.stats.served;
  },

  totalStars() {
    let n = 0;
    for (const id in this.data.levels) n += this.data.levels[id].stars || 0;
    return n;
  },

  venueUnlocked(venueId) {
    if (TEST_MODE) return true;
    return this.totalStars() >= (VENUES[venueId].starsToUnlock || 0);
  },

  levelUnlocked(lv) {
    if (TEST_MODE) return true;
    if (!this.venueUnlocked(lv.venue)) return false;
    const list = levelsOf(lv.venue), i = list.indexOf(lv);
    return i <= 0 || !!(this.level(list[i - 1].id) || {}).done;
  },

  /* ---------- Endlos-Modus ---------- */

  endlessUnlocked() { return TEST_MODE || !!(this.level(CONFIG.ENDLESS.unlockLevel) || {}).done; },
  pairUnlocked(id) { return TEST_MODE || this.data.endlessBest >= (PAIRS[id].unlockCities || 0); },

  /** Highscore eintragen, gibt den Platz zurück (0 = bester) oder -1 */
  addHighscore(entry) {
    const hs = this.data.highscores;
    hs.push(entry);
    hs.sort((a, b) => b.score - a.score);
    hs.length = Math.min(hs.length, 5);
    this.data.endlessBest = Math.max(this.data.endlessBest, entry.cities);
    this.write();
    return hs.indexOf(entry);
  },

  /* ---------- Plektren und Shop ---------- */

  picks() { return TEST_MODE ? Infinity : this.data.picks; },
  addPicks(n) { this.data.picks += Math.max(0, Math.round(n)); this.write(); },
  /** Bezahlen. Im Testmodus kostet alles nichts. */
  spend(n) {
    if (TEST_MODE) return true;
    if (this.data.picks < n) return false;
    this.data.picks -= n; this.write();
    return true;
  },

  powerupCount(id) { return TEST_MODE ? Infinity : (this.data.powerups[id] || 0); },
  usePowerup(id) { if (!TEST_MODE) { this.data.powerups[id] = Math.max(0, (this.data.powerups[id] || 0) - 1); this.write(); } },

  /** Plakat vorhanden? Im Playtest (Testmodus) sind alle freigeschaltet. */
  hasPoster(v) { return TEST_MODE || !!(RIVALS[v] ? (this.data.rivals || {})[v] : this.data.posters[v]); },
  freshRivals: [],
  owns(kind, id) { return TEST_MODE || this.data.owned[kind].includes(id); },
  outfitOf(charId) {
    const id = this.data.outfit[charId];
    return OUTFITS[id] && this.owns('outfits', id) ? id : 'default';   // nach dem Testmodus nicht mehr Gekauftes zurück auf Standard
  },
  paintId() { const id = this.data.paint; return PAINTS[id] && this.owns('paints', id) ? id : 'default'; },

  /* ---------- Erfolge ---------- */

  /** Prüft alle Erfolge, gibt die neu freigeschalteten zurück */
  checkAchievements(ctx) {
    const fresh = [];
    for (const id in ACHIEVEMENTS) {
      if (this.data.achievements[id]) continue;
      let ok = false;
      try { ok = ACHIEVEMENTS[id].check(this.data, ctx || {}); } catch (e) { ok = false; }
      if (ok) { this.data.achievements[id] = true; fresh.push(id); }
    }
    // Rivalen-Plakate freischalten (werden auf der Ergebnisseite angezeigt)
    this.data.rivals = this.data.rivals || {};
    for (const id in RIVALS) {
      if (this.data.rivals[id]) continue;
      let ok = false;
      try { ok = RIVALS[id].check(this.data); } catch (e) { ok = false; }
      if (ok) { this.data.rivals[id] = true; this.freshRivals.push(id); this.write(); }
    }
    if (fresh.length) this.write();
    return fresh;
  },
};

Save.load();
