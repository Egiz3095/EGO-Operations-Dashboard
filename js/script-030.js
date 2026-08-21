

(function(){
  const IDS=[
    'reportSidebarToggle',
    'filterSidebarToggle',
    'userAdminOpen',
    'comparisonsOpen',
    'egoLogoutBtn'
  ];
  let selected='';

  function getButtons(){
    return IDS.map(id=>document.getElementById(id)).filter(Boolean);
  }

  function forceVisible(btn){
    btn.style.setProperty('display','flex','important');
    btn.style.setProperty('visibility','visible','important');
    btn.style.setProperty('opacity','1','important');
    btn.style.setProperty('pointer-events','auto','important');
  }

  function forceHidden(btn){
    btn.style.setProperty('display','none','important');
    btn.style.setProperty('visibility','hidden','important');
    btn.style.setProperty('opacity','0','important');
    btn.style.setProperty('pointer-events','none','important');
  }

  function clearInline(btn){
    ['display','visibility','opacity','pointer-events'].forEach(prop=>{
      btn.style.removeProperty(prop);
    });
    btn.classList.remove('ego-one-only-selected');
  }

  function restoreAll(){
    selected='';
    getButtons().forEach(clearInline);
    document.documentElement.classList.remove('ego-one-launcher-only');
  }

  function showOnly(id){
    selected=id;
    document.documentElement.classList.add('ego-one-launcher-only');
    getButtons().forEach(btn=>{
      if(btn.id===id){
        forceVisible(btn);
        btn.classList.add('ego-one-only-selected');
      }else{
        btn.classList.remove('ego-one-only-selected');
        forceHidden(btn);
      }
    });
  }

  function install(){
    const btns=getButtons();
    if(btns.length<5){
      setTimeout(install,100);
      return;
    }

    btns.forEach(btn=>{
      btn.addEventListener('click',function(){
        const same = selected===btn.id;
        if(same){
          /* Same visible button clicked again = close its panel, then restore all launchers. */
          setTimeout(restoreAll,20);
        }else{
          /* First click = immediately hide every other launcher. */
          showOnly(btn.id);
        }
      },true);
    });

    /* Explicit close actions restore the five buttons. */
    document.addEventListener('click',function(e){
      const closeTarget=e.target.closest(
        '#reportSidebarBackdrop,'+
        '[data-report-sidebar-close],'+
        '#filterSidebarBackdrop,'+
        '#filterDrawerDone,'+
        '[data-filter-sidebar-close],'+
        '[data-user-admin-close],'+
        '.user-admin-backdrop,'+
        '[data-compare-close],'+
        '.compare-backdrop,'+
        '[data-logout-cancel],'+
        '.logout-confirm-backdrop'
      );
      if(closeTarget)setTimeout(restoreAll,20);

      /* Selecting a report closes the report drawer, so restore launchers too. */
      if(e.target.closest('#reportSidebar [data-report-target]')){
        setTimeout(restoreAll,20);
      }
    },true);

    document.addEventListener('keydown',function(e){
      if(e.key==='Escape')setTimeout(restoreAll,20);
    });

    /* Keep the inline state enforced if any old script rewrites classes/styles. */
    const stack=document.getElementById('uiLauncherStack');
    if(stack && window.MutationObserver){
      let locking=false;
      new MutationObserver(function(){
        if(locking || !selected)return;
        locking=true;
        getButtons().forEach(btn=>{
          if(btn.id===selected)forceVisible(btn);
          else forceHidden(btn);
        });
        locking=false;
      }).observe(stack,{subtree:true,attributes:true,attributeFilter:['class','style']});
    }

    restoreAll();
    window.restoreAllEgoLaunchers=restoreAll;
    window.showOnlyEgoLauncher=showOnly;
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',install);
  }else{
    install();
  }
})();

