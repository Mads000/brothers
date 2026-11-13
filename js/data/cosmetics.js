/* =========================================================================
   data/cosmetics.js – Outfits und Bus-Lackierungen (nur Optik)

   OUTFITS (für jeden Bruder einzeln wählbar):
     name    Anzeigename
     price   Preis in Plektren (0 = von Anfang an da)
     color   Jackenfarbe (leer = eigene Farbe der Figur)
     look    Kopf überschreiben ('buckethat', 'comb', ...)
     detail  Kleidung: 'fur' (Parka), 'stripes' (Trainingsjacke), 'shirt' (Anzug), 'chicken'

   PAINTS (Lackierung der Bus-Wände):
     wall, trim   Grundfarben
     pattern      'unionjack', 'camo', 'psych' oder leer
     hull, hullTrim  optional: Außenlack des Busses (PC-Rand), sonst wall/trim
   ========================================================================= */

const OUTFITS = {
  default: { name: 'OWN CLOTHES', price: 0 },
  parka: { name: 'PARKA', price: 60, color: '#6b6a3a', detail: 'fur' },
  tracksuit: { name: 'TRACKSUIT', price: 60, color: '#2a4aa0', detail: 'stripes' },
  fisherhat: { name: 'BUCKET HAT', price: 40, look: 'buckethat' },
  suit: { name: 'SHARP SUIT', price: 100, color: '#1c1c22', detail: 'shirt' },
  chicken: { name: 'CHICKEN SUIT', price: 150, color: '#eeeeee', look: 'comb', detail: 'chicken' },
};

const PAINTS = {
  default: { name: 'WOOD PANEL', price: 0, wall: '#3b3328', trim: '#6a5e48', hull: '#8a2430', hullTrim: '#e0d4b0' },
  camo: { name: 'CAMO', price: 80, wall: '#3a4a2a', trim: '#5a6a3a', pattern: 'camo' },
  unionjack: { name: 'UNION JACK', price: 120, wall: '#1a2a6a', trim: '#eeeeee', pattern: 'unionjack' },
  psychedelic: { name: 'PSYCHEDELIC', price: 150, wall: '#6a2a8a', trim: '#f0c020', pattern: 'psych' },
  // Geheim: nur per Code (secret = nicht im Shop, solange man sie nicht hat)
  gold: { name: 'FOOLS GOLD', price: 0, secret: true, wall: '#8a6a1a', trim: '#ffe070', pattern: 'gold' },
  splatter: { name: 'PAINT SPLATTER', price: 0, secret: true, wall: '#e8e0cc', trim: '#2a2a2a', pattern: 'splatter' },
};
