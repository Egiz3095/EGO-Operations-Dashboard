
(function(){
  'use strict';
  const LOGO='assets/asset_006_b038ee673c64bed1.png';

  function esc(v){
    return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function reportName(page){
    return (
      page.querySelector('.ref-title-band h2,.package-print-head h2,.section-title h2,.section-title,.report-title,h2')?.textContent ||
      document.querySelector('.report-breadcrumb strong')?.textContent ||
      'تقرير الإدارة'
    ).trim();
  }

  function activeFilters(){
    const out=[];
    const root=document.querySelector('.filters');
    if(!root)return out;
    root.querySelectorAll('select,input').forEach(el=>{
      if(el.disabled)return;
      let val='';
      if(el.type==='checkbox'||el.type==='radio'){if(!el.checked)return;val=el.value}
      else val=(el.value||'').trim();
      if(!val || val==='all' || val==='الكل')return;
      let label='';
      const id=el.id;
      if(id){
        const lab=document.querySelector('label[for="'+CSS.escape(id)+'"]');
        if(lab)label=(lab.textContent||'').trim();
      }
      if(!label){
        label=(el.closest('label,.field,.filter-field')?.querySelector('span,b,strong')?.textContent||el.placeholder||el.name||'فلتر').trim();
      }
      if(el.tagName==='SELECT'){
        const t=el.options[el.selectedIndex]?.textContent?.trim();
        if(t)val=t;
      }
      out.push([label,val]);
    });
    return out.slice(0,12);
  }

  function makeHeader(title){
    const now=new Date();
    const head=document.createElement('header');
    head.className='ego-print-brand-head';
    head.innerHTML=
      '<div class="ego-print-brand">'+
        (LOGO?'<img src="'+LOGO+'" alt="شعار مجموعة العساف">':'')+
        '<div><b>مجموعة العساف</b><small>للمقاولات والصيانة والاستشارات الهندسية</small></div>'+
      '</div>'+
      '<div class="ego-print-report-title"><strong>'+esc(title)+'</strong><span>تقرير إداري — وفق نطاق البيانات والفلاتر الحالية</span></div>'+
      '<div class="ego-print-date"><b>تاريخ الطباعة</b><br>'+now.toLocaleDateString('en-GB')+
      '<br><b>وقت الطباعة</b><br>'+now.toLocaleTimeString('ar-SA',{hour:'2-digit',minute:'2-digit'})+'</div>';
    return head;
  }

  function makeFilterStrip(){
    const f=activeFilters();
    const box=document.createElement('div');
    box.className='ego-print-filter-strip';
    box.innerHTML='<b>نطاق التقرير:</b>'+
      (f.length?f.map(x=>'<span class="ego-print-filter-chip">'+esc(x[0])+': '+esc(x[1])+'</span>').join(''):
      '<span>جميع البيانات المتاحة</span>');
    return box;
  }

  function makeFooter(title){
    const now=new Date();
    const f=document.createElement('footer');
    f.className='ego-print-footer';
    f.innerHTML='<span><b>مجموعة العساف</b> — '+esc(title)+'</span>'+
      '<span class="ego-print-confidential">نسخة إدارية</span>'+
      '<span>'+now.toLocaleDateString('en-GB')+' · '+now.toLocaleTimeString('ar-SA',{hour:'2-digit',minute:'2-digit'})+'</span>';
    return f;
  }

  function unlockAllData(page){
    page.querySelectorAll('.tablewrap,.si-table-wrap,.records-direct-table-wrap,[class*="table-wrap"]').forEach(el=>{
      el.style.setProperty('height','auto','important');
      el.style.setProperty('max-height','none','important');
      el.style.setProperty('overflow','visible','important');
    });
    page.querySelectorAll('table').forEach(t=>{
      t.style.setProperty('width','100%','important');
      t.style.setProperty('max-width','100%','important');
    });
  }

  function decorateStage(stage){
    if(!stage || stage.dataset.professionalDecorated==='1')return;
    const pages=Array.from(stage.children).filter(x=>x.nodeType===1);
    pages.forEach(page=>{
      if(page.querySelector(':scope > .ego-print-brand-head'))return;
      const title=reportName(page);
      page.insertBefore(makeFilterStrip(),page.firstChild);
      page.insertBefore(makeHeader(title),page.firstChild);
      page.appendChild(makeFooter(title));
      unlockAllData(page);
    });
    stage.dataset.professionalDecorated='1';
  }

  function scan(){
    decorateStage(document.getElementById('singlePrintStage'));
    decorateStage(document.getElementById('fullPrintStage'));
  }

  new MutationObserver(scan).observe(document.body,{childList:true,subtree:false});
  window.addEventListener('beforeprint',scan);
  document.addEventListener('click',function(e){
    if(e.target.closest('[data-print-report]')){
      setTimeout(scan,0);setTimeout(scan,30);
    }
  },true);
})();
