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
  FLOOR: {
    bus:       (x, y) => x >= 18 && x < 162 && y >= 48,
    rehearsal: (x, y) => x >= 18 && x < 162 && y >= 66,
    pub:       (x, y) => x >= 20 && x < 160 && y >= 66,
    backstage: (x, y) => x >= 18 && x < 162 && y >= 60 && !(y >= 160 && y < 186 && (x < 78 || x >= 102)),
    festival:  (x, y) => (x >= 18 && x < 162 && y < 238) || y >= 246,
    hotel:     (x, y) => x >= 18 && x < 146 && VENUES.hotel.floors.some(f => y >= f.y0 - 4 && y < f.y1 + 4),
    flat:      (x, y) => x >= 18 && x < 162 && y >= 66,
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
      const o = makeCanvas(PLAY_W, H), g = o.getContext('2d'), A = ART;
      A.rect(g, 0, 0, PLAY_W, H, '#000');
      A.bricks(g, 0, 26, 18, 278, '#2a1410', '#5a2a1c'); A.bricks(g, 162, 26, 18, 278, '#2a1410', '#5a2a1c');
      A.poster(g, 2, 128, 14, 20, '#1a1a40', '#ffd84a'); A.poster(g, 164, 150, 14, 18, '#5a1010', '#eee');
      // Leinwand mit Farbspritzern und Zitronenscheiben (Easter Egg)
      A.shadow(g, 165, 91, 14, 20, .5); A.rect(g, 164, 90, 14, 20, '#e8e0cc'); A.frame(g, 164, 90, 14, 20, '#6a4a2a');
      { const rr = seeded(5), cs = ['#1a1a1a', '#3060c0', '#c03030', '#30a060'];
        for (let k = 0; k < 40; k++) { g.fillStyle = cs[k % 4]; g.fillRect(165 + (rr() * 12 | 0), 91 + (rr() * 18 | 0), 1 + (rr() * 2 | 0), 1); } }
      A.oval(g, 168, 96, 2, 2, '#fff27a'); A.oval(g, 174, 104, 2, 2, '#fff27a'); A.rect(g, 168, 96, 1, 1, '#d8c020'); A.rect(g, 174, 104, 1, 1, '#d8c020');
      A.poster(g, 2, 210, 14, 16, '#204020', '#e070a0');
      A.rect(g, 165, 236, 10, 3, '#3a8a3a'); A.rect(g, 167, 240, 7, 2, '#3a8a3a');           // Graffiti
      // Schaumstoff-Rückwand mit Noppen
      A.rect(g, 18, 26, 144, 40, '#222228');
      for (let y = 27; y < 65; y += 4) for (let x = 19 + ((y >> 2) % 2) * 2; x < 161; x += 4) { A.rect(g, x, y, 2, 2, '#30303a'); A.rect(g, x, y, 1, 1, '#3a3a44'); }
      // Drum-Podest mit Schlagzeug
      A.rect(g, 60, 34, 60, 30, '#2a2228'); A.frame(g, 60, 34, 60, 30, '#1a141a'); A.noise(g, 61, 35, 58, 28, '#33292f', 120, 7);
      A.drumKit(g, 90, 46);
      // Teppichboden mit Flecken
      A.rect(g, 18, 66, 144, 238, '#3a1e22');
      A.noise(g, 18, 66, 144, 238, '#47262a', 420, 3); A.noise(g, 18, 66, 144, 238, '#2e161a', 300, 5);
      [[40, 110, 6, 3], [130, 270, 7, 4], [70, 280, 5, 2]].forEach(([x, y, rx, ry]) => A.oval(g, x, y, rx, ry, '#2c1418'));
      // Orientteppich in der Mitte
      A.shadow(g, 48, 134, 86, 118, .3);
      A.rect(g, 46, 132, 86, 118, '#4e1c14'); A.frame(g, 46, 132, 86, 118, '#8a6a34'); A.frame(g, 49, 135, 80, 112, '#8a6a34');
      A.rect(g, 52, 138, 74, 106, '#58221a');
      g.fillStyle = '#6e3220';
      for (let y = 142; y < 242; y += 10) for (let x = 56; x < 124; x += 10) { g.fillRect(x + 2, y, 1, 1); g.fillRect(x + 1, y + 1, 3, 1); g.fillRect(x + 2, y + 2, 1, 1); }
      for (let k = 0; k < 14; k++) { const w = 14 - k; A.rect(g, 89 - w, 176 + k, w * 2 + 2, 1, '#26304a'); A.rect(g, 89 - w, 204 - k, w * 2 + 2, 1, '#26304a'); }   // Medaillon
      A.rect(g, 80, 188, 20, 4, '#8a6a34');
      for (let x = 47; x < 132; x += 3) { A.rect(g, x, 130, 1, 2, '#d8ccb0'); A.rect(g, x, 250, 1, 2, '#d8ccb0'); }           // Fransen
      // Kram in den Ecken: Bierkiste, altes Sofa, Kabelsalat an der Wand
      A.rect(g, 20, 284, 18, 14, '#c8a020'); A.frame(g, 20, 284, 18, 14, '#8a6a10');
      for (let k = 0; k < 4; k++) for (let j = 0; j < 3; j++) A.rect(g, 22 + k * 4, 286 + j * 4, 2, 2, '#3a2a10');
      A.rect(g, 128, 286, 34, 18, '#4a3420'); A.rect(g, 130, 288, 14, 10, '#5a4228'); A.rect(g, 146, 288, 14, 10, '#5a4228');
      g.fillStyle = '#111'; for (let y = 104; y < 280; y += 3) { g.fillRect(19 + (y % 7 === 0 ? 1 : 0), y, 1, 2); g.fillRect(160 - (y % 5 === 0 ? 1 : 0), y, 1, 2); }
      // Licht: nackte Glühbirne + Lampe in der Ecke
      A.rect(g, 89, 27, 3, 3, '#fff0c0');
      A.lights(g, [{ x: 90, y: 150, rx: 90, ry: 110, c: '#ffd890', a: .5 }, { x: 90, y: 50, rx: 40, ry: 22, c: '#ffe0a0', a: .6 }, { x: 150, y: 280, rx: 30, ry: 26, c: '#ff9a50', a: .45 }]);
      shadePass(g, PLAY_W, H, (x, y) => y < 26 || y >= 304 ? null : ART.SOFT + 1.25 - Math.hypot(x - 90, y - 150) / 170);
      ART.lift(g);
      return o;
    },

    /* ---------- 3. PUB ---------- */
    pub() {
      const o = makeCanvas(PLAY_W, H), g = o.getContext('2d'), A = ART, ve = VENUES.pub;
      A.rect(g, 0, 0, PLAY_W, H, '#000');
      // Wände: dunkelgrüne Streifentapete mit Bildern und Wandlampen
      for (const x0 of [0, 160]) {
        A.rect(g, x0, 26, 20, 278, '#16221a');
        for (let x = x0 + 2; x < x0 + 20; x += 6) A.rect(g, x, 26, 2, 278, '#1e2e22');
        A.rect(g, x0 === 0 ? 18 : 160, 26, 2, 278, '#3a2412');
      }
      [[3, 80], [3, 140], [164, 80], [164, 200]].forEach(([x, y], i) => {
        A.rect(g, x, y, 13, 16, '#8a6a20'); A.rect(g, x + 2, y + 2, 9, 12, ['#2a3a5a', '#5a2a2a', '#3a4a2a', '#4a3a5a'][i]);
        A.rect(g, x + 3, y + 9, 7, 4, 'rgba(0,0,0,.35)');
      });
      [[9, 110], [9, 260], [170, 170], [170, 260]].forEach(([x, y]) => { A.rect(g, x - 1, y, 3, 3, '#c8a040'); A.rect(g, x, y - 2, 1, 2, '#ffe0a0'); });
      // Dartscheibe mit Kreidetafel, Kamin, Jukebox
      A.oval(g, 10, 186, 6, 6, '#111'); A.oval(g, 10, 186, 5, 5, '#c03030'); A.oval(g, 10, 186, 3, 3, '#e8dcc0'); A.rect(g, 9, 185, 2, 2, '#c03030');
      A.rect(g, 3, 196, 14, 10, '#1a1a1a'); A.frame(g, 3, 196, 14, 10, '#6a4a2a'); A.rect(g, 5, 199, 5, 1, '#ccc'); A.rect(g, 5, 202, 8, 1, '#ccc');
      A.rect(g, 0, 226, 18, 34, '#5a5450'); A.rect(g, 2, 230, 14, 26, '#1a1210'); A.noise(g, 0, 226, 18, 34, '#3a3632', 40, 8);
      A.rect(g, 162, 118, 14, 28, '#4a1a4a'); A.oval(g, 169, 121, 7, 4, '#6a1a6a'); A.rect(g, 164, 122, 10, 6, '#f0a020');
      A.rect(g, 164, 130, 10, 2, '#30c0f0'); A.rect(g, 164, 134, 10, 2, '#30c0f0'); A.rect(g, 165, 140, 8, 4, '#222');
      // Boden: klassischer Pub-Teppich (rot mit goldenem Muster)
      A.rect(g, 20, 66, 140, 238, '#3e1016');
      for (let y = 66; y < 304; y += 12) for (let x = 20; x < 160; x += 12) {
        g.fillStyle = '#56301a'; g.fillRect(x + 5, y + 2, 2, 1); g.fillRect(x + 3, y + 4, 1, 1); g.fillRect(x + 8, y + 4, 1, 1); g.fillRect(x + 2, y + 6, 1, 1); g.fillRect(x + 9, y + 6, 1, 1); g.fillRect(x + 3, y + 8, 1, 1); g.fillRect(x + 8, y + 8, 1, 1); g.fillRect(x + 5, y + 10, 2, 1);
        g.fillStyle = '#4c1a1e'; g.fillRect(x + 5, y + 5, 2, 3);
        g.fillStyle = '#1a2e20'; g.fillRect(x, y, 1, 1);
      }
      A.noise(g, 20, 66, 140, 238, '#340c10', 500, 11);                 // abgetreten
      for (let y = 70; y < 300; y++) for (let k = 0; k < 2; k++) { const x = 86 + ((y * 7 + k * 13) % 9); if ((x + y) % 3 === 0) A.rect(g, x, y, 1, 1, '#5e2a28'); }
      A.planks(g, 20, 56, 140, 10, '#4a2e14', '#3a220e', 5);           // Dielen vor der Theke
      // Theke: Regal mit Flaschen und Spiegel, Zapfhähne, Messingstange, Hocker
      A.rect(g, 20, 26, 140, 24, '#1e1008');
      A.rect(g, 22, 27, 136, 8, '#2a3a40'); A.rect(g, 22, 27, 136, 1, '#4a5a60');
      const cols = ['#3a8a3a', '#8a2a2a', '#d0a030', '#2a5a8a', '#ddd', '#6a3a1a'];
      for (let x = 24; x < 156; x += 4) { A.rect(g, x, 29, 2, 6, cols[(x * 7) % 6]); A.rect(g, x, 28, 1, 1, '#ccc'); }
      A.rect(g, 22, 36, 136, 2, '#3a2010');
      for (let x = 26; x < 156; x += 7) A.rect(g, x, 38, 3, 4, ['#c8c8d0', '#a0a8b0'][x % 2]);       // Gläser
      A.rect(g, 20, 44, 140, 12, '#5a3214'); A.rect(g, 20, 44, 140, 2, '#8a5a2a'); A.rect(g, 20, 54, 140, 2, '#c8a040');
      for (let x = 34; x < 150; x += 26) { A.rect(g, x, 40, 3, 6, '#d8b040'); A.rect(g, x - 1, 39, 5, 2, ['#c03030', '#3070c0', '#30a030', '#e0e0e0'][(x / 26 | 0) % 4]); }
      for (let x = 30; x < 160; x += 30) { A.oval(g, x, 61, 3, 2, '#8a2a2a'); A.rect(g, x - 2, 60, 5, 1, '#aa3a3a'); }
      // Tische (Positionen aus venues.js) mit Gläsern und Hockern
      for (const r of ve.walls) pubTable(g, r);
      // Tür nach draußen unten
      A.rect(g, 70, 296, 40, 8, '#3a2410'); A.rect(g, 89, 296, 2, 8, '#2a1808'); A.rect(g, 84, 297, 12, 4, '#1a5a2a'); A.text(g, 'EXIT', 84, 298, '#7cfc6a');
      // Licht: Lampen über den Tischen, Wandlampen, Theke
      const L = ve.walls.map(r => ({ x: r.x + r.w / 2, y: r.y + r.h / 2, rx: 34, ry: 24, c: '#ffc070', a: .55 }));
      L.push({ x: 90, y: 50, rx: 80, ry: 18, c: '#ffd080', a: .45 }, { x: 9, y: 110, rx: 16, ry: 14, c: '#ffd080', a: .5 }, { x: 170, y: 170, rx: 16, ry: 14, c: '#ffd080', a: .5 },
        { x: 9, y: 245, rx: 22, ry: 20, c: '#ff8040', a: .55 }, { x: 169, y: 132, rx: 16, ry: 18, c: '#e070ff', a: .4 });
      A.lights(g, L);
      shadePass(g, PLAY_W, H, (x, y) => y < 26 || y >= 304 ? null : ART.SOFT + 1.2 - Math.hypot(x - 90, y - 165) / 190);
      ART.lift(g);
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
      const o = makeCanvas(PLAY_W, H), g = o.getContext('2d'), A = ART, ve = VENUES.festival;
      A.rect(g, 0, 0, PLAY_W, H, '#04050c');
      // Crowd-Bereich mit Wellenbrecher
      A.rect(g, 0, 238, 180, 66, '#090b18');
      A.rect(g, 0, 240, 180, 3, '#6a6a74'); for (let x = 2; x < 180; x += 10) A.rect(g, x, 240, 2, 6, '#4a4a54');
      // Bühne: schwarze Bretter mit Kabeln und Gaffa
      A.planks(g, 18, 26, 144, 208, '#2c2620', '#221d18', 8);
      A.noise(g, 18, 26, 144, 208, '#362e26', 300, 41);
      g.fillStyle = '#0a0a0a';
      for (let x = 30; x < 150; x++) { g.fillRect(x, 226 + Math.round(Math.sin(x / 9) * 1.5), 1, 1); }
      for (let y = 70; y < 226; y++) { g.fillRect(28 + Math.round(Math.sin(y / 11) * 2), y, 1, 1); g.fillRect(152 + Math.round(Math.cos(y / 13) * 2), y, 1, 1); }
      A.rect(g, 40, 58, 100, 1, '#f0e8c0');
      for (const m of ve.mics) { A.rect(g, m.x - 4, m.y + 2, 8, 1, '#e0e0e0'); A.rect(g, m.x - 4, m.y + 2, 1, 3, '#e0e0e0'); A.rect(g, m.x + 3, m.y + 2, 1, 3, '#e0e0e0'); }
      // Lichttraverse oben mit Scheinwerfern
      A.rect(g, 0, 26, 180, 6, '#2a2a30'); g.fillStyle = '#4a4a54';
      for (let x = 0; x < 180; x += 4) { g.fillRect(x, 26 + (x % 8 ? 0 : 4), 1, 2); g.fillRect(x, 26, 4, 1); g.fillRect(x, 31, 4, 1); }
      // Banner und Drum-Podest
      A.rect(g, 52, 32, 76, 9, '#111'); A.frame(g, 52, 32, 76, 9, '#333'); A.text(g, 'BROTHERS', 74, 34, '#ffd84a');
      A.rect(g, 62, 41, 56, 20, '#3a2a1a'); A.frame(g, 62, 41, 56, 20, '#22180e'); A.rect(g, 62, 59, 56, 2, '#1a120a');
      A.drumKit(g, 90, 50);
      // Backline: Verstärkertürme links und rechts
      for (const x of [20, 144]) {
        A.rect(g, x, 40, 16, 22, '#151515'); A.frame(g, x, 40, 16, 22, '#2a2a2a');
        A.rect(g, x + 1, 46, 14, 15, '#222'); for (let y = 47; y < 61; y += 2) A.rect(g, x + 2, y, 12, 1, '#1a1a1a');
        A.rect(g, x, 36, 16, 5, '#1a1a1a'); for (let k = 0; k < 4; k++) A.rect(g, x + 2 + k * 3, 38, 1, 1, '#d8b040');
        A.rect(g, x + 2, 37, 6, 1, '#c8c0a0');
      }
      // Boxentürme an den Seiten
      A.rect(g, 0, 32, 18, 206, '#0e0e10'); A.rect(g, 162, 32, 18, 206, '#0e0e10');
      for (let y = 36; y < 234; y += 22) for (const x of [2, 164]) {
        A.rect(g, x, y, 14, 19, '#1c1c20'); A.oval(g, x + 7, y + 7, 4, 4, '#2a2a30'); A.oval(g, x + 7, y + 7, 2, 2, '#111'); A.rect(g, x + 4, y + 14, 6, 2, '#2a2a30');
      }
      // Monitorboxen (Positionen aus venues.js)
      for (const r of ve.walls) { A.rect(g, r.x, r.y, r.w, r.h, '#1a1a1a'); A.rect(g, r.x + 2, r.y + 1, r.w - 4, 5, '#2a2a30'); A.rect(g, r.x + 3, r.y + 2, r.w - 6, 3, '#151518'); }
      // Bühnenkante mit Fußlicht
      A.rect(g, 18, 232, 144, 6, '#111');
      for (let x = 22; x < 160; x += 12) A.rect(g, x, 234, 3, 2, '#f0e060');
      // Licht: Grundlicht + Fußlicht + Drums
      const L = [{ x: 90, y: 140, rx: 90, ry: 95, c: '#6080d0', a: .45 }, { x: 90, y: 50, rx: 40, ry: 18, c: '#ffd890', a: .5 }];
      for (let x = 22; x < 160; x += 24) L.push({ x, y: 230, rx: 16, ry: 14, c: '#ffe080', a: .45 });
      A.lights(g, L);
      shadePass(g, PLAY_W, H, (x, y) => y < 26 || y >= 304 ? null : ART.SOFT + y > 236 ? .2 : 1.25 - Math.abs(x - 90) / 130 - (y - 26) / 700);
      ART.lift(g);
      return o;
    },

    /* ---------- 6. HOTEL ---------- */
    hotel() {
      const o = makeCanvas(PLAY_W, H), g = o.getContext('2d'), A = ART, ve = VENUES.hotel;
      A.rect(g, 0, 0, PLAY_W, H, '#060814');
      // Oben: Dachdecke im Schnitt (Beton mit Schraffur), darunter Stuckleiste und Lampen
      A.rect(g, 0, 26, 180, 30, '#3a2a22');
      g.fillStyle = '#33251e'; for (let y = 26; y < 56; y++) for (let x = (y % 4); x < 180; x += 4) g.fillRect(x, y, 1, 1);
      A.rect(g, 0, 26, 180, 1, '#5a4232');
      A.rect(g, 0, 50, 180, 6, '#4a3428'); A.rect(g, 0, 50, 180, 1, '#6a4c38');
      A.rect(g, 0, 56, 180, 6, '#2a1a1a'); A.rect(g, 0, 56, 180, 1, '#4a2e28');
      for (let x = 40; x < 146; x += 50) A.rect(g, x, 62, 6, 1, '#fff0c0');
      // Etagen: jedes ein Hotelzimmer
      const carpets = [['#4a2440', '#552c4a'], ['#24304a', '#2c3a56'], ['#3a3a24', '#46462c']];
      ve.floors.forEach((f, i) => {
        const y0 = f.y0 - 4, y1 = f.y1 + 4, room = (3 - i) + '0' + (i + 1);
        A.rect(g, 18, y0, 128, y1 - y0, carpets[i][0]);
        g.fillStyle = carpets[i][1];
        for (let y = y0; y < y1; y += 6) for (let x = 18 + ((y / 6 | 0) % 2) * 3; x < 146; x += 6) { g.fillRect(x + 1, y, 1, 1); g.fillRect(x, y + 1, 3, 1); g.fillRect(x + 1, y + 2, 1, 1); }
        A.oval(g, 90, (y0 + y1) >> 1, 26, 12, 'rgba(0,0,0,.18)');                                     // Teppich
        // Fenster mit Vorhängen an der linken Wand
        A.rect(g, 0, y0, 18, y1 - y0, '#2a1f18'); A.rect(g, 3, y0 + 10, 12, 22, '#0a1430');
        A.noise(g, 4, y0 + 18, 10, 12, '#f0d080', 6, i + 3);
        A.rect(g, 2, y0 + 8, 3, 26, '#7a2a2a'); A.rect(g, 13, y0 + 8, 3, 26, '#7a2a2a');
        // Bett mit Kopfteil, Kissen und Decke
        const b = ve.beds[i];
        A.shadow(g, b.x + 2, b.y + 2, b.w, b.h, .4);
        A.rect(g, b.x, b.y, b.w, 3, '#5a3a22'); A.rect(g, b.x, b.y + 3, b.w, b.h - 3, '#e8e4dc');
        A.rect(g, b.x + 2, b.y + 4, 9, 5, '#fff'); A.rect(g, b.x + 13, b.y + 4, 9, 5, '#fff');
        A.rect(g, b.x + 1, b.y + 11, b.w - 2, b.h - 12, ['#8a2a3a', '#2a4a7a', '#4a6a2a'][i]); A.rect(g, b.x + 1, b.y + 11, b.w - 2, 2, '#f0ece4');
        // Nachttisch mit Lampe, Kommode mit Fernseher, Minibar
        A.rect(g, 52, y0 + 3, 8, 8, '#5a3a22'); A.oval(g, 56, y0 + 6, 2, 2, '#ffe0a0');
        A.rect(g, 104, y0 + 2, 34, 8, '#4a2e1a'); A.rect(g, 104, y0 + 2, 34, 1, '#6a4a2a');
        A.rect(g, 114, y0 + 1, 14, 8, '#111'); A.rect(g, 115, y0 + 2, 12, 6, '#1a2a4a'); A.rect(g, 116, y0 + 3, 4, 1, '#4a6aaa');
        A.rect(g, 92, y0 + 2, 8, 8, '#d8d8d8'); A.rect(g, 92, y0 + 5, 8, 1, '#999');
        // Zimmertür mit Nummer neben dem Aufzug
        A.rect(g, 140, y1 - 24, 6, 20, '#3a2414'); A.rect(g, 144, y1 - 14, 1, 2, '#d8b040');
        A.text(g, room, 130, y0 + 13, 'rgba(216,176,64,.7)');
        // Aufzugschacht mit Türen und Anzeige
        A.rect(g, 146, y0, 34, y1 - y0, '#0e0e12'); A.rect(g, 176, y0, 2, y1 - y0, '#222'); A.rect(g, 171, y0, 1, y1 - y0, '#333');
        const L = ve.lifts[i];
        A.rect(g, L.x - 1, L.y - 1, L.w + 2, L.h + 2, '#5a5a60'); A.rect(g, L.x, L.y, L.w, L.h, '#9a9aa2');
        A.rect(g, L.x + L.w / 2 - 1, L.y, 1, L.h, '#5a5a62'); A.rect(g, L.x + 1, L.y + 1, 2, L.h - 2, '#b0b0b8');
        A.rect(g, L.x + 3, L.y - 7, 10, 5, '#111'); A.text(g, String(3 - i), L.x + 6, L.y - 7, '#ff8a3a');
      });
      // Decken/Böden zwischen den Etagen mit Lampen
      for (const w of ve.walls) {
        A.rect(g, w.x, w.y, w.w, w.h, '#3a2a22'); A.rect(g, w.x, w.y, w.w, 2, '#5a4232'); A.rect(g, w.x, w.y + w.h - 2, w.w, 2, '#2a1c16');
        A.noise(g, w.x, w.y + 2, w.w, w.h - 4, '#33251e', 120, w.y);
        for (let x = 40; x < 146; x += 50) A.rect(g, x, w.y + w.h, 6, 1, '#fff0c0');
      }
      // Licht: Nachttischlampen, Deckenlampen, Fernseher
      const Ls = [];
      ve.floors.forEach(f => {
        Ls.push({ x: 56, y: f.y0 + 4, rx: 24, ry: 16, c: '#ffd890', a: .6 });
        for (let x = 43; x < 146; x += 50) Ls.push({ x, y: f.y0 + 8, rx: 26, ry: 18, c: '#ffe0b0', a: .35 });
        Ls.push({ x: 121, y: f.y0 + 8, rx: 14, ry: 10, c: '#6a8aff', a: .4 });
      });
      A.lights(g, Ls);
      shadePass(g, PLAY_W, H, (x, y) => y < 56 || y >= 304 ? null : ART.SOFT + 1.15 - Math.abs(x - 80) / 150);
      ART.lift(g);
      return o;
    },

    /* ---------- 7. DIE WOHNUNG: gemütlicher Abend, warmes Licht, Kamin ---------- */
    flat() {
      const o = makeCanvas(PLAY_W, H), g = o.getContext('2d'), A = ART;
      A.rect(g, 0, 0, PLAY_W, H, '#2a2418');
      // Warme Holzdielen, senkrecht verlegt, jede etwas anders getönt
      const tones = ['#b8884e', '#b08048', '#bf9058', '#a87a42', '#b4864c'];
      const r = seeded(77);
      for (let x = 18, k = 0; x < 162; x += 9, k++) {
        A.rect(g, x, 26, 9, 278, tones[k % tones.length]);
        A.rect(g, x, 26, 1, 278, '#8a6236');
        for (let y = 26 + (r() * 60 | 0); y < 304; y += 50 + (r() * 40 | 0)) A.rect(g, x, y, 9, 1, '#946a3c');   // Stöße
        A.noise(g, x + 1, 26, 8, 278, '#a07444', 60, k + 1); A.noise(g, x + 1, 26, 8, 278, '#c89a60', 40, k + 50);
      }
      // Wände: außen dicker Mauerschnitt (Grundriss-Look), innen warme Tapete mit Fußleiste
      for (const x0 of [0, 162]) {
        const cut = x0 === 0 ? 0 : 170, face = x0 === 0 ? 10 : 162;
        A.rect(g, cut, 26, 10, 278, '#3a2c20');
        g.fillStyle = '#46362a'; for (let y = 26; y < 304; y += 4) g.fillRect(cut, y, 10, 1);          // Schraffur
        A.rect(g, x0 === 0 ? 9 : 170, 26, 1, 278, '#1e160f');                                          // Kante zum Raum
        A.rect(g, face, 26, 8, 278, '#d9b47a'); g.fillStyle = '#cfa86c'; for (let y = 28; y < 304; y += 6) g.fillRect(face + 1, y, 6, 2);   // Tapete
        A.rect(g, x0 === 0 ? 16 : 162, 26, 2, 278, '#efe2c4');
      }
      // Rückwand mit Erkerfenster, draußen Abendsonne
      A.rect(g, 10, 26, 160, 40, '#d9b47a'); g.fillStyle = '#cfa86c'; for (let x = 12; x < 170; x += 6) g.fillRect(x, 30, 2, 32);
      A.rect(g, 18, 62, 144, 4, '#efe2c4');
      A.rect(g, 0, 26, 180, 3, '#3a2c20'); A.rect(g, 0, 29, 180, 1, '#1e160f');
      A.rect(g, 50, 28, 80, 34, '#efe6d0');
      for (let y = 31; y < 59; y++) { A.rect(g, 54, y, 22, 1, lerpCol('#f0b878', '#f8dca0', (y - 31) / 28)); A.rect(g, 79, y, 22, 1, lerpCol('#f4c080', '#fbe4aa', (y - 31) / 28)); A.rect(g, 104, y, 22, 1, lerpCol('#f0b878', '#f8dca0', (y - 31) / 28)); }
      for (const x of [54, 79, 104]) { A.rect(g, x + 10, 31, 1, 28, '#efe6d0'); A.rect(g, x, 44, 22, 1, '#efe6d0'); }
      A.rect(g, 52, 30, 4, 30, '#a8483a'); A.rect(g, 124, 30, 4, 30, '#a8483a');                     // Vorhänge
      A.rect(g, 48, 61, 84, 3, '#f6eedc');                                                          // Fensterbrett
      A.rect(g, 60, 58, 4, 3, '#c86a3a'); A.rect(g, 61, 56, 2, 2, '#4a7a3a'); A.rect(g, 112, 57, 3, 4, '#e8e0c8'); A.rect(g, 112, 56, 1, 1, '#ffd060');   // Topf, Kerze
      // Lichterkette an der Rückwand (leuchtet in der Animation)
      for (let x = 14; x < 168; x += 2) A.rect(g, x, 27 + Math.round(Math.abs(Math.sin(x / 10)) * 3), 1, 1, '#4a3a28');
      // Zimmerpalme links vom Fenster
      A.rect(g, 30, 64, 10, 8, '#b0603a'); A.rect(g, 30, 64, 10, 2, '#c8784a');
      g.fillStyle = '#3e6e32';
      for (let k = 0; k < 7; k++) { const a = -2.6 + k * .5; for (let t = 2; t < 14; t++) g.fillRect(Math.round(35 + Math.cos(a) * t), Math.round(64 + Math.sin(a) * t * .8), 1, 1); }
      g.fillStyle = '#5a8a42'; for (let k = 0; k < 7; k++) { const a = -2.6 + k * .5; g.fillRect(Math.round(35 + Math.cos(a) * 12), Math.round(64 + Math.sin(a) * 9.6), 2, 1); }
      // Plattenspieler auf dem Schrank, Plattenstapel, Gitarre am Ständer
      A.rect(g, 136, 64, 24, 14, '#6a4628'); A.rect(g, 136, 64, 24, 1, '#7a5634');
      A.rect(g, 139, 66, 14, 10, '#2a2420'); A.oval(g, 145, 71, 4, 4, '#111'); A.rect(g, 145, 71, 1, 1, '#c03030'); A.rect(g, 151, 67, 1, 6, '#bbb');
      for (let k = 0; k < 4; k++) A.rect(g, 124 + k, 66 + k, 10, 2, ['#c03030', '#e8c860', '#3060a0', '#222'][k]);
      A.rect(g, 116, 66, 1, 14, '#5a3a1a'); A.rect(g, 114, 78, 5, 6, '#7a2a1a'); A.rect(g, 113, 80, 7, 4, '#8a3a22'); A.rect(g, 115, 64, 3, 2, '#222');
      // Großer runder Webteppich in der Mitte
      A.oval(g, 92, 176, 40, 31, '#7a3424'); A.oval(g, 92, 176, 37, 28, '#a4462e'); A.oval(g, 92, 176, 30, 22, '#c8783a');
      A.oval(g, 92, 176, 27, 19, '#a4462e'); A.oval(g, 92, 176, 17, 12, '#d8a050'); A.oval(g, 92, 176, 13, 9, '#a4462e');
      A.noise(g, 54, 148, 76, 58, 'rgba(60,20,10,.25)', 200, 21);
      // Sofa (Hindernis): rostrot, mit Kissen und karierter Decke
      A.shadow(g, 20, 124, 22, 66, .3);
      A.rect(g, 18, 122, 22, 64, '#8a3e2a'); A.rect(g, 18, 122, 22, 4, '#a8583a'); A.rect(g, 18, 182, 22, 4, '#a8583a');
      A.rect(g, 20, 127, 6, 54, '#7a3424'); for (const y of [128, 146, 164]) A.rect(g, 27, y, 12, 16, '#a8583a');
      A.rect(g, 28, 130, 7, 6, '#d8a040'); A.rect(g, 29, 148, 6, 6, '#3a7a7a'); A.rect(g, 28, 166, 7, 6, '#d8a040');   // Kissen
      for (let y = 156; y < 182; y += 2) for (let x = 26 + ((y >> 1) % 2) * 2; x < 40; x += 4) A.rect(g, x, y, 2, 2, '#e8dcc0');   // Decke
      A.rect(g, 44, 150, 4, 5, '#e8e0d0'); A.rect(g, 45, 151, 2, 1, '#6a3a1a'); A.rect(g, 48, 151, 1, 2, '#e8e0d0');   // Tasse
      A.rect(g, 42, 160, 8, 3, '#3060a0'); A.rect(g, 43, 158, 7, 2, '#c03030');                    // Bücher
      // Sessel (Hindernis): grüner Samt, daneben eine Stehlampe
      A.shadow(g, 20, 238, 20, 20, .3);
      A.rect(g, 18, 236, 20, 20, '#2e4a32'); A.rect(g, 18, 236, 20, 4, '#3e5e40'); A.rect(g, 22, 241, 14, 12, '#3a5a3c');
      A.rect(g, 26, 244, 6, 5, '#d8a040');
      A.oval(g, 46, 228, 5, 5, '#f0d8a0'); A.oval(g, 46, 228, 3, 3, '#fff0c8');                     // Stehlampe von oben
      // Bilderrahmen an der Wand, Aschenbecher
      A.rect(g, 20, 266, 16, 22, '#3a2414'); A.rect(g, 22, 268, 12, 18, '#e8d8b0'); A.rect(g, 24, 272, 8, 8, '#c8783a'); A.rect(g, 24, 280, 8, 4, '#3a7a7a');
      A.rect(g, 42, 290, 6, 3, '#555'); A.rect(g, 43, 289, 4, 1, '#888');
      // Kamin rechts (Backstein) mit Schaffell davor, Kerzen auf dem Sims
      A.oval(g, 138, 228, 20, 14, '#e8e0cc'); A.noise(g, 120, 216, 38, 26, '#d4c8b0', 90, 31);
      A.rect(g, 157, 186, 13, 76, '#8a4430');
      for (let y = 186; y < 262; y += 4) for (let x = 157 + ((y >> 2) % 2) * 3; x < 170; x += 6) A.rect(g, x, y, 5, 3, '#9a5038');
      A.rect(g, 160, 200, 8, 34, '#1a1010'); A.rect(g, 157, 186, 13, 3, '#5a3a22');
      for (const y of [190, 244, 252]) { A.rect(g, 162, y, 3, 4, '#efe6d0'); A.rect(g, 163, y - 1, 1, 1, '#ffd060'); }
      // Papier-Kugellampe von oben (hängt über dem Raum) mit Schatten
      A.oval(g, 134, 126, 12, 6, 'rgba(60,30,10,.2)');
      A.oval(g, 126, 108, 12, 12, '#f6e6c4'); A.oval(g, 124, 105, 8, 8, '#fff4dc'); for (let k = -10; k <= 10; k += 5) A.rect(g, 126 + k, 98, 1, 20, 'rgba(200,170,120,.5)');
      // Licht: goldene Abendsonne, warme Lampen, Kaminfeuer
      A.lights(g, [
        { x: 90, y: 70, rx: 100, ry: 100, c: '#ffd890', a: .45 },
        { x: 126, y: 108, rx: 34, ry: 28, c: '#ffe0a8', a: .55 },
        { x: 46, y: 228, rx: 30, ry: 26, c: '#ffc070', a: .6 },
        { x: 150, y: 220, rx: 30, ry: 30, c: '#ff9a50', a: .55 },
      ]);
      // Warmer Bernstein-Ton über allem (gemütlich statt ausgeblichen)
      const im = g.getImageData(0, 0, PLAY_W, H), d = im.data;
      for (let p = 26 * PLAY_W * 4; p < 304 * PLAY_W * 4; p += 4) { d[p] += (255 - d[p]) * .04; d[p + 1] += (200 - d[p + 1]) * .05; d[p + 2] *= .92; }
      g.putImageData(im, 0, 0);
      shadePass(g, PLAY_W, H, (x, y) => y < 26 || y >= 304 ? null : ART.SOFT + 1.1 - Math.abs(x - 90) / 180 - (y - 26) / 420);
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
      // (kein Flackern mehr: ruhiges, gleichmäßiges Licht)
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
        X.fillStyle = k === 1 ? 'rgba(255,230,120,.08)' : 'rgba(120,160,255,.07)';
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
      // Kaminfeuer flackert
      for (let k = 0; k < 4; k++) {
        const h = 4 + Math.round(Math.abs(Math.sin(T * 7 + k * 1.9)) * 7);
        X.fillStyle = k % 2 ? '#ff8a20' : '#ffd040'; X.fillRect(161 + k * 2, 233 - h, 2, h);
      }
      X.fillStyle = '#5a2a10'; X.fillRect(160, 231, 8, 3);
      // Kerzen flackern
      X.fillStyle = Math.sin(T * 11) > 0 ? '#ffe070' : '#ffb040';
      for (const y of [190, 244, 252]) X.fillRect(163, y - 1, 1, 1);
      // Lichterkette funkelt
      const cols = ['#ffd860', '#ff9a60', '#fff0b0'];
      for (let x = 15, k = 0; x < 168; x += 8, k++) {
        const on = Math.sin(T * 2 + k * 1.3) > -.3;
        X.fillStyle = on ? cols[k % 3] : '#6a5030'; X.fillRect(x, 27 + Math.round(Math.abs(Math.sin(x / 10)) * 3), 1, 1);
      }
      // Staubkörnchen tanzen im Licht vor dem Fenster
      X.fillStyle = 'rgba(255,230,180,.5)';
      for (let k = 0; k < 8; k++) {
        const x = 56 + ((k * 37 + T * (3 + k % 3)) % 70), y = 70 + ((k * 53 + Math.sin(T * .7 + k) * 6 + T * 2) % 150);
        X.fillRect(Math.round(x), Math.round(y), 1, 1);
      }
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
    /* Tourbus: Karosserie mit Rädern und Spiegel, daneben die Straße */
    bus(g, x, w) {
      const k = sideKit(g, x, w);
      k.r(0, 0, w, H, '#2c2d31');                                                     // Asphalt
      ART.noise(g, x, 0, w, H, '#36373c', 300, x + 5); ART.noise(g, x, 0, w, H, '#232428', 260, x + 6);
      k.r(18, 0, w - 18, H, '#3a3a38'); k.r(18, 0, 2, H, '#6a6a64'); k.r(18, 0, 1, H, '#84847c');   // Bordstein und Gehweg
      for (let y = 0; y < H; y += 12) k.r(18, y, 2, 1, '#4a4a46');
      k.r(0, 0, 3, H, 'rgba(0,0,0,.35)');                                             // Schatten des Busses
      k.r(6, 0, 1, H, '#8a8a7a');                                                       // Randlinie
      for (const y0 of [60, 236]) { k.r(0, y0, 2, 28, '#0c0c0e'); k.r(0, y0 + 10, 1, 8, '#5a5a62'); }   // Räder (Rest)
    },
    /* Proberaum: dicke Kellerwand, draußen nasses Kopfsteinpflaster im Hinterhof */
    rehearsal(g, x, w) {
      const k = sideKit(g, x, w), r = seeded(x + 21);
      k.r(0, 0, w, H, '#16181c');
      for (let y = 0, row = 0; y < H; y += 4, row++)                                  // Pflastersteine
        for (let d = 5 - (row % 2) * 2; d < w; d += 5) k.r(d, y, 4, 3, r() < .5 ? '#262a30' : '#2c3036');
      for (const [y, d, rx] of [[96, 11, 3], [188, 8, 3], [262, 12, 3]]) {            // Pfützen
        ART.oval(g, k.X(d), y, rx, 2, '#1c2636'); g.fillStyle = '#3a4a64'; g.fillRect(k.X(d) - 2, y - 1, 3, 1);
      }
      ART.cut(k, 5, '#4a4440', '#3a3430');
      for (const y of [120, 230]) {                                                    // Kellerfenster mit Gitter
        k.r(0, y, 5, 14, '#c88a4a');
        for (let yy = y + 1; yy < y + 14; yy += 3) k.r(0, yy, 5, 1, '#3a2a1c');
        k.r(5, y - 2, 6, 18, 'rgba(255,170,90,.14)');
      }
      for (let n = 0; n < 40; n++) k.r(5 + (r() * 2 | 0), r() * H | 0, 1, 2, '#3a5a2a');   // Unkraut an der Wand
      k.r(7, 52, 7, 9, '#20262a'); k.r(7, 52, 7, 2, '#2e363c'); k.r(8, 55, 5, 1, '#151a1e');   // Mülltonne
    },
    /* Pub: Steinwand, Gehweg aus Platten, Bordstein, nasse Straße und Laternen */
    pub(g, x, w) {
      const k = sideKit(g, x, w);
      k.r(0, 0, 15, H, '#3c3a36');                                                     // Gehwegplatten
      for (let y = 3; y < H; y += 10) k.r(5, y, 10, 1, '#2c2a26');
      k.r(10, 0, 1, H, '#2c2a26');
      k.r(15, 0, 2, H, '#6a6864'); k.r(15, 0, 1, H, '#84827c');                        // Bordstein
      k.r(17, 0, w - 17, H, '#18181c');                                                // Straße (nass)
      for (let y = 0; y < H; y += 7) k.r(18 + (y * 3) % 8, y, 2, 1, '#262630');
      for (const y of [86, 196]) k.r(5, y - 2, 9, 20, 'rgba(255,190,100,.16)');          // Licht aus den Pub-Fenstern
      for (const y of [40, 140, 250]) {                                                // Laternen
        k.r(8, y - 10, 10, 22, 'rgba(255,210,120,.08)'); k.r(6, y - 6, 14, 14, 'rgba(255,210,120,.08)');
        k.r(12, y, 2, 2, '#ffe0a0'); k.r(11, y - 1, 4, 1, '#222');
      }
      ART.cut(k, 5, '#4a3a2a', '#3a2c1e');
      for (const y of [86, 196]) { k.r(0, y, 5, 16, '#d8a050'); k.r(0, y + 7, 5, 1, '#5a3a1a'); k.r(2, y, 1, 16, '#5a3a1a'); }   // Fenster
      k.r(6, 282, 5, 7, '#1a1a1a'); k.r(7, 283, 3, 2, '#ddd'); k.r(7, 286, 3, 1, '#ddd');      // Kreidetafel
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
      ART.cut(k, 5, '#4a4e56', '#3a3d44');
    },
    /* Festival: Traverse am Bühnenrand, daneben Seitenbühne mit Technik, unten die Menge */
    festival(g, x, w) {
      const k = sideKit(g, x, w), r = seeded(x + 41);
      k.r(0, 0, w, H, '#101016');                                                       // Bühnenboden
      for (let n = 0; n < 8; n++) k.r(6 + (r() * 20 | 0), 40 + (r() * 180 | 0), 3, 1, '#a8a040');   // Gaffa-Markierungen
      k.r(8, 92, 7, 34, '#1a1a1e');                                                     // Gitarrenständer
      for (let n = 0; n < 4; n++) k.r(9, 94 + n * 8, 5, 2, ['#c03030', '#e8e0d0', '#3060c0', '#5a3a20'][n]);
      k.r(7, 176, 8, 22, '#22242a'); k.r(7, 176, 8, 2, '#34363e');                      // Pult
      k.r(8, 146, 6, 8, '#0a0a0c'); k.r(9, 147, 4, 3, '#2a2a30');                       // Monitorbox
      k.r(0, 226, w, 6, '#4a4c54'); k.r(0, 226, w, 1, '#7a7c84');                       // Absperrgitter
      for (let d = 1; d < w; d += 3) k.r(d, 227, 1, 5, '#2a2c32');
      k.r(0, 232, w, H - 232, '#0c0e1a');                                               // Publikum (Boden)
      k.r(0, 0, 1, 226, '#7a7c84'); k.r(4, 0, 1, 226, '#7a7c84');                       // Traverse: zwei Rohre
      for (let y = 0; y < 226; y++) k.r(1 + ((y >> 1) % 3), y, 1, 1, '#4a4c54');        // mit Zickzack-Streben
      k.r(5, 0, 2, 226, 'rgba(0,0,0,.45)');
    },
    /* Hotel (Querschnitt): Außenwand mit Balkonen, Nachthimmel, Häuser, Straße */
    hotel(g, x, w) {
      const k = sideKit(g, x, w), r = seeded(x + 51);
      for (let y = 0; y < H; y += 4) k.r(0, y, w, 4, lerpCol('#0c0a1e', '#1a1430', y / H));   // Himmel
      for (const [d, top] of [[9, 120], [14, 170]]) {                                  // Häuser in der Ferne
        k.r(d, top, w - d, 290 - top, d === 9 ? '#141222' : '#1c1830');
        for (let y = top + 6; y < 286; y += 7) for (let dd = d + 2; dd < w - 1; dd += 4)
          if (r() < .35) k.r(dd, y, 2, 3, r() < .7 ? '#e8c070' : '#7aa0e0');
      }
      k.r(0, 290, w, 14, '#1a1a20'); k.r(0, 290, w, 1, '#3a3a44');                       // Straße
      for (let d = 2; d < w; d += 8) k.r(d, 297, 4, 1, '#8a8a70');
      ART.cut(k, 4, '#4a3a4e', '#382a3c');
      for (const y of [124, 204]) {                                                     // Balkone an den Decken
        k.r(4, y + 4, 6, 3, '#3a2c3e'); k.r(4, y + 4, 6, 1, '#5a4a5e');
        k.r(9, y - 4, 1, 8, '#8a7a8e'); k.r(5, y - 4, 5, 1, '#8a7a8e');
      }
    },
    /* Wohnung: Backsteinfassade des Reihenhauses mit Fallrohr, Efeu und Nachbarfenstern */
    flat(g, x, w) {
      const k = sideKit(g, x, w), r = seeded(x + 9);
      ART.bricks(g, x, 0, w, H, '#4a2418', '#7a3e2a');
      k.r(11, 0, 3, H, '#26262a'); k.r(11, 0, 1, H, '#3a3a40');                         // Fallrohr
      for (let y = 20; y < H; y += 48) k.r(10, y, 5, 2, '#1a1a1e');
      g.fillStyle = '#3a5a2a';                                                          // Efeu
      for (let n = 0; n < 70; n++) { const yy = 200 + (r() * 120 | 0), xx = x + (r() * w | 0); if (r() < (yy - 200) / 120) g.fillRect(xx, yy, 2, 2); }
      for (const y of [110, 214]) { k.r(1, y, 7, 22, '#d8d0b8'); k.r(2, y + 1, 5, 20, '#7a98b0'); k.r(2, y + 10, 5, 1, '#d8d0b8'); }   // Nachbarfenster
    },
  },

  /* Animationen der Seitenränder (jedes Frame, ohne Abdunkeln: lieber gedeckte Farben) */
  sideAnim: {
    bus(T, x, w) {
      const k = sideKit(X, x, w);
      for (let n = 0; n < 11; n++) k.r(13, Math.round(((T * 22 + n * 30) % 330) - 20), 1, 14, '#5a5a50');   // Fahrbahnmarkierung

    },
    rehearsal(T, x, w) {
      const k = sideKit(X, x, w);
      for (const [y, d, o] of [[96, 11, 0], [188, 8, .5], [262, 12, .25]]) {            // Regentropfen in den Pfützen
        const t = (T * .8 + o) % 1; if (t > .5) continue;
        const rr = 1 + Math.round(t * 6), cx = k.X(d);
        X.fillStyle = 'rgba(140,170,220,.35)'; X.fillRect(cx - rr, y, 1, 1); X.fillRect(cx + rr, y, 1, 1);
      }
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
      for (let n = 0; n < 5; n++) k.r(8 + n, 180, 1, 1, ((T * 5 | 0) + n) % 3 ? '#3a8a3a' : '#7cfc6a');   // LEDs am Pult
      for (let n = 0; n < 36; n++) {                                                     // die Menge hüpft
        const d = 2 + (n * 7) % 27, y = 238 + ((n * 13) % 62), up = Math.sin(T * 7 + n * 1.9) > .3 ? 1 : 0;
        k.r(d, y - up, 3, 3, ['#a87858', '#6a4a30', '#c8a080', '#3a2a20'][n % 4]);
        if (n % 5 === 0 && up) k.r(d + 1, y - 3, 1, 2, '#c8a080');
      }
      const f = T * 3 | 0;                                                               // ein Feuerzeug blitzt auf
      if (f % 4 === 0) k.r(4 + (f * 7) % 24, 250 + (f * 11) % 50, 1, 1, '#fff');
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
      const r = seeded(top ? 61 : 62);
      k.r(0, 0, PLAY_W, h, '#16181c');
      for (let d = 0, row = 0; d < h; d += 4, row++)                                      // Pflaster
        for (let x = -(row % 2) * 2; x < PLAY_W; x += 5) k.r(x, d, 4, 3, r() < .5 ? '#262a30' : '#2c3036');
      for (const x of [30, 120]) { k.r(x - 4, 12, 9, 3, '#1c2636'); k.r(x - 2, 12, 3, 1, '#3a4a64'); }   // Pfützen
      ART.bandCut(k, 5, '#4a4440', '#3a3430');
      for (let n = 0; n < 30; n++) k.r(r() * PLAY_W | 0, 5, 2, 1, '#3a5a2a');               // Unkraut
      if (!top) { k.r(140, 8, 12, 10, '#20262a'); k.r(140, 8, 12, 2, '#2e363c'); }            // Mülltonne
      else { for (let n = 0; n < 4; n++) k.r(70 + n * 3, 0, 2, 5, '#c88a4a'); }              // Kellerfenster
    },
    pub(g, k, h, top) {
      k.r(0, 0, PLAY_W, h, top ? '#2a2018' : '#3c3a36');
      if (top) {                                                                         // Lager hinter dem Tresen: Fässer und Kisten
        for (let x = 10; x < 170; x += 22) { ART.oval(g, x + 6, k.Y(12, 1), 6, 4, '#7a7a84'); ART.oval(g, x + 6, k.Y(12, 1), 4, 2, '#5a5a64'); k.r(x + 5, 11, 2, 2, '#333'); }
        for (let x = 20; x < 170; x += 44) { k.r(x, 20, 14, 8, '#6a4a22'); k.r(x, 20, 14, 1, '#8a6a32'); for (let n = 0; n < 4; n++) k.r(x + 1 + n * 3, 22, 2, 2, '#3a6a2a'); }
      } else {                                                                           // draußen: Gehweg, Bordstein, Straße
        for (let d = 3; d < 20; d += 9) k.r(0, d, PLAY_W, 1, '#2c2a26');
        for (let x = 8; x < PLAY_W; x += 16) k.r(x, 6, 1, 14, '#2c2a26');
        k.r(0, 20, PLAY_W, 2, '#6a6864'); k.r(0, 22, PLAY_W, h, '#18181c');
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
      k.r(0, 0, PLAY_W, h, top ? '#101016' : '#0c0e1a');
      if (top) {                                                                         // hinter der Bühne: Backline und Traverse
        for (let x = 8; x < 170; x += 28) { k.r(x, 8, 18, 12, '#1a1a1e'); k.r(x + 1, 9, 16, 2, '#2a2a30'); k.r(x + 7, 14, 4, 2, '#3a3a40'); }
        k.r(0, 0, PLAY_W, 1, '#7a7c84'); k.r(0, 4, PLAY_W, 1, '#7a7c84');
        for (let x = 0; x < PLAY_W; x++) k.r(x, 1 + ((x >> 1) % 3), 1, 1, '#4a4c54');
        k.r(0, 5, PLAY_W, 2, 'rgba(0,0,0,.45)');
      }
    },
    hotel(g, k, h, top) {
      const r = seeded(top ? 81 : 82);
      if (top) {                                                                         // oben: Dachschnitt, kein Himmel
        k.r(0, 0, PLAY_W, h, '#2a1e1a');
        ART.bandCut(k, 6, '#3a2a22', '#33251e');
      } else {                                                                           // Straße vor dem Hotel
        k.r(0, 0, PLAY_W, h, '#1a1a20');
        k.r(0, 0, PLAY_W, 8, '#2a2830'); k.r(0, 8, PLAY_W, 1, '#4a4a54');
        for (let x = 4; x < PLAY_W; x += 14) k.r(x, 16, 7, 1, '#8a8a70');
        k.r(60, 0, 60, 3, '#6a1a2a'); k.r(60, 0, 60, 1, '#a02a3a');                       // roter Teppich am Eingang
      }
    },
    flat(g, k, h, top) {
      ART.bricks(g, 0, 0, PLAY_W, 64, '#4a2418', '#7a3e2a');
      k.r(0, 0, PLAY_W, 3, '#d8d0b8'); k.r(0, 3, PLAY_W, 2, 'rgba(0,0,0,.4)');             // Fensterbank / Sims
      if (!top) { for (let x = 0; x < PLAY_W; x += 3) k.r(x, 14 + ((x * 7) % 4), 3, h, '#2a4a20'); k.r(0, 14, PLAY_W, 1, '#3a5a2a'); }   // Hecke im Vorgarten
      else k.r(0, 18, PLAY_W, 3, '#2a2a30');                                              // Dachrinne
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
