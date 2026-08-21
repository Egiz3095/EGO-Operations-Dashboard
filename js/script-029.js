
(function(){
  function init(){
    const ids=['reportSidebarToggle','filterSidebarToggle','userAdminOpen','comparisonsOpen'];
    const buttons=ids.map(id=>document.getElementById(id)).filter(Boolean);
    const report=document.getElementById('reportSidebar');
    const filter=document.getElementById('filterSidebar');
    const users=document.getElementById('userAdminModal');
    const compare=document.getElementById('comparisonsModal');

    function closeReport(){
      if(typeof window.closeReportDrawer==='function') window.closeReportDrawer();
      else {report?.classList.remove('open');document.getElementById('reportSidebarBackdrop')?.classList.remove('show')}
    }
    function closeFilter(){
      if(typeof window.closeFilterDrawer==='function') window.closeFilterDrawer();
      else {filter?.classList.remove('open');document.getElementById('filterSidebarBackdrop')?.classList.remove('show')}
    }
    function closeUsers(){
      users?.classList.remove('open'); users?.setAttribute('aria-hidden','true');
    }
    function closeCompare(){
      compare?.classList.remove('open'); compare?.setAttribute('aria-hidden','true');
    }
    function closeOthers(except){
      if(except!=='report') closeReport();
      if(except!=='filter') closeFilter();
      if(except!=='users') closeUsers();
      if(except!=='compare') closeCompare();
    }
    function sync(){
      const states={
        report:!!report?.classList.contains('open'),
        filter:!!filter?.classList.contains('open'),
        users:!!users?.classList.contains('open'),
        compare:!!compare?.classList.contains('open')
      };
      const map={reportSidebarToggle:'report',filterSidebarToggle:'filter',userAdminOpen:'users',comparisonsOpen:'compare'};
      buttons.forEach(b=>b.classList.toggle('launcher-active',!!states[map[b.id]]));
    }

    // Capture phase closes the previously-open tool BEFORE the existing click handler opens the requested one.
    document.getElementById('reportSidebarToggle')?.addEventListener('click',()=>closeOthers('report'),true);
    document.getElementById('filterSidebarToggle')?.addEventListener('click',()=>closeOthers('filter'),true);
    document.getElementById('userAdminOpen')?.addEventListener('click',()=>closeOthers('users'),true);
    document.getElementById('comparisonsOpen')?.addEventListener('click',()=>closeOthers('compare'),true);

    [report,filter,users,compare].filter(Boolean).forEach(el=>{
      new MutationObserver(sync).observe(el,{attributes:true,attributeFilter:['class','aria-hidden']});
    });
    document.querySelectorAll('[data-user-admin-close],[data-compare-close],#reportSidebarBackdrop,#filterSidebarBackdrop')
      .forEach(el=>el.addEventListener('click',()=>setTimeout(sync,0)));
    document.addEventListener('keydown',e=>{if(e.key==='Escape')setTimeout(sync,0)});
    sync();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
