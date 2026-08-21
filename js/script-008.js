
(function(){
  function initHomeLogo(){
    const logo=document.getElementById('mainHomeLogo');
    if(!logo)return;
    function goHome(e){
      if(e){e.preventDefault();e.stopPropagation()}
      if(typeof window.closeReportDrawer==='function')window.closeReportDrawer();
      if(typeof window.openReportView==='function'){
        window.openReportView('home');
      }else{
        location.hash='home';
      }
    }
    logo.addEventListener('click',goHome);
    logo.addEventListener('keydown',function(e){
      if(e.key==='Enter'||e.key===' '||e.key==='Spacebar')goHome(e);
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initHomeLogo);else initHomeLogo();
})();
