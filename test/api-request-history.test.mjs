import test from 'node:test';
import assert from 'node:assert/strict';

test('Back-restored fields reconcile with JSON and the availability route after pageshow',async()=>{
  const names=['request-id','pilot-prompt','command-shell','pilot-model','pilot-funding','trial-funding-option','pilot-format','availability-command','model-availability','pilot-terms','request-json','download-request','request-status','submit-command','recover-command','poll-command','download-command','ingredient-fields','ingredient-ids','ingredient-error'];
  const nodes=Object.fromEntries(names.map(name=>[name,{value:'',textContent:'',disabled:false,href:'',classList:{add(){},remove(){}},handlers:{},setAttribute(name,value){this[name]=value;},addEventListener(name,callback){(this.handlers[name]??=[]).push(callback);}}]));
  Object.assign(nodes['request-id'],{value:'original_id'});
  Object.assign(nodes['pilot-prompt'],{value:'Original paper-boat scene.'});
  Object.assign(nodes['command-shell'],{value:'bash'});
  Object.assign(nodes['pilot-model'],{value:'seedance-2.5'});
  Object.assign(nodes['pilot-format'],{value:'16:9'});
  nodes['model-availability'].href='https://seedancecheap.com/api?model=seedance-2.5&utm_source=facebook&utm_campaign=api_request_guide#availability';
  const rawLink={href:''};
  nodes['raw-availability']={hidden:true,querySelector:()=>rawLink};
  const accountLink={href:'https://seedancecheap.com/app?classic=1&utm_medium=cookbook&utm_campaign=api_request_guide&utm_content=api_access#api-access'};
  const saved={document:globalThis.document,window:globalThis.window,location:globalThis.location,fetch:globalThis.fetch,history:globalThis.history};
  const handlers={};let networkCalls=0;
  try {
    globalThis.document={getElementById:name=>nodes[name],querySelectorAll:selector=>selector==='[data-site-link]'?[nodes['model-availability'],accountLink]:[]};
    globalThis.window={addEventListener:(name,callback)=>{handlers[name]=callback;}};
    globalThis.location={search:'?from=facebook&campaign=featured_veo_recipe_nov10&model=veo31-text-8s-720&ratio=9%3A16&funding=paid&prompt=ignored'};
    globalThis.history={state:{unrelated:'retained'},replaceState(value){this.state=value;}};
    globalThis.fetch=()=>{networkCalls++;throw new Error('This builder must remain local.');};
    await import('../docs/api-request.mjs?history-test');
    assert.equal(nodes['request-json'].textContent,'');
    assert.equal(nodes['download-request'].disabled,true);
    assert.match(nodes['submit-command'].textContent,/Complete the request fields/);
    assert.equal(nodes['pilot-model'].value,'veo31-text-8s-720');
    assert.equal(nodes['pilot-format'].value,'9:16');
    assert.equal(nodes['pilot-funding'].value,'');
    assert.equal(nodes['pilot-prompt'].value,'Original paper-boat scene.');
    assert.equal(nodes['trial-funding-option'].disabled,true);
    assert.match(nodes['pilot-terms'].textContent,/8-second.*0\.25 credit.*9:16.*720×1280/);
    assert.match(nodes['availability-command'].textContent,/model=veo31-text-8s-720/);
    const linkedAvailability=new URL(nodes['model-availability'].href);
    assert.equal(linkedAvailability.pathname,'/api');
    assert.equal(linkedAvailability.hash,'#availability');
    assert.equal(linkedAvailability.searchParams.get('model'),'veo31-text-8s-720');
    assert.equal(linkedAvailability.searchParams.get('ratio'),'9:16');
    assert.equal(linkedAvailability.searchParams.get('utm_source'),'facebook');
    assert.equal(linkedAvailability.searchParams.get('utm_campaign'),'featured_veo_recipe_nov10');
    assert.equal(linkedAvailability.searchParams.get('utm_content'),'quote_review');
    for (const privateField of ['request_id','reference_ids','funding','prompt']) {
      assert.equal(linkedAvailability.searchParams.has(privateField),false);
    }
    const rawDestination=new URL(rawLink.href);
    assert.equal(rawDestination.pathname,'/api/availability');
    assert.equal(rawDestination.searchParams.get('model'),'veo31-text-8s-720');
    assert.equal(rawDestination.searchParams.has('ratio'),false);
    assert.equal(nodes['raw-availability'].hidden,false);
    nodes['pilot-format'].value='16:9';
    for(const callback of nodes['pilot-format'].handlers.change)callback();
    assert.equal(new URL(nodes['model-availability'].href).searchParams.get('ratio'),'16:9');
    nodes['pilot-format'].value='9:16';
    const accountDestination=new URL(accountLink.href);
    assert.equal(accountDestination.searchParams.get('utm_source'),'facebook');
    assert.equal(accountDestination.searchParams.get('utm_campaign'),'featured_veo_recipe_nov10');
    assert.equal(accountDestination.searchParams.get('utm_content'),'api_access');
    assert.equal(accountDestination.searchParams.has('funding'),false);
    assert.equal(accountDestination.hash,'#api-access');
    assert.equal(networkCalls,0);
    nodes['pilot-model'].value='seedance-2.5';
    nodes['pilot-funding'].value='trial';
    for(const callback of nodes['pilot-funding'].handlers.change)callback();
    assert.equal(JSON.parse(nodes['request-json'].textContent).free_trial,true);
    nodes['request-id'].value='restored_original_id';
    for(const callback of nodes['request-id'].handlers.input)callback();
    assert.equal(history.state.seedancecheapPilotRequestId,'restored_original_id');
    assert.equal(history.state.unrelated,'retained');
    nodes['request-id'].value='paper_boat_pilot_001';
    handlers.pageshow();
    // The browser restores these values after the initial script/event work.
    nodes['pilot-model'].value='seedance-2.0';
    nodes['pilot-format'].value='9:16';
    nodes['pilot-prompt'].value='Restored "paper boat" scene.\nKeep this text.';
    nodes['command-shell'].value='powershell';
    nodes['pilot-funding'].value='paid';
    await new Promise(resolve=>setTimeout(resolve,5));
    const request=JSON.parse(nodes['request-json'].textContent);
    assert.equal(request.model,'seedance-2.0');assert.equal(request.duration,15);
    assert.deepEqual([request.ratio,request.size],['9:16','720x1280']);
    assert.equal(request.prompt,nodes['pilot-prompt'].value);assert.equal(request.request_id,'restored_original_id');
    assert.equal(request.free_trial,false);assert.equal(request.auto_retry,false);
    const destination=new URL(nodes['model-availability'].href);
    assert.equal(destination.searchParams.get('model'),'seedance-2.0');
    assert.equal(destination.searchParams.get('utm_source'),'facebook');assert.equal(destination.hash,'#availability');
    assert.match(nodes['submit-command'].textContent,/^curl\.exe/);
    assert.match(nodes['recover-command'].textContent,/restored_original_id/);
    assert.equal(nodes['download-request'].disabled,false);assert.equal(networkCalls,0);
    assert.match(nodes['request-status'].textContent,/can use your credits or balance/);
    nodes['pilot-funding'].value='trial';
    nodes['pilot-model'].value='veo-3.1';
    for(const callback of nodes['pilot-model'].handlers.change)callback();
    assert.equal(nodes['trial-funding-option'].disabled,true);
    assert.equal(nodes['pilot-funding'].value,'');
    assert.equal(nodes['download-request'].disabled,true);
    assert.equal(nodes['request-json'].textContent,'');
    nodes['pilot-funding'].value='paid';
    for(const callback of nodes['pilot-funding'].handlers.change)callback();
    assert.equal(JSON.parse(nodes['request-json'].textContent).duration,8);
    assert.match(nodes['availability-command'].textContent,/model=veo-3\.1/);
    assert.match(nodes['pilot-terms'].textContent,/8-second.*720×1280/);
    nodes['pilot-model'].value='veo31-text-8s-720';
    for(const callback of nodes['pilot-model'].handlers.change)callback();
    const exactAvailability=new URL(nodes['model-availability'].href);
    assert.equal(exactAvailability.pathname,'/api');
    assert.equal(exactAvailability.searchParams.get('model'),'veo31-text-8s-720');
    assert.equal(exactAvailability.searchParams.get('utm_source'),'facebook');
    assert.equal(exactAvailability.hash,'#availability');
    assert.equal(new URL(rawLink.href).pathname,'/api/availability');
    assert.equal(JSON.parse(nodes['request-json'].textContent).request_id,'restored_original_id');
    assert.match(nodes['pilot-terms'].textContent,/0\.25 credit/);
    nodes['pilot-model'].value='veo-3.1';
    for(const callback of nodes['pilot-model'].handlers.change)callback();
    const legacyAvailability=new URL(nodes['model-availability'].href);
    assert.equal(legacyAvailability.pathname,'/api');
    assert.equal(legacyAvailability.hash,'#availability');
    assert.equal(legacyAvailability.searchParams.get('model'),'veo-3.1');
    assert.equal(legacyAvailability.searchParams.has('ratio'),false);
    assert.equal(nodes['raw-availability'].hidden,true);
    assert.equal(networkCalls,0);
    nodes['pilot-model'].value='veo31-ingredients-8s-720';
    for(const callback of nodes['pilot-model'].handlers.change)callback();
    assert.equal(nodes['ingredient-fields'].hidden,false);
    assert.equal(nodes['download-request'].disabled,true);
    assert.match(nodes['ingredient-error'].textContent,/one to three/);
    const refs=['ref_'+'b'.repeat(32),'ref_'+'a'.repeat(32)];
    nodes['ingredient-ids'].value=refs.join('\n');
    for(const callback of nodes['ingredient-ids'].handlers.input)callback();
    assert.deepEqual(JSON.parse(nodes['request-json'].textContent).reference_ids,refs);
    assert.equal(nodes['ingredient-ids']['aria-invalid'],'false');
    assert.match(nodes['model-availability'].href,/model=veo31-ingredients-8s-720/);
    assert.equal(new URL(rawLink.href).searchParams.get('model'),'veo31-ingredients-8s-720');
    assert.equal(nodes['model-availability'].href.includes(refs[0]),false);
    assert.equal(rawLink.href.includes(refs[0]),false);
    nodes['pilot-model'].value='veo31-text-8s-720';
    for(const callback of nodes['pilot-model'].handlers.change)callback();
    assert.equal(nodes['ingredient-fields'].hidden,true);
    assert.equal(nodes['ingredient-ids'].disabled,true);
    assert.equal(Object.hasOwn(JSON.parse(nodes['request-json'].textContent),'reference_ids'),false);
    assert.equal(JSON.stringify(history.state).includes(refs[0]),false);
    assert.equal(networkCalls,0);
    nodes['pilot-funding'].value='';
    for(const callback of nodes['pilot-funding'].handlers.change)callback();
    assert.equal(nodes['request-json'].textContent,'');assert.equal(nodes['download-request'].disabled,true);
    for (const [index, query] of ['','?ratio=1%3A1','?ratio=9%3A16&ratio=16%3A9'].entries()) {
      globalThis.location.search = query;
      nodes['pilot-format'].value = '16:9';
      await import(`../docs/api-request.mjs?ratio-fallback-${index}`);
      assert.equal(nodes['pilot-format'].value,'16:9');
    }
    const intro = {textContent: ''};
    nodes['pilot-intro'] = intro;
    for (const [index, query] of [
      '?starter=outside-line&from=mastodon&campaign=outside_line_nov10&funding=paid&prompt=ignored',
      '?starter=outside-line&starter=outside-line',
    ].entries()) {
      globalThis.location.search = query;
      Object.assign(nodes['pilot-prompt'], {value:'Original paper-boat scene.', defaultValue:'Original paper-boat scene.'});
      Object.assign(nodes['request-id'], {value:'paper_boat_pilot_001', defaultValue:'paper_boat_pilot_001'});
      nodes['pilot-model'].value='seedance-2.5';
      nodes['pilot-format'].value='16:9';
      await import(`../docs/api-request.mjs?starter-${index}`);
      assert.equal(nodes['pilot-funding'].value,'');
      assert.equal(nodes['download-request'].disabled,true);
      if (index === 0) {
        assert.match(intro.textContent,/proposed text-to-video prompt/);
        assert.match(nodes['pilot-prompt'].value,/amber car crosses a painted finish stripe/);
        assert.match(nodes['request-id'].value,/^outside_line_[0-9a-f-]{36}$/);
        assert.equal(nodes['pilot-model'].value,'veo31-text-8s-720');
        assert.equal(nodes['pilot-format'].value,'9:16');
        const quote=new URL(nodes['model-availability'].href);
        assert.equal(quote.searchParams.get('utm_source'),'mastodon');
        assert.equal(quote.searchParams.get('utm_campaign'),'outside_line_nov10');
      } else {
        assert.equal(nodes['pilot-prompt'].value,'Original paper-boat scene.');
        assert.equal(nodes['request-id'].value,'paper_boat_pilot_001');
      }
    }
    assert.equal(networkCalls,0);
  } finally {
    for(const [key,value] of Object.entries(saved)){if(value===undefined)delete globalThis[key];else globalThis[key]=value;}
  }
});
