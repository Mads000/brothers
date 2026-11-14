# BROTHERS

Ein kurzes Chaos-Spiel im PS1-Look: Du bist Tour-Manager einer Britpop-Band und musst zwei zerstrittene Brüder bis zum Gig auseinanderhalten.

Reines HTML/CSS/JavaScript ohne Build-Tools. Läuft auf dem Handy (hochkant, Touch) und am PC (3:4-Fenster, Maus und Tastatur). Kein Sound, kein Login, keine Werbung. Der Spielstand liegt im localStorage des Browsers.

## Starten

- **Lokal:** `index.html` im Browser öffnen (Doppelklick reicht)
- **GitHub Pages:** Ordner in ein Repository legen, unter *Settings → Pages* den Branch `main` und den Ordner `/ (root)` wählen. Alle Pfade sind relativ.

## Inhalt

- **Tour:** 6 Schauplätze mit je 10 Levels plus ein Bonus-Schauplatz. Level 10 ist jeweils ein Headliner mit Gig-Szene und Plakat.
  1. Tourbus: Kurven und Schlaglöcher
  2. Beach Jam (früher Proberaum, intern `rehearsal`): Die Band probt am Strand bei Sonnenuntergang. Lautstärke: Ein lauter Verstärker macht den anderen Bruder wütend, Antippen dreht ihn runter
  3. Pub: Fans rempeln, man kann nur zwischen den Tischen ziehen
  4. Backstage: Die Tür lässt sich abschließen, bis einer sie eintritt
  5. Festival: Beide müssen an ihr Mikro, sonst geht die Crowd
  6. Hotel: Mehrere Etagen, Aufzug zum Trennen, Betten für den Nachtbonus
  7. Bonus: Das Moor (3 Levels, ab 12 Sternen). Weites Grasland unter blauem Himmel mit rosa Wolken am Horizont; Sonnenflecken ziehen über das Gras und beruhigen (intern weiter die id `flat`)
- **Sterne:** geschafft / Wut nie über 90 % / Bonusziel
- **Never-Ending Tour:** Auf einer Landkarte (Großbritannien und Irland) fährt der Bus ab Manchester von Stadt zu Stadt. Jeder Gig dauert 20 Sekunden und hat eine Mission für Extrapunkte. Die Wut bleibt erhalten, sinkt auf der Busfahrt aber etwas. Nach jeder Stadt wählst du auf der Karte einen von drei Halten in der Nähe:
  - ON THE ROAD: normaler Gig
  - ROWDY NIGHT: doppelte Punkte, aber schwerer
  - REST STOP: kein Gig, −30 % Wut
  - SERVICE STATION: kein Gig, Power-ups wieder voll, −10 % Wut

  Alle 3 Städte kommt ein neuer Twist dazu, dafür werden die Power-ups aufgefüllt. Dazu Highscores und 4 Paare zum Freischalten. Städte und ihre Lage stehen in `CITY_POS` in `js/endless.js`
- **Soundcheck (Freies Spiel):** Schauplatz, Paar, Tempo (CHILL/NORMAL/WILD), Zeit (2 Min., 5 Min., ohne Limit), Prügeleien an/aus, Gegenstände und Events an/aus frei wählbar. Keine Sterne, keine Belohnung, Power-ups kosten nichts. Die Auswahl-Listen stehen in `SANDBOX` in `js/ui.js`
- **Shop:** 5 Power-ups (2 pro Level mitnehmen), 6 Outfits, 4 Bus-Lackierungen. Bezahlt wird mit Plektren
- **Extras:** 12 Erfolge, Gig-Plakate, Highscores, Vibration an/aus
- **How to play** (kurze Anleitung mit Bildern) und **Info** (alle Gegenstände, Events, Schauplätze, Figuren, Power-ups und Twists zum Nachlesen; wird automatisch aus den Daten-Dateien gebaut, das Feld `desc` ist die Beschreibung)
- **Festhalten ist begrenzt:** Nach 2 Sekunden reißt sich ein Bruder los und ist kurz nicht greifbar. Die blaue Leiste über seinem Kopf zeigt, wie lange es noch geht (`gripTime` in `config.js`)

## Als App auf dem Handy

Auf der GitHub-Pages-Seite im Browser-Menü „Zum Home-Bildschirm“ wählen (iPhone: Teilen → „Zum Home-Bildschirm“). Das Spiel startet dann im Vollbild mit eigenem Icon. Die Icons liegen in `icons/`, die App-Angaben in `manifest.webmanifest`.

Nach dem ersten Öffnen ist das Spiel auch **offline** spielbar (Service Worker in `sw.js`). Online wird immer die neueste Version geladen. Neue Dateien bitte in `FILES` in `sw.js` eintragen.

## Steuerung

| | Handy | PC |
|---|---|---|
| Brüder trennen | Bruder ziehen (Multitouch geht) | Maus gedrückt halten und ziehen |
| Beruhigen | Bruder antippen | Bruder anklicken |
| Schlechtes Zeug (Bier, Gitarre, Kabel ...) | antippen | anklicken |
| Gutes Zeug (Tee, Pommes ...) | zum Bruder ziehen | zum Bruder ziehen |
| Power-ups | Knöpfe unten links/rechts | 1 und 2 |
| Pause | Knopf oben rechts | Leertaste, P oder Esc |
| Neustart | im Pause-Menü | R |
| Menüs | tippen | klicken oder Pfeiltasten + Enter |

## Testmodus und Codes

Das Spiel startet im **normalen Modus**. Codes gibst du unter **EXTRAS → ENTER CODE** ein: über die Bildschirm-Tastatur oder am PC direkt über die Tastatur.

| Code | Wirkung |
|---|---|
| `playtest` | Testmodus an (nochmal eingeben = aus). Alles ist frei, Plektren und Power-ups sind unbegrenzt, es gibt ein Debug-Menü. Bleibt auch nach einem Neustart an. |
| `reset` | Setzt alles zurück: Spielstand, Käufe, Highscores, Einstellungen, Testmodus. Fragt vorher nach (zweimal OK). |

Im Testmodus öffnest du das **Debug-Menü**, indem du lange auf das Logo, eine Überschrift oder den Timer drückst, am PC auch mit F2. Dort kannst du:
- Level gewinnen
- Wut setzen
- jedes Event und jeden Modifikator auslösen

Was du im Testmodus „kaufst“, landet nicht im normalen Spielstand.

Eigene Codes ergänzt du in `js/data/codes.js`.

## Dateien

```
index.html             lädt alles in der richtigen Reihenfolge
style.css              Seitenlayout, PC-Rand
js/config.js           TEST_MODE, Spielregel-Zahlen, Belohnungen, Endlos-Einstellungen
js/render.js           Format-Erkennung, Pixel-Schrift, Dithering, Figuren zeichnen
js/data/characters.js  Figuren und Paare
js/data/items.js       Gegenstände (schlecht, gut, sammeln, Stolperfallen)
js/data/events.js      Events (Beleidigung, Schlagloch, Fan, Blitz, Stromausfall ...)
js/data/modifiers.js   Modifikatoren der Never-Ending Tour
js/data/powerups.js    Power-ups
js/data/cosmetics.js   Outfits und Bus-Lackierungen
js/data/goals.js       Bonusziele für den 3. Stern
js/data/achievements.js Erfolge
js/data/codes.js       Codes (playtest, reset, ...)
js/data/venues.js      Schauplätze (Grenzen, Hindernisse, Endlos-Vorlage)
js/art.js              Hintergrund-Grafiken, Animationen und PC-Seitenränder (ART.side) der Schauplätze
js/data/levels.js      alle 60 Levels
js/save.js             Spielstand
js/mechanics.js        Sonderregeln der Schauplätze, Tamburin-Mann, Drummer
js/game.js             Spiellogik eines Levels
js/endless.js          Never-Ending Tour (+ Städte mit Lage auf der Karte)
sw.js                  Service Worker: macht das Spiel offline spielbar
js/ui.js               HUD und alle Bildschirme
js/input.js            Touch, Maus, Tastatur
js/main.js             Szenenwechsel und Game-Loop
manifest.webmanifest   App-Angaben für "Zum Home-Bildschirm"
icons/                 App-Icons (192, 512, maskable, iPhone, Favicon)
brothers.html          die ursprüngliche Demo (wird nicht mehr gebraucht)
```

## Eigene Inhalte hinzufügen

Jede Datei in `js/data/` erklärt oben alle Felder und enthält Beispiele.

**Neues Level** in `js/data/levels.js`:
```js
{
  id: 'bus-11', venue: 'bus', name: 'MOTORWAY',
  time: 50, startAnger: [30, 20], ramp: 35,
  items: { beer: 5, guitar: 3, tea: 2 }, itemEvery: [2.5, 4.5], firstItem: 2,
  events: { insult: [2.5, 4.5], pothole: [8, 12] },
  hint: 'THEY ARE TIRED AND GRUMPY',
  bonus: { type: 'bin', n: 10 },
},
```
Optional sind außerdem:
- `goal: { type: 'collect', n: 5 }` (Setlists sammeln) oder `goal: { type: 'stage' }` (zum Schluss beide auf die Bühne)
- `extras: ['drummer']` oder `['tambourine']`
- `mech: { ... }` für die Werte der Schauplatz-Regel
- `headliner: true, city: '...'` für ein Headliner-Level

**Neuer Gegenstand** (`items.js`): `kind`, `anger`, `word`, `height`, `draw(x, y)` und optional `onPickup(game, bro)`. Danach im Level unter `items` eintragen.

**Neues Event** (`events.js`): `name`, `icon`, `warn`, `run(game)` und optional `duration`, `update`, `drawScreen`. Danach im Level unter `events` eintragen.

**Neuer Erfolg, Outfit, Power-up, Modifikator:** einfach einen Eintrag in der passenden Datei ergänzen.

Text im Spiel verwendet die eingebaute 3x5-Pixelschrift: Großbuchstaben A–Z, Ziffern und `: ! ? . - ' / % + # @ = < > ( ) , * _ &`. Umlaute gibt es nicht. Neue Zeichen ergänzt du in `FONT` in `js/render.js`.

## Balancing

Alle Levels wurden automatisch mit einem einfachen Bot durchgespielt, der etwa 3 Aktionen pro Sekunde macht. Ohne Eingaben ist kein Level zu gewinnen. Bus, Proberaum, Pub, Backstage und Hotel schafft der Bot fast immer, beim Festival verliert er öfter. Die Werte zum Nachjustieren stehen in `levels.js` (`ramp`, `startAnger`, `itemEvery`, Event-Abstände) und global in `CONFIG.RULES`.

## Backup der alten Karten

Die Karten vor dem Umbau zum Moor liegen in `backup/maps-2026-11-14/` (art.js, venues.js, mechanics.js) und im Git-Tag `maps-backup-2026-11-14`. Zum Zurückholen die Dateien nach `js/` bzw. `js/data/` kopieren.
