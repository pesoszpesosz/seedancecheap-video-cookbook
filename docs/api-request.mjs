import { applyWorksheetLinks } from './links.mjs?v=331413093bc7';

export const pilotModels = {
  'seedance-2.5': {duration:30, credits:1},
  'seedance-2.0': {duration:15, credits:0.5},
  'veo-3.1': {duration:8, credits:0.5, paidOnly:true},
  'veo31-text-8s-720': {duration:8, credits:0.25, paidOnly:true, availabilityJson:true}
};

const pilotSizes = {'16:9':'1280x720', '9:16':'720x1280'};

export function makeRequest(prompt, requestId, model='seedance-2.5', funding='', ratio='16:9') {
  if (!/^[A-Za-z0-9_-]{1,80}$/.test(requestId)) {
    throw new Error('Use 1–80 letters, digits, underscores or hyphens for this example ID.');
  }
  if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > 3000) {
    throw new Error('Write a scene prompt of 1–3000 characters.');
  }
  if (!Object.hasOwn(pilotModels, model)) throw new Error('Choose a listed pilot model.');
  if (!Object.hasOwn(pilotSizes, ratio)) throw new Error('Choose a listed 720p format.');
  if (!['trial','paid'].includes(funding)) throw new Error('Choose trial or paid funding after checking the live terms.');
  const details = pilotModels[model];
  if (funding === 'trial' && details.paidOnly) {
    throw new Error('Choose paid funding explicitly to prepare the Veo 3.1 recipe.');
  }
  return {
    model,
    duration:details.duration,
    prompt,
    ratio,
    size: pilotSizes[ratio],
    request_id: requestId,
    free_trial: funding === 'trial',
    auto_retry: false
  };
}

export function commandExamples(requestId, shell, model='seedance-2.5') {
  if (!/^[A-Za-z0-9_-]{1,80}$/.test(requestId)) throw new Error('Invalid example request ID.');
  if (!Object.hasOwn(pilotModels, model)) throw new Error('Invalid example model.');
  const windows = shell === 'powershell';
  const curl = windows ? 'curl.exe' : 'curl';
  const key = windows ? '$env:SEEDANCECHEAP_API_KEY' : '$SEEDANCECHEAP_API_KEY';
  const base = 'https://seedancecheap.com';
  const auth = ' -H "Authorization: Bearer ' + key + '"';
  const jsonFlags = ' --fail-with-body --silent --show-error --max-time 90';
  return {
    availability: curl + ' --fail-with-body --silent --show-error --max-time 15 "' +
      base + '/api/availability?model=' + model + '"',
    submit: curl + jsonFlags + ' "' + base + '/v1/videos/generations"' + auth +
      ' -H "Content-Type: application/json" --data-binary "@request.json" --output create-response.json',
    recover: curl + jsonFlags + ' "' + base + '/v1/videos/by-request/' + requestId + '"' + auth +
      ' --output recovered-job.json',
    poll: curl + jsonFlags + ' "' + base + '/v1/videos/vid_YOUR_ID"' + auth + ' --output job.json',
    download: curl + ' --location --fail --silent --show-error "' + base + '/v1/videos/vid_YOUR_ID/content"' +
      auth + ' --output pilot-video.mp4'
  };
}

if (typeof document !== 'undefined') {
  applyWorksheetLinks(document, location.search);
  const requestId = document.getElementById('request-id');
  const prompt = document.getElementById('pilot-prompt');
  const shell = document.getElementById('command-shell');
  const model = document.getElementById('pilot-model');
  const funding = document.getElementById('pilot-funding');
  const format = document.getElementById('pilot-format');
  const trialOption = document.getElementById('trial-funding-option');
  const availability = document.getElementById('model-availability');
  const availabilityPage = new URL(availability.href);
  const terms = document.getElementById('pilot-terms');
  const preview = document.getElementById('request-json');
  const download = document.getElementById('download-request');
  const status = document.getElementById('request-status');
  let prepared = null;

  function render() {
    try {
      const details=pilotModels[model.value];
      if (!details) throw new Error('Choose a listed pilot model.');
      trialOption.disabled = details.paidOnly === true;
      if (trialOption.disabled && funding.value === 'trial') funding.value = '';
      const availabilityUrl = new URL(availabilityPage);
      if (details.availabilityJson) {
        availabilityUrl.pathname = '/api/availability';
        availabilityUrl.hash = '';
      }
      availabilityUrl.searchParams.set('model', model.value);
      availability.href = availabilityUrl.toString();
      if (!Object.hasOwn(pilotSizes, format.value)) throw new Error('Choose a listed 720p format.');
      const size = pilotSizes[format.value];
      terms.textContent = `${details.duration}-second request · ${details.credits} credit if paid · ${format.value} · requested ${size.replace('x', '×')}`;
      prepared = makeRequest(prompt.value, requestId.value, model.value, funding.value, format.value);
      preview.textContent = JSON.stringify(prepared, null, 2);
      const commands = commandExamples(prepared.request_id, shell.value, prepared.model);
      for (const name of Object.keys(commands)) {
        document.getElementById(name + '-command').textContent = commands[name];
      }
      download.disabled = false;
      status.classList.remove('error');
      status.textContent = funding.value === 'paid'
        ? 'Prepared locally for paid funding. Running the submit command can use your credits or balance. Save the exact JSON first.'
        : 'Prepared locally for a trial. Trials must be enabled and your account eligible; this route never falls back to paid funding.';
    } catch (error) {
      prepared = null;
      preview.textContent = '';
      for (const name of ['availability', 'submit', 'recover', 'poll', 'download']) {
        document.getElementById(name + '-command').textContent = 'Complete the request fields first.';
      }
      download.disabled = true;
      status.classList.add('error');
      status.textContent = error.message;
    }
  }

  for (const field of [requestId, prompt]) field.addEventListener('input', render);
  shell.addEventListener('change', render);
  model.addEventListener('change', render);
  format.addEventListener('change', render);
  funding.addEventListener('change', render);
  function rememberRequestId() {
    try { history.replaceState({...history.state, seedancecheapPilotRequestId:requestId.value}, ''); }
    catch {} // A browser restriction must not prevent local request preparation.
  }
  requestId.addEventListener('input', rememberRequestId);
  window.addEventListener('pagehide', rememberRequestId);
  // History can restore form controls after the initial module render.
  // The ID has autocomplete off, so preserve it in this page's history entry.
  window.addEventListener('pageshow', () => setTimeout(() => {
    const savedId = history.state?.seedancecheapPilotRequestId;
    if (typeof savedId === 'string' && savedId.length <= 80) requestId.value = savedId;
    render();
  }, 0));
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
