/* =========================================================================
   art.js – Hintergrund-Grafiken der Schauplätze

   Jeder Hintergrund wird einmal in ein Canvas (180x320) gemalt und dann
   nur noch kopiert. ART.bg.<schauplatz>() malt ihn, ART.anim.<schauplatz>(T)
   animiert Kleinigkeiten jedes Frame (Welt-Koordinaten, X = Spiel-Canvas).

   Wichtig: Wände, Tische, Türen usw. stehen in venues.js (Spielregeln).
   Hier wird nur gemalt, und zwar passend zu diesen Positionen.
   ========================================================================= */

const ART = {
  /* ---------------- Stimmung (zum Nachjustieren) ---------------- */
  SOFT: 0.22,     // weniger dunkle Ränder (0 = ganz düster)
  GLOW: 1.0,      // Stärke der Lichtkegel (1 = normal)
  LIFT: 0.09,     // alles leicht aufhellen (0 = aus)

  /* ---------------- Werkzeuge ---------------- */

  rect(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(x, y, w, h); },
  /** Zufällige Einzelpixel (immer gleich dank festem Startwert) */
  noise(g, x, y, w, h, c, n, seed) {
    const r = seeded(seed); g.fillStyle = c;
    for (let k = 0; k < n; k++) g.fillRect(x + (r() * w | 0), y + (r() * h | 0), 1, 1);
  },
  /** Rahmen */
  frame(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(x, y, w, 1); g.fillRect(x, y + h - 1, w, 1); g.fillRect(x, y, 1, h); g.fillRect(x + w - 1, y, 1, h); },
  /** Schatten unter Möbeln */
  shadow(g, x, y, w, h, a = .35) { g.fillStyle = `rgba(0,0,0,${a})`; g.fillRect(x, y, w, h); },
  /** Grobe Ellipse (für runde Tische, Teppiche) */
  oval(g, cx, cy, rx, ry, c) {
    g.fillStyle = c;
    for (let y = -ry; y <= ry; y++) { const w = Math.round(rx * Math.sqrt(1 - (y * y) / (ry * ry))); g.fillRect(cx - w, cy + y, w * 2 + 1, 1); }
  },
  /**
   * Lichtkegel im PS1-Stil: gedithert, in zwei Helligkeitsstufen.
   * list: [{ x, y, rx, ry, c: '#ffcc88', a: 0..1 }]
   */
  lights(g, list) {
    if (!ART.LIGHTS) return;   // Lichtflecken ausgeschaltet (nur noch der normale, leichte Schatten)
    const im = g.getImageData(0, 0, PLAY_W, H), d = im.data;
    for (const L of list) {
      const c = hex(L.c);
      const x0 = Math.max(0, Math.floor(L.x - L.rx)), x1 = Math.min(PLAY_W - 1, Math.ceil(L.x + L.rx));
      const y0 = Math.max(26, Math.floor(L.y - L.ry)), y1 = Math.min(303, Math.ceil(L.y + L.ry));
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const dx = (x - L.x) / L.rx, dy = (y - L.y) / L.ry, t = 1 - (dx * dx + dy * dy);
        if (t <= 0) continue;
        const a = t * L.a * ART.GLOW, b = (BAYER[(y & 3) * 4 + (x & 3)] + .5) / 16;
        const m = a > b + .55 ? .26 : a > b ? .13 : 0;   // gedithert, zwei dezente Helligkeitsstufen
        if (!m || (ART.floor && !ART.floor(x, y))) continue;   // kein Lichtmuster auf Wänden
        const i = (y * PLAY_W + x) * 4;
        d[i] += (c[0] - d[i]) * m; d[i + 1] += (c[1] - d[i + 1]) * m; d[i + 2] += (c[2] - d[i + 2]) * m;
      }
    }
    g.putImageData(im, 0, 0);
  },
  /**
   * Wo ist Boden? Nur dort kommt das Punktmuster hin (Licht und Schatten),
   * Wände werden glatt abgedunkelt. Wird beim Bauen eines Hintergrunds gesetzt.
   */
  floor: null,
  LIGHTS: false,   // true = geditherte Lichtflecken wieder an
  FLOOR: {
    bus:       (x, y) => x >= 18 && x < 162 && y >= 48,
    rehearsal: (x, y) => y >= 26,
    pub:       (x, y) => x >= 20 && x < 160 && y >= 66,
    backstage: (x, y) => x >= 18 && x < 162 && y >= 60 && !(y >= 160 && y < 186 && (x < 78 || x >= 102)),
    festival:  (x, y) => (x >= 18 && x < 162 && y < 238) || y >= 246,
    hotel:     (x, y) => x >= 18 && x < 146 && VENUES.hotel.floors.some(f => y >= f.y0 - 4 && y < f.y1 + 4),
    flat:      (x, y) => y >= MOOR.horizon,
  },
  /** Hellt das Spielfeld leicht auf (letzter Schritt jedes Hintergrunds) */
  lift(g) {
    if (!ART.LIFT) return;
    const im = g.getImageData(0, 0, PLAY_W, H), d = im.data;
    for (let i = 26 * PLAY_W * 4; i < 304 * PLAY_W * 4; i += 4)
      for (let k = 0; k < 3; k++) d[i + k] += (255 - d[i + k]) * ART.LIFT + 4;
    g.putImageData(im, 0, 0);
  },
  /** Holzdielen */
  planks(g, x, y, w, h, base, line, step = 7) {
    g.fillStyle = base; g.fillRect(x, y, w, h);
    g.fillStyle = line;
    for (let yy = y; yy < y + h; yy += step) {
      g.fillRect(x, yy, w, 1);
      const off = ((yy / step) | 0) * 23 % 40;
      for (let xx = x + off; xx < x + w; xx += 40) g.fillRect(xx, yy, 1, step);
    }
  },
  /** Ziegelwand */
  bricks(g, x, y, w, h, base, brick) {
    g.fillStyle = base; g.fillRect(x, y, w, h);
    g.fillStyle = brick;
    for (let yy = y, row = 0; yy < y + h; yy += 5, row++)
      for (let xx = x - (row % 2) * 4; xx < x + w; xx += 9) g.fillRect(Math.max(x, xx), yy, Math.min(8, x + w - Math.max(x, xx)), 4);
    ART.noise(g, x, y, w, h, 'rgba(0,0,0,.35)', w * h / 18, x + y);
  },
  /**
   * Außenwand im Schnitt am Spielfeldrand (PC-Seitenrand), k = sideKit.
   * depth = Wanddicke, base/hatch = Farben, danach Schatten nach außen.
   */
  cut(k, depth, base, hatch) {
    k.r(0, 0, depth, H, base);
    for (let y = 0; y < H; y++) for (let d = (y % 3); d < depth; d += 3) k.r(d, y, 1, 1, hatch);
    k.r(0, 0, 1, H, 'rgba(255,255,255,.12)');
    k.r(depth - 1, 0, 1, H, 'rgba(0,0,0,.45)');
    k.r(depth, 0, 2, H, 'rgba(0,0,0,.3)');
  },
  /** Wie cut, aber waagrecht für die Handy-Streifen (k = bandKit) */
  bandCut(k, depth, base, hatch) {
    k.r(0, 0, PLAY_W, depth, base);
    for (let d = 0; d < depth; d++) for (let x = d % 3; x < PLAY_W; x += 3) k.r(x, d, 1, 1, hatch);
    k.r(0, 0, PLAY_W, 1, 'rgba(255,255,255,.12)');
    k.r(0, depth - 1, PLAY_W, 1, 'rgba(0,0,0,.45)');
    k.r(0, depth, PLAY_W, 2, 'rgba(0,0,0,.3)');
  },
  /** Text auf ein vorgerendertes Canvas */
  text(g, s, x, y, c, al = 'l') {
    s = String(s).toUpperCase();
    if (al === 'c') x -= (s.length * 4 - 1) >> 1;
    g.fillStyle = c;
    for (let i = 0; i < s.length; i++) { const f = FONT[s[i]]; if (!f) continue; for (let p = 0; p < 15; p++) if (f[p] === '1') g.fillRect(x + i * 4 + p % 3, y + (p / 3 | 0), 1, 1); }
  },
  /** Kleines Plakat an der Wand */
  poster(g, x, y, w, h, bg, fg) {
    ART.shadow(g, x + 1, y + 1, w, h, .5);
    ART.rect(g, x, y, w, h, '#d8ccb0'); ART.rect(g, x + 1, y + 1, w - 2, h - 2, bg);
    ART.rect(g, x + 2, y + 2, w - 4, 2, fg); ART.rect(g, x + 2, y + h - 5, w - 4, 1, fg);
    ART.rect(g, x + (w >> 1) - 2, y + 6, 4, h - 13, 'rgba(0,0,0,.45)');
  },
  /** Schlagzeug von oben, (cx, cy) = Mitte der Bassdrum */
  drumKit(g, cx, cy) {
    ART.shadow(g, cx - 18, cy - 8, 36, 18, .3);
    ART.oval(g, cx, cy + 2, 7, 5, '#e8e4dc'); ART.oval(g, cx, cy + 2, 5, 3, '#c8c4bc');      // Bassdrum
    ART.text(g, 'B', cx - 1, cy, '#c03030');
    ART.oval(g, cx - 6, cy - 5, 3, 2, '#d8d4cc'); ART.oval(g, cx + 6, cy - 5, 3, 2, '#d8d4cc');  // Toms
    ART.oval(g, cx + 12, cy + 3, 4, 3, '#d8d4cc');                                            // Standtom
    ART.oval(g, cx - 11, cy + 2, 3, 2, '#e0e0e0'); ART.rect(g, cx - 12, cy + 2, 2, 1, '#999'); // Snare
    ART.oval(g, cx - 15, cy - 4, 4, 2, '#c8a040'); ART.oval(g, cx + 15, cy - 6, 5, 2, '#c8a040'); // Becken
    ART.oval(g, cx - 17, cy + 5, 3, 1, '#d8b050');                                            // Hi-Hat
    ART.oval(g, cx, cy + 10, 3, 2, '#222');                                                   // Hocker
  },

  /* =================== Hintergründe =================== */
  bg: {

    /* ---------- 1. TOURBUS ---------- */
    bus() {
      const o = makeCanvas(PLAY_W, H), g = o.getContext('2d'), A = ART;
      A.rect(g, 0, 0, PLAY_W, H, '#08080c');
      // Außen 4 px Straße, der Bus selbst ist etwas schmaler (Wände 4..18 und 162..176)
      A.rect(g, 0, 26, 4, 278, '#2c2d31'); A.rect(g, 176, 26, 4, 278, '#2c2d31');
      A.noise(g, 0, 26, 4, 278, '#3a3b40', 50, 12); A.noise(g, 176, 26, 4, 278, '#3a3b40', 50, 13);
      busWall(g, 4, 14); busWall(g, 162, 14);
      // Boden: Gummi mit Riffelmuster
      A.rect(g, 18, 48, 144, 242, '#232836');
      g.fillStyle = '#1c202b';
      for (let y = 48; y < 290; y += 4) for (let x = 18 + ((y >> 2) % 2) * 2; x < 162; x += 4) g.fillRect(x, y, 2, 1);
      // Mittelgang: Teppichläufer mit Messingkante
      A.rect(g, 66, 48, 48, 242, '#38263a');
      g.fillStyle = '#442e46'; for (let y = 52; y < 290; y += 10) { g.fillRect(89, y, 2, 2); g.fillRect(88, y + 1, 4, 1); }
      A.rect(g, 66, 48, 1, 242, '#7a6034'); A.rect(g, 113, 48, 1, 242, '#7a6034');
      A.noise(g, 67, 48, 46, 242, '#2e1f30', 240, 4);
      // Bodenlichter am Gang
      for (let y = 58; y < 288; y += 16) { A.rect(g, 64, y, 1, 1, '#ffcc66'); A.rect(g, 115, y, 1, 1, '#ffcc66'); }
      // Sitzreihen
      for (let y = 60; y < 270; y += 38) { busSeat(g, 19, y); busSeat(g, 143, y); }
      // Gelbe Haltestangen am Gang, an jeder zweiten ein roter Stopp-Knopf
      for (let y = 60, n = 0; y < 270; y += 38, n++) for (const px of [38, 141]) {
        A.shadow(g, px + 1, y + 23, 2, 2, .5);
        A.rect(g, px, y + 22, 2, 2, '#e8c030'); A.rect(g, px, y + 22, 1, 1, '#fff0a0');
        if (n % 2 === (px < 90 ? 0 : 1)) A.rect(g, px, y + 20, 2, 1, '#e03030');
      }
      // Kram auf den Sitzen
      A.rect(g, 147, 101, 10, 7, '#3a5a8a'); A.rect(g, 147, 101, 10, 2, '#4a6a9a'); A.rect(g, 151, 103, 1, 4, '#ccc');      // Jeansjacke
      A.rect(g, 21, 176, 15, 6, '#151515'); A.rect(g, 33, 175, 4, 8, '#151515'); A.rect(g, 24, 178, 2, 1, '#aaa'); A.rect(g, 30, 178, 2, 1, '#aaa'); // Gitarrenkoffer
      A.rect(g, 148, 216, 8, 6, '#6a3a1a'); A.rect(g, 150, 214, 4, 2, '#4a2a10');                                            // Tasche
      // Vorne: Frontscheibe, Armaturen, Lenkrad, Einstiegsstufen
      A.rect(g, 18, 26, 144, 22, '#111');
      for (let k = 0; k < 10; k++) A.rect(g, 24, 28 + k, 132, 1, lerpCol('#0a1430', '#1a2850', k / 10));
      A.rect(g, 30, 29, 8, 1, 'rgba(255,255,255,.15)'); A.rect(g, 120, 31, 12, 1, 'rgba(255,255,255,.1)');
      for (let k = 0; k < 9; k++) { A.rect(g, 44 + k * 2, 37 - k, 2, 1, '#05070c'); A.rect(g, 104 + k * 2, 37 - k, 2, 1, '#05070c'); }   // Scheibenwischer
      A.rect(g, 84, 26, 12, 3, '#1a1a1e'); A.rect(g, 85, 27, 10, 1, '#4a5a7a');                                                  // Innenspiegel
      A.rect(g, 18, 38, 144, 10, '#1c1c20'); A.rect(g, 18, 38, 144, 1, '#2e2e34');
      [[40, '#7cfc6a'], [46, '#ff8a3a'], [52, '#9fd8ff']].forEach(([x, c]) => A.rect(g, x, 41, 2, 2, c));
      A.oval(g, 136, 42, 6, 3, '#0a0a0a'); A.oval(g, 136, 42, 4, 2, '#1c1c20'); A.rect(g, 135, 42, 3, 1, '#0a0a0a');
      A.rect(g, 126, 48, 20, 10, '#2a2a30'); A.rect(g, 128, 48, 16, 3, '#3a3a40');                                          // Fahrersitz
      for (let k = 0; k < 3; k++) { A.rect(g, 20, 49 + k * 4, 14, 3, '#2a2a2e'); A.rect(g, 20, 49 + k * 4, 14, 1, '#d8b030'); }   // Stufen
      // Hinten: Rückbank mit Bandkram
      A.rect(g, 18, 290, 144, 14, '#5a1822'); A.rect(g, 18, 290, 144, 3, '#7a2230');
      for (let x = 30; x < 160; x += 24) A.rect(g, x, 293, 1, 11, '#4a121c');
      A.rect(g, 28, 287, 18, 12, '#b8b8c0'); A.frame(g, 28, 287, 18, 12, '#555'); A.rect(g, 36, 287, 2, 12, '#555');        // Flightcase
      A.rect(g, 120, 292, 30, 7, '#151515'); A.rect(g, 146, 290, 6, 11, '#151515');                                          // zweiter Gitarrenkoffer
      // Licht: Tageslicht fällt durch die Seitenfenster auf die Sitze (gedithert, keine Pfützen im Gang),
      // dazu der klassische PS1-Schatten nach hinten und zu den Wänden
      const L = [];
      for (let y = 72; y < 290; y += 38) { L.push({ x: 20, y, rx: 26, ry: 16, c: '#fff0c8', a: .4 }); L.push({ x: 160, y, rx: 26, ry: 16, c: '#fff0c8', a: .4 }); }
      L.push({ x: 90, y: 50, rx: 60, ry: 16, c: '#d8e8ff', a: .35 });   // Frontscheibe
      A.lights(g, L);
      shadePass(g, PLAY_W, H, (x, y) => y < 26 || y >= 304 ? null : ART.SOFT + Math.min(1, .45 + (y - 26) / 260));
      shadePass(g, PLAY_W, H, (x, y) => y < 26 || y >= 304 ? null : ART.SOFT + 1.15 - Math.abs(x - 90) / 110);
      // Außenhaut ganz außen und abgerundete Ecken vorne/hinten: so sieht man auch am Handy den Bus
      const p = busPaint();
      for (const hx of [4, 174]) { A.rect(g, hx, 26, 2, 278, p.hull || p.wall); A.rect(g, hx === 4 ? 5 : 174, 26, 1, 278, p.hullTrim || p.trim); }
      g.fillStyle = '#2c2d31';
      for (let dy = 0; dy < 7; dy++) for (let dx = 0; dx < 7; dx++) if ((7 - dx) ** 2 + (7 - dy) ** 2 > 49) {
        g.fillRect(4 + dx, 26 + dy, 1, 1); g.fillRect(175 - dx, 26 + dy, 1, 1);
        g.fillRect(4 + dx, 303 - dy, 1, 1); g.fillRect(175 - dx, 303 - dy, 1, 1);
      }
      for (const wy of [60, 236]) for (const wx of [0, 176]) {                 // Räder schauen unter dem Bus hervor
        A.rect(g, wx, wy, 4, 28, '#0c0c0e');
        for (let y = wy + 1; y < wy + 28; y += 3) A.rect(g, wx, y, 4, 1, '#26262a');
        A.rect(g, wx === 0 ? 1 : 177, wy + 10, 2, 8, '#8a8a92');
      }
      for (const mx of [0, 177]) { A.rect(g, mx, 38, 3, 9, '#1a1a1e'); A.rect(g, mx + 1, 39, 1, 7, '#7a8aaa'); }   // Außenspiegel
      A.rect(g, 4, 299, 2, 4, '#ff4030'); A.rect(g, 174, 299, 2, 4, '#ff4030');                                   // Rücklichter
      ART.lift(g);
      return o;
    },

    /* ---------- 2. PROBERAUM ---------- */
    rehearsal() {
      // Waldlichtung im Herbst: Laub auf dem Boden, bunte Baumkronen ringsum, die Band probt in der Mitte
      const o = makeCanvas(PLAY_W, H), g = o.getContext('2d'), A = ART, r = seeded(31);
      A.rect(g, 0, 0, PLAY_W, H, '#000');
      forestFloor(g, 0, 26, PLAY_W, 278, 32);
      // Erdpfad durch die Lichtung
      for (let y = 66; y < 304; y++) {
        const x = Math.round(90 + Math.sin(y / 33) * 10), w = 12 + Math.round(Math.sin(y / 17) * 2);
        g.fillStyle = '#6a4e30'; g.fillRect(x - (w >> 1), y, w, 1);
        if ((y * 7) % 4 === 0) { g.fillStyle = '#7a5c3a'; g.fillRect(x - (w >> 1) + ((y * 13) % w), y, 2, 1); }
      }
      forestLeaves(g, 0, 66, PLAY_W, 238, 35, .22);
      // Farne und Pilze
      for (let k = 0; k < 10; k++) forestFern(g, 22 + (r() * 136 | 0), 110 + (r() * 180 | 0));
      for (let k = 0; k < 8; k++) { const x = 24 + (r() * 132 | 0), y = 100 + (r() * 190 | 0); A.rect(g, x, y, 1, 2, '#e8e0d0'); A.rect(g, x - 1, y - 1, 3, 1, r() < .5 ? '#c83a2a' : '#a8743a'); }
      // Waldrand oben
      for (let x = -4; x < 190; x += 15) forestTree(g, x + (x % 2) * 3, 30 + ((x * 7) % 6), 11, (x / 15 | 0));
      // Holzplattform mit Schlagzeug vor dem Waldrand
      A.shadow(g, 62, 38, 60, 30, .35);
      A.rect(g, 60, 36, 60, 30, '#8a6440');
      for (let y = 36; y < 66; y += 5) { A.rect(g, 60, y, 60, 1, '#6a4a2c'); A.rect(g, 60, y + 1, 60, 1, '#9a7450'); }
      for (const x of [61, 117]) A.rect(g, x, 36, 2, 30, '#5a3e24');
      A.drumKit(g, 90, 46);
      // karierte Wolldecke in der Mitte
      A.shadow(g, 50, 140, 80, 108, .25);
      A.rect(g, 48, 138, 80, 108, '#7a2a24');
      for (let x = 48; x < 128; x += 12) A.rect(g, x, 138, 4, 108, 'rgba(30,40,30,.45)');
      for (let y = 138; y < 246; y += 12) A.rect(g, 48, y, 80, 4, 'rgba(30,40,30,.45)');
      for (let x = 50; x < 128; x += 12) A.rect(g, x, 138, 1, 108, 'rgba(240,200,80,.35)');
      for (let x = 49; x < 128; x += 3) { A.rect(g, x, 136, 1, 2, '#c8b080'); A.rect(g, x, 246, 1, 2, '#c8b080'); }
      // umgestürzter Baumstamm, Kühlbox, Lagerfeuer
      A.shadow(g, 24, 270, 34, 8, .35);
      A.rect(g, 22, 266, 34, 7, '#5a3e24'); A.rect(g, 22, 266, 34, 2, '#7a5634'); A.oval(g, 55, 269, 3, 3, '#b08a5a'); A.oval(g, 55, 269, 1, 1, '#7a5634');
      for (let x = 26; x < 54; x += 5) A.rect(g, x, 268, 2, 1, '#4a7a2a');
      A.shadow(g, 22, 286, 18, 14, .35);
      A.rect(g, 20, 284, 18, 14, '#3a8ab0'); A.rect(g, 20, 284, 18, 4, '#f0ece0'); A.rect(g, 26, 285, 6, 1, '#888');
      for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; A.oval(g, 145 + Math.round(Math.cos(a) * 9), 292 + Math.round(Math.sin(a) * 6), 2, 2, k % 2 ? '#7a7670' : '#9a968e'); }
      A.rect(g, 140, 290, 10, 2, '#5a3a1e'); A.rect(g, 143, 288, 2, 6, '#4a2e18');
      // Kabel vom Verstärker über den Waldboden
      g.fillStyle = '#1a1a1a'; for (let y = 104; y < 280; y += 3) { g.fillRect(28 + Math.round(Math.sin(y / 17) * 3), y, 1, 2); g.fillRect(152 + Math.round(Math.cos(y / 19) * 3), y, 1, 2); }
      // Bäume ringsum: oben Waldrand, an den Seiten große Kronen
      for (let y = 80; y < 310; y += 26) { forestTree(g, 4 + (y % 3) * 2, y, 12, y); forestTree(g, 176 - (y % 4), y + 12, 12, y + 1); }
      // Lichtung hell, zum Waldrand hin etwas dunkler (leicht)
      shadePass(g, PLAY_W, H, (x, y) => y < 26 || y >= 304 ? null : ART.SOFT + 1.45 - Math.hypot((x - 90) * 1.3, y - 170) / 160);
      return o;
    },

    /* ---------- 3. PUB ---------- */
    pub() {
      // Gemütlicher alter Pub: Eichendielen, Holzvertäfelung, Lederbänke an den Wänden, Strudel-Plakat
      const o = makeCanvas(PLAY_W, H), g = o.getContext('2d'), A = ART, ve = VENUES.pub, r = seeded(17);
      A.rect(g, 0, 0, PLAY_W, H, '#000');
      // Wände: unten dunkle Holzvertäfelung, oben grüne Tapete mit Bildern und Wandlampen
      for (const x0 of [0, 160]) {
        A.rect(g, x0, 26, 20, 278, '#1e3022');
        for (let y = 26; y < 304; y += 6) A.rect(g, x0, y, 20, 1, '#243a28');
        const panel = x0 === 0 ? 0 : 172;
        A.rect(g, panel, 26, 8, 278, '#4a2c16');
        for (let y = 30; y < 304; y += 18) { A.frame(g, panel + 1, y, 6, 14, '#3a200e'); A.rect(g, panel + 2, y + 1, 4, 1, '#5e3a1e'); }
        A.rect(g, x0 === 0 ? 18 : 160, 26, 2, 278, '#2a1808');
      }
      // Lederbänke an den Wänden (rot, mit Knöpfen)
      for (const x of [20, 155]) {
        A.rect(g, x, 70, 5, 226, '#7a2420'); A.rect(g, x === 20 ? x : x + 4, 70, 1, 226, '#5a1814');
        for (let y = 74; y < 296; y += 8) A.rect(g, x + 2, y, 1, 1, '#a8402e');
      }
      [[10, 80], [10, 140], [166, 80], [166, 200]].forEach(([x, y], i) => {          // Bilder an der Tapete
        A.rect(g, x - 1, y, 8, 12, '#a8843a'); A.rect(g, x, y + 1, 6, 10, ['#2a3a5a', '#5a2a2a', '#3a4a2a', '#4a3a5a'][i]);
      });
      // Strudel-Plakat der Band (eigenes BROTHERS-Logo)
      A.rect(g, 8, 156, 10, 16, '#e8e0d0'); drawSwirl(g, 13, 162, 4, '#111', '#e8e0d0'); A.rect(g, 9, 168, 8, 2, '#111');
      [[13, 110], [13, 262], [167, 170], [167, 262]].forEach(([x, y]) => { A.rect(g, x - 1, y, 3, 3, '#c8a040'); A.rect(g, x, y - 2, 1, 2, '#ffe0a0'); });
      // Dartscheibe, Kamin, Jukebox
      A.oval(g, 13, 190, 5, 5, '#111'); A.oval(g, 13, 190, 4, 4, '#c03030'); A.oval(g, 13, 190, 2, 2, '#e8dcc0'); A.rect(g, 12, 189, 2, 2, '#c03030');
      A.rect(g, 0, 226, 18, 34, '#6a625a'); A.rect(g, 2, 230, 14, 26, '#1a1210'); A.noise(g, 0, 226, 18, 34, '#4a4440', 40, 8); A.rect(g, 0, 226, 18, 2, '#8a8078');
      A.rect(g, 162, 118, 14, 28, '#4a1a4a'); A.oval(g, 169, 121, 7, 4, '#6a1a6a'); A.rect(g, 164, 122, 10, 6, '#f0a020');
      A.rect(g, 164, 130, 10, 2, '#30c0f0'); A.rect(g, 164, 134, 10, 2, '#30c0f0'); A.rect(g, 165, 140, 8, 4, '#222');
      // Boden: warme Eichendielen
      A.planks(g, 25, 56, 130, 248, '#6a4426', '#55361c', 6);
      A.noise(g, 25, 56, 130, 248, '#74502e', 260, 11); A.noise(g, 25, 56, 130, 248, '#5a3a20', 200, 12);
      // großer Teppich in der Mitte, ruhiges Muster
      A.shadow(g, 40, 102, 102, 160, .2);
      A.rect(g, 38, 100, 104, 160, '#5a1a1e'); A.frame(g, 38, 100, 104, 160, '#a8843a'); A.frame(g, 41, 103, 98, 154, '#3a1014');
      for (let y = 110; y < 252; y += 14) for (let x = 48; x < 134; x += 14) { A.rect(g, x + 3, y, 1, 1, '#8a5a2a'); A.rect(g, x + 2, y + 1, 3, 1, '#8a5a2a'); A.rect(g, x + 3, y + 2, 1, 1, '#8a5a2a'); }
      // Theke: Regal mit Flaschen und Spiegel, Zapfhähne, Messingstange, Hocker
      A.rect(g, 20, 26, 140, 24, '#1e1008');
      A.rect(g, 22, 27, 136, 8, '#2a3a40'); A.rect(g, 22, 27, 136, 1, '#4a5a60');
      const cols = ['#3a8a3a', '#8a2a2a', '#d0a030', '#2a5a8a', '#ddd', '#6a3a1a'];
      for (let x = 24; x < 156; x += 4) { A.rect(g, x, 29, 2, 6, cols[(x * 7) % 6]); A.rect(g, x, 28, 1, 1, '#ccc'); }
      A.rect(g, 22, 36, 136, 2, '#3a2010');
      for (let x = 26; x < 156; x += 7) A.rect(g, x, 38, 3, 4, ['#c8c8d0', '#a0a8b0'][x % 2]);
      A.rect(g, 20, 44, 140, 12, '#6a3c18'); A.rect(g, 20, 44, 140, 2, '#9a6a34'); A.rect(g, 20, 54, 140, 2, '#d8b04a');
      for (let x = 34; x < 150; x += 26) { A.rect(g, x, 40, 3, 6, '#d8b040'); A.rect(g, x - 1, 39, 5, 2, ['#c03030', '#3070c0', '#30a030', '#e0e0e0'][(x / 26 | 0) % 4]); }
      for (let x = 30; x < 160; x += 30) { A.oval(g, x, 61, 3, 2, '#8a2a2a'); A.rect(g, x - 2, 60, 5, 1, '#aa3a3a'); }
      // Topfpflanzen in den Ecken
      for (const [x, y] of [[30, 290], [150, 72]]) { A.rect(g, x - 3, y, 6, 5, '#8a4a2a'); for (let k = 0; k < 7; k++) { const a = -2.8 + k * .45; A.rect(g, x + Math.round(Math.cos(a) * 5), y + Math.round(Math.sin(a) * 4), 2, 1, k % 2 ? '#4a7a2a' : '#3a6a22'); } }
      // Tische (Positionen aus venues.js) mit Gläsern und Hockern
      for (const t of ve.walls) pubTable(g, t);
      // Tür nach draußen unten
      A.rect(g, 70, 296, 40, 8, '#3a2410'); A.rect(g, 89, 296, 2, 8, '#2a1808'); A.rect(g, 84, 297, 12, 4, '#1a5a2a'); A.text(g, 'EXIT', 84, 298, '#7cfc6a');
      shadePass(g, PLAY_W, H, (x, y) => y < 26 || y >= 304 ? null : ART.SOFT + 1.3 - Math.hypot(x - 90, y - 165) / 210);
      return o;
    },

    /* ---------- 4. BACKSTAGE ---------- */
    backstage() {
      const o = makeCanvas(PLAY_W, H), g = o.getContext('2d'), A = ART;
      A.rect(g, 0, 0, PLAY_W, H, '#000');
      // Seitenwände: gestrichene Betonsteine mit gestapelten Flightcases
      for (const x0 of [0, 162]) {
        A.rect(g, x0, 26, 18, 278, '#24262c');
        for (let y = 26; y < 304; y += 8) A.rect(g, x0, y, 18, 1, '#1c1e24');
        for (let y = 30; y < 304; y += 16) A.rect(g, x0 + (y % 32 ? 9 : 0), y - 4, 1, 8, '#1c1e24');
      }
      [[2, 70], [2, 88], [164, 230], [164, 248], [2, 240]].forEach(([x, y]) => {
        A.rect(g, x, y, 14, 16, '#a8a8b0'); A.frame(g, x, y, 14, 16, '#3a3a40'); A.rect(g, x, y + 7, 14, 2, '#3a3a40'); A.rect(g, x + 2, y + 2, 2, 2, '#666');
      });
      // Boden: Beton mit Fugen, Flecken und Klebeband
      A.rect(g, 18, 60, 144, 244, '#383a42');
      for (let y = 60; y < 304; y += 16) A.rect(g, 18, y, 144, 1, '#30323a');
      for (let x = 18; x < 162; x += 16) A.rect(g, x, 60, 1, 244, '#30323a');
      A.noise(g, 18, 60, 144, 244, '#41434c', 400, 21); A.noise(g, 18, 60, 144, 244, '#2e3036', 300, 22);
      [[50, 130, 8, 4], [120, 230, 10, 5], [40, 270, 6, 3]].forEach(([x, y, rx, ry]) => A.oval(g, x, y, rx, ry, '#32343b'));
      for (let x = 20; x < 160; x += 6) { A.rect(g, x, 158, 4, 2, '#d8b020'); A.rect(g, x, 186, 4, 2, '#d8b020'); }   // Klebeband vor der Trennwand
      // Rückwand: Spiegel mit Glühbirnen, Schminktisch, Plakate, Uhr
      A.rect(g, 18, 26, 144, 34, '#1e2028'); A.rect(g, 18, 58, 144, 2, '#14161c');
      A.rect(g, 64, 29, 52, 24, '#c8c0a0'); A.rect(g, 66, 31, 48, 20, '#6a8aa8');
      for (let k = 0; k < 6; k++) A.rect(g, 70 + k * 7, 33 + (k % 2) * 6, 3, 1, 'rgba(255,255,255,.35)');
      for (let x = 64; x <= 114; x += 5) { A.rect(g, x, 28, 2, 2, '#fff6c0'); A.rect(g, x, 53, 2, 2, '#fff6c0'); }
      A.rect(g, 60, 54, 60, 6, '#4a2e1a'); A.rect(g, 66, 55, 2, 3, '#d33'); A.rect(g, 72, 55, 3, 3, '#eee'); A.rect(g, 100, 55, 2, 4, '#9a6'); A.rect(g, 108, 56, 4, 2, '#c8a');
      A.poster(g, 22, 30, 14, 20, '#7a2a2a', '#d0c040'); A.poster(g, 40, 32, 12, 16, '#2a2a6a', '#eee'); A.poster(g, 128, 30, 13, 18, '#2a4a2a', '#f0a020');
      A.oval(g, 150, 40, 5, 5, '#ddd'); A.oval(g, 150, 40, 4, 4, '#f4f0e8'); A.rect(g, 150, 37, 1, 4, '#111'); A.rect(g, 150, 40, 3, 1, '#111');
      // Kleiderstange oben rechts
      A.rect(g, 130, 66, 28, 1, '#888');
      [['#4a5e2a', 131], ['#22346a', 138], ['#6a2a2a', 145], ['#d8d0b0', 152]].forEach(([c, x]) => { A.rect(g, x, 67, 5, 9, c); A.rect(g, x + 2, 66, 1, 1, '#bbb'); });
      // Trennwand mit Türrahmen, Schild und Notausgang-Licht
      A.rect(g, 0, 166, 78, 12, '#16181c'); A.rect(g, 102, 166, 78, 12, '#16181c');
      A.rect(g, 0, 166, 78, 2, '#4a4c54'); A.rect(g, 102, 166, 78, 2, '#4a4c54');
      A.rect(g, 75, 164, 3, 16, '#5a5c64'); A.rect(g, 102, 164, 3, 16, '#5a5c64');
      A.rect(g, 24, 169, 34, 7, '#111'); A.text(g, 'STAGE', 26, 170, '#ffd84a'); A.rect(g, 49, 172, 5, 1, '#ffd84a'); A.rect(g, 52, 171, 1, 3, '#ffd84a');
      A.rect(g, 120, 169, 18, 7, '#0a3a1a'); A.text(g, 'EXIT', 121, 170, '#7cfc6a');
      // Unterer Raum: Sofa mit Teppich, Kühlschrank, Catering-Tisch
      A.rect(g, 18, 192, 40, 56, '#3a2a4a'); A.noise(g, 18, 192, 40, 56, '#46345a', 80, 31);
      A.rect(g, 20, 200, 14, 40, '#4a2a5a'); A.rect(g, 21, 201, 12, 12, '#5a3a6a'); A.rect(g, 21, 214, 12, 12, '#5a3a6a'); A.rect(g, 21, 227, 12, 12, '#5a3a6a');
      A.rect(g, 33, 200, 2, 40, '#3a1a4a');
      A.rect(g, 140, 186, 18, 22, '#e8e8e8'); A.rect(g, 140, 194, 18, 1, '#aaa'); A.rect(g, 155, 188, 1, 4, '#888'); A.rect(g, 155, 197, 1, 6, '#888');
      A.rect(g, 122, 272, 36, 18, '#ddd'); A.rect(g, 122, 272, 36, 3, '#c03030');
      A.rect(g, 126, 277, 8, 4, '#e0b060'); A.rect(g, 138, 278, 6, 4, '#7a3'); A.rect(g, 148, 277, 5, 5, '#d33');
      A.oval(g, 150, 285, 4, 2, '#fff'); A.rect(g, 148, 284, 1, 1, '#d33'); A.rect(g, 151, 285, 1, 1, '#3a3'); A.rect(g, 150, 284, 1, 1, '#36c');   // Schüssel Bonbons
      // Licht: Neonröhren je Raum, Spiegel, Notausgang
      A.rect(g, 70, 64, 40, 1, '#e0f0ff'); A.rect(g, 70, 182, 40, 1, '#e0f0ff');
      A.lights(g, [{ x: 90, y: 112, rx: 80, ry: 56, c: '#d0e4ff', a: .45 }, { x: 90, y: 236, rx: 80, ry: 60, c: '#d0e4ff', a: .45 },
        { x: 90, y: 44, rx: 40, ry: 20, c: '#fff0c0', a: .6 }, { x: 129, y: 172, rx: 18, ry: 10, c: '#40ff80', a: .4 }]);
      shadePass(g, PLAY_W, H, (x, y) => y < 26 || y >= 304 ? null : ART.SOFT + 1.2 - Math.abs(x - 90) / 120);
      ART.lift(g);
      return o;
    },

    /* ---------- 5. FESTIVAL-BÜHNE ---------- */
    festival() {
      // Open-Air wie Knebworth: Holzbühne am Nachmittag, davor eine riesige Menge auf der Wiese
      const o = makeCanvas(PLAY_W, H), g = o.getContext('2d'), A = ART, ve = VENUES.festival, r = seeded(43);
      A.rect(g, 0, 0, PLAY_W, H, '#000');
      // Wiese vor der Bühne mit dichter Menge (die Leute der Crowd-Mechanik kommen noch dazu)
      moorGrass(g, 0, 238, PLAY_W, 66, 45, () => 0);
      festCrowd(g, 0, 246, PLAY_W, 58, 47, .55);
      A.rect(g, 0, 240, 180, 3, '#9a9aa4'); for (let x = 2; x < 180; x += 10) A.rect(g, x, 240, 2, 6, '#6a6a74');   // Wellenbrecher
      // Bühne: helle Holzbretter mit Gaffa und Kabeln
      A.planks(g, 18, 26, 144, 208, '#6a5238', '#5a4430', 8);
      A.noise(g, 18, 26, 144, 208, '#76603f', 300, 41); A.noise(g, 18, 26, 144, 208, '#54402c', 200, 42);
      g.fillStyle = '#1a1a1a';
      for (let x = 30; x < 150; x++) { g.fillRect(x, 226 + Math.round(Math.sin(x / 9) * 1.5), 1, 1); }
      for (let y = 70; y < 226; y++) { g.fillRect(28 + Math.round(Math.sin(y / 11) * 2), y, 1, 1); g.fillRect(152 + Math.round(Math.cos(y / 13) * 2), y, 1, 1); }
      A.rect(g, 40, 58, 100, 1, '#f0e8c0');
      for (let k = 0; k < 8; k++) A.rect(g, 26 + (r() * 120 | 0), 80 + (r() * 140 | 0), 4, 1, '#d8c040');   // Gaffa-Markierungen
      for (const m of ve.mics) { A.rect(g, m.x - 4, m.y + 2, 8, 1, '#e0e0e0'); A.rect(g, m.x - 4, m.y + 2, 1, 3, '#e0e0e0'); A.rect(g, m.x + 3, m.y + 2, 1, 3, '#e0e0e0'); }
      // Traverse oben
      A.rect(g, 0, 26, 180, 6, '#5a5a62'); g.fillStyle = '#8a8a94';
      for (let x = 0; x < 180; x += 4) { g.fillRect(x, 26 + (x % 8 ? 0 : 4), 1, 2); g.fillRect(x, 26, 4, 1); g.fillRect(x, 31, 4, 1); }
      // Banner und Drum-Podest
      A.rect(g, 52, 32, 76, 9, '#111'); A.frame(g, 52, 32, 76, 9, '#444'); A.text(g, 'BROTHERS', 74, 34, '#ffd84a');
      A.rect(g, 62, 41, 56, 20, '#3a2a1a'); A.frame(g, 62, 41, 56, 20, '#22180e'); A.rect(g, 62, 59, 56, 2, '#1a120a');
      A.drumKit(g, 90, 50);
      for (const x of [20, 144]) {                                                    // Verstärkertürme
        A.rect(g, x, 40, 16, 22, '#151515'); A.frame(g, x, 40, 16, 22, '#2a2a2a');
        A.rect(g, x + 1, 46, 14, 15, '#222'); for (let y = 47; y < 61; y += 2) A.rect(g, x + 2, y, 12, 1, '#1a1a1a');
        A.rect(g, x, 36, 16, 5, '#1a1a1a'); for (let k = 0; k < 4; k++) A.rect(g, x + 2 + k * 3, 38, 1, 1, '#d8b040');
        A.rect(g, x + 2, 37, 6, 1, '#c8c0a0');
      }
      // Boxentürme links und rechts, im Gras stehend
      moorGrass(g, 0, 32, 18, 206, 48, () => 0); moorGrass(g, 162, 32, 18, 206, 49, () => 0);
      for (let y = 36; y < 234; y += 22) for (const x of [2, 164]) {
        A.shadow(g, x + 2, y + 2, 14, 19, .4);
        A.rect(g, x, y, 14, 19, '#1c1c20'); A.oval(g, x + 7, y + 7, 4, 4, '#2a2a30'); A.oval(g, x + 7, y + 7, 2, 2, '#111'); A.rect(g, x + 4, y + 14, 6, 2, '#2a2a30');
      }
      for (const r2 of ve.walls) { A.rect(g, r2.x, r2.y, r2.w, r2.h, '#1a1a1a'); A.rect(g, r2.x + 2, r2.y + 1, r2.w - 4, 5, '#2a2a30'); A.rect(g, r2.x + 3, r2.y + 2, r2.w - 6, 3, '#151518'); }
      // Bühnenkante
      A.rect(g, 18, 232, 144, 6, '#2a2420'); A.rect(g, 18, 232, 144, 1, '#8a7656');
      for (let x = 22; x < 160; x += 12) A.rect(g, x, 234, 3, 2, '#f0e060');
      // leichter Schatten des Bühnendachs oben, sonst Tageslicht
      shadePass(g, PLAY_W, H, (x, y) => y < 26 || y >= 238 ? null : ART.SOFT + .9 + (y - 26) / 300 - Math.abs(x - 90) / 400);
      return o;
    },

    /* ---------- 6. HOTEL ---------- */
    hotel() {
      // Landhotel im Querschnitt: drei Zimmer übereinander, jedes mit eigenem Stil.
      // Oben je eine Tapetenwand mit Bildern, dazwischen Decke mit Stuck und Kronleuchter.
      const o = makeCanvas(PLAY_W, H), g = o.getContext('2d'), A = ART, ve = VENUES.hotel;
      A.rect(g, 0, 0, PLAY_W, H, '#1a120e');
      // Dach im Schnitt
      A.rect(g, 0, 26, 180, 30, '#4a3424');
      for (let x = 0; x < 180; x += 12) { A.rect(g, x, 26, 4, 24, '#5e4430'); A.rect(g, x, 26, 1, 24, '#74563c'); }
      A.rect(g, 0, 26, 180, 2, '#2a1c12');
      hotelCeiling(g, 50, 12);
      // Zimmer: Tapete, Teppich, Akzentfarbe, Bettdecke
      const T = [
        { wall: '#5a2a4a', stripe: '#6a3458', carpet: '#3a1a30', dot: '#5a2a4a', bed: '#c8a040', name: 'SUITE' },   // 301: Rockstar-Suite
        { wall: '#2a4a6a', stripe: '#34567a', carpet: '#1e2e44', dot: '#2c405a', bed: '#e8e4dc', name: '' },        // 202: klassisch
        { wall: '#3a5a34', stripe: '#46683e', carpet: '#2a3a22', dot: '#3a4c2c', bed: '#d87a4a', name: '' },        // 103: Gartenzimmer
      ];
      ve.floors.forEach((f, i) => {
        const y0 = f.y0 - 4, y1 = f.y1 + 4, room = (3 - i) + '0' + (i + 1), t = T[i];
        // Teppich mit dezentem Punktmuster
        A.rect(g, 18, y0, 128, y1 - y0, t.carpet);
        for (let y = y0 + 10; y < y1; y += 6) for (let x = 20 + ((y / 6 | 0) % 2) * 3; x < 146; x += 6) A.rect(g, x, y, 1, 1, t.dot);
        // Tapetenwand oben mit Streifen, Bildern und Wandlampen
        A.rect(g, 18, y0, 128, 8, t.wall);
        for (let x = 20; x < 146; x += 4) A.rect(g, x, y0, 1, 7, t.stripe);
        A.rect(g, 18, y0 + 7, 128, 1, '#e8dcc0'); A.rect(g, 18, y0 + 8, 128, 1, 'rgba(0,0,0,.35)');
        for (const [x, c] of [[66, '#c8784a'], [84, '#3a7a9a']]) { A.rect(g, x, y0 + 1, 10, 5, '#a8843a'); A.rect(g, x + 1, y0 + 2, 8, 3, c); }
        for (const x of [60, 98]) { A.rect(g, x, y0 + 2, 2, 2, '#e8c050'); A.rect(g, x, y0 + 1, 2, 1, '#fff0c0'); }
        // Fenster links: draußen grüne Hügel
        A.rect(g, 0, y0, 18, y1 - y0, '#4a3424');
        const wy = y0 + 9;
        for (let y = 0; y < 24; y++) A.rect(g, 3, wy + y, 12, 1, lerpCol('#9ac4e0', '#e8f0e8', y / 12));
        A.rect(g, 3, wy + 12, 12, 12, '#5a8a3a'); A.rect(g, 3, wy + 11, 12, 1, '#6a9a44');
        A.oval(g, 7, wy + 13, 3, 3, '#3e6028'); A.oval(g, 12, wy + 15, 2, 2, '#2e4a22');
        A.rect(g, 8, wy, 1, 24, '#f0ece0'); A.rect(g, 3, wy + 9, 12, 1, '#f0ece0');
        A.rect(g, 1, wy - 2, 4, 28, '#a84a4a'); A.rect(g, 13, wy - 2, 4, 28, '#a84a4a'); A.rect(g, 1, wy - 3, 16, 2, '#7a3434');
        // Bett mit Kopfteil, Kissen, Decke
        const b = ve.beds[i];
        A.shadow(g, b.x + 2, b.y + 2, b.w, b.h, .4);
        A.rect(g, b.x - 1, b.y, b.w + 2, 4, '#6a4428'); A.rect(g, b.x - 1, b.y, b.w + 2, 1, '#8a6040');
        A.rect(g, b.x, b.y + 4, b.w, b.h - 4, '#f4f0e8');
        A.rect(g, b.x + 2, b.y + 5, 9, 5, '#fff'); A.rect(g, b.x + 13, b.y + 5, 9, 5, '#fff');
        A.rect(g, b.x + 1, b.y + 12, b.w - 2, b.h - 13, t.bed); A.rect(g, b.x + 1, b.y + 12, b.w - 2, 2, '#fbf8f0');
        // Nachttisch mit Lampe
        A.rect(g, 52, y0 + 9, 8, 7, '#6a4428'); A.oval(g, 56, y0 + 12, 2, 2, '#ffe0a0');
        // Kommode mit Fernseher, Minibar
        A.rect(g, 104, y0 + 9, 32, 7, '#5a3a22'); A.rect(g, 104, y0 + 9, 32, 1, '#7a5a3a');
        A.rect(g, 114, y0 + 9, 14, 6, '#111'); A.rect(g, 115, y0 + 10, 12, 4, '#1a2a4a'); A.rect(g, 116, y0 + 11, 4, 1, '#4a6aaa');
        A.rect(g, 92, y0 + 9, 8, 7, '#d8d8d8'); A.rect(g, 92, y0 + 12, 8, 1, '#999');
        // Zimmer-eigene Deko
        if (i === 0) {                                                                 // Rockstar-Suite: Gitarre, Platten, Flaschen
          A.rect(g, 72, y1 - 16, 3, 12, '#5a3a1a'); A.oval(g, 73, y1 - 6, 4, 3, '#c8783a'); A.rect(g, 72, y1 - 7, 2, 1, '#222');
          for (let k = 0; k < 3; k++) A.oval(g, 90 + k * 7, y1 - 10, 3, 3, ['#111', '#222', '#111'][k]);
          for (let k = 0; k < 4; k++) A.rect(g, 116 + k * 4, y1 - 9, 2, 4, '#3a7a3a');
        } else if (i === 1) {                                                          // klassisch: Sessel, Stehlampe, Koffer
          A.rect(g, 70, y1 - 18, 12, 10, '#7a3a2a'); A.rect(g, 72, y1 - 16, 8, 6, '#9a4a34');
          A.oval(g, 88, y1 - 14, 2, 2, '#fff0c0');
          A.rect(g, 104, y1 - 12, 12, 7, '#3a5a7a'); A.rect(g, 104, y1 - 12, 12, 1, '#5a7a9a'); A.rect(g, 109, y1 - 13, 2, 1, '#222');
        } else {                                                                       // Gartenzimmer: Pflanzen, Korbsessel
          for (const [x, y] of [[76, y1 - 10], [124, y1 - 8]]) { A.oval(g, x, y, 4, 4, '#3e6028'); A.oval(g, x - 1, y - 1, 2, 2, '#56783a'); A.rect(g, x - 2, y + 3, 4, 2, '#a85a34'); }
          A.oval(g, 98, y1 - 12, 5, 4, '#c8a060'); A.oval(g, 98, y1 - 12, 3, 2, '#a88040');
        }
        // Zimmertür mit Messingnummer
        A.rect(g, 138, y1 - 24, 8, 20, '#5a3420'); A.frame(g, 138, y1 - 24, 8, 20, '#3a2010'); A.rect(g, 144, y1 - 14, 1, 2, '#e8c050');
        A.text(g, room, 128, y0 + 17, 'rgba(232,192,80,.85)');
        // Aufzug: Messingrahmen, daneben Holzvertäfelung
        A.rect(g, 146, y0, 34, y1 - y0, '#3a2418');
        for (let y = y0; y < y1; y += 6) A.rect(g, 146, y, 34, 1, '#2e1c12');
        A.rect(g, 176, y0, 2, y1 - y0, '#2a1a10');
        const L = ve.lifts[i];
        A.rect(g, L.x - 2, L.y - 2, L.w + 4, L.h + 4, '#a8843a'); A.rect(g, L.x - 1, L.y - 1, L.w + 2, L.h + 2, '#6a5020');
        A.rect(g, L.x, L.y, L.w, L.h, '#b8b0a0'); A.rect(g, L.x + L.w / 2 - 1, L.y, 1, L.h, '#6a6458'); A.rect(g, L.x + 1, L.y + 1, 2, L.h - 2, '#d0c8b8');
        A.rect(g, L.x + 3, L.y - 8, 10, 5, '#111'); A.text(g, String(3 - i), L.x + 6, L.y - 8, '#ff8a3a');
      });
      // Zwischendecken: Boden im Schnitt, darunter weiße Stuckdecke mit Kronleuchter
      for (const w of ve.walls) {
        A.rect(g, w.x, w.y, w.w, w.h, '#4a3424');
        A.rect(g, w.x, w.y, w.w, 3, '#6a4c34'); A.rect(g, w.x, w.y, w.w, 1, '#2a1c12');
        for (let x = 0; x < 180; x += 10) A.rect(g, x, w.y + 3, 6, 7, '#5a4030');                      // Balken im Schnitt
        hotelCeiling(g, w.y + 10, w.h - 10);
      }
      shadePass(g, PLAY_W, H, (x, y) => y < 56 || y >= 304 ? null : ART.SOFT + 1.25 - Math.abs(x - 80) / 200);
      return o;
    },

    /* ---------- 7. DAS MOOR: weites Grasland, blauer Himmel, rosa Wolken (id bleibt 'flat') ---------- */
    flat() {
      // Das Moor: weites Grasland bis zum Horizont, blauer Himmel, rosa Wolken
      const o = makeCanvas(PLAY_W, H), g = o.getContext('2d'), A = ART, HZ = MOOR.horizon, r = seeded(91);
      A.rect(g, 0, 0, PLAY_W, H, '#000');
      // Himmel
      moorSky(g, 0, 26, PLAY_W, HZ, y => .3 + .7 * (y - 26) / (HZ - 26));
      // feine weiße Schleierwolken, schräg nach rechts oben
      for (const [x1, y1, len] of [[150, 28, 70], [176, 31, 54], [120, 27, 40], [70, 33, 30]]) {
        for (let k = 0; k < len; k++) {
          const x = x1 - k, y = Math.round(y1 + k * .22);
          if (y >= HZ - 6) break;
          g.fillStyle = k % 5 === 0 ? 'rgba(255,255,255,.18)' : 'rgba(255,255,255,.32)'; g.fillRect(x, y, 2, 1);
          if (k % 3 === 0) { g.fillStyle = 'rgba(255,255,255,.14)'; g.fillRect(x - 1, y + 1, 3, 1); }
        }
      }
      // weiche Quellwolke und rosa Wolkenband über dem Horizont
      for (const [cx, cy, rx] of [[30, 38, 14], [44, 36, 10], [140, 40, 12]]) {
        for (let y = -3; y <= 2; y++) { const w = Math.round(rx * Math.sqrt(1 - (y * y) / 12)); g.fillStyle = y < 0 ? 'rgba(250,250,255,.45)' : 'rgba(230,236,250,.35)'; g.fillRect(cx - w, cy + y, w * 2, 1); }
      }
      for (let k = 0; k < 26; k++) {
        const x = (r() * 200 | 0) - 10, y = HZ - 9 + (r() * 7 | 0), w = 8 + (r() * 26 | 0);
        g.fillStyle = r() < .5 ? 'rgba(240,160,150,.55)' : 'rgba(250,196,176,.5)'; g.fillRect(x, y, w, 1);
        if (r() < .5) { g.fillStyle = 'rgba(255,214,196,.4)'; g.fillRect(x + 3, y - 1, w - 6, 1); }
      }
      // Horizont: ferner, flacher Hügelzug
      for (let x = 0; x < PLAY_W; x++) {
        const hh = Math.round(1 + Math.max(0, Math.sin(x / 23) * 1.6 + Math.sin(x / 9 + 1) * .6));
        g.fillStyle = '#5c7066'; g.fillRect(x, HZ - hh, 1, hh);
      }
      // Grasland: oben dunstig und klein, nach unten groß und satt
      moorGrass(g, 0, HZ, PLAY_W, 304 - HZ, 93, y => Math.max(0, 1 - (y - HZ) / 34));
      // Trampelpfad, der sich zum Horizont schlängelt
      for (let y = HZ + 2; y < 304; y++) {
        const t = (y - HZ) / (304 - HZ), w = Math.max(1, Math.round(1 + t * 8)), x = MOOR.pathX(y) - (w >> 1);
        g.fillStyle = lerpCol('#a8a88c', '#a08e62', t); g.fillRect(x, y, w, 1);
        if (t > .3 && (y * 7) % 5 === 0) { g.fillStyle = '#8a7a54'; g.fillRect(x + ((y * 13) % w), y, 1, 1); }
        if (t > .2) { g.fillStyle = 'rgba(40,60,20,.35)'; g.fillRect(x - 1, y, 1, 1); g.fillRect(x + w, y, 1, 1); }
      }
      // Heidekraut und kleine Blumen
      for (let k = 0; k < 9; k++) {
        const cx = 24 + (r() * 130 | 0), cy = 90 + (r() * 200 | 0);
        for (let n = 0; n < 14; n++) { g.fillStyle = r() < .5 ? '#8a5a86' : '#a874a0'; g.fillRect(cx + (r() * 10 | 0) - 5, cy + (r() * 6 | 0) - 3, 1, 1); }
      }
      for (let k = 0; k < 16; k++) { g.fillStyle = r() < .6 ? '#f0ece0' : '#f0d860'; g.fillRect(20 + (r() * 140 | 0), 80 + (r() * 220 | 0), 1, 1); }
      // Trockensteinmauer (Hindernis links oben)
      A.shadow(g, 20, 124, 22, 64, .3);
      A.rect(g, 18, 122, 22, 64, '#5a5a52');
      for (let y = 122; y < 186; y += 4) for (let x = 18 + ((y >> 2) % 2) * 3; x < 40; x += 6) {
        const c = ['#8a8a80', '#9a988c', '#7a7a72', '#a8a69a'][(x * 3 + y) % 4];
        A.rect(g, x, y, 5, 3, c); A.rect(g, x, y, 5, 1, 'rgba(255,255,255,.18)');
      }
      for (let k = 0; k < 30; k++) A.rect(g, 18 + (r() * 22 | 0), 122 + (r() * 64 | 0), 1 + (r() * 2 | 0), 1, r() < .6 ? '#6a8a3a' : '#c8c070');   // Moos und Flechten
      // Findling (Hindernis links unten)
      A.shadow(g, 21, 240, 20, 18, .35);
      A.oval(g, 28, 246, 10, 9, '#7c7a72'); A.oval(g, 27, 244, 8, 7, '#949288'); A.oval(g, 25, 242, 4, 3, '#b4b2a6');
      for (let k = 0; k < 10; k++) A.rect(g, 21 + (r() * 14 | 0), 240 + (r() * 12 | 0), 1, 1, r() < .5 ? '#c8c070' : '#6a8a3a');
      // Schafe am rechten Rand (außerhalb des Laufbereichs) und weit hinten am Horizont
      moorSheep(g, 166, 104, -1); moorSheep(g, 170, 210, 1); moorSheep(g, 162, 276, -1);
      for (const [x, y] of [[40, 56], [44, 57], [128, 55]]) { A.rect(g, x, y, 2, 1, '#e8e4d8'); }
      // Licht: Sonne von oben, nach unten etwas satter (leicht, nur auf dem Gras)
      shadePass(g, PLAY_W, H, (x, y) => y < HZ || y >= 304 ? null : ART.SOFT + 1.25 - (y - HZ) / 520 - Math.abs(x - 90) / 260);
      return o;
    },
  },

  /* =================== Animationen (jedes Frame) =================== */
  anim: {
    bus(T) {
      // (Straßenlaternen an den Fenstern entfernt: kein Licht auf den Wänden)
      X.fillStyle = '#ddd';                // Mittelstreifen durch die Frontscheibe
      for (let k = 0; k < 3; k++) X.fillRect(89, Math.round(28 + ((T * 30 + k * 4) % 10)), 2, 1);
    },
    rehearsal(T) {
      // ein paar Blätter segeln langsam herab
      for (let k = 0; k < 4; k++) {
        const y = Math.round(((T * (6 + k) + k * 80) % 300) + 20), x = Math.round(30 + k * 38 + Math.sin(T * 1.2 + k * 2) * 8);
        X.fillStyle = ['#d0a040', '#b8682a', '#9a3a20', '#e0b050'][k]; X.fillRect(x, y, 2, 1); X.fillRect(x + (Math.sin(T * 3 + k) > 0 ? 1 : 0), y + 1, 1, 1);
      }
      // Lagerfeuer flackert
      for (let k = 0; k < 4; k++) {
        const h = 3 + Math.round(Math.abs(Math.sin(T * 7 + k * 1.9)) * 5);
        X.fillStyle = k % 2 ? '#ff8a20' : '#ffd040'; X.fillRect(141 + k * 2, 290 - h, 2, h);
      }
    },
    pub(T) {
      X.fillStyle = (T * 3 | 0) % 2 ? '#ff60ff' : '#60ffff'; X.fillRect(164, 138, 10, 2);          // Jukebox
      for (let k = 0; k < 6; k++) {                                                                 // Kaminfeuer
        const h = 4 + Math.round(Math.abs(Math.sin(T * 9 + k * 1.7)) * 8);
        X.fillStyle = k % 2 ? '#ff8a20' : '#ffd040'; X.fillRect(3 + k * 2, 256 - h, 2, h);
      }
      X.fillStyle = '#c03010'; X.fillRect(3, 254, 12, 2);
    },
    backstage(T) {
      if ((T * 1.5 | 0) % 2) { X.fillStyle = '#7cfc6a'; X.fillRect(120, 168, 18, 1); }             // Notausgang-Licht pulsiert
    },
    festival(T) {
      // Scheinwerfer-Kegel und Nebel nur auf der Bühne, nicht auf den Boxentürmen
      X.save(); X.beginPath(); X.rect(18, 26, 144, 212); X.clip();
      for (let k = 0; k < 3; k++) {
        const cx = 90 + Math.sin(T * .9 + k * 2.1) * 55, cy = 120 + Math.cos(T * .7 + k) * 40;
        X.fillStyle = k === 1 ? 'rgba(255,230,120,.06)' : 'rgba(160,190,255,.05)';
        X.fillRect(Math.round(cx - 18), Math.round(cy - 10), 36, 20); X.fillRect(Math.round(cx - 12), Math.round(cy - 14), 24, 28);
      }
      // Bühnennebel zieht durch
      X.fillStyle = 'rgba(200,210,255,.05)';
      for (let k = 0; k < 4; k++) X.fillRect(Math.round(((T * 8 + k * 60) % 240) - 60), 180 + k * 12, 70, 8);
      X.restore();
      // Scheinwerfer an der Traverse blinken im Wechsel
      const cols = ['#ff4a4a', '#4a8aff', '#ffd84a', '#e04aff'];
      for (let x = 10, k = 0; x < 175; x += 16, k++) {
        const on = ((T * 4 | 0) + k) % 3 !== 0;
        X.fillStyle = on ? cols[k % 4] : '#333'; X.fillRect(x, 31, 4, 3);
      }
    },
    flat(T) {
      // zwei Vögel ziehen langsam über den Himmel
      X.fillStyle = '#2a3a4a';
      for (let k = 0; k < 2; k++) {
        const x = Math.round(((T * (5 + k * 2) + k * 110) % 230) - 25), y = 32 + k * 5 + Math.round(Math.sin(T * .8 + k) * 1.5);
        const up = Math.sin(T * 5 + k * 2) > 0 ? 1 : 0;
        X.fillRect(x - 2, y - up, 2, 1); X.fillRect(x, y, 1, 1); X.fillRect(x + 1, y - up, 2, 1);
      }
      // ein Schaf hebt ab und zu den Kopf
      if (Math.sin(T * .7) > .6) { X.fillStyle = '#2a2420'; X.fillRect(171, 208, 2, 2); }
    },
    hotel(T) {
      // (früher Leuchtreklame auf dem Dach - entfernt, oben ist jetzt die Dachdecke)
    },
  },

  /* =================== PC-Seitenränder ===================
     Links und rechts neben dem Spielfeld (nur am PC, je 30 px breit).
     Innen (am Spielfeld) sitzt immer die Außenwand im Schnitt, außen
     sieht man die Umgebung: Straße, Hinterhof, Gehweg, Laderampe ...
     Gemalt wird mit sideKit: d = Abstand vom Spielfeld nach außen.
     Achtung: außen (d 15..27) liegt später die Wut-Leiste, wichtiges also nach innen. */
  side: {
    /* Tourbus: Landstraße, daneben Grünstreifen mit Hecke (Bäume ziehen in sideAnim vorbei) */
    bus(g, x, w) {
      const k = sideKit(g, x, w);
      k.r(0, 0, w, H, '#2c2d31');                                                     // Asphalt
      ART.noise(g, x, 0, w, H, '#36373c', 300, x + 5); ART.noise(g, x, 0, w, H, '#232428', 260, x + 6);
      const c = makeCanvas(w, H); moorGrass(c.getContext('2d'), 0, 0, w, H, x + 7, () => 0);   // Grünstreifen
      g.save(); g.beginPath(); g.rect(k.L ? x : x + 16, 0, w - 16, H); g.clip(); g.drawImage(c, x, 0); g.restore();
      k.r(15, 0, 1, H, '#4a5a30'); k.r(16, 0, 1, H, 'rgba(0,0,0,.25)');                // Grasnarbe am Straßenrand
      k.r(0, 0, 3, H, 'rgba(0,0,0,.35)');                                             // Schatten des Busses
      k.r(6, 0, 1, H, '#8a8a7a');                                                       // Randlinie
      for (const y0 of [60, 236]) { k.r(0, y0, 2, 28, '#0c0c0e'); k.r(0, y0 + 10, 1, 8, '#5a5a62'); }   // Räder (Rest)
    },
    /* Wald: Laubboden mit großen Baumkronen */
    rehearsal(g, x, w) {
      forestFloor(g, x, 0, w, H, x + 21);
      forestLeaves(g, x, 0, w, H, x + 22, .3);
      for (let y = -6; y < H + 10; y += 22) forestTree(g, x + 4 + ((y / 22 | 0) % 2) * 12, y, 12, y + x);
    },
    /* Pub: Steinwand, Gehweg aus Platten, Bordstein, nasse Straße und Laternen */
    pub(g, x, w) {
      const k = sideKit(g, x, w);
      k.r(0, 0, 15, H, '#3c3a36');                                                     // Gehwegplatten
      for (let y = 3; y < H; y += 10) k.r(5, y, 10, 1, '#2c2a26');
      k.r(10, 0, 1, H, '#2c2a26');
      k.r(15, 0, 2, H, '#6a6864'); k.r(15, 0, 1, H, '#84827c');                        // Bordstein
      const c = makeCanvas(w, H); moorGrass(c.getContext('2d'), 0, 0, w, H, x + 17, () => 0);   // Dorfwiese
      g.save(); g.beginPath(); g.rect(k.L ? x : x + 17, 0, w - 17, H); g.clip(); g.drawImage(c, x, 0); g.restore();
      for (const y of [86, 196]) k.r(5, y - 2, 9, 20, 'rgba(255,190,100,.16)');          // Licht aus den Pub-Fenstern
      for (const y of [40, 140, 250]) {                                                // Laternen
        k.r(8, y - 10, 10, 22, 'rgba(255,210,120,.08)'); k.r(6, y - 6, 14, 14, 'rgba(255,210,120,.08)');
        k.r(12, y, 2, 2, '#ffe0a0'); k.r(11, y - 1, 4, 1, '#222');
      }
      ART.cut(k, 5, '#4a3a2a', '#3a2c1e');
      for (const y of [86, 196]) { k.r(0, y, 5, 16, '#d8a050'); k.r(0, y + 7, 5, 1, '#5a3a1a'); k.r(2, y, 1, 16, '#5a3a1a'); }   // Fenster
      k.r(6, 282, 5, 7, '#1a1a1a'); k.r(7, 283, 3, 2, '#ddd'); k.r(7, 286, 3, 1, '#ddd');      // Kreidetafel
      for (const y of [30, 170]) treeTop(g, k.X(21, 1), y, 9);                              // Bäume auf der Wiese
      k.r(18, 236, 4, 12, '#7a5a32'); k.r(17, 238, 1, 8, '#5a4024');                          // Biertisch
    },
    /* Backstage: Betonwand, Laderampe mit Warnstreifen, Kisten und Kabeln */
    backstage(g, x, w) {
      const k = sideKit(g, x, w), r = seeded(x + 33);
      k.r(0, 0, w, H, '#26282c');
      for (let y = 10; y < H; y += 26) k.r(0, y, w, 1, '#1e2024');                     // Betonplatten
      for (let n = 0; n < 6; n++) ART.oval(g, k.X(8 + (r() * 18 | 0)), 40 + (r() * 260 | 0), 2 + (r() * 2 | 0), 1, '#1a1b1e');   // Ölflecken
      for (let y = 0; y < H; y++) k.r(5, y, 3, 1, ((y >> 2) % 2) ? '#d8b020' : '#1a1a1a');   // Warnstreifen
      for (const [y, h] of [[52, 26], [142, 14], [232, 34]]) {                          // Flightcases
        k.r(11, y + 2, 7, h, 'rgba(0,0,0,.4)');
        k.r(10, y, 7, h, '#8a8a94'); k.r(10, y, 7, 1, '#b4b4be');
        k.r(10, y, 2, 2, '#333'); k.r(15, y, 2, 2, '#333'); k.r(10, y + h - 2, 2, 2, '#333'); k.r(15, y + h - 2, 2, 2, '#333');
        k.r(12, y + (h >> 1), 3, 1, '#333');
      }
      for (let y = 0; y < H; y++) k.r(9 + Math.round(Math.sin(y / 14) * 1.2), y, 1, 1, '#0e0e10');   // Kabel
      const c = makeCanvas(w, H); moorGrass(c.getContext('2d'), 0, 0, w, H, x + 35, () => 0);   // Festivalwiese
      g.save(); g.beginPath(); g.rect(k.L ? x : x + 19, 0, w - 19, H); g.clip(); g.drawImage(c, x, 0); g.restore();
      ART.cut(k, 5, '#4a4e56', '#3a3d44');
    },
    /* Festival: Traverse am Bühnenrand, daneben Wiese mit der Menge und einem Delay-Turm */
    festival(g, x, w) {
      const k = sideKit(g, x, w);
      moorGrass(g, x, 0, w, H, x + 41, () => 0);
      festCrowd(g, x, 150, w, H - 150, x + 43, .6);
      k.r(6, 60, 10, 40, '#4a4c54'); k.r(7, 61, 8, 38, '#2a2c32'); k.r(8, 64, 6, 10, '#1a1a1e'); k.r(8, 78, 6, 10, '#1a1a1e');   // Delay-Turm
      k.r(0, 226, w, 4, '#9a9aa4'); for (let d = 1; d < w; d += 3) k.r(d, 227, 1, 3, '#6a6a74');
      k.r(0, 0, 1, 226, '#9a9ca4'); k.r(4, 0, 1, 226, '#9a9ca4');                       // Traverse: zwei Rohre
      for (let y = 0; y < 226; y++) k.r(1 + ((y >> 1) % 3), y, 1, 1, '#6a6c74');
      k.r(5, 0, 2, 226, 'rgba(0,0,0,.35)');
    },
    /* Hotel (Querschnitt): Außenwand mit Balkonen, draußen Park mit Bäumen und Kiesweg */
    hotel(g, x, w) {
      const k = sideKit(g, x, w);
      for (let y = 0; y < 120; y += 2) k.r(0, y, w, 2, lerpCol('#c86a7a', '#ffd0a0', y / 120));   // Abendhimmel
      moorGrass(g, x, 120, w, H - 120, x + 51, y => Math.max(0, 1 - (y - 120) / 40));
      treeTop(g, k.X(14, 1), 150, 8); treeTop(g, k.X(10, 1), 240, 9);
      k.r(0, 290, w, 14, '#b8a888'); ART.noise(g, x, 290, w, 14, '#988868', 40, x + 7);   // Kiesweg
      ART.cut(k, 4, '#6a5040', '#58402e');
      for (const y of [124, 204]) {                                                     // Balkone
        k.r(4, y + 4, 6, 3, '#5a4030'); k.r(4, y + 4, 6, 1, '#7a5a40');
        k.r(9, y - 4, 1, 8, '#2a2a2a'); k.r(5, y - 4, 5, 1, '#2a2a2a');
        k.r(5, y + 1, 2, 2, '#c84a6a');                                                 // Blumenkasten
      }
    },
    /* Moor: Himmel und Gras gehen weiter, außen eine Trockensteinmauer als Feldgrenze */
    flat(g, x, w) {
      const k = sideKit(g, x, w), r = seeded(x + 9), HZ = MOOR.horizon;
      moorSky(g, x, 0, w, HZ, y => .3 + .7 * (y - 26) / (HZ - 26));
      for (let n = 0; n < 6; n++) { g.fillStyle = 'rgba(240,170,156,.5)'; g.fillRect(x + (r() * w | 0), HZ - 9 + (r() * 7 | 0), 4 + (r() * 8 | 0), 1); }
      g.fillStyle = '#5c7066'; g.fillRect(x, HZ - 1, w, 1);
      moorGrass(g, x, HZ, w, H - HZ, x + 95, y => Math.max(0, 1 - (y - HZ) / 34));
      for (let y = 90; y < H; y += 3) {                                                   // Mauer
        k.r(13 + ((y / 3 | 0) % 2), y, 4, 2, ['#8a8a80', '#9a988c', '#7a7a72'][(y / 3 | 0) % 3]);
        k.r(13, y + 2, 5, 1, 'rgba(0,0,0,.25)');
      }
      for (let y = 100; y < H; y += 60) moorSheep(g, k.X(6 + (y % 7)), y + 20, k.L ? 1 : -1);
    },
  },

  /* Animationen der Seitenränder (jedes Frame, ohne Abdunkeln: lieber gedeckte Farben) */
  sideAnim: {
    bus(T, x, w) {
      const k = sideKit(X, x, w);
      for (let n = 0; n < 11; n++) k.r(11, Math.round(((T * 22 + n * 30) % 330) - 20), 1, 14, '#5a5a50');   // Fahrbahnmarkierung
      for (let n = 0; n < 4; n++) {                                                      // Bäume ziehen langsam vorbei
        const y = Math.round(((T * 22 + n * 97 + (k.L ? 0 : 45)) % 400) - 40);
        treeTop(X, k.X(20 + (n % 2) * 3, 1), y, 8 + (n % 3));
      }
    },
    rehearsal(T, x, w) {
      // ein Eichhörnchen huscht ab und zu am Rand entlang
      const k = sideKit(X, x, w), t = (T * .25 + (x ? .5 : 0)) % 1;
      if (t < .3) { const y = Math.round(300 - t / .3 * 280); k.r(9, y, 3, 2, '#a85a2a'); k.r(10, y + 2, 2, 3, '#c87a3a'); }
    },
    pub(T, x, w) {
      const k = sideKit(X, x, w);
      const y = Math.round(330 - ((T * 9 + (x ? 170 : 0)) % 380));                       // Passant läuft den Gehweg entlang
      if (y > -10 && y < H) { k.r(6, y, 4, 4, '#1a1a22'); k.r(7, y + 1, 2, 2, '#3a2a20'); k.r(Math.sin(T * 8) > 0 ? 5 : 10, y + 2, 1, 1, '#1a1a22'); }
      if (Math.sin(T * 1.3 + x) > .2) k.r(12, 292, 1, 1, '#ff6020');                     // Raucher vor der Tür
    },
    backstage(T, x, w) {
      const k = sideKit(X, x, w), on = (T * 2) % 1 < .5;                                 // Rundumleuchte an der Rampe
      k.r(11, 296, 3, 3, on ? '#ff9a20' : '#5a3a10');
      if (on) k.r(6, 290, 12, 14, 'rgba(255,150,40,.08)');
    },
    festival(T, x, w) {
      const k = sideKit(X, x, w);
      for (let n = 0; n < 30; n++) {                                                     // Arme gehen hoch
        const d = 1 + (n * 7) % (w - 2), y = 156 + ((n * 23) % (H - 160));
        if (Math.sin(T * 6 + n * 1.9) > .5) k.r(d, y - 3, 1, 2, '#e0b090');
      }
    },
    hotel(T, x, w) {
      const k = sideKit(X, x, w);
      const d = Math.round(((T * 14 + (x ? 15 : 0)) % 46) - 8);                          // Auto fährt unten vorbei
      if (d > -6 && d < w) { k.r(Math.max(0, d), 293, 6, 3, '#2a2a40'); k.r(Math.max(0, d + 5), 294, 1, 1, '#fff0b0'); }
    },
  },

  /* =================== Handy: Streifen über und unter dem Spielfeld ===================
     Auf langen Handys ist mehr Platz als 320 px. Dort zeigen wir oben und unten,
     was vor bzw. hinter dem Spielfeld liegt (wie die Seitenränder am PC).
     Gemalt wird mit bandKit: d = Abstand vom Spielfeld nach außen (0..h),
     top = Streifen über dem Spielfeld. */
  band: {
    bus(g, k, h, top) {
      const p = busPaint();
      k.r(0, 0, PLAY_W, h, '#2c2d31');                                                  // Straße
      ART.noise(g, 0, 0, PLAY_W, 60, '#36373c', 160, top ? 3 : 4); ART.noise(g, 0, 0, PLAY_W, 60, '#232428', 140, top ? 5 : 6);
      k.r(1, 0, 1, h, '#8a8a7a'); k.r(178, 0, 1, h, '#8a8a7a');                          // Randlinien
      k.r(6, 0, 168, 4, p.hull || p.wall); k.r(6, 1, 168, 1, p.hullTrim || p.trim);      // Karosserie vorne/hinten
      k.r(6, 4, 168, 3, 'rgba(0,0,0,.4)');
      if (top) {                                                                        // Scheinwerfer und Lichtkegel
        for (const x of [12, 158]) {
          k.r(x, 0, 10, 3, '#fff4c8');
          for (let d = 4; d < h; d += 2) { const s = (d - 4) >> 1; k.r(x - s, d, 10 + s * 2, 1, 'rgba(255,240,180,.07)'); }
        }
        k.r(80, 0, 20, 2, '#1a1a1e'); for (let x = 82; x < 98; x += 3) k.r(x, 0, 1, 2, '#555');   // Kühlergrill
      } else {
        for (const x of [10, 158]) { k.r(x, 0, 12, 3, '#c02020'); k.r(x + 2, 0, 8, 2, '#ff5040'); }   // Rücklichter
        k.r(84, 0, 12, 3, '#d8d0b0'); k.r(85, 1, 10, 1, '#333');                            // Nummernschild
      }
    },
    rehearsal(g, k, h, top) {
      const c = makeCanvas(PLAY_W, h), cg = c.getContext('2d');
      forestFloor(cg, 0, 0, PLAY_W, h, top ? 61 : 62);
      forestLeaves(cg, 0, 0, PLAY_W, h, top ? 63 : 64, .3);
      for (let x = -6; x < 190; x += 16) forestTree(cg, x, top ? h - 14 - (x % 3) * 4 : 10 + (x % 3) * 4, 12, x + (top ? 1 : 2));
      if (top) for (let x = 4; x < 190; x += 18) forestTree(cg, x, h - 34, 12, x + 7);
      else for (let x = 10; x < 190; x += 18) forestTree(cg, x, 30, 12, x + 9);
      g.drawImage(c, 0, k.Y(0, h));
    },
    pub(g, k, h, top) {
      k.r(0, 0, PLAY_W, h, top ? '#2a2018' : '#3c3a36');
      if (top) {                                                                         // Lager hinter dem Tresen: Fässer und Kisten
        for (let x = 10; x < 170; x += 22) { ART.oval(g, x + 6, k.Y(12, 1), 6, 4, '#7a7a84'); ART.oval(g, x + 6, k.Y(12, 1), 4, 2, '#5a5a64'); k.r(x + 5, 11, 2, 2, '#333'); }
        for (let x = 20; x < 170; x += 44) { k.r(x, 20, 14, 8, '#6a4a22'); k.r(x, 20, 14, 1, '#8a6a32'); for (let n = 0; n < 4; n++) k.r(x + 1 + n * 3, 22, 2, 2, '#3a6a2a'); }
      } else {                                                                           // draußen: Gehweg, Bordstein, Straße
        for (let d = 3; d < 20; d += 9) k.r(0, d, PLAY_W, 1, '#2c2a26');
        for (let x = 8; x < PLAY_W; x += 16) k.r(x, 6, 1, 14, '#2c2a26');
        k.r(0, 20, PLAY_W, 2, '#6a6864');
        const c = makeCanvas(PLAY_W, h); moorGrass(c.getContext('2d'), 0, 0, PLAY_W, h, 63, () => 0); g.drawImage(c, 0, k.Y(22, h));   // Dorfwiese
        for (const x of [20, 160]) treeTop(g, x, k.Y(34, 1), 10);
        for (const x of [40, 140]) { k.r(x - 10, 6, 22, 12, 'rgba(255,210,120,.1)'); k.r(x, 12, 2, 2, '#ffe0a0'); }   // Laternen
      }
      ART.bandCut(k, 5, '#4a3a2a', '#3a2c1e');
      if (!top) k.r(76, 0, 28, 5, '#2a6a2a');                                             // Tür (EXIT)
    },
    backstage(g, k, h, top) {
      const r = seeded(top ? 71 : 72);
      k.r(0, 0, PLAY_W, h, '#26282c');
      for (let x = 12; x < PLAY_W; x += 30) k.r(x, 0, 1, h, '#1e2024');
      for (let n = 0; n < 5; n++) ART.oval(g, 10 + (r() * 160 | 0), k.Y(10 + (r() * 20 | 0), 1), 3, 1, '#1a1b1e');
      for (let x = 0; x < PLAY_W; x++) k.r(x, 6, 1, 3, ((x >> 2) % 2) ? '#d8b020' : '#1a1a1a');   // Warnstreifen
      for (const x of top ? [20, 110] : [40, 130]) {                                     // Flightcases
        k.r(x + 1, 13, 26, 10, 'rgba(0,0,0,.4)'); k.r(x, 12, 26, 10, '#8a8a94'); k.r(x, 12, 26, 1, '#b4b4be');
        k.r(x, 12, 2, 2, '#333'); k.r(x + 24, 12, 2, 2, '#333'); k.r(x + 11, 16, 4, 1, '#333');
      }
      for (let x = 0; x < PLAY_W; x++) k.r(x, 10 + Math.round(Math.sin(x / 13) * 1.2), 1, 1, '#0e0e10');   // Kabel
      ART.bandCut(k, 5, '#4a4e56', '#3a3d44');
    },
    festival(g, k, h, top) {
      if (top) {                                                                         // Bühnendach, dahinter Abendhimmel
        for (let d = 0; d < h; d++) {
          const t = .5 - .5 * d / Math.max(1, h), c = BEACH.sky, f = t * (c.length - 1), i = Math.min(c.length - 2, f | 0);
          k.r(0, d, PLAY_W, 1, lerpCol(c[i], c[i + 1], f - i));
        }
        k.r(10, 0, 160, 10, '#2a2a30'); k.r(10, 9, 160, 1, '#4a4a54');
        for (let x = 10; x < 170; x += 8) k.r(x, 0, 1, 10, '#3a3a42');
        for (const x of [4, 168]) k.r(x, 0, 8, Math.min(h, 24), '#4a4c54');           // Masten
      } else {
        const c = makeCanvas(PLAY_W, h), cg = c.getContext('2d');
        moorGrass(cg, 0, 0, PLAY_W, h, 66, () => 0);
        festCrowd(cg, 0, 0, PLAY_W, h, 67, .65);
        g.drawImage(c, 0, k.Y(0, h));
      }
    },
    hotel(g, k, h, top) {
      if (top) {                                                                         // oben: Dachschnitt
        k.r(0, 0, PLAY_W, h, '#3a2818');
        ART.bandCut(k, 6, '#4a3424', '#3a2818');
      } else {                                                                           // Kiesauffahrt mit Rasen
        k.r(0, 0, PLAY_W, h, '#b8a888'); ART.noise(g, 0, k.Y(0, h), PLAY_W, h, '#988868', 300, 9);
        k.r(0, 0, PLAY_W, 3, '#5a4030');
        const c = makeCanvas(PLAY_W, h), cg = c.getContext('2d'); moorGrass(cg, 0, 0, PLAY_W, h, 83, () => 0);
        g.save(); g.beginPath(); g.rect(0, k.Y(26, h), PLAY_W, h); g.clip(); g.drawImage(c, 0, k.Y(26, h)); g.restore();
        k.r(60, 0, 60, 3, '#6a1a2a'); k.r(60, 0, 60, 1, '#a02a3a');                       // roter Teppich am Eingang
        treeTop(g, 20, k.Y(38, 1), 10); treeTop(g, 160, k.Y(40, 1), 11);
      }
    },
    flat(g, k, h, top) {
      if (top) {                                                                         // Himmel wird nach oben tiefer blau
        for (let d = 0; d < h; d++) {
          const t = .3 - .3 * d / Math.max(1, h), c = MOOR.sky, f = t * (c.length - 1), i = Math.min(c.length - 2, f | 0);
          k.r(0, d, PLAY_W, 1, lerpCol(c[i], c[i + 1], f - i));
        }
        for (const [x1, d1, len] of [[160, 10, 60], [90, 22, 44], [40, 6, 30]]) {        // Schleierwolken
          for (let q = 0; q < len; q++) if (d1 + q * .2 < h) k.r(x1 - q, Math.round(d1 + q * .2), 2, 1, 'rgba(255,255,255,.28)');
        }
      } else {
        const c = makeCanvas(PLAY_W, h), cg = c.getContext('2d');
        moorGrass(cg, 0, 0, PLAY_W, h, 97, () => 0);
        for (let d = 0; d < h; d++) { const x = MOOR.pathX(304 + d) - 5; cg.fillStyle = '#a08e62'; cg.fillRect(x, d, 10, 1); cg.fillStyle = 'rgba(40,60,20,.35)'; cg.fillRect(x - 1, d, 1, 1); cg.fillRect(x + 10, d, 1, 1); }
        g.drawImage(c, 0, k.Y(0, h));
      }
    },
  },

  /* Animation der Handy-Streifen (jedes Frame) */
  bandAnim: {
    bus(T, k, h, top) {
      for (let n = 0; n < 4; n++) {                                                      // Mittelstreifen zieht nach unten weg
        const s = ((T * 22 + n * 30) % 120);
        const d = top ? h - s : s - 20;
        k.r(89, d, 2, 14, '#7a7a6a');
      }
    },
    festival(T, k, h, top) {
      if (top) return;
      for (let n = 0; n < 40; n++) {                                                     // die Menge geht weiter
        const x = (n * 37) % 176, d = 2 + ((n * 13) % Math.max(4, h - 4)), up = Math.sin(T * 7 + n * 1.9) > .3 ? 1 : 0;
        k.r(x, d - up, 3, 3, ['#a87858', '#6a4a30', '#c8a080', '#3a2a20'][n % 4]);
        if (n % 5 === 0 && up) k.r(x + 1, d - 3, 1, 2, '#c8a080');
      }
    },
    hotel(T, k, h, top) {
      if (top) return;
      const x = Math.round(((T * 30) % 240) - 30);                                       // Taxi fährt vorbei
      k.r(x, 12, 14, 6, '#d8b020'); k.r(x + 3, 13, 7, 4, '#2a2a30'); k.r(x + 13, 13, 1, 1, '#fff0b0'); k.r(x + 13, 16, 1, 1, '#fff0b0');
    },
    pub(T, k, h, top) {
      if (top) return;
      const x = Math.round(200 - ((T * 9) % 240));                                       // Passant
      k.r(x, 10, 4, 4, '#1a1a22'); k.r(x + 1, 11, 2, 2, '#3a2a20');
    },
  },
};

/* ---------- Kleinere Bauteile (auch von außen benutzt) ---------- */

/** Bussitz mit Muster-Stoff, Rückenlehne und Kopfschutz */
/**
 * Malhilfe für die PC-Seitenränder: d = Abstand vom Spielfeld nach außen.
 * So wird jeder Rand nur einmal beschrieben und passt links wie rechts.
 */
function sideKit(g, x, w) {
  const L = x === 0;
  return {
    L,
    X: (d, ww = 1) => (L ? x + w - d - ww : x + d),
    r(d, y, ww, h, c) { g.fillStyle = c; g.fillRect(L ? x + w - d - ww : x + d, y, ww, h); },
  };
}
/**
 * Malhilfe für die Handy-Streifen: d = Abstand vom Spielfeld nach außen,
 * y0/h = Lage des Streifens, top = Streifen über dem Spielfeld.
 */
function bandKit(g, y0, h, top) {
  const Y = (d, dh = 1) => (top ? y0 + h - d - dh : y0 + d);
  return { top, Y, r(x, d, w, dh, c) { g.fillStyle = c; g.fillRect(x, Y(d, dh), w, dh); } };
}
/** Aktuelle Bus-Lackierung aus dem Shop */
function busPaint() {
  return PAINTS[(typeof Save !== 'undefined' && Save.data && Save.paintId()) || 'default'] || PAINTS.default;
}
function busSeat(g, x, y) {
  ART.shadow(g, x + 1, y + 20, 18, 2, .45);
  ART.rect(g, x, y, 18, 20, '#2a0a10');
  ART.rect(g, x + 1, y + 1, 16, 12, '#6b1e2a');
  g.fillStyle = '#7e2a38'; for (let yy = y + 2; yy < y + 12; yy += 3) for (let xx = x + 2 + (yy % 2); xx < x + 16; xx += 4) g.fillRect(xx, yy, 2, 1);
  g.fillStyle = '#2a6a6a'; for (let yy = y + 3; yy < y + 12; yy += 6) g.fillRect(x + 8, yy, 1, 1);
  ART.rect(g, x + 1, y + 13, 16, 6, '#8c2c3a'); ART.rect(g, x + 1, y + 13, 16, 1, '#a83a48');   // Rückenlehne
  ART.rect(g, x + 5, y + 14, 8, 3, '#d8d0c0');                                                    // Kopfschutz-Tuch
  ART.rect(g, x === 19 ? x + 16 : x, y + 2, 2, 10, '#555');                                       // Armlehne am Gang
}
/** Bus-Seitenwand mit gewählter Lackierung (Shop) */
function busWall(g, x, w = 18) {
  const p = busPaint(), left = x < 90;
  g.fillStyle = p.wall; g.fillRect(x, 26, w, 278);
  const r = seeded(x + 7);
  if (p.pattern === 'camo') {
    for (let k = 0; k < 40; k++) { g.fillStyle = r() < .5 ? '#2a3a1a' : '#5a5a3a'; g.fillRect(x + (r() * (w - 2) | 0), 26 + (r() * 274 | 0), 3 + (r() * 4 | 0), 3 + (r() * 6 | 0)); }
  } else if (p.pattern === 'unionjack') {
    for (let y = 26; y < 304; y += 20) {
      g.fillStyle = '#eee'; for (let k = 0; k < w; k++) { g.fillRect(x + k, y + k, 1, 2); g.fillRect(x + w - 1 - k, y + k, 1, 2); }
      g.fillStyle = '#c02020'; for (let k = 0; k < w; k++) { g.fillRect(x + k, y + k, 1, 1); }
      g.fillStyle = '#eee'; g.fillRect(x, y + 8, w, 4); g.fillStyle = '#c02020'; g.fillRect(x, y + 9, w, 2);
    }
  } else if (p.pattern === 'gold') {
    for (let y = 26; y < 304; y += 2) { g.fillStyle = (y >> 1) % 3 ? '#a8842a' : '#d8b040'; g.fillRect(x, y, w, 1); }
    ART.noise(g, x, 26, w, 278, '#fff0a0', 60, x + 11);
  } else if (p.pattern === 'splatter') {
    // Action-Painting: Farbspritzer und Zitronenscheiben
    const cols = ['#1a1a1a', '#3060c0', '#c03030', '#e8c020', '#30a060'];
    for (let k = 0; k < 90; k++) { g.fillStyle = cols[k % 5]; const sx = x + (r() * w | 0), sy = 26 + (r() * 278 | 0); g.fillRect(sx, sy, 1 + (r() * 3 | 0), 1 + (r() * 2 | 0)); }
    const lx = x + (w >> 1) - 3;
    for (let y = 40; y < 300; y += 46) { g.fillStyle = '#fff27a'; g.fillRect(lx, y, 6, 6); g.fillStyle = '#e0c820'; g.fillRect(lx + 2, y + 1, 2, 4); g.fillRect(lx + 1, y + 2, 4, 2); }
  } else if (p.pattern === 'psych') {
    const cols = ['#e03070', '#f0a020', '#f0e040', '#30c070', '#3080e0', '#9040d0'];
    for (let y = 26; y < 304; y += 3) { g.fillStyle = cols[((y / 3) | 0) % cols.length]; g.fillRect(x + Math.round(Math.sin(y / 9) * 2) + 2, y, w - 4, 3); }
  } else {
    // Holzverkleidung mit Maserung
    g.fillStyle = 'rgba(0,0,0,.18)'; for (let y = 26; y < 304; y += 5) g.fillRect(x, y, w, 1);
    ART.noise(g, x, 26, w, 278, 'rgba(255,220,160,.08)', 120, x + 3);
  }
  const wx = x + 2, ww = w - 5;                                       // Fenster
  for (let y = 34; y < 296; y += 40) {
    if (left && y === 34) {                                          // Falttür am Einstieg
      g.fillStyle = '#111'; g.fillRect(x, y + 6, w, 30);
      g.fillStyle = '#1a2a44'; g.fillRect(x + 1, y + 7, w - 2, 13); g.fillRect(x + 1, y + 22, w - 2, 13);
      g.fillStyle = 'rgba(120,150,210,.25)'; g.fillRect(x + 2, y + 8, 2, 6); g.fillRect(x + 2, y + 23, 2, 6);
      g.fillStyle = '#d8b030'; g.fillRect(x + w - 2, y + 6, 2, 30);
      g.fillStyle = '#333'; g.fillRect(x, y + 20, w, 2);
      continue;
    }
    g.fillStyle = '#0a1430'; g.fillRect(wx, y, ww, 30);
    g.fillStyle = 'rgba(80,110,180,.18)'; g.fillRect(wx + 1, y + 2, 2, 10);                         // Spiegelung
    g.fillStyle = p.trim; g.fillRect(wx, y, ww, 1); g.fillRect(wx, y + 29, ww, 1); g.fillRect(wx - 1, y, 1, 30); g.fillRect(wx + ww, y, 1, 30);
    g.fillStyle = '#5a1a26'; g.fillRect(left ? wx : wx + ww - 3, y + 1, 3, 28);                   // Vorhang
  }
}
/** Runder Pub-Tisch mit Gläsern, Bierdeckeln und Hockern */
function pubTable(g, r) {
  const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
  for (const [dx, dy] of [[-r.w / 2 - 4, 0], [r.w / 2 + 4, 0], [0, r.h / 2 + 4]]) { ART.oval(g, Math.round(cx + dx), Math.round(cy + dy), 3, 2, '#3a1a10'); ART.oval(g, Math.round(cx + dx), Math.round(cy + dy) - 1, 2, 1, '#6a2a1a'); }
  ART.shadow(g, r.x + 1, r.y + 3, r.w, r.h, .45);
  ART.oval(g, Math.round(cx), Math.round(cy), r.w / 2, r.h / 2, '#3a200c');
  ART.oval(g, Math.round(cx), Math.round(cy) - 1, r.w / 2 - 1, r.h / 2 - 1, '#7a5028');
  ART.rect(g, r.x + 5, r.y + 2, r.w - 10, 1, '#a07040');
  ART.rect(g, r.x + 6, r.y + 6, 4, 4, '#e8dcc0'); ART.rect(g, r.x + 7, r.y + 5, 2, 4, '#d8a020'); ART.rect(g, r.x + 7, r.y + 5, 2, 1, '#fff');   // Pint
  ART.rect(g, r.x + r.w - 10, r.y + 7, 4, 3, '#c03030');                                                                                         // Bierdeckel
  ART.rect(g, r.x + r.w - 9, r.y + 5, 2, 4, '#1a0a06'); ART.rect(g, r.x + r.w - 9, r.y + 5, 2, 1, '#e8dcc0');                                     // Stout
}

/* ---------- Das Moor: Himmel und Grasbüschel (auch für Ränder und Handy-Streifen) ---------- */
const MOOR = {
  sky: ['#1f5596', '#2a68aa', '#4a86c0', '#7aaad2', '#a8c4dc'],
  grass: { base: '#62803a', dark: '#3e5828', mid: '#789648', light: '#a4b864', sun: '#c8c47c' },
  horizon: 50,                       // Spielfeld-y des Horizonts
  pathX: y => Math.round(100 + Math.sin(y / 40) * 18),   // Trampelpfad
};
/** Himmel von y0 bis y1 (t: 0 = oben/weit weg, 1 = am Horizont) */
function moorSky(g, x, y0, w, y1, tOf) {
  for (let y = y0; y < y1; y++) {
    const t = Math.max(0, Math.min(1, tOf(y))), c = MOOR.sky, f = t * (c.length - 1), i = Math.min(c.length - 2, f | 0);
    g.fillStyle = lerpCol(c[i], c[i + 1], f - i); g.fillRect(x, y, w, 1);
  }
}
/** Grasbüschel-Teppich. far = 0 (nah, große Büschel) .. 1 (Horizont, klein und dunstig) */
function moorGrass(g, x0, y0, w, h, seed, farOf) {
  const G = MOOR.grass, r = seeded(seed);
  // Grundfläche mit großen, weichen Flecken (heller/dunkler)
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x += 2) {
    const n = Math.sin(x * .07 + y * .05) + Math.sin(x * .021 - y * .033 + 2) + Math.sin(y * .11 + x * .013);
    const far = farOf(y), base = n > 1 ? G.mid : n < -1.1 ? '#56723a' : G.base;
    g.fillStyle = far > 0 ? lerpCol(base, '#9aac84', far * .7) : base; g.fillRect(x, y, 2, 1);
  }
  // Büschel: Schatten unten, Halme, helle Spitzen
  const n = Math.round(w * h / 18);
  for (let k = 0; k < n; k++) {
    const x = x0 + (r() * w | 0), y = y0 + (r() * h | 0), far = farOf(y);
    if (far > .2 && r() < .5) continue;
    const s = far > .5 ? 1 : far > .2 ? 2 : 2 + (r() * 2 | 0);
    const mix = c => far > 0 ? lerpCol(c, '#9aac84', far * .7) : c;
    g.fillStyle = mix(G.dark); g.fillRect(x - 1, y + 1, s + 1, 1);
    g.fillStyle = mix(r() < .3 ? G.light : G.mid); g.fillRect(x, y - s + 1, 1, s); g.fillRect(x + s - 1, y - s + 2, 1, s - 1);
    if (s > 1) { g.fillStyle = mix(r() < .4 ? G.sun : G.light); g.fillRect(x, y - s + 1, 1, 1); }
  }
  // einzelne dunkle Mulden zwischen den Büscheln
  for (let k = 0; k < w * h / 260; k++) {
    const x = x0 + (r() * w | 0), y = y0 + (r() * h | 0);
    if (farOf(y) > .3) continue;
    g.fillStyle = 'rgba(30,50,20,.35)'; g.fillRect(x, y, 3 + (r() * 3 | 0), 1); g.fillRect(x + 1, y + 1, 2, 1);
  }
}
/** Ein Schaf von oben (x, y = Mitte) */
function moorSheep(g, x, y, look) {
  g.fillStyle = 'rgba(30,40,20,.35)'; g.fillRect(x - 3, y + 2, 8, 2);
  g.fillStyle = '#e8e4d8'; g.fillRect(x - 3, y - 2, 7, 5); g.fillRect(x - 2, y - 3, 5, 7);
  g.fillStyle = '#c8c4b8'; g.fillRect(x - 2, y + 2, 5, 1);
  g.fillStyle = '#2a2420'; g.fillRect(look < 0 ? x - 5 : x + 4, y - 1, 2, 3);
}
/** Baumkrone von oben (cx, cy = Mitte, r = Radius) mit Schatten */
function treeTop(g, cx, cy, r) {
  ART.oval(g, cx + 3, cy + 3, r, r - 1, 'rgba(10,20,10,.35)');
  ART.oval(g, cx, cy, r, r, '#2e4a22');
  ART.oval(g, cx - 1, cy - 1, r - 2, r - 2, '#3e6028');
  for (const [a, b, q] of [[-3, -3, 3], [2, -2, 2], [-1, 2, 2]]) ART.oval(g, cx + Math.round(a * r / 9), cy + Math.round(b * r / 9), q, q, '#56783a');
  g.fillStyle = '#6e9048'; g.fillRect(cx - Math.round(r / 3), cy - Math.round(r / 2), 2, 1);
}

/* ---------- Der Strand (Proberaum draußen): Abendhimmel und Meer ---------- */
const BEACH = {
  sky: ['#3a2e6a', '#6a4a8a', '#c86a7a', '#f0a070', '#ffd0a0'],
  sea: 40,      // Horizont
  shore: 64,    // Brandung
};
function beachSky(g, x, y0, w, y1, tOf) {
  for (let y = y0; y < y1; y++) {
    const t = Math.max(0, Math.min(1, tOf(y))), c = BEACH.sky, f = t * (c.length - 1), i = Math.min(c.length - 2, f | 0);
    g.fillStyle = lerpCol(c[i], c[i + 1], f - i); g.fillRect(x, y, w, 1);
  }
  // lange, flache Wolkenstreifen im Abendlicht
  for (const [cx, cy, len] of [[40, 30, 40], [120, 33, 50], [70, 36, 30]]) {
    if (cy < y0 || cy >= y1) continue;
    g.fillStyle = 'rgba(255,170,150,.45)'; g.fillRect(x + cx - (len >> 1), cy, len, 1);
    g.fillStyle = 'rgba(255,214,190,.35)'; g.fillRect(x + cx - (len >> 2), cy - 1, len >> 1, 1);
  }
}

/** Festivalmenge von oben: Köpfe in Haut- und Haarfarben, ab und zu T-Shirts und Fahnen */
function festCrowd(g, x0, y0, w, h, seed, dens) {
  const r = seeded(seed), skins = ['#e0b090', '#c89070', '#a87050', '#7a5038'], hair = ['#3a2414', '#1a1410', '#8a5a2a', '#d8c070', '#5a3a1a'];
  const shirts = ['#c03030', '#3060a0', '#e8e0d0', '#2a2a2a', '#3a7a3a', '#d8a030'];
  for (let y = y0 + 1; y < y0 + h - 2; y += 4) for (let x = x0 + ((y / 4 | 0) % 2) * 3; x < x0 + w - 2; x += 6) {
    if (r() > dens) continue;
    const xx = x + (r() * 2 | 0);
    g.fillStyle = 'rgba(20,30,10,.35)'; g.fillRect(xx, y + 2, 3, 1);                     // Schatten
    g.fillStyle = shirts[(r() * shirts.length) | 0]; g.fillRect(xx - 1, y + 1, 4, 1);
    g.fillStyle = r() < .6 ? hair[(r() * hair.length) | 0] : skins[(r() * skins.length) | 0]; g.fillRect(xx, y - 1, 2, 2);
  }
  for (let k = 0; k < w * h / 900; k++) {                     // Fahnen
    const x = x0 + (r() * w | 0), y = y0 + (r() * h | 0);
    g.fillStyle = '#ddd'; g.fillRect(x, y - 6, 1, 6);
    g.fillStyle = ['#c03030', '#3060c0', '#e8e8e8'][k % 3]; g.fillRect(x + 1, y - 6, 4, 3);
  }
}

/* ---------- Der Wald (Proberaum draußen): Laubboden, Herbstbäume, Farne ---------- */
function forestFloor(g, x0, y0, w, h, seed) {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x += 2) {
    const n = Math.sin(x * .08 + y * .05 + seed) + Math.sin(x * .023 - y * .041) + Math.sin(y * .09 + x * .017 + 1);
    g.fillStyle = n > .9 ? '#56662e' : n < -1 ? '#5a4228' : n < 0 ? '#6a5430' : '#4e5c2a'; g.fillRect(x, y, 2, 1);
  }
}
function forestLeaves(g, x0, y0, w, h, seed, dens) {
  const r = seeded(seed), cols = ['#b8682a', '#9a3a20', '#d0a040', '#7a4a24', '#c88a3a'];
  for (let k = 0; k < w * h * dens / 6; k++) {
    g.fillStyle = cols[(r() * cols.length) | 0];
    const x = x0 + (r() * w | 0), y = y0 + (r() * h | 0);
    g.fillRect(x, y, 2, 1); if (r() < .4) g.fillRect(x, y + 1, 1, 1);
  }
}
function forestFern(g, cx, cy) {
  g.fillStyle = '#3e6a28';
  for (let k = -3; k <= 3; k++) for (let t = 1; t < 6; t++) g.fillRect(cx + Math.round(k * t * .5), cy - t + Math.abs(k), 1, 1);
  g.fillStyle = '#5a8a34'; g.fillRect(cx, cy - 5, 1, 5);
}
/** Herbstbaum von oben: Krone in Grün, Gold, Orange oder Rot */
function forestTree(g, cx, cy, rr, seed) {
  const P = [['#3e5a24', '#56782e', '#6e9040'], ['#8a6a1a', '#b8902a', '#d8b040'], ['#8a3e18', '#b85a24', '#d8803a'], ['#6a2418', '#943420', '#b84a2a']];
  const p = P[Math.abs(seed * 7 + 3) % P.length];
  ART.oval(g, cx + 3, cy + 3, rr, rr - 1, 'rgba(10,15,5,.4)');
  ART.oval(g, cx, cy, rr, rr, p[0]);
  ART.oval(g, cx - 1, cy - 1, rr - 2, rr - 2, p[1]);
  for (const [a, b, q] of [[-3, -3, 3], [3, -1, 2], [-1, 3, 2], [2, 3, 2]]) ART.oval(g, cx + Math.round(a * rr / 9), cy + Math.round(b * rr / 9), q, q, p[2]);
}

/** Weiße Stuckdecke (Hotel) mit Zierleiste und kleinem Kronleuchter, y = Oberkante, h = Höhe */
function hotelCeiling(g, y, h) {
  g.fillStyle = '#d8d0c0'; g.fillRect(0, y, 180, h);
  g.fillStyle = '#e8e2d4'; g.fillRect(0, y, 180, 1);
  g.fillStyle = '#b8ae9a'; g.fillRect(0, y + h - 2, 180, 1);
  g.fillStyle = '#a89e8a'; for (let x = 2; x < 180; x += 4) g.fillRect(x, y + h - 1, 2, 1);   // Zahnfries
  for (const cx of [56, 112]) {                                                                // Kronleuchter
    g.fillStyle = '#a8843a'; g.fillRect(cx - 4, y + 2, 9, 1); g.fillRect(cx, y + 1, 1, 2);
    g.fillStyle = '#fff0c0'; for (const d of [-4, 0, 4]) g.fillRect(cx + d, y + 3, 1, 1);
  }
}

/**
 * Strudel: eigenes Band-Emblem (zwei Farben, spiralförmig), (cx, cy) = Mitte, r = Radius.
 * Gemalt pixelweise: Winkel + Abstand ergeben die Spirale.
 */
function drawSwirl(g, cx, cy, r, a, b) {
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
    const d = Math.hypot(x, y);
    if (d > r + .3) continue;
    const t = Math.atan2(y, x) / (Math.PI * 2) + d / r * 1.6;
    g.fillStyle = ((t % 1) + 1) % 1 < .5 ? a : b; g.fillRect(cx + x, cy + y, 1, 1);
  }
}
