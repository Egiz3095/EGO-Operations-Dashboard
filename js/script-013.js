
(function(){
  const FILTER_IDS=['search','from','to','activity','equipment','supplier','invoice','tire','tireId','inventoryStatus'];
  function countActive(){
    return FILTER_IDS.reduce(function(n,id){var el=document.getElementById(id);return n+(el&&String(el.value||'').trim()?1:0)},0);
  }
  function syncAll(){
    var n=countActive();
    var side=document.getElementById('filterToggleCount');
    if(side){side.textContent=String(n);side.classList.toggle('show',n>0);side.hidden=false}
    var main=document.getElementById('clearFilterCount');
    if(main){main.textContent=String(n);main.hidden=n===0}
    var clear=document.getElementById('clear');
    if(clear){
      clear.classList.toggle('has-active-filters',n>0);
      clear.title=n?('مسح '+n+' فلتر نشط'):'لا توجد فلاتر نشطة';
      clear.setAttribute('aria-label',n?('مسح الفلاتر — '+n+' فلتر نشط'):'مسح الفلاتر');
    }
    var filterToggle=document.getElementById('filterSidebarToggle');
    if(filterToggle){filterToggle.title=n?('الفلاتر — '+n+' نشط'):'فتح الفلاتر'}
    document.querySelectorAll('.filter-count-badge[data-filter-count]').forEach(function(el){el.textContent=String(n);el.hidden=n===0});
    document.documentElement.dataset.activeFilterCount=String(n);
  }
  function burstSync(){
    syncAll();
    setTimeout(syncAll,0);setTimeout(syncAll,60);setTimeout(syncAll,180);setTimeout(syncAll,420);
  }
  function wrapRender(){
    if(typeof window.render!=='function' || window.render.__badgeWrapped)return;
    const old=window.render;
    const wrapped=function(){var out=old.apply(this,arguments);burstSync();return out};
    wrapped.__badgeWrapped=true;
    window.render=wrapped;
    try{render=wrapped}catch(e){}
  }
  function hookClear(btn){
    if(!btn || btn.__badgeHooked)return;
    btn.__badgeHooked=true;
    btn.addEventListener('click',function(){burstSync()},true);
    btn.addEventListener('click',function(){burstSync()},false);
  }
  function init(){
    wrapRender();
    hookClear(document.getElementById('clear'));
    hookClear(document.getElementById('filterDrawerClear'));
    document.addEventListener('input',function(e){if(e.target&&FILTER_IDS.includes(e.target.id))burstSync()},true);
    document.addEventListener('change',function(e){if(e.target&&FILTER_IDS.includes(e.target.id))burstSync()},true);
    window.addEventListener('storage',burstSync);
    window.syncAllFilterBadges=syncAll;
    burstSync();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
