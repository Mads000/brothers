/* =========================================================================
   data/items.js – Gegenstände

   So fügst du einen neuen Gegenstand hinzu:
   1. Neuen Eintrag unten anlegen (am einfachsten einen ähnlichen kopieren)
   2. In einem Level unter "items" mit Gewicht eintragen: items: { beer: 5, tea: 2 }

   Felder:
     name       Anzeigename
     desc       Beschreibung für die Info-Seite
     kind       'bad'     = muss weggetippt werden, sonst schnappt ihn sich ein Bruder
                'good'    = zum Bruder ziehen (oder er läuft selbst drüber)
                'collect' = antippen zum Einsammeln (Ziel "Sammle 5 Setlists")
                'hazard'  = Stolperfalle am Boden, antippen räumt sie weg
     anger      Wut, die der Bruder bekommt (negativ = beruhigt)
     word       Sprechblase über dem Bruder ("GLUG"), wordColor = Farbe der Blase
     stun       nur hazard: so viele Sekunden stolpert er
     persist    nur hazard: bleibt liegen, wenn jemand stolpert
     height     Höhe des Sprites in Pixeln (für Trefferfläche und Blinkpunkt)
     draw(x, y) Zeichnet den Gegenstand. (x, y) = Mitte unten, X = Canvas-Kontext
     onPickup(game, bro, item)  optional: eigene Wirkung statt anger/word

   Nützlich in onPickup: game.addAnger(bro, n), game.other(bro), game.say(bro, text, farbe),
   game.comic(text, x, y, farbe), bro.st.eat = 3 (isst 3 s), bro.st.deaf = 8 (taub 8 s)
   ========================================================================= */

const ITEMS = {
  /* ---------- Schlecht: wegtippen ---------- */
  beer: {
    desc: 'MAKES HIM ANGRY (+25). TAP IT AWAY!',
    name: 'BEER', kind: 'bad', anger: 25, word: 'GLUG', wordColor: '#ffd84a', height: 11,
    draw(x, y) {
      X.fillStyle = '#b8bcc8'; X.fillRect(x - 2, y - 7, 5, 7);
      X.fillStyle = '#e0b020'; X.fillRect(x - 2, y - 5, 5, 2);
      X.fillStyle = '#fff'; X.fillRect(x - 1, y - 7, 1, 5);
    },
  },
  guitar: {
    desc: 'HE SMASHES IT (+35) AND LEAVES SPLINTERS.',
    name: 'GUITAR', kind: 'bad', height: 20,
    onPickup(game, b, it) {
      // Er zertrümmert sie: Wut, und Splitter bleiben als Stolperfalle liegen
      game.addAnger(b, 35);
      game.say(b, 'SMASH!', '#ff8a3a');
      game.comic('SMASH!', it.x, it.y - 20, '#ff8a3a');
      game.spawnItemAt('splinters', it.x + rnd(-8, 8), it.y + 6);
      game.shake = Math.max(game.shake, 2);
    },
    draw(x, y) {
      X.fillStyle = '#5a3a1a'; X.fillRect(x, y - 15, 1, 9);
      X.fillStyle = '#222'; X.fillRect(x - 1, y - 16, 3, 2);
      X.fillStyle = '#c8641e'; X.fillRect(x - 3, y - 6, 7, 6); X.fillRect(x - 2, y - 7, 5, 8);
      X.fillStyle = '#ffb050'; X.fillRect(x - 1, y - 5, 3, 3);
      X.fillStyle = '#111'; X.fillRect(x, y - 4, 1, 1);
    },
  },
  newspaper: {
    desc: 'HE READS THE INTERVIEW OUT. THE OTHER ONE FUMES.',
    name: 'NEWSPAPER', kind: 'bad', height: 8,
    onPickup(game, b) {
      // Er liest das Interview vor, der ANDERE wird wütend
      const o = game.other(b);
      game.addAnger(o, 30);
      game.say(b, 'HA! LISTEN..', '#ddd');
      game.say(o, 'HE SAID WHAT?!', '#ff8a3a');
    },
    draw(x, y) {
      X.fillStyle = '#ddd'; X.fillRect(x - 4, y - 6, 9, 6);
      X.fillStyle = '#555'; X.fillRect(x - 3, y - 5, 4, 1); X.fillRect(x - 3, y - 3, 7, 1); X.fillRect(x - 3, y - 2, 6, 1);
      X.fillStyle = '#b02020'; X.fillRect(x + 2, y - 5, 2, 1);
    },
  },
  mic: {
    desc: 'WHOEVER HAS IT INSULTS TWICE AS HARD FOR 10S.',
    name: 'MICROPHONE', kind: 'bad', height: 10,
    onPickup(game, b) {
      // Wer das Mikro hat, beleidigt 10 Sekunden lang doppelt so oft und laut
      b.st.mic = 10;
      game.addAnger(game.other(b), 10);
      game.say(b, 'MY MIC NOW!', '#ff8a3a');
    },
    draw(x, y) {
      X.fillStyle = '#999'; X.fillRect(x - 2, y - 9, 4, 4);
      X.fillStyle = '#ccc'; X.fillRect(x - 1, y - 8, 1, 1);
      X.fillStyle = '#222'; X.fillRect(x - 1, y - 5, 2, 5);
    },
  },
  buckethat: {
    desc: "THE OTHER ONE'S HAT! BOTH GET ANGRY.",
    name: 'BUCKET HAT', kind: 'bad', height: 6,
    onPickup(game, b) {
      // Diebstahl! Beide werden wütend
      for (const x of game.bros) game.addAnger(x, 20);
      game.say(game.other(b), 'THIEF!', '#ff8a3a');
    },
    draw(x, y) {
      X.fillStyle = '#d9d1b6'; X.fillRect(x - 4, y - 2, 9, 2); X.fillRect(x - 2, y - 5, 5, 3);
      X.fillStyle = '#b0a888'; X.fillRect(x - 2, y - 3, 5, 1);
    },
  },
  pedal: {
    desc: 'BEACH JAM: CRANKS HIS AMP WAY UP.',
    name: 'EFFECT PEDAL', kind: 'bad', height: 6,
    onPickup(game, b) {
      // Proberaum: dreht seinen Verstärker kräftig auf
      const vol = game.getSys('volume');
      if (vol) { const i = game.bros.indexOf(b); vol.s.vol[i] = Math.min(100, vol.s.vol[i] + 35); }
      game.addAnger(game.other(b), 10);
      game.say(b, 'WAAAAH', '#7cfc6a');
    },
    draw(x, y) {
      X.fillStyle = '#2a8a3a'; X.fillRect(x - 3, y - 5, 7, 5);
      X.fillStyle = '#ccc'; X.fillRect(x - 1, y - 4, 3, 1);
      X.fillStyle = '#f33'; X.fillRect(x + 2, y - 2, 1, 1);
    },
  },
  minibar: {
    desc: 'HOTEL MINIBAR. JUST LIKE BEER (+20).',
    name: 'MINIBAR', kind: 'bad', anger: 20, word: 'GLUG', wordColor: '#ffd84a', height: 8,
    draw(x, y) {
      X.fillStyle = '#8a5a1a'; X.fillRect(x - 1, y - 6, 3, 6);
      X.fillStyle = '#ddd'; X.fillRect(x - 1, y - 4, 3, 2);
      X.fillStyle = '#222'; X.fillRect(x, y - 8, 1, 2);
    },
  },
  setlistfight: {
    desc: 'WHOEVER GRABS IT FIRST TAUNTS THE OTHER.',
    name: 'SETLIST', kind: 'bad', height: 8,
    onPickup(game, b) {
      // Wer den Zettel zuerst hat, provoziert den anderen
      game.addAnger(b, -5);
      game.addAnger(game.other(b), 25);
      game.say(b, 'MY SETLIST!', '#ffd84a');
    },
    draw(x, y) {
      X.fillStyle = '#ffe890'; X.fillRect(x - 3, y - 7, 7, 7);
      X.fillStyle = '#555'; for (let k = 0; k < 3; k++) X.fillRect(x - 2, y - 6 + k * 2, 5, 1);
    },
  },

  /* ---------- Gut: zum Bruder ziehen ---------- */
  tea: {
    desc: 'DRAG IT TO A BROTHER: -30 ANGER.',
    name: 'TEA', kind: 'good', anger: -30, word: 'SIP', wordColor: '#9fd8ff', height: 8,
    draw(x, y) {
      X.fillStyle = '#eee'; X.fillRect(x - 3, y - 5, 5, 5); X.fillRect(x + 2, y - 4, 1, 2);
      X.fillStyle = '#8a5a2a'; X.fillRect(x - 2, y - 5, 3, 1);
      X.fillStyle = 'rgba(255,255,255,.5)'; X.fillRect(x - 1, y - 8, 1, 2);
    },
  },
  chips: {
    desc: 'KEEPS HIM BUSY EATING FOR 3 SECONDS.',
    name: 'CHIPS', kind: 'good', height: 9,
    onPickup(game, b) { b.st.eat = 3; game.addAnger(b, -8); game.say(b, 'MUNCH', '#ffd84a'); },
    draw(x, y) {
      X.fillStyle = '#ccc'; X.fillRect(x - 3, y - 6, 7, 6);
      X.fillStyle = '#888'; X.fillRect(x - 2, y - 4, 5, 1);
      X.fillStyle = '#f0c040'; X.fillRect(x - 2, y - 8, 1, 2); X.fillRect(x, y - 9, 1, 3); X.fillRect(x + 2, y - 8, 1, 2);
    },
  },
  headphones: {
    desc: 'DEAF TO INSULTS AND AMPS FOR 8 SECONDS.',
    name: 'HEADPHONES', kind: 'good', height: 7,
    onPickup(game, b) { b.st.deaf = 8; game.addAnger(b, -5); game.say(b, 'LA LA LA', '#9fd8ff'); },
    draw(x, y) {
      X.fillStyle = '#222'; X.fillRect(x - 3, y - 7, 7, 1); X.fillRect(x - 3, y - 7, 1, 3); X.fillRect(x + 3, y - 7, 1, 3);
      X.fillStyle = '#d33'; X.fillRect(x - 4, y - 4, 2, 4); X.fillRect(x + 3, y - 4, 2, 4);
    },
  },
  football: {
    desc: 'THEY PLAY TOGETHER. WHILE CLOSE, ANGER DROPS!',
    name: 'FOOTBALL', kind: 'good', height: 6,
    onPickup(game, b) {
      // Beide kicken kurz zusammen: solange sie nah sind, sinkt die Wut
      game.football = 7;
      game.comic('KICK-ABOUT!', b.x, b.y - 30, '#7cfc6a');
    },
    draw(x, y) {
      X.fillStyle = '#eee'; X.fillRect(x - 2, y - 5, 5, 5); X.fillRect(x - 3, y - 4, 7, 3);
      X.fillStyle = '#222'; X.fillRect(x, y - 3, 1, 1); X.fillRect(x - 2, y - 4, 1, 1); X.fillRect(x + 2, y - 2, 1, 1);
    },
  },
  album: {
    desc: 'VERY RARE. BOTH GO BACK TO 0% ANGER.',
    name: 'PHOTO ALBUM', kind: 'good', height: 7,
    onPickup(game) {
      // Sehr selten: beide werden sentimental, Wut auf 0
      for (const x of game.bros) { x.anger = 0; game.say(x, 'MUM...', '#ffb0d0'); }
      game.comic('AWWW', 90, 120, '#ffb0d0');
    },
    draw(x, y) {
      X.fillStyle = '#6a3a1a'; X.fillRect(x - 4, y - 6, 8, 6);
      X.fillStyle = '#ffd84a'; X.fillRect(x - 1, y - 4, 1, 1); X.fillRect(x + 1, y - 4, 1, 1); X.fillRect(x - 1, y - 3, 3, 1); X.fillRect(x, y - 2, 1, 1);
    },
  },
  catering: {
    desc: 'BUSY EATING FOR 3 SECONDS, -15 ANGER.',
    name: 'CATERING', kind: 'good', height: 6,
    onPickup(game, b) { b.st.eat = 3; game.addAnger(b, -15); game.say(b, 'NOM NOM', '#ffd84a'); },
    draw(x, y) {
      X.fillStyle = '#ddd'; X.fillRect(x - 4, y - 2, 9, 2);
      X.fillStyle = '#e0b060'; X.fillRect(x - 3, y - 5, 7, 3);
      X.fillStyle = '#5a9a3a'; X.fillRect(x - 3, y - 4, 7, 1);
    },
  },
  mirror: {
    desc: 'ADMIRES HIMSELF FOR 4 SECONDS, -15 ANGER.',
    name: 'MIRROR', kind: 'good', height: 10,
    onPickup(game, b) { b.st.admire = 4; game.addAnger(b, -15); game.say(b, 'LOOKIN GOOD', '#9fd8ff'); },
    draw(x, y) {
      X.fillStyle = '#c8a040'; X.fillRect(x - 3, y - 10, 7, 10);
      X.fillStyle = '#bfe0f0'; X.fillRect(x - 2, y - 9, 5, 8);
      X.fillStyle = '#fff'; X.fillRect(x - 1, y - 8, 1, 3);
    },
  },

  /* ---------- Die Wohnung ---------- */
  wine: {
    name: 'RED WINE', kind: 'bad', anger: 20, word: 'CHEERS', wordColor: '#ff8aa0', height: 10,
    desc: 'A GLASS OF RED. +20 ANGER. TAP IT AWAY!',
    draw(x, y) {
      X.fillStyle = '#ddd'; X.fillRect(x - 2, y - 9, 5, 1); X.fillRect(x - 2, y - 9, 1, 4); X.fillRect(x + 2, y - 9, 1, 4); X.fillRect(x, y - 4, 1, 3); X.fillRect(x - 2, y - 1, 5, 1);
      X.fillStyle = '#8a1020'; X.fillRect(x - 1, y - 7, 3, 3);
    },
  },
  record: {
    name: 'RECORD', kind: 'good', height: 8,
    desc: 'PUT ON A RECORD: BOTH CALM DOWN A BIT.',
    onPickup(game, b) {
      for (const x of game.bros) game.addAnger(x, -15);
      game.say(b, 'TUNE!', '#9fd8ff');
      game.comic('SPIN', b.x, b.y - 30, '#9fd8ff');
    },
    draw(x, y) {
      X.fillStyle = '#111'; X.fillRect(x - 3, y - 7, 7, 7); X.fillRect(x - 4, y - 6, 9, 5);
      X.fillStyle = '#e8c860'; X.fillRect(x - 1, y - 5, 3, 3);
      X.fillStyle = '#333'; X.fillRect(x - 3, y - 4, 1, 1); X.fillRect(x + 3, y - 3, 1, 1);
    },
  },

  /* ---------- Easter Egg (secret: taucht nicht auf der Info-Seite auf) ---------- */
  lemon: {
    name: 'LEMON', kind: 'good', secret: true, height: 7,
    desc: 'A VERY RARE LEMON. NOBODY KNOWS WHY IT IS HERE.',
    onPickup(game, b) {
      for (const x of game.bros) { game.addAnger(x, -20); game.say(x, 'HA HA!', '#fff27a'); }
      game.comic('LEMONS!', b.x, b.y - 30, '#fff27a');
      game.burst(b.x, b.y - 12, 10, '#fff27a');
      Save.data.stats.lemons = (Save.data.stats.lemons || 0) + 1;
      Save.write();
    },
    draw(x, y) {
      X.fillStyle = '#c8b010'; X.fillRect(x - 3, y - 5, 7, 5); X.fillRect(x - 4, y - 4, 9, 3);
      X.fillStyle = '#fff27a'; X.fillRect(x - 3, y - 5, 6, 4); X.fillRect(x - 4, y - 4, 1, 2);
      X.fillStyle = '#fffbc0'; X.fillRect(x - 2, y - 4, 2, 1);
      X.fillStyle = '#4a8a2a'; X.fillRect(x + 1, y - 7, 3, 2);
    },
  },

  /* ---------- Sammeln ---------- */
  setlist: {
    desc: 'TAP TO COLLECT. SOME GIGS NEED THEM.',
    name: 'SETLIST', kind: 'collect', height: 8,
    draw(x, y) {
      X.fillStyle = '#fff'; X.fillRect(x - 3, y - 7, 7, 7);
      X.fillStyle = '#d33'; X.fillRect(x - 2, y - 6, 5, 1);
      X.fillStyle = '#555'; X.fillRect(x - 2, y - 4, 5, 1); X.fillRect(x - 2, y - 2, 4, 1);
    },
  },

  /* ---------- Stolperfallen ---------- */
  splinters: {
    desc: 'TRIP HAZARD. TAP TO SWEEP IT UP.',
    name: 'SPLINTERS', kind: 'hazard', anger: 6, word: 'OUCH', wordColor: '#ff8a3a', stun: 0.8, height: 4,
    draw(x, y) {
      X.fillStyle = '#c8641e'; X.fillRect(x - 4, y - 2, 3, 1); X.fillRect(x + 1, y - 1, 3, 1); X.fillRect(x - 1, y - 3, 2, 1);
      X.fillStyle = '#5a3a1a'; X.fillRect(x - 2, y, 2, 1); X.fillRect(x + 3, y - 3, 1, 2);
    },
  },
  cable: {
    desc: 'TRIP HAZARD. TAP TO TIDY IT AWAY.',
    name: 'CABLE', kind: 'hazard', anger: 5, word: 'TRIP!', wordColor: '#ff8a3a', stun: 0.8, persist: true, height: 4,
    draw(x, y) {
      X.fillStyle = '#111';
      for (let k = -8; k <= 8; k++) X.fillRect(x + k, y - 1 + Math.round(Math.sin(k * .7) * 2), 1, 1);
      X.fillStyle = '#888'; X.fillRect(x + 8, y - 2, 2, 2);
    },
  },
};
