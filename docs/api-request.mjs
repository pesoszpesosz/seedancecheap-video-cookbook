import { applyWorksheetLinks } from './links.mjs';

export function makeRequest(prompt, requestId) {
  if (!/^[A-Za-z0-9_-]{1,80}$/.test(requestId)) {
    throw new Error('Use 1–80 letters, digits, underscores or hyphens for this example ID.');
  }
  if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > 3000) {
    throw new Error('Write a scene prompt of 1–3000 characters.');
  }
  return {
    prompt,
    ratio: '16:9',
    size: '1280x720',
    request_id: requestId,
    free_trial: true,
    auto_retry: false
  };
}

export function commandExamples(requestId, shell) {
  if (!/^[A-Za-z0-9_-]{1,80}$/.test(requestId)) throw new Error('Invalid example request ID.');
  const windows = shell === 'powershell';
  const curl = windows ? 'curl.exe' : 'curl';
  const key = windows ? '$env:SEEDANCECHEAP_API_KEY' : '$SEEDANCECHEAP_API_KEY';
  const base = 'https://seedancecheap.com';
  const auth = ' -H "Authorization: Bearer ' + key + '"';
  const jsonFlags = ' --fail-with-body --silent --show-error --max-time 90';
  return {
    submit: curl + jsonFlags + ' "' + base + '/v1/videos/generations"' + auth +
      ' -H "Content-Type: application/json" --data-binary "@request.json" --output create-response.json',
    recover: curl + jsonFlags + ' "' + base + '/v1/videos/by-request/' + requestId + '"' + auth +
      ' --output recovered-job.json',
    poll: curl + jsonFlags + ' "' + base + '/v1/videos/vid_YOUR_ID"' + auth + ' --output job.json',
    download: curl + ' --fail --silent --show-error "' + base + '/v1/videos/vid_YOUR_ID/content"' +
      auth + ' --output pilot-video.mp4'
  };
}

if (typeof document !== 'undefined') {
  applyWorksheetLinks(document, location.search);
  const requestId = document.getElementById('request-id');
  const prompt = document.getElementById('pilot-prompt');
  const shell = document.getElementById('command-shell');
  const preview = document.getElementById('request-json');
  const download = document.getElementById('download-request');
  const status = document.getElementById('request-status');
  let prepared = null;

  function render() {
    try {
      prepared = makeRequest(prompt.value, requestId.value);
      preview.textContent = JSON.stringify(prepared, null, 2);
      const commands = commandExamples(prepared.request_id, shell.value);
      for (const name of Object.keys(commands)) {
        document.getElementById(name + '-command').textContent = commands[name];
      }
      download.disabled = false;
      status.classList.remove('error');
      status.textContent = 'Prepared locally. Download the exact JSON before submitting.';
    } catch (error) {
      prepared = null;
      preview.textContent = '';
      for (const name of ['submit', 'recover', 'poll', 'download']) {
        document.getElementById(name + '-command').textContent = 'Complete the request fields first.';
      }
      download.disabled = true;
      status.classList.add('error');
      status.textContent = error.message;
    }
  }

  for (const field of [requestId, prompt]) field.addEventListener('input', render);
  shell.addEventListener('change', render);
  download.addEventListener('click', () => {
    render();
    if (!prepared) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(prepared, null, 2) + '\n'],
      { type: 'application/json;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'request.json';
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    status.textContent = 'JSON download requested. Keep the file and request ID together.';
  });
  render();
}
