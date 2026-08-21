
(function(){
  let refreshTimer=0,refreshing=false,pending=false,lastActive='';

  function currentTarget(){
    return document.body?.dataset?.activeReport || (document.body?.classList.contains('nav-home')?'home':'home');
  }
  function rows(){
    try{return typeof filters==='function'?filters():(Array.isArray(DATA)?DATA:[])}catch(e){return Array.isArray(DATA)?DATA:[]}
  }

  function refreshHome(a){
    try{window.renderHomeMiniSummaries?.(a)}catch(e){}
    try{window.renderTireLifecycleHomeMini?.()}catch(e){}
    try{window.renderTirePositionHomeMini?.(a)}catch(e){}
    try{window.renderCriticalHomeFast?.(true)}catch(e){}
    try{window.renderStockForecastNow?.()}catch(e){}
  }

  function refreshReport(target,a){
    switch(target){
      case 'reportInvoice':
        renderBars('#invoiceChart',sumBy(a,'invoice'),'invoice');
        renderCompactSummary('#invoiceSummary',a,'invoice','الفاتورة');
        renderDashboardExplanation('#invoiceExplain',a,'invoice','فاتورة');
        renderInvoice(a);
        break;
      case 'reportEquipment':
        renderBars('#equipmentChart',sumBy(a,'plate'),'equipment');
        if(typeof equipmentSummary==='function')equipmentSummary(a);else renderCompactSummary('#equipmentSummary',a,'plate','المعدة');
        renderDashboardExplanation('#equipmentExplain',a,'plate','معدة');
        break;
      case 'reportSupplier':
        renderTreemap('#supplierChart',sumBy(a,'supplier'),'supplier');
        renderCompactSummary('#supplierSummary',a,'supplier','المورد');
        renderDashboardExplanation('#supplierExplain',a,'supplier','مورد');
        break;
      case 'reportTire':
        renderLollipop('#tireChart',sumBy(a,'tire_type'),'tire');
        renderCompactSummary('#tireSummary',a,'tire_type','نوع/مقاس الكفر');
        renderDashboardExplanation('#tireExplain',a,'tire_type','نوع/مقاس كفر');
        break;
      case 'reportActivity':
        renderDonut('#activityChart',sumBy(a,'activity'),'activity');
        renderActivitySummary(a);
        renderDashboardExplanation('#activityExplain',a,'activity','نشاط');
        break;
      case 'reportTireId':
        renderBars('#tireIdChart',tireIdGroupsAsc(a),'tireId');
        renderTireIdSummary(a);
        renderDashboardExplanation('#tireIdExplain',a,'tire_id','هوية كفر');
        break;
      case 'tireLifecycleReport':
        window.renderTireLifecycleReport?.();
        break;
      case 'tirePositionReport':
        window.renderTirePositionReport?.(a);
        break;
      case 'reportMonthly':
        renderMonthlyReport(a);
        renderMonthlyArea(a);
        renderMonthlyExplanation(a);
        break;
      case 'supplierInvoicesReport':
        window.renderSupplierInvoiceReport?.();
        break;
      case 'inventoryReport':
        window.renderInventoryReport?.();
        window.refreshInventoryEnhancements?.();
        break;
      case 'records':
        renderTable(a);
        renderRecordsExplanation(a);
        break;
      default:
        refreshHome(a);
    }
  }

  function run(target,force){
    if(refreshing){pending=true;return}
    refreshing=true;
    try{
      const a=rows();
      const t=target||currentTarget();
      lastActive=t;
      if(t==='home')refreshHome(a);
      else refreshReport(t,a);

      // Always keep the small header/status values current.
      try{
        const m=metrics(a);
        const status=document.getElementById('filteredStatus');
        if(status)status.textContent=a.length.toLocaleString('en-US')+' نتيجة | '+activeFilterCount()+' فلتر نشط';
      }catch(e){}
    }finally{
      refreshing=false;
      if(pending){pending=false;setTimeout(()=>run(currentTarget(),true),0)}
    }
  }

  window.refreshActiveScreen=function(target,force=false){
    clearTimeout(refreshTimer);
    refreshTimer=setTimeout(()=>run(target||currentTarget(),force),force?0:25);
  };

  window.notifyLiveDataChanged=function(reason){
    try{window.invalidateDashboardCaches?.()}catch(e){}
    window.refreshActiveScreen(currentTarget(),true);
    if(currentTarget()==='home'){
      setTimeout(()=>{try{window.renderStockForecastNow?.()}catch(e){}},0);
    }
  };

  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='visible')window.refreshActiveScreen(currentTarget(),true);
  });

  window.addEventListener('focus',()=>window.refreshActiveScreen(currentTarget(),true));

  // Keep current screen fresh while the page is open, without rebuilding hidden screens.
  /* full-page reload handles 15-second freshness */
})();
