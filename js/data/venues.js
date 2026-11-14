/* =========================================================================
   data/venues.js – Schauplätze

   Felder:
     name, short     Anzeigename und Kurzname fürs HUD ("BUS 3")
     rule            Kurzbeschreibung der Sonderregel (Level-Auswahl)
     starsToUnlock   so viele Sterne braucht man (ohne Testmodus)
     mechanic        Sonderregel aus mechanics.js ('volume', 'pubfans', 'door', 'stage', 'hotel')
     mechDefaults    Standardwerte der Sonderregel (Level kann sie mit "mech" überschreiben)
     bounds          Bereich, in dem sich die Brüder bewegen (Welt-Pixel)
     spawn           Bereich, in dem Gegenstände erscheinen
     walls           feste Hindernisse [{x, y, w, h}] (Tische, Verstärker ...)
     starts          Startpositionen der beiden Brüder
     stageZone       Zone für das Ziel "Bring beide zur Bühne"
     fanSpots        wo beim Event "fan" ein Fan auftaucht (x, y) und wohin der Bruder läuft (tx, ty)
     drumSpot        wo der Drummer sitzt (falls im Level)
     sway            true = Bild schaukelt leicht (Bus fährt)
     angerMult       Schwierigkeit: alle Wut-Zuwächse mal diesen Wert (1 = normal)
     palette         side = PC-Seitenränder
     color           Farbe auf der Tourkarte (Never-Ending Tour)
     endless         Vorlage für die Never-Ending Tour: Gegenstände, Events, Regel-Werte und
                     missions = mögliche Stadt-Missionen (Bonusziele aus goals.js)
     Die Grafik (Hintergrund und Animation) steht in js/art.js unter ART.bg.<id>
     und ART.anim.<id> und wird unten automatisch zugewiesen.
     Die PC-Seitenränder stehen in art.js unter ART.side.<id> und ART.sideAnim.<id>.

   Die Reihenfolge in der Level-Auswahl steht in VENUE_ORDER ganz unten.
   ========================================================================= */


const VENUES = {
  /* ===================== 1. TOURBUS ===================== */
  bus: {
    color: '#c03a4a', name: 'TOUR BUS', short: 'BUS', rule: 'BENDS & POTHOLES. BIN THE BEER!',
    angerMult: 1.25,
    starsToUnlock: 0,
    bounds: { x0: 40, x1: 140, y0: 62, y1: 288 },
    spawn: { x0: 44, x1: 136, y0: 72, y1: 284 },
    walls: [],
    starts: [{ x: 62, y: 130 }, { x: 118, y: 230 }],
    stageZone: { x: 40, y: 62, w: 100, h: 18 },
    fanSpots: [74, 114, 154, 194, 234].map(y => ({ x: 9, y: y + 22, tx: 44, ty: y + 18 }))
      .concat([74, 154, 234].map(y => ({ x: 171, y: y + 22, tx: 136, ty: y + 18 }))),
    drumSpot: { x: 90, y: 298 },
    sway: false,   // true = Bild schaukelt leicht
    palette: { side: '#1b1c21', floor: '#262b38' },
    endless: {
      missions: [{ type: 'fans', n: 1 }, { type: 'bin', n: 4 }],
      items: { beer: 5, guitar: 2, tea: 2, chips: 1, newspaper: 1 }, itemEvery: [2.6, 4.5],
      events: { insult: [3, 5], pothole: [7, 11], curve: [8, 12], fan: [10, 15] },
    },
  },

  /* ===================== 2. PROBERAUM ===================== */
  rehearsal: {
    color: '#e0703a', name: 'BEACH JAM', short: 'BCH', rule: 'LOUD AMP = ANGRY BROTHER. TAP AMPS!',
    angerMult: 1.05,
    starsToUnlock: 8,
    mechanic: 'volume', mechDefaults: { volRate: 4 },
    bounds: { x0: 26, x1: 154, y0: 70, y1: 288 },
    spawn: { x0: 34, x1: 146, y0: 120, y1: 284 },
    // Verstärker: Bruder 1 links, Bruder 2 rechts. fx/fy = Platz davor
    amps: [{ x: 20, y: 76, w: 18, h: 24, fx: 34, fy: 112 }, { x: 142, y: 76, w: 18, h: 24, fx: 146, fy: 112 }],
    walls: [{ x: 20, y: 76, w: 18, h: 24 }, { x: 142, y: 76, w: 18, h: 24 }],
    starts: [{ x: 60, y: 150 }, { x: 120, y: 250 }],
    stageZone: { x: 26, y: 270, w: 128, h: 18 },
    fanSpots: [{ x: 150, y: 296, tx: 140, ty: 280 }, { x: 30, y: 296, tx: 40, ty: 280 }],
    drumSpot: { x: 90, y: 54 },
    palette: { side: '#5a4a6a', floor: '#d8b884' },
    endless: {
      missions: [{ type: 'volume', n: 80 }],
      items: { beer: 3, pedal: 3, tea: 2, headphones: 1, cable: 1 }, itemEvery: [2.8, 4.8],
      events: { insult: [3, 5], setlist: [10, 14] }, mech: { volRate: 5 },
    },
  },

  /* ===================== 3. PUB ===================== */
  pub: {
    color: '#d8a830', name: 'PUB AFTER THE GIG', short: 'PUB', rule: 'FANS IN THE WAY. ONLY BETWEEN TABLES!',
    angerMult: 1.2,
    starsToUnlock: 20,
    mechanic: 'pubfans', mechDefaults: { fanEvery: [3.5, 5.5] },
    bounds: { x0: 26, x1: 154, y0: 66, y1: 292 },
    spawn: { x0: 30, x1: 150, y0: 70, y1: 288 },
    walls: [
      { x: 36, y: 108, w: 26, h: 16 }, { x: 118, y: 108, w: 26, h: 16 },
      { x: 77, y: 168, w: 26, h: 16 },
      { x: 36, y: 228, w: 26, h: 16 }, { x: 118, y: 228, w: 26, h: 16 },
    ],
    lanes: [88, 146, 206, 266],   // auf diesen Höhen laufen Fans durchs Bild
    starts: [{ x: 50, y: 88 }, { x: 130, y: 270 }],
    stageZone: { x: 26, y: 274, w: 128, h: 18 },
    fanSpots: [{ x: 60, y: 62, tx: 60, ty: 72 }, { x: 120, y: 62, tx: 120, ty: 72 }],
    drumSpot: { x: 30, y: 72 },
    palette: { side: '#1e160c', floor: '#4a3418' },
    endless: {
      missions: [{ type: 'bin', n: 5 }],
      items: { beer: 7, tea: 2, newspaper: 1 }, itemEvery: [2.4, 4],
      events: { insult: [3, 5], jukebox: [8, 12] }, mech: { fanEvery: [2.8, 4.5] },
    },
  },

  /* ===================== 4. BACKSTAGE ===================== */
  backstage: {
    color: '#9a9ab0', name: 'BACKSTAGE', short: 'BKS', rule: 'LOCK THE DOOR. TAP ROADIES TO STOP THEM!',
    angerMult: 1.15,
    starsToUnlock: 35,
    mechanic: 'door', mechDefaults: { kickTime: 5, roadieEvery: [8, 12], chantEvery: [11, 15] },   // Roadies und Sprechchöre (Zeitspanne in s)
    bounds: { x0: 26, x1: 154, y0: 66, y1: 290 },
    spawn: { x0: 30, x1: 150, y0: 72, y1: 286 },
    door: { x: 78, y: 166, w: 24, h: 12 },   // Tür in der Trennwand
    walls: [{ x: 0, y: 166, w: 78, h: 12 }, { x: 102, y: 166, w: 78, h: 12 }, { x: 122, y: 272, w: 36, h: 18 }],
    starts: [{ x: 60, y: 110 }, { x: 120, y: 240 }],
    stageZone: { x: 26, y: 66, w: 128, h: 20 },
    fanSpots: [{ x: 30, y: 62, tx: 36, ty: 74 }, { x: 150, y: 62, tx: 144, ty: 74 }],
    drumSpot: { x: 40, y: 280 },
    palette: { side: '#121418', floor: '#2a2e36' },
    endless: {
      missions: [{ type: 'locks', n: 1 }],
      items: { beer: 3, mirror: 2, catering: 2, buckethat: 1 }, itemEvery: [2.6, 4.5],
      events: { insult: [3, 5], photographer: [9, 13] }, mech: { kickTime: 4 },
    },
  },

  /* ===================== 5. FESTIVAL-BÜHNE ===================== */
  festival: {
    color: '#4a7aff', name: 'FESTIVAL STAGE', short: 'FES', rule: 'KEEP BOTH AT THEIR MICS. CROWD WATCHES!',
    angerMult: 1,
    starsToUnlock: 50,
    mechanic: 'stage', mechDefaults: { mood0: 70, gain: 5, drain: 4 },
    bounds: { x0: 24, x1: 156, y0: 66, y1: 226 },
    spawn: { x0: 28, x1: 152, y0: 70, y1: 222 },
    mics: [{ x: 55, y: 120 }, { x: 125, y: 120 }],   // Fußpunkt vor dem Mikro
    walls: [{ x: 44, y: 212, w: 20, h: 10 }, { x: 116, y: 212, w: 20, h: 10 }],   // Monitorboxen
    starts: [{ x: 55, y: 120 }, { x: 125, y: 120 }],
    stageZone: { x: 24, y: 66, w: 132, h: 20 },
    fanSpots: [{ x: 50, y: 252, tx: 50, ty: 224 }, { x: 90, y: 252, tx: 90, ty: 224 }, { x: 130, y: 252, tx: 130, ty: 224 }],
    drumSpot: { x: 90, y: 50 },
    palette: { side: '#0a0e22', floor: '#141a3a' },
    endless: {
      missions: [{ type: 'crowd', n: 50 }],
      items: { beer: 3, tea: 2, mic: 1 }, itemEvery: [2.8, 4.8],
      events: { insult: [3, 5], crowdsurfer: [7, 10], rain: [15, 20] }, mech: { drain: 5 },
    },
  },

  /* ===================== 6. HOTEL ===================== */
  hotel: {
    color: '#b05ab0', name: 'HOTEL', short: 'HTL', rule: 'SEPARATE FLOORS. LIFT AND BEDS HELP!',
    angerMult: 1.3,
    starsToUnlock: 65,
    mechanic: 'hotel', mechDefaults: { napTime: 7, seekTime: 8 },   // Schlafdauer im Bett, Zeit bis einer den anderen sucht
    bounds: { x0: 24, x1: 162, y0: 62, y1: 290 },
    spawn: { x0: 56, x1: 140, y0: 66, y1: 288 },
    // Etagen: Bereich der Füße
    floors: [{ y0: 62, y1: 120 }, { y0: 150, y1: 200 }, { y0: 230, y1: 290 }],
    lifts: [{ x: 148, y: 92, w: 16, h: 30 }, { x: 148, y: 172, w: 16, h: 30 }, { x: 148, y: 262, w: 16, h: 30 }],
    beds: [{ x: 26, y: 66, w: 24, h: 30 }, { x: 26, y: 152, w: 24, h: 30 }, { x: 26, y: 234, w: 24, h: 30 }],
    walls: [{ x: 0, y: 124, w: 180, h: 22 }, { x: 0, y: 204, w: 180, h: 22 }],
    starts: [{ x: 80, y: 100 }, { x: 100, y: 270 }],
    stageZone: { x: 56, y: 270, w: 106, h: 20 },
    fanSpots: [{ x: 9, y: 116, tx: 30, ty: 110 }, { x: 9, y: 196, tx: 30, ty: 192 }, { x: 9, y: 284, tx: 30, ty: 282 }],
    drumSpot: { x: 90, y: 50 },
    palette: { side: '#140c1c', floor: '#3a2440' },
    endless: {
      missions: [{ type: 'sleep', n: 3 }],
      items: { minibar: 4, tea: 2, chips: 1 }, itemEvery: [2.8, 4.8],
      events: { insult: [3, 5], tv: [9, 13], knock: [10, 14] },
    },
  },

  /* ===================== 7. DAS MOOR (Bonus) =====================
     Weites Grasland unter blauem Himmel, rosa Wolken am Horizont.
     (Die id bleibt 'flat', damit alte Spielstände weiter passen.)
     Sonderregel: Sonnenflecken ziehen langsam über das Gras und beruhigen. */
  flat: {
    color: '#7ab04a', name: 'THE MOOR', short: 'MOR', rule: 'PATCHES OF SUN CALM THEM DOWN. NOTHING BUT SKY.',
    angerMult: 1.2,
    starsToUnlock: 12,
    mechanic: 'sunbeam', mechDefaults: { sunCalm: 4 },
    bounds: { x0: 26, x1: 154, y0: 72, y1: 290 },
    spawn: { x0: 44, x1: 150, y0: 80, y1: 286 },
    // Trockensteinmauer und Findling links sind Hindernisse
    walls: [{ x: 18, y: 122, w: 22, h: 64 }, { x: 18, y: 236, w: 20, h: 20 }],
    // Sonnenstrahlen: Startposition, Größe, Schräge (x pro y), wie weit sie wandern
    beams: [
      { x: 52, y: 96, w: 22, h: 46, skew: .45, drift: 16, ph: 0 },
      { x: 92, y: 156, w: 24, h: 50, skew: .45, drift: 18, ph: 2 },
      { x: 56, y: 226, w: 22, h: 44, skew: .45, drift: 14, ph: 4 },
    ],
    starts: [{ x: 70, y: 120 }, { x: 120, y: 250 }],
    stageZone: { x: 52, y: 72, w: 76, h: 18 },
    fanSpots: [{ x: 70, y: 52, tx: 70, ty: 76 }, { x: 110, y: 52, tx: 110, ty: 76 }],
    drumSpot: { x: 140, y: 284 },
    palette: { side: '#3e5828', floor: '#62803a' },
    endless: {
      missions: [{ type: 'anger', n: 75 }, { type: 'serve', n: 2 }],
      items: { wine: 4, beer: 2, record: 2, tea: 2 }, itemEvery: [2.8, 4.8],
      events: { insult: [3, 5], photographer: [9, 13], fan: [11, 15] },
    },
  },
};


// Reihenfolge in der Level-Auswahl
const VENUE_ORDER = ['bus', 'rehearsal', 'pub', 'backstage', 'festival', 'hotel', 'flat'];

// Jeder Schauplatz kennt seine eigene ID (praktisch für Caches)
// und bekommt seine Grafik aus art.js (Hintergrund + Animation)
for (const id in VENUES) {
  VENUES[id].id = id;
  if (ART.bg[id]) VENUES[id].buildBackground = ART.bg[id];
  if (ART.anim[id]) VENUES[id].drawAnimated = ART.anim[id];
  if (ART.side[id]) VENUES[id].buildSide = ART.side[id];
  if (ART.sideAnim[id]) VENUES[id].drawSide = ART.sideAnim[id];
}
