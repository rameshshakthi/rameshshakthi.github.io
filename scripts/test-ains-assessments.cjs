const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const store = new Map();
let nodes, html, selected, lastDownload, blob;
const listeners = {};
let confirmAnswer = true, confirmCount = 0, historyEntries, historyPosition;
function moveHistory(delta){historyPosition+=delta;listeners.popstate({state:historyEntries[historyPosition]});}
function resume(chapter, mod){nodes[`start-${chapter}-${mod}`].onclick();nodes.resume.onclick();}
function boot(){
  nodes={}; historyEntries=[];historyPosition=0;
  const app={focus(){},querySelectorAll(selector){return Object.values(nodes).filter(n=>selector==='[data-start]'?n.dataset?.start:n.dataset?.result)},set innerHTML(value){html=value;nodes={};for(const match of value.matchAll(/id="([^"]+)"/g))nodes[match[1]]={disabled:true};for(const m of value.matchAll(/data-start="([^"]+)"/g))nodes[`start-${m[1]}`]={dataset:{start:m[1]}};for(const m of value.matchAll(/data-result="([^"]+)"/g))nodes[`result-${m[1]}`]={dataset:{result:m[1]}};}};
  const context={console,Date,Set,URLSearchParams,JSON,String,Number,Math,Array,FormData:class{get(){return selected}},crypto:require('node:crypto').webcrypto,Blob,URL:{createObjectURL(b){blob=b;return 'blob:test'},revokeObjectURL(){}},setTimeout(fn){fn()},localStorage:{getItem(k){return store.get(k)||null},setItem(k,v){store.set(k,v)}},document:{addEventListener(name,fn){listeners['document-'+name]=fn},getElementById(id){return id==='app'?app:id==='storage-message'?{}:nodes[id]},createElement(){return{click(){lastDownload=this.download}}}},window:{confirm(){confirmCount++;return confirmAnswer},history:{replaceState(s){historyEntries[historyPosition]=s},pushState(s){historyEntries.splice(++historyPosition);historyEntries[historyPosition]=s},go:moveHistory},location:{search:''},scrollTo(){},addEventListener(name,fn){listeners[name]=fn},print(){}}};
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('assets/ains-assessment-data.js','utf8'),context);
  vm.runInContext(fs.readFileSync('assets/ains-assessments.js','utf8'),context);
  return context.window.AINS_CHAPTERS;
}
(async()=>{
  const chapters=boot();
  assert.equal(chapters.length,10);
  for(const chapter of chapters)for(const mod of chapter.modules){
    assert.equal(mod.questions.length,10);
    store.set('ains21-assessment-v1',JSON.stringify({active:{chapter:chapter.id,module:mod.id,answers:[],started:Date.now()},results:[]}));
    boot();
    assert(html.includes('Choose your chapter'));
    assert(!html.includes('id="answer-form"'));
    resume(chapter.id,mod.id);
    confirmAnswer=false;nodes.pause.onclick();assert(html.includes('Question 1 of 10'));
    moveHistory(-1);assert(html.includes('Question 1 of 10'));
    confirmAnswer=true;moveHistory(-1);assert(html.includes('Resume assessment'));
    moveHistory(1);assert(html.includes('Resume assessment'));nodes.resume.onclick();
    const unload={preventDefault(){this.prevented=true}};listeners.beforeunload(unload);assert(unload.prevented);
    const linkEvent={target:{closest(){return {hasAttribute(){return false}}}},preventDefault(){this.prevented=true}};
    confirmAnswer=false;listeners['document-click'](linkEvent);assert(linkEvent.prevented);
    confirmAnswer=true;nodes.pause.onclick();assert(html.includes('Choose your chapter'));resume(chapter.id,mod.id);
    for(let i=0;i<10;i++){
      assert(html.includes(`Question ${i+1} of 10`));
      assert.equal(nodes.lock.disabled,true);
      assert(!html.includes('Supplied key:'));
      selected=i%2===0?mod.questions[i].answer:mod.questions[i].options.find(o=>o.id!==mod.questions[i].answer).id;
      nodes['answer-form'].onchange();
      assert.equal(nodes.lock.disabled,false);
      const submit=nodes['answer-form'].onsubmit;
      submit({preventDefault(){}});
      submit({preventDefault(){}}); // A duplicate event must never answer the next question.
      const saved=JSON.parse(store.get('ains21-assessment-v1'));
      if(i<9){assert.equal(saved.active.answers.length,i+1);boot();assert(html.includes('Choose your chapter'));resume(chapter.id,mod.id);assert(html.includes(`Question ${i+2} of 10`));}
      else{assert.equal(saved.active,null);assert.equal(saved.results.length,1);assert.equal(saved.results[0].score,5);assert(html.includes('Learn from your answers'));nodes.download.onclick();assert.equal(lastDownload,`AINS21-Ch${chapter.id}-Module${mod.id}-Summary.txt`);assert((await blob.text()).includes('Score: 5/10 (50%)'));}
    }
  }
  console.log('PASS: 200 questions; all 20 module flows; mixed-answer scoring; duplicate-submit protection; explicit resume after refresh; locked progress; exit cancellation; browser back/forward confirmation; unload warning; summary downloads.');
})();
