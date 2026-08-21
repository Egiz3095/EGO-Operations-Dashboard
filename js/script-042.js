
(function(){
  'use strict';
  const defs={
    reportSidebarToggle:{label:'التقارير',icon:'☰'},
    filterSidebarToggle:{label:'الفلاتر',icon:'⌕'},
    userAdminOpen:{label:'المستخدمون',icon:'👥'},
    comparisonsOpen:{label:'المقارنات',icon:'⇄'},
    egoLogoutBtn:{label:'تسجيل الخروج',icon:'↪'}
  };
  let applying=false;

  function imp(el,p,v){el.style.setProperty(p,v,'important')}

  function normalizeButton(btn,id){
    if(!btn)return;

    let icon=btn.querySelector('.launcher-icon,.toggle-icon');
    if(!icon){
      icon=document.createElement('span');
      icon.className='launcher-icon';
      btn.prepend(icon);
    }
    icon.className='launcher-icon';
    icon.textContent=defs[id].icon;

    let label=btn.querySelector('.launcher-label');
    if(!label){
      label=btn.querySelector('b') || document.createElement('b');
      label.className='launcher-label';
      if(!label.parentNode)btn.appendChild(label);
    }
    label.className='launcher-label';
    label.textContent=defs[id].label;

    const mobile=window.innerWidth<=760;
    const w=mobile?'52px':'64px';
    const h=mobile?'94px':'118px';
    const iconSize=mobile?'23px':'28px';
    const labelW=mobile?'18px':'22px';
    const labelH=mobile?'52px':'61px';

    [
      ['width',w],['min-width',w],['max-width',w],
      ['height',h],['min-height',h],['max-height',h],
      ['margin','0'],['display','flex'],['flex-direction','column'],
      ['align-items','center'],['justify-content','center'],
      ['text-align','center'],['overflow','hidden']
    ].forEach(([p,v])=>imp(btn,p,v));

    [
      ['display','flex'],['align-items','center'],['justify-content','center'],
      ['width',iconSize],['min-width',iconSize],['max-width',iconSize],
      ['height',iconSize],['min-height',iconSize],['max-height',iconSize],
      ['margin','0 auto'],['padding','0'],['writing-mode','horizontal-tb'],
      ['transform','none']
    ].forEach(([p,v])=>imp(icon,p,v));

    [
      ['display','flex'],['align-items','center'],['justify-content','center'],
      ['width',labelW],['min-width',labelW],['max-width',labelW],
      ['height',labelH],['min-height',labelH],['max-height',labelH],
      ['margin','0 auto'],['padding','0'],['writing-mode','vertical-rl'],
      ['text-orientation','mixed'],['transform','rotate(180deg)'],
      ['white-space','nowrap'],['text-align','center']
    ].forEach(([p,v])=>imp(label,p,v));
  }

  function normalizeAll(){
    if(applying)return;
    applying=true;
    try{
      Object.keys(defs).forEach(id=>normalizeButton(document.getElementById(id),id));
    }finally{
      applying=false;
    }
  }

  function boot(){
    normalizeAll();
    setTimeout(normalizeAll,50);
    setTimeout(normalizeAll,250);
    setTimeout(normalizeAll,800);

    const stack=document.getElementById('uiLauncherStack');
    if(stack && window.MutationObserver){
      new MutationObserver(function(){
        if(!applying)requestAnimationFrame(normalizeAll);
      }).observe(stack,{subtree:true,attributes:true,childList:true,attributeFilter:['class','style']});
    }
    window.addEventListener('resize',normalizeAll,{passive:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();

  window.normalizeSidebarLaunchers=normalizeAll;
})();
