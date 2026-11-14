/* =========================================================================
   config.js – Zentrale Einstellungen
   Wird als erste Datei geladen. Alles hier ist in allen anderen Dateien
   verfügbar.
   ========================================================================= */

// TESTMODUS
// Normal ist das Spiel im normalen Modus. Mit dem Code "playtest"
// (EXTRAS -> ENTER CODE, siehe data/codes.js) wird der Testmodus eingeschaltet:
// alle Schauplätze, Levels, Endlos-Modus, Figuren und Shop-Artikel frei,
// unendlich Plektren, Debug-Menü aktiv (lange auf Logo, Überschrift oder Timer
// drücken, am PC F2). Der Schalter wird im Browser gespeichert.
const TEST_MODE_KEY = 'brothers-testmode';
let TEST_MODE = false;
try { TEST_MODE = localStorage.getItem(TEST_MODE_KEY) === '1'; } catch (e) { TEST_MODE = false; }

/** Testmodus ein- oder ausschalten (bleibt nach Neustart erhalten) */
function setTestMode(on) {
  TEST_MODE = !!on;
  try { if (on) localStorage.setItem(TEST_MODE_KEY, '1'); else localStorage.removeItem(TEST_MODE_KEY); } catch (e) { /* egal */ }
}

const CONFIG = {
  VERSION: '1.0',

  // Bildformat
  PLAY_W: 180,      // Breite des Spielfelds, auf jedem Gerät gleich
  PC_W: 224,        // Render-Breite im PC-Format, außen je 22 px Rand mit Wut-Leiste
  H: 320,           // Render-Höhe
  MAX_BAND: 56,   // Handy: so viele Pixel darf die Bildfläche oben/unten zusätzlich bekommen
  PC_ASPECT: 0.66,   // ab diesem Verhältnis Breite/Höhe des Fensters gilt das PC-Format

  SAVE_KEY: 'brothers-save-v1',  // Schlüssel in localStorage

  // Eingabe
  LONG_PRESS: 0.7,  // Sekunden für langes Drücken (Debug-Menü)
  TAP_MS: 350,      // kürzer gedrückt = Tippen (beruhigen)
  TAP_MOVE: 4,      // mehr als so viele Pixel bewegt = Ziehen statt Tippen

  // Spielregeln: Grundwerte, die für alle Levels gelten
  RULES: {
    baseAnger: 2,       // Wut pro Sekunde, immer (wird mit der Schwierigkeit multipliziert)
    closeDist: 60,      // unter diesem Abstand (Pixel) macht Nähe wütend
    closeAnger: 11,     // zusätzliche Wut/s, wenn sie direkt nebeneinander stehen
    farDist: 90,        // nur Schwestern: über diesem Abstand werden sie wütend
    dragAnger: 4,       // Wut/s, solange ein Bruder gezogen wird
    gripTime: 2,        // so viele Sekunden kann man einen Bruder am Stück festhalten
    gripRecover: 1.2,   // so schnell erholt sich der Griff wieder (Sekunden pro Sekunde)
    regrabTime: 1,      // nach dem Losreißen so lange nicht wieder greifbar
    breakFreeAnger: 5,  // Wut beim Losreißen
    chaseFrom: 60,      // ab dieser Wut läuft ein Bruder auf den anderen los
    wanderSpeed: 9,     // Lauftempo, wenn er ruhig herumschlendert
    calmAmount: 20,     // so viel Wut nimmt ein Tippen weg
    calmCooldown: 0.9,  // Sekunden, bis derselbe Bruder wieder beruhigt werden kann
    calmFatigue: .35,      // jedes schnelle Nachtippen beim selben Bruder wirkt schwächer (genervt)
    calmFatigueDecay: .3,  // so schnell legt sich das Genervtsein wieder (pro Sekunde)
    pickupDist: 9,      // so nah muss ein Bruder an einen Gegenstand
    deliverDist: 16,    // so nah muss ein gezogener guter Gegenstand am Bruder losgelassen werden
    pushDist: 12,       // näher als das schieben sie sich auseinander
    fightDist: 15,      // näher als das plus 100 % Wut = Prügelei
    fightTime: 1.8,     // Dauer der Prügel-Animation bis zum Game Over
    itemTapRadius: 12,  // Trefferradius beim Wegtippen von Gegenständen
    broGrabRadius: 17,  // Trefferradius beim Anfassen eines Bruders
    broRadius: 4,       // Kollisionsradius der Füße (Wände, Tische)
    stageCallTime: 15,  // Sekunden für "Bring beide auf die Bühne"
  },

  // Fast-Prügelei: kurze Zeitlupe + Screenshake
  NEAR_MISS: { dist: 20, anger: 88, slow: 0.3, time: 0.6, cooldown: 4 },

  // Belohnungen in Plektren
  REWARDS: { win: 5, perStar: 5, maxBinned: 20, firstClear: 10, lossPer10s: 1, endlessPer: 10 },

  // Never-Ending Tour
  ENDLESS: {
    sectionTime: 20,       // Sekunden pro Stadt
    modEvery: 3,           // alle so viele Städte kommt ein Modifikator dazu
    rampPerSection: 0.12,  // dauerhafte Schwierigkeit pro Stadt
    unlockLevel: 'rehearsal-10',   // dieses Level muss geschafft sein
    sectionBonus: 20,      // Punkte pro geschaffter Stadt
    binBonus: 5,           // Punkte pro weggetipptem Gegenstand
    missionBonus: 40,      // Punkte für eine geschaffte Stadt-Mission
    busRelief: 10,         // so viel Wut verlieren beide auf jeder Busfahrt
    restRelief: 30,        // REST STOP auf der Karte: so viel Wut weniger
    serviceRelief: 10,     // SERVICE STATION: so viel Wut weniger (dazu Power-ups voll)
    rowdyDiff: 0.35,       // so viel schwerer ist eine ROWDY NIGHT
  },

  // Easter Eggs: so oft ersetzt die geheime Zitrone einen normalen Gegenstand
  SECRETS: { lemonChance: 0.025 },

  // Start-Ausrüstung bei neuem Spielstand
  START_POWERUPS: { tape: 2, mum: 1 },
};
