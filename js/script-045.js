
(function(){
  'use strict';

  const FN_NAMES=[
    'renderPrintReports',
    'renderMonthlyReport',
    'renderMonthlyArea',
    'renderReferencePrintReports'
  ];

  function currentSignature(){
    const ids=['search','from','to','activity','equipment','supplier','invoice','tire','tireId','inventoryStatus'];
    const f=ids.map(id=>String(document.getElementById(id)?.value||'')).join('|');
    const n=(typeof DATA!=='undefined' && Array.isArray(DATA))?DATA.length:0;
    let filtered=0;
    try{ filtered=(typeof filters==='function'?filters():[]).length }catch(_e){}
    return n+'#'+filtered+'#'+f;
  }

  let cachedSig='';
  let cacheUntil=0;
  let forceRender=false;

  FN_NAMES.forEach(name=>{
    const original=window[name];
    if(typeof original!=='function')return;
    window[name]=function(){
      const sig=currentSignature();
      if(!forceRender && sig===cachedSig && Date.now()<cacheUntil){
        return;
      }
      return original.apply(this,arguments);
    };
    try{
      /* Keep global function identifier synchronized in classic scripts. */
      eval(name+'=window["'+name+'"]');
    }catch(_e){}
  });

  function prepareOnce(){
    const sig=currentSignature();
    if(sig===cachedSig && Date.now()<cacheUntil){
      return;
    }

    forceRender=true;
    try{
      const rows=(typeof filters==='function')?filters():(
        (typeof DATA!=='undefined'&&Array.isArray(DATA))?DATA:[]
      );

      try{window.renderPrintReports?.(rows)}catch(_e){}
      try{window.renderMonthlyReport?.(rows)}catch(_e){}
      try{window.renderMonthlyArea?.(rows)}catch(_e){}
      try{window.renderReferencePrintReports?.(rows)}catch(_e){}

      /* Operational reports are rendered only if their source panel is relevant/available. */
      try{
        const active=document.body.dataset.activeReport||'';
        if(active==='supplierInvoicesReport')window.renderSupplierInvoiceReport?.();
        if(active==='inventoryReport'){
          window.renderInventoryReport?.();
          window.refreshInventoryEnhancements?.();
        }
      }catch(_e){}

      cachedSig=sig;
      cacheUntil=Date.now()+12000;
    }finally{
      forceRender=false;
    }
  }

  /* Prepare at interaction time, before Chrome opens the print preview. */
  document.addEventListener('pointerdown',function(e){
    if(e.target.closest('#print,[data-print-report],.single-report-print-btn')){
      prepareOnce();
    }
  },true);

  /* beforeprint becomes nearly free because duplicate render functions hit the cache. */
  window.addEventListener('beforeprint',prepareOnce);

  /* Any filter/data change invalidates cache. */
  ['input','change'].forEach(evt=>{
    document.addEventListener(evt,function(e){
      if(e.target && e.target.closest('.filters')){
        cachedSig='';
        cacheUntil=0;
      }
    },true);
  });
  window.addEventListener('afterprint',function(){
    /* Keep short cache alive for repeated Save as PDF attempts. */
    cacheUntil=Math.max(cacheUntil,Date.now()+4000);
  });

  window.prepareFastPdfPrint=prepareOnce;
})();
