# ⏰ Clock Quest

A 3D game (built with [Three.js](https://threejs.org)) that teaches kids to read analogue clocks.
A friendly chick called **Tock** guides them through six themed worlds, from "which hand is which?"
all the way to "it's 8:27!".

## Play it

**Just open `index.html` in a modern browser** (Chrome, Edge, Firefox, Safari). No server, install or
internet connection needed: the game, Three.js and the font are all bundled in this folder.
It works on laptops, tablets and phones (touch or mouse, portrait or landscape).

> Tip: tap the 🔊 / 🗣️ buttons in the top bar to turn sound effects and read-aloud on or off.
> Read-aloud uses the browser's built-in voice, so it works offline and helps younger children who
> can't read everything yet.

## How it teaches

| World | Skill | Clock scaffolding |
|---|---|---|
| 1 🌼 Meet the Hands | Hour hand vs minute hand, numbers 1–12, 60 minutes = 1 hour | Hands are colour-coded: **hour = red & short**, **minute = blue & long** |
| 2 🍎 O'Clock Orchard | O'clock times | |
| 3 ⛵ Half-Past Harbor | Half past | A blue "slice" fills as the minute hand sweeps round |
| 4 🏰 Quarter Quest | Quarter past / quarter to | Blue slice for *past*, orange slice for *to* |
| 5 🌲 Five-Minute Forest | Counting minutes by fives | Small blue minute numbers (0, 5, 10 …) around the edge |
| 6 ⛰️ Minute Mountain | Any minute | Minute tick marks + minute numbers |

Each world has the same loop:

1. **Mini-lesson** – Tock explains with the clock animating through examples, ending with a
   "your turn" task (drag the hands yourself).
2. **Six questions**, mixing *read the clock* (multiple choice) and *set the clock* (drag the hands).
   World 1 uses "tap the hour hand" and "which number is the hour hand pointing at?".
3. **Stars** – 1–3 stars for first-try answers. Everybody always gets at least one star and moves on;
   there is no "game over". The next world unlocks after earning a star.

A few details that are there on purpose:

* **Colour-coded digital time** – in answers the hour is red and the minutes are blue, matching the hands.
* **Realistic hands** – dragging the minute hand past 12 moves the hour hand on, like a real clock.
* **Wrong answers are chosen to match real mistakes**: swapped hands (3:00 vs 12:15), being one hour
  out (the hour hand sits *between* numbers), and mis-counting minutes.
* **Gentle feedback** – a first miss gets a hint (and the relevant hand pulses; for "set the clock" it
  says which hand is right); a second miss shows the answer. The 💡 Hint button is always free.
* **Free play** – a sandbox to drag the hands, hear the time read aloud, and switch the scaffolding on/off.

### Parent controls

* `index.html?unlock=all` – unlock every world (e.g. to jump straight to minutes).
* **Reset progress** link on the title screen clears stars and the saved name.
* Progress is saved in the browser (`localStorage`) on that device only; nothing is sent anywhere.

## Developing

```bash
cd clock-game
npm install          # three + esbuild
npm run build        # bundles src/ into dist/game.js (commit the result so index.html keeps working offline)
npm run watch        # rebuild on change
npm test             # unit tests for the clock maths, drag logic and question generator
```

Layout of `src/`:

| File | What it does |
|---|---|
| `clockTime.js` | Pure clock maths: formatting, phrases ("quarter to 4"), angles, drag → time (unit-tested) |
| `levels.js` | The six worlds: themes, difficulty, lesson scripts. **Edit this to change the teaching.** |
| `questions.js` | Builds a round of questions, plausible wrong answers, hints, star rules (unit-tested) |
| `game.js` | Game flow / state machine: title → map → lesson → quiz → results, plus free play |
| `clock3d.js` | The 3D alarm clock, hand dragging (ray → clock plane → angle), progress slice |
| `mascot.js` | Tock, built from primitives, with moods and eyes that follow the pointer |
| `backdrop.js` | Themed scenery. Static props are merged into one mesh (≈120 draw calls per frame in total) |
| `effects.js` | Confetti and stars |
| `stage.js` | Renderer; draws each 3D piece into the screen box of a DOM element |
| `ui.js`, `style.css`, `index.html` | The HTML/CSS interface |
| `audio.js` | Synthesised sound effects (WebAudio) and read-aloud (SpeechSynthesis) |
| `progress.js` | Saved stars / name / settings |

How the layout works: the 3D clock and Tock render into the on-screen rectangles of two transparent
`<div>`s (`#clockSpot`, `#mascotSpot`), so **CSS decides where they go** and the same code handles
landscape, portrait and small phones.

### Adding or changing a world

Add an entry to `LEVELS` in `src/levels.js`: pick a `theme` (colours + a `prop` scenery set from
`backdrop.js`), the `minutes` the questions may use, a `plan` of question types
(`read`, `set`, `identify`, `pointsAt`) and a `lesson` (each step moves the clock to a time and
shows some text; a step with `try` waits for the child to drag the hands). Then `npm run build`.

## Credits

* [Three.js](https://threejs.org) (MIT)
* [Baloo 2](https://fonts.google.com/specimen/Baloo+2) font (SIL Open Font License, see `fonts/OFL.txt`)
