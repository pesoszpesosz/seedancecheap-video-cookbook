/** Inspect the same elapsed timestamp in two unchanged, independently playable clips. */
export function setupMotionComparison(root) {
  const players = [...root.querySelectorAll('video')];
  const controls = root.querySelector('.compare-controls');
  const range = controls?.querySelector('input[type="range"]');
  const output = controls?.querySelector('output');
  const status = controls?.querySelector('[role="status"]');
  const fallbacks = controls?.querySelector('.compare-fallbacks');
  const jumps = [...(controls?.querySelectorAll('[data-compare-time]') || [])];
  if (players.length !== 2 || !range || !output || !status) return;

  let ready = false;
  let failed = false;
  let length = 0;
  const enable = value => {
    range.disabled = !value;
    jumps.forEach(button => { button.disabled = !value; });
  };
  const compare = value => {
    if (!ready) return;
    const time = Math.max(0, Math.min(Number(value) || 0, length));
    players.forEach(player => {
      player.pause();
      // Stay on the last decodable frame rather than seeking past a shorter file.
      player.currentTime = Math.min(time, Math.max(0, player.duration - 0.001));
    });
    range.value = String(time);
    range.setAttribute('aria-valuetext', `${time.toFixed(2)} seconds`);
    output.value = `${time.toFixed(2)}s`;
    const message = 'Both clips paused. The same timestamp can show different movement.';
    if (status.textContent !== message) status.textContent = message;
  };
  const load = () => {
    if (failed || ready || !players.every(p => Number.isFinite(p.duration) && p.duration > 0)) return;
    length = Math.max(...players.map(p => p.duration));
    range.max = String(length);
    ready = true;
    enable(true);
    status.textContent = 'Choose a time to inspect the source and result together.';
  };
  const fail = () => {
    failed = true;
    ready = false;
    players.forEach(player => player.pause());
    enable(false);
    status.textContent = 'The comparison could not load. Open either video below, or reload to try again.';
    if (fallbacks) fallbacks.hidden = false;
  };
  range.addEventListener('input', () => compare(range.value));
  jumps.forEach(button => button.addEventListener('click', () =>
    compare(button.dataset.compareTime === 'end' ? length : button.dataset.compareTime)));
  players.forEach(player => {
    player.addEventListener('loadedmetadata', load);
    player.addEventListener('error', fail);
    player.addEventListener('play', () => {
      if (ready) status.textContent = 'Playing individually. Choose a comparison time to pause both.';
    });
  });
  controls.hidden = false;
  if (players.some(player => player.error)) fail();
  else load();
}
