
(function(){
  function initFilterDrawer(){
    const drawer=document.getElementById('filterSidebar');
    const toggle=document.getElementById('filterSidebarToggle');
    const backdrop=document.getElementById('filterSidebarBackdrop');
    const body=document.getElementById('filterSidebarBody');
    const filters=document.querySelector('.wrap > .filters');
    const done=document.getElementById('filterDrawerDone');
    const clear2=document.getElementById('filterDrawerClear');
    const clearOriginal=document.getElementById('clear');
    const countBadge=document.getElementById('filterToggleCount');
    if(!drawer||!toggle||!body||!filters)return;

    /* Move the existing live filter controls; IDs/listeners/data remain unchanged. */
    body.appendChild(filters);

    function setOpen(open){
      drawer.classList.toggle('open',!!open);
      drawer.setAttribute('aria-expanded',open?'true':'false');
      toggle.setAttribute('aria-label',open?'إغلاق الفلاتر':'فتح الفلاتر');
      if(backdrop){
        backdrop.classList.toggle('show',!!open);
        backdrop.setAttribute('aria-hidden',open?'false':'true');
      }
      if(open && typeof window.closeReportDrawer==='function')window.closeReportDrawer();
    }
    function isOpen(){return drawer.classList.contains('open')}
    function activeCount(){
      const ids=['search','from','to','activity','equipment','supplier','invoice','tire','tireId','inventoryStatus'];
      return ids.reduce((n,id)=>{const el=document.getElementById(id);return n+(el&&String(el.value||'').trim()?1:0)},0);
    }
    function syncCount(){
      const n=activeCount();
      if(countBadge){countBadge.textContent=String(n);countBadge.classList.toggle('show',n>0)}
    }

    toggle.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();setOpen(!isOpen())});
    if(backdrop)backdrop.addEventListener('click',()=>setOpen(false));
    if(done)done.addEventListener('click',()=>setOpen(false));
    if(clear2)clear2.addEventListener('click',function(){
      if(clearOriginal)clearOriginal.click();
      setTimeout(syncCount,0);
    });
    filters.addEventListener('input',syncCount,true);
    filters.addEventListener('change',syncCount,true);
    document.addEventListener('keydown',function(e){if(e.key==='Escape'&&isOpen())setOpen(false)});
    window.addEventListener('beforeprint',()=>setOpen(false));

    /* If the report drawer opens, close filters so the two drawers never overlap. */
    const reportToggle=document.getElementById('reportSidebarToggle');
    if(reportToggle)reportToggle.addEventListener('click',function(){if(!isOpen())return;setOpen(false)},true);

    syncCount();setOpen(false);
    window.toggleFilterDrawer=()=>setOpen(!isOpen());
    window.closeFilterDrawer=()=>setOpen(false);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initFilterDrawer);else initFilterDrawer();
})();
