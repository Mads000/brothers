/* =========================================================================
   data/characters.js – Figuren und Paare

   CHARACTERS: einzelne Figuren
     name       Anzeigename (max. 3 bis 4 Zeichen, passt sonst nicht ins HUD)
     color      Jackenfarbe, auch im HUD
     look       Kopf: 'shades', 'buckethat', 'bald', 'cap', 'ponytail'
     hair       Haarfarbe (optional)
     angerRate  wie schnell die Wut steigt (1 = normal)
     calmPower  wie gut Tippen beruhigt (1 = normal)
     speed      Lauftempo (1 = normal)

   PAIRS: Paare für die Never-Ending Tour
     bros           zwei IDs aus CHARACTERS
     unlockCities   so viele Städte muss man im Endlos-Modus einmal geschafft haben
     inverted       true = Wut steigt, wenn sie zu WEIT auseinander sind
     silent         true = sie beleidigen sich nicht, sondern ignorieren sich

   Startpositionen stehen beim Schauplatz (venues.js).
   ========================================================================= */

const CHARACTERS = {
  kev: { name: 'KEV', desc: 'GETS ANGRY FAST, BUT CALMS DOWN FAST.', color: '#4a5e2a', look: 'shades', angerRate: 1.15, calmPower: 1.25, speed: 1 },   // schnell wütend, schnell ruhig
  del: { name: 'DEL', desc: 'SLOW TO ANGER, BUT STAYS ANGRY LONG.', color: '#22346a', look: 'buckethat', angerRate: 0.85, calmPower: 0.75, speed: 1 }, // langsam wütend, lange sauer

  // Zwillinge: sehen exakt gleich aus. Merk dir, wer wer ist!
  ron: { name: 'RON', color: '#6a2a5a', look: 'shades', angerRate: 1, calmPower: 1, speed: 1 },
  don: { name: 'DON', color: '#6a2a5a', look: 'shades', angerRate: 1, calmPower: 1, speed: 1 },

  // Vater und Sohn: einer langsam, einer schnell
  dad: { name: 'DAD', color: '#5a4a3a', look: 'bald', angerRate: 0.9, calmPower: 0.9, speed: 0.6 },
  son: { name: 'SON', color: '#a03a2a', look: 'cap', angerRate: 1.2, calmPower: 1.1, speed: 1.5 },

  // Schwestern
  jo: { name: 'JO', color: '#a04a7a', look: 'ponytail', hair: '#5a2a12', angerRate: 1, calmPower: 1, speed: 1 },
  bex: { name: 'BEX', color: '#2a7a7a', look: 'ponytail', hair: '#d8b040', angerRate: 1, calmPower: 1, speed: 1 },
};

const PAIRS = {
  brothers: { name: 'KEV & DEL', desc: 'THE ORIGINALS', bros: ['kev', 'del'], unlockCities: 0 },
  twins: { name: 'THE TWINS', desc: 'WHO IS WHO?', bros: ['ron', 'don'], unlockCities: 3 },
  dadson: { name: 'DAD & SON', desc: 'ONE SLOW, ONE FAST', bros: ['dad', 'son'], unlockCities: 6 },
  sisters: { name: 'THE SISTERS', desc: 'KEEP THEM TOGETHER!', bros: ['jo', 'bex'], unlockCities: 9, inverted: true, silent: true },
};
