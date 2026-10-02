import { Game } from './game.js';
import { Progress } from './progress.js';
import { Stage } from './stage.js';
import { UI } from './ui.js';

function boot() {
  const ui = new UI();
  let stage;
  try {
    stage = new Stage(document.getElementById('canvasHost'), { clock: ui.el.clockSpot, mascot: ui.el.mascotSpot });
  } catch (err) {
    console.error(err);
    document.getElementById('nogl').hidden = false;
    return;
  }
  const game = new Game(stage, ui, new Progress());
  game.goTitle();
  // Handy for debugging / automated tests.
  window.__clockQuest = { game, stage };
}

boot();
