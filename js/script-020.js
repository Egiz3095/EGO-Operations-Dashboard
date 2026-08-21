
(function(){
  function fix(){
    const b=document.getElementById('filterSidebarToggle');
    if(!b)return;
    b.removeAttribute('data-filter-count');
    if(!b.querySelector('.launcher-icon') || !b.querySelector('.launcher-label')){
      b.innerHTML='<span class="launcher-icon">⚙</span><b class="launcher-label">فلتر</b>';
    }
    b.querySelector('.launcher-label').textContent='فلتر';
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',fix);
  else fix();
  window.addEventListener('load',fix,{once:true});
})();
