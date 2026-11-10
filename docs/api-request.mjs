import { applyWorksheetLinks, isWorksheetChannel } from './links.mjs?v=201614d83327';

export const pilotModels = {
  'seedance-2.5': {duration:30, credits:1},
  'seedance-2.0': {duration:15, credits:0.5},
  'veo-3.1': {duration:8, credits:0.5, paidOnly:true},
  'veo31-text-8s-720': {duration:8, credits:0.25, paidOnly:true, availabilityJson:true},
  'veo31-ingredients-8s-720': {duration:8, credits:0.25, paidOnly:true, availabilityJson:true, maxReferences:3}
};

const pilotSizes = {'16:9':'1280x720', '9:16':'720x1280'};

const pilotStarters = {
  'outside-line': {
    idPrefix: 'outside_line_',
    intro: 'Outside Line starter. This proposed text-to-video prompt adapts an original code-rendered race. On a returned take, check that both cars stay visible and the overtake is clear before the finish.',
    prompt: 'Eight seconds, vertical 9:16, one overhead tracking shot of a floodlit closed racetrack. From the first frame a teal car brakes into a hairpin while a slightly trailing amber car stays on the wider line. At 1–4 seconds keep both cars and both lane edges visible as they round the bend, wheels gripping the road and bodywork clear of the barriers. At 4–6 seconds both cars straighten and the amber car draws level, then edges ahead. Track the gap without cutting away. At 6–8 seconds the amber car crosses a painted finish stripe first. Keep both cars on the road with a visible gap between them. Engine and tire sound, a short chime at the crossing, no speech or on-screen text.'
  },
  'the-catch': {
    idPrefix: 'the_catch_',
    intro: 'The Catch starter. This proposed text-to-video prompt adapts an original code-rendered suspense short. Review the gap before impact and the cage foot meeting the pin on a returned take.',
    prompt: 'Eight seconds, vertical 9:16, a single tracking shot inside a dark industrial freight shaft with no people. In the first half-second a taut cable snaps and the steel cage begins to drop. Follow the cage downward while the evenly spaced wall ribs sweep upward. Between seconds 2 and 3 an orange safety pin extends from the right wall below the cage foot. Frame both the pin and the falling foot with a visible gap before contact. Around second 3.5 the foot lands on top of the pin and the cage stops with one brief rattle. Keep the foot resting on the pin, with no overlap or clipping. Hold on the contact and pull back slightly as a small green latch light comes on. Cable snap, rushing air and one metal impact, no speech, no music, no text.'
  }
};

function referenceError(ids, max) {
  if (!Array.isArray(ids)) return 'Use an ordered list of private image reference IDs.';
  if (!max) return ids.length ? 'The selected recipe does not accept these image references.' : '';
  if (ids.length < 1 || ids.length > max) return 'Enter one to three private image reference IDs.';
  if ([...ids].some(id => typeof id !== 'string' || !/^ref_[a-f0-9]{32}$/.test(id))) {
    return 'Enter one valid ref_ ID per line. Use the IDs returned for your private PNG uploads.';
  }
  if (new Set(ids).size !== ids.length) return 'Enter each image reference ID once.';
  return '';
}

export function makeRequest(prompt, requestId, model='seedance-2.5', funding='', ratio='16:9', referenceIds=[]) {
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
  const problem = referenceError(referenceIds, details.maxReferences);
  if (problem) throw new Error(problem);
  return {
    model,
    duration:details.duration,
    prompt,
    ratio,
    size: pilotSizes[ratio],
    request_id: requestId,
    free_trial: funding === 'trial',
    auto_retry: false,
    ...(referenceIds.length ? {reference_ids:[...referenceIds]} : {})
  };
}

function availabilityCommand(model, shell) {
  const curl = shell === 'powershell' ? 'curl.exe' : 'curl';
  return curl + ' --fail-with-body --silent --show-error --max-time 15 "' +
    'https://seedancecheap.com/api/availability?model=' + model + '"';
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
    availability: availabilityCommand(model, shell),
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
  const entry = new URLSearchParams(location.search);
  applyWorksheetLinks(document, location.search);
  const sources = entry.getAll('from');
  const campaigns = entry.getAll('campaign');
  if (sources.length === 1 && (isWorksheetChannel(sources[0]) || sources[0] === 'other') &&
      campaigns.length === 1 && /^[a-zA-Z0-9_-]{1,100}$/.test(campaigns[0])) {
    for (const link of document.querySelectorAll('[data-site-link]')) {
      const destination = new URL(link.href);
      destination.searchParams.set('utm_campaign', campaigns[0]);
      link.href = destination.href;
    }
  }
  const requestId = document.getElementById('request-id');
  const prompt = document.getElementById('pilot-prompt');
  const shell = document.getElementById('command-shell');
  const model = document.getElementById('pilot-model');
  const format = document.getElementById('pilot-format');
  const starters = entry.getAll('starter');
  const starter = starters.length === 1 && Object.hasOwn(pilotStarters, starters[0]) ? pilotStarters[starters[0]] : null;
  if (starter) {
    model.value = 'veo31-text-8s-720';
    format.value = '9:16';
    document.getElementById('pilot-intro').textContent =
      starter.intro;
    if (prompt.value === prompt.defaultValue) {
      prompt.value = starter.prompt;
    }
    if (requestId.value === requestId.defaultValue) {
      const id = globalThis.crypto?.randomUUID?.();
      requestId.value = id ? starter.idPrefix + id : '';
    }
  }
  const linkedModels = entry.getAll('model');
  if (linkedModels.length === 1 && Object.hasOwn(pilotModels, linkedModels[0])) {
    model.value = linkedModels[0];
  }
  const funding = document.getElementById('pilot-funding');
  const linkedRatios = entry.getAll('ratio');
  if (linkedRatios.length === 1 && Object.hasOwn(pilotSizes, linkedRatios[0])) {
    format.value = linkedRatios[0];
  }
  const trialOption = document.getElementById('trial-funding-option');
  const referenceFields = document.getElementById('ingredient-fields');
  const referenceInput = document.getElementById('ingredient-ids');
  const referenceStatus = document.getElementById('ingredient-error');
  const availability = document.getElementById('model-availability');
  const rawAvailability = document.getElementById('raw-availability');
  const rawLink = rawAvailability.querySelector('a');
  const preflight = document.getElementById('availability-command');
  const availabilityPage = new URL(availability.href);
  const terms = document.getElementById('pilot-terms');
  const preview = document.getElementById('request-json');
  const download = document.getElementById('download-request');
  const status = document.getElementById('request-status');
  let prepared = null;

  function render() {
    try {
      const details=pilotModels[model.value];
      if (!details) {
        preflight.textContent = 'Choose a listed pilot model.';
        throw new Error('Choose a listed pilot model.');
      }
      preflight.textContent = availabilityCommand(model.value, shell.value);
      trialOption.disabled = details.paidOnly === true;
      if (trialOption.disabled && funding.value === 'trial') funding.value = '';
      if (!Object.hasOwn(pilotSizes, format.value)) throw new Error('Choose a listed 720p format.');
      const availabilityUrl = new URL(availabilityPage);
      availabilityUrl.searchParams.set('model', model.value);
      rawAvailability.hidden = !details.availabilityJson;
      if (details.availabilityJson) {
        const jsonUrl = new URL(availabilityUrl);
        jsonUrl.pathname = '/api/availability';
        jsonUrl.hash = '';
        rawLink.href = jsonUrl.href;
        availabilityUrl.searchParams.set('ratio', format.value);
        availabilityUrl.searchParams.set('utm_content', 'quote_review');
      }
      availability.href = availabilityUrl.href;
      const needsReferences = Boolean(details.maxReferences);
      referenceFields.hidden = !needsReferences;
      referenceInput.disabled = !needsReferences;
      const referenceIds = needsReferences ? referenceInput.value.split(/\r?\n/).map(id => id.trim()).filter(Boolean) : [];
      const size = pilotSizes[format.value];
      terms.textContent = `${details.duration}-second request · ${details.credits} credit if paid · ${format.value} · requested ${size.replace('x', '×')}`;
      const problem = referenceError(referenceIds, details.maxReferences);
      const showReferenceError = Boolean(problem && (referenceIds.length || funding.value));
      referenceStatus.textContent = showReferenceError ? problem : '';
      referenceInput.setAttribute('aria-invalid', String(showReferenceError));
      if (problem && (referenceIds.length || funding.value)) {
        throw new Error('Check the image reference field above.');
      }
      prepared = makeRequest(prompt.value, requestId.value, model.value, funding.value, format.value, referenceIds);
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
      for (const name of ['submit', 'recover', 'poll', 'download']) {
        document.getElementById(name + '-command').textContent = 'Complete the request fields first.';
      }
      download.disabled = true;
      status.classList.add('error');
      status.textContent = error.message;
    }
  }

  for (const field of [requestId, prompt, referenceInput]) field.addEventListener('input', render);
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
