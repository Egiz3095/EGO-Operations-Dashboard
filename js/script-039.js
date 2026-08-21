
(function(){
  'use strict';
  function returnToHome(){
    if(!document.documentElement.classList.contains('ego-authenticated')) return;

    /* Prefer the system's own report navigation so all page states reset correctly. */
    try{
      if(typeof window.openReportView==='function'){
        window.openReportView('home',{noScroll:false,noHash:false});
        return;
      }
    }catch(_e){}

    const homeBtn=document.querySelector('.report-nav-item[data-report-target="home"]');
    if(homeBtn){ homeBtn.click(); return; }

    const anyHome=document.querySelector('[data-report-target="home"]');
    if(anyHome){ anyHome.click(); return; }

    location.hash='home';
  }

  function bind(){
    const logo=document.getElementById('mainHomeLogo');
    if(!logo || logo.dataset.homeLinkBound==='1') return;
    logo.dataset.homeLinkBound='1';
    logo.addEventListener('click',function(e){
      e.preventDefault();
      e.stopPropagation();
      returnToHome();
    });
    logo.addEventListener('keydown',function(e){
      if(e.key==='Enter' || e.key===' '){
        e.preventDefault();
        returnToHome();
      }
    });
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',bind,{once:true});
  else bind();
})();
