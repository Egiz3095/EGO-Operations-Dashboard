
(function(){
  'use strict';

  function prepareCompletePrintData(){
    try{
      const rows=(typeof filters==='function')?filters():(
        (typeof DATA!=='undefined' && Array.isArray(DATA))?DATA:[]
      );

      /* Flush all delayed dashboard calculations first. */
      try{
        if(typeof window.flushHeavyDashboardRender==='function'){
          window.flushHeavyDashboardRender();
        }
      }catch(_e){}

      /* Rebuild every printable report using the complete current dataset. */
      try{if(typeof renderPrintReports==='function')renderPrintReports(rows)}catch(_e){}
      try{if(typeof renderMonthlyReport==='function')renderMonthlyReport(rows)}catch(_e){}
      try{if(typeof renderMonthlyArea==='function')renderMonthlyArea(rows)}catch(_e){}
      try{if(typeof renderReferencePrintReports==='function')renderReferencePrintReports(rows)}catch(_e){}
      try{if(typeof renderTable==='function')renderTable(rows)}catch(_e){}
      try{if(typeof renderRecordsExplanation==='function')renderRecordsExplanation(rows)}catch(_e){}
      try{if(typeof renderInvoice==='function')renderInvoice(rows)}catch(_e){}
      try{if(typeof window.__refreshInvoiceWithdrawalDetails==='function')window.__refreshInvoiceWithdrawalDetails(rows)}catch(_e){}
      try{if(typeof window.renderSupplierInvoiceReport==='function')window.renderSupplierInvoiceReport()}catch(_e){}
      try{if(typeof window.renderInventoryReport==='function')window.renderInventoryReport()}catch(_e){}
      try{if(typeof window.refreshInventoryEnhancements==='function')window.refreshInventoryEnhancements()}catch(_e){}

      /* Expand the live source wrappers before they are cloned into the print stage. */
      document.querySelectorAll(
        '.tablewrap,.summary-table-wrap,.safe-extra-scroll,.si-table-wrap,'+
        '.records-direct-table-wrap,[class*="table-wrap"]'
      ).forEach(el=>{
        el.style.setProperty('height','auto','important');
        el.style.setProperty('max-height','none','important');
        el.style.setProperty('overflow','visible','important');
      });

      window.__EGO_PRINT_ROW_COUNT=rows.length;
    }catch(err){
      console.error('Complete print preparation:',err);
    }
  }

  window.prepareCompletePrintData=prepareCompletePrintData;

  window.addEventListener('beforeprint',prepareCompletePrintData);

  /* Run before the existing print handlers build their clones/stages. */
  document.addEventListener('pointerdown',function(e){
    if(e.target.closest('#print,[data-print-report],.single-report-print-btn')){
      prepareCompletePrintData();
    }
  },true);

  document.addEventListener('click',function(e){
    if(e.target.closest('#print,[data-print-report],.single-report-print-btn')){
      prepareCompletePrintData();
    }
  },true);
})();
