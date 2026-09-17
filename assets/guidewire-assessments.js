(() => {
  'use strict';
  const modules = window.GUIDEWIRE_MODULES;
  const totalModules = modules.length;
  const totalQuestions = modules.reduce((sum, m) => sum + m.questions.length, 0);
  const app = document.getElementById('app');
  const storageKey = 'guidewire-assessment-v1';
  const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let state = {active:null, results:[]};
  try { const saved = JSON.parse(localStorage.getItem(storageKey)); if (saved && Array.isArray(saved.results)) state = saved; } catch { storageWarning(); }
  let screen = 'dashboard';
  let historyIndex = 0;
  let restoringHistory = false;
  let cancellingBack = false;
  let leavingPage = false;
  const exitMessage = 'Are you sure you want to exit this test? Submitted answers are saved and remain locked. Your current unsubmitted choice will not be saved.';
  window.history.replaceState({gw:true, index:0, screen:'dashboard'}, '');
  function track(next, details = {}) {
    if (!restoringHistory && screen !== next) {
      window.history.pushState({gw:true, index:++historyIndex, screen:next, ...details}, '');
    }
    screen = next;
  }
  function confirmExit(){ return screen !== 'test' || !state.active || window.confirm(exitMessage); }
  function storageWarning(){ document.getElementById('storage-message').hidden = false; }
  function save(){ try {localStorage.setItem(storageKey, JSON.stringify(state));} catch {storageWarning();} }
  function show(html){app.innerHTML=html; app.focus(); window.scrollTo(0,0);}
  const sourceNote = '<p class="source-note">Original Guidewire assurance-analyst practice questions written from the accompanying study notes, not official Guidewire certification questions.</p>';
  const moduleFor = m => modules.find(x=>x.id===m);
  const rating = score => score >= 9 ? 'Strong mastery' : score >= 7 ? 'Time to revise' : 'Relearn & retest';
  const duration = ms => `${Math.floor(ms/60000)}m ${Math.floor(ms/1000)%60}s`;
  function dashboard(){
    track('dashboard');
    const completed = new Set(state.results.map(r=>r.module)).size;
    show(`<section class="hero"><div class="hero-copy"><p class="eyebrow">FROM REQUIREMENT TO ROOT CAUSE</p><h1>Ready to test your<br><em>Guidewire fluency?</em></h1><p class="intro">Pick a module. Work through 10 questions. Build the practical judgment an Assurance Analyst needs on a real Guidewire project.</p><div class="stats"><span><b>${totalModules}</b> modules</span><span><b>${totalQuestions}</b> questions</span></div></div><aside class="progress-card"><p class="eyebrow">YOUR LEARNING JOURNEY</p><strong>${completed}<span style="font-size:17px;opacity:.65"> / ${totalModules}</span></strong><p>modules completed</p><progress value="${completed}" max="${totalModules}" aria-label="Modules completed"></progress><p>${completed === totalModules ? 'All modules explored. Keep sharpening your skills.' : 'A little practice. A stronger foundation.'}</p></aside></section><div class="rules"><span>How it works</span><span><b>1</b> Pick a module</span><span><b>2</b> Answer 10 questions</span><span><b>3</b> See your results</span></div><div class="section-head"><h2>Choose your module</h2><span>18 topics, from P&amp;C basics to real project scenarios</span></div><div class="modules">${modules.map(m=>{const results=state.results.filter(r=>r.module===m.id); const active=state.active?.module===m.id; return `<section class="module"><small>MODULE ${String(m.id).padStart(2,'0')}</small><strong>${esc(m.title)}</strong><small>10 questions · ${results.length ? 'Best: '+Math.max(...results.map(r=>r.score))+'/10' : 'Multiple choice'}</small><button data-start="${m.id}">${active?'Resume module':results.length?'Try again':'Start module'} <span aria-hidden="true">↗</span></button></section>`;}).join('')}</div>${state.results.length?`<section class="history"><div class="section-head"><h2>Recent results</h2><span>Saved in this browser</span></div>${state.results.slice().reverse().slice(0,20).map(r=>`<div class="history-row"><div>${moduleFor(r.module).title}<small>${new Date(r.finished).toLocaleString()} · ${r.score}/10</small></div><button class="btn" data-result="${r.id}">View summary</button></div>`).join('')}</section>`:''}${sourceNote}`);
    app.querySelectorAll('[data-start]').forEach(b=>b.onclick=()=>intro(Number(b.dataset.start)));
    app.querySelectorAll('[data-result]').forEach(b=>b.onclick=()=>results(state.results.find(r=>r.id===b.dataset.result)));
  }
  function intro(m){
    track('intro', {module:m});
    if(state.active){show(`<div class="exam-shell"><button class="back" id="back">← All modules</button><div class="exam-card"><p class="eyebrow">MODULE IN PROGRESS</p><h1>Your challenge is waiting.</h1><p>You have an unfinished ${esc(moduleFor(state.active.module).title)} assessment. Resume at question ${state.active.answers.length+1}; your submitted answers are locked.</p><button class="btn primary" id="resume">Resume assessment →</button></div></div>`);document.getElementById('back').onclick=dashboard;document.getElementById('resume').onclick=question;return;}
    show(`<div class="exam-shell"><button class="back" id="back">← All modules</button><p class="eyebrow">MODULE ${String(m).padStart(2,'0')}</p><h1>${esc(moduleFor(m).title)}</h1><div class="exam-card"><h2>Your game plan</h2><ul class="instructions"><li>Answer 10 multiple-choice questions. Each correct answer earns 1 mark; there is no negative marking.</li><li>Select an option, then choose <b>Lock answer & continue</b>. Once submitted, an answer cannot be changed or revisited during the module.</li><li>Your progress is saved in this browser. Return to resume at your next unanswered question.</li><li>See your score and answer review after all 10 questions, then download a short summary.</li></ul><button class="btn primary" id="begin">Begin assessment →</button></div>${sourceNote}</div>`);
    document.getElementById('back').onclick=dashboard;
    document.getElementById('begin').onclick=()=>{state.active={module:m,answers:[],started:Date.now()};save();question();};
  }
  function question(){
    const active=state.active;if(!active){dashboard();return;}
    track('test', {module:active.module});
    const mod=moduleFor(active.module), index=active.answers.length, q=mod.questions[index];
    show(`<div class="exam-shell"><button class="back" id="pause">← Save & return to modules</button><p class="eyebrow">${esc(mod.title)}</p><div class="exam-meta"><span>Question ${index+1} of 10</span><span>${index} answers locked · ${10-index} remaining</span></div><progress value="${index}" max="10" aria-label="Questions answered"></progress><div class="question-steps" aria-label="${index} of 10 answers submitted">${Array.from({length:10},(_,i)=>`<span class="${i<index?'done':i===index?'current':''}" ${i===index?'aria-current="step"':''}>${i<index?'&#10003;':i+1}</span>`).join('')}</div><form class="exam-card" id="answer-form"><h2 id="question-title">${esc(q.text)}</h2><p class="answer-hint">Choose the <b>best answer</b> below.</p><fieldset class="options" aria-labelledby="question-title"><legend class="sr-only">Choose one answer</legend>${q.options.map(o=>`<label class="option"><input type="radio" name="answer" value="${o.id}" required><b>${o.id}.</b><span>${esc(o.text)}</span></label>`).join('')}</fieldset><div class="exam-bottom"><p>Check your choice before continuing. Locked answers cannot be changed.</p><button class="btn primary" id="lock" disabled>${index===9?'Lock answer & see results':'Lock answer & continue'} →</button></div></form></div>`);
    document.getElementById('pause').onclick=()=>{if(confirmExit())dashboard();};
    const form=document.getElementById('answer-form');form.onchange=()=>document.getElementById('lock').disabled=false;
    form.onsubmit=e=>{e.preventDefault();const selected=new FormData(form).get('answer');if(!selected || state.active!==active || active.answers.length!==index)return;active.answers.push(selected);if(active.answers.length===10){const result={...active,id:crypto.randomUUID(),finished:Date.now(),score:mod.questions.reduce((sum,q,i)=>sum+(q.answer===active.answers[i]?1:0),0)};state.results.push(result);state.active=null;save();results(result);}else{save();question();}};
  }
  function summary(r){return `Guidewire Assurance Analyst — Assessment summary\nModule ${r.module}: ${moduleFor(r.module).title}\nCompleted: ${new Date(r.finished).toLocaleString()}\nScore: ${r.score}/10 (${r.score*10}%)\nCorrect: ${r.score} | Incorrect: ${10-r.score}\nStudy guidance: ${rating(r.score)}\nElapsed time (including pauses): ${duration(r.finished-r.started)}\n\nOriginal practice questions, not an official Guidewire certification exam.\n`;}
  function results(r){
    track('results', {resultId:r.id});
    show(`<div class="exam-shell"><button class="back" id="back">← All modules</button><p class="eyebrow">ASSESSMENT COMPLETE · MODULE ${String(r.module).padStart(2,'0')}</p><h1>Challenge complete!</h1><p class="intro">${esc(moduleFor(r.module).title)}</p><div class="score-panel"><div class="score">${r.score}<small>/10</small></div><div><h2>${rating(r.score)}</h2><p>${r.score*10}% score · ${r.score} correct · ${10-r.score} incorrect</p><p>${duration(r.finished-r.started)} elapsed, including pauses</p></div></div><div class="actions"><button class="btn primary" id="download">↓ Download short summary</button><button class="btn" id="print">Print / Save as PDF</button><button class="btn" id="retry">Try this module again</button></div>${sourceNote}<section class="review"><h2>Learn from your answers</h2><p class="intro">Tap a question to compare your answer with the supplied key.</p>${moduleFor(r.module).questions.map((q,i)=>`<details><summary class="${r.answers[i]===q.answer?'correct':'incorrect'}">${i+1}. ${r.answers[i]===q.answer?'✓ Correct':'× Incorrect'} · Your answer: ${r.answers[i]} · Key: ${q.answer}</summary><p>${esc(q.text)}</p><p><b>Your choice:</b> ${esc(q.options.find(o=>o.id===r.answers[i]).text)}</p><p><b>Why:</b> ${esc(q.explanation)}</p></details>`).join('')}</section></div>`);
    document.getElementById('back').onclick=dashboard;document.getElementById('retry').onclick=()=>intro(r.module);document.getElementById('print').onclick=()=>window.print();
    document.getElementById('download').onclick=()=>{const url=URL.createObjectURL(new Blob([summary(r)],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=`Guidewire-Module${r.module}-Summary.txt`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
  }
  // Links and browser navigation never silently reopen a saved test.
  document.addEventListener('click', e=>{
    const link=e.target.closest('a[href]');
    if(!link || e.defaultPrevented || e.button>0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || link.target==='_blank' || link.hasAttribute('download'))return;
    if(screen==='test' && state.active){
      if(!confirmExit()){e.preventDefault();return;}
      save();leavingPage=true;
    }
  });
  window.addEventListener('beforeunload', e=>{
    if(screen==='test' && state.active && !leavingPage){save();e.preventDefault();e.returnValue='';}
  });
  window.addEventListener('popstate', e=>{
    if(cancellingBack){cancellingBack=false;return;}
    const target=e.state;
    if(!target?.gw)return;
    if(!confirmExit()){
      cancellingBack=true;
      window.history.go(historyIndex-target.index);
      return;
    }
    historyIndex=target.index;
    restoringHistory=true;
    if(target.screen==='intro' || target.screen==='test')intro(target.module);
    else if(target.screen==='results'){
      const result=state.results.find(r=>r.id===target.resultId);
      result?results(result):dashboard();
    }else dashboard();
    restoringHistory=false;
  });
  window.addEventListener('pageshow', e=>{
    leavingPage=false;
    if(e.persisted){
      try{const saved=JSON.parse(localStorage.getItem(storageKey));if(saved&&Array.isArray(saved.results))state=saved;}catch{}
      restoringHistory=true;dashboard();restoringHistory=false;
      window.history.replaceState({gw:true,index:historyIndex,screen:'dashboard'},'');
    }
  });
  window.addEventListener('storage',e=>{if(e.key===storageKey){try{const updated=JSON.parse(e.newValue);if(updated&&Array.isArray(updated.results)){state=updated;screen==='test'&&state.active?question():dashboard();}}catch{}}});
  dashboard();
})();
