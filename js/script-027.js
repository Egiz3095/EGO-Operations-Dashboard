
(function(){
  let busy=false;
  let queued=false;
  let lastRun=0;

  async function seamlessRefresh(){
    if(document.visibilityState!=='visible')return;
    if(busy){queued=true;return}
    busy=true;

    try{
      // Refresh the main Google Sheet silently.
      if(typeof refresh==='function'){
        try{await refresh()}catch(e){}
      }

      // Refresh supplier/inventory source only when relevant or on home,
      // so stock/forecast remains current without blocking the UI.
      const active=document.body?.dataset?.activeReport || (document.body?.classList.contains('nav-home')?'home':'home');
      if(typeof refreshSupplierInvoices==='function' &&
         ['home','inventoryReport','supplierInvoicesReport'].includes(active)){
        try{await refreshSupplierInvoices()}catch(e){}
      }

      // Update only the currently visible view.
      try{
        window.notifyLiveDataChanged?.('seamless-15s');
      }catch(e){
        try{window.refreshActiveScreen?.(active,true)}catch(_e){}
      }

      // Lifecycle is independent of global filters; refresh it from full DATA.
      if(active==='tireLifecycleReport'){
        try{window.renderTireLifecycleReport?.()}catch(e){}
      }

      lastRun=Date.now();
    }finally{
      busy=false;
      if(queued){
        queued=false;
        setTimeout(seamlessRefresh,50);
      }
    }
  }

  // Start after the page has settled, then every 15 seconds.
  setTimeout(seamlessRefresh,1500);
  setInterval(seamlessRefresh,15000);

  // Also refresh once when the tab becomes active again, without reload.
  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='visible' && Date.now()-lastRun>5000){
      setTimeout(seamlessRefresh,100);
    }
  });
})();
