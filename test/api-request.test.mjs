import test from 'node:test';
import assert from 'node:assert/strict';
import {makeRequest, commandExamples} from '../docs/api-request.mjs';

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
  assert.equal(makeRequest(prompt,'pilot_001',undefined,'trial').model,'seedance-2.5');
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
    const command=commandExamples('pilot_original_001',shell);
    assert.match(command.recover,/\/by-request\/pilot_original_001/);
    assert.match(command.submit,/@request\.json/);
    assert.doesNotMatch(command.recover,/--data|POST/);
  }
});
