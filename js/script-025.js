
(function(){
  let refreshTimer=0,refreshing=false,pending=false,lastActive='';

  function currentTarget(){
    return document.body?.dataset?.activeReport || (document.body?.classList.contains('nav-home')?'home':'home');
  }
  function rows(){
    try{return typeof filters==='function'?filters():(Array.isArray(DATA)?DATA:[])}catch(e){return Array.isArray(DATA)?DATA:[]}
  }

  function refreshHome(a){
    const usage=window.EGOTireOps?.operationalRows?.(a)||a;
    try{window.renderHomeMiniSummaries?.(usage)}catch(e){}
    try{window.renderTireLifecycleHomeMini?.()}catch(e){}
    try{window.renderTirePositionHomeMini?.(a)}catch(e){}
    try{window.renderCriticalHomeFast?.(true)}catch(e){}
    try{window.renderStockForecastNow?.()}catch(e){}
  }

  function refreshReport(target,a){
    const usage=window.EGOTireOps?.operationalRows?.(a)||a;
    switch(target){
      case 'reportInvoice':
        renderBars('#invoiceChart',sumBy(usage,'invoice'),'invoice');
        renderCompactSummary('#invoiceSummary',usage,'invoice','الفاتورة');
        renderDashboardExplanation('#invoiceExplain',usage,'invoice','فاتورة');
        renderInvoice(usage);
        break;
      case 'reportEquipment':
        renderBars('#equipmentChart',sumBy(usage,'plate'),'equipment');
        if(typeof equipmentSummary==='function')equipmentSummary(usage);else renderCompactSummary('#equipmentSummary',usage,'plate','المعدة');
        renderDashboardExplanation('#equipmentExplain',usage,'plate','معدة');
        break;
      case 'reportSupplier':
        renderTreemap('#supplierChart',sumBy(usage,'supplier'),'supplier');
        renderCompactSummary('#supplierSummary',usage,'supplier','المورد');
        renderDashboardExplanation('#supplierExplain',usage,'supplier','مورد');
        break;
      case 'reportTire':
        renderLollipop('#tireChart',sumBy(usage,'tire_type'),'tire');
        renderCompactSummary('#tireSummary',usage,'tire_type','نوع/مقاس الكفر');
        renderDashboardExplanation('#tireExplain',usage,'tire_type','نوع/مقاس كفر');
        break;
      case 'reportActivity':
        renderDonut('#activityChart',sumBy(usage,'activity'),'activity');
        renderActivitySummary(usage);
        renderDashboardExplanation('#activityExplain',usage,'activity','نشاط');
        break;
      case 'reportTireId':
        renderBars('#tireIdChart',tireIdGroupsAsc(usage),'tireId');
        renderTireIdSummary(usage);
        renderDashboardExplanation('#tireIdExplain',usage,'tire_id','هوية كفر');
        break;
      case 'tireLifecycleReport':
        window.renderTireLifecycleReport?.();
        break;
      case 'tireStatusReport':
        window.renderTireStatusReport?.();
        break;
      case 'tirePositionReport':
        window.renderTirePositionReport?.(a);
        break;
      case 'reportMonthly':
        renderMonthlyReport(usage);
        renderMonthlyArea(usage);
        renderMonthlyExplanation(usage);
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
