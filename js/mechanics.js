/* =========================================================================
   mechanics.js – Sonderregeln der Schauplätze und Zusatzfiguren

   Jede Regel ist ein Objekt mit optionalen Funktionen ("Hooks").
   s ist der eigene Zustand der Regel (wird bei setup angelegt):

     setup(game, s, params)        Start des Levels. params = venue.mechDefaults + level.mech
     update(game, s, dt)           jedes Frame
     walls(game, s)                zusätzliche feste Hindernisse [{x,y,w,h}]
     obstacles(game, s)            bewegliche runde Hindernisse [{x,y,r}]
     route(game, s, bro, tx, ty)   Zwischenziel auf dem Weg nach (tx,ty) oder null
     wander(game, s, bro)          neues Schlenderziel {x,y} oder null
     pointerDown(game, s, p)       Tippen ins Spielfeld, true = verbraucht
     onRelease(game, s, bro)       Spieler lässt einen Bruder los
     calmBonus(game, s)            Multiplikator fürs Beruhigen (Drummer)
     lose(game, s)                 Text = verloren (z. B. "THE CROWD LEFT!")
     drawUnder / drawOver(game, s) Zeichnen im Spielfeld (unter/über den Figuren)
     entities(game, s)             Figuren für die Tiefensortierung [{y, draw()}]
     hud(game, s)                  Zeichnen über allem (Bildschirm-Koordinaten)
   ========================================================================= */

const MECHANICS = {

  /* ============ PROBERAUM: Lautstärke ============
     Jeder Bruder hat einen Verstärker. Je lauter einer spielt, desto wütender
     wird der andere. Antippen dreht ihn runter. */
  volume: {
    setup(game, s, p) {
      s.amps = game.venue.amps;
      s.vol = [15, 15];
      s.rate = p.volRate || 4;
      s.shake = [0, 0];
    },
    update(game, s, dt) {
      game.bros.forEach((b, i) => {
        const a = s.amps[i];
        const playing = !b.hidden && Math.hypot(b.x - a.fx, b.y - a.fy) < 30;   // steht an seinem Amp
        s.vol[i] = Math.min(100, s.vol[i] + (s.rate + (playing ? 8 : 0)) * game.diff * dt);
        const o = game.other(b);
        if (!(o.st.deaf > 0) && !o.asleep) game.addAnger(o, s.vol[i] / 100 * 5.5 * dt);
        s.shake[i] = Math.max(0, s.shake[i] - dt);
      });
      game.stats.maxVolume = Math.max(game.stats.maxVolume, s.vol[0], s.vol[1]);
    },
    wander(game, s, b) {
      // Ruhige Brüder gehen gern zu ihrem Verstärker
      if (Math.random() < .45) { const a = s.amps[game.bros.indexOf(b)]; return { x: a.fx + rnd(-6, 6), y: a.fy + rnd(0, 14) }; }
      return null;
    },
    pointerDown(game, s, p) {
      for (let i = 0; i < 2; i++) {
        const a = s.amps[i];
        if (p.x >= a.x - 4 && p.x < a.x + a.w + 4 && p.y >= a.y - 4 && p.y < a.y + a.h + 4) {
          s.vol[i] = Math.max(0, s.vol[i] - 45);
          s.shake[i] = .2;
          game.comic('TWIST', a.x + a.w / 2, a.y - 4, '#9fd8ff');
          return true;
        }
      }
      return false;
    },
    drawUnder(game, s) {
      s.amps.forEach((a, i) => {
        const v = s.vol[i], jx = v > 70 ? ((game.T * 30 | 0) % 2) : 0, sx = s.shake[i] > 0 ? 1 : 0;
        const x = a.x + jx + sx, y = a.y;
        X.fillStyle = '#000'; X.fillRect(x - 1, y - 1, a.w + 2, a.h + 2);
        X.fillStyle = '#1a1a1a'; X.fillRect(x, y, a.w, a.h);
        X.fillStyle = '#2a2a2a'; for (let yy = y + 8; yy < y + a.h - 1; yy += 2) X.fillRect(x + 2, yy, a.w - 4, 1);   // Gitter
        X.fillStyle = '#c8b070'; X.fillRect(x + 1, y + 1, a.w - 2, 5);                                               // Bedienfeld
        X.fillStyle = '#222'; for (let k = 0; k < 3; k++) X.fillRect(x + 3 + k * 5, y + 2, 2, 2);
        X.fillStyle = game.bros[i].color; X.fillRect(x, y + a.h - 2, a.w, 2);                                         // Besitzer
        // Lautstärke-Leiste am Amp
        const h = Math.round((a.h - 9) * v / 100);
        X.fillStyle = '#000'; X.fillRect(x + a.w - 4, y + 7, 3, a.h - 9);
        X.fillStyle = v > 75 ? '#e33' : v > 45 ? '#e9b23a' : '#4caf50'; X.fillRect(x + a.w - 4, y + 7 + (a.h - 9) - h, 3, h);
        // Schallwellen
        if (v > 40) {
          X.fillStyle = `rgba(255,220,120,${(v - 40) / 120})`;
          const r = 4 + ((game.T * 30) % 8), dir = i === 0 ? 1 : -1, cx = i === 0 ? x + a.w + 1 : x - 2;
          for (let k = -3; k <= 3; k++) X.fillRect(Math.round(cx + dir * r - dir * Math.abs(k) / 2), y + 12 + k * 2, 1, 1);
        }
      });
    },
  },

  /* ============ PUB: Fans laufen durchs Bild ============ */
  pubfans: {
    setup(game, s, p) { s.fans = []; s.t = 1.5; s.every = p.fanEvery || [3.5, 5.5]; s.lanes = game.venue.lanes; },
    update(game, s, dt) {
      s.t -= dt;
      if (s.t <= 0) {
        s.t = rnd(s.every[0], s.every[1]) / game.diff;
        const dir = Math.random() < .5 ? 1 : -1;
        s.fans.push({ x: dir > 0 ? -8 : PLAY_W + 8, y: pickOne(s.lanes), dir, sp: rnd(14, 22), walk: 0,
          body: pickOne(['#3a6a9a', '#9a3a3a', '#6a6a6a', '#3a7a4a']), scarf: pickOne(['#ddd', '#5ab', '#d33']) });
      }
      for (const f of s.fans) {
        f.x += f.dir * f.sp * dt; f.walk += dt * 2;
        // Fans rempeln: wer angerempelt wird, wird wütend
        for (const b of game.bros) {
          if (b.hidden || (f.bumped && f.bumped.includes(b))) continue;
          if (Math.hypot(b.x - f.x, b.y - f.y) < 11) {
            (f.bumped = f.bumped || []).push(b);
            game.addAnger(b, 6); game.say(b, 'WATCH IT!', '#ff8a3a'); game.noteCause('FANS');
          }
        }
      }
      s.fans = s.fans.filter(f => f.x > -12 && f.x < PLAY_W + 12);
    },
    obstacles(game, s) { return s.fans.map(f => ({ x: f.x, y: f.y, r: 6 })); },
    entities(game, s) { return s.fans.map(f => ({ y: f.y, draw: () => drawPerson(f.x, f.y, f.body, { walk: f.walk, scarf: f.scarf }) })); },
  },

  /* ============ BACKSTAGE: Tür zwischen zwei Räumen ============
     Tür antippen = abschließen. Sind die Brüder getrennt, beruhigen sie sich.
     Nach kickTime Sekunden tritt einer die Tür ein. */
  door: {
    setup(game, s, p) { s.door = game.venue.door; s.closed = false; s.broken = 0; s.kick = 0; s.kickTime = p.kickTime || 5; },
    room(y) { return y < 172 ? 0 : 1; },
    walls(game, s) { return s.closed ? [s.door] : []; },
    route(game, s, b, tx, ty) {
      const me = this.room(b.y), it = this.room(ty);
      if (me === it) return null;
      const cx = s.door.x + s.door.w / 2;
      if (Math.abs(b.x - cx) > 5) return { x: cx, y: me === 0 ? s.door.y - 8 : s.door.y + s.door.h + 8 };
      return { x: cx, y: ty };
    },
    update(game, s, dt) {
      if (s.broken > 0) s.broken -= dt;
      if (!s.closed) return;
      s.kick += dt;
      const [a, b] = game.bros;
      if (this.room(a.y) !== this.room(b.y)) for (const x of game.bros) x.anger = Math.max(0, x.anger - 3 * dt);   // getrennt = ruhiger
      if (s.kick >= s.kickTime) {
        s.closed = false; s.broken = 4;
        const kicker = a.anger >= b.anger ? a : b;
        game.addAnger(kicker, 15);
        game.comic('SLAM!', s.door.x + s.door.w / 2, s.door.y - 6, '#ff8a3a');
        game.shake = 4; buzz(70);
      }
    },
    pointerDown(game, s, p) {
      const d = s.door;
      if (!(p.x >= d.x - 6 && p.x < d.x + d.w + 6 && p.y >= d.y - 8 && p.y < d.y + d.h + 8)) return false;
      if (s.closed) { s.closed = false; return true; }
      if (s.broken > 0) { game.toastMsg('DOOR IS BROKEN!', '#ff8a3a'); return true; }
      // Niemand darf in der Tür stehen
      if (game.bros.some(b => b.x > d.x - 4 && b.x < d.x + d.w + 4 && b.y > d.y - 4 && b.y < d.y + d.h + 4)) { game.toastMsg('SOMEONE IN THE WAY', '#aaa'); return true; }
      s.closed = true; s.kick = 0; game.stats.locks++;
      game.comic('LOCKED', d.x + d.w / 2, d.y - 6, '#9fd8ff');
      return true;
    },
    drawUnder(game, s) {
      const d = s.door;
      if (s.closed) {
        const jx = s.kick > s.kickTime - 1.5 ? ((game.T * 25 | 0) % 2) : 0;
        X.fillStyle = '#4a2e18'; X.fillRect(d.x + jx, d.y, d.w, d.h);
        X.fillStyle = '#6a4a2a'; X.fillRect(d.x + 1 + jx, d.y + 1, d.w - 2, 2);
        X.fillStyle = '#d0b040'; X.fillRect(d.x + d.w - 5 + jx, d.y + 5, 2, 2);
        // Wie lange hält die Tür noch?
        X.fillStyle = '#000'; X.fillRect(d.x, d.y - 4, d.w, 3);
        X.fillStyle = '#ff8a3a'; X.fillRect(d.x, d.y - 3, Math.round(d.w * (1 - s.kick / s.kickTime)), 1);
      } else if (s.broken > 0) {
        X.fillStyle = '#4a2e18'; X.fillRect(d.x - 2, d.y + 9, 5, 2); X.fillRect(d.x + 18, d.y + 1, 4, 2); X.fillRect(d.x + 9, d.y + 6, 3, 1);
      } else {
        X.fillStyle = '#4a2e18'; X.fillRect(d.x, d.y, 2, d.h);   // offene Tür
        if ((game.T * 2 | 0) % 2 === 0) { X.fillStyle = 'rgba(159,216,255,.5)'; X.fillRect(d.x + 3, d.y + 5, d.w - 6, 1); }
      }
    },
  },

  /* ============ FESTIVAL: beide an ihr Mikro ============
     Steht einer zu lange weg, sinkt die Stimmung der Crowd. Bei 0 ist das Konzert vorbei. */
  stage: {
    setup(game, s, p) {
      s.mics = game.venue.mics; s.mood = p.mood0 || 70; s.gain = p.gain || 5; s.drain = p.drain || 4;
      game.stats.minMood = s.mood;
    },
    atMic(game, s, i) { const b = game.bros[i], m = s.mics[i]; return !b.hidden && Math.hypot(b.x - m.x, b.y - m.y) < 14; },
    update(game, s, dt) {
      const at = [0, 1].filter(i => this.atMic(game, s, i)).length;
      const rate = at === 2 ? s.gain : -(2 - at) * s.drain * Math.sqrt(game.diff);
      s.mood = clamp(s.mood + rate * dt, 0, 100);
      game.stats.minMood = Math.min(game.stats.minMood, s.mood);
    },
    wander(game, s, b) {
      // Am Mikro bleiben sie gern eine Weile stehen
      const i = game.bros.indexOf(b);
      if (this.atMic(game, s, i) && Math.random() < .6) { b.retT = rnd(2, 4); return { x: b.x, y: b.y }; }
      return null;
    },
    lose(game, s) { return s.mood <= 0 ? 'THE CROWD LEFT!' : null; },
    drawUnder(game, s) {
      s.mics.forEach((m, i) => {
        const on = this.atMic(game, s, i);
        if (on) { X.fillStyle = 'rgba(255,230,120,.18)'; X.fillRect(m.x - 12, m.y - 30, 24, 34); }
        X.fillStyle = '#111'; X.fillRect(m.x + 6, m.y - 2, 6, 2);
        X.fillStyle = '#666'; X.fillRect(m.x + 8, m.y - 20, 1, 18);
        X.fillStyle = '#999'; X.fillRect(m.x + 4, m.y - 21, 5, 1);
        X.fillStyle = '#333'; X.fillRect(m.x + 3, m.y - 23, 3, 3);
        X.fillStyle = game.bros[i].color; X.fillRect(m.x - 4, m.y + 4, 8, 1);
      });
      // Crowd: Köpfe, je voller je besser die Stimmung
      const n = Math.round(12 + s.mood * .55), jump = s.mood > 60;
      for (let k = 0; k < n; k++) {
        const x = (k * 37 + 11) % 172 + 4, y = 246 + (k * 53) % 52;
        const j = jump && (k + (game.T * 4 | 0)) % 3 === 0 ? 2 : 0;
        X.fillStyle = ['#e2b38f', '#c08a60', '#8a5a3a', '#f0c8a0'][k % 4]; X.fillRect(x, y - j, 4, 4);
        X.fillStyle = ['#3a2412', '#111', '#d8b040', '#6a2a1a'][k % 4]; X.fillRect(x, y - j, 4, 1);
        if (jump && k % 5 === 0) { X.fillStyle = '#e2b38f'; X.fillRect(x + 4, y - 4 - j, 1, 3); }
      }
    },
    hud(game, s) {
      const x = VIEW.OX + 40, y = 28;
      txt('CROWD', x - 2, y, '#ccc', 1, 'r');
      X.fillStyle = '#000'; X.fillRect(x, y, 100, 5);
      X.fillStyle = s.mood > 50 ? '#7cfc6a' : s.mood > 25 ? '#e9b23a' : ((game.T * 6 | 0) % 2 ? '#e33' : '#600');
      X.fillRect(x + 1, y + 1, Math.round(98 * s.mood / 100), 3);
    },
  },

  /* ============ HOTEL: Etagen, Aufzug, Betten ============
     Ein Bruder in der Aufzugszone loslassen = er fährt weit weg.
     Ein ruhiger Bruder (unter 45 %) auf einem Bett = er schläft.
     Schlafen beide, füllt sich die Nachtbonus-Leiste. */
  hotel: {
    setup(game, s) { s.floors = game.venue.floors; s.lifts = game.venue.lifts; s.beds = game.venue.beds; s.bonus = 0; },
    floorOf(s, y) { for (let i = 0; i < s.floors.length; i++) if (y < s.floors[i].y1 + 15) return i; return s.floors.length - 1; },
    ride(game, s, b, to) {
      game.dropBro(b);
      b.ride = { t: .9, to }; b.hidden = true; b.asleep = false;
      game.say(b, 'DING', '#ffd84a');
    },
    wander(game, s, b) {
      const f = s.floors[this.floorOf(s, b.y)];
      return { x: rnd(56, 140), y: rnd(f.y0 + 2, f.y1 - 2) };
    },
    route(game, s, b, tx, ty) {
      const f = this.floorOf(s, b.y), tf = this.floorOf(s, ty);
      if (f === tf) return null;
      const L = s.lifts[f];
      if (inRect(b, L)) { this.ride(game, s, b, tf); return { x: b.x, y: b.y }; }
      return { x: L.x + L.w / 2, y: L.y + L.h / 2 };
    },
    onRelease(game, s, b) {
      const f = this.floorOf(s, b.y);
      if (inRect(b, s.lifts[f])) {
        // Fährt auf die Etage, die am weitesten vom anderen weg ist
        const of = this.floorOf(s, game.other(b).y);
        let best = f, bd = -1;
        for (let t = 0; t < s.floors.length; t++) if (t !== f && Math.abs(t - of) > bd) { bd = Math.abs(t - of); best = t; }
        this.ride(game, s, b, best);
        game.addAnger(b, 4);   // wer weggeschickt wird, ist etwas beleidigt
        return;
      }
      const bed = s.beds[f];
      if (inRect(b, { x: bed.x - 4, y: bed.y - 4, w: bed.w + 8, h: bed.h + 8 })) {
        if (b.anger < 45) {
          b.asleep = true; b.x = bed.x + bed.w / 2 + 2; b.y = bed.y + bed.h - 6;
          game.comic('ZZZ', b.x, b.y - 16, '#9fd8ff');
        } else game.say(b, 'NOT TIRED!', '#ff8a3a');
      }
    },
    update(game, s, dt) {
      for (const b of game.bros) {
        if (b.ride) {
          b.ride.t -= dt;
          if (b.ride.t <= 0) {
            const L = s.lifts[b.ride.to];
            b.x = L.x + L.w / 2; b.y = L.y + L.h - 6; b.tx = b.x; b.ty = b.y; b.retT = 0;
            b.hidden = false; b.ride = null;
          }
        }
        if (b.asleep && b.anger > 55) { b.asleep = false; game.say(b, "CAN'T SLEEP", '#fff'); }
      }
      if (game.bros.every(b => b.asleep)) { s.bonus += dt; game.stats.sleepTime = s.bonus; }
    },
    drawUnder(game, s) {
      // Wird gerade ein Bruder gezogen? Dann Ablage-Ziele hervorheben
      const held = game.bros.find(b => b.drag != null);
      const outline = (r, col) => { X.fillStyle = col; X.fillRect(r.x, r.y, r.w, 1); X.fillRect(r.x, r.y + r.h - 1, r.w, 1); X.fillRect(r.x, r.y, 1, r.h); X.fillRect(r.x + r.w - 1, r.y, 1, r.h); };
      s.lifts.forEach((L, i) => {
        const busy = game.bros.some(b => b.ride && b.ride.to === i);
        X.fillStyle = busy ? '#ffd84a' : '#555'; X.fillRect(L.x + 6, L.y - 3, 4, 2);
        const on = held || (game.T * 2 | 0) % 2;
        if (on) { X.fillStyle = held ? 'rgba(255,216,74,.4)' : 'rgba(255,216,74,.25)'; X.fillRect(L.x, L.y, L.w, L.h); }
        if (held) outline(L, '#ffd84a');
        txt('LIFT', L.x + L.w / 2, L.y + 4, '#000', 1, 'c');
      });
      s.beds.forEach(bed => {
        if (held) {
          const ok = held.anger < 45;
          X.fillStyle = ok ? 'rgba(124,252,106,.3)' : 'rgba(255,90,74,.25)'; X.fillRect(bed.x, bed.y, bed.w, bed.h);
          outline(bed, ok ? '#7cfc6a' : '#ff5a4a');
        }
        txt('BED', bed.x + bed.w / 2, bed.y + bed.h - 7, '#eee', 1, 'c');
      });
    },
    hud(game, s) {
      if (!(game.level.bonus && game.level.bonus.type === 'sleep')) return;
      const x = VIEW.OX + 60, y = 28, n = game.level.bonus.n;
      txt('NIGHT', x - 2, y, '#9fd8ff', 1, 'r');
      X.fillStyle = '#000'; X.fillRect(x, y, 80, 5);
      X.fillStyle = '#9fd8ff'; X.fillRect(x + 1, y + 1, Math.round(78 * Math.min(1, s.bonus / n)), 3);
    },
  },
};

/* ============ DIE WOHNUNG: Sonnenstrahlen ============
   Schräge Lichtflecken wandern langsam über die Dielen. Wer drin steht,
   beruhigt sich (sunCalm Wut pro Sekunde). Ruhige Brüder gehen gern in die Sonne. */
MECHANICS.sunbeam = {
  setup(game, s, p) { s.beams = (game.venue.beams || []).map(b => ({ ...b })); s.calm = p.sunCalm || 4; s.t = 0; },
  beamX(s, b) { return b.x + Math.sin(s.t * .12 + b.ph) * b.drift; },
  inBeam(s, b, x, y) {
    if (y < b.y || y > b.y + b.h) return false;
    const x0 = this.beamX(s, b) + (y - b.y) * b.skew;
    return x >= x0 && x <= x0 + b.w;
  },
  update(game, s, dt) {
    s.t += dt;
    for (const br of game.bros) {
      br.inSun = !br.hidden && s.beams.some(b => this.inBeam(s, b, br.x, br.y));
      if (br.inSun) br.anger = Math.max(0, br.anger - s.calm * dt);
    }
  },
  wander(game, s, b) {
    if (Math.random() < .5) {
      const bm = pickOne(s.beams);
      return { x: this.beamX(s, bm) + bm.w / 2 + bm.h / 2 * bm.skew, y: bm.y + bm.h / 2 };
    }
    return null;
  },
  drawUnder(game, s) {
    for (const b of s.beams) {
      const x0 = this.beamX(s, b);
      for (let y = 0; y < b.h; y++) {
        const edge = y < 3 || y > b.h - 4, xx = Math.round(x0 + y * b.skew);
        X.fillStyle = edge ? 'rgba(255,250,220,.22)' : 'rgba(255,250,225,.42)';
        X.fillRect(xx, b.y + y, b.w, 1);
        X.fillStyle = 'rgba(255,255,240,.5)'; X.fillRect(xx, b.y + y, 1, 1); X.fillRect(xx + b.w - 1, b.y + y, 1, 1);   // helle Kanten
      }
      // Fensterkreuz-Schatten im Lichtfleck
      X.fillStyle = 'rgba(120,90,40,.18)';
      for (let y = 0; y < b.h; y++) X.fillRect(Math.round(x0 + y * b.skew + b.w / 2), b.y + y, 1, 1);
      X.fillRect(Math.round(x0 + b.h / 2 * b.skew), b.y + (b.h >> 1), b.w, 1);
    }
    // Funkeln über Brüdern in der Sonne
    for (const br of game.bros) if (br.inSun && (game.T * 4 | 0) % 2) {
      X.fillStyle = '#fff6c0'; X.fillRect(Math.round(br.x) + 7, Math.round(br.y) - 26, 1, 3); X.fillRect(Math.round(br.x) + 6, Math.round(br.y) - 25, 3, 1);
    }
  },
};
MECHANICS.sunbeam.id = 'sunbeam';

/* =========================================================================
   Zusatzfiguren (im Level unter extras: ['tambourine'] oder ['drummer'])
   ========================================================================= */
const EXTRAS = {

  /* ---- Tamburin-Mann: läuft im Weg rum, schläft manchmal ein ---- */
  tambourine: {
    name: 'TAMBOURINE MAN', desc: 'WANDERS INTO THE WAY AND NAPS. TAP TO MOVE HIM.',
    setup(game, s) {
      const B = game.venue.bounds;
      s.x = (B.x0 + B.x1) / 2; s.y = (B.y0 + B.y1) / 2; s.tx = s.x; s.ty = s.y;
      s.sleep = 0; s.nap = rnd(6, 10); s.walk = 0;
    },
    update(game, s, dt) {
      if (s.sleep > 0) { s.sleep -= dt; return; }
      s.nap -= dt;
      if (s.nap <= 0) { s.sleep = rnd(4, 6); s.nap = rnd(8, 12); return; }
      const dx = s.tx - s.x, dy = s.ty - s.y, l = Math.hypot(dx, dy);
      if (l < 3) { const p = game.randomFreeSpot(); s.tx = p.x; s.ty = p.y; return; }
      s.x += dx / l * 12 * dt; s.y += dy / l * 12 * dt; s.walk += dt * 5;
    },
    obstacles(game, s) { return [{ x: s.x, y: s.y, r: 7 }]; },
    pointerDown(game, s, p) {
      if (Math.hypot(p.x - s.x, p.y - (s.y - 8)) > 10) return false;
      s.sleep = 0; s.nap = rnd(8, 12);
      const q = game.randomFreeSpot(); s.tx = q.x; s.ty = q.y;
      game.comic('JINGLE', s.x, s.y - 24, '#ffd84a');
      return true;
    },
    entities(game, s) {
      return [{ y: s.y, draw: () => {
        if (s.sleep > 0) {
          X.fillStyle = '#5a2a7a'; X.fillRect(Math.round(s.x) - 6, Math.round(s.y) - 6, 12, 5);
          X.fillStyle = '#e2b38f'; X.fillRect(Math.round(s.x) + 6, Math.round(s.y) - 7, 5, 5);
          txt('Z', Math.round(s.x) + 4, Math.round(s.y) - 16 - Math.round((game.T * 6) % 6), '#9fd8ff');
          return;
        }
        drawPerson(s.x, s.y, '#5a2a7a', { walk: s.walk, hair: '#d8b040' });
        const sh = (game.T * 10 | 0) % 2;
        X.fillStyle = '#d8b040'; X.fillRect(Math.round(s.x) + 5, Math.round(s.y) - 14 - sh, 5, 5);
        X.fillStyle = '#5a3a1a'; X.fillRect(Math.round(s.x) + 6, Math.round(s.y) - 13 - sh, 3, 3);
      } }];
    },
  },

  /* ---- Drummer: gibt den Takt vor ----
     Jeder 4. Schlag macht beide kurz wütender. Wer im Takt tippt, beruhigt stärker. */
  drummer: {
    name: 'THE DRUMMER', desc: 'NEVER WITHOUT HIS HAT. EVERY 4TH BEAT ANGERS THEM. TAP IN TIME!',
    setup(game, s, p) { s.bpm = p.bpm || 80; s.t = 0; s.beat = 0; s.flash = 0; s.pos = game.venue.drumSpot || { x: 90, y: 50 }; },
    update(game, s, dt) {
      const per = 60 / s.bpm;
      s.t += dt; s.flash = Math.max(0, s.flash - dt);
      if (s.t >= per) {
        s.t -= per; s.beat = (s.beat + 1) % 4; s.flash = .12;
        if (s.beat === 0) {
          for (const b of game.bros) if (!b.hidden && !(b.st.deaf > 0)) game.addAnger(b, 2.5);
          game.comic('BOOM', s.pos.x, s.pos.y - 18, '#ff8a3a');
        }
      }
    },
    calmBonus(game, s) {
      const per = 60 / s.bpm, off = Math.min(s.t, per - s.t);
      if (off < .14) {
        game.comic('IN TIME!', s.pos.x, s.pos.y - 10, '#7cfc6a');
        Save.data.stats.inTime = (Save.data.stats.inTime || 0) + 1;   // für den Erfolg "SHE BANGS THE DRUMS"
        return 1.7;
      }
      return 1;
    },
    walls(game, s) {
      const B = game.venue.bounds, p = s.pos;
      return (p.y > B.y0 && p.y < B.y1) ? [{ x: p.x - 13, y: p.y - 10, w: 26, h: 14 }] : [];
    },
    drawOver(game, s) {
      const x = Math.round(s.pos.x), y = Math.round(s.pos.y), f = s.flash > 0;
      X.fillStyle = '#c0c0c8'; X.fillRect(x - 12, y - 6, 7, 6); X.fillRect(x + 5, y - 6, 7, 6);   // Toms
      X.fillStyle = f ? '#fff' : '#d0b060'; X.fillRect(x - 13, y - 9, 6, 1); X.fillRect(x + 7, y - 9, 6, 1);   // Becken
      drawPerson(x, y - 2, '#222', { hair: '#111' });
      X.fillStyle = '#d9d1b6'; X.fillRect(x - 5, y - 23, 10, 2); X.fillRect(x - 3, y - 26, 6, 3);         // Fischerhut, wie es sich gehört
      X.fillStyle = '#d0b080'; const up = f ? -4 : 0;                                                         // Sticks
      X.fillRect(x - 6, y - 13 + up, 1, 4); X.fillRect(x + 5, y - 13 - up, 1, 4);
      for (let k = 0; k < 4; k++) { X.fillStyle = k === s.beat ? (k === 0 ? '#ff8a3a' : '#ffd84a') : '#333'; X.fillRect(x - 7 + k * 4, y + 3, 2, 2); }
    },
  },
};

// IDs eintragen (für game.getSys('volume'))
for (const id in MECHANICS) MECHANICS[id].id = id;
for (const id in EXTRAS) EXTRAS[id].id = id;
