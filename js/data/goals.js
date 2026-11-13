/* =========================================================================
   data/goals.js – Bonusziele (dritter Stern)

   Sterne pro Level:
     1. Level geschafft
     2. Wut war nie über 90 %
     3. Bonusziel erfüllt (im Level: bonus: { type: 'bin', n: 6 })

   Jedes Bonusziel:
     text(n)        Beschreibung
     value(stats)   aktueller Wert aus den Level-Statistiken
     ok(value, n)   erfüllt?
   Verfügbare Statistiken: binned, served, calms, maxAnger, maxVolume, minMood,
   sleepTime, locks, fans, powerups, collected

   Die Hauptziele eines Levels (goal) stehen in levels.js:
     (keins)                              überleben bis zum Gig
     goal: { type: 'collect', n: 5 }      5 Setlists antippen, bevor die Zeit abläuft
     goal: { type: 'stage' }              nach Ablauf der Zeit beide in die Bühnen-Zone bringen
   ========================================================================= */

const BONUS = {
  bin: { text: n => 'BIN ' + n + ' ITEMS', value: s => s.binned, ok: (v, n) => v >= n },
  serve: { text: n => 'SERVE ' + n + ' GOOD ITEMS', value: s => s.served, ok: (v, n) => v >= n },
  calms: { text: n => 'CALM MAX ' + n + ' TIMES', value: s => s.calms, ok: (v, n) => v <= n },
  anger: { text: n => 'ANGER NEVER OVER ' + n + '%', value: s => Math.round(s.maxAnger), ok: (v, n) => v <= n },
  volume: { text: n => 'VOLUME NEVER OVER ' + n + '%', value: s => Math.round(s.maxVolume), ok: (v, n) => v <= n },
  crowd: { text: n => 'CROWD NEVER BELOW ' + n + '%', value: s => Math.round(s.minMood), ok: (v, n) => v >= n },
  sleep: { text: n => 'BOTH ASLEEP ' + n + 'S', value: s => Math.floor(s.sleepTime), ok: (v, n) => v >= n },
  locks: { text: n => 'LOCK THE DOOR ' + n + 'X', value: s => s.locks, ok: (v, n) => v >= n },
  fans: { text: n => 'SHOO AWAY ' + n + ' FANS', value: s => s.fans, ok: (v, n) => v >= n },
  nopower: { text: () => 'NO POWER-UPS', value: s => s.powerups, ok: v => v === 0 },
};

/** Ist das Bonusziel eines Levels erfüllt? */
function bonusOk(bonus, stats) {
  const def = bonus && BONUS[bonus.type];
  return !!def && def.ok(def.value(stats), bonus.n);
}
/** Text fürs Bonusziel */
function bonusText(bonus) {
  const def = bonus && BONUS[bonus.type];
  return def ? def.text(bonus.n) : '';
}
