import {applyWorksheetLinks} from './links.mjs?v=20261025pinterest';
applyWorksheetLinks(document, location.search);
const scenes = {
  delivery: {file:'action-delivery.mp4',poster:'action-delivery-poster.jpg',title:'Delivered intact.',description:'An incoming punch, a quick reversal, and a delivery worth the trouble. Watch the red bag.',duration:'15-second original take',format:'Portrait 720p',provenance:'A new internal Seedance 2.5 model test from 23 October 2026. Native 720 × 1280, generated with audio. This is the complete received file: no cuts or upscaling. The test did not include Studio checkout or customer delivery.',original:'action-delivery-original-prompt.txt',summary:'One text prompt describes two fictional adults, a fight reversal, an intact cake and a final comic reaction. No reference images or videos were uploaded by this chat. The complete submitted prompt is included below.',starter:'Photorealistic action scene with two fictional adult stunt performers. A punch is already moving as the shot starts. One performer slips outside it, redirects the arm and lands one compact staged body counter. Keep both performers and their feet readable in a medium-wide side view. Natural weight, clear contact and recoil, normal speed, complete recovery. No blood, weapons, slow motion, captions or logos.'},
  fight: {file:'action-counter.mp4',poster:'action-counter-poster.jpg',title:'Watch the counter.',description:'A staff swing. A duck and pivot. An elbow counter. The edit keeps the attack and the response together.',duration:'8.4-second edit',format:'Portrait',provenance:'Edited from one historical 30-second generation. The source was 720 × 1280; this branded export is 1080 × 1920 after upscaling. Matching source sound was edited and levelled; no music was added.',original:'action-counter-original-prompt.txt',summary:'The original brief used a detailed text prompt and a clothing-only reference. This edit uses source intervals 3.875–8.5s and 10.75–14.5s.',starter:'Photorealistic action scene with two fictional adult stunt performers. A punch is already moving as the shot starts. One performer slips outside it, redirects the arm and lands one compact staged body counter. Keep both performers and their feet readable in a medium-wide side view. Natural weight, clear contact and recoil, normal speed, complete recovery. No blood, weapons, slow motion, captions or logos.'},
  drama: {file:'action-empty-chair.mp4',poster:'action-empty-chair-poster.jpg',title:'One ring. One lie.',description:'A ring hits the plate. An explanation falls apart. One chair stays empty. Watch the complete take.',duration:'30-second original take',format:'Portrait 480p',provenance:'An internal Seedance 2.5 drama model test from 25 October 2026. Native 480 × 854 with generated audio. The complete 30.08-second received file is shown: no cuts or upscaling. This test did not include Studio checkout or customer delivery. Details can vary from the prompt.',original:'action-empty-chair-prompt.txt',summary:'The successful text prompt specifies two fictional adults, a ring, an uneasy conversation, a departure and a final phone gesture. An earlier detailed request was rejected without producing a video; this is the complete result of the simplified prompt. Download the actual successful prompt below.',starter:'Original drama with two fictional adults in a late-night cafe. One places a sealed letter on the table, waits while the other adult reacts, then leaves. Keep both actors and the letter consistent across three short shots, with natural gestures and one clear final reaction. Soft practical side lighting. No readable text, logos or music.'},
  product: {file:'action-car.mp4',poster:'action-car-poster.jpg',title:'Put the camera to work.',description:'One fictional concept car, moving light and a camera that arcs from the side toward the front.',duration:'30-second example',format:'Wide',provenance:'Our existing Seedance 2.5 concept-car example, generated from text. A fictional vehicle, not a test of reproducing a real product or an endorsement by a car brand.',original:'action-car-original-prompt.txt',summary:'The original prompt describes a pearl-white fictional concept car, wet neon streets, a side track and a frontward camera arc. The full prompt is included below.',starter:'Photorealistic product film. One unbranded pearl-white fictional sports car drives past camera on a wet city street at night. A low side tracking shot keeps all visible wheels grounded and the vehicle shape coherent. Blue and amber practical lights reflect naturally on the road and bodywork. Sharp normal-speed movement. No people, logos, text, extra wheels or slow motion.'}
};
const video=document.querySelector('#scene-video');
for(const button of document.querySelectorAll('[data-scene]'))button.addEventListener('click',()=>{
  const scene=scenes[button.dataset.scene];
  video.pause();video.poster=scene.poster;video.querySelector('source').src=scene.file;video.load();video.setAttribute('aria-label',scene.title+' AI-generated example');
  for(const choice of document.querySelectorAll('[data-scene]'))choice.setAttribute('aria-pressed',String(choice===button));
  document.querySelector('#screen').classList.toggle('wide',button.dataset.scene==='product');
  document.querySelector('#screen-label').textContent=button.dataset.scene==='product'?'AI-generated fictional vehicle. Existing team example.':['delivery','drama'].includes(button.dataset.scene)?'AI-generated fictional adults. New internal model test.':'AI-generated fictional adults. Existing team example.';
  for(const [id,value] of Object.entries({'scene-title':scene.title,'scene-description':scene.description,'scene-duration':scene.duration,'scene-format':scene.format,'scene-provenance':scene.provenance}))document.getElementById(id).textContent=value;
  document.querySelector('#download-scene').href=scene.file;document.querySelector('#scene-starter').value=scene.starter;
  document.querySelector('#prompt-details').classList.toggle('hidden',!scene.original);document.querySelector('#unavailable-prompt').classList.toggle('hidden',!!scene.original);
  document.querySelector('#prompt-details').open=false;
  if(scene.original){document.querySelector('#original-prompt').href=scene.original;document.querySelector('#original-summary').textContent=scene.summary;}
  document.querySelector('#copy-status').textContent='New starter ready. Edit it before copying; this is a planning draft.';
});
document.querySelector('#copy-starter').addEventListener('click',async()=>{
  const field=document.querySelector('#scene-starter'),status=document.querySelector('#copy-status');
  if(!field.value.trim()){status.textContent='Write a scene before copying.';field.focus();return;}
  let timeout;
  try{await Promise.race([navigator.clipboard.writeText(field.value.trim()),new Promise((_,reject)=>{timeout=setTimeout(()=>reject(new Error('Clipboard unavailable')),1500);})]);status.textContent='Starter copied. Review the current model and settings in Studio.';}catch{field.focus();field.select();status.textContent='Select and copy the starter using your browser.';}finally{clearTimeout(timeout);}
});

function openSharedScene(){
  const match=/^#scene-(delivery|fight|drama|product)$/.exec(location.hash);
  if(match)document.querySelector(`[data-scene="${match[1]}"]`).click();
}
openSharedScene();
window.addEventListener('hashchange',openSharedScene);

const remixPlayers=[document.querySelector('#remix-source'),document.querySelector('#remix-result')];
const remixStatus=document.querySelector('#remix-status');
let remixPlayRequest=0;
document.querySelector('#play-remix').addEventListener('click',async()=>{
  const request=++remixPlayRequest;
  video.pause();
  for(const player of remixPlayers){player.pause();player.currentTime=0;player.muted=true;}
  remixStatus.textContent='Starting both clips silently…';
  const results=await Promise.allSettled(remixPlayers.map(player=>player.play()));
  if(request!==remixPlayRequest)return;
  if(results.some(result=>result.status==='rejected')){
    for(const player of remixPlayers)player.pause();
    remixStatus.textContent='Playback did not start for both clips. Use the individual player controls.';
  }else remixStatus.textContent='Playing both silently from the start. Guidance can change timing; the clips are not frame-aligned.';
});
document.querySelector('#pause-remix').addEventListener('click',()=>{
  remixPlayRequest++;
  for(const player of remixPlayers)player.pause();
  remixStatus.textContent='Both clips paused. Each player can also be reviewed independently.';
});
