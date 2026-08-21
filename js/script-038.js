
(function(){
  'use strict';

  function isAuthenticated(){
    return document.documentElement.classList.contains('ego-authenticated');
  }

  function goHome(){
    if(!isAuthenticated())return;
    try{
      if(typeof window.closeReportDrawer==='function')window.closeReportDrawer();
      if(typeof window.closeFilterDrawer==='function')window.closeFilterDrawer();
    }catch(_e){}

    const homeNav=document.querySelector('[data-report-target="home"]');
    if(homeNav){
      homeNav.click();
      return;
    }
    if(typeof window.openReportView==='function'){
      window.openReportView('home',{noScroll:false,noHash:false});
      return;
    }
    location.hash='home';
  }

  function isHomeLogo(img){
    if(!img || img.tagName!=='IMG')return false;
    if(img.id==='mainHomeLogo')return true;
    if(img.closest('.premium-home-logo-btn,.breadcrumb-logo-btn,.global-home-logo,.report-sidebar-home-logo'))return true;
    if(img.classList.contains('home-logo-link'))return true;
    const alt=(img.getAttribute('alt')||'').trim();
    if(/شعار\s*ورشة\s*العساف|شعار\s*العساف/.test(alt))return true;

    const main=document.getElementById('mainHomeLogo');
    const mainSrc=main&&main.getAttribute('src');
    return !!(mainSrc && img.getAttribute('src')===mainSrc);
  }

  document.addEventListener('click',function(e){
    const img=e.target.closest?.('img');
    if(!isHomeLogo(img) || !isAuthenticated())return;
    e.preventDefault();
    e.stopPropagation();
    goHome();
  },true);

  document.addEventListener('keydown',function(e){
    if(e.key!=='Enter' && e.key!==' ')return;
    const img=e.target?.tagName==='IMG'?e.target:null;
    if(!isHomeLogo(img) || !isAuthenticated())return;
    e.preventDefault();
    goHome();
  },true);

  function markLogos(){
    document.querySelectorAll('img').forEach(img=>{
      if(isHomeLogo(img)){
        img.style.cursor='pointer';
        if(!img.hasAttribute('title'))img.setAttribute('title','العودة إلى الصفحة الرئيسية');
      }
    });
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',markLogos,{once:true});
  else markLogos();

  new MutationObserver(markLogos).observe(document.body,{childList:true,subtree:true});
})();
