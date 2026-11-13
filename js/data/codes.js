/* =========================================================================
   data/codes.js – Codes für EXTRAS -> ENTER CODE

   So fügst du einen Code hinzu: neuen Eintrag anlegen. Der Name ist der Code
   (klein geschrieben, nur Buchstaben und Ziffern, max. 12 Zeichen).

   Felder:
     confirm   optional: Warnung, nach der man ein zweites Mal OK drücken muss
     run()     was der Code macht. Gibt den Text zurück, der danach angezeigt wird.
   ========================================================================= */

/** Geheime Lackierung freischalten, anziehen und den Code merken */
function unlockSecretPaint(paintId, secret) {
  if (!Save.data.owned.paints.includes(paintId)) Save.data.owned.paints.push(paintId);
  Save.data.secrets = Save.data.secrets || {};
  Save.data.secrets[secret] = true;
  Save.data.paint = paintId;
  Save.write();
  Save.checkAchievements({});
}

const CODES = {
  // Testmodus an/aus: alles frei, unendlich Plektren, Debug-Menü
  playtest: {
    run() {
      setTestMode(!TEST_MODE);
      return TEST_MODE ? 'TEST MODE ON! EVERYTHING UNLOCKED. HOLD THE LOGO FOR DEBUG.'
                       : 'TEST MODE OFF. BACK TO NORMAL.';
    },
  },

  // ----- Easter Eggs -----
  foolsgold: {
    run() {
      unlockSecretPaint('gold', 'foolsgold');
      return 'FOOLS GOLD! YOUR TOUR BUS IS NOW GOLDEN.';
    },
  },
  adored: {
    run() {
      unlockSecretPaint('splatter', 'adored');
      return 'I WANNA BE ADORED. ENJOY YOUR PAINT SPLATTER BUS.';
    },
  },

  // Alles auf Anfang: Spielstand, Käufe, Highscores, Einstellungen und Testmodus
  reset: {
    confirm: 'THIS DELETES ALL PROGRESS. PRESS OK AGAIN TO RESET.',
    run() {
      Save.reset();
      setTestMode(false);
      Endless.active = false;
      return 'EVERYTHING RESET. FRESH START!';
    },
  },
};
