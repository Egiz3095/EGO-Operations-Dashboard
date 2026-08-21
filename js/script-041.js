
(function(){
  'use strict';
  function restoreFilterContents(){
    const sidebar=document.getElementById('filterSidebar');
    if(!sidebar)return;
    const filters=sidebar.querySelector('.filters');
    const body=sidebar.querySelector('.filter-sidebar-body');
    if(body){
      body.style.removeProperty('display');
      body.style.removeProperty('visibility');
      body.style.removeProperty('opacity');
      body.removeAttribute('hidden');
      body.setAttribute('aria-hidden','false');
    }
    if(filters){
      ['display','visibility','opacity','pointer-events','position','transform','height','max-height']
        .forEach(p=>filters.style.removeProperty(p));
      filters.removeAttribute('hidden');
      filters.setAttribute('aria-hidden','false');

      filters.querySelectorAll('[hidden]').forEach(el=>{
        /* Only clear accidental visual hidden state; do not alter option logic. */
        if(el.tagName!=='OPTION')el.removeAttribute('hidden');
      });
    }
  }

  const toggle=document.getElementById('filterSidebarToggle');
  toggle?.addEventListener('click',function(){
    setTimeout(restoreFilterContents,0);
    setTimeout(restoreFilterContents,60);
    setTimeout(restoreFilterContents,180);
  },true);

  const sidebar=document.getElementById('filterSidebar');
  if(sidebar && window.MutationObserver){
    new MutationObserver(function(){
      if(sidebar.classList.contains('open') || sidebar.classList.contains('is-open')){
        restoreFilterContents();
      }
    }).observe(sidebar,{attributes:true,attributeFilter:['class','style','aria-hidden']});
  }
})();
