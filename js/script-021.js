
(function(){
  function closeOpenLayers(){
    document.querySelectorAll('.ops-modal.open,.user-admin-modal.open,.sheet-filter-setup-modal.open,.source-filter-warning.open')
      .forEach(m=>{m.classList.remove('open');m.setAttribute('aria-hidden','true')});
    document.getElementById('reportSidebar')?.classList.remove('open');
    document.getElementById('filterSidebar')?.classList.remove('open');
  }

  document.addEventListener('keydown',function(e){
    if(e.key==='Escape') closeOpenLayers();

    // Ctrl/Cmd + K = global search.
    if((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='k'){
      e.preventDefault();
      const b=document.getElementById('globalSearchOpen');
      if(b && !b.classList.contains('permission-hidden')) b.click();
    }

    // Alt + F = filters.
    if(e.altKey && e.key.toLowerCase()==='f'){
      e.preventDefault();
      document.getElementById('filterSidebarToggle')?.click();
    }
  });

  // Make useful shortcuts discoverable without adding clutter.
  const search=document.getElementById('globalSearchOpen');
  if(search)search.title='بحث شامل — Ctrl + K';
  const filter=document.getElementById('filterSidebarToggle');
  if(filter)filter.title='الفلتر — Alt + F';

  // Rename technical bridge button for operators.
  const bridge=document.getElementById('sheetFilterBridgeSetup');
  if(bridge){
    bridge.textContent='⚙ إعدادات ربط صفحة الإدخال';
    bridge.title='إعداد اتصال Google Sheets';
  }

  // Keep the professional context updated after user actions.
  ['refresh','clear','smartRefresh'].forEach(id=>{
    document.getElementById(id)?.addEventListener('click',()=>setTimeout(()=>window.renderProfessionalInsights?.(),500));
  });
})();
