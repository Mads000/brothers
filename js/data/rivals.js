/* =========================================================================
   data/rivals.js – Plakate der Rivalen-Bands (Sammelstücke in EXTRAS)

   Alle Bands sind erfunden, Stil: 90er Britpop, Madchester, Rave, Punk.
   Felder:
     band    Bandname (steht auf dem Plakat)
     line    Untertitel (Ort, Tour ...)
     hint    wie man es bekommt (wird angezeigt, solange es gesperrt ist)
     check(data)  true = freigeschaltet (data = Spielstand)
     style   Motiv in ui.js -> drawRivalPoster()
   ========================================================================= */

const RIVALS = {
  velvet:    { band: 'VELVET MOTORWAY', line: 'IN THE PARK', hint: 'GET 10 STARS', style: 'splatter',
               check: d => Save.totalStars() >= 10 },
  halfpints: { band: 'THE HALF PINTS', line: 'LAST ORDERS', hint: 'SERVE 25 GOOD ITEMS', style: 'stripes',
               check: d => d.stats.served >= 25 },
  northern:  { band: 'NORTHERN SKIES', line: 'SUMMER 95', hint: 'GET 25 STARS', style: 'sky',
               check: d => Save.totalStars() >= 25 },
  chemical:  { band: 'CHEMICAL PARADE', line: 'ALL NIGHTER', hint: 'REACH 5 CITIES IN THE ENDLESS TOUR', style: 'rave',
               check: d => d.endlessBest >= 5 },
  bucket:    { band: 'BUCKET HAT CLUB', line: 'MEMBERS ONLY', hint: 'BUY THE BUCKET HAT', style: 'hat',
               check: d => d.owned.outfits.includes('fisherhat') },
  neon:      { band: 'NEON TERRACE', line: 'DANCEFLOOR', hint: 'UNLOCK 5 AWARDS', style: 'neon',
               check: d => Object.keys(d.achievements).length >= 5 },
  deadend:   { band: 'DEAD END DREAMERS', line: 'NO FUTURE', hint: 'LOSE 10 GIGS TO A FIGHT', style: 'punk',
               check: d => d.stats.fights >= 10 },
  warehouse: { band: 'WAREHOUSE 92', line: 'RAVE ON', hint: 'REACH 10 CITIES IN THE ENDLESS TOUR', style: 'hazard',
               check: d => d.endlessBest >= 10 },
};
