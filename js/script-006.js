
(function(){
  function initReportDrawer(){
    const drawer=document.getElementById('reportSidebar');
    const toggle=document.getElementById('reportSidebarToggle');
    const backdrop=document.getElementById('reportSidebarBackdrop');
    if(!drawer||!toggle)return;

    function setOpen(open){
      drawer.classList.toggle('open',!!open);
      drawer.setAttribute('aria-expanded',open?'true':'false');
      toggle.setAttribute('aria-label',open?'إغلاق قائمة التقارير':'فتح قائمة التقارير');
      if(backdrop){
        backdrop.classList.toggle('show',!!open);
        backdrop.setAttribute('aria-hidden',open?'false':'true');
      }
    }
    function isOpen(){return drawer.classList.contains('open')}

    toggle.addEventListener('click',function(e){
      e.preventDefault();e.stopPropagation();setOpen(!isOpen());
    });
    if(backdrop)backdrop.addEventListener('click',()=>setOpen(false));

    /* Close automatically after choosing any report, including Home. */
    drawer.addEventListener('click',function(e){
      const item=e.target.closest('[data-report-target]');
      if(item)setOpen(false);
    });

    document.addEventListener('keydown',function(e){if(e.key==='Escape'&&isOpen())setOpen(false)});
    window.addEventListener('beforeprint',()=>setOpen(false));
    setOpen(false);
    window.toggleReportDrawer=()=>setOpen(!isOpen());
    window.closeReportDrawer=()=>setOpen(false);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initReportDrawer);else initReportDrawer();
})();
