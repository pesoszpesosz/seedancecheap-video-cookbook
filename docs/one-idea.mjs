import { applyWorksheetLinks } from './links.mjs?v=e203d07328cb';

applyWorksheetLinks(document, location.search);
const scene = document.getElementById('scene');
const prompt = document.getElementById('prompt');
const status = document.getElementById('copy-status');
const copy = document.getElementById('copy');
const lighting = {
  warm: 'Warm sunrise, soft amber reflections, gentle mist above the water.',
  cool: 'Cool blue-hour light, pale cyan reflections, a quiet evening atmosphere.',
  pink: 'Soft pink clouds, rosy reflections, a luminous dreamlike atmosphere.',
};
function updatePrompt() {
  const mood = document.querySelector('input[name="mood"]:checked').value;
  const base = scene.value.trim();
  prompt.value = base ? `${base}\n\n${lighting[mood]}` : '';
  copy.disabled = !base;
  status.textContent = base ? '' : 'Add a scene before copying a prompt.';
}
scene.addEventListener('input', updatePrompt);
for (const radio of document.querySelectorAll('input[name="mood"]')) radio.addEventListener('change', updatePrompt);
copy.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(prompt.value);
    status.textContent = 'Copied. Your next step is to review a tool in Studio.';
  } catch {
    prompt.focus();
    prompt.select();
    status.textContent = 'Prompt selected. Use your device’s Copy command.';
  }
});
updatePrompt();
