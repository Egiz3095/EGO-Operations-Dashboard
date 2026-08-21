
(function(){
  'use strict';

  /* ---------- shared state ---------- */
  const S={
    printing:false,
    modalOpen:false,
    refreshBusy:false,
    refreshQueued:false,
    refreshTimer:0,
    renderTimer:0,
    lastRenderSig:'',
    lastActive:'',
    cache:new Map(),
    cacheVersion:0,
    lastDataLen:-1
  };

  const now=()=>Date.now();
  const $=id=>document.getElementById(id);

  function activeReport(){
    return document.body?.dataset?.activeReport || 'home';
  }

  function modalIsOpen(){
    return !!document.querySelector(
      '.modal.open,.user-admin-modal.open,.comparisons-modal.open,'+
      '#reportSidebar.open,#filterSidebar.open,[aria-hidden="false"].modal'
    );
  }

  function shouldSuspendHeavyWork(){
    return S.printing || document.visibilityState==='hidden' || modalIsOpen();
  }

  /* ---------- signature / cache invalidation ---------- */
  function filterSignature(){
    const ids=['search','from','to','activity','equipment','supplier','invoice','tire','tireId','inventoryStatus'];
    return ids.map(id=>String($(id)?.value||'')).join('|');
  }

  function dataSignature(){
    let len=0;
    try{len=Array.isArray(DATA)?DATA.length:0}catch(_e){}
    return len+'#'+S.cacheVersion+'#'+filterSignature();
  }

  function invalidateCaches(){
    S.cacheVersion++;
    S.cache.clear();
    S.lastRenderSig='';
  }
  window.invalidateEgoCaches=invalidateCaches;

  /* ---------- memoized heavy aggregations ---------- */
  function wrapMemoized(name){
    const original=window[name];
    if(typeof original!=='function' || original.__egoMemoized)return;
    const wrapped=function(){
      try{
        const rows=arguments[0];
        const key=arguments[1];
        if(!Array.isArray(rows))return original.apply(this,arguments);
        const k=name+'|'+dataSignature()+'|'+String(key||'')+'|'+rows.length;
        if(S.cache.has(k))return S.cache.get(k);
        const val=original.apply(this,arguments);
        S.cache.set(k,val);
        if(S.cache.size>100){
          const first=S.cache.keys().next().value;
          S.cache.delete(first);
        }
        return val;
      }catch(e){
        return original.apply(this,arguments);
      }
    };
    wrapped.__egoMemoized=true;
    window[name]=wrapped;
    try{eval(name+'=window["'+name+'"]')}catch(_e){}
  }

  ['sumBy','monthlyGroups','tireIdGroupsAsc'].forEach(wrapMemoized);

  /* ---------- report render guard ---------- */
  const renderFns=[
    'renderMonthlyReport','renderMonthlyArea','renderReferencePrintReports',
    'renderPrintReports','renderTable','renderInvoice','renderDashboardExplanation',
    'renderCompactSummary','renderActivitySummary','renderTireIdSummary'
  ];

  renderFns.forEach(name=>{
    const original=window[name];
    if(typeof original!=='function' || original.__egoGuarded)return;
    const wrapped=function(){
      try{
        return original.apply(this,arguments);
      }catch(err){
        console.error('[EGO render]',name,err);
        const target=activeReport();
        const section=document.getElementById(target);
        if(section && !section.querySelector('.ego-render-error')){
          const box=document.createElement('div');
          box.className='ego-render-error';
          box.textContent='تعذر تحديث هذا الجزء مؤقتاً. بقية النظام ما زالت تعمل.';
          section.appendChild(box);
          setTimeout(()=>box.remove(),5000);
        }
        return undefined;
      }
    };
    wrapped.__egoGuarded=true;
    window[name]=wrapped;
    try{eval(name+'=window["'+name+'"]')}catch(_e){}
  });

  /* ---------- one central coalesced screen refresh ---------- */
  function safeRows(){
    try{return typeof filters==='function'?filters():(Array.isArray(DATA)?DATA:[])}
    catch(_e){try{return Array.isArray(DATA)?DATA:[]}catch(__e){return []}}
  }

  function renderCurrent(force){
    if(shouldSuspendHeavyWork() && !force){
      S.refreshQueued=true;
      return;
    }
    const target=activeReport();
    const sig=dataSignature()+'#'+target;
    if(!force && sig===S.lastRenderSig)return;
    S.lastRenderSig=sig;
    S.lastActive=target;

    try{
      const a=safeRows();
      if(typeof window.refreshActiveScreen==='function'){
        window.refreshActiveScreen(target,!!force);
      }else{
        /* fallback only */
        if(target==='home')window.renderHomeMiniSummaries?.(a);
      }
    }catch(e){
      console.warn('Central render:',e);
    }
  }

  window.requestStableRender=function(force=false){
    clearTimeout(S.renderTimer);
    S.renderTimer=setTimeout(()=>renderCurrent(force),force?0:120);
  };

  /* ---------- debounce filter input ---------- */
  const filterIds=['search','from','to','activity','equipment','supplier','invoice','tire','tireId','inventoryStatus'];
  function onFilterEvent(){
    invalidateCaches();
    clearTimeout(S.renderTimer);
    S.renderTimer=setTimeout(()=>renderCurrent(true),180);
    try{
      sessionStorage.setItem('egoFilterState',JSON.stringify(
        Object.fromEntries(filterIds.map(id=>[id,String($(id)?.value||'')]))
      ));
    }catch(_e){}
  }

  filterIds.forEach(id=>{
    const el=$(id);
    if(!el)return;
    el.addEventListener('input',onFilterEvent,true);
    el.addEventListener('change',onFilterEvent,true);
  });

  /* ---------- preserve report + filters during refresh ---------- */
  function saveUiState(){
    try{
      sessionStorage.setItem('egoActiveReport',activeReport());
      sessionStorage.setItem('egoFilterState',JSON.stringify(
        Object.fromEntries(filterIds.map(id=>[id,String($(id)?.value||'')]))
      ));
    }catch(_e){}
  }

  function restoreUiState(){
    try{
      const state=JSON.parse(sessionStorage.getItem('egoFilterState')||'{}');
      filterIds.forEach(id=>{
        const el=$(id);
        if(el && Object.prototype.hasOwnProperty.call(state,id) && !el.value){
          el.value=state[id];
        }
      });
    }catch(_e){}
  }

  window.addEventListener('beforeunload',saveUiState);
  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='visible'){
      if(S.refreshQueued){S.refreshQueued=false;window.requestStableRender(true)}
      else window.requestStableRender(false);
    }
  });

  /* ---------- suspend heavy refresh while printing ---------- */
  window.addEventListener('beforeprint',()=>{
    S.printing=true;
    document.documentElement.classList.add('ego-print-lock');
  });
  window.addEventListener('afterprint',()=>{
    S.printing=false;
    document.documentElement.classList.remove('ego-print-lock');
    setTimeout(()=>window.requestStableRender(true),100);
  });

  /* ---------- protect against repeated clicks ---------- */
  function guardButton(btn,ms){
    if(!btn || btn.dataset.egoGuardBound==='1')return;
    btn.dataset.egoGuardBound='1';
    btn.addEventListener('click',()=>{
      if(btn.classList.contains('ego-temp-disabled'))return;
      btn.classList.add('ego-temp-disabled');
      btn.setAttribute('aria-busy','true');
      setTimeout(()=>{
        btn.classList.remove('ego-temp-disabled');
        btn.removeAttribute('aria-busy');
      },ms);
    },true);
  }
  guardButton(document.querySelector('#egoLoginForm button[type="submit"]'),1200);
  guardButton($('#print'),1500);
  guardButton($('#refresh'),900);

  document.querySelectorAll('[data-print-report],.single-report-print-btn').forEach(b=>guardButton(b,1200));

  /* ---------- data change detector ---------- */
  setInterval(()=>{
    let len=0;
    try{len=Array.isArray(DATA)?DATA.length:0}catch(_e){}
    if(S.lastDataLen<0)S.lastDataLen=len;
    if(len!==S.lastDataLen){
      S.lastDataLen=len;
      invalidateCaches();
      window.requestStableRender(true);
    }
  },3000);

  /* ---------- patch aggressive auto refresh ---------- */
  const oldNotify=window.notifyLiveDataChanged;
  if(typeof oldNotify==='function' && !oldNotify.__egoStable){
    const stableNotify=function(reason){
      invalidateCaches();
      if(shouldSuspendHeavyWork()){
        S.refreshQueued=true;
        return;
      }
      clearTimeout(S.refreshTimer);
      S.refreshTimer=setTimeout(()=>{
        try{oldNotify.call(window,reason)}catch(e){console.warn('notifyLiveDataChanged:',e)}
      },120);
    };
    stableNotify.__egoStable=true;
    window.notifyLiveDataChanged=stableNotify;
  }

  /* ---------- lightweight DOM mutation handling ---------- */
  const bodyObserver=new MutationObserver(mutations=>{
    let relevant=false;
    for(const m of mutations){
      if(m.type==='attributes' && (m.attributeName==='class'||m.attributeName==='data-active-report'))relevant=true;
      if(m.type==='childList' && m.addedNodes.length && [...m.addedNodes].some(n=>n.nodeType===1 && (n.matches?.('.modal,.nav-report-view')||n.querySelector?.('.modal,.nav-report-view'))))relevant=true;
      if(relevant)break;
    }
    if(relevant){
      const opened=modalIsOpen();
      if(S.modalOpen && !opened && S.refreshQueued){S.refreshQueued=false;window.requestStableRender(true)}
      S.modalOpen=opened;
    }
  });
  bodyObserver.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','data-active-report']});

  restoreUiState();
  setTimeout(()=>window.requestStableRender(true),500);
})();
