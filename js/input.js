/* =========================================================================
   input.js – Touch, Maus und Tastatur

   Pointer Events decken Finger (Multitouch) und Maus gleich ab.
   Hier werden nur Bildschirmpositionen umgerechnet und an App (main.js)
   weitergegeben. Was ein Klick bewirkt, entscheidet App.
   ========================================================================= */

const Input = {
  /** Browser-Koordinaten in Canvas-Pixel umrechnen */
  toCanvas(e) {
    const r = C.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width * VIEW.W, y: (e.clientY - r.top) / r.height * VIEW.HC - VIEW.OY };
  },

  init() {
    C.addEventListener('pointerdown', e => {
      e.preventDefault();
      try { C.setPointerCapture(e.pointerId); } catch (_) { /* egal */ }
      const p = this.toCanvas(e);
      if (e.pointerType === 'mouse') UI.mouse = p;
      App.pointerDown(p, e.pointerId);
    });

    C.addEventListener('pointermove', e => {
      const p = this.toCanvas(e);
      if (e.pointerType === 'mouse') UI.mouse = p;   // für Hover-Effekt auf Buttons
      App.pointerMove(p, e.pointerId);
    });

    const up = e => App.pointerUp(e.pointerId);
    C.addEventListener('pointerup', up);
    C.addEventListener('pointercancel', up);
    C.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') UI.mouse = null; });

    // Tastatur (PC)
    addEventListener('keydown', e => {
      const nav = e.code.startsWith('Arrow');
      // Seite soll bei Leertaste/Pfeilen nicht scrollen
      if (nav || e.code === 'Space' || e.code === 'F2') e.preventDefault();
      if (e.repeat && !nav) return;   // gedrückt halten soll Pause nicht flackern lassen
      App.key(e.code);
    });

    // Kein Kontextmenü (langes Drücken auf dem Handy, Rechtsklick)
    document.addEventListener('contextmenu', e => e.preventDefault());

    // Automatisch pausieren, wenn Tab oder Fenster verlassen wird
    document.addEventListener('visibilitychange', () => { if (document.hidden) App.pause(); });
    addEventListener('blur', () => App.pause());
  },
};
