
(function(){
  let printPrepared=false;
  function prepareFastPrint(){
    if(printPrepared) return;
    printPrepared=true;
    try{
      const rows=typeof filters==='function'?filters():[];
      if(typeof renderPrintReports==='function') renderPrintReports(rows);
      if(typeof renderMonthlyReport==='function') renderMonthlyReport(rows);
      if(typeof renderMonthlyArea==='function') renderMonthlyArea(rows);
      if(typeof renderReferencePrintReports==='function') renderReferencePrintReports(rows);
      if(typeof window.renderSupplierInvoiceReport==='function') window.renderSupplierInvoiceReport();
      document.documentElement.classList.add('printing-fast');
    }catch(e){console.warn('Print preparation:',e)}
  }
  function finishFastPrint(){
    document.documentElement.classList.remove('printing-fast');
    printPrepared=false;
  }
  window.addEventListener('beforeprint',prepareFastPrint);
  window.addEventListener('afterprint',finishFastPrint);
})();
