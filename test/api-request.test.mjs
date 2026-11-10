import test from 'node:test';
import assert from 'node:assert/strict';
import {makeRequest, commandExamples, pilotModels} from '../docs/api-request.mjs';

test('each model gets its exact duration and explicit funding without changing the saved input',()=>{
  const prompt='  A folded paper boat — one gentle push.\n';
  for(const [model,duration] of [['seedance-2.0',15],['seedance-2.5',30]])for(const funding of ['trial','paid']){
    const request=makeRequest(prompt,'pilot_001',model,funding);
    assert.equal(request.model,model);
    assert.equal(request.duration,duration);
    assert.equal(request.prompt,prompt);
    assert.equal(request.free_trial,funding==='trial');
    assert.equal(request.auto_retry,false);
    assert.equal(request.request_id,'pilot_001');
  }
  const defaultDraft = makeRequest(prompt,'pilot_001',undefined,'trial');
  assert.equal(defaultDraft.model,'seedance-2.5');
  assert.deepEqual([defaultDraft.ratio,defaultDraft.size],['16:9','1280x720']);
  const vertical = makeRequest(prompt,'pilot_vertical','seedance-2.0','paid','9:16');
  assert.deepEqual([vertical.ratio,vertical.size],['9:16','720x1280']);
});

test('the eight-second Veo text recipe requires explicit paid funding and a supported format',()=>{
  assert.deepEqual(makeRequest('A paper boat.','pilot_veo','veo-3.1','paid','9:16'),{
    model:'veo-3.1',duration:8,prompt:'A paper boat.',ratio:'9:16',size:'720x1280',
    request_id:'pilot_veo',free_trial:false,auto_retry:false
  });
  assert.throws(()=>makeRequest('A paper boat.','pilot_veo','veo-3.1','trial'),/paid funding explicitly/);
  assert.throws(()=>makeRequest('A paper boat.','pilot_veo','veo-3.1','paid','1:1'),/720p format/);
});

test('the quarter-credit Veo recipe uses its exact model ID and preserves explicit funding',()=>{
  const model = 'veo31-text-8s-720';
  const prompt = 'A paper boat.';
  assert.equal(pilotModels[model].credits,0.25);
  for (const [ratio,size] of [['9:16','720x1280'],['16:9','1280x720']]) {
    assert.deepEqual(makeRequest(prompt,'pilot_veo_720',model,'paid',ratio),{
      model,duration:8,prompt,ratio,size,request_id:'pilot_veo_720',free_trial:false,auto_retry:false
    });
  }
  assert.throws(()=>makeRequest(prompt,'pilot_veo_720',model,'trial'),/paid funding explicitly/);
  assert.throws(()=>makeRequest(prompt,'pilot_veo_720',model,'paid','1:1'),/720p format/);
  assert.match(commandExamples('pilot_veo_720','bash',model).availability,/model=veo31-text-8s-720"/);
  assert.equal(pilotModels['veo-3.1'].credits,0.5);
});

test('invalid model, ID and prompt cannot produce an executable pilot',()=>{
  for(const model of ['seedance-3','constructor','__proto__'])assert.throws(()=>makeRequest('A paper boat.','pilot_001',model,'trial'));
  for(const id of ['','id;echo secret','x'.repeat(81)])assert.throws(()=>makeRequest('A paper boat.',id,'seedance-2.5','trial'));
  for(const prompt of ['  ','x'.repeat(3001)])assert.throws(()=>makeRequest(prompt,'pilot_001','seedance-2.5','trial'));
});

test('missing or malformed funding cannot prepare a request or silently select paid mode',()=>{
  for(const funding of [undefined,'','false',false,true,'credits','constructor']){
    assert.throws(()=>makeRequest('A paper boat.','pilot_001','seedance-2.5',funding),/Choose trial or paid/);
  }
});

test('recovery keeps the original ID in both shells without changing or submitting a job',()=>{
  for(const shell of ['bash','powershell']){
    const command=commandExamples('pilot_original_001',shell,'veo-3.1');
    assert.match(command.availability,/\/api\/availability\?model=veo-3\.1/);
    assert.doesNotMatch(command.availability,/Authorization|--data|POST/);
    assert.match(command.download,/--location --fail/);
    assert.doesNotMatch(command.download,/location-trusted/);
    assert.match(command.recover,/\/by-request\/pilot_original_001/);
    assert.match(command.submit,/@request\.json/);
    assert.doesNotMatch(command.recover,/--data|POST/);
  }
});

test('ingredient mode keeps one to three unique private image IDs in input order',()=>{
  const model = 'veo31-ingredients-8s-720';
  const first = 'ref_' + 'b'.repeat(32), second = 'ref_' + 'a'.repeat(32), third = 'ref_' + 'c'.repeat(32);
  const references = [first,second,third];
  const request = makeRequest('Keep the folds visible.','ingredients_001',model,'paid','9:16',references);
  assert.deepEqual(request,{
    model,duration:8,prompt:'Keep the folds visible.',ratio:'9:16',size:'720x1280',
    request_id:'ingredients_001',free_trial:false,auto_retry:false,reference_ids:references,
  });
  references.reverse();
  assert.deepEqual(request.reference_ids,[first,second,third]);
  assert.deepEqual(makeRequest('A boat.','one_image',model,'paid','16:9',[first]).reference_ids,[first]);
  for (const invalid of [[],[first,first],[first,second,third,'ref_'+'d'.repeat(32)],
    ['https://example.com/image.png'],[null],new Array(1)]) {
    assert.throws(()=>makeRequest('A boat.','invalid_images',model,'paid','16:9',invalid),/reference ID|ref_ ID/);
  }
  assert.throws(()=>makeRequest('A boat.','trial_image',model,'trial','16:9',[first]),/paid funding explicitly/);
  assert.throws(()=>makeRequest('A boat.','wrong_recipe','veo31-text-8s-720','paid','16:9',[first]),/does not accept/);
  assert.match(commandExamples('ingredients_001','bash',model).availability,/model=veo31-ingredients-8s-720/);
});
