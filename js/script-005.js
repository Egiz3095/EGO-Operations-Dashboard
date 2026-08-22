
(function(){
  const REPORTS={
    home:'الرئيسية',
    reportInvoice:'الإنفاق حسب الفاتورة',
    reportEquipment:'الإنفاق حسب المعدة',
    reportSupplier:'الإنفاق حسب المورد',
    reportTire:'الإنفاق حسب نوع / مقاس الكفر',
    reportActivity:'الإنفاق حسب النشاط',
    reportTireId:'تقرير هوية الكفر',
    tireLifecycleReport:'دورة حياة الكفر',
    tireStatusReport:'حالة الكفرات',
    tirePositionReport:'موضع الكفر',
    reportMonthly:'تقرير المسحوبات الشهرية',
    supplierInvoicesReport:'تقرير فواتير الموردين',
    inventoryReport:'تقرير المخزون الحالي',
    records:'جميع السجلات'
  };
  let current='home';

  function breadcrumb(name){
    const el=document.createElement('div');
    el.className='report-breadcrumb';
    const mainLogo=document.querySelector('.brand img');
    const logoSrc=mainLogo ? mainLogo.getAttribute('src') : '';
    el.innerHTML='<button type="button" class="breadcrumb-logo-btn" data-report-target="home" title="العودة إلى الرئيسية" aria-label="العودة إلى الرئيسية">'+(logoSrc?'<img src="'+logoSrc+'" alt="الشعار">':'⌂')+'</button><button type="button" class="breadcrumb-home-text" data-report-target="home" title="العودة للرئيسية لتعديل الفلاتر">الرئيسية</button><span class="crumb-sep">←</span><strong>'+name+'</strong><button type="button" class="single-report-print-btn" data-print-report="current" title="طباعة هذا التقرير فقط">🖨 <span>طباعة هذا التقرير</span></button><button type="button" class="single-report-print-btn single-report-pdf-btn" data-export-pdf="current" title="تصدير هذا التقرير PDF بالوضع الفاتح">📄 <span>تصدير PDF</span></button>';
    return el;
  }
  function ensureBreadcrumb(target){
    if(target==='records'){
      const anchor=document.getElementById('recordsBreadcrumbAnchor');
      if(anchor){anchor.innerHTML='';anchor.appendChild(breadcrumb(REPORTS.records));anchor.classList.add('nav-report-active')}
      return;
    }
    const el=document.getElementById(target);
    if(!el)return;
    let b=el.querySelector(':scope > .report-breadcrumb');
    if(!b)el.insertBefore(breadcrumb(REPORTS[target]||target),el.firstChild);
  }
  function setHash(target){
    try{history.replaceState(null,'','#'+(target==='home'?'home':target))}catch(e){}
  }
  function go(target,opts={}){
    if(!REPORTS[target])target='home';

    /* FILTER REPORT LOCK:
       A filter change may trigger several asynchronous UI refreshes.
       None of them is allowed to kick the user back to Home.
       The lock lasts briefly and only protects the report that was open
       at the exact moment the filter changed. */
    const lock=window.__EGO_FILTER_REPORT_LOCK;
    if(lock && Date.now()<lock.until && target==='home' && lock.report && lock.report!=='home' && !opts.allowFilterExit){
      target=lock.report;
      opts={...opts,noScroll:true,noHash:true};
    }

    current=target;
    document.body.classList.toggle('nav-home',target==='home');
    document.body.dataset.activeReport=target;
    document.querySelectorAll('[data-nav-report]').forEach(el=>el.classList.toggle('nav-report-active',el.id===target));
    const rt=document.getElementById('recordsTitle'), rtb=document.getElementById('recordsTable'), re=document.getElementById('recordsExplain'), ra=document.getElementById('recordsBreadcrumbAnchor');
    [rt,rtb,re].forEach(el=>el&&el.classList.toggle('nav-report-active',target==='records'));
    if(ra && target!=='records'){ra.classList.remove('nav-report-active');ra.innerHTML=''}
    const panel=document.getElementById('invoicePanel');
    if(panel)panel.classList.toggle('nav-suppressed',target!=='reportInvoice');
    document.querySelectorAll('.report-nav-item').forEach(btn=>btn.classList.toggle('active',btn.dataset.reportTarget===target));
    if(target!=='home'){
      ensureBreadcrumb(target);
      setTimeout(()=>{try{window.refreshActiveScreen?.(target,true)}catch(e){}},0);
    }else{
      setTimeout(()=>{try{window.refreshActiveScreen?.('home',true)}catch(e){}},0);
    }
    if(!opts.noHash)setHash(target);
    try{localStorage.setItem('tireReportActiveView',target)}catch(e){}
    const currentLabel=document.querySelector('.home-current strong');if(currentLabel)currentLabel.textContent=REPORTS[target]||'الرئيسية';
    if(!opts.noScroll){
      let top=null;
      if(target==='home'){
        top=document.querySelector('.top')||document.querySelector('.filters')||document.getElementById('reportHome');
      }else if(target==='records'){
        top=document.getElementById('recordsBreadcrumbAnchor')||document.getElementById('recordsTitle');
      }else{
        top=document.getElementById(target);
      }
      if(top)top.scrollIntoView({behavior:'smooth',block:'start'});
    }
  }
  function delegatedClick(e){
    const btn=e.target.closest('[data-report-target]');
    if(!btn)return;
    const t=btn.dataset.reportTarget;
    if(REPORTS[t]){e.preventDefault();go(t)}
  }
  function init(){
    document.addEventListener('click',delegatedClick);
    const jump=document.getElementById('supplierInvoicesJump');
    if(jump){jump.textContent='📑 فواتير الموردين';jump.addEventListener('click',()=>go('supplierInvoicesReport'))}
    /* فتح النظام يبدأ دائماً من الرئيسية؛ التنقل للتقارير يكون بعد ذلك من القائمة. */
    let initial='home';
    try{localStorage.setItem('tireReportActiveView','home')}catch(e){}
    go(initial,{noScroll:true,noHash:false});
  }
  window.openReportView=go;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
