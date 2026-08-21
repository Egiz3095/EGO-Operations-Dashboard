
(function(){
  function fixFilterButton(){
    const btn=document.getElementById('filterSidebarToggle');
    if(!btn)return;

    let icon=btn.querySelector('.launcher-icon,.toggle-icon');
    if(!icon){
      icon=document.createElement('span');
      icon.className='launcher-icon';
      btn.prepend(icon);
    }
    icon.textContent='⌕';

    let label=btn.querySelector('.launcher-label,b');
    if(!label){
      label=document.createElement('b');
      label.className='launcher-label';
      btn.appendChild(label);
    }
    label.textContent='الفلاتر';
    btn.setAttribute('title','فتح الفلاتر');
    btn.setAttribute('aria-label','فتح الفلاتر');
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',fixFilterButton,{once:true});
  else fixFilterButton();
  setTimeout(fixFilterButton,100);
  setTimeout(fixFilterButton,500);
})();
