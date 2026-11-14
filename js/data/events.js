/* =========================================================================
   data/events.js – Events während eines Levels

   So fügst du ein Event hinzu:
   1. Neuen Eintrag unten anlegen
   2. Im Level unter "events" mit Zeitabstand eintragen,
      z. B. events: { insult: [3, 5.5] }  = alle 3 bis 5,5 Sekunden
      (der Abstand wird mit steigender Schwierigkeit kürzer)

   Felder:
     name       Anzeigename (Debug-Menü, Info-Seite)
     desc       Beschreibung für die Info-Seite
     icon       1 Zeichen für die Ankündigung am Rand (oder Funktion icon(ctx))
     warn       Sekunden Vorwarnung (Symbol blinkt am Rand), damit es fair bleibt. 0 = sofort
     prepare(game, ctx)     optional: schon bei der Ankündigung (z. B. Richtung auswürfeln)
     run(game, ctx)         wenn das Event startet
     duration   optional: Sekunden, die das Event aktiv bleibt
     flags      optional: z. B. ['slippery'], solange aktiv
     update(game, dt, ctx)  optional: jedes Frame, solange aktiv
     draw(game, ctx)        optional: im Spielfeld (Welt-Koordinaten)
     drawScreen(game, ctx)  optional: über allem (Bildschirm-Koordinaten, game.sx(x) rechnet um)
     pointerDown(game, p, ctx)  optional: Tippen ins Spielfeld, true = verbraucht
     end(game, ctx)         optional: wenn die Dauer vorbei ist
   ctx ist ein Objekt, in dem sich das Event Dinge merken kann. ctx.end = true beendet es sofort.

   Nützliche Funktionen von game (siehe game.js):
     game.bros, game.other(bro), game.dist(), game.say(bro, text, farbe),
     game.addAnger(bro, menge), game.toastMsg(text, farbe), game.comic(text, x, y, farbe),
     game.dropBro(bro), game.pushBro(bro, dx, dy), game.spawnItemAt(typ, x, y), game.shake
   ========================================================================= */

const EVENTS = {
  insult: {
    desc: 'ONE SHOUTS, THE OTHER GETS ANGRY. WORSE WHEN CLOSE.',
    name: 'INSULT', icon: '!', warn: 0,
    lines: ['OI!', '#@%!', 'SHUT IT', 'RUBBISH!', 'MY BAND!', 'YOUR SONG?!', 'MUM SAYS..', 'SIT DOWN', 'TALENTLESS', 'COPYCAT!'],
    run(game) {
      // Wer das Mikro hat, pöbelt öfter. Einer pöbelt, der andere wird wütend.
      const vis = game.bros.filter(b => !b.hidden && !b.asleep);
      if (vis.length < 2) return;
      const withMic = vis.find(b => b.st.mic > 0);
      const speaker = withMic && Math.random() < .75 ? withMic : pickOne(vis), other = game.other(speaker);
      if (game.pair.silent) {   // Schwestern ignorieren sich nur
        game.say(speaker, '...', '#aaa');
        game.addAnger(other, 5);
        return;
      }
      game.say(speaker, pickOne(this.lines));
      speaker.anger = Math.max(0, speaker.anger - 6);
      if (other.st.deaf > 0) { game.say(other, 'LA LA LA', '#9fd8ff'); return; }   // Kopfhörer!
      let n = game.dist() < 90 ? 12 : 5;
      if (speaker.st.mic > 0) n *= 2;
      game.addAnger(other, n);
    },
  },

  pothole: {
    desc: 'EVERYONE FLIES UP. YOU LOSE YOUR GRIP.',
    name: 'POTHOLE', icon: '!', warn: 1,
    run(game) {
      // Alle werden nach oben geschleudert, gezogene Brüder rutschen aus dem Finger
      for (const b of game.bros) {
        if (b.hidden) continue;
        game.dropBro(b);
        game.pushBro(b, 0, -16);
        b.st.stun = Math.max(b.st.stun, .5);
        game.addAnger(b, 4);
        game.say(b, 'OW!', '#ff8a3a');
      }
      for (const it of game.items) if (!it.held) it.y = Math.max(game.venue.spawn.y0, it.y - 8);
      game.comic('BONK!', 90, 140, '#ffd84a');
      game.shake = 4;
      buzz(80);
    },
  },

  curve: {
    desc: 'PUSHES EVERYONE TO ONE SIDE OF THE BUS.',
    name: 'CURVE', warn: 1, duration: 1.3,
    prepare(game, ctx) { ctx.dir = Math.random() < .5 ? -1 : 1; },
    icon(ctx) { return ctx.dir < 0 ? '<' : '>'; },
    run(game, ctx) { game.toastMsg(ctx.dir < 0 ? 'LEFT BEND!' : 'RIGHT BEND!', '#ffd84a'); },
    update(game, dt, ctx) {
      // Kurve schiebt alles, was nicht festgehalten wird, zur Seite
      for (const b of game.bros) if (b.drag == null && !b.hidden && !b.asleep) game.pushBro(b, ctx.dir * 40 * dt, 0);
      const S = game.venue.spawn;
      for (const it of game.items) if (!it.held) it.x = clamp(it.x + ctx.dir * 22 * dt, S.x0, S.x1);
    },
  },

  fan: {
    desc: 'ONE WALKS TO THE FAN, THE OTHER GETS JEALOUS. TAP IT!',
    name: 'FAN', icon: 'F', warn: 1, duration: 6,
    prepare(game, ctx) {
      ctx.spot = pickOne(game.venue.fanSpots || [{ x: 90, y: 60, tx: 90, ty: 75 }]);
      ctx.bro = pickOne(game.bros.filter(b => !b.hidden));
    },
    run(game, ctx) {
      // Ein Bruder will zum Fan, der andere wird eifersüchtig. Fan antippen = verscheuchen.
      if (!ctx.bro) { ctx.end = true; return; }
      ctx.bro.goal = { x: ctx.spot.tx, y: ctx.spot.ty };
      game.say(ctx.bro, 'A FAN!', '#ffd84a');
    },
    update(game, dt, ctx) {
      const b = ctx.bro, o = game.other(b);
      if (Math.hypot(b.x - ctx.spot.tx, b.y - ctx.spot.ty) < 16) {
        game.addAnger(o, 7 * dt);
        if (!ctx.jealous) { ctx.jealous = true; game.say(o, 'OI! MY FAN!', '#ff8a3a'); }
      }
    },
    pointerDown(game, p, ctx) {
      if (Math.hypot(p.x - ctx.spot.x, p.y - ctx.spot.y) < 14) {
        ctx.end = true; game.stats.fans++;
        game.burst(ctx.spot.x, ctx.spot.y - 6, 6, '#ffd84a');
        return true;
      }
      return false;
    },
    draw(game, ctx) {
      const { x, y } = ctx.spot, wave = Math.sin(game.T * 12) > 0 ? 1 : 0;
      X.fillStyle = '#000'; X.fillRect(x - 5, y - 13, 10, 13);
      X.fillStyle = '#e2b38f'; X.fillRect(x - 3, y - 11, 6, 6);
      X.fillStyle = '#d8a020'; X.fillRect(x - 3, y - 12, 6, 2);
      X.fillStyle = '#000'; X.fillRect(x - 2, y - 9, 1, 1); X.fillRect(x + 1, y - 9, 1, 1); X.fillRect(x - 1, y - 7, 2, 1);
      X.fillStyle = '#c03030'; X.fillRect(x - 4, y - 4, 8, 4);
      X.fillStyle = '#e2b38f'; X.fillRect(x + 4, y - 9 - wave * 2, 2, 4);
      if ((game.T * 4 | 0) % 2) txt('!', x, y - 19, '#ffd84a', 1, 'c');
    },
    end(game, ctx) { if (ctx.bro) ctx.bro.goal = null; },
  },

  photographer: {
    desc: 'FLASH! FOR 2 SECONDS YOU SEE ONLY OUTLINES.',
    name: 'PHOTOGRAPHER', icon: 'P', warn: 1, duration: 2.2,
    run(game, ctx) { ctx.t = 0; game.comic('FLASH!', 90, 100, '#fff'); },
    update(game, dt, ctx) { ctx.t += dt; },
    drawScreen(game, ctx) {
      // Blitz, danach 2 Sekunden nur Umrisse
      const OX = VIEW.OX;
      if (ctx.t < .15) { X.fillStyle = '#fff'; X.fillRect(OX, 26, PLAY_W, 278); return; }
      X.fillStyle = 'rgba(8,8,14,.94)'; X.fillRect(OX, 26, PLAY_W, 278);
      for (const b of game.bros) {
        if (b.hidden) continue;
        const x = Math.round(game.sx(b.x)), y = Math.round(b.y);
        X.fillStyle = '#4a4a5e'; X.fillRect(x - 6, y - 15, 12, 15); X.fillRect(x - 4, y - 24, 8, 9);
      }
    },
  },

  blackout: {
    desc: 'LIGHTS OUT. ONLY THE ANGER BARS GLOW.',
    name: 'BLACKOUT', icon: '*', warn: 1, duration: 3.5,
    run(game) { game.toastMsg('POWER CUT!', '#ffd84a'); },
    drawScreen(game) {
      // Licht aus, nur die Wut-Leisten leuchten
      X.fillStyle = 'rgba(0,0,0,.95)'; X.fillRect(VIEW.OX, 26, PLAY_W, 278);
      for (const b of game.bros) {
        if (b.hidden) continue;
        const x = Math.round(game.sx(b.x)), y = Math.round(b.y);
        X.fillStyle = angerColor(b.anger); X.fillRect(x - 5, y - 30, Math.max(1, Math.round(10 * b.anger / 100)), 1);
      }
    },
  },

  setlist: {
    desc: 'A SETLIST LANDS IN THE MIDDLE. BIN IT FAST.',
    name: 'SETLIST FIGHT', icon: 'S', warn: 0.8,
    run(game) {
      // Ein Zettel landet in der Mitte. Wer ihn zuerst hat, provoziert den anderen.
      const B = game.venue.spawn;
      game.spawnItemAt('setlistfight', (B.x0 + B.x1) / 2 + rnd(-10, 10), (B.y0 + B.y1) / 2 + rnd(-10, 10));
      game.comic('SETLIST!', 90, 120, '#ffe890');
    },
  },

  jukebox: {
    desc: 'PLAYS THE RIVAL BAND. BOTH GET ANGRY.',
    name: 'JUKEBOX', icon: 'J', warn: 1,
    run(game) {
      // Die Jukebox spielt den Song der Konkurrenz
      for (const b of game.bros) if (!b.hidden && !(b.st.deaf > 0)) game.addAnger(b, 12);
      game.comic('NOT THIS SONG!', 90, 90, '#ff8aff');
    },
  },

  crowdsurfer: {
    desc: 'FLIES ACROSS THE STAGE AND KNOCKS THEM OVER.',
    name: 'CROWDSURFER', icon: 'C', warn: 1, duration: 2,
    prepare(game, ctx) {
      const B = game.venue.bounds;
      ctx.dir = Math.random() < .5 ? -1 : 1;
      ctx.y = rnd(B.y0 + 15, B.y1 - 10);
    },
    run(game, ctx) { ctx.x = ctx.dir > 0 ? -12 : PLAY_W + 12; ctx.hit = new Set(); },
    update(game, dt, ctx) {
      ctx.x += ctx.dir * 115 * dt;
      for (const b of game.bros) {
        if (b.hidden || ctx.hit.has(b)) continue;
        if (Math.abs(b.x - ctx.x) < 10 && Math.abs(b.y - ctx.y) < 14) {
          ctx.hit.add(b);
          game.dropBro(b);
          game.pushBro(b, 0, b.y < ctx.y ? -18 : 18);
          b.st.stun = .6; game.addAnger(b, 8); game.say(b, 'OOF', '#ff8a3a');
        }
      }
    },
    draw(game, ctx) {
      const x = Math.round(ctx.x), y = Math.round(ctx.y);
      X.fillStyle = 'rgba(0,0,0,.4)'; X.fillRect(x - 8, y - 1, 16, 3);
      X.fillStyle = '#e2b38f'; X.fillRect(x - 8, y - 16, 4, 2); X.fillRect(x + 5, y - 16, 4, 2);
      X.fillStyle = '#e0e0e0'; X.fillRect(x - 5, y - 18, 10, 6);
      X.fillStyle = '#e2b38f'; X.fillRect(x + (ctx.dir > 0 ? 5 : -10), y - 19, 5, 5);
      X.fillStyle = '#e2b38f'; for (let k = -6; k <= 6; k += 4) X.fillRect(x + k, y - 11, 1, 4);   // Hände der Crowd
    },
  },

  rain: {
    desc: 'SLIPPERY! RELEASED BROTHERS KEEP SLIDING.',
    name: 'RAIN', icon: 'R', warn: 1, duration: 7, flags: ['slippery'],
    run(game) { game.toastMsg('RAIN! SLIPPERY STAGE', '#9fd8ff'); },
    drawScreen(game) {
      X.fillStyle = 'rgba(150,180,255,.5)';
      for (let k = 0; k < 40; k++) {
        const x = VIEW.OX + ((k * 47 + game.T * 40) % PLAY_W), y = 26 + ((k * 89 + game.T * 260) % 278);
        X.fillRect(Math.round(x), Math.round(y), 1, 4);
      }
    },
  },

  tv: {
    desc: 'CRASH! BOTH GET ANGRY. WAKES UP SLEEPERS.',
    name: 'TV OUT THE WINDOW', icon: 'T', warn: 1,
    run(game) {
      // Einer wirft den Fernseher aus dem Fenster
      const b = pickOne(game.bros.filter(x => !x.hidden));
      if (!b) return;
      for (const x of game.bros) game.addAnger(x, 10);
      game.comic('CRASH!', b.x, b.y - 30, '#ff8a3a');
      game.burst(b.x, b.y - 10, 10, '#8af');
      game.shake = 3; buzz(60);
      for (const x of game.bros) if (x.asleep) { x.asleep = false; game.say(x, 'WHA?!', '#fff'); }
    },
  },

  knock: {
    desc: 'ROOM SERVICE WAKES EVERYONE BUT BRINGS CHIPS.',
    name: 'ROOM SERVICE', icon: 'K', warn: 0.8,
    run(game) {
      // Klopfen weckt alle auf, dafür gibt es Pommes
      game.comic('KNOCK KNOCK', 90, 100, '#ffd84a');
      for (const b of game.bros) if (b.asleep) { b.asleep = false; game.addAnger(b, 6); game.say(b, 'WHAT NOW?', '#fff'); }
      game.spawnItem('chips');
    },
  },

  /* ---------- Neue Events für mehr Abwechslung (je Schauplatz) ---------- */

  brakes: {
    desc: 'HARD BRAKES! EVERYONE SLIDES TO THE FRONT.',
    name: 'EMERGENCY STOP', icon: '^', warn: 1,
    run(game) {
      for (const b of game.bros) {
        if (b.hidden) continue;
        game.dropBro(b); game.pushBro(b, 0, -30);
        b.st.stun = Math.max(b.st.stun, .4); game.addAnger(b, 3);
      }
      const S = game.venue.spawn;
      for (const it of game.items) if (!it.held) it.y = Math.max(S.y0, it.y - 24);
      game.comic('SCREECH!', 90, 110, '#ff8a3a'); game.shake = 4; buzz(60);
    },
  },

  gust: {
    desc: 'WIND! STUFF BLOWS INTO THE WATER. HOLD ON TIGHT.',
    name: 'GUST OF WIND', warn: 1, duration: 2.6,
    prepare(game, ctx) { ctx.dir = Math.random() < .5 ? -1 : 1; },
    icon(ctx) { return ctx.dir < 0 ? '<' : '>'; },
    run(game, ctx) { game.toastMsg('WINDY!', '#9fd8ff'); },
    update(game, dt, ctx) {
      for (const b of game.bros) if (b.drag == null && !b.hidden) game.pushBro(b, ctx.dir * 22 * dt, 0);
      for (let i = game.items.length - 1; i >= 0; i--) {
        const it = game.items[i];
        if (it.held) continue;
        it.x += ctx.dir * 46 * dt;
        if (it.x < 6 || it.x > PLAY_W - 6) { game.items.splice(i, 1); game.burst(clamp(it.x, 8, PLAY_W - 8), it.y, 6, '#bfe8f0'); sfx('splash'); }
      }
    },
    drawScreen(game, ctx) {
      X.fillStyle = 'rgba(230,245,255,.35)';
      for (let k = 0; k < 14; k++) {
        const x = VIEW.OX + (((k * 53 + game.T * 160 * ctx.dir) % (PLAY_W + 40)) + PLAY_W + 40) % (PLAY_W + 40) - 20, y = 40 + ((k * 71) % 250);
        X.fillRect(Math.round(x), y, 12, 1);
      }
    },
  },

  frog: {
    desc: 'A FROG HOPS ONTO THE BOARDWALK. TAP IT BEFORE IT REACHES A BROTHER!',
    name: 'FROG', icon: 'F', warn: .8, duration: 7,
    prepare(game, ctx) { const left = Math.random() < .5; ctx.x = left ? 22 : PLAY_W - 22; ctx.y = rnd(100, 270); },
    run(game, ctx) { ctx.hop = 0; sfx('croak'); },
    update(game, dt, ctx) {
      const t = game.bros.filter(b => !b.hidden).sort((a, b) => Math.hypot(a.x - ctx.x, a.y - ctx.y) - Math.hypot(b.x - ctx.x, b.y - ctx.y))[0];
      if (!t) return;
      ctx.hop += dt;
      if (ctx.hop > .55) {                                 // hüpft in Sprüngen
        ctx.hop = 0; const d = Math.hypot(t.x - ctx.x, t.y - ctx.y) || 1;
        ctx.x += (t.x - ctx.x) / d * 14; ctx.y += (t.y - ctx.y) / d * 14; sfx('croak');
      }
      if (Math.hypot(t.x - ctx.x, t.y - ctx.y) < 10) {
        game.addAnger(t, 10); game.say(t, 'A FROG!!', '#7cfc6a'); game.dropBro(t); t.st.stun = .5; ctx.end = true;
      }
    },
    pointerDown(game, p, ctx) {
      if (Math.hypot(p.x - ctx.x, p.y - ctx.y) < 14) { ctx.end = true; game.burst(ctx.x, ctx.y, 6, '#7cfc6a'); sfx('splash'); return true; }
      return false;
    },
    draw(game, ctx) {
      const x = Math.round(ctx.x), y = Math.round(ctx.y), up = ctx.hop < .15 ? 2 : 0;
      X.fillStyle = 'rgba(0,0,0,.3)'; X.fillRect(x - 3, y + 1, 7, 2);
      X.fillStyle = '#3a8a2a'; X.fillRect(x - 3, y - 4 - up, 7, 5);
      X.fillStyle = '#5ab03a'; X.fillRect(x - 2, y - 5 - up, 5, 2);
      X.fillStyle = '#fff'; X.fillRect(x - 3, y - 6 - up, 2, 2); X.fillRect(x + 2, y - 6 - up, 2, 2);
      X.fillStyle = '#000'; X.fillRect(x - 2, y - 5 - up, 1, 1); X.fillRect(x + 3, y - 5 - up, 1, 1);
      if ((game.T * 4 | 0) % 2) txt('!', x, y - 14, '#7cfc6a', 1, 'c');
    },
  },

  lastorders: {
    desc: 'THE BELL RINGS. BOTH RUSH TO THE BAR - TOO CLOSE! TAP THE BAR TO STOP IT.',
    name: 'LAST ORDERS', icon: 'B', warn: 1, duration: 3.5,
    run(game, ctx) {
      sfx('bell'); game.comic('DING DING!', 90, 80, '#ffd84a');
      game.bros.forEach((b, i) => { if (!b.hidden) { b.goal = { x: 76 + i * 28, y: 74 }; game.say(b, 'MY ROUND!', '#ffd84a'); } });
    },
    pointerDown(game, p, ctx) {
      if (p.y < 70) { ctx.end = true; game.toastMsg('NOT YET, LADS!', '#7cfc6a'); return true; }
      return false;
    },
    end(game) { for (const b of game.bros) b.goal = null; },
  },

  pyro: {
    desc: 'FLAMES SHOOT UP FROM THE STAGE. KEEP THEM OFF THE MARKED SPOTS!',
    name: 'PYRO', icon: '*', warn: 1.2, duration: 2.4,
    prepare(game, ctx) {
      const B = game.venue.bounds;
      ctx.spots = [0, 1, 2].map(() => ({ x: rnd(B.x0 + 10, B.x1 - 10), y: rnd(B.y0 + 30, B.y1 - 20) }));
    },
    run(game, ctx) { ctx.t = 0; ctx.hit = new Set(); },
    update(game, dt, ctx) {
      const was = ctx.t; ctx.t += dt;
      if (was < .8 && ctx.t >= .8) sfx('boom');
      if (ctx.t < .8) return;
      for (const s of ctx.spots) for (const b of game.bros) {
        if (b.hidden || ctx.hit.has(b)) continue;
        if (Math.hypot(b.x - s.x, b.y - s.y) < 13) { ctx.hit.add(b); game.addAnger(b, 9); game.say(b, 'HOT!', '#ff8a3a'); game.pushBro(b, b.x < s.x ? -14 : 14, 0); }
      }
    },
    draw(game, ctx) {
      for (const s of ctx.spots) {
        const x = Math.round(s.x), y = Math.round(s.y);
        if (ctx.t < .8) {                                  // Warnkreis
          if ((game.T * 8 | 0) % 2) { X.fillStyle = 'rgba(255,90,40,.5)'; X.fillRect(x - 8, y - 1, 16, 2); X.fillRect(x - 1, y - 6, 2, 8); }
        } else {
          for (let k = 0; k < 6; k++) {
            const h = 10 + Math.round(Math.abs(Math.sin(game.T * 13 + k * 1.7)) * 16);
            X.fillStyle = k % 2 ? '#ff8a20' : '#ffd040'; X.fillRect(x - 6 + k * 2, y - h, 2, h);
          }
          X.fillStyle = '#fff6c0'; X.fillRect(x - 2, y - 6, 4, 6);
        }
      }
    },
  },

  housekeeping: {
    desc: 'THE CLEANING TROLLEY ROLLS THROUGH A ROOM AND BUMPS ANYONE IN THE WAY.',
    name: 'HOUSEKEEPING', icon: 'H', warn: 1, duration: 3,
    prepare(game, ctx) {
      const fl = game.venue.floors || [{ y0: 70, y1: 280 }];
      const b = pickOne(game.bros.filter(x => !x.hidden)) || game.bros[0];
      const f = fl.find(q => b.y >= q.y0 - 6 && b.y <= q.y1 + 6) || pickOne(fl);
      ctx.y = clamp(b.y, f.y0 + 6, f.y1); ctx.dir = Math.random() < .5 ? -1 : 1;
    },
    run(game, ctx) { ctx.x = ctx.dir > 0 ? 10 : 150; ctx.hit = new Set(); game.say(game.bros[0], 'HOUSEKEEPING!', '#fff'); },
    update(game, dt, ctx) {
      ctx.x += ctx.dir * 55 * dt;
      for (const b of game.bros) {
        if (b.hidden || ctx.hit.has(b)) continue;
        if (Math.abs(b.x - ctx.x) < 10 && Math.abs(b.y - ctx.y) < 10) {
          ctx.hit.add(b); game.dropBro(b); game.pushBro(b, ctx.dir * 16, 0); b.st.stun = .4; game.addAnger(b, 6); game.say(b, 'OI!', '#ff8a3a'); sfx('thud');
        }
      }
      if (ctx.x < 0 || ctx.x > 150) ctx.end = true;
    },
    draw(game, ctx) {
      const x = Math.round(ctx.x), y = Math.round(ctx.y);
      X.fillStyle = 'rgba(0,0,0,.35)'; X.fillRect(x - 7, y + 1, 15, 2);
      X.fillStyle = '#d8d8e0'; X.fillRect(x - 7, y - 10, 14, 10);
      X.fillStyle = '#8a8a96'; X.fillRect(x - 7, y - 10, 14, 1); X.fillRect(x - 1, y - 9, 1, 9);
      X.fillStyle = '#e8e0f0'; X.fillRect(x - 6, y - 8, 4, 3); X.fillStyle = '#9fd8ff'; X.fillRect(x + 2, y - 8, 3, 5);
      X.fillStyle = '#222'; X.fillRect(x - 6, y, 2, 2); X.fillRect(x + 4, y, 2, 2);
    },
  },

  sheep: {
    desc: 'A FLOCK OF SHEEP WANDERS ACROSS AND PUSHES THE BROTHERS APART (OR TOGETHER).',
    name: 'SHEEP', icon: 'S', warn: 1, duration: 6,
    prepare(game, ctx) { const B = game.venue.bounds; ctx.y = rnd(B.y0 + 20, B.y1 - 10); ctx.dir = Math.random() < .5 ? -1 : 1; },
    run(game, ctx) { ctx.x = ctx.dir > 0 ? -10 : PLAY_W + 10; sfx('baa'); },
    update(game, dt, ctx) {
      ctx.x += ctx.dir * 34 * dt;
      for (let k = 0; k < 3; k++) {
        const sx = ctx.x - ctx.dir * k * 16, sy = ctx.y + (k % 2) * 10 - 5;
        for (const b of game.bros) {
          if (b.hidden || b.drag != null) continue;
          if (Math.abs(b.x - sx) < 9 && Math.abs(b.y - sy) < 9) game.pushBro(b, 0, (b.y < sy ? -40 : 40) * dt);
        }
      }
      if ((ctx.dir > 0 && ctx.x > PLAY_W + 50) || (ctx.dir < 0 && ctx.x < -50)) ctx.end = true;
    },
    draw(game, ctx) {
      for (let k = 0; k < 3; k++) {
        const x = Math.round(ctx.x - ctx.dir * k * 16), y = Math.round(ctx.y + (k % 2) * 10 - 5 + (Math.sin(game.T * 6 + k) > .7 ? -1 : 0));
        moorSheep(X, x, y, ctx.dir);
      }
    },
  },
};
