
(function(){
  function applyLauncherOrder(){
    const stack=document.getElementById('uiLauncherStack');
    const reports=document.getElementById('reportSidebarToggle');
    const filter=document.getElementById('filterSidebarToggle');
    const users=document.getElementById('userAdminOpen');
    const compare=document.getElementById('comparisonsOpen');
    const logout=document.getElementById('egoLogoutBtn');
    if(!stack||!reports||!filter||!users||!compare||!logout)return;

    // DOM order itself is fixed, not only CSS order.
    [reports,filter,users,compare,logout].forEach(node=>stack.appendChild(node));

    reports.style.order='1';
    filter.style.order='2';
    users.style.order='3';
    compare.style.order='4';
    logout.style.order='5';
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',applyLauncherOrder);
  }else{
    applyLauncherOrder();
  }
  window.addEventListener('load',applyLauncherOrder,{once:true});

  // Login scripts may re-mount launchers, so re-apply only when auth class changes.
  const obs=new MutationObserver(function(mutations){
    for(const m of mutations){
      if(m.type==='attributes' && m.attributeName==='class'){
        applyLauncherOrder();
        break;
      }
    }
  });
  obs.observe(document.documentElement,{attributes:true,attributeFilter:['class']});
})();
