
(function(){
  function getReportIds(){
    return Array.from(document.querySelectorAll('[data-nav-report]')).map(x=>x.id).filter(Boolean);
  }
  const REPORT_NAMES={
    reportInvoice:'الإنفاق_حسب_الفاتورة',
    reportEquipment:'الإنفاق_حسب_المعدة',
    reportSupplier:'الإنفاق_حسب_المورد',
    reportTire:'الإنفاق_حسب_نوع_مقاس_الكفر',
    reportActivity:'الإنفاق_حسب_النشاط',
    reportTireId:'تقرير_هوية_الكفر',
    reportMonthly:'تقرير_المسحوبات_الشهرية',
    supplierInvoicesReport:'تقرير_فواتير_الموردين',
    inventoryReport:'تقرير_المخزون_الحالي',
    records:'جميع_السجلات',
    all:'تقرير_الكفرات_والموردين_كامل'
  };
  let exportBusy=false;
  let previousTheme=null;
  function removeStage(){var old=document.getElementById('pdfExportStage');if(old)old.remove()}
  function pause(ms){return new Promise(r=>setTimeout(r,ms))}
  function safeName(name){return String(name||'report').replace(/[\\/:*?"<>|]+/g,'_').replace(/\s+/g,'_')}
  function setButtonsBusy(busy, text){
    document.querySelectorAll('#exportPdf,[data-export-pdf]').forEach(function(btn){
      if(busy){if(!btn.dataset.originalText)btn.dataset.originalText=btn.innerHTML;btn.disabled=true;btn.innerHTML=text||'⏳ جاري إعداد PDF...';}
      else{btn.disabled=false;if(btn.dataset.originalText)btn.innerHTML=btn.dataset.originalText;}
    });
  }
  function loadScript(src, testFn){
    return new Promise(function(resolve,reject){
      if(testFn()) return resolve();
      var existing=[].slice.call(document.scripts).find(function(s){return s.src===src});
      if(existing){existing.addEventListener('load',function(){testFn()?resolve():reject(new Error('فشل تحميل المكتبة'))},{once:true});existing.addEventListener('error',function(){reject(new Error('تعذر تحميل '+src))},{once:true});return;}
      var s=document.createElement('script');s.src=src;s.async=true;
      s.onload=function(){testFn()?resolve():reject(new Error('فشل تحميل '+src))};
      s.onerror=function(){reject(new Error('تعذر تحميل '+src))};
      document.head.appendChild(s);
    });
  }
  async function ensureLibraries(){
    await loadScript('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js',function(){return !!window.html2canvas});
    await loadScript('https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js',function(){return !!(window.jspdf&&window.jspdf.jsPDF)});
  }
  function prepareLiveData(){
    try{
      if(typeof window.closeFilterDrawer==='function')window.closeFilterDrawer();
      if(typeof window.closeReportDrawer==='function')window.closeReportDrawer();
      if(typeof render==='function')render();
      if(typeof updatePrintCover==='function')updatePrintCover();
      if(typeof window.renderSupplierInvoiceReport==='function')window.renderSupplierInvoiceReport();
      if(typeof window.syncAllFilterBadges==='function')window.syncAllFilterBadges();
    }catch(e){console.warn('PDF preparation:',e)}
  }
  function cleanClone(node, opts){
    opts=opts||{};
    if(!node)return null;
    var c=node.cloneNode(true);
    c.hidden=false;c.removeAttribute('hidden');
    c.querySelectorAll('[hidden]').forEach(function(x){x.hidden=false;x.removeAttribute('hidden')});
    c.querySelectorAll('.single-report-print-btn,.single-report-pdf-btn,.si-filters,.actions,.filter-sidebar,.report-sidebar,[data-print-report],[data-export-pdf]').forEach(function(x){x.remove()});
    c.querySelectorAll('button').forEach(function(btn){if(btn.id==='siClear'||btn.id==='supplierInvoicesJump'||btn.id==='clear'||btn.id==='print'||btn.id==='exportPdf')btn.remove()});
    if(opts.keepBreadcrumb){
      c.querySelectorAll('.report-breadcrumb .single-report-print-btn,.report-breadcrumb .single-report-pdf-btn').forEach(function(x){x.remove()});
    }else{
      c.querySelectorAll('.report-breadcrumb').forEach(function(x){x.remove()});
    }
    return c;
  }
  function makeReportPage(srcId, keepBreadcrumb){
    var src=document.getElementById(srcId);if(!src)return null;
    var page=document.createElement('section');page.className='pdf-export-page pdf-export-page-'+srcId;
    var clone=cleanClone(src,{keepBreadcrumb:!!keepBreadcrumb});
    if(clone){clone.classList.add('pdf-export-report-clone');page.appendChild(clone)}
    return page;
  }
  function makeRecordsPage(keepBreadcrumb){
    var page=document.createElement('section');page.className='pdf-export-page pdf-export-records';
    if(keepBreadcrumb){
      var anchor=document.getElementById('recordsBreadcrumbAnchor');
      if(anchor){var bc=cleanClone(anchor,{keepBreadcrumb:true});if(bc && bc.childNodes.length)page.appendChild(bc)}
    }
    ['recordsTitle','recordsTable','recordsExplain'].forEach(function(id){var el=document.getElementById(id);if(el)page.appendChild(cleanClone(el))});
    return page;
  }
  function buildStage(mode,target){
    removeStage();prepareLiveData();
    var stage=document.createElement('main');stage.id='pdfExportStage';stage.setAttribute('aria-hidden','true');
    if(mode==='all'){
      var cover=document.querySelector('.print-cover');
      if(cover){var cc=cleanClone(cover);cc.className='pdf-export-cover';cc.querySelectorAll('.cover-footer,footer').forEach(function(x){x.remove()});stage.appendChild(cc)}
      getReportIds().forEach(function(id){var p=makeReportPage(id,false);if(p)stage.appendChild(p)});
      stage.appendChild(makeRecordsPage(false));
    }else if(target==='records'){
      stage.appendChild(makeRecordsPage(true));
    }else{
      var p=makeReportPage(target,true);if(p)stage.appendChild(p)
    }
    document.body.appendChild(stage);
    return stage;
  }
  async function waitForStage(){
    document.body.classList.add('pdf-export-rendering');
    await pause(50);
    await new Promise(function(resolve){requestAnimationFrame(function(){requestAnimationFrame(resolve)})});
    if(document.fonts && document.fonts.ready){try{await document.fonts.ready}catch(e){}}
    await pause(220);
  }
  function cleanup(){
    document.body.classList.remove('pdf-export-rendering');
    removeStage();
    if(previousTheme!==null)document.documentElement.setAttribute('data-theme',previousTheme);else document.documentElement.removeAttribute('data-theme');
    previousTheme=null;
    setButtonsBusy(false);
    exportBusy=false;
  }
  function beginLightTheme(){
    previousTheme=document.documentElement.getAttribute('data-theme');
    document.documentElement.setAttribute('data-theme','light');
  }
  function getActiveReportId(){
    return document.body.dataset.activeReport||'home';
  }
  function getTargetFromButton(btn){
    var mode=(btn&&btn.getAttribute('data-export-pdf'))||'all';
    if(mode==='current'){
      var t=getActiveReportId();
      return (t&&t!=='home')?t:'all';
    }
    return 'all';
  }
  function getFilenameForTarget(target){
    var d=new Date();
    var stamp=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
    var dynamicName='';
    if(target && target!=='all' && !REPORT_NAMES[target]){
      var el=document.getElementById(target);
      dynamicName=el?.querySelector('.section-title,h1,h2,h3')?.textContent?.trim()||target;
    }
    return safeName((REPORT_NAMES[target]||dynamicName||REPORT_NAMES.all)+'_'+stamp)+'.pdf';
  }
  async function renderNodeToCanvas(node){
    return await window.html2canvas(node,{scale:1.7,backgroundColor:'#ffffff',useCORS:true,allowTaint:true,logging:false,windowWidth:1500,scrollX:0,scrollY:0,imageTimeout:0});
  }
  function appendCanvas(pdf, canvas, tracker, forceNewPage){
    var pageW=pdf.internal.pageSize.getWidth();
    var pageH=pdf.internal.pageSize.getHeight();
    var pxPerMm=canvas.width/pageW;
    var sliceHeightPx=Math.max(1,Math.floor(pageH*pxPerMm));
    var offset=0;var slice=0;
    while(offset<canvas.height){
      var currentHeight=Math.min(sliceHeightPx, canvas.height-offset);
      var part=document.createElement('canvas');
      part.width=canvas.width;part.height=currentHeight;
      var ctx=part.getContext('2d');
      ctx.fillStyle='#fff';ctx.fillRect(0,0,part.width,part.height);
      ctx.drawImage(canvas,0,offset,canvas.width,currentHeight,0,0,canvas.width,currentHeight);
      var img=part.toDataURL('image/jpeg',0.95);
      var hMm=currentHeight/pxPerMm;
      if(tracker.usedPages===0){
      }else if(forceNewPage || slice>0){
        pdf.addPage('a4','landscape');
      }
      pdf.addImage(img,'JPEG',0,0,pageW,hMm,undefined,'FAST');
      tracker.usedPages++;
      offset+=currentHeight;
      forceNewPage=true;
      slice++;
    }
  }
  async function exportPdf(target){
    if(exportBusy)return;
    exportBusy=true;setButtonsBusy(true,'⏳ جاري تجهيز PDF...');
    try{
      await ensureLibraries();
      beginLightTheme();
      var stage=buildStage(target==='all'?'all':'single',target);
      if(!stage || !stage.children || !stage.children.length) throw new Error('تعذر تجهيز محتوى التصدير');
      await waitForStage();
      var jsPDF=window.jspdf.jsPDF;
      var pdf=new jsPDF({orientation:'landscape',unit:'mm',format:'a4',compress:true});
      var tracker={usedPages:0};
      var nodes=[].slice.call(stage.children);
      for(var i=0;i<nodes.length;i++){
        var canvas=await renderNodeToCanvas(nodes[i]);
        appendCanvas(pdf,canvas,tracker,i>0);
        await pause(30);
      }
      if(tracker.usedPages===0) throw new Error('لم يتم إنشاء أي صفحات داخل ملف PDF');
      pdf.save(getFilenameForTarget(target));
    }catch(err){
      console.error(err);
      alert('تعذر تصدير ملف PDF الآن. تأكد من اتصال الإنترنت ثم أعد المحاولة.\n\nالتفاصيل: '+(err&&err.message?err.message:err));
    }finally{
      cleanup();
    }
  }
  document.addEventListener('click',function(e){
    var btn=e.target.closest('#exportPdf,[data-export-pdf]');if(!btn)return;
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
    exportPdf(getTargetFromButton(btn));
  },true);
  window.exportAllReportsPdf=function(){return exportPdf('all')};
  window.exportCurrentReportPdf=function(){var t=getActiveReportId();return exportPdf(t&&t!=='home'?t:'all')};
})();
