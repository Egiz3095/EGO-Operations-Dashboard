
(function(){
  'use strict';

  const launcherIds=[
    'reportSidebarToggle',
    'filterSidebarToggle',
    'userAdminOpen',
    'comparisonsOpen',
    'egoLogoutBtn'
  ];

  function launcherButtons(){
    const stack=document.getElementById('uiLauncherStack');
    const byId=launcherIds.map(id=>document.getElementById(id)).filter(Boolean);
    if(stack){
      stack.querySelectorAll('button').forEach(btn=>{
        if(!byId.includes(btn))byId.push(btn);
      });
    }
    return byId;
  }

  function clearForcedLauncherState(){
    /* First use the existing official reset if available. */
    try{
      if(typeof window.restoreAllEgoLaunchers==='function'){
        window.restoreAllEgoLaunchers();
      }
    }catch(_e){}

    /* Then remove any stale inline state left from a previous session. */
    launcherButtons().forEach(btn=>{
      ['display','visibility','opacity','pointer-events','filter','transform','z-index']
        .forEach(prop=>btn.style.removeProperty(prop));
      btn.classList.remove('ego-one-only-selected');
      btn.removeAttribute('aria-hidden');
    });

    document.documentElement.classList.remove('ego-one-launcher-only');
  }

  function refreshPermissionsAndLaunchers(){
    clearForcedLauncherState();

    /* Re-apply permissions for the newly logged-in user.
       This restores only the buttons that this user is actually allowed to see. */
    try{
      if(typeof applyPermissions==='function')applyPermissions();
    }catch(_e){}

    /* Permissions may render a moment later, so clear stale one-button state again. */
    setTimeout(clearForcedLauncherState,0);
    setTimeout(clearForcedLauncherState,80);
    setTimeout(clearForcedLauncherState,250);
  }

  /* Explicit logout: clear the selected launcher before the login gate appears. */
  document.getElementById('logoutConfirmYes')?.addEventListener('click',function(){
    clearForcedLauncherState();
  },true);

  document.getElementById('egoLogoutBtn')?.addEventListener('click',function(){
    /* Do not reset immediately while the confirmation modal is open,
       but make sure a stale previous one-button mode cannot survive indefinitely. */
    setTimeout(function(){
      const modal=document.getElementById('logoutConfirmModal');
      if(!modal || !modal.classList.contains('open'))clearForcedLauncherState();
    },60);
  },true);

  /* Detect successful login via the authentication class. */
  const root=document.documentElement;
  let wasAuthenticated=root.classList.contains('ego-authenticated');

  function authStateChanged(){
    const isAuthenticated=root.classList.contains('ego-authenticated');

    if(isAuthenticated && !wasAuthenticated){
      refreshPermissionsAndLaunchers();
      /* Always return to home with a normal launcher set. */
      try{
        if(typeof window.openReportView==='function'){
          window.openReportView('home',{noScroll:true,noHash:false});
        }
      }catch(_e){}
    }

    if(!isAuthenticated && wasAuthenticated){
      clearForcedLauncherState();
    }

    wasAuthenticated=isAuthenticated;
  }

  if(window.MutationObserver){
    new MutationObserver(authStateChanged)
      .observe(root,{attributes:true,attributeFilter:['class']});
  }

  /* Also catch form-based login in case authentication state changes inside the same tick. */
  document.getElementById('egoLoginForm')?.addEventListener('submit',function(){
    setTimeout(authStateChanged,0);
    setTimeout(authStateChanged,150);
    setTimeout(authStateChanged,500);
  },true);

  /* Initial cleanup protects restored sessions and page refreshes. */
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',function(){
      clearForcedLauncherState();
      if(root.classList.contains('ego-authenticated'))refreshPermissionsAndLaunchers();
    },{once:true});
  }else{
    clearForcedLauncherState();
    if(root.classList.contains('ego-authenticated'))refreshPermissionsAndLaunchers();
  }

  window.resetLauncherStateAfterLogin=refreshPermissionsAndLaunchers;
})();
