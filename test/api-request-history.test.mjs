import test from 'node:test';
import assert from 'node:assert/strict';

test('Back-restored fields reconcile with JSON and the availability route after pageshow',async()=>{
  const names=['request-id','pilot-prompt','command-shell','pilot-model','model-availability','pilot-terms','request-json','download-request','request-status','submit-command','recover-command','poll-command','download-command'];
  const nodes=Object.fromEntries(names.map(name=>[name,{value:'',textContent:'',disabled:false,href:'',classList:{add(){},remove(){}},handlers:{},addEventListener(name,callback){(this.handlers[name]??=[]).push(callback);}}]));
  Object.assign(nodes['request-id'],{value:'original_id'});
  Object.assign(nodes['pilot-prompt'],{value:'Original paper-boat scene.'});
  Object.assign(nodes['command-shell'],{value:'bash'});
  Object.assign(nodes['pilot-model'],{value:'seedance-2.5'});
  nodes['model-availability'].href='https://seedancecheap.com/api?model=seedance-2.5&utm_source=facebook#availability';
  const saved={document:globalThis.document,window:globalThis.window,location:globalThis.location,fetch:globalThis.fetch,history:globalThis.history};
  const handlers={};let networkCalls=0;
  try {
    globalThis.document={getElementById:name=>nodes[name],querySelectorAll:()=>[]};
    globalThis.window={addEventListener:(name,callback)=>{handlers[name]=callback;}};
    globalThis.location={search:'?from=facebook'};
    globalThis.history={state:{unrelated:'retained'},replaceState(value){this.state=value;}};
    globalThis.fetch=()=>{networkCalls++;throw new Error('This builder must remain local.');};
    await import('../docs/api-request.mjs?history-test');
    assert.equal(JSON.parse(nodes['request-json'].textContent).duration,30);
    nodes['request-id'].value='restored_original_id';
    for(const callback of nodes['request-id'].handlers.input)callback();
    assert.equal(history.state.seedancecheapPilotRequestId,'restored_original_id');
    assert.equal(history.state.unrelated,'retained');
    nodes['request-id'].value='paper_boat_pilot_001';
    handlers.pageshow();
    // The browser restores these values after the initial script/event work.
    nodes['pilot-model'].value='seedance-2.0';
    nodes['pilot-prompt'].value='Restored "paper boat" scene.\nKeep this text.';
    nodes['command-shell'].value='powershell';
    await new Promise(resolve=>setTimeout(resolve,5));
    const request=JSON.parse(nodes['request-json'].textContent);
    assert.equal(request.model,'seedance-2.0');assert.equal(request.duration,15);
    assert.equal(request.prompt,nodes['pilot-prompt'].value);assert.equal(request.request_id,'restored_original_id');
    assert.equal(request.free_trial,true);assert.equal(request.auto_retry,false);
    const destination=new URL(nodes['model-availability'].href);
    assert.equal(destination.searchParams.get('model'),'seedance-2.0');
    assert.equal(destination.searchParams.get('utm_source'),'facebook');assert.equal(destination.hash,'#availability');
    assert.match(nodes['submit-command'].textContent,/^curl\.exe/);
    assert.match(nodes['recover-command'].textContent,/restored_original_id/);
    assert.equal(nodes['download-request'].disabled,false);assert.equal(networkCalls,0);
  } finally {
    for(const [key,value] of Object.entries(saved)){if(value===undefined)delete globalThis[key];else globalThis[key]=value;}
  }
});
