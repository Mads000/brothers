# BROTHERS – Spielkonzept & Plan

Nov 13, 2026 · @Mads Lahme

## Kernidee

BROTHERS wird ein kurzes Chaos-Spiel für zwischendurch: Du bist der Tour-Manager einer Britpop-Band und musst zwei zerstrittene Brüder von Ort zu Ort bringen, ohne dass sie sich prügeln. Aus dem Bus wird eine ganze Tour mit vielen Schauplätzen, Gegenständen und Events, dazu ein Endlos-Modus für Highscores.

Das bleibt aus der Demo:

- Ziehen trennt die Brüder, Tippen beruhigt, Gegenstände wegtippen
- Wut-Leisten, Gesichter und Dampf zeigen alles ohne Sound
- Hochkant, 180x320 Pixel, PS1-Look mit Dithering und Scanlines
- Runden von 30 bis 90 Sekunden

Neu ist vor allem: Jeder Schauplatz verändert die Regeln ein bisschen. Genau das macht Spiele wie Unicycle Legend so abwechslungsreich: Die Steuerung bleibt gleich, aber jedes Level hat einen neuen Trick.

## Was wir von Unicycle Legend lernen

Unicycle Legend funktioniert, weil es eine einfache Steuerung mit sehr vielen kurzen, unterschiedlichen Levels kombiniert. Laut App-Store-Beschreibung hat es 180 Levels mit Hindernissen wie Bomben, Federn, Fallen und Abgründen, dazu Kostüme und einen Endlos-Modus ([App Store](https://apps.apple.com/app/id1642075470)). Der Endlos-Modus wird nach der Kampagne freigeschaltet und baut die Strecke zufällig zusammen ([browsergamers.gg](https://browsergamers.gg/game/unicycle-legend)).

| Was Unicycle Legend macht | Wie BROTHERS das umsetzt |
| --- | --- |
| Viele kurze Levels, jedes mit eigenem Trick | 60 kurze Levels über 6 Schauplätze, jedes Level führt eine Sache neu ein |
| Sofort neu starten, kein Frust beim Warten | Ein Tippen nach dem Game Over, Level lädt in unter 1 Sekunde |
| Schwer, aber fair: man sieht, warum man verloren hat | Jede Wut-Quelle ist sichtbar, kurze Replay-Zeile beim Game Over ("Bier + Beleidigung") |
| Absurder Humor | Schafe im Bus, ein Bruder klaut das Mikro, Tamburin-Mann schläft ein |
| Kostüme als Belohnung | Outfits für die Brüder und Bus-Lackierungen |
| Endlos-Modus nach der Kampagne | "Never-Ending Tour": Schauplätze wechseln zufällig, Tempo steigt |

Nicht übernehmen: Pop-up-Werbung und Physik-Frust. BROTHERS soll fies, aber nicht zufällig unfair sein.

## Spielmodi

Es gibt zwei Modi: die Tour als Kampagne und den Endlos-Modus. Dazu kommt ein Testmodus für die Entwicklung.

**Tour (Kampagne)**

- 6 Schauplätze mit je 10 Levels, also 60 Levels
- Jedes Level hat ein Ziel, meist "Überleben bis Zeit X", manchmal ein Spezialziel ("Bring beide zur Bühne", "Sammle 5 Setlists")
- Bis zu 3 Sterne pro Level: geschafft, Wut nie über 90 %, Bonusziel erfüllt
- Level 10 jedes Schauplatzes ist ein "Headliner": länger, schwerer, mit Gig-Szene am Ende

**Never-Ending Tour (Endlos)**

- Wird nach Schauplatz 2 freigeschaltet, nicht erst am Ende, damit man früh Highscores jagen kann
- Abschnitte von 20 Sekunden, jeder Abschnitt ist ein zufälliger Schauplatz aus den freigeschalteten
- Zwischen den Abschnitten ein kurzer Übergang ("Next stop: Leeds"), die Wut bleibt erhalten
- Alle 3 Abschnitte kommt ein Modifikator dazu (siehe Events), das Tempo steigt dauerhaft
- Score = überlebte Sekunden + Bonus für ruhige Phasen und weggetippte Gegenstände
- Am Ende: "Ihr habt 7 Städte geschafft" plus Highscore-Liste

**Testmodus**

Während der Entwicklung ist alles freigeschaltet, damit du jeden Schauplatz und jedes Feature sofort testen kannst.

- Ein Schalter `TEST_MODE = true` ganz oben in `config.js`
- Alle Schauplätze, Levels, der Endlos-Modus, Power-ups, Outfits und Figuren sind frei
- Unendlich Plektren, jedes Level direkt aus dem Menü wählbar
- Kleines Debug-Menü (z. B. lange auf den Titel drücken): Level überspringen, Wut-Leisten setzen, Event oder Modifikator sofort auslösen, Spielstand zurücksetzen
- Vor der Veröffentlichung auf `false` stellen, dann gilt die normale Progression

## Schauplätze

Jeder Schauplatz hat eine eigene Regel, die das Grundspiel verändert. So fühlt sich jede Welt neu an, obwohl die Steuerung gleich bleibt.

| # | Schauplatz | Besondere Regel | Typische Gegenstände und Gefahren |
| --- | --- | --- | --- |
| 1 | Tourbus | Grundspiel. Kurven schieben alle zur Seite, Schlaglöcher lassen kurz alle stolpern | Bier, Gitarre, Schaf, Kekse |
| 2 | Proberaum | Lautstärke-Leiste: Je lauter einer spielt, desto wütender wird der andere. Verstärker runterdrehen durch Tippen | Verstärker, Effektpedale, Kabel (Stolperfalle) |
| 3 | Pub nach dem Gig | Viele Fans laufen durchs Bild und blockieren den Weg. Die Brüder können nur zwischen Tischen gezogen werden | Bierkrüge auf Tischen, Dartscheibe, Jukebox |
| 4 | Backstage | Zwei Räume mit Tür dazwischen. Einen Bruder einsperren beruhigt ihn, aber nur kurz, dann tritt er die Tür ein | Spiegel (Eitelkeit), Catering, Presse-Fotograf |
| 5 | Festival-Bühne | Beide müssen auf ihren Platz am Mikro. Steht einer zu lange weg, sinkt die Stimmung der Crowd. Du jonglierst also Abstand und Position | Mikroständer, Monitorboxen, Crowdsurfer, Regen |
| 6 | Hotel | Zimmer über mehrere Etagen, Aufzug zum Trennen. Nachts: Wenn beide schlafen, füllt sich eine Bonusleiste | Minibar, Fernseher (fliegt aus dem Fenster), Zimmerservice |

Weitere Ideen für spätere Updates: Fähre nach Irland (Boden schwankt), Radio-Interview (sie dürfen nicht gleichzeitig reden), Plattenladen-Signierstunde, Flughafen mit Sicherheitskontrolle.

## Gegenstände und Power-ups

Es gibt drei Arten von Gegenständen: schlechte, die du wegtippen musst, gute, die du den Brüdern hinziehst, und Power-ups, die du selbst einsetzt.

**Schlechte Gegenstände (wegtippen)**

| Gegenstand | Wirkung, wenn ein Bruder ihn erwischt |
| --- | --- |
| Bier | +25 Wut |
| Gitarre | +35 Wut, kann sie zerschlagen (Splitter liegen dann als Stolperfalle rum) |
| Zeitung mit Interview | Der andere Bruder liest sie und wird sofort wütend |
| Mikrofon | Wer es hat, beleidigt doppelt so oft |
| Bucket Hat des anderen | Diebstahl! Beide +20 Wut |

**Gute Gegenstände (hinziehen)**

| Gegenstand | Wirkung |
| --- | --- |
| Tee | -30 Wut, typisch britisch |
| Pommes in Zeitungspapier | Bruder isst 3 Sekunden und bewegt sich nicht |
| Kopfhörer | 8 Sekunden taub für Beleidigungen |
| Fußball | Beide spielen kurz zusammen, Wut sinkt bei beiden, solange sie nah sind |
| Fotoalbum von Mum | Beide werden sentimental, Wut auf 0, sehr selten |

**Power-ups (Tour-Manager-Kiste)**

Power-ups sammelst du in Levels oder kaufst sie im Shop. Pro Level kannst du 2 mitnehmen und per Knopf unten einsetzen.

- Klebeband: Ein Bruder klebt 5 Sekunden am Boden fest
- Trennwand: Eine Wand in der Mitte für 6 Sekunden
- Manager-Anruf: Beide telefonieren 4 Sekunden und sind abgelenkt
- Zeitlupe: 5 Sekunden lang läuft alles halb so schnell
- Mum ruft an: Beide Wut-Leisten auf die Hälfte, 1x pro Level

## Events, Gefahren und Modifikatoren

Events sorgen dafür, dass keine Runde gleich läuft. Jedes Event wird 1 Sekunde vorher angekündigt (Symbol am Rand), damit es fair bleibt.

**Events während eines Levels**

- Beleidigung: Sprechblase, der andere wird wütend (gibt es schon)
- Schlagloch: Alle werden ein Stück nach oben geschleudert, gezogene Brüder rutschen dir aus dem Finger
- Fan am Fenster: Ein Bruder will hin, der andere ist eifersüchtig
- Presse-Fotograf: Blitz, 2 Sekunden siehst du nur Umrisse
- Stromausfall: Licht aus, nur die Wut-Leisten leuchten
- Setlist-Streit: Ein Zettel liegt in der Mitte, wer ihn zuerst hat, provoziert den anderen
- Tamburin-Mann: Ein drittes Bandmitglied läuft herum und steht im Weg

**Modifikatoren (Endlos-Modus und Bonuslevels)**

Modifikatoren gelten für einen ganzen Abschnitt und stapeln sich im Endlos-Modus.

- Kater: Brüder bewegen sich langsamer, aber Wut steigt schneller
- Spiegelverkehrt: Der Bildschirm ist gespiegelt
- Hitzewelle: Beruhigen wirkt nur halb so gut
- Doppelte Ladung: Alle Gegenstände erscheinen doppelt
- Rutschiger Boden: Losgelassene Brüder rutschen noch ein Stück weiter
- Kein Tippen: Beruhigen geht nur mit Gegenständen

## Band und Charaktere

Kev und Del bleiben die Hauptfiguren. Später kommen weitere Bandmitglieder dazu, die das Spiel verändern, und alternative Brüderpaare mit eigenen Eigenschaften.

| Figur | Eigenschaft im Spiel |
| --- | --- |
| Kev (Parka, Sonnenbrille) | Wird schnell wütend, beruhigt sich aber auch schnell |
| Del (Bucket Hat) | Wird langsam wütend, bleibt dann aber lange sauer |
| Tamburin-Mann | Läuft im Weg rum, schläft manchmal ein und wird zum Hindernis |
| Drummer | Gibt den Takt vor: Alle 4 Schläge steigt die Wut kurz, wer im Takt tippt, beruhigt stärker |
| Manager (du selbst, als kleine Figur) | Taucht nur bei Power-ups auf |

Freischaltbare Brüderpaare für den Endlos-Modus:

- Die Zwillinge: sehen gleich aus, du musst dir merken, wer wer ist
- Vater und Sohn: einer langsam, einer schnell
- Die Schwestern: beleidigen sich nicht, sondern ignorieren sich (Wut steigt, wenn sie zu weit auseinander sind, also genau umgekehrt)

## Progression und Freischaltbares

Der Kreislauf ist: Level spielen, Plektren und Sterne sammeln, Neues freischalten, schwerere Levels schaffen.

1. Level spielen (30 bis 90 Sekunden)
2. Belohnung: Plektren als Währung, Sterne für den Fortschritt
3. Sterne schalten Schauplätze frei (z. B. 20 Sterne für den Pub)
4. Plektren gibst du im Shop aus: Power-ups, Outfits, Bus-Lackierungen
5. Neue Power-ups und Figuren machen schwerere Levels und längere Endlos-Runs möglich

**Kosmetik (nur Optik, kein Vorteil)**

- Outfits: Parka, Trainingsjacke, Fischerhut, Anzug, Hühnerkostüm als Gag
- Bus-Lackierungen: Union Jack, Tarnfarbe, Psychedelic
- Gig-Plakate, die nach jedem Headliner-Level in einer Sammlung landen

**Erfolge**

- "Brüderliebe": Ein Level ohne dass die Wut über 50 % geht
- "Zero Tolerance": 100 Bierdosen weggetippt
- "Reunion Tour": Endlos-Modus über 10 Städte

Alles wird in localStorage gespeichert, kein Login, keine Werbung.

## Look und Juice

Der PS1-Look aus der Demo bleibt, wird aber lebendiger. Weil das Spiel ohne Sound funktionieren soll, muss alles Wichtige sichtbar sein.

- Jeder Schauplatz hat eine eigene Farbpalette (Bus: Grün und Weinrot, Pub: Braun und Gold, Festival: Nachtblau und Scheinwerfergelb)
- Wut sichtbar in Stufen: ruhig, genervt, rot im Gesicht, zitternd mit Dampf, kurz vorm Explodieren mit Blinken
- Screenshake und kurze Zeitlupe, wenn es fast zur Prügelei kommt ("Near Miss")
- Comic-Wörter statt Sound: "SLAM", "GLUG", "BONK"
- Optional später: Vibration bei Schlaglöchern und Prügelei, falls das Handy es kann
- Gig-Szene nach Headliner-Levels: Crowd aus Pixel-Köpfen, je nach Sternen voller
- Später möglich: echter 3D-PS1-Look mit Three.js (wackelnde Vertices, Nebel). Für den Anfang reicht 2D-Canvas, das ist einfacher und läuft auf jedem Handy

## Handy und PC

Das Spiel läuft im Browser auf Handy und PC. Auf dem Handy hochkant im Vollbild, auf dem PC in einem 3:4-Fenster, mittig im Browser.

|  | Handy | PC |
| --- | --- | --- |
| Bildformat | 9:16, Render-Auflösung 180x320 | 3:4, Render-Auflösung 240x320 |
| Steuerung | Finger: ziehen und tippen, Multitouch für beide Brüder gleichzeitig | Maus: gedrückt halten und ziehen, Klick zum Beruhigen |
| Extra-Tasten | - | Leertaste oder P = Pause, R = Neustart, 1 und 2 = Power-ups, Esc = Menü |
| Rand | Kein Rand | Dunkler Rand mit dezentem Muster, große Scanlines |

Damit beide Formate fair sind, ist das Spielfeld in jedem Level 180 Pixel breit und liegt mittig. Auf dem PC nutzen die zusätzlichen 30 Pixel links und rechts nur Deko und HUD (z. B. Bus-Fenster, Wut-Leisten an der Seite), nicht mehr Platz zum Spielen. Das Format wird beim Start erkannt und bei Größenänderung des Fensters angepasst, immer pixelgenau hochskaliert.

## Umsetzungsplan

Das Spiel entsteht in 5 Phasen. Der Endlos-Modus kommt schon in Phase 3, weil er mit wenig Aufwand viel Spielzeit bringt.

&#91;embedded content: Umsetzung in 5 Phasen\]

Die Aufgaben pro Phase zum Abhaken:

**Phase 1: Grundgerüst**

- [ ] Code in mehrere Dateien aufteilen, ohne Bundler
- [ ] Hauptmenü, Pause, Level-Auswahl
- [ ] Levels, Gegenstände und Events als Daten-Objekte
- [ ] Fortschritt in localStorage speichern

* [ ] Testmodus mit allem freigeschaltet und Debug-Menü (`TEST_MODE` in `config.js`)
* [ ] Projekt für GitHub Pages anlegen: `index.html` im Hauptordner, nur relative Pfade, README

- [ ] PC-Unterstützung: 3:4-Format mit 240x320, Maussteuerung und Tastenkürzel

**Phase 2: Tour, Teil 1**

- [ ] Schauplatz Tourbus mit 10 Levels und Tutorial im ersten Level
- [ ] Schauplatz Proberaum mit Lautstärke-Regel und 10 Levels
- [ ] Sterne-System und Level-Ergebnis-Screen
- [ ] Gute Gegenstände (Tee, Pommes, Kopfhörer) und neue Events (Schlagloch, Fan am Fenster)

**Phase 3: Never-Ending Tour**

- [ ] Endlos-Modus mit 20-Sekunden-Abschnitten und Übergängen
- [ ] Modifikatoren, die sich stapeln
- [ ] Highscore-Liste und "Städte geschafft"-Anzeige

**Phase 4: Mehr Welt**

- [ ] Pub, Backstage, Festival-Bühne, Hotel mit ihren Regeln
- [ ] Power-ups und Shop mit Plektren
- [ ] Outfits, Bus-Lackierungen, Tamburin-Mann und Drummer

**Phase 5: Feinschliff**

- [ ] Screenshake, Near-Miss-Zeitlupe, Comic-Wörter, Gig-Szenen
- [ ] Erfolge
- [ ] Balancing: jedes Level einmal selbst durchspielen
- [ ] TEST\_MODE auf false stellen und auf GitHub Pages veröffentlichen

## Prompt für Claude Code

Dieses Dokument als Markdown exportieren, als `KONZEPT.md` neben `brothers.html` in den Projektordner legen und dann diesen Prompt geben:

```
In diesem Ordner liegen brothers.html (spielbare Demo) und KONZEPT.md (Spielkonzept mit Umsetzungsplan). Mach aus der Demo das Spiel aus dem Konzept.

Regeln:
- Reines HTML/CSS/JavaScript ohne Build-Tools, kommt auf GitHub Pages (index.html im Hauptordner, nur relative Pfade). Solange TEST_MODE in config.js an ist, ist alles freigeschaltet
- Auf Handy (hochkant, Touch) und PC (3:4-Fenster, Maus und Tastatur) spielbar, ohne Sound, PS1-Look aus der Demo beibehalten (180x320, Dithering, Scanlines, Pixel-Schrift)
- Arbeite die Phasen aus KONZEPT.md der Reihe nach ab. Fang mit Phase 1 an und hör danach auf, damit ich testen kann
- Zeig mir vor jeder Phase kurz deinen Plan
- Nach jedem Schritt muss das Spiel spielbar bleiben
- Teil den Code in mehrere Dateien auf (z. B. game.js, input.js, render.js, levels.js, ui.js), aber ohne Bundler
- Level, Gegenstände und Events als Daten-Objekte, damit ich neue leicht selbst hinzufügen kann
- Code verständlich und kommentiert
```
