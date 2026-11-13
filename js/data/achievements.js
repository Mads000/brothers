/* =========================================================================
   data/achievements.js – Erfolge

   Felder:
     name    Titel
     desc    Beschreibung
     check(save, ctx)  true = geschafft. save = Save.data,
                       ctx = { result } nach einem Level (kann fehlen)
   secret  true = bleibt als "???" verborgen, bis man ihn schafft (Easter Eggs)
   Neue Erfolge einfach unten anhängen. Geprüft wird nach jedem Level,
   jedem Endlos-Run und jedem Kauf.
   ========================================================================= */

const ACHIEVEMENTS = {
  firstgig: { name: 'FIRST GIG', desc: 'WIN ANY LEVEL', check: s => s.stats.wins >= 1 },
  brotherlylove: {
    name: 'BROTHERLY LOVE', desc: 'WIN A LEVEL, ANGER NEVER OVER 50%',
    check: (s, c) => !!(c && c.result && c.result.win && c.result.stats.maxAnger <= 50),
  },
  zerotolerance: { name: 'ZERO TOLERANCE', desc: 'BIN 100 BEERS', check: s => s.stats.beer >= 100 },
  reunion: { name: 'REUNION TOUR', desc: '10 CITIES IN ONE ENDLESS RUN', check: s => s.endlessBest >= 10 },
  headliner: { name: 'HEADLINER', desc: 'WIN A HEADLINER LEVEL', check: s => Object.keys(s.posters).length >= 1 },
  worldtour: { name: 'WORLD TOUR', desc: 'WIN ALL 6 HEADLINERS', check: s => Object.keys(s.posters).length >= 6 },
  perfectionist: {
    name: 'PERFECTIONIST', desc: '3 STARS ON 10 LEVELS',
    check: s => Object.values(s.levels).filter(l => l.stars >= 3).length >= 10,
  },
  teatime: { name: 'TEA TIME', desc: 'SERVE 25 GOOD ITEMS', check: s => s.stats.served >= 25 },
  mumsthword: { name: 'MUM KNOWS BEST', desc: 'LET MUM CALL', check: s => s.stats.mum >= 1 },
  fashion: { name: 'FASHION VICTIM', desc: 'BUY AN OUTFIT', check: s => s.owned.outfits.length > 1 },
  scrappers: { name: 'SCRAPPERS', desc: 'LOSE 25 FIGHTS', check: s => s.stats.fights >= 25 },
  collector: { name: 'POSTER BOY', desc: 'COLLECT 3 GIG POSTERS', check: s => Object.keys(s.posters).length >= 3 },

  // ----- Geheime Easter Eggs (Manchester lässt grüßen) -----
  madeofstone: { name: 'MADE OF STONE', desc: 'FOUND THE SECRET LEMON', secret: true, check: s => (s.stats.lemons || 0) >= 1 },
  shebangs: { name: 'SHE BANGS THE DRUMS', desc: 'CALM 20 TIMES IN TIME WITH THE DRUMMER', secret: true, check: s => (s.stats.inTime || 0) >= 20 },
  foolsgold: { name: 'FOOLS GOLD', desc: 'ENTERED A SECRET CODE', secret: true, check: s => !!(s.secrets && s.secrets.foolsgold) },
  adored: { name: 'I WANNA BE ADORED', desc: 'ENTERED ANOTHER SECRET CODE', secret: true, check: s => !!(s.secrets && s.secrets.adored) },
};
