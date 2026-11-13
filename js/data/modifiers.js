/* =========================================================================
   data/modifiers.js – Modifikatoren (Never-Ending Tour)

   Ein Modifikator gilt ab seiner Stadt bis zum Ende des Runs und stapelt
   sich mit anderen. Zahlen sind Multiplikatoren auf die Grundregeln:
     angerRate   Wutanstieg            (1.5 = 50 % schneller)
     calmPower   Wirkung von Tippen    (0.5 = halb so gut)
     speed       Lauftempo der Brüder
     itemRate    wie oft Gegenstände erscheinen
   flags: Sonderregeln, die das Spiel kennt:
     'mirror'    Bild ist gespiegelt
     'double'    Gegenstände erscheinen doppelt
     'slippery'  losgelassene Brüder rutschen weiter
     'notap'     Tippen beruhigt nicht mehr
   ========================================================================= */

const MODIFIERS = {
  hangover: { name: 'HANGOVER', desc: 'SLOWER BUT ANGRIER', speed: 0.6, angerRate: 1.3 },
  mirror: { name: 'MIRROR WORLD', desc: 'EVERYTHING IS FLIPPED', flags: ['mirror'] },
  heatwave: { name: 'HEATWAVE', desc: 'CALMING WORKS HALF AS WELL', calmPower: 0.5 },
  double: { name: 'DOUBLE TROUBLE', desc: 'ITEMS COME IN PAIRS', flags: ['double'] },
  slippery: { name: 'SLIPPERY FLOOR', desc: 'THEY SLIDE WHEN RELEASED', flags: ['slippery'] },
  notap: { name: 'NO TAPPING', desc: 'ONLY ITEMS CALM THEM', flags: ['notap'] },
};
