
(function(){
  function syncStickyHeaderHeight(){
    var top=document.querySelector('.wrap > .top');
    if(!top) return;
    var h=Math.ceil(top.getBoundingClientRect().height);
    document.documentElement.style.setProperty('--sticky-title-height', h+'px');
  }
  function scheduleStickySync(){
    requestAnimationFrame(function(){
      syncStickyHeaderHeight();
      setTimeout(syncStickyHeaderHeight,80);
    });
  }
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', scheduleStickySync);
  }else{
    scheduleStickySync();
  }
  window.addEventListener('load', scheduleStickySync);
  window.addEventListener('resize', scheduleStickySync);
  if(window.ResizeObserver){
    var ro=new ResizeObserver(scheduleStickySync);
    var start=function(){var top=document.querySelector('.wrap > .top'); if(top) ro.observe(top);};
    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', start); else start();
  }
})();
