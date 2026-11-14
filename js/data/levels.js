/* =========================================================================
   data/levels.js – Alle Levels der Tour (6 Schauplätze x 10 Levels)

   So fügst du ein Level hinzu: einen Eintrag kopieren und anpassen.
   Die Reihenfolge in der Liste = Reihenfolge im Spiel (pro Schauplatz).

   Felder:
     id          eindeutiger Name, wird im Spielstand gespeichert (nicht mehr ändern!)
     venue       Schauplatz aus venues.js
     name        Titel (max. ca. 20 Zeichen)
     time        Sekunden bis zum Gig
     startAnger  Wut am Anfang [Bruder 1, Bruder 2]
     ramp        Sekunden, bis die Schwierigkeit um +1 steigt (kleiner = schneller schwer)
     items       Gegenstände mit Gewicht: { beer: 7, tea: 2 }
     itemEvery   [min, max] Sekunden zwischen zwei Gegenständen
     firstItem   Sekunden bis zum ersten Gegenstand
     prespawn    liegen schon am Anfang da: { cable: 3 }
     events      Events mit Abstand [min, max] Sekunden: { insult: [3, 5.5] }
     hint        Tipp auf der Startkarte
     bonus       Bonusziel für den 3. Stern (siehe goals.js): { type: 'bin', n: 6 }
     goal        Spezialziel (siehe goals.js): { type: 'collect', n: 5 } oder { type: 'stage' }
     extras      zusätzliche Figuren: ['tambourine'], ['drummer']
     mech        Werte der Schauplatz-Regel überschreiben, z. B. { volRate: 6 }
     headliner   true = Headliner (Gig-Szene + Plakat am Ende), city = Stadt dafür
     tutorial    Tutorial-Schritte (nur im ersten Level)
   ========================================================================= */

const LEVELS = [
  /* ======================= TOURBUS ======================= */
  {
    id: 'bus-1', venue: 'bus', name: 'FIRST MILES',
    time: 40, startAnger: [10, 10], ramp: 70,
    items: { beer: 1 }, itemEvery: [4, 6.5], firstItem: 4,
    events: { insult: [4.5, 7] },
    hint: 'KEEP THEM APART TIL THE GIG STARTS',
    bonus: { type: 'bin', n: 3 },
    tutorial: [
      { text: "KEV AND DEL HATE EACH OTHER. DRAG ONE AWAY! YOU CAN'T HOLD HIM FOREVER.", wait: 'drag', point: 'bro0' },
      { text: 'TAP A BROTHER TO CALM HIM DOWN.', wait: 'calm', point: 'bro1' },
      { text: 'BEER MAKES THEM ANGRY. TAP IT TO BIN IT!', wait: 'bin', spawn: 'beer', point: 'item' },
      { text: 'GOOD LUCK. THE GIG IS WAITING!', wait: 'time', t: 2.5 },
    ],
  },
  {
    id: 'bus-2', venue: 'bus', name: 'GUITAR TROUBLE',
    time: 45, startAnger: [20, 20], ramp: 50,
    items: { beer: 6, guitar: 4 }, itemEvery: [3.2, 5.5], firstItem: 3,
    events: { insult: [3.5, 6] },
    hint: 'GUITARS MAKE THEM EVEN ANGRIER. AND THEY LEAVE SPLINTERS!',
    bonus: { type: 'bin', n: 6 },
  },
  {
    id: 'bus-3', venue: 'bus', name: 'TEA BREAK',
    time: 45, startAnger: [25, 25], ramp: 45,
    items: { beer: 5, guitar: 2, tea: 3 }, itemEvery: [3, 5], firstItem: 2,
    events: { insult: [3.5, 6] },
    hint: 'TEA IS GOOD! DRAG THE CUP TO A BROTHER.',
    bonus: { type: 'serve', n: 2 },
  },
  {
    id: 'bus-4', venue: 'bus', name: 'POTHOLES',
    time: 50, startAnger: [20, 25], ramp: 45,
    items: { beer: 5, guitar: 2, tea: 2 }, itemEvery: [3, 5], firstItem: 3,
    events: { insult: [3.5, 6], pothole: [7, 10] },
    hint: 'WATCH THE ! SIGN: A POTHOLE THROWS EVERYONE AROUND.',
    bonus: { type: 'anger', n: 75 },
  },
  {
    id: 'bus-5', venue: 'bus', name: 'CHIP SHOP STOP',
    time: 50, startAnger: [25, 25], ramp: 45,
    items: { beer: 5, guitar: 2, chips: 3 }, itemEvery: [3, 5], firstItem: 2,
    events: { insult: [3.5, 6], pothole: [8, 12] },
    hint: 'CHIPS KEEP A BROTHER BUSY FOR 3 SECONDS.',
    bonus: { type: 'serve', n: 3 },
  },
  {
    id: 'bus-6', venue: 'bus', name: 'HAIRPIN BENDS',
    time: 55, startAnger: [25, 25], ramp: 42,
    items: { beer: 5, guitar: 2, tea: 2 }, itemEvery: [3, 5], firstItem: 3,
    events: { insult: [3.5, 6], curve: [6, 9] },
    hint: 'BENDS PUSH EVERYONE TO THE SIDE. HOLD ON TO THEM!',
    bonus: { type: 'calms', n: 10 },
  },
  {
    id: 'bus-7', venue: 'bus', name: 'FAN AT THE WINDOW',
    time: 55, startAnger: [25, 25], ramp: 42,
    items: { beer: 5, guitar: 2, tea: 2, chips: 1 }, itemEvery: [3, 5], firstItem: 3,
    events: { insult: [3.5, 6], fan: [7, 11] },
    hint: 'ONE WANTS THE FAN, THE OTHER GETS JEALOUS. TAP THE FAN AWAY!',
    bonus: { type: 'fans', n: 2 },
  },
  {
    id: 'bus-8', venue: 'bus', name: 'PRESS CUTTINGS',
    time: 60, startAnger: [25, 30], ramp: 40,
    items: { beer: 5, guitar: 2, newspaper: 2, headphones: 2, tea: 1 }, itemEvery: [2.8, 4.8], firstItem: 3,
    events: { insult: [3, 5.5], pothole: [9, 13] },
    hint: 'NEWSPAPERS: THE OTHER ONE READS THE INTERVIEW. HEADPHONES BLOCK INSULTS.',
    bonus: { type: 'bin', n: 10 },
  },
  {
    id: 'bus-9', venue: 'bus', name: 'NIGHT DRIVE',
    time: 60, startAnger: [30, 30], ramp: 38,
    items: { beer: 6, guitar: 3, tea: 2, chips: 1, newspaper: 1 }, itemEvery: [2.8, 4.8], firstItem: 3,
    events: { insult: [3, 5.5], pothole: [9, 13], curve: [9, 13], fan: [12, 16] },
    hint: 'EVERYTHING AT ONCE. YOU CAN DO THIS!',
    bonus: { type: 'nopower' },
  },
  {
    id: 'bus-10', venue: 'bus', name: 'HEADLINER: LONDON', headliner: true, city: 'LONDON',
    time: 80, startAnger: [30, 30], ramp: 34,
    items: { beer: 6, guitar: 3, tea: 2, chips: 1, newspaper: 1, headphones: 1, album: 0.3 }, itemEvery: [2.6, 4.5], firstItem: 2,
    events: { insult: [2.8, 5], pothole: [8, 12], curve: [8, 12], fan: [11, 15] },
    extras: ['drummer'],
    hint: 'THE BIG ONE. THE DRUMMER JOINS: TAP IN TIME TO CALM MORE!',
    bonus: { type: 'bin', n: 15 },
  },

  /* ======================= PROBERAUM ======================= */
  {
    id: 'rehearsal-1', venue: 'rehearsal', name: 'SOUNDCHECK',
    time: 40, startAnger: [15, 15], ramp: 60, mech: { volRate: 3 },
    items: { beer: 2, tea: 1 }, itemEvery: [4, 6], firstItem: 4,
    events: { insult: [4, 7] },
    hint: 'EACH BROTHER HAS AN AMP. LOUD AMP = THE OTHER GETS ANGRY. TAP AMPS TO TURN THEM DOWN!',
    bonus: { type: 'volume', n: 80 },
  },
  {
    id: 'rehearsal-2', venue: 'rehearsal', name: 'FEEDBACK',
    time: 45, startAnger: [20, 20], ramp: 50, mech: { volRate: 4 },
    items: { beer: 3, pedal: 3, tea: 1 }, itemEvery: [3.2, 5.2], firstItem: 3,
    events: { insult: [3.5, 6] },
    hint: 'EFFECT PEDALS CRANK THE AMP UP. BIN THEM!',
    bonus: { type: 'bin', n: 6 },
  },
  {
    id: 'rehearsal-3', venue: 'rehearsal', name: 'CABLE MESS',
    time: 45, startAnger: [20, 20], ramp: 48, mech: { volRate: 4 },
    items: { beer: 3, pedal: 2, cable: 2, tea: 1 }, itemEvery: [3.2, 5.2], firstItem: 3, prespawn: { cable: 3 },
    events: { insult: [3.5, 6] },
    hint: 'CABLES TRIP THEM UP. TAP TO TIDY THEM AWAY.',
    bonus: { type: 'bin', n: 8 },
  },
  {
    id: 'rehearsal-4', venue: 'rehearsal', name: 'TEA AND TINNITUS',
    time: 50, startAnger: [25, 25], ramp: 45, mech: { volRate: 4.5 },
    items: { beer: 3, pedal: 2, tea: 2, headphones: 2 }, itemEvery: [3, 5], firstItem: 3,
    events: { insult: [3.5, 6] },
    hint: 'HEADPHONES: DEAF TO INSULTS AND LOUD AMPS FOR 8 SECONDS.',
    bonus: { type: 'serve', n: 3 },
  },
  {
    id: 'rehearsal-5', venue: 'rehearsal', name: 'WHERE IS THE SETLIST',
    time: 50, startAnger: [20, 20], ramp: 45, mech: { volRate: 4 },
    goal: { type: 'collect', n: 5 },
    items: { beer: 3, pedal: 1, setlist: 3 }, itemEvery: [2.6, 4.2], firstItem: 2,
    events: { insult: [3.5, 6] },
    hint: 'COLLECT 5 SETLISTS BEFORE TIME RUNS OUT. TAP THEM!',
    bonus: { type: 'volume', n: 85 },
  },
  {
    id: 'rehearsal-6', venue: 'rehearsal', name: 'THE DRUMMER',
    time: 55, startAnger: [25, 25], ramp: 45, mech: { volRate: 4 },
    items: { beer: 3, pedal: 2, tea: 2 }, itemEvery: [3, 5], firstItem: 3,
    events: { insult: [3.5, 6] }, extras: ['drummer'],
    hint: 'EVERY 4TH BEAT MAKES THEM ANGRIER. TAP IN TIME TO CALM MORE!',
    bonus: { type: 'calms', n: 12 },
  },
  {
    id: 'rehearsal-7', venue: 'rehearsal', name: 'LOUDER!',
    time: 55, startAnger: [25, 25], ramp: 42, mech: { volRate: 6 },
    items: { beer: 3, pedal: 3, tea: 2, headphones: 1 }, itemEvery: [3, 5], firstItem: 3,
    events: { insult: [3.5, 6] },
    hint: 'THE AMPS CLIMB FAST TODAY.',
    bonus: { type: 'volume', n: 75 },
  },
  {
    id: 'rehearsal-8', venue: 'rehearsal', name: 'MIC THIEF',
    time: 60, startAnger: [25, 25], ramp: 40, mech: { volRate: 4.5 },
    items: { beer: 3, pedal: 2, mic: 2, tea: 2 }, itemEvery: [3, 5], firstItem: 3,
    events: { insult: [3.5, 6], setlist: [10, 14] },
    hint: 'WHOEVER GRABS THE MIC INSULTS TWICE AS HARD. SETLIST FIGHT IN THE MIDDLE!',
    bonus: { type: 'bin', n: 10 },
  },
  {
    id: 'rehearsal-9', venue: 'rehearsal', name: 'FIVE-A-SIDE',
    time: 60, startAnger: [30, 30], ramp: 38, mech: { volRate: 5 },
    items: { beer: 3, pedal: 2, football: 2, tea: 1, cable: 1 }, itemEvery: [3, 5], firstItem: 3,
    events: { insult: [3.2, 5.5], setlist: [12, 16] },
    hint: 'A FOOTBALL: THEY PLAY TOGETHER. WHILE CLOSE, ANGER DROPS!',
    bonus: { type: 'serve', n: 3 },
  },
  {
    id: 'rehearsal-10', venue: 'rehearsal', name: 'HEADLINER: MANCHESTER', headliner: true, city: 'MANCHESTER',
    time: 80, startAnger: [30, 30], ramp: 34, mech: { volRate: 5 },
    items: { beer: 4, pedal: 3, tea: 2, headphones: 1, mic: 1, cable: 1, album: 0.3 }, itemEvery: [2.6, 4.5], firstItem: 2,
    events: { insult: [3, 5], setlist: [11, 15] }, extras: ['drummer'],
    hint: 'HOMETOWN GIG. DO NOT BLOW IT.',
    bonus: { type: 'volume', n: 90 },
  },

  /* ======================= PUB ======================= */
  {
    id: 'pub-1', venue: 'pub', name: 'LAST ORDERS',
    time: 45, startAnger: [25, 25], ramp: 49, mech: { fanEvery: [4.5, 7] },
    items: { beer: 5, tea: 1 }, itemEvery: [3.2, 5.5], firstItem: 3,
    events: { insult: [3.5, 6] },
    hint: 'FANS WALK THROUGH AND BLOCK THE WAY. YOU CAN ONLY DRAG BETWEEN TABLES.',
    bonus: { type: 'bin', n: 6 },
  },
  {
    id: 'pub-2', venue: 'pub', name: 'BUSY NIGHT',
    time: 50, startAnger: [25, 30], ramp: 42, mech: { fanEvery: [3, 5] },
    items: { beer: 6, tea: 1, chips: 1 }, itemEvery: [3, 5], firstItem: 3,
    events: { insult: [3.5, 6] },
    hint: 'MORE FANS. MORE PINTS.',
    bonus: { type: 'bin', n: 8 },
  },
  {
    id: 'pub-3', venue: 'pub', name: 'JUKEBOX HERO',
    time: 50, startAnger: [30, 30], ramp: 39, mech: { fanEvery: [3.5, 5.5] },
    items: { beer: 5, tea: 2, headphones: 1 }, itemEvery: [3, 5], firstItem: 3,
    events: { insult: [3.5, 6], jukebox: [8, 12] },
    hint: 'THE JUKEBOX PLAYS THE RIVAL BAND. HEADPHONES HELP!',
    bonus: { type: 'anger', n: 80 },
  },
  {
    id: 'pub-4', venue: 'pub', name: 'TAMBOURINE MAN',
    time: 55, startAnger: [30, 30], ramp: 39, mech: { fanEvery: [4, 6] },
    items: { beer: 5, tea: 2 }, itemEvery: [3, 5], firstItem: 3,
    events: { insult: [3.5, 6] }, extras: ['tambourine'],
    hint: 'THE TAMBOURINE MAN GETS IN THE WAY AND NAPS ANYWHERE. TAP TO WAKE HIM.',
    bonus: { type: 'calms', n: 12 },
  },
  {
    id: 'pub-5', venue: 'pub', name: 'PINTS ON THE HOUSE',
    time: 55, startAnger: [30, 30], ramp: 36, mech: { fanEvery: [3.5, 5.5] },
    items: { beer: 9, tea: 1 }, itemEvery: [2, 3.5], firstItem: 2,
    events: { insult: [3.5, 6] },
    hint: 'THE BARMAN IS GENEROUS TONIGHT.',
    bonus: { type: 'bin', n: 14 },
  },
  {
    id: 'pub-6', venue: 'pub', name: 'PAPARAZZI',
    time: 55, startAnger: [30, 30], ramp: 36, mech: { fanEvery: [3.5, 5.5] },
    items: { beer: 5, tea: 2, newspaper: 1 }, itemEvery: [3, 5], firstItem: 3,
    events: { insult: [3.5, 6], photographer: [8, 12] },
    hint: 'A FLASH! FOR 2 SECONDS YOU ONLY SEE OUTLINES.',
    bonus: { type: 'anger', n: 80 },
  },
  {
    id: 'pub-7', venue: 'pub', name: 'SETLIST HUNT',
    time: 55, startAnger: [25, 30], ramp: 36, mech: { fanEvery: [3.5, 5.5] },
    goal: { type: 'collect', n: 6 },
    items: { beer: 4, setlist: 3, tea: 1 }, itemEvery: [2.4, 4], firstItem: 2,
    events: { insult: [3.5, 6], jukebox: [10, 14] },
    hint: 'SOMEONE LOST THE SETLISTS IN THE PUB. COLLECT 6!',
    bonus: { type: 'bin', n: 8 },
  },
  {
    id: 'pub-8', venue: 'pub', name: 'LOCK-IN',
    time: 60, startAnger: [30, 35], ramp: 34, mech: { fanEvery: [3.5, 5.5] },
    items: { beer: 5, tea: 2, chips: 1 }, itemEvery: [3, 5], firstItem: 3,
    events: { insult: [3.5, 6], blackout: [10, 14] },
    hint: 'POWER CUTS! ONLY THE ANGER BARS GLOW IN THE DARK.',
    bonus: { type: 'serve', n: 3 },
  },
  {
    id: 'pub-9', venue: 'pub', name: 'BROKEN GLASS',
    time: 60, startAnger: [35, 35], ramp: 32, mech: { fanEvery: [3, 5] },
    items: { beer: 5, guitar: 3, tea: 2 }, itemEvery: [2.8, 4.6], firstItem: 3, prespawn: { splinters: 3 },
    events: { insult: [3.2, 5.5], jukebox: [11, 15] }, extras: ['tambourine'],
    hint: 'SPLINTERS EVERYWHERE. TIDY UP!',
    bonus: { type: 'bin', n: 12 },
  },
  {
    id: 'pub-10', venue: 'pub', name: 'HEADLINER: GLASGOW', headliner: true, city: 'GLASGOW',
    time: 80, startAnger: [35, 35], ramp: 28, mech: { fanEvery: [3, 4.5] },
    items: { beer: 7, tea: 2, chips: 1, newspaper: 1, album: 0.3 }, itemEvery: [2.4, 4.2], firstItem: 2,
    events: { insult: [3, 5], jukebox: [10, 14], photographer: [12, 16] }, extras: ['tambourine'],
    hint: 'THE LOUDEST CROWD IN BRITAIN.',
    bonus: { type: 'bin', n: 16 },
  },

  /* ======================= BACKSTAGE ======================= */
  {
    id: 'backstage-1', venue: 'backstage', name: 'GREEN ROOM',
    time: 45, startAnger: [20, 20], ramp: 55,
    items: { beer: 4, tea: 1 }, itemEvery: [3.5, 5.5], firstItem: 3,
    events: { insult: [4, 6.5] },
    hint: 'TAP THE DOOR TO LOCK IT. LOCKED APART THEY CALM DOWN, BUT NOT FOR LONG: THEY KICK IT IN!',
    bonus: { type: 'locks', n: 2 },
  },
  {
    id: 'backstage-2', venue: 'backstage', name: 'VANITY',
    time: 50, startAnger: [25, 25], ramp: 48,
    items: { beer: 4, mirror: 2, tea: 1 }, itemEvery: [3, 5], firstItem: 3,
    events: { insult: [3.5, 6] },
    hint: 'A MIRROR KEEPS ONE BUSY ADMIRING HIMSELF.',
    bonus: { type: 'serve', n: 2 },
  },
  {
    id: 'backstage-3', venue: 'backstage', name: 'CATERING',
    time: 50, startAnger: [25, 25], ramp: 46,
    items: { beer: 4, catering: 3, guitar: 1 }, itemEvery: [3, 5], firstItem: 3,
    events: { insult: [3.5, 6] },
    hint: 'SANDWICHES CALM THEM A LOT.',
    bonus: { type: 'serve', n: 3 },
  },
  {
    id: 'backstage-4', venue: 'backstage', name: 'PRESS PASS',
    time: 55, startAnger: [25, 25], ramp: 44,
    items: { beer: 4, newspaper: 2, catering: 1, tea: 1 }, itemEvery: [3, 5], firstItem: 3,
    events: { insult: [3.5, 6], photographer: [8, 12] },
    hint: 'PHOTOGRAPHERS EVERYWHERE.',
    bonus: { type: 'locks', n: 2 },
  },
  {
    id: 'backstage-5', venue: 'backstage', name: 'THE HAT',
    time: 55, startAnger: [25, 25], ramp: 44,
    items: { beer: 4, buckethat: 2, mirror: 1, tea: 1 }, itemEvery: [3, 5], firstItem: 3,
    events: { insult: [3.5, 6] },
    hint: "NOBODY TOUCHES DEL'S BUCKET HAT.",
    bonus: { type: 'bin', n: 8 },
  },
  {
    id: 'backstage-6', venue: 'backstage', name: 'JINGLE JANGLE',
    time: 55, startAnger: [25, 30], ramp: 42,
    items: { beer: 4, catering: 2, tea: 1 }, itemEvery: [3, 5], firstItem: 3,
    events: { insult: [3.5, 6] }, extras: ['tambourine'],
    hint: 'THE TAMBOURINE MAN IS BACK.',
    bonus: { type: 'anger', n: 80 },
  },
  {
    id: 'backstage-7', venue: 'backstage', name: 'FUSE BOX',
    time: 60, startAnger: [25, 30], ramp: 40,
    items: { beer: 5, mirror: 1, catering: 1, tea: 1 }, itemEvery: [3, 5], firstItem: 3,
    events: { insult: [3.5, 6], blackout: [9, 13] },
    hint: 'THE LIGHTS KEEP GOING OUT.',
    bonus: { type: 'locks', n: 3 },
  },
  {
    id: 'backstage-8', venue: 'backstage', name: 'THE INTERVIEW',
    time: 60, startAnger: [30, 30], ramp: 38,
    items: { beer: 4, newspaper: 3, mic: 1, headphones: 2 }, itemEvery: [2.8, 4.6], firstItem: 3,
    events: { insult: [3.2, 5.5], photographer: [10, 14] },
    hint: 'THE MUSIC PRESS IS HERE. HIDE THE PAPERS.',
    bonus: { type: 'bin', n: 10 },
  },
  {
    id: 'backstage-9', venue: 'backstage', name: 'STAGE CALL',
    time: 45, startAnger: [25, 25], ramp: 42, goal: { type: 'stage' },
    items: { beer: 4, catering: 2, tea: 1 }, itemEvery: [3, 5], firstItem: 3,
    events: { insult: [3.5, 6] },
    hint: 'WHEN THE TIME IS UP, BRING BOTH TO THE STAGE ZONE AT THE TOP. KEEP THEM AT OPPOSITE ENDS!',
    bonus: { type: 'calms', n: 10 },
  },
  {
    id: 'backstage-10', venue: 'backstage', name: 'HEADLINER: BIRMINGHAM', headliner: true, city: 'BIRMINGHAM',
    time: 70, startAnger: [30, 30], ramp: 34, goal: { type: 'stage' }, mech: { kickTime: 4 },
    items: { beer: 5, mirror: 1, catering: 2, buckethat: 1, newspaper: 1, album: 0.3 }, itemEvery: [2.6, 4.4], firstItem: 2,
    events: { insult: [3, 5], photographer: [10, 14] }, extras: ['tambourine'],
    hint: 'SURVIVE, THEN GET THEM BOTH ON STAGE.',
    bonus: { type: 'locks', n: 3 },
  },

  /* ======================= FESTIVAL ======================= */
  {
    id: 'festival-1', venue: 'festival', name: 'LINE CHECK',
    time: 45, startAnger: [15, 15], ramp: 75, mech: { drain: 3 },
    items: { beer: 3, tea: 1 }, itemEvery: [3.5, 5.5], firstItem: 3,
    events: { insult: [4, 6.5] },
    hint: "KEEP EACH BROTHER AT HIS MIC, OR THE CROWD LEAVES. BUT DON'T LET THEM GET CLOSE!",
    bonus: { type: 'crowd', n: 50 },
  },
  {
    id: 'festival-2', venue: 'festival', name: 'CROWDSURFERS',
    time: 50, startAnger: [15, 20], ramp: 66, mech: { drain: 3.5 },
    items: { beer: 3, tea: 2 }, itemEvery: [3.2, 5.2], firstItem: 3,
    events: { insult: [3.5, 6], crowdsurfer: [6, 9] },
    hint: 'CROWDSURFERS KNOCK THEM OFF THEIR MARKS.',
    bonus: { type: 'crowd', n: 40 },
  },
  {
    id: 'festival-3', venue: 'festival', name: 'BRITISH SUMMER',
    time: 50, startAnger: [20, 20], ramp: 54, mech: { drain: 3.5 },
    items: { beer: 3, tea: 2 }, itemEvery: [3, 5], firstItem: 3,
    events: { insult: [3.5, 6], rain: [10, 14] },
    hint: 'RAIN MAKES THE STAGE SLIPPERY. RELEASED BROTHERS SLIDE!',
    bonus: { type: 'anger', n: 80 },
  },
  {
    id: 'festival-4', venue: 'festival', name: 'MONITOR MIX',
    time: 55, startAnger: [20, 20], ramp: 52, mech: { drain: 4 },
    items: { beer: 3, mic: 2, tea: 2, headphones: 1 }, itemEvery: [3, 5], firstItem: 3,
    events: { insult: [3.5, 6] }, extras: ['drummer'],
    hint: 'THE DRUMMER SETS THE BEAT.',
    bonus: { type: 'crowd', n: 45 },
  },
  {
    id: 'festival-5', venue: 'festival', name: 'ENCORE',
    time: 45, startAnger: [20, 20], ramp: 52, goal: { type: 'stage' }, mech: { drain: 3.5 },
    items: { beer: 3, tea: 2 }, itemEvery: [3, 5], firstItem: 3,
    events: { insult: [3.5, 6], crowdsurfer: [8, 12] },
    hint: 'AFTER THE SET, BOTH BACK TO THE DRUM RISER FOR THE ENCORE!',
    bonus: { type: 'crowd', n: 40 },
  },
  {
    id: 'festival-6', venue: 'festival', name: 'MUD AND JINGLES',
    time: 55, startAnger: [20, 20], ramp: 50, mech: { drain: 4 },
    items: { beer: 3, tea: 2, chips: 1 }, itemEvery: [3, 5], firstItem: 3,
    events: { insult: [3.5, 6], rain: [12, 16] }, extras: ['tambourine'],
    hint: 'RAIN AND THE TAMBOURINE MAN. GREAT.',
    bonus: { type: 'calms', n: 12 },
  },
  {
    id: 'festival-7', venue: 'festival', name: 'MOSH PIT',
    time: 55, startAnger: [20, 25], ramp: 48, mech: { drain: 4 },
    items: { beer: 4, tea: 2 }, itemEvery: [3, 5], firstItem: 3,
    events: { insult: [3.5, 6], crowdsurfer: [4, 6.5] },
    hint: 'THE CROWD IS WILD TONIGHT.',
    bonus: { type: 'crowd', n: 35 },
  },
  {
    id: 'festival-8', venue: 'festival', name: 'TERRACE CHANTS',
    time: 60, startAnger: [25, 25], ramp: 48, mech: { drain: 4 },
    items: { beer: 4, football: 2, tea: 1, album: 0.4 }, itemEvery: [3, 5], firstItem: 3,
    events: { insult: [3.5, 6], fan: [10, 14] },
    hint: 'A FOOTBALL ON STAGE? WHY NOT.',
    bonus: { type: 'fans', n: 2 },
  },
  {
    id: 'festival-9', venue: 'festival', name: 'SPOTLIGHT',
    time: 60, startAnger: [25, 25], ramp: 46, mech: { drain: 4.5 },
    items: { beer: 4, tea: 2, mic: 1 }, itemEvery: [3, 5], firstItem: 3,
    events: { insult: [3.2, 5.5], blackout: [10, 14], photographer: [12, 16] },
    hint: 'LIGHTS OUT, FLASHES ON.',
    bonus: { type: 'crowd', n: 40 },
  },
  {
    id: 'festival-10', venue: 'festival', name: 'HEADLINER: READING', headliner: true, city: 'READING',
    time: 80, startAnger: [25, 25], ramp: 42, mech: { drain: 4.5 },
    items: { beer: 4, tea: 2, mic: 1, headphones: 1, album: 0.3 }, itemEvery: [2.8, 4.6], firstItem: 2,
    events: { insult: [3, 5], crowdsurfer: [7, 10], rain: [16, 20] }, extras: ['drummer'],
    hint: '90.000 PEOPLE. NO PRESSURE.',
    bonus: { type: 'crowd', n: 40 },
  },

  /* ======================= HOTEL ======================= */
  {
    id: 'hotel-1', venue: 'hotel', name: 'CHECK-IN',
    time: 45, startAnger: [25, 25], ramp: 47,
    items: { minibar: 3, tea: 1 }, itemEvery: [3.5, 5.5], firstItem: 3,
    events: { insult: [4, 6.5] },
    hint: 'THREE FLOORS. DRAG A BROTHER INTO THE YELLOW LIFT AND LET GO: HE RIDES TO A FLOOR AWAY FROM HIS BROTHER.',
    bonus: { type: 'bin', n: 5 },
  },
  {
    id: 'hotel-2', venue: 'hotel', name: 'MINIBAR',
    time: 50, startAnger: [30, 30], ramp: 40,
    items: { minibar: 6, tea: 1 }, itemEvery: [2.8, 4.6], firstItem: 2,
    events: { insult: [3.5, 6] },
    hint: 'THE MINIBAR IS FULL.',
    bonus: { type: 'bin', n: 9 },
  },
  {
    id: 'hotel-3', venue: 'hotel', name: 'BEDTIME',
    time: 55, startAnger: [25, 25], ramp: 42,
    items: { minibar: 3, tea: 3 }, itemEvery: [3, 5], firstItem: 3,
    events: { insult: [4, 6.5] },
    hint: 'DROP A CALM BROTHER (UNDER 45%) ON A BED: HE SLEEPS. BOTH ASLEEP = NIGHT BONUS!',
    bonus: { type: 'sleep', n: 5 },
  },
  {
    id: 'hotel-4', venue: 'hotel', name: 'ROOM SERVICE',
    time: 55, startAnger: [30, 30], ramp: 38,
    items: { minibar: 4, tea: 2 }, itemEvery: [3, 5], firstItem: 3,
    events: { insult: [3.5, 6], knock: [9, 13] },
    hint: 'KNOCK KNOCK! ROOM SERVICE WAKES EVERYONE, BUT BRINGS CHIPS.',
    bonus: { type: 'serve', n: 3 },
  },
  {
    id: 'hotel-5', venue: 'hotel', name: 'TELLY OUT THE WINDOW',
    time: 55, startAnger: [30, 30], ramp: 36,
    items: { minibar: 4, tea: 2, headphones: 1 }, itemEvery: [3, 5], firstItem: 3,
    events: { insult: [3.5, 6], tv: [8, 12] },
    hint: 'ROCK AND ROLL. THE TV GOES OUT THE WINDOW.',
    bonus: { type: 'anger', n: 80 },
  },
  {
    id: 'hotel-6', venue: 'hotel', name: 'LOBBY JINGLES',
    time: 55, startAnger: [30, 30], ramp: 34,
    items: { minibar: 4, tea: 2 }, itemEvery: [3, 5], firstItem: 3,
    events: { insult: [3.5, 6] }, extras: ['tambourine'],
    hint: 'THE TAMBOURINE MAN BOOKED A ROOM TOO.',
    bonus: { type: 'calms', n: 12 },
  },
  {
    id: 'hotel-7', venue: 'hotel', name: 'NIGHT SHIFT',
    time: 60, startAnger: [25, 30], ramp: 36,
    items: { minibar: 3, tea: 3 }, itemEvery: [3, 5], firstItem: 3,
    events: { insult: [4, 6.5], blackout: [11, 15] },
    hint: 'GET THEM BOTH TO SLEEP FOR THE BONUS.',
    bonus: { type: 'sleep', n: 10 },
  },
  {
    id: 'hotel-8', venue: 'hotel', name: 'TABLOIDS',
    time: 60, startAnger: [35, 35], ramp: 32,
    items: { minibar: 4, newspaper: 2, tea: 2 }, itemEvery: [3, 5], firstItem: 3,
    events: { insult: [3.5, 6], photographer: [9, 13] },
    hint: 'THE TABLOIDS ARE CAMPING IN THE LOBBY.',
    bonus: { type: 'bin', n: 10 },
  },
  {
    id: 'hotel-9', venue: 'hotel', name: 'LATE CHECKOUT',
    time: 55, startAnger: [30, 30], ramp: 34, goal: { type: 'collect', n: 6 },
    items: { minibar: 3, setlist: 3, tea: 1 }, itemEvery: [2.4, 4], firstItem: 2,
    events: { insult: [3.5, 6], knock: [10, 14] },
    hint: 'THE SETLISTS ARE ALL OVER THE HOTEL. COLLECT 6!',
    bonus: { type: 'bin', n: 6 },
  },
  {
    id: 'hotel-10', venue: 'hotel', name: 'HEADLINER: LIVERPOOL', headliner: true, city: 'LIVERPOOL',
    time: 80, startAnger: [35, 35], ramp: 26,
    items: { minibar: 5, tea: 2, chips: 1, newspaper: 1, album: 0.3 }, itemEvery: [2.6, 4.4], firstItem: 2,
    events: { insult: [3, 5], tv: [10, 14], knock: [12, 16] }, extras: ['drummer'],
    hint: 'THE LAST NIGHT OF THE TOUR.',
    bonus: { type: 'sleep', n: 6 },
  },

  /* ======================= DAS MOOR (Bonus) ======================= */
  {
    id: 'flat-1', venue: 'flat', name: 'LAZY SUNDAY',
    time: 50, startAnger: [25, 25], ramp: 50,
    items: { wine: 3, beer: 2, tea: 2, record: 2 }, itemEvery: [3.2, 5.2], firstItem: 3,
    events: { insult: [3.5, 6] },
    hint: 'CLOUDS DRIFT, PATCHES OF SUN MOVE OVER THE GRASS. A BROTHER STANDING IN THE SUN CALMS DOWN. RECORDS CALM BOTH!',
    bonus: { type: 'anger', n: 75 },
  },
  {
    id: 'flat-2', venue: 'flat', name: 'PHOTO SHOOT',
    time: 55, startAnger: [30, 30], ramp: 44,
    items: { wine: 3, beer: 2, newspaper: 1, record: 2, tea: 1 }, itemEvery: [3, 5], firstItem: 3,
    events: { insult: [3.5, 6], photographer: [7, 10], fan: [12, 16] },
    hint: 'THE BIG COVER SHOOT OUT ON THE MOOR. THE PHOTOGRAPHER KEEPS FLASHING. KEEP THEM APART FOR THE PICTURE!',
    bonus: { type: 'calms', n: 10 },
  },
  {
    id: 'flat-3', venue: 'flat', name: 'SUPERSONIC SUNDAY',
    time: 65, startAnger: [35, 35], ramp: 36,
    items: { wine: 4, beer: 3, guitar: 2, record: 2, tea: 2, album: 0.3 }, itemEvery: [2.6, 4.4], firstItem: 2,
    events: { insult: [3, 5], photographer: [9, 13], fan: [11, 15] }, extras: ['tambourine'],
    hint: 'EVERYONE CAME OUT FOR A PICNIC. EVEN THE TAMBOURINE MAN. ENJOY THE SUN WHILE IT LASTS.',
    bonus: { type: 'serve', n: 3 },
  },
];

/* ---------- Mehr Abwechslung: neue Events pro Schauplatz ----------
   [Schauplatz, Level-Nummer (1 = erstes), Event, Abstand in Sekunden].
   Kommt ein Event in einem Schauplatz zum ersten Mal vor, zeigt die Startkarte "NEW!". */
const TWISTS = [
  ['bus', 3, 'brakes', [12, 16]], ['bus', 5, 'brakes', [11, 15]], ['bus', 8, 'brakes', [10, 14]],
  ['rehearsal', 3, 'gust', [11, 15]], ['rehearsal', 4, 'frog', [10, 14]], ['rehearsal', 6, 'frog', [9, 13]],
  ['rehearsal', 7, 'gust', [10, 14]], ['rehearsal', 9, 'frog', [9, 13]], ['rehearsal', 10, 'gust', [11, 15]],
  ['pub', 2, 'lastorders', [14, 18]], ['pub', 4, 'lastorders', [13, 17]], ['pub', 5, 'lastorders', [12, 16]], ['pub', 8, 'lastorders', [12, 16]],
  ['backstage', 2, 'fan', [12, 16]], ['backstage', 3, 'setlist', [12, 16]], ['backstage', 5, 'jukebox', [12, 16]], ['backstage', 9, 'blackout', [14, 18]],
  ['festival', 4, 'pyro', [10, 14]], ['festival', 7, 'pyro', [9, 13]], ['festival', 8, 'pyro', [9, 13]], ['festival', 10, 'pyro', [10, 14]],
  ['hotel', 2, 'housekeeping', [12, 16]], ['hotel', 3, 'housekeeping', [11, 15]], ['hotel', 6, 'knock', [12, 16]],
  ['hotel', 7, 'housekeeping', [10, 14]], ['hotel', 8, 'housekeeping', [10, 14]],
  ['flat', 1, 'sheep', [11, 15]], ['flat', 2, 'sheep', [10, 14]], ['flat', 3, 'sheep', [10, 14]], ['flat', 3, 'rain', [16, 20]],
];
for (const [v, n, ev, gap] of TWISTS) {
  const lv = LEVELS.filter(l => l.venue === v)[n - 1];
  if (lv) lv.events = { ...(lv.events || {}), [ev]: gap };
}

/* ---------- Hilfsfunktionen (musst du nicht anfassen) ---------- */

/** Alle Levels eines Schauplatzes in Reihenfolge */
function levelsOf(venueId) { return LEVELS.filter(l => l.venue === venueId); }

/** "BUS 3" – Kurzbezeichnung fürs HUD */
function levelLabel(lv) {
  if (lv.endless) return 'CITY ' + (lv.cityNo || 1);
  if (lv.sandbox) return 'FREE';
  return VENUES[lv.venue].short + ' ' + (levelsOf(lv.venue).indexOf(lv) + 1);
}

/** Das Level nach lv (auch über Schauplätze hinweg) oder null */
function levelAfter(lv) { return LEVELS[LEVELS.indexOf(lv) + 1] || null; }

/** Events, die in diesem Level zum ersten Mal (in seinem Schauplatz) vorkommen */
function newEventsIn(lv) {
  if (!lv || lv.sandbox || lv.endless) return [];
  const before = new Set();
  for (const l of levelsOf(lv.venue)) { if (l === lv) break; for (const e in l.events || {}) before.add(e); }
  return Object.keys(lv.events || {}).filter(e => e !== 'insult' && !before.has(e) && EVENTS[e]);
}
