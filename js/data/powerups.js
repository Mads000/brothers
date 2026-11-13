/* =========================================================================
   data/powerups.js – Power-ups (Tour-Manager-Kiste)

   Du nimmst 2 Power-ups mit (Auswahl im Shop) und setzt jedes einmal pro
   Level ein: Knopf unten links/rechts oder Taste 1/2.
   Bei jedem Einsatz kommt kurz der Manager (du) ins Bild.

   Felder:
     name     Anzeigename
     short    max. 5 Zeichen für den Knopf
     price    Preis in Plektren
     desc     Kurzbeschreibung für den Shop
     use(game)  Wirkung
   ========================================================================= */

const POWERUPS = {
  tape: {
    name: 'GAFFER TAPE', short: 'TAPE', price: 30, desc: 'ANGRIER ONE STUCK FOR 5S',
    use(game) {
      const b = game.bros.filter(x => !x.hidden).sort((p, q) => q.anger - p.anger)[0];
      if (!b) return;
      game.dropBro(b);
      b.st.stuck = 5; b.asleep = false;
      game.say(b, 'STUCK!', '#ccc');
    },
  },
  wall: {
    name: 'DIVIDER', short: 'WALL', price: 40, desc: 'A WALL BETWEEN THEM FOR 6S',
    use(game) { game.addDivider(6); },
  },
  call: {
    name: 'MANAGER CALL', short: 'CALL', price: 30, desc: 'BOTH ON THE PHONE FOR 4S',
    use(game) {
      for (const b of game.bros) { game.dropBro(b); b.st.phone = 4; game.say(b, 'YEAH? WHAT?', '#9fd8ff'); }
    },
  },
  slowmo: {
    name: 'SLOW-MO', short: 'SLOW', price: 35, desc: 'EVERYTHING HALF SPEED 5S',
    use(game) { game.slowT = 5; },
  },
  mum: {
    name: 'MUM CALLS', short: 'MUM', price: 50, desc: 'BOTH ANGER CUT IN HALF',
    use(game) {
      for (const b of game.bros) { b.anger /= 2; game.say(b, 'YES MUM', '#ffb0d0'); }
      Save.data.stats.mum++;
    },
  },
};
